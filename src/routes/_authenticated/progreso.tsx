import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, TrendingDown, BarChart3, PieChart as PieIcon, Search, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { obtenerProgresoFn, calificacionAsignaturasFn } from "@/lib/progreso.functions";
import { listarEstudiantesFn } from "@/lib/admin.functions";
import { getCurrentProfile } from "@/lib/auth-helpers";

export const Route = createFileRoute("/_authenticated/progreso")({
  head: () => ({ meta: [{ title: "Mi progreso — INEVAL_UEDE" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    as: typeof s.as === "string" ? s.as : undefined,
  }),
  component: ProgresoPage,
});

function ProgresoPage() {
  const navigate = useNavigate();
  const { as } = Route.useSearch();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getCurrentProfile });
  const esStaff = !!me?.esAdmin || (me?.roles ?? []).includes("administrador" as any);

  const { data: estudiantes } = useQuery({
    queryKey: ["admin", "estudiantes-lista"],
    queryFn: () => listarEstudiantesFn(),
    enabled: esStaff,
  });

  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const list = (estudiantes as any[] | undefined) ?? [];
    if (!q.trim()) return list.slice(0, 30);
    const s = q.toLowerCase();
    return list.filter((e: any) =>
      (e.nombres || "").toLowerCase().includes(s) || (e.cedula || "").includes(s),
    ).slice(0, 30);
  }, [estudiantes, q]);

  const { data, isLoading } = useQuery({
    queryKey: ["progreso", as ?? "me"],
    queryFn: () => obtenerProgresoFn({ data: as ? { targetUserId: as } : {} }),
    enabled: !esStaff || !!as, // staff sin selección: no carga
  });

  // Selector para staff cuando no hay estudiante elegido
  if (esStaff && !as) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Progreso de estudiantes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elige un estudiante para ver su progreso, sin importar el grupo.</p>
        <div className="mt-5 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar por nombre o cédula…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="mt-3 divide-y rounded-xl border bg-card shadow-soft">
          {filtrados.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">Sin resultados.</li>
          ) : (
            filtrados.map((e: any) => (
              <li key={e.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                  onClick={() => navigate({ to: "/progreso", search: { as: e.id } })}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{e.nombres}</div>
                    <div className="text-xs text-muted-foreground">
                      CI {e.cedula}
                      {e.grupos?.length > 0 && (
                        <span className="inline-flex items-center gap-1 ml-2">
                          · <Users className="h-3 w-3" /> {e.grupos.map((g: any) => g.nombre).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Ver progreso →</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }




  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 text-center text-muted-foreground">
        Cargando tu progreso...
      </div>
    );
  }

  const respuestas = data?.respuestas ?? [];
  const sesiones = (data?.sesiones ?? []).filter((s) => s.finalizada_en);

  if (respuestas.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <div className="mt-6 rounded-2xl border bg-gradient-card p-10 text-center shadow-soft">
          <BookOpen className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-extrabold">Aún no has practicado</h1>
          <p className="mt-2 text-muted-foreground">
            Empieza una sesión para ver tu progreso y temas débiles.
          </p>
          <Link
            to="/practicar"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Practicar ahora
          </Link>
        </div>
      </div>
    );
  }

  const total = respuestas.length;
  const aciertos = respuestas.filter((r) => r.correcta).length;
  const fallos = total - aciertos;

  // por área
  const porArea: Record<string, { ok: number; total: number }> = {};
  for (const r of respuestas) {
    porArea[r.area] ||= { ok: 0, total: 0 };
    porArea[r.area].total++;
    if (r.correcta) porArea[r.area].ok++;
  }
  const dataArea = Object.entries(porArea).map(([a, v]) => ({
    area: a.split(" ")[0],
    pct: Math.round((v.ok / v.total) * 100),
  }));

  // por sesión (cronológico ascendente)
  const sesionesAsc = [...sesiones].reverse();
  const dataSesiones = sesionesAsc.slice(-15).map((s, i) => ({
    n: `#${i + 1}`,
    correctas: s.correctas,
    incorrectas: Math.max(0, s.total_preguntas - s.correctas),
  }));

  // pie
  const dataPie = [
    { name: "Correctas", value: aciertos, color: "hsl(150 60% 45%)" },
    { name: "Incorrectas", value: fallos, color: "hsl(0 70% 55%)" },
  ];

  // temas débiles (mínimo 3 intentos)
  const porSub: Record<string, { ok: number; total: number; area: string }> = {};
  for (const r of respuestas) {
    porSub[r.subtema] ||= { ok: 0, total: 0, area: r.area };
    porSub[r.subtema].total++;
    if (r.correcta) porSub[r.subtema].ok++;
  }
  const debiles = Object.entries(porSub)
    .filter(([, v]) => v.total >= 3)
    .map(([s, v]) => ({
      subtema: s,
      area: v.area,
      pct: Math.round((v.ok / v.total) * 100),
      n: v.total,
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Inicio
      </Link>
      {as && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm">
          <span>👁️ Estás viendo el progreso de otro estudiante (modo staff).</span>
          <div className="flex gap-3">
            {esStaff && (
              <Link to="/progreso" search={{ as: undefined }} className="font-semibold text-accent hover:underline">
                Cambiar estudiante
              </Link>
            )}
            <Link to="/admin/estudiante/$id" params={{ id: as }} className="font-semibold text-accent hover:underline">
              Ver perfil
            </Link>
          </div>
        </div>
      )}
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{as ? "Progreso del estudiante" : "Mi progreso"}</h1>


      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Preguntas respondidas" value={total} />
        <StatCard
          label="% de aciertos"
          value={`${Math.round((aciertos / total) * 100)}%`}
          accent
        />
        <StatCard label="Sesiones completadas" value={sesiones.length} />
      </div>

      <CalificacionPanel targetUserId={as} />


      {dataSesiones.length > 0 && (
        <Section title="Correctas vs incorrectas por sesión" icon={<BarChart3 className="h-5 w-5" />}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataSesiones}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="n" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="correctas" stackId="a" fill="hsl(150 60% 45%)" />
                <Bar dataKey="incorrectas" stackId="a" fill="hsl(0 70% 55%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <Section title="Precisión global" icon={<PieIcon className="h-5 w-5" />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {dataPie.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Aciertos por área">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataArea}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="area" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="pct" fill="hsl(265 70% 55%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section
        title="Temas a reforzar"
        icon={<TrendingDown className="h-5 w-5 text-destructive" />}
      >
        {debiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Practica al menos 3 preguntas de cada subtema para ver recomendaciones.
          </p>
        ) : (
          <ul className="space-y-3">
            {debiles.map((d) => (
              <li
                key={d.subtema}
                className="flex items-center justify-between rounded-xl border bg-card p-3"
              >
                <div>
                  <div className="font-semibold">{d.subtema}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.area} · {d.n} intentos
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-destructive">{d.pct}%</span>
                  <Link
                    to="/practicar/$area"
                    params={{ area: d.area }}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Repasar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-soft ${
        accent ? "bg-primary text-primary-foreground" : "bg-gradient-card"
      }`}
    >
      <div
        className={`text-xs font-semibold uppercase tracking-wide ${
          accent ? "opacity-80" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border bg-gradient-card p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function CalificacionPanel({ targetUserId }: { targetUserId?: string }) {
  const { data } = useQuery({
    queryKey: ["calificacion", targetUserId ?? "me"],
    queryFn: () =>
      calificacionAsignaturasFn({ data: targetUserId ? { targetUserId } : {} }),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  if (!data) return null;
  const ICONOS: Record<string, [string, string]> = { matematica: ["📐", "hsl(265 70% 55%)"], fisica: ["⚛️", "hsl(200 80% 45%)"], mbs: ["🔢", "hsl(30 85% 50%)"], cn: ["🌿", "hsl(145 60% 38%)"], es: ["🌎", "hsl(15 75% 50%)"], bach: ["🎓", "hsl(340 70% 50%)"] };
  const bloques = data.asignaturas.map((a) => ({ titulo: a.nombre, icono: ICONOS[a.clave]![0], d: a, color: ICONOS[a.clave]![1] }));
  const g = (data as any).global as
    | {
        nota: number;
        componentes: { plataforma: number; simulacro: number; conocimiento: number; razonamiento: number };
        detalle: { horasPlataforma: number; pctSimulacro: number; pctConocimiento: number; pctRazonamiento: number };
      }
    | undefined;
  const consejosGlobal: { titulo: string; texto: string; to: string }[] = [];
  if (g) {
    if (g.componentes.simulacro < 3)
      consejosGlobal.push({
        titulo: `Simulacros: ${g.componentes.simulacro.toFixed(1)}/3 pts`,
        texto:
          g.detalle.pctSimulacro === 0
            ? "Aún no rindes ningún simulacro completo. Uno solo ya sube bastante esta parte."
            : `Tu promedio de aciertos en simulacros es ${g.detalle.pctSimulacro} %. Repite simulacros para subirlo.`,
        to: "/simulacro",
      });
    if (g.componentes.conocimiento < 3)
      consejosGlobal.push({
        titulo: `Conocimiento: ${g.componentes.conocimiento.toFixed(1)}/3 pts`,
        texto: `Llevas ${g.detalle.pctConocimiento} % del avance total. Supera las metas de cada nivel (90 %, 80 % y 75 % de aciertos).`,
        to: "/conocimiento",
      });
    if (g.componentes.razonamiento < 3)
      consejosGlobal.push({
        titulo: `Razonamiento: ${g.componentes.razonamiento.toFixed(1)}/3 pts`,
        texto: `Llevas ${g.detalle.pctRazonamiento} % del avance total. Cada nivel aprobado suma un tercio de esta parte.`,
        to: "/razonamiento",
      });
    if (g.componentes.plataforma < 1)
      consejosGlobal.push({
        titulo: `Tiempo en plataforma: ${g.componentes.plataforma.toFixed(1)}/1 pt`,
        texto: `Llevas ${g.detalle.horasPlataforma} h de 20 h. Sesiones diarias de 30–40 minutos completan este punto.`,
        to: "/practicar",
      });
    consejosGlobal.sort((a, b) => {
      const va = parseFloat(a.titulo.match(/([\d.]+)\//)?.[1] ?? "0");
      const vb = parseFloat(b.titulo.match(/([\d.]+)\//)?.[1] ?? "0");
      return va - vb;
    });
  }
  return (
    <section className="mt-6 rounded-2xl border bg-gradient-card p-5 shadow-soft">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">🏅 Calificación</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> En tiempo real
        </span>
      </div>

      {g && (
        <div className="mb-5 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-bold">🎯 Nota global</div>
            <div className="text-3xl font-extrabold text-primary">
              {g.nota.toFixed(1)}
              <span className="text-sm font-semibold text-muted-foreground">/10</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            10% tiempo real en plataforma · 30% simulacro de examen · 30% conocimiento · 30% razonamiento
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Barra label="⏱️ Plataforma (10%)" valor={g.componentes.plataforma} max={1} color="hsl(265 70% 55%)" />
            <Barra label="📝 Simulacro (30%)" valor={g.componentes.simulacro} max={3} color="hsl(200 80% 45%)" />
            <Barra label="📚 Conocimiento (30%)" valor={g.componentes.conocimiento} max={3} color="hsl(145 60% 38%)" />
            <Barra label="🧠 Razonamiento (30%)" valor={g.componentes.razonamiento} max={3} color="hsl(340 70% 50%)" />
          </div>
          {consejosGlobal.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold">Cómo subir tu nota:</p>
              {consejosGlobal.slice(0, 3).map((c) => (
                <div key={c.titulo} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-2.5 text-xs">
                  <div>
                    <div className="font-semibold">{c.titulo}</div>
                    <p className="mt-0.5 text-muted-foreground">{c.texto}</p>
                  </div>
                  <Link to={c.to as any} className="shrink-0 rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground hover:bg-primary/90">
                    Ir
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mb-4 text-xs text-muted-foreground">
        Por asignatura: 40% tiempo en plataforma · 20% tiempo activo · 20% constancia · 20% simulacros
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {bloques.map((b) => (
          <div key={b.titulo} className="rounded-xl border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <div className="font-bold">
                {b.icono} {b.titulo}
              </div>
              <div className="text-2xl font-extrabold" style={{ color: b.color }}>
                {b.d.nota.toFixed(1)}
                <span className="text-sm font-semibold text-muted-foreground">/10</span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Barra label="Tiempo en plataforma" valor={b.d.componentes.plataforma} max={40} color={b.color} />
              <Barra label="Tiempo activo" valor={b.d.componentes.activo} max={20} color={b.color} />
              <Barra label="Constancia" valor={b.d.componentes.constancia} max={20} color={b.color} />
              <Barra label="Simulacros" valor={b.d.componentes.simulacro} max={20} color={b.color} />
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              {b.d.simulacros} simulacro(s) de {b.titulo.toLowerCase()} rendido(s)
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div>⏱️ {data.horasPlataforma} h en plataforma</div>
        <div>⚡ {data.horasActivas} h activas</div>
        <div>📅 {data.diasConectado} días con conexión</div>
      </div>
    </section>
  );
}

function Barra({ label, valor, max, color }: { label: string; valor: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {valor.toFixed(1)}/{max}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
