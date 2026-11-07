import { test, expect } from "bun:test";
import { corregirRespuesta } from "./corregir.server.ts";
import { BANCO_SIMULACRO } from "../data/index.ts";
import { preguntasConocimiento } from "../data/conocimiento.ts";

const p = BANCO_SIMULACRO[0];
const k = preguntasConocimiento(1)[0];
test("el servidor rechaza un 'correcta' falso con opción equivocada", () => {
  const mala = p.opciones.find((_, i) => i !== p.respuestaCorrecta);
  expect(corregirRespuesta(p.id, mala, true)).toBe(false);
});
test("el servidor acepta la opción correcta aunque el navegador diga falso", () => {
  expect(corregirRespuesta(k.id, k.opciones[k.respuestaCorrecta], false)).toBe(true);
});
test("pregunta desconocida conserva la corrección del navegador", () => {
  expect(corregirRespuesta("manual-xyz", "a", true)).toBe(true);
});
test("sin opción elegida en pregunta conocida no cuenta como correcta", () => {
  expect(corregirRespuesta(p.id, undefined, true)).toBe(false);
});
