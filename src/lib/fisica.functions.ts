import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const NIVELES = ["Básico", "Intermedio", "Avanzado"] as const;

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
  return { isAdmin: !!isAdmin };
}

async function firmarImagenes(rows: any[]) {
  const conImagen = rows.filter((r) => r.imagen_path);
  if (conImagen.length === 0) return rows.map((r) => ({ ...r, imagen_url: null }));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mapa = new Map<string, string>();
  await Promise.all(
    conImagen.map(async (r) => {
      const { data } = await supabaseAdmin.storage.from("fisica").createSignedUrl(r.imagen_path, 60 * 60);
      if (data?.signedUrl) mapa.set(r.imagen_path, data.signedUrl);
    }),
  );
  return rows.map((r) => ({ ...r, imagen_url: r.imagen_path ? (mapa.get(r.imagen_path) ?? null) : null }));
}

// ================= Listar preguntas manuales =================
export const listarPreguntasFisicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tema: z.string().optional(),
        nivel: z.string().optional(),
        soloMias: z.boolean().optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("fisica_preguntas")
      .select("id, tema, subtema, nivel, enunciado, imagen_path, opciones, respuesta_correcta, explicacion, activa, creador_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data?.tema) q = q.eq("tema", data.tema);
    if (data?.nivel && data.nivel !== "Todos") q = q.eq("nivel", data.nivel);
    if (data?.soloMias) q = q.eq("creador_id", context.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return await firmarImagenes(rows ?? []);
  });

// ================= Crear =================
const preguntaSchema = z.object({
  tema: z.string().min(2).max(60),
  subtema: z.string().min(1).max(80),
  nivel: z.enum(NIVELES),
  enunciado: z.string().min(5).max(4000),
  opciones: z.array(z.string().min(1).max(400)).min(2).max(5),
  respuestaCorrecta: z.number().int().min(0).max(4),
  explicacion: z.string().max(4000).optional().nullable(),
  activa: z.boolean().optional().default(true),
  imagenBase64: z.string().optional().nullable(),
  imagenMime: z.string().optional().nullable(),
});

async function subirImagen(base64: string, mime: string, id: string) {
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(mime)) throw new Error("La imagen debe ser png, jpg, webp o gif.");
  const b64 = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("La imagen excede 8 MB.");
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from("fisica").upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export const crearPreguntaFisicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => preguntaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    if (data.respuestaCorrecta >= data.opciones.length) throw new Error("La respuesta correcta no existe entre las opciones.");

    const { data: row, error } = await context.supabase
      .from("fisica_preguntas")
      .insert({
        tema: data.tema,
        subtema: data.subtema,
        nivel: data.nivel,
        enunciado: data.enunciado,
        opciones: data.opciones as never,
        respuesta_correcta: data.respuestaCorrecta,
        explicacion: data.explicacion?.trim() || null,
        activa: data.activa ?? true,
        creador_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.imagenBase64 && data.imagenMime) {
      const path = await subirImagen(data.imagenBase64, data.imagenMime, row.id);
      await context.supabase.from("fisica_preguntas").update({ imagen_path: path }).eq("id", row.id);
    }
    return { ok: true, id: row.id };
  });

// ================= Editar =================
export const editarPreguntaFisicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => preguntaSchema.extend({ id: z.string().uuid(), quitarImagen: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    if (data.respuestaCorrecta >= data.opciones.length) throw new Error("La respuesta correcta no existe entre las opciones.");

    const patch: Record<string, unknown> = {
      tema: data.tema,
      subtema: data.subtema,
      nivel: data.nivel,
      enunciado: data.enunciado,
      opciones: data.opciones,
      respuesta_correcta: data.respuestaCorrecta,
      explicacion: data.explicacion?.trim() || null,
      activa: data.activa ?? true,
    };
    if (data.quitarImagen) patch.imagen_path = null;
    if (data.imagenBase64 && data.imagenMime) {
      patch.imagen_path = await subirImagen(data.imagenBase64, data.imagenMime, data.id);
    }
    const { error } = await context.supabase.from("fisica_preguntas").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= Eliminar =================
export const eliminarPreguntaFisicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureStaff(context);
    const { error } = await context.supabase.from("fisica_preguntas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ================= Estadísticas de Física del estudiante =================
export const estadisticasFisicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ targetUserId: z.string().uuid().optional() }).optional().parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let userId = context.userId;
    if (data?.targetUserId && data.targetUserId !== context.userId) {
      const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
      if (!staff) throw new Error("Sin permisos.");
      userId = data.targetUserId;
    }
    const { data: rows, error } = await context.supabase
      .from("respuestas")
      .select("area, subtema, nivel, correcta, respondida_en")
      .eq("user_id", userId)
      .eq("area", "Física")
      .order("respondida_en", { ascending: false })
      .limit(3000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ================= Agente IA de Física =================
export const tutorFisicaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pregunta: z.string().min(2).max(2000),
        historial: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(12)
          .optional()
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta la configuración de IA.");

    const { data: rows } = await context.supabase
      .from("respuestas")
      .select("subtema, nivel, correcta")
      .eq("user_id", context.userId)
      .eq("area", "Física")
      .limit(2000);

    const porSub = new Map<string, { t: number; ok: number }>();
    for (const r of rows ?? []) {
      const k = `${(r as any).subtema}`;
      const cur = porSub.get(k) ?? { t: 0, ok: 0 };
      cur.t++;
      if ((r as any).correcta) cur.ok++;
      porSub.set(k, cur);
    }
    const resumen =
      porSub.size === 0
        ? "El estudiante aún no ha resuelto preguntas de Física en la plataforma."
        : Array.from(porSub.entries())
            .map(([k, v]) => `${k}: ${v.ok}/${v.t} correctas (${Math.round((v.ok / v.t) * 100)}%)`)
            .join(" · ");

    const debiles = Array.from(porSub.entries())
      .filter(([, v]) => v.t >= 3 && v.ok / v.t < 0.6)
      .map(([k]) => k);

    const system = `Eres "Mr. Victor · Física", tutor virtual de Física para estudiantes ecuatorianos de 1ro BGU (cinemática, dinámica y energía).

USA LAS ESTADÍSTICAS DEL ESTUDIANTE para personalizar tu respuesta:
- Desempeño por subtema: ${resumen}
- Subtemas débiles detectados: ${debiles.length ? debiles.join(", ") : "ninguno todavía"}

REGLAS:
- Responde SOLO sobre Física y su matemática asociada; si preguntan otra cosa, redirige con amabilidad.
- Metodología piagetiana: pregunta primero qué sabe, usa andamiaje, provoca conflicto cognitivo y cierra con metacognición.
- Muestra siempre la fórmula usada, el despeje y las unidades del SI.
- Si el estudiante tiene subtemas débiles, conéctalos con la explicación y recomienda 1-2 ejercicios concretos para practicar.
- Español ecuatoriano, claro y cálido. Máximo 320 palabras. Usa listas y **negritas** para lo clave.`;

    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system,
      messages: [...(data.historial ?? []), { role: "user" as const, content: data.pregunta }],
      temperature: 0.6,
    });

    return { texto: text || "No pude generar una respuesta. Inténtalo de nuevo." };
  });
