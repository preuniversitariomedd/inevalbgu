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
import { obtenerProgresoFn } from "@/lib/progreso.functions";
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
          <Link to="/admin/estudiante/$id" params={{ id: as }} className="font-semibold text-accent hover:underline">
            Volver al perfil
          </Link>
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
