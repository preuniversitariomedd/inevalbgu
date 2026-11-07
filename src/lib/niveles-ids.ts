// IDs por nivel precalculados (scripts/generar-ids-niveles.ts) para que el
// cálculo de notas no cargue los bancos completos de preguntas en memoria.
import ids from "@/data/ids-niveles.json";

type N = 1 | 2 | 3;
const sets = (o: Record<string, string[]>) => ({ 1: new Set(o["1"]), 2: new Set(o["2"]), 3: new Set(o["3"]) }) as Record<N, Set<string>>;
export const IDS_CON = sets(ids.con);
export const IDS_RAZ = sets(ids.raz);
export const METAS: Record<N, number> = { 1: 1, 2: 0.95, 3: 0.9 };

export function progresoRazonamientoLigero(nivel: N, aciertos: readonly string[] = []) {
  const total = IDS_RAZ[nivel].size;
  const meta = Math.ceil(total * METAS[nivel]);
  const correctas = [...new Set(aciertos)].filter(id => IDS_RAZ[nivel].has(id)).length;
  return { total, meta, correctas, aprobado: total > 0 && correctas >= meta };
}

export function nivelDe(area: "Conocimiento" | "Razonamiento", id: string): string | undefined {
  const s = area === "Conocimiento" ? IDS_CON : IDS_RAZ;
  return ([1, 2, 3] as const).find(n => s[n].has(id))?.toString();
}
