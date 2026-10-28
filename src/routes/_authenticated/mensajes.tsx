import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";

export const Route = createFileRoute("/_authenticated/mensajes")({
  head: () => ({ meta: [...pageMeta("Mensajes — INEVAL_UEDE","Mensajes en la plataforma educativa INEVAL_UEDE."),{ title: "Mensajes — INEVAL_UEDE" }] }),
  component: MensajesPage,
});

function MensajesPage() {
  const ctx = Route.useRouteContext() as { user: { id: string }; esAdmin: boolean };
  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:px-5">
      <h1 className="mb-3 flex items-center gap-2 text-2xl font-extrabold">
        <span className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">Mensajes</span>
      </h1>
      <ChatShell currentUserId={ctx.user.id} scope="mine" esAdmin={ctx.esAdmin} />
    </div>
  );
}
