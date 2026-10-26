import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
];

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

// ============ Listado para el usuario actual ============
export const listarTareasFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'tareas');
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "administrador" });
    const { data: isDocente } = await supabase.rpc("has_role", { _user_id: userId, _role: "docente" });

    let query = supabase
      .from("tareas")
      .select("id, titulo, descripcion, descripcion_html, youtube_url, creador_id, creador_rol, created_at, programada_para, categoria")
      .order("created_at", { ascending: false });

    if (isAdmin || isDocente) {
      query = query.eq("creador_id", userId);
    }
    const { data: tareasRaw, error } = await query;
    if (error) throw new Error(error.message);

    const now = new Date();
    const tareas = (isAdmin || isDocente)
      ? (tareasRaw ?? [])
      : (tareasRaw ?? []).filter((t: any) => !t.programada_para || new Date(t.programada_para) <= now);

    const ids = tareas.map((t: any) => t.id);
    if (ids.length === 0) return [];

    const [{ data: adjs }, { data: grs }, { data: vistas }, { data: creadores }] = await Promise.all([
      supabase.from("tarea_adjuntos").select("id, tarea_id, path, nombre, mime, tamano").in("tarea_id", ids),
      supabase.from("tarea_grupos").select("tarea_id, grupo_id, grupos(nombre)").in("tarea_id", ids),
      supabase.from("tarea_vistas").select("tarea_id, user_id, created_at").in("tarea_id", ids),
      supabase
        .from("profiles")
        .select("id, nombres")
        .in("id", Array.from(new Set(tareas.map((t: any) => t.creador_id)))),
    ]);

    let vistoresMap = new Map<string, string>();
    if (isAdmin || isDocente) {
      const vids = Array.from(new Set((vistas ?? []).map((v: any) => v.user_id)));
      if (vids.length) {
        const { data: perfs } = await supabase.from("profiles").select("id, nombres").in("id", vids);
        vistoresMap = new Map((perfs ?? []).map((p: any) => [p.id, p.nombres]));
      }
    }

    const creadorMap = new Map((creadores ?? []).map((c: any) => [c.id, c.nombres]));

    return tareas.map((t: any) => {
      const misAdjs = (adjs ?? []).filter((a: any) => a.tarea_id === t.id);
      const misGrs = (grs ?? []).filter((g: any) => g.tarea_id === t.id);
      const misVis = (vistas ?? []).filter((v: any) => v.tarea_id === t.id);
      const yoVi = misVis.some((v: any) => v.user_id === userId);
      return {
        ...t,
        creador_nombre: creadorMap.get(t.creador_id) ?? "",
        adjuntos: misAdjs,
        grupos: misGrs.map((g: any) => ({ id: g.grupo_id, nombre: g.grupos?.nombre })),
        total_vistas: misVis.length,
        visto_por_mi: yoVi,
        vistas_detalle: (isAdmin || isDocente)
          ? misVis.map((v: any) => ({
              user_id: v.user_id,
              nombres: vistoresMap.get(v.user_id) ?? "—",
              visto_at: v.created_at,
            }))
          : undefined,
      };
    });
  });

// ============ Contador de tareas sin ver (estudiantes) ============
export const contarTareasPendientesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "administrador" });
    const { data: isDocente } = await supabase.rpc("has_role", { _user_id: userId, _role: "docente" });
    if (isAdmin || isDocente) return { total: 0 };

    const { data: tareas } = await supabase.from("tareas").select("id, programada_para");
    const now = new Date();
    const ids = (tareas ?? [])
      .filter((t: any) => !t.programada_para || new Date(t.programada_para) <= now)
      .map((t: any) => t.id);
    if (ids.length === 0) return { total: 0 };
    const { data: vistas } = await supabase
      .from("tarea_vistas")
      .select("tarea_id")
      .eq("user_id", userId)
      .in("tarea_id", ids);
    const vistasSet = new Set((vistas ?? []).map((v: any) => v.tarea_id));
    return { total: ids.filter((id: string) => !vistasSet.has(id)).length };
  });

// ============ Marcar tarea como vista ============
export const marcarTareaVistaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tareaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'tareas');
    await context.supabase
      .from("tarea_vistas")
      .upsert({ tarea_id: data.tareaId, user_id: context.userId }, { onConflict: "tarea_id,user_id" });
    return { ok: true };
  });

// ============ Grupos que el usuario puede usar al crear ============
export const gruposDisponiblesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await ensureStaff(context);
    if (isAdmin) {
      const { data } = await supabase.from("grupos").select("id, nombre").order("nombre");
      return data ?? [];
    }
    const { data: permitidos } = await supabase
      .from("docente_grupos_permitidos")
      .select("grupo_id")
      .eq("docente_id", userId);
    const ids = (permitidos ?? []).map((p: any) => p.grupo_id);
    if (ids.length === 0) return [];
    const { data } = await supabase.from("grupos").select("id, nombre").in("id", ids).order("nombre");
    return data ?? [];
  });

// ============ Crear tarea ============
const crearSchema = z.object({
  titulo: z.string().min(2).max(150),
  descripcion: z.string().max(4000).optional().nullable(),
  descripcion_html: z.string().max(20000).optional().nullable(),
  categoria: z.string().max(80).optional().nullable(),
  programada_para: z.string().datetime().optional().nullable(),
  youtube_url: z.string().max(500).optional().nullable(),
  grupoIds: z.array(z.string().uuid()).min(1, "Selecciona al menos un grupo."),
  adjuntos: z
    .array(
      z.object({
        nombre: z.string().min(1).max(200),
        mime: z.string().min(1).max(150),
        base64: z.string().min(1),
      }),
    )
    .max(10)
    .optional()
    .default([]),
});

export const crearTareaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => crearSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await ensureStaff(context);

    if (!isAdmin) {
      const { data: permit } = await supabase
        .from("docente_grupos_permitidos")
        .select("grupo_id")
        .eq("docente_id", userId)
        .in("grupo_id", data.grupoIds);
      const allowed = new Set((permit ?? []).map((p: any) => p.grupo_id));
      const invalid = data.grupoIds.filter((g) => !allowed.has(g));
      if (invalid.length) throw new Error("No tienes permiso sobre uno o más grupos seleccionados.");
    }

    let ytUrl = data.youtube_url?.trim() || null;
    if (ytUrl && !/youtube\.com|youtu\.be/i.test(ytUrl)) throw new Error("Enlace de YouTube inválido.");

    const { data: nueva, error } = await supabase
      .from("tareas")
      .insert({
        creador_id: userId,
        creador_rol: isAdmin ? "administrador" : "docente",
        titulo: data.titulo.trim(),
        descripcion: data.descripcion?.trim() || null,
        descripcion_html: data.descripcion_html?.trim() || null,
        categoria: data.categoria?.trim() || null,
        programada_para: data.programada_para || null,
        youtube_url: ytUrl,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const tareaId = nueva.id;
    const rows = data.grupoIds.map((gid) => ({ tarea_id: tareaId, grupo_id: gid }));
    if (rows.length) await supabase.from("tarea_grupos").insert(rows);

    if (data.adjuntos && data.adjuntos.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const f of data.adjuntos) {
        if (!ALLOWED_MIME.includes(f.mime)) throw new Error(`Tipo no permitido: ${f.mime}`);
        const b64 = f.base64.includes(",") ? f.base64.split(",")[1] : f.base64;
        const bytes = Buffer.from(b64, "base64");
        if (bytes.length > 25 * 1024 * 1024) throw new Error(`"${f.nombre}" excede 25 MB.`);
        const ext = f.nombre.includes(".") ? f.nombre.split(".").pop() : "bin";
        const path = `${tareaId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("tareas")
          .upload(path, bytes, { contentType: f.mime, upsert: false });
        if (upErr) throw new Error(upErr.message);
        await supabase
          .from("tarea_adjuntos")
          .insert({ tarea_id: tareaId, path, nombre: f.nombre, mime: f.mime, tamano: bytes.length });
      }
    }
    return { ok: true, id: tareaId };
  });

// ============ Editar tarea ============
const editarSchema = z.object({
  tareaId: z.string().uuid(),
  titulo: z.string().min(2).max(150),
  descripcion: z.string().max(4000).optional().nullable(),
  descripcion_html: z.string().max(20000).optional().nullable(),
  categoria: z.string().max(80).optional().nullable(),
  programada_para: z.string().datetime().optional().nullable(),
  youtube_url: z.string().max(500).optional().nullable(),
  grupoIds: z.array(z.string().uuid()).min(1),
  adjuntosNuevos: z
    .array(z.object({ nombre: z.string(), mime: z.string(), base64: z.string() }))
    .max(10)
    .optional()
    .default([]),
  adjuntosBorrar: z.array(z.string().uuid()).optional().default([]),
});

export const editarTareaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await ensureStaff(context);

    const { data: t, error: tErr } = await supabase
      .from("tareas").select("id, creador_id").eq("id", data.tareaId).single();
    if (tErr || !t) throw new Error("Tarea no encontrada.");
    if (!isAdmin && t.creador_id !== userId) throw new Error("No puedes editar esta tarea.");

    if (!isAdmin) {
      const { data: permit } = await supabase
        .from("docente_grupos_permitidos")
        .select("grupo_id")
        .eq("docente_id", userId)
        .in("grupo_id", data.grupoIds);
      const allowed = new Set((permit ?? []).map((p: any) => p.grupo_id));
      const invalid = data.grupoIds.filter((g) => !allowed.has(g));
      if (invalid.length) throw new Error("No tienes permiso sobre uno o más grupos seleccionados.");
    }

    let ytUrl = data.youtube_url?.trim() || null;
    if (ytUrl && !/youtube\.com|youtu\.be/i.test(ytUrl)) throw new Error("Enlace de YouTube inválido.");

    const { error: uErr } = await supabase.from("tareas").update({
      titulo: data.titulo.trim(),
      descripcion: data.descripcion?.trim() || null,
      descripcion_html: data.descripcion_html?.trim() || null,
      categoria: data.categoria?.trim() || null,
      programada_para: data.programada_para || null,
      youtube_url: ytUrl,
    }).eq("id", data.tareaId);
    if (uErr) throw new Error(uErr.message);

    // Regenerar grupos destinatarios
    await supabase.from("tarea_grupos").delete().eq("tarea_id", data.tareaId);
    const rows = data.grupoIds.map((gid) => ({ tarea_id: data.tareaId, grupo_id: gid }));
    if (rows.length) await supabase.from("tarea_grupos").insert(rows);

    // Borrar adjuntos seleccionados
    if (data.adjuntosBorrar.length) {
      const { data: aBorr } = await supabase.from("tarea_adjuntos")
        .select("id, path").in("id", data.adjuntosBorrar);
      if (aBorr && aBorr.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from("tareas").remove(aBorr.map((a: any) => a.path));
        await supabase.from("tarea_adjuntos").delete().in("id", data.adjuntosBorrar);
      }
    }

    // Añadir nuevos adjuntos
    if (data.adjuntosNuevos && data.adjuntosNuevos.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const f of data.adjuntosNuevos) {
        if (!ALLOWED_MIME.includes(f.mime)) throw new Error(`Tipo no permitido: ${f.mime}`);
        const b64 = f.base64.includes(",") ? f.base64.split(",")[1] : f.base64;
        const bytes = Buffer.from(b64, "base64");
        if (bytes.length > 25 * 1024 * 1024) throw new Error(`"${f.nombre}" excede 25 MB.`);
        const ext = f.nombre.includes(".") ? f.nombre.split(".").pop() : "bin";
        const path = `${data.tareaId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("tareas")
          .upload(path, bytes, { contentType: f.mime, upsert: false });
        if (upErr) throw new Error(upErr.message);
        await supabase.from("tarea_adjuntos").insert({
          tarea_id: data.tareaId, path, nombre: f.nombre, mime: f.mime, tamano: bytes.length,
        });
      }
    }
    return { ok: true };
  });


// ============ URL firmada para descargar adjunto ============
export const urlAdjuntoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adjuntoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'tareas');
    const { data: adj, error } = await context.supabase
      .from("tarea_adjuntos")
      .select("path, mime, nombre")
      .eq("id", data.adjuntoId)
      .single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("tareas")
      .createSignedUrl(adj.path, 60 * 30);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, nombre: adj.nombre, mime: adj.mime };
  });

// ============ Borrar tarea ============
export const borrarTareaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tareaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS ya restringe a autor / admin
    const { data: adjs } = await context.supabase
      .from("tarea_adjuntos")
      .select("path")
      .eq("tarea_id", data.tareaId);
    if (adjs && adjs.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("tareas").remove(adjs.map((a: any) => a.path));
    }
    const { error } = await context.supabase.from("tareas").delete().eq("id", data.tareaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Permisos docente <-> grupos (solo admin) ============
export const listarPermisosDocentesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");
    const { data: docentesRoles } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "docente");
    const dids = (docentesRoles ?? []).map((r: any) => r.user_id);
    if (dids.length === 0) return { docentes: [], grupos: [], permisos: [] };
    const [{ data: profiles }, { data: grupos }, { data: permisos }] = await Promise.all([
      context.supabase.from("profiles").select("id, nombres, cedula").in("id", dids),
      context.supabase.from("grupos").select("id, nombre").order("nombre"),
      context.supabase.from("docente_grupos_permitidos").select("docente_id, grupo_id").in("docente_id", dids),
    ]);
    return { docentes: profiles ?? [], grupos: grupos ?? [], permisos: permisos ?? [] };
  });

export const setPermisoDocenteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ docenteId: z.string().uuid(), grupoId: z.string().uuid(), permitir: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "administrador",
    });
    if (!isAdmin) throw new Error("Solo administradores.");
    if (data.permitir) {
      await context.supabase
        .from("docente_grupos_permitidos")
        .upsert({ docente_id: data.docenteId, grupo_id: data.grupoId }, { onConflict: "docente_id,grupo_id" });
    } else {
      await context.supabase
        .from("docente_grupos_permitidos")
        .delete()
        .eq("docente_id", data.docenteId)
        .eq("grupo_id", data.grupoId);
    }
    return { ok: true };
  });
