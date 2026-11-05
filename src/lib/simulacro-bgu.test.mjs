import { expect, test } from 'bun:test';
import fisica2 from '../data/anexos/fisica-2bgu.json';
import fisica3 from '../data/anexos/fisica-3bgu.json';
import historia3 from '../data/anexos/historia-3bgu.json';
import { FISICA_2BGU_SIM, FISICA_3BGU_SIM, HISTORIA_3BGU_SIM, adaptarBancoBGU, seleccionarFisicaSimulacro, seleccionarSocialesSimulacro } from '../data/simulacro-bgu';

for (const [original, adaptado, area] of [[fisica2, FISICA_2BGU_SIM, 'Física'], [fisica3, FISICA_3BGU_SIM, 'Física'], [historia3, HISTORIA_3BGU_SIM, 'Estudios Sociales']]) {
  test(`${original.materia} ${original.curso}: incorpora las 126 preguntas con sus claves y lecturas`, () => {
    expect(adaptado).toHaveLength(126);
    original.preguntas.forEach((p, i) => {
      const q = adaptado[i];
      expect(q.area).toBe(area);
      expect(q.id).toBe(`sim-bgu-${p.id}`);
      expect(q.opciones).toHaveLength(5);
      expect(q.opciones[q.respuestaCorrecta]).toBe(p.opciones.find(o => o.letra === p.respuesta_correcta).texto);
      if (p.lectura_id) expect(q.enunciado).toContain(original.lecturas.find(l => l.id === p.lectura_id).texto);
    });
  });
}
test('Los 378 IDs nuevos son únicos y no reemplazan los históricos', () => {
  const banco = [...FISICA_2BGU_SIM, ...FISICA_3BGU_SIM, ...HISTORIA_3BGU_SIM];
  expect(new Set(banco.map(p => p.id)).size).toBe(378);
});
test('Física selecciona 30 preguntas sin repetición de las tres fuentes', () => {
  const sesion = seleccionarFisicaSimulacro();
  expect(sesion).toHaveLength(30);
  expect(new Set(sesion.map(p => p.id)).size).toBe(30);
  expect(sesion.every(p => p.area === 'Física')).toBe(true);
  expect(sesion.filter(p => p.id.startsWith('sim-bgu-FIS-2BGU'))).toHaveLength(7);
  expect(sesion.filter(p => p.id.startsWith('sim-bgu-FIS-3BGU'))).toHaveLength(7);
});
test('Estudios Sociales incluye Historia y el banco anterior sin mezclar Física', () => {
  const sesion = seleccionarSocialesSimulacro();
  expect(sesion).toHaveLength(30);
  expect(new Set(sesion.map(p => p.id)).size).toBe(30);
  expect(sesion.every(p => p.area === 'Estudios Sociales')).toBe(true);
  expect(sesion.filter(p => p.id.startsWith('sim-bgu-HIS-3BGU'))).toHaveLength(10);
});
test('Rechaza preguntas con clave inválida o lectura inexistente', () => {
  expect(() => adaptarBancoBGU({ ...fisica2, preguntas: [{ ...fisica2.preguntas[0], respuesta_correcta: 'Z' }] }, 'Física')).toThrow();
  expect(() => adaptarBancoBGU({ ...fisica2, preguntas: [{ ...fisica2.preguntas[0], lectura_id: 'no-existe' }] }, 'Física')).toThrow();
});