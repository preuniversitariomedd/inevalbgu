import { describe, expect, test } from 'bun:test';
import { avanceDesdeEventos, dentroPeriodo, limitesPeriodo, recortarTiempo } from './periodos';
import { calcularNotaGlobal } from './nota-global';
import { preguntasConocimiento, CONFIG_CON } from '@/data/conocimiento';
import { bancoRazonamiento, CONFIG_RAZ } from '@/data/basica/razonamiento';
const p = { fecha_inicio: '2026-09-02', fecha_fin: '2026-10-02' };
describe('Calificación de períodos por grupo', () => {
  test('Incluye ambos días completos en Guayaquil y excluye fechas externas', () => {
    expect(dentroPeriodo('2026-09-02T04:59:59Z', p)).toBe(false);
    expect(dentroPeriodo('2026-09-02T05:00:00Z', p)).toBe(true);
    expect(dentroPeriodo('2026-10-03T04:59:59Z', p)).toBe(true);
    expect(dentroPeriodo('2026-10-03T05:00:00Z', p)).toBe(false);
  });
  test('Segundo período del 2 de octubre al 15 de diciembre tiene fechas independientes', () => {
    const segundo = { fecha_inicio: '2026-10-02', fecha_fin: '2026-12-15' };
    expect(dentroPeriodo('2026-10-02T05:00:00Z', segundo)).toBe(true);
    expect(dentroPeriodo('2026-12-16T05:00:00Z', segundo)).toBe(false);
  });
  test('Permite períodos de un día y rechaza fechas invertidas', () => {
    expect(limitesPeriodo({ fecha_inicio: '2026-10-02', fecha_fin: '2026-10-02' }).fin - limitesPeriodo({ fecha_inicio: '2026-10-02', fecha_fin: '2026-10-02' }).inicio).toBe(86400000);
    expect(() => limitesPeriodo({ fecha_inicio: '2026-10-03', fecha_fin: '2026-10-02' })).toThrow();
  });
  test('Divide tiempo de una conexión que cruza el límite sin sumar actividad externa', () => {
    const r = recortarTiempo({ inicio: '2026-09-02T04:59:30Z', fin: '2026-09-02T05:00:30Z', segundos_visible: 40, segundos_oculto: 20, segundos_interaccion: 30 }, p);
    expect(r.segundos_visible).toBe(20); expect(r.segundos_oculto).toBe(10); expect(r.segundos_interaccion).toBe(15);
  });
  test('Cuenta preguntas correctas únicas del período y no modifica avance histórico', () => {
    const q = preguntasConocimiento(1)[0];
    if (!q) throw new Error('Banco vacío');
    const eventos = [{ pregunta_id: q.id, area: 'Conocimiento', correcta: true }, { pregunta_id: q.id, area: 'Conocimiento', correcta: true }, { pregunta_id: q.id, area: 'Razonamiento', correcta: false }];
    const antes = JSON.stringify(eventos);
    expect(avanceDesdeEventos(eventos, 'Conocimiento').aciertos?.['1']).toEqual([q.id]);
    expect(JSON.stringify(eventos)).toBe(antes);
  });
  test('Nota sobre diez: 10% tiempo, 30% examen, 30% conocimiento y 30% razonamiento', () => {
    const con = { aciertos: Object.fromEntries(([1,2,3]).map(n => [n, preguntasConocimiento(n).slice(0, Math.ceil(preguntasConocimiento(n).length * CONFIG_CON[n].meta)).map(q => q.id)])) };
    const raz = { aciertos: Object.fromEntries(([1,2,3]).map(n => [n, bancoRazonamiento(n,14).slice(0, Math.ceil(CONFIG_RAZ[n].total * CONFIG_RAZ[n].meta)).map(q => q.id)])) };
    const sim = [{ tipo: 'simulacro', finalizada_en: '2026-10-02T10:00:00Z', total_preguntas: 30, correctas: 30 }];
    expect(calcularNotaGlobal([{ segundos_visible: 72000 }], [], null, null).nota).toBe(1);
    expect(calcularNotaGlobal([], sim, null, null).nota).toBe(3);
    expect(calcularNotaGlobal([], [], con, null).nota).toBe(3);
    expect(calcularNotaGlobal([], [], null, raz).nota).toBe(3);
    expect(calcularNotaGlobal([{ segundos_visible: 72000 }], sim, con, raz).nota).toBe(10);
  });
});
