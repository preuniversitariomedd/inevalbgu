
-- Foto de perfil del estudiante y último acceso
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Índices para consultar rápido por conversación / actividad
CREATE INDEX IF NOT EXISTS idx_mensajes_conv_created ON public.mensajes(conversacion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_ultmsg ON public.conversaciones(ultimo_mensaje_at DESC);

-- Permitir a los administradores borrar mensajes y conversaciones
DROP POLICY IF EXISTS "Admin puede borrar mensajes" ON public.mensajes;
CREATE POLICY "Admin puede borrar mensajes" ON public.mensajes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::public.app_role));

DROP POLICY IF EXISTS "Admin puede borrar conversaciones" ON public.conversaciones;
CREATE POLICY "Admin puede borrar conversaciones" ON public.conversaciones
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::public.app_role));

DROP POLICY IF EXISTS "Admin puede borrar participantes" ON public.conversacion_participantes;
CREATE POLICY "Admin puede borrar participantes" ON public.conversacion_participantes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::public.app_role));
