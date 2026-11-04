import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const leerVisibilidadFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('apartados_visibilidad').select('apartado,visible');
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map(r => [r.apartado, r.visible]));
});
export const guardarVisibilidadFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ apartado: z.enum(['practicas','banco','fisica','ciencias','sociales']), visible: z.boolean() }).strict().parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin, error: rolError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
    if (rolError || !admin) throw new Error('Solo el administrador puede cambiar la visibilidad.');
    const { error } = await context.supabase.from('apartados_visibilidad').upsert({ ...data, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });