-- Respuestas: solo el servidor puede insertar (con corrección en servidor)
DROP POLICY IF EXISTS resp_insert ON public.respuestas;
REVOKE INSERT ON public.respuestas FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.insertar_respuestas_srv(_uid uuid, _filas jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid::text, 'role', 'authenticated')::text, true);
  INSERT INTO public.respuestas(user_id, sesion_id, pregunta_id, area, subtema, nivel, correcta)
  SELECT _uid, NULLIF(f->>'sesion_id','')::uuid, f->>'pregunta_id', f->>'area', f->>'subtema', f->>'nivel', (f->>'correcta')::boolean
  FROM jsonb_array_elements(_filas) f;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.insertar_respuestas_srv(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insertar_respuestas_srv(uuid, jsonb) TO service_role;

-- Políticas demasiado abiertas
DROP POLICY IF EXISTS visibilidad_lectura ON public.apartados_visibilidad;
CREATE POLICY visibilidad_lectura ON public.apartados_visibilidad FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS cat_select ON public.biblioteca_categorias;
DROP POLICY IF EXISTS anyone_read_branding ON public.app_branding;
CREATE POLICY admin_read_branding ON public.app_branding FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- Storage: lecturas solo propias / admin (el resto se sirve con URLs firmadas)
DROP POLICY IF EXISTS "Avatars: lectura autenticados" ON storage.objects;
CREATE POLICY "Avatars: lectura propia o staff" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_staff(auth.uid())));
DROP POLICY IF EXISTS branding_read_auth ON storage.objects;
CREATE POLICY branding_read_admin ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'administrador'::public.app_role));