import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { preguntasAleatorias, preguntasPorAreaYNivel } from "@/data";
import type { Pregunta } from "@/data/tipos";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta, iniciarSesion, finalizarSesion } from "@/lib/progreso";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/practicar/$area")({
  component: PracticarArea,
});

type NivelSel = "Básico" | "Intermedio" | "Avanzado" | "Todos";

function PracticarArea() {
  const { area } = Route.useParams();
  const areaDecoded = decodeURIComponent(area);
  const [nivel, setNivel] = useState<NivelSel | null>(null);
  const [sesion, setSesion] = useState<Pregunta[] | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [finalizada, setFinalizada] = useState(false);
  const [idx, setIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);

  const disponibles = useMemo(() => preguntasPorAreaYNivel(areaDecoded, nivel ?? "Todos"), [areaDecoded, nivel]);

  async function iniciar(n: NivelSel) {
    const pool = preguntasPorAreaYNivel(areaDecoded, n);
    if (pool.length === 0) {
      toast.error("No hay preguntas disponibles para este nivel");
      return;
    }
    setNivel(n);
    setSesion(preguntasAleatorias(pool, Math.min(15, pool.length)));
    setIdx(0);
    setAciertos(0);
    setFinalizada(false);
    const id = await iniciarSesion("practica", areaDecoded);
    setSesionId(id);
  }

  if (!sesion) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-5 py-8">
          <Link to="/practicar" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Áreas
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold">{areaDecoded}</h1>
          <p className="mt-2 text-muted-foreground">Elige el nivel de dificultad para tu sesión (15 preguntas).</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(["Básico", "Intermedio", "Avanzado", "Todos"] as NivelSel[]).map((n) => {
              const count = preguntasPorAreaYNivel(areaDecoded, n).length;
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
          <p className="mt-4 text-xs text-muted-foreground">Total en el área: {disponibles.length} preguntas</p>
        </div>
      </div>
    );
  }

  // resultado
  if (idx >= sesion.length) {
    const pct = Math.round((aciertos / sesion.length) * 100);
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <div className="rounded-2xl border bg-gradient-card p-8 text-center shadow-strong">
            <div className="text-sm font-semibold text-muted-foreground">Sesión finalizada</div>
            <h2 className="mt-2 text-4xl font-extrabold">{aciertos} / {sesion.length}</h2>
            <p className="mt-1 text-lg font-semibold text-primary">{pct}% de aciertos</p>
            <p className="mt-3 text-sm text-muted-foreground">{areaDecoded} · Nivel {nivel}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={() => { setSesion(null); setNivel(null); }} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                Otra sesión
              </button>
              <Link to="/progreso" className="rounded-xl border-2 px-5 py-2.5 font-semibold hover:bg-secondary">
                Ver mi progreso
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p = sesion[idx];
  const progreso = ((idx) / sesion.length) * 100;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-3 flex items-center justify-between text-sm">
          <Link to="/practicar" className="font-medium text-muted-foreground hover:text-foreground">← Salir</Link>
          <span className="font-semibold">Pregunta {idx + 1} de {sesion.length}</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
        </div>
        <PreguntaCard
          key={p.id}
          pregunta={p}
          onResponder={(ok) => {
            if (ok) setAciertos((a) => a + 1);
            guardarRespuesta({ preguntaId: p.id, area: p.area, subtema: p.subtema, nivel: p.nivel, correcta: ok });
          }}
          onSiguiente={() => setIdx((i) => i + 1)}
          esUltima={idx === sesion.length - 1}
        />
      </div>
    </div>
  );
}
