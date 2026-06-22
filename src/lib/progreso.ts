// localStorage persistence for student progress
export interface RespuestaRegistro {
  preguntaId: string;
  area: string;
  subtema: string;
  nivel: string;
  correcta: boolean;
  ts: number;
}

export interface Progreso {
  respuestas: RespuestaRegistro[];
  diasActivos: string[]; // ISO yyyy-mm-dd
}

const KEY = "ineval_uede_progreso_v1";

export function leerProgreso(): Progreso {
  if (typeof window === "undefined") return { respuestas: [], diasActivos: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { respuestas: [], diasActivos: [] };
    return JSON.parse(raw) as Progreso;
  } catch {
    return { respuestas: [], diasActivos: [] };
  }
}

export function guardarRespuesta(r: Omit<RespuestaRegistro, "ts">) {
  const prog = leerProgreso();
  prog.respuestas.push({ ...r, ts: Date.now() });
  const hoy = new Date().toISOString().slice(0, 10);
  if (!prog.diasActivos.includes(hoy)) prog.diasActivos.push(hoy);
  localStorage.setItem(KEY, JSON.stringify(prog));
}

export function reiniciarProgreso() {
  localStorage.removeItem(KEY);
}

export function calcularRacha(diasActivos: string[]): number {
  if (diasActivos.length === 0) return 0;
  const set = new Set(diasActivos);
  let racha = 0;
  const d = new Date();
  for (;;) {
    const iso = d.toISOString().slice(0, 10);
    if (set.has(iso)) {
      racha++;
      d.setDate(d.getDate() - 1);
    } else {
      if (racha === 0) {
        // allow starting yesterday
        d.setDate(d.getDate() - 1);
        const iso2 = d.toISOString().slice(0, 10);
        if (set.has(iso2)) {
          racha++;
          d.setDate(d.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return racha;
}
