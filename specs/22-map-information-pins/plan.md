# Plan - Pines y Areas de Informacion del Mapa

## Borrado de areas - cierre 1.10.0

- [x] Extraer `removeInformationArea(scene, id)` al dominio; preservar referencias de colecciones ajenas y rechazar ids inexistentes/areas bloqueadas.
- [x] Unificar teclado y arbol en `handleDeleteInformationArea`; resolver seleccion actual por ref y capturar un ID estable antes de actualizar estado.
- [x] Limpiar solo seleccion/modal pertenecientes al area eliminada, conservando otra seleccion activa.
- [x] Propagar callback de borrado por DmAsidePanel a MapAnnotationsTree; papelera en terrenos/trampas y teclado por fila sin bubbling.
- [x] Mantener restricciones de bloqueo y campos editables; separar titulo y acciones para legibilidad.
- [x] Agregar regresiones de dominio y componente para ambas teclas, ambos tipos, borrado dirigido, bloqueo y buscador.
- [x] Aceptacion del usuario el 2026-09-02 para commit y merge a main en 1.10.0.

Verificar: crear area, seleccionar desde canvas y pulsar Backspace/Delete; crear otra y borrarla desde papelera sin seleccionarla; confirmar que un objeto seleccionado distinto permanece. Bloquear area y comprobar proteccion, desbloquear y borrar. Guardar/recargar debe mantener la ausencia del area.

Validacion (2026-09-02): 350 tests en 49 archivos, typecheck, lint y build correctos. Smoke en navegador de Backspace desde canvas, papelera y bloquear/desbloquear realizado, sin errores de consola. Ambas teclas y borrado dirigido desde fila cubiertos en `MapAnnotationsTree.test.tsx`; aislamiento de colecciones y bloqueo en `map-annotations.test.ts`. Cierre autorizado para 1.10.0; sin afirmar ejecucion adicional de round trip nativo.

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- [x] Reutilizar GridCell en InformationAreaCell, rasterizar con GridGeometry y deduplicar por geometria/layout.
- [x] Actualizar centro/bounds, renderer de area y seleccion con helpers compartidos, incluyendo aristas exteriores sin duplicados.
- [x] Preservar/validar layout en schema, traslacion y highlight; pruebas en map-annotations.test.ts y scene-schema.test.ts.
- [x] Verificar visualmente en navegador trazo y contorno hexagonal guardado.


Este documento describe el plan tecnico para implementar pines privados de habitacion, areas informativas del DM, un indice navegable de anotaciones y highlights temporales en la ventana del jugador.

## 1. Resumen

- **Spec fuente:** `./specs/22-map-information-pins/spec.md`
- **Objetivo:** Implementar anotaciones espaciales persistentes y privadas para el DM, con contenido Markdown seguro, busqueda y navegacion desde el sidebar, bloqueo individual y comunicacion visual temporal de areas hacia Player View.
- **Estado:** Implementado; pendiente de smoke visual y aceptacion final.
- **Prioridad:** Alta.
- **Dependencias:** Specs 01, 03, 05, 06, 09, 15, 16 y 17; schema versionado de escena; seleccion y herramientas Pixi; sidebar derecho; renderer Markdown; IPC de ventana jugador.

## 2. Alcance

### Incluido

- Agregar `mapAnnotations` al documento de escena con `pins` y `areas`.
- Mantener compatibilidad con escenas anteriores mediante defaults vacios.
- Crear modo `Pin de habitacion`:
  - cursor contextual;
  - click en coordenada de mundo;
  - modal Markdown;
  - seleccion, arrastre, edicion, bloqueo y borrado.
- Crear modo `Area de informacion`:
  - pintado por celdas;
  - feedback incremental;
  - consolidacion/deduplicacion al finalizar;
  - modal de tipo, nombre y descripcion Markdown;
  - seleccion, desplazamiento, edicion, bloqueo y borrado.
- Agregar tipos iniciales `terrain` y `trap`.
- Crear controles de anotaciones en el sidebar derecho y un arbol de anotaciones en el panel izquierdo.
- Agregar buscador por titulo/nombre, categoria y contenido Markdown.
- Agregar seleccion y accion `Ir a`, centrando camara sin cambiar zoom.
- Agrupar el arbol en `Habitaciones` y `Areas > Terrenos/Trampas`, con accion explicita de highlight en cada area.
- Agregar toggle local `Mostrar anotaciones` para DM.
- Persistir `locked` por anotacion.
- Renderizar las anotaciones persistentes solo en DM.
- Excluir por construccion toda informacion privada del snapshot de Player View.
- Enviar un evento IPC minimo al hacer doble click sobre un area.
- Mostrar un highlight temporal de 5 segundos en Player View:
  - verde oliva para terreno;
  - rojo para trampa.
- Permitir varios highlights temporales simultaneos.
- Reutilizar el flujo visual del apuntador arcano para entrega y limpieza de eventos temporales.
- Endurecer el renderer Markdown compartido para sanitizar HTML antes de usar `dangerouslySetInnerHTML`.

### Fuera de alcance

- Mostrar pines o areas persistentes en Player View.
- Enviar nombres, descripcion o contenido Markdown al renderer jugador.
- Mostrar texto de una anotacion a jugadores.
- Disparar trampas por colision o entrada de tokens.
- Aplicar costes de movimiento por terreno.
- Categorias personalizadas.
- Adjuntos, imagenes, audio, video o PDFs.
- Biblioteca global de anotaciones entre escenas.
- Historial/versionado de contenido.
- Edicion desde Player View.
- Integracion de anotaciones con SQLite.
- Cambios incompatibles del formato `.ttrpgscene`.

## 3. Decisiones tecnicas

- **Arquitectura:** Crear un modulo puro `domain/annotations` para tipos, defaults, busqueda, geometria, bloqueo y construccion de payloads publicos. React administra herramientas, drafts y modales. Pixi administra dibujo, hit testing y feedback visual. Main/preload solo enrutan highlights temporales.
- **Persistencia:** Agregar `mapAnnotations` a `SceneDocumentV1` como campo compatible con default `{ pins: [], areas: [] }`. Guardar Markdown fuente y `locked`; no guardar HTML renderizado, estado de modal, busqueda, visibilidad global ni highlights activos.
- **Privacidad:** No basta con ocultar anotaciones en Pixi jugador. Antes de publicar `PlayerWindowSnapshot`, crear una copia publica de la escena con `mapAnnotations` vacio. El evento de highlight solo incluye id tecnico, tipo, geometria y duracion.
- **IPC / Electron:** Agregar canales especificos `player-window:publish-information-area-highlight` y `player-window:information-area-highlight`, validados y aceptados solo desde la ventana DM.
- **Render / PixiJS:** Agregar un contenedor persistente DM `mapAnnotations` y otro temporal `informationAreaHighlights`. Ambos quedan sobre fog; seleccion/handles siguen por encima. El contenedor persistente no existe visualmente en Player View.
- **Area pintada:** Representar inicialmente la geometria como celdas en espacio de mundo. Interpolar el movimiento para evitar huecos, deduplicar por clave estable y emitir un unico objeto al terminar el trazo.
- **Markdown:** Extraer un componente reutilizable de editor/previsualizacion. Mantener `marked` para GFM/tablas y agregar `dompurify` para sanitizar el HTML generado. Deshabilitar HTML crudo y manejar enlaces con las reglas seguras existentes.
- **Visibilidad:** `showMapAnnotations` vive como estado local del renderer DM. No se persiste ni se envia al jugador.
- **Bloqueo:** `locked` se valida en dominio y se vuelve a comprobar tanto en UI como en callbacks de mutacion, evitando depender solo del estado visual de Pixi.
- **Validacion:** Zod valida ids, coordenadas finitas, tamanos positivos, textos acotados, tipos enumerados y listas de celdas no vacias para areas persistidas.
- **Dependencias nuevas:** `dompurify`, dependencia pequena y enfocada para sanitizar el HTML generado por Markdown antes de insertarlo en el DOM.

## 4. Diseno de dominio

### Entidades y tipos

Crear `src/domain/annotations/map-annotations.ts` con tipos equivalentes a:

```ts
export type InformationAreaType = "terrain" | "trap";

export interface MapInformationPin {
  readonly id: string;
  readonly kind: "room-pin";
  readonly position: WorldPoint;
  readonly title: string;
  readonly content: string;
  readonly locked: boolean;
}

export interface InformationAreaCell {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface MapInformationArea {
  readonly id: string;
  readonly kind: "information-area";
  readonly areaType: InformationAreaType;
  readonly name: string;
  readonly description: string;
  readonly cells: readonly InformationAreaCell[];
  readonly locked: boolean;
}

export interface MapAnnotations {
  readonly pins: readonly MapInformationPin[];
  readonly areas: readonly MapInformationArea[];
}

export interface InformationAreaHighlightBroadcast {
  readonly id: string;
  readonly areaId: string;
  readonly areaType: InformationAreaType;
  readonly cells: readonly InformationAreaCell[];
  readonly durationMs: 5000;
}
```

### Reglas puras

- `createDefaultMapAnnotations()` devuelve listas vacias nuevas.
- `getInformationAreaColor(type)` devuelve los colores canonicos de terreno/trampa.
- `deduplicateInformationAreaCells(cells)` elimina duplicados sin alterar cobertura.
- `rasterizeInformationAreaStroke(points, cellSize)` interpola el trazo y produce celdas contiguas.
- `translateInformationArea(area, delta)` desplaza todas las celdas como una unidad.
- `getMapAnnotationCenter(annotation)` devuelve posicion del pin o centro de bounds del area.
- `searchMapAnnotations(annotations, query)` normaliza mayusculas, espacios y acentos para comparar titulo/nombre, categoria y contenido.
- `canTransformMapAnnotation(annotation)` y `canDeleteMapAnnotation(annotation)` respetan `locked`.
- `createInformationAreaHighlightBroadcast(area)` devuelve solo geometria y datos visuales permitidos.
- `stripPrivateMapAnnotationsForPlayer(scene)` devuelve una escena publica con `mapAnnotations` vacio.
- `isInformationAreaHighlightBroadcast(value)` o schema equivalente valida el payload IPC.

### Coordenadas y unidades

- El pin usa coordenadas de mundo exactas del click; pan y zoom no cambian su posicion.
- El area usa celdas con `x`, `y` y `size` en mundo.
- El pincel usa `grid.cellSizeWorld` como tamano base.
- El algoritmo interpola entre muestras de pointer para no dejar huecos al mover rapido el mouse.
- `Ir a` calcula el centro en mundo y modifica solo el centro de camara; conserva el zoom actual.
- Mover un area aplica un delta de mundo a todas sus celdas.

### Invariantes y errores

- Id no vacio y unico dentro de pines/areas.
- Coordenadas finitas.
- `size > 0`.
- Pin persistente con titulo no vacio.
- Area persistente con al menos una celda.
- `areaType` limitado a `terrain | trap`.
- Textos con limites altos pero finitos para impedir escenas patologicas; propuesta:
  - titulo/nombre: 1-120 caracteres cuando sea obligatorio;
  - Markdown: maximo 100.000 caracteres por anotacion.
- Anotaciones bloqueadas rechazan move/delete de forma recuperable.
- Payload IPC invalido no se reenvia y devuelve error serializable.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/annotations/map-annotations.ts`.
- Crear `src/domain/annotations/map-annotations.test.ts`.
- Extender `InteractionTool` en `src/domain/interaction/interaction-state.ts` con:
  - `room-pin`;
  - `information-area`.
- Extender `SceneDocumentV1` en `src/domain/sessions/scene-document.ts` con `mapAnnotations`.
- Actualizar `createDefaultScene()` en `src/domain/sessions/default-scene.ts`.
- Actualizar `hasSceneContent()` para considerar pines y areas como contenido real de escena.
- Agregar helpers para crear ids estables o reutilizar `getNextAvailableSceneId` con prefijos diferenciados.
- Agregar al dominio de Player View el tipo `InformationAreaHighlightBroadcast` o importarlo desde annotations sin generar dependencias circulares.
- Agregar helper de snapshot publico que elimine `mapAnnotations` antes de IPC.

### `application`

- Mantener save/load sobre los casos de uso de escena existentes.
- No crear repositorio nuevo: las anotaciones viajan dentro de `SceneDocument`.
- Incorporar el filtrado privado al constructor/orquestador de `PlayerWindowSnapshot`.
- Verificar que nueva escena, carga de escena y recuperacion en memoria actualicen correctamente anotaciones y limpien drafts/highlights temporales.

### `infrastructure`

- Sin cambios de SQLite ni filesystem.
- La serializacion sigue usando el adaptador `.ttrpgscene` existente.
- Agregar `dompurify` mediante `pnpm` y mantener un unico lockfile.

### `main`

- Extender `src/main/ipc/player-window-ipc.ts` con un handler dedicado para publicar highlights.
- Validar que el sender sea la ventana DM mediante `isFromDmWindow`.
- Validar el payload antes de `sendToPlayerWindow`.
- Si Player View no existe, devolver `{ ok: true }` sin retener el evento temporal.
- No guardar el ultimo highlight en `latestSnapshot`; un highlight no debe reproducirse al abrir tarde la ventana jugador.
- Limpiar referencias/listeners al destruir Player View usando el ciclo existente.

### `preload`

- Extender `src/preload/index.ts` con:
  - `publishPlayerInformationAreaHighlight(highlight)`;
  - `onPlayerInformationAreaHighlight(handler)` con unsubscribe.
- Extender `src/preload/ttrpg-api.d.ts` con tipos concretos.
- No exponer `ipcRenderer`, `send(channel)` ni APIs genericas.

### `renderer`

- En `App.tsx`:
  - agregar `showMapAnnotations`, default `true`;
  - agregar drafts de pin y area pendientes;
  - agregar estado de modal crear/editar;
  - agregar estado de busqueda del indice;
  - agregar `annotations` a las mutaciones de escena;
  - extender seleccion y borrado para pines/areas respetando `locked`;
  - abrir automaticamente el sidebar y accordion contextual al seleccionar una anotacion;
  - limpiar drafts/modales en nueva escena, carga y `Escape`;
  - publicar el highlight en doble click de area.
- Extender `openSidebarSections` con `annotations`.
- Agregar un `SidebarAccordion` derecho `Anotaciones` con el switch `Mostrar anotaciones` y las acciones de creacion.
- Extender `DmAsidePanel` con un accordion izquierdo que contenga:
  - buscador;
  - arbol derivado con `useMemo`;
  - ramas `Habitaciones` y `Areas > Terrenos/Trampas`;
  - icono, nombre, contadores de grupo y estado seleccionado;
  - seleccionar, `Ir a`, editar y bloquear/desbloquear;
  - accion de highlight de 5 segundos para hojas de area.
- Crear componentes enfocados, por ejemplo:
  - `MapAnnotationsSection.tsx`;
  - `MapInformationPinModal.tsx`;
  - `MapInformationAreaModal.tsx`;
  - `MarkdownEditorPreview.tsx`;
  - `SafeMarkdownContent.tsx`.
- Reutilizar estilos `.markdown-content`, pero mover logica segura a un componente compartido.
- Los modales no deben insertar el draft en escena hasta `Guardar`.
- Al cancelar, descartar draft y preview Pixi.
- Agregar botones `Pin de habitacion` y `Area de informacion` en el grupo de herramientas apropiado del sidebar/menu contextual segun el layout vigente.
- Usar iconos de la libreria disponible o simbolos ya consistentes; no agregar una libreria de iconos solo para esta feature.
- En `PlayerApp.tsx`:
  - subscribirse al evento de highlight;
  - pasarlo a `MapViewport`;
  - no exponer UI de anotaciones;
  - no conservarlo como parte de la escena.

### Markdown seguro

- Actualizar `src/renderer/src/components/aside/markdown.ts` para separar:
  - parse de Markdown GFM;
  - sanitizacion del HTML generado.
- Sanitizar con una allowlist compatible con parrafos, encabezados, listas, tablas, emphasis, code y blockquote.
- Eliminar `script`, `style`, handlers `on*`, iframes y URLs con esquemas inseguros.
- Mantener tablas Markdown y caracteres especiales.
- Crear tests de seguridad para HTML crudo, atributos de evento y enlaces `javascript:`.
- Migrar los consumidores actuales de `renderMarkdown` a `SafeMarkdownContent` o garantizar que todos reciban HTML ya sanitizado.

### `render`

- Extender `MapViewportProps` con:
  - `mapAnnotations`;
  - `showMapAnnotations`;
  - `isRoomPinMode`;
  - `isInformationAreaMode`;
  - `informationAreaHighlightEvent` opcional;
  - callbacks de place/stroke/move/double-click.
- Extender `MapViewportHandle` con `centerOnWorldPoint(point)`.
- En `PixiViewport`:
  - agregar `mapAnnotationsLayer` para DM;
  - agregar `informationAreaHighlightLayer` temporal;
  - mantener ambos por debajo de selection UI y por encima de fog;
  - agregar setters con dirty tracking para anotaciones y visibilidad;
  - dibujar pines con hit target estable e icono legible;
  - usar un pin de 64 unidades de diametro y un hit target de 46 unidades de radio compartido por seleccion y doble click;
  - renderizar junto al pin un `Text` Pixi de 24 unidades, peso semibold, alpha alto y stroke oscuro para mantener una escala comparable al selector y asegurar legibilidad;
  - aplicar al label la escala inversa de la camara en cada `applyCamera` y redibujado de anotaciones para conservar su tamano constante durante zoom in/out;
  - dibujar areas por union visual de celdas, no como cientos de contornos independientes;
  - agregar preview incremental durante pintado;
  - emitir celdas consolidadas al terminar pointerup;
  - integrar pines/areas en `SelectableRenderElement` solo para DM;
  - impedir drag de elementos bloqueados;
  - detectar doble click de areas antes del drag normal;
  - abrir el doble click de pines en modo preview y reservar las acciones explicitas para edicion directa;
  - permitir mover un area como unidad;
  - centrar camara conservando escala/zoom;
  - mostrar highlights temporales sin hit testing;
  - destruir Graphics, ticker callbacks y timers al expirar o destruir viewport.
- Evitar reconstruir luces, tokens, efectos o fog cuando solo cambian anotaciones.
- Al ocultar anotaciones, desactivar render/hit testing sin destruir datos del dominio.

## 6. Plan de trabajo

1. Crear el modulo `domain/annotations` con tipos, defaults, colores y reglas de bloqueo.
2. Implementar y testear deduplicacion, rasterizacion/interpolacion de strokes, traslacion y centro geometrico.
3. Implementar y testear busqueda normalizada por titulo, categoria y Markdown.
4. Extender `SceneDocumentV1`, `createDefaultScene`, `scene-content` y schema Zod con `mapAnnotations` compatible.
5. Agregar tests de schema para escenas antiguas, round-trip y validacion de anotaciones.
6. Agregar `mapAnnotations` a deteccion de campos desactualizados para sugerir re-guardado cuando corresponda.
7. Extender `InteractionTool` y la maquina de interaccion con `room-pin` e `information-area`.
8. Crear setters, callbacks y handle de camara en `MapViewport`.
9. Agregar capas Pixi de anotaciones DM y highlights temporales, respetando orden y dirty tracking.
10. Implementar modo de colocacion de pin y preview provisional sin mutar escena antes de guardar.
11. Implementar pintado incremental de area, interpolacion entre muestras y emision consolidada al terminar.
12. Integrar pines/areas en seleccion, hit testing, drag, doble click y borrado con reglas `locked`.
13. Crear modales de pin y area con drafts, guardar/cancelar y edicion.
14. Agregar `dompurify`, endurecer el renderer Markdown compartido y agregar tests de sanitizacion.
15. Crear `MarkdownEditorPreview` y reutilizarlo en ambos modales.
16. Separar `Anotaciones` entre controles de creacion/visibilidad a la derecha y un arbol navegable a la izquierda con busqueda, seleccion, `Ir a`, edicion, bloqueo y highlight explicito.
17. Extender el panel contextual de seleccion para pines/areas.
18. Construir y usar una escena publica sin anotaciones privadas en `PlayerWindowSnapshot`.
19. Crear el tipo y validador de `InformationAreaHighlightBroadcast`.
20. Agregar handler main, API preload y listener renderer para el evento temporal.
21. Renderizar highlights de 5 segundos en Player View y verificar convivencia multiple/limpieza.
22. Limpiar drafts, modales y highlights en nueva escena, carga, `Escape` y destroy.
23. Ejecutar pruebas automatizadas, typecheck, lint y build.
24. Realizar smoke manual completo en DM y Player View.
25. Al aceptar/cerrar la feature, actualizar version minor y `CHANGELOG.md` segun `AGENTS.md`.

## 7. Testing y verificacion

### Unit tests

- Defaults y factories de anotaciones.
- Deduplicacion de celdas.
- Interpolacion de strokes rapidos sin huecos.
- Traslacion de areas.
- Centro de pin y bounds de area.
- Busqueda sin distinguir mayusculas/acentos.
- Colores por tipo.
- Reglas de bloqueo.
- Construccion del payload de highlight sin contenido privado.
- Filtrado de `mapAnnotations` en snapshot jugador.
- Sanitizacion de Markdown/HTML peligroso.

### Schema y serializacion

- Escena antigua sin `mapAnnotations` carga con default vacio.
- Pin y area validos hacen round-trip sin perder datos.
- `locked` ausente cae a `false` si se decide aceptar drafts/escenas tempranas.
- Coordenadas no finitas, sizes invalidos y tipos desconocidos se rechazan.
- `detectOutdatedSceneFields` reporta `mapAnnotations` ausente.
- `hasSceneContent` considera una anotacion como contenido.

### Integracion

- El snapshot publicado a Player View no contiene titulo, contenido, nombre ni descripcion de anotaciones.
- Main rechaza highlights emitidos por una ventana que no sea DM.
- Preload registra y retira listeners correctamente.
- Highlight valido llega a Player View con geometria, tipo y duracion.
- Cerrar Player View antes o durante un highlight no produce excepcion.

### Comandos

- **Tests:** `pnpm test`
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`

### Smoke manual

- Crear, cancelar, editar, mover, bloquear, desbloquear y borrar pin.
- Confirmar que el nombre aparece sutilmente junto al pin y que doble click inicia en preview antes de permitir editar.
- Crear, cancelar, editar, mover, bloquear, desbloquear y borrar area.
- Pintar despacio y rapido; confirmar region continua y un unico objeto persistente.
- Buscar por nombre, categoria y contenido Markdown.
- Verificar la jerarquia visual del arbol izquierdo y sus conectores para habitaciones, terrenos y trampas.
- Usar `Ir a` con distintos zooms y comprobar que no cambia escala.
- Ocultar anotaciones y confirmar que siguen en indice y archivo.
- Guardar/cargar escena y verificar contenido, coordenadas y bloqueo.
- Abrir Player View y confirmar ausencia total de anotaciones persistentes.
- Doble click en terreno/trampa y verificar color, geometria y 5 segundos.
- Disparar varios highlights y comprobar limpieza.
- Probar Markdown con tablas, caracteres especiales y contenido malicioso.
- Probar pan con Space, `Escape`, click derecho y herramientas exclusivas.

## 8. Riesgos y mitigaciones

- **Riesgo:** Secretos del DM viajan dentro del snapshot jugador aunque no se rendericen.
  **Mitigacion:** Construir una copia publica antes de IPC y testear el objeto serializado, no solo el render.
- **Riesgo:** `marked` permite HTML crudo y el proyecto usa `dangerouslySetInnerHTML`.
  **Mitigacion:** Sanitizar centralmente con DOMPurify, probar vectores XSS y migrar todos los consumidores al helper seguro.
- **Riesgo:** Pintado largo produce miles de celdas/Graphics.
  **Mitigacion:** Interpolar con paso acotado, deduplicar, consolidar visualmente y usar dirty tracking de capa.
- **Riesgo:** El doble click inicia drag o edicion por accidente.
  **Mitigacion:** Resolver doble click antes de transformacion, usar umbral temporal/espacial y reservar edicion al sidebar/modal.
- **Riesgo:** Bloqueo aplicado solo en UI se puede saltar desde callbacks.
  **Mitigacion:** Validar `locked` en handlers de App y Pixi antes de mutar.
- **Riesgo:** Areas ocultas siguen capturando clicks.
  **Mitigacion:** Desactivar hit testing junto con visibilidad del contenedor.
- **Riesgo:** Highlight queda debajo de fog.
  **Mitigacion:** Capa temporal explicitamente superior a fog y prueba visual en Player View.
- **Riesgo:** Timers o Graphics temporales quedan vivos.
  **Mitigacion:** Registro por id, cleanup al expirar y limpieza global en destroy/cambio de escena.
- **Riesgo:** `Ir a` altera calibracion o zoom fisico.
  **Mitigacion:** Cambiar solo el centro de camara y conservar zoom/escala/map scale.

## 9. Criterios de aceptacion

- `mapAnnotations` existe en escena y escenas antiguas cargan con listas vacias.
- Pines y areas sobreviven guardar/cargar `.ttrpgscene` con contenido, geometria y `locked`.
- Crear/cancelar no deja objetos provisionales en escena.
- Pines y areas solo se renderizan y seleccionan en DM.
- Los pines usan marcador ampliado, label sutil y doble click con preview inicial.
- El arbol izquierdo `Anotaciones` permite buscar, seleccionar, ir a, editar, bloquear/desbloquear y mostrar areas al jugador; el accordion derecho mantiene creacion y visibilidad.
- `Ir a` centra la camara sin modificar zoom.
- El Markdown soporta GFM/tablas y se renderiza sanitizado.
- Una anotacion bloqueada no se mueve ni se borra, pero puede consultarse y desbloquearse.
- Pintar un area produce una region continua y un unico objeto persistente.
- Doble click, propiedades o la accion del arbol sobre un area generan un evento de 5 segundos en Player View.
- Terreno usa verde oliva y trampa usa rojo.
- Varios highlights pueden coexistir y todos liberan recursos.
- Player View nunca recibe contenido privado de anotaciones.
- Nueva escena y carga limpian drafts/highlights sin afectar datos cargados.
- No hay regresiones en seleccion, pan, zoom, fog, fuego, agua, path, etiquetas o apuntador.
- Tests, typecheck, lint y build pasan.

## 10. Documentacion afectada

- `specs/22-map-information-pins/spec.md`.
- `specs/22-map-information-pins/plan.md`.
- `specs/03-scene-persistence/spec.md` y `plan.md`, por el nuevo campo `mapAnnotations`.
- `specs/05-navigation-and-interaction/spec.md` y `plan.md`, por los nuevos modos y conflictos.
- `specs/06-sidebar-and-properties/spec.md` y `plan.md`, por el accordion `Anotaciones`.
- `specs/15-player-window/spec.md` y `plan.md`, por privacidad y evento temporal.
- `specs/16-entities/spec.md` y `plan.md`, si se endurece el renderer Markdown compartido.
- `CHANGELOG.md` al cerrar la feature.
- `package.json` al cerrar la feature con bump minor compatible.

## 11. Checklist de cierre

- [x] Tipos, defaults y helpers de dominio implementados.
- [x] `mapAnnotations` agregado al schema con compatibilidad hacia atras.
- [x] Herramienta y modal de pin implementados.
- [x] Herramienta, pintado y modal de area implementados.
- [x] Seleccion, movimiento, edicion y borrado implementados.
- [x] Bloqueo individual implementado y persistido.
- [x] Arbol izquierdo con busqueda, agrupacion, `Ir a`, edicion, bloqueo y highlight implementado; controles de creacion/visibilidad conservados a la derecha.
- [x] Markdown GFM sanitizado y tests de seguridad agregados.
- [x] Snapshot jugador excluye toda informacion privada.
- [x] Highlight temporal DM -> jugador implementado y limpiado.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado sobre los archivos modificados; el comando global conserva errores previos en `index.js` generado y `MonsterLibraryModal.tsx`.
- [x] `pnpm build` ejecutado.
- [ ] Smoke manual realizado en DM y Player View.
- [x] Specs relacionados actualizados si cambia una decision.
- [x] Version minor y `CHANGELOG.md` actualizados al cerrar la feature.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Dependencias nuevas justificadas: `dompurify` para sanitizacion y `jsdom` para sus pruebas.
