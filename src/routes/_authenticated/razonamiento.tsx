import { useExamGuard } from "@/hooks/use-exam-guard";
import { ReglasEvaluacion, AvisoExamen } from "@/components/ExamGuard";
import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Lock, Lightbulb, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calcularEdad } from "@/lib/edad";
import { bancoRazonamiento, CONFIG_RAZ, progresoRazonamiento, type NivelRaz, type PreguntaRaz } from "@/data/basica/razonamiento";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta } from "@/lib/progreso";
import { Button } from '@/components/ui/button';
import { avisarNotasActualizadas } from '@/lib/actualizar-notas';

export const Route = createFileRoute("/_authenticated/razonamiento")({
  head: () => ({ meta: [...pageMeta("Razonamiento — 3 niveles adaptativos — INEVAL_UEDE","Razonamiento en la plataforma educativa INEVAL_UEDE."),{ title: "Razonamiento — 3 niveles adaptativos — INEVAL_UEDE" }, { name: "description", content: "Preguntas de razonamiento y resolución de problemas de Básica Superior en tres niveles." }] }),
  component: Razonamiento,
});

interface Estado { aciertos: Record<number, string[]>; fallos: Record<string, number> }
const vacio = (): Estado => ({ aciertos: { 1: [], 2: [], 3: [] }, fallos: {} });

function Razonamiento() {
  const [generacion, setGeneracion] = useState<string | undefined>(undefined);
  const [uid, setUid] = useState<string | null>(null);
  const [edad, setEdad] = useState(14);
  const [est, setEst] = useState<Estado>(vacio);
  const [nivel, setNivel] = useState<NivelRaz | null>(null);
  const [ronda, setRonda] = useState<PreguntaRaz[]>([]);
  const [idx, setIdx] = useState(0);
  const [pendiente, setPendiente] = useState<NivelRaz | null>(null);
  const [notaCierre, setNotaCierre] = useState<string | null>(null);
  const rondaRef = useRef({ ok: 0, resp: 0 });
  const notaRonda = () => rondaRef.current.resp ? (rondaRef.current.ok / rondaRef.current.resp) * 10 : 0;
  const guard = useExamGuard("razonamiento", () => {
    const n = notaRonda();
    setNotaCierre(`${n.toFixed(2)} / 10 (${rondaRef.current.ok} de ${rondaRef.current.resp} correctas)`);
    void guard.finalizar(n);
    setNivel(null);
  });
  const terminarRonda = () => guard.finalizar(notaRonda());
  const [pista, setPista] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? "anon";
      setUid(id);
      if (data.user) {
        const { data: prog } = await (supabase as any).from("razonamiento_progreso").select("*").eq("user_id", id).maybeSingle();
        if (prog) { setGeneracion(prog.generacion); setEst({ aciertos: { 1: [], 2: [], 3: [], ...prog.aciertos }, fallos: prog.fallos ?? {} }); }
        else {
          // Migrar avance anterior guardado en este aparato
          try { const s = localStorage.getItem(`razonamiento:${id}`); if (s) { const e = JSON.parse(s); setEst(e); await (supabase as any).from("razonamiento_progreso").upsert({ user_id: id, aciertos: e.aciertos, fallos: e.fallos }); } } catch { /* */ }
        }
      }
      if (data.user) {
        const { data: perfil } = await supabase.from("profiles").select("fecha_nacimiento").eq("id", data.user.id).maybeSingle();
        if (perfil?.fecha_nacimiento) setEdad(calcularEdad(perfil.fecha_nacimiento).anios);
      }
    })();
  }, []);

  const guardar = (e: Estado, nivelCompletado: boolean) => {
    setEst(e);
    if (uid && uid !== "anon") void (supabase as any).from("razonamiento_progreso").upsert({ user_id: uid, aciertos: e.aciertos, fallos: e.fallos, ...(generacion ? { generacion } : {}) }).then(({ error }: any) => { if (error) console.error(error); else if (nivelCompletado) avisarNotasActualizadas(); });
  };
  const bancos = useMemo(() => ({ 1: bancoRazonamiento(1, edad), 2: bancoRazonamiento(2, edad), 3: bancoRazonamiento(3, edad) }), [edad]);
  const aprobado = (n: NivelRaz) => progresoRazonamiento(n, est.aciertos[n]).aprobado;
  const desbloqueado = (n: NivelRaz) => n === 1 || aprobado((n - 1) as NivelRaz);

  // Adaptativo: prioriza preguntas no acertadas de los subtemas con más fallos.
  function armarRonda(n: NivelRaz) {
    rondaRef.current = { ok: 0, resp: 0 }; setNotaCierre(null);
    const hechas = new Set(est.aciertos[n] ?? []);
    const pend = bancos[n].filter((p) => !hechas.has(p.id));
    pend.sort((a, b) => (est.fallos[b.subtema] ?? 0) - (est.fallos[a.subtema] ?? 0) + (Math.random() - 0.5) * 2);
    setRonda(pend.slice(0, 10)); setIdx(0); setNivel(n); setPista(false);
  }

  if (pendiente) {
    return <ReglasEvaluacion titulo="Razonamiento" guard={guard} onIniciar={() => { armarRonda(pendiente); setPendiente(null); }} onCancelar={() => setPendiente(null)} />;
  }

  const p = ronda[idx];
  if (nivel && p && idx < ronda.length) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-6">
        <AvisoExamen guard={guard} />
        <div className="mb-3 flex justify-between text-sm">
          <Button variant="ghost" size="sm" onClick={() => { terminarRonda(); setNivel(null); }}>← Salir</Button>
          <span className="font-semibold">{CONFIG_RAZ[nivel].titulo} · {idx + 1}/{ronda.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPista((v) => !v)} className="mb-3">
          <Lightbulb className="h-3.5 w-3.5" /> {pista ? "Ocultar estrategia" : "Ver estrategia de resolución"}
        </Button>
        {pista && <div className="mb-3 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">{p.estrategia}</div>}
        <PreguntaCard key={p.id} pregunta={p} esUltima={idx === ronda.length - 1}
          onResponder={(ok) => {
            rondaRef.current.resp++; if (ok) rondaRef.current.ok++;
            const e: Estado = JSON.parse(JSON.stringify(est));
            const aciertos = e.aciertos[nivel] ?? [];
            if (ok && !aciertos.includes(p.id)) aciertos.push(p.id);
            e.aciertos[nivel] = aciertos;
            if (!ok) e.fallos[p.subtema] = (e.fallos[p.subtema] ?? 0) + 1;
            guardar(e, !aprobado(nivel) && progresoRazonamiento(nivel, aciertos).aprobado);
            guardarRespuesta({ preguntaId: p.id, area: "Razonamiento", subtema: p.subtema, nivel: p.nivel, correcta: ok });
          }}
          onSiguiente={() => { if (idx >= ronda.length - 1) terminarRonda(); setIdx((i) => i + 1); setPista(false); }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
      <h1 className="mt-4 text-3xl font-extrabold">Razonamiento</h1>
      <p className="mt-1 text-muted-foreground">Lengua, Matemática, Estudios Sociales y Ciencias Naturales · Básica Superior. Las lecturas se adaptan a tu edad ({edad} años: {edad < 14 ? "textos concretos" : "textos con mayor abstracción"}).</p>
      <AvisoExamen guard={guard} resultado={notaCierre ?? undefined} />
      {notaCierre && <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium">Ronda cerrada por infracciones. Nota de la ronda: {notaCierre}</div>}
      {nivel && <div className="mt-4 rounded-xl border bg-success/10 p-3 text-sm font-medium">Ronda terminada. ¡Sigue practicando para llegar a la meta!</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {([1, 2, 3] as NivelRaz[]).map((n) => {
          const c = CONFIG_RAZ[n], { correctas: ok, meta, total } = progresoRazonamiento(n, est.aciertos[n]), libre = desbloqueado(n);
          return (
            <div key={n} className={`rounded-2xl border bg-gradient-card p-5 shadow-soft ${libre ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between"><h3 className="font-bold">{c.titulo}</h3>{aprobado(n) ? <Trophy className="h-5 w-5 text-success" /> : !libre && <Lock className="h-5 w-5" />}</div>
              <p className="text-xs text-muted-foreground">{c.mezcla}</p>
              <p className="mt-3 text-sm">{total} preguntas disponibles · meta: {Math.round(c.meta * 100)} % ({meta} correctas)</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (ok / meta) * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-muted-foreground">{ok} / {meta} correctas</p>
              <Button disabled={!libre || ok >= bancos[n].length} onClick={() => setPendiente(n)} className="mt-4 w-full">
                {!libre ? `Aprueba el nivel ${n - 1}` : ok >= bancos[n].length ? "Completado" : "Ronda de 10 preguntas"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
