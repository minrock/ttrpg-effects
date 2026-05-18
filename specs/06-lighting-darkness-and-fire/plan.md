# Plan de implementacion tecnica - 06 - Iluminacion, Oscuridad y Fuego Animado

## 1. Resumen

- **Spec fuente:** `./specs/06-lighting-darkness-and-fire/06-lighting-darkness-and-fire.md`
- **Objetivo:** Implementar oscuridad global configurable, luces puntuales/conicas y fuego animado seleccionable sobre el mapa, con guardado/carga dentro del formato de escena.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 00-04 implementadas, Spec 05 `adjust-map` considerada como base previa de ajuste de mapa, PixiJS viewport, modelo de interaccion, formato `.ttrpgscene`, assets CC0/generados para fuego.

## 2. Alcance

### Incluido

- Capa de oscuridad global configurable por activacion, color y opacidad.
- Luz puntual con posicion, radio, color, intensidad y opacidad.
- Luz conica con posicion, longitud en cuadros, direccion, color, intensidad y opacidad; el angulo queda fijo en 60 grados.
- Fuego animado placeholder o sprite generado/CC0, superpuesto al mapa.
- Creacion desde menu contextual o toolbar de luces/fuego.
- Seleccion, movimiento, ocultado y borrado de luces/fuego.
- Panel compacto de propiedades para editar radio/longitud, direccion, color, intensidad, opacidad y escala segun tipo.
- Guardado/carga de luces y efectos en `.ttrpgscene`.
- Tests de dominio para validaciones y transformaciones.

### Fuera de alcance

- Sombras por paredes.
- Vision por tokens/minis.
- Niebla de guerra persistente.
- Oclusion geometrica compleja.
- Sistema final de particulas.
- Marketplace/biblioteca de assets.
- Sincronizacion multiusuario.

## 3. Decisiones tecnicas

- **Arquitectura:** Las entidades de luces/fuego y sus validaciones viven en `domain/lighting` y `domain/effects`. React solo maneja controles/estado visual. PixiJS renderiza adapters desde entidades serializables.
- **Persistencia:** Reutilizar y ampliar `SceneDocumentV1` si es compatible sin migracion mayor. Guardar luces en `scene.lights` y fuego en `scene.effects`. Mantener ids estables y coordenadas de mundo.
- **IPC / Electron:** No agregar IPC nuevo salvo que se importe un asset externo. Para esta fase, preferir asset local del proyecto o dibujo/animacion procedural en PixiJS.
- **Render / PixiJS:** Usar capa `darkness` para overlay global, capa `lights` para revelar/aclarar zonas y capa `effects` para fuego animado. Las luces deben revelar el mapa debajo de la oscuridad con mascara de geometria; la implementacion aceptada renderiza una copia del mapa sobre el overlay y la enmascara por luz para que el mapa se vea claro aun con overlay alto.
- **Interaccion de luz conica:** La luz conica mantiene angulo fijo de 60 grados. Su alcance se controla como longitud en cuadros de grilla y su direccion se ajusta desde un aro/manija en el canvas alrededor del origen de la luz.
- **Validacion:** Clamp de opacidad/intensidad `0..1`, radio/longitud positiva, direccion normalizada `0..360`, color hex valido, escala positiva. El angulo de cono debe conservarse en 60 grados.
- **Dependencias nuevas:** Ninguna prevista. Si se usa asset externo, guardar archivo, fuente y licencia junto al asset. Si se genera fuego procedural, no agregar dependencia.

## 4. Diseno de dominio

- **Entidades / tipos:** `LightSource`, `PointLight`, `ConeLight`, `AnimatedFireEffect`, `LightId`, `EffectId`, `LightKind`, `EffectKind`.
- **Reglas puras:** Crear luz por tipo, actualizar propiedades, mover en coordenadas de mundo, ocultar/mostrar, borrar por id, asociar fuego a luz calida opcional. En luces conicas, cualquier actualizacion debe preservar angulo fijo de 60 grados.
- **Coordenadas / unidades:** Todas las posiciones/radios se guardan en mundo. La UI convierte longitud de cono en cuadros usando `grid.cellSizeWorld` y muestra la distancia segun `grid.distancePerCell`. Direccion de luz conica se expresa en grados.
- **Errores de dominio:** Radio/longitud invalida, color invalido, intensidad/opacidad fuera de rango, direccion invalida, id duplicado.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/lighting/lights.ts` con tipos y funciones puras de luces.
- Crear `src/domain/effects/fire.ts` con tipos y funciones puras de fuego.
- Agregar tests para creacion, actualizacion, clamps, borrado y serializacion compatible con escena.
- Revisar `scene-document.ts` y `scene-schema.ts` para soportar propiedades completas de luces/fuego.

### `application`

- Si el estado crece, crear helpers para mapear elementos interactivos a `scene.lights`/`scene.effects`.
- Mantener operaciones serializables y puras para que guardar/cargar siga siendo simple.

### `infrastructure`

- Agregar asset local de fuego si se usa sprite sheet.
- Guardar licencia/fuente si el asset no es generado internamente.
- No agregar repositorios, DB ni filesystem adicional.

### `main`

- No agregar IPC nuevo en la primera version.
- Mantener seguridad Electron ya configurada.

### `preload`

- No exponer APIs nuevas.
- Guardar/cargar sigue pasando por escena.

### `renderer`

- Añadir acciones de creacion: `Luz puntual`, `Luz conica`, `Fuego`.
- Añadir panel compacto de propiedades para el elemento seleccionado cuando sea luz/fuego.
- Añadir toggles de visibilidad y controles de color/opacidad/intensidad/radio. Para luz conica, reemplazar radio libre por longitud en cuadros y ocultar cualquier control de angulo.
- Mantener controles discretos para no tapar el mapa.
- Mostrar estado claro de seleccion y tipo de elemento seleccionado.
- Para luz conica seleccionada, mostrar aro/manija de orientacion en el canvas; arrastrar el origen mueve la luz y arrastrar la manija cambia la direccion.

### `render`

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

## 6. Plan de trabajo

1. Revisar estado actual de Spec 05 y resolver cualquier dependencia necesaria del ajuste de mapa.
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

## 7. Testing y verificacion

- **Unit tests:** Validacion de luces/fuego, clamps de radio/opacidad/intensidad, direccion, angulo fijo de 60 grados para conos, serializacion.
- **Integration tests:** Cargar/guardar escena con luces y fuego usando use cases existentes.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar mapa, activar oscuridad, subir overlay alto, crear luz puntual y luz conica, confirmar que el mapa se ve claro dentro del circulo/cono, ajustar longitud del cono en cuadros, orientar el cono desde el aro/manija, crear fuego, seleccionarlo, moverlo, borrarlo, guardar escena y cargarla de vuelta.

## 8. Riesgos y mitigaciones

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

## 9. Criterios de aceptacion

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

## 10. Documentacion afectada

- Actualizar README con pasos para probar oscuridad, luces y fuego.
- Documentar asset de fuego, fuente y licencia si aplica.
- Actualizar este plan si se decide usar un sistema distinto de blend/mask.

## 11. Checklist de cierre

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
- [x] Asset/licencia de fuego documentado si aplica: no aplica, fuego procedural sin asset externo.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke/manual test con `pnpm dev` realizado: Electron/Vite levanto en `http://localhost:5174/`; se cerro manualmente despues del arranque.
- [x] Documentacion actualizada.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
