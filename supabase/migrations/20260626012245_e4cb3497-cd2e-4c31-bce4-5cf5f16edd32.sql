
-- Genero
DO $$ BEGIN
  CREATE TYPE public.genero_tipo AS ENUM ('masculino', 'femenino', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS genero public.genero_tipo;

-- is_staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('administrador'::public.app_role, 'docente'::public.app_role)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Grupos
CREATE TABLE IF NOT EXISTS public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT ALL ON public.grupos TO service_role;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_grupos" ON public.grupos FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff_insert_grupos" ON public.grupos FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff_update_grupos" ON public.grupos FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff_delete_grupos" ON public.grupos FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS grupos_set_updated_at ON public.grupos;
CREATE TRIGGER grupos_set_updated_at BEFORE UPDATE ON public.grupos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vinculo grupo-estudiante
CREATE TABLE IF NOT EXISTS public.grupo_estudiantes (
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grupo_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_estudiantes TO authenticated;
GRANT ALL ON public.grupo_estudiantes TO service_role;
ALTER TABLE public.grupo_estudiantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_grupo_estudiantes" ON public.grupo_estudiantes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "student_select_own_groups" ON public.grupo_estudiantes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Branding global
CREATE TABLE IF NOT EXISTS public.app_branding (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  logo_url text,
  hero_url text,
  titulo text,
  subtitulo text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_branding (id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.app_branding TO anon, authenticated;
GRANT UPDATE ON public.app_branding TO authenticated;
GRANT ALL ON public.app_branding TO service_role;
ALTER TABLE public.app_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_branding" ON public.app_branding FOR SELECT USING (true);
CREATE POLICY "only_admin_update_branding" ON public.app_branding FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

DROP TRIGGER IF EXISTS branding_set_updated_at ON public.app_branding;
CREATE TRIGGER branding_set_updated_at BEFORE UPDATE ON public.app_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profiles: staff puede leer/editar
DROP POLICY IF EXISTS "admin_select_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "staff_select_all_profiles" ON public.profiles;
CREATE POLICY "staff_select_all_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "staff_update_profiles" ON public.profiles;
CREATE POLICY "staff_update_profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR auth.uid() = id)
  WITH CHECK (public.is_staff(auth.uid()) OR auth.uid() = id);

-- user_roles: staff puede leer
DROP POLICY IF EXISTS "staff_select_user_roles" ON public.user_roles;
CREATE POLICY "staff_select_user_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Sesiones / respuestas: staff puede leer
DROP POLICY IF EXISTS "staff_read_sesiones_practica" ON public.sesiones_practica;
CREATE POLICY "staff_read_sesiones_practica" ON public.sesiones_practica FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_read_respuestas" ON public.respuestas;
CREATE POLICY "staff_read_respuestas" ON public.respuestas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_read_sesiones_conexion" ON public.sesiones_conexion;
CREATE POLICY "staff_read_sesiones_conexion" ON public.sesiones_conexion FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
