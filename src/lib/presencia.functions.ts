import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function detectarDispositivo(ua: string | null | undefined): "mobile" | "tablet" | "desktop" {
  const s = (ua ?? "").toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/.test(s)) return "mobile";
  return "desktop";
}

async function ensureStaff(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrador",
  });
  const { data: isDocente } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "docente",
  });
  if (!isAdmin && !isDocente) throw new Error("Solo personal autorizado.");
  return { isAdmin: !!isAdmin, isDocente: !!isDocente };
}

// ---------- Iniciar sesión de conexión (heartbeat) ----------
export const iniciarSesionConexionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userAgent: z.string().max(500).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ua = data.userAgent ?? getRequestHeader("user-agent") ?? "";
    const dispositivo = detectarDispositivo(ua);
    let ip = "";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "";
    } catch {
      ip = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    }
    const now = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("sesiones_conexion")
      .insert({
        user_id: context.userId,
        user_agent: ua.slice(0, 500),
        dispositivo,
        ip,
        visible: true,
        iniciada_en: now,
        ultimo_heartbeat: now,
        ultima_interaccion: now,
        segundos_visible: 0,
        segundos_oculto: 0,
        segundos_interaccion: 0,
        finalizada: false,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const hbSchema = z.object({
  id: z.string().uuid(),
  visible: z.boolean(),
  deltaVisible: z.number().int().min(0).max(600),
  deltaOculto: z.number().int().min(0).max(600),
  deltaInteraccion: z.number().int().min(0).max(600),
  interactuo: z.boolean().optional(),
});

export const heartbeatSesionConexionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => hbSchema.parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: cur, error: ge } = await context.supabase
      .from("sesiones_conexion")
      .select("segundos_visible, segundos_oculto, segundos_interaccion, ultima_interaccion")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (ge) throw new Error(ge.message);
    if (!cur) throw new Error("Sesión no encontrada.");
    const upd = {
      ultimo_heartbeat: now,
      visible: data.visible,
      segundos_visible: (cur.segundos_visible ?? 0) + data.deltaVisible,
      segundos_oculto: (cur.segundos_oculto ?? 0) + data.deltaOculto,
      segundos_interaccion: (cur.segundos_interaccion ?? 0) + data.deltaInteraccion,
      ...(data.interactuo ? { ultima_interaccion: now } : {}),
    };
    const { error } = await context.supabase
      .from("sesiones_conexion")
      .update(upd)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finalizarSesionConexionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sesiones_conexion")
      .update({ finalizada: true, finalizada_en: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Vista admin: en vivo + alertas ----------
export const listarPresenciaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context);
    const desde = new Date(Date.now() - 90_000).toISOString(); // último heartbeat < 90s = en vivo
    const { data: sesiones, error } = await context.supabase
      .from("sesiones_conexion")
      .select(
        "id, user_id, iniciada_en, ultimo_heartbeat, ultima_interaccion, segundos_visible, segundos_oculto, segundos_interaccion, visible, user_agent, dispositivo, ip",
      )
      .eq("finalizada", false)
      .gte("ultimo_heartbeat", desde)
      .order("iniciada_en", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((sesiones ?? []).map((s: any) => s.user_id)));
    let perfiles = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, cedula, nombres, institucion")
        .in("id", ids);
      perfiles = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    return (sesiones ?? []).map((s: any) => ({
      ...s,
      profile: perfiles.get(s.user_id) ?? null,
    }));
  });

// ---------- Historial de conexiones por estudiante ----------
export const historialConexionesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), limite: z.number().int().min(1).max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { data: rows, error } = await context.supabase
      .from("sesiones_conexion")
      .select(
        "id, iniciada_en, ultimo_heartbeat, finalizada_en, finalizada, segundos_visible, segundos_oculto, segundos_interaccion, dispositivo, ip, user_agent",
      )
      .eq("user_id", data.userId)
      .order("iniciada_en", { ascending: false })
      .limit(data.limite ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Calificaciones agregadas para export ----------
export const calificacionesEstudiantesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const estIds = new Set((roles ?? []).filter((r: any) => r.role === "estudiante").map((r: any) => r.user_id));
    if (estIds.size === 0) return [];
    const ids = Array.from(estIds);
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, cedula, nombres, institucion, genero")
      .in("id", ids);

    const { data: resp } = await context.supabase
      .from("respuestas")
      .select("user_id, correcta")
      .in("user_id", ids);
    const { data: ses } = await context.supabase
      .from("sesiones_practica")
      .select("user_id, total_preguntas, correctas")
      .in("user_id", ids);
    const { data: con } = await context.supabase
      .from("sesiones_conexion")
      .select("user_id, segundos_interaccion")
      .in("user_id", ids);

    const aggResp = new Map<string, { tot: number; ok: number }>();
    for (const r of resp ?? []) {
      const a = aggResp.get(r.user_id) ?? { tot: 0, ok: 0 };
      a.tot += 1;
      if (r.correcta) a.ok += 1;
      aggResp.set(r.user_id, a);
    }
    const aggSes = new Map<string, number>();
    for (const s of ses ?? []) aggSes.set(s.user_id, (aggSes.get(s.user_id) ?? 0) + 1);
    const aggTime = new Map<string, number>();
    for (const c of con ?? []) aggTime.set(c.user_id, (aggTime.get(c.user_id) ?? 0) + (c.segundos_interaccion ?? 0));

    return (profs ?? []).map((p: any) => {
      const r = aggResp.get(p.id) ?? { tot: 0, ok: 0 };
      const sesN = aggSes.get(p.id) ?? 0;
      const tInt = aggTime.get(p.id) ?? 0;
      const precision = r.tot ? (r.ok / r.tot) * 100 : 0;
      // Calificación 0-10:
      // 60% precisión, 25% constancia (log10(sesiones+1)/log10(21) → cap 20 sesiones=100%),
      // 15% tiempo activo (min(horas,20)/20 → 100%)
      const constancia = Math.min(1, Math.log10(sesN + 1) / Math.log10(21));
      const tiempo = Math.min(1, tInt / 3600 / 20);
      const nota = (precision / 100) * 6 + constancia * 2.5 + tiempo * 1.5;
      return {
        id: p.id,
        cedula: p.cedula,
        nombres: p.nombres,
        institucion: p.institucion,
        genero: p.genero,
        total_respuestas: r.tot,
        correctas: r.ok,
        precision_pct: Math.round(precision * 10) / 10,
        sesiones_practica: sesN,
        horas_activas: Math.round((tInt / 3600) * 10) / 10,
        nota: Math.round(nota * 10) / 10,
      };
    });
  });
