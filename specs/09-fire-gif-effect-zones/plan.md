# Plan de implementacion tecnica - 09 - Zonas de Fuego con GIF Animado

## 1. Resumen

- **Spec fuente:** `./specs/09-fire-gif-effect-zones/09-fire-gif-effect-zones.md`
- **Objetivo:** Reemplazar el fuego procedural por un efecto basado en `assets/effects/fire.gif`, preservando transparencia, soportando circulos abiertos/cerrados y zonas a mano alzada rellenadas con tiles del GIF.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 06, 07 y 08; sistema de efectos existente; escena versionada; PixiJS viewport; asset local `assets/effects/fire.gif`.

## 2. Alcance

### Incluido

- Usar `assets/effects/fire.gif` como fuente canonica del efecto visual de fuego.
- Preservar obligatoriamente la transparencia/alpha del GIF en render simple, tileado y recortado.
- Reemplazar el render procedural actual del fuego por un adapter de render basado en el asset.
- Mantener creacion, seleccion, movimiento, borrado, visibilidad, escala, opacidad y emision de luz.
- Permitir ajustar el radio visual del fuego circular arrastrando el contorno/handle del fuego seleccionado.
- Permitir ajustar el radio de luz emitida por el fuego arrastrando un contorno/handle de luz independiente.
- Hacer que la luz emitida por el fuego recorte la capa de oscuridad con el mismo contrato visual que las luces normales.
- Agregar modelo de zona de fuego:
  - `circle` cerrado,
  - `circle` abierto tipo aro/perimetro,
  - `freehand` como poligono dibujado a mano alzada.
- Agregar UI para alternar fuego circular abierto/cerrado.
- Agregar flujo de dibujo a mano alzada para zonas de fuego.
- Persistir geometria y modo de zona en `.ttrpgscene`.
- Repetir el GIF como tiles cuando la zona sea mayor al asset.
- Recortar/enmascarar tiles por circulo, aro o poligono.
- Agregar tests de dominio/schema para geometria de fuego y migracion/defaults.
- Actualizar README/specs si la implementacion final toma una decision tecnica relevante sobre GIF/sprite sheet.

### Fuera de alcance

- Simulacion de propagacion de fuego.
- Danio, reglas de combate o automatizacion TTRPG.
- Colisiones o recorte por paredes/puertas.
- Editor avanzado de nodos para zonas freehand.
- Multiples assets de fuego seleccionables.
- Descarga o importacion de assets remotos.
- Reescribir el sistema completo de luces.

## 3. Decisiones tecnicas

- **Arquitectura:** Mantener reglas de geometria de fuego en `domain`, estado y controles en `renderer`, y render Pixi encapsulado en `src/render/pixi`.
- **Persistencia:** Extender `SceneEffect` de forma compatible con campos opcionales/defaults para `zone`, `shape`, `radius`, `innerRadius` o puntos freehand. El schema debe aceptar escenas existentes con fuego antiguo.
- **IPC / Electron:** No agregar canales IPC. El asset es interno al proyecto y debe resolverse por pipeline local seguro.
- **Render / PixiJS:** Implementado con `GifSource` y `GifSprite` desde `pixi.js/gif`, cargando `assets/effects/fire.gif` como asset URL de Vite. No se agrego dependencia nueva. La transparencia del asset se conserva al componer sprites y al recortar por mascaras Pixi.
- **Luz del fuego:** Los fuegos con `emitsLight` participan en el recorte de oscuridad usando un erase mask circular basado en `lightRadius`, igual que las luces normales. La visual del fuego sigue en la capa de efectos, pero su iluminacion se integra en la capa de oscuridad.
- **Validacion:** Validar ids, tipo de zona, radio positivo, puntos finitos, poligono con puntos minimos, opacidad `0..1`, escala positiva y limites razonables de tiles.
- **Dependencias nuevas:** Evitarlas salvo que la reproduccion GIF animada no sea viable sin una extension. Si se agrega dependencia, justificar tamano, mantenimiento y compatibilidad Electron/Vite.

## 4. Diseno de dominio

- **Entidades / tipos:** Extender `SceneEffect` o agregar tipos auxiliares como `FireZone`, `FireZoneKind`, `FireCircleMode`, `FireFreehandZone`.
- **Reglas puras:** Crear fuego default, alternar circulo abierto/cerrado, actualizar radio, crear zona freehand desde puntos, simplificar puntos, calcular bounds de zona, calcular posiciones de tiles.
- **Coordenadas / unidades:** Guardar centro, radio y puntos en coordenadas de mundo. No guardar coordenadas de pantalla.
- **Errores de dominio:** Radio invalido, poligono freehand insuficiente, puntos no finitos, tile count excesivo o geometria no renderizable.

## 5. Cambios por capa

### `domain`

- Crear o extender modulo de fuego en `src/domain/effects/fire.ts`.
- Agregar tipos puros para zonas de fuego.
- Agregar helpers de tileado y simplificacion freehand si no dependen de Pixi.
- Actualizar tests de `fire.test.ts` para:
  - default compatible,
  - circulo abierto/cerrado,
  - freehand con puntos validos,
  - rechazo/sanitizacion de puntos invalidos,
  - calculo de tiles/bounds basico.

### `application`

- Sin casos de uso nuevos si guardar/cargar escena sigue bastando.
- Mantener compatibilidad con escenas existentes mediante defaults/schema.

### `infrastructure`

- Asegurar que `assets/effects/fire.gif` se empaquete o se copie al lugar que Vite/Electron pueda servir.
- No leer el asset desde filesystem en renderer.
- Si se necesita transformar GIF a frames/sprite sheet durante build o desarrollo, documentar la ruta generada y mantenerla reproducible.

### `main`

- Sin cambios esperados.
- No agregar IPC para leer el GIF.

### `preload`

- Sin cambios esperados.
- No exponer APIs nuevas.

### `renderer`

- Agregar controles en panel de fuego para:
  - modo circular abierto/cerrado,
  - radio/zona si aplica,
  - iniciar dibujo freehand si se decide desde UI contextual o toolbar.
- Exponer handles en canvas para:
  - cambiar el radio del fuego circular seleccionado,
  - cambiar el radio de luz del fuego seleccionado cuando `emitsLight` este activo.
- Integrar herramienta de dibujo freehand con `Escape`, seleccion y borrado existentes.
- Mostrar preview durante el dibujo freehand.
- Mantener menu contextual compacto.

### `render`

- Reemplazar `drawSceneEffect` procedural para fuego por render basado en GIF/frames.
- Crear mascara/recorte para:
  - circulo cerrado,
  - aro/circulo abierto,
  - poligono freehand.
- Tilear el GIF dentro de bounds de la zona, con solapamiento minimo si evita costuras.
- Preservar transparencia del GIF en cada tile y en la composicion final.
- Reutilizar el mismo patron de recorte de oscuridad de las luces para que el fuego con `emitsLight` revele el mapa bajo overlays altos.
- Limpiar texturas, sprites, masks y containers al actualizar/destruir escena.
- Definir limites de tiles por efecto para proteger rendimiento.

## 6. Plan de trabajo

1. Revisar soporte real de Pixi/Vite/Electron para `assets/effects/fire.gif` y decidir estrategia: GIF directo, frames, extension o sprite sheet derivado.
2. Documentar la estrategia elegida en este plan: GIF directo con `pixi.js/gif`, sin conversion ni dependencia nueva.
3. Extender tipos de escena para zonas de fuego con defaults compatibles para fuegos existentes.
4. Actualizar schema de escena para parsear fuegos antiguos y nuevos.
5. Implementar helpers puros de dominio para zona circular, modo abierto/cerrado y freehand.
6. Agregar tests unitarios de dominio/schema.
7. Agregar resolucion segura del asset interno en renderer/build sin filesystem directo.
8. Implementar render Pixi del fuego con transparencia preservada.
9. Implementar recorte por circulo cerrado, aro y freehand.
10. Implementar tileado para zonas mayores que el GIF con limite de tiles.
11. Agregar UI para alternar circulo abierto/cerrado.
12. Agregar herramienta/flujo para dibujar zona freehand y preview mientras se dibuja.
13. Conservar movimiento, seleccion, borrado, opacidad, escala y emision de luz.
14. Agregar handles de resize para el radio visual del fuego circular y para el radio de luz del fuego.
15. Integrar la luz del fuego al erase mask de oscuridad para revelar el mapa igual que una luz normal.
16. Actualizar README/spec si la decision de asset final requiere notas.
17. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
18. Smoke manual: crear fuego, verificar transparencia, cambiar abierto/cerrado, dibujar freehand, guardar/cargar escena.

## 7. Testing y verificacion

- **Unit tests:** Dominio de fuego, zonas, defaults compatibles, schema de escenas antiguas/nuevas, tile bounds basico.
- **Integration tests:** Parse/serialize de `.ttrpgscene` con fuegos circulares y freehand.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, cargar mapa, crear fuego, confirmar que no aparece fondo cuadrado/opaco alrededor del GIF, alternar abierto/cerrado, dibujar freehand, verificar tileado continuo, guardar/cargar escena.
- **Verificacion visual must-have:** Con fondo de mapa visible, la transparencia del GIF debe dejar ver el mapa alrededor de las llamas en una instancia simple y en una zona tileada.

## 8. Riesgos y mitigaciones

- **Riesgo:** PixiJS no reproduce GIF animado directamente.
  **Mitigacion:** Probar soporte primero y tener fallback documentado a frames/sprite sheet o extension liviana.
- **Riesgo:** La transparencia se pierde al convertir o tilear el asset.
  **Mitigacion:** Verificar alpha en render manual y evitar conversiones que aplanen contra fondo solido.
- **Riesgo:** El GIF de 19 MB consume demasiada memoria al tilearse.
  **Mitigacion:** Reusar textura/frames, limitar tiles por efecto y documentar degradacion si se supera.
- **Riesgo:** Freehand genera demasiados puntos.
  **Mitigacion:** Simplificar puntos por distancia/umbral antes de persistir y renderizar.
- **Riesgo:** Masks complejas degradan performance.
  **Mitigacion:** Mantener geometria simple, cachear containers cuando sea viable y probar con areas grandes.

## 9. Criterios de aceptacion

- El fuego usa `assets/effects/fire.gif` o una derivacion documentada de ese asset.
- La transparencia del GIF se preserva; no aparece fondo cuadrado/opaco.
- Crear fuego desde click derecho muestra el nuevo fuego animado.
- El fuego circular alterna entre cerrado y abierto.
- El modo cerrado rellena la zona circular.
- El modo abierto renderiza un aro/perimetro y deja libre el centro.
- El usuario puede dibujar una zona freehand de fuego.
- La zona freehand se rellena con tiles del GIF.
- Las zonas mayores al GIF repiten tiles de forma continua y recortada por la geometria.
- Fuego conserva seleccion, movimiento, borrado, opacidad, escala, visibilidad y emision de luz.
- El radio visual del fuego circular puede modificarse arrastrando su handle en canvas.
- El radio de luz del fuego puede modificarse arrastrando su handle en canvas.
- La luz del fuego revela el mapa bajo la capa de oscuridad igual que una luz normal.
- Guardar/cargar escena conserva zona y modo de fuego.
- Escenas con fuego anterior siguen cargando con defaults compatibles.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/09-fire-gif-effect-zones/09-fire-gif-effect-zones.md`
- `README.md`
- Posibles notas en `specs/06-lighting-darkness-and-fire/06-lighting-darkness-and-fire.md` si la implementacion cambia el contrato base de fuego.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Estrategia GIF/frames/sprite sheet documentada.
- [x] Transparencia del GIF preservada por composicion alpha de `GifSprite`.
- [x] Tipos de zona de fuego agregados.
- [x] Schema compatible con fuegos antiguos.
- [x] Tests relevantes agregados o actualizados.
- [x] Render con circulo cerrado implementado.
- [x] Render con circulo abierto implementado.
- [x] Render freehand implementado.
- [x] Tileado y recorte implementados.
- [x] UI de abierto/cerrado implementada.
- [x] Flujo freehand implementado.
- [x] Handles de resize para radio de fuego y radio de luz implementados.
- [x] Luz de fuego integrada al erase mask de oscuridad.
- [x] Guardar/cargar conserva geometria.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
