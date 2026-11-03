import { expect, test } from 'bun:test';
import { ANALOGIAS_RAZ, MATEMATICAS_RAZ, CONOCIMIENTO_EGB, opcionesAnexo } from '@/data/anexos';
import { bancoRazonamiento, CONFIG_RAZ, progresoRazonamiento } from '@/data/basica/razonamiento';
import { avanceRazonamiento } from './nota-global';
import { BANCO_CONOCIMIENTO, CONFIG_CON } from '@/data/conocimiento';
import { avanceDesdeEventos } from './periodos';
import { CLAVES_ACTUALIZACION_GRUPO } from './grupo-actualizaciones';

test('Las 700 analogías están integradas en Razonamiento una vez', () => {
  const banco = [1,2,3].flatMap(n => bancoRazonamiento(n,14));
  expect(ANALOGIAS_RAZ).toHaveLength(700);
  expect(banco.filter(p => p.id.startsWith('raz-analogia-'))).toHaveLength(700);
  expect(new Set(banco.map(p => p.id)).size).toBe(1250);
});
test('Las 300 preguntas de Matemática están integradas con el párrafo', () => {
  expect(MATEMATICAS_RAZ).toHaveLength(300);
  expect([1,2,3].flatMap(n => bancoRazonamiento(n,14)).filter(p => p.id.startsWith('raz-matematica-'))).toHaveLength(300);
  expect(MATEMATICAS_RAZ[0].enunciado).toContain('Una cooperativa agrícola de Babahoyo');
  expect(MATEMATICAS_RAZ[0].opciones[MATEMATICAS_RAZ[0].respuestaCorrecta]).toBe('6 kg');
});
test('Conocimiento agrega 270 preguntas EGB, 90 por nivel', () => {
  expect(CONOCIMIENTO_EGB).toHaveLength(270);
  expect(BANCO_CONOCIMIENTO).toHaveLength(840);
  for (const nivel of ['Básico','Intermedio','Avanzado']) expect(CONOCIMIENTO_EGB.filter(p => p.nivel === nivel)).toHaveLength(90);
});
test('Respuestas A–E conservan cinco opciones y la clave original', () => {
  for (const p of [...ANALOGIAS_RAZ,...MATEMATICAS_RAZ,...CONOCIMIENTO_EGB]) {
    expect(p.opciones).toHaveLength(5);
    expect(p.respuestaCorrecta).toBeGreaterThanOrEqual(0);
    expect(p.respuestaCorrecta).toBeLessThan(5);
  }
  expect(() => opcionesAnexo({A:'uno'}, 'Z')).toThrow();
});
for (const [nivel, porcentaje] of [[1, 1], [2, 0.95], [3, 0.9]]) {
  test(`Razonamiento nivel ${nivel}: exige ${porcentaje * 100} % del banco completo`, () => {
    const banco = bancoRazonamiento(nivel,14);
    const meta = Math.ceil(banco.length * porcentaje);
    expect(CONFIG_RAZ[nivel].total).toBe(banco.length);
    expect(progresoRazonamiento(nivel).meta).toBe(meta);
    expect(progresoRazonamiento(nivel, banco.slice(0, meta - 1).map(p => p.id)).aprobado).toBe(false);
    expect(progresoRazonamiento(nivel, banco.slice(0, meta).map(p => p.id)).aprobado).toBe(true);
    expect(progresoRazonamiento(nivel, banco.slice(0, 100).map(p => p.id)).aprobado).toBe(false);
  });
}
test('Razonamiento cuenta solo aciertos únicos del nivel y comparte la meta con notas', () => {
  const ids = bancoRazonamiento(1,14).slice(0,100).map(p => p.id);
  expect(progresoRazonamiento(1, [...ids, ...ids, 'inexistente', bancoRazonamiento(2,14)[0].id]).correctas).toBe(100);
  expect(avanceRazonamiento({ aciertos: { 1: ids } })).toBeCloseTo(100 / bancoRazonamiento(1,14).length / 3);
});
test('Las nuevas respuestas aportan a la nota del período en su nivel', () => {
  expect(avanceDesdeEventos([{ pregunta_id:'raz-analogia-1', area:'Razonamiento', correcta:true }], 'Razonamiento').aciertos['1']).toEqual(['raz-analogia-1']);
  expect(avanceDesdeEventos([{ pregunta_id:'con-egb-EGB-001-1', area:'Conocimiento', correcta:true }], 'Conocimiento').aciertos['1']).toEqual(['con-egb-EGB-001-1']);
});
test('Un cambio de grupo actualiza conjuntamente accesos y notas estudiantiles y administrativas', () => {
  expect(CLAVES_ACTUALIZACION_GRUPO).toContain('mis-accesos');
  expect(CLAVES_ACTUALIZACION_GRUPO).toContain('calificacion');
  expect(CLAVES_ACTUALIZACION_GRUPO).toContain('calificaciones');
});
test('Metas de Conocimiento: 100 %, 95 % y 90 %', () => {
  expect([1,2,3].map(n => CONFIG_CON[n].meta)).toEqual([1, 0.95, 0.9]);
});
