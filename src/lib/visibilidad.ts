import type { Modulos } from './grupo-config';
export const APARTADOS_GLOBALES = { practicas: 'Practicar por tema', banco: 'Banco de preguntas', fisica: 'Física', ciencias: 'Ciencias Naturales', sociales: 'Estudios Sociales' };
export type ApartadoGlobal = keyof typeof APARTADOS_GLOBALES;
export type Visibilidad = Partial<Record<ApartadoGlobal, boolean>>;
export function aplicarVisibilidad(modulos: Modulos, visibilidad: Visibilidad): Modulos {
  return { ...modulos, practicas: modulos.practicas && visibilidad.practicas !== false, banco: modulos.banco && visibilidad.banco !== false, fisica: modulos.fisica && visibilidad.fisica !== false, ciencias: modulos.basica && visibilidad.ciencias !== false, sociales: modulos.basica && visibilidad.sociales !== false };
}
export function materiaVisible(modulos: Modulos, ruta: string) {
  if (ruta.startsWith('/basica/ciencias-naturales')) return modulos.basica && modulos.ciencias !== false;
  if (ruta.startsWith('/basica/estudios-sociales')) return modulos.basica && modulos.sociales !== false;
  return true;
}