import type { Pregunta } from "./tipos";
import { preguntasAlgebra } from "./preguntas-algebra";

export const BANCO_PREGUNTAS: Pregunta[] = [
  ...preguntasAlgebra,
  // Próximos bloques se agregarán aquí: Funciones, Geometría, Estadística, Sucesiones
];

export function preguntasPorArea(area: string): Pregunta[] {
  return BANCO_PREGUNTAS.filter((p) => p.area === area);
}

export function preguntasPorAreaYNivel(area: string, nivel: string | "Todos"): Pregunta[] {
  const arr = preguntasPorArea(area);
  if (nivel === "Todos") return arr;
  return arr.filter((p) => p.nivel === nivel);
}

export function preguntasAleatorias(items: Pregunta[], n: number): Pregunta[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export { preguntasAlgebra };
export * from "./tipos";
