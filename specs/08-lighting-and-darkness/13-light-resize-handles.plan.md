# Plan de implementacion tecnica - 13 - Handles de Tamaño para Luces

## 1. Resumen

- **Spec fuente:** `./specs/08-lighting-and-darkness/13-light-resize-handles.md`
- **Objetivo:** Permitir redimensionar luz puntual y luz cónica directamente desde el canvas con handles de tamaño, reutilizando la experiencia de edición ya usada por formas tácticas.
- **Estado:** Implementado y aceptado
- **Prioridad:** Media
- **Dependencias:** Specs 06, 10, 12; selección y drag de elementos en PixiViewport; modelo actual `SceneLight.radius`.

## 2. Alcance

### Incluido

- Resize interactivo para luz puntual seleccionada.
- Resize interactivo para luz cónica seleccionada.
- Handle de borde para radio de luz puntual.
- Handle de extremo para longitud/radio de luz cónica.
- Mantener la manivela/anillo existente para orientar la luz cónica.
- Actualización en tiempo real de visual de luz, oscuridad, darkvision y visión/fog derivada.
- Persistencia mediante el campo existente `SceneLight.radius`.
- Pruebas de dominio o UI indirecta donde aplique y verificación manual en Electron.

### Fuera de alcance

- Cambiar ángulo de luz cónica.
- Diferenciar luz brillante y luz tenue.
- Modificar darkvision, oscuridad o fog of war más allá de refrescar sus máscaras al cambiar radio.
- Cambiar schema de escenas.
- Rediseñar sidebar, menú contextual o panel compacto de luces.
- Selección múltiple.

## 3. Decisiones tecnicas

- **Arquitectura:** El dominio mantiene `SceneLight.radius`; React actualiza estado de escena; Pixi solo calcula interacción canvas y emite callbacks tipados.
- **Persistencia:** No se agregan campos. Guardar/cargar conserva el nuevo tamaño usando `SceneLight.radius`.
- **IPC / Electron:** Sin canales nuevos. No hay cambios en preload ni main.
- **Render / PixiJS:** Añadir hit testing y drag mode para resize de luces dentro de `PixiViewport`, siguiendo los patrones de resize de formas y fuego.
- **Validacion:** El radio mínimo se limita en renderer antes de emitir el callback. El schema existente ya valida `radius` como positivo.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:** Sin tipos nuevos de escena. Reusar `SceneLight.radius`.
- **Reglas puras:** No se esperan nuevas reglas puras. El cálculo principal es distancia mundo entre centro de luz y cursor.
- **Coordenadas / unidades:** El resize se calcula en coordenadas de mundo usando `screenToWorld`, independiente del zoom. Para cono, el handle se ubica en dirección central a distancia `radius`.
- **Errores de dominio:** No se agregan errores nuevos. Valores inválidos se evitan con radio mínimo.

## 5. Cambios por capa

### `domain`

- Sin cambios esperados.
- Si se encuentra duplicación importante en cálculo de radio, se puede extraer helper puro pequeño y testearlo.

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
  - Agregar callback `handleLightRadiusChange`.
  - Actualizar la luz seleccionada o indicada usando el update existente de luces.
  - Pasar `onLightRadiusChange` hacia `MapViewport`.
- En `src/renderer/src/components/MapViewport.tsx`:
  - Agregar prop `onLightRadiusChange`.
  - Conectarla al constructor de `PixiViewport`.

### `render`

- En `src/render/pixi/PixiViewport.ts`:
  - Agregar callback `onLightRadiusChange` a `PixiViewportOptions`.
  - Agregar drag mode para resize de luz.
  - Crear hit test para handle de radio de luz puntual seleccionada.
  - Crear hit test para handle de longitud de luz cónica seleccionada.
  - Priorizar hit testing de resize antes de mover la luz.
  - Dibujar handles de resize cuando la luz está seleccionada.
  - Actualizar radio con `Math.max(10, distanciaMundo)`.
  - Re-renderizar capas dependientes al recibir nuevo estado desde React.

## 6. Plan de trabajo

1. [x] Revisar implementación actual de selección, rotación y resize en `PixiViewport`.
2. [x] Agregar `onLightRadiusChange` en opciones de Pixi y flujo React.
3. [x] Implementar hit test para resize de luz puntual seleccionada.
4. [x] Implementar hit test para resize de luz cónica seleccionada.
5. [x] Agregar drag mode común para resize de luz.
6. [x] Implementar cálculo de nuevo radio desde cursor en coordenadas de mundo.
7. [x] Dibujar handles de resize en luces seleccionadas con estilo cálido/dorado.
8. [x] Verificar que rotación de cono y resize de cono no se pisen.
9. [x] Verificar que al cambiar radio se refresquen luz visual, oscuridad, darkvision y fog.
10. [x] Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.
11. [ ] Smoke manual en `pnpm dev` con luz puntual, luz cónica, oscuridad y darkvision.

## 7. Testing y verificacion

- **Unit tests:** No se esperan nuevos si el cálculo queda acotado al viewport. Si se extrae helper de distancia/radio, agregar test unitario.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Crear luz puntual, seleccionarla y arrastrar handle de borde; crear luz cónica, rotarla y redimensionarla; activar oscuridad y darkvision para verificar máscaras.

## 8. Riesgos y mitigaciones

- **Riesgo:** El handle de resize del cono compite con la manivela de rotación.
  **Mitigacion:** Ubicar resize en el extremo del cono y evaluar hit tests en orden explícito.
- **Riesgo:** Resize no actualiza máscaras de oscuridad/darkvision durante drag.
  **Mitigacion:** Usar el estado React existente para actualizar `lights`; `setLights` ya redibuja capas dependientes.
- **Riesgo:** El handle no es legible sobre mapas claros u oscuros.
  **Mitigacion:** Usar relleno cálido con borde oscuro similar a handles existentes.
- **Riesgo:** El radio queda demasiado pequeño o inválido.
  **Mitigacion:** Aplicar mínimo de `10` unidades de mundo antes de emitir el cambio.

## 9. Criterios de aceptacion

- Al seleccionar una luz puntual aparece un handle de radio en su borde.
- Arrastrar el handle de luz puntual cambia su radio.
- Al seleccionar una luz cónica aparece un handle de longitud en el extremo central del cono.
- Arrastrar el handle de luz cónica cambia su longitud sin cambiar dirección.
- La manivela de rotación del cono sigue funcionando y no cambia longitud.
- Los handles solo aparecen en la luz seleccionada.
- Oscuridad y darkvision reflejan el nuevo radio durante y después del drag.
- Guardar y cargar escena conserva los tamaños modificados.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/08-lighting-and-darkness/13-light-resize-handles.md`
- `specs/08-lighting-and-darkness/13-light-resize-handles.plan.md`
- `README.md` si se documenta el uso final de resize de luces.

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
