import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb, Lock, Trophy, RefreshCw, Eye } from "lucide-react";
import { guardarRespuesta } from "@/lib/progreso";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sistemas")({
  head: () => ({
    meta: [
      { title: "Sistemas de ecuaciones por niveles — INEVAL_UEDE" },
      { name: "description", content: "Aprende sistemas de ecuaciones 2x2 y 3x3 en 5 niveles con corrección en tiempo real." },
      { property: "og:title", content: "Sistemas de ecuaciones 2x2 y 3x3" },
      { property: "og:description", content: "5 niveles, corrección inmediata y 3 ejercicios sin ayuda para avanzar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sistemas,
});

const NIVELES = [
  { n: 1, titulo: "2 incógnitas · Básico", desc: "Coeficientes pequeños y positivos", vars: 2, rango: 3, sol: 5, neg: false },
  { n: 2, titulo: "2 incógnitas · Con negativos", desc: "Coeficientes y soluciones negativas", vars: 2, rango: 5, sol: 6, neg: true },
  { n: 3, titulo: "2 incógnitas · Avanzado", desc: "Coeficientes grandes", vars: 2, rango: 9, sol: 10, neg: true },
  { n: 4, titulo: "3 incógnitas · Básico", desc: "Sistemas 3x3 sencillos", vars: 3, rango: 2, sol: 4, neg: false },
  { n: 5, titulo: "3 incógnitas · Avanzado", desc: "Sistemas 3x3 con negativos", vars: 3, rango: 5, sol: 6, neg: true },
] as const;

const META = 3;
const NOMBRES = ["x", "y", "z"];

type Ej = { A: number[][]; sol: number[]; b: number[] };

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function det2(m: number[][]) { return m[0][0] * m[1][1] - m[0][1] * m[1][0]; }
function det3(m: number[][]) {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}
function det(m: number[][]) { return m.length === 2 ? det2(m) : det3(m); }

function generar(nivel: number): Ej {
  const cfg = NIVELES[nivel - 1];
  const k = cfg.vars;
  for (;;) {
    const coef = () => { let c = 0; while (c === 0) c = cfg.neg ? rnd(-cfg.rango, cfg.rango) : rnd(1, cfg.rango); return c; };
    const A = Array.from({ length: k }, () => Array.from({ length: k }, coef));
    if (det(A) === 0) continue;
    const sol = Array.from({ length: k }, () => (cfg.neg ? rnd(-cfg.sol, cfg.sol) : rnd(1, cfg.sol)));
    const b = A.map((row) => row.reduce((s, a, i) => s + a * sol[i], 0));
    return { A, sol, b };
  }
}

function termino(a: number, v: string, primero: boolean) {
  const abs = Math.abs(a);
  const c = abs === 1 ? "" : String(abs);
  if (primero) return `${a < 0 ? "−" : ""}${c}${v}`;
  return ` ${a < 0 ? "−" : "+"} ${c}${v}`;
}
function ecuacion(row: number[], b: number) {
  return row.map((a, i) => termino(a, NOMBRES[i], i === 0)).join("") + ` = ${b}`;
}

function pasosCramer(e: Ej): string[] {
  const D = det(e.A);
  const pasos = [`Determinante del sistema: Δ = ${D}`];
  e.sol.forEach((_, i) => {
    const Ai = e.A.map((row, r) => row.map((a, c) => (c === i ? e.b[r] : a)));
    const Di = det(Ai);
    pasos.push(`Δ${NOMBRES[i]} = ${Di} → ${NOMBRES[i]} = ${Di} / ${D} = ${Di / D}`);
  });
  pasos.push(`Comprobación: reemplaza los valores en cada ecuación y verifica que se cumplan.`);
  return pasos;
}

function pista(e: Ej, n: number): string {
  if (e.A.length === 2) {
    const [a1, b1] = e.A[0]; const [a2, b2] = e.A[1];
    if (n === 0) return `Método de reducción: multiplica la ecuación 1 por ${a2} y la ecuación 2 por ${a1}, luego réstalas para eliminar x.`;
    return `Al eliminar x queda: ${a1 * b2 - a2 * b1}y = ${a1 * e.b[1] - a2 * e.b[0]}. Despeja y, luego reemplaza.`;
  }
  if (n === 0) return "Elige una variable (por ejemplo x) y elimínala combinando las ecuaciones 1-2 y 1-3. Obtendrás un sistema 2x2 en y, z.";
  return "Resuelve el sistema 2x2 resultante, luego reemplaza y, z en la ecuación 1 para hallar x.";
}

type Estado = { nivelMax: number; racha: Record<number, number> };
const KEY = "sistemas_progreso_v1";

function Sistemas() {
  const [st, setSt] = useState<Estado>({ nivelMax: 1, racha: {} });
  const [nivel, setNivel] = useState<number | null>(null);
  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setSt(JSON.parse(s)); } catch { /* */ }
  }, []);
  function guardar(n: Estado) { setSt(n); localStorage.setItem(KEY, JSON.stringify(n)); }

  if (nivel) {
    return <Jugar nivel={nivel} estado={st} guardar={guardar} salir={() => setNivel(null)} />;
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link to="/practicar" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Practicar
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold">Sistemas de ecuaciones</h1>
        <p className="mt-2 text-muted-foreground">Supera cada nivel resolviendo <b>{META} ejercicios seguidos sin ayuda</b> (sin pistas, sin ver solución y al primer intento).</p>
        <div className="mt-6 grid gap-3">
          {NIVELES.map((c) => {
            const bloqueado = c.n > st.nivelMax;
            const superado = c.n < st.nivelMax;
            return (
              <button key={c.n} disabled={bloqueado} onClick={() => setNivel(c.n)}
                className="flex items-center gap-4 rounded-2xl border bg-gradient-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong disabled:opacity-50 disabled:hover:translate-y-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-extrabold text-primary">{c.n}</div>
                <div className="flex-1">
                  <div className="font-bold">{c.titulo}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
                {bloqueado ? <Lock className="h-5 w-5 text-muted-foreground" /> : superado ? <Trophy className="h-5 w-5 text-primary" /> :
                  <span className="text-sm font-semibold text-primary">{st.racha[c.n] ?? 0}/{META}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Jugar({ nivel, estado, guardar, salir }: { nivel: number; estado: Estado; guardar: (e: Estado) => void; salir: () => void }) {
  const [ej, setEj] = useState<Ej>(() => generar(nivel));
  const [vals, setVals] = useState<string[]>(() => ej.sol.map(() => ""));
  const [ayuda, setAyuda] = useState(false);
  const [pistas, setPistas] = useState(0);
  const [verSol, setVerSol] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [resuelto, setResuelto] = useState(false);
  const racha = estado.racha[nivel] ?? 0;
  const cfg = NIVELES[nivel - 1];

  const nums = vals.map((v) => (v.trim() === "" || v === "-" ? null : Number(v)));
  const completos = nums.every((n) => n !== null && !Number.isNaN(n));
  // verificación en tiempo real de cada ecuación
  const evalEq = useMemo(() => ej.A.map((row, r) => {
    if (!completos) return null;
    const lhs = row.reduce((s, a, i) => s + a * (nums[i] as number), 0);
    return { lhs, ok: lhs === ej.b[r] };
  }), [ej, vals]); // eslint-disable-line react-hooks/exhaustive-deps

  function nuevo() {
    const e = generar(nivel);
    setEj(e); setVals(e.sol.map(() => "")); setAyuda(false); setPistas(0); setVerSol(false); setFallos(0); setResuelto(false);
  }

  function comprobar() {
    if (!completos) { toast.error("Completa todos los valores"); return; }
    const ok = nums.every((n, i) => n === ej.sol[i]);
    const sub = cfg.vars === 2 ? "Sistemas 2x2" : "Sistemas 3x3";
    guardarRespuesta({ preguntaId: `sistemas-n${nivel}`, area: "Álgebra y Ecuaciones", subtema: sub, nivel: nivel <= 2 ? "Básico" : nivel <= 4 ? "Intermedio" : "Avanzado", correcta: ok && !ayuda && fallos === 0 });
    if (!ok) {
      setFallos((f) => f + 1);
      if (racha > 0) guardar({ ...estado, racha: { ...estado.racha, [nivel]: 0 } });
      toast.error("Hay errores: revisa las ecuaciones marcadas en rojo");
      return;
    }
    setResuelto(true);
    const limpio = !ayuda && fallos === 0;
    if (!limpio) {
      toast.info("¡Correcto! Pero usaste ayuda o fallaste: resuelve uno nuevo sin ayuda para contar.");
      guardar({ ...estado, racha: { ...estado.racha, [nivel]: 0 } });
      return;
    }
    const nr = racha + 1;
    if (nr >= META) {
      const nivelMax = Math.max(estado.nivelMax, Math.min(5, nivel + 1));
      guardar({ nivelMax: nivel === 5 ? 6 : nivelMax, racha: { ...estado.racha, [nivel]: META } });
      toast.success(nivel === 5 ? "🏆 ¡Dominas los sistemas de ecuaciones!" : `🎉 ¡Nivel ${nivel} superado! Se desbloqueó el nivel ${nivel + 1}`);
    } else {
      guardar({ ...estado, racha: { ...estado.racha, [nivel]: nr } });
      toast.success(`¡Correcto sin ayuda! ${nr}/${META}`);
    }
  }

  const superado = racha >= META;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="flex items-center justify-between text-sm">
          <button onClick={salir} className="font-medium text-muted-foreground hover:text-foreground">← Niveles</button>
          <span className="font-semibold">Nivel {nivel} · {cfg.titulo}</span>
        </div>
        <div className="mt-3 flex gap-2">
          {Array.from({ length: META }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < racha ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Racha sin ayuda: {Math.min(racha, META)}/{META}</p>

        <div className="mt-5 rounded-2xl border bg-gradient-card p-6 shadow-soft">
          <div className="text-sm font-semibold text-muted-foreground">Resuelve el sistema:</div>
          <div className="mt-3 space-y-2 border-l-4 border-primary pl-4 font-mono text-lg sm:text-xl">
            {ej.A.map((row, r) => {
              const ev = evalEq[r];
              return (
                <div key={r} className="flex flex-wrap items-center gap-3">
                  <span>{ecuacion(row, ej.b[r])}</span>
                  {ev && (
                    <span className={`inline-flex items-center gap-1 text-xs font-sans font-semibold ${ev.ok ? "text-primary" : "text-destructive"}`}>
                      {ev.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {ev.ok ? "se cumple" : `con tus valores da ${ev.lhs}, no ${ej.b[r]}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={`mt-6 grid gap-3 ${cfg.vars === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {vals.map((v, i) => (
              <label key={i} className="block">
                <span className="text-sm font-bold">{NOMBRES[i]} =</span>
                <input inputMode="numeric" value={v} disabled={resuelto}
                  onChange={(e) => { const n = [...vals]; n[i] = e.target.value.replace(/[^0-9-]/g, ""); setVals(n); }}
                  className="mt-1 w-full rounded-xl border-2 bg-background px-3 py-2 text-lg font-mono focus:border-primary focus:outline-none" />
              </label>
            ))}
          </div>

          {fallos > 0 && !resuelto && (
            <p className="mt-3 text-sm text-destructive">Intentos fallidos: {fallos}. Revisa signos y operaciones en las ecuaciones marcadas.</p>
          )}

          {pistas > 0 && (
            <div className="mt-4 space-y-2 rounded-xl bg-secondary p-3 text-sm">
              {Array.from({ length: pistas }).map((_, i) => <p key={i}>💡 {pista(ej, i)}</p>)}
            </div>
          )}
          {verSol && (
            <div className="mt-4 space-y-1 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="font-semibold">Solución (Regla de Cramer):</div>
              {pasosCramer(ej).map((p, i) => <p key={i} className="font-mono">{p}</p>)}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {!resuelto ? (
              <>
                <button onClick={comprobar} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">Comprobar</button>
                <button disabled={pistas >= 2} onClick={() => { setAyuda(true); setPistas((p) => p + 1); }} className="inline-flex items-center gap-1 rounded-xl border-2 px-4 py-2.5 font-semibold hover:bg-secondary disabled:opacity-40">
                  <Lightbulb className="h-4 w-4" /> Pista
                </button>
                <button onClick={() => { setAyuda(true); setVerSol(true); }} className="inline-flex items-center gap-1 rounded-xl border-2 px-4 py-2.5 font-semibold hover:bg-secondary">
                  <Eye className="h-4 w-4" /> Ver solución
                </button>
              </>
            ) : (
              <>
                {superado && nivel < 5 ? (
                  <button onClick={salir} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground">Ir al nivel {nivel + 1}</button>
                ) : null}
                <button onClick={nuevo} className="inline-flex items-center gap-1 rounded-xl border-2 px-5 py-2.5 font-semibold hover:bg-secondary">
                  <RefreshCw className="h-4 w-4" /> Ejercicio nuevo
                </button>
              </>
            )}
          </div>
          {(ayuda || fallos > 0) && !resuelto && (
            <p className="mt-3 text-xs text-muted-foreground">Este ejercicio ya no cuenta para la racha. Termínalo y luego resuelve uno nuevo sin ayuda para verificar que aprendiste.</p>
          )}
        </div>
      </div>
    </div>
  );
}
