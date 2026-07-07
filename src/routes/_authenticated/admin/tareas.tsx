import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarTareasFn,
  gruposDisponiblesFn,
  crearTareaFn,
  editarTareaFn,
  borrarTareaFn,
  urlAdjuntoFn,
} from "@/lib/tareas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  ClipboardList, Plus, Trash2, Loader2, Paperclip, Download, X, Pencil,
  CalendarClock, FolderTree, Eye, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tareas")({
  head: () => ({ meta: [{ title: "Tareas — Admin" }] }),
  component: AdminTareasPage,
});

type Draft = {
  id?: string;
  titulo: string;
  descripcion_html: string;
  categoria: string;
  youtube_url: string;
  grupoIds: string[];
  files: File[];
  adjuntosExistentes: any[];
  adjuntosBorrar: string[];
  programar: boolean;
  programada_para: string; // datetime-local
};

const EMPTY: Draft = {
  titulo: "", descripcion_html: "", categoria: "", youtube_url: "",
  grupoIds: [], files: [], adjuntosExistentes: [], adjuntosBorrar: [],
  programar: false, programada_para: "",
};

function filesToBase64(list: File[]) {
  return Promise.all(list.map((f) => new Promise<{nombre:string;mime:string;base64:string}>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ nombre: f.name, mime: f.type || "application/octet-stream", base64: r.result as string });
    r.onerror = rej;
    r.readAsDataURL(f);
  })));
}

function AdminTareasPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarTareasFn);
  const grupos = useServerFn(gruposDisponiblesFn);
  const crear = useServerFn(crearTareaFn);
  const editar = useServerFn(editarTareaFn);
  const borrar = useServerFn(borrarTareaFn);
  const firmar = useServerFn(urlAdjuntoFn);

  const { data: tareas } = useQuery({ queryKey: ["tareas", "mias"], queryFn: () => listar() });
  const { data: gruposList } = useQuery({ queryKey: ["tareas", "grupos-disp"], queryFn: () => grupos() });

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [verVistas, setVerVistas] = useState<string | null>(null);

  const editando = !!draft.id;

  function toggleGrupo(id: string) {
    setDraft((d) => ({ ...d, grupoIds: d.grupoIds.includes(id) ? d.grupoIds.filter((x) => x !== id) : [...d.grupoIds, id] }));
  }

  function cargarParaEditar(t: any) {
    setDraft({
      id: t.id,
      titulo: t.titulo,
      descripcion_html: t.descripcion_html || t.descripcion || "",
      categoria: t.categoria || "",
      youtube_url: t.youtube_url || "",
      grupoIds: (t.grupos || []).map((g: any) => g.id),
      files: [],
      adjuntosExistentes: t.adjuntos || [],
      adjuntosBorrar: [],
      programar: !!t.programada_para,
      programada_para: t.programada_para ? new Date(t.programada_para).toISOString().slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const guardarMut = useMutation({
    mutationFn: async () => {
      if (!draft.titulo.trim()) throw new Error("Título requerido.");
      if (draft.grupoIds.length === 0) throw new Error("Selecciona al menos un grupo.");
      const programada_para = draft.programar && draft.programada_para
        ? new Date(draft.programada_para).toISOString() : null;
      const nuevos = await filesToBase64(draft.files);
      if (editando) {
        return editar({ data: {
          tareaId: draft.id!,
          titulo: draft.titulo,
          descripcion_html: draft.descripcion_html || null,
          descripcion: null,
          categoria: draft.categoria || null,
          programada_para,
          youtube_url: draft.youtube_url || null,
          grupoIds: draft.grupoIds,
          adjuntosNuevos: nuevos,
          adjuntosBorrar: draft.adjuntosBorrar,
        }});
      }
      return crear({ data: {
        titulo: draft.titulo,
        descripcion_html: draft.descripcion_html || null,
        descripcion: null,
        categoria: draft.categoria || null,
        programada_para,
        youtube_url: draft.youtube_url || null,
        grupoIds: draft.grupoIds,
        adjuntos: nuevos,
      }});
    },
    onSuccess: () => {
      toast.success(editando ? "Tarea actualizada." : "Tarea publicada.");
      setDraft(EMPTY);
      qc.invalidateQueries({ queryKey: ["tareas", "mias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrarMut = useMutation({
    mutationFn: async (id: string) => borrar({ data: { tareaId: id } }),
    onSuccess: () => {
      toast.success("Tarea eliminada.");
      qc.invalidateQueries({ queryKey: ["tareas", "mias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function abrirAdj(id: string) {
    try {
      const r: any = await firmar({ data: { adjuntoId: id } });
      window.open(r.url, "_blank");
    } catch (e: any) { toast.error(e.message); }
  }

  // Agrupar tareas por categoría
  const agrupadas = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of (tareas as any[] | undefined) ?? []) {
      const k = t.categoria?.trim() || "Sin categoría";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tareas]);

  const vistaTarea = (tareas as any[] | undefined)?.find((t) => t.id === verVistas);

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => { e.preventDefault(); guardarMut.mutate(); }}
        className="rounded-2xl border bg-card p-5 shadow-soft space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">{editando ? "Editar tarea" : "Nueva tarea"}</h3>
          </div>
          {editando && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(EMPTY)}>
              <X className="h-4 w-4" /> Cancelar edición
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Título</Label>
            <Input value={draft.titulo} onChange={(e) => setDraft({ ...draft, titulo: e.target.value })} placeholder="Ej. Repaso trigonometría" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><FolderTree className="h-3.5 w-3.5" /> Categoría / carpeta</Label>
            <Input value={draft.categoria} onChange={(e) => setDraft({ ...draft, categoria: e.target.value })} placeholder="Ej. Unidad 3 · Trigonometría" />
          </div>
        </div>

        <div>
          <Label>Contenido (formato enriquecido)</Label>
          <RichTextEditor
            value={draft.descripcion_html}
            onChange={(html) => setDraft({ ...draft, descripcion_html: html })}
            placeholder="Escribe instrucciones, usa negritas, colores, fuentes…"
          />
        </div>

        <div>
          <Label>Enlace de YouTube (opcional)</Label>
          <Input value={draft.youtube_url} onChange={(e) => setDraft({ ...draft, youtube_url: e.target.value })} placeholder="https://youtu.be/…" />
        </div>

        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={draft.programar} onChange={(e) => setDraft({ ...draft, programar: e.target.checked })} />
            <CalendarClock className="h-4 w-4" /> Programar publicación
          </label>
          {draft.programar && (
            <Input
              type="datetime-local"
              value={draft.programada_para}
              onChange={(e) => setDraft({ ...draft, programada_para: e.target.value })}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {draft.programar
              ? "Los estudiantes verán la tarea a partir de la fecha y hora indicadas."
              : "La tarea se publicará inmediatamente al guardar."}
          </p>
        </div>

        <div>
          <Label>Grupos destinatarios</Label>
          {(gruposList as any[] | undefined)?.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tienes grupos permitidos.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {(gruposList as any[] | undefined ?? []).map((g) => {
                const on = draft.grupoIds.includes(g.id);
                return (
                  <button
                    type="button" key={g.id} onClick={() => toggleGrupo(g.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                  >{g.nombre}</button>
                );
              })}
            </div>
          )}
        </div>

        {editando && draft.adjuntosExistentes.length > 0 && (
          <div>
            <Label>Adjuntos actuales</Label>
            <ul className="mt-1 flex flex-wrap gap-1 text-xs">
              {draft.adjuntosExistentes.map((a) => {
                const marcadoBorrar = draft.adjuntosBorrar.includes(a.id);
                return (
                  <li key={a.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${marcadoBorrar ? "line-through opacity-50" : "bg-secondary"}`}>
                    <Paperclip className="h-3 w-3" /> {a.nombre}
                    <button type="button" onClick={() => setDraft({ ...draft,
                      adjuntosBorrar: marcadoBorrar
                        ? draft.adjuntosBorrar.filter((x) => x !== a.id)
                        : [...draft.adjuntosBorrar, a.id],
                    })}>
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <Label>Adjuntos {editando ? "nuevos" : ""} (máx 25MB c/u)</Label>
          <Input type="file" multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,.txt"
            onChange={(e) => setDraft({ ...draft, files: Array.from(e.target.files ?? []) })}
          />
          {draft.files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
              {draft.files.map((f, i) => (
                <li key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                  <Paperclip className="h-3 w-3" /> {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" disabled={guardarMut.isPending}>
          {guardarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editando ? "Guardar cambios" : "Publicar tarea"}
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Mis tareas publicadas ({(tareas as any[] | undefined ?? []).length})</h3>
        {agrupadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has publicado tareas.</p>
        ) : (
          agrupadas.map(([cat, items]) => {
            const abierto = openCats[cat] ?? true;
            return (
              <div key={cat} className="rounded-2xl border bg-card shadow-soft">
                <button
                  className="flex w-full items-center justify-between gap-2 rounded-t-2xl bg-muted/40 px-4 py-2 text-left text-sm font-semibold"
                  onClick={() => setOpenCats({ ...openCats, [cat]: !abierto })}
                >
                  <span className="inline-flex items-center gap-2">
                    {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <FolderTree className="h-4 w-4 text-primary" /> {cat}
                    <Badge variant="secondary" className="ml-1">{items.length}</Badge>
                  </span>
                </button>
                {abierto && (
                  <div className="divide-y">
                    {items.map((t: any) => {
                      const futura = t.programada_para && new Date(t.programada_para) > new Date();
                      return (
                        <div key={t.id} className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold">{t.titulo}</h4>
                                {futura && (
                                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                    <CalendarClock className="mr-1 h-3 w-3" />
                                    Programada
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(t.created_at).toLocaleString()}
                                {t.programada_para && (<> · Publicación: {new Date(t.programada_para).toLocaleString()}</>)}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {t.grupos?.map((g: any) => (
                                  <Badge key={g.id} variant="secondary" className="text-[10px]">{g.nombre}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setVerVistas(t.id)} title="Ver quién la ha leído">
                                <Eye className="h-4 w-4" /> <span className="ml-1 text-xs">{t.total_vistas}</span>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => cargarParaEditar(t)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm("¿Eliminar tarea?")) borrarMut.mutate(t.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          {t.descripcion_html ? (
                            <div className="prose prose-sm dark:prose-invert mt-2 max-w-none" dangerouslySetInnerHTML={{ __html: t.descripcion_html }} />
                          ) : t.descripcion ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm">{t.descripcion}</p>
                          ) : null}
                          {t.youtube_url && (
                            <a href={t.youtube_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-primary hover:underline">
                              {t.youtube_url}
                            </a>
                          )}
                          {t.adjuntos?.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {t.adjuntos.map((a: any) => (
                                <li key={a.id}>
                                  <Button variant="outline" size="sm" onClick={() => abrirAdj(a.id)}>
                                    <Paperclip className="h-3.5 w-3.5" /> {a.nombre} <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {verVistas && vistaTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setVerVistas(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-2xl bg-card p-5 shadow-strong" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Quién ha visto: {vistaTarea.titulo}</h3>
              <Button size="sm" variant="ghost" onClick={() => setVerVistas(null)}><X className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">{vistaTarea.total_vistas} lectura(s)</p>
            {vistaTarea.vistas_detalle && vistaTarea.vistas_detalle.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {vistaTarea.vistas_detalle.map((v: any) => (
                  <li key={v.user_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="truncate">{v.nombres}</span>
                    <span className="text-xs text-muted-foreground">{new Date(v.visto_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Aún nadie la ha abierto.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
