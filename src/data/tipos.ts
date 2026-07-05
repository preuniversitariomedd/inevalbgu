export type Nivel = "Básico" | "Intermedio" | "Avanzado";

export interface Pregunta {
  id: string;
  area: string;
  tema: string;
  subtema: string;
  nivel: Nivel;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
}

export const AREAS = [
  "Álgebra y Ecuaciones",
  "Funciones",
  "Geometría y Trigonometría",
  "Estadística y Probabilidad",
  "Sucesiones y Patrones",
  "Triángulos y Ecuaciones",
] as const;

export type Area = (typeof AREAS)[number];
