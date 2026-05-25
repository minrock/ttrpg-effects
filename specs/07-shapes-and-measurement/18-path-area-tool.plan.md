# Plan de implementacion tecnica - 18 Herramienta de Path

## 1. Resumen

- **Spec fuente:** `./specs/07-shapes-and-measurement/18-path-area-tool.md`
- **Objetivo:** Agregar la herramienta `Path/Camino` dentro de `Herramientas de area` para dibujar caminos segmentados con snap al centro de celda, preview de distancia acumulada, confirmacion con `Enter`, cancelacion con `Escape`, borrado incremental con `Backspace`, persistencia y edicion posterior de puntos.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 07, 10, 11, 13 y 15; helpers actuales de medicion; modelo `SceneShape`; menu contextual; render PixiJS de formas/handles; panel de propiedades en sidebar.

## 2. Alcance

### Incluido

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

### Fuera de alcance

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

## 3. Decisiones tecnicas

- **Arquitectura:** El path se modela como una forma tactica de dominio (`SceneShape`) con `type: "path"`. React maneja el estado temporal de dibujo; PixiJS renderiza preview/handles y reporta interacciones. La distancia se calcula con helpers de dominio, no dentro de Pixi o JSX.
- **Persistencia:** Extender `SceneShape` y el schema Zod para aceptar `type: "path"` con `points`. No persistir la distancia calculada; se deriva de `points`, `grid` y `settings`.
- **IPC / Electron:** Sin cambios. Guardar/cargar escena sigue usando los flujos existentes.
- **Render / PixiJS:** Renderizar path confirmado en la capa de formas/mediciones actual, como herramienta de area final por encima de mapa, tokens, oscuridad, luces, oscuridad magica y fog of war. Renderizar path temporal y handles de puntos en capa de seleccion/preview para quedar por encima de overlays.
- **Coordenadas:** Guardar puntos en coordenadas de mundo, ya ajustados al centro de celda. Para clicks y drag de puntos, usar helper de snap al centro de celda.
- **Validacion:** Schema debe requerir al menos dos puntos para paths persistidos. El estado temporal puede tener cero o un punto, pero nunca debe guardarse.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

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

## 5. Cambios por capa

### `domain`

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

### `application`

- Sin cambios esperados.

### `infrastructure`

- Sin cambios esperados.

### `main`

- Sin cambios esperados.

### `preload`

- Sin cambios esperados.

### `renderer`

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
  - Si se selecciona path y sidebar esta cerrado, reutilizar comportamiento de spec 15.

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

### `render`

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

## 6. Plan de trabajo

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

## 7. Testing y verificacion

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

## 8. Riesgos y mitigaciones

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

## 9. Criterios de aceptacion

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

## 10. Documentacion afectada

- `specs/07-shapes-and-measurement/18-path-area-tool.md`
- `specs/07-shapes-and-measurement/18-path-area-tool.plan.md`
- Si se ajusta el comportamiento general de herramientas tacticas, actualizar specs 07, 10, 11, 13 o 15 solo en los puntos afectados.

## 11. Checklist de cierre

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
