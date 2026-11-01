// Razonamiento — Básica Superior. Tres niveles según proporción conocimiento/habilidad:
// N1: 75 % conocimiento / 25 % habilidad (100 preguntas, aprobar 90 %)
// N2: 50 % / 50 % (100 preguntas, aprobar 80 %)
// N3: 25 % / 75 % (50 preguntas, aprobar 75 %)
// Integra Lengua y Literatura, Matemática, Estudios Sociales y Ciencias Naturales.
import type { Pregunta } from "../tipos";
import { crear, elegir, entero, mezclar, rng, type R } from "./gen";
import { ANALOGIAS_RAZ, MATEMATICAS_RAZ } from '../anexos';

export type NivelRaz = 1 | 2 | 3;
export interface PreguntaRaz extends Pregunta {
  estrategia: string;
}
export const CONFIG_RAZ: Record<NivelRaz, { total: number; meta: number; titulo: string; mezcla: string }> = {
  1: { total: 100, meta: 0.9, titulo: "Nivel 1 · Conocimiento", mezcla: "75 % conocimiento · 25 % habilidad" },
  2: { total: 100, meta: 0.8, titulo: "Nivel 2 · Equilibrio", mezcla: "50 % conocimiento · 50 % habilidad" },
  3: { total: 50, meta: 0.75, titulo: "Nivel 3 · Habilidad", mezcla: "25 % conocimiento · 75 % habilidad" },
};
const NV = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" } as const;

const GRUPOS: [string, string[], string, string][] = [
  ["Ciudades de la Sierra", ["Quito", "Ambato", "Riobamba", "Cuenca"], "Machala", "Machala está en la Costa; las demás en la Sierra."],
  ["Planetas", ["Marte", "Venus", "Júpiter", "Saturno"], "Luna", "La Luna es un satélite, no un planeta."],
  ["Mamíferos", ["Ballena", "Murciélago", "Delfín", "Oso"], "Pingüino", "El pingüino es un ave."],
  ["Sustantivos", ["mesa", "libro", "ciudad", "árbol"], "correr", "«Correr» es un verbo."],
  ["Números primos", ["2", "3", "5", "7"], "9", "9 = 3 × 3, es compuesto."],
  ["Próceres de la independencia", ["Sucre", "Bolívar", "Abdón Calderón", "Manuela Sáenz"], "Eloy Alfaro", "Alfaro es de la Revolución Liberal (1895), no de la independencia."],
  ["Órganos del sistema digestivo", ["estómago", "hígado", "esófago", "intestino"], "pulmón", "El pulmón es del sistema respiratorio."],
  ["Figuras literarias", ["metáfora", "símil", "hipérbole", "personificación"], "sustantivo", "El sustantivo es una categoría gramatical."],
  ["Energías renovables", ["solar", "eólica", "hidráulica", "geotérmica"], "petróleo", "El petróleo no es renovable."],
  ["Funciones del Estado", ["Ejecutiva", "Legislativa", "Judicial", "Electoral"], "Bancaria", "No existe la función bancaria."],
  ["Polígonos", ["triángulo", "cuadrado", "pentágono", "hexágono"], "círculo", "El círculo no tiene lados rectos."],
  ["Géneros literarios", ["lírico", "narrativo", "dramático", "didáctico"], "periodístico", "Lo periodístico no es género literario clásico."],
  ["Estados de la materia", ["sólido", "líquido", "gaseoso", "plasma"], "pesado", "«Pesado» es una cualidad, no un estado."],
  ["Océanos", ["Pacífico", "Atlántico", "Índico", "Ártico"], "Amazonas", "El Amazonas es un río."],
];
const SINONIMOS: [string, string, string][] = [["veloz", "rápido", "lento"], ["feliz", "contento", "triste"], ["enorme", "gigante", "diminuto"], ["valiente", "audaz", "cobarde"], ["antiguo", "viejo", "moderno"], ["bello", "hermoso", "feo"], ["comenzar", "iniciar", "terminar"], ["oscuro", "sombrío", "claro"], ["escaso", "insuficiente", "abundante"], ["honesto", "sincero", "mentiroso"], ["generoso", "dadivoso", "tacaño"], ["sabio", "erudito", "ignorante"], ["ocultar", "esconder", "mostrar"], ["húmedo", "mojado", "seco"], ["fértil", "productivo", "estéril"]];
const ANALOGIAS: [string, string, string, string, string[]][] = [
  ["Quito", "Pichincha", "Cuenca", "Azuay", ["Loja", "Cañar", "Guayas"]],
  ["Guayaquil", "Guayas", "Portoviejo", "Manabí", ["Los Ríos", "El Oro", "Esmeraldas"]],
  ["Corazón", "circulatorio", "pulmón", "respiratorio", ["digestivo", "nervioso", "óseo"]],
  ["Agua", "H₂O", "sal", "NaCl", ["CO₂", "O₂", "H₂"]],
  ["Juan León Mera", "Himno Nacional", "Jorge Icaza", "Huasipungo", ["Cumandá", "María", "Platero y yo"]],
  ["Sucre", "Pichincha", "Bolívar", "Junín", ["Tarqui", "Waterloo", "Cenepa"]],
  ["Libro", "leer", "lápiz", "escribir", ["borrar", "dibujar", "romper"]],
  ["Triángulo", "3", "hexágono", "6", ["5", "8", "4"]],
  ["Termómetro", "temperatura", "balanza", "masa", ["volumen", "tiempo", "fuerza"]],
  ["Asamblea", "leyes", "CNE", "elecciones", ["sentencias", "impuestos", "obras"]],
  ["Oruga", "mariposa", "renacuajo", "rana", ["pez", "sapo bebé", "lagarto"]],
  ["Sol", "estrella", "Tierra", "planeta", ["satélite", "galaxia", "cometa"]],
];

interface Lectura { titulo: string; concreto: string; abstracto: string; preguntas: [string, string, string[], string][] }
const LECTURAS: Lectura[] = [
  { titulo: "El páramo", concreto: "El páramo es como una gran esponja. Cuando llueve, sus plantas y su suelo guardan el agua y luego la sueltan poco a poco hacia los ríos. Por eso, ciudades como Quito tienen agua todo el año. Si se quema el páramo, la esponja se daña.",
    abstracto: "El páramo andino funciona como un regulador hídrico: su suelo rico en materia orgánica y su vegetación almacenan el agua de lluvia y la liberan gradualmente. De su conservación depende el abastecimiento de numerosas ciudades; las quemas y el avance agrícola comprometen esta función ecosistémica.",
    preguntas: [["Según el texto, ¿cuál es la función principal del páramo?", "Almacenar y liberar agua lentamente", ["Producir petróleo", "Generar volcanes", "Dar sombra a las ciudades"], "La idea central aparece en la primera oración: el páramo regula/guarda el agua."],
      ["¿Qué se puede inferir si se destruye el páramo?", "Las ciudades podrían tener menos agua", ["Lloverá más", "Aumentará el oxígeno", "Los ríos crecerán siempre"], "Inferencia: si se daña la 'esponja', disminuye el agua disponible."]] },
  { titulo: "Matilde Hidalgo", concreto: "Matilde Hidalgo nació en Loja. Quería estudiar, pero en su época muchas personas decían que las mujeres no debían ir a la universidad. Ella no se rindió: fue la primera médica del Ecuador y, en 1924, la primera mujer en votar.",
    abstracto: "Matilde Hidalgo de Procel desafió las normas de una sociedad que restringía la educación superior femenina. Su perseverancia la convirtió en la primera médica ecuatoriana y, en 1924, en la primera mujer latinoamericana en ejercer el sufragio, abriendo camino a los derechos políticos de las mujeres.",
    preguntas: [["¿Qué valor representa mejor a Matilde Hidalgo según el texto?", "La perseverancia", ["La indiferencia", "La comodidad", "El conformismo"], "El texto destaca que 'no se rindió' ante los obstáculos."],
      ["¿Cuál es el propósito principal del texto?", "Informar sobre el aporte de una mujer pionera", ["Vender un producto", "Contar un cuento fantástico", "Dar instrucciones de medicina"], "Es un texto expositivo-biográfico."]] },
  { titulo: "Las abejas", concreto: "Las abejas vuelan de flor en flor buscando néctar. Al hacerlo, llevan polen de una flor a otra y así las plantas pueden formar frutos. Sin abejas, tendríamos menos frutas y verduras.",
    abstracto: "La polinización entomófila, realizada principalmente por abejas, permite la fecundación de numerosas especies vegetales. La disminución de las poblaciones de abejas, asociada al uso de pesticidas, representa un riesgo para la seguridad alimentaria.",
    preguntas: [["¿Qué relación existe entre las abejas y las plantas?", "Ambas se benefician (mutualismo)", ["Las abejas dañan a las plantas", "No tienen relación", "Las plantas cazan abejas"], "La abeja obtiene néctar y la planta es polinizada."],
      ["¿Qué consecuencia tendría la desaparición de las abejas?", "Disminuiría la producción de alimentos", ["Habría más frutas", "Aumentarían las flores", "No pasaría nada"], "Causa → efecto: sin polinización, menos frutos."]] },
  { titulo: "La dolarización", concreto: "En 1999 los precios subían muy rápido en Ecuador y el sucre perdía valor cada día. Para detener ese problema, en el año 2000 el país cambió su moneda por el dólar.",
    abstracto: "Ante una inflación desbordada y la depreciación acelerada del sucre durante la crisis de 1999, el Ecuador adoptó el dólar estadounidense en el año 2000 como medida de estabilización monetaria, renunciando a su política cambiaria propia.",
    preguntas: [["¿Cuál fue la causa de la dolarización según el texto?", "La pérdida de valor del sucre y el alza de precios", ["Un terremoto", "El descubrimiento de oro", "La guerra con Perú"], "Identifica la causa antes del conector 'para detener'."],
      ["¿Qué tipo de relación predomina en el texto?", "Causa y consecuencia", ["Comparación de animales", "Instrucción paso a paso", "Descripción de un paisaje"], "Problema (inflación) → solución (dólar)."]] },
];

const TERMINOS: [string, string, string][] = [["los pinzones", "aves", "vertebrados"], ["los delfines", "mamíferos", "animales"], ["los cuadrados", "rectángulos", "paralelogramos"], ["los quiteños", "ecuatorianos", "sudamericanos"], ["las rosas", "plantas", "seres vivos"], ["los sonetos", "poemas", "textos literarios"]];

export function bancoRazonamiento(nivel: NivelRaz, edad: number): PreguntaRaz[] {
  const r: R = rng(777 * nivel);
  const out: PreguntaRaz[] = [];
  let n = 0;
  const concreto = edad < 14;
  const add = (subtema: string, tema: string, enunciado: string, correcta: string, distr: string[], explicacion: string, estrategia: string) => {
    const p = crear(r, { id: `raz${nivel}-${++n}`, area: "Razonamiento", tema, subtema, nivel: NV[nivel], enunciado, explicacion }, correcta, distr);
    out.push({ ...p, estrategia });
  };
  const discriminante = () => {
    const [cat, items, intruso, exp] = elegir(r, GRUPOS);
    const op = mezclar(r, items).slice(0, 3);
    add("Identificación de discriminantes", "Interdisciplinario", `¿Qué elemento NO pertenece al grupo?`, intruso, op, `Grupo: ${cat}. ${exp}`, "Busca la característica común de la mayoría; el que no la cumple es el discriminante.");
  };
  const analogia = () => {
    const [a, b2, c, d, ds] = elegir(r, ANALOGIAS);
    add("Analogías", "Lengua y Literatura", `${a} es a ${b2} como ${c} es a…`, d, ds, `La relación entre ${a} y ${b2} se repite entre ${c} y ${d}.`, "Expresa la relación del primer par en una oración y aplícala al segundo par.");
  };
  const sinonimo = () => {
    const [w, s, a] = elegir(r, SINONIMOS);
    const otros = SINONIMOS.filter((x) => x[0] !== w).map((x) => x[1]);
    if (r() < 0.5) add("Sinónimos y antónimos", "Lengua y Literatura", `¿Cuál es un SINÓNIMO de «${w}»?`, s, [a, ...mezclar(r, otros)], `«${s}» significa lo mismo que «${w}»; «${a}» es su antónimo.`, "Sinónimo = mismo significado. Descarta primero el antónimo.");
    else add("Sinónimos y antónimos", "Lengua y Literatura", `¿Cuál es un ANTÓNIMO de «${w}»?`, a, [s, ...mezclar(r, otros)], `«${a}» significa lo contrario de «${w}».`, "Antónimo = significado opuesto. Cuidado con el sinónimo trampa.");
  };
  const serie = (dif: NivelRaz) => {
    let t: number[] = [], sig = 0, regla = "";
    const a = entero(r, 1, 12);
    if (dif === 1) { const k = entero(r, 2, 9); t = [0, 1, 2, 3, 4].map((i) => a + k * i); sig = a + 5 * k; regla = `se suma ${k}`; }
    else if (dif === 2) {
      if (r() < 0.5) { const k = entero(r, 2, 3); t = [0, 1, 2, 3, 4].map((i) => a * k ** i); sig = a * k ** 5; regla = `se multiplica por ${k}`; }
      else { const p = entero(r, 2, 6), q = entero(r, 1, 4); t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1]! + (i % 2 ? p : -q)); sig = t.pop()!; regla = `se alterna +${p} y −${q}`; }
    } else {
      const tipo = entero(r, 0, 2);
      if (tipo === 0) { const x = entero(r, 1, 5), y = entero(r, 1, 6); t = [x, y]; for (let i = 2; i < 6; i++) t.push(t[i - 1]! + t[i - 2]!); sig = t.pop()!; regla = "cada término es la suma de los dos anteriores"; }
      else if (tipo === 1) { const k = entero(r, 2, 3), m = entero(r, 1, 3); t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1]! * k + m); sig = t.pop()!; regla = `se multiplica por ${k} y se suma ${m}`; }
      else { t = [1, 2, 3, 4, 5].map((i) => i * i + a); sig = 36 + a; regla = `n² + ${a}`; }
    }
    add("Series numéricas", "Matemática", `¿Qué número continúa la serie?\n${t.join(", ")}, …`, String(sig), [sig + 1, sig - 2, sig + entero(r, 3, 9), sig * 2].map(String), `Regla: ${regla}. Siguiente = ${sig}.`, "Calcula las diferencias (o cocientes) entre términos consecutivos y busca el patrón.");
  };
  const problema = (dif: NivelRaz) => {
    if (dif === 1) {
      const c = entero(r, 2, 9), p = entero(r, 3, 12) * 0.25;
      const tot = c * p;
      add("Resolución de problemas", "Matemática", `En una papelería de Ambato un cuaderno cuesta $${p.toFixed(2)}. ¿Cuánto se paga por ${c} cuadernos?`, `$${tot.toFixed(2)}`, [`$${(tot + p).toFixed(2)}`, `$${(c + p).toFixed(2)}`, `$${(tot - p).toFixed(2)}`], `${c} × $${p.toFixed(2)} = $${tot.toFixed(2)}.`, "Identifica datos y pregunta; una sola operación (multiplicación) resuelve el problema.");
    } else if (dif === 2) {
      if (r() < 0.5) {
        const pr = entero(r, 4, 20) * 5, d = elegir(r, [10, 20, 25, 30]); const f = pr * (1 - d / 100);
        add("Resolución de problemas", "Matemática", `Una mochila cuesta $${pr} y tiene ${d} % de descuento. ¿Cuánto se paga?`, `$${f}`, [`$${pr - d}`, `$${pr * d / 100}`, `$${pr + pr * d / 100}`], `Descuento = ${pr} × ${d}/100 = ${pr * d / 100}; ${pr} − ${pr * d / 100} = ${f}.`, "Paso 1: calcula el descuento. Paso 2: réstalo del precio.");
      } else {
        const notas = [0, 1, 2].map(() => entero(r, 6, 10)); const falt = entero(r, 7, 9) * 4 - notas.reduce((a, b) => a + b, 0);
        if (falt < 0 || falt > 10) return problema(1);
        const meta = (notas.reduce((a, b) => a + b, 0) + falt) / 4;
        add("Resolución de problemas", "Matemática", `Ana obtuvo ${notas.join(", ")} en tres pruebas de Ciencias. ¿Qué nota necesita en la cuarta para tener promedio ${meta}?`, String(falt), [falt + 1, falt - 1, meta].map(String), `Suma necesaria = ${meta} × 4 = ${meta * 4}; ${meta * 4} − ${notas.reduce((a, b) => a + b, 0)} = ${falt}.`, "Trabaja hacia atrás: promedio × cantidad = suma total.");
      }
    } else {
      const h = entero(r, 8, 15), dd = entero(r, 20, 35);
      if (r() < 0.5) add("Resolución de problemas", "Matemática", `Hoy un padre tiene ${h + dd} años y su hijo ${h}. ¿Dentro de cuántos años la edad del padre será el doble de la del hijo?`, String(dd - h), [dd, h, dd - h + 2].map(String), `(${h + dd} + x) = 2(${h} + x) → x = ${dd - h}.`, "Plantea una ecuación con la incógnita x = años que pasan; la diferencia de edades no cambia.");
      else { const x = entero(r, 3, 12), y = entero(r, 3, 12); add("Resolución de problemas", "Matemática", `En una granja de Manabí hay gallinas y cerdos: ${x + y} cabezas y ${2 * x + 4 * y} patas. ¿Cuántos cerdos hay?`, String(y), [x, y + 2, x + y - 2].map(String), `Si todos fueran gallinas: ${2 * (x + y)} patas; sobran ${2 * y}; cada cerdo aporta 2 más → ${y} cerdos.`, "Estrategia del supuesto: imagina que todos son gallinas y compara.");
      }
    }
  };
  const lectura = (iq: number) => {
    const L = LECTURAS[Math.floor(iq / 2) % LECTURAS.length]!;
    const [q, c, d, e] = L.preguntas[iq % 2]!;
    add("Lectura comprensiva", "Lengua y Literatura", `«${L.titulo}»\n\n${concreto ? L.concreto : L.abstracto}\n\n${q}`, c, d, e, concreto ? "Subraya la idea principal de cada oración y busca palabras clave de la pregunta en el texto." : "Distingue información explícita de implícita; identifica conectores de causa-efecto.");
  };
  const silogismo = () => {
    const [a, b2, c] = elegir(r, TERMINOS);
    if (r() < 0.5) add("Razonamiento lógico", "Interdisciplinario", `Todos ${a} son ${b2}. Todos ${b2} son ${c}. Por lo tanto:`, `Todos ${a} son ${c}`, [`Todos ${c} son ${a}`, `Ningún ${a.split(" ")[1]} es ${c}`, `No se puede concluir nada`], "Silogismo transitivo: A ⊂ B y B ⊂ C ⇒ A ⊂ C.", "Dibuja círculos (diagramas de Venn) uno dentro de otro.");
    else add("Razonamiento lógico", "Interdisciplinario", `Todos ${a} son ${b2}. Algo NO es ${b2}. Entonces, ese algo:`, `No es de ${a}`, [`Es de ${a}`, `Es ${c} con seguridad`, `Es de ${a} y de ${b2}`], `Si fuera de ${a}, sería ${b2}; como no lo es, no pertenece a ${a} (modus tollens).`, "Si la consecuencia es falsa, la condición también lo es.");
  };
  const letras = () => {
    const ini = entero(r, 0, 10), k = entero(r, 2, 4), L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const s = [0, 1, 2, 3].map((i) => L[ini + i * k]); const sig = L[ini + 4 * k]!;
    add("Patrones", "Interdisciplinario", `¿Qué letra continúa? ${s.join(" – ")} – ?`, sig, [L[ini + 4 * k + 1]!, L[ini + 4 * k - 1]!, L[ini + 3 * k + 1]!], `Se avanza ${k} letras cada vez → ${sig}.`, "Convierte las letras en posiciones del alfabeto y busca la diferencia.");
  };

  const cfg = CONFIG_RAZ[nivel];
  let i = 0;
  while (out.length < cfg.total) {
    const ciclo = i++;
    if (nivel === 1) [discriminante, analogia, sinonimo, () => serie(1), () => problema(1), discriminante, analogia, sinonimo][ciclo % 8]!();
    else if (nivel === 2) [() => serie(2), () => problema(2), () => lectura(ciclo), analogia, discriminante, () => lectura(ciclo + 1), sinonimo, () => problema(2)][ciclo % 8]!();
    else [() => serie(3), () => problema(3), silogismo, () => lectura(ciclo), letras, () => serie(3), () => problema(3), silogismo][ciclo % 8]!();
  }
  // Orden de abstracción: los más concretos primero para menores de 14 años.
  return [...out.slice(0, cfg.total), ...ANALOGIAS_RAZ.filter(p => p.nivel === NV[nivel]), ...MATEMATICAS_RAZ.filter(p => p.nivel === NV[nivel])];
}
