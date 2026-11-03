export const MODULOS_EXAMEN = ["simulacro", "conocimiento", "razonamiento"] as const;
export type ModuloExamen = (typeof MODULOS_EXAMEN)[number];
export const TIPOS_INFRACCION = ["cambio_pestana", "perdida_foco", "salida_pantalla_completa", "copiar", "pegar", "clic_derecho"] as const;
export type TipoInfraccion = (typeof TIPOS_INFRACCION)[number];
export const NOMBRE_INFRACCION: Record<TipoInfraccion, string> = {
  cambio_pestana: "Cambio de pestaña o aplicación",
  perdida_foco: "Pérdida de foco de la ventana",
  salida_pantalla_completa: "Salida de pantalla completa",
  copiar: "Intento de copiar",
  pegar: "Intento de pegar",
  clic_derecho: "Clic derecho",
};
export const MAX_AVISOS = 3;
export const SEPARACION_MS = 2000;
/** Infracciones separadas por menos de 2 s cuentan como una sola. */
export function contarNueva(ultima: number | null, ahora: number) {
  return ultima === null || ahora - ultima >= SEPARACION_MS;
}
/** La cuarta infracción cierra la prueba. */
export const cierraPrueba = (numero: number) => numero > MAX_AVISOS;
