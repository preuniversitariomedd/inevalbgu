CREATE TABLE public.evaluacion_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  modulo text NOT NULL CHECK (modulo IN ('simulacro','conocimiento','razonamiento')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','cerrado','finalizado','abandonado')),
  infracciones integer NOT NULL DEFAULT 0,
  ultima_infraccion_en timestamptz,
  nota numeric,
  iniciado_en timestamptz NOT NULL DEFAULT now(),
  cerrado_en timestamptz
);
CREATE INDEX evaluacion_intentos_user_idx ON public.evaluacion_intentos (user_id, modulo, iniciado_en DESC);
GRANT SELECT ON public.evaluacion_intentos TO authenticated;
GRANT ALL ON public.evaluacion_intentos TO service_role;
ALTER TABLE public.evaluacion_intentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intentos propios o staff" ON public.evaluacion_intentos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  intento_id uuid NOT NULL REFERENCES public.evaluacion_intentos(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('cambio_pestana','perdida_foco','salida_pantalla_completa','copiar','pegar','clic_derecho')),
  numero integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX violations_created_idx ON public.violations (created_at DESC);
GRANT SELECT ON public.violations TO authenticated;
GRANT ALL ON public.violations TO service_role;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "infracciones propias o staff" ON public.violations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.iniciar_evaluacion(_modulo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _i public.evaluacion_intentos; _c timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF _modulo NOT IN ('simulacro','conocimiento','razonamiento') THEN RAISE EXCEPTION 'Módulo inválido'; END IF;
  SELECT max(cerrado_en) INTO _c FROM evaluacion_intentos WHERE user_id=_uid AND modulo=_modulo AND estado='cerrado';
  IF _c IS NOT NULL AND _c > now() - interval '24 hours' THEN
    RETURN jsonb_build_object('bloqueado_hasta', _c + interval '24 hours');
  END IF;
  UPDATE evaluacion_intentos SET estado='abandonado', cerrado_en=now()
    WHERE user_id=_uid AND modulo=_modulo AND estado='activo' AND iniciado_en < now() - interval '3 hours';
  SELECT * INTO _i FROM evaluacion_intentos WHERE user_id=_uid AND modulo=_modulo AND estado='activo' ORDER BY iniciado_en DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO evaluacion_intentos (user_id, modulo) VALUES (_uid, _modulo) RETURNING * INTO _i;
  END IF;
  RETURN jsonb_build_object('intento_id', _i.id, 'infracciones', _i.infracciones);
END $$;

CREATE OR REPLACE FUNCTION public.registrar_infraccion(_intento uuid, _tipo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _i public.evaluacion_intentos;
BEGIN
  SELECT * INTO _i FROM evaluacion_intentos WHERE id=_intento AND user_id=_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Intento no encontrado'; END IF;
  IF _i.estado <> 'activo' THEN RETURN jsonb_build_object('numero', _i.infracciones, 'cerrado', _i.estado='cerrado', 'ignorada', true); END IF;
  IF _i.ultima_infraccion_en IS NOT NULL AND _i.ultima_infraccion_en > now() - interval '2 seconds' THEN
    RETURN jsonb_build_object('numero', _i.infracciones, 'cerrado', false, 'ignorada', true);
  END IF;
  _i.infracciones := _i.infracciones + 1;
  INSERT INTO violations (user_id, intento_id, modulo, tipo, numero) VALUES (_uid, _i.id, _i.modulo, _tipo, _i.infracciones);
  UPDATE evaluacion_intentos SET infracciones=_i.infracciones, ultima_infraccion_en=now(),
    estado = CASE WHEN _i.infracciones >= 4 THEN 'cerrado' ELSE 'activo' END,
    cerrado_en = CASE WHEN _i.infracciones >= 4 THEN now() ELSE NULL END
  WHERE id=_i.id;
  RETURN jsonb_build_object('numero', _i.infracciones, 'cerrado', _i.infracciones >= 4, 'ignorada', false);
END $$;

CREATE OR REPLACE FUNCTION public.finalizar_evaluacion(_intento uuid, _nota numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE evaluacion_intentos SET nota=_nota,
    estado = CASE WHEN estado='activo' THEN 'finalizado' ELSE estado END,
    cerrado_en = COALESCE(cerrado_en, now())
  WHERE id=_intento AND user_id=auth.uid();
END $$;

REVOKE EXECUTE ON FUNCTION public.iniciar_evaluacion(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_infraccion(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalizar_evaluacion(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_evaluacion(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_infraccion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_evaluacion(uuid, numeric) TO authenticated;