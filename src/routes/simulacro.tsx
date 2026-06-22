import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Timer } from "lucide-react";
import { AREAS } from "@/data/tipos";
import { BANCO_PREGUNTAS, preguntasAleatorias, preguntasPorArea } from "@/data";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta } from "@/lib/progreso";

const DURACION_MIN = 40;
const TOTAL_PREG = 30;

export const Route = createFileRoute("/simulacro")({
  head: () => ({ meta: [{ title: "Simulacro de examen — INEVAL_UEDE" }] }),
  component: Simulacro,
});

function nivelLogro(score: number): { nombre: string; color: string } {
  if (score < 550) return { nombre: "Insuficiente", color: "text-destructive" };
  if (score < 700) return { nombre: "Elemental", color: "text-warning" };
  if (score < 850) return { nombre: "Satisfactorio", color: "text-primary" };
  return { nombre: "Excelente", color: "text-success" };
}

function Simulacro() {
  const [iniciado, setIniciado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<{ pregunta: any; correcta: boolean; idx: number }[]>([]);
  const [restante, setRestante] = useState(DURACION_MIN * 60);

  const sesion = useMemo(() => {
    if (!iniciado) return [];
    // proporcional por área
    const out: any[] = [];
    const perArea = Math.floor(TOTAL_PREG / AREAS.length);
    for (const a of AREAS) {
      const pool = preguntasPorArea(a);
      out.push(...preguntasAleatorias(pool, perArea));
    }
    // completar con cualquiera
    if (out.length < TOTAL_PREG) {
      const faltan = TOTAL_PREG - out.length;
      const ids = new Set(out.map((p) => p.id));
      const extras = preguntasAleatorias(BANCO_PREGUNTAS.filter((p) => !ids.has(p.id)), faltan);
      out.push(...extras);
    }
    return preguntasAleatorias(out, out.length);
  }, [iniciado]);

  useEffect(() => {
    if (!iniciado || terminado) return;
    const t = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) { clearInterval(t); setTerminado(true); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [iniciado, terminado]);

  if (!iniciado) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
          <div className="mt-5 rounded-2xl border bg-gradient-card p-7 shadow-soft">
            <Timer className="h-10 w-10 text-primary" />
            <h1 className="mt-3 text-3xl font-extrabold">Simulacro de examen</h1>
            <p className="mt-2 text-muted-foreground">
              {TOTAL_PREG} preguntas mezcladas de todas las áreas, en <strong>{DURACION_MIN} minutos</strong>. No verás
              las respuestas hasta finalizar. Al terminar, calcularemos tu <strong>nivel de logro</strong> según la
              escala oficial del INEVAL.
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              <li>• 0–549 → <span className="font-semibold text-destructive">Insuficiente</span></li>
              <li>• 550–699 → <span className="font-semibold text-warning">Elemental</span></li>
              <li>• 700–849 → <span className="font-semibold text-primary">Satisfactorio</span></li>
              <li>• 850–1000 → <span className="font-semibold text-success">Excelente</span></li>
            </ul>
            <button onClick={() => setIniciado(true)} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-soft hover:bg-primary/90">
              Empezar simulacro
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (terminado || idx >= sesion.length) {
    const aciertos = respuestas.filter((r) => r.correcta).length;
    const total = sesion.length;
    const score = Math.round((aciertos / total) * 1000);
    const nivel = nivelLogro(score);
    const porArea: Record<string, { ok: number; total: number }> = {};
    for (const r of respuestas) {
      porArea[r.pregunta.area] ||= { ok: 0, total: 0 };
      porArea[r.pregunta.area].total++;
      if (r.correcta) porArea[r.pregunta.area].ok++;
    }
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <div className="rounded-2xl border bg-gradient-card p-8 shadow-strong">
            <div className="text-center">
              <div className="text-sm font-semibold text-muted-foreground">Resultado del simulacro</div>
              <div className="mt-2 text-5xl font-extrabold">{score}</div>
              <div className={`mt-1 text-xl font-bold ${nivel.color}`}>{nivel.nombre}</div>
              <div className="mt-1 text-sm text-muted-foreground">{aciertos} de {total} correctas</div>
            </div>
            <h3 className="mt-6 mb-2 font-bold">Aciertos por área</h3>
            <div className="space-y-2">
              {Object.entries(porArea).map(([a, v]) => {
                const pct = Math.round((v.ok / v.total) * 100);
                return (
                  <div key={a}>
                    <div className="flex justify-between text-sm font-medium">
                      <span>{a}</span><span>{v.ok}/{v.total} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => { setIniciado(false); setTerminado(false); setIdx(0); setRespuestas([]); setRestante(DURACION_MIN*60); }} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">Otro simulacro</button>
              <Link to="/" className="rounded-xl border-2 px-5 py-2.5 font-semibold hover:bg-secondary">Inicio</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p = sesion[idx];
  const min = Math.floor(restante / 60).toString().padStart(2, "0");
  const seg = (restante % 60).toString().padStart(2, "0");
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <span className="text-sm font-semibold">{idx + 1} / {sesion.length}</span>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${restante < 60 ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Timer className="h-4 w-4" /> {min}:{seg}
          </div>
          <button onClick={() => setTerminado(true)} className="text-sm font-medium text-muted-foreground hover:text-destructive">Terminar</button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-5 py-6">
        <PreguntaCard
          key={p.id}
          pregunta={p}
          mostrarFeedback={false}
          onResponder={(ok, i) => {
            setRespuestas((r) => [...r, { pregunta: p, correcta: ok, idx: i }]);
            guardarRespuesta({ preguntaId: p.id, area: p.area, subtema: p.subtema, nivel: p.nivel, correcta: ok });
            // auto-advance in simulacro
            setTimeout(() => setIdx((x) => x + 1), 100);
          }}
          onSiguiente={() => setIdx((x) => x + 1)}
          esUltima={idx === sesion.length - 1}
        />
      </div>
    </div>
  );
}
