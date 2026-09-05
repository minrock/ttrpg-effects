# Plan de implementacion tecnica - 32 Player Viewport Preview

## 1. Resumen

- **Spec fuente:** `./specs/32-player-viewport-preview/spec.md`
- **Objetivo:** agregar un overlay privado en el canvas del DM que muestre el area visible real de Player View, usando el tamano/camara reportados por la ventana de jugador y el estado de sincronizacion existente.
- **Estado:** Implementada para revision.
- **Prioridad:** Alta.
- **Dependencias:** `specs/15-player-window/spec.md`, `specs/24-player-camera-control/spec.md`, `specs/30-map-compass/spec.md`, capa Pixi `playerCameraControls`, canales IPC de `player-window`.

## 2. Alcance

### Incluido

- Extender el reporte efimero de camara de Player View con dimensiones reales del viewport/canvas.
- Calcular en dominio la huella visible de Player View en coordenadas de mundo.
- Dibujar en DM un marco temporal al arrastrar la camara principal cuando Player View esta sincronizada.
- Mantener el marco 3 segundos despues de soltar la camara principal y luego aplicar fade-out.
- Dibujar un marco auxiliar azul permanente cuando Player View esta desincronizada.
- Ocultar previews al cerrar Player View, cambiar de mapa/escena o resincronizar.
- Integrar la orientacion cardinal de mapa para que el preview coincida con la rotacion aplicada en Player View.
- Agregar tests unitarios y de renderer para evitar regresiones.

### Fuera de alcance

- Cambiar el formato `.ttrpgscene`.
- Multiples ventanas de jugador.
- Controles nuevos en Player View.
- Editar la camara arrastrando el rectangulo.
- Calibracion de monitores externos o lectura nativa de pantalla fisica.
- Persistir preferencias del preview.

## 3. Decisiones tecnicas

- **Arquitectura:** la geometria y sanitizacion del reporte viven en `domain/player`; React orquesta estado efimero; Pixi solo renderiza overlays y recibe un view state ya preparado.
- **Persistencia:** no hay cambios de schema, migraciones ni version de archivo de escena.
- **IPC / Electron:** se reutiliza `player-window:camera-report`, extendiendo su payload de forma compatible con `viewport`. Main valida/sanitiza con funciones de dominio y reemite a ventanas DM.
- **Render / PixiJS:** el preview se agrega a la capa existente `playerCameraControls`, junto a los iconos de camara principal/auxiliar. El marco no captura eventos.
- **Coordenadas:** Player View reporta dimensiones en pixeles CSS; dominio convierte `width / zoom` y `height / zoom` a dimensiones de mundo. La rotacion por brujula se modela como vertices alrededor del centro.
- **Validacion:** dimensiones positivas y finitas, zoom normalizado, `mapId` opcional/validable, revision monotona ya existente.
- **Dependencias nuevas:** ninguna.

## 4. Diseno de dominio

### Tipos nuevos/modificados

- Modificar `PlayerCameraReport` en `src/domain/player/player-camera-control.ts`:
  - agregar `viewport?: PlayerViewportReport`.
- Crear tipos:
  - `PlayerViewportReport`
  - `PlayerViewportOrientation = "landscape" | "portrait"`
  - `PlayerViewportPreview`
  - `PlayerViewportPreviewCorner`

### Reglas puras

- `sanitizePlayerViewportReport(value)`:
  - acepta ancho/alto finitos mayores a cero;
  - normaliza `orientation` desde dimensiones si falta o no coincide;
  - conserva `devicePixelRatio` solo si es finito y positivo;
  - conserva `mapId` solo si es string no vacio.
- `calculatePlayerViewportPreview(camera, viewport, compassOrientation)`:
  - calcula el rectangulo visible en mundo para orientacion `0`;
  - rota los cuatro vertices alrededor del centro cuando la orientacion sea `90`, `180` o `270`;
  - devuelve centro, ancho/alto mundo, orientacion y corners.
- `shouldShowPrimaryViewportPreview(status)`:
  - true solo para `synchronized` o `pending` sin camara auxiliar efectiva desincronizada, segun el estado definido por App.
- `shouldShowAuxiliaryViewportPreview(status)`:
  - true para `desynchronized` con `effectiveCamera` y viewport compatible.

### Tests unitarios

- Sanitizacion rechaza dimensiones invalidas y acepta payloads legacy sin `viewport`.
- Calculo de preview landscape/portrait respeta aspect ratio.
- Calculo con zoom reduce/aumenta dimensiones de mundo correctamente.
- Orientaciones `90`, `180`, `270` devuelven vertices rotados sin cambiar centro.
- Reportes sin viewport no rompen sync status existente, pero no producen preview.

## 5. Cambios por capa

### `domain`

- Modificar `src/domain/player/player-camera-control.ts`.
- Actualizar `src/domain/player/player-camera-control.test.ts`.
- Si conviene separar complejidad, crear `src/domain/player/player-viewport-preview.ts` con su test propio.
- No tocar `scene-schema` ni `scene-document`.

### `application`

- Sin casos de uso nuevos.
- Mantener la logica como estado efimero de presentacion en renderer/main.

### `infrastructure`

- Sin cambios de repositorio, filesystem, SQLite ni assets.

### `main`

- Modificar `src/main/ipc/player-window-ipc.ts` para aceptar y reenviar el `viewport` extendido dentro de `PlayerCameraReport`.
- Asegurar que `getPlayerWindowState` conserve el ultimo reporte/camara si ya existe ese patron, o dejar que Player View reporte al montar si el estado actual solo cachea camara/comandos.
- No agregar canales genericos.

### `preload`

- Actualizar `src/preload/ttrpg-api.d.ts` si cambia la forma tipada de `PlayerCameraReport`.
- `src/preload/index.ts` no deberia requerir API nueva si se reutiliza `reportPlayerCamera`.

### `renderer`

- En `src/renderer/src/PlayerApp.tsx`:
  - medir el viewport visible del canvas/contenedor de Player View;
  - reportar `viewport` al montar, al resize y junto con reportes de camara;
  - usar `ResizeObserver` sobre el contenedor principal si esta disponible;
  - emitir reporte final al cambiar dimensiones;
  - no mostrar UI nueva.
- En `src/renderer/src/App.tsx`:
  - guardar ultimo `PlayerViewportReport` compatible en un ref/estado efimero;
  - limpiar ese estado cuando Player View cierra, cambia escena o cambia mapa activo;
  - incluir viewport y estado de preview en `setPlayerCameraControlState`;
  - detectar inicio/fin de drag de camara principal para activar preview temporal;
  - bloquear preview principal temporal cuando el estado sea desincronizado;
  - mantener preview auxiliar mientras `playerCameraSyncStatus === "desynchronized"`;
  - cancelar timers/fades al iniciar un nuevo drag o al cerrar Player View.
- En `src/renderer/src/components/MapViewport.tsx`:
  - extender `MapViewportHandle` si se requieren metodos explicitos para preview;
  - preferir pasar todo por `PlayerCameraControlViewState` para evitar APIs paralelas.

### `render`

- En `src/render/pixi/PixiViewport.ts`:
  - extender `PlayerCameraControlViewState` consumido por Pixi con datos de preview;
  - crear objetos `Graphics` para preview principal y auxiliar en `playerCameraControls`;
  - renderizar el preview como poligono/corners para soportar brujula;
  - usar borde de grosor estable en pantalla mediante `1 / camera.zoom`;
  - aplicar alpha/fade al preview principal desde un estado entregado por renderer o mediante timer interno controlado;
  - mantener `eventMode`/interactividad desactivada en los marcos;
  - limpiar/destruir graphics en teardown.

## 6. Plan de trabajo

1. Extender tipos y tests de dominio para `PlayerViewportReport` y calculo de preview.
2. Actualizar sanitizacion de `PlayerCameraReport` para aceptar `viewport` de forma compatible.
3. Medir Player View con `ResizeObserver` y agregar `viewport` a cada reporte de camara.
4. Guardar en `App.tsx` el ultimo viewport reportado y limpiar estados incompatibles por cierre/cambio de mapa.
5. Separar los eventos de drag de camara principal en `PixiViewport`/`MapViewport`: inicio, movimiento y fin.
6. Implementar estado temporal del preview principal en `App.tsx` con temporizador de 3 segundos y fade.
7. Extender `PlayerCameraControlViewState` con preview principal/auxiliar calculado o con datos suficientes para que Pixi calcule.
8. Dibujar previews en la capa `playerCameraControls`, con color principal discreto y auxiliar azul.
9. Ajustar reglas para no mostrar preview principal mientras exista camara auxiliar desincronizada.
10. Agregar tests de dominio y tests del flujo de estado donde sea viable.
11. Ejecutar validacion completa y smoke manual en `pnpm dev`.

## 7. Testing y verificacion

- **Unit tests:** `src/domain/player/player-camera-control.test.ts` o nuevo `player-viewport-preview.test.ts`.
- **Renderer tests:** cubrir que `PlayerApp` adjunta viewport a reportes cuando hay dimensiones validas, si el setup existente permite jsdom.
- **Pixi/domain-adjacent tests:** si el render directo es costoso, testear funciones puras de construccion de vertices y estados de visibilidad.
- **Regression tests:**
  - desincronizado muestra solo preview auxiliar;
  - resincronizado elimina preview auxiliar;
  - mover camara principal con auxiliar no activa preview principal.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** en `pnpm dev`, abrir Player View, redimensionarla horizontal/vertical, mover camara principal, desincronizar con pan/zoom local, recentrar, cambiar orientacion de brujula y verificar que el marco coincide visualmente.

## 8. Riesgos y mitigaciones

- **Riesgo:** el rectangulo puede no coincidir con Player View cuando el mapa esta rotado por brujula.
  **Mitigacion:** calcular corners rotados en dominio y validar con casos `0/90/180/270`; hacer smoke visual con brujula cambiada.
- **Riesgo:** reportar resize/camara puede saturar IPC.
  **Mitigacion:** reutilizar el throttle actual de reportes de camara y emitir final en resize/debounce.
- **Riesgo:** timers de fade pueden quedar vivos al desmontar viewport o cerrar Player View.
  **Mitigacion:** centralizar temporizadores en `App.tsx` con cleanup en efectos y limpieza al cerrar/cambiar escena.
- **Riesgo:** el borde del preview puede quedar demasiado grueso/fino con zoom extremo del DM.
  **Mitigacion:** escalar grosor por `1 / dmCamera.zoom` y limitarlo si hace falta.
- **Riesgo:** payloads legacy sin `viewport` pueden dejar estados inconsistentes.
  **Mitigacion:** mantener `viewport` opcional en sanitizacion y simplemente no dibujar preview hasta recibir dimensiones validas.

## 9. Criterios de aceptacion

- Player View reporta dimensiones reales al montar y al redimensionarse.
- El DM muestra preview principal al iniciar drag de camara principal cuando Player View esta sincronizada.
- El preview principal sigue el drag y desaparece con fade despues de 3 segundos al soltar.
- Si Player View esta desincronizada, el DM muestra preview auxiliar azul permanente.
- Mientras exista preview auxiliar, mover la camara principal no muestra preview principal temporal.
- Al resincronizar por comando o movimiento manual, desaparece el preview auxiliar.
- La orientacion de brujula se refleja en la geometria del preview.
- El preview no aparece en Player View y no captura eventos del DM.
- No se modifica `.ttrpgscene`.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/32-player-viewport-preview/spec.md`
- `specs/24-player-camera-control/spec.md` si durante implementacion se precisa actualizar el contrato historico de camara.
- `CHANGELOG.md` y `package.json` al cerrar la feature con version minor.

## 11. Checklist de cierre

- [ ] Implementacion completada dentro del alcance.
- [ ] Tests relevantes agregados o actualizados.
- [ ] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado en Electron si aplica.
- [ ] Documentacion actualizada si cambio una decision.
- [ ] Sin cambios de persistencia `.ttrpgscene`.
- [ ] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [ ] Sin dependencias nuevas no justificadas.
