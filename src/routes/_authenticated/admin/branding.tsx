import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { actualizarBrandingFn, obtenerBrandingFn } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  head: () => ({ meta: [...pageMeta("Branding — Admin — INEVAL_UEDE — INEVAL_UEDE","Branding en la plataforma educativa INEVAL_UEDE."),{ title: "Branding — Admin — INEVAL_UEDE" }] }),
  component: BrandingPage,
});

function fileToBase64(file: File): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, type: file.type || "image/png" });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function BrandingPage() {
  const qc = useQueryClient();
  const obtener = useServerFn(obtenerBrandingFn);
  const actualizar = useServerFn(actualizarBrandingFn);
  const { data, isLoading } = useQuery({ queryKey: ["branding"], queryFn: () => obtener() });

  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setTitulo(data.titulo ?? "");
      setSubtitulo(data.subtitulo ?? "");
      setLogoPreview(data.logo_url ?? null);
      setHeroPreview(data.hero_url ?? null);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: any = { titulo, subtitulo };
      if (logoFile) {
        const r = await fileToBase64(logoFile);
        payload.logoBase64 = r.base64;
        payload.logoContentType = r.type;
      }
      if (heroFile) {
        const r = await fileToBase64(heroFile);
        payload.heroBase64 = r.base64;
        payload.heroContentType = r.type;
      }
      return actualizar({ data: payload });
    },
    onSuccess: () => {
      toast.success("Branding actualizado.");
      setLogoFile(null);
      setHeroFile(null);
      void qc.invalidateQueries({ queryKey: ["branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-8 text-center text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="text-lg font-bold">Identidad visual</h3>
        <p className="text-sm text-muted-foreground">
          El logo y la imagen principal se muestran a todos los estudiantes en la página de inicio.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="INEVAL_UEDE" />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} placeholder="Tu preparación para Matemática" />
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <BrandingUpload
            label="Logo circular"
            preview={logoPreview}
            file={logoFile}
            onFile={(f) => {
              setLogoFile(f);
              setLogoPreview(f ? URL.createObjectURL(f) : data?.logo_url ?? null);
            }}
            shape="circle"
          />
          <BrandingUpload
            label="Imagen hero (banner principal)"
            preview={heroPreview}
            file={heroFile}
            onFile={(f) => {
              setHeroFile(f);
              setHeroPreview(f ? URL.createObjectURL(f) : data?.hero_url ?? null);
            }}
            shape="rect"
          />
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

function BrandingUpload({
  label,
  preview,
  file,
  onFile,
  shape,
}: {
  label: string;
  preview: string | null;
  file: File | null;
  onFile: (f: File | null) => void;
  shape: "circle" | "rect";
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <Label>{label}</Label>
      <div className="mt-3 flex items-center gap-4">
        <div
          className={`flex items-center justify-center overflow-hidden border bg-muted ${
            shape === "circle"
              ? "h-24 w-24 rounded-full ring-4 ring-primary/15"
              : "h-24 w-40 rounded-xl"
          }`}
        >
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
          <Upload className="h-4 w-4" />
          {file ? "Cambiar" : "Subir imagen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );
}
