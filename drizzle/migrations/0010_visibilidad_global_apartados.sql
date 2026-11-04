CREATE TABLE public.apartados_visibilidad (
 apartado text PRIMARY KEY CHECK (apartado IN ('practicas','banco','fisica','ciencias','sociales')),
 visible boolean NOT NULL DEFAULT true,
 updated_by uuid NOT NULL DEFAULT auth.uid(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.apartados_visibilidad TO authenticated;
GRANT ALL ON public.apartados_visibilidad TO service_role;
ALTER TABLE public.apartados_visibilidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY visibilidad_lectura ON public.apartados_visibilidad FOR SELECT TO authenticated USING (true);
CREATE POLICY visibilidad_insertar_admin ON public.apartados_visibilidad FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrador') AND updated_by = auth.uid());
CREATE POLICY visibilidad_actualizar_admin ON public.apartados_visibilidad FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador') AND updated_by = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.apartados_visibilidad;