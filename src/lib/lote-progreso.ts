// Acumula respuestas y el último estado de progreso durante una ronda
// y los envía juntos al terminarla (o al salir / ocultar la pestaña).
import { supabase } from "@/integrations/supabase/client";
import { guardarRespuestasLoteFn } from "./progreso.functions";
import type { RespuestaInput } from "./progreso";
import { avisarNotasActualizadas } from "./actualizar-notas";

type Tabla = "conocimiento_progreso" | "razonamiento_progreso";

export function crearLote(tabla: Tabla) {
  let respuestas: RespuestaInput[] = [];
  let progreso: Record<string, unknown> | null = null;
  let avisar = false;

  return {
    respuesta(r: RespuestaInput) { respuestas.push(r); },
    progreso(fila: Record<string, unknown>, nivelCompletado: boolean) {
      progreso = fila; if (nivelCompletado) avisar = true;
    },
    async enviar() {
      const r = respuestas, p = progreso, a = avisar;
      respuestas = []; progreso = null; avisar = false;
      if (!r.length && !p) return;
      try {
        await Promise.all([
          r.length ? guardarRespuestasLoteFn({ data: { respuestas: r } }) : null,
          p ? (supabase as any).from(tabla).upsert(p).then(({ error }: any) => { if (error) throw error; }) : null,
        ]);
        if (a) avisarNotasActualizadas();
      } catch (e) {
        console.error("Lote no guardado", e);
        respuestas = [...r, ...respuestas];
        if (!progreso) progreso = p;
        avisar = avisar || a;
      }
    },
  };
}

// Lote solo de respuestas (simulacros y prácticas): se envía al finalizar,
// al ocultar la pestaña o al salir. Divide en paquetes de 50.
export function crearLoteRespuestas() {
  let pendientes: RespuestaInput[] = [];
  const enviar = async () => {
    const r = pendientes; pendientes = [];
    for (let i = 0; i < r.length; i += 50) {
      const parte = r.slice(i, i + 50);
      try { await guardarRespuestasLoteFn({ data: { respuestas: parte } }); }
      catch (e) { console.error("Lote no guardado", e); pendientes = [...r.slice(i), ...pendientes]; return; }
    }
  };
  return { agregar(x: RespuestaInput) { pendientes.push(x); }, enviar, get tamano() { return pendientes.length; } };
}
