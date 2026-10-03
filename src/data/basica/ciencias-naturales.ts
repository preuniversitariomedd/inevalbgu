// 500 preguntas de Ciencias Naturales — Básica Superior (8.º, 9.º y 10.º EGB)
// Currículo ecuatoriano: Los seres vivos y su ambiente, Cuerpo humano y salud,
// Materia y energía, La Tierra y el Universo, Ciencia en acción.
import type { Pregunta } from "../tipos";
import { crear, elegir, entero, fmt, NIV, rng, type Base } from "./gen";

export const AREA_CN = "Ciencias Naturales";
export const TEMAS_CN = ["Los seres vivos y su ambiente", "Cuerpo humano y salud", "Materia y energía", "La Tierra y el Universo"] as const;
const [SV, CH, ME, TU] = TEMAS_CN;

// [tema, nivel, subtema, pregunta, correcta, "d1|d2|d3", explicación]
type F = [string, string, string, string, string, string, string];
const HECHOS: F[] = [
  [SV, "B", "La célula", "¿Cuál es la unidad básica estructural y funcional de los seres vivos?", "La célula", "El tejido|El órgano|El átomo", "Todo ser vivo está formado por una o más células (teoría celular)."],
  [SV, "B", "La célula", "¿Qué organelo realiza la fotosíntesis en las células vegetales?", "Cloroplasto", "Mitocondria|Ribosoma|Vacuola", "Los cloroplastos contienen clorofila, que capta la luz solar."],
  [SV, "B", "La célula", "¿Qué organelo produce la energía (ATP) mediante la respiración celular?", "Mitocondria", "Cloroplasto|Aparato de Golgi|Lisosoma", "La mitocondria es la 'central energética' de la célula."],
  [SV, "B", "La célula", "¿Qué estructura contiene el material genético en una célula eucariota?", "El núcleo", "La membrana|El citoplasma|La pared celular", "En las eucariotas el ADN está protegido dentro del núcleo."],
  [SV, "I", "La célula", "¿Qué estructura tienen las células vegetales pero NO las animales?", "Pared celular", "Membrana plasmática|Mitocondria|Ribosomas", "La pared celular de celulosa da rigidez a las células vegetales."],
  [SV, "I", "La célula", "Las bacterias son células procariotas porque:", "No tienen núcleo definido", "Tienen muchos núcleos|Son pluricelulares|Tienen cloroplastos", "Procariota = sin núcleo; el ADN está libre en el citoplasma."],
  [SV, "I", "La célula", "¿Qué organelo fabrica proteínas?", "Ribosoma", "Lisosoma|Vacuola|Centriolo", "Los ribosomas traducen la información genética en proteínas."],
  [SV, "B", "Clasificación", "¿Cuántos reinos de seres vivos se reconocen en la clasificación clásica de Whittaker?", "Cinco", "Tres|Cuatro|Siete", "Mónera, Protista, Fungi, Plantae y Animalia."],
  [SV, "B", "Clasificación", "Los hongos pertenecen al reino:", "Fungi", "Plantae|Mónera|Protista", "Los hongos no hacen fotosíntesis; se alimentan por absorción."],
  [SV, "I", "Clasificación", "¿Cuál es el orden correcto de las categorías taxonómicas de mayor a menor?", "Reino, filo, clase, orden, familia, género, especie", "Especie, género, familia, orden, clase, filo, reino|Reino, clase, filo, familia, orden, especie, género|Filo, reino, clase, orden, género, familia, especie", "Se va de lo más general (reino) a lo más específico (especie)."],
  [SV, "I", "Clasificación", "¿Quién propuso el sistema de nomenclatura binomial?", "Carlos Linneo", "Charles Darwin|Gregor Mendel|Louis Pasteur", "Linneo nombró a las especies con dos palabras: género y especie."],
  [SV, "B", "Ecosistemas", "En una cadena alimenticia, las plantas son:", "Productores", "Consumidores primarios|Descomponedores|Consumidores secundarios", "Producen su propio alimento por fotosíntesis."],
  [SV, "B", "Ecosistemas", "Los hongos y bacterias que degradan restos orgánicos son:", "Descomponedores", "Productores|Herbívoros|Carnívoros", "Devuelven nutrientes al suelo."],
  [SV, "I", "Ecosistemas", "Un conejo que come hierba es un:", "Consumidor primario", "Productor|Consumidor terciario|Descomponedor", "Los herbívoros se alimentan directamente de los productores."],
  [SV, "I", "Ecosistemas", "¿Qué factor es abiótico en un ecosistema?", "La temperatura", "Los insectos|Las bacterias|Los árboles", "Abiótico = sin vida: agua, luz, temperatura, suelo."],
  [SV, "I", "Ecosistemas", "La relación en la que ambos organismos se benefician se llama:", "Mutualismo", "Parasitismo|Depredación|Competencia", "Ej.: abejas y flores."],
  [SV, "A", "Ecosistemas", "La relación en la que uno se beneficia y el otro ni gana ni pierde es:", "Comensalismo", "Mutualismo|Parasitismo|Amensalismo", "Ej.: la rémora y el tiburón."],
  [SV, "A", "Ecosistemas", "En una pirámide ecológica, aproximadamente qué porcentaje de energía pasa al siguiente nivel trófico:", "10 %", "50 %|90 %|100 %", "Ley del 10 %: la mayor parte se pierde como calor."],
  [SV, "B", "Biodiversidad del Ecuador", "¿Qué archipiélago ecuatoriano inspiró la teoría de la evolución de Darwin?", "Galápagos", "Jambelí|Puná|La Plata", "Darwin visitó Galápagos en 1835 y observó los pinzones."],
  [SV, "B", "Biodiversidad del Ecuador", "¿Cuál es el ave nacional del Ecuador?", "El cóndor andino", "El colibrí|El piquero de patas azules|El águila arpía", "El cóndor andino aparece en el escudo nacional."],
  [SV, "I", "Biodiversidad del Ecuador", "El Parque Nacional Yasuní se ubica en la región:", "Amazónica", "Costa|Sierra|Insular", "Es uno de los lugares más biodiversos del planeta."],
  [SV, "I", "Biodiversidad del Ecuador", "El ecosistema de alta montaña andina, con frailejones y pajonales, es el:", "Páramo", "Manglar|Bosque seco|Bosque húmedo tropical", "El páramo regula el agua que consumen las ciudades andinas."],
  [SV, "I", "Biodiversidad del Ecuador", "¿Qué ecosistema costero protege las orillas y sirve de criadero a peces y cangrejos?", "Manglar", "Páramo|Glaciar|Bosque nublado", "Los manglares crecen en agua salobre de la Costa."],
  [SV, "A", "Biodiversidad del Ecuador", "Que una especie sea endémica de Galápagos significa que:", "Solo vive naturalmente en Galápagos", "Está extinta|Fue traída por humanos|Vive en todo el mundo", "Endemismo: especie exclusiva de una zona."],
  [SV, "A", "Evolución", "La selección natural fue propuesta por:", "Charles Darwin", "Jean-Baptiste Lamarck|Isaac Newton|Robert Hooke", "Los individuos mejor adaptados sobreviven y se reproducen más."],
  [SV, "A", "Genética", "¿Quién es considerado el padre de la genética?", "Gregor Mendel", "Carlos Linneo|Alexander Fleming|Robert Brown", "Mendel estudió la herencia con plantas de arveja."],
  [SV, "I", "Fotosíntesis", "¿Qué gas liberan las plantas durante la fotosíntesis?", "Oxígeno", "Dióxido de carbono|Nitrógeno|Hidrógeno", "6CO₂ + 6H₂O + luz → glucosa + 6O₂."],
  [SV, "I", "Fotosíntesis", "¿Qué gas absorben las plantas para realizar la fotosíntesis?", "Dióxido de carbono", "Oxígeno|Helio|Metano", "El CO₂ se toma por los estomas de las hojas."],
  [SV, "A", "Reproducción", "La reproducción en la que interviene un solo progenitor es:", "Asexual", "Sexual|Por fecundación|Cruzada", "Ej.: gemación, bipartición, esquejes."],
  [CH, "B", "Sistemas", "¿Qué órgano bombea la sangre a todo el cuerpo?", "El corazón", "Los pulmones|El hígado|Los riñones", "El corazón es el centro del sistema circulatorio."],
  [CH, "B", "Sistemas", "¿Dónde se realiza el intercambio de gases en los pulmones?", "En los alvéolos", "En la tráquea|En la faringe|En el diafragma", "En los alvéolos el O₂ pasa a la sangre y sale el CO₂."],
  [CH, "B", "Sistemas", "¿Cuál es el hueso más largo del cuerpo humano?", "El fémur", "La tibia|El húmero|El radio", "El fémur está en el muslo."],
  [CH, "B", "Sistemas", "¿Cuántos huesos tiene aproximadamente un adulto?", "206", "150|300|412", "Al nacer hay más; muchos se fusionan con la edad."],
  [CH, "I", "Sistemas", "Las células sanguíneas encargadas de transportar oxígeno son:", "Glóbulos rojos", "Glóbulos blancos|Plaquetas|Neuronas", "Contienen hemoglobina."],
  [CH, "I", "Sistemas", "Las plaquetas intervienen en:", "La coagulación de la sangre", "El transporte de oxígeno|La defensa contra virus|La digestión", "Forman tapones que detienen hemorragias."],
  [CH, "I", "Sistemas", "La insulina es producida por:", "El páncreas", "El hígado|La tiroides|El estómago", "Regula la glucosa en la sangre."],
  [CH, "I", "Sistemas", "La unidad funcional del sistema nervioso es la:", "Neurona", "Nefrona|Alvéolo|Vellosidad", "Transmite impulsos nerviosos."],
  [CH, "I", "Sistemas", "La unidad funcional del riñón es la:", "Nefrona", "Neurona|Alvéolo|Sarcómero", "Filtra la sangre y forma la orina."],
  [CH, "A", "Sistemas", "¿En qué parte del sistema digestivo se absorbe la mayoría de los nutrientes?", "Intestino delgado", "Estómago|Esófago|Intestino grueso", "Sus vellosidades aumentan la superficie de absorción."],
  [CH, "A", "Sistemas", "Las hormonas son producidas por el sistema:", "Endocrino", "Digestivo|Óseo|Excretor", "Glándulas como la tiroides, hipófisis y suprarrenales."],
  [CH, "B", "Salud", "¿Qué nutriente es la principal fuente de energía rápida?", "Carbohidratos", "Vitaminas|Minerales|Agua", "Pan, arroz, papa y frutas aportan carbohidratos."],
  [CH, "B", "Salud", "Las proteínas sirven principalmente para:", "Formar y reparar tejidos", "Dar energía inmediata|Regular la temperatura solamente|Transportar oxígeno", "Se encuentran en carnes, huevos, leguminosas."],
  [CH, "I", "Salud", "La falta de vitamina C produce:", "Escorbuto", "Raquitismo|Anemia ferropénica|Bocio", "La vitamina C está en cítricos como la naranja."],
  [CH, "I", "Salud", "La falta de yodo puede producir:", "Bocio", "Escorbuto|Caries|Diabetes", "Por eso la sal de mesa es yodada."],
  [CH, "I", "Salud", "Las vacunas protegen porque:", "Estimulan al sistema inmunológico a producir defensas", "Matan todas las bacterias del cuerpo|Reemplazan la sangre|Son antibióticos", "Generan memoria inmunológica."],
  [CH, "A", "Salud", "Los antibióticos son eficaces contra:", "Bacterias", "Virus|Hongos únicamente|Todas las enfermedades", "No sirven contra virus como la gripe."],
  [CH, "A", "Salud", "El dengue en la Costa y Amazonía ecuatoriana se transmite por:", "El mosquito Aedes aegypti", "El agua contaminada|El aire|La mordedura de perro", "Eliminar agua estancada previene su reproducción."],
  [CH, "A", "Pubertad", "La etapa en la que aparecen los caracteres sexuales secundarios se llama:", "Pubertad", "Infancia|Senectud|Lactancia", "Ocurre por la acción de hormonas sexuales."],
  [ME, "B", "La materia", "¿Cuál de estas es una propiedad general de la materia?", "La masa", "El color|El sabor|La dureza", "Todas las sustancias tienen masa y volumen."],
  [ME, "B", "La materia", "El paso de sólido a líquido se llama:", "Fusión", "Solidificación|Evaporación|Sublimación", "Ej.: el hielo se derrite."],
  [ME, "B", "La materia", "El paso de gas a líquido se llama:", "Condensación", "Fusión|Vaporización|Sublimación", "Ej.: gotas en un vaso frío."],
  [ME, "I", "La materia", "El paso directo de sólido a gas se llama:", "Sublimación", "Fusión|Condensación|Solidificación", "Ej.: el hielo seco (CO₂ sólido)."],
  [ME, "B", "La materia", "¿A qué temperatura hierve el agua al nivel del mar?", "100 °C", "0 °C|50 °C|212 °C", "En Quito hierve a unos 90 °C por la menor presión."],
  [ME, "I", "La materia", "El agua salada es un ejemplo de:", "Mezcla homogénea", "Sustancia pura|Mezcla heterogénea|Elemento", "La sal se disuelve uniformemente."],
  [ME, "I", "La materia", "Para separar arena del agua se usa:", "Filtración", "Destilación|Imantación|Evaporación de la arena", "El filtro retiene el sólido."],
  [ME, "I", "La materia", "Para separar limaduras de hierro de la arena se usa:", "Imantación", "Filtración|Decantación|Tamizado de agua", "El imán atrae al hierro."],
  [ME, "A", "La materia", "Las partículas con carga negativa del átomo son los:", "Electrones", "Protones|Neutrones|Núcleos", "Giran alrededor del núcleo."],
  [ME, "A", "La materia", "El número atómico indica:", "El número de protones", "El número de neutrones|La masa total|El número de moléculas", "Identifica a cada elemento."],
  [ME, "A", "La materia", "La fórmula química del agua es:", "H₂O", "CO₂|O₂|NaCl", "Dos átomos de hidrógeno y uno de oxígeno."],
  [ME, "A", "La materia", "La sal de mesa es el compuesto:", "NaCl", "H₂O|CaCO₃|KOH", "Cloruro de sodio."],
  [ME, "B", "Energía", "La energía que posee un cuerpo en movimiento es:", "Energía cinética", "Energía potencial|Energía química|Energía nuclear", "Depende de la masa y la velocidad."],
  [ME, "B", "Energía", "Una central hidroeléctrica como Coca Codo Sinclair transforma la energía:", "Potencial del agua en eléctrica", "Solar en química|Eólica en térmica|Nuclear en eléctrica", "El agua que cae mueve turbinas."],
  [ME, "I", "Energía", "¿Cuál es una fuente de energía renovable?", "Solar", "Petróleo|Carbón|Gas natural", "Se regenera de forma natural."],
  [ME, "I", "Energía", "La unidad de energía en el Sistema Internacional es el:", "Julio (J)", "Newton (N)|Vatio (W)|Pascal (Pa)", "1 J = 1 N·m."],
  [ME, "I", "Fuerzas", "La unidad de fuerza en el Sistema Internacional es el:", "Newton (N)", "Julio (J)|Kilogramo (kg)|Metro (m)", "1 N = 1 kg·m/s²."],
  [ME, "A", "Fuerzas", "Según la tercera ley de Newton, toda acción tiene:", "Una reacción de igual magnitud y sentido contrario", "Una reacción mayor|Ninguna reacción|Una reacción en el mismo sentido", "Ej.: al remar, el agua empuja el bote."],
  [ME, "A", "Fuerzas", "La tendencia de un cuerpo a mantener su estado de reposo o movimiento se llama:", "Inercia", "Gravedad|Fricción|Presión", "Primera ley de Newton."],
  [ME, "I", "Ondas", "El sonido NO se propaga en:", "El vacío", "El agua|El aire|Los sólidos", "Necesita un medio material."],
  [ME, "A", "Ondas", "La luz viaja en el vacío a aproximadamente:", "300 000 km/s", "340 m/s|30 km/s|3 000 km/h", "Es la velocidad máxima del universo."],
  [ME, "I", "Electricidad", "Un material que permite el paso de la corriente eléctrica es un:", "Conductor", "Aislante|Dieléctrico|Semiconductor perfecto", "Ej.: el cobre."],
  [TU, "B", "La Tierra", "¿Cuál es la capa más externa de la Tierra?", "La corteza", "El manto|El núcleo externo|El núcleo interno", "Es la capa sólida donde vivimos."],
  [TU, "B", "La Tierra", "El movimiento de la Tierra sobre su eje que produce el día y la noche es la:", "Rotación", "Traslación|Precesión|Nutación", "Dura unas 24 horas."],
  [TU, "B", "La Tierra", "El movimiento de la Tierra alrededor del Sol dura aproximadamente:", "365 días", "24 horas|30 días|100 días", "Es la traslación; produce las estaciones."],
  [TU, "I", "La Tierra", "¿Por qué en el Ecuador no hay cuatro estaciones marcadas?", "Porque está en la línea equinoccial y recibe luz solar casi perpendicular todo el año", "Porque no gira|Porque está lejos del Sol|Porque tiene volcanes", "Por eso hay estación lluviosa y seca."],
  [TU, "I", "La Tierra", "El volcán activo más alto del Ecuador es el:", "Cotopaxi", "Pichincha|Tungurahua|Sangay", "Mide unos 5 897 m (el Chimborazo es más alto pero inactivo)."],
  [TU, "I", "La Tierra", "El punto más alejado del centro de la Tierra es la cumbre del:", "Chimborazo", "Everest|Cotopaxi|Aconcagua", "Por el abultamiento ecuatorial."],
  [TU, "A", "La Tierra", "Los sismos en Ecuador se producen principalmente por la subducción de la placa:", "De Nazca bajo la Sudamericana", "Africana bajo la Euroasiática|Pacífica bajo la Australiana|Del Caribe bajo la Norteamericana", "Por eso el país es altamente sísmico."],
  [TU, "A", "La Tierra", "La capa de la atmósfera donde ocurren los fenómenos del clima es la:", "Troposfera", "Estratosfera|Mesosfera|Termosfera", "Es la más cercana a la superficie."],
  [TU, "A", "La Tierra", "La capa de ozono, que filtra los rayos ultravioleta, está en la:", "Estratosfera", "Troposfera|Exosfera|Litosfera", "Protege a los seres vivos."],
  [TU, "I", "El agua", "El ciclo del agua es impulsado principalmente por:", "La energía del Sol", "La energía nuclear|El viento únicamente|La rotación lunar", "El Sol evapora el agua."],
  [TU, "I", "Clima", "El fenómeno de calentamiento del Pacífico que causa lluvias intensas en la Costa es:", "El Niño", "La Niña|El monzón|El huracán", "Se produce cada pocos años."],
  [TU, "A", "Clima", "El principal gas responsable del efecto invernadero por actividad humana es:", "Dióxido de carbono", "Oxígeno|Nitrógeno|Argón", "Proviene de quemar combustibles fósiles."],
  [TU, "B", "Universo", "¿Cuál es la estrella más cercana a la Tierra?", "El Sol", "Sirio|Alfa Centauri|La Estrella Polar", "Está a unos 150 millones de km."],
  [TU, "B", "Universo", "¿Cuál es el único satélite natural de la Tierra?", "La Luna", "Fobos|Titán|Europa", "Sus fases duran unos 29,5 días."],
  [TU, "I", "Universo", "Nuestra galaxia se llama:", "Vía Láctea", "Andrómeda|Magallanes|Sombrero", "Es una galaxia espiral."],
  [TU, "I", "Universo", "Un eclipse solar ocurre cuando:", "La Luna se interpone entre el Sol y la Tierra", "La Tierra se interpone entre el Sol y la Luna|El Sol se apaga|Marte tapa el Sol", "La sombra lunar cae sobre la Tierra."],
  [TU, "A", "Universo", "La teoría más aceptada sobre el origen del universo es:", "El Big Bang", "La deriva continental|La generación espontánea|El geocentrismo", "Hace unos 13 800 millones de años."],
  [TU, "A", "Universo", "El modelo que coloca al Sol en el centro del sistema solar es el:", "Heliocéntrico", "Geocéntrico|Lunar|Estacionario", "Propuesto por Copérnico."],
];

const ELEMENTOS: [string, string][] = [["Hidrógeno", "H"], ["Helio", "He"], ["Carbono", "C"], ["Nitrógeno", "N"], ["Oxígeno", "O"], ["Sodio", "Na"], ["Magnesio", "Mg"], ["Aluminio", "Al"], ["Silicio", "Si"], ["Fósforo", "P"], ["Azufre", "S"], ["Cloro", "Cl"], ["Potasio", "K"], ["Calcio", "Ca"], ["Hierro", "Fe"], ["Cobre", "Cu"], ["Zinc", "Zn"], ["Plata", "Ag"], ["Oro", "Au"], ["Mercurio", "Hg"], ["Plomo", "Pb"], ["Estaño", "Sn"], ["Yodo", "I"], ["Flúor", "F"], ["Neón", "Ne"], ["Argón", "Ar"], ["Uranio", "U"], ["Platino", "Pt"], ["Níquel", "Ni"], ["Litio", "Li"]];

const ANIMALES: [string, string][] = [["Cóndor andino", "Ave"], ["Piquero de patas azules", "Ave"], ["Colibrí", "Ave"], ["Pingüino de Galápagos", "Ave"], ["Lobo marino", "Mamífero"], ["Delfín rosado", "Mamífero"], ["Murciélago", "Mamífero"], ["Oso de anteojos", "Mamífero"], ["Ballena jorobada", "Mamífero"], ["Danta", "Mamífero"], ["Tortuga gigante", "Reptil"], ["Iguana marina", "Reptil"], ["Caimán negro", "Reptil"], ["Anaconda", "Reptil"], ["Rana dardo venenosa", "Anfibio"], ["Salamandra", "Anfibio"], ["Sapo", "Anfibio"], ["Cecilia", "Anfibio"], ["Tiburón martillo", "Pez"], ["Piraña", "Pez"], ["Trucha", "Pez"], ["Caballito de mar", "Pez"], ["Mariposa morpho", "Insecto"], ["Abeja", "Insecto"], ["Hormiga", "Insecto"], ["Escarabajo", "Insecto"], ["Tarántula", "Arácnido"], ["Escorpión", "Arácnido"], ["Cangrejo rojo", "Crustáceo"], ["Camarón", "Crustáceo"], ["Pulpo", "Molusco"], ["Caracol", "Molusco"], ["Estrella de mar", "Equinodermo"], ["Erizo de mar", "Equinodermo"], ["Medusa", "Cnidario"], ["Lombriz de tierra", "Anélido"]];
const CLASES = ["Ave", "Mamífero", "Reptil", "Anfibio", "Pez", "Insecto", "Arácnido", "Crustáceo", "Molusco", "Equinodermo", "Cnidario", "Anélido"];
const VERTEBRADOS = ["Ave", "Mamífero", "Reptil", "Anfibio", "Pez"];

const ORGANOS: [string, string][] = [["Corazón", "Circulatorio"], ["Arterias", "Circulatorio"], ["Venas", "Circulatorio"], ["Pulmones", "Respiratorio"], ["Tráquea", "Respiratorio"], ["Bronquios", "Respiratorio"], ["Diafragma", "Respiratorio"], ["Estómago", "Digestivo"], ["Hígado", "Digestivo"], ["Esófago", "Digestivo"], ["Intestino delgado", "Digestivo"], ["Páncreas", "Digestivo"], ["Riñones", "Excretor"], ["Vejiga", "Excretor"], ["Uréteres", "Excretor"], ["Cerebro", "Nervioso"], ["Médula espinal", "Nervioso"], ["Cerebelo", "Nervioso"], ["Fémur", "Óseo"], ["Cráneo", "Óseo"], ["Columna vertebral", "Óseo"], ["Bíceps", "Muscular"], ["Cuádriceps", "Muscular"], ["Tiroides", "Endocrino"], ["Hipófisis", "Endocrino"], ["Glándulas suprarrenales", "Endocrino"], ["Ganglios linfáticos", "Inmunológico"], ["Bazo", "Inmunológico"], ["Ovarios", "Reproductor"], ["Testículos", "Reproductor"]];
const SISTEMAS = ["Circulatorio", "Respiratorio", "Digestivo", "Excretor", "Nervioso", "Óseo", "Muscular", "Endocrino", "Inmunológico", "Reproductor"];

const PLANETAS = ["Mercurio", "Venus", "Tierra", "Marte", "Júpiter", "Saturno", "Urano", "Neptuno"];
const SUSTANCIAS: [string, string][] = [["Agua a 25 °C", "Líquido"], ["Hierro a 25 °C", "Sólido"], ["Oxígeno a 25 °C", "Gas"], ["Mercurio a 25 °C", "Líquido"], ["Sal de mesa a 25 °C", "Sólido"], ["Dióxido de carbono a 25 °C", "Gas"], ["Hielo a −5 °C", "Sólido"], ["Vapor de agua a 110 °C", "Gas"], ["Aceite de cocina a 25 °C", "Líquido"], ["Helio a 25 °C", "Gas"], ["Oro a 25 °C", "Sólido"], ["Alcohol a 25 °C", "Líquido"], ["Nitrógeno a 25 °C", "Gas"], ["Azúcar a 25 °C", "Sólido"], ["Leche a 25 °C", "Líquido"]];
const MATERIALES = ["Densidad", "Velocidad", "Peso", "Fuerza", "Temperatura"];

export function generarCienciasNaturales(): Pregunta[] {
  const r = rng(20261003);
  const out: Pregunta[] = [];
  let n = 0;
  const id = () => `cn-${++n}`;
  const b = (tema: string, subtema: string, nivel: string, enunciado: string, explicacion: string): Base => ({ id: id(), area: AREA_CN, tema, subtema, nivel: NIV[nivel]!, enunciado, explicacion });

  for (const [t, nv, st, q, c, d, e] of HECHOS) out.push(crear(r, b(t, st, nv, q, e), c, d.split("|")));

  for (const [nom, sim] of ELEMENTOS) {
    const otros = ELEMENTOS.filter((x) => x[1] !== sim);
    out.push(crear(r, b(ME, "Tabla periódica", "B", `¿Cuál es el símbolo químico del ${nom.toLowerCase()}?`, `El símbolo del ${nom.toLowerCase()} es ${sim}.`), sim, [elegir(r, otros)[1], elegir(r, otros)[1], elegir(r, otros)[1], nom.slice(0, 2), elegir(r, otros)[1]]));
    out.push(crear(r, b(ME, "Tabla periódica", "I", `¿Qué elemento químico representa el símbolo «${sim}»?`, `${sim} corresponde al ${nom.toLowerCase()}.`), nom, [elegir(r, otros)[0], elegir(r, otros)[0], elegir(r, otros)[0], elegir(r, otros)[0]]));
  }
  for (const [a, c] of ANIMALES) {
    out.push(crear(r, b(SV, "Clasificación animal", "B", `¿A qué grupo pertenece el/la ${a.toLowerCase()}?`, `El/la ${a.toLowerCase()} es ${c.toLowerCase()}.`), c, CLASES.filter((x) => x !== c).sort(() => r() - 0.5)));
  }
  for (const [o, s] of ORGANOS) {
    out.push(crear(r, b(CH, "Órganos y sistemas", "B", `¿A qué sistema del cuerpo humano pertenece: ${o.toLowerCase()}?`, `${o} forma parte del sistema ${s.toLowerCase()}.`), s, SISTEMAS.filter((x) => x !== s).sort(() => r() - 0.5)));
  }
  PLANETAS.forEach((p, i) => {
    out.push(crear(r, b(TU, "Sistema solar", "I", `¿Qué posición ocupa ${p} contando desde el Sol?`, `El orden es: ${PLANETAS.join(", ")}. ${p} es el ${i + 1}.º.`), `${i + 1}.º`, [1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== i + 1).sort(() => r() - 0.5).map((x) => `${x}.º`)));
    if (i < 7) out.push(crear(r, b(TU, "Sistema solar", "A", `¿Qué planeta está inmediatamente después de ${p} en orden de distancia al Sol?`, `Después de ${p} viene ${PLANETAS[i + 1]}.`), PLANETAS[i + 1]!, PLANETAS.filter((x) => x !== PLANETAS[i + 1] && x !== p).sort(() => r() - 0.5)));
  });
  for (const [s, e] of SUSTANCIAS) out.push(crear(r, b(ME, "Estados de la materia", "B", `¿En qué estado se encuentra: ${s}?`, `${s} está en estado ${e.toLowerCase()}.`), e, ["Sólido", "Líquido", "Gas", "Plasma"]));
  for (const [a, c] of ANIMALES.slice(0, 30)) {
    const v = VERTEBRADOS.includes(c) ? "Vertebrado" : "Invertebrado";
    out.push(crear(r, b(SV, "Vertebrados e invertebrados", "B", `El/la ${a.toLowerCase()} es un animal:`, `${a}: ${c.toLowerCase()}, por tanto ${v.toLowerCase()} (${v === "Vertebrado" ? "tiene" : "no tiene"} columna vertebral).`), v, v === "Vertebrado" ? ["Invertebrado", "Vegetal", "Hongo"] : ["Vertebrado", "Vegetal", "Hongo"]));
  }

  // Problemas paramétricos hasta completar 500
  let k = 0;
  while (out.length < 500) {
    const tipo = MATERIALES[k++ % MATERIALES.length];
    if (tipo === "Densidad") {
      const v = entero(r, 2, 20), d = entero(r, 2, 12) / 2, m = d * v;
      out.push(crear(r, b(ME, "Densidad", "I", `Un objeto tiene una masa de ${fmt(m)} g y un volumen de ${v} cm³. ¿Cuál es su densidad? (d = m / V)`, `d = ${fmt(m)} ÷ ${v} = ${fmt(d)} g/cm³.`), `${fmt(d)} g/cm³`, [`${fmt(m * v)} g/cm³`, `${fmt(d * 2)} g/cm³`, `${fmt(d + 1)} g/cm³`, `${fmt(v / m)} g/cm³`]));
    } else if (tipo === "Velocidad") {
      const t = entero(r, 2, 10), v = entero(r, 3, 30) * 2, d = v * t;
      out.push(crear(r, b(ME, "Movimiento", "I", `Un bus recorre ${d} km en ${t} horas a velocidad constante. ¿Cuál es su velocidad? (v = d / t)`, `v = ${d} ÷ ${t} = ${v} km/h.`), `${v} km/h`, [`${d * t} km/h`, `${v + t} km/h`, `${v * 2} km/h`, `${v - 2} km/h`]));
    } else if (tipo === "Peso") {
      const m = entero(r, 3, 90);
      out.push(crear(r, b(ME, "Fuerzas", "I", `¿Cuál es el peso de una persona u objeto de ${m} kg en la Tierra? (P = m · g, con g = 9,8 m/s²)`, `P = ${m} × 9,8 = ${fmt(m * 9.8, 1)} N.`), `${fmt(m * 9.8, 1)} N`, [`${m} N`, `${fmt(m / 9.8, 1)} N`, `${fmt(m * 9.8 * 2, 1)} N`, `${fmt(m + 9.8, 1)} N`]));
    } else if (tipo === "Fuerza") {
      const m = entero(r, 2, 40), a = entero(r, 1, 8);
      out.push(crear(r, b(ME, "Fuerzas", "A", `¿Qué fuerza se necesita para que un cuerpo de ${m} kg acelere a ${a} m/s²? (F = m · a)`, `F = ${m} × ${a} = ${m * a} N (segunda ley de Newton).`), `${m * a} N`, [`${m + a} N`, `${fmt(m / a)} N`, `${m * a * 2} N`, `${Math.abs(m - a)} N`]));
    } else {
      const c = entero(r, -20, 120);
      out.push(crear(r, b(ME, "Temperatura", "A", `Convierte ${c} °C a kelvin. (K = °C + 273)`, `K = ${c} + 273 = ${c + 273} K.`), `${c + 273} K`, [`${c - 273} K`, `${c + 373} K`, `${c + 237} K`, `${273 - c} K`]));
    }
  }
  return out.slice(0, 500);
}
