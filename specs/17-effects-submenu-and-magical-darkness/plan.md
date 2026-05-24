# Plan de implementacion tecnica - 17 Submenu de Efectos y Oscuridad Magica

## 1. Resumen

- **Spec fuente:** `./specs/17-effects-submenu-and-magical-darkness/17-effects-submenu-and-magical-darkness.md`
- **Objetivo:** Reorganizar el menu contextual para agrupar fuego y luces en `Efectos`, y agregar un efecto persistible `Oscuridad magica` que tape mapa, luces y darkvision sin tapar formas/mediciones/seleccion.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 06, 09, 10, 12, 13 y 15; modelo actual `SceneEffect`; render PixiJS con capas; panel contextual del sidebar.

## 2. Alcance

### Incluido

- Agregar submenu contextual `Efectos`.
- Mover al submenu `Efectos`:
  - `Fuego`;
  - `Pintar fuego`;
  - `Luz puntual`;
  - `Luz conica`;
  - `Oscuridad magica`.
- Quitar fuego y luces como acciones sueltas de la raiz del menu contextual.
- Crear tipo persistible `magical-darkness`.
- Crear, seleccionar, mover, borrar y editar oscuridad magica.
- Editar radio desde canvas y panel de propiedades; en panel se mide en cuadros de grilla y muestra equivalencia en la unidad activa del mapa (`ft` o `m`).
- Editar opacidad desde panel de propiedades.
- Mantener color negro fijo.
- Dibujar borde negro visible con opacidad alta aunque el relleno sea transparente.
- Renderizar oscuridad magica sobre mapa, tokens, luces, oscuridad ambiental y darkvision.
- Mantener grilla, formas, mediciones, handles, emojis y seleccion por encima.
- Guardar/cargar oscuridad magica en `.ttrpgscene`.
- Agregar tests de dominio/schema necesarios.

### Fuera de alcance

- Color configurable.
- Formas no circulares.
- Animaciones o shaders especiales.
- Reglas por personaje/token para ver a traves de oscuridad magica.
- Linea de vision o paredes.
- Cambios en fog of war fuera del orden de capas necesario.
- Cambios en el numero de version del documento si la union nueva es retrocompatible.

## 3. Decisiones tecnicas

- **Arquitectura:** La oscuridad magica vive en dominio como un efecto de escena, no como estado visual de Pixi. Renderer/React orquesta creacion y propiedades; Pixi solo renderiza y reporta interacciones.
- **Persistencia:** Convertir `SceneEffect` en union discriminada: `SceneFireEffect | SceneMagicalDarknessEffect`. Guardar ambos dentro de `effects`.
- **IPC / Electron:** Sin cambios. Guardado/carga siguen usando `scene:save` y `scene:load`.
- **Render / PixiJS:** Crear o usar una capa de render que quede despues de luces/darkvision/effects y antes de `fogOfWar`, `shapesAndMeasurements` y `selection`. Para claridad, mantener `magicalDarkness` en `renderLayerNames` despues de `effects` y antes de `fogOfWar`.
- **Orden visual:** La oscuridad magica debe tapar mapa, tokens, luces, fire light, darkvision y oscuridad ambiental. Fog of war queda por encima de oscuridad magica; las formas/mediciones/seleccion deben permanecer encima.
- **Validacion:** Schema Zod con discriminated union por `kind`. Escenas antiguas con solo `fire` siguen cargando.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:**
  - Renombrar o especializar el fuego actual a `SceneFireEffect`.
  - Agregar `SceneMagicalDarknessEffect`:

```ts
export interface SceneMagicalDarknessEffect {
  readonly id: string;
  readonly kind: "magical-darkness";
  readonly position: { readonly x: number; readonly y: number };
  readonly radius: number;
  readonly opacity: number;
  readonly visible: boolean;
}
```

- **Reglas puras:**
  - Crear helper `createMagicalDarknessEffect(id, position)`.
  - Crear helper `updateMagicalDarknessEffect(effect, patch)`.
  - Sanitizar radio positivo y opacidad `0..1`.
  - Mantener fuego con helpers existentes, pero tipados como `SceneFireEffect`.
- **Coordenadas / unidades:** Posicion y radio se guardan en coordenadas de mundo, igual que fuego/luces/formas. La UI del radio en el panel se expresa en cuadros de grilla y se convierte con `grid.cellSizeWorld`; tambien muestra la equivalencia segun `grid.unit`, `distancePerCell` o `metricDistancePerCell`.
- **Errores de dominio:** Id vacio, posicion no finita o radio invalido deben rechazarse/sanitizarse igual que efectos existentes.

## 5. Cambios por capa

### `domain`

- **`src/domain/sessions/scene-document.ts`**
  - Convertir `SceneEffect` en union discriminada.
  - Agregar `SceneMagicalDarknessEffect`.
  - Mantener `SceneFireEffect` con campos actuales de fuego.

- **`src/domain/effects/fire.ts`**
  - Cambiar tipos exportados para que `AnimatedFireEffect` sea compatible con `SceneFireEffect`.
  - Asegurar helpers de fuego solo acepten `SceneFireEffect`.

- **Nuevo modulo sugerido:** `src/domain/effects/magical-darkness.ts`
  - `createMagicalDarknessEffect`.
  - `updateMagicalDarknessEffect`.
  - `setMagicalDarknessRadius` si ayuda a reutilizar resize.
  - Tests unitarios.

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
  - Extender `handleCreateElement` o agregar flujo especifico para `magical-darkness`.
  - Crear ids tipo `magical-darkness-${n}`.
  - Al crear, agregar a `scene.effects` y seleccionar el nuevo id.
  - Filtrar/actualizar efectos por `kind` para no llamar helpers de fuego sobre oscuridad magica.
  - Al mover efectos, usar helper de fuego para `fire` y helper de oscuridad magica para `magical-darkness`.
  - En propiedades seleccionadas:
    - titulo `Oscuridad magica`;
    - control `Visible`;
    - input `Radio` en cuadros de grilla con etiqueta de distancia equivalente (`ft`/`m`);
    - slider `Opacidad`;
    - sin color ni luz.
  - Reorganizar menu contextual:
    - `Herramientas de area ▶`;
    - `Efectos ▶`.
  - Mover `Fuego`, `Pintar fuego`, `Luz puntual`, `Luz conica` dentro de `Efectos`.

- **`src/renderer/src/components/MapViewport.tsx`**
  - Tipos permanecen `readonly SceneEffect[]`, pero callbacks de resize pueden necesitar nombres genericos:
    - `onEffectRadiusChange` o mantener `onFireZoneRadiusChange` solo para fuego y agregar `onMagicalDarknessRadiusChange`.

### `render`

- **`src/domain/map/render-layers.ts`**
  - Agregar capa `magicalDarkness` despues de `effects` y antes de `fogOfWar`.
  - Mantener el orden de gameplay: mapa -> tokens -> oscuridad -> luces -> efectos -> oscuridad magica -> fog -> herramientas de area.

- **`src/render/pixi/PixiViewport.ts`**
  - Separar render de fuego y oscuridad magica:
    - fuegos en `effects`;
    - oscuridad magica en `magicalDarkness`.
  - Ajustar funciones que asumen `effect.zone`:
    - `drawFireLight`;
    - `drawSceneEffect`;
    - `drawFireResizeHandles`;
    - `drawFireZoneHint`;
    - `buildFireLightEraseGraphic`;
    - `buildDarkvisionColorMask`;
    - hit testing;
    - selectable elements.
  - Agregar `drawMagicalDarknessEffect`.
  - Agregar handles de radio para oscuridad magica en `selection`.
  - Agregar hit test de centro y handle de radio.
  - Agregar drag mode de resize para oscuridad magica o reutilizar un modo generico de radius resize.
  - Confirmar que `findSelectableElement` incluye oscuridad magica.
  - Confirmar que `drawSelection` puede seleccionar este tipo sin romper radio visual.

## 6. Plan de trabajo

1. Convertir `SceneEffect` a union `fire | magical-darkness` en tipos.
2. Crear modulo de dominio `magical-darkness` con helpers y tests.
3. Actualizar schema Zod para `effects` como discriminated union.
4. Actualizar tests de schema para guardar/cargar oscuridad magica y escenas antiguas con fuego.
5. Ajustar helpers de fuego y consumidores para filtrar `effect.kind === "fire"`.
6. Agregar creacion de oscuridad magica en `App.tsx`.
7. Agregar propiedades de oscuridad magica en sidebar contextual.
8. Reorganizar menu contextual con submenu `Efectos`.
9. Agregar capa `magicalDarkness` al orden de render.
10. Implementar render del circulo negro con borde fijo.
11. Implementar seleccion, hit testing, movimiento y resize de radio en Pixi.
12. Verificar darkvision/luces: oscuridad magica debe dibujarse despues de luces/efectos y no ser perforada por luces, pero antes de fog of war.
13. Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.
14. Smoke manual en `pnpm dev`.

## 7. Testing y verificacion

- **Unit tests:**
  - Crear oscuridad magica con defaults.
  - Sanitizar radio/opacidad.
  - Mover/update sin mutar campos no tocados.
  - Schema acepta `magical-darkness`.
  - Schema sigue aceptando `fire`.
- **Integration tests:** No se esperan nuevos casos de IPC.
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  1. Abrir menu contextual y confirmar `Herramientas de area` + `Efectos`.
  2. Confirmar que fuego/luces no estan en raiz.
  3. Crear oscuridad magica.
  4. Moverla, cambiar radio desde handle, cambiar radio en cuadros desde panel y verificar equivalencia `ft`/`m`, cambiar opacidad desde panel.
  5. Poner mapa iluminado y confirmar que la oscuridad magica tapa luz/mapa.
  6. Activar oscuridad ambiental + luz y confirmar que la luz no revela la oscuridad magica.
  7. Activar darkvision y confirmar que la oscuridad magica permanece oscura.
  8. Bajar opacidad y confirmar borde negro visible.
  9. Crear figuras/mediciones encima y confirmar que se ven sobre la oscuridad magica.
  10. Guardar/cargar escena y confirmar persistencia.

## 8. Riesgos y mitigaciones

- **Riesgo:** Funciones actuales de fuego asumen que todo `SceneEffect` tiene `zone`.
  **Mitigacion:** Convertir a union discriminada y filtrar por `kind === "fire"` en todos los consumidores.
- **Riesgo:** La oscuridad magica queda debajo de darkvision o luces y no tapa como debe.
  **Mitigacion:** Capa dedicada posterior a luces/darkvision y pruebas manuales con los tres escenarios visuales.
- **Riesgo:** La oscuridad magica tapa handles/seleccion y dificulta edicion.
  **Mitigacion:** Renderizar handles y seleccion en capa `selection`, por encima de `magicalDarkness`.
- **Riesgo:** Schema rompe escenas viejas con fuego.
  **Mitigacion:** Tests de parseo para escenas con `kind: "fire"` existentes.
- **Riesgo:** Menu contextual anidado se vuelve dificil de usar.
  **Mitigacion:** Reutilizar el patron existente de `Herramientas de area` y mantener labels cortos.

## 9. Criterios de aceptacion

- Existe submenu contextual `Efectos`.
- `Fuego`, `Pintar fuego`, `Luz puntual`, `Luz conica` y `Oscuridad magica` estan dentro de `Efectos`.
- Fuego y luces ya no aparecen como acciones sueltas en raiz.
- `Oscuridad magica` se crea en la posicion del click derecho.
- Se puede seleccionar, mover y borrar con `Delete`/`Backspace`.
- Se puede cambiar radio desde canvas.
- Se puede cambiar radio desde sidebar contextual en cuadros de grilla y ver equivalencia en `ft`/`m`.
- Se puede cambiar opacidad desde sidebar contextual.
- Color negro no se expone como control.
- Con mapa iluminado, tapa mapa, tokens y luces debajo.
- Con oscuridad ambiental y luces, sigue negra.
- Con darkvision, sigue negra.
- Con opacidad baja, el relleno baja pero el borde negro sigue visible.
- Figuras, mediciones, emojis, handles y seleccion quedan visibles encima.
- Guardar/cargar conserva oscuridad magica.
- Escenas antiguas siguen cargando.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/17-effects-submenu-and-magical-darkness/17-effects-submenu-and-magical-darkness.md`
- `specs/17-effects-submenu-and-magical-darkness/plan.md`
- Si la implementacion modifica el alcance de efectos/fuego/luces, actualizar specs 06, 09, 10, 12 o 15 solo en los puntos afectados.

## 11. Checklist de cierre

- [x] `SceneEffect` convertido en union discriminada.
- [x] Helper de oscuridad magica creado.
- [x] Tests de dominio agregados.
- [x] Schema actualizado con `magical-darkness`.
- [x] Tests de schema agregados/actualizados.
- [x] Menu contextual `Efectos` implementado.
- [x] Fuego y luces movidos al submenu `Efectos`.
- [x] Creacion de oscuridad magica implementada.
- [x] Propiedades de oscuridad magica en sidebar implementadas.
- [x] Capa/render de oscuridad magica implementado.
- [x] Seleccion, movimiento y resize implementados.
- [x] Persistencia guardar/cargar verificada por schema y build.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [ ] Smoke manual realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
