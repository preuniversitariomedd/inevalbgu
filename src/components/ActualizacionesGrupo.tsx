import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CLAVES_ACTUALIZACION_GRUPO } from '@/lib/grupo-actualizaciones';

export function ActualizacionesGrupo() {
  const qc = useQueryClient();
  useEffect(() => {
    const actualizar = () => {
      for (const key of CLAVES_ACTUALIZACION_GRUPO) void qc.invalidateQueries({ queryKey: [key], refetchType: document.hidden ? 'none' : 'active' });
    };
    const channel = supabase.channel(`grupo-config-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupo_configuracion' }, actualizar)
      .subscribe();
    const notas = () => {
      for (const key of ['calificacion', 'progreso']) void qc.invalidateQueries({ queryKey: [key], refetchType: document.hidden ? 'none' : 'active' });
    };
    window.addEventListener('notas-actualizadas', notas);
    const visible = () => { if (!document.hidden) { void qc.refetchQueries({ queryKey: ['mis-accesos'], type: 'active', stale: true }); } };
    document.addEventListener('visibilitychange', visible);
    return () => { window.removeEventListener('notas-actualizadas', notas); document.removeEventListener('visibilitychange', visible); void supabase.removeChannel(channel); };
  }, [qc]);
  return null;
}