// Validación flexible de documento de identidad.
// - Cédula ecuatoriana (10 dígitos): valida provincia + módulo 10.
// - Documento extranjero: 6 a 20 caracteres alfanuméricos (pasaporte, DNI, etc.).

export type ResultadoDoc = { valida: boolean; error?: string; tipo?: "cedula_ec" | "extranjero" };

export function validarCedulaEcuatoriana(doc: string): ResultadoDoc {
  const d = (doc ?? "").trim();
  if (!d) return { valida: false, error: "Ingresa el documento." };

  // Si son 10 dígitos, validamos como cédula ecuatoriana (algoritmo módulo 10).
  if (/^\d{10}$/.test(d)) {
    const provincia = parseInt(d.slice(0, 2), 10);
    if (provincia < 1 || provincia > 24) {
      return { valida: false, error: "Código de provincia inválido (01–24) para cédula ecuatoriana." };
    }
    const tercerDigito = parseInt(d[2], 10);
    if (tercerDigito >= 6) {
      return { valida: false, error: "Tercer dígito inválido para cédula de persona natural." };
    }
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let v = parseInt(d[i], 10) * coef[i];
      if (v >= 10) v -= 9;
      suma += v;
    }
    const verificador = (10 - (suma % 10)) % 10;
    if (verificador !== parseInt(d[9], 10)) {
      return { valida: false, error: "Dígito verificador inválido para cédula ecuatoriana." };
    }
    return { valida: true, tipo: "cedula_ec" };
  }

  // Documento extranjero: pasaporte / DNI / etc.
  if (/^[A-Za-z0-9-]{6,20}$/.test(d)) {
    return { valida: true, tipo: "extranjero" };
  }

  return {
    valida: false,
    error: "Documento inválido. Usa cédula ecuatoriana (10 dígitos) o documento extranjero (6–20 caracteres alfanuméricos).",
  };
}

export function cedulaToEmail(cedula: string): string {
  const clean = cedula.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean}@prebgumate.app`;
}
