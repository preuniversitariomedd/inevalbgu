import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureStaff(context: { supabase: any; userId: string }) {
  const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!staff) throw new Error("Solo personal autorizado.");
  return true;
}

// ---------- Estudiante: leer sus respuestas ----------
export const misRespuestasEncuestaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetUserId: z.string().uuid().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let userId = context.userId;
    if (data?.targetUserId && data.targetUserId !== context.userId) {
      await ensureStaff(context);
      userId = data.targetUserId;
    }
    const { data: rows, error } = await context.supabase
      .from("encuesta_respuestas")
      .select("bloque, pregunta_id, valor, updated_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const { data: prog } = await context.supabase
      .from("encuesta_progreso")
      .select("bloque, completado_en")
      .eq("user_id", userId);
    return { respuestas: rows ?? [], progreso: prog ?? [], userId };
  });

// ---------- Estudiante: guardar respuestas de un bloque ----------
export const guardarBloqueEncuestaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        bloque: z.string().min(1),
        respuestas: z
          .array(z.object({ preguntaId: z.string().min(1), valor: z.string().min(1).max(200) }))
          .max(200),
        completado: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.respuestas.length) {
      const rows = data.respuestas.map((r) => ({
        user_id: context.userId,
        bloque: data.bloque,
        pregunta_id: r.preguntaId,
        valor: r.valor,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await context.supabase
        .from("encuesta_respuestas")
        .upsert(rows, { onConflict: "user_id,pregunta_id" });
      if (error) throw new Error(error.message);
    }
    if (data.completado) {
      const { error } = await context.supabase
        .from("encuesta_progreso")
        .upsert(
          { user_id: context.userId, bloque: data.bloque, completado_en: new Date().toISOString() },
          { onConflict: "user_id,bloque" },
        );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------- Staff: resumen agregado de la encuesta ----------
export const resumenEncuestaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userIds: z.array(z.string().uuid()).optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    let query = context.supabase.from("encuesta_respuestas").select("user_id, bloque, pregunta_id, valor");
    if (data?.userIds && data.userIds.length) query = query.in("user_id", data.userIds);
    const { data: rows, error } = await query.limit(50000);
    if (error) throw new Error(error.message);

    const porPregunta = new Map<string, Map<string, number>>();
    const porEstudiante = new Map<string, number>();
    for (const r of rows ?? []) {
      const m = porPregunta.get(r.pregunta_id) ?? new Map<string, number>();
      m.set(r.valor, (m.get(r.valor) ?? 0) + 1);
      porPregunta.set(r.pregunta_id, m);
      porEstudiante.set(r.user_id, (porEstudiante.get(r.user_id) ?? 0) + 1);
    }
    return {
      total: (rows ?? []).length,
      participantes: porEstudiante.size,
      completadasPorEstudiante: Array.from(porEstudiante.entries()).map(([userId, n]) => ({ userId, n })),
      distribucion: Array.from(porPregunta.entries()).map(([preguntaId, m]) => ({
        preguntaId,
        opciones: Array.from(m.entries()).map(([valor, n]) => ({ valor, n })),
      })),
    };
  });

// ---------- Staff: PODIO / ranking ----------
export const podioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ grupoId: z.string().uuid().nullable().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);

    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    let ids = (roles ?? []).filter((r: any) => r.role === "estudiante").map((r: any) => r.user_id as string);

    const { data: miembros } = await context.supabase.from("grupo_estudiantes").select("grupo_id, user_id");
    const gruposPorUser = new Map<string, string[]>();
    for (const m of miembros ?? []) {
      const arr = gruposPorUser.get(m.user_id) ?? [];
      arr.push(m.grupo_id);
      gruposPorUser.set(m.user_id, arr);
    }
    if (data?.grupoId) {
      const set = new Set(
        (miembros ?? []).filter((m: any) => m.grupo_id === data.grupoId).map((m: any) => m.user_id),
      );
      ids = ids.filter((id) => set.has(id));
    }
    if (!ids.length) return { filas: [], grupos: [] };

    const { data: grupos } = await context.supabase.from("grupos").select("id, nombre");
    const nombreGrupo = new Map((grupos ?? []).map((g: any) => [g.id as string, g.nombre as string]));

    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, cedula, nombres, institucion, genero, avatar_url")
      .in("id", ids);
    const { data: resp } = await context.supabase
      .from("respuestas")
      .select("user_id, correcta")
      .in("user_id", ids);
    const { data: sesP } = await context.supabase
      .from("sesiones_practica")
      .select("user_id, total_preguntas, correctas, puntaje_ineval, tiempo_segundos, finalizada_en")
      .in("user_id", ids);
    const { data: con } = await context.supabase
      .from("sesiones_conexion")
      .select("user_id, segundos_visible, segundos_oculto, segundos_interaccion, ultimo_heartbeat")
      .in("user_id", ids);
    const { data: enc } = await context.supabase
      .from("encuesta_respuestas")
      .select("user_id")
      .in("user_id", ids);

    const aggResp = new Map<string, { tot: number; ok: number }>();
    for (const r of resp ?? []) {
      const a = aggResp.get(r.user_id) ?? { tot: 0, ok: 0 };
      a.tot += 1;
      if (r.correcta) a.ok += 1;
      aggResp.set(r.user_id, a);
    }
    const aggSes = new Map<string, { n: number; mejor: number; tiempoPractica: number; ultima: string | null }>();
    for (const s of sesP ?? []) {
      const a = aggSes.get(s.user_id) ?? { n: 0, mejor: 0, tiempoPractica: 0, ultima: null };
      a.n += 1;
      const pct = s.total_preguntas ? (s.correctas / s.total_preguntas) * 100 : 0;
      const punt = s.puntaje_ineval ?? Math.round(pct * 10) / 10;
      if (punt > a.mejor) a.mejor = punt;
      a.tiempoPractica += s.tiempo_segundos ?? 0;
      if (s.finalizada_en && (!a.ultima || s.finalizada_en > a.ultima)) a.ultima = s.finalizada_en;
      aggSes.set(s.user_id, a);
    }
    const aggCon = new Map<string, { total: number; interaccion: number; ultimo: string | null }>();
    for (const c of con ?? []) {
      const a = aggCon.get(c.user_id) ?? { total: 0, interaccion: 0, ultimo: null };
      a.total += (c.segundos_visible ?? 0) + (c.segundos_oculto ?? 0);
      a.interaccion += c.segundos_interaccion ?? 0;
      if (c.ultimo_heartbeat && (!a.ultimo || c.ultimo_heartbeat > a.ultimo)) a.ultimo = c.ultimo_heartbeat;
      aggCon.set(c.user_id, a);
    }
    const aggEnc = new Map<string, number>();
    for (const e of enc ?? []) aggEnc.set(e.user_id, (aggEnc.get(e.user_id) ?? 0) + 1);

    const ahora = Date.now();
    const filas = (profs ?? []).map((p: any) => {
      const r = aggResp.get(p.id) ?? { tot: 0, ok: 0 };
      const s = aggSes.get(p.id) ?? { n: 0, mejor: 0, tiempoPractica: 0, ultima: null };
      const c = aggCon.get(p.id) ?? { total: 0, interaccion: 0, ultimo: null };
      const precision = r.tot ? (r.ok / r.tot) * 100 : 0;
      const horas = c.total / 3600;
      // Puntaje del podio: precisión (40) + volumen (30) + constancia de tiempo (20) + mejor puntaje (10)
      const volumen = Math.min(1, r.tot / 300);
      const tiempo = Math.min(1, horas / 20);
      const puntajePodio =
        (precision / 100) * 40 + volumen * 30 + tiempo * 20 + (Math.min(100, s.mejor) / 100) * 10;
      return {
        id: p.id as string,
        cedula: p.cedula as string,
        nombres: p.nombres as string,
        institucion: p.institucion as string,
        genero: p.genero as string | null,
        avatar_url: (p.avatar_url as string | null) ?? null,
        grupos: (gruposPorUser.get(p.id) ?? []).map((g) => nombreGrupo.get(g) ?? "—"),
        segundos_plataforma: c.total,
        segundos_interaccion: c.interaccion,
        segundos_practica: s.tiempoPractica,
        preguntas_resueltas: r.tot,
        correctas: r.ok,
        precision_pct: Math.round(precision * 10) / 10,
        sesiones: s.n,
        mejor_puntaje: Math.round(s.mejor * 10) / 10,
        encuesta_respondidas: aggEnc.get(p.id) ?? 0,
        ultima_practica: s.ultima,
        en_vivo: c.ultimo ? ahora - new Date(c.ultimo).getTime() < 90_000 : false,
        puntaje_podio: Math.round(puntajePodio * 10) / 10,
      };
    });

    return { filas, grupos: (grupos ?? []).map((g: any) => ({ id: g.id, nombre: g.nombre })) };
  });
