import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { calificacionAsignaturasFn, obtenerProgresoFn } from "@/lib/progreso.functions";
import { PARTES, type Parte } from '@/lib/grupo-config';
import { useAccesos } from './AccesoModulo';
import { moduloDeRuta } from '@/lib/grupo-config';

type Consejo = { titulo: string; texto: string; to?: string; params?: any; cta?: string };

function nivelTexto(n: number) {
  if (n >= 9) return { etiqueta: "Excelente", color: "hsl(150 60% 40%)" };
  if (n >= 7) return { etiqueta: "Buen ritmo", color: "hsl(200 80% 45%)" };
  if (n >= 5) return { etiqueta: "Vas mejorando", color: "hsl(38 92% 45%)" };
  return { etiqueta: "Necesitas empujar", color: "hsl(0 72% 51%)" };
}

export function CoachFlotante() {
  const accesos = useAccesos();
  const [abierto, setAbierto] = useState(false);

  const cal = useQuery({
    queryKey: ["calificacion", "me"],
    queryFn: () => calificacionAsignaturasFn({ data: {} }),
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
  const prog = useQuery({
    queryKey: ["progreso", "coach"],
    queryFn: () => obtenerProgresoFn({ data: {} }),
    refetchInterval: 60000,
  });

  const data = cal.data as any;
  const respuestas: any[] = ((prog.data as any)?.respuestas ?? []) as any[];

  const debiles = useMemo(() => {
    const mapa = new Map<string, { area: string; subtema: string; total: number; ok: number }>();
    for (const r of respuestas) {
      const key = `${r.area}||${r.subtema}`;
      const cur = mapa.get(key) ?? { area: r.area, subtema: r.subtema, total: 0, ok: 0 };
      cur.total++;
      if (r.correcta) cur.ok++;
      mapa.set(key, cur);
    }
    return Array.from(mapa.values())
      .filter((g) => g.total >= 3)
      .map((g) => ({ ...g, pct: Math.round((g.ok / g.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
  }, [respuestas]);

  const promedio = data?.global?.nota ?? (data ? data.asignaturas.reduce((a: number, x: { nota: number }) => a + x.nota, 0) / data.asignaturas.length : 0);
  const nivel = nivelTexto(promedio);

  const consejos = useMemo<Consejo[]>(() => {
    if (!data) return [];
    const out: Consejo[] = [];
    if (data.global?.ponderaciones) {
      const g = data.global;
      const enlaces: Record<Parte,string> = { plataforma:'/progreso', practicas:'/practicar', simulacro:'/simulacro', conocimiento:'/conocimiento', razonamiento:'/razonamiento' };
      return (Object.keys(PARTES) as Parte[]).filter(k => g.ponderaciones[k] > 0).map(k => ({
        falta:g.ponderaciones[k]/10-g.componentes[k],
        consejo:{ titulo:`${PARTES[k]}: ${g.componentes[k].toFixed(1)}/${g.ponderaciones[k]/10} pts`, texto:k === 'plataforma' ? `Llevas ${g.detalle.horasPlataforma} h de la meta de 20 h.` : k === 'practicas' ? 'Responde prácticas correctamente y revisa las explicaciones de tus errores.' : k === 'simulacro' ? 'Completa simulacros y mejora el porcentaje de aciertos.' : 'Responde nuevas preguntas correctamente y alcanza las metas de cada nivel.', to:enlaces[k], cta:'Ver' } as Consejo,
      })).filter(x => x.falta > 0.05).sort((a,b) => b.falta-a.falta).slice(0,3).map(x => x.consejo);
    }
    const c = data.matematica.componentes;
    const cf = data.fisica.componentes;

    const faltaPlataforma = 40 - Math.max(c.plataforma, cf.plataforma);
    const faltaActivo = 20 - Math.max(c.activo, cf.activo);
    const faltaConstancia = 20 - Math.max(c.constancia, cf.constancia);
    const faltaSimM = 20 - c.simulacro;
    const faltaSimF = 20 - cf.simulacro;

    const ratio = data.horasPlataforma > 0 ? data.horasActivas / data.horasPlataforma : 0;

    const pendientes = [
      {
        falta: faltaSimM,
        c: {
          titulo: `Rinde un simulacro de Matemática (+${faltaSimM.toFixed(1)} pts)`,
          texto:
            data.matematica.simulacros === 0
              ? "Aún no has rendido ninguno. Un solo simulacro completo te sube la nota más rápido que cualquier otra cosa."
              : "Repetir simulacros sube tu promedio de aciertos, que es lo que se califica aquí.",
          to: "/simulacro",
          cta: "Ir al simulacro",
        } as Consejo,
      },
      {
        falta: faltaSimF,
        c: {
          titulo: `Rinde un simulacro de Física (+${faltaSimF.toFixed(1)} pts)`,
          texto: "Elige Física al iniciar el simulacro: son 30 preguntas de cinemática (caída libre, MRU, MRUA).",
          to: "/simulacro",
          cta: "Ir al simulacro",
        } as Consejo,
      },
      {
        falta: faltaConstancia,
        c: {
          titulo: `Entra más días seguidos (+${faltaConstancia.toFixed(1)} pts)`,
          texto: `Llevas ${data.diasConectado} día(s) con conexión. Sesiones cortas y diarias valen más que una maratón de un solo día.`,
          to: "/practicar",
          cta: "Practicar 10 minutos",
        } as Consejo,
      },
      {
        falta: faltaActivo,
        c: {
          titulo: `Aprovecha mejor el tiempo activo (+${faltaActivo.toFixed(1)} pts)`,
          texto:
            ratio < 0.4
              ? "Pasas bastante rato con la app abierta pero sin resolver. Responde preguntas mientras estás dentro: solo cuenta el tiempo en el que interactúas."
              : "Vas bien: sigue resolviendo ejercicios en lugar de solo leer.",
          to: "/practicar",
          cta: "Resolver ejercicios",
        } as Consejo,
      },
      {
        falta: faltaPlataforma,
        c: {
          titulo: `Suma horas de estudio (+${faltaPlataforma.toFixed(1)} pts)`,
          texto: `Llevas ${data.horasPlataforma} h en la plataforma. Con bloques de 30–40 minutos completas el puntaje sin agotarte.`,
          to: "/biblioteca",
          cta: "Ver material",
        } as Consejo,
      },
    ]
      .filter((p) => p.falta > 0.5)
      .sort((a, b) => b.falta - a.falta)
      .slice(0, 3)
      .map((p) => p.c);

    // Consejos según la nota global (10% plataforma · 30% simulacro · 30% conocimiento · 30% razonamiento)
    const g = data.global;
    if (g) {
      const partes = [
        { falta: 3 - g.componentes.simulacro, c: { titulo: `Simulacros: ${g.componentes.simulacro.toFixed(1)}/3 pts`, texto: g.detalle.pctSimulacro === 0 ? "Rinde tu primer simulacro completo: es la forma más rápida de subir tu nota." : `Tu promedio en simulacros es ${g.detalle.pctSimulacro} %. Repetir simulacros lo sube.`, to: "/simulacro", cta: "Ir al simulacro" } as Consejo },
        { falta: 3 - g.componentes.conocimiento, c: { titulo: `Conocimiento: ${g.componentes.conocimiento.toFixed(1)}/3 pts`, texto: `Llevas ${g.detalle.pctConocimiento} % del avance. Supera las metas de cada nivel de lectura (90 %, 80 %, 75 %).`, to: "/conocimiento", cta: "Practicar lectura" } as Consejo },
        { falta: 3 - g.componentes.razonamiento, c: { titulo: `Razonamiento: ${g.componentes.razonamiento.toFixed(1)}/3 pts`, texto: `Llevas ${g.detalle.pctRazonamiento} % del avance. Cada nivel aprobado suma un tercio de esta parte.`, to: "/razonamiento", cta: "Entrenar razonamiento" } as Consejo },
        { falta: 1 - g.componentes.plataforma, c: { titulo: `Tiempo en plataforma: ${g.componentes.plataforma.toFixed(1)}/1 pt`, texto: `Llevas ${g.detalle.horasPlataforma} h de 20 h. Bloques diarios de 30–40 minutos completan este punto.`, to: "/practicar", cta: "Practicar ahora" } as Consejo },
      ]
        .filter((p) => p.falta > 0.2)
        .sort((a, b) => b.falta - a.falta)
        .slice(0, 2);
      out.push(...partes.map((p) => p.c));
    }

    out.push(...pendientes);

    if (debiles.length > 0) {
      const d = debiles[0];
      if (!d) return out;
      out.push({
        titulo: `Tu tema más flojo: ${d.subtema}`,
        texto: `Solo ${d.pct}% de aciertos en ${d.total} intentos de ${d.area}. Repasa la teoría y practica en nivel básico antes de subir de dificultad.`,
        to: "/analisis",
        cta: "Ver mis errores",
      });
      out.push({
        titulo: "Pídele ayuda a Mr. Victor",
        texto: `Escríbele: "explícame ${d.subtema} paso a paso con un ejemplo sencillo". Te guía según tu forma de aprender.`,
        to: "/tutor",
        cta: "Abrir Mr. Victor",
      });
    }

    if (out.length === 0) {
      out.push({
        titulo: "¡Vas excelente!",
        texto: "Mantén el ritmo: un simulacro por semana y práctica diaria para no perder nivel.",
        to: "/practicar",
        cta: "Seguir practicando",
      });
    }
    return out;
  }, [data, debiles]);
  const consejosVisibles = consejos.filter(c => { const m = c.to ? moduloDeRuta(c.to) : null; return !m || accesos[m]; });

  if (!data) return null;

  return (
    <>
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 py-2 pl-2 pr-4 text-white shadow-lg transition hover:scale-105"
          title="Mi nota y cómo mejorarla"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-sm font-extrabold tabular-nums">
            {promedio.toFixed(1)}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-medium opacity-90">Mi nota</span>
            <span className="block text-xs font-bold">Cómo mejorar</span>
          </span>
        </button>
      )}

      {abierto && (
        <div className="fixed inset-x-3 bottom-3 z-50 max-h-[80vh] overflow-y-auto rounded-2xl border bg-card p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:w-[24rem]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-extrabold">
                <Sparkles className="h-4 w-4 text-primary" /> Tu nota ahora
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tabular-nums" style={{ color: nivel.color }}>
                  {promedio.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">/10 · {nivel.etiqueta}</span>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="rounded-full border p-1.5 text-muted-foreground hover:bg-secondary"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border bg-secondary/40 p-2">
              <div className="font-semibold">📐 Matemática</div>
              <div className="text-lg font-extrabold tabular-nums">{data.matematica.nota.toFixed(1)}</div>
            </div>
            {accesos.fisica && <div className="rounded-xl border bg-secondary/40 p-2">
              <div className="font-semibold">⚛️ Física</div>
              <div className="text-lg font-extrabold tabular-nums">{data.fisica.nota.toFixed(1)}</div>
            </div>}
          </div>

          <p className="mt-3 text-xs font-semibold text-muted-foreground">Qué te falta para subir</p>
          <div className="mt-2 space-y-2">
            {consejosVisibles.map((c, i) => (
              <div key={i} className="rounded-xl border p-3">
                <div className="text-sm font-bold">{c.titulo}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.texto}</p>
                {c.to && (
                  <Link
                    to={c.to as any}
                    onClick={() => setAbierto(false)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    {c.cta ?? "Ir"} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          <Link
            to="/progreso"
            search={{ u: undefined } as any}
            onClick={() => setAbierto(false)}
            className="mt-3 block rounded-xl bg-secondary px-3 py-2 text-center text-xs font-semibold hover:bg-secondary/70"
          >
            Ver todo mi progreso
          </Link>
        </div>
      )}
    </>
  );
}
