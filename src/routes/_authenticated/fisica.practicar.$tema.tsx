import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Timer } from "lucide-react";
import { barajar, fisicaPorTemaYNivel, type PreguntaFisica } from "@/data/fisica";
import { FisicaPreguntaCard } from "@/components/FisicaPreguntaCard";
import { listarPreguntasFisicaFn } from "@/lib/fisica.functions";
import { guardarRespuesta, iniciarSesion, finalizarSesion } from "@/lib/progreso";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fisica/practicar/$tema")({
  component: PracticarFisica,
});

type NivelSel = "Básico" | "Intermedio" | "Avanzado" | "Todos";

function fmt(seg: number) {
  const m = Math.floor(seg / 60).toString().padStart(2, "0");
  const s = (seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function PracticarFisica() {
  const { tema } = Route.useParams();
  const temaDecoded = decodeURIComponent(tema);

  const manuales = useQuery({
    queryKey: ["fisica", "manuales", temaDecoded],
    queryFn: () => listarPreguntasFisicaFn({ data: { tema: temaDecoded } }),
    staleTime: 30_000,
  });

  const extras: PreguntaFisica[] = useMemo(
    () =>
      (((manuales.data as any[]) ?? []) as any[])
        .filter((r) => r.activa)
        .map((r) => ({
          id: r.id,
          area: "Física",
          tema: r.tema,
          subtema: r.subtema,
          nivel: r.nivel,
          enunciado: r.enunciado,
          opciones: (r.opciones as string[]) ?? [],
          respuestaCorrecta: r.respuesta_correcta,
          explicacion: r.explicacion ?? "",
          imagenUrl: r.imagen_url ?? null,
          origen: "manual" as const,
        })),
    [manuales.data],
  );

  const [nivel, setNivel] = useState<NivelSel | null>(null);
  const [sesion, setSesion] = useState<PreguntaFisica[] | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [finalizada, setFinalizada] = useState(false);
  const [idx, setIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [inicio, setInicio] = useState<number | null>(null);
  const [ahora, setAhora] = useState<number>(Date.now());

  useEffect(() => {
    if (!inicio || idx >= (sesion?.length ?? 0)) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inicio, idx, sesion]);

  function poolDe(n: NivelSel) {
    const base = fisicaPorTemaYNivel(temaDecoded, n);
    const ext = n === "Todos" ? extras : extras.filter((p) => p.nivel === n);
    return [...base, ...ext];
  }

  async function iniciar(n: NivelSel) {
    const pool = poolDe(n);
    if (pool.length === 0) {
      toast.error("No hay preguntas disponibles para este nivel");
      return;
    }
    setNivel(n);
    setSesion(barajar(pool, Math.min(15, pool.length)));
    setIdx(0);
    setAciertos(0);
    setFinalizada(false);
    setInicio(Date.now());
    setAhora(Date.now());
    const id = await iniciarSesion("practica", "Física");
    setSesionId(id);
  }

  if (!sesion) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <Link to="/fisica" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Física
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold">{temaDecoded}</h1>
          <p className="mt-2 text-muted-foreground">Elige el nivel de dificultad para tu sesión (hasta 15 preguntas).</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(["Básico", "Intermedio", "Avanzado", "Todos"] as NivelSel[]).map((n) => {
              const count = poolDe(n).length;
              return (
                <button
                  key={n}
                  onClick={() => iniciar(n)}
                  disabled={count === 0}
                  className="rounded-2xl border bg-gradient-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong disabled:opacity-40"
                >
                  <div className="text-lg font-bold">{n === "Todos" ? "Todos los niveles" : n}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{count} preguntas</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (idx >= sesion.length) {
    const pct = Math.round((aciertos / sesion.length) * 100);
    if (!finalizada) {
      setFinalizada(true);
      const tiempoSeg = Math.floor((inicio ? ahora - inicio : 0) / 1000);
      void finalizarSesion(sesionId, sesion.length, aciertos, null, null, tiempoSeg);
    }
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <div className="rounded-2xl border bg-gradient-card p-8 text-center shadow-strong">
            <div className="text-sm font-semibold text-muted-foreground">Sesión finalizada</div>
            <h2 className="mt-2 text-4xl font-extrabold">{aciertos} / {sesion.length}</h2>
            <p className="mt-1 text-lg font-semibold text-primary">{pct}% de aciertos</p>
            <p className="mt-3 text-sm text-muted-foreground">Física · {temaDecoded} · Nivel {nivel}</p>
            <p className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> Tiempo: {fmt(Math.floor((inicio ? ahora - inicio : 0) / 1000))}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => { setSesion(null); setNivel(null); setSesionId(null); }}
                className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Otra sesión
              </button>
              <Link to="/analisis" className="rounded-xl border-2 px-5 py-2.5 font-semibold hover:bg-secondary">
                Analizar mis errores
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p = sesion[idx];
  const progreso = (idx / sesion.length) * 100;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <Link to="/fisica" className="font-medium text-muted-foreground hover:text-foreground">← Salir</Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-semibold tabular-nums">
              <Timer className="h-3.5 w-3.5" /> {fmt(Math.floor((ahora - (inicio ?? ahora)) / 1000))}
            </span>
            <span className="font-semibold">Pregunta {idx + 1} de {sesion.length}</span>
          </div>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
        </div>
        <FisicaPreguntaCard
          key={p.id}
          pregunta={p}
          onResponder={(ok) => {
            if (ok) setAciertos((a) => a + 1);
            guardarRespuesta({ preguntaId: p.id, area: "Física", subtema: p.subtema, nivel: p.nivel, correcta: ok, sesionId });
          }}
          onSiguiente={() => setIdx((i) => i + 1)}
          esUltima={idx === sesion.length - 1}
        />
      </div>
    </div>
  );
}
