CREATE TABLE public.grupo_configuracion (
 grupo_id uuid PRIMARY KEY REFERENCES public.grupos(id) ON DELETE CASCADE,
 modulos jsonb NOT NULL DEFAULT '{"practicas":true,"conocimiento":true,"razonamiento":true,"simulacro":true,"sistemas":true,"fisica":true,"basica":true,"banco":true,"biblioteca":true,"tareas":true,"tutor":true,"encuesta":true,"competencias":true}'::jsonb,
 ponderaciones jsonb NOT NULL DEFAULT '{"plataforma":10,"practicas":0,"simulacro":30,"conocimiento":30,"razonamiento":30}'::jsonb,
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_configuracion TO authenticated;
GRANT ALL ON public.grupo_configuracion TO service_role;
ALTER TABLE public.grupo_configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY configuracion_lectura ON public.grupo_configuracion FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.grupo_estudiantes ge WHERE ge.grupo_id = grupo_configuracion.grupo_id AND ge.user_id = auth.uid()));
CREATE POLICY configuracion_admin ON public.grupo_configuracion FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE OR REPLACE FUNCTION public.modulo_habilitado(_user_id uuid, _modulo text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT (_user_id = auth.uid() OR public.is_staff(auth.uid())) AND (public.is_staff(_user_id) OR NOT EXISTS (SELECT 1 FROM public.grupo_estudiantes ge JOIN public.grupo_configuracion gc ON gc.grupo_id = ge.grupo_id WHERE ge.user_id = _user_id AND COALESCE((gc.modulos ->> _modulo)::boolean, true) = false));
$$;
REVOKE ALL ON FUNCTION public.modulo_habilitado(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.modulo_habilitado(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.validar_configuracion_grupo() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE clave text; valor jsonb; total numeric := 0;
BEGIN
 IF jsonb_typeof(NEW.modulos) <> 'object' OR jsonb_typeof(NEW.ponderaciones) <> 'object' THEN RAISE EXCEPTION 'Configuración inválida'; END IF;
 FOR clave, valor IN SELECT * FROM jsonb_each(NEW.modulos) LOOP
  IF clave NOT IN ('practicas','conocimiento','razonamiento','simulacro','sistemas','fisica','basica','banco','biblioteca','tareas','tutor','encuesta','competencias') OR jsonb_typeof(valor) <> 'boolean' THEN RAISE EXCEPTION 'Módulo inválido'; END IF;
 END LOOP;
 IF NOT NEW.ponderaciones ?& ARRAY['plataforma','practicas','simulacro','conocimiento','razonamiento'] THEN RAISE EXCEPTION 'Faltan ponderaciones'; END IF;
 FOR clave, valor IN SELECT * FROM jsonb_each(NEW.ponderaciones) LOOP
  IF clave NOT IN ('plataforma','practicas','simulacro','conocimiento','razonamiento') OR jsonb_typeof(valor) <> 'number' OR valor::text::numeric < 0 OR valor::text::numeric > 100 THEN RAISE EXCEPTION 'Porcentaje inválido'; END IF;
  IF clave <> 'plataforma' AND COALESCE((NEW.modulos ->> clave)::boolean,true) = false AND valor::text::numeric <> 0 THEN RAISE EXCEPTION 'Una parte desactivada no puede tener porcentaje'; END IF;
  total := total + valor::text::numeric;
 END LOOP;
 IF total <> 100 THEN RAISE EXCEPTION 'Los porcentajes deben sumar 100'; END IF;
 NEW.updated_at := now(); NEW.updated_by := auth.uid(); RETURN NEW;
END; $$;
CREATE TRIGGER validar_configuracion_grupo BEFORE INSERT OR UPDATE ON public.grupo_configuracion FOR EACH ROW EXECUTE FUNCTION public.validar_configuracion_grupo();
CREATE OR REPLACE FUNCTION public.validar_acceso_actividad() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE modulo text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME = 'sesiones_practica' THEN modulo := CASE WHEN NEW.tipo = 'simulacro' THEN 'simulacro' ELSE 'practicas' END;
 ELSIF TG_TABLE_NAME = 'respuestas' THEN
  IF NEW.sesion_id IS NOT NULL THEN SELECT CASE WHEN tipo = 'simulacro' THEN 'simulacro' ELSE 'practicas' END INTO modulo FROM public.sesiones_practica WHERE id = NEW.sesion_id AND user_id = NEW.user_id;
  ELSE modulo := CASE WHEN NEW.area = 'Conocimiento' THEN 'conocimiento' WHEN NEW.area = 'Razonamiento' THEN 'razonamiento' ELSE 'practicas' END; END IF;
 ELSIF TG_TABLE_NAME = 'conocimiento_progreso' THEN modulo := 'conocimiento';
 ELSIF TG_TABLE_NAME = 'razonamiento_progreso' THEN modulo := 'razonamiento'; END IF;
 IF modulo IS NULL OR NOT public.modulo_habilitado(NEW.user_id, modulo) THEN RAISE EXCEPTION 'Este módulo no está habilitado para tu grupo'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER acceso_sesiones_practica BEFORE INSERT OR UPDATE ON public.sesiones_practica FOR EACH ROW EXECUTE FUNCTION public.validar_acceso_actividad();
CREATE TRIGGER acceso_respuestas BEFORE INSERT OR UPDATE ON public.respuestas FOR EACH ROW EXECUTE FUNCTION public.validar_acceso_actividad();
CREATE TRIGGER acceso_conocimiento BEFORE INSERT OR UPDATE ON public.conocimiento_progreso FOR EACH ROW EXECUTE FUNCTION public.validar_acceso_actividad();
CREATE TRIGGER acceso_razonamiento BEFORE INSERT OR UPDATE ON public.razonamiento_progreso FOR EACH ROW EXECUTE FUNCTION public.validar_acceso_actividad();