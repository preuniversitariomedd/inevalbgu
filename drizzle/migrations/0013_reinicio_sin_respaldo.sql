CREATE OR REPLACE FUNCTION public.reiniciar_sin_respaldo() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[];
BEGIN
 IF public.has_role(auth.uid(),'administrador') IS NOT TRUE THEN RAISE EXCEPTION 'Solo administradores'; END IF;
 SELECT coalesce(array_agg(user_id), ARRAY[]::uuid[]) INTO ids FROM public.user_roles r WHERE r.role='estudiante' AND NOT EXISTS (SELECT 1 FROM public.user_roles s WHERE s.user_id=r.user_id AND s.role IN ('administrador','docente'));
 DELETE FROM public.respuestas WHERE user_id=ANY(ids);
 DELETE FROM public.sesiones_practica WHERE user_id=ANY(ids);
 DELETE FROM public.tiempo_calificacion_eventos WHERE user_id=ANY(ids);
 DELETE FROM public.alertas_presencia WHERE user_id=ANY(ids);
 DELETE FROM public.sesiones_conexion WHERE user_id=ANY(ids);
 DELETE FROM public.violations WHERE user_id=ANY(ids);
 DELETE FROM public.evaluacion_intentos WHERE user_id=ANY(ids);
 INSERT INTO public.conocimiento_progreso(user_id,aciertos,fallos,generacion) SELECT unnest(ids),'{}'::jsonb,'{}'::jsonb,gen_random_uuid() ON CONFLICT(user_id) DO UPDATE SET aciertos='{}'::jsonb,fallos='{}'::jsonb,generacion=EXCLUDED.generacion;
 INSERT INTO public.razonamiento_progreso(user_id,aciertos,fallos,generacion) SELECT unnest(ids),'{}'::jsonb,'{}'::jsonb,gen_random_uuid() ON CONFLICT(user_id) DO UPDATE SET aciertos='{}'::jsonb,fallos='{}'::jsonb,generacion=EXCLUDED.generacion;
 DELETE FROM public.encuesta_respuestas WHERE user_id=ANY(ids);
 DELETE FROM public.encuesta_progreso WHERE user_id=ANY(ids);
 DELETE FROM public.tarea_vistas WHERE user_id=ANY(ids);
 DELETE FROM public.biblioteca_vistas WHERE user_id=ANY(ids);
 DELETE FROM public.biblioteca_favoritos WHERE user_id=ANY(ids);
 DELETE FROM public.competencia_respuestas WHERE user_id=ANY(ids);
 DELETE FROM public.competencia_alertas WHERE user_id=ANY(ids);
 DELETE FROM public.competencia_participantes WHERE user_id=ANY(ids);
 DELETE FROM public.periodos_calificacion WHERE id IS NOT NULL;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.reiniciar_sin_respaldo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reiniciar_sin_respaldo() TO authenticated;