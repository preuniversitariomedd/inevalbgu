import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { ArrowLeft, Sigma, FunctionSquare, Triangle, PieChart, ListOrdered } from "lucide-react";
import { AREAS } from "@/data/tipos";
import { preguntasPorArea } from "@/data";

export const Route = createFileRoute("/practicar")({
  head: () => ({
    meta: [
      { title: "Practicar por tema — INEVAL_UEDE" },
      { name: "description", content: "Elige un área temática y practica con preguntas resueltas paso a paso." },
    ],
  }),
  component: PracticarLayout,
});

function PracticarLayout() {
  const matchRoute = useMatchRoute();
  const enArea = matchRoute({ to: "/practicar/$area", fuzzy: true });
  if (enArea) return <Outlet />;
  return <ListaAreas />;
}

const ICONS: Record<string, React.ReactNode> = {
  "Álgebra y Ecuaciones": <Sigma className="h-7 w-7" />,
  "Funciones": <FunctionSquare className="h-7 w-7" />,
  "Geometría y Trigonometría": <Triangle className="h-7 w-7" />,
  "Estadística y Probabilidad": <PieChart className="h-7 w-7" />,
  "Sucesiones y Patrones": <ListOrdered className="h-7 w-7" />,
};

function ListaAreas() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Practicar por tema</h1>
        <p className="mt-2 text-muted-foreground">Elige el área que quieres trabajar.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {AREAS.map((area) => {
            const n = preguntasPorArea(area).length;
            const disabled = n === 0;
            return (
              <Link
                key={area}
                to="/practicar/$area"
                params={{ area }}
                disabled={disabled}
                className={`flex items-center gap-4 rounded-2xl border bg-gradient-card p-5 shadow-soft transition ${disabled ? "pointer-events-none opacity-50" : "hover:-translate-y-0.5 hover:shadow-strong"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {ICONS[area]}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{area}</h3>
                  <p className="text-xs text-muted-foreground">
                    {n > 0 ? `${n} preguntas disponibles` : "Próximamente"}
                  </p>
                </div>
                <span className="text-primary">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
