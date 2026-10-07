import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { generarCienciasNaturales, TEMAS_CN, AREA_CN } from "@/data/basica/ciencias-naturales";
import { generarEstudiosSociales, TEMAS_ES, AREA_ES } from "@/data/basica/estudios-sociales";
import { generarMatematicaBasica, TEMAS_MBS, AREA_MBS } from "@/data/basica/matematica-basica";
import { preguntasAleatorias } from "@/data";
import type { Pregunta } from "@/data/tipos";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta, iniciarSesion, finalizarSesion } from "@/lib/progreso";

const MATERIAS = {
  "ciencias-naturales": { area: AREA_CN, temas: TEMAS_CN as readonly string[], gen: generarCienciasNaturales },
  "matematica": { area: AREA_MBS, temas: TEMAS_MBS as readonly string[], gen: generarMatematicaBasica },
  "estudios-sociales": { area: AREA_ES, temas: TEMAS_ES as readonly string[], gen: generarEstudiosSociales },
} as const;
const cache: Record<string, Pregunta[]> = {};

export const Route = createFileRoute("/_authenticated/basica/$materia")({
  head: ({ params }) => {
    const t = params.materia === "estudios-sociales" ? "Estudios Sociales" : params.materia === "matematica" ? "Matemática" : "Ciencias Naturales";
    return { meta: [{ title: `${t} — Básica Superior` }, { name: "description", content: `500 preguntas de ${t} según el currículo ecuatoriano.` }] };
  },
  component: Materia,
});

type NivelSel = "Básico" | "Intermedio" | "Avanzado" | "Todos";

function Materia() {
  const { materia } = Route.useParams();
  const cfg = MATERIAS[materia as keyof typeof MATERIAS] ?? MATERIAS["ciencias-naturales"];
  const banco = useMemo(() => (cache[cfg.area] ??= cfg.gen()), [cfg]);
  const [tema, setTema] = useState<string>("Todos");
  const [sesion, setSesion] = useState<Pregunta[] | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [hecho, setHecho] = useState(false);

  const filtrar = (n: NivelSel) => banco.filter((p) => (tema === "Todos" || p.tema === tema) && (n === "Todos" || p.nivel === n));

  async function iniciar(n: NivelSel) {
    setSesion(preguntasAleatorias(filtrar(n), 15));
    setIdx(0); setAciertos(0); setHecho(false);
    setSesionId(await iniciarSesion("practica", cfg.area));
  }

  if (!sesion) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
        <h1 className="mt-4 text-3xl font-extrabold">{cfg.area}</h1>
        <p className="mt-1 text-muted-foreground">Básica Superior · {banco.length} preguntas · currículo ecuatoriano</p>
        <h2 className="mt-6 font-semibold">1. Elige un bloque</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Todos", ...cfg.temas].map((t) => (
            <button key={t} onClick={() => setTema(t)} className={`rounded-full border px-3 py-1.5 text-sm ${tema === t ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
              {t} ({t === "Todos" ? banco.length : banco.filter((p) => p.tema === t).length})
            </button>
          ))}
        </div>
        <h2 className="mt-6 font-semibold">2. Elige el nivel (15 preguntas)</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(["Básico", "Intermedio", "Avanzado", "Todos"] as NivelSel[]).map((n) => {
            const c = filtrar(n).length;
            return (
              <button key={n} disabled={!c} onClick={() => iniciar(n)} className="rounded-2xl border bg-gradient-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong disabled:opacity-40">
                <div className="text-lg font-bold">{n === "Todos" ? "Todos los niveles" : n}</div>
                <div className="text-sm text-muted-foreground">{c} preguntas</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (idx >= sesion.length) {
    if (!hecho) { setHecho(true); void finalizarSesion(sesionId, sesion.length, aciertos); }
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="rounded-2xl border bg-gradient-card p-8 text-center shadow-strong">
          <div className="text-sm text-muted-foreground">Sesión finalizada · {cfg.area}</div>
          <h2 className="mt-2 text-4xl font-extrabold">{aciertos} / {sesion.length}</h2>
          <p className="text-lg font-semibold text-primary">{Math.round((aciertos / sesion.length) * 100)} % de aciertos</p>
          <button onClick={() => setSesion(null)} className="mt-6 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Otra sesión</button>
        </div>
      </div>
    );
  }

  const p = sesion[idx]!;
  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <div className="mb-3 flex justify-between text-sm">
        <button onClick={() => setSesion(null)} className="text-muted-foreground hover:text-foreground">← Salir</button>
        <span className="font-semibold">Pregunta {idx + 1} de {sesion.length}</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(idx / sesion.length) * 100}%` }} /></div>
      <PreguntaCard key={p.id} pregunta={p} esUltima={idx === sesion.length - 1}
        onResponder={(ok) => { if (ok) setAciertos((a) => a + 1); guardarRespuesta({ preguntaId: p.id, area: p.area, subtema: p.subtema, nivel: p.nivel, correcta: ok, sesionId }); }}
        onSiguiente={() => setIdx((i) => i + 1)} />
    </div>
  );
}
