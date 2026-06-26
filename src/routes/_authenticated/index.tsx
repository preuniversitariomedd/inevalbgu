import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Timer, BarChart3, GraduationCap, Sparkles, Database, MessageCircle } from "lucide-react";
import { BANCO_PREGUNTAS } from "@/data";
import { obtenerBrandingFn } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/")({
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
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => obtenerBrandingFn(),
    staleTime: 60_000,
  });
  const titulo = branding?.titulo || "INEVAL_UEDE";
  const subtitulo = branding?.subtitulo || "Tu preparación para Matemática";
  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        {branding?.hero_url && (
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <img src={branding.hero_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/70 via-primary/40 to-transparent" />
          </div>
        )}
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:py-16">
          <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 ring-4 ring-white/30 backdrop-blur">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <GraduationCap className="h-10 w-10" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium opacity-90">
              <GraduationCap className="h-5 w-5" />
              <span>INEVAL · Ser Estudiante · 1ro BGU</span>
            </div>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              {titulo}
              <span className="block text-2xl font-semibold opacity-90 sm:text-3xl">{subtitulo}</span>
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
        </div>
      </header>


      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            to="/banco"
            icon={<Database className="h-7 w-7" />}
            title="Banco de preguntas"
            desc={`Más de ${total >= 1000 ? "1000" : total} preguntas. Filtra por área y nivel.`}
            tone="primary"
          />
          <ActionCard
            to="/progreso"
            icon={<BarChart3 className="h-7 w-7" />}
            title="Mi progreso"
            desc="Aciertos por área, racha de días y tus temas débiles."
            tone="success"
          />
        </div>

        <div className="mt-4">
          <ActionCard
            to="/tutor"
            icon={<MessageCircle className="h-7 w-7" />}
            title="Tutor IA · PreBGU"
            desc="Chat pedagógico con metodología Piaget para Matemática, Física, Química y técnicas de estudio. Gratis."
            tone="accent"
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
