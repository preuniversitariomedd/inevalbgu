
Esta es una fase grande (lo que describes son 5 prompts originales fusionados). Para hacerlo bien y no romper la app, propongo dividir el trabajo en **4 entregas** dentro de esta misma conversación. Confírmame el plan y arranco con la Entrega 1.

## Qué se construirá (visión global)

1. **Backend Lovable Cloud (Supabase)**
   - Tablas: `profiles` (cédula, nombres, institución, fecha_nacimiento, primera_vez, created_at), `user_roles` (enum `app_role`: estudiante/administrador), `sesiones_practica`, `respuestas`, `sesiones_conexion` (heartbeats con tiempo activo/oculto).
   - Función `has_role()` security definer + RLS en todas las tablas.
   - Cuenta admin semilla.

2. **Auth y registro**
   - Login por cédula (mapeada internamente a `{cedula}@prebgumate.app`).
   - Validación de cédula ecuatoriana (módulo 10).
   - Sólo el admin crea estudiantes (server fn con `supabaseAdmin`). Contraseña temporal `123*789*h`.
   - Pantalla forzada "Cambia tu contraseña" cuando `primera_vez = true`.
   - Botón "Reiniciar contraseña" en la lista del admin.

3. **Panel /admin (protegido por rol)**
   - Estudiantes: tabla con cédula, nombres, institución, edad calculada ("17 años, 2 meses, 3 días"), estado, acciones (editar/reiniciar/eliminar).
   - Sub-sección **Conexiones** con pestañas: Por estudiante · Sesiones · Alertas · En vivo.
   - Búsqueda, ordenamientos y filtros de fecha (7/30/90 días + rango).

4. **Monitoreo de actividad (heartbeat + visibilidad)**
   - Cliente envía heartbeat cada ~20 s con: timestamp, `is_visible`, `is_focused`, `last_interaction_at`.
   - Combina Page Visibility + focus/blur + Page Lifecycle (freeze/resume) para clasificar tiempo visible vs oculto.
   - Alertas: idle ≥10 min sin interacción; en segundo plano ≥15 min oculto.
   - En vivo: lista que refresca cada 15 s; contador por sesión sube cada 1 s en cliente; badge total.

5. **Estadísticas por estudiante (alumno y admin)**
   - Recharts: barras correctas/incorrectas por sesión; pie de precisión global.
   - Áreas débiles: sesiones con error >30%, botón "Repasar" → `/practicar/$area`.
   - Cronograma: 2 sesiones recomendadas/día alternando áreas débiles, estados pendiente/en curso/completada + tarjeta de Tips.

6. **Migración localStorage → Supabase**
   - `src/lib/progreso.ts` se reescribe para leer/escribir en `respuestas` y `sesiones_practica` del usuario autenticado.
   - Se mantienen los componentes existentes (PreguntaCard, simulacro, practicar) cambiando sólo la capa de persistencia.

## Entregas propuestas (te aviso al terminar cada una)

- **Entrega 1 — Backend + Auth + migración de progreso**
  Habilitar Lovable Cloud, migraciones (tablas, enum, has_role, RLS, grants), `/auth` (login por cédula), pantalla forzar cambio de contraseña, `_authenticated` gating, reemplazo de `progreso.ts` por server fns Supabase. Crear admin semilla.

- **Entrega 2 — Panel /admin: Estudiantes**
  Layout `/admin` con guardia de rol. Crear estudiante (validación cédula EC), lista con edad dinámica, editar, eliminar, reiniciar contraseña.

- **Entrega 3 — Conexiones (Por estudiante · Sesiones · Alertas · En vivo)**
  Heartbeat client hook con Visibility/focus/freeze. Tablas y server fns de sesiones. 4 pestañas con búsqueda, ordenamiento y filtros de fecha. Auto-refresh.

- **Entrega 4 — Estadísticas + Plan de estudio**
  Recharts (barras + pie), áreas débiles con botón Repasar, cronograma con 2 sesiones/día + Tips. Disponible en `/progreso` (estudiante) y `/admin/estudiantes/$id` (admin).

## Notas técnicas clave

- Stack TanStack Start + Lovable Cloud. Server fns con `requireSupabaseAuth`; operaciones admin (crear/reset/eliminar usuario) cargan `supabaseAdmin` dentro del handler (`await import`).
- Rutas protegidas bajo `src/routes/_authenticated/`; subárbol admin bajo `_authenticated/admin/` con `beforeLoad` que verifica `has_role('administrador')`.
- Cédula EC: validador módulo 10 con coeficientes 2,1,2,1,2,1,2,1,2 sobre los primeros 9 dígitos, comparando con el 10°.
- Heartbeat upsert por `(user_id, session_id)`; "en vivo" = heartbeat en los últimos 60 s.
- Edad calculada en cliente con diferencias reales año/mes/día (no decimales).

¿Procedo con la **Entrega 1**? Si quieres ajustar algo (p. ej. dejar el cronograma para más tarde, o cambiar el dominio interno del correo), dímelo antes de arrancar.
