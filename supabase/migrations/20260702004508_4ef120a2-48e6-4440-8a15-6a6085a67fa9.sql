
-- 1) Añadir creado_por a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Ampliar cedula para aceptar documentos extranjeros
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='cedula'
      AND character_maximum_length IS NOT NULL AND character_maximum_length < 20
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN cedula TYPE varchar(20);
  END IF;
END $$;

-- 3) Tabla de historial de alertas de presencia
CREATE TABLE IF NOT EXISTS public.alertas_presencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sesion_id uuid REFERENCES public.sesiones_conexion(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('segundo_plano','inactivo','desconexion')),
  detalle text,
  disparada_en timestamptz NOT NULL DEFAULT now(),
  resuelta_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alertas_presencia_disparada_idx
  ON public.alertas_presencia (disparada_en DESC);
CREATE UNIQUE INDEX IF NOT EXISTS alertas_presencia_unica_sesion_tipo
  ON public.alertas_presencia (sesion_id, tipo)
  WHERE sesion_id IS NOT NULL AND resuelta_en IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.alertas_presencia TO authenticated;
GRANT ALL ON public.alertas_presencia TO service_role;

ALTER TABLE public.alertas_presencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff ve alertas" ON public.alertas_presencia;
CREATE POLICY "Staff ve alertas" ON public.alertas_presencia
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff inserta alertas" ON public.alertas_presencia;
CREATE POLICY "Staff inserta alertas" ON public.alertas_presencia
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff actualiza alertas" ON public.alertas_presencia;
CREATE POLICY "Staff actualiza alertas" ON public.alertas_presencia
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
