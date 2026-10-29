VEREDICTO: CAMBIOS

# Revisión UX — ciclo 1, ronda 1

Fecha: 2026-10-28. Revisión independiente sobre el código congelado de `feature/fabrica-software`. Se leyeron `AGENTS.md`, perfil UX, solicitud, spec, build y evidencia de identidad de la ronda. No se consultaron revisiones ajenas ni se modificaron implementación o Git.

## Alcance

Composición por raíz, ausencia de bridge/capacidades, continuidad de edición local, estados de error, suscripciones, interacción de teclado, navegación/cámara y separación visual DM/Player. Se inspeccionaron App, PlayerApp, ClientProvider, hooks de dados/reemplazo, consumidores de imágenes/bibliotecas y acciones del árbol de anotaciones.

## Hallazgo obligatorio

### UX-001 — P2: borrar áreas locales queda bloqueado por la capacidad de proyección

**Evidencia:** `src/renderer/src/App.tsx:910` incorpora un retorno anticipado cuando `playerApi === undefined` en `handleDeleteInformationArea`, con el mensaje «La proyeccion no esta disponible en este cliente». El resto de este handler únicamente valida el bloqueo y elimina el área del estado de escena/selección/modal: no ejecuta una operación Player. El callback además mantiene dependencias `[]`, por lo que conserva la disponibilidad de Player del primer montaje aunque cambie el cliente.

**Flujos afectados:** el botón «Eliminar» del árbol llama a este handler (`App.tsx:3460`, `MapAnnotationsTree.tsx:239`); Delete/Backspace sobre el árbol también (`MapAnnotationsTree.tsx:200`), y la eliminación de la selección desde el lienzo pasa por él (`App.tsx:1308`, teclado en `App.tsx:1835`).

**Reproducción determinable en código:** montar App sin bridge o con cliente explícito cuya capacidad `player` sea falsa; crear/cargar un área informativa desbloqueada; intentar eliminarla por el árbol o teclado. El retorno ocurre antes de `removeInformationArea`, de modo que el área permanece. Si la raíz empezó sin Player y luego recibe un cliente con esa capacidad, el cierre obsoleto sigue bloqueando el borrado.

**Impacto para el usuario:** se pierde una operación de edición local disponible antes de esta spec, y el mensaje atribuye el fallo a una función ajena a la intención de borrar. Afecta precisamente a los labs/clientes sin bridge y a la composición de capacidades que se introduce. Incumple los criterios 5 y 9 de continuidad y teclado; también la recuperación tras sustituir cliente.

**Corrección esperada:** retirar la dependencia de proyección de la eliminación local, conservar la protección de áreas bloqueadas y comprobar el flujo completo App con `client={null}` y con `player: false`, por botón y Delete/Backspace. La comprobación de capacidad sí corresponde al handler separado que resalta el área para jugadores. Añadir cobertura de sustitución de cliente si se conserva alguna dependencia de capacidad en callbacks de edición.

## Verificación realizada

Ejecuté:

```sh
pnpm test src/renderer/src/client/ClientProvider.test.tsx src/renderer/src/App.workspace.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/components/annotations/MapAnnotationsTree.test.tsx
```

Resultado: **5 archivos / 45 pruebas aprobadas**, código 0. Vitest emitió el aviso conocido de jsdom sobre `HTMLCanvasElement.getContext` sin canvas nativo. Las suites comprueban precedencia del cliente explícito, ausencia explícita, aislamiento de raíces Player, limpieza de listeners con StrictMode/cambio de cliente, estabilidad del canvas y contexto de dados, Escape, exclusión de Delete en inputs, bloqueo de zoom, navegación local y recuperación de imágenes. El test del árbol verifica la delegación del borrado a un mock; no cubre la nueva condición dentro de App, por lo que su resultado no descarta UX-001.

Inspeccioné directamente con `view_image` las capturas existentes `/tmp/client-dm-wide.png` (1440×900), `/tmp/client-dm-narrow.png` (1000×700) y `/tmp/client-player.png` (1920×1080). En esas escenas vacías se conserva el espacio central, los drawers están recogidos en ancho reducido y Player presenta herramientas locales sin paneles DM. Estas capturas no demuestran interacción, foco ni funcionamiento de diálogos.

La composición mantiene la selección explícita de cliente sin fallback accidental; las suscripciones Player/dados revisadas tienen limpieza. Los consumidores Player siguen usando filtros de elementos visibles, y el cambio conserva los canales existentes. El build documenta una tirada oculta sin presentación pública y una abierta con ella; esto se considera evidencia aportada por el constructor, no una comprobación manual propia.

## Límites y aceptación

No se abrió una sesión manual nueva de Electron ni se interactuó con UI en esta revisión. El hallazgo UX-001 procede del flujo real de código, no de una reproducción manual atribuida incorrectamente. No se verificaron personalmente diálogos de abrir/cancelar, guardado/carga temporal, biblioteca mediante formulario o un mapa real en proyección. Build declara esos mismos límites para el humo de archivos/formularios. Los resultados generales de typecheck/lint/build y las 1005 pruebas pertenecen al informe del constructor; aquí solo se reejecutaron las cinco suites indicadas.

Se requiere corregir UX-001 y aportar evidencia del flujo integrado sin Player antes de aprobar UX. No se solicita rediseño de interfaz ni implementación HTTP.
