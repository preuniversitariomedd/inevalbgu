import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { listarPresenciaFn } from "@/lib/presencia.functions";
import { Smartphone, Tablet, Monitor, Eye, EyeOff, Wifi, AlertTriangle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/presencia")({
  component: PresenciaPage,
});

function dispoIcon(d: string | null | undefined) {
  if (d === "mobile") return <Smartphone className="h-4 w-4" />;
  if (d === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function fmtDur(seg: number) {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  if (m < 60) return `${m}m ${seg % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function PresenciaPage() {
  const [tab, setTab] = useState<"vivo" | "alertas">("vivo");
  const [now, setNow] = useState(Date.now());
  const q = useQuery({
    queryKey: ["presencia"],
    queryFn: () => listarPresenciaFn(),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows = q.data ?? [];
  const enVivo = useMemo(
    () =>
      rows.filter((r: any) => {
        const lhb = new Date(r.ultimo_heartbeat).getTime();
        return now - lhb < 60_000;
      }),
    [rows, now],
  );
  const alertas = useMemo(
    () =>
      rows
        .map((r: any) => {
          const lhb = new Date(r.ultimo_heartbeat).getTime();
          const li = new Date(r.ultima_interaccion ?? r.iniciada_en).getTime();
          const segSinInter = Math.floor((now - li) / 1000);
          const ocultoMucho = !r.visible && (r.segundos_oculto ?? 0) > 180;
          const inactivoMucho = segSinInter > 300;
          return { r, segSinInter, lhb, ocultoMucho, inactivoMucho };
        })
        .filter((x) => x.ocultoMucho || x.inactivoMucho),
    [rows, now],
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-secondary p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "vivo" ? "bg-background shadow-soft" : ""}`}
            onClick={() => setTab("vivo")}
          >
            <Wifi className="mr-1 inline h-4 w-4" /> En vivo ({enVivo.length})
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "alertas" ? "bg-background shadow-soft" : ""}`}
            onClick={() => setTab("alertas")}
          >
            <AlertTriangle className="mr-1 inline h-4 w-4" /> Alertas ({alertas.length})
          </button>
        </div>
        <button
          onClick={() => q.refetch()}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {tab === "vivo" ? (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Estudiante</th>
                <th className="px-3 py-2 text-left">Disp.</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Conectado</th>
                <th className="px-3 py-2 text-left">Activo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {enVivo.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Nadie conectado en este momento.</td></tr>
              )}
              {enVivo.map((r: any) => {
                const conSeg = Math.floor((now - new Date(r.iniciada_en).getTime()) / 1000);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{r.profile?.nombres ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">CI {r.profile?.cedula ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2" title={r.user_agent ?? ""}>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {dispoIcon(r.dispositivo)} {r.dispositivo ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.ip || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDur(conSeg)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDur(r.segundos_interaccion ?? 0)}</td>
                    <td className="px-3 py-2">
                      {r.visible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <Eye className="h-3 w-3" /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          <EyeOff className="h-3 w-3" /> Segundo plano
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link to="/admin/estudiante/$id" params={{ id: r.user_id }} className="text-xs font-semibold text-primary hover:underline">
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.length === 0 && (
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
              Sin alertas. Todos los estudiantes activos están interactuando.
            </div>
          )}
          {alertas.map(({ r, segSinInter, ocultoMucho, inactivoMucho }) => (
            <div key={r.id} className="flex items-center justify-between rounded-2xl border bg-card p-3 shadow-soft">
              <div>
                <div className="font-semibold">{r.profile?.nombres ?? "—"} · CI {r.profile?.cedula ?? "—"}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">{dispoIcon(r.dispositivo)} {r.dispositivo ?? "—"}</span>
                  <span className="font-mono">{r.ip || "—"}</span>
                  {ocultoMucho && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Segundo plano {fmtDur(r.segundos_oculto ?? 0)}
                    </span>
                  )}
                  {inactivoMucho && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      Sin interacción {fmtDur(segSinInter)}
                    </span>
                  )}
                </div>
              </div>
              <Link to="/admin/estudiante/$id" params={{ id: r.user_id }} className="text-xs font-semibold text-primary hover:underline">
                Ver perfil
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
