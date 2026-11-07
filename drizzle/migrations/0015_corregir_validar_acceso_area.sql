CREATE OR REPLACE FUNCTION public.validar_acceso_area()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE area_text text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 area_text := lower(COALESCE(NEW.area,''));
 IF TG_TABLE_NAME = 'sesiones_practica' THEN
  IF to_jsonb(NEW)->>'tipo' = 'simulacro' THEN RETURN NEW; END IF;
 ELSIF TG_TABLE_NAME = 'respuestas' THEN
  IF (to_jsonb(NEW)->>'sesion_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.sesiones_practica WHERE id = (to_jsonb(NEW)->>'sesion_id')::uuid AND tipo = 'simulacro') THEN RETURN NEW; END IF;
 END IF;
 IF area_text LIKE '%física%' OR area_text LIKE '%fisica%' THEN
  IF NOT public.modulo_habilitado(NEW.user_id,'fisica') THEN RAISE EXCEPTION 'Física no está habilitada para tu grupo'; END IF;
 ELSIF area_text LIKE '%naturales%' OR area_text LIKE '%sociales%' OR area_text LIKE '%básica%' OR area_text LIKE '%basica%' THEN
  IF NOT public.modulo_habilitado(NEW.user_id,'basica') THEN RAISE EXCEPTION 'Básica Superior no está habilitada para tu grupo'; END IF;
 END IF;
 RETURN NEW;
END; $function$;