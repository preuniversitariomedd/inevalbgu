import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { validarConfirmacionReinicio } from './reinicio-reglas';
import { calcularNotaGlobal } from './nota-global';
import { calcularNotasAsignaturas } from './asignaturas';

async function administrador(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
  if (error || !data) throw new Error('Solo el administrador puede respaldar o reiniciar avances.');
}
function mensajeError(error: { message: string }) {
  if (/function|column|schema cache|does not exist/i.test(error.message)) return 'El reinicio protegido aún requiere activar Lovable Cloud y aplicar su configuración; no se borró ningún dato.';
  return error.message;
}
export const prepararReinicioFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await administrador(context);
  const db = context.supabase as any;
  const { data: id, error } = await db.rpc('preparar_respaldo_academico');
  if (error) throw new Error(mensajeError(error));
  const { data: respaldo, error: e } = await db.from('respaldos_academicos').select('*').eq('id', id).single();
  if (e || !respaldo) throw new Error('No se pudo leer el respaldo; no se borró ningún dato.');
  const datos = respaldo.datos;
  const notas = (datos.estudiantes ?? []).map((p: { id: string; nombres: string; cedula: string }) => {
    const filas = (tabla: string) => (datos[tabla] ?? []).filter((r: { user_id: string }) => r.user_id === p.id);
    const con = filas('sesiones_conexion'), ses = filas('sesiones_practica');
    const global = calcularNotaGlobal(con, ses, filas('conocimiento_progreso')[0], filas('razonamiento_progreso')[0]);
    return { user_id: p.id, cedula: p.cedula, nombres: p.nombres, global, estadisticas: calcularNotasAsignaturas(con, ses) };
  });
  return { id: String(respaldo.id), huella: String(respaldo.huella), creadoEn: String(respaldo.creado_en), total: notas.length,
    archivo: { version: 1, creadoEn: respaldo.creado_en, respaldoId: respaldo.id, huella: respaldo.huella, notas, datos,
      alcance: 'Respaldo académico completo de estudiantes sin roles de personal. Conserva preguntas respondidas, sesiones, avances, conexiones, encuestas y actividades. No contiene contraseñas, PIN ni conversaciones privadas. Los archivos compartidos y las cuentas se conservan. Sistemas antiguos guardados solo en dispositivos no forman parte del respaldo.' } };
});
export const reiniciarEstudiantesFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const v = z.object({ respaldoId: z.string().uuid(), huella: z.string().min(1), confirmacion: z.string(), descargado: z.boolean() }).parse(d);
    validarConfirmacionReinicio(v.confirmacion, v.descargado); return v;
  }).handler(async ({ context, data }) => {
    await administrador(context);
    const { error } = await (context.supabase as any).rpc('reiniciar_avances_academicos', { _respaldo: data.respaldoId, _huella: data.huella });
    if (error) throw new Error(mensajeError(error));
    return { ok: true };
  });
export const listarRespaldosFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await administrador(context);
  const { data, error } = await (context.supabase as any).from('respaldos_academicos').select('id,creado_en,reiniciado_en').order('creado_en', { ascending: false }).limit(50);
  if (error) throw new Error(mensajeError(error));
  return (data ?? []) as { id: string; creado_en: string; reiniciado_en: string | null }[];
});
export const descargarRespaldoFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await administrador(context);
    const { data: b, error } = await (context.supabase as any).from('respaldos_academicos').select('*').eq('id',data.id).single();
    if (error || !b) throw new Error('Respaldo no disponible.');
    return b;
  });