// Genera src/lib/claves-respuestas.server.json: id de pregunta -> huella de la
// respuesta correcta. Solo lo usa el servidor para corregir respuestas.
// Las preguntas cuyo contenido varía entre generaciones se excluyen (el
// servidor acepta entonces la corrección del navegador).
// Ejecutar: bun scripts/generar-claves.ts
import { writeFileSync } from "node:fs";
import { BANCO_SIMULACRO } from "../src/data";
import { preguntasConocimiento } from "../src/data/conocimiento";
import { bancoRazonamiento } from "../src/data/basica/razonamiento";
import { BANCO_FISICA } from "../src/data/fisica";
import { generarCienciasNaturales } from "../src/data/basica/ciencias-naturales";
import { generarEstudiosSociales } from "../src/data/basica/estudios-sociales";
import { generarMatematicaBasica } from "../src/data/basica/matematica-basica";
import { preguntasLecturaCritica } from "../src/data/basica/lectura-critica";
import * as bgu from "../src/data/simulacro-bgu";
import { huellaRespuesta } from "../src/lib/huella-respuesta";

type P = { id: string; opciones: string[]; respuestaCorrecta: number };
const claves = new Map<string, string>();
const conflicto = new Set<string>();
function agregar(lista: P[]) {
  for (const p of lista) {
    const t = p.opciones?.[p.respuestaCorrecta];
    if (typeof t !== "string") { conflicto.add(p.id); continue; }
    const h = huellaRespuesta(t);
    const prev = claves.get(p.id);
    if (prev !== undefined && prev !== h) conflicto.add(p.id);
    else claves.set(p.id, h);
  }
}
for (let vez = 0; vez < 2; vez++) {
  agregar(BANCO_SIMULACRO); agregar(BANCO_FISICA as P[]);
  for (const n of [1, 2, 3] as const) {
    agregar(preguntasConocimiento(n));
    for (let edad = 10; edad <= 18; edad++) agregar(bancoRazonamiento(n, edad));
  }
  agregar(generarCienciasNaturales()); agregar(generarEstudiosSociales());
  agregar(generarMatematicaBasica()); agregar(preguntasLecturaCritica());
  for (const v of Object.values(bgu)) if (Array.isArray(v)) agregar(v as P[]);
}
for (const id of conflicto) claves.delete(id);
writeFileSync("src/lib/claves-respuestas.server.json", JSON.stringify(Object.fromEntries(claves)));
console.log(`claves=${claves.size} excluidas=${conflicto.size}`);
