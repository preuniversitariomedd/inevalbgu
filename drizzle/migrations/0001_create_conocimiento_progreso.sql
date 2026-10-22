CREATE TABLE public.conocimiento_progreso (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  aciertos jsonb NOT NULL DEFAULT '{}'::jsonb,
  fallos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conocimiento_progreso TO authenticated;
GRANT ALL ON public.conocimiento_progreso TO service_role;
ALTER TABLE public.conocimiento_progreso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cada quien ve su avance de conocimiento" ON public.conocimiento_progreso FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Cada quien crea su avance de conocimiento" ON public.conocimiento_progreso FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cada quien actualiza su avance de conocimiento" ON public.conocimiento_progreso FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_conocimiento_progreso_updated_at BEFORE UPDATE ON public.conocimiento_progreso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();