# Plan de implementacion tecnica - 05-adjust-map - Ajuste de Posicion del Mapa

## 1. Resumen

- **Spec fuente:** `./specs/04-map-and-grid/05-adjust-map.md`
- **Objetivo:** Agregar un modo de ajuste que permite mover la imagen del mapa en X/Y dentro del lienzo para alinearla con la grilla, persistir la posicion en el archivo de sesion y restaurarla al recargar.
- **Estado:** Draft
- **Prioridad:** Alta
- **Dependencias:** Spec 04 implementado (mapa cargado, grilla, `scene.map.position` existente en schema, `PixiViewport` con drag modes).

## 2. Alcance

### Incluido

- Boton toggle "Ajustar mapa" dentro de la seccion Grilla del sidebar derecho.
- Flag `isMapAdjustMode` en `InteractionState` con funcion pura para modificarlo.
- Modo de drag `"map-move"` en `PixiViewport` que mueve el sprite del mapa en lugar de panear la camara.
- Callback `onMapPositionChange(x, y)` que reporta la nueva posicion al renderer en cada frame de arrastre.
- Actualizacion en tiempo real de grilla y capa de oscuridad mientras se arrastra el mapa.
- Persistencia en `scene.map.position` — campo ya existente en `SceneDocumentV1`, sin migracion de schema.
- Al cargar imagen nueva, la posicion se resetea a `{ x: 0, y: 0 }` (comportamiento actual de `createMapImageState`).
- Estado visual diferenciado del boton segun si el modo esta activo o no.

### Fuera de alcance

- Mover el mapa con teclado (flechas de direccion).
- Snap de posicion a grilla.
- Deshacer/rehacer movimientos.
- Rotacion o flip de la imagen.
- Acceso concurrente al handle de calibracion mientras el modo de ajuste esta activo (se excluyen mutuamente).

## 3. Decisiones tecnicas

- **Arquitectura:** El flag de modo vive en `InteractionState` del dominio. `PixiViewport` recibe el modo via `setMapAdjustMode` y maneja el drag internamente. El renderer conecta ambos extremos. No se necesitan cambios en IPC, preload ni infraestructura.
- **Persistencia:** `scene.map.position` ya existe en `SceneDocumentV1` y se guarda/carga via el pipeline existente de `.ttrpgscene`. Sin cambios de schema ni migraciones.
- **IPC / Electron:** Sin cambios. La posicion viaja como parte de `SceneDocument` al guardar/cargar escena.
- **Render / PixiJS:** El sprite del mapa se mueve directamente (`mapSprite.position.set`) durante el drag para feedback inmediato. Tras cada frame se llama `drawGrid()` y `drawDarknessLayer()` para que sigan al mapa. El callback reporta la posicion acumulada al renderer.
- **Coordenadas:** El delta de pantalla se convierte a delta mundo dividiendo por `camera.zoom`. La posicion del mapa es siempre en coordenadas mundo.
- **Conflicto calibrate/map-move:** Mutuamente excluyentes. Cuando `isMapAdjustMode` es `true`, el `handlePointerDown` asigna `"map-move"` y el hit test del handle de calibracion no se evalua.
- **Validacion:** No se requiere validacion adicional. La posicion es un par `(x, y)` sin restricciones de rango por ahora.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:** Agregar `isMapAdjustMode: boolean` a `InteractionState`. Agregar funcion pura `setMapAdjustMode(state, isActive): InteractionState`.
- **Reglas puras:** `setMapAdjustMode` — toggle de flag, cierra context menu si estaba abierto (consistente con otros toggles).
- **Coordenadas / unidades:** El delta mundo se calcula como `screenDelta / camera.zoom`. La posicion acumulada `(x, y)` queda en unidades mundo, igual que `grid.cellSizeWorld` y las posiciones de otros elementos.
- **Errores de dominio:** No aplica. No hay invariantes que puedan romperse con la posicion.

## 5. Cambios por capa

### `domain`

- **`src/domain/interaction/interaction-state.ts`**
  - Agregar `isMapAdjustMode: boolean` a la interfaz `InteractionState`.
  - Inicializar en `false` en `createInitialInteractionState`.
  - Agregar `setMapAdjustMode(state, isActive): InteractionState`.
  - Test unitario: `setMapAdjustMode` activa y desactiva el flag; verificar que no muta otros campos.

### `application`

- Sin cambios. No se requiere nuevo caso de uso; la logica de actualizacion de posicion es un callback directo del renderer al estado de escena.

### `infrastructure`

- Sin cambios.

### `main`

- Sin cambios.

### `preload`

- Sin cambios.

### `renderer`

- **`src/renderer/src/App.tsx`**
  - Agregar `handleToggleMapAdjust` que llama `setMapAdjustMode` sobre `interaction`.
  - Agregar `handleMapPositionChange(x, y)` memoizado con `useCallback` que actualiza `scene.map.position` via `setScene`.
  - Pasar `isMapAdjustMode={interaction.isMapAdjustMode}` y `onMapPositionChange={handleMapPositionChange}` a `<MapViewport>`.
  - Agregar boton "Ajustar mapa" / "Ajustando mapa" en la seccion Grilla del sidebar derecho con clase `is-active` cuando el modo este activo. El boton solo se habilita cuando hay un mapa cargado.

- **`src/renderer/src/components/MapViewport.tsx`**
  - Agregar props `isMapAdjustMode: boolean` y `onMapPositionChange: (x: number, y: number) => void`.
  - Pasar `onMapPositionChange` a `PixiViewport.create` en las opciones.
  - Agregar `useEffect` para `isMapAdjustMode` que llama `viewportRef.current?.setMapAdjustMode(isMapAdjustMode)`.

### `render`

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

## 6. Plan de trabajo

1. Agregar `isMapAdjustMode` y `setMapAdjustMode` a `interaction-state.ts` con test unitario.
2. Agregar `"map-move"` al drag mode y `setMapAdjustMode` / `onMapPositionChange` a `PixiViewport`.
3. Actualizar `handlePointerDown` y `handlePointerMove` en `PixiViewport` para el nuevo modo.
4. Agregar props y `useEffect` en `MapViewport`.
5. Conectar boton, callback y estado en `App.tsx`.
6. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint` y smoke manual.

## 7. Testing y verificacion

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

## 8. Riesgos y mitigaciones

- **Riesgo:** El callback `onMapPositionChange` dispara un `setScene` en cada frame de arrastre, causando muchos re-renders de React.
  **Mitigacion:** React 18 batchea las actualizaciones de estado en event handlers y callbacks async. En la practica el re-render ocurre una vez por frame de animacion. Si se detecta degradacion, se puede debouncer o mover el estado de posicion local a un ref durante el drag y flushear al soltar.

- **Riesgo:** Confusion del usuario entre mover el mapa y panear la camara si el boton no es suficientemente claro.
  **Mitigacion:** El boton vive junto a los controles de Grilla, usa clase `is-active` con fondo dorado, texto diferenciado "Ajustando mapa" / "Ajustar mapa" y el cursor del canvas podria cambiar.

- **Riesgo:** Al mover el mapa, `this.map.position` en `PixiViewport` queda desincronizado con `mapSprite.position` hasta que React re-renderiza y llama `setMap`.
  **Mitigacion:** El sprite es la fuente de verdad visual durante el drag. `getGridBounds()` lee de `mapSprite` (no de `this.map`), por eso la grilla y oscuridad siempre siguen al sprite. La desincronizacion es cosmética y de muy corta duracion.

- **Riesgo:** El handle de calibracion queda oculto o inaccesible si se activa ajuste sobre el mapa.
  **Mitigacion:** Los modos son mutuamente excluyentes por diseno. El usuario debe desactivar ajuste antes de calibrar, lo que es intuitivo.

## 9. Criterios de aceptacion

- El boton "Ajustar mapa" aparece en la seccion Grilla del sidebar y se habilita solo cuando hay mapa cargado.
- Con el modo activo, arrastrar mueve la imagen del mapa en X/Y.
- Con el modo inactivo, arrastrar panea la camara (comportamiento existente sin regresiones).
- La grilla y el overlay de oscuridad se mueven junto al mapa en tiempo real.
- Al guardar y recargar la sesion, el mapa aparece en la posicion ajustada.
- Cargar imagen nueva resetea la posicion a `(0, 0)`.
- `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan sin errores.

## 10. Documentacion afectada

- `specs/04-map-and-grid/05-adjust-map.md`
- No se requieren cambios en README ni en otros specs.

## 11. Checklist de cierre

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
