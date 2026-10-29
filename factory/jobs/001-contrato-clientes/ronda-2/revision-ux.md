VEREDICTO: APROBADO

# Revisión UX — ciclo 1, ronda 2

Fecha: 2026-10-28. Revisión independiente del código congelado. Se consultaron el perfil UX, las instrucciones del proyecto ya leídas, solicitud/spec/build actualizados y `ronda-2/revision.md`. No se leyeron informes ajenos de esta ronda. Se conserva intacto el informe UX de ronda 1; no se modificaron implementación, tablero o Git.

## Alcance y resultado

Se revisó el cierre de UX-001 y el impacto de las correcciones adicionales sobre navegación de Player, consultas de bibliotecas, estados de carga/error, disponibilidad de capacidades y continuidad de la edición. No encontré hallazgos UX obligatorios pendientes en el alcance de esta spec.

### UX-001 resuelto: eliminación local independiente de Player

`src/renderer/src/App.tsx:910` ya no consulta `playerApi` antes de borrar un área informativa. Conserva `canDeleteMapAnnotation`, elimina el área de la escena y limpia selección/modal/referencia de selección. El callback no necesita capturar una capacidad que pueda quedar obsoleta.

`src/renderer/src/App.workspace.test.tsx:136` ejecuta el flujo integrado de App con `client={null}` y con capacidades desactivadas, incluido `player: false`. Para cada composición prueba Delete, Backspace y el botón real del árbol; comprueba que no queda área ni selección ni aviso de proyección. La prueba siguiente conserva un área bloqueada ante Delete. Estas pruebas sí alcanzan el handler de App que faltaba cubrir en ronda 1.

El usuario vuelve a poder eliminar anotaciones locales sin una ventana o conexión Player, manteniendo la protección contra borrado accidental de áreas bloqueadas. No se requiere corrección adicional de UX-001.

### Continuidad de cámara y bibliotecas

En Player, el reporte de cámara captura una generación y descarta la finalización perteneciente al cliente anterior; cleanup vacía cola/timer y libera el indicador en vuelo. La prueba `ClientProvider.test.tsx:124` conserva A pendiente, cambia a B y confirma que B recibe la cámara x=99 antes de resolver A, sin enviar esa cámara al cliente antiguo. Esto evita que un transporte anterior deje la navegación del nuevo cliente sin reportar.

Las tres bibliotecas limpian resultados/imágenes y muestran carga o indisponibilidad al cambiar el cliente. Los efectos cancelables impiden que una consulta, imagen o error anterior sustituya contenido actual; los formularios/previews ligados al cliente se reinician. Las nueve pruebas de `LibraryClientLifecycle.test.tsx` verifican consultas tardías, imágenes tardías, errores antiguos, capacidad ausente y desmontaje. Se inspeccionaron las implementaciones de monstruos, NPCs y personajes, además de las pruebas.

## Evidencia ejecutada por esta revisión

```sh
pnpm test src/renderer/src/client/ClientProvider.test.tsx src/renderer/src/App.workspace.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/components/aside/LibraryClientLifecycle.test.tsx src/renderer/src/components/annotations/MapAnnotationsTree.test.tsx
```

Resultado: **6 archivos / 58 pruebas aprobadas**, código 0. Se observó únicamente el aviso conocido de jsdom sobre `HTMLCanvasElement.getContext` sin canvas nativo.

La cobertura ejecutada incluye Escape y cancelación de herramientas, Delete en elementos locales y su exclusión en inputs, navegación/zoom de Player, bloqueo de zoom, drawers en ancho reducido, estabilidad del canvas, aislamiento de raíces y limpieza de listeners, sustitución de clientes, recuperación de imagen y borrado de áreas sin Player. La búsqueda de `window.ttrpg` en código de producción devuelve solo la frontera `ClientProvider.tsx:10`.

## Evidencia conservada y límites

La inspección visual propia de ronda 1 cubrió las capturas DM 1440×900 y 1000×700 y Player 1920×1080; no se repitió en esta ronda porque las correcciones no cambian CSS, estructura de paneles ni herramientas visibles. No se afirma una nueva prueba con monitores físicos.

El build actualizado registra una interacción CUA del constructor en Chrome sin bridge: dibujar, nombrar y guardar un área, salir con Escape y borrarla con Delete, terminando en «0 elementos / Sin selección». Es evidencia aportada por el constructor y concordante con las pruebas ejecutadas aquí; no se presenta como una sesión manual propia.

No se abrió ni manipuló UI durante esta revisión. No se repitieron humo Electron, diálogos nativos de abrir/cancelar/guardar/cargar, formulario de biblioteca ni tiradas abiertas/ocultas en transporte real. Se conservan los límites explícitos de `build.md`; las correcciones de esta ronda se verificaron mediante código y las suites enfocadas anteriores. La evidencia inicial de privacidad de dados y tamaños proviene de la construcción, complementada por las pruebas de Player. Typecheck, lint, build y el total de 1018 pruebas son resultados del constructor, no reejecuciones de esta revisión.

La aprobación UX se refiere al contrato/composición local y a sus regresiones de experiencia. No certifica un cliente HTTP, autenticación o seguridad remota, excluidos de esta spec, ni autoriza operaciones Git.
