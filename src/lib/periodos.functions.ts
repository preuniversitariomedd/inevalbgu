import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const listarPeriodosFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ targetUserId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let ids: string[] | undefined;
    if (data.targetUserId) {
      if (data.targetUserId !== context.userId) {
        const { data: staff } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
        if (!staff) throw new Error('Sin permisos.');
      }
      const { data: grupos, error } = await context.supabase.from('grupo_estudiantes').select('grupo_id').eq('user_id', data.targetUserId);
      if (error) throw new Error(error.message);
      ids = (grupos ?? []).map(g => g.grupo_id);
      if (!ids.length) return [];
    }
    let q = context.supabase.from('periodos_calificacion').select('id,grupo_id,nombre,fecha_inicio,fecha_fin').order('fecha_inicio', { ascending: false });
    if (ids) q = q.in('grupo_id', ids);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T00:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v; }, 'Fecha inválida');
export const crearPeriodoFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ grupo_id: z.string().uuid(), nombre: z.string().trim().min(1).max(120), fecha_inicio: fecha, fecha_fin: fecha }).refine(d => d.fecha_fin >= d.fecha_inicio, 'La fecha final debe ser igual o posterior al inicio.').parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
    if (!admin) throw new Error('Solo el administrador puede crear períodos.');
    const { data: row, error } = await context.supabase.from('periodos_calificacion').insert({ ...data, created_by: context.userId }).select('id,grupo_id,nombre,fecha_inicio,fecha_fin').single();
    if (error) throw new Error(error.message);
    return row;
  });
