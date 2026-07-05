// Capa de progreso del estudiante. Reemplaza el almacenamiento en localStorage
// por server functions que escriben en Lovable Cloud (Supabase).
import {
  guardarRespuestaFn,
  iniciarSesionPracticaFn,
  finalizarSesionPracticaFn,
} from "./progreso.functions";

let _sesionActualId: string | null = null;

export function getSesionActualId(): string | null {
  return _sesionActualId;
}

export async function iniciarSesion(tipo: "practica" | "simulacro", area: string | null = null) {
  try {
    const res = await iniciarSesionPracticaFn({ data: { tipo, area } });
    _sesionActualId = res.id;
    return res.id;
  } catch (e) {
    console.error("iniciarSesion fallo", e);
    return null;
  }
}

export async function finalizarSesion(
  sesionId: string | null,
  totalPreguntas: number,
  correctas: number,
  puntajeIneval?: number | null,
  nivelLogro?: string | null,
  tiempoSegundos?: number,
) {
  if (!sesionId) return;
  try {
    await finalizarSesionPracticaFn({
      data: {
        sesionId,
        totalPreguntas,
        correctas,
        puntajeIneval: puntajeIneval ?? null,
        nivelLogro: nivelLogro ?? null,
        tiempoSegundos: tiempoSegundos ?? 0,
      },
    });
  } catch (e) {
    console.error("finalizarSesion fallo", e);
  } finally {
    _sesionActualId = null;
  }
}

export interface RespuestaInput {
  preguntaId: string;
  area: string;
  subtema: string;
  nivel: string;
  correcta: boolean;
  sesionId?: string | null;
}

// Fire-and-forget para no bloquear la UI.
export function guardarRespuesta(r: RespuestaInput) {
  const sesionId = r.sesionId ?? _sesionActualId ?? null;
  void guardarRespuestaFn({
    data: {
      preguntaId: r.preguntaId,
      area: r.area,
      subtema: r.subtema,
      nivel: r.nivel,
      correcta: r.correcta,
      sesionId,
    },
  }).catch((e) => console.error("guardarRespuesta fallo", e));
}
