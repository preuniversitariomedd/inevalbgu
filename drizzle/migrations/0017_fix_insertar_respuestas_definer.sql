ALTER FUNCTION public.insertar_respuestas_srv(uuid, jsonb) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.insertar_respuestas_srv(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insertar_respuestas_srv(uuid, jsonb) TO service_role;

UPDATE public.sesiones_practica s
SET correctas = 26, total_preguntas = 30, puntaje_ineval = 867, nivel_logro = 'Excelente'
WHERE s.id = (
  SELECT sp.id FROM public.sesiones_practica sp
  JOIN public.profiles p ON p.id = sp.user_id
  WHERE p.nombres ILIKE '%PINCAY BOZADA%' AND sp.tipo = 'simulacro'
    AND sp.puntaje_ineval = 0 AND sp.finalizada_en IS NOT NULL
  ORDER BY sp.finalizada_en DESC LIMIT 1
);