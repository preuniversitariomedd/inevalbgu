// Devuelve false cuando la pestaña lleva oculta más de `esperaMs` (por defecto
// 3 minutos), para cerrar conexiones en vivo; vuelve a true al regresar.
import { useEffect, useState } from "react";

export const ESPERA_PAUSA_MS = 3 * 60 * 1000;

export function usePestanaActiva(esperaMs = ESPERA_PAUSA_MS) {
  const [activa, setActiva] = useState(true);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const cambio = () => {
      clearTimeout(t);
      if (document.hidden) t = setTimeout(() => setActiva(false), esperaMs);
      else setActiva(true);
    };
    document.addEventListener("visibilitychange", cambio);
    cambio();
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", cambio); };
  }, [esperaMs]);
  return activa;
}
