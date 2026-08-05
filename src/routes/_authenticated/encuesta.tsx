import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BLOQUES_ENCUESTA, TOTAL_PREGUNTAS_ENCUESTA } from "@/data/encuesta";
import { misRespuestasEncuestaFn, guardarBloqueEncuestaFn } from "@/lib/encuesta.functions";
import { ArrowLeft, ClipboardCheck, Check, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/encuesta")({
  head: () => ({
    meta: [
      { title: "Encuesta de Factores Asociados — INEVAL_UEDE" },
      {
        name: "description",
        content:
          "Cuestionario socioemocional y de factores asociados: contexto socioeconómico, familiar, traslado, alimentación y bienestar.",
      },
      { property: "og:title", content: "Encuesta de Factores Asociados" },
      { property: "og:description", content: "100 preguntas divididas en 5 periodos para contextualizar tus resultados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EncuestaPage,
});

function EncuestaPage() {
  const qc = useQueryClient();
  const [bloqueId, setBloqueId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["encuesta", "mias"],
    queryFn: () => misRespuestasEncuestaFn({ data: {} }),
  });

  const respuestas = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of (data as any)?.respuestas ?? []) m[r.pregunta_id] = r.valor;
    return m;
  }, [data]);

  const completados = new Set(((data as any)?.progreso ?? []).map((p: any) => p.bloque as string));
  const totalRespondidas = Object.keys(respuestas).length;

  const guardar = useMutation({
    mutationFn: (vars: { bloque: string; respuestas: { preguntaId: string; valor: string }[]; completado: boolean }) =>
      guardarBloqueEncuestaFn({ data: vars }),
    onSuccess: () => {
      toast.success("Respuestas guardadas. ¡Gracias!");
      setBorrador({});
      setBloqueId(null);
      qc.invalidateQueries({ queryKey: ["encuesta"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar."),
  });

  const bloque = BLOQUES_ENCUESTA.find((b) => b.id === bloqueId) ?? null;

  if (bloque) {
    const valores = { ...respuestas, ...borrador };
    const contestadas = bloque.preguntas.filter((p) => valores[p.id]).length;
    const pct = Math.round((contestadas / bloque.preguntas.length) * 100);
    return (
      <div className="mx-auto max-w-3xl px-5 py-6">
        <button
          onClick={() => { setBloqueId(null); setBorrador({}); }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a los periodos
        </button>
        <h1 className="mt-3 text-2xl font-extrabold">{bloque.titulo}</h1>
        <p className="text-sm text-muted-foreground">{bloque.descripcion}</p>

        <div className="sticky top-16 z-10 mt-4 rounded-xl border bg-background/80 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>{contestadas} de {bloque.preguntas.length} respondidas</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {bloque.preguntas.map((p, i) => (
            <div key={p.id} className="rounded-2xl border bg-gradient-card p-4 shadow-soft">
              <p className="text-sm font-semibold">
                <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                {p.texto}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.opciones.map((op) => {
                  const activa = valores[p.id] === op;
                  return (
                    <button
                      key={op}
                      onClick={() => setBorrador((b) => ({ ...b, [p.id]: op }))}
                      className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition ${
                        activa ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 mt-6 flex flex-wrap gap-2 border-t bg-background/90 py-3 backdrop-blur">
          <button
            disabled={guardar.isPending}
            onClick={() =>
              guardar.mutate({
                bloque: bloque.id,
                respuestas: Object.entries(borrador).map(([preguntaId, valor]) => ({ preguntaId, valor })),
                completado: contestadas === bloque.preguntas.length,
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-50"
          >
            {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar {contestadas === bloque.preguntas.length ? "y finalizar periodo" : "avance"}
          </button>
          <span className="self-center text-xs text-muted-foreground">
            Puedes salir y continuar más tarde: tus respuestas quedan guardadas.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <header className="mt-3 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 p-2.5 text-white shadow-soft">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Encuesta de Factores Asociados</h1>
          <p className="text-sm text-muted-foreground">
            {TOTAL_PREGUNTAS_ENCUESTA} preguntas en 5 periodos cortos. Tus respuestas ayudan a contextualizar tus resultados académicos.
          </p>
        </div>
      </header>

      <div className="mt-4 rounded-2xl border bg-gradient-card p-4 shadow-soft">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Progreso general</span>
          <span>{totalRespondidas}/{TOTAL_PREGUNTAS_ENCUESTA}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500"
            style={{ width: `${Math.round((totalRespondidas / TOTAL_PREGUNTAS_ENCUESTA) * 100)}%` }}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {BLOQUES_ENCUESTA.map((b) => {
            const n = b.preguntas.filter((p) => respuestas[p.id]).length;
            const listo = completados.has(b.id) || n === b.preguntas.length;
            return (
              <button
                key={b.id}
                onClick={() => setBloqueId(b.id)}
                className="rounded-2xl border bg-gradient-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold">{b.titulo}</h2>
                  {listo ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                      <Check className="h-3 w-3" /> Completo
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      <Clock className="h-3 w-3" /> ~{b.minutos} min
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{b.descripcion}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((n / b.preguntas.length) * 100)}%` }}
                  />
                </div>
                <span className="mt-2 inline-block text-xs font-semibold text-primary">
                  {n}/{b.preguntas.length} respondidas →
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
