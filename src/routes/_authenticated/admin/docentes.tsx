import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarDocentesFn } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcularEdad } from "@/lib/edad";
import { Search, Loader2, Wifi, WifiOff, Smartphone, Laptop, Tablet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/docentes")({
  head: () => ({ meta: [...pageMeta("Docentes — Admin — INEVAL_UEDE","Docentes en la plataforma educativa INEVAL_UEDE."),{ title: "Docentes — Admin — INEVAL_UEDE" }] }),
  component: DocentesPage,
});

type Docente = {
  id: string;
  cedula: string;
  nombres: string;
  institucion: string;
  fecha_nacimiento: string;
  genero: string | null;
  bloqueado: boolean;
  created_at: string;
  avatar_url: string | null;
  email: string | null;
  last_sign_in_at: string | null;
  en_vivo: boolean;
  ultima_conexion: string | null;
  ultimo_dispositivo: string | null;
  ultima_ip: string | null;
};

function iconoDispositivo(d: string | null) {
  const s = (d ?? "").toLowerCase();
  if (s.includes("phone") || s.includes("móvil") || s.includes("movil")) return <Smartphone className="h-3.5 w-3.5" />;
  if (s.includes("tablet")) return <Tablet className="h-3.5 w-3.5" />;
  return <Laptop className="h-3.5 w-3.5" />;
}

function fmtFecha(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocentesPage() {
  const listar = useServerFn(listarDocentesFn);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "docentes"],
    queryFn: () => listar(),
    refetchInterval: 30_000,
  });
  const [q, setQ] = useState("");

  const docentes = useMemo<Docente[]>(() => (data as Docente[] | undefined) ?? [], [data]);
  const filtrados = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return docentes;
    return docentes.filter(
      (d) =>
        d.cedula.includes(x) ||
        d.nombres.toLowerCase().includes(x) ||
        (d.institucion ?? "").toLowerCase().includes(x) ||
        (d.email ?? "").toLowerCase().includes(x),
    );
  }, [q, docentes]);

  const enVivo = docentes.filter((d) => d.en_vivo).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cédula, nombre, institución o correo…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="secondary">{docentes.length} docentes</Badge>
          <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
            <Wifi className="mr-1 h-3 w-3" /> {enVivo} en vivo
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando docentes…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {docentes.length === 0 ? "Aún no hay docentes registrados." : "Sin resultados."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Docente</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última conexión</TableHead>
                <TableHead>Registrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((d) => {
                const edad = calcularEdad(d.fecha_nacimiento);
                const iniciales = d.nombres
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            {d.avatar_url ? <AvatarImage src={d.avatar_url} alt={d.nombres} /> : null}
                            <AvatarFallback>{iniciales}</AvatarFallback>
                          </Avatar>
                          {d.en_vivo && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{d.nombres}</p>
                          <p className="text-[11px] capitalize text-muted-foreground">{d.genero ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.cedula}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.institucion}</TableCell>
                    <TableCell className="text-xs">{edad.texto}</TableCell>
                    <TableCell>
                      {d.bloqueado ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : d.en_vivo ? (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                          <Wifi className="mr-1 h-3 w-3" /> En vivo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <WifiOff className="mr-1 h-3 w-3" /> Offline
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="whitespace-nowrap">{fmtFecha(d.ultima_conexion ?? d.last_sign_in_at)}</div>
                      {d.ultimo_dispositivo && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          {iconoDispositivo(d.ultimo_dispositivo)}
                          <span className="capitalize">{d.ultimo_dispositivo}</span>
                          {d.ultima_ip && <span>· {d.ultima_ip}</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString("es-EC", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Los estados en vivo se refrescan automáticamente cada 30 segundos.
      </p>
    </div>
  );
}
