import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { accesoCombinado, pesosActivos, MODULOS_DEFAULT, PESOS_DEFAULT, type Modulos, type Pesos, type Modulo } from './grupo-config';
type DB = SupabaseClient<Database>;
export async function configuracionUsuario(db: DB, userId: string, grupoId?: string) {
  const { data: miembros, error } = await db.from('grupo_estudiantes').select('grupo_id,grupos(id,nombre)').eq('user_id', userId).order('grupo_id');
  if (error) throw new Error(error.message);
  const grupos = (miembros ?? []).flatMap(m => m.grupos ? [m.grupos] : []).sort((a,b) => a.nombre.localeCompare(b.nombre));
  if (grupoId && !grupos.some(g => g.id === grupoId)) throw new Error('El estudiante no pertenece a este grupo.');
  const ids = grupos.map(g => g.id);
  const { data: configs, error: e } = ids.length ? await db.from('grupo_configuracion').select('*').in('grupo_id', ids) : { data: [], error: null };
  if (e) throw new Error(e.message);
  const configsTyped = (configs ?? []).map(c => ({ ...c, modulos: c.modulos as Partial<Modulos>, ponderaciones: c.ponderaciones as Pesos }));
  const seleccionado = grupos.find(g => g.id === grupoId) ?? grupos[0] ?? null;
  const config = configsTyped.find(c => c.grupo_id === seleccionado?.id);
  const modulos = accesoCombinado(configsTyped);
  return { modulos, ponderaciones: pesosActivos(modulos, config?.ponderaciones ?? PESOS_DEFAULT), grupos, grupo: seleccionado, modulosGrupo: { ...MODULOS_DEFAULT, ...config?.modulos } };
}
export async function exigirModulo(db: DB, userId: string, modulo: Modulo) {
  const { data, error } = await db.rpc('modulo_habilitado', { _user_id: userId, _modulo: modulo });
  if (error || !data) throw new Error('Este apartado no está habilitado para tu grupo.');
}