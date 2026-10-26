import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  calcularPuntos,
  fraccionRespuesta,
  generarCodigo,
  opcionesAEliminar,
  POTENCIADORES_ADMIN,
  POTENCIADORES_ESTUDIANTE,
  TIEMPO_POR_NIVEL,
  type Efectos,
} from "./competencia-logica";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function exigirStaff(context: any) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Solo administradores o docentes.");
}

async function firmar(db: any, path: string | null) {
  if (!path) return null;
  const { data } = await db.storage.from("competencias").createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

const uuid = z.string().uuid();

/* ---------------------------- STAFF ---------------------------- */

export const listarCompetenciasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (staff) {
      const { data } = await db
        .from("competencias")
        .select("id, titulo, codigo, estado, duracion_min, created_at, grupo_ids")
        .order("created_at", { ascending: false })
        .limit(100);
      const ids = (data ?? []).map((c: any) => c.id);
      const { data: parts } = ids.length
        ? await db.from("competencia_participantes").select("competencia_id").in("competencia_id", ids)
        : { data: [] };
      const { data: pregs } = ids.length
        ? await db.from("competencia_preguntas").select("competencia_id").in("competencia_id", ids)
        : { data: [] };
      const cuenta = (arr: any[], id: string) => arr.filter((x) => x.competencia_id === id).length;
      return {
        staff: true,
        items: (data ?? []).map((c: any) => ({
          ...c,
          participantes: cuenta(parts ?? [], c.id),
          preguntas: cuenta(pregs ?? [], c.id),
        })),
      };
    }
    const { data: gs } = await db.from("grupo_estudiantes").select("grupo_id").eq("user_id", context.userId);
    const misGrupos = (gs ?? []).map((g: any) => g.grupo_id);
    const { data: unidas } = await db
      .from("competencia_participantes")
      .select("competencia_id")
      .eq("user_id", context.userId);
    const { data } = await db
      .from("competencias")
      .select("id, titulo, estado, duracion_min, created_at, grupo_ids")
      .neq("estado", "finalizada")
      .order("created_at", { ascending: false })
      .limit(50);
    const unidasIds = new Set((unidas ?? []).map((u: any) => u.competencia_id));
    const items = (data ?? []).filter(
      (c: any) =>
        unidasIds.has(c.id) || (c.grupo_ids ?? []).some((g: string) => misGrupos.includes(g)),
    );
    return { staff: false, items: items.map((c: any) => ({ ...c, unida: unidasIds.has(c.id) })) };
  });

export const crearCompetenciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        titulo: z.string().trim().min(2).max(120),
        duracion_min: z.number().int().min(3).max(180),
        fuente: z.enum(["mate", "fisica", "mixto", "vacio"]),
        cantidad: z.number().int().min(0).max(60),
        grupoIds: z.array(uuid).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    let codigo = generarCodigo();
    for (let k = 0; k < 5; k++) {
      const { data: ex } = await db.from("competencias").select("id").eq("codigo", codigo).maybeSingle();
      if (!ex) break;
      codigo = generarCodigo();
    }
    const { data: comp, error } = await db
      .from("competencias")
      .insert({
        titulo: data.titulo,
        codigo,
        creador_id: context.userId,
        duracion_min: data.duracion_min,
        grupo_ids: data.grupoIds,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.fuente !== "vacio" && data.cantidad > 0) {
      const { BANCO_PREGUNTAS, preguntasAleatorias } = await import("@/data");
      const { BANCO_FISICA } = await import("@/data/fisica");
      const mate = BANCO_PREGUNTAS.map((p) => ({ ...p, area: p.area }));
      const fis = BANCO_FISICA.map((p) => ({ ...p, area: "Física" }));
      const pool = data.fuente === "mate" ? mate : data.fuente === "fisica" ? fis : [...mate, ...fis];
      const elegidas = preguntasAleatorias(pool as any[], data.cantidad);
      const filas = elegidas.map((p: any, i: number) => ({
        competencia_id: comp.id,
        orden: i,
        area: p.area,
        enunciado: p.enunciado,
        opciones: p.opciones,
        correcta: p.respuestaCorrecta,
        casi_correcta: null,
        nivel: p.nivel,
        tiempo_seg: TIEMPO_POR_NIVEL[p.nivel] ?? 45,
        explicacion: p.explicacion,
      }));
      if (filas.length) await db.from("competencia_preguntas").insert(filas);
    }
    return { id: comp.id, codigo };
  });

export const eliminarCompetenciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    await db.from("competencias").delete().eq("id", data.id);
    return { ok: true };
  });

const preguntaSchema = z.object({
  id: uuid.optional(),
  competencia_id: uuid,
  enunciado: z.string().trim().min(3).max(3000),
  opciones: z.array(z.string().trim().min(1).max(500)).min(2).max(5),
  correcta: z.number().int().min(0).max(4),
  casi_correcta: z.number().int().min(0).max(4).nullable(),
  nivel: z.enum(["Básico", "Intermedio", "Avanzado"]),
  tiempo_seg: z.number().int().min(5).max(300),
  explicacion: z.string().max(3000).nullable(),
  imagen_base64: z.string().max(7_500_000).nullable().optional(),
  imagen_mime: z.string().max(40).nullable().optional(),
  quitar_imagen: z.boolean().optional(),
});

export const guardarPreguntaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => preguntaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    if (data.correcta >= data.opciones.length) throw new Error("La opción correcta no existe.");
    if (data.casi_correcta !== null && (data.casi_correcta >= data.opciones.length || data.casi_correcta === data.correcta))
      throw new Error("La opción 'casi correcta' debe ser distinta de la correcta.");
    const db = await admin();
    let imagen: string | null | undefined = undefined;
    if (data.imagen_base64 && data.imagen_mime) {
      if (!/^image\/(png|jpe?g|webp|gif)$/.test(data.imagen_mime)) throw new Error("Formato de imagen no permitido.");
      const b64 = data.imagen_base64.split(",").pop()!;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bytes.length > 5 * 1024 * 1024) throw new Error("Imagen máx. 5 MB.");
      const ext = data.imagen_mime.split("/")[1].replace("jpeg", "jpg");
      const path = `${data.competencia_id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("competencias").upload(path, bytes, { contentType: data.imagen_mime });
      if (error) throw new Error(error.message);
      imagen = path;
    } else if (data.quitar_imagen) imagen = null;

    const fila: any = {
      competencia_id: data.competencia_id,
      enunciado: data.enunciado,
      opciones: data.opciones,
      correcta: data.correcta,
      casi_correcta: data.casi_correcta,
      nivel: data.nivel,
      tiempo_seg: data.tiempo_seg,
      explicacion: data.explicacion,
    };
    if (imagen !== undefined) fila.imagen_url = imagen;
    if (data.id) {
      const { error } = await db.from("competencia_preguntas").update(fila).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { count } = await db
        .from("competencia_preguntas")
        .select("id", { count: "exact", head: true })
        .eq("competencia_id", data.competencia_id);
      fila.orden = count ?? 0;
      const { error } = await db.from("competencia_preguntas").insert(fila);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const eliminarPreguntaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    await db.from("competencia_preguntas").delete().eq("id", data.id);
    return { ok: true };
  });

async function cargarPreguntas(db: any, compId: string) {
  const { data } = await db
    .from("competencia_preguntas")
    .select("*")
    .eq("competencia_id", compId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export const detalleStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    const { data: comp } = await db.from("competencias").select("*").eq("id", data.id).single();
    if (!comp) throw new Error("No existe.");
    const [pregs, { data: parts }, { data: alertas }, { data: resps }, { data: grupos }] = await Promise.all([
      cargarPreguntas(db, data.id),
      db.from("competencia_participantes").select("*").eq("competencia_id", data.id).order("puntaje", { ascending: false }),
      db.from("competencia_alertas").select("*").eq("competencia_id", data.id).order("created_at", { ascending: false }).limit(300),
      db.from("competencia_respuestas").select("user_id, pregunta_idx, opcion, fraccion, puntos, ms").eq("competencia_id", data.id),
      db.from("grupos").select("id, nombre").order("nombre"),
    ]);
    const preguntas = await Promise.all(
      pregs.map(async (p: any) => ({ ...p, imagen_firmada: await firmar(db, p.imagen_url) })),
    );
    return {
      comp,
      preguntas,
      participantes: parts ?? [],
      alertas: alertas ?? [],
      respuestas: resps ?? [],
      grupos: grupos ?? [],
      serverNow: Date.now(),
    };
  });

export const actualizarCompetenciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        titulo: z.string().trim().min(2).max(120),
        duracion_min: z.number().int().min(3).max(180),
        grupoIds: z.array(uuid).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    await db
      .from("competencias")
      .update({ titulo: data.titulo, duracion_min: data.duracion_min, grupo_ids: data.grupoIds })
      .eq("id", data.id);
    return { ok: true };
  });

async function avanzar(db: any, comp: any) {
  const pregs = await cargarPreguntas(db, comp.id);
  const nuevo = comp.pregunta_actual + 1;
  if (nuevo >= pregs.length) {
    await db.from("competencias").update({ estado: "finalizada", fin_at: new Date().toISOString() }).eq("id", comp.id);
    return;
  }
  const ef = (comp.efectos ?? {}) as Efectos;
  let dur = (pregs[nuevo].tiempo_seg ?? 45) * 1000;
  if ((ef.relampago_hasta ?? -1) >= nuevo) dur = Math.round(dur / 2);
  await db
    .from("competencias")
    .update({
      estado: "en_curso",
      pregunta_actual: nuevo,
      pregunta_inicio: new Date().toISOString(),
      pregunta_duracion_ms: dur,
      pausa_restante_ms: null,
    })
    .eq("id", comp.id);
}

export const controlCompetenciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        accion: z.enum(["iniciar", "siguiente", "pausar", "reanudar", "terminar", "reiniciar"]),
        desdeIdx: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    const { data: comp } = await db.from("competencias").select("*").eq("id", data.id).single();
    if (!comp) throw new Error("No existe.");
    const now = Date.now();
    if (data.accion === "iniciar") {
      const { count } = await db
        .from("competencia_preguntas")
        .select("id", { count: "exact", head: true })
        .eq("competencia_id", data.id);
      if (!count) throw new Error("Agrega al menos una pregunta.");
      const c2 = {
        ...comp,
        pregunta_actual: -1,
      };
      await db
        .from("competencias")
        .update({
          inicio_at: new Date(now).toISOString(),
          fin_at: new Date(now + comp.duracion_min * 60000).toISOString(),
          efectos: {},
          admin_potenciadores_usados: [],
        })
        .eq("id", data.id);
      await avanzar(db, { ...c2, efectos: {} });
    } else if (data.accion === "siguiente") {
      // Evita dobles avances simultáneos (auto-avance + clic)
      if (data.desdeIdx !== undefined && data.desdeIdx !== comp.pregunta_actual) return { ok: true };
      if (comp.estado === "en_curso" || comp.estado === "pausada") await avanzar(db, comp);
    } else if (data.accion === "pausar" && comp.estado === "en_curso") {
      const restante = Math.max(0, new Date(comp.pregunta_inicio).getTime() + comp.pregunta_duracion_ms - now);
      await db.from("competencias").update({ estado: "pausada", pausa_restante_ms: restante }).eq("id", data.id);
    } else if (data.accion === "reanudar" && comp.estado === "pausada") {
      const restante = comp.pausa_restante_ms ?? 0;
      const pausadoMs = now - new Date(comp.updated_at).getTime();
      await db
        .from("competencias")
        .update({
          estado: "en_curso",
          pregunta_inicio: new Date(now - (comp.pregunta_duracion_ms - restante)).toISOString(),
          fin_at: comp.fin_at ? new Date(new Date(comp.fin_at).getTime() + pausadoMs).toISOString() : null,
          pausa_restante_ms: null,
        })
        .eq("id", data.id);
    } else if (data.accion === "terminar") {
      await db.from("competencias").update({ estado: "finalizada", fin_at: new Date(now).toISOString() }).eq("id", data.id);
    } else if (data.accion === "reiniciar") {
      await db.from("competencia_respuestas").delete().eq("competencia_id", data.id);
      await db.from("competencia_alertas").delete().eq("competencia_id", data.id);
      await db
        .from("competencia_participantes")
        .update({
          puntaje: 0, racha: 0, mejor_racha: 0, aciertos: 0, leves: 0, potenciadores_usados: [],
          virus_hasta: -1, virus_de: null, escudo: false, doble_idx: -1, congelar_idx: -1, cincuenta_idx: -1, alertas: 0,
        })
        .eq("competencia_id", data.id);
      await db
        .from("competencias")
        .update({ estado: "espera", pregunta_actual: -1, pregunta_inicio: null, inicio_at: null, fin_at: null, efectos: {}, admin_potenciadores_usados: [] })
        .eq("id", data.id);
    }
    return { ok: true };
  });

export const potenciadorAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid, tipo: z.enum(Object.keys(POTENCIADORES_ADMIN) as [string, ...string[]]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirStaff(context);
    const db = await admin();
    const { data: comp } = await db.from("competencias").select("*").eq("id", data.id).single();
    if (!comp || comp.estado !== "en_curso") throw new Error("La competencia debe estar en curso.");
    if ((comp.admin_potenciadores_usados ?? []).includes(data.tipo)) throw new Error("Ya usaste este potenciador.");
    const idx = comp.pregunta_actual;
    const ef: Efectos = { ...(comp.efectos ?? {}) };
    const upd: any = {};
    const now = Date.now();
    const transcurrido = now - new Date(comp.pregunta_inicio).getTime();
    switch (data.tipo) {
      case "mas_tiempo": upd.pregunta_duracion_ms = comp.pregunta_duracion_ms + 10000; break;
      case "menos_tiempo": upd.pregunta_duracion_ms = Math.max(transcurrido + 3000, comp.pregunta_duracion_ms - 5000); break;
      case "doble_puntos": ef.doble_idx = idx; break;
      case "eliminar2": ef.eliminar_idx = idx; break;
      case "pista": ef.pista_idx = idx; break;
      case "sorpresa":
        ef.sorpresa_idx = idx;
        upd.pregunta_duracion_ms = Math.min(comp.pregunta_duracion_ms, transcurrido + 10000);
        break;
      case "ocultar_ranking": ef.ranking_oculto = true; break;
      case "escudo_general":
        await db.from("competencia_participantes").update({ virus_hasta: -1, virus_de: null }).eq("competencia_id", data.id);
        break;
      case "relampago": ef.relampago_hasta = idx + 3; break;
      case "sin_velocidad": ef.sin_velocidad = true; break;
    }
    await db
      .from("competencias")
      .update({ ...upd, efectos: { ...ef, ultimo: { tipo: data.tipo, at: now } }, admin_potenciadores_usados: [...(comp.admin_potenciadores_usados ?? []), data.tipo] })
      .eq("id", data.id);
    return { ok: true };
  });

/* --------------------------- ESTUDIANTE --------------------------- */

export const unirseCompetenciaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ codigo: z.string().trim().regex(/^\d{6}$/).optional(), id: uuid.optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    let q = db.from("competencias").select("id, estado, grupo_ids");
    q = data.id ? q.eq("id", data.id) : q.eq("codigo", data.codigo);
    const { data: comp } = await q.maybeSingle();
    if (!comp) throw new Error("Código no válido.");
    if (comp.estado === "finalizada") throw new Error("Esta competencia ya terminó.");
    const { data: prof } = await db.from("profiles").select("nombres").eq("id", context.userId).maybeSingle();
    await db
      .from("competencia_participantes")
      .upsert(
        { competencia_id: comp.id, user_id: context.userId, nombre: prof?.nombres ?? "Estudiante" },
        { onConflict: "competencia_id,user_id", ignoreDuplicates: true },
      );
    return { id: comp.id };
  });

export const aceptarReglasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    await db
      .from("competencia_participantes")
      .update({ acepto_reglas: true })
      .eq("competencia_id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

function deadlineMs(comp: any, yo: any) {
  if (!comp.pregunta_inicio) return 0;
  let d = new Date(comp.pregunta_inicio).getTime() + comp.pregunta_duracion_ms;
  if (yo && yo.congelar_idx === comp.pregunta_actual) d += 10000;
  return d;
}

export const estadoJugadorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    const [{ data: comp }, { data: yo }] = await Promise.all([
      db.from("competencias").select("*").eq("id", data.id).single(),
      db.from("competencia_participantes").select("*").eq("competencia_id", data.id).eq("user_id", context.userId).maybeSingle(),
    ]);
    if (!comp) throw new Error("No existe.");
    if (!yo) throw new Error("No estás inscrito en esta competencia.");
    const ef = (comp.efectos ?? {}) as Efectos;
    const pregs = await cargarPreguntas(db, data.id);
    const idx = comp.pregunta_actual;
    let pregunta: any = null;
    let miRespuesta: any = null;
    if (idx >= 0 && idx < pregs.length && comp.estado !== "espera") {
      const p = pregs[idx];
      const { data: r } = await db
        .from("competencia_respuestas")
        .select("opcion, fraccion, puntos, ms")
        .eq("competencia_id", data.id)
        .eq("user_id", context.userId)
        .eq("pregunta_idx", idx)
        .maybeSingle();
      miRespuesta = r;
      const vencida = comp.estado === "en_curso" && Date.now() > deadlineMs(comp, yo);
      const revelar = !!r || vencida || comp.estado === "finalizada";
      const eliminadas =
        ef.eliminar_idx === idx || yo.cincuenta_idx === idx
          ? opcionesAEliminar(p.opciones.length, p.correcta, p.casi_correcta, p.id)
          : [];
      pregunta = {
        id: p.id,
        idx,
        total: pregs.length,
        enunciado: p.enunciado,
        opciones: p.opciones,
        nivel: p.nivel,
        area: p.area,
        imagen: await firmar(db, p.imagen_url),
        eliminadas,
        pista: ef.pista_idx === idx && p.explicacion ? String(p.explicacion).slice(0, 160) + "…" : null,
        correcta: revelar ? p.correcta : null,
        casi: revelar ? p.casi_correcta : null,
        explicacion: revelar ? p.explicacion : null,
      };
    }
    const { data: parts } = await db
      .from("competencia_participantes")
      .select("user_id, nombre, puntaje, racha, aciertos")
      .eq("competencia_id", data.id)
      .order("puntaje", { ascending: false });
    const ocultar = ef.ranking_oculto && comp.estado !== "finalizada";
    const lista = parts ?? [];
    const posicion = lista.findIndex((p: any) => p.user_id === context.userId) + 1;
    return {
      serverNow: Date.now(),
      comp: {
        id: comp.id,
        titulo: comp.titulo,
        estado: comp.estado,
        pregunta_actual: idx,
        inicio_at: comp.inicio_at,
        fin_at: comp.fin_at,
        duracion_min: comp.duracion_min,
        deadline: deadlineMs(comp, yo),
        duracion_ms: comp.pregunta_duracion_ms,
        pausa_restante_ms: comp.pausa_restante_ms,
        efectos: ef,
        total: pregs.length,
      },
      yo,
      pregunta,
      miRespuesta,
      ranking: ocultar ? null : lista.map((p: any) => ({ user_id: p.user_id, nombre: p.nombre, puntaje: p.puntaje, racha: p.racha })),
      rivales: lista.filter((p: any) => p.user_id !== context.userId).map((p: any) => ({ user_id: p.user_id, nombre: p.nombre })),
      posicion,
      totalParticipantes: lista.length,
    };
  });

export const responderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid, idx: z.number().int().min(0), opcion: z.number().int().min(0).max(4) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    const [{ data: comp }, { data: yo }] = await Promise.all([
      db.from("competencias").select("*").eq("id", data.id).single(),
      db.from("competencia_participantes").select("*").eq("competencia_id", data.id).eq("user_id", context.userId).maybeSingle(),
    ]);
    if (!comp || !yo) throw new Error("No inscrito.");
    if (!yo.acepto_reglas) throw new Error("Debes aceptar las reglas.");
    if (comp.estado !== "en_curso" || comp.pregunta_actual !== data.idx) throw new Error("La pregunta ya cambió.");
    const now = Date.now();
    const deadline = deadlineMs(comp, yo);
    if (now > deadline + 1500) throw new Error("Se acabó el tiempo.");
    const pregs = await cargarPreguntas(db, data.id);
    const p = pregs[data.idx];
    const frac = fraccionRespuesta(data.opcion, p.correcta, p.casi_correcta);
    const congelado = yo.congelar_idx === data.idx ? 10000 : 0;
    const ms = Math.max(0, now - new Date(comp.pregunta_inicio).getTime() - congelado);
    const r = calcularPuntos({
      fraccion: frac,
      ms,
      duracionMs: comp.pregunta_duracion_ms,
      rachaPrev: yo.racha,
      escudo: yo.escudo,
      dobleNada: yo.doble_idx === data.idx,
      efectos: comp.efectos ?? {},
      idx: data.idx,
    });
    const { error } = await db.from("competencia_respuestas").insert({
      competencia_id: data.id,
      user_id: context.userId,
      pregunta_idx: data.idx,
      opcion: data.opcion,
      fraccion: frac,
      puntos: r.puntos,
      ms,
    });
    if (error) throw new Error("Ya respondiste esta pregunta.");
    await db
      .from("competencia_participantes")
      .update({
        puntaje: yo.puntaje + r.puntos,
        racha: r.racha,
        mejor_racha: Math.max(yo.mejor_racha, r.racha),
        aciertos: yo.aciertos + (frac === 1 ? 1 : 0),
        leves: yo.leves + (frac === 0.25 ? 1 : 0),
        escudo: r.escudo,
      })
      .eq("competencia_id", data.id)
      .eq("user_id", context.userId);
    return { fraccion: frac, puntos: r.puntos, racha: r.racha, multiplicador: r.multiplicador, velocidad: r.velocidad };
  });

export const usarPotenciadorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        tipo: z.enum(Object.keys(POTENCIADORES_ESTUDIANTE) as [string, ...string[]]),
        objetivo: uuid.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    const [{ data: comp }, { data: yo }] = await Promise.all([
      db.from("competencias").select("*").eq("id", data.id).single(),
      db.from("competencia_participantes").select("*").eq("competencia_id", data.id).eq("user_id", context.userId).maybeSingle(),
    ]);
    if (!comp || !yo) throw new Error("No inscrito.");
    if (comp.estado !== "en_curso") throw new Error("Solo durante una pregunta activa.");
    if ((yo.potenciadores_usados ?? []).includes(data.tipo)) throw new Error("Ya usaste este potenciador.");
    const idx = comp.pregunta_actual;
    const { data: yaResp } = await db
      .from("competencia_respuestas")
      .select("id")
      .eq("competencia_id", data.id)
      .eq("user_id", context.userId)
      .eq("pregunta_idx", idx)
      .maybeSingle();
    if (yaResp && data.tipo !== "virus" && data.tipo !== "escudo") throw new Error("Úsalo antes de responder.");
    const upd: any = { potenciadores_usados: [...(yo.potenciadores_usados ?? []), data.tipo] };
    let mensaje = "";
    if (data.tipo === "congelar") { upd.congelar_idx = idx; mensaje = "Tiempo congelado 10 s"; }
    if (data.tipo === "cincuenta") { upd.cincuenta_idx = idx; mensaje = "2 opciones eliminadas"; }
    if (data.tipo === "escudo") { upd.escudo = true; upd.virus_hasta = -1; mensaje = "Escudo activado"; }
    if (data.tipo === "doble") { upd.doble_idx = idx; mensaje = "¡Doble o nada!"; }
    if (data.tipo === "virus") {
      if (!data.objetivo || data.objetivo === context.userId) throw new Error("Elige un rival.");
      const { data: obj } = await db
        .from("competencia_participantes")
        .select("escudo, nombre")
        .eq("competencia_id", data.id)
        .eq("user_id", data.objetivo)
        .maybeSingle();
      if (!obj) throw new Error("Rival no encontrado.");
      if (obj.escudo) {
        await db.from("competencia_participantes").update({ escudo: false }).eq("competencia_id", data.id).eq("user_id", data.objetivo);
        mensaje = `${obj.nombre} bloqueó tu virus con su escudo 🛡️`;
      } else {
        const turnos = Math.random() < 0.5 ? 2 : 3;
        await db
          .from("competencia_participantes")
          .update({ virus_hasta: idx + turnos - 1, virus_de: yo.nombre })
          .eq("competencia_id", data.id)
          .eq("user_id", data.objetivo);
        mensaje = `Virus enviado a ${obj.nombre} por ${turnos} preguntas 🦠`;
      }
    }
    await db.from("competencia_participantes").update(upd).eq("competencia_id", data.id).eq("user_id", context.userId);
    return { ok: true, mensaje };
  });

export const reportarAlertaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        tipo: z.enum(["cambio_pestana", "perdio_foco", "copiar", "pegar", "cortar", "clic_derecho", "captura", "salio_pantalla_completa", "dos_pestanas"]),
        detalle: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { exigirModulo } = await import('./grupo-config.server');
    await exigirModulo(context.supabase, context.userId, 'competencias');
    const db = await admin();
    const { data: yo } = await db
      .from("competencia_participantes")
      .select("nombre, alertas")
      .eq("competencia_id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!yo) return { ok: false };
    await db.from("competencia_alertas").insert({
      competencia_id: data.id,
      user_id: context.userId,
      nombre: yo.nombre,
      tipo: data.tipo,
      detalle: data.detalle ?? null,
    });
    await db
      .from("competencia_participantes")
      .update({ alertas: (yo.alertas ?? 0) + 1 })
      .eq("competencia_id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
