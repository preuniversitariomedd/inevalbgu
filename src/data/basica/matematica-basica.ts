// Matemática — Básica Superior (8.º a 10.º EGB), currículo ecuatoriano.
// Bloques: Álgebra y funciones, Geometría y medida, Estadística y probabilidad.
import type { Pregunta } from "../tipos";
import { crear, elegir, entero, fmt, rng, type Base } from "./gen";

export const AREA_MBS = "Matemática Básica Superior";
export const TEMAS_MBS = ["Números y operaciones", "Álgebra y funciones", "Geometría y medida", "Estadística y probabilidad"] as const;
const [NU, AL, GE, ES] = TEMAS_MBS;

const mcd = (a: number, b: number): number => (b ? mcd(b, a % b) : a);

export function generarMatematicaBasica(): Pregunta[] {
  const r = rng(8102026);
  const out: Pregunta[] = [];
  let n = 0;
  const b = (tema: string, subtema: string, nivel: Base["nivel"], enunciado: string, explicacion: string): Base => ({ id: `mbs-${++n}`, area: AREA_MBS, tema, subtema, nivel, enunciado, explicacion });
  const gens: (() => void)[] = [
    () => { const a = entero(r, -20, 20), c = entero(r, -20, 20), d = entero(r, 2, 6); const v = a - c * d;
      out.push(crear(r, b(NU, "Números enteros", "Básico", `Calcula: (${a}) − (${c}) × ${d}`, `Primero la multiplicación: ${c} × ${d} = ${c * d}; luego ${a} − (${c * d}) = ${v}.`), String(v), [String((a - c) * d), String(a + c * d), String(-v), String(v + d)])); },
    () => { const p = entero(r, 1, 9), q = entero(r, 2, 9), s = entero(r, 1, 9), t = entero(r, 2, 9); const num = p * t + s * q, den = q * t, g = mcd(num, den);
      out.push(crear(r, b(NU, "Fracciones", "Intermedio", `Suma y simplifica: ${p}/${q} + ${s}/${t}`, `Común denominador ${den}: (${p * t} + ${s * q})/${den} = ${num}/${den} = ${num / g}/${den / g}.`), `${num / g}/${den / g}`, [`${p + s}/${q + t}`, `${num}/${den + 1}`, `${p * s}/${q * t}`, `${num / g + 1}/${den / g}`])); },
    () => { const a = entero(r, 2, 5), m = entero(r, 2, 4), k = entero(r, 1, 3);
      out.push(crear(r, b(NU, "Potencias", "Intermedio", `Simplifica: ${a}^${m} · ${a}^${k}`, `Misma base: se suman los exponentes → ${a}^${m + k} = ${a ** (m + k)}.`), String(a ** (m + k)), [String(a ** (m * k)), String((a * a) ** (m + k)), String(a * (m + k)), String(a ** (m + k) + a)])); },
    () => { const x = entero(r, 2, 15); out.push(crear(r, b(NU, "Raíces", "Básico", `¿Cuál es la raíz cuadrada de ${x * x}?`, `${x} × ${x} = ${x * x}.`), String(x), [String(x + 1), String(x * 2), String(x - 1), String(Math.round((x * x) / 2))])); },
    () => { const p = elegir(r, [10, 15, 20, 25, 30, 40, 50, 75]), t = entero(r, 2, 40) * 20;
      out.push(crear(r, b(NU, "Porcentajes", "Básico", `¿Cuánto es el ${p} % de ${t}?`, `${t} × ${p}/100 = ${(t * p) / 100}.`), fmt((t * p) / 100), [fmt(t / p), fmt((t * p) / 10), fmt(t - p), fmt((t * p) / 1000)])); },
    () => { const a = entero(r, 2, 9), x = entero(r, -10, 12), c = entero(r, -15, 15); const d = a * x + c;
      out.push(crear(r, b(AL, "Ecuaciones lineales", "Básico", `Resuelve: ${a}x ${c >= 0 ? "+" : "−"} ${Math.abs(c)} = ${d}`, `${a}x = ${d} ${c >= 0 ? "−" : "+"} ${Math.abs(c)} = ${d - c}; x = ${d - c} ÷ ${a} = ${x}.`), `x = ${x}`, [`x = ${x + 1}`, `x = ${-x}`, `x = ${x - 2}`, `x = ${d + c}`])); },
    () => { const a = entero(r, 1, 6), c = entero(r, 1, 6);
      out.push(crear(r, b(AL, "Productos notables", "Intermedio", `Desarrolla: (x + ${a})(x + ${c})`, `x² + (${a}+${c})x + ${a}·${c} = x² + ${a + c}x + ${a * c}.`), `x² + ${a + c}x + ${a * c}`, [`x² + ${a * c}x + ${a + c}`, `x² + ${a * c}`, `2x + ${a + c}`, `x² + ${a + c}x + ${a + c}`])); },
    () => { const m = entero(r, -5, 6) || 2, k = entero(r, -8, 8), x = entero(r, -4, 5);
      out.push(crear(r, b(AL, "Funciones lineales", "Intermedio", `Si f(x) = ${m}x ${k >= 0 ? "+" : "−"} ${Math.abs(k)}, ¿cuánto vale f(${x})?`, `f(${x}) = ${m}·(${x}) ${k >= 0 ? "+" : "−"} ${Math.abs(k)} = ${m * x + k}.`), String(m * x + k), [String(m + x + k), String(m * x - k), String(m * (x + k)), String(-(m * x + k))])); },
    () => { const x1 = entero(r, -5, 5), y1 = entero(r, -5, 5), dx = entero(r, 1, 5), m = entero(r, -3, 4) || 1; const y2 = y1 + m * dx;
      out.push(crear(r, b(AL, "Funciones lineales", "Avanzado", `¿Cuál es la pendiente de la recta que pasa por (${x1}, ${y1}) y (${x1 + dx}, ${y2})?`, `m = (${y2} − ${y1}) ÷ (${x1 + dx} − ${x1}) = ${m * dx} ÷ ${dx} = ${m}.`), String(m), [String(-m), String(dx), String(m * dx), String(m + 1)])); },
    () => { const k = entero(r, 2, 9), a = entero(r, 2, 8), c = entero(r, 2, 12);
      out.push(crear(r, b(AL, "Proporcionalidad", "Básico", `Si ${a} cuadernos cuestan $${a * k}, ¿cuánto cuestan ${c} cuadernos?`, `Precio unitario $${k}; ${c} × ${k} = $${c * k} (regla de tres directa).`), `$${c * k}`, [`$${a * k + c}`, `$${c * a}`, `$${c * k + k}`, `$${Math.round((a * k) / c)}`])); },
    () => { const a = entero(r, 3, 15), h = entero(r, 2, 12);
      out.push(crear(r, b(GE, "Áreas", "Básico", `¿Cuál es el área de un triángulo de base ${a} cm y altura ${h} cm?`, `A = (b · h) / 2 = (${a} · ${h}) / 2 = ${fmt((a * h) / 2)} cm².`), `${fmt((a * h) / 2)} cm²`, [`${a * h} cm²`, `${a + h} cm²`, `${2 * (a + h)} cm²`, `${fmt((a * h) / 4)} cm²`])); },
    () => { const [x, y, z] = elegir(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25]] as const);
      out.push(crear(r, b(GE, "Teorema de Pitágoras", "Intermedio", `Los catetos de un triángulo rectángulo miden ${x} y ${y}. ¿Cuánto mide la hipotenusa?`, `c = √(${x}² + ${y}²) = √${x * x + y * y} = ${z}.`), String(z), [String(x + y), String(z + 1), String(Math.abs(y - x)), String(x * y)])); },
    () => { const rr = entero(r, 1, 10);
      out.push(crear(r, b(GE, "Círculo", "Intermedio", `¿Cuál es la longitud de una circunferencia de radio ${rr} cm? (usa π = 3,14)`, `L = 2πr = 2 · 3,14 · ${rr} = ${fmt(6.28 * rr)} cm.`), `${fmt(6.28 * rr)} cm`, [`${fmt(3.14 * rr * rr)} cm`, `${fmt(3.14 * rr)} cm`, `${fmt(6.28 * rr * rr)} cm`, `${2 * rr} cm`])); },
    () => { const l = entero(r, 2, 9), a = entero(r, 2, 9), h = entero(r, 2, 9);
      out.push(crear(r, b(GE, "Volumen", "Intermedio", `¿Cuál es el volumen de una caja (prisma rectangular) de ${l} × ${a} × ${h} cm?`, `V = ${l} · ${a} · ${h} = ${l * a * h} cm³.`), `${l * a * h} cm³`, [`${l + a + h} cm³`, `${2 * (l * a + a * h + l * h)} cm³`, `${l * a} cm³`, `${l * a * h * 2} cm³`])); },
    () => { const a = entero(r, 20, 80), c = entero(r, 20, 160 - a);
      out.push(crear(r, b(GE, "Ángulos", "Básico", `Dos ángulos de un triángulo miden ${a}° y ${c}°. ¿Cuánto mide el tercero?`, `La suma interna es 180°: 180 − ${a} − ${c} = ${180 - a - c}°.`), `${180 - a - c}°`, [`${360 - a - c}°`, `${a + c}°`, `${90 - Math.min(a, c)}°`, `${180 - a}°`])); },
    () => { const d = Array.from({ length: 5 }, () => entero(r, 4, 10)); const s = d.reduce((x, y) => x + y, 0);
      out.push(crear(r, b(ES, "Medidas de tendencia central", "Básico", `Las notas de un estudiante son: ${d.join(", ")}. ¿Cuál es su promedio (media)?`, `Suma = ${s}; ${s} ÷ 5 = ${fmt(s / 5)}.`), fmt(s / 5), [fmt(s / 4), String(s), fmt([...d].sort((x, y) => x - y)[2]! + 0.5), fmt(s / 5 + 1)])); },
    () => { const d = Array.from({ length: 7 }, () => entero(r, 1, 20)); const o = [...d].sort((x, y) => x - y);
      out.push(crear(r, b(ES, "Medidas de tendencia central", "Intermedio", `Halla la mediana de: ${d.join(", ")}`, `Ordenados: ${o.join(", ")}; el valor central (4.º) es ${o[3]}.`), String(o[3]), [String(d[3]), String(o[2]), String(o[4]), fmt(o.reduce((x, y) => x + y, 0) / 7)])); },
    () => { const rojas = entero(r, 1, 9), azules = entero(r, 1, 9), t = rojas + azules, g = mcd(rojas, t);
      out.push(crear(r, b(ES, "Probabilidad", "Intermedio", `Una funda tiene ${rojas} bolas rojas y ${azules} azules. ¿Cuál es la probabilidad de sacar una roja?`, `P = casos favorables / casos posibles = ${rojas}/${t} = ${rojas / g}/${t / g}.`), `${rojas / g}/${t / g}`, [`${azules}/${t}`, `${rojas}/${azules}`, `1/${t}`, `${rojas}/${t + 1}`])); },
    () => { const c = entero(r, 2, 6), p = entero(r, 2, 5);
      out.push(crear(r, b(ES, "Combinatoria", "Avanzado", `Tienes ${c} camisetas y ${p} pantalones. ¿De cuántas formas distintas puedes vestirte?`, `Principio multiplicativo: ${c} × ${p} = ${c * p}.`), String(c * p), [String(c + p), String(c * p + 1), String(c ** p), String(Math.max(c, p))])); },
  ];
  let i = 0;
  while (out.length < 300) gens[i++ % gens.length]!();
  return out;
}
