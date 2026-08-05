import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { podioFn, misRespuestasEncuestaFn, resumenEncuestaFn } from "@/lib/encuesta.functions";
import { BLOQUES_ENCUESTA, textoPregunta } from "@/data/encuesta";
import {
  Trophy, Search, ChevronLeft, ChevronRight, Clock, ListChecks, Target,
  Medal, X, ClipboardCheck, Users, ArrowUpDown, Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/podio")({
  component: PodioPage,
});

type Fila = {
  id: string; cedula: string; nombres: string; institucion: string; genero: string | null;
  avatar_url: string | null; grupos: string[];
  segundos_plataforma: number; segundos_interaccion: number; segundos_practica: number;
  preguntas_resueltas: number; correctas: number; precision_pct: number;
  sesiones: number; mejor_puntaje: number; encuesta_respondidas: number;
  ultima_practica: string | null; en_vivo: boolean; puntaje_podio: number;
};

const ORDENES = [
  { id: "puntaje_podio", label: "Puntaje del podio", icon: Trophy },
  { id: "segundos_plataforma", label: "Tiempo en plataforma", icon: Clock },
  { id: "preguntas_resueltas", label: "Preguntas resueltas", icon: ListChecks },
  { id: "mejor_puntaje", label: "Puntaje más alto", icon: Medal },
  { id: "precision_pct", label: "Precisión %", icon: Target },
  { id: "segundos_practica", label: "Tiempo de práctica", icon: Clock },
  { id: "encuesta_respondidas", label: "Encuesta respondida", icon: ClipboardCheck },
] as const;

type OrdenId = (typeof ORDENES)[number]["id"];

function hhmm(seg: number) {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function PodioPage() {
  const [grupoId, setGrupoId] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<OrdenId>("puntaje_podio");
  const [asc, setAsc] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [vista, setVista] = useState<"ranking" | "encuesta">("ranking");

  const { data, isLoading } = useQuery({
    queryKey: ["podio", grupoId],
    queryFn: () => podioFn({ data: { grupoId: grupoId || null } }),
    refetchInterval: 60_000,
  });

  const grupos = ((data as any)?.grupos ?? []) as { id: string; nombre: string }[];
  const base = ((data as any)?.filas ?? []) as Fila[];

  const filas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const f = base.filter(
      (x) => !t || x.nombres.toLowerCase().includes(t) || x.cedula.includes(t) || x.institucion.toLowerCase().includes(t),
    );
    return [...f].sort((a, b) => {
      const va = a[orden] as number;
      const vb = b[orden] as number;
      return asc ? va - vb : vb - va;
    });
  }, [base, busqueda, orden, asc]);

  const actual = seleccion !== null ? filas[seleccion] : null;

  function exportar() {
    const cols = ["Puesto", "Cédula", "Nombres", "Grupos", "Tiempo plataforma (min)", "Preguntas", "Correctas", "Precisión %", "Mejor puntaje", "Encuesta", "Puntaje podio"];
    const rows = filas.map((f, i) => [
      i + 1, f.cedula, f.nombres, f.grupos.join(" / "),
      Math.round(f.segundos_plataforma / 60), f.preguntas_resueltas, f.correctas,
      f.precision_pct, f.mejor_puntaje, f.encuesta_respondidas, f.puntaje_podio,
    ]);
    const csv = [cols, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `podio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border p-1">
          {(["ranking", "encuesta"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "ranking" ? "Ranking" : "Encuesta de factores"}
            </button>
          ))}
        </div>
        <select
          value={grupoId}
          onChange={(e) => { setGrupoId(e.target.value); setSeleccion(null); }}
          className="rounded-xl border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los grupos</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setSeleccion(null); }}
            placeholder="Buscar estudiante…"
            className="rounded-xl border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        {vista === "ranking" && (
          <>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as OrdenId)}
              className="rounded-xl border bg-background px-3 py-2 text-sm"
            >
              {ORDENES.map((o) => (
                <option key={o.id} value={o.id}>Ordenar por: {o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setAsc((a) => !a)}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-secondary"
              title="Invertir orden"
            >
              <ArrowUpDown className="h-4 w-4" /> {asc ? "Menor a mayor" : "Mayor a menor"}
            </button>
            <button
              onClick={exportar}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> {filas.length} estudiantes
        </span>
      </div>

      {vista === "encuesta" ? (
        <EncuestaResumen userIds={filas.map((f) => f.id)} filas={filas} />
      ) : isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando podio…</p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {filas.slice(0, 3).map((f, i) => (
              <button
                key={f.id}
                onClick={() => setSeleccion(i)}
                className={`rounded-2xl border-2 p-4 text-left shadow-soft transition hover:-translate-y-0.5 ${
                  i === 0
                    ? "border-amber-400 bg-gradient-to-br from-amber-100/70 to-background"
                    : i === 1
                      ? "border-slate-300 bg-gradient-to-br from-slate-100/70 to-background"
                      : "border-orange-300 bg-gradient-to-br from-orange-100/70 to-background"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 text-base font-black text-white">
                    {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{f.nombres}</p>
                    <p className="text-xs text-muted-foreground">{f.grupos.join(", ") || "Sin grupo"}</p>
                  </div>
                  <Trophy className={`ml-auto h-6 w-6 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-orange-400"}`} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="font-black">{hhmm(f.segundos_plataforma)}</p><p className="text-muted-foreground">Plataforma</p></div>
                  <div><p className="font-black">{f.preguntas_resueltas}</p><p className="text-muted-foreground">Preguntas</p></div>
                  <div><p className="font-black">{f.puntaje_podio}</p><p className="text-muted-foreground">Puntaje</p></div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border shadow-soft">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Estudiante</th>
                  <th className="px-3 py-2">Grupos</th>
                  <th className="px-3 py-2">Tiempo plataforma</th>
                  <th className="px-3 py-2">Preguntas</th>
                  <th className="px-3 py-2">Precisión</th>
                  <th className="px-3 py-2">Mejor puntaje</th>
                  <th className="px-3 py-2">Encuesta</th>
                  <th className="px-3 py-2">Podio</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr
                    key={f.id}
                    onClick={() => setSeleccion(i)}
                    className={`cursor-pointer border-t transition hover:bg-secondary/40 ${actual?.id === f.id ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-3 py-2 font-black">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-[11px] font-bold">
                          {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : f.nombres.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold">{f.nombres} {f.en_vivo && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-500" title="En vivo" />}</p>
                          <p className="text-xs text-muted-foreground">CI {f.cedula}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{f.grupos.join(", ") || "—"}</td>
                    <td className="px-3 py-2">{hhmm(f.segundos_plataforma)}</td>
                    <td className="px-3 py-2">{f.preguntas_resueltas}</td>
                    <td className="px-3 py-2">{f.precision_pct}%</td>
                    <td className="px-3 py-2">{f.mejor_puntaje}</td>
                    <td className="px-3 py-2">{f.encuesta_respondidas}/100</td>
                    <td className="px-3 py-2 font-bold text-primary">{f.puntaje_podio}</td>
                  </tr>
                ))}
                {!filas.length && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Sin estudiantes para este filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {actual && vista === "ranking" && (
        <DetalleEstudiante
          fila={actual}
          puesto={(seleccion ?? 0) + 1}
          total={filas.length}
          onPrev={() => setSeleccion((s) => (s === null ? null : Math.max(0, s - 1)))}
          onNext={() => setSeleccion((s) => (s === null ? null : Math.min(filas.length - 1, s + 1)))}
          onClose={() => setSeleccion(null)}
        />
      )}
    </div>
  );
}

function DetalleEstudiante({
  fila, puesto, total, onPrev, onNext, onClose,
}: {
  fila: Fila; puesto: number; total: number;
  onPrev: () => void; onNext: () => void; onClose: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["encuesta", "alumno", fila.id],
    queryFn: () => misRespuestasEncuestaFn({ data: { targetUserId: fila.id } }),
  });
  const respuestas: Record<string, string> = {};
  for (const r of (data as any)?.respuestas ?? []) respuestas[r.pregunta_id] = r.valor;

  return (
    <div className="mt-5 rounded-2xl border bg-gradient-card p-5 shadow-strong">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 font-black text-white">
          {fila.avatar_url ? <img src={fila.avatar_url} alt="" className="h-full w-full object-cover" /> : puesto}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold">{fila.nombres}</h2>
          <p className="text-xs text-muted-foreground">
            CI {fila.cedula} · {fila.institucion} · {fila.grupos.join(", ") || "Sin grupo"} · Puesto {puesto} de {total}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onPrev} disabled={puesto <= 1} className="rounded-lg border p-2 hover:bg-secondary disabled:opacity-40" title="Estudiante anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={onNext} disabled={puesto >= total} className="rounded-lg border p-2 hover:bg-secondary disabled:opacity-40" title="Siguiente estudiante">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-lg border p-2 hover:bg-secondary" title="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metrica label="Tiempo plataforma" valor={hhmm(fila.segundos_plataforma)} />
        <Metrica label="Tiempo interacción" valor={hhmm(fila.segundos_interaccion)} />
        <Metrica label="Tiempo de práctica" valor={hhmm(fila.segundos_practica)} />
        <Metrica label="Preguntas resueltas" valor={String(fila.preguntas_resueltas)} />
        <Metrica label="Precisión" valor={`${fila.precision_pct}%`} />
        <Metrica label="Puntaje más alto" valor={String(fila.mejor_puntaje)} />
      </div>

      <h3 className="mt-5 text-sm font-bold">Encuesta de factores asociados ({Object.keys(respuestas).length}/100)</h3>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {BLOQUES_ENCUESTA.map((b) => {
          const items = b.preguntas.filter((p) => respuestas[p.id]);
          return (
            <div key={b.id} className="rounded-xl border bg-background/60 p-3">
              <p className="text-xs font-bold">{b.titulo}</p>
              {items.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">Sin respuestas todavía.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs">
                  {items.map((p) => (
                    <li key={p.id} className="flex gap-2">
                      <span className="text-muted-foreground">{p.texto}</span>
                      <span className="ml-auto shrink-0 font-semibold">{respuestas[p.id]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metrica({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="text-base font-extrabold">{valor}</p>
    </div>
  );
}

function EncuestaResumen({ userIds, filas }: { userIds: string[]; filas: Fila[] }) {
  const [bloqueId, setBloqueId] = useState(BLOQUES_ENCUESTA[0].id);
  const { data, isLoading } = useQuery({
    queryKey: ["encuesta", "resumen", userIds.join(",")],
    queryFn: () => resumenEncuestaFn({ data: { userIds } }),
    enabled: userIds.length > 0,
  });

  const dist = new Map<string, { valor: string; n: number }[]>();
  for (const d of (data as any)?.distribucion ?? []) dist.set(d.preguntaId, d.opciones);
  const bloque = BLOQUES_ENCUESTA.find((b) => b.id === bloqueId)!;
  const completos = filas.filter((f) => f.encuesta_respondidas >= 100).length;

  return (
    <div className="mt-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metrica label="Participantes" valor={String((data as any)?.participantes ?? 0)} />
        <Metrica label="Respuestas registradas" valor={String((data as any)?.total ?? 0)} />
        <Metrica label="Encuestas completas" valor={`${completos} de ${filas.length}`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b">
        {BLOQUES_ENCUESTA.map((b) => (
          <button
            key={b.id}
            onClick={() => setBloqueId(b.id)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${
              bloqueId === b.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {b.titulo}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando resultados…</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {bloque.preguntas.map((p) => {
            const ops = dist.get(p.id) ?? [];
            const totalN = ops.reduce((s, o) => s + o.n, 0);
            return (
              <div key={p.id} className="rounded-xl border bg-gradient-card p-3 shadow-soft">
                <p className="text-xs font-bold">{textoPregunta(p.id)}</p>
                {totalN === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Sin respuestas.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {p.opciones.map((op) => {
                      const n = ops.find((o) => o.valor === op)?.n ?? 0;
                      const pct = totalN ? Math.round((n / totalN) * 100) : 0;
                      return (
                        <li key={op} className="text-[11px]">
                          <div className="flex justify-between"><span>{op}</span><span className="font-semibold">{pct}% ({n})</span></div>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
