# Tareas — retirada del acceso flotante de contadores

Fuente: [spec, ajuste 2026-11-17](spec.md#retirada-del-acceso-flotante-de-gestión--2026-11-17) y [plan incremental](plan.md#ajuste-retirada-del-acceso-flotante-de-gestión--2026-11-17). Plan ejecutado por frontend y revisado por PM; cierre local con evidencia, sin integración Git.

## FIX-01 — Retirar el acceso flotante duplicado de contadores

- **Objetivo:** quitar el botón `Settings2` sobre el mapa y la superficie vacía sin contadores, conservando gestión desde cabecera y barras funcionales.
- **Criterios:** FIX01-CA01, FIX01-CA02 y FIX01-CA03.
- **Estado:** implementada y validada localmente en3.32.2; [evidencia](validacion-fix-01.md). Rama autorizada `fix/retirar-control-flotante-contadores`, sin commit, push ni merge.
- **Responsable:** `/root/frontend_remove_counter_access`, despachado por `/root` (PM). No está solo en el checkout: preservar todos los cambios anteriores y ajenos, sin restauraciones globales ni Git de escritura.
- **Escritura de producto:** `src/renderer/src/components/counters/SceneCountersOverlay.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/styles.css`, `src/stories/compositions/workspace/SceneCounterBar.stories.tsx`; al cierre coordinado, `package.json` y `CHANGELOG.md`.
- **Lectura:** `WorkspaceHeader.tsx` y `WorkspaceChrome.test.tsx`, `SceneCounterManagerModal.tsx`, `PlayerApp.tsx`, estilos de workspace/jugador y fixtures de las historias. El callback de cabecera abre el mismo modal y es el acceso que debe conservarse.
- **Propiedad documental:** PM escribe spec/estado/evidencia; TL mantiene este plan/desglose. No requiere backend ni contrato nuevo.

### Pasos y entregables

1. Retirar botón/import/prop `onManage` del overlay y sus dos consumidores. Retornar `null` para colección vacía, conservando el orden de hooks.
2. Limpiar solo selectores CSS exclusivos del botón eliminado; mantener controles `+/-`, ojo/publicación, estilos y posiciones de barras.
3. Mantener la historia productiva GestiónDM interactiva y VistaJugador de lectura sin callback muerto; comprobar también el estado vacío mediante la composición disponible.
4. Ejecutar `pnpm typecheck`, ESLint focal y `git diff --check`; reutilizar `WorkspaceChrome.test.tsx` si se ejecuta regresión. No añadir tests que repitan esta retirada visual reversible.
5. Comunicar al PM QA real: sin botón/overlay vacío, acceso Contadores en cabecera amplia y Herramientas compactas, barras y lectura de jugador conservadas. Diferenciar navegador sintético de smoke Electron. Registrar patch/changelog según versión vigente al cierre.

### Dependencias y exclusiones

Inicio: delta fuente aceptado y permiso Git resuelto por PM antes del despacho. No tiene predecesora de implementación ni paralelismo de producto útil. Sin cambios en WorkspaceHeader, PlayerApp, modelo/valores de contadores, filtros públicos, persistencia, API, IPC, PixiJS, DB, migraciones, dependencias o datos operativos. Si aparece un defecto adicional, reportarlo al PM antes de ampliar scope.

### Cierre observable

El mapa no muestra «Administrar contadores de escena» ni región de contadores vacía; Contadores de cabecera sigue abriendo el gestor; barras DM y jugador mantienen sus acciones/lectura. Consumo y CSS quedan coherentes, checks proporcionados pasan y evidencia/patch quedan registrados. Un límite de plataforma no ejecutada debe declararse; cierre local no implica integración Git.

## Cierre PM — 2026-11-17

FIX01-CA01–03 comprobados con delta, regresiones existentes y QA IAB. Historia ajustada a contexto workspace con superficie local de320px para mostrar el overlay sin recortes. 42 pruebas, typecheck, lint focal y builds web/Storybook aprobados; sin smoke nativo Electron. [Evidencia y límites](validacion-fix-01.md). Sin integración Git.
