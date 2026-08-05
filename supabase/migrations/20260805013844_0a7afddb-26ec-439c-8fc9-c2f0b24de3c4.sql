CREATE TABLE public.encuesta_respuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bloque text NOT NULL,
  pregunta_id text NOT NULL,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pregunta_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuesta_respuestas TO authenticated;
GRANT ALL ON public.encuesta_respuestas TO service_role;

ALTER TABLE public.encuesta_respuestas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encuesta_own_select" ON public.encuesta_respuestas
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "encuesta_own_insert" ON public.encuesta_respuestas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "encuesta_own_update" ON public.encuesta_respuestas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "encuesta_own_delete" ON public.encuesta_respuestas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER encuesta_respuestas_updated_at
  BEFORE UPDATE ON public.encuesta_respuestas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.encuesta_progreso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bloque text NOT NULL,
  completado_en timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bloque)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuesta_progreso TO authenticated;
GRANT ALL ON public.encuesta_progreso TO service_role;

ALTER TABLE public.encuesta_progreso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encuesta_prog_select" ON public.encuesta_progreso
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "encuesta_prog_insert" ON public.encuesta_progreso
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "encuesta_prog_update" ON public.encuesta_progreso
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "encuesta_prog_delete" ON public.encuesta_progreso
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER encuesta_progreso_updated_at
  BEFORE UPDATE ON public.encuesta_progreso
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();