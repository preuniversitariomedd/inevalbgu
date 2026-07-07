-- Programación y categorización de tareas + contenido enriquecido
ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS programada_para timestamptz,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS descripcion_html text;

CREATE INDEX IF NOT EXISTS tareas_programada_para_idx ON public.tareas (programada_para);
CREATE INDEX IF NOT EXISTS tareas_categoria_idx ON public.tareas (creador_id, categoria);