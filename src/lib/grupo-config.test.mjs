import { test, expect } from 'bun:test';
import { accesoCombinado, pesosActivos, MODULOS_DEFAULT, PESOS_DEFAULT, validarPesos, moduloDeRuta } from './grupo-config';
import { calcularNotaGlobal } from './nota-global';
test('Las ponderaciones elegidas deben sumar 100%', () => { expect(() => validarPesos(MODULOS_DEFAULT, { ...PESOS_DEFAULT, plataforma: 20 })).toThrow('100%'); });
test('Las partes desactivadas no aportan puntos', () => { expect(() => validarPesos({ ...MODULOS_DEFAULT, conocimiento: false }, PESOS_DEFAULT)).toThrow('0%'); });
test('Un bloqueo en cualquier grupo prevalece', () => { expect(accesoCombinado([{ modulos: { conocimiento: false } }, { modulos: { conocimiento: true } }]).conocimiento).toBe(false); });
test('Sin configuración se mantienen los accesos', () => { expect(accesoCombinado([])).toEqual(MODULOS_DEFAULT); });
test('La URL directa de prácticas y la de física se identifican', () => { expect(moduloDeRuta('/practicar/Algebra')).toBe('practicas'); expect(moduloDeRuta('/fisica/practicar/cinematica')).toBe('fisica'); });
test('Nota sobre 10 con ponderaciones personalizadas de las partes activas', () => { expect(calcularNotaGlobal([{ segundos_visible: 72000 }], [], null, null, { plataforma: 100, practicas: 0, simulacro: 0, conocimiento: 0, razonamiento: 0 }).nota).toBe(10); });
test('Prácticas aporta su porcentaje elegido según precisión', () => { expect(calcularNotaGlobal([], [], null, null, { plataforma: 0, practicas: 100, simulacro: 0, conocimiento: 0, razonamiento: 0 }, [{ correcta: true }, { correcta: false }]).nota).toBe(5); });
test('Las notas excluyen partes bloqueadas en otra membresía y conservan total 100%', () => {
  const p = pesosActivos({...MODULOS_DEFAULT,conocimiento:false}, PESOS_DEFAULT);
  expect(p.conocimiento).toBe(0);
  expect(Object.values(p).reduce((a,b) => a+b,0)).toBeCloseTo(100);
});
test('Resultados no ofrece simulacros desactivados', () => { expect(moduloDeRuta('/resultados')).toBe('simulacro'); });