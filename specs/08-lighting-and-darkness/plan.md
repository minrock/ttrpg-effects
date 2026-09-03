# Plan - Luces y Oscuridad

Este documento describe de forma unificada el plan tecnico para implementar y mantener luces y oscuridad, consolidando los pasos y criterios vigentes en el proyecto.

## Iluminacion, Oscuridad y Fuego Animado

### 1. Resumen

- **Objetivo:** Implementar oscuridad global configurable, luces puntuales/conicas y fuego animado seleccionable sobre el mapa, con guardado/carga dentro del formato de escena.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** bootstrap, motor visual, persistencia, interaccion, mapa y grilla implementados, ajuste de mapa `adjust-map` considerada como base previa de ajuste de mapa, PixiJS viewport, modelo de interaccion, formato `.ttrpgscene`, assets CC0/generados para fuego.

### 2. Alcance

#### Incluido

- Capa de oscuridad global configurable por activacion, color y opacidad.
- Luz puntual con posicion, radio, color, intensidad y opacidad.
- Luz conica con posicion, longitud en cuadros, direccion, color, intensidad y opacidad; el angulo queda fijo en 60 grados.
- Fuego animado placeholder o sprite generado/CC0, superpuesto al mapa.
- Creacion desde menu contextual o toolbar de luces/fuego.
- Seleccion, movimiento, ocultado y borrado de luces/fuego.
- Panel compacto de propiedades para editar radio/longitud, direccion, color, intensidad, opacidad y escala segun tipo.
- Guardado/carga de luces y efectos en `.ttrpgscene`.
- Tests de dominio para validaciones y transformaciones.

#### Fuera de alcance

- Sombras por paredes.
- Vision por tokens/minis.
- Niebla de guerra persistente.
- Oclusion geometrica compleja.
- Sistema final de particulas.
- Marketplace/biblioteca de assets.
- Sincronizacion multiusuario.

### 3. Decisiones tecnicas

- **Arquitectura:** Las entidades de luces/fuego y sus validaciones viven en `domain/lighting` y `domain/effects`. React solo maneja controles/estado visual. PixiJS renderiza adapters desde entidades serializables.
- **Persistencia:** Reutilizar y ampliar `SceneDocumentV1` si es compatible sin migracion mayor. Guardar luces en `scene.lights` y fuego en `scene.effects`. Mantener ids estables y coordenadas de mundo.
- **IPC / Electron:** No agregar IPC nuevo salvo que se importe un asset externo. Para esta fase, preferir asset local del proyecto o dibujo/animacion procedural en PixiJS.
- **Render / PixiJS:** Usar capa `darkness` para overlay global, capa `lights` para revelar/aclarar zonas y capa `effects` para fuego animado. El orden de gameplay coloca mapa -> tokens -> oscuridad -> luces -> efectos -> oscuridad magica -> fog -> herramientas de area. Las luces deben revelar el mapa debajo de la oscuridad con mascara de geometria; la implementacion aceptada renderiza una copia del mapa sobre el overlay y la enmascara por luz para que el mapa se vea claro aun con overlay alto.
- **Interaccion de luz conica:** La luz conica mantiene angulo fijo de 60 grados. Su alcance se controla como longitud en cuadros de grilla y su direccion se ajusta desde un aro/manija en el canvas alrededor del origen de la luz.
- **Validacion:** Clamp de opacidad/intensidad `0..1`, radio/longitud positiva, direccion normalizada `0..360`, color hex valido, escala positiva. El angulo de cono debe conservarse en 60 grados.
- **Dependencias nuevas:** Ninguna prevista. Si se usa asset externo, guardar archivo, fuente y licencia junto al asset. Si se genera fuego procedural, no agregar dependencia.

### 4. Diseno de dominio

- **Entidades / tipos:** `LightSource`, `PointLight`, `ConeLight`, `AnimatedFireEffect`, `LightId`, `EffectId`, `LightKind`, `EffectKind`.
- **Reglas puras:** Crear luz por tipo, actualizar propiedades, mover en coordenadas de mundo, ocultar/mostrar, borrar por id, asociar fuego a luz calida opcional. En luces conicas, cualquier actualizacion debe preservar angulo fijo de 60 grados.
- **Coordenadas / unidades:** Todas las posiciones/radios se guardan en mundo. La UI convierte longitud de cono en cuadros usando `grid.cellSizeWorld` y muestra la distancia segun `grid.distancePerCell`. Direccion de luz conica se expresa en grados.
- **Errores de dominio:** Radio/longitud invalida, color invalido, intensidad/opacidad fuera de rango, direccion invalida, id duplicado.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/lighting/lights.ts` con tipos y funciones puras de luces.
- Crear `src/domain/effects/fire.ts` con tipos y funciones puras de fuego.
- Agregar tests para creacion, actualizacion, clamps, borrado y serializacion compatible con escena.
- Revisar `scene-document.ts` y `scene-schema.ts` para soportar propiedades completas de luces/fuego.

#### `application`

- Si el estado crece, crear helpers para mapear elementos interactivos a `scene.lights`/`scene.effects`.
- Mantener operaciones serializables y puras para que guardar/cargar siga siendo simple.

#### `infrastructure`

- Agregar asset local de fuego si se usa sprite sheet.
- Guardar licencia/fuente si el asset no es generado internamente.
- No agregar repositorios, DB ni filesystem adicional.

#### `main`

- No agregar IPC nuevo en la primera version.
- Mantener seguridad Electron ya configurada.

#### `preload`

- No exponer APIs nuevas.
- Guardar/cargar sigue pasando por escena.

#### `renderer`

- Añadir acciones de creacion: `Luz puntual`, `Luz conica`, `Fuego`.
- Añadir panel compacto de propiedades para el elemento seleccionado cuando sea luz/fuego.
- Añadir toggles de visibilidad y controles de color/opacidad/intensidad/radio. Para luz conica, reemplazar radio libre por longitud en cuadros y ocultar cualquier control de angulo.
- Mantener controles discretos para no tapar el mapa.
- Mostrar estado claro de seleccion y tipo de elemento seleccionado.
- Para luz conica seleccionada, mostrar aro/manija de orientacion en el canvas; arrastrar el origen mueve la luz y arrastrar la manija cambia la direccion.

#### `render`

- Extender `PixiViewport` para renderizar:
  - Oscuridad global como overlay configurable.
  - Luz puntual con gradiente radial y mascara circular de revelado de mapa.
  - Luz conica con sector/cono orientable, angulo fijo de 60 grados y mascara conica de revelado de mapa.
  - Fuego animado procedural o sprite sheet.
- Renderizar el mapa claramente dentro de las geometrias de luz aunque la capa `darkness` tenga opacidad alta.
- Usar copia enmascarada del mapa sobre el overlay como fallback/estrategia principal si `blendMode = "erase"` no produce suficiente claridad.
- Implementar seleccion/hit testing para luces/fuego.
- Implementar movimiento por drag para elementos seleccionados si no compite con pan.
- Limpiar texturas, timers/tickers y listeners al destruir.

### 6. Plan de trabajo

1. Revisar estado actual de ajuste de mapa y resolver cualquier dependencia necesaria del ajuste de mapa.
2. Crear tipos/reglas de dominio para luces y fuego.
3. Actualizar schema de escena para propiedades completas de `lights` y `effects`.
4. Agregar tests unitarios de validacion, clamps y serializacion.
5. Extender estado de interaccion para distinguir herramientas de luz/fuego.
6. Agregar acciones de creacion desde menu contextual/toolbar.
7. Extender PixiJS para oscuridad, luz puntual, luz conica y fuego animado.
8. Implementar revelado real del mapa con mascaras de luz sobre el overlay de oscuridad.
9. Crear panel compacto de propiedades del elemento seleccionado, usando longitud en cuadros para conos.
10. Implementar aro/manija de orientacion para luz conica seleccionada.
11. Conectar guardar/cargar escena con luces/fuego.
12. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y smoke manual con `pnpm dev`.

### 7. Testing y verificacion

- **Unit tests:** Validacion de luces/fuego, clamps de radio/opacidad/intensidad, direccion, angulo fijo de 60 grados para conos, serializacion.
- **Integration tests:** Cargar/guardar escena con luces y fuego usando use cases existentes.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar mapa, activar oscuridad, subir overlay alto, crear luz puntual y luz conica, confirmar que el mapa se ve claro dentro del circulo/cono, ajustar longitud del cono en cuadros, orientar el cono desde el aro/manija, crear fuego, seleccionarlo, moverlo, borrarlo, guardar escena y cargarla de vuelta.

### 8. Riesgos y mitigaciones

- **Riesgo:** Blend modes/masks inconsistentes entre plataformas.
  **Mitigacion:** Implementar fallback visual sin mask avanzada y verificar en Electron/macOS.
- **Riesgo:** Efectos costosos con mapas grandes.
  **Mitigacion:** Mantener geometria simple, evitar filtros pesados y limitar ticker del fuego.
- **Riesgo:** Fuego llamativo pero no integrado con luz.
  **Mitigacion:** Asociar fuego a una luz calida opcional o renderizar halo simple.
- **Riesgo:** Estado de luces duplicado entre herramientas tacticas y escena.
  **Mitigacion:** Usar ids y entidades serializables como fuente de verdad.
- **Riesgo:** Paneles tapen la proyeccion.
  **Mitigacion:** Controles compactos y contextualizados al seleccionado.

### 9. Criterios de aceptacion

- La capa de oscuridad se ve sobre el mapa y puede configurarse.
- Una luz puntual aclara visualmente una zona.
- Una luz conica aclara visualmente una zona direccional.
- Las luces revelan el mapa claramente dentro de su geometria aunque la oscuridad global este alta.
- La luz conica conserva angulo fijo de 60 grados.
- La longitud de la luz conica se ajusta en cuadros de grilla y muestra la distancia equivalente.
- La direccion de la luz conica se puede cambiar arrastrando su aro/manija en el canvas.
- El fuego animado se reproduce sobre el mapa.
- Luces/fuego pueden seleccionarse, moverse, ocultarse y borrarse.
- Las propiedades principales pueden ajustarse desde UI.
- Luces/fuego se guardan y cargan con la escena.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- Actualizar README con pasos para probar oscuridad, luces y fuego.
- Documentar asset de fuego interno generado para el proyecto.
- Actualizar este plan si se decide usar un sistema distinto de blend/mask.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tipos/reglas de luces creados.
- [x] Tipos/reglas de fuego creados.
- [x] Schema de escena actualizado.
- [x] Tests de luces/fuego agregados.
- [x] Oscuridad global configurable renderizada.
- [x] Luz puntual renderizada.
- [x] Luz conica renderizada.
- [x] Mascaras de luces revelan el mapa claramente sobre el overlay.
- [x] Luz conica mantiene angulo fijo de 60 grados.
- [x] Luz conica configurable por longitud en cuadros.
- [x] Aro/manija de orientacion de luz conica implementado.
- [x] Fuego animado renderizado.
- [x] Seleccion/movimiento/borrado de luces/fuego implementado.
- [x] Panel compacto de propiedades implementado.
- [x] Guardar/cargar escena conserva luces/fuego.
- [x] Asset/licencia de fuego documentado: GIF interno generado para el proyecto en `src/renderer/public/effects/area-fire.gif`, sin asset externo.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke/manual test con `pnpm dev` realizado: Electron/Vite levanto en `http://localhost:5174/`; se cerro manualmente despues del arranque.
- [x] Documentacion actualizada.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

### 12. Cambio posterior: oscuridad solo en ventana de jugador

La capa de oscuridad ambiental pasó a ser **exclusiva de la ventana del jugador** (ver ventana de jugador y rama `feature/dm-darkness-passthrough`).

- `drawDarknessLayer()` retorna inmediatamente cuando `viewRole === "dm"`, dejando la capa siempre vacía en la ventana del DM.
- `setViewRole()` programa un redibujado de la capa de oscuridad al cambiar de rol.
- Los controles de oscuridad del DM siguen afectando la ventana del jugador a través del snapshot de escena; el DM simplemente no ve el efecto en su propio canvas.
- Se agrega un badge flotante en la esquina superior izquierda del viewport del DM que informa cuando oscuridad y/o darkvision están activos para el jugador.

## Handles de Tamaño para Luces

### 1. Resumen

- **Objetivo:** Permitir redimensionar luz puntual y luz cónica directamente desde el canvas con handles de tamaño, reutilizando la experiencia de edición ya usada por formas tácticas.
- **Estado:** Implementado y aceptado
- **Prioridad:** Media
- **Dependencias:** Specs 06, 10, 12; selección y drag de elementos en PixiViewport; modelo actual `SceneLight.radius`.

### 2. Alcance

#### Incluido

- Resize interactivo para luz puntual seleccionada.
- Resize interactivo para luz cónica seleccionada.
- Handle de borde para radio de luz puntual.
- Handle de extremo para longitud/radio de luz cónica.
- Mantener la manivela/anillo existente para orientar la luz cónica.
- Actualización en tiempo real de visual de luz, oscuridad, darkvision y visión/fog derivada.
- Persistencia mediante el campo existente `SceneLight.radius`.
- Pruebas de dominio o UI indirecta donde aplique y verificación manual en Electron.

#### Fuera de alcance

- Cambiar ángulo de luz cónica.
- Diferenciar luz brillante y luz tenue.
- Modificar darkvision, oscuridad o fog of war más allá de refrescar sus máscaras al cambiar radio.
- Cambiar schema de escenas.
- Rediseñar sidebar, menú contextual o panel compacto de luces.
- Selección múltiple.

### 3. Decisiones tecnicas

- **Arquitectura:** El dominio mantiene `SceneLight.radius`; React actualiza estado de escena; Pixi solo calcula interacción canvas y emite callbacks tipados.
- **Persistencia:** No se agregan campos. Guardar/cargar conserva el nuevo tamaño usando `SceneLight.radius`.
- **IPC / Electron:** Sin canales nuevos. No hay cambios en preload ni main.
- **Render / PixiJS:** Añadir hit testing y drag mode para resize de luces dentro de `PixiViewport`, siguiendo los patrones de resize de formas y fuego.
- **Validacion:** El radio mínimo se limita en renderer antes de emitir el callback. El schema existente ya valida `radius` como positivo.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:** Sin tipos nuevos de escena. Reusar `SceneLight.radius`.
- **Reglas puras:** No se esperan nuevas reglas puras. El cálculo principal es distancia mundo entre centro de luz y cursor.
- **Coordenadas / unidades:** El resize se calcula en coordenadas de mundo usando `screenToWorld`, independiente del zoom. Para cono, el handle se ubica en dirección central a distancia `radius`.
- **Errores de dominio:** No se agregan errores nuevos. Valores inválidos se evitan con radio mínimo.

### 5. Cambios por capa

#### `domain`

- Sin cambios esperados.
- Si se encuentra duplicación importante en cálculo de radio, se puede extraer helper puro pequeño y testearlo.

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
  - Agregar callback `handleLightRadiusChange`.
  - Actualizar la luz seleccionada o indicada usando el update existente de luces.
  - Pasar `onLightRadiusChange` hacia `MapViewport`.
- En `src/renderer/src/components/MapViewport.tsx`:
  - Agregar prop `onLightRadiusChange`.
  - Conectarla al constructor de `PixiViewport`.

#### `render`

- En `src/render/pixi/PixiViewport.ts`:
  - Agregar callback `onLightRadiusChange` a `PixiViewportOptions`.
  - Agregar drag mode para resize de luz.
  - Crear hit test para handle de radio de luz puntual seleccionada.
  - Crear hit test para handle de longitud de luz cónica seleccionada.
  - Priorizar hit testing de resize antes de mover la luz.
  - Dibujar handles de resize cuando la luz está seleccionada.
  - Actualizar radio con `Math.max(10, distanciaMundo)`.
  - Re-renderizar capas dependientes al recibir nuevo estado desde React.

### 6. Plan de trabajo

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

### 7. Testing y verificacion

- **Unit tests:** No se esperan nuevos si el cálculo queda acotado al viewport. Si se extrae helper de distancia/radio, agregar test unitario.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Crear luz puntual, seleccionarla y arrastrar handle de borde; crear luz cónica, rotarla y redimensionarla; activar oscuridad y darkvision para verificar máscaras.

### 8. Riesgos y mitigaciones

- **Riesgo:** El handle de resize del cono compite con la manivela de rotación.
  **Mitigacion:** Ubicar resize en el extremo del cono y evaluar hit tests en orden explícito.
- **Riesgo:** Resize no actualiza máscaras de oscuridad/darkvision durante drag.
  **Mitigacion:** Usar el estado React existente para actualizar `lights`; `setLights` ya redibuja capas dependientes.
- **Riesgo:** El handle no es legible sobre mapas claros u oscuros.
  **Mitigacion:** Usar relleno cálido con borde oscuro similar a handles existentes.
- **Riesgo:** El radio queda demasiado pequeño o inválido.
  **Mitigacion:** Aplicar mínimo de `10` unidades de mundo antes de emitir el cambio.

### 9. Criterios de aceptacion

- Al seleccionar una luz puntual aparece un handle de radio en su borde.
- Arrastrar el handle de luz puntual cambia su radio.
- Al seleccionar una luz cónica aparece un handle de longitud en el extremo central del cono.
- Arrastrar el handle de luz cónica cambia su longitud sin cambiar dirección.
- La manivela de rotación del cono sigue funcionando y no cambia longitud.
- Los handles solo aparecen en la luz seleccionada.
- Oscuridad y darkvision reflejan el nuevo radio durante y después del drag.
- Guardar y cargar escena conserva los tamaños modificados.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/08-lighting-and-darkness/spec.md`
- `specs/08-lighting-and-darkness/plan.md`
- `README.md` si se documenta el uso final de resize de luces.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

## Usabilidad de controles de luz

- [x] Pasar zoom a dibujo de resize/orientacion y aplicar `getAreaToolUiScale`.
- [x] Actualizar hit tests de radio y orientacion con la misma escala.
- [x] Incorporar ambos tipos al arbol lateral sin duplicar datos.
- [x] Probar clicks dentro/fuera del handle a distintos zooms.
- [x] Extension de controles aceptada por el usuario para 1.9.0; cobertura de hit testing automatizada.
