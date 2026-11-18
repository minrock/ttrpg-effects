# Contexto técnico del frontend

Inspección: 2026-11-13, producto 3.27.2. Consultar versiones actuales en `package.json` y revalidar este mapa al iniciar cada tarea. SDD conserva la autoridad funcional.

## Stack y entradas

| Área | Implementación comprobada | Fuente |
| --- | --- | --- |
| Interfaz | React 19, TypeScript estricto, CSS del proyecto, Lucide | `package.json`, `src/renderer/src/styles.css` |
| Navegador | Vite 7, ServiceApp, editor React compartido | `src/web/main.tsx`, `src/web/ServiceApp.tsx`, `src/web/GameEditor.tsx` |
| Electron | Electron 39, electron-vite 4, main/preload/renderer separados | `electron.vite.config.ts`, `src/main/index.ts`, `src/preload/index.ts` |
| Clientes | ClientProvider, TtrpgClient y capacidades tipadas | `src/renderer/src/client/ClientProvider.tsx`, `src/shared/api/client.ts` |
| Mapa | PixiJS 8.18, adaptador React y motor encapsulado | `src/renderer/src/components/MapViewport.tsx`, `src/render/pixi/PixiViewport.ts` |
| Dados | Three.js, simulación Cannon y worker; integración existente independiente | `src/render/three/dice/`, `src/infrastructure/dice/` |
| Componentes | Radix React Switch y controles propios; no hay un kit universal que sustituya todos los componentes | `src/renderer/src/components/annotations/MapAnnotationsSection.tsx`, `src/renderer/src/components/workspace/` |
| Texto enriquecido | Tiptap, Markdown y sanitización existente | `src/renderer/src/components/aside/NoteEditor.tsx`, `src/renderer/src/components/aside/markdown.ts` |
| Red/recuperación | HTTP + SSE sobre fetch, cancelación, IndexedDB | `src/infrastructure/browser/`, `src/application/services/draft-coordinator.ts` |
| Pruebas | Vitest, jsdom, fake-indexeddb y pruebas junto al código | `package.json` |

## Fronteras de plataforma

- `src/renderer/src/App.tsx` y `src/renderer/src/PlayerApp.tsx` contienen las vistas DM/jugador. Reutilizar sus componentes sin seguir concentrando responsabilidades allí.
- Electron autónomo recibe la API tipada mediante preload. `ClientProvider` es el punto de acceso al cliente/capacidades; los componentes compartidos no deben importar Electron o Node.
- Navegador y Electron servicio usan el cliente HTTP. `src/main/service-app.ts` crea una ventana aislada sin preload privilegiado; conserva borradores por origen y limpia credenciales según su ciclo de vida.
- El adaptador `MapViewport` mantiene la instancia de `PixiViewport` y aplica cambios mediante métodos. El motor posee recursos GPU, eventos, ticker y resize: verificar creación/cancelación/destrucción, especialmente al cambiar escenas o abrir jugador.
- Revisar los cargadores `src/render/pixi/map-image-resource.ts` antes de modificar propiedad/vida de texturas. No liberar recursos compartidos indiscriminadamente.
- `src/web/main.tsx` incluye la adaptación de Pixi para conservar CSP sin generación dinámica; no deducir que el nombre del import autoriza añadir `unsafe-eval` a CSP.

## Ejemplos que buscar antes de construir componentes

| Necesidad | Ejemplos existentes |
| --- | --- |
| Activación binaria | `src/renderer/src/components/annotations/MapAnnotationsSection.tsx`; buscar también Switch.Root en App.tsx |
| Barra/herramientas/slider de niebla | `src/renderer/src/components/workspace/WorkspaceHeader.tsx`, `src/renderer/src/components/workspace/WorkspaceTools.tsx` |
| Menús desplegables | `src/web/HeaderDropdown.tsx` y su test |
| Contextual de áreas | `src/renderer/src/components/workspace/AreaContextToolbar.tsx` y su test |
| Diálogos/foco | `src/renderer/src/components/aside/ModalBackdrop.tsx`, `src/web/dialogs.tsx`, `src/renderer/src/client/dialog-focus.ts` |
| Paneles laterales | `src/renderer/src/components/aside/DmAsidePanel.tsx`, `src/renderer/src/components/aside/PlayerAsideOverlay.tsx`, `src/renderer/src/components/dice/RightSidebarTabs.tsx` |
| Recuperación/errores | `src/web/DraftRecovery.tsx`, `src/renderer/src/components/aside/FeedbackAlert.tsx` |
| Laboratorio visual | `src/renderer/src/ui-lab/`; sirve como referencia, no certifica el recorrido del producto |

Los ejemplos no garantizan accesibilidad completa ni sustituyen la decisión UX. Reutilizar semántica y comportamiento compatibles; si difieren, explicar el motivo y acordar la variante antes de implementarla.

## SDD y validación

Leer `SDD/README.md`, `SDD/estado-actual.md`, `SDD/arquitectura.md` y el flujo SDD. Resolver desde el índice las specs afectadas: mapa/grilla/luces/niebla y Player View del catálogo; 41–45 para clientes; 51 y 54 para acceso/cabecera; 55 para anotaciones; 56 para cámara/foco; 57 para áreas; 58 para guardado/recuperación. No reintroducir contratos sustituidos por una spec posterior.

Usar `pnpm typecheck`, `pnpm lint` y pruebas dirigidas. Para suite amplia: `pnpm test --exclude '**/.local/**' --maxWorkers 4`. `pnpm build:web` construye navegador; `pnpm build` construye Electron. Los datos/copies privados de `.local/` y las bases reales no son fixtures.

Registrar qué se verificó en Chrome/navegador, Electron autónomo y Electron servicio. Para cambios que afecten canvas, verificar geometría, escala/píxeles, input, capas y liberación de recursos en render real. Comparar memoria/listeners/montajes cuando se investigue un rerender o fuga; no interpretar mocks Pixi o jsdom como prueba de fluidez/GPU. El empaquetado DMG corresponde al cierre autorizado del producto.

## Coordinación con UI/UX

El interlocutor es el perfil `ui_ux`, definido en [ui_ux.toml](agents/ui_ux.toml), con GPT-6 Sol / high. El hilo principal en rol PM debe proporcionar el identificador real de la instancia activa de UI/UX para mantener consultas sucesivas; nombre de perfil e ID de instancia son distintos.

Consultar cualquier duda UI/UX, especialmente componentes, estados, accesibilidad, apariencia, duplicidad y ubicación de menús. El [catálogo SDD](../SDD/guias/ui-ux/catalogo.md) conserva los acuerdos; UI-001 establece switch consistente para encendido/apagado. Reutilizar decisiones vigentes sin repetir aprobaciones; reabrirlas si cambia el contexto.

`ui_ux` mantiene documentación y prototipos; `frontend_builder` implementa producción y devuelve evidencia para actualizar las fichas. Si falta una decisión, coordinar con pm y avanzar en trabajo independiente. No inventar una aprobación ni asumir que un HTML prototipo valida React/Electron/PixiJS.
