import { test, expect } from 'bun:test';
import { MODULOS_DEFAULT } from './grupo-config';
import { aplicarVisibilidad, materiaVisible, APARTADOS_GLOBALES } from './visibilidad';
for (const apartado of Object.keys(APARTADOS_GLOBALES)) {
  test(`Ocultar globalmente ${apartado} prevalece sobre grupo activo`, () => {
    expect(aplicarVisibilidad(MODULOS_DEFAULT, { [apartado]: false })[apartado]).toBe(false);
  });
}
test('Mostrar globalmente no habilita apartados bloqueados por grupo', () => {
  const m = aplicarVisibilidad({...MODULOS_DEFAULT, practicas:false, banco:false, fisica:false, basica:false}, {practicas:true,banco:true,fisica:true,ciencias:true,sociales:true});
  for (const apartado of Object.keys(APARTADOS_GLOBALES)) expect(m[apartado]).toBe(false);
});
test('Ciencias y Sociales tienen visibilidad independiente sin ocultar Matemática', () => {
  const m = aplicarVisibilidad(MODULOS_DEFAULT, {ciencias:false});
  expect(materiaVisible(m,'/basica/ciencias-naturales')).toBe(false);
  expect(materiaVisible(m,'/basica/estudios-sociales')).toBe(true);
  expect(materiaVisible(m,'/basica/matematica')).toBe(true);
});