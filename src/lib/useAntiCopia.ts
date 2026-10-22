import { useEffect } from "react";

/**
 * Anti-copia para las pantallas de preguntas: bloquea copiar, cortar, pegar,
 * menú contextual y atajos (Ctrl/Cmd+C, V, X, U, S, P) fuera de campos de texto.
 * Los campos de entrada (cédula, contraseña, mensajes, PIN) siguen funcionando
 * con normalidad para no romper formularios.
 */
export function useAntiCopia(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const esEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el?.closest?.('input, textarea, [contenteditable="true"]');
    };

    const onCopy = (e: ClipboardEvent) => {
      if (!esEditable(e.target)) e.preventDefault();
    };
    const onCut = (e: ClipboardEvent) => {
      if (!esEditable(e.target)) e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!esEditable(e.target)) e.preventDefault();
    };
    const onMenu = (e: MouseEvent) => {
      if (!esEditable(e.target)) e.preventDefault();
    };
    const onDrag = (e: DragEvent) => {
      if (!esEditable(e.target)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (esEditable(e.target)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "u", "s", "p"].includes(k)) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("keydown", onKey);
    };
  }, [enabled]);
}
