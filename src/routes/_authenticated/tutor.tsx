import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { crearHiloFn, eliminarHiloFn, listarHilosFn } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Trash2, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: [{ title: "Mr. Victor — Tutor virtual" }] }),
  component: TutorLayout,
});

function TutorLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listar = useServerFn(listarHilosFn);
  const crear = useServerFn(crearHiloFn);
  const eliminar = useServerFn(eliminarHiloFn);

  const { data: hilos = [] } = useQuery({ queryKey: ["chat", "hilos"], queryFn: () => listar() });
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  const crearMut = useMutation({
    mutationFn: async () => crear({ data: {} }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["chat", "hilos"] });
      navigate({ to: "/tutor/$threadId", params: { threadId: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimMut = useMutation({
    mutationFn: async (id: string) => eliminar({ data: { threadId: id } }),
    onSuccess: (_d, id) => {
      toast.success("Conversación eliminada.");
      void qc.invalidateQueries({ queryKey: ["chat", "hilos"] });
      if (activeId === id) navigate({ to: "/tutor" });
    },
  });

  // Si no hay hilo activo, no auto-crear: mostrar landing.
  useEffect(() => { /* placeholder por si más adelante autoseleccionamos */ }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver al inicio
      </Link>
      <header className="mt-3 mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-primary p-2 text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Mr. Victor <span className="text-muted-foreground font-medium text-base">· Tutor virtual</span></h1>
          <p className="text-sm text-muted-foreground">
            Aprende conmigo con metodología Piaget. Matemática, Física, Química y técnicas de estudio.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border bg-card p-3 shadow-soft">
          <Button onClick={() => crearMut.mutate()} disabled={crearMut.isPending} className="w-full">
            <Plus className="h-4 w-4" /> Nueva conversación
          </Button>
          <div className="mt-3 space-y-1 max-h-[60vh] overflow-y-auto">
            {hilos.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">Aún no tienes conversaciones.</p>
            ) : hilos.map((h) => (
              <div
                key={h.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${activeId === h.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
              >
                <button
                  type="button"
                  onClick={() => navigate({ to: "/tutor/$threadId", params: { threadId: h.id } })}
                  className="flex flex-1 items-center gap-2 truncate text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{h.titulo}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (confirm("¿Eliminar esta conversación?")) elimMut.mutate(h.id); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border bg-card shadow-soft min-h-[60vh]">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
