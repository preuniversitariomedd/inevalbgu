-- CATEGORIAS
CREATE TABLE public.biblioteca_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  color text NOT NULL DEFAULT 'violet',
  icono text NOT NULL DEFAULT 'BookOpen',
  orden integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_categorias TO authenticated;
GRANT ALL ON public.biblioteca_categorias TO service_role;
ALTER TABLE public.biblioteca_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_select" ON public.biblioteca_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_insert" ON public.biblioteca_categorias FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cat_update" ON public.biblioteca_categorias FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cat_delete" ON public.biblioteca_categorias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'::public.app_role) OR created_by = auth.uid());
CREATE TRIGGER biblioteca_categorias_updated_at BEFORE UPDATE ON public.biblioteca_categorias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RECURSOS
CREATE TABLE public.biblioteca_recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES public.biblioteca_categorias(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descripcion text,
  notas_html text,
  tipo text NOT NULL DEFAULT 'documento',
  enlace_url text,
  descarga_url text,
  portada_path text,
  etiquetas text[] NOT NULL DEFAULT '{}',
  destacado boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  creador_id uuid NOT NULL,
  creador_rol text NOT NULL DEFAULT 'docente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_recursos TO authenticated;
GRANT ALL ON public.biblioteca_recursos TO service_role;
ALTER TABLE public.biblioteca_recursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_select" ON public.biblioteca_recursos FOR SELECT TO authenticated
  USING (publicado OR creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role));
CREATE POLICY "rec_insert" ON public.biblioteca_recursos FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND creador_id = auth.uid());
CREATE POLICY "rec_update" ON public.biblioteca_recursos FOR UPDATE TO authenticated
  USING (creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role));
CREATE POLICY "rec_delete" ON public.biblioteca_recursos FOR DELETE TO authenticated
  USING (creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role));
CREATE TRIGGER biblioteca_recursos_updated_at BEFORE UPDATE ON public.biblioteca_recursos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_biblioteca_recursos_cat ON public.biblioteca_recursos(categoria_id);

-- ARCHIVOS
CREATE TABLE public.biblioteca_archivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id uuid NOT NULL REFERENCES public.biblioteca_recursos(id) ON DELETE CASCADE,
  path text NOT NULL,
  nombre text NOT NULL,
  mime text NOT NULL,
  tamano bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_archivos TO authenticated;
GRANT ALL ON public.biblioteca_archivos TO service_role;
ALTER TABLE public.biblioteca_archivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arch_select" ON public.biblioteca_archivos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.biblioteca_recursos r WHERE r.id = recurso_id
    AND (r.publicado OR r.creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role))));
CREATE POLICY "arch_write" ON public.biblioteca_archivos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.biblioteca_recursos r WHERE r.id = recurso_id
    AND (r.creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.biblioteca_recursos r WHERE r.id = recurso_id
    AND (r.creador_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'::public.app_role))));

-- VISTAS
CREATE TABLE public.biblioteca_vistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id uuid NOT NULL REFERENCES public.biblioteca_recursos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  visto_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.biblioteca_vistas TO authenticated;
GRANT ALL ON public.biblioteca_vistas TO service_role;
ALTER TABLE public.biblioteca_vistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vis_select" ON public.biblioteca_vistas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "vis_insert" ON public.biblioteca_vistas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- FAVORITOS
CREATE TABLE public.biblioteca_favoritos (
  recurso_id uuid NOT NULL REFERENCES public.biblioteca_recursos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recurso_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.biblioteca_favoritos TO authenticated;
GRANT ALL ON public.biblioteca_favoritos TO service_role;
ALTER TABLE public.biblioteca_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_all" ON public.biblioteca_favoritos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Categorías iniciales
INSERT INTO public.biblioteca_categorias (nombre, descripcion, color, icono, orden) VALUES
  ('Matemática', 'Álgebra, funciones, geometría y estadística', 'violet', 'Sigma', 1),
  ('Física', 'Cinemática, dinámica y energía', 'cyan', 'Atom', 2),
  ('Técnicas de estudio', 'Apuntes y guías para aprender mejor', 'emerald', 'Lightbulb', 3),
  ('Videos y clases', 'Clases grabadas y canales recomendados', 'rose', 'Video', 4);