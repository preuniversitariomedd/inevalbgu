import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  abrirConversacionFn,
  contarNoLeidosFn,
  enviarMensajeFn,
  listarConversacionesFn,
  listarMensajesFn,
  listarUsuariosChatFn,
  marcarLeidoFn,
  presenciaUsuarioFn,
  borrarConversacionFn,
  borrarMensajeFn,
} from "@/lib/mensajes.functions";
import {
  ArrowLeft,
  Image as ImageIcon,
  MessageSquarePlus,
  Search,
  Send,
  Smile,
  X,
  Loader2,
  Circle,
  Monitor,
  Smartphone,
  Tablet,
  Check,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const EMOJIS = [
  "😀","😁","😂","🤣","😊","😍","😘","😎","🤩","🥳",
  "🤔","🙌","👏","👍","👎","👌","🙏","💪","🔥","✨",
  "🎉","💯","❤️","💙","💚","💛","🧡","💜","🖤","🤍",
  "📚","✏️","🧠","🎓","🚀","⭐","🌟","😅","😢","😭",
];

type Conversacion = {
  id: string;
  ultimo_mensaje_at: string;
  ultimo_mensaje_preview: string | null;
  no_leidos: number;
  soy_participante: boolean;
  otro_ultima_lectura_at: string | null;
  otro: { id: string; nombres: string; cedula: string; avatar_url?: string | null } | null;
  participantes: { id: string; nombres: string; cedula: string; avatar_url?: string | null }[];
};

type Mensaje = {
  id: string;
  sender_id: string;
  contenido: string | null;
  attachment_path: string | null;
  attachment_tipo: string | null;
  attachment_url?: string | null;
  es_admin_intervencion: boolean;
  leido_por_otro?: boolean;
  created_at: string;
};

export function ChatShell({
  currentUserId,
  scope,
  esAdmin,
}: {
  currentUserId: string;
  scope: "mine" | "all";
  esAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoDlg, setNuevoDlg] = useState(false);

  const convsQ = useQuery({
    queryKey: ["mensajes", "convs", scope],
    queryFn: () => listarConversacionesFn({ data: { scope } }) as Promise<Conversacion[]>,
    refetchInterval: 30_000,
  });

  // Realtime: cualquier mensaje nuevo o lectura → refetch lista y mensajes
  useEffect(() => {
    const ch = supabase
      .channel("mensajes-live-" + scope)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes" },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
          qc.invalidateQueries({ queryKey: ["mensajes", "unread"] });
          if (selectedId && payload.new?.conversacion_id === selectedId) {
            qc.invalidateQueries({ queryKey: ["mensajes", "msgs", selectedId] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "mensajes" },
        () => {
          qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
          if (selectedId) qc.invalidateQueries({ queryKey: ["mensajes", "msgs", selectedId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversacion_participantes" },
        (payload: any) => {
          // Se actualiza ultima_lectura_at → refrescar indicadores
          if (selectedId && payload.new?.conversacion_id === selectedId) {
            qc.invalidateQueries({ queryKey: ["mensajes", "msgs", selectedId] });
          }
          qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, selectedId, scope]);

  const convs = convsQ.data ?? [];
  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return convs;
    return convs.filter((c) => {
      const nombres = (c.otro?.nombres ?? c.participantes.map((p) => p.nombres).join(" ")).toLowerCase();
      return nombres.includes(t) || (c.ultimo_mensaje_preview ?? "").toLowerCase().includes(t);
    });
  }, [convs, busqueda]);

  const selected = convs.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid h-[calc(100dvh-8rem)] grid-cols-1 gap-3 overflow-hidden md:grid-cols-[340px_1fr]">
      {/* LISTA */}
      <aside
        className={`flex flex-col overflow-hidden rounded-2xl border bg-card/70 shadow-soft backdrop-blur ${selectedId ? "hidden md:flex" : "flex"}`}
      >
        <div className="border-b bg-gradient-to-r from-fuchsia-500/10 via-cyan-400/10 to-emerald-400/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar chats…"
                className="w-full rounded-full border bg-background/70 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              onClick={() => setNuevoDlg(true)}
              title="Nuevo chat"
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white shadow-soft transition hover:scale-105"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {convsQ.isLoading && (
            <li className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            </li>
          )}
          {!convsQ.isLoading && !filtradas.length && (
            <li className="p-8 text-center text-sm text-muted-foreground">
              {scope === "all" ? "Sin conversaciones en la plataforma." : "Aún no tienes conversaciones. Crea una con ➕"}
            </li>
          )}
          {filtradas.map((c) => {
            const otroPart = c.otro ?? c.participantes.find((p) => p.id !== currentUserId) ?? null;
            const nombre = otroPart?.nombres ?? c.participantes.filter((p) => p.id !== currentUserId).map((p) => p.nombres).join(", ") ?? "Sin nombre";
            const activa = selectedId === c.id;
            return (
              <li key={c.id} className="group/it relative">
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left transition hover:bg-secondary/40 ${activa ? "bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10" : ""}`}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-400 via-pink-400 to-cyan-400 text-sm font-bold text-white shadow-soft">
                    {otroPart?.avatar_url ? (
                      <img src={otroPart.avatar_url} alt={nombre} className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center">{nombre?.[0]?.toUpperCase() ?? "?"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{nombre}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.ultimo_mensaje_at).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {c.ultimo_mensaje_preview ?? "Sin mensajes aún"}
                      </span>
                      {c.no_leidos > 0 && (
                        <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                          {c.no_leidos}
                        </span>
                      )}
                    </div>
                    {!c.soy_participante && esAdmin && (
                      <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Supervisión</span>
                    )}
                  </div>
                </button>
                {esAdmin && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`¿Eliminar la conversación con ${nombre}? Se borrarán todos los mensajes.`)) return;
                      try {
                        await borrarConversacionFn({ data: { id: c.id } });
                        if (selectedId === c.id) setSelectedId(null);
                        qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
                        toast.success("Conversación eliminada.");
                      } catch (err: any) {
                        toast.error(err.message ?? "No se pudo borrar.");
                      }
                    }}
                    title="Eliminar conversación"
                    className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-full bg-background/80 text-rose-500 shadow-soft ring-1 ring-border transition hover:bg-rose-500 hover:text-white group-hover/it:grid"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* PANEL */}
      <section
        className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-gradient-to-br from-background via-background to-fuchsia-500/5 shadow-soft ${!selectedId ? "hidden md:flex" : "flex"}`}
      >
        {selected ? (
          <ChatPanel
            key={selected.id}
            conv={selected}
            currentUserId={currentUserId}
            esAdmin={esAdmin}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="grid h-full place-items-center p-8 text-center text-muted-foreground">
            <div>
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-white shadow-soft">
                <MessageSquarePlus className="h-7 w-7" />
              </div>
              <p className="font-semibold">Elige un chat</p>
              <p className="text-sm">Selecciona una conversación o crea una nueva.</p>
            </div>
          </div>
        )}
      </section>

      {nuevoDlg && (
        <NuevoChatDialog
          onClose={() => setNuevoDlg(false)}
          onCreated={(id) => {
            setNuevoDlg(false);
            setSelectedId(id);
            qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
          }}
        />
      )}
    </div>
  );
}

// =========================== Chat panel =========================
function ChatPanel({
  conv,
  currentUserId,
  esAdmin,
  onBack,
}: {
  conv: Conversacion;
  currentUserId: string;
  esAdmin: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [emojisOpen, setEmojisOpen] = useState(false);
  const [file, setFile] = useState<{ base64: string; mime: string; nombre: string; preview: string } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const otro = conv.otro ?? conv.participantes.find((p) => p.id !== currentUserId) ?? null;

  const msgsQ = useQuery({
    queryKey: ["mensajes", "msgs", conv.id],
    queryFn: () => listarMensajesFn({ data: { conversacionId: conv.id } }) as Promise<Mensaje[]>,
  });

  const presQ = useQuery({
    queryKey: ["mensajes", "presencia", otro?.id],
    queryFn: () => (otro ? presenciaUsuarioFn({ data: { userId: otro.id } }) : Promise.resolve(null as any)),
    enabled: !!otro && esAdmin,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (conv.no_leidos > 0) {
      marcarLeidoFn({ data: { conversacionId: conv.id } })
        .then(() => {
          qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
          qc.invalidateQueries({ queryKey: ["mensajes", "unread"] });
        })
        .catch(() => {});
    }
  }, [conv.id, conv.no_leidos, qc]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgsQ.data?.length]);

  const enviar = useMutation({
    mutationFn: () =>
      enviarMensajeFn({
        data: {
          conversacionId: conv.id,
          contenido: texto || null,
          attachmentBase64: file?.base64 ?? null,
          attachmentMime: file?.mime ?? null,
          attachmentNombre: file?.nombre ?? null,
        },
      }),
    onSuccess: () => {
      setTexto("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["mensajes", "msgs", conv.id] });
      qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo enviar."),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/image\/(png|jpe?g|webp|gif)/.test(f.type)) return toast.error("Solo imágenes.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Máximo 5 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        base64: reader.result as string,
        mime: f.type,
        nombre: f.name,
        preview: URL.createObjectURL(f),
      });
    };
    reader.readAsDataURL(f);
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const it of Array.from(items)) {
      if (it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (!blob) continue;
        if (blob.size > 5 * 1024 * 1024) return toast.error("Máximo 5 MB.");
        const reader = new FileReader();
        reader.onload = () => {
          setFile({
            base64: reader.result as string,
            mime: blob.type,
            nombre: "pegado.png",
            preview: URL.createObjectURL(blob),
          });
        };
        reader.readAsDataURL(blob);
      }
    }
  }

  const soloLectura = esAdmin && !conv.soy_participante ? false : false; // admin puede intervenir

  return (
    <>
      <div className="flex items-center gap-3 border-b bg-background/70 px-3 py-2 backdrop-blur">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary md:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-white shadow-soft">
          {(otro as any)?.avatar_url ? (
            <img src={(otro as any).avatar_url} alt={otro?.nombres ?? ""} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center">{otro?.nombres?.[0]?.toUpperCase() ?? "?"}</span>
          )}
          {esAdmin && presQ.data?.activo && (
            <span title="En línea" className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{otro?.nombres ?? "Chat"}</div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {esAdmin && presQ.data && (presQ.data as any).activo ? (
              <span title={`IP ${(presQ.data as any).ip ?? "?"} · desde ${new Date((presQ.data as any).iniciada_en).toLocaleString("es-EC")}`}
                className="inline-flex items-center gap-1 text-emerald-600">
                <Circle className="h-2 w-2 fill-emerald-500 stroke-none" />
                En línea
                {(presQ.data as any).dispositivo === "mobile" && <Smartphone className="h-3 w-3" />}
                {(presQ.data as any).dispositivo === "tablet" && <Tablet className="h-3 w-3" />}
                {(presQ.data as any).dispositivo === "desktop" && <Monitor className="h-3 w-3" />}
              </span>
            ) : (
              <span>{otro?.cedula ? `CI ${otro.cedula}` : ""}</span>
            )}
            {!conv.soy_participante && esAdmin && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">Modo supervisor</span>
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,theme(colors.fuchsia.100)_0%,transparent_60%),radial-gradient(ellipse_at_bottom,theme(colors.cyan.100)_0%,transparent_60%)] px-3 py-4 dark:bg-none"
      >
        {msgsQ.isLoading && <div className="py-8 text-center text-sm text-muted-foreground">Cargando…</div>}
        <ul className="space-y-2">
          {(msgsQ.data ?? []).map((m, idx, arr) => {
            const mine = m.sender_id === currentUserId;
            const prev = idx > 0 ? arr[idx - 1] : null;
            const nuevoDia =
              !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            return (
              <>
              {nuevoDia && (
                <li key={`sep-${m.id}`} className="flex justify-center py-1">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-soft backdrop-blur dark:bg-secondary dark:text-muted-foreground">
                    {etiquetaFecha(m.created_at)}
                  </span>
                </li>
              )}
              <li key={m.id} className={`group/msg flex items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}>

                {esAdmin && mine && (
                  <button
                    onClick={async () => {
                      if (!confirm("¿Borrar este mensaje?")) return;
                      try {
                        await borrarMensajeFn({ data: { id: m.id } });
                        qc.invalidateQueries({ queryKey: ["mensajes", "msgs", conv.id] });
                        qc.invalidateQueries({ queryKey: ["mensajes", "convs"] });
                      } catch (e: any) {
                        toast.error(e.message ?? "Error");
                      }
                    }}
                    title="Borrar mensaje"
                    className="grid h-6 w-6 place-items-center rounded-full text-rose-500 opacity-0 transition hover:bg-rose-500 hover:text-white group-hover/msg:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                    mine
                      ? "rounded-tr-sm bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white"
                      : m.es_admin_intervencion
                        ? "rounded-tl-sm border border-amber-300 bg-amber-50 text-amber-900"
                        : "rounded-tl-sm bg-gradient-to-br from-cyan-100 to-emerald-100 text-slate-900"
                  }`}
                >
                  {m.es_admin_intervencion && !mine && (
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">👑 Admin</div>
                  )}
                  {m.attachment_url && (
                    <img
                      src={m.attachment_url}
                      alt="adjunto"
                      className="mb-1 max-h-72 rounded-lg object-cover"
                    />
                  )}
                  {m.contenido && <p className="whitespace-pre-wrap break-words">{m.contenido}</p>}
                  <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/80" : "text-slate-500"}`}>
                    <span>{new Date(m.created_at).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span>
                    {mine && (
                      m.leido_por_otro ? (
                        <CheckCheck className="h-3.5 w-3.5 text-cyan-200" aria-label="Leído" />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-label="Entregado" />
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {file && (
        <div className="border-t bg-background/70 px-3 py-2">
          <div className="inline-flex items-center gap-2 rounded-xl border bg-card p-2 shadow-soft">
            <img src={file.preview} alt="preview" className="h-14 w-14 rounded object-cover" />
            <span className="text-xs">{file.nombre}</span>
            <button onClick={() => setFile(null)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-secondary">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="border-t bg-background/80 p-2 backdrop-blur">
        {emojisOpen && (
          <div className="mb-2 grid grid-cols-10 gap-1 rounded-xl border bg-card p-2 shadow-soft">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setTexto((t) => t + e);
                  setEmojisOpen(false);
                }}
                className="rounded-md p-1 text-xl transition hover:bg-secondary"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setEmojisOpen((v) => !v)}
            title="Emoji"
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <Smile className="h-5 w-5" />
          </button>
          <label
            title="Adjuntar imagen"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <ImageIcon className="h-5 w-5" />
            <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if ((texto.trim() || file) && !enviar.isPending) enviar.mutate();
              }
            }}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-2xl border bg-background px-3 py-2.5 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
          />
          <button
            disabled={enviar.isPending || (!texto.trim() && !file)}
            onClick={() => enviar.mutate()}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white shadow-soft transition hover:scale-105 disabled:opacity-40"
          >
            {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}

// =========================== Nuevo chat =========================
function NuevoChatDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [q, setQ] = useState("");
  const usuariosQ = useQuery({
    queryKey: ["mensajes", "usuarios"],
    queryFn: () => listarUsuariosChatFn(),
  });
  const abrir = useMutation({
    mutationFn: (uid: string) => abrirConversacionFn({ data: { otherUserId: uid } }),
    onSuccess: (r) => onCreated(r.id),
    onError: (e: any) => toast.error(e.message),
  });
  const lista = (usuariosQ.data ?? []).filter((u: any) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      u.nombres.toLowerCase().includes(t) ||
      u.cedula.toLowerCase().includes(t) ||
      u.rol.toLowerCase().includes(t)
    );
  });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-strong">
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 px-4 py-3">
          <h2 className="font-extrabold">Nuevo chat</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, cédula o rol…"
              className="w-full rounded-full border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {usuariosQ.isLoading && <li className="p-6 text-center text-sm text-muted-foreground">Cargando…</li>}
          {!usuariosQ.isLoading && !lista.length && <li className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</li>}
          {lista.map((u: any) => (
            <li key={u.id}>
              <button
                disabled={abrir.isPending}
                onClick={() => abrir.mutate(u.id)}
                className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition hover:bg-secondary/40"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-sm font-bold text-white">
                  {u.nombres[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{u.nombres}</div>
                  <div className="text-xs text-muted-foreground">CI {u.cedula} · <span className="capitalize">{u.rol}</span></div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ================= Hook badge no leídos =================
export function useMensajesNoLeidos(enabled: boolean) {
  return useQuery({
    queryKey: ["mensajes", "unread"],
    queryFn: () => contarNoLeidosFn(),
    enabled,
    refetchInterval: 20_000,
  });
}
