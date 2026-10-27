import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
type Valor = string | number | boolean | null | Valor[] | { [k: string]: Valor };
export type InformeSeccion = { nombre: string; filas: Record<string, Valor>[] };
export const informeCursoFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ grupoId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin, error: authError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
    if (authError || !admin) throw new Error('Solo el administrador puede descargar los datos completos de un curso.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { leerTodas, notasUsuario } = await import('./calificacion-periodo.server');
    const { data: grupo, error } = await db.from('grupos').select('*').eq('id', data.grupoId).single();
    if (error || !grupo) throw new Error('Curso no disponible.');
    const miembros = await leerTodas<{ user_id: string; grupo_id: string; created_at: string }>(() => db.from('grupo_estudiantes').select('*').eq('grupo_id', grupo.id).order('user_id'));
    const ids = miembros.map(m => m.user_id);
    const secciones: InformeSeccion[] = [{ nombre: 'Curso', filas: [grupo] }, { nombre: 'Matrícula', filas: miembros }];
    async function agregar(nombre: string, tabla: string, columna: string, valores: string[], orden = 'id') {
      const filas: Record<string, unknown>[] = [];
      for (let i=0;i<valores.length;i+=100) {
        filas.push(...await leerTodas<Record<string, unknown>>(() => {
          let q = (db as any).from(tabla).select('*').in(columna, valores.slice(i,i+100)).order(orden);
          if (tabla === 'tarea_vistas' || tabla === 'biblioteca_favoritos' || tabla === 'competencia_participantes') q = q.order('user_id');
          return q;
        }));
      }
      secciones.push({ nombre, filas: filas as Record<string, Valor>[] }); return filas;
    }
    await agregar('Configuración', 'grupo_configuracion', 'grupo_id', [grupo.id], 'grupo_id');
    const periodos = await agregar('Períodos', 'periodos_calificacion', 'grupo_id', [grupo.id]);
    await agregar('Estudiantes', 'profiles', 'id', ids);
    await agregar('Roles', 'user_roles', 'user_id', ids);
    const tablas = [
      ['Respuestas','respuestas','id'], ['Sesiones y simulacros','sesiones_practica','id'],
      ['Conexiones','sesiones_conexion','id'], ['Intervalos de tiempo','tiempo_calificacion_eventos','id'],
      ['Alertas de presencia','alertas_presencia','id'], ['Conocimiento','conocimiento_progreso','user_id'],
      ['Razonamiento','razonamiento_progreso','user_id'], ['Encuesta respuestas','encuesta_respuestas','id'],
      ['Encuesta progreso','encuesta_progreso','id'], ['Tareas vistas','tarea_vistas','tarea_id'],
      ['Biblioteca vistas','biblioteca_vistas','id'], ['Biblioteca favoritos','biblioteca_favoritos','recurso_id'],
      ['Competencia participantes','competencia_participantes','competencia_id'], ['Competencia respuestas','competencia_respuestas','id'],
      ['Competencia alertas','competencia_alertas','id'],
    ];
    for (const [nombre,tabla,orden] of tablas) {
      if (nombre && tabla && orden) await agregar(nombre,tabla,'user_id',ids,orden);
    }
    const tg = await agregar('Tareas del curso','tarea_grupos','grupo_id',[grupo.id],'tarea_id');
    const tareasIds = [...new Set(tg.map(r => String(r.tarea_id)))];
    await agregar('Tareas','tareas','id',tareasIds);
    await agregar('Adjuntos de tareas','tarea_adjuntos','tarea_id',tareasIds);
    const recursosIds = [...new Set(secciones.filter(s => s.nombre.startsWith('Biblioteca')).flatMap(s => s.filas.map(r => String(r.recurso_id))))];
    await agregar('Recursos consultados','biblioteca_recursos','id',recursosIds);
    await agregar('Archivos de biblioteca','biblioteca_archivos','recurso_id',recursosIds);
    const compIds = [...new Set(secciones.filter(s => s.nombre.startsWith('Competencia')).flatMap(s => s.filas.map(r => String(r.competencia_id))))];
    await agregar('Competencias','competencias','id',compIds);
    await agregar('Preguntas de competencia','competencia_preguntas','competencia_id',compIds);
    // Only the student's own tutor history, never another participant's private communications.
    const hilos = await agregar('Tutor hilos','chat_threads','user_id',ids);
    await agregar('Tutor mensajes','chat_messages','thread_id',hilos.map(h => String(h.id)));
    const calificaciones: Record<string,unknown>[] = [];
    for (let i=0;i<ids.length;i+=4) {
      const lote = await Promise.all(ids.slice(i,i+4).map(async userId => {
        const notas = await notasUsuario(db,userId,null,grupo.id);
        const historico = { user_id: userId, periodo: 'Todo el historial', nota: notas.global.nota, componentes: notas.global.componentes, ponderaciones: notas.global.ponderaciones, asignaturas: notas.asignaturas.map(a => ({ clave:a.clave, nota:a.nota })), horas_plataforma: notas.horasPlataforma, horas_activas: notas.horasActivas };
        const evaluaciones = [];
        for (const p of periodos) {
          const n = await notasUsuario(db,userId,p as any,grupo.id);
          evaluaciones.push({ user_id: userId, periodo:p.nombre, fecha_inicio:p.fecha_inicio, fecha_fin:p.fecha_fin, nota:n.global.nota, componentes:n.global.componentes, ponderaciones:n.global.ponderaciones, asignaturas:n.asignaturas.map(a => ({ clave:a.clave, nota:a.nota })), tiempo_historico_incompleto:n.tiempoHistoricoIncompleto });
        }
        return [historico,...evaluaciones];
      })); calificaciones.push(...lote.flat());
    }
    secciones.splice(1,0,{ nombre:'Calificaciones',filas:calificaciones as Record<string, Valor>[] });
    return { grupo: { id:grupo.id,nombre:grupo.nombre }, generadoEn:new Date().toISOString(), secciones, alcance:'Historial completo de los miembros actuales del curso. Incluye registros académicos, de conexión, encuestas, actividades y tutor personal. No incluye contraseñas, PIN, comunicaciones privadas entre usuarios ni el contenido binario de adjuntos; los archivos se describen mediante sus datos guardados.' };
  });