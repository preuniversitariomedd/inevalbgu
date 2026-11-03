-- Academic-only immutable archives; never include auth, PINs or private conversations.
CREATE TABLE public.respaldos_academicos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 creado_por uuid NOT NULL,
 creado_en timestamptz NOT NULL DEFAULT now(),
 datos jsonb NOT NULL,
 huella text NOT NULL,
 reiniciado_en timestamptz
);
GRANT SELECT ON public.respaldos_academicos TO authenticated;
GRANT ALL ON public.respaldos_academicos TO service_role;
ALTER TABLE public.respaldos_academicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY respaldo_solo_admin ON public.respaldos_academicos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE OR REPLACE FUNCTION public.validar_configuracion_grupo() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE clave text; valor jsonb;
BEGIN
 IF jsonb_typeof(NEW.modulos) <> 'object' THEN RAISE EXCEPTION 'Configuración inválida'; END IF;
 FOR clave, valor IN SELECT * FROM jsonb_each(NEW.modulos) LOOP
  IF clave NOT IN ('practicas','conocimiento','razonamiento','simulacro','sistemas','fisica','basica','banco','biblioteca','tareas','tutor','encuesta','competencias') OR jsonb_typeof(valor) <> 'boolean' THEN RAISE EXCEPTION 'Módulo inválido'; END IF;
 END LOOP;
 IF NEW.ponderaciones <> '{"plataforma":0,"practicas":0,"simulacro":30,"conocimiento":40,"razonamiento":30}'::jsonb THEN RAISE EXCEPTION 'Fórmula oficial fija 40/30/30'; END IF;
 NEW.updated_at := now(); NEW.updated_by := auth.uid(); RETURN NEW;
END; $$;
ALTER TABLE public.grupo_configuracion ALTER COLUMN ponderaciones SET DEFAULT '{"plataforma":0,"practicas":0,"simulacro":30,"conocimiento":40,"razonamiento":30}'::jsonb;

-- Aggregate generations reject stale browser upserts after a reset.
ALTER TABLE public.conocimiento_progreso ADD COLUMN generacion uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.razonamiento_progreso ADD COLUMN generacion uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE OR REPLACE FUNCTION public.proteger_generacion_academica() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.generacion <> OLD.generacion AND current_user NOT IN ('postgres','supabase_admin','service_role') THEN RAISE EXCEPTION 'El avance fue reiniciado. Recarga la página antes de continuar.'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER generacion_conocimiento BEFORE UPDATE ON public.conocimiento_progreso FOR EACH ROW EXECUTE FUNCTION public.proteger_generacion_academica();
CREATE TRIGGER generacion_razonamiento BEFORE UPDATE ON public.razonamiento_progreso FOR EACH ROW EXECUTE FUNCTION public.proteger_generacion_academica();

-- A deterministic student snapshot is read only while academic writers are locked.
CREATE OR REPLACE FUNCTION public.foto_academica() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[]; salida jsonb; tabla text; filas jsonb;
BEGIN
 SELECT coalesce(array_agg(user_id ORDER BY user_id), ARRAY[]::uuid[]) INTO ids FROM public.user_roles r WHERE r.role = 'estudiante' AND NOT EXISTS (SELECT 1 FROM public.user_roles s WHERE s.user_id=r.user_id AND s.role IN ('administrador','docente'));
 SELECT jsonb_build_object('estudiantes',coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.id),'[]'::jsonb),'formula',jsonb_build_object('conocimiento',40,'razonamiento',30,'simulacro',30)) INTO salida FROM public.profiles p WHERE p.id=ANY(ids);
 FOREACH tabla IN ARRAY ARRAY['respuestas','sesiones_practica','sesiones_conexion','tiempo_calificacion_eventos','alertas_presencia','conocimiento_progreso','razonamiento_progreso','encuesta_respuestas','encuesta_progreso','tarea_vistas','biblioteca_vistas','biblioteca_favoritos','competencia_respuestas','competencia_alertas','competencia_participantes'] LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM public.%I t WHERE user_id=ANY($1)',tabla) INTO filas USING ids;
  salida := salida || jsonb_build_object(tabla,filas);
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.grupo_id,t.user_id),'[]'::jsonb) INTO filas FROM public.grupo_estudiantes t WHERE t.user_id=ANY(ids);
 salida := salida || jsonb_build_object('matricula',filas);
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb) INTO filas FROM public.periodos_calificacion t;
 salida := salida || jsonb_build_object('periodos',filas);
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.grupo_id),'[]'::jsonb) INTO filas FROM public.grupo_configuracion t;
 RETURN salida || jsonb_build_object('configuracion',filas);
END; $$;
REVOKE ALL ON FUNCTION public.foto_academica() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.preparar_respaldo_academico() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE foto jsonb; nuevo uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'administrador') THEN RAISE EXCEPTION 'Solo administradores'; END IF;
 LOCK TABLE public.respuestas,public.sesiones_practica,public.sesiones_conexion,public.tiempo_calificacion_eventos,public.alertas_presencia,public.conocimiento_progreso,public.razonamiento_progreso,public.encuesta_respuestas,public.encuesta_progreso,public.tarea_vistas,public.biblioteca_vistas,public.biblioteca_favoritos,public.competencia_respuestas,public.competencia_alertas,public.competencia_participantes,public.profiles,public.user_roles,public.grupo_estudiantes,public.periodos_calificacion,public.grupo_configuracion IN SHARE ROW EXCLUSIVE MODE;
 foto := public.foto_academica();
 INSERT INTO public.respaldos_academicos(creado_por,datos,huella) VALUES(auth.uid(),foto,md5(foto::text)) RETURNING id INTO nuevo;
 RETURN nuevo;
END; $$;
REVOKE ALL ON FUNCTION public.preparar_respaldo_academico() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preparar_respaldo_academico() TO authenticated;

CREATE OR REPLACE FUNCTION public.reiniciar_avances_academicos(_respaldo uuid,_huella text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.respaldos_academicos; foto jsonb; ids uuid[];
BEGIN
 IF NOT public.has_role(auth.uid(),'administrador') THEN RAISE EXCEPTION 'Solo administradores'; END IF;
 SELECT * INTO b FROM public.respaldos_academicos WHERE id=_respaldo AND creado_por=auth.uid() FOR UPDATE;
 IF NOT FOUND OR b.huella<>_huella THEN RAISE EXCEPTION 'Respaldo no válido'; END IF;
 IF b.reiniciado_en IS NOT NULL THEN RETURN true; END IF;
 IF b.creado_en < now()-interval '30 minutes' THEN RAISE EXCEPTION 'Respaldo vencido: prepara y descarga uno nuevo'; END IF;
 LOCK TABLE public.respuestas,public.sesiones_practica,public.sesiones_conexion,public.tiempo_calificacion_eventos,public.alertas_presencia,public.conocimiento_progreso,public.razonamiento_progreso,public.encuesta_respuestas,public.encuesta_progreso,public.tarea_vistas,public.biblioteca_vistas,public.biblioteca_favoritos,public.competencia_respuestas,public.competencia_alertas,public.competencia_participantes,public.profiles,public.user_roles,public.grupo_estudiantes,public.periodos_calificacion,public.grupo_configuracion IN SHARE ROW EXCLUSIVE MODE;
 foto := public.foto_academica();
 IF foto<>b.datos THEN RAISE EXCEPTION 'Hay actividad nueva: prepara y descarga otro respaldo. No se borró ningún dato.'; END IF;
 SELECT coalesce(array_agg((p->>'id')::uuid),ARRAY[]::uuid[]) INTO ids FROM jsonb_array_elements(b.datos->'estudiantes') p;
 IF EXISTS(SELECT 1 FROM public.sesiones_conexion WHERE user_id=ANY(ids) AND NOT finalizada AND ultimo_heartbeat>now()-interval '2 minutes') THEN RAISE EXCEPTION 'Hay estudiantes conectados: pide que cierren sesión antes del reinicio'; END IF;
 DELETE FROM public.respuestas WHERE user_id=ANY(ids);
 DELETE FROM public.sesiones_practica WHERE user_id=ANY(ids);
 DELETE FROM public.tiempo_calificacion_eventos WHERE user_id=ANY(ids);
 DELETE FROM public.alertas_presencia WHERE user_id=ANY(ids);
 DELETE FROM public.sesiones_conexion WHERE user_id=ANY(ids);
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
 UPDATE public.respaldos_academicos SET reiniciado_en=now() WHERE id=b.id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.reiniciar_avances_academicos(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reiniciar_avances_academicos(uuid,text) TO authenticated;
