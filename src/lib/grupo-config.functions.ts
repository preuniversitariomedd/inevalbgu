import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { MODULOS, PARTES, MODULOS_DEFAULT, PESOS_DEFAULT, validarPesos, type Modulos, type Pesos } from './grupo-config';
const modulosSchema = z.object(Object.fromEntries(Object.keys(MODULOS).map(k => [k, z.boolean()]))).strict();
const pesosSchema = z.object(Object.fromEntries(Object.keys(PARTES).map(k => [k, z.number().min(0).max(100)]))).strict();
export const misAccesosFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: staff, error } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
  if (error) throw new Error(error.message);
  const { configuracionUsuario } = await import('./grupo-config.server');
  const c = await configuracionUsuario(context.supabase, context.userId);
  return { ...c, modulos: staff ? MODULOS_DEFAULT : c.modulos, staff: !!staff };
});
export const leerConfiguracionGrupoFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ grupoId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
    if (!admin) throw new Error('Solo el administrador puede configurar accesos.');
    const { data: c, error } = await context.supabase.from('grupo_configuracion').select('*').eq('grupo_id', data.grupoId).maybeSingle();
    if (error) throw new Error(error.message);
    return { modulos: { ...MODULOS_DEFAULT, ...(c?.modulos as Partial<Modulos>) }, ponderaciones: (c?.ponderaciones as Pesos | undefined) ?? PESOS_DEFAULT };
  });
export const guardarConfiguracionGrupoFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = z.object({ grupoId: z.string().uuid(), modulos: modulosSchema, ponderaciones: pesosSchema }).parse(d);
    validarPesos(v.modulos as Modulos, v.ponderaciones as Pesos); return v;
  }).handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
    if (!admin) throw new Error('Solo el administrador puede cambiar accesos y porcentajes.');
    const { error } = await context.supabase.from('grupo_configuracion').upsert({ grupo_id: data.grupoId, modulos: data.modulos, ponderaciones: data.ponderaciones, updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });