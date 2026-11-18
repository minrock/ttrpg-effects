# Plan consolidado — Cabecera compacta compartida

**Spec:** [contrato vigente](spec.md). **Tipo:** documentación retrospectiva del diseño implementado, no una nueva orden de ejecución.

## Módulos que se reutilizan

- [`src/web/HeaderDropdown.tsx`](../../../src/web/HeaderDropdown.tsx).
- [`src/web/ServiceApp.tsx`](../../../src/web/ServiceApp.tsx).
- [`src/web/GameEditor.tsx`](../../../src/web/GameEditor.tsx).
- [`src/renderer/src/components/workspace/WorkspaceHeader.tsx`](../../../src/renderer/src/components/workspace/WorkspaceHeader.tsx).
- [`src/renderer/src/components/workspace/workspace.css`](../../../src/renderer/src/components/workspace/workspace.css).

## Validación al modificar este alcance

```bash
pnpm exec vitest run src/web/HeaderDropdown.test.tsx src/web/ServiceApp.test.tsx src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx src/renderer/src/components/workspace/WorkspaceChrome.test.tsx
pnpm build:web
```

Añadir `pnpm typecheck` y `pnpm lint` al cambiar TypeScript; seleccionar regresiones según el diff. Los contratos `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` requieren PostgreSQL real con TLS y SQLite aislado: ver [persistencia](../../guias/database.md). Una suite general verde no los reemplaza. Nunca probar contra la base operativa ni declarar un gate ejecutado si falta el entorno.

## Evidencia disponible

El CHANGELOG y las pruebas presentes documentan la implementación local; no existe una aprobación de fábrica específica de estos cambios.

Esta consolidación no volvió a ejecutar los comandos de producto. La verificación documental queda en [el registro de consolidación](../../consolidacion.md). Para UI nueva, probar teclado, ancho estrecho y recorrido real; una fixture visual no demuestra autenticación ni sincronización con API real.

## Continuación

Conservar las fronteras de dominio/aplicación/infraestructura/vista y los contratos de compatibilidad descritos en la spec. Una nueva entrega registra su delta, migraciones, criterio → evidencia, riesgos, estado de Git y autorización por separado. No reutilizar decisiones históricas como aprobación de código nuevo.

## Ajuste 3.27.1 — 2026-11-12

`WorkspaceHeader` muestra «Jugador» únicamente si el agente de navegador contiene la identificación de Electron. Es una condición de presentación, no de autorización; cubre Electron servicio, que no tiene preload ni puente nativo. Se conserva el callback existente y no se modifica la sincronización de la mesa. La regresión de cabecera comprueba Electron y Chrome con los demás controles disponibles.

## Corrección de publicación en Chrome — 2026-11-15

**Estado del plan:** ejecutado y validado localmente en 3.31.1; [evidencia y límites](validacion-fix-01.md). **Tarea:** [FIX-01](tareas.md#fix-01--restaurar-la-publicación-explícita-desde-chrome). El usuario autorizó la rama `fix/publicacion-jugador-chrome` (Q0018) y conservar ambos modos actuales de Electron (Q0019). Se parte del checkout con cambios locales previos y `package.json` 3.31.0. No se autoriza integración Git ni operación sobre datos reales. El PM actualiza el delta de [spec.md](spec.md) y su evidencia; este apéndice sustituye la omisión en navegador del criterio histórico 3, conservando el resto de su comportamiento y los criterios 1, 2, 4 y 5.

### Recorrido observado y solución mínima

`WorkspaceHeader` oculta actualmente la única acción `onPlayer` mediante `isElectron`. `App.handleOpenPlayerWindow` entrega el snapshot y la cámara al `playerApi` inyectado. En servicio, `table-client.openPlayerWindow` publica por HTTP contextual; en autónomo el adaptador IPC abre/enfoca la ventana local y publica. El nombre histórico del método no implica abrir una ventana en Chrome ni Electron conectado.

Restaurar Monitor + «Jugador» en `.workspace-header-actions` sin condicionar ese botón a Electron. Conservar `onPlayer`, `busy`, suspensión del portal y agrupación bajo 1100 px. La detección Electron permanece para el menú de escena: Chrome conserva su nombre de escena no interactivo. En servicio usar `title` y `aria-label` «Publicar escena para jugadores»; en autónomo conservar «Abrir ventana de jugador». No añadir otra acción o ventana, ni modificar API, IPC, autenticación, sincronización o publicación automática. La consulta UX corresponde a `/root/ux_campaign_scene_menu`; la elección de conservar capacidades actuales queda resuelta por Q0019.

### Propiedad y secuencia

Una sola tarea frontend FIX-01 es suficiente; no hay contratos nuevos ni trabajo paralelo de backend. Su ownership cubre `WorkspaceHeader.tsx`, `WorkspaceChrome.test.tsx`, la regresión dirigida de `App.workspace.test.tsx`, `WorkspaceHeader.stories.tsx` y el cierre de versión/changelog. Solo si evidencia visual demuestra necesidad, ajustar CSS contextual de esa acción sin cambiar el layout general. El PM conserva spec, seguimiento y evidencia de aceptación. No revertir cambios ajenos.

Orden: restaurar visibilidad/etiqueta → adaptar regresiones y fixture de servicio en Storybook → verificaciones dirigidas → QA del PM con servicio sintético → cierre local. Patch previsto 3.31.1 si la base continúa en 3.31.0; comprobar la versión antes de editar y registrar fecha/tipo/resumen en CHANGELOG. No incluye DMG, commit, push o merge.

### Verificación proporcional y trazabilidad

| Contrato fuente | Verificación propuesta | Evidencia registrada en validacion-fix-01.md |
| --- | --- | --- |
| Criterio 3, delta de visibilidad y publicación explícita | Chrome muestra una acción Jugador en fila y en Herramientas; clic invoca callback una vez; montaje/presencia/apertura del menú no publica | WorkspaceChrome y App.workspace; recorrido API sintética DM→jugador |
| Criterios 1 y 2 | Cabecera/portal sin duplicados ni desbordes a 1440 y 390 px; menú de escena Chrome sigue plano | Storybook y capturas del producto |
| Criterios 4 y 5 | Tab/Enter/Escape, cierre y retorno de foco; busy y acceso suspendido impiden invocar la acción | Pruebas y recorrido de teclado |
| Q0019: conservar Electron | Servicio sigue publicando HTTP; autónomo conserva abrir/enfocar ventana local | Regresión de callback y smoke de ambos modos; no confundir mocks con prueba nativa |

```bash
pnpm exec vitest run src/renderer/src/components/workspace/WorkspaceChrome.test.tsx src/renderer/src/App.workspace.test.tsx
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build-storybook
```

El cambio no modifica autoridad ni almacenamiento: no requiere suites DB o migraciones como gate del parche. Si el diff amplía esas fronteras, detener esa ampliación y devolverla al PM. QA real debe observar la publicación solo después del clic con fixtures aisladas; no usar la base operativa. Los resultados de ejecución y recorrido, separados de esta planificación, están en [validacion-fix-01.md](validacion-fix-01.md).
