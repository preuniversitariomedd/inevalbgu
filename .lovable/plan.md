# Competencia en vivo (estilo Quizizz)

## Qué verá cada persona

**Administrador / Docente**
- Nueva sección "Competencias": crear una competencia, elegir grupo(s), elegir preguntas (del banco de Matemática/Física o preguntas propias) y la duración total.
- Editor de preguntas propio: enunciado, imagen, 5 opciones, marcar la correcta (100%) y una "casi correcta" por falta leve (25%), dificultad y tiempo por pregunta (Básico 30 s, Intermedio 45 s, Avanzado 60 s, editable).
- Sala de espera con código de 6 dígitos y lista de estudiantes que entran.
- Pantalla de control en vivo: pregunta actual, ranking en tiempo real, quién respondió, botones Iniciar / Pausar / Siguiente / Terminar.
- 10 potenciadores globales (1 uso cada uno):
  1. Tiempo extra +10 s para todos
  2. Tiempo reducido −5 s para todos
  3. Doble puntos en esta pregunta
  4. Eliminar 2 opciones incorrectas a todos
  5. Pista visible (explicación corta) para todos
  6. Pregunta sorpresa (triple puntos, menos tiempo)
  7. Congelar ranking (se oculta hasta el final)
  8. Escudo general (anula virus activos)
  9. Ronda relámpago (siguientes 3 preguntas con mitad de tiempo)
  10. Sin puntos por velocidad (solo cuenta acertar)
- Panel antitrampa en vivo con alertas por estudiante: cambio de pestaña/ventana, pérdida de foco, copiar/pegar/cortar (teclado o ratón), clic derecho, tecla Impr Pant y atajos de captura (Win+Shift+S, Cmd+Shift+3/4), salir de pantalla completa, y segunda pestaña abierta de la misma competencia. Historial exportable.
- Al final: podio, resultados por pregunta (qué opción eligió cada uno) y reporte de trampas.

**Estudiante**
- Entra con el código o desde un aviso. Antes de empezar ve las reglas en letra grande y clara y debe marcar "Acepto".
- Siempre visibles: tiempo total restante de la actividad y tiempo de la pregunta actual.
- Preguntas animadas con opciones grandes de colores, imagen si la hay, sonido/efecto al acertar o fallar, y explicación breve tras cada pregunta (lado pedagógico).
- Puntaje: base 1000 × (100% correcta / 25% falta leve / 0%) + bonus por rapidez, multiplicado por la racha.
- Racha: al llegar a 3 aciertos seguidos ×1.2, luego ×1.4, ×1.6, ×1.8, ×2.0, ×2.2… (se reinicia al fallar).
- 5 potenciadores (1 uso cada uno):
  1. Congelar tiempo (el reloj de la pregunta se detiene 10 s)
  2. Virus: a un rival elegido, sus opciones se barajan y se ven borrosas durante 2–3 preguntas
  3. 50/50: elimina 2 opciones incorrectas
  4. Escudo: protege de virus y conserva la racha si falla una vez
  5. Doble o nada: dobla el puntaje de la siguiente pregunta, pero si falla pierde lo ganado en ella
- Ranking animado entre preguntas.

## Prueba final
Simularé una competencia con todos los estudiantes inscritos conectados a la vez (sesiones automáticas), verificando uniones, respuestas simultáneas, potenciadores, virus, ranking y alertas antitrampa, y revisaré en celular y computadora.

## Límites a tener en cuenta
- Un navegador no puede detectar capturas con total precisión (p. ej. la foto con otro celular o la herramienta de recortes abierta sin atajo). Se detectan las teclas y atajos conocidos y la pérdida de foco que suele acompañarlas; se reportarán como "posible captura".
- "Dos ventanas abiertas" se detecta como: otra pestaña de la app abierta a la vez, o salir de la ventana de la competencia.

## Detalles técnicos
- Tablas nuevas: competencias, competencia_preguntas (propias con imagen, 5 opciones, correcta, casi_correcta, nivel, tiempo), competencia_participantes (puntaje, racha, potenciadores usados, aceptó reglas), competencia_respuestas, competencia_eventos (potenciadores y virus), competencia_alertas (antitrampa). RLS: staff gestiona; estudiante solo ve/escribe lo suyo en competencias de su grupo.
- Tiempo real con suscripciones sobre competencias/participantes/eventos/alertas; el estado (pregunta actual, inicio de pregunta, pausas) vive en la fila de la competencia, y el reloj se calcula desde la hora del servidor para que todos vean lo mismo.
- Cálculo del puntaje y validación de potenciadores en funciones del servidor (no en el navegador) para evitar trampas.
- Detección de segunda pestaña con BroadcastChannel + registro de visibilidad/blur/copy/paste/cut/contextmenu/keydown.
- Imágenes en el almacenamiento existente de Física o un espacio nuevo "competencias".
- Rutas: /competencias (estudiante), /admin/competencias (lista, editor, control en vivo); botón en el encabezado junto a Tareas.
