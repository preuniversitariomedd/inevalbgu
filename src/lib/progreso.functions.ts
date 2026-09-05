import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const respuestaSchema = z.object({
  preguntaId: z.string(),
  area: z.string(),
  subtema: z.string(),
  nivel: z.string(),
  correcta: z.boolean(),
  sesionId: z.string().uuid().nullable().optional(),
});

export const guardarRespuestaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => respuestaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("respuestas").insert({
      user_id: context.userId,
      sesion_id: data.sesionId ?? null,
      pregunta_id: data.preguntaId,
      area: data.area,
      subtema: data.subtema,
      nivel: data.nivel,
      correcta: data.correcta,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const iniciarSesionSchema = z.object({
  tipo: z.enum(["practica", "simulacro"]),
  area: z.string().nullable().optional(),
});

export const iniciarSesionPracticaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => iniciarSesionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sesiones_practica")
      .insert({ user_id: context.userId, tipo: data.tipo, area: data.area ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const finalizarSchema = z.object({
  sesionId: z.string().uuid(),
  totalPreguntas: z.number().int().nonnegative(),
  correctas: z.number().int().nonnegative(),
  puntajeIneval: z.number().int().nullable().optional(),
  nivelLogro: z.string().nullable().optional(),
  tiempoSegundos: z.number().int().nonnegative().optional(),
});

export const finalizarSesionPracticaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => finalizarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sesiones_practica")
      .update({
        total_preguntas: data.totalPreguntas,
        correctas: data.correctas,
        finalizada_en: new Date().toISOString(),
        puntaje_ineval: data.puntajeIneval ?? null,
        nivel_logro: data.nivelLogro ?? null,
        tiempo_segundos: data.tiempoSegundos ?? 0,
      })
      .eq("id", data.sesionId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const obtenerProgresoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetUserId: z.string().uuid().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let userId = context.userId;
    if (data?.targetUserId && data.targetUserId !== context.userId) {
      const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
      if (!staff) throw new Error("Sin permisos para ver otros estudiantes.");
      userId = data.targetUserId;
    }

    const { data: respuestas, error } = await context.supabase
      .from("respuestas")
      .select("pregunta_id, area, subtema, nivel, correcta, respondida_en")
      .eq("user_id", userId)
      .order("respondida_en", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    const { data: sesiones, error: e2 } = await context.supabase
      .from("sesiones_practica")
      .select("id, tipo, area, total_preguntas, correctas, iniciada_en, finalizada_en, puntaje_ineval, nivel_logro")
      .eq("user_id", userId)
      .order("iniciada_en", { ascending: false })
      .limit(500);
    if (e2) throw new Error(e2.message);

    return { respuestas: respuestas ?? [], sesiones: sesiones ?? [], viewedUserId: userId };
  });


// ---------- Calificación por asignatura (Matemática / Física) ----------
// Ponderación: 40% tiempo en plataforma · 20% tiempo activo · 20% constancia · 20% simulacros
const AREAS_FISICA = ["cinem", "dinam", "energ", "fisic", "físic"];
function esFisica(area?: string | null) {
  const a = (area ?? "").toLowerCase();
  return AREAS_FISICA.some((k) => a.includes(k));
}

export const calificacionAsignaturasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetUserId: z.string().uuid().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let userId = context.userId;
    if (data?.targetUserId && data.targetUserId !== context.userId) {
      const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
      if (!staff) throw new Error("Sin permisos para ver otros estudiantes.");
      userId = data.targetUserId;
    }

    const { data: con } = await context.supabase
      .from("sesiones_conexion")
      .select("iniciada_en, segundos_visible, segundos_oculto, segundos_interaccion")
      .eq("user_id", userId)
      .limit(2000);
    const { data: ses } = await context.supabase
      .from("sesiones_practica")
      .select("tipo, area, total_preguntas, correctas, iniciada_en, finalizada_en")
      .eq("user_id", userId)
      .limit(1000);

    let segPlataforma = 0;
    let segActivo = 0;
    const dias = new Set<string>();
    for (const c of con ?? []) {
      segPlataforma += (c.segundos_visible ?? 0) + (c.segundos_oculto ?? 0);
      segActivo += c.segundos_interaccion ?? 0;
      if (c.iniciada_en) dias.add(String(c.iniciada_en).slice(0, 10));
    }

    // Componentes compartidos (topes: 20 h en plataforma, 10 h activas, 20 días distintos)
    const cPlataforma = Math.min(1, segPlataforma / 3600 / 20);
    const cActivo = Math.min(1, segActivo / 3600 / 10);
    const cConstancia = Math.min(1, dias.size / 20);

    function simulacroDe(fisica: boolean) {
      const list = (ses ?? []).filter(
        (s: any) => s.tipo === "simulacro" && s.finalizada_en && esFisica(s.area) === fisica && (s.total_preguntas ?? 0) > 0,
      );
      if (list.length === 0) return { pct: 0, n: 0 };
      const prom =
        list.reduce((acc: number, s: any) => acc + s.correctas / s.total_preguntas, 0) / list.length;
      return { pct: prom, n: list.length };
    }

    function nota(fisica: boolean) {
      const sim = simulacroDe(fisica);
      const total10 =
        (cPlataforma * 0.4 + cActivo * 0.2 + cConstancia * 0.2 + sim.pct * 0.2) * 10;
      return {
        nota: Math.round(total10 * 10) / 10,
        componentes: {
          plataforma: Math.round(cPlataforma * 40 * 10) / 10,
          activo: Math.round(cActivo * 20 * 10) / 10,
          constancia: Math.round(cConstancia * 20 * 10) / 10,
          simulacro: Math.round(sim.pct * 20 * 10) / 10,
        },
        simulacros: sim.n,
      };
    }

    return {
      viewedUserId: userId,
      horasPlataforma: Math.round((segPlataforma / 3600) * 10) / 10,
      horasActivas: Math.round((segActivo / 3600) * 10) / 10,
      diasConectado: dias.size,
      matematica: nota(false),
      fisica: nota(true),
    };
  });
