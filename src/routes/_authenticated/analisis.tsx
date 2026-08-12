import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Target } from "lucide-react";
import { obtenerProgresoFn } from "@/lib/progreso.functions";

export const Route = createFileRoute("/_authenticated/analisis")({
  head: () => ({
    meta: [
      { title: "Análisis de errores — INEVAL_UEDE" },
      { name: "description", content: "Agrupa tus fallas por tema y subtema y descubre en qué debes enfocarte." },
      { property: "og:title", content: "Análisis de errores — INEVAL_UEDE" },
      { property: "og:description", content: "Tus fallas agrupadas por tema y subtema con recomendaciones de estudio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Analisis,
});

function Analisis() {
  const q = useQuery({ queryKey: ["progreso", "analisis"], queryFn: () => obtenerProgresoFn({ data: {} }) });
  const respuestas: any[] = ((q.data as any)?.respuestas ?? (q.data as any) ?? []) as any[];

  const grupos = useMemo(() => {
    const mapa = new Map<string, { area: string; subtema: string; total: number; fallas: number }>();
    for (const r of Array.isArray(respuestas) ? respuestas : []) {
      const key = `${r.area}||${r.subtema}`;
      const cur = mapa.get(key) ?? { area: r.area, subtema: r.subtema, total: 0, fallas: 0 };
      cur.total++;
      if (!r.correcta) cur.fallas++;
      mapa.set(key, cur);
    }
    return Array.from(mapa.values())
      .map((g) => ({ ...g, pct: Math.round(((g.total - g.fallas) / g.total) * 100) }))
      .sort((a, b) => a.pct - b.pct || b.fallas - a.fallas);
  }, [respuestas]);

  const criticos = grupos.filter((g) => g.total >= 3 && g.pct < 60).slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Análisis de errores</h1>
        <p className="mt-2 text-muted-foreground">Tus fallas agrupadas por tema y subtema, ordenadas por prioridad.</p>

        {q.isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}
        {!q.isLoading && grupos.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">Todavía no hay respuestas registradas. Practica un poco y vuelve aquí.</p>
        )}

        {criticos.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 font-bold">
              <Target className="h-5 w-5 text-destructive" /> Enfócate en esto
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {criticos.map((g) => (
                <li key={`${g.area}-${g.subtema}`}>
                  <strong>{g.subtema}</strong> ({g.area}): solo {g.pct}% de aciertos en {g.total} intentos. Repasa la teoría y practica en nivel Básico antes de subir de dificultad.
                </li>
              ))}
            </ul>
          </div>
        )}

        {grupos.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Área</th>
                  <th className="px-4 py-2.5">Subtema</th>
                  <th className="px-4 py-2.5 text-right">Intentos</th>
                  <th className="px-4 py-2.5 text-right">Fallas</th>
                  <th className="px-4 py-2.5 text-right">Aciertos</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={`${g.area}-${g.subtema}`} className="border-t">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{g.area}</td>
                    <td className="px-4 py-2.5 font-medium">{g.subtema}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{g.total}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-destructive">{g.fallas}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${g.pct < 60 ? "text-destructive" : g.pct < 80 ? "text-amber-600" : "text-success"}`}>
                      {g.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {grupos.length > 0 && criticos.length === 0 && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> No hay subtemas críticos: mantén el ritmo y sube de nivel.
          </p>
        )}
      </div>
    </div>
  );
}
