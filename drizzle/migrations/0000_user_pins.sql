CREATE TABLE public.user_pins (
  user_id uuid PRIMARY KEY,
  pin_hash text NOT NULL,
  intentos integer NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_pins TO service_role;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;