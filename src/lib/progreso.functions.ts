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

