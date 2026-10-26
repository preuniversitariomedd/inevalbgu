import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { TUTOR_SYSTEM_PROMPT, evaluarMensajeUsuario } from "@/lib/tutor-prompt";
import type { Database } from "@/integrations/supabase/types";

type ChatBody = { messages: UIMessage[]; threadId: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const url = process.env.SUPABASE_URL;
        const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!url || !pubKey) return new Response("Supabase env missing", { status: 500 });
        if (!apiKey) return new Response("LOVABLE_API_KEY missing", { status: 500 });

        const supa = createClient<Database>(url, pubKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const { data: userResp, error: userErr } = await supa.auth.getUser(token);
        if (userErr || !userResp.user) return new Response("Unauthorized", { status: 401 });
        const userId = userResp.user.id;
        const { data: habilitado, error: accesoError } = await supa.rpc('modulo_habilitado', { _user_id: userId, _modulo: 'tutor' });
        if (accesoError || !habilitado) return new Response('Tutor no habilitado para tu grupo', { status: 403 });

        let body: ChatBody;
        try { body = (await request.json()) as ChatBody; }
        catch { return new Response("Bad JSON", { status: 400 }); }
        const { messages, threadId } = body;
        if (!Array.isArray(messages) || !threadId) return new Response("Invalid input", { status: 400 });

        // Validar pertenencia del hilo
        const { data: thread, error: thErr } = await supa
          .from("chat_threads").select("id, user_id").eq("id", threadId).maybeSingle();
        if (thErr || !thread || thread.user_id !== userId) {
          return new Response("Thread not found", { status: 404 });
        }

        // Moderación del último mensaje del usuario
        const last = [...messages].reverse().find((m) => m.role === "user");
        const lastText = last?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
        const check = evaluarMensajeUsuario(lastText);
        if (!check.permitido) {
          // Persistimos la pregunta y devolvemos un mensaje cordial.
          await supa.from("chat_messages").insert({
            thread_id: threadId, user_id: userId, role: "user",
            message_id: last?.id ?? null, parts: (last?.parts ?? []) as never,
          });
          const reply = `Soy tu tutor académico de Matemática, Física, Química y técnicas de estudio. ${check.motivo ?? ""} ¿Quieres que repasemos algún tema de estas áreas?`;
          await supa.from("chat_messages").insert({
            thread_id: threadId, user_id: userId, role: "assistant",
            message_id: null,
            parts: [{ type: "text", text: reply }] as never,
          });
          // Stream un único chunk como UI message stream
          const encoder = new TextEncoder();
          const sse = new ReadableStream({
            start(controller) {
              const id = crypto.randomUUID();
              const lines = [
                `data: ${JSON.stringify({ type: "start", messageId: id })}\n\n`,
                `data: ${JSON.stringify({ type: "text-start", id })}\n\n`,
                `data: ${JSON.stringify({ type: "text-delta", id, delta: reply })}\n\n`,
                `data: ${JSON.stringify({ type: "text-end", id })}\n\n`,
                `data: ${JSON.stringify({ type: "finish" })}\n\n`,
                `data: [DONE]\n\n`,
              ];
              for (const l of lines) controller.enqueue(encoder.encode(l));
              controller.close();
            },
          });
          return new Response(sse, {
            headers: { "Content-Type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
          });
        }

        // Persistir el nuevo mensaje del usuario (si aún no está)
        if (last) {
          const { data: existing } = await supa
            .from("chat_messages").select("id").eq("thread_id", threadId).eq("message_id", last.id).maybeSingle();
          if (!existing) {
            await supa.from("chat_messages").insert({
              thread_id: threadId, user_id: userId, role: "user",
              message_id: last.id, parts: (last.parts ?? []) as never,
            });
          }
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(apiKey, initialRunId);
        const model = gateway("google/gemini-3-flash-preview");

        // Anti-repetición: resumen de los últimos 3 asistentes para evitar respuestas idénticas
        const lastAssistants = messages.filter((m) => m.role === "assistant").slice(-3)
          .map((m) => m.parts.map((p) => p.type === "text" ? p.text : "").join(" "))
          .filter(Boolean);
        const antiRepetSystem = lastAssistants.length
          ? `\n\nCONTEXTO RECIENTE (no repitas estas respuestas literalmente, varía ejemplos y enfoque):\n${lastAssistants.map((t, i) => `(${i + 1}) ${t.slice(0, 400)}`).join("\n")}`
          : "";

        const modelMessages = await convertToModelMessages(messages);
        const result = streamText({
          model,
          system: TUTOR_SYSTEM_PROMPT + antiRepetSystem,
          messages: modelMessages,
          temperature: 0.7,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const assistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
              if (!assistant) return;
              await supa.from("chat_messages").insert({
                thread_id: threadId, user_id: userId, role: "assistant",
                message_id: assistant.id, parts: (assistant.parts ?? []) as never,
              });
              // Actualizar título del hilo con el primer mensaje del usuario
              const firstUser = messages.find((m) => m.role === "user");
              if (firstUser) {
                const txt = firstUser.parts.map((p) => p.type === "text" ? p.text : "").join(" ").trim();
                const titulo = txt.slice(0, 60) || "Nueva conversación";
                await supa.from("chat_threads").update({ titulo, updated_at: new Date().toISOString() }).eq("id", threadId);
              } else {
                await supa.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
              }
            } catch (e) { console.error("persist assistant fallo", e); }
          },
        });
      },
    },
  },
});
