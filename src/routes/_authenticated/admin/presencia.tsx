import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { listarPresenciaFn, listarAlertasPresenciaFn, resolverAlertaFn } from "@/lib/presencia.functions";
import { Smartphone, Tablet, Monitor, Eye, EyeOff, Wifi, AlertTriangle, RefreshCw, BellRing, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/presencia")({
  head: () => ({ meta: [{ title: "Presencia en plataforma — INEVAL_UEDE" }, ...pageMeta("Presencia en plataforma — INEVAL_UEDE","Presencia en plataforma en la plataforma educativa INEVAL_UEDE.")] }),
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

function tipoLabel(t: string) {
  if (t === "segundo_plano") return "Segundo plano prolongado";
  if (t === "inactivo") return "Sin interacción";
  if (t === "desconexion") return "Desconexión inesperada";
  return t;
}

function PresenciaPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"vivo" | "alertas" | "historial">("vivo");
  const [now, setNow] = useState(Date.now());
  const notifiedRef = useRef<Set<string>>(new Set());
  const enVivoPrevRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const q = useQuery({
    queryKey: ["presencia"],
    queryFn: () => listarPresenciaFn(),
    refetchInterval: 10_000,
  });
  const qa = useQuery({
    queryKey: ["alertas-presencia"],
    queryFn: () => listarAlertasPresenciaFn(),
    refetchInterval: 15_000,
  });
  const resolver = useMutation({
    mutationFn: (id: string) => resolverAlertaFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alertas-presencia"] }),
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Toast para alertas nuevas (no resueltas) que aún no notificamos en esta sesión
  useEffect(() => {
    const list = qa.data ?? [];
    for (const a of list) {
      if (a.resuelta_en) continue;
      if (notifiedRef.current.has(a.id)) continue;
      notifiedRef.current.add(a.id);
      toast.warning(`${tipoLabel(a.tipo)} · ${a.profile?.nombres ?? "Estudiante"}`, {
        description: a.detalle ?? "",
        icon: <BellRing className="h-5 w-5" />,
      });
    }
  }, [qa.data]);

  const rows = q.data ?? [];
  const enVivo = useMemo(
    () =>
      rows.filter((r: any) => {
        const lhb = new Date(r.ultimo_heartbeat).getTime();
        return now - lhb < 60_000;
      }),
    [rows, now],
  );
  const alertasActivas = (qa.data ?? []).filter((a: any) => !a.resuelta_en);
  const historial = (qa.data ?? []).filter((a: any) => a.resuelta_en);

  // Toasts para estudiantes que ENTRAN o SALEN de "en vivo"
  useEffect(() => {
    if (!q.data) return;
    const currentIds = new Set<string>(enVivo.map((r: any) => r.user_id));
    if (firstLoadRef.current) {
      enVivoPrevRef.current = currentIds;
      firstLoadRef.current = false;
      return;
    }
    const prev = enVivoPrevRef.current;
    // Entrada
    for (const r of enVivo) {
      if (!prev.has(r.user_id)) {
        toast.success(`🟢 ${r.profile?.nombres ?? "Estudiante"} está en vivo`, {
          description: `${r.dispositivo ?? "dispositivo"} · IP ${r.ip || "—"}`,
          icon: <Wifi className="h-4 w-4" />,
        });
      }
    }
    // Salida
    for (const r of rows) {
      if (prev.has(r.user_id) && !currentIds.has(r.user_id)) {
        const conSeg = Math.floor((Date.now() - new Date(r.iniciada_en).getTime()) / 1000);
        toast(`⚪ ${r.profile?.nombres ?? "Estudiante"} salió de línea`, {
          description: `Duración: ${fmtDur(conSeg)} · ${r.dispositivo ?? "—"}`,
        });
      }
    }
    enVivoPrevRef.current = currentIds;
  }, [enVivo, rows, q.data]);


  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-secondary p-1">
          <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "vivo" ? "bg-background shadow-soft" : ""}`} onClick={() => setTab("vivo")}>
            <Wifi className="mr-1 inline h-4 w-4" /> En vivo ({enVivo.length})
          </button>
          <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "alertas" ? "bg-background shadow-soft" : ""}`} onClick={() => setTab("alertas")}>
            <AlertTriangle className="mr-1 inline h-4 w-4" /> Alertas ({alertasActivas.length})
          </button>
          <button className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "historial" ? "bg-background shadow-soft" : ""}`} onClick={() => setTab("historial")}>
            Historial ({historial.length})
          </button>
        </div>
        <button onClick={() => { q.refetch(); qa.refetch(); }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {tab === "vivo" && (
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
      )}

      {(tab === "alertas" || tab === "historial") && (
        <div className="space-y-2">
          {(tab === "alertas" ? alertasActivas : historial).length === 0 && (
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
              {tab === "alertas" ? "Sin alertas activas." : "Aún no hay alertas resueltas."}
            </div>
          )}
          {(tab === "alertas" ? alertasActivas : historial).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl border bg-card p-3 shadow-soft">
              <div>
                <div className="font-semibold">{a.profile?.nombres ?? "—"} · CI {a.profile?.cedula ?? "—"}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${
                    a.tipo === "desconexion" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" :
                    a.tipo === "inactivo" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                  }`}>{tipoLabel(a.tipo)}</span>
                  <span>{a.detalle}</span>
                  <span className="font-mono">{new Date(a.disparada_en).toLocaleString("es-EC")}</span>
                  {a.resuelta_en && <span className="text-emerald-700">✓ resuelta {new Date(a.resuelta_en).toLocaleString("es-EC")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/admin/estudiante/$id" params={{ id: a.user_id }} className="text-xs font-semibold text-primary hover:underline">
                  Ver perfil
                </Link>
                {!a.resuelta_en && (
                  <button
                    onClick={() => resolver.mutate(a.id)}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-secondary"
                  >
                    <Check className="h-3 w-3" /> Marcar resuelta
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
