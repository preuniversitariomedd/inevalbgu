import { describe, expect, test } from 'bun:test';
import { separarNombre, compararApellidos, notaSugerida } from './resumen-curso';
describe('resumen de curso', () => {
  test('separa apellidos en ambos formatos', () => {
    expect(separarNombre('PEREZ BRITO JACOB ANDRES')).toEqual({ apellidos: 'PEREZ BRITO', nombres: 'JACOB ANDRES' });
    expect(separarNombre('Erick Paul Sánchez Pincay')).toEqual({ apellidos: 'Sánchez Pincay', nombres: 'Erick Paul' });
  });
  test('ordena por apellidos A-Z', () => {
    const l = ['TAMAYO FRANCO DYLAN JOSUE', 'Rebeca Merino Mendoza', 'PEREZ BRITO JACOB ANDRES'].map(separarNombre).sort(compararApellidos);
    expect(l.map(x => x.apellidos)).toEqual(['Merino Mendoza', 'PEREZ BRITO', 'TAMAYO FRANCO']);
  });
  test('nunca ingresó recibe 0', () => expect(notaSugerida({ ingreso: false, historica: 8, periodos: [], podio: 50, diasSinConexion: null }).nota).toBe(0));
  test('nota sugerida 50/30/20', () => expect(notaSugerida({ ingreso: true, historica: 8, periodos: [6], podio: 50, diasSinConexion: 1 }).nota).toBe(6.8));
});
