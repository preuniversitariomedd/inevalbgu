
CREATE TABLE public.competencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  codigo text NOT NULL UNIQUE,
  creador_id uuid NOT NULL,
  estado text NOT NULL DEFAULT 'espera',
  grupo_ids uuid[] NOT NULL DEFAULT '{}',
  duracion_min integer NOT NULL DEFAULT 20,
  pregunta_actual integer NOT NULL DEFAULT -1,
  pregunta_inicio timestamptz,
  pregunta_duracion_ms integer NOT NULL DEFAULT 30000,
  pausa_restante_ms integer,
  inicio_at timestamptz,
  fin_at timestamptz,
  efectos jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_potenciadores_usados text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.competencia_preguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  area text,
  enunciado text NOT NULL,
  imagen_url text,
  opciones jsonb NOT NULL,
  correcta integer NOT NULL,
  casi_correcta integer,
  nivel text NOT NULL DEFAULT 'Intermedio',
  tiempo_seg integer NOT NULL DEFAULT 45,
  explicacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.competencia_participantes (
  competencia_id uuid NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nombre text NOT NULL DEFAULT '',
  puntaje integer NOT NULL DEFAULT 0,
  racha integer NOT NULL DEFAULT 0,
  mejor_racha integer NOT NULL DEFAULT 0,
  aciertos integer NOT NULL DEFAULT 0,
  leves integer NOT NULL DEFAULT 0,
  potenciadores_usados text[] NOT NULL DEFAULT '{}',
  acepto_reglas boolean NOT NULL DEFAULT false,
  virus_hasta integer NOT NULL DEFAULT -1,
  virus_de text,
  escudo boolean NOT NULL DEFAULT false,
  doble_idx integer NOT NULL DEFAULT -1,
  congelar_idx integer NOT NULL DEFAULT -1,
  cincuenta_idx integer NOT NULL DEFAULT -1,
  alertas integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (competencia_id, user_id)
);
CREATE TABLE public.competencia_respuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  pregunta_idx integer NOT NULL,
  opcion integer,
  fraccion numeric NOT NULL DEFAULT 0,
  puntos integer NOT NULL DEFAULT 0,
  ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competencia_id, user_id, pregunta_idx)
);
CREATE TABLE public.competencia_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id uuid NOT NULL REFERENCES public.competencias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nombre text,
  tipo text NOT NULL,
  detalle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competencias, public.competencia_preguntas, public.competencia_participantes, public.competencia_respuestas, public.competencia_alertas TO authenticated;
GRANT ALL ON public.competencias, public.competencia_preguntas, public.competencia_participantes, public.competencia_respuestas, public.competencia_alertas TO service_role;

ALTER TABLE public.competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_respuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencia_alertas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.es_participante_comp(_comp uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competencia_participantes WHERE competencia_id = _comp AND user_id = _user)
$$;

CREATE POLICY "staff gestiona competencias" ON public.competencias FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "participante ve competencia" ON public.competencias FOR SELECT TO authenticated
  USING (public.es_participante_comp(id, auth.uid()));

CREATE POLICY "staff gestiona preguntas comp" ON public.competencia_preguntas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff gestiona participantes" ON public.competencia_participantes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "participante ve ranking" ON public.competencia_participantes FOR SELECT TO authenticated
  USING (public.es_participante_comp(competencia_id, auth.uid()));

CREATE POLICY "staff ve respuestas comp" ON public.competencia_respuestas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "estudiante ve sus respuestas comp" ON public.competencia_respuestas FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "staff ve alertas comp" ON public.competencia_alertas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "estudiante reporta alerta" ON public.competencia_alertas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.es_participante_comp(competencia_id, auth.uid()));

CREATE TRIGGER competencias_updated_at BEFORE UPDATE ON public.competencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.competencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competencia_participantes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competencia_alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competencia_respuestas;
