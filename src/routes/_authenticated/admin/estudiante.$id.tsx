import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obtenerProgresoAlumnoFn } from "@/lib/admin.functions";
import { historialConexionesFn } from "@/lib/presencia.functions";
import { calcularEdad } from "@/lib/edad";
import { ArrowLeft, Eye, Database, BarChart3, History, Smartphone, Tablet, Monitor, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/estudiante/$id")({
  head: () => ({ meta: [{ title: "Vista estudiante — Admin" }] }),
  component: VistaEstudiante,
});

function VistaEstudiante() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fn = useServerFn(obtenerProgresoAlumnoFn);
  const fnHist = useServerFn(historialConexionesFn);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "progreso", id],
    queryFn: () => fn({ data: { userId: id } }),
  });
  const { data: conexiones } = useQuery({
    queryKey: ["admin", "conexiones", id],
    queryFn: () => fnHist({ data: { userId: id, limite: 50 } }),
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Cargando…</div>;
  if (error || !data) return <div className="p-10 text-center text-destructive">{(error as Error)?.message ?? "Error"}</div>;

  const { profile, respuestas, sesiones, grupos } = data as any;
  const edad = calcularEdad(profile.fecha_nacimiento);
  const total = respuestas.length;
  const aciertos = respuestas.filter((r: any) => r.correcta).length;
  const acc = total ? Math.round((aciertos / total) * 100) : 0;

  // Tiempo total de práctica (sesiones de tipo "practica" finalizadas)
  let segundosPractica = 0;
  for (const s of sesiones) {
    if (s.tipo !== "practica" || !s.finalizada_en) continue;
    const dur = (new Date(s.finalizada_en).getTime() - new Date(s.iniciada_en).getTime()) / 1000;
    if (dur > 0 && dur < 60 * 60 * 6) segundosPractica += dur;
  }
  const minutos = Math.round(segundosPractica / 60);

  return (
    <div className="space-y-5">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a estudiantes
      </Link>

      <div className="rounded-2xl border bg-gradient-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">{profile.nombres}</h2>
            <p className="text-sm text-muted-foreground">CI {profile.cedula} · {profile.institucion}</p>
            <p className="text-xs text-muted-foreground">Edad: {edad.texto} · Género: {profile.genero ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registrado el {new Date(profile.created_at).toLocaleString("es-EC")} · por{" "}
              <b>{(profile as any).creado_por_nombre ?? "—"}</b>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.bloqueado ? <Badge variant="destructive">Bloqueado</Badge> : <Badge variant="secondary">Activo</Badge>}
            {profile.primera_vez && <Badge variant="outline">Pwd temporal</Badge>}
            {(grupos ?? []).map((g: any) => (
              <Badge key={g.id} className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white">{g.nombre}</Badge>
            ))}
            {(!grupos || grupos.length === 0) && <Badge variant="outline">Sin grupo</Badge>}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Stat label="Preguntas respondidas" value={total} />
          <Stat label="% aciertos" value={`${acc}%`} accent />
          <Stat label="Sesiones" value={sesiones.length} />
          <Stat label="Tiempo en práctica" value={`${minutos} min`} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => navigate({ to: "/progreso", search: { as: id } })}>
            <BarChart3 className="h-4 w-4" /> Ver dashboard como estudiante
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/banco", search: { as: id } as any })}>
            <Database className="h-4 w-4" /> Ver biblioteca
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b px-5 py-3 text-sm font-semibold">
          <History className="h-4 w-4" /> Sesiones recientes
        </div>
        {sesiones.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Aún no hay sesiones registradas.</p>
        ) : (
          <ul className="divide-y">
            {sesiones.slice(0, 25).map((s: any) => {
              const dur = s.finalizada_en
                ? Math.round((new Date(s.finalizada_en).getTime() - new Date(s.iniciada_en).getTime()) / 60000)
                : null;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{s.tipo}{s.area ? ` · ${s.area}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.iniciada_en).toLocaleString("es-EC")}
                      {dur !== null && ` · ${dur} min`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>{s.correctas}/{s.total_preguntas}</span>
                    {s.nivel_logro && <Badge variant="outline">{s.nivel_logro}</Badge>}
                    {s.puntaje_ineval !== null && <Badge>{s.puntaje_ineval} pts</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b px-5 py-3 text-sm font-semibold">
          <Eye className="h-4 w-4" /> Últimas respuestas
        </div>
        {respuestas.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Sin respuestas.</p>
        ) : (
          <ul className="divide-y">
            {respuestas.slice(0, 30).map((r: any, i: number) => (
              <li key={i} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{r.area} · <span className="text-muted-foreground">{r.subtema}</span></p>
                  <p className="text-xs text-muted-foreground">{new Date(r.respondida_en).toLocaleString("es-EC")}</p>
                </div>
                <Badge variant={r.correcta ? "secondary" : "destructive"}>
                  {r.correcta ? "✓" : "✗"} {r.nivel}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="border-b px-5 py-3 text-sm font-semibold flex items-center gap-2">
          <Wifi className="h-4 w-4" /> Historial de conexiones
        </div>
        {!conexiones || conexiones.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Sin conexiones registradas aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Inicio</th>
                  <th className="px-3 py-2 text-left">Fin</th>
                  <th className="px-3 py-2 text-left">Disp.</th>
                  <th className="px-3 py-2 text-left">IP</th>
                  <th className="px-3 py-2 text-right">Visible</th>
                  <th className="px-3 py-2 text-right">2º plano</th>
                  <th className="px-3 py-2 text-right">Interacción</th>
                </tr>
              </thead>
              <tbody>
                {conexiones.map((c: any) => {
                  const Ic = c.dispositivo === "mobile" ? Smartphone : c.dispositivo === "tablet" ? Tablet : Monitor;
                  const dur = (n: number) => `${Math.floor(n / 60)}m ${n % 60}s`;
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 text-xs">{new Date(c.iniciada_en).toLocaleString("es-EC")}</td>
                      <td className="px-3 py-2 text-xs">{c.finalizada_en ? new Date(c.finalizada_en).toLocaleString("es-EC") : c.finalizada ? "—" : <span className="text-emerald-600 font-semibold">en curso</span>}</td>
                      <td className="px-3 py-2"><Ic className="h-4 w-4 inline" /> <span className="text-xs">{c.dispositivo ?? "—"}</span></td>
                      <td className="px-3 py-2 font-mono text-xs">{c.ip || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{dur(c.segundos_visible ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-amber-600">{dur(c.segundos_oculto ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-primary font-semibold">{dur(c.segundos_interaccion ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "bg-primary/5" : "bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-extrabold">{value}</p>
    </div>
  );
}
