import type { Pregunta } from "./tipos";
import { preguntasAlgebra } from "./preguntas-algebra";
import { preguntasFunciones } from "./preguntas-funciones";
import { preguntasGeometria } from "./preguntas-geometria";
import { preguntasEstadistica } from "./preguntas-estadistica";
import { preguntasSucesiones } from "./preguntas-sucesiones";
import { preguntasRepaso } from "./preguntas-repaso";

// Banco principal para "Practicar por tema" y "Banco de preguntas":
// 5 bloques temáticos (sin Repaso Integrado, que es exclusivo del simulacro).
export const BANCO_PREGUNTAS: Pregunta[] = [
  ...preguntasAlgebra,
  ...preguntasFunciones,
  ...preguntasGeometria,
  ...preguntasEstadistica,
  ...preguntasSucesiones,
];

// Banco completo para el Simulacro: incluye también las preguntas de repaso integrado.
export const BANCO_SIMULACRO: Pregunta[] = [
  ...BANCO_PREGUNTAS,
  ...preguntasRepaso,
];

export function preguntasPorArea(area: string): Pregunta[] {
  return BANCO_PREGUNTAS.filter((p) => p.area === area);
}

export function preguntasPorAreaYNivel(area: string, nivel: string | "Todos"): Pregunta[] {
  const arr = preguntasPorArea(area);
  if (nivel === "Todos") return arr;
  return arr.filter((p) => p.nivel === nivel);
}

export function preguntasAleatorias<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export {
  preguntasAlgebra,
  preguntasFunciones,
  preguntasGeometria,
  preguntasEstadistica,
  preguntasSucesiones,
  preguntasRepaso,
};
export * from "./tipos";
