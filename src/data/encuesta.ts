// Encuesta de Factores Asociados / Cuestionario socioemocional (100 preguntas)
// Dividida en 5 bloques ("periodos") de 20 preguntas cada uno.

export interface PreguntaEncuesta {
  id: string;
  texto: string;
  opciones: string[];
}

export interface BloqueEncuesta {
  id: string;
  titulo: string;
  descripcion: string;
  minutos: number;
  preguntas: PreguntaEncuesta[];
}

const FREC = ["Nunca", "Rara vez", "A veces", "Casi siempre", "Siempre"];
const ACUERDO = ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"];
const SI_NO = ["Sí", "No", "No lo sé"];

function q(id: string, texto: string, opciones: string[]): PreguntaEncuesta {
  return { id, texto, opciones };
}

// ---------- Bloque 1: Contexto socioeconómico ----------
const B1: PreguntaEncuesta[] = [
  q("B1-01", "¿Cuántas personas viven habitualmente en tu hogar?", ["1 a 2", "3 a 4", "5 a 6", "7 o más"]),
  q("B1-02", "¿La vivienda donde vives es...?", ["Propia y pagada", "Propia y la están pagando", "Arrendada", "Prestada o cedida"]),
  q("B1-03", "¿Cuántos dormitorios tiene tu vivienda?", ["1", "2", "3", "4 o más"]),
  q("B1-04", "¿Tu vivienda cuenta con agua potable de red pública?", SI_NO),
  q("B1-05", "¿Tu vivienda cuenta con servicio eléctrico permanente?", SI_NO),
  q("B1-06", "¿Tienes conexión a internet en casa?", ["Sí, fija y estable", "Sí, pero inestable", "Solo datos móviles", "No tengo"]),
  q("B1-07", "¿Qué dispositivo usas principalmente para estudiar?", ["Computador propio", "Computador compartido", "Celular propio", "Celular prestado", "Ninguno"]),
  q("B1-08", "¿Tienes un lugar fijo y tranquilo para hacer tus tareas?", SI_NO),
  q("B1-09", "¿Cuántos libros (además de los escolares) hay en tu casa?", ["Ninguno", "1 a 10", "11 a 25", "Más de 25"]),
  q("B1-10", "¿Trabajas o ayudas en un negocio familiar fuera del horario escolar?", ["No", "Sí, ocasionalmente", "Sí, algunos días", "Sí, todos los días"]),
  q("B1-11", "Si trabajas, ¿cuántas horas al día dedicas a ello?", ["No trabajo", "Menos de 2", "2 a 4", "Más de 4"]),
  q("B1-12", "¿Los ingresos de tu hogar alcanzan para cubrir los gastos del mes?", ["Nunca alcanzan", "Casi nunca", "A veces", "Casi siempre", "Siempre alcanzan"]),
  q("B1-13", "¿Has recibido becas o apoyos económicos para estudiar?", SI_NO),
  q("B1-14", "¿Cuentas con los útiles escolares que necesitas?", FREC),
  q("B1-15", "¿Cuentas con uniforme completo y calzado adecuado?", FREC),
  q("B1-16", "¿Alguien de tu hogar ha perdido el empleo en el último año?", SI_NO),
  q("B1-17", "¿Tu familia dispone de vehículo propio?", ["No", "Motocicleta", "Automóvil", "Más de un vehículo"]),
  q("B1-18", "¿Con qué frecuencia debes faltar a clases por motivos económicos?", FREC),
  q("B1-19", "¿Pagas por servicios adicionales de estudio (tutorías, cursos)?", SI_NO),
  q("B1-20", "En general, ¿cómo describirías la situación económica de tu hogar?", ["Muy difícil", "Difícil", "Estable", "Cómoda", "Muy cómoda"]),
];

// ---------- Bloque 2: Entorno familiar y apoyo ----------
const B2: PreguntaEncuesta[] = [
  q("B2-01", "¿Con quién vives principalmente?", ["Ambos padres", "Solo madre", "Solo padre", "Abuelos u otros familiares", "Otra situación"]),
  q("B2-02", "¿Cuál es el nivel de estudios más alto de tu madre o cuidadora?", ["Ninguno", "Primaria", "Secundaria", "Superior", "No lo sé"]),
  q("B2-03", "¿Cuál es el nivel de estudios más alto de tu padre o cuidador?", ["Ninguno", "Primaria", "Secundaria", "Superior", "No lo sé"]),
  q("B2-04", "¿Alguien en casa te pregunta por tus tareas escolares?", FREC),
  q("B2-05", "¿Alguien en casa puede ayudarte con matemática cuando lo necesitas?", FREC),
  q("B2-06", "¿Tu familia asiste a las reuniones del colegio?", FREC),
  q("B2-07", "¿En casa se conversa sobre tu futuro académico o profesional?", FREC),
  q("B2-08", "¿Tienes responsabilidades del hogar (cuidar hermanos, cocinar, limpiar)?", FREC),
  q("B2-09", "¿Cuántas horas al día dedicas a esas responsabilidades?", ["Ninguna", "Menos de 1", "1 a 2", "3 a 4", "Más de 4"]),
  q("B2-10", "¿Algún familiar cercano vive fuera del país?", SI_NO),
  q("B2-11", "En mi familia me siento escuchado y comprendido.", ACUERDO),
  q("B2-12", "¿Con qué frecuencia hay discusiones fuertes en tu hogar?", FREC),
  q("B2-13", "¿Tienes un horario establecido para estudiar en casa?", SI_NO),
  q("B2-14", "¿Tu familia valora que obtengas buenas calificaciones?", ACUERDO),
  q("B2-15", "¿Te sientes presionado por tu familia respecto a tus notas?", FREC),
  q("B2-16", "¿Has cambiado de vivienda en los últimos 2 años?", SI_NO),
  q("B2-17", "¿Has cambiado de institución educativa en los últimos 2 años?", SI_NO),
  q("B2-18", "¿Cuántas horas duermes normalmente entre semana?", ["Menos de 5", "5 a 6", "7 a 8", "Más de 8"]),
  q("B2-19", "¿Tienes tiempo libre para actividades recreativas o deporte?", FREC),
  q("B2-20", "En general, ¿el ambiente de mi casa me permite estudiar bien?", ACUERDO),
];

// ---------- Bloque 3: Ubicación geográfica, traslado y transporte ----------
const B3: PreguntaEncuesta[] = [
  q("B3-01", "¿Dónde está ubicada tu vivienda?", ["Zona urbana", "Zona periurbana", "Zona rural", "Zona muy alejada"]),
  q("B3-02", "¿Cuánto tiempo tardas en llegar al colegio?", ["Menos de 15 min", "15 a 30 min", "31 a 60 min", "Más de 1 hora"]),
  q("B3-03", "¿Cuál es tu medio de transporte principal?", ["Camino a pie", "Bicicleta", "Transporte público (bus)", "Transporte escolar", "Vehículo familiar", "Moto/taxi"]),
  q("B3-04", "¿Cuántos transportes distintos debes tomar para llegar?", ["Ninguno", "1", "2", "3 o más"]),
  q("B3-05", "¿Cuánto gastas al día en transporte?", ["Nada", "Menos de $1", "$1 a $2", "Más de $2"]),
  q("B3-06", "¿Con qué frecuencia llegas tarde por problemas de transporte?", FREC),
  q("B3-07", "¿El estado de las vías a tu colegio es adecuado?", ACUERDO),
  q("B3-08", "¿Te sientes seguro durante el trayecto al colegio?", FREC),
  q("B3-09", "¿Viajas acompañado al colegio?", FREC),
  q("B3-10", "¿A qué hora sales normalmente de casa hacia el colegio?", ["Antes de 5:30", "5:30 a 6:00", "6:01 a 6:30", "Después de 6:30"]),
  q("B3-11", "¿El clima (lluvia, frío, calor) afecta tu asistencia?", FREC),
  q("B3-12", "¿Cuánto tardas en regresar a casa después de clases?", ["Menos de 15 min", "15 a 30 min", "31 a 60 min", "Más de 1 hora"]),
  q("B3-13", "¿El cansancio del traslado afecta tu concentración en clase?", FREC),
  q("B3-14", "¿Existe transporte público disponible cerca de tu vivienda?", SI_NO),
  q("B3-15", "¿Has faltado a clases por falta de transporte?", FREC),
  q("B3-16", "¿Tienes acceso a señal de internet móvil en tu zona?", ["Buena", "Regular", "Mala", "Sin señal"]),
  q("B3-17", "¿Existe una biblioteca o centro de estudio cerca de tu casa?", SI_NO),
  q("B3-18", "¿Cuántos días a la semana asistes presencialmente?", ["1 a 2", "3 a 4", "5", "Más de 5"]),
  q("B3-19", "¿Tu comunidad cuenta con espacios seguros para estudiar o recrearse?", SI_NO),
  q("B3-20", "En general, ¿el traslado al colegio te resulta difícil?", ACUERDO),
];

// ---------- Bloque 4: Alimentación, salud y hábitos ----------
const B4: PreguntaEncuesta[] = [
  q("B4-01", "¿Desayunas antes de ir al colegio?", FREC),
  q("B4-02", "¿Cuántas comidas completas haces al día?", ["1", "2", "3", "4 o más"]),
  q("B4-03", "¿Con qué frecuencia consumes frutas y verduras?", FREC),
  q("B4-04", "¿Con qué frecuencia consumes proteínas (carne, huevo, granos)?", FREC),
  q("B4-05", "¿Con qué frecuencia consumes comida rápida o snacks empaquetados?", FREC),
  q("B4-06", "¿Con qué frecuencia bebes bebidas azucaradas o gaseosas?", FREC),
  q("B4-07", "¿Llevas o compras un refrigerio en el colegio?", FREC),
  q("B4-08", "¿Alguna vez has sentido hambre durante las clases?", FREC),
  q("B4-09", "¿En tu hogar ha faltado comida por falta de dinero?", FREC),
  q("B4-10", "¿Cuántos vasos de agua tomas al día?", ["Menos de 2", "2 a 4", "5 a 7", "8 o más"]),
  q("B4-11", "¿Realizas actividad física o deporte?", FREC),
  q("B4-12", "¿Tienes alguna condición de salud que afecte tu estudio?", SI_NO),
  q("B4-13", "¿Usas lentes o necesitas revisión visual?", ["No necesito", "Uso lentes", "Creo que necesito", "No lo sé"]),
  q("B4-14", "¿Escuchas bien al docente desde tu asiento?", FREC),
  q("B4-15", "¿Has faltado a clases por enfermedad en el último mes?", ["No", "1 día", "2 a 3 días", "Más de 3 días"]),
  q("B4-16", "¿Tienes acceso a atención médica cuando la necesitas?", SI_NO),
  q("B4-17", "¿Cuántas horas al día usas el celular para entretenimiento?", ["Menos de 1", "1 a 2", "3 a 4", "Más de 4"]),
  q("B4-18", "¿Sientes fatiga o sueño durante las clases?", FREC),
  q("B4-19", "¿Consideras que tu alimentación es saludable?", ACUERDO),
  q("B4-20", "¿La alimentación influye en tu rendimiento escolar?", ACUERDO),
];

// ---------- Bloque 5: Bienestar socioemocional, cultura e identidad ----------
const B5: PreguntaEncuesta[] = [
  q("B5-01", "¿Cómo te autoidentificas culturalmente?", ["Mestizo/a", "Indígena", "Afroecuatoriano/a", "Montubio/a", "Blanco/a", "Prefiero no decirlo"]),
  q("B5-02", "¿En tu hogar se habla otro idioma además del español?", SI_NO),
  q("B5-03", "¿Te has sentido discriminado en tu institución educativa?", FREC),
  q("B5-04", "Me siento parte del grupo de mi curso.", ACUERDO),
  q("B5-05", "Tengo compañeros con quienes puedo contar.", ACUERDO),
  q("B5-06", "¿Con qué frecuencia te sientes nervioso antes de un examen?", FREC),
  q("B5-07", "¿Con qué frecuencia te sientes triste o desanimado?", FREC),
  q("B5-08", "¿Con qué frecuencia te cuesta concentrarte al estudiar?", FREC),
  q("B5-09", "Cuando algo me sale mal, sigo intentándolo.", ACUERDO),
  q("B5-10", "Puedo organizar mi tiempo de estudio por mi cuenta.", ACUERDO),
  q("B5-11", "Creo que puedo mejorar en matemática si me esfuerzo.", ACUERDO),
  q("B5-12", "Me siento capaz de resolver problemas difíciles.", ACUERDO),
  q("B5-13", "¿Pides ayuda cuando no entiendes un tema?", FREC),
  q("B5-14", "¿Con qué frecuencia te sientes motivado a asistir al colegio?", FREC),
  q("B5-15", "Reconozco mis emociones y sé cómo calmarme.", ACUERDO),
  q("B5-16", "¿Has presenciado o sufrido acoso escolar?", FREC),
  q("B5-17", "Confío en que los docentes me apoyan cuando lo necesito.", ACUERDO),
  q("B5-18", "Me pongo metas académicas y las cumplo.", ACUERDO),
  q("B5-19", "¿Piensas continuar estudios superiores?", ["Sí, con seguridad", "Probablemente sí", "No lo sé", "Probablemente no"]),
  q("B5-20", "En general, me siento satisfecho con mi vida escolar.", ACUERDO),
];

export const BLOQUES_ENCUESTA: BloqueEncuesta[] = [
  {
    id: "contexto-socioeconomico",
    titulo: "Periodo 1 · Contexto socioeconómico",
    descripcion: "Condiciones de vivienda, servicios, recursos y economía del hogar.",
    minutos: 6,
    preguntas: B1,
  },
  {
    id: "entorno-familiar",
    titulo: "Periodo 2 · Entorno familiar",
    descripcion: "Composición del hogar, acompañamiento y apoyo al estudio.",
    minutos: 6,
    preguntas: B2,
  },
  {
    id: "geografia-traslado",
    titulo: "Periodo 3 · Geografía, traslado y transporte",
    descripcion: "Ubicación, tiempo de traslado y medio de transporte al establecimiento.",
    minutos: 5,
    preguntas: B3,
  },
  {
    id: "alimentacion-salud",
    titulo: "Periodo 4 · Alimentación y salud",
    descripcion: "Tipo de alimentación, hábitos, descanso y salud.",
    minutos: 5,
    preguntas: B4,
  },
  {
    id: "socioemocional",
    titulo: "Periodo 5 · Socioemocional, cultura e identidad",
    descripcion: "Bienestar emocional, convivencia, autoeficacia y autoidentificación.",
    minutos: 6,
    preguntas: B5,
  },
];

export const TOTAL_PREGUNTAS_ENCUESTA = BLOQUES_ENCUESTA.reduce((s, b) => s + b.preguntas.length, 0);

export function bloquePorId(id: string) {
  return BLOQUES_ENCUESTA.find((b) => b.id === id);
}

export function textoPregunta(preguntaId: string): string {
  for (const b of BLOQUES_ENCUESTA) {
    const p = b.preguntas.find((x) => x.id === preguntaId);
    if (p) return p.texto;
  }
  return preguntaId;
}
