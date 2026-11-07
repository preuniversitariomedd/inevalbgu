import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CLAVES_ACTUALIZACION_GRUPO } from '@/lib/grupo-actualizaciones';
import { toast } from 'sonner';
import { usePestanaActiva } from '@/hooks/use-pestana-activa';

export function ActualizacionesGrupo() {
  const qc = useQueryClient();
  const activa = usePestanaActiva();
  useEffect(() => {
    if (!activa) return; // pestaña oculta mucho tiempo: sin conexión en vivo
    const actualizar = () => {
      for (const key of CLAVES_ACTUALIZACION_GRUPO) void qc.invalidateQueries({ queryKey: [key], refetchType: document.hidden ? 'none' : 'active' });
    };
    const channel = supabase.channel(`grupo-config-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupo_configuracion' }, actualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apartados_visibilidad' }, () => { actualizar(); void qc.invalidateQueries({ queryKey: ['visibilidad-global'], refetchType: document.hidden ? 'none' : 'active' }); })
      .subscribe();
    let canalReinicio: ReturnType<typeof supabase.channel> | null = null;
    let cerrado = false;
    void supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id; if (!uid || cerrado) return;
      canalReinicio = supabase.channel(`reinicio-${uid}-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conocimiento_progreso', filter: `user_id=eq.${uid}` }, (p: any) => {
          if (p.old?.generacion && p.new?.generacion && p.old.generacion === p.new.generacion) return;
          if (p.new && Object.keys(p.new.aciertos ?? {}).length > 0) return;
          toast.warning('Reinicio de notas: el administrador reinició las notas, avances y períodos. Tu avance empieza de nuevo.', { duration: 15000 });
          void qc.invalidateQueries();
        }).subscribe();
    });
    const notas = () => {
      for (const key of ['calificacion', 'progreso']) void qc.invalidateQueries({ queryKey: [key], refetchType: document.hidden ? 'none' : 'active' });
    };
    window.addEventListener('notas-actualizadas', notas);
    const visible = () => { if (!document.hidden) { void qc.refetchQueries({ queryKey: ['mis-accesos'], type: 'active', stale: true }); } };
    document.addEventListener('visibilitychange', visible);
    return () => { cerrado = true; window.removeEventListener('notas-actualizadas', notas); document.removeEventListener('visibilitychange', visible); void supabase.removeChannel(channel); if (canalReinicio) void supabase.removeChannel(canalReinicio); };
  }, [qc, activa]);
  // Al volver tras la pausa, recuperar cambios que pudieron perderse.
  useEffect(() => {
    if (!activa) return () => { for (const key of [...CLAVES_ACTUALIZACION_GRUPO, 'visibilidad-global']) void qc.invalidateQueries({ queryKey: [key], refetchType: 'active' }); };
  }, [qc, activa]);
  return null;
}