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
- Mantener handles para radio visual del fuego y radio de luz.
- Agregar zona `cells` para fuego pintado en cuadrados de grilla.
- Agregar modo `Pintar fuego` en toolbar y menu contextual.
- Convertir click/drag del pincel a celdas de grilla en coordenadas de mundo.
- Guardar/cargar zonas `cells` en `.ttrpgscene`.
- Mantener la luz del fuego integrada al erase mask de oscuridad.

## 3. Decisiones tecnicas

- **Dominio:** `FireZone` queda como union `circle | cells`; `cells` guarda celdas `{ x, y, size }` y `radius` para el pincel.
- **Render:** El fuego se dibuja con `Graphics` de Pixi: circulos o rectangulos rojos opacos, sin assets externos.
- **Pintado:** El viewport calcula las celdas tocadas usando el origen de calibracion de grilla y `cellSizeWorld`.
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
- Mantener handles naranja y luz para resize.
- Mantener luz del fuego en capa `lights` y como erase mask de oscuridad/fog.

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
- Las celdas pintadas se alinean a la grilla.
- El radio del pincel decide cuantas celdas se pintan.
- El fuego circular se ve como area roja opaca.
- El fuego por celdas se ve como cuadrados rojos opacos.
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
- [x] Handles de fuego/luz conservados.
- [x] Documentacion actualizada.
- [x] Verificacion automatica ejecutada.
- [ ] Smoke manual ejecutado.
