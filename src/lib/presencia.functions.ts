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

// ---------- Auto-cierre de sesiones huérfanas ----------
// Marca finalizadas todas las sesiones cuyo último heartbeat sea > STALE segundos.
const STALE_SECONDS = 120;
async function cerrarSesionesHuerfanas(supabase: any) {
  const stale = new Date(Date.now() - STALE_SECONDS * 1000).toISOString();
  const { data: viejas } = await supabase
    .from("sesiones_conexion")
    .select("id, user_id, ultimo_heartbeat")
    .eq("finalizada", false)
    .lt("ultimo_heartbeat", stale)
    .limit(500);
  if (!viejas || viejas.length === 0) return [] as any[];
  await supabase
    .from("sesiones_conexion")
    .update({ finalizada: true, finalizada_en: new Date().toISOString() })
    .in("id", viejas.map((v: any) => v.id));
  // Registra alertas de desconexión inesperada
  const alerts = viejas.map((v: any) => ({
    user_id: v.user_id,
    sesion_id: v.id,
    tipo: "desconexion" as const,
    detalle: `Sesión cerrada por inactividad de heartbeat (>${STALE_SECONDS}s).`,
  }));
  await supabase.from("alertas_presencia").upsert(alerts, {
    onConflict: "sesion_id,tipo",
    ignoreDuplicates: true,
  });
  return viejas;
}

// ---------- Vista admin: en vivo + generación de alertas ----------
export const listarPresenciaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context);
    await cerrarSesionesHuerfanas(context.supabase);
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
    // Detectar y persistir alertas nuevas (segundo plano prolongado / inactividad)
    const now = Date.now();
    const nuevasAlertas: any[] = [];
    for (const s of sesiones ?? []) {
      const segOculto = s.segundos_oculto ?? 0;
      const segSinInter = Math.floor(
        (now - new Date(s.ultima_interaccion ?? s.iniciada_en).getTime()) / 1000,
      );
      if (!s.visible && segOculto > 180) {
        nuevasAlertas.push({
          user_id: s.user_id,
          sesion_id: s.id,
          tipo: "segundo_plano",
          detalle: `Segundo plano ${Math.round(segOculto / 60)} min`,
        });
      }
      if (segSinInter > 300) {
        nuevasAlertas.push({
          user_id: s.user_id,
          sesion_id: s.id,
          tipo: "inactivo",
          detalle: `Sin interacción ${Math.round(segSinInter / 60)} min`,
        });
      }
    }
    if (nuevasAlertas.length) {
      await context.supabase.from("alertas_presencia").upsert(nuevasAlertas, {
        onConflict: "sesion_id,tipo",
        ignoreDuplicates: true,
      });
    }
    return (sesiones ?? []).map((s: any) => ({
      ...s,
      profile: perfiles.get(s.user_id) ?? null,
    }));
  });

// ---------- Historial de alertas ----------
export const listarAlertasPresenciaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context);
    await cerrarSesionesHuerfanas(context.supabase);
    const { data: alertas, error } = await context.supabase
      .from("alertas_presencia")
      .select("id, user_id, sesion_id, tipo, detalle, disparada_en, resuelta_en")
      .order("disparada_en", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((alertas ?? []).map((a: any) => a.user_id)));
    let perfiles = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, cedula, nombres")
        .in("id", ids);
      perfiles = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    return (alertas ?? []).map((a: any) => ({ ...a, profile: perfiles.get(a.user_id) ?? null }));
  });

export const resolverAlertaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase
      .from("alertas_presencia")
      .update({ resuelta_en: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
export const calificacionesEstudiantesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ periodoId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await ensureStaff(context);
    const { notasUsuario, obtenerPeriodo, leerTodas } = await import('./calificacion-periodo.server');
    const periodo = await obtenerPeriodo(context.supabase, data.periodoId);
    const { data: roles, error: er } = await context.supabase.from('user_roles').select('user_id,role');
    if (er) throw new Error(er.message);
    let ids = (roles ?? []).filter(r => r.role === 'estudiante').map(r => r.user_id);
    if (periodo) {
      const { data: miembros, error } = await context.supabase.from('grupo_estudiantes').select('user_id').eq('grupo_id', periodo.grupo_id);
      if (error) throw new Error(error.message);
      const grupo = new Set((miembros ?? []).map(m => m.user_id));
      ids = ids.filter(id => grupo.has(id));
    }
    if (!ids.length) return [];
    const profs = await leerTodas<{ id: string; cedula: string; nombres: string; institucion: string; genero: string | null }>(() => context.supabase.from('profiles').select('id,cedula,nombres,institucion,genero').in('id', ids).order('id'));
    const filas = [];
    // Bound concurrent requests for large groups.
    for (let i = 0; i < profs.length; i += 8) {
      const lote = await Promise.all(profs.slice(i, i + 8).map(async p => {
        const n = await notasUsuario(context.supabase, p.id, periodo);
        const ok = n.respuestas.filter(r => r.correcta).length;
        return { ...p, total_respuestas: n.respuestas.length, correctas: ok,
          precision_pct: n.respuestas.length ? Math.round(ok / n.respuestas.length * 1000) / 10 : 0,
          sesiones_practica: n.sesiones.length, horas_activas: n.horasActivas,
          nota: n.global.nota, global: n.global, periodo, tiempoHistoricoIncompleto: n.tiempoHistoricoIncompleto,
          notas: Object.fromEntries(n.asignaturas.map(a => [a.clave, a.nota])),
          notasDetalle: n.asignaturas.map(a => ({ clave: a.clave, nota: a.nota, simulacros: a.simulacros })),
        };
      }));
      filas.push(...lote);
    }
    return filas;
  });

// ---------- Tiempo desde la última conexión previa (ventana de reencuentro) ----------
export const ultimaAusenciaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const corte = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data } = await context.supabase
      .from("sesiones_conexion")
      .select("ultimo_heartbeat")
      .eq("user_id", context.userId)
      .lt("ultimo_heartbeat", corte)
      .order("ultimo_heartbeat", { ascending: false })
      .limit(1);
    const ultima = data?.[0]?.ultimo_heartbeat as string | undefined;
    if (!ultima) return { ultima: null as string | null, horas: 0 };
    const horas = (Date.now() - new Date(ultima).getTime()) / 36e5;
    return { ultima, horas: Math.round(horas * 10) / 10 };
  });
