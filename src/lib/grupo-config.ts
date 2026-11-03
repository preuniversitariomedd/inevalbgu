export const MODULOS = { practicas: 'Prácticas por tema', conocimiento: 'Conocimiento', razonamiento: 'Razonamiento', simulacro: 'Simulacros', sistemas: 'Sistemas de ecuaciones', fisica: 'Física', basica: 'Básica Superior', banco: 'Banco de preguntas', biblioteca: 'Biblioteca', tareas: 'Tareas', tutor: 'Mr. Victor', encuesta: 'Encuesta', competencias: 'Competencias' };
export type Modulo = keyof typeof MODULOS;
export const PARTES = { plataforma: 'Tiempo real en plataforma', practicas: 'Prácticas por tema', simulacro: 'Simulacros', conocimiento: 'Conocimiento', razonamiento: 'Razonamiento' };
export type Parte = keyof typeof PARTES;
export type Modulos = Record<Modulo, boolean>;
export type Pesos = Record<Parte, number>;
export const MODULOS_DEFAULT = Object.fromEntries(Object.keys(MODULOS).map(k => [k, true])) as Modulos;
export const PESOS_DEFAULT: Pesos = { plataforma: 0, practicas: 0, simulacro: 30, conocimiento: 40, razonamiento: 30 };
export function validarPesos(_modulos: Modulos, pesos: Pesos) {
  for (const k of Object.keys(PARTES) as Parte[]) {
    if (pesos[k] !== PESOS_DEFAULT[k]) throw new Error('La fórmula oficial es fija: 40% Conocimiento, 30% Razonamiento y 30% Simulacro (100%).');
  }
}
export function accesoCombinado(configs: { modulos: Partial<Modulos> }[]): Modulos {
  return Object.fromEntries((Object.keys(MODULOS) as Modulo[]).map(k => [k, configs.every(c => c.modulos[k] !== false)])) as Modulos;
}
export function pesosActivos(modulos: Modulos, _pesos: Pesos): Pesos {
  return Object.fromEntries((Object.keys(PARTES) as Parte[]).map(k => [k, k !== 'plataforma' && modulos[k] ? PESOS_DEFAULT[k] : 0])) as Pesos;
}
export function moduloDeRuta(path: string): Modulo | null {
  const p = path.split('/')[1];
  const map: Record<string, Modulo> = { practicar:'practicas', conocimiento:'conocimiento', razonamiento:'razonamiento', simulacro:'simulacro', resultados:'simulacro', sistemas:'sistemas', fisica:'fisica', basica:'basica', banco:'banco', biblioteca:'biblioteca', tareas:'tareas', tutor:'tutor', encuesta:'encuesta', competencias:'competencias', competencia:'competencias' };
  return map[p ?? ''] ?? null;
}