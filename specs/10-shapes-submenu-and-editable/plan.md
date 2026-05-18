# Plan de implementación técnica - 10 - Submenú de Herramientas de Área y Formas Editables

## 1. Resumen

- **Spec fuente:** `./specs/10-shapes-submenu-and-editable/10-shapes-submenu-and-editable.md`
- **Objetivo:** Agrupar círculo, cono, rectángulo y línea en un submenú "Herramientas de área", eliminar la forma `line` sin etiqueta, y añadir handles interactivos para redimensionar y rotar estas formas directamente sobre el mapa.
- **Estado:** Pendiente
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 07; sistema de formas táctica existente; PixiJS viewport.

---

## 2. Alcance

- Eliminar la forma `line` del dominio, UI y schema (con migración silenciosa para escenas viejas).
- Renombrar `measurement` a "Línea" en la UI; el tipo interno permanece `measurement`.
- Agrupar Línea, Círculo, Cono y Rectángulo en un submenú "Herramientas de área" en el menú contextual.
- Añadir handle de borde al **círculo** para cambiar su radio arrastrando.
- Añadir handle de anillo de rotación y handle de extremo al **cono** para rotar y cambiar su radio.
- Añadir handles de esquinas al **rectángulo** para redimensionar en X e Y de forma independiente.
- Los handles solo son visibles cuando el elemento está seleccionado.
- Actualizar callbacks de viewport, estado React y propiedades del panel lateral.

---

## 3. Decisiones técnicas

### Eliminación de `line`
- Se elimina `"line"` de `TacticalElementKind` y `TacticalShapeKind` en el dominio; ya no se puede crear.
- En el schema Zod (`scene-schema.ts`) se usa `.transform()` en el array de formas para filtrar silenciosamente formas con `type: "line"` al cargar escenas antiguas.
- `SceneShape["type"]` en `scene-document.ts` se limita a `"measurement" | "circle" | "cone" | "rectangle"`.
- El test de `shapes.test.ts` que crea una forma `"line"` se migra a `"measurement"`.

### Handle del rectángulo — esquinas
- La posición del rectángulo en el dominio es el **centro** (`points[0]` = centro). Las cuatro esquinas son:
  - 0 = top-left: `(cx - w/2, cy - h/2)`
  - 1 = top-right: `(cx + w/2, cy - h/2)`
  - 2 = bottom-right: `(cx + w/2, cy + h/2)`
  - 3 = bottom-left: `(cx - w/2, cy + h/2)`
- Al arrastrar esquina `i`, la esquina opuesta `(i+2) % 4` queda fija. El nuevo centro es el punto medio entre cursor y esquina fija. Nuevo `width = |cursor.x - esquinaFija.x|`, `height = |cursor.y - esquinaFija.y|`.
- Se añade campo `handleIndex?: number` a `PointerDragState` para saber qué esquina se arrastra.

### Handle de rotación del cono de forma
- Se usa radio fijo `SHAPE_CONE_ROTATION_RING_RADIUS = 72` (igual que el cono de luz).
- El handle de resize del cono se sitúa en la punta: `(cx + cos(dir)*radius, cy + sin(dir)*radius)`. Si `radius < 80`, puede solaparse visualmente con el anillo; el handle de punta tiene prioridad en hit-test.
- Se reutiliza la callback `onShapeDirectionChange` del viewport; en App.tsx se extiende el handler para llamar `updateShape(shape, { direction })` cuando la forma es un cono (en lugar de `rotateLinearShape` que aplica solo a `measurement`).

### Nuevas callbacks del viewport
| Callback | Cuándo se emite |
|---|---|
| `onShapeRadiusChange(elementId, radius)` | Arrastrar handle de borde del círculo o punta del cono |
| `onShapeRectResize(elementId, width, height, anchorX, anchorY)` | Arrastrar esquina del rectángulo |
| `onShapeDirectionChange` (ya existe) | Arrastrar anillo del cono de forma (extender handler en App.tsx) |

### Submenú en el menú contextual
- CSS hover + `:focus-within` (adecuado para app Electron de escritorio).
- Estructura HTML: `<li class="has-submenu">` con `<button>` y `<menu>` anidado que se revela con CSS.
- No se añade estado React adicional; el menú contextual ya tiene backdrop de cierre.

---

## 4. Cambios por capa

### 4.1 `src/domain/tools/tactical-elements.ts`

- Eliminar `"line"` del array `tacticalElementKinds`.
- Eliminar `case "line"` de `getTacticalElementLabel`.
- Cambiar label de `"measurement"` a `"Linea"`.

### 4.2 `src/domain/shapes/shapes.ts`

- Cambiar `TacticalShapeKind` de `"measurement" | "line" | ...` a `"measurement" | "circle" | "cone" | "rectangle"`.
- Eliminar `case "line"` de `createTacticalShape`.
- Actualizar `moveShape`, `setLinearShapeEnd`, `rotateLinearShape` y `validateShape`: quitar referencias a `"line"` dejando solo `"measurement"`.
- Añadir función `setShapeRadius(shape: SceneShape, radius: number): SceneShape` para círculo y cono (wrapper de `updateShape({ radius })`).
- Añadir función `setRectangleCorner(shape: SceneShape, cornerIndex: 0|1|2|3, cursor: WorldPoint): SceneShape` que computa nuevas dimensiones y anchor desde la esquina opuesta fija.

### 4.3 `src/domain/sessions/scene-document.ts`

- Cambiar `SceneShape["type"]` a `"measurement" | "circle" | "cone" | "rectangle"` (quitar `"line"`).

### 4.4 `src/domain/sessions/scene-schema.ts`

- Cambiar `linearShapeSchema` de `z.enum(["measurement", "line"])` a `z.literal("measurement")`.
- En el array `shapes`, añadir `.transform()` que filtra silenciosamente objetos `"line"` antes del discriminated union, o usar un `z.union` que atrapa `line` con `.transform(() => null)` y luego filtra nulos:
  ```ts
  const legacyLineSchema = z.object({ type: z.literal("line") }).transform(() => null);
  shapes: z.array(z.union([legacyLineSchema, z.discriminatedUnion("type", [...])]))
           .transform(arr => arr.filter(Boolean))
  ```

### 4.5 `src/render/pixi/PixiViewport.ts`

#### 4.5.1 Tipos

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

#### 4.5.2 Hit tests nuevos (solo operan sobre la forma seleccionada)

| Función | Condición |
|---|---|
| `hitTestCircleResizeHandle(pt)` | Forma seleccionada es círculo; distancia al centro ∈ `[radius-16, radius+18]` |
| `hitTestConeShapeRotationHandle(pt)` | Forma seleccionada es cono; distancia al centro ∈ `[72-16, 72+18]` |
| `hitTestConeShapeResizeHandle(pt)` | Forma seleccionada es cono; distancia a la punta ≤ 18 |
| `hitTestRectCornerHandle(pt) → cornerIndex \| null` | Forma seleccionada es rectángulo; distancia a alguna esquina ≤ 16 |

#### 4.5.3 Integración en `handlePointerDown`

Insertar los nuevos hit tests antes del `hitTestElement` general, en orden de prioridad:
1. `hitTestCircleResizeHandle` → mode `shape-circle-resize`
2. `hitTestConeShapeResizeHandle` → mode `shape-cone-resize`
3. `hitTestConeShapeRotationHandle` → mode `shape-cone-rotate`
4. `hitTestRectCornerHandle` → mode `shape-rect-resize`, guardar `cornerIndex` en drag state

#### 4.5.4 Integración en `handlePointerMove`

Añadir ramas para:
- `"shape-circle-resize"` → `updateCircleRadiusFromScreenPoint(elementId, point)`
- `"shape-cone-resize"` → `updateConeRadiusFromScreenPoint(elementId, point)`
- `"shape-cone-rotate"` → `updateConeDirectionFromScreenPoint(elementId, point)`
- `"shape-rect-resize"` → `updateRectCornerFromScreenPoint(elementId, handleIndex, point)`

#### 4.5.5 Métodos privados de actualización

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

#### 4.5.6 Render de handles (solo para elemento seleccionado)

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

#### 4.5.7 Ajustar `drawElement` en PixiViewport

El helper `drawElement` pinta el icono de arrastre de los elementos (no la forma real). Para `"line"`, eliminarlo del `switch`. Cambia el `case "measurement"` + `case "line"` combinado a solo `case "measurement"`.

### 4.6 `src/renderer/src/App.tsx`

#### 4.6.1 Contexto: eliminar `"line"`

- Eliminar las referencias a `"line"` en `selectedMeasurement`:
  ```ts
  const selectedMeasurement = selectedShape?.type === "measurement"
    ? measureDistance(...) : undefined;
  ```
- Eliminar `case "line"` del label en el panel de propiedades.

#### 4.6.2 Submenú "Herramientas de área"

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

#### 4.6.3 Nuevos handlers

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

#### 4.6.4 Extender `handleShapeDirectionChange`

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

#### 4.6.5 Pasar nuevas props a `<MapViewport>`

```tsx
onShapeRadiusChange={handleShapeRadiusChange}
onShapeRectResize={handleShapeRectResize}
```

### 4.7 `src/renderer/src/components/MapViewport.tsx`

Añadir props e inicialización de viewport:
```ts
onShapeRadiusChange: (elementId: string, radius: number) => void;
onShapeRectResize: (elementId: string, width: number, height: number, anchorX: number, anchorY: number) => void;
```
Pasar al `PixiViewport` en el `useEffect` de inicialización.

### 4.8 `src/renderer/src/styles.css`

Añadir estilos para el submenú:
```css
.has-submenu { position: relative; }
.context-submenu { display: none; position: absolute; left: 100%; top: 0; /* heredar estilos del menú padre */ }
.has-submenu:hover .context-submenu,
.has-submenu:focus-within .context-submenu { display: flex; flex-direction: column; }
```

---

## 5. Plan de trabajo

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

---

## 6. Criterios de aceptación

- No existe `"line"` en el dominio ni en la UI; las formas `line` en archivos `.ttrpgscene` antiguos se descartan silenciosamente.
- El menú contextual muestra "Herramientas de área ▶" que abre un submenú con Línea, Círculo, Cono, Rectángulo.
- Crear "Línea" desde el submenú crea una forma `measurement` con etiqueta de distancia.
- Seleccionar un círculo muestra un handle azul en su borde; arrastrarlo cambia el radio.
- Seleccionar un cono muestra un anillo de rotación y un handle de punta; ambos son arrastrables.
- Seleccionar un rectángulo muestra 4 handles en las esquinas; arrastrar cada uno redimensiona independientemente en X e Y.
- Los handles no se ven cuando la forma no está seleccionada.
- Los cambios de radio, dirección y dimensiones persisten en `.ttrpgscene`.
- `pnpm typecheck` y `pnpm test` pasan en verde.

---

## 7. Verificación

- **Unit tests:** `shapes.test.ts`, `scene-schema.test.ts`
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Smoke manual:** `pnpm dev`, abrir menú contextual → "Herramientas de área", crear cada forma, seleccionarla, probar todos los handles, guardar y recargar escena.

---

## 8. Checklist de cierre

- [ ] `line` eliminado del dominio, schema y UI.
- [ ] Migración silenciosa de formas `line` antiguas verificada.
- [ ] Submenú "Herramientas de área" funcionando en el menú contextual.
- [ ] Handle de borde del círculo implementado.
- [ ] Handles de anillo y punta del cono implementados.
- [ ] Handles de esquinas del rectángulo implementados.
- [ ] Nuevas callbacks implementadas en viewport, MapViewport y App.
- [ ] Tests actualizados y pasando.
- [ ] Smoke manual ejecutado.
