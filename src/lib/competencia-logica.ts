// Lógica pura de la competencia en vivo (compartida por servidor y pruebas).

export const POTENCIADORES_ESTUDIANTE = {
  congelar: { nombre: "Congelar tiempo", emoji: "🧊", desc: "Tu reloj se detiene 10 s en esta pregunta." },
  virus: { nombre: "Virus", emoji: "🦠", desc: "A un rival: opciones borrosas y mezcladas por 2–3 preguntas." },
  cincuenta: { nombre: "50/50", emoji: "✂️", desc: "Elimina 2 opciones incorrectas." },
  escudo: { nombre: "Escudo", emoji: "🛡️", desc: "Bloquea un virus y conserva tu racha si fallas una vez." },
  doble: { nombre: "Doble o nada", emoji: "🎲", desc: "Duplica los puntos de esta pregunta; si fallas, 0." },
} as const;
export type PotEst = keyof typeof POTENCIADORES_ESTUDIANTE;

export const POTENCIADORES_ADMIN = {
  mas_tiempo: { nombre: "+10 s para todos", emoji: "⏳", tipo: "ayuda" },
  menos_tiempo: { nombre: "−5 s para todos", emoji: "⚡", tipo: "reto" },
  doble_puntos: { nombre: "Doble puntos", emoji: "💰", tipo: "ayuda" },
  eliminar2: { nombre: "Eliminar 2 incorrectas", emoji: "✂️", tipo: "ayuda" },
  pista: { nombre: "Pista para todos", emoji: "💡", tipo: "ayuda" },
  sorpresa: { nombre: "Pregunta sorpresa ×3", emoji: "🎁", tipo: "reto" },
  ocultar_ranking: { nombre: "Congelar ranking", emoji: "🙈", tipo: "reto" },
  escudo_general: { nombre: "Escudo general", emoji: "🛡️", tipo: "ayuda" },
  relampago: { nombre: "Ronda relámpago", emoji: "🌩️", tipo: "reto" },
  sin_velocidad: { nombre: "Sin bono de rapidez", emoji: "🐢", tipo: "reto" },
} as const;
export type PotAdmin = keyof typeof POTENCIADORES_ADMIN;

export const TIEMPO_POR_NIVEL: Record<string, number> = { Básico: 30, Intermedio: 45, Avanzado: 60 };

export interface Efectos {
  doble_idx?: number;
  eliminar_idx?: number;
  pista_idx?: number;
  sorpresa_idx?: number;
  ranking_oculto?: boolean;
  relampago_hasta?: number;
  sin_velocidad?: boolean;
}

/** Multiplicador de racha: 3 → 1.2, 4 → 1.4, 5 → 1.6 ... */
export function multiplicadorRacha(racha: number) {
  return racha >= 3 ? Math.round((1 + 0.2 * (racha - 2)) * 10) / 10 : 1;
}

export function fraccionRespuesta(opcion: number | null, correcta: number, casi: number | null) {
  if (opcion === null || opcion === undefined) return 0;
  if (opcion === correcta) return 1;
  if (casi !== null && casi !== undefined && opcion === casi) return 0.25;
  return 0;
}

export interface CalculoInput {
  fraccion: number;
  ms: number;
  duracionMs: number;
  rachaPrev: number;
  escudo: boolean;
  dobleNada: boolean;
  efectos: Efectos;
  idx: number;
}

export function calcularPuntos(i: CalculoInput) {
  let racha = i.rachaPrev;
  let escudo = i.escudo;
  if (i.fraccion === 1) racha += 1;
  else if (escudo) escudo = false; // el escudo salva la racha una vez
  else racha = 0;

  const base = 1000 * i.fraccion;
  const velocidad =
    i.fraccion > 0 && !i.efectos.sin_velocidad
      ? Math.round(500 * Math.max(0, 1 - i.ms / Math.max(1, i.duracionMs)) * i.fraccion)
      : 0;
  let factor = i.fraccion === 1 ? multiplicadorRacha(racha) : 1;
  if (i.efectos.doble_idx === i.idx) factor *= 2;
  if (i.efectos.sorpresa_idx === i.idx) factor *= 3;
  if (i.dobleNada) factor = i.fraccion === 1 ? factor * 2 : 0;
  const puntos = Math.round((base + velocidad) * factor);
  return { puntos, racha, escudo, multiplicador: factor, velocidad };
}

/** Índices de 2 opciones incorrectas (ni correcta ni casi) a ocultar, deterministas por pregunta. */
export function opcionesAEliminar(n: number, correcta: number, casi: number | null, semilla: string) {
  const cand = Array.from({ length: n }, (_, k) => k).filter((k) => k !== correcta && k !== casi);
  let h = 0;
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: number[] = [];
  while (out.length < 2 && cand.length) out.push(cand.splice(h % cand.length, 1)[0]);
  return out;
}

export function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
