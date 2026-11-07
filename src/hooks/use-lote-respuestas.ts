// Acumula respuestas en memoria y las envía juntas al finalizar,
// al ocultar la pestaña o al salir de la página.
import { useEffect, useRef } from "react";
import { crearLoteRespuestas } from "@/lib/lote-progreso";

export function useLoteRespuestas() {
  const ref = useRef<ReturnType<typeof crearLoteRespuestas> | null>(null);
  if (!ref.current) ref.current = crearLoteRespuestas();
  useEffect(() => {
    const lote = ref.current!;
    const oculta = () => { if (document.visibilityState === "hidden") void lote.enviar(); };
    const salir = () => void lote.enviar();
    document.addEventListener("visibilitychange", oculta);
    window.addEventListener("pagehide", salir);
    return () => { document.removeEventListener("visibilitychange", oculta); window.removeEventListener("pagehide", salir); void lote.enviar(); };
  }, []);
  return ref.current;
}
