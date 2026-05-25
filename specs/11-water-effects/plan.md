# Plan de implementacion tecnica - 23 Aguas, rios y cuerpos de agua

## 1. Resumen

- **Spec fuente:** `./specs/11-water-effects/spec.md`
- **Objetivo:** Implementar un efecto de agua que permita dibujar rios/riachuelos abiertos y cuerpos de agua cerrados, renderizados con GIFs internos de agua/costa, seleccionables, editables y persistibles en `.ttrpgscene`.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Specs 02 (formato de escena), 03 (modelo de interaccion), 04 (grilla/mapa), 11 (aside derecho), 15 (propiedades de objeto seleccionado), 17 (submenu de efectos), 18 (patron de herramienta tipo path), 23 assets GIF internos de agua.

## 2. Alcance

### Incluido

- Crear efecto `water` con variantes `river` y `water-body`.
- Agregar herramienta `Agua` en el submenu de efectos.
- Dibujar polilineas con preview de segmento activo.
- Confirmar con `Enter`, cancelar con `Escape` y borrar ultimo punto con `Backspace`.
- Detectar si el trazo forma loop para crear un cuerpo de agua cerrado.
- Crear rios/riachuelos cuando el trazo no cierra.
- Permitir editar ancho en modo `river`.
- Permitir editar rotacion del patron de agua en modo `river` desde una manivela sobre el circulo externo de seleccion.
- Permitir editar rotacion de la linea/cauce en modo `river` desde una segunda manivela sobre un circulo interno de seleccion.
- Permitir ajustar `hue` y `saturation` del GIF de agua desde el aside derecho.
- Renderizar agua usando los 9 GIFs internos:
  - 1 tile interior de agua.
  - 4 costas rectas.
  - 4 costas diagonales con mascara completa.
- Guardar/cargar efectos de agua en `.ttrpgscene`.
- Mostrar propiedades del agua seleccionada en el aside derecho.

### Fuera de alcance

- Simulacion fisica de corriente, profundidad o terreno.
- Reglas automaticas de movimiento dificil, nado o combate.
- Interaccion con luz, oscuridad, niebla o vision.
- Edicion avanzada de vertices despues de confirmado, salvo mover el objeto completo.
- Importar tiles de agua externos desde UI.
- Generacion procedural en runtime de nuevos GIFs.

## 3. Decisiones tecnicas

- **Arquitectura:** El dominio define tipos, validaciones, deteccion de loop, medicion/ancho y geometria serializable. React orquesta la herramienta y el estado visual. PixiJS queda encapsulado en el adapter de render.
- **Persistencia:** Extender el documento versionado de escena con `effects` de tipo `water`. Escenas antiguas deben cargar sin agua inicializando campos ausentes de forma segura.
- **IPC / Electron:** No se requieren canales nuevos. Los GIFs son assets internos del renderer bajo `/effects/water/`.
- **Render / PixiJS:** Cargar GIFs con `Assets.load` desde rutas internas (`/effects/water/*.gif`). Usar sprites/tile sprites enmascarados para el agua y costa, evitando un sprite por pixel/celda. Limpiar sprites, mascaras y recursos al re-renderizar o destruir escena.
- **Validacion:** Validar variante, puntos finitos, ancho positivo, opacidad, visibilidad e ids estables en schema de escena.
- **Dependencias nuevas:** Ninguna prevista.

## 4. Diseno de dominio

- **Entidades / tipos:**
  - `SceneWaterEffect`.
  - `WaterEffectKind = "river" | "water-body"`.
  - `WaterPoint = { x: number; y: number }`.
  - `WaterEffectStyle` con `opacity`, `visible`, `lineRotation`, `patternRotation`, `hue` y `saturation` para rios y cuerpos de agua; `width` aplica solo a rios.
- **Reglas puras:**
  - `isWaterLoop(points, threshold)` detecta si ultimo punto cierra contra el primero.
  - `normalizeWaterPoints(points)` elimina puntos duplicados o demasiado cercanos.
  - `createRiverWaterEffect(points, width)` valida minimo 2 puntos.
  - `createClosedWaterEffect(points)` valida minimo 3 puntos utiles y cierra el poligono.
  - `translateWaterEffect(effect, delta)` mueve todos los puntos.
  - `updateWaterWidth(effect, width)` aplica clamps razonables solo a rios.
  - `mergeConsecutiveRiverEffects(rivers, incoming, maxEndpointDistance)` une rios consecutivos cuando sus extremos quedan a 1 cuadro o menos.
- **Coordenadas / unidades:** Puntos y ancho se guardan en coordenadas de mundo. El threshold de cierre se calcula desde `grid.cellSizeWorld`, por ejemplo media celda.
- **Errores de dominio:** Rechazar trazos sin puntos suficientes, ancho no positivo, puntos no finitos y variante desconocida.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/effects/water.ts` con tipos y helpers puros.
- Extender tipos de escena para incluir `water` dentro de efectos.
- Actualizar schema de escena para validar/persistir agua.
- Agregar tests unitarios para loop, normalizacion, creacion, movimiento y clamps de ancho.

### `application`

- Reusar el flujo actual de estado de escena/efectos.
- Si existen helpers de creacion/actualizacion de efectos, extenderlos para agua.
- Mantener reglas de geometria fuera de React.

### `infrastructure`

- No se requieren cambios de filesystem/SQLite.
- Asegurar que los assets internos de agua queden versionados en `src/renderer/public/effects/water/`.

### `main`

- Sin cambios esperados.
- Mantener CSP compatible con carga interna desde `'self'`.

### `preload`

- Sin API nueva.

### `renderer`

- Agregar accion `Agua` en el submenu de efectos.
- Agregar modo de herramienta `water-draw`.
- Click agrega puntos; mouse move actualiza preview; `Enter`, `Escape` y `Backspace` gestionan finalizacion/cancelacion.
- Al confirmar un rio abierto, buscar rios existentes conectados por extremos dentro de 1 cuadro y consolidarlos en un unico efecto antes de insertar en escena.
- Mostrar cursor apropiado durante dibujo.
- Mostrar propiedades de agua seleccionada en aside:
  - Variante solo lectura (`Rio`/`Cuerpo de agua`).
  - Opacidad.
  - Visibilidad.
  - Ancho editable solo para `river`.
  - Rotacion de linea/geometria y patron visibles para `river` y `water-body`; la edicion se hace desde dos manivelas separadas sobre circulos de seleccion con gap suficiente.
  - Hue y saturacion editables para el GIF de agua.
- Permitir mover efectos de agua seleccionados como otros efectos.

### `render`

- Agregar render de preview de agua durante dibujo.
- Renderizar rios como un trazo ancho con agua interior y costas en ambos lados.
- En rios, repetir el GIF de agua con multiples sprites a lo largo del cauce y recortarlos con la mascara del rio; no estirar un unico GIF sobre todo el bounding box.
- Usar tiles GIF pequenos y con paso equivalente al tamano del tile para evitar solapamiento/apilamiento visual.
- Agregar tiles GIF adicionales centrados en extremos y vertices del rio para cubrir caps redondeados y esquinas dentro de la mascara.
- En rios y cuerpos de agua seleccionados, renderizar una manivela interna para `lineRotation` y una externa para `patternRotation`.
- Aplicar filtros de `hue` y `saturation` al GIF de agua sin afectar costa/vector de seleccion.
- Renderizar cuerpos cerrados como poligono con interior de `water-center.gif` repetido en mosaico y recortado por mascara; `patternRotation` rota los GIFs del mosaico y `lineRotation` rota la geometria del poligono.
- El mosaico de cuerpos cerrados debe usar tiles pequenos y continuos sin overlap intencional entre sprites.
- Renderizar borde/costa del poligono con costa vectorial continua sobre el GIF enmascarado. Los GIFs direccionales quedan versionados para refinamiento visual posterior sin cambiar el modelo de dominio.
- Usar mascaras para recortar GIFs a la geometria correspondiente.
- Agregar hit testing para seleccionar agua sobre el trazo o dentro del poligono.
- Liberar `GifSprite`, mascaras y contenedores en cada refresh.
- Destruir hijos retirados de capas dinamicas (`effects`, `selection`, `lights`, `grid`, `fog`, etc.) en lugar de solo removerlos, para evitar acumulacion de objetos Pixi.
- Hacer la limpieza de capas compatible con `GifSprite`: destruir recursivamente los hijos y luego el objeto, sin usar opciones de destruccion de texturas compartidas.
- Aplicar un limite razonable de sprites animados por efecto de agua; si se supera, aumentar el tile size progresivamente hasta un maximo para preservar rendimiento.

## 6. Plan de trabajo

1. Registrar los 9 GIFs internos de agua en `src/renderer/public/effects/water/`.
2. Modelar `SceneWaterEffect` y helpers puros en dominio.
3. Extender schema/documento de escena para serializar `water`.
4. Agregar tests de dominio para loop, rios, union de rios consecutivos, cuerpos cerrados y movimiento.
5. Agregar herramienta `Agua` al submenu de efectos.
6. Implementar estado de dibujo de polilinea con preview y atajos `Enter`/`Escape`/`Backspace`.
7. Crear efecto `river` o `water-body` al confirmar segun deteccion de loop.
8. Integrar seleccion, movimiento, rotaciones y propiedades de agua en el aside derecho.
9. Implementar render Pixi de rios con ancho configurable y costa lateral.
10. Implementar render Pixi de cuerpos cerrados con multiples sprites GIF repetidos, relleno interior enmascarado y costa del borde.
11. Integrar guardado/carga de `.ttrpgscene`.
12. Ejecutar verificacion automatica y smoke manual.

## 7. Testing y verificacion

- **Unit tests:** Deteccion de loop, normalizacion de puntos, validacion de minimo de puntos, ancho de rio, traslado de agua y schema de escena.
- **Integration tests:** Guardar/cargar escena con rio y cuerpo cerrado.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, cargar mapa, crear rio abierto, editar ancho, moverlo, crear loop cerrado, confirmar relleno interior/costa, guardar escena, cargar escena y verificar que ambos efectos reaparecen.

## 8. Riesgos y mitigaciones

- **Riesgo:** Render costoso si se crean demasiados sprites para costas largas o cuerpos grandes.
  **Mitigacion:** Agrupar segmentos, usar mascaras por geometria y limitar objetos por segmento significativo, no por pixel/celda.
- **Riesgo:** La deteccion de loop puede cerrar accidentalmente rios.
  **Mitigacion:** Usar threshold basado en celda y mostrar preview visual de cierre cuando el cursor quede cerca del punto inicial.
- **Riesgo:** Las diagonales pueden leerse como islas o parches.
  **Mitigacion:** Mantener las mascaras diagonales como division completa tierra/agua y documentarlo como criterio visual.
- **Riesgo:** Persistencia incompatible con escenas antiguas.
  **Mitigacion:** Schema tolerante con `effects` existentes y defaults seguros para escenas sin agua.

## 9. Criterios de aceptacion

- Existen y se versionan los 9 GIFs internos de agua.
- El usuario puede crear un rio abierto desde la herramienta `Agua`.
- Los rios consecutivos se unen automaticamente en un unico efecto si sus extremos quedan a 1 cuadro o menos.
- El usuario puede crear un cuerpo cerrado al dibujar un loop.
- El rio permite editar ancho desde el aside derecho.
- El rio permite editar la rotacion del patron de agua arrastrando la manivela externa.
- El rio permite editar la rotacion de la linea/cauce arrastrando la manivela interna.
- El cuerpo cerrado permite editar la orientacion de su poligono y la rotacion del patron GIF con las mismas dos manivelas.
- El aside derecho permite ajustar hue y saturacion del GIF.
- El cuerpo cerrado rellena su interior con agua animada.
- El cuerpo cerrado rellena su interior con multiples GIFs repetidos, no con un unico GIF estirado.
- Las costas rectas y diagonales se renderizan como costa continua, no como islas.
- Agua se puede seleccionar, mover, ocultar y guardar/cargar.
- `pnpm typecheck` y `pnpm test` pasan.

## 10. Documentacion afectada

- `./specs/11-water-effects/spec.md`
- Este plan.
- Si durante implementacion cambia el formato `.ttrpgscene`, actualizar docs/schema relacionados.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
