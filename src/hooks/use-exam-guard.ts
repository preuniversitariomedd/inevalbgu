import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { iniciarEvaluacionFn, registrarInfraccionFn, finalizarEvaluacionFn } from "@/lib/antifraude.functions";
import { contarNueva, type ModuloExamen, type TipoInfraccion } from "@/lib/antifraude";

export interface AvisoInfraccion { tipo: TipoInfraccion; numero: number; cerrado: boolean }

/** Vigila la evaluación activa. Las APIs del navegador solo se usan dentro de efectos o eventos. */
export function useExamGuard(modulo: ModuloExamen, onCerrar: () => void) {
  const iniciarFn = useServerFn(iniciarEvaluacionFn);
  const registrarFn = useServerFn(registrarInfraccionFn);
  const finalizarFn = useServerFn(finalizarEvaluacionFn);
  const [intentoId, setIntentoId] = useState<string | null>(null);
  const [activo, setActivo] = useState(false);
  const [aviso, setAviso] = useState<AvisoInfraccion | null>(null);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<string | null>(null);
  const [cerradoPorFraude, setCerradoPorFraude] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const ultima = useRef<number | null>(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  const iniciar = useCallback(async () => {
    setIniciando(true);
    try {
      const r = await iniciarFn({ data: { modulo } });
      if (r.bloqueado_hasta) { setBloqueadoHasta(r.bloqueado_hasta); return false; }
      setIntentoId(r.intento_id ?? null);
      try { await document.documentElement.requestFullscreen?.(); } catch { /* algunos móviles no lo permiten */ }
      ultima.current = Date.now();
      setActivo(true);
      if ((r.infracciones ?? 0) > 0) setAviso({ tipo: "cambio_pestana", numero: r.infracciones!, cerrado: false });
      return true;
    } finally { setIniciando(false); }
  }, [iniciarFn, modulo]);

  const salirPantalla = () => { if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {}); };

  const finalizar = useCallback((nota: number) => {
    if (intentoId) void finalizarFn({ data: { intentoId, nota } }).catch(() => {});
    setActivo(false);
    salirPantalla();
  }, [intentoId, finalizarFn]);

  useEffect(() => {
    if (!activo || !intentoId) return;
    const registrar = (tipo: TipoInfraccion) => {
      const ahora = Date.now();
      if (!contarNueva(ultima.current, ahora)) return;
      ultima.current = ahora;
      void registrarFn({ data: { intentoId, tipo } }).then((r) => {
        if (r.ignorada && !r.cerrado) return;
        setAviso({ tipo, numero: r.numero, cerrado: r.cerrado });
        if (r.cerrado) { setActivo(false); setCerradoPorFraude(true); salirPantalla(); cerrarRef.current(); }
      }).catch(() => {});
    };
    const vis = () => { if (document.visibilityState === "hidden") registrar("cambio_pestana"); };
    const blur = () => registrar("perdida_foco");
    const fs = () => { if (!document.fullscreenElement && document.fullscreenEnabled) registrar("salida_pantalla_completa"); };
    const copy = (e: Event) => { e.preventDefault(); registrar("copiar"); };
    const paste = (e: Event) => { e.preventDefault(); registrar("pegar"); };
    const ctx = (e: Event) => { e.preventDefault(); registrar("clic_derecho"); };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", blur);
    document.addEventListener("fullscreenchange", fs);
    document.addEventListener("copy", copy);
    document.addEventListener("cut", copy);
    document.addEventListener("paste", paste);
    document.addEventListener("contextmenu", ctx);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("blur", blur);
      document.removeEventListener("fullscreenchange", fs);
      document.removeEventListener("copy", copy);
      document.removeEventListener("cut", copy);
      document.removeEventListener("paste", paste);
      document.removeEventListener("contextmenu", ctx);
    };
  }, [activo, intentoId, registrarFn]);

  const cerrarAviso = useCallback(() => {
    setAviso(null);
    if (activo && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
  }, [activo]);

  return { iniciar, finalizar, activo, iniciando, aviso, cerrarAviso, bloqueadoHasta, cerradoPorFraude };
}
