
-- ============ ENUM de roles ============
CREATE TYPE public.app_role AS ENUM ('estudiante', 'administrador');

-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL UNIQUE,
  nombres TEXT NOT NULL,
  institucion TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  primera_vez BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ user_roles ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ has_role helper (security definer evita recursión en RLS) ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ Políticas profiles ============
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'administrador'));

-- INSERT y DELETE solo via service_role (admin server fns)

-- ============ Políticas user_roles ============
CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));

-- ============ sesiones_practica ============
CREATE TABLE public.sesiones_practica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('practica', 'simulacro')),
  area TEXT,
  total_preguntas INTEGER NOT NULL DEFAULT 0,
  correctas INTEGER NOT NULL DEFAULT 0,
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizada_en TIMESTAMPTZ,
  puntaje_ineval INTEGER,
  nivel_logro TEXT
);

CREATE INDEX idx_sesiones_practica_user ON public.sesiones_practica(user_id, iniciada_en DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sesiones_practica TO authenticated;
GRANT ALL ON public.sesiones_practica TO service_role;

ALTER TABLE public.sesiones_practica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select" ON public.sesiones_practica FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "sp_insert" ON public.sesiones_practica FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_update" ON public.sesiones_practica FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ respuestas ============
CREATE TABLE public.respuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sesion_id UUID REFERENCES public.sesiones_practica(id) ON DELETE CASCADE,
  pregunta_id TEXT NOT NULL,
  area TEXT NOT NULL,
  subtema TEXT NOT NULL,
  nivel TEXT NOT NULL,
  correcta BOOLEAN NOT NULL,
  respondida_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_respuestas_user ON public.respuestas(user_id, respondida_en DESC);
CREATE INDEX idx_respuestas_sesion ON public.respuestas(sesion_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.respuestas TO authenticated;
GRANT ALL ON public.respuestas TO service_role;

ALTER TABLE public.respuestas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resp_select" ON public.respuestas FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "resp_insert" ON public.respuestas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ sesiones_conexion (heartbeats) ============
CREATE TABLE public.sesiones_conexion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_interaccion TIMESTAMPTZ NOT NULL DEFAULT now(),
  segundos_visible INTEGER NOT NULL DEFAULT 0,
  segundos_oculto INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  finalizada BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_sesiones_conexion_user ON public.sesiones_conexion(user_id, iniciada_en DESC);
CREATE INDEX idx_sesiones_conexion_heartbeat ON public.sesiones_conexion(ultimo_heartbeat DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sesiones_conexion TO authenticated;
GRANT ALL ON public.sesiones_conexion TO service_role;

ALTER TABLE public.sesiones_conexion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select" ON public.sesiones_conexion FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "sc_insert" ON public.sesiones_conexion FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sc_update" ON public.sesiones_conexion FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Trigger updated_at en profiles ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
