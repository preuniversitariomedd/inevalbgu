-- ============ MENSAJERÍA (chat 1:1 + difusión admin) ============

-- Tabla de conversaciones (siempre 1:1)
CREATE TABLE public.conversaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  ultimo_mensaje_at timestamptz NOT NULL DEFAULT now(),
  ultimo_mensaje_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversaciones TO authenticated;
GRANT ALL ON public.conversaciones TO service_role;
ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;

-- Participantes (2 por conversación)
CREATE TABLE public.conversacion_participantes (
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  no_leidos int NOT NULL DEFAULT 0,
  ultima_lectura_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversacion_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversacion_participantes TO authenticated;
GRANT ALL ON public.conversacion_participantes TO service_role;
ALTER TABLE public.conversacion_participantes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_part_user ON public.conversacion_participantes(user_id);
CREATE INDEX idx_part_conv ON public.conversacion_participantes(conversacion_id);

-- Mensajes
CREATE TABLE public.mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.conversaciones(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  contenido text,
  attachment_path text,
  attachment_tipo text,
  es_admin_intervencion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mensajes TO authenticated;
GRANT ALL ON public.mensajes TO service_role;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_msg_conv_created ON public.mensajes(conversacion_id, created_at);

-- ============ Función helper: soy participante? ============
CREATE OR REPLACE FUNCTION public.es_participante(_conv_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversacion_participantes
    WHERE conversacion_id = _conv_id AND user_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.es_participante(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_participante(uuid, uuid) TO authenticated, service_role;

-- ============ RLS: conversaciones ============
CREATE POLICY "conv_select_participante_o_admin" ON public.conversaciones
  FOR SELECT TO authenticated USING (
    public.es_participante(id, auth.uid()) OR public.has_role(auth.uid(), 'administrador')
  );
CREATE POLICY "conv_insert_auth" ON public.conversaciones
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "conv_update_participante_o_admin" ON public.conversaciones
  FOR UPDATE TO authenticated USING (
    public.es_participante(id, auth.uid()) OR public.has_role(auth.uid(), 'administrador')
  );

-- ============ RLS: participantes ============
CREATE POLICY "part_select_propios_o_admin" ON public.conversacion_participantes
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.es_participante(conversacion_id, auth.uid())
    OR public.has_role(auth.uid(), 'administrador')
  );
CREATE POLICY "part_insert_auth" ON public.conversacion_participantes
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'administrador') OR public.has_role(auth.uid(), 'docente')
  );
CREATE POLICY "part_update_propio" ON public.conversacion_participantes
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ RLS: mensajes ============
CREATE POLICY "msg_select_participante_o_admin" ON public.mensajes
  FOR SELECT TO authenticated USING (
    public.es_participante(conversacion_id, auth.uid()) OR public.has_role(auth.uid(), 'administrador')
  );
CREATE POLICY "msg_insert_participante_o_admin" ON public.mensajes
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND (public.es_participante(conversacion_id, auth.uid()) OR public.has_role(auth.uid(), 'administrador'))
  );

-- ============ Trigger updated_at + resumen último mensaje + no_leidos ============
CREATE OR REPLACE FUNCTION public.after_mensaje_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversaciones
    SET ultimo_mensaje_at = NEW.created_at,
        ultimo_mensaje_preview = LEFT(COALESCE(NEW.contenido, CASE WHEN NEW.attachment_path IS NOT NULL THEN '📷 Imagen' ELSE '' END), 140),
        updated_at = now()
    WHERE id = NEW.conversacion_id;
  UPDATE public.conversacion_participantes
    SET no_leidos = no_leidos + 1
    WHERE conversacion_id = NEW.conversacion_id AND user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_after_mensaje_insert
  AFTER INSERT ON public.mensajes
  FOR EACH ROW EXECUTE FUNCTION public.after_mensaje_insert();

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversacion_participantes;

-- ============ Storage: chat-attachments ============
-- Solo participantes (o admin) pueden ver/subir archivos.
-- Path convention: <conversacion_id>/<user_id>/<uuid>.<ext>
CREATE POLICY "chat_att_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'chat-attachments' AND (
      public.es_participante((storage.foldername(name))[1]::uuid, auth.uid())
      OR public.has_role(auth.uid(), 'administrador')
    )
  );
CREATE POLICY "chat_att_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'chat-attachments' AND (
      public.es_participante((storage.foldername(name))[1]::uuid, auth.uid())
      OR public.has_role(auth.uid(), 'administrador')
    )
  );