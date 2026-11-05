// Pure helpers for the per-group summary sheet (shared by the export and its tests).
export function separarNombre(completo: string): { apellidos: string; nombres: string } {
  const p = completo.trim().split(/\s+/).filter(w => !/^(lcdo|lcda|ing|dr|dra|msc|mgs)\.?$/i.test(w));
  if (p.length <= 1) return { apellidos: p[0] ?? '', nombres: '' };
  const n = p.length >= 4 ? 2 : p.length === 3 ? 2 : 1;
  const mayus = completo === completo.toUpperCase();
  // Uppercase official lists come "APELLIDOS NOMBRES"; mixed-case entries come "Nombres Apellidos".
  return mayus
    ? { apellidos: p.slice(0, n).join(' '), nombres: p.slice(n).join(' ') }
    : { apellidos: p.slice(-n).join(' '), nombres: p.slice(0, -n).join(' ') };
}

export function compararApellidos(a: { apellidos: string; nombres: string }, b: { apellidos: string; nombres: string }) {
  return a.apellidos.localeCompare(b.apellidos, 'es', { sensitivity: 'base' }) || a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' });
}

export function puntajePodio(respondidas: number, correctas: number, horas: number, mejor: number) {
  const precision = respondidas ? correctas / respondidas : 0;
  return Math.round((precision * 40 + Math.min(1, respondidas / 300) * 30 + Math.min(1, horas / 20) * 20 + (Math.min(100, mejor) / 100) * 10) * 10) / 10;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Suggested grade /10: 50 % historical, 30 % average of periods (or historical), 20 % podium score. */
export function notaSugerida(input: { ingreso: boolean; historica: number; periodos: number[]; podio: number; diasSinConexion: number | null }) {
  if (!input.ingreso) return { nota: 0, observacion: 'Nunca ingresó a la plataforma; no hay evidencia para calificar.' };
  const promPer = input.periodos.length ? input.periodos.reduce((s, x) => s + x, 0) / input.periodos.length : input.historica;
  const nota = r2(Math.min(10, Math.max(0, input.historica * 0.5 + promPer * 0.3 + (input.podio / 10) * 0.2)));
  let obs = nota >= 9 ? 'Excelente desempeño y constancia.' : nota >= 7 ? 'Buen desempeño; puede reforzar los temas con menos aciertos.' : nota >= 5 ? 'Desempeño en proceso; necesita más práctica en Conocimiento y Razonamiento.' : 'Desempeño bajo; requiere acompañamiento y práctica frecuente.';
  if (input.diasSinConexion != null && input.diasSinConexion > 14) obs += ` Sin conectarse hace ${input.diasSinConexion} días.`;
  return { nota, observacion: obs };
}
