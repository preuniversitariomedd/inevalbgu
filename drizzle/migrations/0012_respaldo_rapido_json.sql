ALTER TABLE public.respaldos_academicos ADD COLUMN IF NOT EXISTS datos_json json;
COMMENT ON COLUMN public.respaldos_academicos.datos IS 'DEPRECATED for new backups: replaced by datos_json (faster to build)';

CREATE OR REPLACE FUNCTION public.foto_academica_json() RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; partes text[] := ARRAY[]::text[]; tabla text; filas json;
BEGIN
 SELECT coalesce(array_agg(user_id), ARRAY[]::uuid[]) INTO ids FROM public.user_roles r WHERE r.role='estudiante' AND NOT EXISTS (SELECT 1 FROM public.user_roles s WHERE s.user_id=r.user_id AND s.role IN ('administrador','docente'));
 SELECT coalesce(json_agg(p),'[]'::json) INTO filas FROM public.profiles p WHERE p.id=ANY(ids);
 partes := partes || ('"estudiantes":'||filas::text) || '"formula":{"conocimiento":40,"razonamiento":30,"simulacro":30}'::text;
 FOREACH tabla IN ARRAY ARRAY['respuestas','sesiones_practica','sesiones_conexion','tiempo_calificacion_eventos','alertas_presencia','conocimiento_progreso','razonamiento_progreso','encuesta_respuestas','encuesta_progreso','tarea_vistas','biblioteca_vistas','biblioteca_favoritos','competencia_respuestas','competencia_alertas','competencia_participantes','evaluacion_intentos','violations'] LOOP
  EXECUTE format('SELECT coalesce(json_agg(t),''[]''::json) FROM public.%I t WHERE user_id=ANY($1)',tabla) INTO filas USING ids;
  partes := partes || (to_json(tabla)::text||':'||filas::text);
 END LOOP;
 SELECT coalesce(json_agg(t),'[]'::json) INTO filas FROM public.grupo_estudiantes t WHERE t.user_id=ANY(ids);
 partes := partes || ('"matricula":'||filas::text);
 SELECT coalesce(json_agg(t),'[]'::json) INTO filas FROM public.periodos_calificacion t;
 partes := partes || ('"periodos":'||filas::text);
 SELECT coalesce(json_agg(t),'[]'::json) INTO filas FROM public.grupo_configuracion t;
 partes := partes || ('"configuracion":'||filas::text);
 RETURN ('{'||array_to_string(partes,',')||'}')::json;
END; $$;
REVOKE ALL ON FUNCTION public.foto_academica_json() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.preparar_respaldo_academico() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE foto json; nuevo uuid;
BEGIN
 IF public.has_role(auth.uid(),'administrador') IS NOT TRUE THEN RAISE EXCEPTION 'Solo administradores'; END IF;
 foto := public.foto_academica_json();
 INSERT INTO public.respaldos_academicos(creado_por,datos,datos_json,huella) VALUES(auth.uid(),'{}'::jsonb,foto,md5(foto::text)) RETURNING id INTO nuevo;
 RETURN nuevo;
END; $$;
REVOKE ALL ON FUNCTION public.preparar_respaldo_academico() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preparar_respaldo_academico() TO authenticated;

CREATE OR REPLACE FUNCTION public.reiniciar_avances_academicos(_respaldo uuid,_huella text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.respaldos_academicos; foto json; ids uuid[];
BEGIN
 IF public.has_role(auth.uid(),'administrador') IS NOT TRUE THEN RAISE EXCEPTION 'Solo administradores'; END IF;
 SELECT * INTO b FROM public.respaldos_academicos WHERE id=_respaldo AND creado_por=auth.uid() FOR UPDATE;
 IF NOT FOUND OR b.huella<>_huella THEN RAISE EXCEPTION 'Respaldo no válido'; END IF;
 IF b.reiniciado_en IS NOT NULL THEN RETURN true; END IF;
 IF b.creado_en < now()-interval '30 minutes' THEN RAISE EXCEPTION 'Respaldo vencido: prepara y descarga uno nuevo'; END IF;
 SELECT coalesce(array_agg(user_id), ARRAY[]::uuid[]) INTO ids FROM public.user_roles r WHERE r.role='estudiante' AND NOT EXISTS (SELECT 1 FROM public.user_roles s WHERE s.user_id=r.user_id AND s.role IN ('administrador','docente'));
 -- Copia final solo si hubo actividad nueva después del respaldo descargado
 IF EXISTS (SELECT 1 FROM public.respuestas WHERE user_id=ANY(ids) AND respondida_en>=b.creado_en)
   OR EXISTS (SELECT 1 FROM public.sesiones_practica WHERE user_id=ANY(ids) AND iniciada_en>=b.creado_en)
   OR EXISTS (SELECT 1 FROM public.conocimiento_progreso WHERE user_id=ANY(ids) AND updated_at>=b.creado_en)
   OR EXISTS (SELECT 1 FROM public.razonamiento_progreso WHERE user_id=ANY(ids) AND updated_at>=b.creado_en) THEN
   foto := public.foto_academica_json();
   INSERT INTO public.respaldos_academicos(creado_por,datos,datos_json,huella,reiniciado_en) VALUES(auth.uid(),'{}'::jsonb,foto,md5(foto::text),now());
 END IF;
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