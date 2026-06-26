import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  crearGrupoFn,
  eliminarGrupoFn,
  listarGruposFn,
  listarEstudiantesFn,
  quitarEstudianteDeGrupoFn,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/grupos")({
  head: () => ({ meta: [{ title: "Grupos — Admin" }] }),
  component: GruposPage,
});

function GruposPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarGruposFn);
  const listarEst = useServerFn(listarEstudiantesFn);
  const crear = useServerFn(crearGrupoFn);
  const eliminar = useServerFn(eliminarGrupoFn);
  const quitar = useServerFn(quitarEstudianteDeGrupoFn);

  const { data: grupos } = useQuery({ queryKey: ["admin", "grupos"], queryFn: () => listar() });
  const { data: estudiantes } = useQuery({ queryKey: ["admin", "estudiantes"], queryFn: () => listarEst() });

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const crearMut = useMutation({
    mutationFn: async () => crear({ data: { nombre, descripcion } }),
    onSuccess: () => {
      toast.success("Grupo creado.");
      setNombre("");
      setDescripcion("");
      void qc.invalidateQueries({ queryKey: ["admin", "grupos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimMut = useMutation({
    mutationFn: async (grupoId: string) => eliminar({ data: { grupoId } }),
    onSuccess: () => {
      toast.success("Grupo eliminado.");
      void qc.invalidateQueries({ queryKey: ["admin", "grupos"] });
      void qc.invalidateQueries({ queryKey: ["admin", "estudiantes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quitarMut = useMutation({
    mutationFn: async (p: { grupoId: string; userId: string }) => quitar({ data: p }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "estudiantes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          crearMut.mutate();
        }}
        className="rounded-2xl border bg-card p-5 shadow-soft"
      >
        <h3 className="text-sm font-semibold">Crear grupo</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <div>
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. 1ro BGU A" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={crearMut.isPending}>
              {crearMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear
            </Button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {(grupos ?? []).length === 0 ? (
          <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
            Aún no hay grupos. Crea uno para organizar a tus estudiantes.
          </p>
        ) : (
          (grupos as any[]).map((g) => {
            const miembros = (estudiantes as any[] | undefined ?? []).filter((e) =>
              e.grupos.some((x: any) => x.id === g.id),
            );
            const open = expandido === g.id;
            return (
              <div key={g.id} className="rounded-2xl border bg-card shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-accent" />
                      <h4 className="font-bold">{g.nombre}</h4>
                      <Badge variant="outline">{miembros.length}</Badge>
                    </div>
                    {g.descripcion && <p className="text-xs text-muted-foreground">{g.descripcion}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setExpandido(open ? null : g.id)}>
                      {open ? "Ocultar miembros" : "Ver miembros"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`¿Eliminar el grupo "${g.nombre}"?`)) elimMut.mutate(g.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {open && (
                  <div className="border-t px-5 py-3">
                    {miembros.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin miembros. Asígnalos desde "Estudiantes".</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {miembros.map((m) => (
                          <li
                            key={m.id}
                            className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs"
                          >
                            <span>{m.nombres}</span>
                            <button
                              type="button"
                              onClick={() => quitarMut.mutate({ grupoId: g.id, userId: m.id })}
                              className="text-muted-foreground hover:text-destructive"
                              title="Quitar del grupo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
