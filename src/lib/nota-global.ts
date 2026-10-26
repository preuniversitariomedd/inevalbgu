// Nota global del estudiante (0–10):
//   10 % tiempo real en plataforma · 30 % simulacros de examen ·
//   30 % módulo Conocimiento · 30 % módulo Razonamiento.
// Lógica pura compartida entre el panel del estudiante, el coach flotante
// y el panel del administrador.
import { CONFIG_CON, preguntasConocimiento, type NivelCon } from "@/data/conocimiento";
import { CONFIG_RAZ, type NivelRaz } from "@/data/basica/razonamiento";
import { PESOS_DEFAULT, type Pesos } from './grupo-config';

export interface AvanceNiveles {
  aciertos?: Record<string, string[]> | null;
}

export interface NotaGlobal {
  nota: number; // 0–10
  componentes: {
    plataforma: number; // puntos sobre 1
    simulacro: number; // puntos sobre 3
    conocimiento: number; // puntos sobre 3
    razonamiento: number; // puntos sobre 3
    practicas: number;
  };
  ponderaciones: Pesos;
  detalle: {
    horasPlataforma: number;
    pctSimulacro: number; // 0–100
    pctConocimiento: number; // 0–100
    pctRazonamiento: number; // 0–100
    pctPracticas: number;
  };
}

const TOTALES_CON: Record<NivelCon, number> = {
  1: preguntasConocimiento(1).length,
  2: preguntasConocimiento(2).length,
  3: preguntasConocimiento(3).length,
};

/** Avance 0–1 de un módulo por niveles: promedio de (aciertos / meta) por nivel. */
function avanceNiveles(
  prog: AvanceNiveles | null | undefined,
  totales: Record<number, number>,
  metas: Record<number, number>,
): number {
  const niveles = [1, 2, 3];
  let suma = 0;
  for (const n of niveles) {
    const ok = prog?.aciertos?.[String(n)]?.length ?? 0;
    const meta = Math.ceil((totales[n] ?? 1) * (metas[n] ?? 1));
    suma += Math.min(1, ok / meta);
  }
  return suma / niveles.length;
}

export function avanceConocimiento(prog: AvanceNiveles | null | undefined): number {
  return avanceNiveles(prog, TOTALES_CON, { 1: CONFIG_CON[1].meta, 2: CONFIG_CON[2].meta, 3: CONFIG_CON[3].meta });
}

export function avanceRazonamiento(prog: AvanceNiveles | null | undefined): number {
  const totales: Record<number, number> = { 1: CONFIG_RAZ[1 as NivelRaz].total, 2: CONFIG_RAZ[2].total, 3: CONFIG_RAZ[3].total };
  const metas: Record<number, number> = { 1: CONFIG_RAZ[1].meta, 2: CONFIG_RAZ[2].meta, 3: CONFIG_RAZ[3].meta };
  return avanceNiveles(prog, totales, metas);
}

export function calcularNotaGlobal(
  con: Array<{ segundos_visible?: number | null; segundos_oculto?: number | null }> | null,
  ses: Array<{
    tipo?: string | null;
    total_preguntas?: number | null;
    correctas?: number | null;
    finalizada_en?: string | null;
  }> | null,
  conProg: AvanceNiveles | null | undefined,
  razProg: AvanceNiveles | null | undefined,
  ponderaciones: Pesos = PESOS_DEFAULT,
  respuestasPracticas: Array<{ correcta: boolean }> = [],
): NotaGlobal {
  let segPlataforma = 0;
  for (const c of con ?? []) {
    segPlataforma += (c.segundos_visible ?? 0) + (c.segundos_oculto ?? 0);
  }
  // Tope: 20 h reales en plataforma completan el 10 %.
  const cPlataforma = Math.min(1, segPlataforma / 3600 / 20);

  const simulacros = (ses ?? []).filter(
    (s) => s.tipo === "simulacro" && s.finalizada_en && (s.total_preguntas ?? 0) > 0,
  );
  const cSimulacro =
    simulacros.length === 0
      ? 0
      : simulacros.reduce((acc, s) => acc + (s.correctas ?? 0) / (s.total_preguntas ?? 1), 0) / simulacros.length;

  const cConocimiento = avanceConocimiento(conProg);
  const cRazonamiento = avanceRazonamiento(razProg);

  const cPracticas = respuestasPracticas.length ? respuestasPracticas.filter(r => r.correcta).length / respuestasPracticas.length : 0;
  const proporciones = { plataforma: cPlataforma, simulacro: cSimulacro, conocimiento: cConocimiento, razonamiento: cRazonamiento, practicas: cPracticas };
  const nota = Object.entries(proporciones).reduce((sum, [k,v]) => sum + v * ponderaciones[k as keyof Pesos] / 10, 0);

  return {
    nota: Math.round(nota * 10) / 10,
    ponderaciones,
    componentes: {
      plataforma: Math.round(cPlataforma * ponderaciones.plataforma) / 10,
      simulacro: Math.round(cSimulacro * ponderaciones.simulacro) / 10,
      conocimiento: Math.round(cConocimiento * ponderaciones.conocimiento) / 10,
      razonamiento: Math.round(cRazonamiento * ponderaciones.razonamiento) / 10,
      practicas: Math.round(cPracticas * ponderaciones.practicas) / 10,
    },
    detalle: {
      horasPlataforma: Math.round((segPlataforma / 3600) * 10) / 10,
      pctSimulacro: Math.round(cSimulacro * 100),
      pctConocimiento: Math.round(cConocimiento * 100),
      pctRazonamiento: Math.round(cRazonamiento * 100),
      pctPracticas: Math.round(cPracticas * 100),
    },
  };
}
