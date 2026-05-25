# Plan - Tokens y Minis Virtuales

Este documento describe de forma unificada el plan tecnico para implementar y mantener tokens y minis virtuales, consolidando los pasos y criterios vigentes en el proyecto.

## Minis virtuales y marcadores futuros

### 1. Resumen

- **Objetivo:** Implementar tokens/minis virtuales opcionales que se puedan crear sobre la grilla, mover, seleccionar, configurar desde el aside derecho y guardar/cargar dentro de la escena.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Specs 04 (protocolo seguro para imagenes de mapa), 11 (aside derecho), 15 (propiedades del objeto seleccionado en sidebar), 16 (guardar/cargar escena), 21 (reglas de medicion/grilla).

### 2. Alcance

#### Incluido

- Crear tokens virtuales como una capa opcional del mapa.
- Cargar imagenes de token usando un protocolo seguro de assets, sin `file://`, `data:` ni acceso directo del renderer al filesystem.
- Mover tokens con snap a grilla.
- Renderizar la imagen del token como un circulo perfecto mediante mascara circular Pixi, con escala tipo `object-fit: cover`.
- Definir el tamano del token al crearlo:
  - Diminuto, Pequeno y Mediano: 1 x 1 casilla.
  - Grande: 2 x 2 casillas.
  - Enorme: 3 x 3 casillas.
  - Gargantuesco: 4 x 4 casillas.
- Seleccionar tokens y mostrar sus propiedades en el acordeon de objeto seleccionado del aside derecho.
- Mostrar propiedades de token en el aside derecho limitadas al color del selector.
- Mostrar una lista de tokens en el aside derecho con imagen circular, nombre, tamano, cardinalidad por nombre y badge numerico cuando aplique.
- Permitir seleccionar tokens desde esa lista.
- Permitir mostrar u ocultar tokens desde cada fila del listado lateral.
- Renderizar el badge como numero pequeno en esquina con el color de seleccion, sin circulo de fondo.
- Calcular consecutivos solo entre tokens con el mismo `name`; `type` no define si dos tokens son el mismo.
- Mantener `type` oculto para el usuario.
- Mantener `badgeNumber` como dato calculado/no editable.
- Agregar un boton `Nuevo token` al final de la lista que abre el modal de creacion, permite seleccionar la imagen dentro del modal y posiciona el token en un punto aleatorio del viewport visible.
- Configurar el color de la circunferencia de seleccion por token.
- Mostrar un badge numerico cuando exista mas de un token del mismo tipo.
- Persistir tokens en `.ttrpgscene`, incluyendo posicion, tamano, imagen, color de seleccion, badge y orden.

#### Fuera de alcance

- Combate automatizado.
- Hojas de personaje.
- Iniciativa.
- Sincronizacion online.
- Vista separada de jugador/DM.
- Reglas automaticas de ocultamiento, vision, ataque o movimiento.
- Asociacion funcional de tokens a luces o vision; queda como extension futura aunque el modelo debe permitirlo.

### 3. Decisiones tecnicas

- **Arquitectura:** El dominio define tokens y reglas puras de tamano/orden. El renderer solo orquesta UI y seleccion. PixiJS queda encapsulado en adapters de render. Main/preload concentran dialogos y protocolo de imagen.
- **Persistencia:** La escena versionada agrega `tokens: SceneToken[]`. La carga debe tolerar escenas antiguas sin tokens inicializando `tokens` en `[]`.
- **IPC / Electron:** Agregar una accion explicita para seleccionar imagen de token, por ejemplo `token:open-image`, expuesta como `window.ttrpg.openTokenImage()`. El renderer recibe ruta local para persistencia y URL de protocolo para render. No exponer `fs`, `path`, `ipcRenderer` ni canales genericos.
- **Protocolo de assets:** Reusar el patron del protocolo usado para mapas. Si el protocolo actual acepta rutas de imagen genericas, registrar tokens en ese mismo mecanismo; si esta acoplado a mapas, crear un protocolo equivalente `token-asset:` o un adapter comun de assets locales. El objetivo es que Pixi cargue `token-asset:<id>` o una URL segura equivalente, nunca `data:` ni `file://`.
- **Render / PixiJS:** Crear una capa `tokens` con sprites de imagen, circunferencia de seleccion, badge numerico y hit area. La capa queda inmediatamente por encima del mapa y por debajo de oscuridad ambiental, luces, oscuridad magica, fog of war, herramientas de area, seleccion y UI React, para que el player view respete ocultamiento visual.
- **Mascara circular:** Cada sprite de token se escala para cubrir el footprint y se recorta con una mascara circular de radio `footprintWorld / 2`; no debe deformarse a ovalo ni mostrar esquinas.
- **Viewport visible:** El render expone una funcion para calcular un punto aleatorio dentro del area visible actual. El renderer la usa al crear tokens desde el boton lateral.
- **Validacion:** Validar payloads de token con schema compartido: ids, rutas no vacias, tamanos permitidos, colores hex, posiciones finitas y orden numerico.
- **Dependencias nuevas:** Ninguna prevista.

### 4. Diseno de dominio

- **Entidades / tipos:**
  - `TokenSize = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan"`.
  - `TokenFootprintCells = 1 | 2 | 3 | 4`.
  - `SceneToken` con `id`, `name`, `type`, `imagePath`, `position`, `size`, `footprintCells`, `selectionColor`, `badgeNumber`, `order`, `visible`.
- **Reglas puras:**
  - `getTokenFootprintCells(size)` devuelve 1, 2, 3 o 4 segun la tabla del spec.
  - `assignTokenBadge(tokens, tokenName)` calcula el siguiente badge estable para tokens repetidos con el mismo nombre.
  - `sortTokensByOrder(tokens)` mantiene orden visual y persistido.
  - `snapTokenToGrid(point, grid, footprintCells)` centra el token sobre la celda o bloque de celdas correspondiente.
- **Coordenadas / unidades:** La posicion se guarda en coordenadas de mundo. El tamano visual se calcula desde `grid.cellSizeWorld * footprintCells`, no desde pixeles de pantalla.
- **Errores de dominio:** Rechazar tamanos desconocidos, posiciones no finitas, colores invalidos y tokens sin id o sin imagen cuando el flujo exige imagen.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/tokens/token.ts` o modulo equivalente con tipos, tabla de tamanos, badge y orden.
- Actualizar `src/domain/sessions/scene-document.ts` para incluir `tokens`.
- Actualizar `src/domain/sessions/scene-schema.ts` para validar tokens y tolerar escenas antiguas.
- Agregar tests unitarios para footprint, badge, orden y serializacion.

#### `application`

- Crear casos de uso o helpers para crear token, duplicar token, mover token y actualizar propiedades.
- Mantener la logica de badge/orden fuera de React.
- Preparar puertos para carga de imagen de token si la arquitectura actual ya usa servicios de assets.

#### `infrastructure`

- Extender el servicio de assets locales para registrar imagenes de token.
- Mantener rutas locales en escena y resolverlas a URLs de protocolo al cargar/renderizar.
- Manejar rutas rotas con error recuperable y placeholder visual no persistente.

#### `main`

- Agregar handler `token:open-image` con dialogo de imagenes (`png`, `jpg`, `jpeg`, `webp`, `gif` si Pixi lo soporta en el flujo actual).
- Registrar o extender el protocolo seguro para servir imagenes de token.
- Validar rutas seleccionadas antes de devolverlas al renderer.

#### `preload`

- Exponer una API pequena y tipada:
  - `openTokenImage(): Promise<TokenImageSelection | null>`.
  - Si aplica, `resolveTokenAsset(path): Promise<TokenAssetReference>`.
- No exponer APIs genericas ni objetos Electron completos.

#### `renderer`

- Agregar UI para crear token desde el menu contextual o desde el sidebar, manteniendo el modulo opcional.
- Al crear token, pedir imagen, nombre y tamano; `type` se deriva internamente y no se muestra.
- Mostrar una lista de tokens en el acordeon `Tokens`; cada item selecciona el token correspondiente.
- La lista muestra cardinalidad de tokens con el mismo nombre.
- El boton `Nuevo token` abre el flujo de creacion y usa el viewport visible como origen de posicion.
- Seleccionar tokens igual que otros objetos; al seleccionarlos abrir automaticamente el aside si esta cerrado.
- Mostrar propiedades del token en el acordeon superior del aside:
  - Color de circunferencia de seleccion.
- No mostrar ni permitir editar `type`, `badgeNumber`, nombre, tamano u orden desde propiedades.
- Cada fila de la lista tiene una accion para mostrar u ocultar el token.
- Persistir cambios de propiedades en el estado de escena.

#### `render`

- Crear adapter Pixi para tokens:
  - Sprite de imagen ajustado al footprint de grilla.
  - Mascara circular perfecta sobre la imagen del token.
  - Circunferencia de seleccion con color configurable.
  - Badge numerico pequeno en esquina para tokens repetidos, usando el color de seleccion y sin circulo.
  - Hit testing y drag con snap a grilla.
- Liberar texturas, sprites y listeners al borrar token, cargar nueva escena o destruir viewport.
- Rehidratar imagenes desde protocolo al cargar escena.

### 6. Plan de trabajo

1. Modelar `SceneToken`, `TokenSize`, footprint por casillas, badge y orden en dominio.
2. Extender schema y documento de escena para persistir `tokens`.
3. Implementar la API segura de carga de imagen de token usando el protocolo local de assets.
4. Crear el flujo UI para agregar token con imagen, tipo/nombre y tamano.
5. Renderizar tokens en Pixi con sprite, seleccion, color configurable y badge.
   - El sprite debe cubrir una mascara circular perfecta del tamano del footprint.
6. Integrar seleccion de token con el aside derecho de propiedades.
7. Agregar lista de tokens al aside derecho y boton `Nuevo token`.
8. Agregar accion mostrar/ocultar por token en la lista lateral.
9. Ajustar badge numerico a marca pequena en esquina sin fondo circular.
10. Implementar ubicacion inicial aleatoria dentro del viewport visible para tokens creados desde el aside.
11. Implementar movimiento con snap a grilla y persistencia de posicion/orden/visibilidad.
12. Verificar guardado/carga de escena con tokens y rehidratacion de imagenes.

### 7. Testing y verificacion

- **Unit tests:** Footprint por tamano, badge para tokens repetidos, orden, validacion schema y carga de escenas antiguas sin tokens.
- **Integration tests:** Guardar/cargar `.ttrpgscene` con tokens y orden persistido.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** En `pnpm dev`, crear tokens de varios tamanos, moverlos, cambiar color de seleccion, duplicar token del mismo tipo para ver badge, guardar escena, cerrar/cargar escena y confirmar que imagenes y orden reaparecen.

### 8. Riesgos y mitigaciones

- **Riesgo:** Repetir bugs de carga de imagen por usar `file://` o `data:`.
  **Mitigacion:** Centralizar la carga de tokens en el protocolo seguro usado para assets locales y cubrir el flujo con smoke test de guardado/carga.
- **Riesgo:** Los tokens convierten la app en un VTT completo.
  **Mitigacion:** Mantener alcance limitado a imagen, tamano, posicion, seleccion, badge y persistencia.
- **Riesgo:** Fugas de memoria por texturas no liberadas.
  **Mitigacion:** Registrar lifecycle de sprites/texturas en el adapter Pixi y limpiar al cambiar escena.
- **Riesgo:** El badge se asigne a tokens que comparten tipo pero no son el mismo token.
  **Mitigacion:** Calcular y mostrar consecutivos solo por `name` normalizado.

### 9. Criterios de aceptacion

- El usuario puede crear un token con imagen cargada por protocolo seguro.
- El token se muestra sobre la grilla con el tamano correcto segun su categoria.
- La imagen del token se recorta como circulo perfecto.
- Al seleccionar un token, el aside derecho se abre y muestra sus propiedades.
- El aside derecho lista tokens con imagen, badge y seleccion por click.
- El aside derecho muestra cardinalidad por nombre en cada fila del listado.
- Cada token del listado puede mostrarse u ocultarse desde su fila.
- Las propiedades del token solo permiten editar el color del selector.
- El tipo del token permanece oculto para el usuario.
- El badge no es editable desde propiedades.
- El badge numerico es pequeno, no esta encerrado en circulo y usa el color de seleccion.
- El boton `Nuevo token` del aside crea tokens dentro del viewport visible.
- El color de la circunferencia de seleccion puede cambiarse por token.
- Al crear mas de un token con el mismo nombre, se muestra un badge numerico estable.
- El token puede moverse con snap a grilla.
- Guardar y cargar una escena conserva tokens, imagenes, posiciones, tamanos, color de seleccion, badge y orden.
- Escenas antiguas sin tokens siguen cargando correctamente.

### 10. Documentacion afectada

- `./specs/14-tokens/spec.md` si durante implementacion se ajusta el alcance.
- Documentacion de formato `.ttrpgscene` si existe archivo dedicado.
- Docs o comentarios del protocolo local de assets si se agrega `token-asset:`.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin `file://` ni `data:` para imagenes de token.
- [x] Sin dependencias nuevas no justificadas.
