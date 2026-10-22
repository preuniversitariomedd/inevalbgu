import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SelectorPeriodo } from "@/components/SelectorPeriodo";
import { Button } from "@/components/ui/button";
import { listarPeriodosFn, crearPeriodoFn } from "@/lib/periodos.functions";
import { etiquetaPeriodo, type Periodo } from "@/lib/periodos";
import { getCurrentProfile } from "@/lib/auth-helpers";
import type { NotaGlobal } from "@/lib/nota-global";
import { useQuery } from "@tanstack/react-query";
import { calificacionesEstudiantesFn } from "@/lib/presencia.functions";
import { listarGruposFn, listarEstudiantesGrupoFn } from "@/lib/admin.functions";
import { ABREVIATURAS_ASIG, CLAVES_ASIGNATURAS, NOMBRES_ASIG, type ClaveAsignatura } from "@/lib/asignaturas";
import { Download, FileSpreadsheet, FileText, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/calificaciones")({
  head: () => ({ meta: [
    { title: "Calificaciones por período — PreUniversitario MEDD" },
    { name: "description", content: "Notas por grupo, asignatura y período de evaluación de PreUniversitario MEDD." },
    { property: "og:title", content: "Calificaciones por período — PreUniversitario MEDD" },
    { property: "og:description", content: "Consulta las notas de estudiantes dentro de las fechas de cada grupo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CalificacionesPage,
});

type Fila = {
  id: string;
  cedula: string;
  nombres: string;
  institucion: string;
  genero: string | null;
  total_respuestas: number;
  correctas: number;
  precision_pct: number;
  sesiones_practica: number;
  horas_activas: number;
  nota: number;
  global?: NotaGlobal;
  tiempoHistoricoIncompleto?: boolean;
  notas: Partial<Record<ClaveAsignatura, number>>;
  notasDetalle?: { clave: ClaveAsignatura; nota: number; simulacros: number }[];
};

function notaDe(f: Fila, clave: ClaveAsignatura): number {
  return f.notas?.[clave] ?? 0;
}

function notaColor(n: number) {
  if (n >= 9) return "text-emerald-600";
  if (n >= 7) return "text-primary";
  if (n >= 5) return "text-amber-600";
  return "text-rose-600";
}

type Nivel = "excelente" | "bueno" | "riesgo" | "critico";

function nivelDe(n: number): Nivel {
  if (n >= 9) return "excelente";
  if (n >= 7) return "bueno";
  if (n >= 5) return "riesgo";
  return "critico";
}

const NIVEL_INFO: Record<Nivel, { label: string; badge: string; fila: string }> = {
  excelente: {
    label: "Excelente (9–10)",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    fila: "bg-emerald-500/5",
  },
  bueno: {
    label: "Bueno (7–8.9)",
    badge: "bg-primary/15 text-primary",
    fila: "",
  },
  riesgo: {
    label: "En riesgo (5–6.9)",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    fila: "bg-amber-500/5",
  },
  critico: {
    label: "Crítico (< 5)",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    fila: "bg-rose-500/10",
  },
};

/** Mensaje personalizado según el punto más flojo del estudiante. */
function consejoDe(f: Fila) {
  if (f.global) {
    const c = f.global.componentes;
    const opciones = [
      { valor: c.plataforma, texto: 'Tiempo: sumar sesiones regulares de estudio.' },
      { valor: c.simulacro / 3, texto: 'Simulacros: revisar errores y rendir un examen completo.' },
      { valor: c.conocimiento / 3, texto: 'Conocimiento: responder nuevas preguntas correctamente en cada nivel.' },
      { valor: c.razonamiento / 3, texto: 'Razonamiento: reforzar estrategias y completar los niveles.' },
    ];
    return opciones.sort((a, b) => a.valor - b.valor)[0]?.texto ?? '';
  }
  const nivel = nivelDe(f.nota);
  if (nivel === "excelente") {
    return `Rendimiento sobresaliente (${f.precision_pct}% de precisión). Proponle simulacros completos y ejercicios de mayor dificultad.`;
  }
  const faltas: string[] = [];
  if (f.precision_pct < 70) faltas.push(`precisión baja (${f.precision_pct}%): repasar los temas con más fallas`);
  if (f.sesiones_practica < 10) faltas.push(`poca constancia (${f.sesiones_practica} sesiones): practicar al menos 3 veces por semana`);
  if (f.horas_activas < 10) faltas.push(`poco tiempo activo (${f.horas_activas} h): sesiones de 25–30 min guiadas`);
  if (f.total_respuestas < 30) faltas.push(`muy pocas preguntas resueltas (${f.total_respuestas})`);
  if (faltas.length === 0) {
    return nivel === "bueno"
      ? "Muy cerca de la excelencia: sumar simulacros cronometrados para afinar velocidad."
      : "Mantener el ritmo y reforzar los subtemas con menor porcentaje de aciertos.";
  }
  const prefijo = nivel === "critico" ? "Atención urgente — " : "Para subir la nota — ";
  return prefijo + faltas.join("; ") + ".";
}


async function exportarExcel(filas: Fila[], periodo: string) {
  const XLSX = await import("xlsx");
  const data = filas.map((f) => {
    const base: Record<string, string | number> = {
      Período: periodo,
      Cédula: f.cedula,
      Nombres: f.nombres,
      Institución: f.institucion,
      Género: f.genero ?? "",
      "Respuestas totales": f.total_respuestas,
      Correctas: f.correctas,
      "Precisión %": f.precision_pct,
      "Sesiones de práctica": f.sesiones_practica,
      "Horas activas": f.horas_activas,
      "Nota general /10": f.nota,
    };
    for (const clave of CLAVES_ASIGNATURAS) {
      base[`${NOMBRES_ASIG[clave]} /10`] = notaDe(f, clave);
    }
    return base;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
  XLSX.writeFile(wb, `calificaciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportarPdf(filas: Fila[], periodo: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("INEVAL_UEDE — Calificaciones de estudiantes", 14, 14);
  doc.setFontSize(9);
  doc.text(`${periodo} · Generado: ${new Date().toLocaleString("es-EC")}`, 14, 20);
  autoTable(doc, {
    startY: 25,
    head: [["CI", "Nombres", "Institución", "Resp.", "Aciertos", "Precisión", "Sesiones", "Horas", "Nota /10", "Mate", "Fís", "MBS", "C. Nat", "E. Soc", "Bach"]],
    body: filas.map((f) => [
      f.cedula,
      f.nombres,
      f.institucion,
      f.total_respuestas,
      f.correctas,
      `${f.precision_pct}%`,
      f.sesiones_practica,
      f.horas_activas,
      f.nota.toFixed(1),
      ...CLAVES_ASIGNATURAS.map((clave) => notaDe(f, clave).toFixed(1)),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [33, 99, 232], fontSize: 7 },
  });
  doc.save(`calificaciones-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function CalificacionesPage() {
  const [grupoId, setGrupoId] = useState<string>("");
  const [nivelFiltro, setNivelFiltro] = useState<Nivel | "">("");
  const [busqueda, setBusqueda] = useState<string>("");
  const [generoFiltro, setGeneroFiltro] = useState<string>("");
  const [periodoId, setPeriodoId] = useState('');
  const [crear, setCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState('');
  const fetchNotas = useServerFn(calificacionesEstudiantesFn);
  const fetchPeriodos = useServerFn(listarPeriodosFn);
  const guardarPeriodo = useServerFn(crearPeriodoFn);
  const meQ = useQuery({ queryKey: ['me'], queryFn: getCurrentProfile });
  const periodosQ = useQuery({ queryKey: ['periodos'], queryFn: () => fetchPeriodos({ data: {} }) });
  const periodos = (periodosQ.data ?? []).filter(p => !grupoId || p.grupo_id === grupoId);
  const seleccionado = periodos.find(p => p.id === periodoId);
  const nombrePeriodo = seleccionado ? etiquetaPeriodo(seleccionado) : 'Todo el historial';
  const q = useQuery({
    queryKey: ["calificaciones", periodoId],
    queryFn: () => fetchNotas({ data: { periodoId: periodoId || undefined } }) as Promise<Fila[]>,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const grpQ = useQuery({ queryKey: ["admin", "grupos"], queryFn: () => listarGruposFn() });
  const miembrosQ = useQuery({
    queryKey: ["admin", "grupo-miembros", grupoId],
    queryFn: () => listarEstudiantesGrupoFn({ data: { grupoId } }) as Promise<string[]>,
    enabled: !!grupoId,
  });
  const todas = q.data ?? [];
  const delGrupo = useMemo(() => {
    let lista = todas;
    if (grupoId) {
      const set = new Set(miembrosQ.data ?? []);
      lista = lista.filter((f) => set.has(f.id));
    }
    const texto = busqueda.trim().toLowerCase();
    if (texto) {
      lista = lista.filter(
        (f) =>
          f.nombres.toLowerCase().includes(texto) ||
          f.cedula.toLowerCase().includes(texto),
      );
    }
    if (generoFiltro) {
      lista = lista.filter((f) => (f.genero ?? "sin") === generoFiltro);
    }
    return lista;
  }, [todas, grupoId, miembrosQ.data, busqueda, generoFiltro]);
  const conteos = useMemo(() => {
    const c: Record<Nivel, number> = { excelente: 0, bueno: 0, riesgo: 0, critico: 0 };
    for (const f of delGrupo) c[nivelDe(f.nota)]++;
    return c;
  }, [delGrupo]);
  const filas = useMemo(
    () => (nivelFiltro ? delGrupo.filter((f) => nivelDe(f.nota) === nivelFiltro) : delGrupo),
    [delGrupo, nivelFiltro],
  );
  const prom = delGrupo.length ? delGrupo.reduce((a, f) => a + f.nota, 0) / delGrupo.length : 0;
  const promPorAsig = useMemo(() => {
    const m: Partial<Record<ClaveAsignatura, number>> = {};
    if (!delGrupo.length) return m;
    for (const clave of CLAVES_ASIGNATURAS) {
      m[clave] = delGrupo.reduce((a, f) => a + notaDe(f, clave), 0) / delGrupo.length;
    }
    return m;
  }, [delGrupo]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
        <label className="inline-flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Grupo</label>
        <select
          value={grupoId}
          onChange={(e) => { setGrupoId(e.target.value); setPeriodoId(''); }}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">Todos los estudiantes</option>
          {((grpQ.data ?? []) as any[]).map((g) => (
            <option key={g.id} value={g.id}>{g.nombre} ({g.total})</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">Género</label>
        <select
          value={generoFiltro}
          onChange={(e) => setGeneroFiltro(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
          <option value="sin">Sin dato</option>
        </select>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o cédula…"
          className="w-56 rounded-lg border bg-background px-3 py-1.5 text-sm"
        />
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Notas en vivo
        </span>
        <div className="ml-auto text-sm">
          <span className="text-muted-foreground">Promedio del grupo:</span>{" "}
          <span className={`font-bold ${notaColor(prom)}`}>{prom.toFixed(2)} / 10</span>
          <span className="ml-2 text-xs text-muted-foreground">({delGrupo.length} estudiantes)</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 border-b py-3">
        <SelectorPeriodo periodos={periodos} value={periodoId} onChange={id => {
          setPeriodoId(id);
          const p = periodos.find(p => p.id === id);
          if (p) setGrupoId(p.grupo_id);
        }} />
        {meQ.data?.esAdmin && <Button variant="outline" onClick={() => setCrear(v => !v)}>Nuevo período</Button>}
        {periodosQ.error && <p role="alert" className="text-sm text-destructive">No se pudieron cargar los períodos.</p>}
      </div>
      {crear && <form className="mb-4 grid gap-3 border-b pb-4 sm:grid-cols-2" onSubmit={async e => {
        e.preventDefault(); setErrorPeriodo(''); setGuardando(true);
        const f = new FormData(e.currentTarget);
        try {
          const p = await guardarPeriodo({ data: { grupo_id: String(f.get('grupo')), nombre: String(f.get('nombre')), fecha_inicio: String(f.get('inicio')), fecha_fin: String(f.get('fin')) } });
          await periodosQ.refetch(); setGrupoId(p.grupo_id); setPeriodoId(p.id); setCrear(false); toast.success('Período creado');
        } catch (err) { setErrorPeriodo(err instanceof Error ? err.message : 'No se pudo guardar el período.'); }
        finally { setGuardando(false); }
      }}>
        <label className="text-sm">Grupo<select required name="grupo" aria-label="Grupo del nuevo período" defaultValue={grupoId} className="mt-1 block w-full rounded-md border bg-background p-2"><option value="">Selecciona un grupo</option>{(grpQ.data ?? []).map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>
        <label className="text-sm">Nombre<input name="nombre" required maxLength={120} className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
        <label className="text-sm">Desde<input name="inicio" required type="date" className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
        <label className="text-sm">Hasta<input name="fin" required type="date" className="mt-1 block w-full rounded-md border bg-background p-2" /></label>
        {errorPeriodo && <p role="alert" className="text-sm text-destructive sm:col-span-2">{errorPeriodo}</p>}
        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar período'}</Button>
        <Button variant="ghost" type="button" onClick={() => setCrear(false)}>Cancelar</Button>
      </form>}
      {q.error && <p role="alert" className="mb-3 text-destructive">No se pudieron cargar las notas. Intenta nuevamente.</p>}
      {filas.some(f => f.tiempoHistoricoIncompleto) && <p className="mb-3 text-sm text-muted-foreground">El tiempo antiguo que cruza las fechas no tiene detalle suficiente y se excluye; los nuevos registros se dividen por período.</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        {(["excelente", "bueno", "riesgo", "critico"] as Nivel[]).map((n) => (
          <Button
            key={n}
            onClick={() => setNivelFiltro(nivelFiltro === n ? "" : n)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${NIVEL_INFO[n].badge} ${
              nivelFiltro === n ? "ring-2 ring-offset-1 ring-current" : "opacity-90 hover:opacity-100"
            }`}
          >
            {NIVEL_INFO[n].label} · {conteos[n]}
          </Button>
        ))}
        {nivelFiltro && (
          <Button onClick={() => setNivelFiltro("")} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
            Ver todos
          </Button>
        )}
      </div>



      <div className="mb-4 rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">Cálculo de las notas (0–10)</div>
            <ul className="mt-1 list-inside list-disc">
              <li><b>Nota general:</b> 10% tiempo real en plataforma + 30% simulacros + 30% Conocimiento + 30% Razonamiento</li>
              <li><b>Notas por asignatura:</b> misma ponderación, con los simulacros de esa asignatura</li>
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold">Promedio por asignatura:</span>
              {CLAVES_ASIGNATURAS.map((clave) => (
                <span
                  key={clave}
                  title={NOMBRES_ASIG[clave]}
                  className={`rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold ${notaColor(promPorAsig[clave] ?? 0)}`}
                >
                  {ABREVIATURAS_ASIG[clave]} {(promPorAsig[clave] ?? 0).toFixed(1)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => exportarExcel(filas, nombrePeriodo).catch((e) => toast.error(e.message))}
              disabled={!filas.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button
              onClick={() => exportarPdf(filas, nombrePeriodo).catch((e) => toast.error(e.message))}
              disabled={!filas.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-rose-700 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Cédula</th>
              <th className="px-3 py-2 text-left">Nombres</th>
              <th className="px-3 py-2 text-left">Institución</th>
              <th className="px-3 py-2 text-right">Resp.</th>
              <th className="px-3 py-2 text-right">Aciertos</th>
              <th className="px-3 py-2 text-right">Precisión</th>
              <th className="px-3 py-2 text-right">Sesiones</th>
              <th className="px-3 py-2 text-right">Horas</th>
              <th className="px-3 py-2 text-right">Nota /10</th>
              <th className="px-3 py-2 text-left">Notas por asignatura</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Recomendación personalizada</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr><td colSpan={12} className="py-6 text-center text-muted-foreground">Cargando…</td></tr>
            )}
            {!q.isLoading && filas.length === 0 && (
              <tr><td colSpan={12} className="py-6 text-center text-muted-foreground">Sin estudiantes.</td></tr>
            )}
            {filas.map((f) => {
              const nv = nivelDe(f.nota);
              return (
              <tr key={f.id} className={`border-t ${NIVEL_INFO[nv].fila}`}>
                <td className="px-3 py-2 font-mono text-xs">{f.cedula}</td>
                <td className="px-3 py-2 font-medium">{f.nombres}</td>
                <td className="px-3 py-2 text-muted-foreground">{f.institucion}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.total_respuestas}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.correctas}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.precision_pct}%</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.sesiones_practica}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.horas_activas}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${notaColor(f.nota)}`}>{f.nota.toFixed(1)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {CLAVES_ASIGNATURAS.map((clave) => (
                      <span
                        key={clave}
                        title={`${NOMBRES_ASIG[clave]}: ${notaDe(f, clave).toFixed(1)} / 10${
                          f.notasDetalle?.find((d) => d.clave === clave)?.simulacros
                            ? ` · ${f.notasDetalle?.find((d) => d.clave === clave)?.simulacros} simulacro(s)`
                            : " · sin simulacros"
                        }`}
                        className={`rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${notaColor(notaDe(f, clave))}`}
                      >
                        {ABREVIATURAS_ASIG[clave]} {notaDe(f, clave).toFixed(1)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${NIVEL_INFO[nv].badge}`}>
                    {NIVEL_INFO[nv].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground min-w-[260px]">{consejoDe(f)}</td>
              </tr>
              );
            })}

          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1"><Download className="h-3 w-3" /> Excel / PDF se descargan al navegador.</p>
    </div>
  );
}
