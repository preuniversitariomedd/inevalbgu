import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileText, Image as ImageIcon, Paperclip, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { VisorArchivo, esImagen, tamanoLegible } from "@/components/VisorArchivo";

export const MAX_MB = 25;

/**
 * Zona de carga con arrastrar-y-soltar, validación de tamaño (25 MB c/u)
 * y vista previa de cada archivo antes de subirlo.
 */
export function FileDropzone({
  value,
  onChange,
  multiple = true,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,image/*,video/*,audio/*",
  label = "Arrastra archivos aquí o haz clic para elegirlos",
}: {
  value: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [ver, setVer] = useState<{ url: string; mime: string; nombre: string } | null>(null);

  const urls = useMemo(() => value.map((f) => URL.createObjectURL(f)), [value]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  function agregar(lista: FileList | File[] | null) {
    const arr = Array.from(lista ?? []);
    if (!arr.length) return;
    const validos = arr.filter((f) => {
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`"${f.name}" supera ${MAX_MB} MB.`);
        return false;
      }
      return true;
    });
    if (!validos.length) return;
    onChange(multiple ? [...value, ...validos] : [validos[0]]);
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          agregar(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          over ? "border-fuchsia-500 bg-fuchsia-500/10" : "border-muted-foreground/30 hover:bg-secondary/50"
        }`}
      >
        <UploadCloud className={`h-6 w-6 ${over ? "text-fuchsia-500" : "text-muted-foreground"}`} />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, imágenes, video… máx. {MAX_MB} MB c/u</p>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={(e) => {
            agregar(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {value.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {value.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-soft">
              {esImagen(f.type, f.name) ? (
                <img src={urls[i]} alt={f.name} className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary">
                  {f.type.startsWith("image/") ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">{tamanoLegible(f.size)}</p>
              </div>
              <button
                type="button"
                title="Vista previa"
                onClick={() => setVer({ url: urls[i], mime: f.type, nombre: f.name })}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Quitar"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="grid h-7 w-7 place-items-center rounded-full text-destructive hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ver && <VisorArchivo {...ver} onClose={() => setVer(null)} />}
    </>
  );
}

export function ChipArchivo({ nombre, onClick }: { nombre: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1 rounded-full border bg-secondary px-2 py-0.5 text-xs hover:bg-secondary/70"
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="truncate">{nombre}</span>
    </button>
  );
}
