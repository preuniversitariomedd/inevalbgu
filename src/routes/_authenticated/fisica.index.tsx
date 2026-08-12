import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Atom, Gauge, Zap, Weight, BookMarked, Sparkles, PlusCircle, ArrowLeft } from "lucide-react";
import { BANCO_FISICA, TEMAS_FISICA } from "@/data/fisica";
import { listarPreguntasFisicaFn, estadisticasFisicaFn } from "@/lib/fisica.functions";
import { Route as FisicaRoute } from "./fisica";

export const Route = createFileRoute("/_authenticated/fisica/")({
  component: FisicaHub,
});

const ICONOS: Record<string, React.ReactNode> = {
  "Cinemática": <Gauge className="h-7 w-7" />,
  "Dinámica": <Weight className="h-7 w-7" />,
  "Energía": <Zap className="h-7 w-7" />,
};

function FisicaHub() {
  const ctx = FisicaRoute.useRouteContext() as { esStaff?: boolean };
  const manuales = useQuery({
    queryKey: ["fisica", "manuales"],
    queryFn: () => listarPreguntasFisicaFn({ data: {} }),
    staleTime: 30_000,
  });
  const stats = useQuery({
    queryKey: ["fisica", "stats"],
    queryFn: () => estadisticasFisicaFn({ data: {} }),
    staleTime: 30_000,
  });

  const rows = (stats.data as any[]) ?? [];
  const total = rows.length;
  const aciertos = rows.filter((r) => r.correcta).length;
  const pct = total ? Math.round((aciertos / total) * 100) : 0;

  function contarTema(tema: string) {
    const base = BANCO_FISICA.filter((p) => p.tema === tema).length;
    const extra = ((manuales.data as any[]) ?? []).filter((p) => p.tema === tema && p.activa).length;
    return base + extra;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>

        <div className="mt-4 flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-soft">
            <Atom className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Física</h1>
            <p className="mt-1 text-muted-foreground">
              Cinemática, dinámica y energía. Ejercicios con imágenes, hasta 5 opciones y tres niveles de dificultad.
            </p>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metrica titulo="Preguntas resueltas" valor={String(total)} />
            <Metrica titulo="Aciertos" valor={`${aciertos}`} />
            <Metrica titulo="Precisión" valor={`${pct}%`} />
          </div>
        )}

        <h2 className="mt-8 text-lg font-bold">Bloques</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TEMAS_FISICA.map((tema) => (
            <Link
              key={tema}
              to="/fisica/practicar/$tema"
              params={{ tema }}
              className="rounded-2xl border bg-gradient-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {ICONOS[tema]}
              </div>
              <h3 className="mt-3 font-bold">{tema}</h3>
              <p className="text-xs text-muted-foreground">{contarTema(tema)} preguntas disponibles</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/fisica/formulas"
            className="flex items-center gap-4 rounded-2xl border bg-gradient-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
              <BookMarked className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold">Glosario de fórmulas</h3>
              <p className="text-xs text-muted-foreground">Todas las fórmulas con variables y cuándo usarlas.</p>
            </div>
          </Link>
          <Link
            to="/fisica/tutor"
            className="flex items-center gap-4 rounded-2xl border bg-gradient-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-strong"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold">Agente IA de Física</h3>
              <p className="text-xs text-muted-foreground">Explica un tema según tus estadísticas y errores.</p>
            </div>
          </Link>
        </div>

        {ctx?.esStaff && (
          <Link
            to="/fisica/gestionar"
            className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-dashed p-5 transition hover:bg-secondary/40"
          >
            <PlusCircle className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-bold">Agregar preguntas manualmente</h3>
              <p className="text-xs text-muted-foreground">Sube imágenes, define hasta 5 opciones y el nivel de dificultad.</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

function Metrica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border bg-gradient-card p-4 shadow-soft">
      <div className="text-xs font-semibold text-muted-foreground">{titulo}</div>
      <div className="mt-1 text-2xl font-extrabold">{valor}</div>
    </div>
  );
}
