// Huella corta y determinista del texto de una opción (FNV-1a), para comparar
// la opción elegida con la clave sin enviar las claves al navegador.
export function huellaRespuesta(texto: string): string {
  const s = texto.normalize("NFC").trim().replace(/\s+/g, " ");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
