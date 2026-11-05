import fisica2 from './anexos/fisica-2bgu.json';
import fisica3 from './anexos/fisica-3bgu.json';
import historia3 from './anexos/historia-3bgu.json';
import extra from './anexos/simulacro-extra.json';
import { BANCO_FISICA } from './fisica';
import { generarEstudiosSociales } from './basica/estudios-sociales';
import { preguntasAleatorias } from './index';
import type { Nivel, Pregunta } from './tipos';

type BancoBGU = {
  lecturas: { id: string; titulo: string; texto: string }[];
  preguntas: { id: string; tema: string; dificultad: string; lectura_id: string | null; enunciado: string;
    opciones: { letra: string; texto: string }[]; respuesta_correcta: string; explicacion: string }[];
};
const niveles: Record<string, Nivel> = { basica: 'Básico', media: 'Intermedio', avanzada: 'Avanzado' };
const letras = ['A', 'B', 'C', 'D', 'E'];

export function adaptarBancoBGU(banco: BancoBGU, area: string): Pregunta[] {
  const lecturas = new Map(banco.lecturas.map(l => [l.id, l]));
  return banco.preguntas.map(p => {
    const opciones = letras.map(letra => p.opciones.find(o => o.letra === letra)?.texto);
    const respuestaCorrecta = letras.indexOf(p.respuesta_correcta);
    const nivel = niveles[p.dificultad];
    const lectura = p.lectura_id ? lecturas.get(p.lectura_id) : undefined;
    if (opciones.some(o => !o) || p.opciones.length !== 5 || respuestaCorrecta < 0 || !nivel || (p.lectura_id && !lectura)) {
      throw new Error(`Pregunta BGU inválida: ${p.id}`);
    }
    return {
      id: `sim-bgu-${p.id}`, area, tema: p.tema, subtema: p.tema, nivel,
      enunciado: lectura ? `${lectura.titulo}\n\n${lectura.texto}\n\n${p.enunciado}` : p.enunciado,
      opciones: opciones.map(o => o ?? ''), respuestaCorrecta, explicacion: p.explicacion,
    };
  });
}

export const FISICA_2BGU_SIM = adaptarBancoBGU(fisica2, 'Física');
export const FISICA_3BGU_SIM = adaptarBancoBGU(fisica3, 'Física');
export const HISTORIA_3BGU_SIM = adaptarBancoBGU(historia3, 'Estudios Sociales');
export const MAT_10EGB_SIM = adaptarBancoBGU(extra.mat_egb, 'Matemática');
export const MAT_BGU_SIM = adaptarBancoBGU(extra.mat_bgu, 'Matemática');
export const BIOLOGIA_SIM = adaptarBancoBGU(extra.bio, 'Ciencias Naturales');
export const FISICA_1BGU_SIM = adaptarBancoBGU(extra.fis1, 'Física');
export const SOCIALES_EXTRA_SIM = adaptarBancoBGU(extra.soc, 'Estudios Sociales');
const cinematica: Pregunta[] = BANCO_FISICA
  .filter(p => p.tema === 'Cinemática' && ['Caída libre', 'MRU', 'MRUV'].includes(p.subtema))
  .map(p => ({ ...p, area: 'Física', tema: String(p.tema) }));
const sociales = generarEstudiosSociales();

// Balance sources so uploaded material and historical questions both appear.
function seleccionarFuentes(fuentes: Pregunta[][], total: number): Pregunta[] {
  const seleccionadas = fuentes.flatMap((fuente, i) =>
    preguntasAleatorias(fuente, Math.floor(total / fuentes.length) + (i < total % fuentes.length ? 1 : 0)),
  );
  const ids = new Set(seleccionadas.map(p => p.id));
  const extras = fuentes.flat().filter(p => !ids.has(p.id));
  return preguntasAleatorias([...seleccionadas, ...preguntasAleatorias(extras, total - seleccionadas.length)], total);
}

export function seleccionarFisicaSimulacro(total = 30): Pregunta[] {
  return seleccionarFuentes([cinematica, FISICA_1BGU_SIM, FISICA_2BGU_SIM, FISICA_3BGU_SIM], total);
}

export function seleccionarSocialesSimulacro(total = 30): Pregunta[] {
  return seleccionarFuentes([sociales, HISTORIA_3BGU_SIM, SOCIALES_EXTRA_SIM], total);
}

/** Mixes a base selection with an uploaded bank in equal parts. */
export function conAnexos(base: Pregunta[], anexo: Pregunta[], total = 30): Pregunta[] {
  return seleccionarFuentes([base, anexo], total);
}
