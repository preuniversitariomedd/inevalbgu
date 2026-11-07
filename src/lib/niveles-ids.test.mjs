import { describe, it, expect } from "bun:test";
import ids from "@/data/ids-niveles.json";
import { preguntasConocimiento } from "@/data/conocimiento";
import { bancoRazonamiento, progresoRazonamiento } from "@/data/basica/razonamiento";
import { progresoRazonamientoLigero } from "./niveles-ids";

describe("lista liviana de IDs por nivel", () => {
  for (const n of [1, 2, 3]) {
    it(`coincide con los bancos completos en el nivel ${n}`, () => {
      expect(ids.con[n]).toEqual(preguntasConocimiento(n).map(p => p.id));
      expect(new Set(ids.raz[n])).toEqual(new Set(bancoRazonamiento(n, 14).map(p => p.id)));
    });
  }
  it("da la misma meta de Razonamiento (100/95/90 %)", () => {
    for (const n of [1, 2, 3]) {
      const a = ids.raz[n].slice(0, 40);
      expect(progresoRazonamientoLigero(n, a)).toEqual(progresoRazonamiento(n, a));
    }
  });
});
