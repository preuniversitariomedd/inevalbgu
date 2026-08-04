CREATE TABLE public.envios_masivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  contenido text NOT NULL,
  audiencia text NOT NULL DEFAULT 'manual',
  total_destinatarios integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.envios_masivos TO authenticated;
GRANT ALL ON public.envios_masivos TO service_role;
ALTER TABLE public.envios_masivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve envios" ON public.envios_masivos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'administrador'::public.app_role) OR sender_id = auth.uid());

CREATE TABLE public.envio_masivo_destinatarios (
  envio_id uuid NOT NULL REFERENCES public.envios_masivos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conversacion_id uuid,
  mensaje_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (envio_id, user_id)
);
GRANT SELECT ON public.envio_masivo_destinatarios TO authenticated;
GRANT ALL ON public.envio_masivo_destinatarios TO service_role;
ALTER TABLE public.envio_masivo_destinatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ve destinatarios" ON public.envio_masivo_destinatarios FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.envios_masivos e WHERE e.id = envio_id AND (e.sender_id = auth.uid() OR public.has_role(auth.uid(),'administrador'::public.app_role))));

CREATE INDEX idx_envio_dest_envio ON public.envio_masivo_destinatarios(envio_id);