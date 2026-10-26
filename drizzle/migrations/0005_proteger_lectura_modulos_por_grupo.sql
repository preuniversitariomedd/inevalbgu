CREATE POLICY acceso_biblioteca_recursos ON public.biblioteca_recursos AS RESTRICTIVE FOR SELECT TO authenticated USING (public.modulo_habilitado(auth.uid(),'biblioteca'));
CREATE POLICY acceso_biblioteca_archivos ON public.biblioteca_archivos AS RESTRICTIVE FOR SELECT TO authenticated USING (public.modulo_habilitado(auth.uid(),'biblioteca'));
CREATE POLICY acceso_biblioteca_categorias ON public.biblioteca_categorias AS RESTRICTIVE FOR SELECT TO authenticated USING (public.modulo_habilitado(auth.uid(),'biblioteca'));
CREATE POLICY acceso_tareas ON public.tareas AS RESTRICTIVE FOR SELECT TO authenticated USING (public.modulo_habilitado(auth.uid(),'tareas'));
CREATE POLICY acceso_tarea_adjuntos ON public.tarea_adjuntos AS RESTRICTIVE FOR SELECT TO authenticated USING (public.modulo_habilitado(auth.uid(),'tareas'));
CREATE POLICY acceso_fisica_preguntas ON public.fisica_preguntas AS RESTRICTIVE FOR SELECT TO authenticated USING (public.modulo_habilitado(auth.uid(),'fisica'));
CREATE POLICY acceso_chat_threads ON public.chat_threads AS RESTRICTIVE FOR ALL TO authenticated USING (public.modulo_habilitado(auth.uid(),'tutor')) WITH CHECK (public.modulo_habilitado(auth.uid(),'tutor'));
CREATE POLICY acceso_chat_messages ON public.chat_messages AS RESTRICTIVE FOR ALL TO authenticated USING (public.modulo_habilitado(auth.uid(),'tutor')) WITH CHECK (public.modulo_habilitado(auth.uid(),'tutor'));
CREATE POLICY acceso_encuesta_respuestas ON public.encuesta_respuestas AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.modulo_habilitado(auth.uid(),'encuesta'));
CREATE POLICY acceso_encuesta_actualizar ON public.encuesta_respuestas AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.modulo_habilitado(auth.uid(),'encuesta')) WITH CHECK (public.modulo_habilitado(auth.uid(),'encuesta'));
CREATE OR REPLACE FUNCTION public.validar_acceso_area() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE area_text text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 area_text := lower(COALESCE(NEW.area,''));
 IF TG_TABLE_NAME = 'sesiones_practica' AND NEW.tipo = 'simulacro' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME = 'respuestas' AND NEW.sesion_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.sesiones_practica WHERE id = NEW.sesion_id AND tipo = 'simulacro') THEN RETURN NEW; END IF;
 IF area_text LIKE '%física%' OR area_text LIKE '%fisica%' THEN
  IF NOT public.modulo_habilitado(NEW.user_id,'fisica') THEN RAISE EXCEPTION 'Física no está habilitada para tu grupo'; END IF;
 ELSIF area_text LIKE '%naturales%' OR area_text LIKE '%sociales%' OR area_text LIKE '%básica%' OR area_text LIKE '%basica%' THEN
  IF NOT public.modulo_habilitado(NEW.user_id,'basica') THEN RAISE EXCEPTION 'Básica Superior no está habilitada para tu grupo'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER acceso_area_sesiones BEFORE INSERT OR UPDATE ON public.sesiones_practica FOR EACH ROW EXECUTE FUNCTION public.validar_acceso_area();
CREATE TRIGGER acceso_area_respuestas BEFORE INSERT OR UPDATE ON public.respuestas FOR EACH ROW EXECUTE FUNCTION public.validar_acceso_area();