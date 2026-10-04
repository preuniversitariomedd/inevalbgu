import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Lightbulb, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcularEdad } from "@/lib/edad";
import { bancoRazonamiento, CONFIG_RAZ, type NivelRaz, type PreguntaRaz } from "@/data/basica/razonamiento";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta } from "@/lib/progreso";

export const Route = createFileRoute("/_authenticated/razonamiento")({
  head: () => ({ meta: [{ title: "Razonamiento — 3 niveles adaptativos" }, { name: "description", content: "Preguntas de razonamiento y resolución de problemas de Básica Superior en tres niveles." }] }),
  component: Razonamiento,
});

interface Estado { aciertos: Record<number, string[]>; fallos: Record<string, number> }
const vacio = (): Estado => ({ aciertos: { 1: [], 2: [], 3: [] }, fallos: {} });

function Razonamiento() {
  const [uid, setUid] = useState<string | null>(null);
  const [edad, setEdad] = useState(14);
  const [est, setEst] = useState<Estado>(vacio);
  const [nivel, setNivel] = useState<NivelRaz | null>(null);
  const [ronda, setRonda] = useState<PreguntaRaz[]>([]);
  const [idx, setIdx] = useState(0);
  const [pista, setPista] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? "anon";
      setUid(id);
      try { const s = localStorage.getItem(`razonamiento:${id}`); if (s) setEst(JSON.parse(s)); } catch { /* */ }
      if (data.user) {
        const { data: perfil } = await supabase.from("profiles").select("fecha_nacimiento").eq("id", data.user.id).maybeSingle();
        if (perfil?.fecha_nacimiento) setEdad(calcularEdad(perfil.fecha_nacimiento).anios);
      }
    })();
  }, []);

  const guardar = (e: Estado) => { setEst(e); if (uid) localStorage.setItem(`razonamiento:${uid}`, JSON.stringify(e)); };
  const bancos = useMemo(() => ({ 1: bancoRazonamiento(1, edad), 2: bancoRazonamiento(2, edad), 3: bancoRazonamiento(3, edad) }), [edad]);
  const aprobado = (n: NivelRaz) => (est.aciertos[n]?.length ?? 0) >= Math.ceil(CONFIG_RAZ[n].total * CONFIG_RAZ[n].meta);
  const desbloqueado = (n: NivelRaz) => n === 1 || aprobado((n - 1) as NivelRaz);

  // Adaptativo: prioriza preguntas no acertadas de los subtemas con más fallos.
  function armarRonda(n: NivelRaz) {
    const hechas = new Set(est.aciertos[n] ?? []);
    const pend = bancos[n].filter((p) => !hechas.has(p.id));
    pend.sort((a, b) => (est.fallos[b.subtema] ?? 0) - (est.fallos[a.subtema] ?? 0) + (Math.random() - 0.5) * 2);
    setRonda(pend.slice(0, 10)); setIdx(0); setNivel(n); setPista(false);
  }

  if (nivel && idx < ronda.length) {
    const p = ronda[idx]!;
    return (
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-3 flex justify-between text-sm">
          <button onClick={() => setNivel(null)} className="text-muted-foreground hover:text-foreground">← Salir</button>
          <span className="font-semibold">{CONFIG_RAZ[nivel].titulo} · {idx + 1}/{ronda.length}</span>
        </div>
        <button onClick={() => setPista((v) => !v)} className="mb-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-secondary">
          <Lightbulb className="h-3.5 w-3.5" /> {pista ? "Ocultar estrategia" : "Ver estrategia de resolución"}
        </button>
        {pista && <div className="mb-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">{p.estrategia}</div>}
        <PreguntaCard key={p.id} pregunta={p} esUltima={idx === ronda.length - 1}
          onResponder={(ok) => {
            const e: Estado = JSON.parse(JSON.stringify(est));
            if (ok && !e.aciertos[nivel]!.includes(p.id)) e.aciertos[nivel]!.push(p.id);
            if (!ok) e.fallos[p.subtema] = (e.fallos[p.subtema] ?? 0) + 1;
            guardar(e);
            guardarRespuesta({ preguntaId: p.id, area: "Razonamiento", subtema: p.subtema, nivel: p.nivel, correcta: ok });
          }}
          onSiguiente={() => { setIdx((i) => i + 1); setPista(false); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
      <h1 className="mt-4 text-3xl font-extrabold">Razonamiento</h1>
      <p className="mt-1 text-muted-foreground">Lengua, Matemática, Estudios Sociales y Ciencias Naturales · Básica Superior. Las lecturas se adaptan a tu edad ({edad} años: {edad < 14 ? "textos concretos" : "textos con mayor abstracción"}).</p>
      {nivel && <div className="mt-4 rounded-xl border bg-success/10 p-3 text-sm font-medium">Ronda terminada. ¡Sigue practicando para llegar a la meta!</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {([1, 2, 3] as NivelRaz[]).map((n) => {
          const c = CONFIG_RAZ[n], ok = est.aciertos[n]?.length ?? 0, meta = Math.ceil(c.total * c.meta), libre = desbloqueado(n);
          return (
            <div key={n} className={`rounded-2xl border bg-gradient-card p-5 shadow-soft ${libre ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between"><h3 className="font-bold">{c.titulo}</h3>{aprobado(n) ? <Trophy className="h-5 w-5 text-success" /> : !libre && <Lock className="h-5 w-5" />}</div>
              <p className="text-xs text-muted-foreground">{c.mezcla}</p>
              <p className="mt-3 text-sm">{c.total} preguntas · meta: {meta} correctas ({c.meta * 100} %)</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (ok / meta) * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-muted-foreground">{ok} / {meta} correctas</p>
              <button disabled={!libre || ok >= c.total} onClick={() => armarRonda(n)} className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                {!libre ? `Aprueba el nivel ${n - 1}` : ok >= c.total ? "Completado" : "Ronda de 10 preguntas"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
