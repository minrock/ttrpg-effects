# Plan - Mapa y Grilla

## Extension hexagonal - cierre 1.10.0

Rama de implementacion: `feature/hexagonal-grid`. Extension aceptada el 2026-09-02 para commit, merge a main y version 1.10.0. No forma parte del cierre historico 1.9.0.

- [x] Agregar `GridLayout`, default/schema y selector segmentado, conservando presets, grosor y deteccion de escena vacia.
- [x] Incorporar `honeycomb-grid` 4.1.5 (MIT, sin dependencias de runtime) para rounding cubico y distancia; encapsularlo en `domain/grid/hex-grid.ts`.
- [x] Centralizar celdas, vertices, centros, vecinos, coronas, contornos y hit testing en `domain/grid/grid-cell.ts`.
- [x] Adaptar `grid-window.ts` con presupuesto de 8192 hexagonos visibles con margen; generador de tres aristas propias y cache de un solo Graphics.
- [x] Adaptar snap al vertice superior izquierdo; mediciones/caminos al centro; mantener movimientos libres y datos historicos.
- [x] Pasar la geometria completa a preview y confirmacion de herramientas, tokens, agua y apuntador.
- [x] Adaptar fuego, luces derivadas, darkvision y anotaciones al poligono persistido por celda; sin conversion implicita al cambiar layout.
- [x] Incluir layout en firmas relevantes, sin invalidacion de mascaras ni cargas de assets al alternar solo la topologia.
- [x] Agregar regresiones de dominio, schema/round trip, snapshot jugador, cache Pixi y render de fuego.
- [x] Aceptacion del usuario para cierre de la funcionalidad y del ajuste de borrado de areas.
- [x] Version 1.10.0, changelog y documentacion actualizados; commit y merge a main expresamente autorizados.

Pruebas reproducibles: `hex-grid.test.ts`, `measurement.test.ts`, `shapes.test.ts`, `tokens.test.ts`, `map-annotations.test.ts`, `scene-schema.test.ts`, `player-window.test.ts`, `grid-render-cache.test.ts` y `fire-pattern-render.test.ts`. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` antes de entregar.

Validacion de rama (2026-09-02): 343 tests en 48 archivos, typecheck, lint y build correctos. Build advierte sobre directivas `use client` ignoradas de Radix/Lucide, sin impedir compilacion. Smoke en navegador: selector y grosores, camino de 15 ft centrado, fuego por hexagonos, area de informacion guardada y trasladada, y conservacion de su forma al alternar topologia; sin errores de consola. Guardado nativo/recarga y DM + Player View completos quedan para prueba del usuario; schema y snapshot estan cubiertos automaticamente.

Validacion final con borrado de areas: 350 tests en 49 archivos, typecheck, lint y build correctos. Papelera, Backspace sobre canvas, bloqueo y aislamiento por ID verificados (detalle en plan 22). El usuario autoriza cierre 1.10.0; no se declara un smoke nativo adicional de guardado/recarga y dos ventanas. Generar instaladores macOS desde main mediante `./scripts/build-dmg.sh`, que toma version de package.json. Mantener pendientes historicos ajenos a este cambio sin marcar como ejecutados.

Smoke de esta extension: alternar Cuadrada/Hexagonal; crear camino de tres pasos y comprobar 15 ft / 4.5 m; pintar fuego y terreno, moverlos y verificar vertices/coronas; cambiar grosor; pan/zoom fuera del mapa; guardar y abrir en jugador sin acciones adicionales del DM. La niebla mantiene su trazo libre y sus texturas acotadas al viewport. Documentacion relacionada: specs/planes 01, 03, 05, 06, 07, 08, 10, 11, 13, 14, 15, 17 y 22.

Este documento describe de forma unificada el plan tecnico para implementar y mantener mapa y grilla, consolidando los pasos y criterios vigentes en el proyecto.

## Carga de Mapa y Calibracion de Grilla

### 1. Resumen

- **Objetivo:** Permitir cargar una imagen de mapa, renderizarla en PixiJS, superponer una grilla cuadrada o hexagonal configurable y calibrar el tamano fisico de casilla por arrastre o valor numerico.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** bootstrap de la app, motor visual, persistencia de escena, interaccion y navegacion, PixiJS viewport, IPC/preload seguro, formato `.ttrpgscene`, dialogos nativos.

### 2. Alcance

#### Incluido

- Cargar imagen local desde dialogo nativo.
- Aceptar PNG, JPG/JPEG, WEBP y HEIC cuando el runtime lo soporte.
- Mostrar mapa centrado en el lienzo PixiJS.
- Persistir `map.imagePath`, `map.position`, `map.scale` y configuracion de grilla en el estado de escena.
- Dibujar grilla cuadrada o hexagonal sobre el mapa.
- Encender/apagar grilla.
- Ajustar opacidad de grilla.
- Ajustar `cellSizeWorld` por valor numerico.
- Calibrar por arrastre mediante un control visible sobre el mapa solo cuando el modo `Ajustar grilla` esta activo.
- Activar/desactivar `Ajustar grilla` desde el sidebar derecho con un switch accesible.
- Activar/desactivar `Ajustar grilla` con shortcut `Cmd+G` en macOS y `Ctrl+G` en Windows/Linux.
- Mostrar el input numerico de `cellSizeWorld` solo mientras `Ajustar grilla` esta activo.
- Renderizar el handle de calibracion en una capa superior a niebla/oscuridad para que siempre sea usable.
- Ajustar `map.scale` desde un control porcentual `Escala mapa` visible solo con mapa cargado.
- Aplicar presets iniciales: 1 inch, 2.5 cm, 5 ft, 1.5 m por casilla.
- Bloquear escala/zoom desde UI para proteger la calibracion.
- Guardar/cargar mapa y grilla en `.ttrpgscene`.
- Mostrar errores recuperables para imagen no soportada o ruta rota.

#### Fuera de alcance

- Otras topologias u orientaciones hexagonales distintas de vertice arriba.
- Calibracion avanzada multi-punto.
- Correccion de perspectiva.
- Conversion interna HEIC garantizada en todas las plataformas.
- Copiar imagenes dentro del `.ttrpgscene`.
- Biblioteca local de assets o SQLite.
- Medicion tactica exacta sobre la grilla; queda para specs siguientes.

### 3. Decisiones tecnicas

- **Arquitectura:** El dominio define tipos/reglas de mapa y grilla. La aplicacion orquesta seleccion de imagen y actualizacion de escena. Infraestructura/main accede al filesystem y dialogos. PixiJS solo renderiza mapa/grilla a partir de estado serializable.
- **Persistencia:** Se reutiliza `SceneDocumentV1`. El mapa guarda ruta local sin copiar archivo y conserva `map.position` + `map.scale`. La grilla guarda valores ya existentes del schema: `enabled`, `locked`, `cellSizeWorld`, `opacity`, `unit`, `distancePerCell`, `metricDistancePerCell`.
- **IPC / Electron:** Agregar una API especifica `map:open-image` en main/preload. No exponer filesystem ni dialogos genericos. La URL de imagen se resuelve via protocolo custom `map-asset://` registrado en el proceso principal (ver decision tecnica resuelta mas abajo).
- **Render / PixiJS:** Extender `PixiViewport` para cargar textura usando `Assets.load(url)` de PixiJS v8 (API canonica). Renderizar mapa en capa `map` y grilla en capa `grid`. Mantener conversion pantalla <-> mundo centralizada. El handle de calibracion se dibuja en la capa superior de seleccion solo durante `Ajustar grilla`, para no quedar debajo de fog/darkness. El CSP del renderer debe incluir `unsafe-eval` para la compilacion de shaders de PixiJS v8.
- **Validacion:** Validar extension, existencia de archivo y soporte de carga. HEIC debe intentar cargarse si Chromium/sistema lo permite; si falla, mostrar mensaje claro y recuperable.
- **Dependencias nuevas:** `@radix-ui/react-switch` para el switch accesible de `Ajustar grilla`. El protocolo `map-asset://` usa modulos nativos de Electron (`protocol`, `net`).

#### Decisiones tecnicas resueltas durante implementacion

**Problema: `file://` URL bloqueada por politica de origen cruzado.**
El renderer en desarrollo se sirve desde `http://localhost` (electron-vite). Chromium bloquea carga de recursos `file://` desde origenes HTTP. Se evaluaron dos alternativas:
- _Data URL (base64)_: funciona pero transfiere imagenes grandes completas por IPC, causando latencia y uso de memoria innecesario.
- _Protocolo custom `map-asset://`_ (solucion adoptada): main registra el esquema con `protocol.registerSchemesAsPrivileged` antes del evento `ready` y lo maneja en `whenReady` con `protocol.handle`, redirigiendo internamente a `net.fetch(file://...)`. El renderer recibe una URL `map-asset:///ruta/imagen.jpg` construida con `pathToFileURL` + reemplazo de esquema, que funciona en cualquier origen sin limitaciones de tamano.

**Problema: PixiJS v8 lanza error `unsafe-eval` al compilar shaders.**
PixiJS v8 usa `new Function()` internamente para compilacion de shaders GLSL. El CSP inicial (`script-src 'self'`) lo bloqueaba. Solucion: agregar `'unsafe-eval'` a `script-src` en el meta CSP del `index.html` del renderer. Ademas se agregaron `map-asset:` y `blob:` a `img-src`, `connect-src` y `worker-src` para permitir que `Assets.load` acceda al protocolo custom. PixiJS tambien ejecuta un check interno `checkImageBitmap` con un `data:image/png` de 1x1; por eso `connect-src` debe incluir `data:` aunque los mapas reales usen `map-asset:`.

**Problema: `Sprite.from(HTMLImageElement)` no renderiza en PixiJS v8.**
La API `Sprite.from(htmlImageElement, skipCache)` herencia de v7 no crea correctamente la textura GPU en v8. Solucion: usar `Assets.load(url)` que devuelve una `Texture` completa, y crear el sprite con `new Sprite(texture)`. Se agrego `Assets.unload(url)` al cambiar de imagen para liberar memoria de GPU.

**Problema: overlay de oscuridad no cubria el mapa completo.**
`drawDarknessLayer()` se llamaba antes de que `drawMapImage()` completara su carga asincrona, por lo que `mapSprite` era `null` y se usaban los bounds de fallback (mas chicos que la imagen). Solucion: llamar `drawDarknessLayer()` dentro de `drawMapImage()` despues de asignar `this.mapSprite`, igual que `drawGrid()`.

### 4. Diseno de dominio

- **Entidades / tipos:** Crear/reforzar `MapImageState`, `GridState`, `GridCalibrationState`, `GridPreset`, `MapLoadResult`.
- **Reglas puras:** Calcular lineas de grilla visibles, aplicar presets, cambiar opacidad con clamp `0..1`, actualizar `cellSizeWorld`, normalizar `map.scale`, bloquear/desbloquear escala, validar tamanos positivos.
- **Coordenadas / unidades:** Separar `map.scale`, `camera.zoom` y `grid.cellSizeWorld`. La calibracion modifica tamano de celda/grilla, no posicion de camara. El mapa y la grilla viven en coordenadas de mundo.
- **Errores de dominio:** Extension no soportada, imagen inexistente, imagen no decodificable, `cellSizeWorld <= 0`, opacidad fuera de rango.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/map/map-image.ts` para estado/tipos de imagen de mapa.
- Agregar sanitizacion de escala visual del mapa (`25%..400%`) y tests.
- Crear o ampliar `src/domain/grid/grid.ts` para estado, presets, opacidad, calibracion y validaciones.
- Agregar tests unitarios para presets, clamp de opacidad, cambio numerico de celda y bloqueo de escala.
- Mantener compatibilidad con `SceneDocumentV1`.

#### `application`

- Crear caso de uso `openMapImageUseCase` o servicio equivalente que reciba resultado de infraestructura y produzca actualizacion de escena.
- Crear funciones para convertir estado de mapa/grilla a `SceneDocument`.
- Mantener errores serializables para UI.

#### `infrastructure`

- Implementar seleccion de imagen local con dialogo nativo.
- Filtrar extensiones `png`, `jpg`, `jpeg`, `webp`, `heic`.
- Verificar existencia del archivo con `fs.access`.
- Construir `imageUrl` como `map-asset://` usando `pathToFileURL(imagePath).toString().replace('file:', 'map-asset:')`.
- No copiar ni modificar el archivo original.

#### `main`

- Registrar IPC `map:open-image`.
- Usar `dialog.showOpenDialog`.
- Devolver `{ ok: true, imagePath, imageUrl }` o `{ ok: false, error }`.
- No leer imagenes arbitrarias desde payload del renderer.
- Registrar esquema `map-asset` con `protocol.registerSchemesAsPrivileged` antes del evento `ready`, con privilegios `{ bypassCSP: true, corsEnabled: true, secure: true, stream: true, supportFetchAPI: true }`.
- Manejar el protocolo en `whenReady` con `protocol.handle('map-asset', req => net.fetch(req.url.replace('map-asset:', 'file:')))`.

#### `preload`

- Exponer `window.ttrpg.openMapImage()`.
- Actualizar tipos de `TtrpgApi`.
- Mantener API pequena y por accion.

#### `renderer`

- Agregar boton `Cargar mapa`.
- Agregar controles compactos de grilla: visible, opacidad, switch `Ajustar grilla`, tamano de celda visible solo en ese modo, `Escala mapa`, presets, bloqueo de escala.
- Mostrar estado visible de mapa cargado o error recuperable.
- Actualizar escena en memoria al cargar mapa o cambiar grilla.
- Guardar/cargar `.ttrpgscene` con mapa/grilla actualizados.
- Evitar paneles grandes que tapen el mapa.

#### `render`

- Extender `PixiViewport` para recibir `map` y `grid` como props/estado.
- Cargar textura con `Assets.load(imageUrl)` y crear sprite con `new Sprite(texture)` (API canonica PixiJS v8).
- Liberar textura anterior con `Assets.unload(url)` al cambiar imagen.
- Renderizar mapa centrado en capa `map`.
- Renderizar la geometria elegida en capa `grid` con opacidad configurable.
- Implementar handle/overlay de calibracion por arrastre visible/interactivo solo en modo `Ajustar grilla`.
- Dibujar el handle de calibracion en la capa de seleccion para quedar por encima de niebla/oscuridad.
- Respetar bloqueo de zoom/escala en rueda.
- Al cambiar `map.scale`, actualizar sprites de mapa y color-map, recalcular grilla, darkvision, oscuridad y fog sin modificar `camera.zoom`.
- Llamar `drawDarknessLayer()` dentro de `drawMapImage()` tras asignar el sprite, para que los bounds del overlay sean correctos.
- Mantener interacciones existentes de interaccion y navegacion.

#### `renderer/index.html`

- Actualizar CSP meta tag: agregar `'unsafe-eval'` a `script-src` (requerido por PixiJS v8 para compilacion de shaders).
- Agregar `map-asset: blob:` a `img-src`; agregar `data: map-asset: blob:` a `connect-src`; agregar `blob:` a `worker-src`.
- Eliminar `file:` de `img-src` (reemplazado por `map-asset:`).

### 6. Plan de trabajo

1. Crear tipos/reglas de dominio para mapa, grilla, presets y calibracion.
2. Agregar tests unitarios de grilla, presets, opacidad y valores invalidos.
3. Crear IPC `map:open-image` en main y preload.
4. Extender estado de escena/UI para cargar mapa y actualizar grilla.
5. Extender `PixiViewport` para renderizar textura de mapa y grilla.
6. Agregar controles React compactos: cargar mapa, grilla visible, opacidad, switch `Ajustar grilla`, celda condicional, presets, bloqueo.
7. Implementar calibracion por arrastre con un handle visible solo en modo `Ajustar grilla`.
8. Conectar guardar/cargar `.ttrpgscene` para restaurar mapa/grilla.
9. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y smoke manual con `pnpm dev`.
10. (Resuelto en debug) Registrar protocolo `map-asset://` en main para servir archivos locales sin restriccion de origen cruzado.
11. (Resuelto en debug) Agregar `'unsafe-eval'` y directivas `map-asset:` al CSP del renderer para PixiJS v8.
12. (Resuelto en debug) Reemplazar `loadImageElement + Sprite.from` por `Assets.load + new Sprite` para carga correcta de texturas en PixiJS v8.
13. (Resuelto en debug) Corregir bounds del overlay de oscuridad llamando `drawDarknessLayer()` tras la carga asincrona del mapa.
14. (Resuelto en iteracion posterior) Mover activacion de calibracion a un switch del sidebar y shortcut `Cmd/Ctrl+G`; ocultar input/handle fuera del modo y renderizar handle por encima de fog.
15. (Resuelto en iteracion posterior) Agregar control `Escala mapa` con slider, input porcentual y reset 100%, modificando `scene.map.scale` y normalizando el valor.

### 7. Testing y verificacion

- **Unit tests:** Presets de grilla, validacion de opacidad, validacion de `cellSizeWorld`, sanitizacion de `map.scale`, conversion de estado a escena, bloqueo de escala.
- **Integration tests:** Casos de uso de carga de mapa con infraestructura fake.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar PNG/JPG/WEBP, verificar mapa centrado, cambiar opacidad, activar `Ajustar grilla` con switch y `Cmd/Ctrl+G`, cambiar tamano de celda, aplicar presets, calibrar por arrastre con niebla activa, bloquear escala, intentar zoom con rueda y guardar/cargar escena.

### 8. Riesgos y mitigaciones

- **Riesgo:** HEIC no carga de forma consistente entre plataformas.
  **Mitigacion:** Aceptar extension, intentar carga y mostrar error claro si Chromium/sistema no decodifica. Documentar limitacion antes de agregar conversion pesada.
- **Riesgo:** Confundir `camera.zoom`, `map.scale` y `grid.cellSizeWorld`.
  **Mitigacion:** Mantener tipos separados y tests de reglas de grilla/calibracion.
- **Riesgo:** Rutas locales no renderizan por restricciones de seguridad. _(Materializado y resuelto)_
  **Mitigacion:** `file://` desde origen HTTP bloqueado por Chromium. Se resolvio con protocolo custom `map-asset://` registrado con `corsEnabled: true` y `bypassCSP: true`. La URL se construye con `pathToFileURL` para manejar correctamente espacios y caracteres especiales en rutas.
- **Riesgo:** La grilla cubre demasiado el mapa o afecta rendimiento.
  **Mitigacion:** Opacidad configurable y render de lineas calculado por viewport visible.
- **Riesgo:** Calibracion por arrastre compite con pan/seleccion.
  **Mitigacion:** Modo explicito `Ajustar grilla`, activado con switch/shortcut, y handle interactivo solo durante ese modo.
- **Riesgo:** El handle de calibracion queda oculto por niebla/oscuridad.
  **Mitigacion:** Dibujarlo en la capa de seleccion, por encima de overlays.
- **Riesgo:** PixiJS v8 no puede compilar shaders por CSP restrictivo. _(Materializado y resuelto)_
  **Mitigacion:** Agregar `'unsafe-eval'` a `script-src` en el meta CSP del renderer. Aceptable para una aplicacion de escritorio donde el renderer no carga contenido remoto arbitrario.
- **Riesgo:** API de carga de texturas de PixiJS v8 incompatible con `Sprite.from(HTMLImageElement)`. _(Materializado y resuelto)_
  **Mitigacion:** Usar `Assets.load(url)` + `new Sprite(texture)`. Liberar con `Assets.unload(url)` al cambiar imagen.
- **Riesgo:** Overlay de oscuridad con bounds incorrectos por timing asincrono. _(Materializado y resuelto)_
  **Mitigacion:** Llamar `drawDarknessLayer()` dentro de `drawMapImage()` despues de asignar `this.mapSprite`, garantizando que `getGridBounds()` lea las dimensiones reales del sprite.

### 9. Criterios de aceptacion

- El usuario puede cargar una imagen valida PNG/JPG/JPEG/WEBP.
- HEIC muestra soporte real si carga, o error recuperable claro si no es viable.
- El mapa aparece centrado en el lienzo.
- La grilla cuadrada o hexagonal aparece sobre el mapa.
- El usuario puede cambiar opacidad de grilla.
- El usuario puede activar `Ajustar grilla` con switch en sidebar.
- El usuario puede activar `Ajustar grilla` con `Cmd+G`/`Ctrl+G`.
- El usuario puede calibrar por arrastre solo con `Ajustar grilla` activo.
- El usuario puede calibrar por valor numerico solo con `Ajustar grilla` activo.
- El handle de calibracion queda visible por encima de niebla/oscuridad.
- Los presets iniciales actualizan la configuracion de grilla.
- El usuario puede cambiar `Escala mapa` desde Grilla cuando hay mapa cargado.
- `Escala mapa` modifica `map.scale` y no `camera.zoom`.
- El usuario puede resetear la escala del mapa a 100%.
- Al bloquear escala, la rueda no rompe el tamano fisico de la grilla.
- Mapa y grilla se guardan y cargan en `.ttrpgscene`.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- Actualizar README con instrucciones para cargar mapa y probar grilla/calibracion.
- Documentar limitacion o soporte real de HEIC.
- Actualizar este plan si se decide agregar dependencia de conversion HEIC.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tipos/reglas de mapa creados.
- [x] Tipos/reglas de grilla y presets creados.
- [x] Tests de grilla/calibracion agregados.
- [x] IPC `map:open-image` registrado.
- [x] Preload expone `openMapImage`.
- [x] UI permite cargar mapa.
- [x] PixiJS renderiza imagen de mapa.
- [x] PixiJS renderiza grilla sobre mapa.
- [x] Opacidad de grilla configurable.
- [x] Calibracion numerica implementada.
- [x] Calibracion por arrastre implementada.
- [x] Modo `Ajustar grilla` con switch y shortcut implementado.
- [x] Input numerico y handle ocultos fuera de `Ajustar grilla`.
- [x] Handle de calibracion renderizado por encima de fog/darkness.
- [x] Presets iniciales implementados.
- [x] Control `Escala mapa` implementado con slider, input y reset.
- [x] Sanitizacion de `map.scale` implementada y testeada.
- [x] Bloqueo de escala respeta rueda/zoom.
- [x] Guardar/cargar escena conserva mapa y grilla.
- [x] HEIC documentado segun soporte real.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke de arranque con `pnpm dev` realizado.
- [x] Smoke manual completo con carga real de mapa realizado.
- [x] Protocolo `map-asset://` registrado con privilegios correctos (`bypassCSP`, `corsEnabled`, `secure`, `stream`, `supportFetchAPI`).
- [x] Handler `protocol.handle('map-asset', ...)` implementado en `whenReady`.
- [x] `ElectronMapImageStorage` devuelve `map-asset://` URL construida con `pathToFileURL`.
- [x] CSP del renderer actualizado: `'unsafe-eval'` en `script-src`, `map-asset: blob:` en `img-src`, `data: map-asset: blob:` en `connect-src`, `blob:` en `worker-src`.
- [x] Carga de textura migrada a `Assets.load(url)` + `new Sprite(texture)` (PixiJS v8).
- [x] Liberacion de textura anterior con `Assets.unload(url)` al cambiar mapa.
- [x] `drawDarknessLayer()` llamada dentro de `drawMapImage()` tras asignar el sprite.
- [x] Documentacion actualizada.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

## Ajuste de Posicion del Mapa

### 1. Resumen

- **Objetivo:** Agregar un modo de ajuste que permite mover la imagen del mapa en X/Y dentro del lienzo para alinearla con la grilla, persistir la posicion en el archivo de sesion y restaurarla al recargar.
- **Estado:** Draft
- **Prioridad:** Alta
- **Dependencias:** mapa y grilla implementado (mapa cargado, grilla, `scene.map.position` existente en schema, `PixiViewport` con drag modes).

### 2. Alcance

#### Incluido

- Boton toggle "Ajustar mapa" dentro de la seccion Grilla del sidebar derecho.
- Flag `isMapAdjustMode` en `InteractionState` con funcion pura para modificarlo.
- Modo de drag `"map-move"` en `PixiViewport` que mueve el sprite del mapa en lugar de panear la camara.
- Callback `onMapPositionChange(x, y)` que reporta la nueva posicion al renderer en cada frame de arrastre.
- Actualizacion en tiempo real de grilla y capa de oscuridad mientras se arrastra el mapa.
- Persistencia en `scene.map.position` — campo ya existente en `SceneDocumentV1`, sin migracion de schema.
- Al cargar imagen nueva, la posicion se resetea a `{ x: 0, y: 0 }` (comportamiento actual de `createMapImageState`).
- Estado visual diferenciado del boton segun si el modo esta activo o no.

#### Fuera de alcance

- Mover el mapa con teclado (flechas de direccion).
- Snap de posicion a grilla.
- Deshacer/rehacer movimientos.
- Rotacion o flip de la imagen.
- Acceso concurrente al handle de calibracion mientras el modo de ajuste esta activo (se excluyen mutuamente).

### 3. Decisiones tecnicas

- **Arquitectura:** El flag de modo vive en `InteractionState` del dominio. `PixiViewport` recibe el modo via `setMapAdjustMode` y maneja el drag internamente. El renderer conecta ambos extremos. No se necesitan cambios en IPC, preload ni infraestructura.
- **Persistencia:** `scene.map.position` ya existe en `SceneDocumentV1` y se guarda/carga via el pipeline existente de `.ttrpgscene`. Sin cambios de schema ni migraciones.
- **IPC / Electron:** Sin cambios. La posicion viaja como parte de `SceneDocument` al guardar/cargar escena.
- **Render / PixiJS:** El sprite del mapa se mueve directamente (`mapSprite.position.set`) durante el drag para feedback inmediato. Tras cada frame se llama `drawGrid()` y `drawDarknessLayer()` para que sigan al mapa. El callback reporta la posicion acumulada al renderer.
- **Coordenadas:** El delta de pantalla se convierte a delta mundo dividiendo por `camera.zoom`. La posicion del mapa es siempre en coordenadas mundo.
- **Conflicto calibrate/map-move:** Mutuamente excluyentes. Cuando `isMapAdjustMode` es `true`, el `handlePointerDown` asigna `"map-move"` y el hit test del handle de calibracion no se evalua.
- **Validacion:** No se requiere validacion adicional. La posicion es un par `(x, y)` sin restricciones de rango por ahora.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:** Agregar `isMapAdjustMode: boolean` a `InteractionState`. Agregar funcion pura `setMapAdjustMode(state, isActive): InteractionState`.
- **Reglas puras:** `setMapAdjustMode` — toggle de flag, cierra context menu si estaba abierto (consistente con otros toggles).
- **Coordenadas / unidades:** El delta mundo se calcula como `screenDelta / camera.zoom`. La posicion acumulada `(x, y)` queda en unidades mundo, igual que `grid.cellSizeWorld` y las posiciones de otros elementos.
- **Errores de dominio:** No aplica. No hay invariantes que puedan romperse con la posicion.

### 5. Cambios por capa

#### `domain`

- **`src/domain/interaction/interaction-state.ts`**
  - Agregar `isMapAdjustMode: boolean` a la interfaz `InteractionState`.
  - Inicializar en `false` en `createInitialInteractionState`.
  - Agregar `setMapAdjustMode(state, isActive): InteractionState`.
  - Test unitario: `setMapAdjustMode` activa y desactiva el flag; verificar que no muta otros campos.

#### `application`

- Sin cambios. No se requiere nuevo caso de uso; la logica de actualizacion de posicion es un callback directo del renderer al estado de escena.

#### `infrastructure`

- Sin cambios.

#### `main`

- Sin cambios.

#### `preload`

- Sin cambios.

#### `renderer`

- **`src/renderer/src/App.tsx`**
  - Agregar `handleToggleMapAdjust` que llama `setMapAdjustMode` sobre `interaction`.
  - Agregar `handleMapPositionChange(x, y)` memoizado con `useCallback` que actualiza `scene.map.position` via `setScene`.
  - Pasar `isMapAdjustMode={interaction.isMapAdjustMode}` y `onMapPositionChange={handleMapPositionChange}` a `<MapViewport>`.
  - Agregar boton "Ajustar mapa" / "Ajustando mapa" en la seccion Grilla del sidebar derecho con clase `is-active` cuando el modo este activo. El boton solo se habilita cuando hay un mapa cargado.

- **`src/renderer/src/components/MapViewport.tsx`**
  - Agregar props `isMapAdjustMode: boolean` y `onMapPositionChange: (x: number, y: number) => void`.
  - Pasar `onMapPositionChange` a `PixiViewport.create` en las opciones.
  - Agregar `useEffect` para `isMapAdjustMode` que llama `viewportRef.current?.setMapAdjustMode(isMapAdjustMode)`.

#### `render`

- **`src/render/pixi/PixiViewport.ts`**
  - Agregar `"map-move"` al union type de `PointerDragState.mode`.
  - Agregar `onMapPositionChange?: (x: number, y: number) => void` a `PixiViewportOptions`.
  - Agregar campo privado `isMapAdjustMode = false`.
  - Agregar metodo publico `setMapAdjustMode(isActive: boolean): void`.
  - Actualizar `handlePointerDown`: cuando `isMapAdjustMode && mapSprite !== null && button === 0`, asignar modo `"map-move"` en lugar de evaluar el hit test del handle de calibracion.
  - Agregar rama `"map-move"` en `handlePointerMove`:
    - Calcular delta mundo: `dx = (nextPoint.x - lastPoint.x) / camera.zoom`, idem `dy`.
    - Actualizar `mapSprite.position.x += dx`, idem `y`.
    - Llamar `drawGrid()` y `drawDarknessLayer()`.
    - Llamar `options.onMapPositionChange?.(mapSprite.position.x, mapSprite.position.y)`.

### 6. Plan de trabajo

1. Agregar `isMapAdjustMode` y `setMapAdjustMode` a `interaction-state.ts` con test unitario.
2. Agregar `"map-move"` al drag mode y `setMapAdjustMode` / `onMapPositionChange` a `PixiViewport`.
3. Actualizar `handlePointerDown` y `handlePointerMove` en `PixiViewport` para el nuevo modo.
4. Agregar props y `useEffect` en `MapViewport`.
5. Conectar boton, callback y estado en `App.tsx`.
6. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint` y smoke manual.

### 7. Testing y verificacion

- **Unit tests:** `setMapAdjustMode` en `interaction-state.test.ts` — activa, desactiva, no muta campos ajenos.
- **Integration tests:** No aplica; el flujo es UI → PixiViewport → callback → estado React.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  1. Cargar un mapa con grilla interna.
  2. Abrir Grilla en el sidebar y activar "Ajustar mapa" — verificar estado visual del boton.
  3. Arrastrar — verificar que el mapa se mueve y la grilla/oscuridad lo siguen.
  4. Desactivar — verificar que arrastrar panea la camara y el mapa no se mueve.
  5. Guardar escena y recargar — verificar que el mapa aparece en la posicion ajustada.
  6. Cargar imagen nueva — verificar que la posicion vuelve a `(0, 0)`.

### 8. Riesgos y mitigaciones

- **Riesgo:** El callback `onMapPositionChange` dispara un `setScene` en cada frame de arrastre, causando muchos re-renders de React.
  **Mitigacion:** React 18 batchea las actualizaciones de estado en event handlers y callbacks async. En la practica el re-render ocurre una vez por frame de animacion. Si se detecta degradacion, se puede debouncer o mover el estado de posicion local a un ref durante el drag y flushear al soltar.

- **Riesgo:** Confusion del usuario entre mover el mapa y panear la camara si el boton no es suficientemente claro.
  **Mitigacion:** El boton vive junto a los controles de Grilla, usa clase `is-active` con fondo dorado, texto diferenciado "Ajustando mapa" / "Ajustar mapa" y el cursor del canvas podria cambiar.

- **Riesgo:** Al mover el mapa, `this.map.position` en `PixiViewport` queda desincronizado con `mapSprite.position` hasta que React re-renderiza y llama `setMap`.
  **Mitigacion:** El sprite es la fuente de verdad visual durante el drag. `getGridBounds()` lee de `mapSprite` (no de `this.map`), por eso la grilla y oscuridad siempre siguen al sprite. La desincronizacion es cosmética y de muy corta duracion.

- **Riesgo:** El handle de calibracion queda oculto o inaccesible si se activa ajuste sobre el mapa.
  **Mitigacion:** Los modos son mutuamente excluyentes por diseno. El usuario debe desactivar ajuste antes de calibrar, lo que es intuitivo.

### 9. Criterios de aceptacion

- El boton "Ajustar mapa" aparece en la seccion Grilla del sidebar y se habilita solo cuando hay mapa cargado.
- Con el modo activo, arrastrar mueve la imagen del mapa en X/Y.
- Con el modo inactivo, arrastrar panea la camara (comportamiento existente sin regresiones).
- La grilla y el overlay de oscuridad se mueven junto al mapa en tiempo real.
- Al guardar y recargar la sesion, el mapa aparece en la posicion ajustada.
- Cargar imagen nueva resetea la posicion a `(0, 0)`.
- `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan sin errores.

### 10. Documentacion afectada

- `specs/04-map-and-grid/spec.md`
- No se requieren cambios en README ni en otros specs.

### 11. Checklist de cierre

- [ ] `isMapAdjustMode` y `setMapAdjustMode` agregados a `interaction-state.ts`.
- [ ] Test unitario de `setMapAdjustMode` escrito y pasando.
- [ ] Modo `"map-move"` implementado en `PixiViewport`.
- [ ] `setMapAdjustMode` y `onMapPositionChange` implementados en `PixiViewport`.
- [ ] Props y `useEffect` agregados en `MapViewport`.
- [ ] Boton y callbacks conectados en `App.tsx`.
- [ ] Arrastrar mueve el mapa con modo activo.
- [ ] Arrastrar panea camara con modo inactivo (sin regresion).
- [ ] Grilla y oscuridad siguen al mapa en tiempo real.
- [ ] Guardar/cargar escena restaura la posicion.
- [ ] Cargar imagen nueva resetea posicion.
- [ ] `pnpm test` ejecutado y pasando.
- [ ] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] Smoke manual completo realizado.
- [ ] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [ ] Sin dependencias nuevas no justificadas.

## D&D 5e Alternating Diagonals

### 1. Resumen

- **Objetivo:** Añadir el modo `"dnd5e-alternating"` donde la 1ª diagonal cuesta 5 ft, la 2ª 10 ft, alternando a lo largo del recorrido completo.
- **Estado:** Pendiente

### 2. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/domain/sessions/scene-document.ts` | Añadir `"dnd5e-alternating"` al tipo `DiagonalMode` |
| `src/domain/sessions/scene-schema.ts` | Añadir `"dnd5e-alternating"` al `z.enum` del campo `diagonalMode` |
| `src/domain/measurement/measurement.ts` | Nueva función `measureCellsAlternating`; caso en `measureCells`; rama en `measurePathDistance` |
| `src/domain/measurement/measurement.test.ts` | Tests para `measureCells`, `measureDistance` y `measurePathDistance` con el nuevo modo |
| `src/renderer/src/App.tsx` | Añadir `<option>` en el `<select>` de diagonal |

### 3. Cambios detallados

#### 3a. `scene-document.ts` — tipo DiagonalMode

**Línea 4**, añadir valor al union:

```ts
export type DiagonalMode = "dnd5e-default" | "dnd5e-alternating" | "manhattan" | "euclidean";
```

#### 3b. `scene-schema.ts` — validación Zod

**Línea 176**, ampliar el enum:

```ts
diagonalMode: z.enum(["dnd5e-default", "dnd5e-alternating", "manhattan", "euclidean"]),
```

#### 3c. `measurement.ts` — lógica de medición

**Paso 1 — nueva función pura `measureCellsAlternating`**

Añadir antes de `measureCells` (~línea 82):

```ts
export function measureCellsAlternating(
  dxCells: number,
  dyCells: number,
  diagonalsBefore: number
): { cells: number; diagonals: number } {
  const D = Math.min(dxCells, dyCells);
  const S = Math.max(dxCells, dyCells) - D;
  const diagonalCost =
    D + Math.floor((D + diagonalsBefore) / 2) - Math.floor(diagonalsBefore / 2);
  return { cells: S + diagonalCost, diagonals: D };
}
```

La función es pura y recibe cuántas diagonales ya se contaron antes (`diagonalsBefore`), lo que permite acumular el contador entre segmentos de un path.

**Paso 2 — caso en `measureCells`**

En el `switch` (~línea 87), añadir después del caso `"dnd5e-default"`:

```ts
case "dnd5e-alternating":
  return measureCellsAlternating(dxCells, dyCells, 0).cells;
```

Así `measureDistance` (regla simple) funciona correctamente: inicia el contador en 0.

**Paso 3 — rama en `measurePathDistance`**

Reemplazar el cuerpo del loop en `measurePathDistance` (~línea 56) para bifurcar según el modo:

```ts
let cells = 0;

if (settings.diagonalMode === "dnd5e-alternating") {
  let diagonalsBefore = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined) continue;
    const dxCells = Math.abs(to.x - from.x) / settings.grid.cellSizeWorld;
    const dyCells = Math.abs(to.y - from.y) / settings.grid.cellSizeWorld;
    const result = measureCellsAlternating(dxCells, dyCells, diagonalsBefore);
    cells += result.cells;
    diagonalsBefore += result.diagonals;
  }
} else {
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined) continue;
    cells += measureDistance(from, to, settings).cells;
  }
}
```

#### 3d. `measurement.test.ts` — tests nuevos

Añadir en el bloque `describe("measurement")`:

```ts
describe("dnd5e-alternating diagonal mode", () => {
  it("1 diagonal sola cuesta 1 casilla", () => {
    expect(measureCells(0, 1, "dnd5e-alternating")).toBe(1);
  });

  it("2 diagonales cuestan 3 casillas (5+10 ft)", () => {
    expect(measureCells(0, 2, "dnd5e-alternating")).toBe(3);
  });

  it("3 diagonales cuestan 4 casillas (5+10+5 ft)", () => {
    expect(measureCells(0, 3, "dnd5e-alternating")).toBe(4);
  });

  it("4 diagonales cuestan 6 casillas (5+10+5+10 ft)", () => {
    expect(measureCells(0, 4, "dnd5e-alternating")).toBe(6);
  });

  it("measureDistance 1 diagonal → 5 ft", () => {
    expect(
      measureDistance({ x: 0, y: 0 }, { x: 100, y: 100 }, { grid, diagonalMode: "dnd5e-alternating" })
    ).toMatchObject({ cells: 1, value: 5, label: "5 ft" });
  });

  it("measureDistance 2 diagonales → 15 ft", () => {
    expect(
      measureDistance({ x: 0, y: 0 }, { x: 200, y: 200 }, { grid, diagonalMode: "dnd5e-alternating" })
    ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
  });

  it("path multi-segmento acumula el contador de diagonales entre tramos", () => {
    // Segmento 1: 1 diagonal → 1 casilla (diag #1 = 5 ft)
    // Segmento 2: 1 diagonal → 2 casillas (diag #2 = 10 ft)
    // Total: 3 casillas → 15 ft
    expect(
      measurePathDistance(
        [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 200 }],
        { grid, diagonalMode: "dnd5e-alternating" }
      )
    ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
  });

  it("path con cardinales no afecta el contador de diagonales", () => {
    // Segmento 1: 2 cardinales → 2 casillas
    // Segmento 2: 1 diagonal → 1 casilla (sigue siendo diag #1)
    // Total: 3 casillas → 15 ft
    expect(
      measurePathDistance(
        [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 100 }],
        { grid, diagonalMode: "dnd5e-alternating" }
      )
    ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
  });

  it("measureCellsAlternating devuelve el número de diagonales del segmento", () => {
    expect(measureCellsAlternating(2, 3, 0)).toEqual({ cells: 4, diagonals: 2 });
    expect(measureCellsAlternating(2, 3, 2)).toEqual({ cells: 5, diagonals: 2 });
  });
});
```

#### 3e. `App.tsx` — selector UI

Línea ~1757, después de `<option value="dnd5e-default">D&D 5e</option>`:

```tsx
<option value="dnd5e-alternating">D&D 5e Alt.</option>
```

### 4. Orden de trabajo

1. `scene-document.ts` — ampliar `DiagonalMode`.
2. `scene-schema.ts` — ampliar `z.enum`.
3. `measurement.ts` — `measureCellsAlternating`, caso en `measureCells`, rama en `measurePathDistance`.
4. `measurement.test.ts` — añadir tests.
5. `App.tsx` — añadir `<option>`.
6. `pnpm typecheck && pnpm test`.

### 5. Verificación

- `pnpm typecheck` — sin errores.
- `pnpm test` — todos los tests pasan incluyendo los nuevos.
- Manual: crear un cone/circle/path; cambiar a "D&D 5e Alt."; verificar que el label de distancia cambia al trazar diagonales.

### 6. Checklist

- [x] `DiagonalMode` actualizado en `scene-document.ts`.
- [x] `z.enum` actualizado en `scene-schema.ts`.
- [x] `measureCellsAlternating` implementada y exportada.
- [x] Caso `"dnd5e-alternating"` en `measureCells`.
- [x] Rama de path multi-segmento en `measurePathDistance`.
- [x] Tests nuevos en `measurement.test.ts`.
- [x] `<option>` añadida en `App.tsx`.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [ ] Smoke test manual.

## Extension de grilla al viewport

Estado: implementado y aceptado para cierre 1.9.0.

- [x] Hacer que la grilla cubra siempre el viewport, sin campo de extension en SceneGrid ni schema.
- [x] Retirar switch y rama de dibujo limitado; ignorar el campo obsoleto al cargar escenas de prueba.
- [x] Extraer ventana de dibujo, overscan y presupuesto de lineas a `domain/grid/grid-window.ts`.
- [x] Cachear la geometria en PixiViewport y actualizarla al navegar sin acumular Graphics.
- [x] Separar limite visual de grilla de los bounds de texturas de niebla/oscuridad.
- [x] Evitar invalidar capas ajenas cuando se recibe configuracion de grilla identica.
- [x] Cubrir inicio extendido, coordenadas lejanas, zoom extremo, reutilizacion, escenas antiguas, round trip y snapshot de jugador.
- [x] Aceptacion y merge autorizados por el usuario para 1.9.0.

Verificacion reproducible: iniciar o cargar una escena, hacer pan fuera de la imagen y zoom-out, guardar/cargar y abrir jugador. Confirmar cobertura automatica sin switch, casillas calibradas, ausencia de huecos al navegar y memoria de mascaras estable. Pruebas en `grid-window.test.ts`, `grid-render-cache.test.ts` y `player-window.test.ts`.

Validacion de rama (2026-09-02): typecheck, lint, 322 tests y build correctos con grilla siempre extendida. Regresiones de inicio, paneo lejano y carga sin opcion de minimizar cubiertas. En navegador se confirma ausencia del switch de extension, conservando calibracion y canvas. Cierre autorizado por el usuario; no se repitio un smoke nativo completo de dialogos y dos ventanas Electron.

## Grosor delgado o triple

Estado: implementado y aceptado para cierre 1.9.0.

- [x] Agregar `SceneGrid.lineWidth: 1 | 3`, default 1 y validacion Zod compatible con archivos sin campo.
- [x] Mantener el orden de propiedades del default/schema para no marcar como ocupada una escena vacia antigua.
- [x] Agregar selector segmentado accesible en Grilla con muestra de trazo Lucide y estado presionado.
- [x] Usar `lineWidth` en el stroke y en la clave del cache de PixiViewport.
- [x] Limitar invalidacion a grilla cuando solo cambia grosor; conservar cache durante pan y reutilizarlo al repetir la opcion.
- [x] Cubrir default antiguo, rechazo de valores distintos de 1/3, round trip, deteccion de cambios, snapshot de jugador y trazo Pixi de ancho 1/3.
- [x] Aceptacion y merge autorizados por el usuario para 1.9.0.

Verificacion: probar ambos botones a igual zoom/opacidad, guardar con gruesas, cargar de nuevo y abrir Player View. Revisar `scene-schema.test.ts`, `grid-render-cache.test.ts` y `player-window.test.ts`.

Validacion (2026-09-02): 326 tests, typecheck, lint y build correctos. Comparacion visual en navegador de delgadas/gruesas realizada sin errores de consola. Round trip y snapshot de jugador cubiertos automaticamente. Aceptado por el usuario para 1.9.0; sin un smoke nativo adicional de dos ventanas.
