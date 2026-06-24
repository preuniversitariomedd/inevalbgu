import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame, BookOpen, TrendingDown, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { leerProgreso, calcularRacha, reiniciarProgreso, type Progreso } from "@/lib/progreso";

export const Route = createFileRoute("/progreso")({
  head: () => ({ meta: [{ title: "Mi progreso — INEVAL_UEDE" }] }),
  component: ProgresoPage,
});

function ProgresoPage() {
  const [prog, setProg] = useState<Progreso>({ respuestas: [], diasActivos: [] });
  useEffect(() => { setProg(leerProgreso()); }, []);

  if (prog.respuestas.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
          <div className="mt-6 rounded-2xl border bg-gradient-card p-10 text-center shadow-soft">
            <BookOpen className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-3 text-2xl font-extrabold">Aún no has practicado</h1>
            <p className="mt-2 text-muted-foreground">Empieza una sesión para ver tu progreso, racha y temas débiles.</p>
            <Link to="/practicar" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">Practicar ahora</Link>
          </div>
        </div>
      </div>
    );
  }

  const total = prog.respuestas.length;
  const aciertos = prog.respuestas.filter((r) => r.correcta).length;
  const racha = calcularRacha(prog.diasActivos);

  // por área
  const porArea: Record<string, { ok: number; total: number }> = {};
  for (const r of prog.respuestas) {
    porArea[r.area] ||= { ok: 0, total: 0 };
    porArea[r.area].total++;
    if (r.correcta) porArea[r.area].ok++;
  }
  const dataArea = Object.entries(porArea).map(([a, v]) => ({
    area: a.split(" ")[0],
    pct: Math.round((v.ok / v.total) * 100),
    n: v.total,
  }));

  // por nivel
  const porNivel: Record<string, { ok: number; total: number }> = {};
  for (const r of prog.respuestas) {
    porNivel[r.nivel] ||= { ok: 0, total: 0 };
    porNivel[r.nivel].total++;
    if (r.correcta) porNivel[r.nivel].ok++;
  }
  const dataNivel = ["Básico","Intermedio","Avanzado"].filter(n => porNivel[n]).map((n) => ({
    nivel: n,
    pct: Math.round((porNivel[n].ok / porNivel[n].total) * 100),
  }));

  // temas débiles (mínimo 3 intentos)
  const porSub: Record<string, { ok: number; total: number }> = {};
  for (const r of prog.respuestas) {
    porSub[r.subtema] ||= { ok: 0, total: 0 };
    porSub[r.subtema].total++;
    if (r.correcta) porSub[r.subtema].ok++;
  }
  const debiles = Object.entries(porSub)
    .filter(([, v]) => v.total >= 3)
    .map(([s, v]) => ({ subtema: s, pct: Math.round((v.ok / v.total) * 100), n: v.total }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Inicio</Link>
          <button
            onClick={() => { if (confirm("¿Reiniciar todo el progreso?")) { reiniciarProgreso(); setProg({ respuestas: [], diasActivos: [] }); } }}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Mi progreso</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Preguntas practicadas" value={total} />
          <StatCard label="% de aciertos" value={`${Math.round((aciertos / total) * 100)}%`} accent />
          <StatCard label="Racha" value={<span className="inline-flex items-center gap-1.5"><Flame className="h-5 w-5 text-warning" />{racha} {racha === 1 ? "día" : "días"}</span>} />
        </div>

        <Section title="Aciertos por área">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataArea}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="area" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="pct" fill="oklch(0.52 0.22 275)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {dataNivel.length > 0 && (
          <Section title="Aciertos por nivel de dificultad">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataNivel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 100]} fontSize={12} unit="%" />
                  <YAxis dataKey="nivel" type="category" fontSize={12} width={90} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="pct" fill="oklch(0.6 0.2 320)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}

        <Section title="Temas a reforzar" icon={<TrendingDown className="h-5 w-5 text-destructive" />}>
          {debiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Practica al menos 3 preguntas de cada subtema para ver recomendaciones.</p>
          ) : (
            <ul className="space-y-3">
              {debiles.map((d) => (
                <li key={d.subtema} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{d.subtema}</span>
                    <span className="text-sm font-bold text-destructive">{d.pct}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.n} intentos. Te sugerimos repasar este tema antes del simulacro.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-soft ${accent ? "bg-primary text-primary-foreground" : "bg-gradient-card"}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border bg-gradient-card p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">{icon}{title}</h2>
      {children}
    </section>
  );
}
