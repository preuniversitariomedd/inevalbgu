// Validación de cédula ecuatoriana (10 dígitos, módulo 10)
export function validarCedulaEcuatoriana(cedula: string): { valida: boolean; error?: string } {
  if (!/^\d{10}$/.test(cedula)) {
    return { valida: false, error: "La cédula debe tener exactamente 10 dígitos." };
  }
  const provincia = parseInt(cedula.slice(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    return { valida: false, error: "Código de provincia inválido (debe estar entre 01 y 24)." };
  }
  const tercerDigito = parseInt(cedula[2], 10);
  if (tercerDigito >= 6) {
    return { valida: false, error: "Tercer dígito inválido para cédula de persona natural." };
  }
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = parseInt(cedula[i], 10) * coef[i];
    if (v >= 10) v -= 9;
    suma += v;
  }
  const verificador = (10 - (suma % 10)) % 10;
  if (verificador !== parseInt(cedula[9], 10)) {
    return { valida: false, error: "Dígito verificador inválido." };
  }
  return { valida: true };
}

export function cedulaToEmail(cedula: string): string {
  return `${cedula}@prebgumate.app`;
}
