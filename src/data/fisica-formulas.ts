// Glosario de fórmulas de Física para 1ro BGU.

export interface Formula {
  nombre: string;
  expresion: string;
  variables: string;
  cuando: string;
}

export interface GrupoFormulas {
  tema: string;
  formulas: Formula[];
}

export const GLOSARIO_FORMULAS: GrupoFormulas[] = [
  {
    tema: "Cinemática",
    formulas: [
      { nombre: "Velocidad media", expresion: "v = Δx / Δt", variables: "Δx: desplazamiento (m) · Δt: tiempo (s)", cuando: "Para cualquier movimiento, mide el cambio de posición por unidad de tiempo." },
      { nombre: "Rapidez media", expresion: "v = d / t", variables: "d: distancia recorrida (m)", cuando: "Cuando importa el camino recorrido, no la dirección." },
      { nombre: "MRU (posición)", expresion: "x = x₀ + v·t", variables: "x₀: posición inicial (m) · v: velocidad constante (m/s)", cuando: "Movimiento rectilíneo con velocidad constante." },
      { nombre: "Aceleración media", expresion: "a = (v − v₀) / t", variables: "v: velocidad final · v₀: velocidad inicial (m/s)", cuando: "Cuando la velocidad cambia con el tiempo." },
      { nombre: "MRUV (velocidad)", expresion: "v = v₀ + a·t", variables: "a: aceleración (m/s²)", cuando: "Aceleración constante y se busca la velocidad final." },
      { nombre: "MRUV (posición)", expresion: "x = x₀ + v₀·t + ½a·t²", variables: "t: tiempo (s)", cuando: "Aceleración constante y se busca la distancia o posición." },
      { nombre: "Ecuación sin tiempo", expresion: "v² = v₀² + 2a·Δx", variables: "Δx: desplazamiento (m)", cuando: "No conoces ni necesitas el tiempo." },
      { nombre: "Caída libre", expresion: "h = ½g·t²   ·   v = g·t", variables: "g ≈ 9,8 m/s² (10 en ejercicios)", cuando: "Cuerpo que se suelta desde el reposo, sin resistencia del aire." },
      { nombre: "Tiro horizontal", expresion: "x = v·t   ·   y = ½g·t²", variables: "v: velocidad horizontal (m/s)", cuando: "Lanzamiento horizontal: movimientos independientes en x e y." },
      { nombre: "Tiro parabólico (alcance)", expresion: "R = v₀²·sen(2θ) / g", variables: "θ: ángulo de lanzamiento", cuando: "Lanzamiento inclinado desde el suelo." },
      { nombre: "Movimiento circular", expresion: "v = 2πr / T   ·   a_c = v² / r", variables: "T: periodo (s) · r: radio (m)", cuando: "Movimiento circular uniforme." },
    ],
  },
  {
    tema: "Dinámica",
    formulas: [
      { nombre: "Segunda ley de Newton", expresion: "ΣF = m·a", variables: "F: fuerza (N) · m: masa (kg) · a: aceleración (m/s²)", cuando: "Siempre que la fuerza neta no sea cero." },
      { nombre: "Peso", expresion: "P = m·g", variables: "g = 9,8 m/s²", cuando: "Fuerza con que la Tierra atrae a un cuerpo." },
      { nombre: "Fuerza normal (plano horizontal)", expresion: "N = m·g", variables: "N: normal (N)", cuando: "Superficie horizontal sin fuerzas verticales extra." },
      { nombre: "Normal en plano inclinado", expresion: "N = m·g·cosθ", variables: "θ: ángulo de inclinación", cuando: "Cuerpo apoyado sobre un plano inclinado." },
      { nombre: "Fuerza de rozamiento", expresion: "fᵣ = μ·N", variables: "μ: coeficiente de rozamiento (sin unidad)", cuando: "Hay contacto y deslizamiento (o tendencia a deslizar)." },
      { nombre: "Aceleración en plano inclinado liso", expresion: "a = g·senθ", variables: "θ: ángulo", cuando: "Sin rozamiento sobre plano inclinado." },
      { nombre: "Plano inclinado con rozamiento", expresion: "a = g(senθ − μ·cosθ)", variables: "μ: coeficiente cinético", cuando: "Bloque que baja con fricción." },
      { nombre: "Ley de Hooke", expresion: "F = k·x", variables: "k: constante del resorte (N/m) · x: deformación (m)", cuando: "Resortes dentro del límite elástico." },
      { nombre: "Tercera ley de Newton", expresion: "F₁₂ = −F₂₁", variables: "Fuerzas sobre cuerpos distintos", cuando: "Toda acción provoca una reacción igual y opuesta." },
      { nombre: "Cantidad de movimiento", expresion: "p = m·v", variables: "p: momento lineal (kg·m/s)", cuando: "Choques y sistemas aislados (se conserva)." },
    ],
  },
  {
    tema: "Energía",
    formulas: [
      { nombre: "Trabajo", expresion: "W = F·d·cosθ", variables: "W en joules (J) · θ: ángulo entre F y d", cuando: "Una fuerza desplaza un cuerpo." },
      { nombre: "Energía cinética", expresion: "Ec = ½m·v²", variables: "m: masa (kg) · v: rapidez (m/s)", cuando: "Energía asociada al movimiento." },
      { nombre: "Energía potencial gravitatoria", expresion: "Ep = m·g·h", variables: "h: altura (m)", cuando: "Cuerpo elevado respecto a un nivel de referencia." },
      { nombre: "Energía potencial elástica", expresion: "Epe = ½k·x²", variables: "k: constante elástica (N/m)", cuando: "Resorte comprimido o estirado." },
      { nombre: "Energía mecánica", expresion: "Em = Ec + Ep", variables: "Em en joules (J)", cuando: "Suma de energías en un punto del movimiento." },
      { nombre: "Conservación de la energía", expresion: "Ec₁ + Ep₁ = Ec₂ + Ep₂", variables: "Sin fricción", cuando: "Sistemas sin fuerzas disipativas." },
      { nombre: "Rapidez al caer (energía)", expresion: "v = √(2g·h)", variables: "h: altura de caída (m)", cuando: "Caída libre desde el reposo." },
      { nombre: "Teorema trabajo–energía", expresion: "W_neto = ΔEc", variables: "ΔEc: cambio de energía cinética", cuando: "El trabajo total cambia la rapidez del cuerpo." },
      { nombre: "Potencia", expresion: "P = W / t = F·v", variables: "P en watts (W)", cuando: "Rapidez con la que se realiza trabajo." },
      { nombre: "Rendimiento", expresion: "η = (E_útil / E_total) × 100 %", variables: "η: eficiencia (%)", cuando: "Máquinas con pérdidas por calor o fricción." },
    ],
  },
];
