
ALTER TABLE public.sesiones_conexion
  ADD COLUMN IF NOT EXISTS dispositivo text,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS finalizada_en timestamptz,
  ADD COLUMN IF NOT EXISTS segundos_interaccion integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sc_user_iniciada_idx ON public.sesiones_conexion(user_id, iniciada_en DESC);
CREATE INDEX IF NOT EXISTS sc_activas_idx ON public.sesiones_conexion(ultimo_heartbeat DESC) WHERE finalizada = false;
