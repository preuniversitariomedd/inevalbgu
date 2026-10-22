CREATE TABLE public.periodos_calificacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
 nombre text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 120), fecha_inicio date NOT NULL, fecha_fin date NOT NULL,
 created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), CHECK (fecha_fin >= fecha_inicio)
);
GRANT SELECT ON public.periodos_calificacion TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.periodos_calificacion TO authenticated;
GRANT ALL ON public.periodos_calificacion TO service_role;
ALTER TABLE public.periodos_calificacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer periodos propios o staff" ON public.periodos_calificacion FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.grupo_estudiantes g WHERE g.grupo_id = periodos_calificacion.grupo_id AND g.user_id = auth.uid()));
CREATE POLICY "Administradores gestionan periodos" ON public.periodos_calificacion FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador')) WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE INDEX periodos_calificacion_grupo_idx ON public.periodos_calificacion(grupo_id, fecha_inicio);
