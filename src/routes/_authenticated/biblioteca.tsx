import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Library, Search, Plus, Star, Eye, Trash2, Pencil, X, FileText, Video, Link2,
  Image as ImageIcon, StickyNote, Download, ExternalLink, Filter, Tags, LayoutGrid, List, Folder,
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  listarRecursosFn, listarCategoriasBibliotecaFn, guardarRecursoFn, borrarRecursoFn,
  urlArchivoBibliotecaFn, marcarRecursoVistoFn, toggleFavoritoRecursoFn,
  guardarCategoriaBibliotecaFn, borrarCategoriaBibliotecaFn,
} from "@/lib/biblioteca.functions";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de recursos — INEVAL_UEDE" },
      { name: "description", content: "Investiga con documentos, videos, infografías y apuntes organizados por categorías, con vista previa dentro de la app." },
      { property: "og:title", content: "Biblioteca de recursos — INEVAL_UEDE" },
      { property: "og:description", content: "Documentos, videos, infografías y apuntes para estudiar sin salir de la aplicación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Biblioteca,
});

type Recurso = {
  id: string; categoria_id: string | null; titulo: string; descripcion: string | null;
  notas_html: string | null; tipo: string; enlace_url: string | null; descarga_url: string | null;
  etiquetas: string[]; destacado: boolean; publicado: boolean; created_at: string;
  creador_nombre: string; vistas: number; favorito: boolean; puede_editar: boolean;
  archivos: { id: string; nombre: string; mime: string; tamano: number }[];
};

const TIPOS = [
  { id: "documento", label: "Documento", icon: FileText },
  { id: "video", label: "Video", icon: Video },
  { id: "enlace", label: "Enlace / descarga", icon: Link2 },
  { id: "infografia", label: "Infografía", icon: ImageIcon },
  { id: "apunte", label: "Apunte", icon: StickyNote },
] as const;

function iconoTipo(tipo: string) {
  return (TIPOS.find((t) => t.id === tipo) ?? TIPOS[0]).icon;
}

function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (/youtube\.com$/.test(u.hostname) || u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}`;
    if (u.hostname.includes("drive.google.com")) return url.replace("/view", "/preview");
    if (u.hostname.includes("docs.google.com")) return url;
    return null;
  } catch {
    return null;
  }
}

function tamanoLegible(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function Biblioteca() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState<string>("todas");
  const [tipo, setTipo] = useState<string>("todos");
  const [soloFav, setSoloFav] = useState(false);
  const [vista, setVista] = useState<"grid" | "lista">("grid");
  const [editar, setEditar] = useState<Recurso | "nuevo" | null>(null);
  const [detalle, setDetalle] = useState<Recurso | null>(null);
  const [gestCats, setGestCats] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["biblioteca"], queryFn: () => listarRecursosFn() });
  const { data: cats } = useQuery({ queryKey: ["biblioteca-cats"], queryFn: () => listarCategoriasBibliotecaFn() });

  const esStaff = (data as any)?.esStaff ?? false;
  const recursos: Recurso[] = ((data as any)?.recursos ?? []) as Recurso[];
  const categorias = (cats ?? []) as { id: string; nombre: string; color: string; descripcion: string | null }[];
  const catMap = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return recursos.filter((r) => {
      if (cat !== "todas" && r.categoria_id !== cat) return false;
      if (tipo !== "todos" && r.tipo !== tipo) return false;
      if (soloFav && !r.favorito) return false;
      if (!q) return true;
      return (
        r.titulo.toLowerCase().includes(q) ||
        (r.descripcion ?? "").toLowerCase().includes(q) ||
        (r.etiquetas ?? []).some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [recursos, busca, cat, tipo, soloFav]);

  async function abrir(r: Recurso) {
    setDetalle(r);
    try {
      await marcarRecursoVistoFn({ data: { recursoId: r.id } });
      qc.invalidateQueries({ queryKey: ["biblioteca"] });
    } catch { /* ignore */ }
  }

  async function fav(r: Recurso) {
    await toggleFavoritoRecursoFn({ data: { recursoId: r.id, activo: !r.favorito } });
    qc.invalidateQueries({ queryKey: ["biblioteca"] });
  }

  async function borrar(r: Recurso) {
    if (!confirm(`¿Eliminar "${r.titulo}"?`)) return;
    await borrarRecursoFn({ data: { id: r.id } });
    toast.success("Recurso eliminado.");
    qc.invalidateQueries({ queryKey: ["biblioteca"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-500 p-6 text-white shadow-strong sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Library className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold sm:text-4xl">Biblioteca</h1>
            <p className="mt-1 max-w-2xl text-sm opacity-90">
              Investiga con documentos, presentaciones, videos, infografías y apuntes. Todo se abre
              dentro de la aplicación, sin salir de tu sesión de estudio.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/20 px-3 py-1">{recursos.length} recursos</span>
              <span className="rounded-full bg-white/20 px-3 py-1">{categorias.length} categorías</span>
              <span className="rounded-full bg-white/20 px-3 py-1">
                {recursos.filter((r) => r.favorito).length} favoritos
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, descripción o etiqueta…"
            className="w-full rounded-full border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-full border bg-background px-3 py-2 text-sm">
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-full border bg-background px-3 py-2 text-sm">
          <option value="todos">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button
          onClick={() => setSoloFav((s) => !s)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium ${soloFav ? "bg-amber-400/20 text-amber-600" : "hover:bg-secondary"}`}
        >
          <Star className={`h-4 w-4 ${soloFav ? "fill-amber-400 text-amber-500" : ""}`} /> Favoritos
        </button>
        <button
          onClick={() => setVista((v) => (v === "grid" ? "lista" : "grid"))}
          className="rounded-full border p-2 hover:bg-secondary"
          title="Cambiar vista"
        >
          {vista === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </button>
        {esStaff && (
          <>
            <button onClick={() => setGestCats(true)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium hover:bg-secondary">
              <Folder className="h-4 w-4" /> Categorías
            </button>
            <button
              onClick={() => setEditar("nuevo")}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nuevo recurso
            </button>
          </>
        )}
      </div>

      {/* Atajos por categoría */}
      {categorias.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCat("todas")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cat === "todas" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Listado */}
      {isLoading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Cargando recursos…</p>
      ) : filtrados.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
          <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No hay recursos que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className={vista === "grid" ? "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "mt-6 space-y-3"}>
          {filtrados.map((r) => {
            const Icon = iconoTipo(r.tipo);
            const c = r.categoria_id ? catMap.get(r.categoria_id) : null;
            return (
              <article
                key={r.id}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong ${vista === "lista" ? "flex items-start gap-4" : ""}`}
              >
                {r.destacado && (
                  <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[10px] font-bold text-white">
                    Destacado
                  </span>
                )}
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-cyan-500/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className={vista === "grid" ? "mt-3" : ""}>
                    {c && <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{c.nombre}</span>}
                    <h3 className="text-base font-bold leading-tight">{r.titulo}</h3>
                    {r.descripcion && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.descripcion}</p>}
                  </div>
                  {r.etiquetas?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.etiquetas.slice(0, 4).map((e) => (
                        <span key={e} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">#{e}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{r.vistas}</span>
                    {r.archivos.length > 0 && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{r.archivos.length}</span>}
                    {!r.publicado && <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-600">Borrador</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={() => abrir(r)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                      Vista previa
                    </button>
                    <button onClick={() => fav(r)} className="rounded-full border p-1.5 hover:bg-secondary" title="Favorito">
                      <Star className={`h-4 w-4 ${r.favorito ? "fill-amber-400 text-amber-500" : ""}`} />
                    </button>
                    {r.puede_editar && (
                      <>
                        <button onClick={() => setEditar(r)} className="rounded-full border p-1.5 hover:bg-secondary" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => borrar(r)} className="rounded-full border p-1.5 text-destructive hover:bg-destructive/10" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {detalle && <VisorRecurso recurso={detalle} onClose={() => setDetalle(null)} />}
      {editar && (
        <EditorRecurso
          recurso={editar === "nuevo" ? null : editar}
          categorias={categorias}
          onClose={() => setEditar(null)}
          onSaved={() => { setEditar(null); qc.invalidateQueries({ queryKey: ["biblioteca"] }); }}
        />
      )}
      {gestCats && <GestorCategorias onClose={() => setGestCats(false)} />}
    </div>
  );
}

/* ---------------- Visor con vista previa ---------------- */
function VisorRecurso({ recurso, onClose }: { recurso: Recurso; onClose: () => void }) {
  const [preview, setPreview] = useState<{ url: string; mime: string; nombre: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const embed = recurso.enlace_url ? embedUrl(recurso.enlace_url) : null;

  async function verArchivo(id: string) {
    setCargando(true);
    try {
      const res = await urlArchivoBibliotecaFn({ data: { archivoId: id } });
      setPreview(res as any);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo abrir el archivo.");
    } finally {
      setCargando(false);
    }
  }

  const officeSrc =
    preview && /(word|excel|powerpoint|officedocument|ms-)/i.test(preview.mime)
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(preview.url)}`
      : null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-strong">
        <div className="flex items-start justify-between gap-3 border-b bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 p-5">
          <div>
            <h2 className="text-xl font-extrabold">{recurso.titulo}</h2>
            <p className="text-xs text-muted-foreground">
              Publicado por {recurso.creador_nombre || "—"} ·{" "}
              {new Date(recurso.created_at).toLocaleDateString("es-EC", { dateStyle: "medium" })}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border p-2 hover:bg-secondary" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {recurso.descripcion && <p className="text-sm text-muted-foreground">{recurso.descripcion}</p>}

          {embed && (
            <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-black">
              <iframe
                src={embed}
                title={recurso.titulo}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          )}

          {recurso.enlace_url && !embed && (
            <a href={recurso.enlace_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-secondary">
              <ExternalLink className="h-4 w-4" /> Abrir enlace
            </a>
          )}

          {recurso.descarga_url && (
            <a href={recurso.descarga_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Download className="h-4 w-4" /> Enlace de descarga
            </a>
          )}

          {recurso.archivos.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">Archivos</h3>
              <ul className="space-y-2">
                {recurso.archivos.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/40 px-3 py-2">
                    <span className="truncate text-sm">
                      <FileText className="mr-2 inline h-4 w-4" />
                      {a.nombre} <span className="text-xs text-muted-foreground">({tamanoLegible(a.tamano)})</span>
                    </span>
                    <button onClick={() => verArchivo(a.id)} className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary">
                      Ver
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cargando && <p className="text-sm text-muted-foreground">Preparando vista previa…</p>}

          {preview && (
            <div className="overflow-hidden rounded-2xl border">
              {preview.mime.startsWith("image/") ? (
                <img src={preview.url} alt={preview.nombre} className="max-h-[70vh] w-full object-contain bg-black/5" />
              ) : officeSrc ? (
                <iframe src={officeSrc} title={preview.nombre} className="h-[70vh] w-full" />
              ) : (
                <iframe src={preview.url} title={preview.nombre} className="h-[70vh] w-full" />
              )}
              <div className="flex justify-end border-t bg-secondary/40 p-2">
                <a href={preview.url} download={preview.nombre}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-background">
                  <Download className="h-3.5 w-3.5" /> Descargar
                </a>
              </div>
            </div>
          )}

          {recurso.notas_html && (
            <div className="rounded-2xl border bg-gradient-card p-4">
              <h3 className="mb-2 text-sm font-bold">Apuntes</h3>
              <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: recurso.notas_html }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Editor (staff) ---------------- */
function EditorRecurso({
  recurso, categorias, onClose, onSaved,
}: {
  recurso: Recurso | null;
  categorias: { id: string; nombre: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(recurso?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(recurso?.descripcion ?? "");
  const [notas, setNotas] = useState(recurso?.notas_html ?? "");
  const [tipo, setTipo] = useState<string>(recurso?.tipo ?? "documento");
  const [categoriaId, setCategoriaId] = useState(recurso?.categoria_id ?? "");
  const [enlace, setEnlace] = useState(recurso?.enlace_url ?? "");
  const [descarga, setDescarga] = useState(recurso?.descarga_url ?? "");
  const [etiquetas, setEtiquetas] = useState((recurso?.etiquetas ?? []).join(", "));
  const [destacado, setDestacado] = useState(recurso?.destacado ?? false);
  const [publicado, setPublicado] = useState(recurso?.publicado ?? true);
  const [nuevos, setNuevos] = useState<File[]>([]);
  const [borrar, setBorrar] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function guardar() {
    if (titulo.trim().length < 2) return toast.error("Escribe un título.");
    setGuardando(true);
    try {
      const archivosNuevos = await Promise.all(
        nuevos.map(
          (f) =>
            new Promise<{ nombre: string; mime: string; base64: string }>((res, rej) => {
              const r = new FileReader();
              r.onload = () => res({ nombre: f.name, mime: f.type || "application/octet-stream", base64: r.result as string });
              r.onerror = rej;
              r.readAsDataURL(f);
            }),
        ),
      );
      await guardarRecursoFn({
        data: {
          id: recurso?.id ?? null,
          categoria_id: categoriaId || null,
          titulo,
          descripcion,
          notas_html: notas,
          tipo: tipo as any,
          enlace_url: enlace,
          descarga_url: descarga,
          etiquetas: etiquetas.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
          destacado,
          publicado,
          archivosNuevos,
          archivosBorrar: borrar,
        },
      });
      toast.success(recurso ? "Recurso actualizado." : "Recurso publicado.");
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background/80 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border bg-card p-5 shadow-strong">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{recurso ? "Editar recurso" : "Nuevo recurso"}</h2>
          <button onClick={onClose} className="rounded-full border p-2 hover:bg-secondary" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-medium">
            Título
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">
            Categoría
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm">
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2 text-sm font-medium">
            Descripción corta
            <textarea value={descripcion ?? ""} onChange={(e) => setDescripcion(e.target.value)} rows={2}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">
            Enlace de video o página (YouTube, Vimeo, Drive…)
            <input value={enlace ?? ""} onChange={(e) => setEnlace(e.target.value)} placeholder="https://youtu.be/…"
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">
            Enlace de descarga externo
            <input value={descarga ?? ""} onChange={(e) => setDescarga(e.target.value)} placeholder="https://…"
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">
            <span className="inline-flex items-center gap-1"><Tags className="h-4 w-4" /> Etiquetas (separadas por coma)</span>
            <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} placeholder="álgebra, examen, resumen"
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">Apuntes / contenido enriquecido</p>
          <RichTextEditor value={notas ?? ""} onChange={setNotas} placeholder="Escribe apuntes, pasos o instrucciones…" />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Archivos (PDF, Word, Excel, PowerPoint, imágenes… máx. 25 MB)</p>
          {recurso?.archivos?.map((a) => (
            <div key={a.id} className="mb-1 flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm">
              <span className={borrar.includes(a.id) ? "line-through opacity-50" : ""}>{a.nombre}</span>
              <button
                onClick={() => setBorrar((b) => (b.includes(a.id) ? b.filter((x) => x !== a.id) : [...b, a.id]))}
                className="text-xs text-destructive hover:underline"
              >
                {borrar.includes(a.id) ? "Deshacer" : "Quitar"}
              </button>
            </div>
          ))}
          <div className="mt-2">
            <FileDropzone value={nuevos} onChange={setNuevos} />
          </div>
        </div>


        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={destacado} onChange={(e) => setDestacado(e.target.checked)} /> Destacado
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} /> Visible para estudiantes
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancelar</button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Gestor de categorías ---------------- */
function GestorCategorias({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["biblioteca-cats"], queryFn: () => listarCategoriasBibliotecaFn() });
  const cats = (data ?? []) as { id: string; nombre: string; descripcion: string | null; orden: number }[];
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  async function crear() {
    if (nombre.trim().length < 2) return toast.error("Escribe un nombre.");
    await guardarCategoriaBibliotecaFn({
      data: { nombre, descripcion, color: "violet", icono: "BookOpen", orden: cats.length + 1 },
    });
    setNombre(""); setDescripcion("");
    toast.success("Categoría creada.");
    qc.invalidateQueries({ queryKey: ["biblioteca-cats"] });
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar la categoría? Los recursos quedarán sin categoría.")) return;
    await borrarCategoriaBibliotecaFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["biblioteca-cats"] });
    qc.invalidateQueries({ queryKey: ["biblioteca"] });
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-5 shadow-strong">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Categorías de la biblioteca</h2>
          <button onClick={onClose} className="rounded-full border p-2 hover:bg-secondary" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="mb-4 space-y-2">
          {cats.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{c.nombre}</p>
                {c.descripcion && <p className="text-xs text-muted-foreground">{c.descripcion}</p>}
              </div>
              <button onClick={() => eliminar(c.id)} className="rounded-full border p-1.5 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 rounded-2xl bg-secondary/40 p-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la categoría"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          <button onClick={crear} className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Añadir categoría
          </button>
        </div>
      </div>
    </div>
  );
}
