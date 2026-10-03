# Plan tecnico - 34 Filtros de hora del dia por escena

## 1. Resumen

- **Spec fuente:** `./specs/34-daytime-map-filters/spec.md`.
- **Objetivo:** aplicar un preset unico de hora del dia a la imagen base de todos los mapas de una escena o a las regiones cubiertas por una mascara local de cada mapa.
- **Estado:** implementado; pendiente de validacion funcional y cierre de la feature.
- **Dependencias:** specs 01 (render), 04 (grilla), 09 (mascaras de fog), 13 (darkvision), 15 (Player View), 29 (escenas multi-mapa) y 31 (fondo por mapa).
- **Sin dependencias nuevas:** se reutilizan PixiJS, `Graphics`, las utilidades de grilla y las convenciones de mascaras existentes.

## 2. Alcance tecnico

### Incluido

- Estado de ambiente a nivel escena: habilitado, preset y cobertura.
- Geometria de mascara a nivel mapa: trazos topologicos y circulares ordenados.
- Presets discretos `day`, `sunset` y `night` mediante una capa de tintado multiplicativo estable y documentada.
- Cobertura `scene` mediante una mascara blanca/uniforme para la imagen completa.
- Cobertura `painted` mediante una mascara compuesta de Pixi por mapa activo, reconstruida desde sus trazos al cambiarla.
- Herramientas DM para pintar y borrar trazos topologicos/circulares, con preview privado.
- Reproduccion visual en Player View por el snapshot de escena ya existente.
- Parse/serialize retrocompatible de escenas V2 sin campos de ambiente.

### Fuera de alcance

- Clima, animaciones, tiempo continuo, presets por zona, editor de matrices o filtros acumulables.
- Persistir una textura rasterizada o cualquier recurso Pixi dentro de `.ttrpgscene`.
- Aplicar el filtro a tokens, grilla, UI, texto, efectos, fog, oscuridad o reglas de vision.
- Cargar texturas de mapas inactivos para precalentar sus mascaras.

## 3. Modelo de dominio y persistencia

### Tipos nuevos

Crear `src/domain/environment/daytime-filter.ts` con tipos y helpers puros:

```ts
export type DaytimePreset = "day" | "sunset" | "night";
export type DaytimeCoverage = "scene" | "painted";
export type DaytimeBrushTopology = "topology" | "circular";
export type DaytimeMaskStrokeMode = "paint" | "erase";

export interface SceneDaytimeFilter {
  readonly enabled: boolean;
  readonly preset: DaytimePreset;
  readonly coverage: DaytimeCoverage;
}

export type DaytimeMaskStroke =
  | {
      readonly id: string;
      readonly topology: "topology";
      readonly mode: DaytimeMaskStrokeMode;
      readonly cells: readonly GridCell[];
    }
  | {
      readonly id: string;
      readonly topology: "circular";
      readonly mode: DaytimeMaskStrokeMode;
      readonly points: readonly WorldPoint[];
      readonly radius: number;
    };

export interface SceneDaytimeMask {
  readonly strokes: readonly DaytimeMaskStroke[];
}
```

Decisiones de modelo:

- La lista ordenada de trazos representa las operaciones de pintura y borrado. Permite que un borrador circular recorte regiones creadas por topologia, y viceversa, sin implementar booleanas geometricas fragiles en el dominio.
- El renderer reproduce cada trazo sobre una unica mascara compuesta: blanco/opaco para `paint`, transparente para `erase`.
- Los trazos topologicos almacenan `GridCell` con su layout, siguiendo el patron de fuego; los circulares almacenan puntos simplificados y radio en mundo, siguiendo el patron de reveal de fog.
- El documento persiste solo la geometria. La `RenderTexture`, sus firmas, sprites y caches son transitorios.

### Integracion con escena V2

1. Extender `SceneDocumentV2` con `daytimeFilter: SceneDaytimeFilter` a nivel escena.
2. Extender `SceneMapDocument` con `daytimeMask: SceneDaytimeMask` a nivel mapa.
3. Mantener los runtime fields de `SceneDocumentV2` sincronizados desde el mapa activo mediante `syncActiveMapFromRuntimeFields` y `syncRuntimeFieldsFromActiveMap`; `daytimeFilter` no participa de esa sincronizacion porque pertenece a escena.
4. Extender `createEmptyScene()` con `createDefaultDaytimeFilter()` y `createDefaultSceneMap()` con `createDefaultDaytimeMask()`.
5. Extender `sceneDocumentV1Schema`, `sceneMapDocumentSchema` y `sceneDocumentV2Schema` con defaults tolerantes:
   - escena antigua: `{ enabled: false, preset: "day", coverage: "scene" }`;
   - mapa antiguo: `{ strokes: [] }`.
6. No cambiar `SCENE_DOCUMENT_VERSION`: los campos son aditivos y los defaults permiten abrir V2 existente. La migracion V1 -> V2 recibe los mismos defaults.

### Helpers y validaciones

Implementar y probar:

- `createDefaultDaytimeFilter`, `createDefaultDaytimeMask`.
- `updateDaytimeFilter(filter, patch)` con enums cerrados.
- `appendDaytimeTopologyStroke(mask, id, mode, cells)` con deduplicacion de celdas dentro del mismo stroke y sin guardar strokes vacios.
- `appendDaytimeCircularStroke(mask, id, mode, points, radius)` con puntos finitos, radio positivo y simplificacion equivalente a fog.
- `clearDaytimeMask(mask)`.
- `getDaytimeMaskSummary(mask)` para contador de trazos, celdas y trazos circulares en UI.
- Sanitizacion de ids, topologias, modos, radios, celdas, puntos y limites razonables de longitud para impedir escenas locales corruptas o excesivamente grandes.

## 4. Interaccion y renderer React

### Estado temporal

1. Extender `InteractionTool` con `daytime-mask-paint` y `daytime-mask-erase`.
2. En `App.tsx`, agregar estado visual efimero:
   - `daytimeBrushTopology: "topology" | "circular"`;
   - `daytimeBrushRadius` en mundo, expuesto como cuadros con incrementos de `0.25` cuadros;
   - contador/ref de ids `daytime-mask-`;
   - preview y stroke actual permanecen dentro de Pixi hasta confirmar el drag.
3. Cancelar la herramienta al desactivar el filtro, cambiar de `painted` a `scene`, cambiar mapa, presionar `Escape` o activar otra herramienta incompatible.
4. El modo `painted` puede editarse aunque el filtro este temporalmente desactivado. Mientras la herramienta de pintura esta activa, el renderer pausa la capa de ambiente y muestra exclusivamente la guia de puntero y la mascara roja privada; al salir, reanuda el filtro si esta habilitado.

### Controles del DM

1. Agregar `Ambiente` como seccion plegable de la tab `Mapa` de `DmAsidePanel`/sidebar actual, junto a darkness y fog.
2. Usar:
   - `Switch` para activar `Hora del dia`;
   - control segmentado para `Toda la escena` / `Zonas pintadas`;
   - control segmentado o menu compacto para `Dia` / `Atardecer` / `Noche`;
   - control segmentado para `Topologia` / `Circular` solo en cobertura pintada;
   - botones de icono con tooltip para pintar, borrar y limpiar mascara;
   - slider de tamano de pincel, para topologia y circular, convertido a cuadros con incrementos de `0.25` y almacenado en mundo.
3. La mutacion de preset y cobertura actualiza `scene.daytimeFilter`; las operaciones de stroke actualizan solo `scene.daytimeMask` del mapa activo y luego dejan que los helpers de mapas sincronicen dicho mapa.
4. Limpiar mascara pide confirmacion si existe algun trazo y afecta solamente el mapa activo.
5. Mostrar un texto corto no interactivo que indique que preset/cobertura son compartidos por la escena, y un contador de mascara que es local al mapa.

### Contrato de `MapViewport`

1. Agregar props tipadas:

```ts
daytimeFilter: SceneDaytimeFilter;
daytimeMask: SceneDaytimeMask;
isDaytimeMaskPaintMode: boolean;
isDaytimeMaskEraseMode: boolean;
daytimeBrushTopology: DaytimeBrushTopology;
daytimeCircularBrushRadius: number;
onDaytimeMaskStroke: (stroke: DaytimeMaskStroke) => void;
```

2. Pasar los datos al `PixiViewport` mediante setters separados para que cambiar tokens, notas o UI no invalide la mascara.
3. En `PlayerApp.tsx`, pasar el mismo `scene.daytimeFilter` y `scene.daytimeMask`, pero sin habilitar herramientas ni previews. El snapshot ya lleva ambos campos al estar dentro de `SceneDocument`.

## 5. PixiJS: capa, filtro y mascara

### Orden de capas y composicion

1. Agregar una capa `daytimeFilter` inmediatamente despues de `map` y antes de `grid` en `renderLayerNames`.
2. Mantener la capa limitada a la imagen base. Todo lo existente desde `grid` en adelante queda sin transformar.
3. Reutilizar texturas de la imagen original para crear un sprite filtrado separado, con la misma posicion, anchor y escala que el mapa base.
4. Aplicar una capa de color multiplicativa preconfigurada por preset al composite filtrado, sin recargar la textura de mapa.
5. Evitar aplicar `filters` directamente a `mapSprite`, porque un filtro directo afectaria toda la imagen y se mezclaria con la logica actual de grayscale de darkvision.

### Compatibilidad con darkvision

1. Extraer la composicion visual del mapa base y su recuperacion de color de darkvision a una pequena rutina reusable.
2. Construir el contenido filtrable como un composite de imagen que preserva el estado de grayscale/color de Player View antes de aplicarle la mascara de ambiente.
3. Cuando darkvision esta activo, tanto las porciones grises como las porciones de color recuperado deben recibir el preset de hora del dia dentro de la mascara; fuera de ella mantienen el comportamiento actual de darkvision.
4. La capa de ambiente no modifica ni invalida las `RenderTexture` de darkness/fog salvo que la imagen o su transformacion base cambie.
5. Agregar tests visuales/unidades de firma que cubran `dm`, `player`, darkvision activo/inactivo y presets habilitado/deshabilitado.

### Textura de mascara por mapa activo

1. Crear estado de render dedicado en `PixiViewport`:

```ts
private daytimeMaskTexture: RenderTexture | null;
private daytimeMaskTextureSize: { width: number; height: number } | null;
private daytimeMaskSignature = "";
private daytimeMaskSprite: Sprite | null;
private daytimeFilteredSprite: Sprite | null;
```

2. La textura de mascara usa el espacio local de la imagen, no el viewport. Por tanto no se redibuja ante pan o zoom y conserva el alineamiento al mover/escalar el mapa.
3. Convertir puntos de mundo a coordenadas locales de imagen usando la posicion, `scale`, anchor y dimensiones de `mapSprite`.
4. Para cobertura `scene`, llenar la textura una vez con blanco opaco, o usar una mascara uniforme equivalente; no reproducir strokes.
5. Para cobertura `painted`, reproducir strokes ordenados con `Graphics`:
   - topologia: dibujar los vertices de cada `GridCell` en espacio local;
   - circular: dibujar cada stroke simplificado como una unica linea gruesa, continua y con extremos/uniones redondeados; no crear un disco renderizable por punto;
   - `paint`: compositar blanco opaco;
   - `erase`: usar blend mode de borrado sobre la misma textura.
6. En una nueva pincelada confirmada, renderizar solo el nuevo stroke contra la textura existente cuando su firma, imagen y transformacion local siguen siendo validas. Rehacer la textura completa solo tras borrar todo, cambiar de mapa/imagen, alterar escala/posicion que invalide la conversion local, o recibir una mascara externa distinta.
7. Adjuntar el sprite de mascara al sprite/composite filtrado mediante `setMask`. La textura se destruye al cambiar imagen, destruir viewport o detectar dimensiones distintas.
8. Mantener sprite de mapa, sprite de mascara raster y overlay en el mismo contenedor de mundo. Un cambio de `compassOrientation` debe redibujar la relacion de mascara despues de actualizar la transformacion de presentacion, de modo que la rotacion aplicada a Player View afecte por igual mapa y mascara.
8. Mantener un limite practico de resolucion de mascara derivado de la textura fuente. Si se necesita reducir memoria para mapas gigantes, elegir una escala interna documentada y probar que los bordes siguen aceptables; no usar una textura dependiente del tamano del viewport.

### Preview de herramienta

1. Usar `selection` o una capa de herramienta superior para la guia DM, nunca la capa `daytimeFilter` que se proyecta al jugador.
2. Topologia: reutilizar `getGridCellAtPoint`, `getGridCellVertices` y la geometria de fire/information area para dibujar la celda hover.
3. Circular: dibujar un circulo de radio constante en mundo y, durante drag, el trazo compuesto temporal.
4. Pintura/borrado deben diferenciarse visualmente por color y alpha, sin representar el preset final sobre tokens o UI. Mientras la herramienta este activa, reconstruir desde los trazos persistidos una unica `RenderTexture` de mascara local: `paint` escribe opaco y `erase` compone geometria opaca con blend `erase` para eliminar pixeles. Proyectar sobre ella un solo sprite rojo translucido privado, con contraste suficiente sobre mapas claros. La opacidad del sprite no se acumula donde las pinceladas se superponen.
5. `Space` + drag conserva pan y no agrega strokes; el cursor y el hit testing siguen las convenciones de fog/fire.

## 6. Integracion de carga, guardado y mapas

1. `createSceneSavePayload`, `serializeSceneDocument`, carga reciente, autosave y guardado por ruta usan el `SceneDocument` extendido sin canales IPC nuevos.
2. El parser aporta defaults para escenas V1/V2 existentes; al primer guardado serializa los campos nuevos compatibles.
3. `setActiveSceneMap` mantiene la mascara en el `SceneMapDocument` correcto. Cambiar de mapa destruye o invalida solo recursos Pixi del mapa anterior y construye los del actual cuando la imagen este lista.
4. Cambiar `scene.daytimeFilter` no modifica objetos de mapas inactivos ni obliga a resolver sus URLs; se reflejara cuando se active el respectivo mapa.
5. Player View recibe el mapa activo y el filtro global dentro del snapshot; al cambiar de mapa reconstruye solo la mascara de ese mapa.

## 7. Testing y verificacion

### Unit tests de dominio

- Defaults de filtro y mascara.
- Presets/coberturas/modos invalidos rechazados o normalizados.
- Stroke topologico deduplica celdas y rechaza entrada vacia.
- Stroke circular simplifica puntos, conserva extremos y valida radio.
- Operaciones paint/erase mantienen orden.
- Limpiar mascara no altera preset global.
- Conteo de mascara distingue celdas, trazos y topologias.

### Schema e integracion

- Escena V1 migra con filtro desactivado y mascara vacia.
- Escena V2 previa carga con defaults de ambiente.
- Round trip de escena con preset global, varios mapas y mascaras distintas.
- Cambiar preset mantiene todas las mascaras de mapa sin duplicar el estado de escena.
- Cambiar mapa, guardar y recargar conserva mascara en el mapa que corresponde.

### Render y regresion

- Test de conversion mundo -> local de imagen con posicion/escala no triviales.
- Test de firma/invalidation: pan y zoom no recrean la textura de mascara; un stroke confirmado aplica actualizacion incremental.
- Test de cobertura global usa mascara uniforme y no genera geometria por celdas.
- Test de `paint`/`erase` sobre textura de mascara mediante fixtures o inspeccion de pixeles de canvas cuando sea viable.
- Test de orden de capas: grid/tokens permanecen sin filtro, la capa queda debajo de darkness/fog.
- Test de Player View para los tres presets, con y sin darkvision, verificando que no aparecen previews/controles DM.
- Test de limpieza: cambio de mapa, reemplazo de imagen y `destroy()` liberan la textura y sprites de mascara.

### Smoke manual

1. Crear dos mapas con grillas distintas y abrir Player View.
2. Activar `Atardecer` con `Toda la escena`; alternar mapas y confirmar cobertura completa sin cargar el inactivo por adelantado.
3. Cambiar a `Zonas pintadas`; usar topologia cuadrada, hexagonal y circular para crear regiones desconectadas.
4. Borrar parte de una region topologica con pincel circular y parte de una circular con topologia.
5. Cambiar a `Noche`; verificar que todas las regiones de ambos mapas toman el nuevo preset al abrirse.
6. Encender/apagar darkvision, darkness y fog; confirmar que sus reglas no cambian y que tokens/grilla no se filtran.
7. Mover y escalar el mapa; comprobar alineamiento de la mascara.
8. Guardar, cerrar, reabrir y revisar las mismas zonas en DM y Player View.

## 8. Riesgos y mitigaciones

- **Riesgo:** una mascara local pierde alineamiento al mover o escalar la imagen.
  **Mitigacion:** representar mascara y sprite filtrado en el mismo sistema local de la textura del mapa; cubrir conversiones con tests de transformacion.

- **Riesgo:** darkvision y el filtro de ambiente muestran capas de color inconsistentes.
  **Mitigacion:** centralizar la composicion de imagen antes de aplicar ambiente y probar las combinaciones por rol.

- **Riesgo:** strokes de borrado hacen crecer indefinidamente el documento.
  **Mitigacion:** simplificar puntos, deduplicar celdas, coalescer strokes consecutivos compatibles cuando sea seguro y establecer limites de validacion recuperables.

- **Riesgo:** RenderTexture demasiado grande consume memoria con mapas pesados.
  **Mitigacion:** una sola textura por viewport/mapa activo, destruccion inmediata al reemplazarla y limite de resolucion interna con validacion visual.

- **Riesgo:** actualizar el preset reconstruye texturas para todos los mapas.
  **Mitigacion:** el preset es estado de escena liviano; solo el mapa activo actualiza su sprite filtrado y los demas al activarse.

## 9. Orden de implementacion

1. Crear tipos y helpers de dominio para filtro, strokes y resumen de mascara.
2. Extender documento de escena, factories, schema y migracion con defaults compatibles.
3. Añadir tests de dominio/schema antes del renderer.
4. Extender interaccion, props de `MapViewport` y callbacks de Pixi para los dos pinceles.
5. Implementar capa `daytimeFilter`, sprite filtrado, mascara uniforme y limpieza de recursos.
6. Implementar replay e invalidacion incremental de strokes en la textura local de mascara.
7. Resolver composicion con darkvision y verificar orden respecto a grid/fog/darkness.
8. Agregar controles `Ambiente` del DM, preview y borrado con confirmacion.
9. Conectar Player View y probar alternancia entre mapas activos.
10. Ejecutar pruebas, typecheck, lint, build y smoke visual de DM/Player View.
11. Actualizar specs relacionadas, `CHANGELOG.md` y `package.json` con bump minor al cerrar la feature.

## 10. Criterios de cierre

- [ ] Dominio, schema y defaults retrocompatibles implementados.
- [ ] Filtro unico de escena y mascaras aisladas por mapa persistidos.
- [ ] Pinceles topologico y circular, con pintura/borrado, implementados.
- [ ] Una mascara cacheable por mapa activo y cobertura global uniforme implementadas.
- [ ] Presets aplicados a DM View y Player View sin afectar capas tacticas ni reglas de vision.
- [ ] Compatibilidad con darkvision cubierta.
- [ ] Tests de dominio, schema, render e integracion agregados.
- [ ] `pnpm test`, `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan.
- [ ] Smoke visual completado con escenas multi-mapa y Player View.
- [ ] Cambios documentados y aprobados antes de mergear.
