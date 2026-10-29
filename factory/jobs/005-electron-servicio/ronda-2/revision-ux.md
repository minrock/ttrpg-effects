VEREDICTO: APROBADO

# Revisión UX — 005 Electron cliente del servicio

Fecha: 2026-10-29. Ciclo1, ronda2. Revisión independiente según `.codex/agents/ux.toml`, con AGENTS.md, solicitud/spec, build actualizado, identidad/huellas de esta ronda y comparación con ronda1. Alcance dirigido al cierre nativo y a la corrección editorial; se mantienen las verificaciones y límites del informe UX de ronda1 para el resto de005. No se editaron implementación, Git, tablero ni informes ajenos.

## Cierre de hallazgos

### UX-005-01 — Resuelto

`src/main/service-app.ts:24–32` atiende ahora `will-prevent-unload` con un diálogo nativo asociado a la ventana. Explica que hay cambios sin guardar, cómo volver a guardarlos y la consecuencia de descartarlos. «Seguir editando» es la opción predeterminada y de cancelación; únicamente la respuesta explícita1, «Descartar y salir», levanta el veto. No fuerza la salida, recarga el frontend ni conserva consentimiento para un intento posterior. Tampoco añade bridge, preload, IPC o permisos al cliente remoto.

**Verificación propia CUA del artefacto compilado:** API real en `http://127.0.0.1:8895`, datos descartables del constructor en `/private/tmp/ttrpg-005-r1-kqkool6o/data`, perfil propio `/private/tmp/ttrpg-ux005-r2-service`, claves sintéticas. Se arrancó con `pnpm start:api` y `TTRPG_SERVICE_URL=http://127.0.0.1:8895 pnpm start:service --user-data-dir=/private/tmp/ttrpg-ux005-r2-service`.

1. Acceso DM y carga de «Cierre ronda1» desde selector. El mapa900×600 y el nombre original «Borrador-cierre-005» se mostraron correctamente.
2. Edición de nombre a «UX-r2-conservado», sin guardar. Botón nativo de cerrar abrió la alerta «Hay cambios sin guardar» con ambos botones y el detalle completo en el árbol accesible.
3. Escape cerró la alerta y mantuvo el mapa y nombre exacto. El foco volvió al control de actualización de imagen donde estaba antes del cierre. No se perdió el borrador.
4. Cmd+Q abrió de nuevo la confirmación. El consentimiento no se reutilizó tras cancelar. Se cedió momentáneamente esta misma hoja a UI005 para su inspección visual, sin acciones concurrentes; el veredicto UX se basa en código/pruebas y este recorrido propio.
5. Recuperado el control, click propio en «Descartar y salir»: Electron terminó con código0. La salida antes silenciosamente bloqueada ahora tiene explicación y decisión explícita.

**Tests propios:** `pnpm exec vitest run src/main/service-app.test.ts src/main/electron-entry.test.ts` → **2 archivos / 11 pruebas PASS**,252ms. Verifican que no se abre confirmación al componer, que cancelar conserva veto y no recarga, que un intento posterior pide consentimiento y que respuestas -1/0/2/indefinida no descartan. Se conservan pruebas de composición, recuperación y salida segura.

La evidencia nueva del constructor en build005 complementa este recorrido: botón cerrar→descarte y Cmd+Q→descarte con código0, Escape/click Seguir editando conservando cambios, reapertura del guardado sin el nombre descartado y salida directa desde login. Esa evidencia se atribuye al constructor; no se presenta como repetición propia. No se repitió salida con una escena guardada sin cambios. El flujo de login sin borrador y el criterio de suciedad sin cambios se conservan, sin un nuevo hallazgo.

### UX-005-02 — Resuelto

`README.md:21` describe ahora Electron local y el servicio HTTP/SSE compartido con navegador y roles, con enlace a la guía. Ya no afirma que solo exista transporte local. `docs/service-operations.md:38` explica la confirmación de cierre, las dos opciones, Escape y salida normal sin cambios. El texto coincide con lo observado y ofrece una acción concreta para guardar antes de salir.

## Regresiones y congelación

Se compararon todas las entradas SHA-256 de ronda1 y ronda2. Cambiaron `README.md`, `docs/service-operations.md`, `src/main/service-app.ts`, su test y dos documentos de orquestación (`factory/README.md`, `factory/migracion-servicio.md`). El VTT, autenticación, proyección, roles, copia de enlace, transporte/SSE, cámaras y persistencia no cambiaron. Todas las entradas de las huellas de ronda2 coinciden con los archivos actuales, comprobado al iniciar y antes de publicar este informe.

No se repite la matriz histórica de resoluciones, herramientas, roles, TLS o backup/restore: se conserva la evidencia propia y atribuida de ronda1, con sus límites. El build actualizado acredita1176tests, lint, typecheck y build Electron; esta revisión ejecutó únicamente los11tests dirigidos indicados y el humo propio de cierre. No se atribuye una suite completa nueva a UX.

El diálogo aparece solo ante el veto de salida, no añade controles sobre el mapa durante la sesión y mantiene la cancelación con Escape. La protección de inputs frente a Delete/Backspace y la recuperación de sesión permanecen en el frontend sin modificaciones.

## Límites y limpieza

No se probó lector de pantalla físico, activación por Enter del botón nativo, proyector, despliegue remoto ni otros sistemas operativos. Escape y cancelación segura sí se comprobaron de forma real; el foco predeterminado/cancelación también se verifica en las opciones del host. La inspección visual adicional de UI005 es independiente y no se usa como sustituto del presente veredicto.

No quedan hallazgos UX abiertos. Electron terminó por descarte explícito con código0 y la API temporal por Ctrl+C con código0. Se informó que CUA estaba libre; no se crearon pestañas ni se tocó la biblioteca personal. Única escritura de esta revisión: este informe, publicado mediante temporal y renombrado. La aprobación se limita a UX y no sustituye los otros veredictos ni la orden de integración.
