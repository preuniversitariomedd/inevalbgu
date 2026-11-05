import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
type Valor = string | number | boolean | null | Valor[] | { [k: string]: Valor };
export type InformeSeccion = { nombre: string; filas: Record<string, Valor>[]; simple?: boolean };
export const informeCursoFn = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ grupoId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin, error: authError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'administrador' });
    if (authError || !admin) throw new Error('Solo el administrador puede descargar los datos completos de un curso.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { leerTodas, notasUsuario } = await import('./calificacion-periodo.server');
    const { data: grupo, error } = await db.from('grupos').select('id,nombre').eq('id', data.grupoId).single();
    if (error || !grupo) throw new Error('Curso no disponible.');
    const miembros = await leerTodas<{ user_id: string; grupo_id: string; created_at: string }>(() => db.from('grupo_estudiantes').select('user_id,grupo_id,created_at').eq('grupo_id', grupo.id).order('user_id'));
    const ids = miembros.map(m => m.user_id);
    const secciones: InformeSeccion[] = [];
    // Read only the columns the summary needs (keeps database transfer low).
    async function agregar(nombre: string, tabla: string, columna: string, valores: string[], cols: string, orden = 'id') {
      const filas: Record<string, unknown>[] = [];
      for (let i=0;i<valores.length;i+=100) {
        filas.push(...await leerTodas<Record<string, unknown>>(() => (db as any).from(tabla).select(cols).in(columna, valores.slice(i,i+100)).order(orden)));
      }
      secciones.push({ nombre, filas: filas as Record<string, Valor>[] }); return filas;
    }
    const periodos = await agregar('Períodos', 'periodos_calificacion', 'grupo_id', [grupo.id], 'id,nombre,fecha_inicio,fecha_fin,grupo_id');
    await agregar('Estudiantes', 'profiles', 'id', ids, 'id,cedula,nombres,created_at');
    await agregar('Respuestas', 'respuestas', 'user_id', ids, 'id,user_id,correcta,respondida_en');
    await agregar('Sesiones y simulacros', 'sesiones_practica', 'user_id', ids, 'id,user_id,puntaje_ineval,total_preguntas,correctas,iniciada_en');
    await agregar('Conexiones', 'sesiones_conexion', 'user_id', ids, 'id,user_id,iniciada_en,ultimo_heartbeat,segundos_visible,segundos_oculto,segundos_interaccion');
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
    // Summary sheet: one row per student, sorted by surname.
    const { separarNombre, compararApellidos, puntajePodio, notaSugerida } = await import('./resumen-curso');
    const sec = (n: string) => secciones.find(s => s.nombre === n)?.filas ?? [];
    const accesos = new Map<string, string | null>();
    for (let page = 1; page < 50; page++) {
      const { data: lu, error: le } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (le) break;
      for (const u of lu.users) accesos.set(u.id, u.last_sign_in_at ?? null);
      if (lu.users.length < 1000) break;
    }
    const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', dateStyle: 'short', timeStyle: 'short' }) : '';
    const maxIso = (...v: (string | null | undefined)[]) => v.filter(Boolean).sort().pop() ?? null;
    const resumen = sec('Estudiantes').map((p: any) => {
      const uid = String(p.id);
      const resp = sec('Respuestas').filter((r: any) => r.user_id === uid);
      const ses = sec('Sesiones y simulacros').filter((r: any) => r.user_id === uid);
      const con = sec('Conexiones').filter((r: any) => r.user_id === uid);
      const segundos = con.reduce((s, c: any) => s + (c.segundos_visible ?? 0) + (c.segundos_oculto ?? 0), 0);
      const mejor = ses.reduce((m, s: any) => Math.max(m, s.puntaje_ineval ?? (s.total_preguntas ? s.correctas / s.total_preguntas * 100 : 0)), 0);
      const correctas = resp.filter((r: any) => r.correcta).length;
      const ultima = maxIso(accesos.get(uid), ...con.map((c: any) => c.ultimo_heartbeat), ...resp.map((r: any) => r.respondida_en), ...ses.map((s: any) => s.iniciada_en));
      const ingreso = !!ultima;
      const notas = calificaciones.filter(c => c.user_id === uid);
      const historica = Number(notas.find(c => c.periodo === 'Todo el historial')?.nota ?? 0);
      const perNotas = notas.filter(c => c.periodo !== 'Todo el historial');
      const podio = puntajePodio(resp.length, correctas, segundos / 3600, mejor);
      const dias = ultima ? Math.floor((Date.now() - new Date(ultima).getTime()) / 86400000) : null;
      const sug = notaSugerida({ ingreso, historica, periodos: perNotas.map(c => Number(c.nota ?? 0)), podio, diasSinConexion: dias });
      const matricula = miembros.find(m => m.user_id === uid)?.created_at ?? p.created_at;
      return { ...separarNombre(String(p.nombres ?? '')), uid, cedula: String(p.cedula ?? ''), ingreso, podio, historica, perNotas, matricula, ultima, resp: resp.length, correctas, sug };
    }).sort(compararApellidos);
    const puestos = [...resumen].filter(r => r.ingreso).sort((a, b) => b.podio - a.podio);
    const filasResumen = resumen.map((r, i) => {
      const fila: Record<string, Valor> = { 'N.º': i + 1, 'Cédula': r.cedula, 'Apellidos': r.apellidos, 'Nombres': r.nombres };
      for (const p of periodos) fila[`Nota ${p.nombre} (${p.fecha_inicio} a ${p.fecha_fin})`] = Number(r.perNotas.find(c => c.periodo === p.nombre)?.nota ?? 0);
      Object.assign(fila, {
        'Nota histórica': r.historica,
        'Ingresó a la plataforma': r.ingreso ? 'Sí' : 'NUNCA INGRESÓ',
        'Puesto podio': r.ingreso ? puestos.indexOf(r) + 1 : '—',
        'Puntaje podio (/100)': r.podio,
        'Preguntas resueltas': r.resp, 'Correctas': r.correctas,
        'Fecha de inscripción': fmt(String(r.matricula ?? '')||null),
        'Última conexión': r.ultima ? fmt(r.ultima) : 'Nunca',
        'Nota sugerida (/10)': r.sug.nota,
        'Observación': r.sug.observacion,
      });
      return fila;
    });
    const nunca = resumen.filter(r => !r.ingreso).map((r, i) => ({ 'N.º': i + 1, 'Cédula': r.cedula, 'Apellidos': r.apellidos, 'Nombres': r.nombres, 'Fecha de inscripción': fmt(String(r.matricula ?? '')||null) }));
    const podioFilas = puestos.map((r, i) => ({ 'Puesto': i + 1, 'Cédula': r.cedula, 'Apellidos': r.apellidos, 'Nombres': r.nombres, 'Puntaje podio (/100)': r.podio, 'Preguntas resueltas': r.resp, 'Correctas': r.correctas }));
    const hms = (seg: number) => { const t = Math.round(seg); return `${Math.floor(t/3600)}h ${String(Math.floor(t%3600/60)).padStart(2,'0')}m`; };
    const conexionesFilas = resumen.map((r, i) => {
      const con = sec('Conexiones').filter((c: any) => c.user_id === r.uid);
      const total = con.reduce((s, c: any) => s + (c.segundos_visible ?? 0) + (c.segundos_oculto ?? 0), 0);
      const efectivo = con.reduce((s, c: any) => s + (c.segundos_interaccion ?? 0), 0);
      return { 'N.º': i + 1, 'Cédula': r.cedula, 'Apellidos': r.apellidos, 'Nombres': r.nombres,
        'N.º de conexiones': con.length,
        'Tiempo total': hms(total),
        'Tiempo promedio por conexión': con.length ? hms(total / con.length) : '0h 00m',
        'Tiempo efectivo (interacción)': hms(efectivo),
        '% efectivo': total ? Math.round(efectivo / total * 1000) / 10 : 0,
        'Última conexión': r.ultima ? fmt(r.ultima) : 'Nunca' };
    });
    secciones.length = 0;
    secciones.push(
      { nombre: 'Resumen por estudiante', filas: filasResumen, simple: true },
      { nombre: 'Podio', filas: podioFilas, simple: true },
      { nombre: 'Nunca ingresaron', filas: nunca, simple: true },
      { nombre: 'Conexiones', filas: conexionesFilas, simple: true });
    return { grupo: { id:grupo.id,nombre:grupo.nombre }, generadoEn:new Date().toISOString(), secciones, alcance:'Resumen por estudiante, podio, estudiantes que nunca ingresaron y conexiones de los miembros actuales del curso. Sin contraseñas, PIN ni mensajes privados.' };
  });