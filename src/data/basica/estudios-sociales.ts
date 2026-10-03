// 500 preguntas de Estudios Sociales — Básica Superior (currículo ecuatoriano)
// Bloques: Historia e identidad, Los seres humanos en el espacio (geografía),
// La convivencia (ciudadanía y Estado).
import type { Pregunta } from "../tipos";
import { crear, elegir, entero, mezclar, NIV, rng, romano, type Base } from "./gen";

export const AREA_ES = "Estudios Sociales";
export const TEMAS_ES = ["Historia e identidad", "Geografía", "Convivencia y ciudadanía"] as const;
const [HI, GE, CC] = TEMAS_ES;

const PROVINCIAS: [string, string, string][] = [["Azuay", "Cuenca", "Sierra"], ["Bolívar", "Guaranda", "Sierra"], ["Cañar", "Azogues", "Sierra"], ["Carchi", "Tulcán", "Sierra"], ["Chimborazo", "Riobamba", "Sierra"], ["Cotopaxi", "Latacunga", "Sierra"], ["El Oro", "Machala", "Costa"], ["Esmeraldas", "Esmeraldas", "Costa"], ["Galápagos", "Puerto Baquerizo Moreno", "Insular"], ["Guayas", "Guayaquil", "Costa"], ["Imbabura", "Ibarra", "Sierra"], ["Loja", "Loja", "Sierra"], ["Los Ríos", "Babahoyo", "Costa"], ["Manabí", "Portoviejo", "Costa"], ["Morona Santiago", "Macas", "Amazonía"], ["Napo", "Tena", "Amazonía"], ["Orellana", "Puerto Francisco de Orellana (El Coca)", "Amazonía"], ["Pastaza", "Puyo", "Amazonía"], ["Pichincha", "Quito", "Sierra"], ["Santa Elena", "Santa Elena", "Costa"], ["Santo Domingo de los Tsáchilas", "Santo Domingo", "Costa"], ["Sucumbíos", "Nueva Loja", "Amazonía"], ["Tungurahua", "Ambato", "Sierra"], ["Zamora Chinchipe", "Zamora", "Amazonía"]];

const PAISES: [string, string][] = [["Argentina", "Buenos Aires"], ["Brasil", "Brasilia"], ["Chile", "Santiago"], ["Colombia", "Bogotá"], ["Ecuador", "Quito"], ["Guyana", "Georgetown"], ["Paraguay", "Asunción"], ["Perú", "Lima"], ["Surinam", "Paramaribo"], ["Uruguay", "Montevideo"], ["Venezuela", "Caracas"], ["Costa Rica", "San José"]];

const EVENTOS: [string, number][] = [["Primer Grito de Independencia de Quito", 1809], ["Masacre de los patriotas quiteños del 2 de agosto", 1810], ["Independencia de Guayaquil", 1820], ["Independencia de Cuenca", 1820], ["Batalla de Pichincha", 1822], ["Batalla de Tarqui", 1829], ["Nacimiento del Ecuador como república independiente", 1830], ["Revolución Marcista", 1845], ["Asesinato de Gabriel García Moreno", 1875], ["Triunfo de la Revolución Liberal de Eloy Alfaro", 1895], ["Hoguera Bárbara (asesinato de Eloy Alfaro)", 1912], ["Revolución Juliana", 1925], ["Firma del Protocolo de Río de Janeiro", 1942], ["Primera Ley de Reforma Agraria en Ecuador", 1964], ["Inicio de la exportación petrolera ecuatoriana", 1972], ["Retorno del Ecuador a la democracia", 1979], ["Guerra del Cenepa", 1995], ["Firma de la paz con el Perú en Brasilia", 1998], ["Feriado bancario en Ecuador", 1999], ["Dolarización de la economía ecuatoriana", 2000], ["Aprobación de la Constitución de Montecristi", 2008], ["Captura de Atahualpa en Cajamarca", 1532], ["Fundación española de San Francisco de Quito", 1534], ["Descubrimiento de las islas Galápagos por Tomás de Berlanga", 1535], ["Llegada de la Misión Geodésica Francesa a Quito", 1736], ["Caída de Constantinopla", 1453], ["Llegada de Cristóbal Colón a América", 1492], ["Independencia de los Estados Unidos", 1776], ["Revolución Francesa", 1789], ["Inicio de la Primera Guerra Mundial", 1914], ["Revolución Rusa", 1917], ["Crisis de la Bolsa de Wall Street", 1929], ["Inicio de la Segunda Guerra Mundial", 1939], ["Fin de la Segunda Guerra Mundial", 1945], ["Llegada del ser humano a la Luna", 1969], ["Caída del Muro de Berlín", 1989]];

const HEMISFERIO: [string, string][] = [["Bogotá", "Norte"], ["Lima", "Sur"], ["Buenos Aires", "Sur"], ["Ciudad de México", "Norte"], ["Madrid", "Norte"], ["Santiago de Chile", "Sur"], ["Caracas", "Norte"], ["Tokio", "Norte"], ["Sídney", "Sur"], ["Ciudad del Cabo", "Sur"], ["El Cairo", "Norte"], ["Londres", "Norte"], ["Brasilia", "Sur"], ["Esmeraldas", "Norte"], ["Machala", "Sur"], ["Tulcán", "Norte"], ["Loja", "Sur"], ["Cuenca", "Sur"], ["Ibarra", "Norte"], ["Guayaquil", "Sur"]];

type F = [string, string, string, string, string, string, string];
const HECHOS: F[] = [
  [HI, "B", "Pueblos originarios", "¿Qué cultura precolombina del Ecuador es considerada una de las más antiguas de América por su cerámica?", "Valdivia", "Inca|Azteca|Maya", "La cultura Valdivia (Santa Elena) data de unos 3 500 a. C."],
  [HI, "I", "Pueblos originarios", "La cultura que trabajó el oro y el platino en la costa norte (Esmeraldas) fue:", "La Tolita", "Valdivia|Chorrera|Machalilla", "La Tolita destacó en orfebrería."],
  [HI, "I", "Pueblos originarios", "El Complejo Arqueológico Ingapirca se encuentra en la provincia de:", "Cañar", "Azuay|Loja|Chimborazo", "Es la mayor construcción incaica en Ecuador (cañari-inca)."],
  [HI, "I", "Pueblos originarios", "La Confederación Quiteña es un planteamiento histórico de:", "Juan de Velasco", "Eugenio Espejo|Juan Montalvo|Pedro Vicente Maldonado", "El padre Juan de Velasco escribió la Historia del Reino de Quito."],
  [HI, "B", "Pueblos originarios", "El último gobernante inca antes de la conquista española fue:", "Atahualpa", "Huayna Cápac|Pachacútec|Rumiñahui", "Fue capturado en Cajamarca en 1532."],
  [HI, "I", "Pueblos originarios", "El general indígena que resistió a los españoles en Quito fue:", "Rumiñahui", "Atahualpa|Huáscar|Daquilema", "Rumiñahui defendió el norte del Tahuantinsuyo."],
  [HI, "A", "Pueblos originarios", "Fernando Daquilema encabezó en 1871 un levantamiento indígena en:", "Chimborazo", "Imbabura|Loja|Manabí", "Protestó contra los diezmos y el trabajo subsidiario."],
  [HI, "B", "Colonia", "Durante la Colonia, el territorio ecuatoriano se llamó:", "Real Audiencia de Quito", "Virreinato del Río de la Plata|Capitanía de Chile|Gran Colombia", "Fue creada en 1563."],
  [HI, "I", "Colonia", "La mano de obra indígena obligatoria en la Colonia en los obrajes y haciendas se llamaba:", "Mita", "Minga|Ayllu|Diezmo", "Los indígenas trabajaban por turnos forzados."],
  [HI, "I", "Colonia", "La Escuela Quiteña se destacó en:", "Arte religioso (pintura y escultura)", "Ciencias físicas|Navegación|Literatura épica", "Artistas como Caspicara y Bernardo de Legarda."],
  [HI, "A", "Colonia", "El precursor de la independencia, médico y periodista que fundó «Primicias de la Cultura de Quito», fue:", "Eugenio Espejo", "Juan Montalvo|José Mejía Lequerica|Vicente Rocafuerte", "Publicó el primer periódico quiteño en 1792."],
  [HI, "A", "Colonia", "La Misión Geodésica Francesa vino a la Real Audiencia de Quito para:", "Medir un arco del meridiano y determinar la forma de la Tierra", "Buscar oro|Fundar ciudades|Evangelizar", "Demostró que la Tierra está achatada en los polos."],
  [HI, "B", "Independencia", "La Batalla de Pichincha fue dirigida por:", "Antonio José de Sucre", "Simón Bolívar|Eloy Alfaro|Juan José Flores", "Se libró el 24 de mayo de 1822."],
  [HI, "B", "Independencia", "El héroe niño de la Batalla de Pichincha fue:", "Abdón Calderón", "Antonio Ante|Juan Pío Montúfar|Vicente León", "Siguió combatiendo pese a sus heridas."],
  [HI, "I", "Independencia", "Tras la independencia, el Ecuador formó parte de:", "La Gran Colombia", "El Virreinato del Perú|Las Provincias Unidas|El Imperio Español", "Hasta 1830, como Distrito del Sur."],
  [HI, "I", "Independencia", "La heroína quiteña llamada «Libertadora del Libertador» fue:", "Manuela Sáenz", "Manuela Cañizares|Rosa Zárate|Dolores Cacuango", "Salvó la vida de Bolívar en 1828."],
  [HI, "I", "Independencia", "En casa de quién se reunieron los patriotas la noche del 9 de agosto de 1809:", "Manuela Cañizares", "Manuela Sáenz|Marieta de Veintimilla|Tránsito Amaguaña", "Allí se planificó el Primer Grito."],
  [HI, "B", "República", "El primer presidente del Ecuador fue:", "Juan José Flores", "Vicente Rocafuerte|Gabriel García Moreno|Eloy Alfaro", "Gobernó desde 1830."],
  [HI, "I", "República", "¿Qué presidente construyó el ferrocarril Guayaquil–Quito?", "Eloy Alfaro", "García Moreno|José María Velasco Ibarra|Leónidas Plaza", "Se inauguró en 1908."],
  [HI, "I", "República", "La Revolución Liberal estableció, entre otras cosas:", "La educación laica y la separación Iglesia-Estado", "La monarquía|La esclavitud|El voto solo para hacendados", "Fue liderada por Eloy Alfaro."],
  [HI, "A", "República", "La primera mujer en votar en Latinoamérica fue la ecuatoriana:", "Matilde Hidalgo de Procel", "Manuela Sáenz|Dolores Veintimilla|Nela Martínez", "Votó en 1924 en Machala."],
  [HI, "A", "República", "La líder indígena que fundó las primeras escuelas bilingües kichwa fue:", "Dolores Cacuango", "Matilde Hidalgo|Manuela León|Marietta de Veintimilla", "Luchó por la tierra y la educación indígena."],
  [HI, "A", "República", "El auge cacaotero en el Ecuador ocurrió principalmente entre:", "Fines del siglo XIX e inicios del XX", "El siglo XVI|El siglo XVII|Después del año 2000", "Ecuador fue gran exportador de 'pepa de oro'."],
  [HI, "A", "República", "El presidente ecuatoriano que llegó al poder cinco veces fue:", "José María Velasco Ibarra", "Eloy Alfaro|Juan José Flores|Rafael Correa", "Solo terminó uno de sus mandatos."],
  [HI, "I", "Historia universal", "La Revolución Industrial comenzó en:", "Inglaterra", "España|Rusia|Japón", "En el siglo XVIII con la máquina de vapor."],
  [HI, "I", "Historia universal", "El lema de la Revolución Francesa fue:", "Libertad, igualdad, fraternidad", "Orden y progreso|Dios, patria y libertad|Paz y pan", "Inspiró la Declaración de Derechos del Hombre."],
  [HI, "A", "Historia universal", "La Guerra Fría enfrentó principalmente a:", "Estados Unidos y la Unión Soviética", "Francia y Alemania|China y Japón|Inglaterra y España", "Duró de 1947 a 1991 aprox."],
  [HI, "B", "Historia universal", "La civilización que construyó las pirámides de Giza fue:", "La egipcia", "La romana|La griega|La azteca", "Construidas hace más de 4 500 años."],
  [HI, "I", "Historia universal", "La democracia nació en la antigua:", "Atenas", "Esparta|Roma|Babilonia", "Gobierno del pueblo (demos + kratos)."],
  [GE, "B", "Ecuador", "El Ecuador se divide en cuatro regiones naturales:", "Costa, Sierra, Amazonía e Insular", "Norte, Sur, Este y Oeste|Andes, Llanos, Selva y Mar|Costa, Valle, Selva y Desierto", "La región Insular es Galápagos."],
  [GE, "B", "Ecuador", "¿Cuántas provincias tiene el Ecuador?", "24", "20|22|26", "La más reciente es Santa Elena (2007), junto a Santo Domingo."],
  [GE, "B", "Ecuador", "La cordillera que atraviesa el Ecuador de norte a sur es:", "Los Andes", "Los Alpes|El Himalaya|Las Rocosas", "Forma dos ramales: occidental y oriental."],
  [GE, "I", "Ecuador", "El río más caudaloso que nace en Ecuador y forma parte de la cuenca amazónica es el:", "Napo", "Guayas|Esmeraldas|Mira", "Desemboca en el Amazonas."],
  [GE, "I", "Ecuador", "El Ecuador limita al norte con ___ y al sur y este con ___:", "Colombia; Perú", "Perú; Colombia|Venezuela; Brasil|Panamá; Bolivia", "Al oeste está el océano Pacífico."],
  [GE, "I", "Ecuador", "La línea imaginaria que divide la Tierra en hemisferios Norte y Sur es:", "La línea ecuatorial", "El meridiano de Greenwich|El trópico de Cáncer|El círculo polar", "Pasa por la Mitad del Mundo, en Pichincha."],
  [GE, "I", "Ecuador", "El Golfo de Guayaquil es el más grande de la costa del:", "Pacífico sudamericano", "Atlántico|Caribe|Índico", "Allí está la isla Puná."],
  [GE, "A", "Ecuador", "La 'Avenida de los Volcanes' fue nombrada así por:", "Alexander von Humboldt", "Charles Darwin|La Condamine|Francisco de Orellana", "Humboldt visitó Ecuador en 1802."],
  [GE, "A", "Ecuador", "El descubrimiento del río Amazonas (1542) lo realizó:", "Francisco de Orellana", "Sebastián de Benalcázar|Gonzalo Pizarro|Diego de Almagro", "Partió desde Quito con Gonzalo Pizarro."],
  [GE, "I", "Ecuador", "¿Cuál es el principal producto de exportación no petrolera del Ecuador en los últimos años?", "El camarón", "El trigo|El café de Brasil|El cobre", "Junto con el banano, cacao y flores."],
  [GE, "B", "Mundo", "¿Cuál es el océano más grande del planeta?", "Pacífico", "Atlántico|Índico|Ártico", "Cubre casi un tercio de la Tierra."],
  [GE, "B", "Mundo", "¿Cuántos continentes se reconocen habitualmente?", "Cinco (o seis contando la Antártida)", "Tres|Diez|Doce", "América, Europa, Asia, África y Oceanía."],
  [GE, "I", "Mundo", "El río más caudaloso del mundo es el:", "Amazonas", "Nilo|Misisipi|Danubio", "Recorre Perú, Colombia y Brasil."],
  [GE, "I", "Mundo", "El meridiano de Greenwich sirve para medir la:", "Longitud", "Latitud|Altitud|Densidad", "Es el meridiano 0°."],
  [GE, "I", "Mundo", "La latitud se mide desde:", "La línea ecuatorial", "El meridiano de Greenwich|El polo norte|El nivel del mar", "Va de 0° a 90° N o S."],
  [GE, "A", "Mundo", "La altitud de un lugar se mide con respecto a:", "El nivel del mar", "La línea ecuatorial|Greenwich|El centro de la Tierra", "Ej.: Quito ≈ 2 850 m s. n. m."],
  [GE, "A", "Mundo", "El continente más poblado es:", "Asia", "África|América|Europa", "Incluye a China e India."],
  [GE, "A", "Población", "La migración del campo a la ciudad se denomina:", "Éxodo rural", "Inmigración internacional|Emigración marítima|Urbanización inversa", "Provoca crecimiento urbano acelerado."],
  [GE, "A", "Población", "El indicador que relaciona habitantes y superficie es la:", "Densidad poblacional", "Tasa de natalidad|Esperanza de vida|Migración neta", "Se expresa en hab/km²."],
  [CC, "B", "Símbolos patrios", "Los símbolos patrios del Ecuador son:", "La bandera, el escudo y el himno nacional", "La bandera, el cóndor y el sucre|El escudo, la Constitución y la moneda|El himno, el volcán y la bandera", "Representan la identidad nacional."],
  [CC, "B", "Símbolos patrios", "El autor de la letra del Himno Nacional del Ecuador es:", "Juan León Mera", "Antonio Neumane|Juan Montalvo|Olmedo", "La música es de Antonio Neumane."],
  [CC, "I", "Símbolos patrios", "En la bandera ecuatoriana, el color amarillo representa:", "La riqueza del suelo y las cosechas", "El mar|La sangre de los héroes|El cielo", "Azul: cielo y mar; rojo: sangre de los héroes."],
  [CC, "B", "Estado", "¿Cuántas funciones del Estado establece la Constitución de 2008?", "Cinco", "Tres|Cuatro|Seis", "Ejecutiva, Legislativa, Judicial, Electoral y de Transparencia y Control Social."],
  [CC, "I", "Estado", "La Asamblea Nacional ejerce la función:", "Legislativa", "Ejecutiva|Judicial|Electoral", "Elabora y aprueba las leyes."],
  [CC, "I", "Estado", "El Consejo Nacional Electoral pertenece a la función:", "Electoral", "Legislativa|Judicial|Ejecutiva", "Organiza las elecciones."],
  [CC, "I", "Estado", "El presidente de la República ejerce la función:", "Ejecutiva", "Legislativa|Judicial|Electoral", "Es jefe de Estado y de Gobierno."],
  [CC, "I", "Estado", "La Constitución vigente del Ecuador se aprobó en:", "2008", "1998|1979|2016", "Redactada en Montecristi, Manabí."],
  [CC, "A", "Estado", "El Ecuador fue el primer país en reconocer en su Constitución los derechos de:", "La naturaleza", "Los robots|Las empresas|Los extranjeros solamente", "Art. 71: la Pacha Mama tiene derecho a que se respete su existencia."],
  [CC, "A", "Estado", "El principio andino del «Sumak Kawsay» significa:", "Buen vivir", "Gran guerra|Trabajo obligatorio|Libre comercio", "Es eje de la Constitución de 2008."],
  [CC, "I", "Ciudadanía", "En Ecuador el voto es facultativo para los jóvenes de:", "16 y 17 años", "12 a 14 años|18 a 64 años|Solo mayores de 21", "Es obligatorio de 18 a 65 años."],
  [CC, "I", "Ciudadanía", "Ecuador se define en su Constitución como un Estado:", "Plurinacional e intercultural", "Monárquico|Unitario sin diversidad|Confesional", "Reconoce 14 nacionalidades y 18 pueblos indígenas aprox."],
  [CC, "A", "Ciudadanía", "El idioma oficial de relación intercultural, junto al castellano, incluye:", "Kichwa y shuar", "Inglés y francés|Portugués|Latín", "Art. 2 de la Constitución."],
  [CC, "B", "Derechos humanos", "La Declaración Universal de los Derechos Humanos fue aprobada por:", "La ONU en 1948", "La OEA en 1990|La UNESCO en 2000|El Vaticano en 1800", "Contiene 30 artículos."],
  [CC, "I", "Derechos humanos", "El Código de la Niñez y Adolescencia protege principalmente a:", "Niñas, niños y adolescentes", "Adultos mayores|Empresas|Funcionarios públicos", "Garantiza el interés superior del niño."],
  [CC, "A", "Economía", "La moneda oficial del Ecuador antes de la dolarización era:", "El sucre", "El peso|El sol|El bolívar", "Se reemplazó por el dólar en el año 2000."],
  [CC, "A", "Economía", "El sector económico que transforma materias primas en productos es el:", "Secundario", "Primario|Terciario|Cuaternario", "Primario: extrae; terciario: servicios."],
  [CC, "I", "Organismos", "Ecuador forma parte de la Comunidad Andina junto con:", "Colombia, Perú y Bolivia", "Brasil, Argentina y Chile|México y Cuba|Venezuela y Guyana", "Organismo de integración regional."],
];

export function generarEstudiosSociales(): Pregunta[] {
  const r = rng(1809);
  const out: Pregunta[] = [];
  let n = 0;
  const b = (tema: string, subtema: string, nivel: string, enunciado: string, explicacion: string): Base => ({ id: `es-${++n}`, area: AREA_ES, tema, subtema, nivel: NIV[nivel]!, enunciado, explicacion });
  const otrosDe = <T,>(arr: T[], ex: T) => mezclar(r, arr.filter((x) => x !== ex));

  for (const [t, nv, st, q, c, d, e] of HECHOS) out.push(crear(r, b(t, st, nv, q, e), c, d.split("|")));

  for (const [p, c, reg] of PROVINCIAS) {
    out.push(crear(r, b(GE, "Provincias y capitales", "B", `¿Cuál es la capital de la provincia de ${p}?`, `La capital de ${p} es ${c}.`), c, otrosDe(PROVINCIAS.map((x) => x[1]), c)));
    out.push(crear(r, b(GE, "Provincias y capitales", "I", `${c} es la capital de la provincia de:`, `${c} es la capital de ${p} (región ${reg}).`), p, otrosDe(PROVINCIAS.map((x) => x[0]), p)));
    out.push(crear(r, b(GE, "Regiones del Ecuador", "B", `¿En qué región natural se ubica la provincia de ${p}?`, `${p} pertenece a la región ${reg}.`), reg, ["Costa", "Sierra", "Amazonía", "Insular"].filter((x) => x !== reg)));
  }
  for (const [p, c] of PAISES) {
    out.push(crear(r, b(GE, "América", "B", `¿Cuál es la capital de ${p}?`, `La capital de ${p} es ${c}.`), c, otrosDe(PAISES.map((x) => x[1]), c)));
    out.push(crear(r, b(GE, "América", "I", `${c} es la capital de:`, `${c} es la capital de ${p}.`), p, otrosDe(PAISES.map((x) => x[0]), p)));
  }
  for (const [ev, a] of EVENTOS) {
    out.push(crear(r, b(HI, "Cronología", "I", `¿En qué año ocurrió: ${ev}?`, `${ev}: ${a}.`), String(a), [a + 10, a - 10, a + 3, a - 25, a + 50].map(String)));
    const mismos = EVENTOS.filter((x) => x[1] !== a).map((x) => x[0]);
    out.push(crear(r, b(HI, "Cronología", "A", `¿Qué acontecimiento ocurrió en el año ${a}?`, `En ${a}: ${ev}.`), ev, mezclar(r, mismos)));
  }
  for (const [c, h] of HEMISFERIO) {
    out.push(crear(r, b(GE, "Coordenadas geográficas", "I", `La ciudad de ${c} se ubica en el hemisferio:`, `${c} está al ${h.toLowerCase()} de la línea ecuatorial.`), h, h === "Norte" ? ["Sur", "Oriental únicamente", "Ninguno"] : ["Norte", "Occidental únicamente", "Ninguno"]));
  }

  let k = 0;
  while (out.length < 500) {
    const t = k++ % 5;
    if (t === 0) {
      const a = entero(r, 120, 2025), s = Math.ceil(a / 100);
      out.push(crear(r, b(HI, "Tiempo histórico", "I", `¿A qué siglo pertenece el año ${a}?`, `Siglo = parte entera de (${a} − 1) ÷ 100 + 1 = ${s} → siglo ${romano(s)}.`), `Siglo ${romano(s)}`, [s - 1, s + 1, s + 2].filter((x) => x > 0).map((x) => `Siglo ${romano(x)}`)));
    } else if (t === 1) {
      const [e1, a1] = elegir(r, EVENTOS), [e2, a2] = elegir(r, EVENTOS);
      if (a1 === a2) continue;
      const d = Math.abs(a1 - a2);
      out.push(crear(r, b(HI, "Tiempo histórico", "A", `¿Cuántos años transcurrieron entre «${e1}» (${a1}) y «${e2}» (${a2})?`, `|${a1} − ${a2}| = ${d} años.`), `${d} años`, [d + 10, Math.max(1, d - 10), d + 1, d * 2].map((x) => `${x} años`)));
    } else if (t === 2) {
      const sup = entero(r, 2, 40) * 500, dens = entero(r, 5, 120), pob = sup * dens;
      out.push(crear(r, b(GE, "Población", "I", `Una provincia tiene ${pob.toLocaleString("es-EC")} habitantes y ${sup.toLocaleString("es-EC")} km². ¿Cuál es su densidad poblacional?`, `Densidad = ${pob} ÷ ${sup} = ${dens} hab/km².`), `${dens} hab/km²`, [dens * 10, dens + 15, Math.round(dens / 2) || 1, dens * 2].map((x) => `${x} hab/km²`)));
    } else if (t === 3) {
      const esc = elegir(r, [50000, 100000, 200000, 250000, 500000, 1000000]), cm = entero(r, 2, 15), km = (cm * esc) / 100000;
      out.push(crear(r, b(GE, "Cartografía", "A", `En un mapa a escala 1:${esc.toLocaleString("es-EC")}, dos ciudades están separadas ${cm} cm. ¿Cuál es la distancia real?`, `${cm} cm × ${esc} = ${cm * esc} cm = ${km} km.`), `${km} km`, [km * 10, km / 10, km + cm, km * 100].map((x) => `${x} km`)));
    } else {
      const tres = mezclar(r, EVENTOS).slice(0, 4);
      if (new Set(tres.map((x) => x[1])).size < 4) continue;
      const primero = [...tres].sort((x, y) => x[1] - y[1])[0]!;
      out.push(crear(r, b(HI, "Cronología", "A", `¿Cuál de estos acontecimientos ocurrió PRIMERO?`, `Orden: ${[...tres].sort((x, y) => x[1] - y[1]).map((x) => `${x[0]} (${x[1]})`).join(" → ")}.`), primero[0], tres.filter((x) => x !== primero).map((x) => x[0])));
    }
  }
  return out.slice(0, 500);
}
