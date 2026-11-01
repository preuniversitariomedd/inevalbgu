import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CLAVES_ACTUALIZACION_GRUPO } from '@/lib/grupo-actualizaciones';

export function ActualizacionesGrupo() {
  const qc = useQueryClient();
  useEffect(() => {
    const actualizar = () => {
      for (const key of CLAVES_ACTUALIZACION_GRUPO) void qc.invalidateQueries({ queryKey: [key] });
    };
    const channel = supabase.channel(`grupo-config-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupo_configuracion' }, actualizar)
      .subscribe(status => { if (status === 'SUBSCRIBED') actualizar(); });
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
  return null;
}