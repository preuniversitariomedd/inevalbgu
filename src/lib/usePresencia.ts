import { useEffect, useRef } from "react";
import {
  iniciarSesionConexionFn,
  heartbeatSesionConexionFn,
  finalizarSesionConexionFn,
} from "@/lib/presencia.functions";

/**
 * Registra presencia del usuario: crea una fila en sesiones_conexion,
 * manda heartbeat cada 20s con segundos visibles/ocultos/interacción reales,
 * y finaliza al cerrar la pestaña.
 */
export function usePresencia(enabled: boolean) {
  const idRef = useRef<string | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let intervalo: ReturnType<typeof setInterval> | null = null;

    function onInteract() {
      lastInteractionRef.current = Date.now();
    }
    const evs: (keyof DocumentEventMap)[] = ["click", "keydown", "pointerdown", "scroll", "touchstart"];
    evs.forEach((e) => document.addEventListener(e, onInteract, { passive: true }));

    async function tick() {
      if (!idRef.current) return;
      const now = Date.now();
      const deltaTotal = Math.min(120, Math.round((now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
      const visible = document.visibilityState === "visible";
      const interactuoReciente = now - lastInteractionRef.current < 30_000;
      const deltaVisible = visible ? deltaTotal : 0;
      const deltaOculto = visible ? 0 : deltaTotal;
      const deltaInteraccion = visible && interactuoReciente ? deltaTotal : 0;
      try {
        await heartbeatSesionConexionFn({
          data: {
            id: idRef.current,
            visible,
            deltaVisible,
            deltaOculto,
            deltaInteraccion,
            interactuo: interactuoReciente,
          },
        });
      } catch {
        /* silencioso */
      }
    }

    (async () => {
      try {
        const { id } = await iniciarSesionConexionFn({
          data: { userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null },
        });
        if (cancelled) {
          await finalizarSesionConexionFn({ data: { id } }).catch(() => {});
          return;
        }
        idRef.current = id;
        lastTickRef.current = Date.now();
        intervalo = setInterval(tick, 20_000);
      } catch {
        /* silencioso */
      }
    })();

    function onVisibility() {
      void tick();
    }
    document.addEventListener("visibilitychange", onVisibility);

    function onUnload() {
      if (!idRef.current) return;
      try {
        const url = "/_serverFn/" + ""; // no-op: usamos sendBeacon vía fetch keepalive
      } catch {}
      // fire-and-forget; el servidor también marca activa por heartbeat caducado
      void finalizarSesionConexionFn({ data: { id: idRef.current } }).catch(() => {});
    }
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    return () => {
      cancelled = true;
      if (intervalo) clearInterval(intervalo);
      evs.forEach((e) => document.removeEventListener(e, onInteract));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      if (idRef.current) void finalizarSesionConexionFn({ data: { id: idRef.current } }).catch(() => {});
    };
  }, [enabled]);
}
