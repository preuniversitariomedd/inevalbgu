// Validación simple de documento: 9 o 10 dígitos.

export type ResultadoDoc = { valida: boolean; error?: string; tipo?: "cedula" };

export function validarCedulaEcuatoriana(doc: string): ResultadoDoc {
  const d = (doc ?? "").trim();
  if (!d) return { valida: false, error: "Ingresa el documento." };
  if (!/^\d{9,10}$/.test(d)) {
    return { valida: false, error: "El documento debe tener 9 o 10 dígitos." };
  }
  return { valida: true, tipo: "cedula" };
}

export function cedulaToEmail(cedula: string): string {
  const clean = cedula.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean}@prebgumate.app`;
}
