CREATE TABLE public.fisica_preguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema text NOT NULL,
  subtema text NOT NULL DEFAULT 'General',
  nivel text NOT NULL DEFAULT 'Básico',
  enunciado text NOT NULL,
  imagen_path text,
  opciones jsonb NOT NULL,
  respuesta_correcta integer NOT NULL DEFAULT 0,
  explicacion text,
  creador_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fisica_preguntas TO authenticated;
GRANT ALL ON public.fisica_preguntas TO service_role;

ALTER TABLE public.fisica_preguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fisica_select_autenticados" ON public.fisica_preguntas
  FOR SELECT TO authenticated USING (activa OR public.is_staff(auth.uid()));

CREATE POLICY "fisica_insert_staff" ON public.fisica_preguntas
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND creador_id = auth.uid());

CREATE POLICY "fisica_update_staff" ON public.fisica_preguntas
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) AND (creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role)))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "fisica_delete_staff" ON public.fisica_preguntas
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) AND (creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role)));

CREATE TRIGGER fisica_preguntas_updated_at BEFORE UPDATE ON public.fisica_preguntas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fisica_tema ON public.fisica_preguntas (tema, nivel);