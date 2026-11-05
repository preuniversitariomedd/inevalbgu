CREATE OR REPLACE FUNCTION public.reiniciar_avances_academicos(_respaldo uuid,_huella text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.respaldos_academicos; foto jsonb; ids uuid[];
BEGIN
 IF public.has_role(auth.uid(),'administrador') IS NOT TRUE THEN RAISE EXCEPTION 'Solo administradores'; END IF;
 SELECT * INTO b FROM public.respaldos_academicos WHERE id=_respaldo AND creado_por=auth.uid() FOR UPDATE;
 IF NOT FOUND OR b.huella<>_huella THEN RAISE EXCEPTION 'Respaldo no válido'; END IF;
 IF b.reiniciado_en IS NOT NULL THEN RETURN true; END IF;
 IF b.creado_en < now()-interval '30 minutes' THEN RAISE EXCEPTION 'Respaldo vencido: prepara y descarga uno nuevo'; END IF;
 LOCK TABLE public.respuestas,public.sesiones_practica,public.sesiones_conexion,public.tiempo_calificacion_eventos,public.alertas_presencia,public.conocimiento_progreso,public.razonamiento_progreso,public.encuesta_respuestas,public.encuesta_progreso,public.tarea_vistas,public.biblioteca_vistas,public.biblioteca_favoritos,public.competencia_respuestas,public.competencia_alertas,public.competencia_participantes,public.profiles,public.user_roles,public.grupo_estudiantes,public.periodos_calificacion,public.grupo_configuracion,public.evaluacion_intentos,public.violations IN SHARE ROW EXCLUSIVE MODE;
 foto := public.foto_academica();
 SELECT coalesce(array_agg((p->>'id')::uuid),ARRAY[]::uuid[]) INTO ids FROM jsonb_array_elements(foto->'estudiantes') p;
 foto := foto || jsonb_build_object(
   'evaluacion_intentos',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.evaluacion_intentos t WHERE user_id=ANY(ids)),
   'violations',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.violations t WHERE user_id=ANY(ids)));
 -- Copia final automática (incluye actividad de estudiantes activos posterior al respaldo descargado)
 INSERT INTO public.respaldos_academicos(creado_por,datos,huella,reiniciado_en) VALUES(auth.uid(),foto,md5(foto::text),now());
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
 UPDATE public.respaldos_academicos SET reiniciado_en=now() WHERE id=b.id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.reiniciar_avances_academicos(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reiniciar_avances_academicos(uuid,text) TO authenticated;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conocimiento_progreso') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conocimiento_progreso;
 END IF;
END $$;