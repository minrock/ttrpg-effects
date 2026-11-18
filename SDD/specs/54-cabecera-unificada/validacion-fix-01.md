# Validación — Publicación desde Chrome (FIX-01)

Fecha: 2026-11-15. Corrección local de [SDD 54](spec.md#corrección-de-publicación-desde-chrome--2026-11-15), implementada y validada en **3.31.1**. Sin integración Git ni implementación de SDD 61.

## Cambio comprobado

`WorkspaceHeader` vuelve a presentar Monitor + «Jugador» en navegador. Servicio utiliza «Publicar escena para jugadores» como tooltip/nombre accesible; Electron autónomo conserva «Abrir ventana de jugador». Reutiliza `onPlayer`, estado ocupado, portal y agrupación de herramientas existentes. Chrome conserva el nombre de escena plano y Electron su menú de escena.

El parche de producto comprende cabecera, dos archivos de regresiones, historia WorkspaceHeader y versión/changelog. La comparación SHA-256 anterior/posterior confirma que este trabajo no modificó `App.tsx`, `table-client.ts`, `player-window-ipc.ts`, `service-app.ts`, `window-policy.ts` ni `workspace.css`, aunque algunos ya contenían cambios locales previos.

## Verificaciones automatizadas

| Comando ejecutado | Resultado |
| --- | --- |
| `pnpm exec vitest run src/renderer/src/components/workspace/WorkspaceChrome.test.tsx src/renderer/src/App.workspace.test.tsx --exclude '.local/**' --maxWorkers 4` | PASS: 2 archivos, 42 pruebas |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm build:web` | PASS; frontend web 3.31.1 |
| `pnpm build-storybook` | PASS; imports y build del catálogo |
| `pnpm build` | PASS; main/preload/renderer Electron |
| `git diff --check` | PASS |

Vite conserva avisos no bloqueantes de directivas `use client` en dependencias y chunks mayores de 500 kB. No se ejecutaron suites DB: el delta no modifica persistencia ni autoridad. La revisión independiente del delta no encontró defectos accionables.

## Criterio → evidencia

| Criterio | Evidencia observada | Resultado |
| --- | --- | --- |
| CA-06: acción única, responsive, escena plana | Chrome real a 1440×900: botón Jugador en la fila. A 390×844: icono Monitor dentro de Herramientas, sin desborde del menú. Nombre de escena no interactivo. Historia real con nombre accesible y callback sintético comprobados | PASS |
| CA-07: publicación explícita y límites de acceso | Invitado real en IAB conectado a API sintética permaneció en «Esperando publicación del DM» después de entrar al editor y abrir Herramientas. Enter sobre Jugador cambió a «Conectado · Escena publicada» y habilitó lienzo/controles. El indicador de escala se sincronizó después sin otra publicación inicial. Pruebas de ocupado y portal `hidden`/`inert` | PASS |
| CA-08: modalidades Electron | Electron conectado: tooltip de servicio, menú de escena presente, clic produjo «Proyección publicada» y el invitado recibió el snapshot actualizado. Autónomo: botón con etiqueta nativa abrió Player View; segundo clic la enfocó conservando dos ventanas (editor + jugador) | PASS |
| CA-09: error, teclado y calidad | Regresión Chrome con respuesta fallida conserva feedback y no activa sincronización. Chrome estrecho: Escape cerró; Enter reabrió; siete Tab y Enter activaron Jugador y cerraron el menú; el foco volvió al disparador. Gates anteriores aprobados | PASS |

## Entorno y alcance de la evidencia

- QA web: API loopback 8877 sobre copia nueva de una fixture **sintética** de SDD59, SQLite aislada. Backend compatible reutilizado **3.30.0**, frontend del parche **3.31.1**. No se presenta como nuevo gate del backend.
- Chrome se operó mediante CUA nativo porque el controlador DOM de su extensión falló; los tamaños se aplicaron mediante la capacidad viewport y se restauraron. El invitado se operó en IAB separado.
- La escena sintética contiene un mapa lógico sin imagen de fondo; se verificó publicación del lienzo, estado conectado y control de escala, no fidelidad de imágenes complejas.
- Smoke autónomo: build actual, perfil temporal separado, escena vacía y nueva ventana nativa. No se probaron en este parche todas las funciones de proyección ni distribución DMG.
- Evidencia privada: `.local/validation/player-button54/` contiene `builder-results.md`, `preserved-sha256.json`, `qa-context.json`, `cleanup.json` y capturas `chrome-desktop.png`, `chrome-narrow.png`, `player-before.png`, `player-after.png`, `electron-service.png`, `electron-local-player.png`, `storybook-header.png` y `storybook-header-detail.png`. No contiene datos operativos en los registros técnicos; las capturas Chrome incluyen su marco nativo y permanecen locales.

## Limpieza e integración

API QA y ambas ejecuciones Electron terminaron con código 0. Puerto 8877 libre, sin `data/control.lock` sintético, PIDs Electron terminados. Se cerraron las pestañas QA; el grupo de Chrome se cerró de forma reversible. Viewport restaurado. API del usuario 8787 y Storybook 6006 continúan escuchando; no se detuvieron ni se migraron datos operativos.

Rama autorizada `fix/publicacion-jugador-chrome`, HEAD previo conservado, cambios locales anteriores preservados. Sin `git add`, commit, push, merge ni DMG. Esta validación acredita el parche local, no su integración en main ni un despliegue independiente.
