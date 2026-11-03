export const CONFIRMACION_REINICIO = 'REINICIAR TODOS';
export function validarConfirmacionReinicio(texto: string, descargado: boolean) {
  if (!descargado) throw new Error('Descarga el respaldo antes de reiniciar.');
  if (texto !== CONFIRMACION_REINICIO) throw new Error('Escribe REINICIAR TODOS para confirmar.');
}