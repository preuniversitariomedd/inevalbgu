CREATE TABLE public.tiempo_calificacion_eventos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 sesion_id uuid NOT NULL REFERENCES public.sesiones_conexion(id) ON DELETE CASCADE,
 inicio timestamptz NOT NULL,
 fin timestamptz NOT NULL,
 segundos_visible integer NOT NULL DEFAULT 0,
 segundos_oculto integer NOT NULL DEFAULT 0,
 segundos_interaccion integer NOT NULL DEFAULT 0,
 CHECK (fin >= inicio)
);
GRANT SELECT ON public.tiempo_calificacion_eventos TO authenticated;
GRANT ALL ON public.tiempo_calificacion_eventos TO service_role;
ALTER TABLE public.tiempo_calificacion_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leer tiempo propio o staff" ON public.tiempo_calificacion_eventos FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX tiempo_calificacion_usuario_fechas ON public.tiempo_calificacion_eventos(user_id, inicio, fin);
CREATE OR REPLACE FUNCTION public.registrar_tiempo_calificacion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dur integer; v integer; o integer; a integer;
BEGIN
 IF NEW.ultimo_heartbeat <= OLD.ultimo_heartbeat THEN RETURN NEW; END IF;
 dur := greatest(0, floor(extract(epoch FROM NEW.ultimo_heartbeat - OLD.ultimo_heartbeat))::integer);
 v := least(dur, greatest(0, NEW.segundos_visible - OLD.segundos_visible));
 o := least(greatest(0, dur-v), greatest(0, NEW.segundos_oculto - OLD.segundos_oculto));
 a := least(v, greatest(0, NEW.segundos_interaccion - OLD.segundos_interaccion));
 IF v + o > 0 THEN
 INSERT INTO public.tiempo_calificacion_eventos(user_id,sesion_id,inicio,fin,segundos_visible,segundos_oculto,segundos_interaccion)
 VALUES(NEW.user_id,NEW.id,OLD.ultimo_heartbeat,NEW.ultimo_heartbeat,v,o,a);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER registrar_tiempo_calificacion AFTER UPDATE OF ultimo_heartbeat ON public.sesiones_conexion FOR EACH ROW EXECUTE FUNCTION public.registrar_tiempo_calificacion();