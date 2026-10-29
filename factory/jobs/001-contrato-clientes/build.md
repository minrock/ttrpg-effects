# Construcción 001 — Contrato común de clientes

Fecha: 2026-10-28. Ciclo 1: corrección de ronda 1 lista para revisión 2. Rama comprobada: `feature/fabrica-software`.

## Resultado

Contrato único en `src/shared/api/`, reexports históricos de preload, composición React por raíz y capacidades explícitas. App, PlayerApp, bibliotecas, imágenes, combate y dados usan el cliente de su proveedor; no necesitan escribir en `window`. Ausencia explícita no cae al bridge y una capacidad ausente sigue los caminos recuperables existentes. No se añade backend, HTTP/SSE ni métodos simulados de producción.

El preload conserva 67 métodos/canales y obtiene su versión desde `package.json`, incorporada por Vite. Versión final: **3.2.0**, bump minor único; changelog en español. Se conserva formato de escena 2 y compatibilidad/migración de legado 1.

## Archivos afectados

- Nuevos `src/shared/api/{ttrpg-api,dice-api,client}.ts`: contrato, resultados, capacidades y composición independiente de entorno.
- `src/preload/{ttrpg-api.d.ts,dice-api.ts,index.ts}` y nueva prueba `index.test.ts`: compatibilidad, versión, IPC específico y desuscripción.
- Nuevos `src/renderer/src/client/ClientProvider.tsx` y `ClientProvider.test.tsx`: frontera local/compatibilidad, proveedor y pruebas de inyección.
- `src/renderer/src/{main,App,PlayerApp}.tsx`: composición de entrada, consumidores DM/Player y lifecycle de cliente.
- Hooks `useDiceSession`, `useDiceSizes`, `useMapImageReplacement`: API inyectada, dependencias estables, desuscripción y reinicio de revisiones al cambiar cliente.
- Componentes de aside (`ImagePicker`, bibliotecas, detalles, formularios y secciones de monstruos/NPC/personajes, `PlayerAsideOverlay`), combate (`CombatSetupModal`, `CombatTurnBar`) y `DiceOverlay`: consumen la raíz correspondiente.
- Nueva `docs/client-architecture.md`, enlace desde README, `package.json`, `CHANGELOG.md`.

Se preservan modificaciones anteriores de spec 40; no se editaron AGENTS.md, perfiles, specs, solicitud, tablero, backlog ni revisiones durante esta construcción.

## Criterios y evidencia

| Criterio | Evidencia real |
| --- | --- |
| 1. Contrato común seguro e imports históricos | Importaciones de modelos solo por tipo; reexports compatibles comprobados por typecheck y prueba preload. No dependencias runtime de Electron/React/Node en el contrato. |
| 2. Inyección y aislamiento | `ClientProvider.test.tsx`: App guarda con cliente explícito frente a otro bridge; ImagePicker anidado usa API inyectada; dos raíces Player reciben eventos separados y ninguna llama al bridge ajeno. |
| 3. Lifecycle y estabilidad | Pruebas con StrictMode, sustitución/desmontaje de cliente y conteo de listeners; render ordinario conserva montaje del canvas y número de actualizaciones de contexto de dados. Revisiones DM/públicas/tamaños aceptan reinicio de servidor al cambiar cliente. |
| 4. Frontera única | `rg -n 'window\.ttrpg' src --glob '!*.test.*' --glob '!**/ui-lab/**'` devuelve solo `client/ClientProvider.tsx:10`. |
| 5. Ausencia/capacidades | Pruebas de `client={null}` con bridge presente y de capacidad imágenes desactivada; no hay llamada ni éxito ficticio. Suites App.workspace y labs siguen pasando sin bridge. |
| 6. Versión real | Prueba del preload fuente; ejecución VM del bundle final `out/preload/index.cjs` devuelve 3.2.0 igual a package.json y su único require es `electron`. Humo Electron real también devolvió 3.2.0. |
| 7. Transporte y semántica | Canales sin cambios; suites existentes de IPC/escenas/reemplazo/dados pasan. Humo real confirmó biblioteca/plantillas, apertura Player y tiradas oculta/abierta con su filtrado público. Diálogos nativos/importación/guardado manual no recorridos en el humo (ver límites). |
| 8. Escenas y compatibilidad | Sin cambios en dominio, schemas ni persistencia; suites completas de escenas, enlaces, imágenes ausentes y migración pasan. |
| 9. UI, teclado y privacidad | Suites workspace/Player tools/map-image pasan; revisión visual real de DM a 1440×900 y 1000×700, Player a 1920×1080. No cambios de CSS, diseños ni atajos. Tirada oculta completada sin presentación pública, abierta completada con presentación pública. |
| 10. Labs, paridad y entrega | Suites labs pasan; matriz enumera los 67 métodos (comprobación automática sin faltantes), identifica capacidades, roles y equivalencias propuestas. README enlazado; versión/changelog y este informe publicados. |

## Comandos y resultados de construcción inicial

- `pnpm typecheck`: PASS, código 0.
- `pnpm lint`: PASS, código 0.
- `pnpm test`: PASS, **110 archivos / 1005 pruebas**. Log de sesión `/tmp/client-tests-final.log`. Advertencia jsdom conocida: canvas sin paquete nativo; no test fallido.
- `pnpm build`: PASS, código 0; main, preload y renderer construidos. Log `/tmp/client-build.log`.
- `git diff --check`: PASS.
- `pnpm exec node /tmp/verify-preload.cjs`: PASS; `{ preloadVersion: "3.2.0", onlyElectronRequired: true, methods: 67 }`.
- Conteo de métodos frente a documentación: 67, lista de faltantes vacía.

Las pruebas iniciales antes de añadir cobertura propia también pasaron (108 archivos/998 pruebas). Durante la escritura del nuevo test hubo errores de tipos en fixtures, corregidos antes de los checks finales; ninguna comprobación pendiente se cuenta como exitosa.

## Humo Electron inicial y límites

Se ejecutó `pnpm dev --remoteDebuggingPort 9223` y se verificaron por CDP las ventanas y **el bridge/IPC reales** (no fixtures). Se detuvo la instancia de desarrollo al terminar.

- `getAppInfo`: nombre/status conservados, versión 3.2.0.
- `listMonsterTemplates` y `searchMonsterLibrary`: respuesta real `ok: true` (solo se registraron cantidades, no contenido privado).
- Botón real «Abrir ventana de jugador»: estado `isOpen: true`, snapshot presente, canvas renderizado.
- DM 1440×900: explorador, inspector y canvas visibles. DM 1000×700: paneles recogidos y canvas disponible. Player 1920×1080: proyección con herramientas de jugador, sin controles DM. Capturas realmente inspeccionadas: `/tmp/client-dm-wide.png`, `/tmp/client-dm-narrow.png`, `/tmp/client-player.png`.
- Botones reales de dados: agregar d6, «Oculta»/«Abierta», «Lanzar». Ambas tiradas devolvieron historial `complete` y resultado; Player devolvió `hasPresentation: false` para oculta y `true` para abierta. Se retiraron las presentaciones tras comprobarlas.
- CDP no registró excepciones durante esas interacciones. Consola de proceso mostró aviso experimental existente de SQLite; no errores nuevos de preload.

**Límites:** no se hizo recorrido manual de selección/cancelación de archivos, guardado/carga temporal por diálogo, reemplazo de mapa ni biblioteca mediante formulario UI; esos caminos están cubiertos por las suites existentes, no por este humo. Los tamaños se aplicaron al viewport mediante emulación CDP; no representan tres monitores físicos. Escape/Delete/Backspace y escritura se verificaron mediante suites existentes, no una sesión manual completa. Capturas y logs de `/tmp` son evidencia temporal de esta sesión. No se declara navegador HTTP funcional.

## Historial y Git

- Ciclo 1 inicial: construcción y correcciones internas de fixtures.
- Corrección tras ronda 1: C1/UI-01/UX-001, C2 y C3 resueltos; detalles y verificaciones abajo.
- Sin staging, commit, push, merge, despliegue ni DMG. Los cambios quedan sin commit por la prohibición explícita de solicitud.md.
- Listo para congelar código y recibir las cuatro revisiones. Constructor disponible para retrabajo posterior únicamente tras leer la ronda completa.


## Corrección de ronda 1 — lista para ronda 2

Se leyeron los cuatro informes finales de `ronda-1`: seguridad (APROBADO), código (CAMBIOS C1–C3), UX (CAMBIOS UX-001) y UI (CAMBIOS UI-01). La rama sigue siendo `feature/fabrica-software`. Versión **3.2.0**, sin segundo bump ni nuevo cambio de alcance.

### Hallazgos resueltos y evidencia

- **C1 / UI-01 / UX-001:** retirada la condición Player de `handleDeleteInformationArea`; borrar sigue siendo una operación local y conserva la protección de bloqueo. `App.workspace.test.tsx` verifica Delete, Backspace y botón del árbol tanto con `client={null}` como con `player: false`, además de un área bloqueada. Las pruebas comprueban área eliminada y selección limpia.
- **C2:** cada reporte de cámara captura la generación de su cliente; cleanup invalida generaciones anteriores, elimina timers/cola y libera el indicador en vuelo. La finalización antigua no procesa la cola nueva; B puede enviar aunque A no resuelva. `ClientProvider.test.tsx` monta Player real, deja la promesa A pendiente, cambia proveedor, envía x=99 en B y comprueba su recepción antes de resolver A, sin nuevas llamadas al cliente A después.
- **C3:** consultas de las tres bibliotecas integradas en efectos cancelables. Cambiar cliente/consulta, desactivar capacidad o desmontar invalida resultados, imágenes, feedback e indicadores anteriores; se vacían los resultados previos. También se reinician formularios/previews ligados al cliente y se descartan respuestas de guardado que pertenecen a una generación anterior. Nueva `LibraryClientLifecycle.test.tsx`: nueve pruebas (tres por biblioteca) con promesas controladas para consultas fuera de orden, imágenes tardías, rechazo antiguo, capacidad ausente y desmontaje. Documentación de lifecycle actualizada.

### Verificación actual

- `pnpm typecheck`: PASS, código 0.
- `pnpm lint`: PASS, código 0.
- `pnpm test`: PASS, **111 archivos / 1018 pruebas**, código 0; `/tmp/client-r2-tests.log`. Solo advertencia conocida de canvas jsdom.
- `pnpm build`: PASS, código 0; `/tmp/client-r2-build.log`.
- `git diff --check`: PASS.
- Pruebas dirigidas previas: workspace 11, composición 7 y bibliotecas 9 casos, todos aprobados. El primer intento de las pruebas de teclado emitía eventos sobre Window; se corrigió el fixture para emitirlos desde el elemento canvas, como ocurre en UI. Los resultados finales no contienen esos errores.

### Humo CUA de la corrección UI

Se inició Vite en `http://127.0.0.1:5174` y se abrió Chrome mediante CUA, sin bridge ni fixtures. Se eligió Anotaciones → Area de información, se dibujó un área, se escribió «Área temporal corrección 001», se guardó, se salió con Escape y se pulsó Delete. El árbol accesible y captura posterior mostraron **0 elementos / Sin selección**, sin aviso de proyección. Se observó directamente el canvas sin el área ni sus propiedades. La pestaña y el servidor temporal se cerraron al terminar.

No se repitió el humo Electron inicial ni los diálogos nativos: las correcciones son lifecycle de cliente y edición local, verificados con las pruebas específicas y CUA descritos. No se declara una nueva inspección de varios tamaños o IPC. Se conservan los límites del humo inicial.

Sin staging, commits, push, merge, despliegue ni DMG. Los informes de revisión no se modificaron. Corrección terminada y disponible para congelar la ronda 2.
