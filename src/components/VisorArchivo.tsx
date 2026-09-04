import { Download, ExternalLink, FileText, X } from "lucide-react";

export function esImagen(mime: string, nombre = "") {
  return /^image\//i.test(mime) || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(nombre);
}
export function esPdf(mime: string, nombre = "") {
  return /pdf/i.test(mime) || /\.pdf$/i.test(nombre);
}
export function esOffice(mime: string, nombre = "") {
  return (
    /(word|excel|powerpoint|officedocument|ms-)/i.test(mime) ||
    /\.(docx?|xlsx?|pptx?|odt|ods|odp)$/i.test(nombre)
  );
}
export function esTexto(mime: string, nombre = "") {
  return /^text\//i.test(mime) || /\.(txt|csv|md)$/i.test(nombre);
}
export function esVideo(mime: string, nombre = "") {
  return /^video\//i.test(mime) || /\.(mp4|webm|ogg|mov)$/i.test(nombre);
}
export function esAudio(mime: string, nombre = "") {
  return /^audio\//i.test(mime) || /\.(mp3|wav|ogg|m4a)$/i.test(nombre);
}

export function tamanoLegible(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

/** Visor universal de archivos dentro de la app. */
export function VisorArchivo({
  url,
  mime,
  nombre,
  onClose,
}: {
  url: string;
  mime: string;
  nombre: string;
  onClose: () => void;
}) {
  const remoto = /^https?:/i.test(url);
  const office = esOffice(mime, nombre) && remoto;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-2 sm:p-6" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{nombre}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download={nombre}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Descargar
          </a>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 bg-muted/30">
          {esImagen(mime, nombre) ? (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
              <img src={url} alt={nombre} className="max-h-full max-w-full rounded-lg object-contain" />
            </div>
          ) : esPdf(mime, nombre) || esTexto(mime, nombre) ? (
            <iframe src={url} title={nombre} className="h-full w-full" />
          ) : esVideo(mime, nombre) ? (
            <video src={url} controls className="h-full w-full bg-black" />
          ) : esAudio(mime, nombre) ? (
            <div className="grid h-full place-items-center p-6">
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : office ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              title={nombre}
              className="h-full w-full bg-white"
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  No hay vista previa para este archivo{!remoto ? " antes de subirlo" : ""}.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  download={nombre}
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir / descargar
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
