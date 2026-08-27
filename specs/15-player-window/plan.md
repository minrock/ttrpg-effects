# Plan - Ventana de Jugador

Este documento describe de forma unificada el plan tecnico para implementar y mantener ventana de jugador, consolidando los pasos y criterios vigentes en el proyecto.

## Ventana de jugador

### 1. Resumen

- **Objetivo:** Implementar una segunda ventana Electron read-only para jugadores que renderiza la misma escena del DM, sincroniza escena/apuntadores en vivo, permite pan/zoom local independiente y aplica diferencias visuales propias de jugador para niebla y tokens ocultos.
- **Estado:** Implementado.
- **Prioridad:** Alta
- **Dependencias:** Specs 01, 04, 08, 11, 12, 15, 22 y 24. Reutiliza el protocolo seguro de carga de imagenes de mapa/tokens y el asset interno del apuntador arcano.

### 2. Alcance

#### Incluido

- Boton principal en toolbar DM para abrir/enfocar `Ventana de jugador`.
- Nueva `BrowserWindow` Electron secundaria, con preload seguro y renderer en modo jugador.
- Vista jugador 100% viewport, sin toolbar, sidebar, menu contextual ni shortcuts de edicion.
- Controles locales minimos en jugador para navegacion:
  - boton de bloquear/desbloquear zoom;
  - pan con barra espaciadora sostenida;
  - zoom con rueda/trackpad cuando zoom esta desbloqueado.
- Sincronizacion DM -> jugador de:
  - escena completa;
  - mapa y URLs resueltas;
  - tokens y URLs resueltas;
  - camara inicial opcional;
  - eventos temporales de apuntador arcano.
- Vista jugador read-only para edicion, pero con pan/zoom independiente del DM.
- Control nuevo en seccion `Niebla` del DM para mostrar/ocultar la niebla en la vista DM.
- Render diferenciado de niebla:
  - jugador: bloqueo negro/opaco cuando `fogOfWar.enabled`;
  - DM: niebla visible solo si el nuevo control local esta activo, con opacidad util para control del DM.
- Filtrado de tokens ocultos en jugador.
- Indicador de ojo cerrado sobre tokens ocultos en DM, incluso sin seleccion.
- Reapertura de ventana jugador con snapshot actual completo.
- Cierre de ventana jugador sin afectar al DM.

#### Fuera de alcance

- Interaccion del jugador con mapa/tokens.
- Vistas distintas por jugador o por token.
- Sincronizacion remota/multiplayer.
- Persistir posicion/tamano de la ventana jugador.
- Cambios de schema `.ttrpgscene` obligatorios.
- Reglas nuevas de linea de vision por personaje.

### 3. Decisiones tecnicas

- **Arquitectura:** DM sigue siendo fuente de verdad de la escena. La ventana jugador recibe snapshots/eventos desde main/preload y renderiza con componentes compartidos en modo read-only para edicion, pero conserva camara local independiente.
- **Persistencia:** No se modifica `.ttrpgscene`. La preferencia `showDmFogOverlay` es estado local de UI del DM.
- **IPC / Electron:** Agregar canales especificos y tipados para abrir la ventana jugador, subscribirse a estado, publicar snapshots de escena y emitir apuntadores temporales. La camara DM puede enviarse solo como valor inicial; no debe sincronizarse continuamente. No exponer `ipcRenderer` ni APIs genericas.
- **Render / PixiJS:** Reutilizar `MapViewport` y `PixiViewport` con props de vista (`viewRole`, `readOnly`, `navigationEnabled`, `fogPresentation`, `hiddenTokenPolicy`). Evitar duplicar calculos de dominio.
- **Validacion:** Los payloads IPC deben usar tipos compartidos y validaciones basicas para escena/camara/eventos. La ventana jugador debe tolerar assets faltantes con placeholders/feedback no invasivo.
- **Dependencias nuevas:** Ninguna prevista.

### 4. Diseno de dominio

- **Entidades / tipos:**
  - `ViewportCameraSnapshot`: posicion y zoom de camara en espacio de pantalla/mundo segun modelo actual.
  - `PlayerWindowSnapshot`: escena, `mapImageUrl`, `tokenImageUrls`, camara inicial opcional y flags de vista.
  - `ViewportViewRole = "dm" | "player"`.
  - `FogPresentation = "dm-hidden" | "dm-preview" | "player-blocking"`.
  - `ArcanePointerBroadcast`: posicion, tamano, duracion y timestamp/nonce del apuntador.
- **Reglas puras:**
  - Filtrar tokens visibles para jugador.
  - Derivar presentacion de niebla por rol de vista.
  - Normalizar snapshot de camara para evitar valores no finitos.
- **Coordenadas / unidades:** La camara de jugador se inicializa desde el DM si hay snapshot disponible, pero luego cambia localmente. El apuntador se emite en coordenadas de mundo y usa tamano basado en grilla.
- **Errores de dominio:** Si el snapshot de camara es invalido, conservar la ultima camara valida del jugador o caer a default.

### 5. Cambios por capa

#### `domain`

- Crear tipos puros para sincronizacion de viewport/jugador, por ejemplo `src/domain/player/player-window.ts`.
- Agregar helpers testeables para:
  - derivar tokens renderizables por rol;
  - derivar presentacion de niebla;
  - validar/normalizar camara.
- Tests unitarios de filtrado de tokens ocultos y presentacion de niebla.

#### `application`

- No se requiere persistencia nueva.
- Puede agregarse un servicio/hook de orquestacion en renderer para construir `PlayerWindowSnapshot` desde el estado actual del DM.
- Mantener resolucion de URLs de mapa/tokens fuera del dominio.

#### `infrastructure`

- Reutilizar protocolos existentes para mapa y tokens en la ventana jugador.
- Confirmar que CSP/protocolos permiten los mismos assets en ambas ventanas.
- No agregar SQLite ni repositorios.

#### `main`

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

#### `preload`

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

#### `renderer`

- Detectar `view=player` en bootstrap o App y renderizar `PlayerApp`/modo jugador.
- En DM:
  - agregar boton `Ventana de jugador`;
  - agregar estado local `showDmFogOverlay`;
  - agregar control en accordion `Niebla`;
  - construir y publicar snapshot cuando cambie escena, mapa URL, tokens URLs o flags de vista relevantes;
  - no publicar pan/zoom normal del DM hacia jugador despues de la apertura;
  - publicar apuntador cuando se dispara desde DM.
- En jugador:
  - renderizar solo viewport full-screen;
  - recibir snapshot inicial/updates por IPC;
  - resolver/renderizar escena con tokens ocultos filtrados;
  - aplicar camara inicial recibida solo al montar/abrir o cuando no exista camara local;
  - mantener camara local independiente para pan/zoom de jugador;
  - mostrar boton local de bloqueo de zoom;
  - permitir pan local con barra espaciadora sostenida;
  - permitir zoom local solo si esta desbloqueado;
  - reproducir apuntadores recibidos.

#### `render`

- Extender `MapViewport`/`PixiViewport` con:
  - `viewRole`;
  - `readOnly`;
  - `navigationEnabled` o propiedad equivalente para permitir pan/zoom sin edicion;
  - `fogPresentation`;
  - `showHiddenTokenIndicator`;
  - callback `onCameraChange`;
  - metodo `setCameraSnapshot`;
  - metodo/evento para disparar apuntador externo sin input local.
- En modo read-only:
  - ignorar pointerdown/pointermove/pointerup/contextmenu para edicion;
  - permitir pan/zoom solo si `navigationEnabled` esta activo;
  - pan local con barra espaciadora sostenida;
  - wheel/trackpad para zoom local solo si zoom no esta bloqueado;
  - mantener resize y render normal.
- Renderizar ojo cerrado para tokens ocultos en DM.
- Filtrar tokens ocultos antes de renderizar jugador o dentro del adapter con politica explicita.
- Ajustar render de fog para soportar `player-blocking` negro/opaco y `dm-hidden`.

### 6. Plan de trabajo

1. Crear tipos/helpers de dominio para rol de vista, snapshot de jugador, camara y politicas de niebla/tokens.
2. Agregar tests de dominio para tokens ocultos, presentacion de fog y normalizacion de camara.
3. Extender `PixiViewport` para exponer cambios de camara, aceptar camara remota y soportar modo read-only.
4. Extender `PixiViewport` para separar read-only de navegacion local (`navigationEnabled`) y soportar pan con barra espaciadora + zoom local bloqueable.
5. Extender `MapViewport` con props de rol/read-only/navigation/fog/camara inicial/apuntador externo.
6. Separar el renderer en modo DM y modo jugador usando query/hash de ventana.
7. Implementar `PlayerApp` o wrapper equivalente con viewport full-screen, estado recibido por IPC y control local de zoom lock.
8. Ajustar IPC/preload para evitar sincronizacion continua de camara DM -> jugador; conservar camara solo como inicial si aplica.
9. Implementar creacion/enfoque de `BrowserWindow` jugador en `main`.
10. Agregar boton `Ventana de jugador` en toolbar DM.
11. Agregar control `Mostrar niebla en vista DM` en sidebar `Niebla`.
12. Ajustar render de niebla para DM/player segun politica.
13. Agregar indicador de ojo cerrado en tokens ocultos en DM.
14. Conectar publicacion de snapshot/apuntador desde DM hacia jugador.
15. Verificar cierre/reapertura de ventana jugador con estado actual y camara local independiente.
16. Ejecutar validacion automatica y smoke manual en Electron.

### 7. Testing y verificacion

- **Unit tests:** Helpers de dominio para politicas de rol, tokens ocultos, fog presentation y camara.
- **Integration tests:** Si la estructura lo permite, tests de preload/IPC con handlers mockeados. Como minimo typecheck de payloads compartidos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, abrir ventana jugador, mover/zoomear DM y confirmar que jugador no se mueve, pan con barra espaciadora en jugador, bloquear/desbloquear zoom en jugador, cargar mapa, cargar escena, ocultar token, activar niebla, disparar apuntador, cerrar/reabrir jugador.

### 8. Riesgos y mitigaciones

- **Riesgo:** Snapshot completo en cada cambio puede ser costoso.
  **Mitigacion:** Empezar con snapshot debounced/throttled; separar apuntador como evento ligero y no incluir pan/zoom continuo del DM.
- **Riesgo:** El jugador podria perder la referencia del mapa al tener camara independiente.
  **Mitigacion:** Inicializar la camara desde el DM al abrir y permitir pan/zoom local con controles simples.
- **Riesgo:** Loop de eventos si jugador emite cambios de camara.
  **Mitigacion:** La camara de jugador nunca se publica hacia DM; sus cambios son locales al viewport jugador.
- **Riesgo:** Assets de mapa/tokens no cargan en segunda ventana.
  **Mitigacion:** Usar el mismo protocolo/URL resuelta que DM y validar CSP/protocol handlers en ambas ventanas.
- **Riesgo:** Fog/oscuro/darkvision divergen entre roles.
  **Mitigacion:** Modelar diferencias como `FogPresentation`, no como mutacion de escena.
- **Riesgo:** Apuntador pierde timing entre ventanas.
  **Mitigacion:** Emitir evento temporal simple y aceptar diferencia minima; usar timestamp solo si se necesita compensar latencia.

### 9. Criterios de aceptacion

- La toolbar DM tiene boton para abrir/enfocar `Ventana de jugador`.
- Se abre una segunda `BrowserWindow` real con solo viewport.
- La ventana jugador es read-only y no permite editar escena.
- Pan/zoom del DM no se replica continuamente en jugador.
- La ventana jugador permite pan local con barra espaciadora sostenida.
- La ventana jugador tiene boton local para bloquear/desbloquear zoom.
- La ventana jugador permite zoom local solo cuando el zoom esta desbloqueado.
- Cambios de camara en jugador no afectan al DM ni a la escena.
- Cambios de escena/mapa/tokens/efectos/luces/formas se reflejan en jugador.
- Tokens ocultos no aparecen en jugador.
- Tokens ocultos aparecen en DM con indicador de ojo cerrado aun sin seleccion.
- La seccion Niebla del DM tiene control local para mostrar/ocultar niebla en DM.
- La niebla activa se ve negra/opaca en jugador.
- El apuntador disparado en DM aparece en jugador con mismo lugar, tamano y duracion.
- Cerrar/reabrir la ventana jugador conserva el flujo y carga el estado actual.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `./specs/15-player-window/spec.md`
- Este plan.
- Si durante la implementacion cambia la estrategia de query/hash o canales IPC, actualizar spec y plan.
- Si se cambia el comportamiento de niebla del DM, registrar la decision tambien en niebla de guerra si corresponde.
- Si se cambia el comportamiento del apuntador, registrar la decision tambien en apuntador arcano si corresponde.
- Este ajuste reemplaza la decision previa de sincronizacion continua de camara DM -> jugador por camara local independiente del jugador.

### 11. Checklist de cierre

- [x] Ajuste de camara independiente implementado.
- [x] Controles locales de jugador implementados.
- [x] Tests existentes ejecutados; no se agregaron tests nuevos por ser cambio de interaccion de viewport.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada para el nuevo comportamiento.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
## Extension: highlights de areas informativas

- Construir snapshots publicos mediante una funcion de dominio que vacie etiquetas y anotaciones privadas.
- Validar y sanitizar el payload minimo en main antes de reenviarlo por un canal preload especifico.
- Renderizar y limpiar highlights temporales en una capa superior a fog sin publicar la escena completa.
