# Plan - Figuras y Medicion

Este documento describe de forma unificada el plan tecnico para implementar y mantener figuras y medicion, consolidando los pasos y criterios vigentes en el proyecto.

## Herramientas Tacticas y Medicion

### 1. Resumen

- **Objetivo:** Implementar mediciones y formas tacticas persistentes con unidades, diagonales configurables, snap-to-grid opcional, seleccion, ajuste y borrado.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 00-06 implementadas, grilla calibrable, estado de escena versionado, menu contextual, seleccion/borrado, PixiJS viewport y capas de render existentes.

### 2. Alcance

#### Incluido

- Medicion lineal con etiqueta de distancia.
- Linea tactica persistente.
- Circulo/esfera 2D con radio configurable.
- Cono tactico.
- Rectangulo/cubo 2D.
- Seleccion, movimiento, ajuste y borrado de formas.
- Snap-to-grid opcional usando `scene.settings.snapToGrid`.
- Medidas en pies y metros usando configuracion de grilla.
- Diagonales configurables usando `scene.settings.diagonalMode`.
- Persistencia de formas en `scene.shapes`.
- Tests de dominio para distancia, diagonales, unidades, snap y validacion de formas.

#### Fuera de alcance

- Plantillas avanzadas exactas por sistema fuera de D&D 5e.
- Rotacion libre de rectangulos/cubos si no es necesaria para el MVP.
- Volumen 3D real de esferas/conos/cubos.
- UI compleja de herramientas con hotkeys avanzados.
- Edicion multi-punto sofisticada.
- Sincronizacion multiusuario.
- Resolver el bug abierto de mascaras de luz registrado en `./bugs/bug-mask-lights-to-see-through-darkness-overlay/`.

### 3. Decisiones tecnicas

- **Arquitectura:** Las reglas de medicion, diagonales, snap y geometria viven en `domain/measurement` y `domain/tools` o un nuevo `domain/shapes`. React solo orquesta UI/estado y PixiJS solo renderiza entidades serializables.
- **Persistencia:** Usar `scene.shapes` como fuente de verdad para mediciones y formas tacticas. Ampliar `SceneShape` y `scene-schema.ts` con tipos discriminados, ids estables y coordenadas de mundo.
- **IPC / Electron:** No agregar IPC nuevo. Guardar/cargar sigue usando la escena `.ttrpgscene`.
- **Render / PixiJS:** Renderizar formas en la capa `shapesAndMeasurements` y seleccion/manijas en `selection`. Mantener conversion pantalla mundo centralizada en `PixiViewport`.
- **Validacion:** Validar ids no vacios, tipo de forma soportado, puntos finitos, radios/anchos/altos positivos, longitud minima donde aplique y unidades validas.
- **Dependencias nuevas:** Ninguna prevista.

### 4. Diseno de dominio

- **Entidades / tipos:** `MeasurementLine`, `TacticalLine`, `CircleShape`, `ConeShape`, `RectangleShape`, `ShapeId`, `ShapeKind`, `DistanceLabel`, `MeasurementSettings`.
- **Reglas puras:** Calcular distancia en mundo, convertir a celdas, convertir a pies/metrico, calcular distancia diagonal segun modo, aplicar snap-to-grid, crear/mover/ajustar/borrar formas.
- **Coordenadas / unidades:** Todas las formas se guardan en coordenadas de mundo. La distancia se calcula usando `grid.cellSizeWorld`, `grid.distancePerCell`, `grid.metricDistancePerCell` y `grid.unit`.
- **Errores de dominio:** Coordenadas invalidas, dimensiones no positivas, shape kind invalido, medicion sin puntos suficientes, configuracion de grilla invalida.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/measurement/measurement.ts` para calculos de distancia, unidades y diagonales.
- Crear o ampliar `src/domain/tools/tactical-elements.ts` para convertir placeholders actuales en entidades tacticas persistibles.
- Crear `src/domain/shapes/shapes.ts` si conviene separar formas de herramientas UI.
- Agregar tests unitarios para:
  - Distancia lineal euclidiana.
  - Diagonal D&D 5e default.
  - Manhattan.
  - Euclidean.
  - Conversion a ft/m.
  - Snap-to-grid.
  - Creacion/actualizacion de formas.

#### `application`

- Mantener guardar/cargar usando use cases existentes.
- Si la logica de creacion crece, crear helpers puros para aplicar acciones sobre `SceneDocument`.
- No agregar repositorios ni servicios nuevos.

#### `infrastructure`

- Sin cambios esperados.
- La validacion de archivo de escena queda en `scene-schema.ts`.

#### `main`

- Sin cambios esperados.
- No agregar dialogos ni IPC.

#### `preload`

- Sin cambios esperados.
- No exponer APIs nuevas.

#### `renderer`

- Cambiar la creacion desde menu contextual para crear formas en `scene.shapes` en lugar de solo `interaction.elements` cuando corresponda.
- Agregar controles compactos para unidad (`ft`/`m`), snap-to-grid y modo de diagonal.
- Mostrar etiqueta de distancia en mediciones.
- Permitir seleccionar, mover y borrar formas persistentes.
- Agregar panel de propiedades contextual para radio/longitud/ancho/alto segun forma.
- Mantener controles discretos para no cubrir mapa durante sesion.

#### `render`

- Extender `PixiViewport` para recibir `scene.shapes`.
- Renderizar lineas, mediciones, circulos, conos y rectangulos desde datos persistidos.
- Renderizar etiquetas de medicion con texto legible.
- Implementar hit testing para formas persistentes.
- Implementar drag de forma seleccionada y, si es viable, manijas simples de ajuste.
- Mantener limpieza de listeners/texturas y evitar duplicar sistemas de coordenadas.

### 6. Plan de trabajo

2. Revisar el modelo actual de `interaction.elements` y decidir migracion incremental hacia `scene.shapes`.
3. Diseñar tipos discriminados para `SceneShape` y actualizar `scene-document.ts`.
4. Actualizar `scene-schema.ts` para validar formas tacticas completas.
5. Crear reglas puras de medicion, diagonales, unidades y snap.
6. Agregar tests unitarios de dominio para medicion y formas.
7. Conectar menu contextual para crear medicion, linea, circulo, cono y rectangulo persistentes.
8. Extender `MapViewport` y `PixiViewport` para recibir/renderizar `scene.shapes`.
9. Implementar seleccion, movimiento y borrado de formas persistentes.
10. Agregar etiquetas de distancia y controles de unidad/snap/diagonal.
11. Agregar panel compacto de propiedades para ajustar dimensiones basicas.
12. Verificar guardar/cargar escena con formas.
13. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y smoke manual con `pnpm dev`.

### 7. Testing y verificacion

- **Unit tests:** Distancias, diagonales, unidades, snap-to-grid, creacion/actualizacion de formas y validacion de schema.
- **Integration tests:** Guardar/cargar escena con `shapes` persistidas usando use cases existentes.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar mapa, calibrar grilla, crear medicion, alternar ft/m, cambiar diagonal, crear circulo/cono/rectangulo, mover/seleccionar/borrar, guardar escena y cargarla de vuelta.

### 8. Riesgos y mitigaciones

- **Riesgo:** Duplicar estado entre `interaction.elements` y `scene.shapes`.
  **Mitigacion:** Usar `scene.shapes` como fuente de verdad para formas persistentes y reservar `interaction` para seleccion, contexto y herramienta activa.
- **Riesgo:** Reglas de diagonales ambiguas para distintos sistemas.
  **Mitigacion:** Implementar solo modos ya modelados (`dnd5e-default`, `manhattan`, `euclidean`) y dejar variantes futuras fuera de alcance.
- **Riesgo:** Etiquetas y manijas saturen la proyeccion.
  **Mitigacion:** Estilo compacto, alto contraste y solo mostrar manijas en seleccion.
- **Riesgo:** Cambiar schema de escena rompa escenas previas.
  **Mitigacion:** Mantener compatibilidad con `shapes: []` y validar defaults existentes.
- **Riesgo:** Interacciones de drag compitan con pan/map adjust.
  **Mitigacion:** Priorizar hit testing de elementos seleccionables y mantener pan cuando no hay hit.

### 9. Criterios de aceptacion

- El usuario puede crear una medicion lineal desde el menu contextual.
- La medicion muestra distancia en unidad activa.
- El usuario puede alternar pies/metrico y la etiqueta se actualiza.
- El usuario puede cambiar el modo de diagonal y la medicion lo respeta.
- El usuario puede crear linea, circulo, cono y rectangulo.
- El usuario puede activar/desactivar snap-to-grid.
- Las formas pueden seleccionarse, moverse y borrarse.
- Las formas se guardan y cargan con la escena.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- Actualizar README con pasos para probar herramientas tacticas y medicion.
- Registrar cualquier decision concreta sobre geometria de conos/cubos si cambia durante implementacion.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tipos de formas persistentes creados o ampliados.
- [x] Schema de escena actualizado.
- [x] Reglas de medicion implementadas.
- [x] Reglas de diagonal implementadas.
- [x] Snap-to-grid implementado.
- [x] Tests relevantes agregados o actualizados.
- [x] UI para unidad/snap/diagonal implementada.
- [x] Render de medicion, linea, circulo, cono y rectangulo implementado.
- [x] Seleccion/movimiento/borrado de formas persistentes implementado.
- [x] Guardar/cargar conserva formas.
- [x] README actualizado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [ ] Smoke/manual test realizado.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

## Submenú de Herramientas de Área y Formas Editables

### 1. Resumen

- **Objetivo:** Agrupar círculo, cono, rectángulo y línea en un submenú "Herramientas de área", eliminar la forma `line` sin etiqueta, y añadir handles interactivos para redimensionar y rotar estas formas directamente sobre el mapa.
- **Estado:** Pendiente
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 07; sistema de formas táctica existente; PixiJS viewport.

### 2. Alcance

- Eliminar la forma `line` del dominio, UI y schema (con migración silenciosa para escenas viejas).
- Renombrar `measurement` a "Línea" en la UI; el tipo interno permanece `measurement`.
- Agrupar Línea, Círculo, Cono y Rectángulo en un submenú "Herramientas de área" en el menú contextual.
- Añadir handle de borde al **círculo** para cambiar su radio arrastrando.
- Añadir handle de anillo de rotación y handle de extremo al **cono** para rotar y cambiar su radio.
- Añadir handles de esquinas al **rectángulo** para redimensionar en X e Y de forma independiente.
- Los handles solo son visibles cuando el elemento está seleccionado.
- Actualizar callbacks de viewport, estado React y propiedades del panel lateral.

### 3. Decisiones técnicas

#### Eliminación de `line`
- Se elimina `"line"` de `TacticalElementKind` y `TacticalShapeKind` en el dominio; ya no se puede crear.
- En el schema Zod (`scene-schema.ts`) se usa `.transform()` en el array de formas para filtrar silenciosamente formas con `type: "line"` al cargar escenas antiguas.
- `SceneShape["type"]` en `scene-document.ts` se limita a `"measurement" | "circle" | "cone" | "rectangle"`.
- El test de `shapes.test.ts` que crea una forma `"line"` se migra a `"measurement"`.

#### Handle del rectángulo — esquinas
- La posición del rectángulo en el dominio es el **centro** (`points[0]` = centro). Las cuatro esquinas son:
  - 0 = top-left: `(cx - w/2, cy - h/2)`
  - 1 = top-right: `(cx + w/2, cy - h/2)`
  - 2 = bottom-right: `(cx + w/2, cy + h/2)`
  - 3 = bottom-left: `(cx - w/2, cy + h/2)`
- Al arrastrar esquina `i`, la esquina opuesta `(i+2) % 4` queda fija. El nuevo centro es el punto medio entre cursor y esquina fija. Nuevo `width = |cursor.x - esquinaFija.x|`, `height = |cursor.y - esquinaFija.y|`.
- Se añade campo `handleIndex?: number` a `PointerDragState` para saber qué esquina se arrastra.

#### Handle de rotación del cono de forma
- Se usa radio fijo `SHAPE_CONE_ROTATION_RING_RADIUS = 72` (igual que el cono de luz).
- El handle de resize del cono se sitúa en la punta: `(cx + cos(dir)*radius, cy + sin(dir)*radius)`. Si `radius < 80`, puede solaparse visualmente con el anillo; el handle de punta tiene prioridad en hit-test.
- Se reutiliza la callback `onShapeDirectionChange` del viewport; en App.tsx se extiende el handler para llamar `updateShape(shape, { direction })` cuando la forma es un cono (en lugar de `rotateLinearShape` que aplica solo a `measurement`).

#### Nuevas callbacks del viewport
| Callback | Cuándo se emite |
|---|---|
| `onShapeRadiusChange(elementId, radius)` | Arrastrar handle de borde del círculo o punta del cono |
| `onShapeRectResize(elementId, width, height, anchorX, anchorY)` | Arrastrar esquina del rectángulo |
| `onShapeDirectionChange` (ya existe) | Arrastrar anillo del cono de forma (extender handler en App.tsx) |

#### Submenú en el menú contextual
- CSS hover + `:focus-within` (adecuado para app Electron de escritorio).
- Estructura HTML: `<li class="has-submenu">` con `<button>` y `<menu>` anidado que se revela con CSS.
- No se añade estado React adicional; el menú contextual ya tiene backdrop de cierre.

### 4. Cambios por capa

#### 4.1 `src/domain/tools/tactical-elements.ts`

- Eliminar `"line"` del array `tacticalElementKinds`.
- Eliminar `case "line"` de `getTacticalElementLabel`.
- Cambiar label de `"measurement"` a `"Linea"`.

#### 4.2 `src/domain/shapes/shapes.ts`

- Cambiar `TacticalShapeKind` de `"measurement" | "line" | ...` a `"measurement" | "circle" | "cone" | "rectangle"`.
- Eliminar `case "line"` de `createTacticalShape`.
- Actualizar `moveShape`, `setLinearShapeEnd`, `rotateLinearShape` y `validateShape`: quitar referencias a `"line"` dejando solo `"measurement"`.
- Añadir función `setShapeRadius(shape: SceneShape, radius: number): SceneShape` para círculo y cono (wrapper de `updateShape({ radius })`).
- Añadir función `setRectangleCorner(shape: SceneShape, cornerIndex: 0|1|2|3, cursor: WorldPoint): SceneShape` que computa nuevas dimensiones y anchor desde la esquina opuesta fija.

#### 4.3 `src/domain/sessions/scene-document.ts`

- Cambiar `SceneShape["type"]` a `"measurement" | "circle" | "cone" | "rectangle"` (quitar `"line"`).

#### 4.4 `src/domain/sessions/scene-schema.ts`

- Cambiar `linearShapeSchema` de `z.enum(["measurement", "line"])` a `z.literal("measurement")`.
- En el array `shapes`, añadir `.transform()` que filtra silenciosamente objetos `"line"` antes del discriminated union, o usar un `z.union` que atrapa `line` con `.transform(() => null)` y luego filtra nulos:
  ```ts
  const legacyLineSchema = z.object({ type: z.literal("line") }).transform(() => null);
  shapes: z.array(z.union([legacyLineSchema, z.discriminatedUnion("type", [...])]))
           .transform(arr => arr.filter(Boolean))
  ```

#### 4.5 `src/render/pixi/PixiViewport.ts`

##### 4.5.1 Tipos

Extender `PointerDragState["mode"]`:
```
| "shape-circle-resize"
| "shape-cone-rotate"
| "shape-cone-resize"
| "shape-rect-resize"
```
Añadir campo `handleIndex?: number` a `PointerDragState`.

Añadir a `PixiViewportOptions`:
```ts
onShapeRadiusChange?: (elementId: string, radius: number) => void;
onShapeRectResize?: (elementId: string, width: number, height: number, anchorX: number, anchorY: number) => void;
```

##### 4.5.2 Hit tests nuevos (solo operan sobre la forma seleccionada)

| Función | Condición |
|---|---|
| `hitTestCircleResizeHandle(pt)` | Forma seleccionada es círculo; distancia al centro ∈ `[radius-16, radius+18]` |
| `hitTestConeShapeRotationHandle(pt)` | Forma seleccionada es cono; distancia al centro ∈ `[72-16, 72+18]` |
| `hitTestConeShapeResizeHandle(pt)` | Forma seleccionada es cono; distancia a la punta ≤ 18 |
| `hitTestRectCornerHandle(pt) → cornerIndex \| null` | Forma seleccionada es rectángulo; distancia a alguna esquina ≤ 16 |

##### 4.5.3 Integración en `handlePointerDown`

Insertar los nuevos hit tests antes del `hitTestElement` general, en orden de prioridad:
1. `hitTestCircleResizeHandle` → mode `shape-circle-resize`
2. `hitTestConeShapeResizeHandle` → mode `shape-cone-resize`
3. `hitTestConeShapeRotationHandle` → mode `shape-cone-rotate`
4. `hitTestRectCornerHandle` → mode `shape-rect-resize`, guardar `cornerIndex` en drag state

##### 4.5.4 Integración en `handlePointerMove`

Añadir ramas para:
- `"shape-circle-resize"` → `updateCircleRadiusFromScreenPoint(elementId, point)`
- `"shape-cone-resize"` → `updateConeRadiusFromScreenPoint(elementId, point)`
- `"shape-cone-rotate"` → `updateConeDirectionFromScreenPoint(elementId, point)`
- `"shape-rect-resize"` → `updateRectCornerFromScreenPoint(elementId, handleIndex, point)`

##### 4.5.5 Métodos privados de actualización

```ts
updateCircleRadiusFromScreenPoint(elementId, screenPoint)
  // radius = distancia del cursor al centro del círculo
  // onShapeRadiusChange(elementId, max(10, radius))

updateConeRadiusFromScreenPoint(elementId, screenPoint)
  // radius = distancia del cursor al centro del cono
  // onShapeRadiusChange(elementId, max(10, radius))

updateConeDirectionFromScreenPoint(elementId, screenPoint)
  // direction = atan2(cursor - center) en grados
  // onShapeDirectionChange(elementId, direction)

updateRectCornerFromScreenPoint(elementId, cornerIndex, screenPoint)
  // corner fija = esquina opuesta (cornerIndex + 2) % 4
  // width = max(10, |cursor.x - fixed.x|)
  // height = max(10, |cursor.y - fixed.y|)
  // anchorX = (cursor.x + fixed.x) / 2
  // anchorY = (cursor.y + fixed.y) / 2
  // onShapeRectResize(elementId, width, height, anchorX, anchorY)
```

##### 4.5.6 Render de handles (solo para elemento seleccionado)

Añadir en `drawInteractiveElements()` dentro del bloque de selección:

```ts
const selectedCircle = this.shapes.find(s => s.id === this.selectedElementId && s.type === "circle");
if (selectedCircle) selectionLayer.addChild(drawCircleResizeHandle(selectedCircle));

const selectedConeShape = this.shapes.find(s => s.id === this.selectedElementId && s.type === "cone");
if (selectedConeShape) selectionLayer.addChild(drawConeShapeHandles(selectedConeShape));

const selectedRect = this.shapes.find(s => s.id === this.selectedElementId && s.type === "rectangle");
if (selectedRect) selectionLayer.addChild(drawRectCornerHandles(selectedRect));
```

Funciones de dibujo a añadir:

```ts
function drawCircleResizeHandle(shape: SceneShape): Graphics
  // Círculo de borde (stroke azul) + punto handle en (cx+radius, cy)

function drawConeShapeHandles(shape: SceneShape): Graphics
  // Anillo de rotación radio=72 (stroke amarillo) + handle en el anillo (dirección del cono)
  // Línea de cx,cy a la punta + punto handle en la punta (resize, verde)

function drawRectCornerHandles(shape: SceneShape): Graphics
  // 4 puntos en esquinas + cuadrado de borde (stroke naranja)
```

##### 4.5.7 Ajustar `drawElement` en PixiViewport

El helper `drawElement` pinta el icono de arrastre de los elementos (no la forma real). Para `"line"`, eliminarlo del `switch`. Cambia el `case "measurement"` + `case "line"` combinado a solo `case "measurement"`.

#### 4.6 `src/renderer/src/App.tsx`

##### 4.6.1 Contexto: eliminar `"line"`

- Eliminar las referencias a `"line"` en `selectedMeasurement`:
  ```ts
  const selectedMeasurement = selectedShape?.type === "measurement"
    ? measureDistance(...) : undefined;
  ```
- Eliminar `case "line"` del label en el panel de propiedades.

##### 4.6.2 Submenú "Herramientas de área"

Reemplazar el bloque `{tacticalElementKinds.map(...)}` por una estructura con items directos (luces, fuego) y un submenú para formas:

```jsx
{/* Luces y fuego directamente */}
<button onClick={() => handleCreateElement("pointLight")}>Luz puntual</button>
<button onClick={() => handleCreateElement("coneLight")}>Luz cónica</button>
<button onClick={() => handleCreateElement("fire")}>Fuego</button>
<hr />
{/* Submenú */}
<li className="has-submenu">
  <button>Herramientas de área ▶</button>
  <menu className="context-submenu">
    <button onClick={() => handleCreateElement("measurement")}>Línea</button>
    <button onClick={() => handleCreateElement("circle")}>Círculo</button>
    <button onClick={() => handleCreateElement("cone")}>Cono</button>
    <button onClick={() => handleCreateElement("rectangle")}>Rectángulo</button>
  </menu>
</li>
```

##### 4.6.3 Nuevos handlers

```ts
const handleShapeRadiusChange = useCallback((elementId: string, radius: number) => {
  setScene(current => ({
    ...current,
    shapes: current.shapes.map(s =>
      s.id === elementId ? updateShape(s, { radius }) : s
    )
  }));
}, []);

const handleShapeRectResize = useCallback(
  (elementId: string, width: number, height: number, anchorX: number, anchorY: number) => {
    setScene(current => ({
      ...current,
      shapes: current.shapes.map(s =>
        s.id === elementId
          ? updateShape(moveShape(s, { x: anchorX, y: anchorY }), { width, height })
          : s
      )
    }));
  }, []
);
```

##### 4.6.4 Extender `handleShapeDirectionChange`

```ts
const handleShapeDirectionChange = useCallback((elementId: string, direction: number) => {
  setScene(current => ({
    ...current,
    shapes: current.shapes.map(s => {
      if (s.id !== elementId) return s;
      if (s.type === "measurement") return rotateLinearShape(s, direction);
      if (s.type === "cone") return updateShape(s, { direction });
      return s;
    })
  }));
}, []);
```

##### 4.6.5 Pasar nuevas props a `<MapViewport>`

```tsx
onShapeRadiusChange={handleShapeRadiusChange}
onShapeRectResize={handleShapeRectResize}
```

#### 4.7 `src/renderer/src/components/MapViewport.tsx`

Añadir props e inicialización de viewport:
```ts
onShapeRadiusChange: (elementId: string, radius: number) => void;
onShapeRectResize: (elementId: string, width: number, height: number, anchorX: number, anchorY: number) => void;
```
Pasar al `PixiViewport` en el `useEffect` de inicialización.

#### 4.8 `src/renderer/src/styles.css`

Añadir estilos para el submenú:
```css
.has-submenu { position: relative; }
.context-submenu { display: none; position: absolute; left: 100%; top: 0; /* heredar estilos del menú padre */ }
.has-submenu:hover .context-submenu,
.has-submenu:focus-within .context-submenu { display: flex; flex-direction: column; }
```

### 5. Plan de trabajo

1. **Dominio** — Quitar `line` de tipos, `createTacticalShape`, validaciones y helpers en `tactical-elements.ts` y `shapes.ts`.
2. **Dominio** — Añadir `setShapeRadius` y `setRectangleCorner` en `shapes.ts`.
3. **Schema** — Cambiar `linearShapeSchema` a `z.literal("measurement")`, añadir filtro `legacyLineSchema` para `line`.
4. **Schema** — Cambiar `SceneShape["type"]` en `scene-document.ts`.
5. **Tests** — Actualizar `shapes.test.ts` (quitar test de `line`; añadir tests de `setShapeRadius` y `setRectangleCorner`). Actualizar `scene-schema.test.ts` para verificar que formas `line` se descartan al cargar.
6. **Viewport** — Extender `PointerDragState` con nuevos modos y `handleIndex`.
7. **Viewport** — Añadir `onShapeRadiusChange` y `onShapeRectResize` a `PixiViewportOptions`.
8. **Viewport** — Implementar 4 hit tests nuevos.
9. **Viewport** — Integrar hit tests en `handlePointerDown` con prioridad correcta.
10. **Viewport** — Implementar 4 métodos privados de actualización.
11. **Viewport** — Integrar nuevos modos en `handlePointerMove`.
12. **Viewport** — Implementar `drawCircleResizeHandle`, `drawConeShapeHandles`, `drawRectCornerHandles`.
13. **Viewport** — Integrar nuevos draws en `drawInteractiveElements`.
14. **Viewport** — Limpiar `drawElement`: quitar `case "line"`, dejar solo `case "measurement"`.
15. **App.tsx** — Submenú "Herramientas de área" en el menú contextual.
16. **App.tsx** — Añadir `handleShapeRadiusChange` y `handleShapeRectResize`.
17. **App.tsx** — Extender `handleShapeDirectionChange` para conos.
18. **App.tsx** — Limpiar referencias a `"line"` en panel de propiedades y `selectedMeasurement`.
19. **MapViewport.tsx** — Añadir nuevas props y pasarlas al viewport.
20. **CSS** — Estilos del submenú.
21. **Verificación** — `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

### 6. Criterios de aceptación

- No existe `"line"` en el dominio ni en la UI; las formas `line` en archivos `.ttrpgscene` antiguos se descartan silenciosamente.
- El menú contextual muestra "Herramientas de área ▶" que abre un submenú con Línea, Círculo, Cono, Rectángulo.
- Crear "Línea" desde el submenú crea una forma `measurement` con etiqueta de distancia.
- Seleccionar un círculo muestra un handle azul en su borde; arrastrarlo cambia el radio.
- Seleccionar un cono muestra un anillo de rotación y un handle de punta; ambos son arrastrables.
- Seleccionar un rectángulo muestra 4 handles en las esquinas; arrastrar cada uno redimensiona independientemente en X e Y.
- Los handles no se ven cuando la forma no está seleccionada.
- Los cambios de radio, dirección y dimensiones persisten en `.ttrpgscene`.
- `pnpm typecheck` y `pnpm test` pasan en verde.

### 7. Verificación

- **Unit tests:** `shapes.test.ts`, `scene-schema.test.ts`
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Smoke manual:** `pnpm dev`, abrir menú contextual → "Herramientas de área", crear cada forma, seleccionarla, probar todos los handles, guardar y recargar escena.

### 8. Checklist de cierre

- [ ] `line` eliminado del dominio, schema y UI.
- [ ] Migración silenciosa de formas `line` antiguas verificada.
- [ ] Submenú "Herramientas de área" funcionando en el menú contextual.
- [ ] Handle de borde del círculo implementado.
- [ ] Handles de anillo y punta del cono implementados.
- [ ] Handles de esquinas del rectángulo implementados.
- [ ] Nuevas callbacks implementadas en viewport, MapViewport y App.
- [ ] Tests actualizados y pasando.
- [ ] Smoke manual ejecutado.

## Relleno de Emojis para Efectos y Formas

### 1. Resumen

- **Objetivo:** Renderizar emojis representativos dentro de formas de área y líneas, con distribución estable y persistencia opcional para emojis de formas. El fuego queda excluido porque usa GIF interno enmascarado definido por efectos de fuego.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Specs 07, 09, 10 y 11; render Pixi de formas/fuego; schema versionado de escenas; grilla actual.

### 2. Alcance

#### Incluido

- Render de emojis dentro de círculo, cono y rectángulo.
- Render de emojis distribuidos a lo largo de línea/medición.
- Distribución tipo mosaico con jitter determinista para áreas.
- Distribución equitativa en líneas, al menos un emoji por tamaño de celda aproximado.
- Campo opcional `emoji?: string` en `SceneShape`.
- Archivo TypeScript compartido con emojis permitidos: `💧`, `💨`, `🤐`, `🤢`, `💀`, `☠️`, `🔮`.
- Schema compatible con escenas antiguas sin emoji.
- UI mínima con un selector único para configurar emoji de la forma seleccionada.
- Documentación de comportamiento.

#### Fuera de alcance

- Animación de emojis.
- Sprites o imágenes externas.
- Editor avanzado de patrones/densidad.
- Emoji por celda individual dentro de una misma forma.
- Cambios a luces, oscuridad, darkvision, fog of war o mapas.
- Emojis para tokens/minis futuros.
- Persistencia de emoji para fuego, porque fuego no usa emojis.

### 3. Decisiones tecnicas

- **Arquitectura:** El dato persistente de emoji vive en `domain/sessions` como propiedad opcional de `SceneShape`; la UI solo edita ese campo; Pixi renderiza el patrón sin introducir reglas de negocio en React.
- **Persistencia:** Extender `SceneShape` con `emoji?: string`; el schema acepta ausencia del campo y la UI solo guarda uno de los emojis permitidos.
- **IPC / Electron:** Sin canales nuevos. Guardar/cargar usa el flujo existente de `.ttrpgscene`.
- **Render / PixiJS:** Usar `Text` de Pixi para emojis en la capa de formas. Selección y handles permanecen en la capa `selection`, por encima. Fuego no renderiza emojis.
- **Validacion:** Limitar emoji a string corto, sugerido máximo 8 unidades UTF-16 para permitir secuencias emoji compuestas sin aceptar textos largos.
- **Emojis permitidos:** Centralizar el set en `src/domain/shapes/shape-emojis.ts` para que UI, dominio y render compartan fuente.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:** Agregar `emoji?: string` a `SceneShape`.
- **Reglas puras:** Agregar helpers puros para:
  - normalizar emoji opcional,
  - calcular puntos de mosaico para círculo/cono/rectángulo,
  - calcular puntos sobre línea según `grid.cellSizeWorld`,
  - jitter determinista por id.
- **Coordenadas / unidades:** Todos los puntos se calculan en coordenadas de mundo. La densidad usa `grid.cellSizeWorld`; el tamaño visual usa una fracción del tamaño de celda.
- **Errores de dominio:** No se esperan errores bloqueantes. Emojis vacíos o demasiado largos se ignoran o recortan de forma segura.

### 5. Cambios por capa

#### `domain`

- Actualizar `src/domain/sessions/scene-document.ts` con `SceneShape.emoji?: string`.
- Actualizar `src/domain/sessions/scene-schema.ts` para aceptar `emoji` opcional.
- Actualizar tests de schema para:
  - escena vieja sin emoji,
  - escena con emoji en formas.
- Agregar o extender helper de formas si conviene para `updateShape({ emoji })`.
- Crear helper puro para distribución de emojis si el cálculo se mantiene testeable fuera de Pixi.

#### `application`

- Sin cambios esperados.

#### `infrastructure`

- Sin cambios esperados.

#### `main`

- Sin cambios esperados.

#### `preload`

- Sin cambios esperados.

#### `renderer`

- En `src/renderer/src/App.tsx`:
  - Agregar selector compacto para editar emoji de forma seleccionada.
  - Permitir limpiar emoji.
  - Usar `updateSelectedShape({ emoji })` o helper equivalente.
- No agregar control para fuego, porque fuego usa el GIF interno de efectos de fuego.

#### `render`

- En `src/render/pixi/PixiViewport.ts`:
  - Dibujar emojis de formas en `drawTacticalShape`.
  - Para línea/measurement, distribuir emojis a lo largo del segmento.
  - Asegurar que emojis queden debajo de selección/handles.
  - Mantener fuentes/tamaños legibles con `grid.cellSizeWorld`.
  - Usar jitter determinista estable basado en id/tipo/índice.

### 6. Plan de trabajo

1. [x] Extender `SceneShape` con `emoji?: string`.
2. [x] Actualizar schema para aceptar `emoji` opcional y mantener compatibilidad.
3. [x] Agregar tests de schema para formas con y sin emoji.
4. [x] Agregar UI mínima en panel de forma seleccionada con selector único de emoji.
5. [x] Implementar helpers de distribución para área y línea.
6. [x] Excluir fuego del render de emojis; efectos de fuego lo representa con GIF interno enmascarado.
7. [x] Implementar render de emojis en círculo, cono y rectángulo.
8. [x] Implementar render de emojis sobre línea/measurement.
9. [x] Ajustar tamaño, opacidad y densidad para legibilidad.
10. [x] Actualizar README y marcar plan.
11. [x] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.
12. [ ] Smoke manual en `pnpm dev`: fuego circular, fuego pintado, línea, círculo, cono y rectángulo.

### 7. Testing y verificacion

- **Unit tests:** Schema de escena para `emoji`; helpers puros de distribución si se extraen.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Crear fuego circular y pintado y confirmar que no muestra emojis; crear línea, círculo, cono y rectángulo con emoji; mover/redimensionar; guardar/cargar.

### 8. Riesgos y mitigaciones

- **Riesgo:** Demasiados textos Pixi degradan rendimiento.
  **Mitigacion:** Densidad conservadora y límite máximo de emojis por elemento.
- **Riesgo:** Jitter cambia en cada render y se percibe como parpadeo.
  **Mitigacion:** Usar función determinista basada en id e índice.
- **Riesgo:** Emoji tapa demasiado el mapa.
  **Mitigacion:** Tamaño fraccional de celda y alpha moderado.
- **Riesgo:** Emojis compuestos se validan mal.
  **Mitigacion:** Validación permisiva de string corto y tolerancia renderer-side.
- **Riesgo:** Las áreas pequeñas quedan vacías.
  **Mitigacion:** Garantizar al menos un emoji centrado cuando existe espacio razonable.

### 9. Criterios de aceptacion

- Fuego circular y fuego por celdas no muestran emojis.
- Círculo, cono y rectángulo pueden mostrar emoji dentro del área.
- El selector de formas permite elegir un solo emoji entre `💧`, `💨`, `🤐`, `🤢`, `💀`, `☠️`, `🔮` o limpiar la selección.
- Línea/measurement muestra emojis distribuidos a lo largo del segmento.
- La línea muestra al menos un emoji por cuadro de grilla aproximado y mínimo uno si es corta.
- El patrón no parpadea al re-renderizar sin cambios.
- Emojis se actualizan al mover o redimensionar.
- Selección y handles quedan por encima.
- Guardar/cargar conserva `emoji` en formas.
- Escenas antiguas sin emoji cargan sin errores.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/07-shapes-and-measurement/spec.md`
- `specs/07-shapes-and-measurement/plan.md`
- `README.md`

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

## Herramienta de Path

### 1. Resumen

- **Objetivo:** Agregar la herramienta `Path/Camino` dentro de `Herramientas de area` para dibujar caminos segmentados con snap al centro de celda, preview de distancia acumulada, confirmacion con `Enter`, cancelacion con `Escape`, borrado incremental con `Backspace`, persistencia y edicion posterior de puntos.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 07, 10, 11, 13 y 15; helpers actuales de medicion; modelo `SceneShape`; menu contextual; render PixiJS de formas/handles; panel de propiedades en sidebar.

### 2. Alcance

#### Incluido

- Agregar `Path/Camino` dentro del submenu contextual `Herramientas de area`.
- Entrar en modo temporal de dibujo de path al elegir la accion.
- Crear el primer punto con click normal, no desde el click derecho.
- Hacer snap de cada punto al centro de la celda seleccionada.
- Mostrar cursor/feedback visual de modo path.
- Renderizar puntos confirmados, segmentos confirmados y segmento temporal al cursor.
- Mostrar etiqueta temporal con distancia acumulada, incluyendo el tramo pendiente.
- Agregar puntos con clicks sucesivos.
- Confirmar con `Enter` cuando haya al menos dos puntos distintos.
- Cancelar con `Escape`.
- Borrar el ultimo punto confirmado con `Backspace`; si se elimina el ultimo punto restante, salir del modo path.
- Persistir el path confirmado como forma de escena.
- Seleccionar, borrar y mostrar propiedades del path confirmado.
- Mostrar como unica propiedad del path la distancia total en la unidad activa.
- Editar puntos confirmados mediante handles, manteniendo snap al centro de celda.
- Recalcular distancia si cambian unidad, distancia por celda, distancia metrica por celda o regla diagonal.
- Evitar emojis en paths.
- Agregar tests de dominio/schema para paths.

#### Fuera de alcance

- Paths curvos.
- Flechas de direccion.
- Colores configurables.
- Anchura configurable.
- Etiquetas por segmento.
- Agregar o eliminar puntos en modo edicion posterior.
- Pathfinding automatico.
- Obstaculos, paredes o linea de vision.
- Emojis en paths.
- Cambios de IPC, preload, main o filesystem.

### 3. Decisiones tecnicas

- **Arquitectura:** El path se modela como una forma tactica de dominio (`SceneShape`) con `type: "path"`. React maneja el estado temporal de dibujo; PixiJS renderiza preview/handles y reporta interacciones. La distancia se calcula con helpers de dominio, no dentro de Pixi o JSX.
- **Persistencia:** Extender `SceneShape` y el schema Zod para aceptar `type: "path"` con `points`. No persistir la distancia calculada; se deriva de `points`, `grid` y `settings`.
- **IPC / Electron:** Sin cambios. Guardar/cargar escena sigue usando los flujos existentes.
- **Render / PixiJS:** Renderizar path confirmado en la capa de formas/mediciones actual, como herramienta de area final por encima de mapa, tokens, oscuridad, luces, oscuridad magica y fog of war. Renderizar path temporal y handles de puntos en capa de seleccion/preview para quedar por encima de overlays.
- **Coordenadas:** Guardar puntos en coordenadas de mundo, ya ajustados al centro de celda. Para clicks y drag de puntos, usar helper de snap al centro de celda.
- **Validacion:** Schema debe requerir al menos dos puntos para paths persistidos. El estado temporal puede tener cero o un punto, pero nunca debe guardarse.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:**
  - Extender `SceneShape["type"]` con `"path"`.
  - Para `path`, `points` representa una lista ordenada de vertices.
  - El path no usa `radius`, `width`, `height`, `angle`, `direction` ni `emoji`.
- **Reglas puras:**
  - Crear o extender helper para sumar distancia de varios segmentos:

```ts
export function measurePathDistance(
  points: readonly WorldPoint[],
  settings: MeasurementSettings
): MeasurementResult;
```

  - Crear helper para normalizar puntos de path y eliminar puntos consecutivos duplicados.
  - Crear helper para mover un punto por indice, haciendo snap al centro de celda en el caller o helper.
  - Validar que un path persistido tenga al menos dos puntos distintos.
- **Coordenadas / unidades:** La distancia se calcula convirtiendo cada segmento a celdas con `grid.cellSizeWorld` y usando `diagonalMode`, `distancePerCell`, `metricDistancePerCell` y `unit`.
- **Errores de dominio:** Path con menos de dos puntos, puntos no finitos o id vacio deben rechazarse igual que las formas existentes.

### 5. Cambios por capa

#### `domain`

- **`src/domain/sessions/scene-document.ts`**
  - Agregar `"path"` a `SceneShape["type"]`.
  - Documentar/acomodar que `points` puede tener mas de dos vertices para paths.

- **`src/domain/sessions/scene-schema.ts`**
  - Agregar schema para `type: "path"`.
  - Requerir `points` con minimo dos puntos.
  - Aceptar escenas antiguas sin paths.

- **`src/domain/sessions/scene-schema.test.ts`**
  - Agregar test de parseo para path valido.
  - Agregar test que rechaza path con menos de dos puntos.

- **`src/domain/measurement/measurement.ts`**
  - Agregar `measurePathDistance` reutilizando `measureDistance` por segmento.
  - Mantener `formatDistance` como fuente de formato.

- **`src/domain/measurement/measurement.test.ts`**
  - Cubrir suma de segmentos.
  - Cubrir recalculo con `ft` y `m`.
  - Cubrir diagonal con modo actual.

- **`src/domain/shapes/shapes.ts`**
  - Agregar `"path"` a `TacticalShapeKind`.
  - Crear helper `createPathShape` o extender `createShape` con puntos iniciales si conviene.
  - Agregar helper `movePathPoint(shape, pointIndex, nextPoint)`.
  - Actualizar `validateShape` para path.
  - Evitar que paths reciban emoji por defecto.

- **`src/domain/shapes/shapes.test.ts`**
  - Crear path con puntos.
  - Mover punto manteniendo orden.
  - Validar rechazo de path invalido.

#### `application`

- Sin cambios esperados.

#### `infrastructure`

- Sin cambios esperados.

#### `main`

- Sin cambios esperados.

#### `preload`

- Sin cambios esperados.

#### `renderer`

- **`src/renderer/src/App.tsx`**
  - Agregar estado temporal de dibujo:
    - modo activo `path`;
    - puntos confirmados temporales;
    - punto hover temporal ajustado a centro de celda.
  - Agregar accion `Path/Camino` dentro de `Herramientas de area`.
  - Al elegir `Path/Camino`, activar modo path sin crear punto.
  - En click normal sobre canvas:
    - si no hay puntos, crear primer punto;
    - si ya hay puntos, agregar punto distinto.
  - En mouse move sobre canvas, actualizar punto hover centrado en celda.
  - En `Enter`, crear `SceneShape` con `type: "path"` si hay al menos dos puntos distintos, seleccionar y salir del modo.
  - En `Escape`, descartar temporal y salir.
  - En `Backspace`, borrar ultimo punto temporal y salir si no quedan puntos.
  - Evitar que `Backspace` borre seleccion mientras path temporal esta activo.
  - Mostrar propiedades de path seleccionado con solo `Distancia total`.
  - Usar `measurePathDistance` para la propiedad, de modo que cambie con unidad/reglas.
  - No exponer selector de emoji para `path`.
  - Si se selecciona path y sidebar esta cerrado, reutilizar comportamiento de propiedades del objeto seleccionado.

- **`src/renderer/src/components/MapViewport.tsx`**
  - Agregar props para path temporal:
    - puntos confirmados;
    - punto hover;
    - label de distancia temporal o settings para calcularlo.
  - Agregar callbacks:
    - click de canvas en modo path;
    - hover de canvas en modo path;
    - move de punto de path confirmado.
  - Pasar estos datos/callbacks a `PixiViewport`.

#### `render`

- **`src/render/pixi/PixiViewport.ts`**
  - Renderizar `SceneShape` con `type: "path"`.
  - Dibujar segmentos entre todos los puntos.
  - Dibujar nodos/handles para puntos.
  - Renderizar preview temporal:
    - puntos confirmados;
    - segmentos confirmados;
    - segmento hover;
    - etiqueta de distancia acumulada.
  - Agregar hit testing para seleccionar path confirmado:
    - cerca de segmentos;
    - cerca de puntos.
  - Agregar drag mode para mover un punto de path confirmado por indice.
  - Reportar `onPathPointMove(shapeId, pointIndex, worldPoint)`.
  - Aplicar snap al centro de celda antes de confirmar el movimiento o delegarlo a React/domain.
  - Mantener seleccion/handles por encima de overlays.
  - Limpiar preview temporal al cancelar, confirmar, cargar escena o resetear.

### 6. Plan de trabajo

1. Extender tipos de dominio para `SceneShape.type === "path"`.
2. Agregar `measurePathDistance` y tests unitarios.
3. Actualizar schema de escena y tests de persistencia/validacion para paths.
4. Agregar helpers de path en `domain/shapes`.
5. Actualizar render de Pixi para dibujar paths confirmados.
6. Agregar seleccion/hit testing para paths.
7. Agregar handles y drag de puntos de path confirmados.
8. Agregar estado temporal de dibujo en React.
9. Agregar `Path/Camino` dentro de `Herramientas de area`.
10. Conectar clicks, hover, `Enter`, `Escape` y `Backspace`.
11. Renderizar preview temporal y etiqueta acumulada.
12. Agregar panel de propiedad de path con solo distancia total.
13. Confirmar que paths no renderizan emojis ni muestran selector de emoji.
14. Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.
15. Probar manualmente en `pnpm dev`.

### 7. Testing y verificacion

- **Unit tests:**
  - `measurePathDistance` suma dos o mas segmentos.
  - `measurePathDistance` respeta `ft` y `m`.
  - `measurePathDistance` respeta reglas diagonales actuales.
  - Schema acepta path valido.
  - Schema rechaza path persistido con menos de dos puntos.
  - Helper de mover punto mantiene orden y actualiza solo el indice indicado.
- **Integration tests:** No se esperan cambios de IPC.
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  1. Abrir app con `pnpm dev`.
  2. Click derecho sobre canvas, `Herramientas de area`, `Path/Camino`.
  3. Confirmar que cambia el cursor y no se crea punto automatico.
  4. Hacer click en varias celdas y confirmar snap al centro de celda.
  5. Mover cursor y confirmar preview de segmento y etiqueta acumulada.
  6. Presionar `Backspace` y confirmar que borra el ultimo punto temporal.
  7. Presionar `Backspace` hasta borrar el ultimo punto y confirmar salida del modo.
  8. Repetir path y confirmar con `Enter`.
  9. Seleccionar path confirmado y verificar que el panel muestra solo distancia total.
  10. Cambiar unidad/regla diagonal y confirmar que distancia se actualiza.
  11. Arrastrar puntos del path y confirmar snap/recalculo.
  12. Guardar/cargar escena y confirmar que el path persiste.
  13. Confirmar que `Escape` cancela sin crear objeto.

### 8. Riesgos y mitigaciones

- **Riesgo:** El modelo actual de formas asume pocos handles o geometria simple.
  **Mitigacion:** Implementar path como caso explicito en `PixiViewport` y helpers de dominio; no forzar la logica de linea existente.
- **Riesgo:** La distancia de path duplica reglas de medicion y se desincroniza.
  **Mitigacion:** `measurePathDistance` debe reutilizar `measureDistance` por segmento.
- **Riesgo:** `Backspace` borra un objeto seleccionado en vez del ultimo punto temporal.
  **Mitigacion:** Mientras el modo path este activo, interceptar `Backspace` antes del flujo general de borrado.
- **Riesgo:** El preview temporal puede generar renders costosos en mouse move.
  **Mitigacion:** Guardar solo puntos simples y redibujar una capa ligera; evitar crear objetos persistentes hasta `Enter`.
- **Riesgo:** Hit testing de segmentos es dificil con zoom.
  **Mitigacion:** Usar tolerancia visual razonable convertida a mundo segun zoom o reutilizar tolerancias actuales de seleccion de lineas.
- **Riesgo:** Snap al centro de celda se comporta distinto al ajustar la grilla despues.
  **Mitigacion:** Persistir coordenadas de mundo y recalcular distancia con la grilla actual; al editar puntos, volver a snapear al centro vigente.

### 9. Criterios de aceptacion

- `Path/Camino` aparece dentro de `Herramientas de area`.
- Activar `Path/Camino` cambia el cursor y no crea punto automatico.
- El primer click crea un punto en el centro de la celda.
- Clicks sucesivos agregan puntos centrados en celda.
- El preview muestra puntos, segmentos y tramo al cursor.
- La etiqueta temporal muestra distancia acumulada con el tramo pendiente.
- `Enter` confirma paths con al menos dos puntos distintos.
- `Escape` cancela sin persistir.
- `Backspace` borra el ultimo punto temporal.
- Si `Backspace` elimina el ultimo punto restante, sale del modo path.
- El path confirmado queda seleccionable.
- El path confirmado se borra con `Delete` o `Backspace`.
- El panel del path muestra solo distancia total.
- La distancia se actualiza al cambiar unidad, distancia por celda o modo diagonal.
- Los puntos del path confirmado pueden moverse con handles y snap al centro de celda.
- El path no muestra emojis.
- Guardar/cargar conserva paths y orden de puntos.
- Escenas antiguas sin paths cargan sin errores.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/07-shapes-and-measurement/spec.md`
- `specs/07-shapes-and-measurement/plan.md`
- Si se ajusta el comportamiento general de herramientas tacticas, actualizar specs 07, 10, 11, 13 o 15 solo en los puntos afectados.

### 11. Checklist de cierre

- [x] `SceneShape` extendido con `path`.
- [x] Helper `measurePathDistance` agregado.
- [x] Tests de medicion de path agregados.
- [x] Schema actualizado para paths.
- [x] Tests de schema agregados.
- [x] Helpers de dominio para crear/editar paths agregados.
- [x] `Path/Camino` agregado al menu `Herramientas de area`.
- [x] Estado temporal de dibujo implementado.
- [x] Cursor de modo path implementado.
- [x] Preview temporal con etiqueta implementado.
- [x] Confirmacion con `Enter` implementada.
- [x] Cancelacion con `Escape` implementada.
- [x] Borrado incremental con `Backspace` implementado.
- [x] Render de path confirmado implementado.
- [x] Seleccion y borrado de path implementados.
- [x] Edicion de puntos con handles implementada.
- [x] Panel de propiedades muestra solo distancia total.
- [x] Paths excluidos de emojis.
- [x] Guardar/cargar preserva paths.
- [x] Circulo de seleccion en primer punto (radio media celda) implementado.
- [x] Zona interna del circulo mueve solo el primer punto (path-point-move).
- [x] Zona externa del circulo mueve el path completo (path-move).
- [x] Arrastrar desde segmentos o puntos intermedios no mueve el path.
- [x] Cursor `grab` al hacer hover sobre la zona del circulo implementado.
- [x] Cursor `grabbing` durante el arrastre del path implementado.
- [x] Bug de `confirmPathDrawing` (setState dentro de updater) corregido.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [ ] Smoke/manual test realizado.

## Integracion con arbol de objetos

- [x] Indexar circulo, cono, rectangulo, medicion y camino en Areas.
- [x] Derivar centro en mundo y reutilizar seleccion/propiedades existentes.
- [x] Probar centro de formas y borrado dirigido sin tocar otras colecciones.
- [x] Flujo de seleccion/centrado/borrado aceptado para 1.9.0.
