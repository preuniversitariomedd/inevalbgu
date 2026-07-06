
-- ============ TAREAS ============
CREATE TABLE public.tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creador_rol TEXT NOT NULL CHECK (creador_rol IN ('administrador','docente')),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  youtube_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas TO authenticated;
GRANT ALL ON public.tareas TO service_role;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tareas_creador ON public.tareas(creador_id);
CREATE INDEX idx_tareas_created ON public.tareas(created_at DESC);

-- ============ ADJUNTOS ============
CREATE TABLE public.tarea_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  nombre TEXT NOT NULL,
  mime TEXT NOT NULL,
  tamano BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarea_adjuntos TO authenticated;
GRANT ALL ON public.tarea_adjuntos TO service_role;
ALTER TABLE public.tarea_adjuntos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tarea_adj_tarea ON public.tarea_adjuntos(tarea_id);

-- ============ TAREA <-> GRUPOS ============
CREATE TABLE public.tarea_grupos (
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  PRIMARY KEY (tarea_id, grupo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarea_grupos TO authenticated;
GRANT ALL ON public.tarea_grupos TO service_role;
ALTER TABLE public.tarea_grupos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tarea_grupos_grupo ON public.tarea_grupos(grupo_id);

-- ============ VISTAS ============
CREATE TABLE public.tarea_vistas (
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visto_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tarea_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarea_vistas TO authenticated;
GRANT ALL ON public.tarea_vistas TO service_role;
ALTER TABLE public.tarea_vistas ENABLE ROW LEVEL SECURITY;

-- ============ DOCENTE GRUPOS PERMITIDOS ============
CREATE TABLE public.docente_grupos_permitidos (
  docente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (docente_id, grupo_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.docente_grupos_permitidos TO authenticated;
GRANT ALL ON public.docente_grupos_permitidos TO service_role;
ALTER TABLE public.docente_grupos_permitidos ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.puede_ver_tarea(_user_id UUID, _tarea_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tareas t WHERE t.id = _tarea_id AND t.creador_id = _user_id
  ) OR public.has_role(_user_id, 'administrador'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.tarea_grupos tg
      JOIN public.grupo_estudiantes ge ON ge.grupo_id = tg.grupo_id
      WHERE tg.tarea_id = _tarea_id AND ge.user_id = _user_id
    );
$$;

-- ============ POLICIES: tareas ============
CREATE POLICY "tareas_select_visible" ON public.tareas FOR SELECT TO authenticated
  USING (public.puede_ver_tarea(auth.uid(), id));
CREATE POLICY "tareas_insert_staff" ON public.tareas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creador_id AND (public.has_role(auth.uid(),'administrador'::public.app_role) OR public.has_role(auth.uid(),'docente'::public.app_role)));
CREATE POLICY "tareas_update_owner_or_admin" ON public.tareas FOR UPDATE TO authenticated
  USING (auth.uid() = creador_id OR public.has_role(auth.uid(),'administrador'::public.app_role));
CREATE POLICY "tareas_delete_owner_or_admin" ON public.tareas FOR DELETE TO authenticated
  USING (auth.uid() = creador_id OR public.has_role(auth.uid(),'administrador'::public.app_role));

-- ============ POLICIES: tarea_adjuntos ============
CREATE POLICY "adj_select" ON public.tarea_adjuntos FOR SELECT TO authenticated
  USING (public.puede_ver_tarea(auth.uid(), tarea_id));
CREATE POLICY "adj_write_owner_admin" ON public.tarea_adjuntos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tareas t WHERE t.id = tarea_id AND (t.creador_id = auth.uid() OR public.has_role(auth.uid(),'administrador'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tareas t WHERE t.id = tarea_id AND (t.creador_id = auth.uid() OR public.has_role(auth.uid(),'administrador'::public.app_role))));

-- ============ POLICIES: tarea_grupos ============
CREATE POLICY "tg_select" ON public.tarea_grupos FOR SELECT TO authenticated
  USING (public.puede_ver_tarea(auth.uid(), tarea_id));
CREATE POLICY "tg_write_owner_admin" ON public.tarea_grupos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tareas t WHERE t.id = tarea_id AND (t.creador_id = auth.uid() OR public.has_role(auth.uid(),'administrador'::public.app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tareas t WHERE t.id = tarea_id AND (t.creador_id = auth.uid() OR public.has_role(auth.uid(),'administrador'::public.app_role))));

-- ============ POLICIES: tarea_vistas ============
CREATE POLICY "vistas_self" ON public.tarea_vistas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vistas_select_owner_admin" ON public.tarea_vistas FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'administrador'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.tareas t WHERE t.id = tarea_id AND t.creador_id = auth.uid())
  );

-- ============ POLICIES: docente_grupos_permitidos ============
CREATE POLICY "dgp_select_admin_or_self" ON public.docente_grupos_permitidos FOR SELECT TO authenticated
  USING (auth.uid() = docente_id OR public.has_role(auth.uid(),'administrador'::public.app_role));
CREATE POLICY "dgp_write_admin" ON public.docente_grupos_permitidos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'administrador'::public.app_role));

-- ============ Trigger updated_at ============
CREATE TRIGGER trg_tareas_updated BEFORE UPDATE ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.tareas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tarea_vistas;

-- ============ Storage policies for 'tareas' bucket ============
-- Bucket 'tareas' se crea vía tool; aquí sus políticas de objects
CREATE POLICY "tareas_obj_read_staff" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tareas' AND (public.has_role(auth.uid(),'administrador'::public.app_role) OR public.has_role(auth.uid(),'docente'::public.app_role)));
CREATE POLICY "tareas_obj_read_students" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tareas'
    AND EXISTS (
      SELECT 1 FROM public.tarea_adjuntos a
      WHERE a.path = storage.objects.name
        AND public.puede_ver_tarea(auth.uid(), a.tarea_id)
    )
  );
CREATE POLICY "tareas_obj_insert_staff" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tareas' AND (public.has_role(auth.uid(),'administrador'::public.app_role) OR public.has_role(auth.uid(),'docente'::public.app_role)));
CREATE POLICY "tareas_obj_delete_staff" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tareas' AND (public.has_role(auth.uid(),'administrador'::public.app_role) OR public.has_role(auth.uid(),'docente'::public.app_role)));
