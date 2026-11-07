// Genera src/data/ids-niveles.json: IDs de preguntas por nivel (Conocimiento y
// Razonamiento) para calcular notas sin cargar los bancos completos.
// Ejecutar: bun scripts/generar-ids-niveles.ts
import { preguntasConocimiento } from "../src/data/conocimiento";
import { bancoRazonamiento } from "../src/data/basica/razonamiento";
import { writeFileSync } from "node:fs";
const n = [1, 2, 3] as const;
const out = {
  con: Object.fromEntries(n.map(i => [i, preguntasConocimiento(i).map(p => p.id)])),
  raz: Object.fromEntries(n.map(i => [i, [...new Set(bancoRazonamiento(i, 14).map(p => p.id))]])),
};
writeFileSync("src/data/ids-niveles.json", JSON.stringify(out));
console.log(n.map(i => `con${i}=${out.con[i].length} raz${i}=${out.raz[i].length}`).join(" "));
