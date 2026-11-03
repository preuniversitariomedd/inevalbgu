import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MODULOS_EXAMEN, TIPOS_INFRACCION, type ModuloExamen, type TipoInfraccion } from "@/lib/antifraude";

export const iniciarEvaluacionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { modulo: ModuloExamen }) => {
    if (!MODULOS_EXAMEN.includes(d.modulo)) throw new Error("Módulo inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: r, error } = await (context.supabase as any).rpc("iniciar_evaluacion", { _modulo: data.modulo });
    if (error) throw new Error("No se pudo iniciar la evaluación.");
    return r as { intento_id?: string; infracciones?: number; bloqueado_hasta?: string };
  });

export const registrarInfraccionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { intentoId: string; tipo: TipoInfraccion }) => {
    if (!TIPOS_INFRACCION.includes(d.tipo)) throw new Error("Tipo inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: r, error } = await (context.supabase as any).rpc("registrar_infraccion", { _intento: data.intentoId, _tipo: data.tipo });
    if (error) throw new Error("No se pudo registrar la infracción.");
    return r as { numero: number; cerrado: boolean; ignorada: boolean };
  });

export const finalizarEvaluacionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { intentoId: string; nota: number }) => d)
  .handler(async ({ data, context }) => {
    await (context.supabase as any).rpc("finalizar_evaluacion", { _intento: data.intentoId, _nota: data.nota });
    return { ok: true };
  });

export const listarInfraccionesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: staff } = await sb.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("No autorizado");
    const { data: v, error } = await sb.from("violations").select("id,user_id,modulo,tipo,numero,created_at").order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    const ids = [...new Set((v ?? []).map((x: any) => x.user_id))];
    const { data: p } = ids.length ? await sb.from("profiles").select("id,nombres,cedula").in("id", ids) : { data: [] };
    const m = new Map((p ?? []).map((x: any) => [x.id, x]));
    return (v ?? []).map((x: any) => ({ ...x, nombres: (m.get(x.user_id) as any)?.nombres ?? "—", cedula: (m.get(x.user_id) as any)?.cedula ?? "" }));
  });
