import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function esAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "administrador",
  });
  return !!data;
}
async function esStaff(context: { supabase: any; userId: string }) {
  const { data: a } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "administrador" });
  const { data: d } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "docente" });
  return !!a || !!d;
}

// -------- Listar usuarios con quién chatear --------
export const listarUsuariosChatFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // profiles activos
    const { data: profs, error } = await supabaseAdmin
      .from("profiles")
      .select("id, nombres, cedula, institucion, bloqueado")
      .eq("bloqueado", false)
      .order("nombres");
    if (error) throw new Error(error.message);
    const ids = (profs ?? []).map((p) => p.id);
    if (!ids.length) return [];
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    return (profs ?? [])
      .filter((p) => p.id !== context.userId)
      .map((p) => {
        const rs = roleMap.get(p.id) ?? [];
        const rol = rs.includes("administrador")
          ? "administrador"
          : rs.includes("docente")
            ? "docente"
            : "estudiante";
        return { id: p.id, nombres: p.nombres, cedula: p.cedula, institucion: p.institucion, rol };
      });
  });

// -------- Listar conversaciones (mías o todas si admin) --------
export const listarConversacionesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ scope: z.enum(["mine", "all"]).default("mine") }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await esAdmin(context);
    const scope = data.scope === "all" && admin ? "all" : "mine";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let convIds: string[] = [];
    if (scope === "mine") {
      const { data: parts } = await supabaseAdmin
        .from("conversacion_participantes")
        .select("conversacion_id, no_leidos")
        .eq("user_id", context.userId);
      convIds = (parts ?? []).map((p) => p.conversacion_id);
    } else {
      const { data: all } = await supabaseAdmin
        .from("conversaciones")
        .select("id")
        .order("ultimo_mensaje_at", { ascending: false })
        .limit(200);
      convIds = (all ?? []).map((c) => c.id);
    }
    if (!convIds.length) return [];

    const { data: convs } = await supabaseAdmin
      .from("conversaciones")
      .select("id, ultimo_mensaje_at, ultimo_mensaje_preview, created_by")
      .in("id", convIds)
      .order("ultimo_mensaje_at", { ascending: false });

    const { data: allParts } = await supabaseAdmin
      .from("conversacion_participantes")
      .select("conversacion_id, user_id, no_leidos, ultima_lectura_at")
      .in("conversacion_id", convIds);

    const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, nombres, cedula, avatar_url")
      .in("id", userIds);
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    // Firmar avatares
    const avatars = new Map<string, string>();
    for (const p of profs ?? []) {
      if ((p as any).avatar_url) {
        const { data: signed } = await supabaseAdmin.storage
          .from("avatars")
          .createSignedUrl((p as any).avatar_url, 60 * 60);
        if (signed?.signedUrl) avatars.set(p.id, signed.signedUrl);
      }
    }

    const partsByConv = new Map<string, any[]>();
    (allParts ?? []).forEach((p: any) => {
      const arr = partsByConv.get(p.conversacion_id) ?? [];
      arr.push(p);
      partsByConv.set(p.conversacion_id, arr);
    });

    return (convs ?? []).map((c: any) => {
      const ps = partsByConv.get(c.id) ?? [];
      const yo = ps.find((p) => p.user_id === context.userId);
      const otro = ps.find((p) => p.user_id !== context.userId) ?? ps[0];
      const otroProf: any = otro ? profMap.get(otro.user_id) : null;
      return {
        id: c.id,
        ultimo_mensaje_at: c.ultimo_mensaje_at,
        ultimo_mensaje_preview: c.ultimo_mensaje_preview,
        no_leidos: yo?.no_leidos ?? 0,
        soy_participante: !!yo,
        otro_ultima_lectura_at: otro?.ultima_lectura_at ?? null,
        otro: otroProf
          ? {
              id: otroProf.id,
              nombres: otroProf.nombres,
              cedula: otroProf.cedula,
              avatar_url: avatars.get(otroProf.id) ?? null,
            }
          : null,
        participantes: ps.map((p) => {
          const pr: any = profMap.get(p.user_id);
          return {
            id: p.user_id,
            nombres: pr?.nombres ?? "?",
            cedula: pr?.cedula ?? "",
            avatar_url: avatars.get(p.user_id) ?? null,
          };
        }),
      };
    });
  });

// -------- Abrir o crear conversación con otro usuario --------
export const abrirConversacionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ otherUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.otherUserId === context.userId) throw new Error("No puedes conversar contigo mismo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar conversación existente entre ambos
    const { data: mias } = await supabaseAdmin
      .from("conversacion_participantes")
      .select("conversacion_id")
      .eq("user_id", context.userId);
    const ids = (mias ?? []).map((m) => m.conversacion_id);
    if (ids.length) {
      const { data: coincid } = await supabaseAdmin
        .from("conversacion_participantes")
        .select("conversacion_id")
        .eq("user_id", data.otherUserId)
        .in("conversacion_id", ids);
      if (coincid && coincid.length) {
        return { id: coincid[0].conversacion_id as string };
      }
    }

    // Crear conversación
    const { data: conv, error } = await supabaseAdmin
      .from("conversaciones")
      .insert({ created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: pe } = await supabaseAdmin.from("conversacion_participantes").insert([
      { conversacion_id: conv.id, user_id: context.userId },
      { conversacion_id: conv.id, user_id: data.otherUserId },
    ]);
    if (pe) throw new Error(pe.message);
    return { id: conv.id as string };
  });

// -------- Listar mensajes --------
export const listarMensajesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversacionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verifica acceso
    const admin = await esAdmin(context);
    if (!admin) {
      const { data: yo } = await supabaseAdmin
        .from("conversacion_participantes")
        .select("user_id")
        .eq("conversacion_id", data.conversacionId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!yo) throw new Error("Sin acceso.");
    }
    const { data: msgs, error } = await supabaseAdmin
      .from("mensajes")
      .select("id, sender_id, contenido, attachment_path, attachment_tipo, es_admin_intervencion, created_at, responde_a")
      .eq("conversacion_id", data.conversacionId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    // Mapa de mensajes citados
    const citadosIds = Array.from(new Set((msgs ?? []).map((m: any) => m.responde_a).filter(Boolean)));
    const citados: Record<string, { id: string; sender_id: string; contenido: string | null; attachment_tipo: string | null }> = {};
    if (citadosIds.length) {
      const { data: cs } = await supabaseAdmin
        .from("mensajes")
        .select("id, sender_id, contenido, attachment_tipo")
        .in("id", citadosIds);
      for (const c of cs ?? []) citados[(c as any).id] = c as any;
    }

    // Última lectura del OTRO participante (para indicador ✓✓)
    const { data: parts } = await supabaseAdmin
      .from("conversacion_participantes")
      .select("user_id, ultima_lectura_at")
      .eq("conversacion_id", data.conversacionId);
    const otro = (parts ?? []).find((p: any) => p.user_id !== context.userId);
    const otroLeidoAt = otro?.ultima_lectura_at ?? null;

    // Firmar URLs de adjuntos
    const withUrl = await Promise.all(
      (msgs ?? []).map(async (m: any) => {
        let attachment_url: string | null = null;
        if (m.attachment_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("chat-attachments")
            .createSignedUrl(m.attachment_path, 60 * 60);
          attachment_url = signed?.signedUrl ?? null;
        }
        const leido = otroLeidoAt && new Date(m.created_at).getTime() <= new Date(otroLeidoAt).getTime();
        const cita = m.responde_a ? citados[m.responde_a] ?? null : null;
        return { ...m, attachment_url, leido_por_otro: !!leido, cita };
      }),
    );
    return withUrl;
  });

// -------- Enviar mensaje --------
const MIMES_CHAT_OK =
  /^(image\/(png|jpe?g|webp|gif|svg\+xml)|application\/pdf|application\/msword|application\/vnd\.ms-(excel|powerpoint)|application\/vnd\.openxmlformats-officedocument\..+|application\/zip|text\/(plain|csv)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|webm|ogg|wav))$/i;

const enviarSchema = z.object({
  conversacionId: z.string().uuid(),
  contenido: z.string().max(4000).optional().nullable(),
  attachmentBase64: z.string().max(36_000_000).optional().nullable(),
  attachmentMime: z.string().max(150).optional().nullable(),
  attachmentNombre: z.string().max(200).optional().nullable(),
  respondeA: z.string().uuid().optional().nullable(),
});
export const enviarMensajeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => enviarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const contenido = (data.contenido ?? "").trim();
    if (!contenido && !data.attachmentBase64) throw new Error("Mensaje vacío.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = await esAdmin(context);
    // Verifica participación (o admin)
    const { data: yo } = await supabaseAdmin
      .from("conversacion_participantes")
      .select("user_id")
      .eq("conversacion_id", data.conversacionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!yo && !admin) throw new Error("Sin acceso a la conversación.");

    let attachment_path: string | null = null;
    let attachment_tipo: string | null = null;
    if (data.attachmentBase64 && data.attachmentMime) {
      if (!MIMES_CHAT_OK.test(data.attachmentMime)) {
        throw new Error("Tipo de archivo no permitido.");
      }
      const limpio = (data.attachmentNombre ?? "archivo")
        .replace(/[^\w.\- ]+/g, "_")
        .slice(-90)
        .trim() || "archivo";
      const nombre = `${data.conversacionId}/${context.userId}/${crypto.randomUUID()}__${limpio}`;
      const b64 = data.attachmentBase64.replace(/^data:[^;]+;base64,/, "");
      const buf = Buffer.from(b64, "base64");
      if (buf.length > 25 * 1024 * 1024) throw new Error("El archivo supera 25 MB.");
      const { error: ue } = await supabaseAdmin.storage
        .from("chat-attachments")
        .upload(nombre, buf, { contentType: data.attachmentMime, upsert: false });
      if (ue) throw new Error(ue.message);
      attachment_path = nombre;
      attachment_tipo = data.attachmentMime;
    }


    const { data: msg, error } = await supabaseAdmin
      .from("mensajes")
      .insert({
        conversacion_id: data.conversacionId,
        sender_id: context.userId,
        contenido: contenido || null,
        attachment_path,
        attachment_tipo,
        es_admin_intervencion: admin && !yo,
        responde_a: data.respondeA ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);

    // Reset propio contador
    if (yo) {
      await supabaseAdmin
        .from("conversacion_participantes")
        .update({ no_leidos: 0, ultima_lectura_at: new Date().toISOString() })
        .eq("conversacion_id", data.conversacionId)
        .eq("user_id", context.userId);
    }
    return { id: msg.id as string, created_at: msg.created_at };
  });

// -------- Marcar leído --------
export const marcarLeidoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversacionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("conversacion_participantes")
      .update({ no_leidos: 0, ultima_lectura_at: new Date().toISOString() })
      .eq("conversacion_id", data.conversacionId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

// -------- Contar no leídos (badge) --------
export const contarNoLeidosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("conversacion_participantes")
      .select("no_leidos")
      .eq("user_id", context.userId);
    const total = (data ?? []).reduce((a: number, r: any) => a + (r.no_leidos ?? 0), 0);
    return { total };
  });

// -------- Mensaje masivo (staff → varios usuarios / grupos) --------
const masivoSchema = z.object({
  contenido: z.string().min(1).max(4000),
  userIds: z.array(z.string().uuid()).optional().default([]),
  grupoIds: z.array(z.string().uuid()).optional().default([]),
});

async function masivoCore(
  supabaseAdmin: any,
  senderId: string,
  contenido: string,
  userIds: string[],
  grupoIds: string[],
  audiencia = "manual",
) {

  const dest = new Set<string>(userIds);
  if (grupoIds.length) {
    const { data: rows } = await supabaseAdmin
      .from("grupo_estudiantes")
      .select("user_id")
      .in("grupo_id", grupoIds);
    (rows ?? []).forEach((r: any) => dest.add(r.user_id));
  }
  dest.delete(senderId);
  if (!dest.size) throw new Error("No hay destinatarios.");

  const { data: activos } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("id", Array.from(dest))
    .eq("bloqueado", false);
  const finales = (activos ?? []).map((a: any) => a.id as string);
  if (!finales.length) throw new Error("Sin destinatarios activos.");

  const { data: mias } = await supabaseAdmin
    .from("conversacion_participantes")
    .select("conversacion_id")
    .eq("user_id", senderId);
  const misIds = (mias ?? []).map((m: any) => m.conversacion_id);
  const mapaConv = new Map<string, string>();
  if (misIds.length) {
    const { data: co } = await supabaseAdmin
      .from("conversacion_participantes")
      .select("conversacion_id, user_id")
      .in("conversacion_id", misIds)
      .in("user_id", finales);
    (co ?? []).forEach((r: any) => mapaConv.set(r.user_id, r.conversacion_id));
  }

  const { data: envio } = await supabaseAdmin
    .from("envios_masivos")
    .insert({ sender_id: senderId, contenido, audiencia, total_destinatarios: finales.length })
    .select("id")
    .single();

  let enviados = 0;
  const destinatarios: any[] = [];
  for (const uid of finales) {
    let convId = mapaConv.get(uid);
    if (!convId) {
      const { data: c } = await supabaseAdmin
        .from("conversaciones")
        .insert({ created_by: senderId })
        .select("id")
        .single();
      if (!c) continue;
      convId = c.id as string;
      await supabaseAdmin.from("conversacion_participantes").insert([
        { conversacion_id: convId, user_id: senderId },
        { conversacion_id: convId, user_id: uid },
      ]);
    }
    const { data: msg } = await supabaseAdmin
      .from("mensajes")
      .insert({
        conversacion_id: convId,
        sender_id: senderId,
        contenido,
      })
      .select("id")
      .single();
    if (envio?.id) {
      destinatarios.push({
        envio_id: envio.id,
        user_id: uid,
        conversacion_id: convId,
        mensaje_id: msg?.id ?? null,
      });
    }
    enviados++;
  }
  if (destinatarios.length) {
    await supabaseAdmin.from("envio_masivo_destinatarios").insert(destinatarios);
  }
  return { ok: true, enviados, envioId: envio?.id ?? null };
}


export const enviarMensajeMasivoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => masivoSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await esStaff(context))) throw new Error("Solo docentes o administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return await masivoCore(supabaseAdmin, context.userId, data.contenido, data.userIds, data.grupoIds);
  });

// -------- Presencia de otro usuario (para badge verde admin) --------
export const presenciaUsuarioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await esStaff(context)) && data.userId !== context.userId) {
      return { activo: false } as any;
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("sesiones_conexion")
      .select("dispositivo, ip, ultimo_heartbeat, visible, finalizada, iniciada_en")
      .eq("user_id", data.userId)
      .eq("finalizada", false)
      .order("ultimo_heartbeat", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!s) return { activo: false };
    const seg = (Date.now() - new Date(s.ultimo_heartbeat).getTime()) / 1000;
    return {
      activo: seg < 90,
      dispositivo: s.dispositivo,
      ip: s.ip,
      ultimo_heartbeat: s.ultimo_heartbeat,
      visible: s.visible,
      iniciada_en: s.iniciada_en,
    };
  });

// -------- Borrar mensaje (admin) --------
export const borrarMensajeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await esAdmin(context))) throw new Error("Solo administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Borra adjunto si existe
    const { data: m } = await supabaseAdmin
      .from("mensajes")
      .select("attachment_path")
      .eq("id", data.id)
      .maybeSingle();
    if (m?.attachment_path) {
      await supabaseAdmin.storage.from("chat-attachments").remove([m.attachment_path]).catch(() => {});
    }
    const { error } = await supabaseAdmin.from("mensajes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Borrar conversación completa (admin) --------
export const borrarConversacionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await esAdmin(context))) throw new Error("Solo administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Borrar adjuntos
    const { data: msgs } = await supabaseAdmin
      .from("mensajes")
      .select("attachment_path")
      .eq("conversacion_id", data.id);
    const paths = (msgs ?? []).map((m: any) => m.attachment_path).filter(Boolean);
    if (paths.length) {
      await supabaseAdmin.storage.from("chat-attachments").remove(paths).catch(() => {});
    }
    await supabaseAdmin.from("mensajes").delete().eq("conversacion_id", data.id);
    await supabaseAdmin.from("conversacion_participantes").delete().eq("conversacion_id", data.id);
    const { error } = await supabaseAdmin.from("conversaciones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Subir avatar (usuario o admin sobre otro) --------
const avatarSchema = z.object({
  userId: z.string().uuid().optional(),
  base64: z.string().min(20).max(8_000_000),
  mime: z.string().max(80),
});
export const subirAvatarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => avatarSchema.parse(d))
  .handler(async ({ data, context }) => {
    const target = data.userId ?? context.userId;
    if (target !== context.userId && !(await esAdmin(context))) {
      throw new Error("No autorizado.");
    }
    if (!/^image\/(png|jpe?g|webp)$/i.test(data.mime)) {
      throw new Error("Solo imágenes jpg, png o webp.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.mime.split("/")[1].replace("jpeg", "jpg");
    const b64 = data.base64.replace(/^data:[^;]+;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    if (buf.length > 3 * 1024 * 1024) throw new Error("La imagen debe pesar menos de 3 MB.");
    const path = `${target}/avatar.${ext}`;
    const { error: ue } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buf, { contentType: data.mime, upsert: true });
    if (ue) throw new Error(ue.message);
    const { error: pe } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", target);
    if (pe) throw new Error(pe.message);
    const { data: signed } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    return { ok: true, url: signed?.signedUrl ?? null };
  });

// -------- URL firmada del avatar propio (para mostrar en la nav) --------
export const miAvatarUrlFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (!p?.avatar_url) return { url: null };
    const { data: signed } = await supabaseAdmin.storage
      .from("avatars")
      .createSignedUrl(p.avatar_url, 60 * 60);
    return { url: signed?.signedUrl ?? null };
  });

// -------- Masivo por rol (staff): "all" | "estudiantes" | "docentes" | "administradores" --------
const masivoRolSchema = z.object({
  contenido: z.string().min(1).max(4000),
  audiencia: z.enum(["todos", "estudiantes", "docentes", "administradores"]),
});
export const enviarMensajeMasivoRolFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => masivoRolSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!(await esStaff(context))) throw new Error("Solo docentes o administradores.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    let ids: string[];
    if (data.audiencia === "todos") ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    else {
      const rol = data.audiencia === "estudiantes" ? "estudiante" : data.audiencia === "docentes" ? "docente" : "administrador";
      ids = Array.from(new Set((roles ?? []).filter((r: any) => r.role === rol).map((r: any) => r.user_id)));
    }
    ids = ids.filter((id) => id !== context.userId);
    if (!ids.length) throw new Error("No hay destinatarios.");
    return await masivoCore(supabaseAdmin, context.userId, data.contenido, ids, [], data.audiencia);
  });

// -------- Historial de mensajes masivos con estado de lectura --------
export const listarEnviosMasivosFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await esStaff(context))) throw new Error("Solo docentes o administradores.");
    const admin = await esAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("envios_masivos")
      .select("id, sender_id, contenido, audiencia, total_destinatarios, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!admin) q = q.eq("sender_id", context.userId);
    const { data: envios, error } = await q;
    if (error) throw new Error(error.message);
    if (!envios?.length) return [];

    const envioIds = envios.map((e: any) => e.id);
    const { data: dests } = await supabaseAdmin
      .from("envio_masivo_destinatarios")
      .select("envio_id, user_id, conversacion_id, created_at")
      .in("envio_id", envioIds);

    const userIds = Array.from(new Set((dests ?? []).map((d: any) => d.user_id)));
    const senderIds = Array.from(new Set(envios.map((e: any) => e.sender_id)));
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, nombres, cedula")
      .in("id", Array.from(new Set([...userIds, ...senderIds])));
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const convIds = Array.from(new Set((dests ?? []).map((d: any) => d.conversacion_id).filter(Boolean)));
    const lecturas = new Map<string, string | null>();
    if (convIds.length) {
      const { data: parts } = await supabaseAdmin
        .from("conversacion_participantes")
        .select("conversacion_id, user_id, ultima_lectura_at")
        .in("conversacion_id", convIds);
      (parts ?? []).forEach((p: any) => {
        lecturas.set(`${p.conversacion_id}:${p.user_id}`, p.ultima_lectura_at);
      });
    }

    const byEnvio = new Map<string, any[]>();
    (dests ?? []).forEach((d: any) => {
      const leidoAt = lecturas.get(`${d.conversacion_id}:${d.user_id}`) ?? null;
      const leido = !!leidoAt && new Date(leidoAt).getTime() >= new Date(d.created_at).getTime();
      const pr: any = profMap.get(d.user_id);
      const arr = byEnvio.get(d.envio_id) ?? [];
      arr.push({
        user_id: d.user_id,
        nombres: pr?.nombres ?? "?",
        cedula: pr?.cedula ?? "",
        leido,
        leido_at: leido ? leidoAt : null,
      });
      byEnvio.set(d.envio_id, arr);
    });

    return envios.map((e: any) => {
      const ds = (byEnvio.get(e.id) ?? []).sort((a, b) => a.nombres.localeCompare(b.nombres));
      return {
        ...e,
        sender_nombre: (profMap.get(e.sender_id) as any)?.nombres ?? "—",
        destinatarios: ds,
        leidos: ds.filter((d) => d.leido).length,
      };
    });
  });
