import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UIMessage } from "ai";

export const listarHilosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .select("id, titulo, resumen, created_at, updated_at, user_id")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const crearHiloFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { titulo?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, titulo: data.titulo?.trim() || "Nueva conversación" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const eliminarHiloFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .delete()
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renombrarHiloFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; titulo: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .update({ titulo: data.titulo.trim().slice(0, 120) })
      .eq("id", data.threadId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type StoredMessage = {
  id: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
};

export const cargarMensajesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, parts, message_id, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const out: StoredMessage[] = (rows ?? []).map((r) => ({
      id: (r.message_id as string | null) ?? (r.id as string),
      role: r.role as UIMessage["role"],
      parts: (r.parts ?? []) as UIMessage["parts"],
    }));
    return out;
  });
