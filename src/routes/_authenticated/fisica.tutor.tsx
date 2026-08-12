import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { tutorFisicaFn, estadisticasFisicaFn } from "@/lib/fisica.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fisica/tutor")({
  component: TutorFisica,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGERENCIAS = [
  "Explícame MRUV desde cero con un ejemplo",
  "¿Por qué la normal cambia en un plano inclinado?",
  "Ayúdame con conservación de la energía",
  "¿En qué subtema debo enfocarme según mis resultados?",
];

function TutorFisica() {
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const stats = useQuery({
    queryKey: ["fisica", "stats"],
    queryFn: () => estadisticasFisicaFn({ data: {} }),
    staleTime: 30_000,
  });

  const rows = (stats.data as any[]) ?? [];
  const total = rows.length;
  const aciertos = rows.filter((r) => r.correcta).length;

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [cargando]);

  async function enviar(pregunta?: string) {
    const contenido = (pregunta ?? texto).trim();
    if (!contenido || cargando) return;
    const historial = mensajes.slice(-10);
    setMensajes((m) => [...m, { role: "user", content: contenido }]);
    setTexto("");
    setCargando(true);
    try {
      const res = await tutorFisicaFn({ data: { pregunta: contenido, historial } });
      setMensajes((m) => [...m, { role: "assistant", content: res.texto }]);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo consultar al tutor.");
      setMensajes((m) => [...m, { role: "assistant", content: "Hubo un problema al responder. Inténtalo nuevamente." }]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6">
        <Link to="/fisica" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Física
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Mr. Victor · Física</h1>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? `Conoce tus ${total} respuestas registradas (${aciertos} correctas).` : "Aún no tienes respuestas de Física registradas."}
            </p>
          </div>
        </div>

        <div className="mt-5 flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-gradient-card p-4 shadow-soft">
          {mensajes.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pregúntame sobre cinemática, dinámica o energía. Adapto la explicación a tus estadísticas.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-xl border px-3 py-2 text-left text-xs font-medium transition hover:border-primary hover:bg-secondary/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[92%] rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-sm"
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-sm text-muted-foreground">Pensando…</div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={2}
            placeholder="Escribe tu duda de Física…"
            className="flex-1 resize-none rounded-xl border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => void enviar()}
            disabled={cargando || !texto.trim()}
            className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
