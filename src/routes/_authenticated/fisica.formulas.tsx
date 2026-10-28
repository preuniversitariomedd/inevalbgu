import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { GLOSARIO_FORMULAS } from "@/data/fisica-formulas";

export const Route = createFileRoute("/_authenticated/fisica/formulas")({
  head: () => ({ meta: [{ title: "Fórmulas de Física — INEVAL_UEDE" }, ...pageMeta("Fórmulas de Física — INEVAL_UEDE","Fórmulas de Física en la plataforma educativa INEVAL_UEDE.")] }),
  component: Formulas,
});

function Formulas() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const grupos = GLOSARIO_FORMULAS.map((g) => ({
    ...g,
    formulas: g.formulas.filter(
      (f) =>
        !term ||
        f.nombre.toLowerCase().includes(term) ||
        f.expresion.toLowerCase().includes(term) ||
        f.cuando.toLowerCase().includes(term) ||
        g.tema.toLowerCase().includes(term),
    ),
  })).filter((g) => g.formulas.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/fisica" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Física
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Glosario de fórmulas</h1>
        <p className="mt-2 text-muted-foreground">Cada fórmula con sus variables y cuándo se aplica.</p>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar fórmula, tema o situación…"
            className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        {grupos.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No se encontraron fórmulas con ese criterio.</p>}

        {grupos.map((g) => (
          <section key={g.tema} className="mt-8">
            <h2 className="text-lg font-bold">{g.tema}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.formulas.map((f) => (
                <div key={f.nombre} className="rounded-2xl border bg-gradient-card p-4 shadow-soft">
                  <div className="text-sm font-bold">{f.nombre}</div>
                  <div className="mt-2 rounded-lg bg-secondary px-3 py-2 text-center font-mono text-base font-semibold text-secondary-foreground">
                    {f.expresion}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{f.variables}</p>
                  <p className="mt-1.5 text-xs leading-relaxed">{f.cuando}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
