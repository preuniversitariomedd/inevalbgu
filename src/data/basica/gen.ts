import type { Nivel, Pregunta } from "../tipos";

// Generador pseudoaleatorio determinista (las preguntas son siempre las mismas)
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

export type R = () => number;

export function entero(r: R, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}

export function elegir<T>(r: R, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)] as T;
}

export function mezclar<T>(r: R, arr: readonly T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [c[i], c[j]] = [c[j] as T, c[i] as T];
  }
  return c;
}

export const NIV: Record<string, Nivel> = { B: "Básico", I: "Intermedio", A: "Avanzado" };

export interface Base {
  id: string;
  area: string;
  tema: string;
  subtema: string;
  nivel: Nivel;
  enunciado: string;
  explicacion: string;
}

/** Crea una pregunta con 4 opciones mezcladas (1 correcta + 3 distractores únicos). */
export function crear(r: R, b: Base, correcta: string, distractores: string[]): Pregunta {
  const unicos: string[] = [];
  for (const d of distractores) {
    if (d !== correcta && !unicos.includes(d)) unicos.push(d);
    if (unicos.length === 3) break;
  }
  const opciones = mezclar(r, [correcta, ...unicos]);
  return { ...b, opciones, respuestaCorrecta: opciones.indexOf(correcta) };
}

export function romano(n: number): string {
  const t: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, l] of t) while (n >= v) { s += l; n -= v; }
  return s;
}

export function fmt(n: number, dec = 2) {
  return Number(n.toFixed(dec)).toString().replace(".", ",");
}
