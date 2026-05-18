# Plan de implementacion tecnica - 01 - Motor Visual y Capas de Render

## 1. Resumen

- **Spec fuente:** `./specs/01-visual-engine-and-render-layers/01-visual-engine-and-render-layers.md`
- **Objetivo:** Implementar el lienzo visual principal con PixiJS, una camara basica con pan/zoom, conversion centralizada pantalla <-> mundo y una estructura explicita de capas de render.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Spec 00 implementada, Electron/Vite/React funcionales, PixiJS, tipos de coordenadas de dominio.

## 2. Alcance

### Incluido

- Integrar PixiJS dentro del renderer sin acoplarlo a reglas de dominio.
- Crear el canvas principal de la aplicacion.
- Definir tipos y funciones puras para coordenadas de pantalla, mundo y camara.
- Implementar pan y zoom basicos sobre la camara.
- Crear una jerarquia de capas con el orden recomendado por el spec.
- Dibujar elementos de prueba en capas distintas para validar orden, zoom y pan.
- Limpiar correctamente PixiJS, listeners y recursos al desmontar la vista.

### Fuera de alcance

- Carga real de mapas desde archivos.
- Calibracion de grilla.
- Luces, mascaras, oscuridad real o fuego animado final.
- Herramientas tacticas completas y mediciones persistidas.
- Persistencia en SQLite o `.ttrpgscene`.
- Edicion avanzada de capas desde UI.

## 3. Decisiones tecnicas

- **Arquitectura:** El renderer React monta un componente contenedor, pero la logica de camara, coordenadas y orden de capas vive en modulos testeables fuera de React. PixiJS queda encapsulado en `src/render/pixi`.
- **Persistencia:** No se implementa persistencia en esta spec. Las posiciones de prueba pueden vivir en memoria y no deben tocar SQLite ni filesystem.
- **IPC / Electron:** No se agregan canales IPC. El renderer no necesita APIs privilegiadas para esta fase.
- **Render / PixiJS:** Usar PixiJS como motor visual. Crear una clase/adaptador de escena que inicialice `Application`, contenedores de capas, resize, pan/zoom y destruccion limpia.
- **Validacion:** Validar matematicamente conversiones pantalla <-> mundo con tests unitarios. Validar manualmente que el canvas aparece y que pan/zoom no rompe el layout.
- **Dependencias nuevas:** Agregar `pixi.js`. No agregar librerias extra de gestos, estado global o UI salvo necesidad posterior.

## 4. Diseno de dominio

- **Entidades / tipos:** Crear tipos para `ScreenPoint`, `WorldPoint`, `CameraState`, `ZoomLevel` y nombres de capas. Evitar objetos sueltos para coordenadas.
- **Reglas puras:** Implementar `screenToWorld`, `worldToScreen`, `panCamera` y `zoomCameraAtScreenPoint` como funciones puras testeables sin DOM, React, Electron ni PixiJS.
- **Coordenadas / unidades:** La camara mantiene posicion en mundo y zoom de navegacion. Todas las entidades de mapa futuras deben almacenar posiciones en mundo, no en pantalla.
- **Errores de dominio:** Rechazar o limitar zoom invalido, como `0`, valores negativos, `NaN` o infinito. Definir minimo y maximo de zoom para evitar estados inutilizables.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/shared/coordinates.ts` o modulo equivalente para tipos de coordenadas.
- Crear `src/domain/map/camera.ts` o modulo equivalente para estado y transformaciones de camara.
- Agregar tests unitarios para conversion pantalla <-> mundo, pan y zoom centrado en cursor.

### `application`

- No crear casos de uso persistentes todavia.
- Si hace falta, crear un servicio liviano de inicializacion visual solo si reduce acoplamiento entre React y `render`.

### `infrastructure`

- No crear repositorios, DB, migraciones ni filesystem.
- No cargar assets externos para el mapa en esta spec.

### `main`

- No modificar comportamiento de ventana salvo que el canvas revele un problema de sizing.
- Mantener configuracion segura de Electron ya definida en Spec 00.

### `preload`

- No exponer nuevas APIs.
- Mantener preload minimo y sin canales IPC genericos.

### `renderer`

- Reemplazar o evolucionar la pantalla tecnica inicial hacia una vista de herramienta con canvas central.
- Crear un componente React para montar el viewport PixiJS, por ejemplo `MapViewport`.
- Mantener UI discreta: nombre/estado compacto y controles minimos si son utiles para reset de camara.
- Usar hooks para ciclo de vida del viewport y eventos de resize, sin meter calculos de coordenadas en componentes.

### `render`

- Crear `src/render/pixi/PixiViewport.ts` o adaptador equivalente.
- Crear contenedores de capas en orden: fondo, mapa, grilla, oscuridad, luces, efectos, formas/mediciones, seleccion.
- Implementar resize del renderer al contenedor.
- Implementar eventos de puntero para pan y rueda para zoom.
- Dibujar elementos de prueba, por ejemplo fondo, grilla simple y marcadores en dos capas, para comprobar orden visual.
- Destruir `Application`, contenedores, texturas/listeners y observers al desmontar.

## 6. Plan de trabajo

1. Agregar `pixi.js` con `pnpm` y confirmar que build/typecheck siguen funcionando.
2. Crear tipos y funciones puras de coordenadas/camara en `domain`.
3. Agregar tests unitarios minimos para conversiones y limites de zoom.
4. Crear adaptador PixiJS con inicializacion, capas, resize, destruccion y elementos de prueba.
5. Crear componente React `MapViewport` que monte el adaptador sin exponer PixiJS al resto de la UI.
6. Implementar pan con pointer drag y zoom con rueda centrado en el cursor.
7. Ajustar estilos para que el canvas ocupe el area principal de la ventana al 100%.
8. Ejecutar typecheck, lint, build y smoke manual con `pnpm dev`.

## 7. Testing y verificacion

- **Unit tests:** Coordenadas, conversiones pantalla/mundo, pan, zoom centrado y limites de zoom.
- **Integration tests:** No requeridos salvo que se agregue un servicio intermedio.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, confirmar que el canvas aparece, los elementos de prueba se ven en capas distintas, pan y zoom responden fluidamente, y la ventana puede cerrarse sin errores.

## 8. Riesgos y mitigaciones

- **Riesgo:** Acoplar PixiJS directamente a componentes React y dificultar futuras herramientas.
  **Mitigacion:** Encapsular PixiJS en `src/render/pixi` y exponer una API pequena al componente.
- **Riesgo:** Mezclar coordenadas de pantalla con coordenadas de mundo.
  **Mitigacion:** Crear tipos explicitos y tests de conversion desde el inicio.
- **Riesgo:** Implementar zoom que desplace el punto bajo el cursor y haga incomoda la navegacion.
  **Mitigacion:** Testear `zoomCameraAtScreenPoint` y validar manualmente con rueda.
- **Riesgo:** Fugas de listeners, observers o recursos WebGL al desmontar.
  **Mitigacion:** Centralizar `destroy()` del viewport y llamarlo desde cleanup de React.
- **Riesgo:** Preparar mal el orden de capas y bloquear iluminacion futura.
  **Mitigacion:** Crear todas las capas nominales aunque algunas solo tengan placeholders.

## 9. Criterios de aceptacion

- Existe un canvas principal renderizado dentro de la ventana Electron.
- PixiJS inicializa sin errores visibles.
- La camara permite pan y zoom.
- La conversion pantalla <-> mundo esta centralizada y cubierta por tests.
- El orden de capas esta representado explicitamente en codigo.
- Hay elementos de prueba visibles en capas distintas.
- El renderer React no contiene reglas complejas de coordenadas o render.
- `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- Actualizar README si cambian comandos o se agregan notas para probar pan/zoom.
- Actualizar este plan si se cambia la estructura propuesta de `domain` o `render`.
- Registrar cualquier decision distinta a PixiJS antes de implementar.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] `pixi.js` agregado y justificado.
- [x] Tipos de coordenadas y camara creados en modulos testeables.
- [x] Tests unitarios de coordenadas/camara agregados.
- [x] Canvas PixiJS visible dentro de Electron.
- [x] Capas de render creadas en orden explicito.
- [x] Pan y zoom basicos funcionando.
- [x] Cleanup de PixiJS, listeners y observers implementado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke/manual test con `pnpm dev` realizado.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
