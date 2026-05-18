# Plan de implementacion tecnica - 04 - Carga de Mapa y Calibracion de Grilla

## 1. Resumen

- **Spec fuente:** `./specs/04-map-loading-grid-calibration/04-map-loading-grid-calibration.md`
- **Objetivo:** Permitir cargar una imagen de mapa, renderizarla en PixiJS, superponer una grilla cuadrada configurable y calibrar el tamano fisico de casilla por arrastre o valor numerico.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Spec 00, Spec 01, Spec 02, Spec 03, PixiJS viewport, IPC/preload seguro, formato `.ttrpgscene`, dialogos nativos.

## 2. Alcance

### Incluido

- Cargar imagen local desde dialogo nativo.
- Aceptar PNG, JPG/JPEG, WEBP y HEIC cuando el runtime lo soporte.
- Mostrar mapa centrado en el lienzo PixiJS.
- Persistir `map.imagePath`, `map.position`, `map.scale` y configuracion de grilla en el estado de escena.
- Dibujar grilla cuadrada sobre el mapa.
- Encender/apagar grilla.
- Ajustar opacidad de grilla.
- Ajustar `cellSizeWorld` por valor numerico.
- Calibrar por arrastre mediante un control visible sobre el mapa solo cuando el modo `Ajustar grilla` esta activo.
- Activar/desactivar `Ajustar grilla` desde el sidebar derecho con un switch accesible.
- Activar/desactivar `Ajustar grilla` con shortcut `Cmd+G` en macOS y `Ctrl+G` en Windows/Linux.
- Mostrar el input numerico de `cellSizeWorld` solo mientras `Ajustar grilla` esta activo.
- Renderizar el handle de calibracion en una capa superior a niebla/oscuridad para que siempre sea usable.
- Aplicar presets iniciales: 1 inch, 2.5 cm, 5 ft, 1.5 m por casilla.
- Bloquear escala/zoom desde UI para proteger la calibracion.
- Guardar/cargar mapa y grilla en `.ttrpgscene`.
- Mostrar errores recuperables para imagen no soportada o ruta rota.

### Fuera de alcance

- Grillas hexagonales.
- Calibracion avanzada multi-punto.
- Correccion de perspectiva.
- Conversion interna HEIC garantizada en todas las plataformas.
- Copiar imagenes dentro del `.ttrpgscene`.
- Biblioteca local de assets o SQLite.
- Medicion tactica exacta sobre la grilla; queda para specs siguientes.

## 3. Decisiones tecnicas

- **Arquitectura:** El dominio define tipos/reglas de mapa y grilla. La aplicacion orquesta seleccion de imagen y actualizacion de escena. Infraestructura/main accede al filesystem y dialogos. PixiJS solo renderiza mapa/grilla a partir de estado serializable.
- **Persistencia:** Se reutiliza `SceneDocumentV1`. El mapa guarda ruta local sin copiar archivo. La grilla guarda valores ya existentes del schema: `enabled`, `locked`, `cellSizeWorld`, `opacity`, `unit`, `distancePerCell`, `metricDistancePerCell`.
- **IPC / Electron:** Agregar una API especifica `map:open-image` en main/preload. No exponer filesystem ni dialogos genericos. La URL de imagen se resuelve via protocolo custom `map-asset://` registrado en el proceso principal (ver decision tecnica resuelta mas abajo).
- **Render / PixiJS:** Extender `PixiViewport` para cargar textura usando `Assets.load(url)` de PixiJS v8 (API canonica). Renderizar mapa en capa `map` y grilla en capa `grid`. Mantener conversion pantalla <-> mundo centralizada. El handle de calibracion se dibuja en la capa superior de seleccion solo durante `Ajustar grilla`, para no quedar debajo de fog/darkness. El CSP del renderer debe incluir `unsafe-eval` para la compilacion de shaders de PixiJS v8.
- **Validacion:** Validar extension, existencia de archivo y soporte de carga. HEIC debe intentar cargarse si Chromium/sistema lo permite; si falla, mostrar mensaje claro y recuperable.
- **Dependencias nuevas:** `@radix-ui/react-switch` para el switch accesible de `Ajustar grilla`. El protocolo `map-asset://` usa modulos nativos de Electron (`protocol`, `net`).

### Decisiones tecnicas resueltas durante implementacion

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

## 4. Diseno de dominio

- **Entidades / tipos:** Crear/reforzar `MapImageState`, `GridState`, `GridCalibrationState`, `GridPreset`, `MapLoadResult`.
- **Reglas puras:** Calcular lineas de grilla visibles, aplicar presets, cambiar opacidad con clamp `0..1`, actualizar `cellSizeWorld`, bloquear/desbloquear escala, validar tamanos positivos.
- **Coordenadas / unidades:** Separar `map.scale`, `camera.zoom` y `grid.cellSizeWorld`. La calibracion modifica tamano de celda/grilla, no posicion de camara. El mapa y la grilla viven en coordenadas de mundo.
- **Errores de dominio:** Extension no soportada, imagen inexistente, imagen no decodificable, `cellSizeWorld <= 0`, opacidad fuera de rango.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/map/map-image.ts` para estado/tipos de imagen de mapa.
- Crear o ampliar `src/domain/grid/grid.ts` para estado, presets, opacidad, calibracion y validaciones.
- Agregar tests unitarios para presets, clamp de opacidad, cambio numerico de celda y bloqueo de escala.
- Mantener compatibilidad con `SceneDocumentV1`.

### `application`

- Crear caso de uso `openMapImageUseCase` o servicio equivalente que reciba resultado de infraestructura y produzca actualizacion de escena.
- Crear funciones para convertir estado de mapa/grilla a `SceneDocument`.
- Mantener errores serializables para UI.

### `infrastructure`

- Implementar seleccion de imagen local con dialogo nativo.
- Filtrar extensiones `png`, `jpg`, `jpeg`, `webp`, `heic`.
- Verificar existencia del archivo con `fs.access`.
- Construir `imageUrl` como `map-asset://` usando `pathToFileURL(imagePath).toString().replace('file:', 'map-asset:')`.
- No copiar ni modificar el archivo original.

### `main`

- Registrar IPC `map:open-image`.
- Usar `dialog.showOpenDialog`.
- Devolver `{ ok: true, imagePath, imageUrl }` o `{ ok: false, error }`.
- No leer imagenes arbitrarias desde payload del renderer.
- Registrar esquema `map-asset` con `protocol.registerSchemesAsPrivileged` antes del evento `ready`, con privilegios `{ bypassCSP: true, corsEnabled: true, secure: true, stream: true, supportFetchAPI: true }`.
- Manejar el protocolo en `whenReady` con `protocol.handle('map-asset', req => net.fetch(req.url.replace('map-asset:', 'file:')))`.

### `preload`

- Exponer `window.ttrpg.openMapImage()`.
- Actualizar tipos de `TtrpgApi`.
- Mantener API pequena y por accion.

### `renderer`

- Agregar boton `Cargar mapa`.
- Agregar controles compactos de grilla: visible, opacidad, switch `Ajustar grilla`, tamano de celda visible solo en ese modo, presets, bloqueo de escala.
- Mostrar estado visible de mapa cargado o error recuperable.
- Actualizar escena en memoria al cargar mapa o cambiar grilla.
- Guardar/cargar `.ttrpgscene` con mapa/grilla actualizados.
- Evitar paneles grandes que tapen el mapa.

### `render`

- Extender `PixiViewport` para recibir `map` y `grid` como props/estado.
- Cargar textura con `Assets.load(imageUrl)` y crear sprite con `new Sprite(texture)` (API canonica PixiJS v8).
- Liberar textura anterior con `Assets.unload(url)` al cambiar imagen.
- Renderizar mapa centrado en capa `map`.
- Renderizar grilla cuadrada en capa `grid` con opacidad configurable.
- Implementar handle/overlay de calibracion por arrastre visible/interactivo solo en modo `Ajustar grilla`.
- Dibujar el handle de calibracion en la capa de seleccion para quedar por encima de niebla/oscuridad.
- Respetar bloqueo de zoom/escala en rueda.
- Llamar `drawDarknessLayer()` dentro de `drawMapImage()` tras asignar el sprite, para que los bounds del overlay sean correctos.
- Mantener interacciones existentes de Spec 03.

### `renderer/index.html`

- Actualizar CSP meta tag: agregar `'unsafe-eval'` a `script-src` (requerido por PixiJS v8 para compilacion de shaders).
- Agregar `map-asset: blob:` a `img-src`; agregar `data: map-asset: blob:` a `connect-src`; agregar `blob:` a `worker-src`.
- Eliminar `file:` de `img-src` (reemplazado por `map-asset:`).

## 6. Plan de trabajo

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

## 7. Testing y verificacion

- **Unit tests:** Presets de grilla, validacion de opacidad, validacion de `cellSizeWorld`, conversion de estado a escena, bloqueo de escala.
- **Integration tests:** Casos de uso de carga de mapa con infraestructura fake.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar PNG/JPG/WEBP, verificar mapa centrado, cambiar opacidad, activar `Ajustar grilla` con switch y `Cmd/Ctrl+G`, cambiar tamano de celda, aplicar presets, calibrar por arrastre con niebla activa, bloquear escala, intentar zoom con rueda y guardar/cargar escena.

## 8. Riesgos y mitigaciones

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

## 9. Criterios de aceptacion

- El usuario puede cargar una imagen valida PNG/JPG/JPEG/WEBP.
- HEIC muestra soporte real si carga, o error recuperable claro si no es viable.
- El mapa aparece centrado en el lienzo.
- La grilla cuadrada aparece sobre el mapa.
- El usuario puede cambiar opacidad de grilla.
- El usuario puede activar `Ajustar grilla` con switch en sidebar.
- El usuario puede activar `Ajustar grilla` con `Cmd+G`/`Ctrl+G`.
- El usuario puede calibrar por arrastre solo con `Ajustar grilla` activo.
- El usuario puede calibrar por valor numerico solo con `Ajustar grilla` activo.
- El handle de calibracion queda visible por encima de niebla/oscuridad.
- Los presets iniciales actualizan la configuracion de grilla.
- Al bloquear escala, la rueda no rompe el tamano fisico de la grilla.
- Mapa y grilla se guardan y cargan en `.ttrpgscene`.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- Actualizar README con instrucciones para cargar mapa y probar grilla/calibracion.
- Documentar limitacion o soporte real de HEIC.
- Actualizar este plan si se decide agregar dependencia de conversion HEIC.

## 11. Checklist de cierre

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
