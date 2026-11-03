export function avisarNotasActualizadas() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('notas-actualizadas'));
}