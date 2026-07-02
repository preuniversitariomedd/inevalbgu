import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tutor/")({
  component: TutorEmpty,
});

function TutorEmpty() {
  return (
    <div className="flex h-full min-h-[55vh] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary">
        <GraduationCap className="h-10 w-10" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Hola, soy Mr. Victor 👋</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Empieza una conversación nueva desde la izquierda. Te guiaré con preguntas para entender qué sabes
        y avanzar paso a paso, al estilo Piaget.
      </p>
      <ul className="mt-4 grid gap-1 text-xs text-muted-foreground">
        <li>📐 Resolvemos ejercicios de Matemática, Física y Química.</li>
        <li>🧠 Aprendemos técnicas de estudio y metacognición.</li>
        <li>⏱️ Repasamos antes del simulacro INEVAL.</li>
      </ul>
    </div>
  );
}
