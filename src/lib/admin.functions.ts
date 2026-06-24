import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { validarCedulaEcuatoriana, cedulaToEmail } from "@/lib/cedula";

const TEMP_PASSWORD = "123*789*h";

// ¿Existe al menos un administrador?
export const existeAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "administrador");
  if (error) throw new Error(error.message);
  return { existe: (count ?? 0) > 0 };
});

// Bootstrap: crear primer admin. Solo permitido si NO existe ningún admin.
const adminInicialSchema = z.object({
  cedula: z.string().length(10),
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

// Crear estudiante (solo admin). Contraseña temporal fija.
const crearEstudianteSchema = z.object({
  cedula: z.string().length(10),
  nombres: z.string().min(2).max(120),
  institucion: z.string().min(1).max(160),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const crearEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => crearEstudianteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");

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
      primera_vez: true,
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

// Reset password (solo admin) → temporal + primera_vez=true
export const resetPasswordEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: TEMP_PASSWORD,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ primera_vez: true }).eq("id", data.userId);
    return { ok: true, passwordTemporal: TEMP_PASSWORD };
  });

// Eliminar estudiante (solo admin)
export const eliminarEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Actualizar perfil de estudiante (solo admin)
const editarSchema = z.object({
  userId: z.string().uuid(),
  nombres: z.string().min(2).max(120),
  institucion: z.string().min(1).max(160),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const editarEstudianteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");
    const { error } = await context.supabase
      .from("profiles")
      .update({
        nombres: data.nombres,
        institucion: data.institucion,
        fecha_nacimiento: data.fechaNacimiento,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Listar estudiantes (solo admin)
export const listarEstudiantesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, cedula, nombres, institucion, fecha_nacimiento, primera_vez, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Filtrar al propio admin de la lista de "estudiantes": traer solo cuentas con rol estudiante
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const estudianteIds = new Set(
      (roles ?? []).filter((r) => r.role === "estudiante").map((r) => r.user_id),
    );
    return (data ?? []).filter((p) => estudianteIds.has(p.id));
  });
