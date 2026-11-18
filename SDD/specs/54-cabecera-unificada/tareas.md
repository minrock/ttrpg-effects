# Tareas — Corrección de publicación en Chrome

**Fuente:** [spec](spec.md), delta autorizado del 2026-11-15; [plan](plan.md#corrección-de-publicación-en-chrome--2026-11-15). **Rama preparada:** `fix/publicacion-jugador-chrome`. **Autorizaciones:** Q0018 rama y Q0019 conservación de ambos modos Electron. No sustituye evidencia histórica ni autoriza integración.

## FIX-01 — Restaurar la publicación explícita desde Chrome

- **Estado:** implementada y validada localmente en 3.31.1; sin integración Git. [Evidencia por criterio](validacion-fix-01.md). **Identificador de tarea:** FIX-01.
- **Objetivo y criterios:** sustituir la omisión de Jugador en navegador del criterio 3, manteniendo cabecera/portal (1–2), teclado/foco (4), suspensión (5), y comportamiento actual Electron confirmado en Q0019.
- **Responsable propuesto:** frontend builder único. No está solo en el checkout: preservar cambios anteriores y ajenos, sin restauraciones globales ni operaciones Git.
- **Entrada:** producto 3.31.0 observado; callback `App.handleOpenPlayerWindow` ya publica con el cliente de servicio. El adaptador local abre/enfoca la ventana nativa. No es necesario añadir capacidad de ventana al servicio.
- **Escritura:** `src/renderer/src/components/workspace/WorkspaceHeader.tsx`, `src/renderer/src/components/workspace/WorkspaceChrome.test.tsx`, regresión dirigida en `src/renderer/src/App.workspace.test.tsx`, `src/stories/compositions/workspace/WorkspaceHeader.stories.tsx`, `package.json` y `CHANGELOG.md`. CSS de la acción solo si la revisión visual demuestra un defecto causado por su restitución; avisar al PM antes de ampliar el alcance.
- **Lectura/reutilización:** `src/renderer/src/App.tsx` (`handleOpenPlayerWindow`), `src/infrastructure/browser/table-client.ts` (`openPlayerWindow`), adaptador IPC de ventana de jugador y estilos `.workspace-header-actions`/`.workspace-present`. No modificar estos adaptadores para esta corrección.

### Pasos y entregables

1. Retirar la condición Electron únicamente de Jugador; preservar su posición, Monitor, `onPlayer`, `disabled={busy}` y comportamiento del portal. No retirar la detección Electron del menú de escena.
2. Servicio: `title`/`aria-label` «Publicar escena para jugadores». Autónomo: «Abrir ventana de jugador». Mantener texto visible «Jugador» y el desplegable Herramientas existente bajo 1100 px.
3. Actualizar regresiones de Chrome y Electron: acción explícita una vez, busy/suspensión, menú de escena Chrome plano, sin publicación por presencia del jugador. Reutilizar pruebas existentes, evitando nuevas pruebas que solo repitan estructura JSX.
4. Adaptar historia real de WorkspaceHeader con contexto de servicio y callbacks sintéticos para comprobar etiqueta y disposición, sin API ni motores. No alterar configuración global de Storybook.
5. Ejecutar los comandos dirigidos del plan y entregar resultados reales y limitaciones al PM. Registrar patch 3.31.1 si la versión base sigue siendo 3.31.0 y entrada de changelog fechada.

### Exclusiones y dependencias

Sin SDD61, dados de jugadores, nuevas ventanas/tabs del servicio, API, identidad, invitaciones, IPC, cambios de DB, migraciones, publicación automática o rediseño de la cabecera. No depende de otra tarea de implementación. Requiere el delta fuente actualizado por PM antes del despacho; la autorización de rama y alcance ya está resuelta. PM realiza el cierre de QA y evidencia; no hay builders en paralelo sobre estos archivos.

### Condición de cierre observable

Pruebas dirigidas, typecheck, lint y builds web/Storybook aprobados; Chrome real a 1440/390 px permite publicar mediante Jugador, con teclado y sin desbordes, y el invitado recibe el snapshot tras el clic. Los dos modos Electron conservan su recorrido actual, con evidencia diferenciada de mocks y smoke nativo. Spec/evidencia del PM reflejan implementación y validación local, sin declarar integración. Si un recorrido no puede comprobarse, registrar la limitación sin convertirlo en PASS.
