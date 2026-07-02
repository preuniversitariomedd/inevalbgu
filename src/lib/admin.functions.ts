import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { validarCedulaEcuatoriana, cedulaToEmail } from "@/lib/cedula";

const TEMP_PASSWORD = "123*789*h";
const GENERO = z.enum(["masculino", "femenino", "otro"]);

// ---------- Helpers internos ----------
async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrador",
  });
  if (!data) throw new Error("Solo administradores.");
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

// ---------- Bootstrap ----------
export const existeAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "administrador");
  if (error) throw new Error(error.message);
  return { existe: (count ?? 0) > 0 };
});

const adminInicialSchema = z.object({
  cedula: z.string().min(6).max(20),
  nombres: z.string().min(2).max(120),
  password: z.string().min(8),
});

export const crearAdminInicialFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminInicialSchema.parse(d))
  .handler(async ({ data }) => {
    const v = validarCedulaEcuatoriana(data.cedula);
    if (!v.valida) throw new Error(v.error!);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "administrador");
    if ((count ?? 0) > 0) throw new Error("Ya existe un administrador.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: cedulaToEmail(data.cedula),
      password: data.password,
      email_confirm: true,
      user_metadata: { cedula: data.cedula, nombres: data.nombres },
    });
    if (error || !created.user) throw new Error(error?.message ?? "No se pudo crear usuario.");
    const userId = created.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const { error: pe } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      cedula: data.cedula,
      nombres: data.nombres,
      institucion: "Administración",
      fecha_nacimiento: today,
      primera_vez: false,
    });
    if (pe) throw new Error(pe.message);
    const { error: re } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "administrador" });
    if (re) throw new Error(re.message);
    return { ok: true, userId };
  });

// ---------- Crear / editar estudiante ----------
const crearEstudianteSchema = z.object({
  cedula: z.string().min(6).max(20),
  nombres: z.string().min(2).max(120),
  institucion: z.string().min(1).max(160),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genero: GENERO,
});

export const crearEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => crearEstudianteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const v = validarCedulaEcuatoriana(data.cedula);
    if (!v.valida) throw new Error(v.error!);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: cedulaToEmail(data.cedula),
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { cedula: data.cedula, nombres: data.nombres },
    });
    if (error || !created.user) throw new Error(error?.message ?? "No se pudo crear usuario.");
    const userId = created.user.id;
    const { error: pe } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      cedula: data.cedula,
      nombres: data.nombres,
      institucion: data.institucion,
      fecha_nacimiento: data.fechaNacimiento,
      genero: data.genero,
      primera_vez: true,
      creado_por: context.userId,
    });
    if (pe) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(pe.message);
    }
    const { error: re } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "estudiante" });
    if (re) throw new Error(re.message);
    return { ok: true, userId, cedula: data.cedula, passwordTemporal: TEMP_PASSWORD };
  });

export const resetPasswordEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: TEMP_PASSWORD,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ primera_vez: true }).eq("id", data.userId);
    return { ok: true, passwordTemporal: TEMP_PASSWORD };
  });

export const eliminarEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Solo administradores pueden eliminar definitivamente
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const editarSchema = z.object({
  userId: z.string().uuid(),
  nombres: z.string().min(2).max(120),
  institucion: z.string().min(1).max(160),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genero: GENERO,
});

export const editarEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editarSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({
        nombres: data.nombres,
        institucion: data.institucion,
        fecha_nacimiento: data.fechaNacimiento,
        genero: data.genero,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleBloqueoEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), bloqueado: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase
      .from("profiles")
      .update({ bloqueado: data.bloqueado })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    if (data.bloqueado) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.admin.signOut(data.userId).catch(() => {});
    }
    return { ok: true };
  });

// ---------- Listar estudiantes con género y grupos ----------
export const listarEstudiantesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select(
        "id, cedula, nombres, institucion, fecha_nacimiento, genero, primera_vez, bloqueado, created_at, creado_por",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const estudianteIds = new Set(
      (roles ?? []).filter((r: any) => r.role === "estudiante").map((r: any) => r.user_id),
    );
    const estudiantes = (profiles ?? []).filter((p: any) => estudianteIds.has(p.id));

    const { data: vinculos } = await context.supabase
      .from("grupo_estudiantes")
      .select("grupo_id, user_id");
    const { data: grupos } = await context.supabase.from("grupos").select("id, nombre");
    const mapGrupo = new Map((grupos ?? []).map((g: any) => [g.id, g.nombre]));
    const byUser = new Map<string, { id: string; nombre: string }[]>();
    for (const v of vinculos ?? []) {
      const arr = byUser.get(v.user_id) ?? [];
      const nombre = mapGrupo.get(v.grupo_id);
      if (nombre) arr.push({ id: v.grupo_id, nombre });
      byUser.set(v.user_id, arr);
    }
    // Resolver quién creó a cada estudiante
    const creadorIds = Array.from(
      new Set(estudiantes.map((e: any) => e.creado_por).filter(Boolean)),
    ) as string[];
    let creadores = new Map<string, string>();
    if (creadorIds.length) {
      const { data: creadorProfs } = await context.supabase
        .from("profiles")
        .select("id, nombres")
        .in("id", creadorIds);
      creadores = new Map((creadorProfs ?? []).map((p: any) => [p.id, p.nombres]));
    }
    return estudiantes.map((e: any) => ({
      ...e,
      grupos: byUser.get(e.id) ?? [],
      creado_por_nombre: e.creado_por ? creadores.get(e.creado_por) ?? null : null,
    }));
  });

// ---------- Progreso por alumno (staff) ----------
export const obtenerProgresoAlumnoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select(
        "id, cedula, nombres, institucion, fecha_nacimiento, genero, primera_vez, bloqueado, created_at, creado_por",
      )
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Estudiante no encontrado.");
    let creado_por_nombre: string | null = null;
    if (profile.creado_por) {
      const { data: cp } = await context.supabase
        .from("profiles")
        .select("nombres")
        .eq("id", profile.creado_por)
        .maybeSingle();
      creado_por_nombre = cp?.nombres ?? null;
    }
    (profile as any).creado_por_nombre = creado_por_nombre;
    const { data: respuestas } = await context.supabase
      .from("respuestas")
      .select("pregunta_id, area, subtema, nivel, correcta, respondida_en")
      .eq("user_id", data.userId)
      .order("respondida_en", { ascending: false })
      .limit(5000);
    const { data: sesiones } = await context.supabase
      .from("sesiones_practica")
      .select(
        "id, tipo, area, total_preguntas, correctas, iniciada_en, finalizada_en, puntaje_ineval, nivel_logro",
      )
      .eq("user_id", data.userId)
      .order("iniciada_en", { ascending: false })
      .limit(500);
    return {
      profile,
      respuestas: respuestas ?? [],
      sesiones: sesiones ?? [],
    };
  });

// ---------- Grupos ----------
export const listarGruposFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureStaff(context);
    const { data: grupos, error } = await context.supabase
      .from("grupos")
      .select("id, nombre, descripcion, created_at")
      .order("nombre");
    if (error) throw new Error(error.message);
    const { data: vinc } = await context.supabase
      .from("grupo_estudiantes")
      .select("grupo_id, user_id");
    const counts = new Map<string, number>();
    for (const v of vinc ?? []) counts.set(v.grupo_id, (counts.get(v.grupo_id) ?? 0) + 1);
    return (grupos ?? []).map((g: any) => ({ ...g, total: counts.get(g.id) ?? 0 }));
  });

export const crearGrupoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ nombre: z.string().min(1).max(80), descripcion: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase
      .from("grupos")
      .insert({ nombre: data.nombre.trim(), descripcion: data.descripcion ?? null, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const eliminarGrupoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ grupoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase.from("grupos").delete().eq("id", data.grupoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const asignarEstudiantesAGrupoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        grupoId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const rows = data.userIds.map((uid) => ({ grupo_id: data.grupoId, user_id: uid }));
    const { error } = await context.supabase
      .from("grupo_estudiantes")
      .upsert(rows, { onConflict: "grupo_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true, total: rows.length };
  });

export const quitarEstudianteDeGrupoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ grupoId: z.string().uuid(), userId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase
      .from("grupo_estudiantes")
      .delete()
      .eq("grupo_id", data.grupoId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Roles (solo admin) ----------
export const listarPersonalFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, cedula, nombres, institucion, created_at");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    }
    return (profiles ?? []).map((p: any) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
  });

export const cambiarRolFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        rol: z.enum(["administrador", "docente", "estudiante"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.userId === context.userId && data.rol !== "administrador") {
      throw new Error("No puedes quitarte tu propio rol de administrador.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Reemplaza el conjunto de roles del usuario por uno solo (modelo simple)
    const { error: del } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (del) throw new Error(del.message);
    const { error: ins } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.rol });
    if (ins) throw new Error(ins.message);
    return { ok: true };
  });

// ---------- Branding (admin) ----------
export const obtenerBrandingFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_branding")
    .select("logo_url, hero_url, titulo, subtitulo, updated_at")
    .eq("id", true)
    .maybeSingle();
  // Si hay paths (objetos en storage), generamos signed URLs
  async function resolve(p: string | null) {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    const { data: signed } = await supabaseAdmin.storage
      .from("branding")
      .createSignedUrl(p, 60 * 60 * 24 * 7);
    return signed?.signedUrl ?? null;
  }
  const logo = await resolve(data?.logo_url ?? null);
  const hero = await resolve(data?.hero_url ?? null);
  return {
    logo_url: logo,
    hero_url: hero,
    titulo: data?.titulo ?? null,
    subtitulo: data?.subtitulo ?? null,
  };
});

export const actualizarBrandingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        titulo: z.string().max(120).nullable().optional(),
        subtitulo: z.string().max(280).nullable().optional(),
        logoBase64: z.string().nullable().optional(),
        logoContentType: z.string().nullable().optional(),
        heroBase64: z.string().nullable().optional(),
        heroContentType: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updates: {
      updated_by: string;
      titulo?: string | null;
      subtitulo?: string | null;
      logo_url?: string | null;
      hero_url?: string | null;
    } = { updated_by: context.userId };
    if (data.titulo !== undefined) updates.titulo = data.titulo;
    if (data.subtitulo !== undefined) updates.subtitulo = data.subtitulo;

    async function uploadIfPresent(
      field: "logo_url" | "hero_url",
      base64?: string | null,
      ct?: string | null,
    ) {
      if (!base64) return;
      const buf = Buffer.from(base64, "base64");
      const ext = (ct ?? "image/png").split("/")[1] ?? "png";
      const path = `${field}-${Date.now()}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from("branding")
        .upload(path, buf, { contentType: ct ?? "image/png", upsert: true });
      if (error) throw new Error(error.message);
      updates[field] = path;
    }
    await uploadIfPresent("logo_url", data.logoBase64, data.logoContentType);
    await uploadIfPresent("hero_url", data.heroBase64, data.heroContentType);

    const { error } = await supabaseAdmin
      .from("app_branding")
      .update(updates)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

