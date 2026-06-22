import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Timer, BarChart3, GraduationCap, Sparkles } from "lucide-react";
import { BANCO_PREGUNTAS } from "@/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INEVAL_UEDE — Practica Matemática para 1ro BGU" },
      { name: "description", content: "Prepárate para la prueba Ser Estudiante del INEVAL con cientos de preguntas resueltas paso a paso." },
    ],
  }),
  component: Index,
});

function Index() {
  const total = BANCO_PREGUNTAS.length;
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-hero text-primary-foreground">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <GraduationCap className="h-5 w-5" />
            <span>INEVAL · Ser Estudiante · 1ro BGU</span>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
            INEVAL_UEDE
            <span className="block text-2xl font-semibold opacity-90 sm:text-3xl">
              Tu preparación para Matemática
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base opacity-90 sm:text-lg">
            La prueba <strong>Ser Estudiante</strong> del INEVAL evalúa lo que aprendiste en
            1ro BGU. Practica con más de <strong>{total} preguntas</strong> de opción múltiple,
            con explicaciones paso a paso y simulacros cronometrados.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            <span>Niveles INEVAL: Insuficiente · Elemental · Satisfactorio · Excelente</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard
            to="/practicar"
            icon={<BookOpen className="h-7 w-7" />}
            title="Practicar por tema"
            desc="Escoge un área y un nivel. Recibe retroalimentación inmediata."
            tone="primary"
          />
          <ActionCard
            to="/simulacro"
            icon={<Timer className="h-7 w-7" />}
            title="Simulacro de examen"
            desc="40 minutos, preguntas de todas las áreas y nivel de logro final."
            tone="accent"
          />
          <ActionCard
            to="/progreso"
            icon={<BarChart3 className="h-7 w-7" />}
            title="Mi progreso"
            desc="Aciertos por área, racha de días y tus temas débiles."
            tone="success"
          />
        </div>

        <section className="mt-12 rounded-2xl border bg-gradient-card p-6 shadow-soft">
          <h2 className="text-xl font-bold">¿Qué evalúa la prueba?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cubre los Estándares de Aprendizaje del Ministerio de Educación del Ecuador para
            Matemática en 1ro BGU. Las áreas son:
          </p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {["Álgebra y Ecuaciones","Funciones","Geometría y Trigonometría","Estadística y Probabilidad","Sucesiones y Patrones"].map(a => (
              <li key={a} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium">{a}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function ActionCard({ to, icon, title, desc, tone }: { to: string; icon: React.ReactNode; title: string; desc: string; tone: "primary" | "accent" | "success" }) {
  const toneClass = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    success: "bg-success text-success-foreground",
  }[tone];
  return (
    <Link
      to={to}
      className="group rounded-2xl border bg-gradient-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-strong"
    >
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${toneClass}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-primary group-hover:underline">Comenzar →</span>
    </Link>
  );
}
