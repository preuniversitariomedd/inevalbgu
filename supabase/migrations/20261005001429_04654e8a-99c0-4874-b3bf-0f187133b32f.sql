CREATE TABLE public.razonamiento_progreso (
  user_id uuid PRIMARY KEY,
  aciertos jsonb NOT NULL DEFAULT '{"1":[],"2":[],"3":[]}'::jsonb,
  fallos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.razonamiento_progreso TO authenticated;
GRANT ALL ON public.razonamiento_progreso TO service_role;
ALTER TABLE public.razonamiento_progreso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Propio progreso lectura" ON public.razonamiento_progreso FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Propio progreso alta" ON public.razonamiento_progreso FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Propio progreso cambio" ON public.razonamiento_progreso FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER razonamiento_progreso_updated BEFORE UPDATE ON public.razonamiento_progreso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();