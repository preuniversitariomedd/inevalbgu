// Corrige en el servidor: si conocemos la clave de la pregunta y el navegador
// envió la opción elegida, la nota la decide el servidor, no el navegador.
import claves from "./claves-respuestas.server.json";
import { huellaRespuesta } from "./huella-respuesta";

const MAPA = claves as Record<string, string>;

export function corregirRespuesta(preguntaId: string, elegida: string | undefined, correctaCliente: boolean): boolean {
  const clave = MAPA[preguntaId];
  if (clave === undefined || elegida === undefined) return correctaCliente;
  return huellaRespuesta(elegida) === clave;
}
