import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { TEMAS_FISICA } from "@/data/fisica";
import { listarPreguntasFisicaFn, crearPreguntaFisicaFn, eliminarPreguntaFisicaFn } from "@/lib/fisica.functions";

export const Route = createFileRoute("/_authenticated/fisica/gestionar")({
  component: Gestionar,
});

function Gestionar() {
  const [tema, setTema] = useState<string>(TEMAS_FISICA[0]);
  const [subtema, setSubtema] = useState("");
  const [nivel, setNivel] = useState<"Básico" | "Intermedio" | "Avanzado">("Básico");
  const [enunciado, setEnunciado] = useState("");
  const [opciones, setOpciones] = useState<string[]>(["", "", "", ""]);
  const [correcta, setCorrecta] = useState(0);
  const [explicacion, setExplicacion] = useState("");
  const [imagen, setImagen] = useState<{ b64: string; mime: string; nombre: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const lista = useQuery({
    queryKey: ["fisica", "manuales", "gestion"],
    queryFn: () => listarPreguntasFisicaFn({ data: {} }),
  });
  const rows = useMemo(() => ((lista.data as any[]) ?? []), [lista.data]);

  function archivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("La imagen supera 8 MB.");
    const reader = new FileReader();
    reader.onload = () => setImagen({ b64: String(reader.result), mime: f.type, nombre: f.name });
    reader.readAsDataURL(f);
  }

  async function guardar() {
    const ops = opciones.map((o) => o.trim()).filter(Boolean);
    if (!subtema.trim() || !enunciado.trim() || ops.length < 2) {
      return toast.error("Completa subtema, enunciado y al menos 2 opciones.");
    }
    if (correcta >= ops.length) return toast.error("Elige una opción correcta válida.");
    setGuardando(true);
    try {
      await crearPreguntaFisicaFn({
        data: {
          tema,
          subtema: subtema.trim(),
          nivel,
          enunciado: enunciado.trim(),
          opciones: ops,
          respuestaCorrecta: correcta,
          explicacion: explicacion.trim() || null,
          activa: true,
          imagenBase64: imagen?.b64 ?? null,
          imagenMime: imagen?.mime ?? null,
        },
      });
      toast.success("Pregunta creada");
      setSubtema(""); setEnunciado(""); setOpciones(["", "", "", ""]); setCorrecta(0); setExplicacion(""); setImagen(null);
      void lista.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    try {
      await eliminarPreguntaFisicaFn({ data: { id } });
      toast.success("Pregunta eliminada");
      void lista.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/fisica" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Física
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold">Preguntas manuales de Física</h1>
        <p className="mt-2 text-muted-foreground">Crea ejercicios con imagen y hasta 5 opciones.</p>

        <div className="mt-6 space-y-3 rounded-2xl border bg-gradient-card p-5 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Tema
              <select value={tema} onChange={(e) => setTema(e.target.value)} className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm">
                {TEMAS_FISICA.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Subtema
              <input value={subtema} onChange={(e) => setSubtema(e.target.value)} className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm" placeholder="Caída libre" />
            </label>
            <label className="text-xs font-semibold">
              Nivel
              <select value={nivel} onChange={(e) => setNivel(e.target.value as any)} className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm">
                {["Básico", "Intermedio", "Avanzado"].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold">
            Enunciado
            <textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm" />
          </label>

          <div>
            <div className="text-xs font-semibold">Opciones (marca la correcta)</div>
            <div className="mt-2 space-y-2">
              {opciones.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="correcta" checked={correcta === i} onChange={() => setCorrecta(i)} />
                  <input
                    value={o}
                    onChange={(e) => setOpciones((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm"
                    placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
            {opciones.length < 5 && (
              <button onClick={() => setOpciones((p) => [...p, ""])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Plus className="h-3.5 w-3.5" /> Agregar quinta opción
              </button>
            )}
          </div>

          <label className="block text-xs font-semibold">
            Explicación
            <textarea value={explicacion} onChange={(e) => setExplicacion(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm" />
          </label>

          <label className="block text-xs font-semibold">
            Imagen del ejercicio (opcional)
            <input type="file" accept="image/*" onChange={archivo} className="mt-1 block w-full text-xs" />
          </label>
          {imagen && <p className="text-xs text-muted-foreground">Adjunta: {imagen.nombre}</p>}

          <button onClick={guardar} disabled={guardando} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {guardando ? "Guardando…" : "Crear pregunta"}
          </button>
        </div>

        <h2 className="mt-8 text-lg font-bold">Preguntas creadas ({rows.length})</h2>
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{r.tema} · {r.subtema} · {r.nivel}</div>
                <div className="text-sm font-medium">{r.enunciado}</div>
              </div>
              <button onClick={() => eliminar(r.id)} className="text-destructive" aria-label="Eliminar">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
