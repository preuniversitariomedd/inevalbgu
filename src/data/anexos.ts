import analogias from './anexos/analogias.json';
import matematicas from './anexos/matematica-lecturas.json';
import egb from './anexos/conocimiento-egb.json';
import type { Pregunta, Nivel } from './tipos';

const niveles: Record<string, Nivel> = { intermedio: 'Básico', complejo: 'Intermedio', avanzado: 'Avanzado', '8vo EGB': 'Básico', '9no EGB': 'Intermedio', '10mo EGB': 'Avanzado' };
export function opcionesAnexo(opciones: Record<string, string>, respuesta: string) {
  const letras = ['A', 'B', 'C', 'D', 'E'];
  const indice = letras.indexOf(respuesta);
  if (indice < 0 || letras.some(k => !opciones[k])) throw new Error('Opciones o respuesta inválidas en el banco anexo.');
  return { opciones: letras.map(k => opciones[k] ?? ''), respuestaCorrecta: indice };
}
export const ANALOGIAS_RAZ = analogias.map(p => ({
  id: `raz-analogia-${p.id}`, area: 'Razonamiento', tema: 'Analogías verbales', subtema: `${p.categoria} · ${p.relacion}`,
  nivel: niveles[p.nivel] ?? 'Avanzado', enunciado: `Selecciona el par que mantiene la misma relación:\n\n${p.enunciado}`,
  ...opcionesAnexo(p.opciones, p.respuesta_correcta), explicacion: p.explicacion,
  estrategia: `Identifica la relación ${p.relacion.toLowerCase()} del primer par y conserva su orden en la respuesta.`,
}));
export const MATEMATICAS_RAZ = matematicas.flatMap(p => p.preguntas.map(q => ({
  id: `raz-matematica-${q.id}`, area: 'Razonamiento', tema: 'Matemática', subtema: `${p.tema} · ${q.habilidad}`,
  nivel: niveles[p.nivel] ?? 'Avanzado', enunciado: `${p.texto}\n\n${q.enunciado}`,
  ...opcionesAnexo(q.opciones, q.respuesta_correcta),
  explicacion: `${q.explicacion}\n\n${Object.entries(q.descarte).map(([k,v]) => `${k}: ${v}`).join('\n')}`,
  estrategia: `Organiza los datos de ${p.tema.toLowerCase()}, descarta los sobrantes y comprueba cada condición antes de elegir.`,
})));
export const CONOCIMIENTO_EGB: Pregunta[] = egb.flatMap(p => p.preguntas.map(q => ({
  id: `con-egb-${q.id}`, area: 'Conocimiento', tema: p.tema, subtema: `${p.grado} · ${q.habilidad}`,
  nivel: niveles[p.grado] ?? 'Avanzado', enunciado: `${p.texto}\n\n${q.enunciado}`,
  ...opcionesAnexo(q.opciones, q.respuesta_correcta), explicacion: q.explicacion,
})));