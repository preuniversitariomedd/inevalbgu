import { test, expect } from "bun:test";
import { contarNueva, cierraPrueba, MAX_AVISOS } from "./antifraude.ts";
test("Infracciones a menos de 2 s se ignoran", () => { expect(contarNueva(1000, 2999)).toBe(false); expect(contarNueva(1000, 3000)).toBe(true); expect(contarNueva(null, 5)).toBe(true); });
test("Tres avisos y la cuarta cierra", () => { expect(MAX_AVISOS).toBe(3); expect(cierraPrueba(3)).toBe(false); expect(cierraPrueba(4)).toBe(true); });
