// Banco de Física para 1ro BGU: Cinemática, Dinámica y Energía.
// Incluye preguntas curadas + variantes paramétricas (5 opciones) en 3 niveles.

export type NivelFisica = "Básico" | "Intermedio" | "Avanzado";

export const TEMAS_FISICA = ["Cinemática", "Dinámica", "Energía"] as const;
export type TemaFisica = (typeof TEMAS_FISICA)[number];

export interface PreguntaFisica {
  id: string;
  tema: TemaFisica | string;
  subtema: string;
  nivel: NivelFisica;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacion: string;
  imagenUrl?: string | null;
  origen?: "banco" | "manual";
}

// ---------- utilidades ----------
function mezclarConRespuesta(correcta: string, distractores: string[], semilla: number) {
  const opciones = [correcta, ...distractores];
  // Barajado determinista (para que la respuesta no quede siempre en A).
  const idx = semilla % opciones.length;
  const arr = [...opciones];
  [arr[0], arr[idx]] = [arr[idx], arr[0]];
  return { opciones: arr, respuestaCorrecta: arr.indexOf(correcta) };
}

const n = (x: number, d = 2) => {
  const r = Math.round(x * 10 ** d) / 10 ** d;
  return Number.isInteger(r) ? String(r) : String(r);
};

// ---------- preguntas curadas ----------
const CURADAS: PreguntaFisica[] = [
  // ===== CINEMÁTICA =====
  {
    id: "fis-cin-c1",
    tema: "Cinemática",
    subtema: "Conceptos y magnitudes",
    nivel: "Básico",
    enunciado: "¿Cuál de las siguientes magnitudes es vectorial?",
    opciones: ["Rapidez", "Distancia recorrida", "Desplazamiento", "Tiempo", "Masa"],
    respuestaCorrecta: 2,
    explicacion:
      "El desplazamiento tiene módulo, dirección y sentido, por eso es vectorial. La rapidez, la distancia, el tiempo y la masa son escalares.",
  },
  {
    id: "fis-cin-c2",
    tema: "Cinemática",
    subtema: "MRU",
    nivel: "Básico",
    enunciado:
      "En un Movimiento Rectilíneo Uniforme (MRU), la gráfica posición–tiempo es:",
    opciones: [
      "Una recta con pendiente constante",
      "Una parábola",
      "Una recta horizontal siempre",
      "Una hipérbola",
      "Una curva exponencial",
    ],
    respuestaCorrecta: 0,
    explicacion:
      "En MRU la velocidad es constante, entonces x = x₀ + v·t es una función lineal: una recta cuya pendiente es la velocidad.",
  },
  {
    id: "fis-cin-c3",
    tema: "Cinemática",
    subtema: "MRUV",
    nivel: "Intermedio",
    enunciado:
      "Un auto parte del reposo y acelera uniformemente a 2 m/s² durante 6 s. ¿Qué distancia recorre?",
    opciones: ["12 m", "24 m", "36 m", "72 m", "6 m"],
    respuestaCorrecta: 2,
    explicacion:
      "d = v₀t + ½at² = 0 + ½(2)(6²) = ½(2)(36) = 36 m.",
  },
  {
    id: "fis-cin-c4",
    tema: "Cinemática",
    subtema: "Caída libre",
    nivel: "Intermedio",
    enunciado:
      "Se suelta una piedra desde 45 m de altura (g = 10 m/s²). ¿Cuánto tarda en llegar al suelo?",
    opciones: ["1,5 s", "2 s", "3 s", "4,5 s", "9 s"],
    respuestaCorrecta: 2,
    explicacion: "h = ½gt² → 45 = ½(10)t² → t² = 9 → t = 3 s.",
  },
  {
    id: "fis-cin-c5",
    tema: "Cinemática",
    subtema: "Gráficas",
    nivel: "Intermedio",
    enunciado:
      "En una gráfica velocidad–tiempo, el área bajo la curva representa:",
    opciones: ["La aceleración", "El desplazamiento", "La fuerza", "La energía cinética", "La rapidez media"],
    respuestaCorrecta: 1,
    explicacion:
      "El área bajo v–t equivale a v·t, es decir, el desplazamiento. La pendiente de esa misma gráfica es la aceleración.",
  },
  {
    id: "fis-cin-c6",
    tema: "Cinemática",
    subtema: "Movimiento de proyectiles",
    nivel: "Avanzado",
    enunciado:
      "Un proyectil se lanza horizontalmente desde 20 m de altura con 15 m/s (g = 10 m/s²). ¿Cuál es su alcance horizontal?",
    opciones: ["15 m", "20 m", "30 m", "45 m", "60 m"],
    respuestaCorrecta: 2,
    explicacion:
      "Tiempo de caída: 20 = ½(10)t² → t = 2 s. Alcance: x = vₓ·t = 15(2) = 30 m.",
  },
  {
    id: "fis-cin-c7",
    tema: "Cinemática",
    subtema: "Velocidad media",
    nivel: "Avanzado",
    enunciado:
      "Un ciclista recorre la mitad de un trayecto a 20 km/h y la otra mitad a 30 km/h. ¿Cuál es su rapidez media?",
    opciones: ["25 km/h", "24 km/h", "26 km/h", "22,5 km/h", "50 km/h"],
    respuestaCorrecta: 1,
    explicacion:
      "Con distancias iguales se usa la media armónica: v = 2(20)(30)/(20+30) = 1200/50 = 24 km/h. No es el promedio simple.",
  },

  // ===== DINÁMICA =====
  {
    id: "fis-din-c1",
    tema: "Dinámica",
    subtema: "Leyes de Newton",
    nivel: "Básico",
    enunciado: "La primera ley de Newton (inercia) afirma que un cuerpo:",
    opciones: [
      "Siempre se detiene si no hay fuerza",
      "Mantiene su estado de reposo o MRU si la fuerza neta es cero",
      "Acelera proporcionalmente a su masa",
      "Solo se mueve si hay fricción",
      "Cambia de masa al moverse",
    ],
    respuestaCorrecta: 1,
    explicacion:
      "Si ΣF = 0, la aceleración es cero: el cuerpo sigue en reposo o con velocidad constante en línea recta.",
  },
  {
    id: "fis-din-c2",
    tema: "Dinámica",
    subtema: "Segunda ley",
    nivel: "Básico",
    enunciado: "Sobre un bloque de 4 kg actúa una fuerza neta de 12 N. Su aceleración es:",
    opciones: ["0,33 m/s²", "3 m/s²", "8 m/s²", "16 m/s²", "48 m/s²"],
    respuestaCorrecta: 1,
    explicacion: "a = F/m = 12/4 = 3 m/s².",
  },
  {
    id: "fis-din-c3",
    tema: "Dinámica",
    subtema: "Peso y masa",
    nivel: "Básico",
    enunciado: "¿Cuál es el peso de un cuerpo de 8 kg en la Tierra (g = 9,8 m/s²)?",
    opciones: ["8 N", "0,82 N", "78,4 N", "80 N", "98 N"],
    respuestaCorrecta: 2,
    explicacion: "P = m·g = 8 × 9,8 = 78,4 N. La masa (kg) no cambia; el peso (N) sí depende de g.",
  },
  {
    id: "fis-din-c4",
    tema: "Dinámica",
    subtema: "Fricción",
    nivel: "Intermedio",
    enunciado:
      "Un bloque de 10 kg se desliza sobre una superficie con μ = 0,2 (g = 10 m/s²). ¿Cuánto vale la fuerza de rozamiento?",
    opciones: ["2 N", "10 N", "20 N", "100 N", "50 N"],
    respuestaCorrecta: 2,
    explicacion: "fᵣ = μ·N = μ·m·g = 0,2 × 10 × 10 = 20 N.",
  },
  {
    id: "fis-din-c5",
    tema: "Dinámica",
    subtema: "Tercera ley",
    nivel: "Intermedio",
    enunciado:
      "Un libro descansa sobre una mesa. El par acción–reacción correcto es:",
    opciones: [
      "El peso del libro y la normal de la mesa",
      "La fuerza del libro sobre la mesa y la fuerza de la mesa sobre el libro",
      "El peso del libro y la fricción",
      "La normal y la fricción",
      "El peso del libro y el peso de la mesa",
    ],
    respuestaCorrecta: 1,
    explicacion:
      "Acción y reacción actúan sobre cuerpos distintos. Peso y normal actúan sobre el mismo cuerpo, así que no son par acción–reacción.",
  },
  {
    id: "fis-din-c6",
    tema: "Dinámica",
    subtema: "Plano inclinado",
    nivel: "Avanzado",
    enunciado:
      "Un bloque baja sin fricción por un plano inclinado de 30° (g = 10 m/s²). Su aceleración es:",
    opciones: ["10 m/s²", "8,66 m/s²", "5 m/s²", "2,5 m/s²", "0 m/s²"],
    respuestaCorrecta: 2,
    explicacion: "a = g·sen30° = 10 × 0,5 = 5 m/s².",
  },
  {
    id: "fis-din-c7",
    tema: "Dinámica",
    subtema: "Sistemas de cuerpos",
    nivel: "Avanzado",
    enunciado:
      "Dos bloques de 3 kg y 2 kg unidos por una cuerda son empujados con 20 N sobre una superficie lisa. La tensión de la cuerda (fuerza aplicada al bloque de 3 kg) es:",
    opciones: ["4 N", "8 N", "12 N", "20 N", "10 N"],
    respuestaCorrecta: 1,
    explicacion:
      "a = 20/5 = 4 m/s². Para el bloque de 2 kg arrastrado: T = m·a = 2 × 4 = 8 N.",
  },

  // ===== ENERGÍA =====
  {
    id: "fis-ene-c1",
    tema: "Energía",
    subtema: "Energía cinética",
    nivel: "Básico",
    enunciado: "¿Cuál es la energía cinética de un cuerpo de 2 kg que se mueve a 6 m/s?",
    opciones: ["6 J", "12 J", "24 J", "36 J", "72 J"],
    respuestaCorrecta: 3,
    explicacion: "Ec = ½mv² = ½(2)(36) = 36 J.",
  },
  {
    id: "fis-ene-c2",
    tema: "Energía",
    subtema: "Energía potencial",
    nivel: "Básico",
    enunciado: "Un objeto de 5 kg está a 4 m de altura (g = 10 m/s²). Su energía potencial gravitatoria es:",
    opciones: ["20 J", "50 J", "100 J", "200 J", "9 J"],
    respuestaCorrecta: 3,
    explicacion: "Ep = m·g·h = 5 × 10 × 4 = 200 J.",
  },
  {
    id: "fis-ene-c3",
    tema: "Energía",
    subtema: "Trabajo",
    nivel: "Básico",
    enunciado:
      "Se empuja una caja 5 m con una fuerza de 30 N en la misma dirección del movimiento. El trabajo realizado es:",
    opciones: ["6 J", "35 J", "150 J", "0 J", "25 J"],
    respuestaCorrecta: 2,
    explicacion: "W = F·d·cosθ = 30 × 5 × cos0° = 150 J.",
  },
  {
    id: "fis-ene-c4",
    tema: "Energía",
    subtema: "Potencia",
    nivel: "Intermedio",
    enunciado: "Un motor realiza 600 J de trabajo en 5 s. Su potencia es:",
    opciones: ["120 W", "3000 W", "60 W", "12 W", "605 W"],
    respuestaCorrecta: 0,
    explicacion: "P = W/t = 600/5 = 120 W.",
  },
  {
    id: "fis-ene-c5",
    tema: "Energía",
    subtema: "Conservación de la energía",
    nivel: "Intermedio",
    enunciado:
      "Un cuerpo cae libremente desde 20 m (g = 10 m/s²). ¿Con qué rapidez llega al suelo?",
    opciones: ["10 m/s", "14,1 m/s", "20 m/s", "40 m/s", "200 m/s"],
    respuestaCorrecta: 2,
    explicacion:
      "mgh = ½mv² → v = √(2gh) = √(2·10·20) = √400 = 20 m/s. La masa se cancela.",
  },
  {
    id: "fis-ene-c6",
    tema: "Energía",
    subtema: "Trabajo con ángulo",
    nivel: "Avanzado",
    enunciado:
      "Se arrastra un carrito 10 m con una fuerza de 50 N que forma 60° con la horizontal. El trabajo es:",
    opciones: ["500 J", "250 J", "433 J", "0 J", "100 J"],
    respuestaCorrecta: 1,
    explicacion: "W = F·d·cos60° = 50 × 10 × 0,5 = 250 J.",
  },
  {
    id: "fis-ene-c7",
    tema: "Energía",
    subtema: "Energía mecánica",
    nivel: "Avanzado",
    enunciado:
      "Un péndulo de 1 kg se suelta desde 0,8 m de altura (g = 10 m/s²). En el punto más bajo su energía cinética es:",
    opciones: ["0 J", "4 J", "8 J", "10 J", "16 J"],
    respuestaCorrecta: 2,
    explicacion:
      "Toda la Ep se convierte en Ec: Ec = mgh = 1 × 10 × 0,8 = 8 J (sin fricción).",
  },
];

// ---------- generadores paramétricos ----------
function generarCinematica(): PreguntaFisica[] {
  const out: PreguntaFisica[] = [];
  // MRU
  const mru = [
    [60, 2], [80, 3], [45, 4], [120, 1.5], [25, 6], [90, 2.5], [15, 8], [100, 3.5],
  ];
  mru.forEach(([v, t], i) => {
    const d = v * t;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(d)} km`,
      [`${n(d / 2)} km`, `${n(v + t)} km`, `${n(d * 2)} km`, `${n(v / t)} km`],
      i,
    );
    out.push({
      id: `fis-cin-mru-${i}`,
      tema: "Cinemática",
      subtema: "MRU",
      nivel: "Básico",
      enunciado: `Un vehículo viaja con rapidez constante de ${v} km/h durante ${t} h. ¿Qué distancia recorre?`,
      opciones,
      respuestaCorrecta,
      explicacion: `En MRU: d = v·t = ${v} × ${t} = ${n(d)} km.`,
    });
  });

  // MRUV: velocidad final
  const mruv = [
    [0, 3, 5], [4, 2, 6], [10, 1.5, 8], [0, 5, 4], [6, 3, 3], [12, 2, 10], [2, 4, 7], [8, 1, 12],
  ];
  mruv.forEach(([v0, a, t], i) => {
    const vf = v0 + a * t;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(vf)} m/s`,
      [`${n(a * t)} m/s`, `${n(v0 + a)} m/s`, `${n(vf * 2)} m/s`, `${n(v0 * t)} m/s`],
      i + 1,
    );
    out.push({
      id: `fis-cin-mruv-v-${i}`,
      tema: "Cinemática",
      subtema: "MRUV",
      nivel: "Intermedio",
      enunciado: `Un móvil parte con v₀ = ${v0} m/s y acelera uniformemente a ${a} m/s² durante ${t} s. ¿Cuál es su velocidad final?`,
      opciones,
      respuestaCorrecta,
      explicacion: `v = v₀ + a·t = ${v0} + ${a}(${t}) = ${n(vf)} m/s.`,
    });
  });

  // Caída libre
  const caidas = [5, 20, 45, 80, 125, 11.25];
  caidas.forEach((h, i) => {
    const t = Math.sqrt((2 * h) / 10);
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(t)} s`,
      [`${n(t * 2)} s`, `${n(h / 10)} s`, `${n(t / 2)} s`, `${n(h / 5)} s`],
      i + 2,
    );
    out.push({
      id: `fis-cin-caida-${i}`,
      tema: "Cinemática",
      subtema: "Caída libre",
      nivel: "Intermedio",
      enunciado: `Se deja caer un cuerpo desde ${h} m de altura (g = 10 m/s²). ¿Cuánto tiempo tarda en llegar al suelo?`,
      opciones,
      respuestaCorrecta,
      explicacion: `h = ½gt² → t = √(2h/g) = √(2·${h}/10) = ${n(t)} s.`,
    });
  });

  // Proyectil horizontal (avanzado)
  const proy = [[10, 20], [15, 45], [20, 5], [25, 80], [8, 20]];
  proy.forEach(([v, h], i) => {
    const t = Math.sqrt((2 * h) / 10);
    const x = v * t;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(x)} m`,
      [`${n(v * h)} m`, `${n(x / 2)} m`, `${n(v + h)} m`, `${n(x * 2)} m`],
      i + 3,
    );
    out.push({
      id: `fis-cin-proy-${i}`,
      tema: "Cinemática",
      subtema: "Movimiento de proyectiles",
      nivel: "Avanzado",
      enunciado: `Desde una altura de ${h} m se lanza horizontalmente un objeto con ${v} m/s (g = 10 m/s²). ¿Cuál es su alcance horizontal?`,
      opciones,
      respuestaCorrecta,
      explicacion: `t = √(2h/g) = ${n(t)} s; alcance x = v·t = ${v}(${n(t)}) = ${n(x)} m.`,
    });
  });

  return out;
}

function generarDinamica(): PreguntaFisica[] {
  const out: PreguntaFisica[] = [];
  const fma = [[10, 5], [4, 12], [2.5, 10], [8, 24], [6, 18], [1.5, 9], [20, 60], [3, 21]];
  fma.forEach(([m, F], i) => {
    const a = F / m;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(a)} m/s²`,
      [`${n(m / F)} m/s²`, `${n(F * m)} m/s²`, `${n(a * 2)} m/s²`, `${n(F - m)} m/s²`],
      i,
    );
    out.push({
      id: `fis-din-fma-${i}`,
      tema: "Dinámica",
      subtema: "Segunda ley de Newton",
      nivel: "Básico",
      enunciado: `Sobre un cuerpo de ${m} kg actúa una fuerza neta de ${F} N. ¿Cuál es su aceleración?`,
      opciones,
      respuestaCorrecta,
      explicacion: `a = F/m = ${F}/${m} = ${n(a)} m/s².`,
    });
  });

  const roz = [[5, 0.3], [12, 0.25], [20, 0.1], [8, 0.5], [15, 0.4], [30, 0.2]];
  roz.forEach(([m, mu], i) => {
    const f = mu * m * 10;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(f)} N`,
      [`${n(m * 10)} N`, `${n(mu * m)} N`, `${n(f * 2)} N`, `${n(f / 2)} N`],
      i + 1,
    );
    out.push({
      id: `fis-din-roz-${i}`,
      tema: "Dinámica",
      subtema: "Fuerza de rozamiento",
      nivel: "Intermedio",
      enunciado: `Un bloque de ${m} kg se desliza sobre una superficie horizontal con coeficiente de rozamiento μ = ${mu} (g = 10 m/s²). ¿Cuál es la fuerza de rozamiento?`,
      opciones,
      respuestaCorrecta,
      explicacion: `fᵣ = μ·N = μ·m·g = ${mu} × ${m} × 10 = ${n(f)} N.`,
    });
  });

  const incl = [30, 45, 60, 37, 53];
  incl.forEach((ang, i) => {
    const a = 10 * Math.sin((ang * Math.PI) / 180);
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(a)} m/s²`,
      [`${n(10 * Math.cos((ang * Math.PI) / 180))} m/s²`, "10 m/s²", `${n(a / 2)} m/s²`, `${n(a * 2)} m/s²`],
      i + 2,
    );
    out.push({
      id: `fis-din-incl-${i}`,
      tema: "Dinámica",
      subtema: "Plano inclinado",
      nivel: "Avanzado",
      enunciado: `Un bloque desciende sin fricción por un plano inclinado de ${ang}° (g = 10 m/s²). ¿Cuál es su aceleración?`,
      opciones,
      respuestaCorrecta,
      explicacion: `a = g·sen(${ang}°) = 10 × ${n(Math.sin((ang * Math.PI) / 180), 3)} = ${n(a)} m/s².`,
    });
  });

  return out;
}

function generarEnergia(): PreguntaFisica[] {
  const out: PreguntaFisica[] = [];
  const ec = [[2, 4], [3, 10], [1.5, 8], [5, 6], [4, 3], [10, 2], [0.5, 20], [8, 5]];
  ec.forEach(([m, v], i) => {
    const e = 0.5 * m * v * v;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(e)} J`,
      [`${n(m * v)} J`, `${n(2 * e)} J`, `${n(m * v * v)} J`, `${n(e / 2)} J`],
      i,
    );
    out.push({
      id: `fis-ene-ec-${i}`,
      tema: "Energía",
      subtema: "Energía cinética",
      nivel: "Básico",
      enunciado: `¿Cuál es la energía cinética de un cuerpo de ${m} kg que se mueve a ${v} m/s?`,
      opciones,
      respuestaCorrecta,
      explicacion: `Ec = ½mv² = ½(${m})(${v}²) = ${n(e)} J.`,
    });
  });

  const ep = [[2, 5], [4, 3], [10, 1.5], [6, 8], [1, 25], [7, 4]];
  ep.forEach(([m, h], i) => {
    const e = m * 10 * h;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(e)} J`,
      [`${n(m * h)} J`, `${n(e / 2)} J`, `${n(m + h)} J`, `${n(e * 2)} J`],
      i + 1,
    );
    out.push({
      id: `fis-ene-ep-${i}`,
      tema: "Energía",
      subtema: "Energía potencial",
      nivel: "Básico",
      enunciado: `Un cuerpo de ${m} kg se encuentra a ${h} m de altura (g = 10 m/s²). ¿Cuál es su energía potencial gravitatoria?`,
      opciones,
      respuestaCorrecta,
      explicacion: `Ep = m·g·h = ${m} × 10 × ${h} = ${n(e)} J.`,
    });
  });

  const pot = [[600, 5], [1200, 8], [450, 3], [900, 15], [250, 10]];
  pot.forEach(([w, t], i) => {
    const p = w / t;
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(p)} W`,
      [`${n(w * t)} W`, `${n(p * 2)} W`, `${n(t / w)} W`, `${n(w - t)} W`],
      i + 2,
    );
    out.push({
      id: `fis-ene-pot-${i}`,
      tema: "Energía",
      subtema: "Potencia",
      nivel: "Intermedio",
      enunciado: `Una máquina realiza un trabajo de ${w} J en ${t} s. ¿Cuál es su potencia?`,
      opciones,
      respuestaCorrecta,
      explicacion: `P = W/t = ${w}/${t} = ${n(p)} W.`,
    });
  });

  const cons = [5, 20, 45, 80, 125];
  cons.forEach((h, i) => {
    const v = Math.sqrt(2 * 10 * h);
    const { opciones, respuestaCorrecta } = mezclarConRespuesta(
      `${n(v)} m/s`,
      [`${n(2 * h)} m/s`, `${n(v / 2)} m/s`, `${n(10 * h)} m/s`, `${n(v * 2)} m/s`],
      i + 3,
    );
    out.push({
      id: `fis-ene-cons-${i}`,
      tema: "Energía",
      subtema: "Conservación de la energía",
      nivel: "Avanzado",
      enunciado: `Un cuerpo cae libremente desde ${h} m (g = 10 m/s², sin rozamiento). ¿Con qué rapidez llega al suelo?`,
      opciones,
      respuestaCorrecta,
      explicacion: `mgh = ½mv² → v = √(2gh) = √(2·10·${h}) = ${n(v)} m/s.`,
    });
  });

  return out;
}

export const BANCO_FISICA: PreguntaFisica[] = [
  ...CURADAS,
  ...generarCinematica(),
  ...generarDinamica(),
  ...generarEnergia(),
].map((p) => ({ ...p, origen: "banco" as const }));

export function fisicaPorTema(tema: string): PreguntaFisica[] {
  return BANCO_FISICA.filter((p) => p.tema === tema);
}

export function fisicaPorTemaYNivel(tema: string, nivel: string | "Todos"): PreguntaFisica[] {
  const arr = fisicaPorTema(tema);
  return nivel === "Todos" ? arr : arr.filter((p) => p.nivel === nivel);
}

export function barajar<T>(items: T[], cantidad: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(cantidad, copy.length));
}
