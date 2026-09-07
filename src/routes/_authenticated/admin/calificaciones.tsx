import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { calificacionesEstudiantesFn } from "@/lib/presencia.functions";
import { listarGruposFn, listarEstudiantesGrupoFn } from "@/lib/admin.functions";
import { Download, FileSpreadsheet, FileText, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/calificaciones")({
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
};

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


async function exportarExcel(filas: Fila[]) {
  const XLSX = await import("xlsx");
  const data = filas.map((f) => ({
    Cédula: f.cedula,
    Nombres: f.nombres,
    Institución: f.institucion,
    Género: f.genero ?? "",
    "Respuestas totales": f.total_respuestas,
    Correctas: f.correctas,
    "Precisión %": f.precision_pct,
    "Sesiones de práctica": f.sesiones_practica,
    "Horas activas": f.horas_activas,
    "Nota /10": f.nota,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
  XLSX.writeFile(wb, `calificaciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function exportarPdf(filas: Fila[]) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("INEVAL_UEDE — Calificaciones de estudiantes", 14, 14);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-EC")}`, 14, 20);
  autoTable(doc, {
    startY: 25,
    head: [["CI", "Nombres", "Institución", "Resp.", "Aciertos", "Precisión", "Sesiones", "Horas", "Nota /10"]],
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
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [33, 99, 232] },
  });
  doc.save(`calificaciones-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function CalificacionesPage() {
  const [grupoId, setGrupoId] = useState<string>("");
  const q = useQuery({
    queryKey: ["calificaciones"],
    queryFn: () => calificacionesEstudiantesFn() as Promise<Fila[]>,
  });
  const grpQ = useQuery({ queryKey: ["admin", "grupos"], queryFn: () => listarGruposFn() });
  const miembrosQ = useQuery({
    queryKey: ["admin", "grupo-miembros", grupoId],
    queryFn: () => listarEstudiantesGrupoFn({ data: { grupoId } }) as Promise<string[]>,
    enabled: !!grupoId,
  });
  const todas = q.data ?? [];
  const filas = useMemo(() => {
    if (!grupoId) return todas;
    const set = new Set(miembrosQ.data ?? []);
    return todas.filter((f) => set.has(f.id));
  }, [todas, grupoId, miembrosQ.data]);
  const prom = filas.length ? filas.reduce((a, f) => a + f.nota, 0) / filas.length : 0;



  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
        <label className="inline-flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Grupo</label>
        <select
          value={grupoId}
          onChange={(e) => setGrupoId(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm"
        >
          <option value="">Todos los estudiantes</option>
          {((grpQ.data ?? []) as any[]).map((g) => (
            <option key={g.id} value={g.id}>{g.nombre} ({g.total})</option>
          ))}
        </select>
        <div className="ml-auto text-sm">
          <span className="text-muted-foreground">Promedio del grupo:</span>{" "}
          <span className={`font-bold ${notaColor(prom)}`}>{prom.toFixed(2)} / 10</span>
          <span className="ml-2 text-xs text-muted-foreground">({filas.length} estudiantes)</span>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">Cálculo de la nota (0–10)</div>
            <ul className="mt-1 list-inside list-disc">
              <li><b>60%</b> precisión = (correctas / respuestas) × 6</li>
              <li><b>25%</b> constancia = log₁₀(sesiones+1)/log₁₀(21) × 2.5 (techo 20 sesiones)</li>
              <li><b>15%</b> tiempo activo = min(horas, 20)/20 × 1.5</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportarExcel(filas).catch((e) => toast.error(e.message))}
              disabled={!filas.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button
              onClick={() => exportarPdf(filas).catch((e) => toast.error(e.message))}
              disabled={!filas.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-soft hover:bg-rose-700 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
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
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Cargando…</td></tr>
            )}
            {!q.isLoading && filas.length === 0 && (
              <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Sin estudiantes.</td></tr>
            )}
            {filas.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{f.cedula}</td>
                <td className="px-3 py-2 font-medium">{f.nombres}</td>
                <td className="px-3 py-2 text-muted-foreground">{f.institucion}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.total_respuestas}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.correctas}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.precision_pct}%</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.sesiones_practica}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.horas_activas}</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums ${notaColor(f.nota)}`}>{f.nota.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1"><Download className="h-3 w-3" /> Excel / PDF se descargan al navegador.</p>
    </div>
  );
}
