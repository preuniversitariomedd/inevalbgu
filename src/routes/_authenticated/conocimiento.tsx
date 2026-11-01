import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock, Trophy, BookOpenCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BANCO_CONOCIMIENTO, CONFIG_CON, preguntasConocimiento, type NivelCon } from "@/data/conocimiento";
import { PreguntaCard } from "@/components/PreguntaCard";
import { guardarRespuesta } from "@/lib/progreso";
import { useAccesos } from '@/components/AccesoModulo';
import { useQuery } from '@tanstack/react-query';
import { misAccesosFn } from '@/lib/grupo-config.functions';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute("/_authenticated/conocimiento")({
  head: () => ({
    meta: [...pageMeta("Conocimiento — Lectura comprensiva por niveles — INEVAL_UEDE","Conocimiento en la plataforma educativa INEVAL_UEDE."),
      { title: "Conocimiento — Lectura comprensiva por niveles — INEVAL_UEDE" },
      { name: "description", content: "840 preguntas de lectura comprensiva y razonamiento EGB en tres niveles con metas de avance." },
    ],
  }),
  component: Conocimiento,
});

interface Estado { aciertos: Record<number, string[]>; fallos: Record<string, number> }
const vacio = (): Estado => ({ aciertos: { 1: [], 2: [], 3: [] }, fallos: {} });

const TOTALES: Record<NivelCon, number> = {
  1: preguntasConocimiento(1).length,
  2: preguntasConocimiento(2).length,
  3: preguntasConocimiento(3).length,
};

function metaDe(n: NivelCon) {
  return Math.ceil(TOTALES[n] * CONFIG_CON[n].meta);
}

function Conocimiento() {
  const accesos = useAccesos();
  const config = useQuery({ queryKey: ['mis-accesos'], queryFn: () => misAccesosFn() });
  const [uid, setUid] = useState<string | null>(null);
  const [est, setEst] = useState<Estado>(vacio);
  const [nivel, setNivel] = useState<NivelCon | null>(null);
  const [ronda, setRonda] = useState<typeof BANCO_CONOCIMIENTO>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? "anon";
      setUid(id);
      if (data.user) {
        const { data: prog } = await supabase
          .from("conocimiento_progreso")
          .select("aciertos, fallos")
          .eq("user_id", id)
          .maybeSingle();
        if (prog) {
          setEst({ aciertos: { 1: [], 2: [], 3: [], ...(prog.aciertos as Record<number, string[]>) }, fallos: (prog.fallos as Record<string, number>) ?? {} });
        } else {
          // Migrar avance anterior guardado en este aparato
          try {
            const s = localStorage.getItem(`conocimiento:${id}`);
            if (s) {
              const e = JSON.parse(s) as Estado;
              setEst(e);
              await supabase.from("conocimiento_progreso").upsert({ user_id: id, aciertos: e.aciertos, fallos: e.fallos });
            }
          } catch { /* */ }
        }
      }
    })();
  }, []);

  const guardar = (e: Estado) => {
    setEst(e);
    if (uid && uid !== "anon") {
      void supabase
        .from("conocimiento_progreso")
        .upsert({ user_id: uid, aciertos: e.aciertos, fallos: e.fallos })
        .then(({ error }) => error && console.error(error));
    }
  };

  const bancos = useMemo(() => ({ 1: preguntasConocimiento(1), 2: preguntasConocimiento(2), 3: preguntasConocimiento(3) }), []);
  const aprobado = (n: NivelCon) => (est.aciertos[n]?.length ?? 0) >= metaDe(n);
  const desbloqueado = (n: NivelCon) => n === 1 || aprobado((n - 1) as NivelCon);

  // Adaptativo: prioriza preguntas no acertadas de los subtemas con más fallos.
  function armarRonda(n: NivelCon) {
    const hechas = new Set(est.aciertos[n] ?? []);
    const pend = bancos[n].filter((p) => !hechas.has(p.id));
    pend.sort((a, b) => (est.fallos[b.subtema] ?? 0) - (est.fallos[a.subtema] ?? 0) + (Math.random() - 0.5) * 2);
    setRonda(pend.slice(0, 10));
    setIdx(0);
    setNivel(n);
  }

  const p = ronda[idx];
  if (nivel && p && idx < ronda.length) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="mb-3 flex justify-between text-sm">
          <Button variant="ghost" size="sm" onClick={() => setNivel(null)}>← Salir</Button>
          <span className="font-semibold">{CONFIG_CON[nivel].titulo} · {idx + 1}/{ronda.length}</span>
        </div>
        <div className="mb-3 flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent-foreground">
          <ShieldAlert className="h-3.5 w-3.5" /> Copia deshabilitada: las preguntas no se pueden copiar ni pegar.
        </div>
        <PreguntaCard
          key={p.id}
          pregunta={p}
          esUltima={idx === ronda.length - 1}
          onResponder={(ok) => {
            const e: Estado = JSON.parse(JSON.stringify(est));
            const aciertos = e.aciertos[nivel] ?? [];
            if (ok && !aciertos.includes(p.id)) aciertos.push(p.id);
            e.aciertos[nivel] = aciertos;
            if (!ok) e.fallos[p.subtema] = (e.fallos[p.subtema] ?? 0) + 1;
            guardar(e);
            guardarRespuesta({ preguntaId: p.id, area: "Conocimiento", subtema: p.subtema, nivel: p.nivel, correcta: ok });
          }}
          onSiguiente={() => setIdx((i) => i + 1)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold">Conocimiento</h1>
      <p className="mt-1 text-muted-foreground">
        {BANCO_CONOCIMIENTO.length} preguntas de lectura comprensiva en situaciones reales y párrafos técnicos.
        Supera cada nivel para desbloquear el siguiente.
      </p>
      {nivel && (
        <div className="mt-4 rounded-xl border bg-success/10 p-3 text-sm font-medium">
          Ronda terminada. ¡Sigue practicando para llegar a la meta!
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {([1, 2, 3] as NivelCon[]).map((n) => {
          const c = CONFIG_CON[n];
          const ok = est.aciertos[n]?.length ?? 0;
          const meta = metaDe(n);
          const libre = desbloqueado(n);
          return (
            <div key={n} className={`rounded-2xl border bg-gradient-card p-5 shadow-soft ${libre ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{c.titulo}</h3>
                {aprobado(n) ? <Trophy className="h-5 w-5 text-success" /> : !libre && <Lock className="h-5 w-5" />}
              </div>
              <p className="text-xs text-muted-foreground">{c.descripcion}</p>
              <p className="mt-3 text-sm">{TOTALES[n]} preguntas · meta: {meta} correctas ({c.meta * 100} %)</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (ok / meta) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{ok} / {meta} correctas</p>
              <Button
                disabled={!libre || ok >= TOTALES[n]}
                onClick={() => armarRonda(n)}
                className="mt-4 w-full"
              >
                {!libre ? `Aprueba el nivel ${n - 1}` : ok >= TOTALES[n] ? "Completado" : "Ronda de 10 preguntas"}
              </Button>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-start gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Tu avance se guarda en tu cuenta (asociada a tu cédula){accesos.conocimiento && config.data ? <> y cuenta para el <strong>{config.data.ponderaciones.conocimiento} % de tu nota global</strong></> : '.'}.
          Lee cada texto con calma: la respuesta siempre se apoya en lo que dice o insinúa el párrafo.
        </p>
      </div>
    </div>
  );
}
