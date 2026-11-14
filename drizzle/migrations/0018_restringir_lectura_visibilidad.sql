DROP POLICY IF EXISTS "visibilidad_lectura" ON public.apartados_visibilidad;
CREATE POLICY "visibilidad_lectura" ON public.apartados_visibilidad
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));