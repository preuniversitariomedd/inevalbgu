import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cambiarRolFn, listarPersonalFn } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "Roles — Admin" }] }),
  component: RolesPage,
});

type Persona = { id: string; cedula: string; nombres: string; institucion: string; roles: string[] };

function RolesPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarPersonalFn);
  const cambiar = useServerFn(cambiarRolFn);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "personal"], queryFn: () => listar() });
  const [q, setQ] = useState("");

  const lista = useMemo<Persona[]>(() => (data as Persona[] | undefined) ?? [], [data]);
  const filtrados = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return lista;
    return lista.filter(
      (p) => p.cedula.includes(x) || p.nombres.toLowerCase().includes(x) || p.institucion.toLowerCase().includes(x),
    );
  }, [q, lista]);

  const mut = useMutation({
    mutationFn: async (p: { userId: string; rol: "administrador" | "docente" | "estudiante" }) =>
      cambiar({ data: p }),
    onSuccess: () => {
      toast.success("Rol actualizado.");
      void qc.invalidateQueries({ queryKey: ["admin", "personal"] });
      void qc.invalidateQueries({ queryKey: ["admin", "estudiantes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar persona…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Cargando…</p>
        ) : filtrados.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          <ul className="divide-y">
            {filtrados.map((p) => {
              const rolActual = (p.roles[0] ?? "estudiante") as "administrador" | "docente" | "estudiante";
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.nombres}</p>
                    <p className="truncate text-xs text-muted-foreground">CI {p.cedula} · {p.institucion}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={rolActual === "administrador" ? "default" : "outline"} className="capitalize">
                      <Shield className="mr-1 h-3 w-3" /> {rolActual}
                    </Badge>
                    <Select
                      value={rolActual}
                      onValueChange={(v) =>
                        mut.mutate({ userId: p.id, rol: v as "administrador" | "docente" | "estudiante" })
                      }
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrador">Administrador</SelectItem>
                        <SelectItem value="docente">Docente</SelectItem>
                        <SelectItem value="estudiante">Estudiante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {mut.isPending && (
        <p className="text-center text-xs text-muted-foreground">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Actualizando…
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Solo los administradores pueden cambiar roles. Los docentes pueden gestionar estudiantes y revisar estadísticas, pero no modificar roles ni el branding global.
      </p>
    </div>
  );
}
