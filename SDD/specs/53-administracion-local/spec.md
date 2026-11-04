# 53 — Administradores locales y política de contraseñas

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado en `main`; producto en el commit `c4e8831`, cierre y validación en [consolidación](../../consolidacion.md).

## Objetivo

Crear varios administradores mediante terminal local, con errores claros y contraseña elegida o generada explícitamente.

## Contrato y aceptación vigente

1. pnpm createsuperuser carga .env desde la raíz del proyecto, exige TTY y delega en el CLI compilado; no abre HTTP ni admite secretos por argv o pipe.
2. SQLite exige detener API; migración 7 elimina solo el índice de admin único y conserva cuentas, sesiones y checksums anteriores.
3. Cada cuenta tiene correo canónico único; un duplicado no promueve un DM ni modifica una cuenta existente.
4. Contraseña manual de 10–128 caracteres, confirmada y oculta, queda definitiva sin cambio obligatorio.
5. Enter exacto genera 24 bytes aleatorios codificados base64url; muestra la contraseña una sola vez tras crear y exige cambio posterior. Espacios no equivalen a Enter.
6. Errores de correo/nombre/longitud/confirmación identifican el campo y permiten reintentar; cancelar restaura terminal.
7. identity:bootstrap sigue limitado a base vacía; recover-admin recupera una cuenta existente; provisión DM mantiene contraseña temporal.
8. No borrar la DB ni ejecutar aprovisionamiento/reset automáticamente al arrancar. El reset solicitado antes fue una operación puntual, no comportamiento del producto.

## Evolución y límites

Consolida cambios 3.14.0–3.17.0 presentes en el árbol de trabajo. El commit autorizado es `c4e8831`; no atribuirlos a una ronda/decisión de factory.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/identity.md).
- [CHANGELOG](../../../CHANGELOG.md) y fuentes/pruebas indicadas en el plan.
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
