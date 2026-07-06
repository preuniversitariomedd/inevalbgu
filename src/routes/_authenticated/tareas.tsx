import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  listarTareasFn,
  marcarTareaVistaFn,
  urlAdjuntoFn,
} from "@/lib/tareas.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FileText, Image as ImageIcon, Youtube, Download, ArrowLeft, Sparkles, Circle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tareas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Tareas" }] }),
  component: TareasPage,
});

function ytEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    const m = u.pathname.match(/embed\/([^/]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  } catch {}
  return null;
}

function iconForMime(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function TareasPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarTareasFn);
  const marcar = useServerFn(marcarTareaVistaFn);
  const firmar = useServerFn(urlAdjuntoFn);
  const { data: tareas, isLoading } = useQuery({
    queryKey: ["tareas", "mias"],
    queryFn: () => listar(),
  });

  const marcarMut = useMutation({
    mutationFn: async (id: string) => marcar({ data: { tareaId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas", "mias"] });
      qc.invalidateQueries({ queryKey: ["tareas", "pendientes"] });
    },
  });

  async function abrirAdjunto(id: string) {
    try {
      const r: any = await firmar({ data: { adjuntoId: id } });
      window.open(r.url, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <header className="mt-3 mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 p-2.5 text-white shadow-soft">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Tareas</h1>
          <p className="text-sm text-muted-foreground">
            Materiales, videos y notas enviados por tus docentes.
          </p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (tareas ?? []).length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no tienes tareas asignadas.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {(tareas as any[]).map((t) => (
            <TareaCard key={t.id} t={t} onOpen={abrirAdjunto} onSeen={() => !t.visto_por_mi && marcarMut.mutate(t.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TareaCard({ t, onOpen, onSeen }: { t: any; onOpen: (id: string) => void; onSeen: () => void }) {
  const embed = t.youtube_url ? ytEmbed(t.youtube_url) : null;
  useEffect(() => {
    if (!t.visto_por_mi) onSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <li className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {!t.visto_por_mi && <Circle className="h-2.5 w-2.5 fill-primary text-primary" />}
            <h3 className="text-lg font-bold">{t.titulo}</h3>
            <Badge variant="outline" className="text-[10px]">
              {t.creador_rol === "administrador" ? "Admin" : "Docente"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.creador_nombre} · {new Date(t.created_at).toLocaleString()}
          </p>
          {t.grupos?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {t.grupos.map((g: any) => (
                <Badge key={g.id} variant="secondary" className="text-[10px]">
                  {g.nombre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {t.descripcion && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{t.descripcion}</p>
      )}
      {embed && (
        <div className="mt-3 aspect-video overflow-hidden rounded-xl border">
          <iframe
            src={embed}
            title="YouTube"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}
      {t.youtube_url && !embed && (
        <a
          href={t.youtube_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Youtube className="h-4 w-4" /> {t.youtube_url}
        </a>
      )}
      {t.adjuntos?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {t.adjuntos.map((a: any) => (
            <li key={a.id}>
              <Button variant="outline" size="sm" onClick={() => onOpen(a.id)}>
                {iconForMime(a.mime)}
                <span className="max-w-[220px] truncate">{a.nombre}</span>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
