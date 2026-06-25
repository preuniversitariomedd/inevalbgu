import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { cargarMensajesFn } from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});

function TutorThread() {
  const { threadId } = Route.useParams();
  const cargar = useServerFn(cargarMensajesFn);

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ["chat", "messages", threadId],
    queryFn: () => cargar({ data: { threadId } }),
  });

  if (isLoading || !initialMessages) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  return <ChatWindow threadId={threadId} initial={initialMessages} />;
}

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId },
      prepareSendMessagesRequest: async ({ api, messages, body }) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return {
          api,
          body: { messages, ...body },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        };
      },
    }),
    [threadId],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => toast.error(e.message || "Error en el tutor."),
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { textareaRef.current?.focus(); }, [threadId]);
  useEffect(() => { if (status === "ready") textareaRef.current?.focus(); }, [status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setInput("");
    await sendMessage({ text });
  };

  const loading = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-[70vh] flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">
              <div className="mx-auto mb-3 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <p>Cuéntame qué tema quieres repasar. Te haré una pregunta para empezar.</p>
            </div>
          )}
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            return (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.role === "assistant" ? <MessageResponse>{text}</MessageResponse> : <p className="whitespace-pre-wrap">{text}</p>}
                </MessageContent>
              </Message>
            );
          })}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent><Shimmer>Pensando…</Shimmer></MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={onSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu duda de Matemática, Física, Química o estudio…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() || loading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
