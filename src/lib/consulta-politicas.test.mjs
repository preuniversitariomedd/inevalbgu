import { test, expect } from 'bun:test';
import { CONSULTA_NOTAS, CONSULTA_MANUAL, DIA_NOTAS_MS } from './consulta-politicas';
test('Notas cada 24 horas', () => { expect(DIA_NOTAS_MS).toBe(86400000); expect(CONSULTA_NOTAS.staleTime).toBe(86400000); expect(CONSULTA_NOTAS.refetchInterval).toBe(86400000); });
test('No polling en segundo plano', () => { expect(CONSULTA_NOTAS.refetchIntervalInBackground).toBe(false); expect(CONSULTA_MANUAL.refetchIntervalInBackground).toBe(false); });
test('Administración solo refresca manualmente', () => { expect(CONSULTA_MANUAL.refetchInterval).toBe(false); expect(CONSULTA_MANUAL.refetchOnWindowFocus).toBe(false); });
