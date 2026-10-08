// Lógica pura compartida: clasificación de asignaturas y cálculo de notas (0–10)
// por asignatura. Ponderación: 40% tiempo en plataforma · 20% tiempo activo ·
// 20% constancia · 20% simulacros de la asignatura.

export type ClaveAsignatura = "matematica" | "fisica" | "mbs" | "cn" | "es" | "bach";

export const NOMBRES_ASIG: Record<ClaveAsignatura, string> = {
  matematica: "Matemática",
  fisica: "Física",
  mbs: "Matemática Básica Superior",
  cn: "Ciencias Naturales",
  es: "Estudios Sociales",
  bach: "Bachillerato",
};

export const ABREVIATURAS_ASIG: Record<ClaveAsignatura, string> = {
  matematica: "Mate",
  fisica: "Fís",
  mbs: "MBS",
  cn: "C. Nat",
  es: "E. Soc",
  bach: "Bach",
};

export const CLAVES_ASIGNATURAS = Object.keys(NOMBRES_ASIG) as ClaveAsignatura[];

const AREAS_FISICA = ["cinem", "dinam", "energ", "fisic", "físic"];

export function esFisica(area?: string | null) {
  const a = (area ?? "").toLowerCase();
  return AREAS_FISICA.some((k) => a.includes(k));
}

export function asignaturaDe(area?: string | null): ClaveAsignatura {
  const a = (area ?? "").toLowerCase();
  if (a.includes("bachiller")) return "bach";
  if (a.includes("ciencias naturales")) return "cn";
  if (a.includes("estudios sociales")) return "es";
  if (a.includes("sica superior")) return "mbs";
  if (esFisica(area)) return "fisica";
  return "matematica";
}

export type NotaAsignatura = {
  nota: number;
  componentes: {
    plataforma: number;
    activo: number;
    constancia: number;
    simulacro: number;
  };
  simulacros: number;
};

export type ResumenNotasAsignaturas = {
  horasPlataforma: number;
  horasActivas: number;
  diasConectado: number;
  matematica: NotaAsignatura;
  fisica: NotaAsignatura;
  asignaturas: Array<{ clave: ClaveAsignatura; nombre: string } & NotaAsignatura>;
};

export function calcularNotasAsignaturas(
  con: Array<{
    iniciada_en?: string | null;
    segundos_visible?: number | null;
    segundos_oculto?: number | null;
    segundos_interaccion?: number | null;
  }> | null,
  ses: Array<{
    tipo?: string | null;
    area?: string | null;
    total_preguntas?: number | null;
    correctas?: number | null;
    iniciada_en?: string | null;
    finalizada_en?: string | null;
  }> | null,
): ResumenNotasAsignaturas {
  let segPlataforma = 0;
  let segActivo = 0;
  const dias = new Set<string>();
  for (const c of con ?? []) {
    segPlataforma += (c.segundos_visible ?? 0) + (c.segundos_oculto ?? 0);
    segActivo += c.segundos_interaccion ?? 0;
    if (c.iniciada_en) dias.add(String(c.iniciada_en).slice(0, 10));
  }

  // Componentes compartidos (topes: 20 h en plataforma, 10 h activas, 20 días distintos)
  const cPlataforma = Math.min(1, segPlataforma / 3600 / 20);
  const cActivo = Math.min(1, segActivo / 3600 / 10);
  const cConstancia = Math.min(1, dias.size / 20);

  function simulacroDe(clave: ClaveAsignatura) {
    const list = (ses ?? []).filter(
      (s) =>
        s.tipo === "simulacro" &&
        s.finalizada_en &&
        asignaturaDe(s.area) === clave &&
        (s.total_preguntas ?? 0) > 0,
    );
    if (list.length === 0) return { pct: 0, n: 0 };
    const prom =
      list.reduce((acc, s) => acc + (s.correctas ?? 0) / (s.total_preguntas ?? 1), 0) / list.length;
    return { pct: prom, n: list.length };
  }

  function nota(clave: ClaveAsignatura): NotaAsignatura {
    const sim = simulacroDe(clave);
    const total10 = (cPlataforma * 0.4 + cActivo * 0.2 + cConstancia * 0.2 + sim.pct * 0.2) * 10;
    return {
      nota: Math.round(total10 * 10) / 10,
      componentes: {
        plataforma: Math.round(cPlataforma * 40 * 10) / 10,
        activo: Math.round(cActivo * 20 * 10) / 10,
        constancia: Math.round(cConstancia * 20 * 10) / 10,
        simulacro: Math.round(sim.pct * 20 * 10) / 10,
      },
      simulacros: sim.n,
    };
  }

  return {
    horasPlataforma: Math.round((segPlataforma / 3600) * 10) / 10,
    horasActivas: Math.round((segActivo / 3600) * 10) / 10,
    diasConectado: dias.size,
    matematica: nota("matematica"),
    fisica: nota("fisica"),
    asignaturas: (Object.keys(NOMBRES_ASIG) as ClaveAsignatura[]).map((k) => ({
      clave: k,
      nombre: NOMBRES_ASIG[k],
      ...nota(k),
    })),
  };
}
