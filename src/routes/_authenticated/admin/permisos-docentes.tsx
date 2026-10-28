import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarPermisosDocentesFn, setPermisoDocenteFn } from "@/lib/tareas.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/permisos-docentes")({
  head: () => ({ meta: [...pageMeta("Permisos docentes — Admin — INEVAL_UEDE","Permisos docentes en la plataforma educativa INEVAL_UEDE."),{ title: "Permisos docentes — Admin — INEVAL_UEDE" }] }),
  component: PermisosPage,
});

function PermisosPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarPermisosDocentesFn);
  const setP = useServerFn(setPermisoDocenteFn);
  const { data } = useQuery({ queryKey: ["admin", "permisos-docentes"], queryFn: () => listar() });

  const mut = useMutation({
    mutationFn: async (p: { docenteId: string; grupoId: string; permitir: boolean }) =>
      setP({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "permisos-docentes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const d: any = data ?? { docentes: [], grupos: [], permisos: [] };
  const has = (docenteId: string, grupoId: string) =>
    d.permisos.some((p: any) => p.docente_id === docenteId && p.grupo_id === grupoId);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold mb-3">Grupos que cada docente puede usar en Tareas</h3>
      {d.docentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay docentes registrados.</p>
      ) : d.grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay grupos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Docente</th>
                {d.grupos.map((g: any) => (
                  <th key={g.id} className="p-2 text-xs">{g.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.docentes.map((doc: any) => (
                <tr key={doc.id} className="border-t">
                  <td className="p-2 font-medium">{doc.nombres} <span className="text-xs text-muted-foreground">({doc.cedula})</span></td>
                  {d.grupos.map((g: any) => (
                    <td key={g.id} className="p-2 text-center">
                      <Checkbox
                        checked={has(doc.id, g.id)}
                        onCheckedChange={(v) =>
                          mut.mutate({ docenteId: doc.id, grupoId: g.id, permitir: !!v })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
