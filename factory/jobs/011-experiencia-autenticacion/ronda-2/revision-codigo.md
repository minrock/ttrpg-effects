VEREDICTO: APROBADO

# Revisión independiente de código — 011, ciclo 1, ronda 2

Fecha: 2026-10-31. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; base efectiva main `73b8e6de21af74912d23399f1b99f3c1112ade91`, rama acumulativa `feature/factory-006-persistencia-multidb`. Sin escrituras Git ni consulta de informes de otros revisores.

## Alcance y congelación

Leídos perfil de código/AGENTS, manifiesto, solicitud/spec, build/coordinación, identidad de ronda y mi informe de ronda 1. Se contrastaron las fuentes reales de las **15 rutas cambiadas desde ronda 1**, además de sus consumidores y contratos. El alcance anterior de 62 archivos se conserva y la entrega completa tiene 67 archivos frente a la base.

Verificación propia: **653/653 huellas coinciden**, sin discrepancias. La huella agregada de las 67 rutas del trabajo es `e7cef9ff591b7a47e5c8bee08bfe5244ca73f7c232ab26cbf77c8b4b6676e5f6`, coincidente con build.md. Se mantiene versión **3.13.0**, sin nuevas dependencias, migraciones ni cambio de formato `.ttrpgscene` v2/lectura v1. TypeScript conserva strict. Los cálculos de coordenadas y mediciones y el transporte Electron local no cambian en esta corrección.

## Cierre de los hallazgos propios de ronda 1

- **C1 — pérdida de borrador al abrir invitación: cerrado.** `ServiceApp.tsx` dirige la transición a `move` y `allowLeave`; si existe una cuenta retenida sin sesión activa, solicita cancelar/recuperar o descartar explícitamente. La invitación se captura en memoria en el callback de confirmación, antes del montaje invitado; el fragmento no entra al historial. `AccountAccess.tsx` valida origen, UUID canónico y fragmento antes de iniciar la transición. La regresión comprueba identidad del nodo y contenido al cancelar, rechazo de URL ajena, descarte deliberado y navegación posterior.
- **C2 — ciclo Atrás/Adelante: cerrado.** `use-service-navigation.ts` separa navegación nueva de desplazamiento del historial. La aceptación de popstate utiliza las entradas existentes; cancelar restaura la posición conservada. Hay exclusión durante una decisión pendiente y tratamiento de otra pulsación Atrás. Las pruebas ejecutadas verifican rutas, longitud del historial, conservación del nodo y continuidad con Adelante, incluida doble pulsación durante el guard.
- **C3 — 401 administrativo sin guard: cerrado.** `http.ts` reemplaza la excepción por prefijo por un conjunto concreto de rutas de acceso/sesión/salida. Lecturas y mutaciones administrativas invalidan el transporte y notifican expiración; `/identity/session` también lo hace cuando hay principal ligado. La regresión usa `AdminAccounts` real: el 401 desmonta datos/campo de contraseña temporal y muestra recuperación. El transporte bloquea nuevas operaciones administrativas, mientras un login incorrecto sigue siendo recuperable.

## Cambios adicionales revisados

La vinculación de cuenta se transmite mediante `X-TTRPG-Account` desde la raíz, los recursos y la mesa DM. `bindAccount` cambia generación y aborta operaciones anteriores; respuestas tardías no repueblan el estado. En servidor, `openModerationBackend` mantiene el valor esperado en AsyncLocalStorage **por instancia y petición**; `principal()` lo compara con la cuenta autenticada dentro de la autorización transaccional. La cabecera no otorga autoridad ni sustituye la cookie. Los clientes sin cabecera conservan el contrato previo.

Los contratos focales usan el adaptador de recursos real: validan A, cambian a cookie B justo antes del POST y verifican rechazo, callback de expiración y ausencia de datos en B; después restauran A y guardan el borrador solo en A. También ejercitan listado, administración y apertura/mesa. Las señales BroadcastChannel y foco/visibilidad aceleran la ocultación, sin ser la única defensa de la escritura. La suscripción y listeners se limpian al desmontar.

La revalidación distingue conflicto confirmado (`REVISION_CONFLICT`/409) de fallo temporal. Los errores 503/429 permiten reintentar sin recargar ni desmontar el borrador; Retry-After deshabilita el reintento temprano. Los contactos periódicos y la mesa empiezan después de completar la revalidación, con limpieza de temporizador/transporte al suspender. Las pruebas conservan el mismo nodo y su contenido durante ambos errores y la recuperación.

Se inspeccionaron los cambios CSS de scroll del acceso y envoltura de títulos/cuenta, así como la documentación del contrato de principal. No cambian reglas de dominio ni amplían autoridad. La validación visual al 200% y en Electron corresponde a evidencia CUA separada, no se deduce del CSS ni de jsdom.

## Verificaciones propias

1. `pnpm exec vitest run src/web/ServiceApp.test.tsx src/web/GameEditor.test.tsx src/infrastructure/browser/owned-client.test.ts --maxWorkers=2`: **3 archivos, 21 pruebas PASS**, 1.75 s. Incluye los cierres C1–C3, cambio de cuenta, historial con decisión pendiente y revalidación temporal.
2. `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/service-final.contract.ts -t 'principal esperado'`: **2/2 casos seleccionados PASS**, SQLite y PostgreSQL reales, 9.94 s. Los otros seis casos del archivo no se seleccionaron por el filtro; no se omitió ningún motor ni se atribuye a esta ejecución el gate completo.
3. Huellas completas y agregado de archivos comprobados nuevamente tras las pruebas, sin cambios de producto.

## Evidencia declarada y límites

Build.md registra typecheck/lint, 133 archivos/1226 pruebas generales, los tres builds y 8/8 contratos finales. Es evidencia del constructor, revisada y atribuida; esta revisión no los repitió íntegramente. Coordinación registra CUA del orquestador para cuenta entre pestañas, borrador/invitación e historial. No realicé CUA ni certifico por jsdom apariencia, teclado nativo o proyección física. No se consultaron conclusiones de los otros revisores.

**No quedan hallazgos de código que requieran cambios en el alcance revisado.** La aprobación corresponde al código congelado de esta ronda; no equivale a integración, despliegue personal o DMG, ni sustituye las demás revisiones y la decisión técnica.

PostgreSQL se utilizó solo para la selección focal autorizada; el proceso terminó correctamente y sus fixtures/pools se cerraron. Queda **liberado**. No se tocó QA8891, servicio8787, provisión personal, producto, Git, tablero ni informes ajenos. Única publicación: este informe mediante temporal y renombrado atómico.
