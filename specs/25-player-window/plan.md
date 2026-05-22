# Plan de implementacion tecnica - 25 Ventana de jugador

## 1. Resumen

- **Spec fuente:** `./specs/25-player-window/25-player-window.md`
- **Objetivo:** Implementar una segunda ventana Electron read-only para jugadores que renderiza el mismo viewport del DM, sincroniza escena/camara/apuntadores en vivo y aplica diferencias visuales propias de jugador para niebla y tokens ocultos.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 01, 04, 08, 11, 12, 15, 22 y 24. Reutiliza el protocolo seguro de carga de imagenes de mapa/tokens y el asset interno del apuntador arcano.

## 2. Alcance

### Incluido

- Boton principal en toolbar DM para abrir/enfocar `Ventana de jugador`.
- Nueva `BrowserWindow` Electron secundaria, con preload seguro y renderer en modo jugador.
- Vista jugador 100% viewport, sin toolbar, sidebar, controles, menu contextual ni shortcuts de edicion.
- Sincronizacion DM -> jugador de:
  - escena completa;
  - mapa y URLs resueltas;
  - tokens y URLs resueltas;
  - camara;
  - eventos temporales de apuntador arcano.
- Vista jugador read-only y sin panning/zoom independiente.
- Control nuevo en seccion `Niebla` del DM para mostrar/ocultar la niebla en la vista DM.
- Render diferenciado de niebla:
  - jugador: bloqueo negro/opaco cuando `fogOfWar.enabled`;
  - DM: niebla visible solo si el nuevo control local esta activo, con opacidad util para control del DM.
- Filtrado de tokens ocultos en jugador.
- Indicador de ojo cerrado sobre tokens ocultos en DM, incluso sin seleccion.
- Reapertura de ventana jugador con snapshot actual completo.
- Cierre de ventana jugador sin afectar al DM.

### Fuera de alcance

- Camara independiente para jugador.
- Interaccion del jugador con mapa/tokens.
- Vistas distintas por jugador o por token.
- Sincronizacion remota/multiplayer.
- Persistir posicion/tamano de la ventana jugador.
- Cambios de schema `.ttrpgscene` obligatorios.
- Reglas nuevas de linea de vision por personaje.

## 3. Decisiones tecnicas

- **Arquitectura:** DM sigue siendo fuente de verdad. La ventana jugador recibe snapshots/eventos desde main/preload y renderiza con componentes compartidos en modo read-only.
- **Persistencia:** No se modifica `.ttrpgscene`. La preferencia `showDmFogOverlay` es estado local de UI del DM.
- **IPC / Electron:** Agregar canales especificos y tipados para abrir la ventana jugador, subscribirse a estado, publicar snapshots/camara y emitir apuntadores temporales. No exponer `ipcRenderer` ni APIs genericas.
- **Render / PixiJS:** Reutilizar `MapViewport` y `PixiViewport` con props de vista (`viewRole`, `readOnly`, `fogPresentation`, `hiddenTokenPolicy`). Evitar duplicar calculos de dominio.
- **Validacion:** Los payloads IPC deben usar tipos compartidos y validaciones basicas para escena/camara/eventos. La ventana jugador debe tolerar assets faltantes con placeholders/feedback no invasivo.
- **Dependencias nuevas:** Ninguna prevista.

## 4. Diseno de dominio

- **Entidades / tipos:**
  - `ViewportCameraSnapshot`: posicion y zoom de camara en espacio de pantalla/mundo segun modelo actual.
  - `PlayerWindowSnapshot`: escena, `mapImageUrl`, `tokenImageUrls`, camara y flags de vista.
  - `ViewportViewRole = "dm" | "player"`.
  - `FogPresentation = "dm-hidden" | "dm-preview" | "player-blocking"`.
  - `ArcanePointerBroadcast`: posicion, tamano, duracion y timestamp/nonce del apuntador.
- **Reglas puras:**
  - Filtrar tokens visibles para jugador.
  - Derivar presentacion de niebla por rol de vista.
  - Normalizar snapshot de camara para evitar valores no finitos.
- **Coordenadas / unidades:** La camara sincronizada debe mantener exactamente el pan/zoom del DM. El apuntador se emite en coordenadas de mundo y usa tamano basado en grilla.
- **Errores de dominio:** Si el snapshot de camara es invalido, conservar la ultima camara valida del jugador o caer a default.

## 5. Cambios por capa

### `domain`

- Crear tipos puros para sincronizacion de viewport/jugador, por ejemplo `src/domain/player/player-window.ts`.
- Agregar helpers testeables para:
  - derivar tokens renderizables por rol;
  - derivar presentacion de niebla;
  - validar/normalizar camara.
- Tests unitarios de filtrado de tokens ocultos y presentacion de niebla.

### `application`

- No se requiere persistencia nueva.
- Puede agregarse un servicio/hook de orquestacion en renderer para construir `PlayerWindowSnapshot` desde el estado actual del DM.
- Mantener resolucion de URLs de mapa/tokens fuera del dominio.

### `infrastructure`

- Reutilizar protocolos existentes para mapa y tokens en la ventana jugador.
- Confirmar que CSP/protocolos permiten los mismos assets en ambas ventanas.
- No agregar SQLite ni repositorios.

### `main`

- Agregar modulo de ventana jugador, por ejemplo `src/main/windows/playerWindow.ts`.
- Crear/enfocar `BrowserWindow` secundaria con configuracion segura:
  - `contextIsolation: true`;
  - `nodeIntegration: false`;
  - `sandbox: true` si no bloquea preload;
  - preload existente o preload especializado.
- Cargar la misma URL de renderer con query/hash de modo jugador, por ejemplo `?view=player`.
- Registrar IPC:
  - `player-window:open`;
  - `player-window:state`;
  - `player-window:camera`;
  - `player-window:pointer`;
  - evento de cierre opcional.
- Main debe rutear eventos DM -> ventana jugador y no aceptar eventos jugador -> DM que cambien estado.

### `preload`

- Exponer funciones especificas bajo `window.ttrpg`:
  - `openPlayerWindow()`;
  - `publishPlayerScene(snapshot)`;
  - `publishPlayerCamera(camera)`;
  - `publishPlayerPointer(event)`;
  - `onPlayerScene(handler)`;
  - `onPlayerCamera(handler)`;
  - `onPlayerPointer(handler)`.
- Retornar funciones de unsubscribe para listeners.
- No exponer canales genericos ni objetos Electron.
- Tipar payloads compartidos con renderer/main.

### `renderer`

- Detectar `view=player` en bootstrap o App y renderizar `PlayerApp`/modo jugador.
- En DM:
  - agregar boton `Ventana de jugador`;
  - agregar estado local `showDmFogOverlay`;
  - agregar control en accordion `Niebla`;
  - construir y publicar snapshot cuando cambie escena, mapa URL, tokens URLs o flags de vista relevantes;
  - publicar camara cuando `PixiViewport` reporte cambios;
  - publicar apuntador cuando se dispara desde DM.
- En jugador:
  - renderizar solo viewport full-screen;
  - recibir snapshot inicial/updates por IPC;
  - resolver/renderizar escena con tokens ocultos filtrados;
  - aplicar camara recibida;
  - reproducir apuntadores recibidos.

### `render`

- Extender `MapViewport`/`PixiViewport` con:
  - `viewRole`;
  - `readOnly`;
  - `fogPresentation`;
  - `showHiddenTokenIndicator`;
  - callback `onCameraChange`;
  - metodo `setCameraSnapshot`;
  - metodo/evento para disparar apuntador externo sin input local.
- En modo read-only:
  - ignorar pointerdown/pointermove/pointerup/wheel/contextmenu para edicion y zoom;
  - mantener resize y render normal.
- Renderizar ojo cerrado para tokens ocultos en DM.
- Filtrar tokens ocultos antes de renderizar jugador o dentro del adapter con politica explicita.
- Ajustar render de fog para soportar `player-blocking` negro/opaco y `dm-hidden`.

## 6. Plan de trabajo

1. Crear tipos/helpers de dominio para rol de vista, snapshot de jugador, camara y politicas de niebla/tokens.
2. Agregar tests de dominio para tokens ocultos, presentacion de fog y normalizacion de camara.
3. Extender `PixiViewport` para exponer cambios de camara, aceptar camara remota y soportar modo read-only.
4. Extender `MapViewport` con props de rol/read-only/fog/camara/apuntador externo.
5. Separar el renderer en modo DM y modo jugador usando query/hash de ventana.
6. Implementar `PlayerApp` o wrapper equivalente con viewport full-screen y estado recibido por IPC.
7. Agregar IPC y preload tipado para abrir ventana, publicar snapshot, publicar camara y publicar apuntador.
8. Implementar creacion/enfoque de `BrowserWindow` jugador en `main`.
9. Agregar boton `Ventana de jugador` en toolbar DM.
10. Agregar control `Mostrar niebla en vista DM` en sidebar `Niebla`.
11. Ajustar render de niebla para DM/player segun politica.
12. Agregar indicador de ojo cerrado en tokens ocultos en DM.
13. Conectar publicacion de snapshot/camara/apuntador desde DM hacia jugador.
14. Verificar cierre/reapertura de ventana jugador con estado actual.
15. Ejecutar validacion automatica y smoke manual en Electron.

## 7. Testing y verificacion

- **Unit tests:** Helpers de dominio para politicas de rol, tokens ocultos, fog presentation y camara.
- **Integration tests:** Si la estructura lo permite, tests de preload/IPC con handlers mockeados. Como minimo typecheck de payloads compartidos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, abrir ventana jugador, mover/zoomear DM, cargar mapa, cargar escena, ocultar token, activar niebla, disparar apuntador, cerrar/reabrir jugador.

## 8. Riesgos y mitigaciones

- **Riesgo:** Snapshot completo en cada cambio puede ser costoso.
  **Mitigacion:** Empezar con snapshot debounced/throttled; separar camara y apuntador como eventos ligeros.
- **Riesgo:** Camara DM/jugador puede desincronizarse por resize distinto entre ventanas.
  **Mitigacion:** Sincronizar estado de camara numerico y aplicar transform directamente; verificar en distintos tamanos de ventana.
- **Riesgo:** Loop de eventos si jugador emite cambios de camara.
  **Mitigacion:** En modo jugador no registrar handlers de input que muten camara ni publicar eventos hacia DM.
- **Riesgo:** Assets de mapa/tokens no cargan en segunda ventana.
  **Mitigacion:** Usar el mismo protocolo/URL resuelta que DM y validar CSP/protocol handlers en ambas ventanas.
- **Riesgo:** Fog/oscuro/darkvision divergen entre roles.
  **Mitigacion:** Modelar diferencias como `FogPresentation`, no como mutacion de escena.
- **Riesgo:** Apuntador pierde timing entre ventanas.
  **Mitigacion:** Emitir evento temporal simple y aceptar diferencia minima; usar timestamp solo si se necesita compensar latencia.

## 9. Criterios de aceptacion

- La toolbar DM tiene boton para abrir/enfocar `Ventana de jugador`.
- Se abre una segunda `BrowserWindow` real con solo viewport.
- La ventana jugador es read-only y no permite editar ni mover camara.
- Pan/zoom del DM se replica en jugador.
- Cambios de escena/mapa/tokens/efectos/luces/formas se reflejan en jugador.
- Tokens ocultos no aparecen en jugador.
- Tokens ocultos aparecen en DM con indicador de ojo cerrado aun sin seleccion.
- La seccion Niebla del DM tiene control local para mostrar/ocultar niebla en DM.
- La niebla activa se ve negra/opaca en jugador.
- El apuntador disparado en DM aparece en jugador con mismo lugar, tamano y duracion.
- Cerrar/reabrir la ventana jugador conserva el flujo y carga el estado actual.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `./specs/25-player-window/25-player-window.md`
- Este plan.
- Si durante la implementacion cambia la estrategia de query/hash o canales IPC, actualizar spec y plan.
- Si se cambia el comportamiento de niebla del DM, registrar la decision tambien en spec 08 si corresponde.
- Si se cambia el comportamiento del apuntador, registrar la decision tambien en spec 24 si corresponde.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
