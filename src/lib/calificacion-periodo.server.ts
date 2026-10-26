import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { avanceDesdeEventos, dentroPeriodo, limitesPeriodo, recortarTiempo, type Periodo } from './periodos';
import { calcularNotaGlobal, type AvanceNiveles } from './nota-global';
import { calcularNotasAsignaturas, asignaturaDe } from './asignaturas';
import { configuracionUsuario } from './grupo-config.server';

type DB = SupabaseClient<Database>;
export async function leerTodas<T>(crear: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await crear().range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}
export async function obtenerPeriodo(db: DB, id: string | undefined, userId?: string): Promise<Periodo | null> {
  if (!id) return null;
  const { data, error } = await db.from('periodos_calificacion').select('id,grupo_id,nombre,fecha_inicio,fecha_fin').eq('id', id).single();
  if (error || !data) throw new Error('Período no disponible.');
  if (userId) {
    const { data: miembro, error: e } = await db.from('grupo_estudiantes').select('user_id').eq('grupo_id', data.grupo_id).eq('user_id', userId).maybeSingle();
    if (e || !miembro) throw new Error('El estudiante no pertenece al grupo de este período.');
  }
  return data;
}
export async function notasUsuario(db: DB, userId: string, periodo: Periodo | null, grupoId?: string) {
  const configuracion = await configuracionUsuario(db, userId, periodo?.grupo_id ?? grupoId);
  const [conexiones, sesiones, respuestas] = await Promise.all([
    leerTodas<Database['public']['Tables']['sesiones_conexion']['Row']>(() => db.from('sesiones_conexion').select('*').eq('user_id', userId).order('id')),
    leerTodas<Database['public']['Tables']['sesiones_practica']['Row']>(() => db.from('sesiones_practica').select('*').eq('user_id', userId).order('id')),
    leerTodas<Database['public']['Tables']['respuestas']['Row']>(() => db.from('respuestas').select('*').eq('user_id', userId).order('id')),
  ]);
  let con = conexiones.map(c => ({ iniciada_en: c.iniciada_en, segundos_visible: c.segundos_visible, segundos_oculto: c.segundos_oculto, segundos_interaccion: c.segundos_interaccion }));
  let ses = sesiones;
  let resp = respuestas;
  let conProg: AvanceNiveles | null = null, razProg: AvanceNiveles | null = null;
  let tiempoHistoricoIncompleto = false;
  if (periodo) {
    const { inicio, fin } = limitesPeriodo(periodo);
    const eventos = await leerTodas<Database['public']['Tables']['tiempo_calificacion_eventos']['Row']>(() => db.from('tiempo_calificacion_eventos').select('*').eq('user_id', userId).lt('inicio', new Date(fin).toISOString()).gt('fin', new Date(inicio).toISOString()).order('id'));
    con = eventos.map(e => recortarTiempo(e, periodo));
    // Legacy sessions may be used only when their entire measured interval is inside the period.
    const { data: primerEvento, error } = await db.from('tiempo_calificacion_eventos').select('inicio').eq('user_id', userId).order('inicio').limit(1);
    if (error) throw new Error(error.message);
    const corte = primerEvento?.[0]?.inicio;
    for (const c of conexiones) {
      const a = new Date(c.iniciada_en).getTime(), b = new Date(c.ultimo_heartbeat).getTime();
      if (b <= inicio || a >= fin) continue;
      if (corte && c.ultimo_heartbeat >= corte) {
        if (c.iniciada_en < corte && a < fin && new Date(corte).getTime() > inicio) tiempoHistoricoIncompleto = true;
        continue;
      }
      if (a >= inicio && b <= fin) con.push({ iniciada_en: c.iniciada_en, segundos_visible: c.segundos_visible, segundos_oculto: c.segundos_oculto, segundos_interaccion: c.segundos_interaccion });
      else tiempoHistoricoIncompleto = true;
    }
    ses = sesiones.filter(s => dentroPeriodo(s.iniciada_en, periodo) && dentroPeriodo(s.finalizada_en, periodo));
    resp = respuestas.filter(r => dentroPeriodo(r.respondida_en, periodo));
    conProg = avanceDesdeEventos(resp, 'Conocimiento');
    razProg = avanceDesdeEventos(resp, 'Razonamiento');
  } else {
    const [c, r] = await Promise.all([db.from('conocimiento_progreso').select('aciertos').eq('user_id', userId).maybeSingle(), db.from('razonamiento_progreso').select('aciertos').eq('user_id', userId).maybeSingle()]);
    if (c.error || r.error) throw new Error('No se pudo leer el avance.');
    conProg = c.data as AvanceNiveles | null; razProg = r.data as AvanceNiveles | null;
  }
  const idsPracticas = new Set(ses.filter(s => s.tipo === 'practica').map(s => s.id));
  const practicas = resp.filter(r => r.area !== 'Conocimiento' && r.area !== 'Razonamiento' && (!r.sesion_id || idsPracticas.has(r.sesion_id)));
  const global = calcularNotaGlobal(con, ses, conProg, razProg, configuracion.ponderaciones, practicas);
  const resumen = calcularNotasAsignaturas(con, ses);
  // Same 10/30/30/30 weights for each subject, with its own exam results.
  const asignaturas = resumen.asignaturas.map(a => {
    const g = calcularNotaGlobal(con, ses.filter(s => asignaturaDe(s.area) === a.clave), conProg, razProg, configuracion.ponderaciones, practicas.filter(r => asignaturaDe(r.area) === a.clave));
    return { ...a, nota: g.nota, global: g };
  });
  const matematica = asignaturas.find(a => a.clave === 'matematica');
  const fisica = asignaturas.find(a => a.clave === 'fisica');
  return { ...resumen, matematica: matematica ?? resumen.matematica, fisica: fisica ?? resumen.fisica, asignaturas, global, periodo, configuracion, tiempoHistoricoIncompleto, respuestas: resp, sesiones: ses };
}
