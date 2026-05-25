# Plan de implementacion tecnica - 07 - Herramientas Tacticas y Medicion

## 1. Resumen

- **Spec fuente:** `./specs/07-shapes-and-measurement/07-tactical-tools-and-measurement.md`
- **Objetivo:** Implementar mediciones y formas tacticas persistentes con unidades, diagonales configurables, snap-to-grid opcional, seleccion, ajuste y borrado.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 00-06 implementadas, grilla calibrable, estado de escena versionado, menu contextual, seleccion/borrado, PixiJS viewport y capas de render existentes.
- **Nota documental:** El encabezado interno del spec fuente fue corregido a `Spec 07` durante la implementacion.

## 2. Alcance

### Incluido

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

### Fuera de alcance

- Plantillas avanzadas exactas por sistema fuera de D&D 5e.
- Rotacion libre de rectangulos/cubos si no es necesaria para el MVP.
- Volumen 3D real de esferas/conos/cubos.
- UI compleja de herramientas con hotkeys avanzados.
- Edicion multi-punto sofisticada.
- Sincronizacion multiusuario.
- Resolver el bug abierto de mascaras de luz registrado en `./bugs/bug-mask-lights-to-see-through-darkness-overlay/`.

## 3. Decisiones tecnicas

- **Arquitectura:** Las reglas de medicion, diagonales, snap y geometria viven en `domain/measurement` y `domain/tools` o un nuevo `domain/shapes`. React solo orquesta UI/estado y PixiJS solo renderiza entidades serializables.
- **Persistencia:** Usar `scene.shapes` como fuente de verdad para mediciones y formas tacticas. Ampliar `SceneShape` y `scene-schema.ts` con tipos discriminados, ids estables y coordenadas de mundo.
- **IPC / Electron:** No agregar IPC nuevo. Guardar/cargar sigue usando la escena `.ttrpgscene`.
- **Render / PixiJS:** Renderizar formas en la capa `shapesAndMeasurements` y seleccion/manijas en `selection`. Mantener conversion pantalla mundo centralizada en `PixiViewport`.
- **Validacion:** Validar ids no vacios, tipo de forma soportado, puntos finitos, radios/anchos/altos positivos, longitud minima donde aplique y unidades validas.
- **Dependencias nuevas:** Ninguna prevista.

## 4. Diseno de dominio

- **Entidades / tipos:** `MeasurementLine`, `TacticalLine`, `CircleShape`, `ConeShape`, `RectangleShape`, `ShapeId`, `ShapeKind`, `DistanceLabel`, `MeasurementSettings`.
- **Reglas puras:** Calcular distancia en mundo, convertir a celdas, convertir a pies/metrico, calcular distancia diagonal segun modo, aplicar snap-to-grid, crear/mover/ajustar/borrar formas.
- **Coordenadas / unidades:** Todas las formas se guardan en coordenadas de mundo. La distancia se calcula usando `grid.cellSizeWorld`, `grid.distancePerCell`, `grid.metricDistancePerCell` y `grid.unit`.
- **Errores de dominio:** Coordenadas invalidas, dimensiones no positivas, shape kind invalido, medicion sin puntos suficientes, configuracion de grilla invalida.

## 5. Cambios por capa

### `domain`

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

### `application`

- Mantener guardar/cargar usando use cases existentes.
- Si la logica de creacion crece, crear helpers puros para aplicar acciones sobre `SceneDocument`.
- No agregar repositorios ni servicios nuevos.

### `infrastructure`

- Sin cambios esperados.
- La validacion de archivo de escena queda en `scene-schema.ts`.

### `main`

- Sin cambios esperados.
- No agregar dialogos ni IPC.

### `preload`

- Sin cambios esperados.
- No exponer APIs nuevas.

### `renderer`

- Cambiar la creacion desde menu contextual para crear formas en `scene.shapes` en lugar de solo `interaction.elements` cuando corresponda.
- Agregar controles compactos para unidad (`ft`/`m`), snap-to-grid y modo de diagonal.
- Mostrar etiqueta de distancia en mediciones.
- Permitir seleccionar, mover y borrar formas persistentes.
- Agregar panel de propiedades contextual para radio/longitud/ancho/alto segun forma.
- Mantener controles discretos para no cubrir mapa durante sesion.

### `render`

- Extender `PixiViewport` para recibir `scene.shapes`.
- Renderizar lineas, mediciones, circulos, conos y rectangulos desde datos persistidos.
- Renderizar etiquetas de medicion con texto legible.
- Implementar hit testing para formas persistentes.
- Implementar drag de forma seleccionada y, si es viable, manijas simples de ajuste.
- Mantener limpieza de listeners/texturas y evitar duplicar sistemas de coordenadas.

## 6. Plan de trabajo

1. Corregir el encabezado del spec fuente para que diga `Spec 07` si se decide incluir limpieza documental.
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

## 7. Testing y verificacion

- **Unit tests:** Distancias, diagonales, unidades, snap-to-grid, creacion/actualizacion de formas y validacion de schema.
- **Integration tests:** Guardar/cargar escena con `shapes` persistidas usando use cases existentes.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar mapa, calibrar grilla, crear medicion, alternar ft/m, cambiar diagonal, crear circulo/cono/rectangulo, mover/seleccionar/borrar, guardar escena y cargarla de vuelta.

## 8. Riesgos y mitigaciones

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

## 9. Criterios de aceptacion

- El usuario puede crear una medicion lineal desde el menu contextual.
- La medicion muestra distancia en unidad activa.
- El usuario puede alternar pies/metrico y la etiqueta se actualiza.
- El usuario puede cambiar el modo de diagonal y la medicion lo respeta.
- El usuario puede crear linea, circulo, cono y rectangulo.
- El usuario puede activar/desactivar snap-to-grid.
- Las formas pueden seleccionarse, moverse y borrarse.
- Las formas se guardan y cargan con la escena.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- Actualizar README con pasos para probar herramientas tacticas y medicion.
- Corregir encabezado del spec fuente si se acepta la limpieza documental.
- Registrar cualquier decision concreta sobre geometria de conos/cubos si cambia durante implementacion.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Encabezado del spec fuente revisado/corregido si aplica.
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
