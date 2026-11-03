import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import { listarInfraccionesFn } from "@/lib/antifraude.functions";
import { NOMBRE_INFRACCION, type TipoInfraccion } from "@/lib/antifraude";
import { CONSULTA_MANUAL } from "@/lib/consulta-politicas";
import { BotonRefrescar } from "@/components/BotonRefrescar";
import { Button } from "@/components/ui/button";

const MODULO: Record<string, string> = { simulacro: "Simulacro", conocimiento: "Conocimiento", razonamiento: "Razonamiento" };

export function InfraccionesPanel() {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const listar = useServerFn(listarInfraccionesFn);
  const q = useQuery({ queryKey: ["admin", "infracciones"], queryFn: () => listar(), enabled: abierto, ...CONSULTA_MANUAL });
  const filas = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    return ((q.data ?? []) as Array<{ id: string; nombres: string; cedula: string; modulo: string; tipo: string; numero: number; created_at: string }>).filter((f) => !t || f.nombres.toLowerCase().includes(t) || f.cedula.includes(t));
  }, [q.data, filtro]);

  return (
    <section className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="inline-flex items-center gap-2 text-lg font-extrabold"><ShieldAlert className="h-5 w-5 text-destructive" /> Infracciones en evaluaciones</h2>
        {abierto ? (
          <>
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre o cédula…" className="w-56 rounded-lg border bg-background px-3 py-1.5 text-sm" />
            <BotonRefrescar cargando={q.isFetching} onClick={() => void q.refetch()} />
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>Ver infracciones</Button>
        )}
      </div>
      {abierto && (
        q.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Cargando…</p> :
        q.error ? <p className="mt-4 text-sm text-destructive">No se pudieron cargar las infracciones.</p> :
        !filas.length ? <p className="mt-4 text-sm text-muted-foreground">No hay infracciones registradas.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="p-2">Estudiante</th><th className="p-2">Cédula</th><th className="p-2">Evaluación</th><th className="p-2">Tipo</th><th className="p-2">N.º</th><th className="p-2">Fecha y hora</th></tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className={`border-t ${f.numero >= 4 ? "bg-destructive/10" : ""}`}>
                    <td className="p-2 font-medium">{f.nombres}</td>
                    <td className="p-2">{f.cedula}</td>
                    <td className="p-2">{MODULO[f.modulo] ?? f.modulo}</td>
                    <td className="p-2">{NOMBRE_INFRACCION[f.tipo as TipoInfraccion] ?? f.tipo}</td>
                    <td className="p-2">{f.numero >= 4 ? "4 · cierre" : `${f.numero} de 3`}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(f.created_at).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
