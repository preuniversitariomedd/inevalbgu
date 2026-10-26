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
  "image/svg+xml",
  "text/plain",
  "text/csv",
  "application/zip",
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

// ============== Categorías ==============
export const listarCategoriasBibliotecaFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'biblioteca');
    const { data, error } = await context.supabase
      .from("biblioteca_categorias")
      .select("id, nombre, descripcion, color, icono, orden")
      .order("orden")
      .order("nombre");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const guardarCategoriaBibliotecaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        nombre: z.string().min(2).max(80),
        descripcion: z.string().max(300).optional().nullable(),
        color: z.string().max(20).default("violet"),
        icono: z.string().max(40).default("BookOpen"),
        orden: z.number().int().min(0).max(999).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const payload = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      color: data.color,
      icono: data.icono,
      orden: data.orden,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("biblioteca_categorias")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("biblioteca_categorias")
      .insert({ ...payload, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const borrarCategoriaBibliotecaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase.from("biblioteca_categorias").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== Recursos ==============
export const listarRecursosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'biblioteca');
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "administrador" });
    const { data: isDocente } = await supabase.rpc("has_role", { _user_id: userId, _role: "docente" });
    const esStaff = !!isAdmin || !!isDocente;

    const { data: recursos, error } = await supabase
      .from("biblioteca_recursos")
      .select(
        "id, categoria_id, titulo, descripcion, notas_html, tipo, enlace_url, descarga_url, etiquetas, destacado, publicado, creador_id, creador_rol, created_at",
      )
      .order("destacado", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (recursos ?? []).map((r: any) => r.id);
    if (!ids.length) return { esStaff, esAdmin: !!isAdmin, recursos: [] };

    const [{ data: archivos }, { data: vistas }, { data: favs }, { data: creadores }] = await Promise.all([
      supabase.from("biblioteca_archivos").select("id, recurso_id, nombre, mime, tamano").in("recurso_id", ids),
      supabase.from("biblioteca_vistas").select("recurso_id, user_id").in("recurso_id", ids),
      supabase.from("biblioteca_favoritos").select("recurso_id").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("id, nombres")
        .in("id", Array.from(new Set((recursos ?? []).map((r: any) => r.creador_id)))),
    ]);
    const creadorMap = new Map((creadores ?? []).map((c: any) => [c.id, c.nombres]));
    const favSet = new Set((favs ?? []).map((f: any) => f.recurso_id));

    return {
      esStaff,
      esAdmin: !!isAdmin,
      recursos: (recursos ?? []).map((r: any) => ({
        ...r,
        creador_nombre: creadorMap.get(r.creador_id) ?? "",
        archivos: (archivos ?? []).filter((a: any) => a.recurso_id === r.id),
        vistas: (vistas ?? []).filter((v: any) => v.recurso_id === r.id).length,
        favorito: favSet.has(r.id),
        puede_editar: !!isAdmin || r.creador_id === userId,
      })),
    };
  });

const recursoSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  titulo: z.string().min(2).max(150),
  descripcion: z.string().max(2000).optional().nullable(),
  notas_html: z.string().max(30000).optional().nullable(),
  tipo: z.enum(["documento", "video", "enlace", "infografia", "apunte"]).default("documento"),
  enlace_url: z.string().max(600).optional().nullable(),
  descarga_url: z.string().max(600).optional().nullable(),
  etiquetas: z.array(z.string().max(40)).max(12).optional().default([]),
  destacado: z.boolean().optional().default(false),
  publicado: z.boolean().optional().default(true),
  archivosNuevos: z
    .array(z.object({ nombre: z.string().min(1).max(200), mime: z.string().min(1).max(150), base64: z.string().min(1) }))
    .max(10)
    .optional()
    .default([]),
  archivosBorrar: z.array(z.string().uuid()).optional().default([]),
});

export const guardarRecursoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recursoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await ensureStaff(context);

    const base = {
      categoria_id: data.categoria_id || null,
      titulo: data.titulo.trim(),
      descripcion: data.descripcion?.trim() || null,
      notas_html: data.notas_html?.trim() || null,
      tipo: data.tipo,
      enlace_url: data.enlace_url?.trim() || null,
      descarga_url: data.descarga_url?.trim() || null,
      etiquetas: data.etiquetas ?? [],
      destacado: !!data.destacado,
      publicado: data.publicado !== false,
    };

    let recursoId = data.id ?? null;
    if (recursoId) {
      const { data: prev } = await supabase
        .from("biblioteca_recursos")
        .select("creador_id")
        .eq("id", recursoId)
        .single();
      if (!prev) throw new Error("Recurso no encontrado.");
      if (!isAdmin && prev.creador_id !== userId) throw new Error("No puedes editar este recurso.");
      const { error } = await supabase.from("biblioteca_recursos").update(base).eq("id", recursoId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await supabase
        .from("biblioteca_recursos")
        .insert({ ...base, creador_id: userId, creador_rol: isAdmin ? "administrador" : "docente" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      recursoId = row.id as string;
    }

    if (data.archivosBorrar?.length) {
      const { data: aBorr } = await supabase
        .from("biblioteca_archivos")
        .select("id, path")
        .in("id", data.archivosBorrar);
      if (aBorr?.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.storage.from("biblioteca").remove(aBorr.map((a: any) => a.path));
        await supabase.from("biblioteca_archivos").delete().in("id", data.archivosBorrar);
      }
    }

    if (data.archivosNuevos?.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const f of data.archivosNuevos) {
        if (!ALLOWED_MIME.includes(f.mime)) throw new Error(`Tipo no permitido: ${f.mime}`);
        const b64 = f.base64.includes(",") ? f.base64.split(",")[1] : f.base64;
        const bytes = Buffer.from(b64, "base64");
        if (bytes.length > 25 * 1024 * 1024) throw new Error(`"${f.nombre}" excede 25 MB.`);
        const ext = f.nombre.includes(".") ? f.nombre.split(".").pop() : "bin";
        const path = `${recursoId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("biblioteca")
          .upload(path, bytes, { contentType: f.mime, upsert: false });
        if (upErr) throw new Error(upErr.message);
        await supabase
          .from("biblioteca_archivos")
          .insert({ recurso_id: recursoId, path, nombre: f.nombre, mime: f.mime, tamano: bytes.length });
      }
    }

    return { ok: true, id: recursoId };
  });

export const borrarRecursoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { data: archs } = await context.supabase
      .from("biblioteca_archivos")
      .select("path")
      .eq("recurso_id", data.id);
    if (archs?.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("biblioteca").remove(archs.map((a: any) => a.path));
    }
    const { error } = await context.supabase.from("biblioteca_recursos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const urlArchivoBibliotecaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ archivoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'biblioteca');
    const { data: a, error } = await context.supabase
      .from("biblioteca_archivos")
      .select("path, mime, nombre")
      .eq("id", data.archivoId)
      .single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("biblioteca")
      .createSignedUrl(a.path, 60 * 60);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl as string, nombre: a.nombre as string, mime: a.mime as string };
  });

export const marcarRecursoVistoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recursoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'biblioteca');
    await context.supabase
      .from("biblioteca_vistas")
      .insert({ recurso_id: data.recursoId, user_id: context.userId });
    return { ok: true };
  });

export const toggleFavoritoRecursoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recursoId: z.string().uuid(), activo: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'biblioteca');
    if (data.activo) {
      await context.supabase
        .from("biblioteca_favoritos")
        .upsert({ recurso_id: data.recursoId, user_id: context.userId }, { onConflict: "recurso_id,user_id" });
    } else {
      await context.supabase
        .from("biblioteca_favoritos")
        .delete()
        .eq("recurso_id", data.recursoId)
        .eq("user_id", context.userId);
    }
    return { ok: true };
  });
