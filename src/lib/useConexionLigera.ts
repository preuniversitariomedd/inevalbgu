import { useEffect } from "react";
import { iniciarSesionConexionFn, finalizarSesionConexionFn } from "@/lib/presencia.functions";

/**
 * Registro ligero de conexión: 1 escritura al entrar y 1 al salir.
 * Mide localmente el tiempo visible y de interacción; sin latidos.
 */
export function useConexionLigera(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const key = `conexion:${userId}`;
    let id: string | null = sessionStorage.getItem(key);
    let enviado = false;
    let ultimo = Date.now();
    let ultimaInter = Date.now();
    let visible = 0, oculto = 0, inter = 0;

    const acumular = () => {
      const now = Date.now();
      const d = Math.round((now - ultimo) / 1000);
      ultimo = now;
      if (document.visibilityState === "visible") {
        visible += d;
        if (now - ultimaInter < 60_000) inter += d;
      } else oculto += d;
    };
    const onInteract = () => { ultimaInter = Date.now(); };
    const evs = ["click", "keydown", "pointerdown", "touchstart"] as const;
    evs.forEach((e) => document.addEventListener(e, onInteract, { passive: true }));
    const onVis = () => acumular();
    document.addEventListener("visibilitychange", onVis);

    if (!id) {
      iniciarSesionConexionFn({ data: { userAgent: navigator.userAgent } })
        .then((r) => { id = r.id; sessionStorage.setItem(key, r.id); })
        .catch(() => {});
    }

    const finalizar = () => {
      if (enviado || !id) return;
      enviado = true;
      acumular();
      sessionStorage.removeItem(key);
      void finalizarSesionConexionFn({
        data: { id, segundosVisible: visible, segundosOculto: oculto, segundosInteraccion: inter },
      }).catch(() => {});
    };
    window.addEventListener("pagehide", finalizar);
    return () => {
      evs.forEach((e) => document.removeEventListener(e, onInteract));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", finalizar);
      finalizar();
    };
  }, [userId]);
}
