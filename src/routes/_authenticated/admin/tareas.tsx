import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listarTareasFn,
  gruposDisponiblesFn,
  crearTareaFn,
  borrarTareaFn,
  urlAdjuntoFn,
} from "@/lib/tareas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, Loader2, Paperclip, Download, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/tareas")({
  head: () => ({ meta: [{ title: "Tareas — Admin" }] }),
  component: AdminTareasPage,
});

function AdminTareasPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarTareasFn);
  const grupos = useServerFn(gruposDisponiblesFn);
  const crear = useServerFn(crearTareaFn);
  const borrar = useServerFn(borrarTareaFn);
  const firmar = useServerFn(urlAdjuntoFn);

  const { data: tareas } = useQuery({ queryKey: ["tareas", "mias"], queryFn: () => listar() });
  const { data: gruposList } = useQuery({ queryKey: ["tareas", "grupos-disp"], queryFn: () => grupos() });

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [yt, setYt] = useState("");
  const [grupoIds, setGrupoIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  function toggleGrupo(id: string) {
    setGrupoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function filesToBase64(list: File[]) {
    return Promise.all(
      list.map(
        (f) =>
          new Promise<{ nombre: string; mime: string; base64: string }>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res({ nombre: f.name, mime: f.type || "application/octet-stream", base64: r.result as string });
            r.onerror = rej;
            r.readAsDataURL(f);
          }),
      ),
    );
  }

  const crearMut = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("Título requerido.");
      if (grupoIds.length === 0) throw new Error("Selecciona al menos un grupo.");
      const adjuntos = await filesToBase64(files);
      return crear({
        data: {
          titulo,
          descripcion: descripcion || null,
          youtube_url: yt || null,
          grupoIds,
          adjuntos,
        },
      });
    },
    onSuccess: () => {
      toast.success("Tarea publicada.");
      setTitulo(""); setDescripcion(""); setYt(""); setGrupoIds([]); setFiles([]);
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

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => { e.preventDefault(); crearMut.mutate(); }}
        className="rounded-2xl border bg-card p-5 shadow-soft space-y-3"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">Nueva tarea</h3>
        </div>
        <div>
          <Label>Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Repaso trigonometría" />
        </div>
        <div>
          <Label>Descripción / notas</Label>
          <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} />
        </div>
        <div>
          <Label>Enlace de YouTube (opcional)</Label>
          <Input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtu.be/…" />
        </div>
        <div>
          <Label>Grupos destinatarios</Label>
          {(gruposList as any[] | undefined)?.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tienes grupos permitidos. Pide al administrador que te habilite grupos.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {(gruposList as any[] | undefined ?? []).map((g) => {
                const on = grupoIds.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGrupo(g.id)}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                  >
                    {g.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <Label>Adjuntos (pdf, doc, xls, ppt, imágenes) — máx 25MB c/u</Label>
          <Input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,.txt"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
              {files.map((f, i) => (
                <li key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                  <Paperclip className="h-3 w-3" /> {f.name}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={crearMut.isPending}>
          {crearMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Publicar tarea
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Mis tareas publicadas</h3>
        {(tareas as any[] | undefined ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no has publicado tareas.</p>
        ) : (
          (tareas as any[]).map((t) => (
            <div key={t.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold">{t.titulo}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()} · vistas: {t.total_vistas}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.grupos?.map((g: any) => (
                      <Badge key={g.id} variant="secondary" className="text-[10px]">{g.nombre}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { if (confirm("¿Eliminar tarea?")) borrarMut.mutate(t.id); }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              {t.descripcion && <p className="mt-2 text-sm whitespace-pre-wrap">{t.descripcion}</p>}
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
          ))
        )}
      </div>
    </div>
  );
}
