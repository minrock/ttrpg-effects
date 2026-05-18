# Plan de implementacion tecnica - 09 - Zonas de Fuego Vectorial y Pintado por Celdas

## 1. Resumen

- **Spec fuente:** `./specs/09-fire-gif-effect-zones/09-fire-gif-effect-zones.md`
- **Objetivo:** Reemplazar el enfoque GIF/freehand por fuego vectorial rojo y pintado por celdas de grilla con pincel circular.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 06, 07 y 08; sistema de efectos existente; escena versionada; PixiJS viewport.

## 2. Alcance

- Remover carga y render de GIF para fuego.
- Remover herramienta freehand de fuego.
- Mantener fuego circular como area roja opaca.
- Mantener handles para radio visual del fuego y radio de luz (solo en modo `circle`).
- Agregar zona `cells` para fuego pintado en cuadrados de grilla.
- Agregar modo `Pintar fuego` en toolbar y menu contextual.
- Convertir click/drag del pincel a celdas de grilla en coordenadas de mundo.
- Radio de pincel por defecto: 25 unidades de mundo.
- Guardar/cargar zonas `cells` en `.ttrpgscene`.
- Iluminacion por celdas: anillo 1 (luz brillante) y anillo 2 (luz tenue) calculados geometricamente desde el contorno de celdas pintadas.
- Mantener la luz del fuego integrada al erase mask de oscuridad y fog of war.

## 3. Decisiones tecnicas

- **Dominio:** `FireZone` queda como union `circle | cells`; `cells` guarda celdas `{ x, y, size }` y `radius` para el pincel.
- **Render:** El fuego se dibuja con `Graphics` de Pixi: circulos o rectangulos rojos opacos, sin assets externos.
- **Pintado:** El viewport calcula las celdas tocadas usando el origen mundial (0, 0) y `cellSizeWorld`, alineado al grid visual independientemente de la posicion del mapa.
- **Persistencia:** El schema acepta zonas `cells` y mantiene default circular para escenas viejas sin `zone`.
- **Seguridad:** No hay IPC ni acceso filesystem nuevo.

## 4. Cambios por capa

### `domain`

- Reemplazar zona freehand por zona `cells`.
- Agregar helper `createCellFireZone`.
- Mantener helper `createCircleFireZone`.
- Mantener sanitizacion de radio, color, escala, opacidad y luz.
- Actualizar tests de dominio para celdas pintadas.

### `renderer`

- Reemplazar modo `fire-freehand` por `fire-paint`.
- Agregar callback `onFirePaint`.
- Si hay fuego por celdas seleccionado, fusionar celdas nuevas con existentes.
- Si no hay fuego por celdas seleccionado, crear un nuevo efecto `fire` con zona `cells`.
- Exponer control de pincel en propiedades del fuego por celdas.

### `render`

- Remover `GifSource`, `GifSprite`, carga de `assets/effects/fire.gif` y destructores especiales.
- Renderizar zona circular como rojo opaco.
- Renderizar zona `cells` como cuadrados rojos opacos.
- Mantener handles naranja y luz para resize solo en modo `circle`; en modo `cells` no se muestran.
- Luz del fuego en modo `cells`: calcular anillo brillante (adyacentes al fuego) y anillo tenue (adyacentes al anillo brillante) con `computeCellRings`.
- Mantener luz del fuego en capa `lights` y como erase mask de oscuridad/fog para ambos modos.
- Celdas pintadas usan origen (0,0) mundial para garantizar alineacion con el grid al mover el mapa.

## 5. Plan de trabajo

1. Eliminar import/carga/render de GIF.
2. Cambiar modelo `FireZone` de `freehand` a `cells`.
3. Actualizar schema y tipos de escena.
4. Cambiar herramienta de UI a `Pintar fuego`.
5. Calcular celdas pintadas desde viewport usando grilla.
6. Fusionar celdas pintadas en estado React.
7. Renderizar circulos/celdas rojas con `Graphics`.
8. Mantener handles de radio de fuego y luz.
9. Actualizar README/spec/plan.
10. Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.

## 6. Criterios de aceptacion

- No queda carga de GIF en el render.
- No queda modo freehand para fuego en UI.
- `Pintar fuego` crea o extiende zonas por celdas.
- Las celdas pintadas se alinean al grid visual aunque el mapa se haya movido.
- El radio del pincel por defecto es 25; decide cuantas celdas se pintan.
- El fuego circular se ve como area roja opaca con handles de resize.
- El fuego por celdas se ve como cuadrados rojos opacos sin handles de resize.
- En modo `cells`, el anillo 1 adyacente emite luz brillante y el anillo 2 emite luz tenue.
- La oscuridad y el fog of war se revelan sobre fuego + anillo 1 + anillo 2.
- Guardar/cargar conserva zonas `cells`.
- La luz del fuego revela oscuridad igual que una luz normal.

## 7. Verificacion

- **Unit tests:** dominio de fuego y schema de escenas.
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Smoke manual:** `pnpm dev`, crear fuego circular, ajustar radio naranja, activar `Pintar fuego`, pintar una celda y varias celdas, guardar/cargar escena.

## 8. Checklist de cierre

- [x] GIF removido del render.
- [x] Freehand removido del flujo principal.
- [x] Zona `cells` agregada.
- [x] Pintado por celdas implementado.
- [x] Render rojo vectorial implementado.
- [x] Handles de fuego/luz solo en modo `circle`.
- [x] Handles ocultos en modo `cells` (sin circulo naranja ni amarillo).
- [x] Iluminacion por anillos de celdas implementada (`computeCellRings`).
- [x] Alineacion de celdas al grid corregida (origen 0,0 en vez de map.position).
- [x] Radio de pincel por defecto fijado en 25.
- [x] Documentacion actualizada.
- [x] Verificacion automatica ejecutada.
- [ ] Smoke manual ejecutado.
