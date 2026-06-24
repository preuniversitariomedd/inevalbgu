// Cálculo de edad exacta en años, meses y días reales (no aproximado)
export function calcularEdad(fechaNacimientoISO: string, referencia: Date = new Date()): {
  anios: number;
  meses: number;
  dias: number;
  texto: string;
} {
  const nac = new Date(fechaNacimientoISO + (fechaNacimientoISO.length === 10 ? "T00:00:00" : ""));
  let anios = referencia.getFullYear() - nac.getFullYear();
  let meses = referencia.getMonth() - nac.getMonth();
  let dias = referencia.getDate() - nac.getDate();

  if (dias < 0) {
    // tomar días reales del mes anterior al de referencia
    const mesAnterior = new Date(referencia.getFullYear(), referencia.getMonth(), 0);
    dias += mesAnterior.getDate();
    meses -= 1;
  }
  if (meses < 0) {
    meses += 12;
    anios -= 1;
  }
  const texto = `${anios} año${anios === 1 ? "" : "s"}, ${meses} mes${meses === 1 ? "" : "es"}, ${dias} día${dias === 1 ? "" : "s"}`;
  return { anios, meses, dias, texto };
}
