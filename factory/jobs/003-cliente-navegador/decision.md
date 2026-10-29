APROBAR

# Decisión técnica — 003, cliente navegador

Fecha: 2026-10-29. Ciclo 2, ronda global 3. Se aprueba técnicamente el alcance de solicitud.md y spec.md con el retrabajo autorizado en retrabajo-ciclo-2.md. No quedan hallazgos pendientes en las cuatro revisiones completas de esta ronda.

## Identidad y evidencias

- Rama comprobada: `feature/fabrica-software`; HEAD y base registrados: `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Versión de aplicación 3.4.0; formato de escena 2, sin ruptura de compatibilidad.
- Las 509 huellas SHA-256 de `ronda-3/huellas.json` coinciden con los archivos actuales, comprobadas de nuevo inmediatamente antes de publicar esta decisión. No hay archivos de código/configuración/documentación visibles para Git fuera del inventario, excluidos los registros de fábrica. Los 22 archivos rastreados incluidos en el diff de `revision.md` coinciden exactamente con su diff actual contra HEAD. Los cambios heredados de otros trabajos siguen incluidos en las huellas; no se confunden con el alcance propio de 003.
- Se leyeron AGENTS.md, perfil aprobador, solicitud, spec, retrabajo, build, identidad/huellas y los cuatro informes completos de ronda 3, además de los cuatro de ronda 2 para contrastar los cierres. Seguridad, UX, UI y código empiezan por `VEREDICTO: APROBADO`, describen comprobaciones propias y explicitan sus límites.
- Se contrastó el código real de App, SceneLinkModal, dominio de enlaces internos, servicio de enlaces, CSS, frontera de sesión y señal de invalidación con las conclusiones. No se sustituyó ninguna revisión faltante ni se alteró implementación.

## Hallazgos cerrados

**C-003-04:** la alternativa autorizada exige Desligar antes de cambiar entre conexión remota e interna. App rechaza ambos sentidos antes de escribir; dominio y servicio protegen también los extremos. El estado interno se aplica solo tras guardar correctamente y el modal conserva el enlace ante fallo, informa y permite reintentar. Las pruebas de App/modal recorren rechazo, fallo y reintento en ambos sentidos; HTTP/SQLite relee ambos documentos y comprueba rollback del segundo guardado. El revisor de código adaptó y ejecutó su reproducción independiente anterior con resultado satisfactorio. La reconexión remota recíproca permanece cubierta.

**UI-003-03:** backdrop fijo con z-index 40 sobre la cabecera 30, sin sacar el diálogo del árbol protegido. La revisión UI independiente reprodujo el destino largo a 1024×768 y 1440×900 y confirmó encabezado, cierre, pie, scroll, selector anidado y restauración del foco. Además provocó un 401 real: el modal conservó ancestros hidden/inert y cero rectángulos visibles; recuperación DM y cierre funcionaron.

Los hallazgos previos de seguridad P1/P2, UX-003-01/02, UI-003-01/02 y C-003-01/02/03 ya cerrados en ronda 2 siguen cerrados. Las regresiones de sesión, portales, selectores tardíos, foco, reconexión y reemplazo continúan aprobadas. No existe discrepancia pendiente entre los cuatro informes.

## Aceptación y comprobaciones

La matriz de build.md vincula el alcance a adaptador/HTTP real, roles y recuperación, guardar/cargar/importar/exportar, imágenes y reemplazo, bibliotecas/plantillas, enlaces, capacidades pendientes explícitas, estáticos y compatibilidad Electron/labs. El humo inicial y las correcciones aportan navegación real contra API, tamaños requeridos, aislamiento jugador y persistencia. Las revisiones independientes complementan esa evidencia y no pretenden haber repetido cada recorrido manual.

Se comprobaron los logs finales del ciclo 2: `pnpm test` aprobó 117 archivos y 1103 tests; `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm build:api` y `pnpm build:web` terminaron correctamente. El pase focalizado aprobó 37 tests. Los revisores ejecutaron además regresiones pertinentes y el revisor de código typecheck/lint y reproducciones independientes. El aprobador ejecutó `git diff --check`, sin errores; no repitió suites ni humo UI ya cubiertos y atribuidos a sus autores. Los arranques de desarrollo/producción y el humo Electron/lab están documentados en build.md.

## Riesgos residuales y límites

Persisten avisos conocidos de canvas jsdom, directivas use-client y tamaño de chunks, sin fallos pendientes. No se verificó proyector físico, distribución remota ni DMG. Las capturas CUA permanecen en el historial de herramientas de sus autores, sin PNG persistidos. La exportación JSON no empaqueta imágenes. La sincronización, proyección y dados compartidos se mantienen explícitamente pendientes de 004; Electron remoto corresponde a 005. Estos límites están dentro del alcance acordado y no se presentan como funciones implementadas.

## Siguiente acción

El orquestador puede avanzar secuencialmente a 004 conforme a la autorización del usuario. 003 queda aprobado técnicamente y sin integrar. Esta decisión no autoriza staging, commits, push, merge, despliegue ni DMG; se mantiene la rama actual y se preservan los cambios anteriores. Solo el orquestador actualiza el tablero. Se publica exclusivamente este archivo mediante temporal y renombrado.
