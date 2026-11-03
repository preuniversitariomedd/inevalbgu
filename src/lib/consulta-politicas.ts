export const DIA_NOTAS_MS = 24 * 60 * 60 * 1000;
export const CONSULTA_MANUAL = { refetchInterval: false as const, refetchIntervalInBackground: false, refetchOnWindowFocus: false, staleTime: Infinity };
export const CONSULTA_NOTAS = { staleTime: DIA_NOTAS_MS, gcTime: DIA_NOTAS_MS, refetchInterval: DIA_NOTAS_MS, refetchIntervalInBackground: false, refetchOnWindowFocus: false };
