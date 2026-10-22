import { BANCO_CONOCIMIENTO } from '@/data/conocimiento';
import { bancoRazonamiento } from '@/data/basica/razonamiento';
import type { AvanceNiveles } from './nota-global';

export type Periodo = { id: string; grupo_id: string; nombre: string; fecha_inicio: string; fecha_fin: string };
export function limitesPeriodo(p: Pick<Periodo, 'fecha_inicio' | 'fecha_fin'>) {
  const inicio = new Date(`${p.fecha_inicio}T00:00:00-05:00`).getTime();
  const fin = new Date(`${p.fecha_fin}T00:00:00-05:00`).getTime() + 86400000;
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) throw new Error('Fechas del período inválidas.');
  return { inicio, fin };
}
export function dentroPeriodo(fecha: string | null | undefined, p: Pick<Periodo, 'fecha_inicio' | 'fecha_fin'>) {
  if (!fecha) return false;
  const { inicio, fin } = limitesPeriodo(p);
  const t = new Date(fecha).getTime();
  return t >= inicio && t < fin;
}
export function recortarTiempo(e: { inicio: string; fin: string; segundos_visible: number; segundos_oculto: number; segundos_interaccion: number }, p: Pick<Periodo, 'fecha_inicio' | 'fecha_fin'>) {
  const { inicio, fin } = limitesPeriodo(p);
  const a = new Date(e.inicio).getTime(), b = new Date(e.fin).getTime();
  const fraccion = b > a ? Math.max(0, Math.min(b, fin) - Math.max(a, inicio)) / (b - a) : 0;
  return { iniciada_en: new Date(Math.max(a, inicio)).toISOString(), segundos_visible: e.segundos_visible * fraccion, segundos_oculto: e.segundos_oculto * fraccion, segundos_interaccion: e.segundos_interaccion * fraccion };
}
const nivelesCon = new Map(BANCO_CONOCIMIENTO.map(p => [p.id, p.nivel]));
const nivelesRaz = new Map(([1, 2, 3] as const).flatMap(n => bancoRazonamiento(n, 14).map(p => [p.id, String(n)] as const)));
export function avanceDesdeEventos(respuestas: Array<{ pregunta_id: string; area: string; correcta: boolean }>, area: 'Conocimiento' | 'Razonamiento'): AvanceNiveles {
  const grupos: Record<string, Set<string>> = { '1': new Set(), '2': new Set(), '3': new Set() };
  for (const r of respuestas) {
    if (!r.correcta || r.area !== area) continue;
    const nivel = area === 'Conocimiento' ? ({ 'Básico': '1', 'Intermedio': '2', 'Avanzado': '3' } as Record<string, string>)[nivelesCon.get(r.pregunta_id) ?? ''] : nivelesRaz.get(r.pregunta_id);
    if (nivel) grupos[nivel]?.add(r.pregunta_id);
  }
  return { aciertos: Object.fromEntries(Object.entries(grupos).map(([n, ids]) => [n, [...ids]])) };
}
export function etiquetaPeriodo(p: Periodo) { return `${p.nombre} · ${p.fecha_inicio} — ${p.fecha_fin}`; }
