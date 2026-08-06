import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Award, Search, Timer } from "lucide-react";
import { obtenerProgresoFn } from "@/lib/progreso.functions";
import { listarEstudiantesFn } from "@/lib/admin.functions";
import { getCurrentProfile } from "@/lib/auth-helpers";

export const Route = createFileRoute("/_authenticated/resultados")({
  head: () => ({
    meta: [
      { title: "Resultados de simulacros — INEVAL_UEDE" },
      { name: "description", content: "Historial de simulacros: puntaje, tiempo, aciertos, fallas y horarios de cada intento." },
      { property: "og:title", content: "Resultados de simulacros — INEVAL_UEDE" },
      { property: "og:description", content: "Revisa el puntaje, el tiempo y el detalle de cada simulacro realizado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    as: typeof s.as === "string" ? s.as : undefined,
  }),
  component: ResultadosPage,
});

function fmt(seg: number) {
  const m = Math.floor(seg / 60).toString().padStart(2, "0");
  const s = Math.floor(seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function hora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ResultadosPage() {
  const navigate = useNavigate();
  const { as } = Route.useSearch();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getCurrentProfile });
  const esStaff = !!me?.esAdmin || (me?.roles ?? []).includes("administrador" as never);

  const { data: estudiantes } = useQuery({
    queryKey: ["admin", "estudiantes-lista"],
    queryFn: () => listarEstudiantesFn(),
    enabled: esStaff,
  });

  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const list = (estudiantes as any[] | undefined) ?? [];
    if (!q.trim()) return list.slice(0, 30);
    const s = q.toLowerCase();
    return list
      .filter((e: any) => (e.nombres || "").toLowerCase().includes(s) || (e.cedula || "").includes(s))
      .slice(0, 30);
  }, [estudiantes, q]);

  const { data, isLoading } = useQuery({
    queryKey: ["resultados", as ?? "me"],
    queryFn: () => obtenerProgresoFn({ data: as ? { targetUserId: as } : {} }),
    enabled: !esStaff || !!as,
  });

  const sesiones = useMemo(() => {
    const list = ((data?.sesiones ?? []) as any[]).filter((s) => s.tipo === "simulacro" && s.finalizada_en);
    return list;
  }, [data]);

  const resumen = useMemo(() => {
    if (sesiones.length === 0) return null;
    const puntajes = sesiones.map((s) => s.puntaje_ineval ?? 0);
    const tiempos = sesiones.map((s) => {
      const ini = new Date(s.iniciada_en).getTime();
      const fin = new Date(s.finalizada_en).getTime();
      return Math.max(0, Math.round((fin - ini) / 1000));
    });
    const totalPreg = sesiones.reduce((a, s) => a + (s.total_preguntas ?? 0), 0);
    const totalOk = sesiones.reduce((a, s) => a + (s.correctas ?? 0), 0);
    return {
      intentos: sesiones.length,
      mejor: Math.max(...puntajes),
      promedio: Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length),
      tiempoPromedio: Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length),
      aciertos: totalOk,
      fallas: totalPreg - totalOk,
    };
  }, [sesiones]);

  if (esStaff && !as) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Resultados de simulacros</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elige un estudiante para ver todos sus intentos.</p>
        <div className="mt-5 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar por nombre o cédula…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="mt-3 divide-y rounded-xl border bg-card shadow-soft">
          {filtrados.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">Sin resultados.</li>
          ) : (
            filtrados.map((e: any) => (
              <li key={e.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  onClick={() => navigate({ to: "/resultados", search: { as: e.id } })}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{e.nombres}</div>
                    <div className="text-xs text-muted-foreground">CI {e.cedula}</div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Ver</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        {esStaff && as && (
          <button
            className="text-sm font-semibold text-primary hover:underline"
            onClick={() => navigate({ to: "/resultados", search: {} })}
          >
            Cambiar estudiante
          </button>
        )}
      </div>

      <h1 className="mt-4 flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
        <Award className="h-7 w-7 text-primary" /> Resultados
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Historial de simulacros con puntaje, tiempo y detalle de cada intento.</p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : sesiones.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-gradient-card p-8 text-center shadow-soft">
          <p className="font-semibold">Aún no hay simulacros finalizados.</p>
          <Link to="/simulacro" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
            Hacer un simulacro
          </Link>
        </div>
      ) : (
        <>
          {resumen && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { l: "Intentos", v: String(resumen.intentos) },
                { l: "Mejor puntaje", v: `${resumen.mejor}` },
                { l: "Promedio", v: `${resumen.promedio}` },
                { l: "Tiempo promedio", v: fmt(resumen.tiempoPromedio) },
                { l: "Aciertos", v: String(resumen.aciertos) },
                { l: "Fallas", v: String(resumen.fallas) },
              ].map((c) => (
                <div key={c.l} className="rounded-2xl border bg-gradient-card p-4 shadow-soft">
                  <div className="text-xs font-semibold text-muted-foreground">{c.l}</div>
                  <div className="mt-1 text-2xl font-extrabold tabular-nums">{c.v}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-soft">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Puntaje</th>
                  <th className="px-4 py-3">Nivel de logro</th>
                  <th className="px-4 py-3">Aciertos</th>
                  <th className="px-4 py-3">Fallas</th>
                  <th className="px-4 py-3">Tiempo</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3">Finalización</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sesiones.map((s) => {
                  const total = s.total_preguntas ?? 0;
                  const ok = s.correctas ?? 0;
                  const dur = Math.max(0, Math.round((new Date(s.finalizada_en).getTime() - new Date(s.iniciada_en).getTime()) / 1000));
                  return (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-extrabold tabular-nums">{s.puntaje_ineval ?? 0}<span className="text-xs font-normal text-muted-foreground"> /1000</span></td>
                      <td className="px-4 py-3 font-semibold">{s.nivel_logro ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-success">{ok}</td>
                      <td className="px-4 py-3 tabular-nums text-destructive">{total - ok}</td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {fmt(dur)}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{hora(s.iniciada_en)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{hora(s.finalizada_en)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
