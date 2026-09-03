# Plan - Vision en la Oscuridad

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- [x] Integrar drawGridCell/getGridCellRings en buildDarkvisionColorMask y layout en firmas de celdas.
- [x] Mantener invalidacion por cambios reales de fuego, no por cambios de topologia de grilla.


Este documento describe de forma unificada el plan tecnico para implementar y mantener vision en la oscuridad, consolidando los pasos y criterios vigentes en el proyecto.

## Visión en la Oscuridad

### 1. Resumen

- **Objetivo:** Agregar un modo persistible de visión en la oscuridad que renderice el mapa base en blanco y negro y recupere color dentro de las geometrías de luces visibles.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 06, 08, 09 y 11; modelo de escena versionado; render Pixi de mapa, oscuridad, luces, fuego y fog of war.

### 2. Alcance

#### Incluido

- Agregar toggle `Visión en la oscuridad` en el accordion `Oscuridad`.
- Persistir el estado del toggle en `.ttrpgscene`.
- Mantener compatibilidad con escenas antiguas, default `false`.
- Ignorar visualmente el overlay de oscuridad mientras darkvision esté activo.
- Renderizar el mapa base en blanco y negro cuando darkvision esté activo.
- Renderizar el mapa a color dentro de geometrías de luces visibles.
- Usar como geometría de color:
  - luces puntuales visibles,
  - luces cónicas visibles,
  - fuego visible con emisión de luz,
  - iluminación derivada de fuego por celdas si el render actual ya la expone como área visual.
- Mantener fog of war independiente y por encima de la experiencia de darkvision.
- Mantener grilla, herramientas tácticas, fuego, selección, UI y overlays no-map en color normal.
- Limpiar filtros, sprites, máscaras y render textures asociados.
- Agregar/actualizar tests de schema para compatibilidad y persistencia.

#### Fuera de alcance

- Darkvision por token/personaje.
- Distancias individuales de darkvision.
- Reglas mecánicas de DnD para penumbra/desventaja.
- Línea de visión por paredes.
- Cambiar fog of war.
- Cambiar color de herramientas, formas o tokens futuros.
- Implementar luz brillante/tenue diferenciada dentro de esta spec.

### 3. Decisiones tecnicas

- **Arquitectura:** El estado se modela en `domain/sessions`; la UI vive en `renderer`; el efecto visual vive encapsulado en `render/pixi`.
- **Persistencia:** Extender `SceneDarkness` con `darkvisionEnabled: boolean`. El schema debe defaultar `false` para escenas viejas.
- **IPC / Electron:** Sin canales nuevos. Guardar/cargar usa el flujo de escena existente.
- **Render / PixiJS:** Duplicar el sprite del mapa: una versión base con filtro grayscale y una versión color enmascarada por luces. Con darkvision apagado, mantener el render normal actual.
- **Validacion:** Validar `darkvisionEnabled` como booleano; escenas sin campo cargan con `false`.
- **Dependencias nuevas:** Ninguna esperada. Usar filtros y máscaras disponibles en PixiJS.

### 4. Diseno de dominio

- **Entidades / tipos:** Agregar `darkvisionEnabled` a `SceneDarkness`.
- **Reglas puras:** No hay cálculo nuevo de dominio para darkvision; se reutiliza geometría de luces ya existente.
- **Coordenadas / unidades:** Las máscaras usan coordenadas de mundo y las mismas geometrías de luces actuales.
- **Errores de dominio:** No se agregan errores nuevos; schema debe recuperar escenas antiguas con default.

### 5. Cambios por capa

#### `domain`

- Actualizar `src/domain/sessions/scene-document.ts`.
- Actualizar `src/domain/sessions/scene-schema.ts` con default `darkvisionEnabled: false`.
- Actualizar `src/domain/sessions/default-scene.ts`.
- Actualizar tests de schema para:
  - escena vieja sin `darkvisionEnabled`,
  - escena nueva con `darkvisionEnabled: true`.

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
  - Agregar handler para alternar `scene.darkness.darkvisionEnabled`.
  - Agregar toggle `Visión en la oscuridad` dentro del accordion `Oscuridad`.
  - Mantener controles de oscuridad visibles; overlay no tendrá efecto visual mientras darkvision esté activo.
- En `src/renderer/src/styles.css`:
  - Ajustar estilos mínimos si el nuevo control necesita orden/espaciado.

#### `render`

- En `src/render/pixi/PixiViewport.ts`:
  - Detectar `darkness.darkvisionEnabled`.
  - Evitar dibujar overlay de oscuridad cuando darkvision esté activo.
  - Renderizar mapa en grayscale cuando darkvision esté activo.
  - Renderizar una copia color del mapa sobre el grayscale, enmascarada con luces visibles.
  - Reusar helpers de geometría de luces cuando sea posible.
  - Asegurar sincronización de posición, escala y textura de sprites de mapa.
  - Destruir/limpiar sprite color, máscara y filtros al cambiar mapa o destruir viewport.

### 6. Plan de trabajo

1. [x] Extender `SceneDarkness` con `darkvisionEnabled`.
2. [x] Actualizar schema con default compatible.
3. [x] Actualizar default scene.
4. [x] Agregar tests de schema para escenas viejas y nuevas.
5. [x] Agregar handler y toggle en `App.tsx`.
6. [x] Pasar `darkness.darkvisionEnabled` al viewport mediante el objeto `darkness` existente.
7. [x] Refactorizar render de mapa para soportar sprite grayscale y sprite color enmascarado.
8. [x] Crear máscara de color basada en luces visibles y fuegos emisores de luz.
9. [x] Saltar overlay de oscuridad cuando darkvision esté activo.
10. [x] Verificar interacción con fog of war.
11. [x] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.
12. [ ] Smoke manual visual: cargar mapa, activar darkvision, mover luz, cambiar radio/dirección, activar fog y apagar darkvision.

### 7. Testing y verificacion

- **Unit tests:** Schema de escena para `darkvisionEnabled`.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev` arranca correctamente. Queda pendiente la validación visual completa con mapa cargado, darkvision, luces y fog dentro de la ventana Electron.

### 8. Riesgos y mitigaciones

- **Riesgo:** Duplicar sprite del mapa puede quedar desincronizado con posición/escala.
  **Mitigacion:** Centralizar actualización de sprites de mapa en el mismo flujo de `setMap`/`drawMapImage`.
- **Riesgo:** Filtros grayscale pueden afectar herramientas si se aplican al contenedor equivocado.
  **Mitigacion:** Aplicar filtro solo al sprite del mapa base, no al mundo completo.
- **Riesgo:** Las máscaras de luces pueden quedar en espacio incorrecto.
  **Mitigacion:** Usar coordenadas de mundo y la misma geometría que el render de oscuridad.
- **Riesgo:** Fog y darkvision pueden competir en capas.
  **Mitigacion:** Mantener fog of war como capa independiente por encima del mapa/darkvision.

### 9. Criterios de aceptacion

- El accordion `Oscuridad` incluye toggle `Visión en la oscuridad`.
- Activar darkvision muestra el mapa base en blanco y negro.
- Activar darkvision evita dibujar el overlay negro de oscuridad.
- Las luces puntuales visibles muestran el mapa a color dentro de su radio.
- Las luces cónicas visibles muestran el mapa a color dentro de su cono.
- El fuego emisor de luz recupera color en su área de luz actual.
- Mover luces actualiza la zona a color.
- Cambiar radio/dirección de luces actualiza la zona a color.
- Apagar darkvision restaura el render normal y la oscuridad ambiental si estaba activa.
- Fog of war sigue ocultando áreas no reveladas.
- Guardar/cargar conserva `darkvisionEnabled`.
- Escenas antiguas cargan con `darkvisionEnabled: false`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/13-darkvision/spec.md`
- `specs/13-darkvision/plan.md`
- `README.md` si se documenta el uso del modo.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual visual realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

### 12. Decisiones cerradas para este plan

- Darkvision afecta solo el mapa base.
- Grilla, formas, mediciones, fuego, selección, UI y overlays no-map conservan color normal.
- Activar darkvision no modifica `darkness.enabled`; solo ignora visualmente el overlay de oscuridad.
- Las zonas a color usan la geometría actual de luces y fuegos emisores, sin distinguir luz brillante/tenue todavía.

### 13. Cambio posterior: darkvision solo en ventana de jugador

El modo darkvision (mapa en escala de grises + revelado a color por luces) pasó a ser **exclusivo de la ventana del jugador** (ver ventana de jugador y rama `feature/dm-darkness-passthrough`).

- `drawDarkvisionLayer()` fuerza `nextSig = ""` cuando `viewRole === "dm"`, lo que activa el camino de limpieza existente y elimina el filtro grayscale y la máscara de color del sprite del mapa.
- `updateBaseMapVisibility()` guarda con condición `viewRole !== "dm"` antes de asignar el filtro grayscale, evitando que el filtro persista aunque `darkvisionEnabled` esté activo en escena.
- El DM configura darkvision para los jugadores sin ver el efecto en su propio canvas.
- El badge flotante del viewport DM incluye el indicador `👁 Visión en oscuridad` cuando `darkvisionEnabled` está activo.
