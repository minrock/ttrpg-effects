# Plan de implementacion tecnica - 14 - Relleno de Emojis para Efectos y Formas

## 1. Resumen

- **Spec fuente:** `./specs/14-emoji-fill-for-effects-and-shapes/14-emoji-fill-for-effects-and-shapes.md`
- **Objetivo:** Renderizar emojis representativos dentro de fuego, formas de área y líneas, con distribución estable y persistencia opcional para emojis de formas.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Specs 07, 09, 10 y 11; render Pixi de formas/fuego; schema versionado de escenas; grilla actual.

## 2. Alcance

### Incluido

- Render de `🔥` dentro de fuego circular.
- Render de `🔥` dentro de fuego pintado por celdas.
- Render de emojis dentro de círculo, cono y rectángulo.
- Render de emojis distribuidos a lo largo de línea/medición.
- Distribución tipo mosaico con jitter determinista para áreas.
- Distribución equitativa en líneas, al menos un emoji por tamaño de celda aproximado.
- Campo opcional `emoji?: string` en `SceneShape`.
- Schema compatible con escenas antiguas sin emoji.
- UI mínima para configurar emoji de la forma seleccionada.
- Documentación de comportamiento.

### Fuera de alcance

- Animación de emojis.
- Sprites o imágenes externas.
- Editor avanzado de patrones/densidad.
- Emoji por celda individual dentro de una misma forma.
- Cambios a luces, oscuridad, darkvision, fog of war o mapas.
- Emojis para tokens/minis futuros.
- Persistencia de emoji para fuego, porque fuego usa `🔥` fijo.

## 3. Decisiones tecnicas

- **Arquitectura:** El dato persistente de emoji vive en `domain/sessions` como propiedad opcional de `SceneShape`; la UI solo edita ese campo; Pixi renderiza el patrón sin introducir reglas de negocio en React.
- **Persistencia:** Extender `SceneShape` con `emoji?: string`; el schema acepta ausencia del campo y normaliza strings vacíos como sin emoji o los deja fuera según implementación.
- **IPC / Electron:** Sin canales nuevos. Guardar/cargar usa el flujo existente de `.ttrpgscene`.
- **Render / PixiJS:** Usar `Text` de Pixi para emojis en las capas existentes de efectos y formas. Selección y handles permanecen en la capa `selection`, por encima.
- **Validacion:** Limitar emoji a string corto, sugerido máximo 8 unidades UTF-16 para permitir secuencias emoji compuestas sin aceptar textos largos.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:** Agregar `emoji?: string` a `SceneShape`.
- **Reglas puras:** Agregar helpers puros para:
  - normalizar emoji opcional,
  - calcular puntos de mosaico para círculo/cono/rectángulo,
  - calcular puntos sobre línea según `grid.cellSizeWorld`,
  - jitter determinista por id.
- **Coordenadas / unidades:** Todos los puntos se calculan en coordenadas de mundo. La densidad usa `grid.cellSizeWorld`; el tamaño visual usa una fracción del tamaño de celda.
- **Errores de dominio:** No se esperan errores bloqueantes. Emojis vacíos o demasiado largos se ignoran o recortan de forma segura.

## 5. Cambios por capa

### `domain`

- Actualizar `src/domain/sessions/scene-document.ts` con `SceneShape.emoji?: string`.
- Actualizar `src/domain/sessions/scene-schema.ts` para aceptar `emoji` opcional.
- Actualizar tests de schema para:
  - escena vieja sin emoji,
  - escena con emoji en formas.
- Agregar o extender helper de formas si conviene para `updateShape({ emoji })`.
- Crear helper puro para distribución de emojis si el cálculo se mantiene testeable fuera de Pixi.

### `application`

- Sin cambios esperados.

### `infrastructure`

- Sin cambios esperados.

### `main`

- Sin cambios esperados.

### `preload`

- Sin cambios esperados.

### `renderer`

- En `src/renderer/src/App.tsx`:
  - Agregar control compacto para editar emoji de forma seleccionada.
  - Permitir limpiar emoji.
  - Usar `updateSelectedShape({ emoji })` o helper equivalente.
- No agregar control para fuego, porque fuego siempre usa `🔥`.

### `render`

- En `src/render/pixi/PixiViewport.ts`:
  - Dibujar emojis de fuego en `drawSceneEffect`.
  - Dibujar emojis de formas en `drawTacticalShape`.
  - Para línea/measurement, distribuir emojis a lo largo del segmento.
  - Asegurar que emojis queden debajo de selección/handles.
  - Mantener fuentes/tamaños legibles con `grid.cellSizeWorld`.
  - Usar jitter determinista estable basado en id/tipo/índice.

## 6. Plan de trabajo

1. [x] Extender `SceneShape` con `emoji?: string`.
2. [x] Actualizar schema para aceptar `emoji` opcional y mantener compatibilidad.
3. [x] Agregar tests de schema para formas con y sin emoji.
4. [x] Agregar UI mínima en panel de forma seleccionada para editar emoji.
5. [x] Implementar helpers de distribución para área y línea.
6. [x] Implementar render de emojis en fuego circular y fuego por celdas.
7. [x] Implementar render de emojis en círculo, cono y rectángulo.
8. [x] Implementar render de emojis sobre línea/measurement.
9. [x] Ajustar tamaño, opacidad y densidad para legibilidad.
10. [x] Actualizar README y marcar plan.
11. [x] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.
12. [ ] Smoke manual en `pnpm dev`: fuego circular, fuego pintado, línea, círculo, cono y rectángulo.

## 7. Testing y verificacion

- **Unit tests:** Schema de escena para `emoji`; helpers puros de distribución si se extraen.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Crear fuego circular y pintado; crear línea, círculo, cono y rectángulo con emoji; mover/redimensionar; guardar/cargar.

## 8. Riesgos y mitigaciones

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

## 9. Criterios de aceptacion

- Fuego circular muestra `🔥` dentro del círculo.
- Fuego por celdas muestra `🔥` dentro de celdas pintadas.
- Círculo, cono y rectángulo pueden mostrar emoji dentro del área.
- Línea/measurement muestra emojis distribuidos a lo largo del segmento.
- La línea muestra al menos un emoji por cuadro de grilla aproximado y mínimo uno si es corta.
- El patrón no parpadea al re-renderizar sin cambios.
- Emojis se actualizan al mover o redimensionar.
- Selección y handles quedan por encima.
- Guardar/cargar conserva `emoji` en formas.
- Escenas antiguas sin emoji cargan sin errores.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/14-emoji-fill-for-effects-and-shapes/14-emoji-fill-for-effects-and-shapes.md`
- `specs/14-emoji-fill-for-effects-and-shapes/plan.md`
- `README.md`

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
