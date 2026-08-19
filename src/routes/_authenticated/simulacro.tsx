import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Timer, RotateCcw, Calculator, Atom } from "lucide-react";
import { AREAS } from "@/data/tipos";
import type { Pregunta } from "@/data/tipos";
import { BANCO_SIMULACRO, preguntasAleatorias } from "@/data";
import { preguntasRepaso } from "@/data";
import { BANCO_FISICA } from "@/data/fisica";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta, iniciarSesion, finalizarSesion } from "@/lib/progreso";

const DURACION_MIN = 40;
const TOTAL_PREG = 30;
const SUBTEMAS_CINEMATICA = ["Caída libre", "MRU", "MRUV"];

type Asignatura = "mate" | "fisica";


export const Route = createFileRoute("/_authenticated/simulacro")({
  head: () => ({ meta: [{ title: "Simulacro de examen — INEVAL_UEDE" }] }),
  component: Simulacro,
});

const NIVELES_INFO = [
  { rango: "0–549", nombre: "Insuficiente", color: "text-destructive", desc: "Los aprendizajes mínimos no se evidencian. Refuerza desde lo básico cada área." },
  { rango: "550–699", nombre: "Elemental", color: "text-warning", desc: "Reconoces conceptos pero te falta seguridad en la resolución. Practica más problemas aplicados." },
  { rango: "700–849", nombre: "Satisfactorio", color: "text-primary", desc: "Dominas los contenidos del nivel. Trabaja en velocidad y en preguntas avanzadas." },
  { rango: "850–1000", nombre: "Excelente", color: "text-success", desc: "Dominio sobresaliente. ¡Estás listo para la prueba!" },
] as const;

function nivelLogro(score: number) {
  if (score < 550) return NIVELES_INFO[0];
  if (score < 700) return NIVELES_INFO[1];
  if (score < 850) return NIVELES_INFO[2];
  return NIVELES_INFO[3];
}

interface Resp { pregunta: Pregunta; correcta: boolean; idx: number }

function aPregunta(p: (typeof BANCO_FISICA)[number]): Pregunta {
  return {
    id: p.id,
    area: "Física",
    tema: String(p.tema),
    subtema: p.subtema,
    nivel: p.nivel,
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuestaCorrecta: p.respuestaCorrecta,
    explicacion: p.explicacion,
  };
}


function Simulacro() {
  const [asignatura, setAsignatura] = useState<Asignatura>("mate");
  const [iniciado, setIniciado] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [idx, setIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Resp[]>([]);
  const [restante, setRestante] = useState(DURACION_MIN * 60);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [guardadoFinal, setGuardadoFinal] = useState(false);

  const esFisica = asignatura === "fisica";

  // Build a non-repeating session proportional across the sources.
  const sesion = useMemo<Pregunta[]>(() => {
    if (!iniciado) return [];

    if (esFisica) {
      const pool = BANCO_FISICA.filter(
        (p) => p.tema === "Cinemática" && SUBTEMAS_CINEMATICA.includes(p.subtema),
      );
      const elegidas: Pregunta[] = [];
      const ids = new Set<string>();
      const perSub = Math.max(1, Math.floor(TOTAL_PREG / SUBTEMAS_CINEMATICA.length));
      for (const s of SUBTEMAS_CINEMATICA) {
        const pick = preguntasAleatorias(pool.filter((p) => p.subtema === s && !ids.has(p.id)), perSub);
        pick.forEach((p) => ids.add(p.id));
        elegidas.push(...pick.map(aPregunta));
      }
      if (elegidas.length < TOTAL_PREG) {
        const extras = preguntasAleatorias(pool.filter((p) => !ids.has(p.id)), TOTAL_PREG - elegidas.length);
        elegidas.push(...extras.map(aPregunta));
      }
      return preguntasAleatorias(elegidas, elegidas.length).slice(0, TOTAL_PREG);
    }

    const elegidas: Pregunta[] = [];
    const ids = new Set<string>();
    // 5 áreas temáticas: ~ (TOTAL_PREG * 0.8)/5 c/u; repaso: ~20%
    const perArea = Math.max(1, Math.floor((TOTAL_PREG * 0.8) / AREAS.length));
    for (const a of AREAS) {
      const pool = BANCO_SIMULACRO.filter((p) => p.area === a && !ids.has(p.id));
      const pick = preguntasAleatorias(pool, perArea);
      pick.forEach((p) => ids.add(p.id));
      elegidas.push(...pick);
    }
    const repasoPool = preguntasRepaso.filter((p) => !ids.has(p.id));
    const repCount = Math.max(0, TOTAL_PREG - elegidas.length - 2);
    const repPick = preguntasAleatorias(repasoPool, repCount);
    repPick.forEach((p) => ids.add(p.id));
    elegidas.push(...repPick);
    // completar si falta
    if (elegidas.length < TOTAL_PREG) {
      const resto = BANCO_SIMULACRO.filter((p) => !ids.has(p.id));
      const extras = preguntasAleatorias(resto, TOTAL_PREG - elegidas.length);
      elegidas.push(...extras);
    }
    return preguntasAleatorias(elegidas, elegidas.length).slice(0, TOTAL_PREG);
  }, [iniciado, esFisica]);

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

  function reiniciar() {
    setIniciado(false); setTerminado(false); setRevisando(false);
    setIdx(0); setRespuestas([]); setRestante(DURACION_MIN * 60);
    setSesionId(null); setGuardadoFinal(false);
  }

  async function empezar() {
    setIniciado(true);
    const id = await iniciarSesion("simulacro", esFisica ? "Física" : null);
    setSesionId(id);
  }

  if (!iniciado) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
          <div className="mt-5 rounded-2xl border bg-gradient-card p-5 shadow-soft sm:p-7">
            <Timer className="h-10 w-10 text-primary" />
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">Simulacro de examen</h1>

            <p className="mt-4 text-sm font-semibold">Elige la asignatura</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setAsignatura("mate")}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${asignatura === "mate" ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
              >
                <Calculator className="h-6 w-6 text-primary" />
                <span>
                  <span className="block font-bold">Matemática</span>
                  <span className="block text-xs text-muted-foreground">5 áreas + repaso</span>
                </span>
              </button>
              <button
                onClick={() => setAsignatura("fisica")}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${asignatura === "fisica" ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
              >
                <Atom className="h-6 w-6 text-primary" />
                <span>
                  <span className="block font-bold">Física</span>
                  <span className="block text-xs text-muted-foreground">Cinemática: caída libre, MRU y MRUA</span>
                </span>
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {esFisica ? (
                <>{TOTAL_PREG} preguntas de <strong>Cinemática</strong> (caída libre, MRU y MRUA), en <strong>{DURACION_MIN} minutos</strong>. Solo se evalúa Física.</>
              ) : (
                <>{TOTAL_PREG} preguntas mezcladas de las 5 áreas + preguntas integradoras de repaso, en <strong>{DURACION_MIN} minutos</strong>.</>
              )}{" "}
              No verás las respuestas hasta finalizar. Al terminar, calcularemos tu <strong>nivel de logro</strong> según la escala oficial del INEVAL.
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              {NIVELES_INFO.map(n => (
                <li key={n.nombre}>• {n.rango} → <span className={`font-semibold ${n.color}`}>{n.nombre}</span></li>
              ))}
            </ul>
            <button onClick={empezar} className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground shadow-soft hover:bg-primary/90">
              Empezar simulacro de {esFisica ? "Física" : "Matemática"}
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (terminado || idx >= sesion.length) {
    const aciertos = respuestas.filter((r) => r.correcta).length;
    const total = sesion.length || TOTAL_PREG;
    const score = Math.round((aciertos / total) * 1000);
    const nivel = nivelLogro(score);
    const errores = respuestas.filter((r) => !r.correcta);
    if (!guardadoFinal) {
      setGuardadoFinal(true);
      void finalizarSesion(sesionId, total, aciertos, score, nivel.nombre, DURACION_MIN * 60 - restante);
    }



    if (revisando) {
      return (
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-3xl px-5 py-8">
            <button onClick={() => setRevisando(false)} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Volver al resultado
            </button>
            <h2 className="mt-4 text-2xl font-extrabold">Revisión de errores</h2>
            <p className="mt-1 text-sm text-muted-foreground">Estas son las preguntas que fallaste con la explicación paso a paso.</p>
            {errores.length === 0 ? (
              <div className="mt-6 rounded-2xl border bg-success/10 p-6 text-center font-semibold text-success">¡No tuviste errores! 🎉</div>
            ) : (
              <div className="mt-5 space-y-4">
                {errores.map((r, k) => {
                  const tuya = r.pregunta.opciones[r.idx];
                  const correcta = r.pregunta.opciones[r.pregunta.respuestaCorrecta];
                  return (
                    <div key={k} className="rounded-2xl border bg-card p-5 shadow-soft">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold">{r.pregunta.area}</span>
                        <span className="rounded-full border px-2.5 py-1">{r.pregunta.nivel}</span>
                      </div>
                      <p className="mt-3 font-medium">{r.pregunta.enunciado}</p>
                      <p className="mt-3 text-sm"><span className="font-semibold text-destructive">Tu respuesta:</span> {tuya}</p>
                      <p className="text-sm"><span className="font-semibold text-success">Respuesta correcta:</span> {correcta}</p>
                      <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm leading-relaxed">{r.pregunta.explicacion}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Desglose: por área en Matemática, por subtema de Cinemática en Física
    const porArea: Record<string, { ok: number; total: number }> = {};
    const claves = esFisica ? SUBTEMAS_CINEMATICA : [...AREAS];
    for (const a of claves) porArea[a] = { ok: 0, total: 0 };
    for (const r of respuestas) {
      const k = esFisica ? r.pregunta.subtema : r.pregunta.area;
      if (porArea[k]) {
        porArea[k].total++;
        if (r.correcta) porArea[k].ok++;
      }
    }


    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <div className="rounded-2xl border bg-gradient-card p-8 shadow-strong">
            <div className="text-center">
              <div className="text-sm font-semibold text-muted-foreground">Resultado del simulacro</div>
              <div className="mt-2 text-5xl font-extrabold">{score}<span className="text-2xl text-muted-foreground"> / 1000</span></div>
              <div className={`mt-2 text-xl font-bold ${nivel.color}`}>{nivel.nombre}</div>
              <p className="mt-1 text-sm text-muted-foreground">{aciertos} de {total} correctas</p>
              <p className="mx-auto mt-3 max-w-md text-sm">{nivel.desc}</p>
            </div>
            <h3 className="mt-6 mb-2 font-bold">{esFisica ? "Desglose por subtema (Cinemática)" : "Desglose por área"}</h3>
            <div className="space-y-2">
              {Object.entries(porArea).map(([a, v]) => {
                const pct = v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0;
                return (
                  <div key={a}>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="truncate pr-2">{a}</span>
                      <span>{v.ok}/{v.total} ({pct}%)</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button onClick={() => setRevisando(true)} className="rounded-xl border-2 border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary/5">
                Revisar mis errores ({errores.length})
              </button>
              <button onClick={reiniciar} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                <RotateCcw className="h-4 w-4" /> Otro simulacro
              </button>
              <Link to="/resultados" search={{ as: undefined }} className="rounded-xl border-2 px-5 py-2.5 font-semibold hover:bg-secondary">Mis resultados</Link>
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
            guardarRespuesta({ preguntaId: p.id, area: p.area, subtema: p.subtema, nivel: p.nivel, correcta: ok, sesionId });
            setTimeout(() => setIdx((x) => x + 1), 100);
          }}
          onSiguiente={() => setIdx((x) => x + 1)}
          esUltima={idx === sesion.length - 1}
        />
      </div>
    </div>
  );
}
