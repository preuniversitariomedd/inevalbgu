// Limpia el HTML de apuntes y tareas antes de mostrarlo: solo formato educativo.
// En el servidor (sin navegador) se quitan todas las etiquetas por seguridad.
import DOMPurify from "dompurify";

export function sanitizarHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, "").replace(/[<>]/g, "");
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });
}
