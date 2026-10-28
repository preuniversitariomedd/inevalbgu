import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChatShell } from "@/components/chat/ChatShell";
import {
  enviarMensajeMasivoFn,
  enviarMensajeMasivoRolFn,
  listarEnviosMasivosFn,
} from "@/lib/mensajes.functions";
import { listarEstudiantesFn, listarGruposFn } from "@/lib/admin.functions";
import { Megaphone, Loader2, Send, X, Users, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/mensajes")({
  head: () => ({ meta: [{ title: "Mensajes administrativos — INEVAL_UEDE" }, ...pageMeta("Mensajes administrativos — INEVAL_UEDE","Mensajes administrativos en la plataforma educativa INEVAL_UEDE.")] }),
  component: AdminMensajesPage,
});

type Tab = "mis" | "todos" | "envios";

function AdminMensajesPage() {
  const ctx = Route.useRouteContext() as { esAdmin: boolean; esDocente: boolean };
  const parentCtx = (Route as any).useRouteContext() as { user: { id: string } };
  const [tab, setTab] = useState<Tab>("mis");
  const [masivoOpen, setMasivoOpen] = useState(false);
  const scope = tab === "todos" && ctx.esAdmin ? "all" : "mine";
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border bg-card p-1">
          <button
            onClick={() => setTab("mis")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === "mis" ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-soft" : "text-muted-foreground"}`}
          >
            Mis chats
          </button>
          {ctx.esAdmin && (
            <button
              onClick={() => setTab("todos")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === "todos" ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-soft" : "text-muted-foreground"}`}
            >
              Todos
            </button>
          )}
          <button
            onClick={() => setTab("envios")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === "envios" ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-soft" : "text-muted-foreground"}`}
          >
            Envíos masivos
          </button>
        </div>
        <button
          onClick={() => setMasivoOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:scale-[1.02]"
        >
          <Megaphone className="h-4 w-4" /> Mensaje masivo
        </button>
      </div>
      {tab === "envios" ? (
        <EnviosMasivos />
      ) : (
        <ChatShell currentUserId={parentCtx.user.id} scope={scope} esAdmin={ctx.esAdmin} />
      )}
      {masivoOpen && <MasivoDialog onClose={() => setMasivoOpen(false)} />}
    </div>
  );
}

function EnviosMasivos() {
  const q = useQuery({
    queryKey: ["admin", "envios-masivos"],
    queryFn: () => listarEnviosMasivosFn(),
    refetchInterval: 30_000,
  });
  const [abierto, setAbierto] = useState<string | null>(null);

  if (q.isLoading) return <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>;
  const envios = (q.data ?? []) as any[];
  if (!envios.length)
    return (
      <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
        Aún no has enviado mensajes masivos.
      </div>
    );

  return (
    <div className="space-y-3">
      {envios.map((e) => {
        const pct = e.total_destinatarios ? Math.round((e.leidos / e.total_destinatarios) * 100) : 0;
        const open = abierto === e.id;
        return (
          <div key={e.id} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <button
              onClick={() => setAbierto(open ? null : e.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.contenido}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("es-EC")} · por {e.sender_nombre} · audiencia:{" "}
                  {e.audiencia}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <CheckCheck className="h-4 w-4 text-cyan-500" />
                {e.leidos}/{e.total_destinatarios} leídos ({pct}%)
              </div>
            </button>
            <div className="h-1.5 w-full bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {open && (
              <ul className="max-h-72 divide-y overflow-y-auto">
                {e.destinatarios.map((d: any) => (
                  <li key={d.user_id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="truncate">
                      {d.nombres} <span className="font-mono text-[10px] text-muted-foreground">{d.cedula}</span>
                    </span>
                    {d.leido ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600">
                        <CheckCheck className="h-4 w-4" />
                        {d.leido_at ? new Date(d.leido_at).toLocaleString("es-EC") : "Leído"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="h-4 w-4" /> Entregado
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}


function MasivoDialog({ onClose }: { onClose: () => void }) {
  const [contenido, setContenido] = useState("");
  const [seleccionadosUsr, setSelU] = useState<Set<string>>(new Set());
  const [seleccionadosGrp, setSelG] = useState<Set<string>>(new Set());
  const [audiencia, setAudiencia] = useState<"" | "todos" | "estudiantes" | "docentes" | "administradores">("");
  const [busq, setBusq] = useState("");

  const estQ = useQuery({ queryKey: ["admin", "estudiantes"], queryFn: () => listarEstudiantesFn() });
  const grpQ = useQuery({ queryKey: ["admin", "grupos"], queryFn: () => listarGruposFn() });

  const estudiantes = useMemo(() => {
    const t = busq.trim().toLowerCase();
    const lista = (estQ.data ?? []) as any[];
    if (!t) return lista;
    return lista.filter((e) => e.nombres.toLowerCase().includes(t) || e.cedula.includes(t));
  }, [estQ.data, busq]);

  const enviar = useMutation({
    mutationFn: () => {
      if (audiencia) {
        return enviarMensajeMasivoRolFn({ data: { contenido, audiencia } });
      }
      return enviarMensajeMasivoFn({
        data: {
          contenido,
          userIds: Array.from(seleccionadosUsr),
          grupoIds: Array.from(seleccionadosGrp),
        },
      });
    },
    onSuccess: (r: any) => {
      toast.success(`Enviado a ${r.enviados} usuarios.`);
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-card shadow-strong">
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-amber-400/10 to-rose-500/10 px-4 py-3">
          <h2 className="inline-flex items-center gap-2 font-extrabold"><Megaphone className="h-5 w-5 text-rose-500" /> Mensaje masivo</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b bg-secondary/30 px-4 py-3">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Audiencia rápida</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {([
              ["", "Selección manual"],
              ["todos", "Todos"],
              ["estudiantes", "Todos los estudiantes"],
              ["docentes", "Todos los docentes"],
              ["administradores", "Todos los administradores"],
            ] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setAudiencia(v as any)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${audiencia === v ? "bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-soft" : "border bg-background hover:bg-secondary"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className={`grid gap-4 p-4 md:grid-cols-2 ${audiencia ? "pointer-events-none opacity-40" : ""}`}>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Grupos</label>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border p-2">
              {(grpQ.data ?? []).length === 0 && <p className="p-2 text-xs text-muted-foreground">Sin grupos.</p>}
              {((grpQ.data ?? []) as any[]).map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={seleccionadosGrp.has(g.id)}
                    onChange={() => toggle(seleccionadosGrp, g.id, setSelG)}
                  />
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{g.nombre}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Estudiantes</label>
            <input
              value={busq}
              onChange={(e) => setBusq(e.target.value)}
              placeholder="Buscar…"
              className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            />
            <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border p-2">
              {estudiantes.map((e: any) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={seleccionadosUsr.has(e.id)}
                    onChange={() => toggle(seleccionadosUsr, e.id, setSelU)}
                  />
                  <span className="truncate">{e.nombres}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{e.cedula}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t p-4">
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={3}
            placeholder="Escribe el mensaje…"
            className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{audiencia ? `Audiencia: ${audiencia}` : `${seleccionadosUsr.size} directos · ${seleccionadosGrp.size} grupos`}</span>
            <button
              disabled={enviar.isPending || !contenido.trim() || (!audiencia && !seleccionadosUsr.size && !seleccionadosGrp.size)}
              onClick={() => enviar.mutate()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-2 font-bold text-white shadow-soft disabled:opacity-40"
            >
              {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
