# Plan de implementacion tecnica - 24 - Control de Camara de Jugador

## 1. Resumen

- **Spec fuente:** `./specs/24-player-camera-control/spec.md`
- **Objetivo:** permitir que el DM controle centro y zoom de Player View mediante una camara principal, conozca la camara efectiva del jugador mediante una camara virtual y pueda resincronizar ambas sin degradar el render PixiJS.
- **Estado:** Implementado y aceptado.
- **Prioridad:** Alta.
- **Dependencias:** `01-render-engine`, `05-navigation-and-interaction`, `15-player-window`, IPC/preload de Player View y el sistema actual de capas PixiJS.
- **Compatibilidad:** no modifica el schema ni la version de `.ttrpgscene`.

## 2. Alcance

### Incluido

- Estado efimero y tipado de camara principal, camara efectiva, revision y sincronizacion.
- Marcador principal arrastrable y marcador virtual read-only visibles solo en el viewport DM.
- Controles DM de zoom in, zoom out y recentrado.
- Ordenes ligeras DM -> Player View para aplicar centro y zoom.
- Reportes ligeros Player View -> DM para comunicar su camara efectiva.
- Deteccion pura de sincronizacion con tolerancias explicitas.
- Integracion con apertura, cierre, carga de escena y cambio de mapa.
- Actualizacion documental del comportamiento anterior de Player View.
- Tests de dominio, validacion de mensajes y smoke de dos ventanas.
- Instrumentacion/verificacion de que las camaras no reconstruyen capas PixiJS ajenas.

### Fuera de alcance

- Persistencia de camaras en escenas o SQLite.
- Multiples Player Views.
- Rectangulo exacto del area visible de Player View.
- Rutas cinematograficas, easing o presets.
- Bloqueo remoto permanente del pan/zoom local.
- Cambios al orden de las capas de gameplay.
- Nuevas dependencias de render o estado.

## 3. Auditoria previa de rendimiento

### Hallazgos del codigo actual

1. `PixiViewport.applyCamera()` actualiza eficientemente `world.scale` y `world.position`, pero tambien redibuja inmediatamente oscuridad y agenda niebla. Cada orden remota de camara ya tiene ese costo inevitable en Player View; esta feature no debe agregar reconstrucciones de mapa, grid, luces, efectos, tokens, formas o seleccion.
2. El pan local llama `applyCamera()` durante `pointermove`. Publicar IPC en cada callback sin control produciria una cola de Promises/mensajes y actualizaciones frecuentes del DM.
3. `App` construye y publica `PlayerWindowSnapshot` desde estado React. Si la camara efectiva del jugador entra en `scene`, `playerWindowSnapshot` o dependencias del efecto de publicacion, cada movimiento puede serializar y reenviar la escena completa.
4. El efecto de creacion de `MapViewport` depende de todos sus callbacks. Un callback nuevo sin `useCallback` estable puede destruir y recrear `PixiViewport`, contexto, listeners y recursos GPU.
5. `drawSelectionLayer()` y los metodos `draw*Layer()` limpian/reconstruyen objetos. Usar `selection` para las camaras haria que desaparezcan o se creen de nuevo al seleccionar/mover otros elementos.
6. Crear `Graphics` por cada reporte de camara aumentaria allocations y presion de GC. Solo se requieren dos controles persistentes.
7. Enviar una orden de camara dentro de `publishPlayerScene` mezclaria navegacion con snapshots pesados y podria rehidratar datos visuales innecesariamente.
8. El control necesita tamano constante en pantalla. Redibujar su geometria en cada zoom es innecesario; basta actualizar su escala inversa o alojarlo en un overlay dedicado.

### Restricciones de rendimiento obligatorias

- Un maximo de dos objetos visuales persistentes para camaras en el viewport DM: principal y virtual.
- Ningun `clearContainerChildren()` por un reporte o drag de camara.
- Ningun `drawInteractiveElements()`, `drawEffectsLayer()`, `drawTokenLayer()`, `drawLightsLayer()`, `drawFogOfWarLayer()` o `drawDarknessLayer()` causado por actualizar solo el marcador DM.
- El drag de la camara principal actualiza directamente posicion del objeto Pixi; React e IPC reciben el valor consolidado al terminar el drag.
- Los reportes de Player View se coalescen y limitan a una frecuencia objetivo maxima de 10-15 Hz durante el gesto, con reporte final obligatorio.
- Solo puede existir un envio IPC de reporte en vuelo; si aparece otro valor, reemplaza el pendiente en lugar de crear una cola sin limite.
- Actualizar la camara virtual no debe entrar en el documento de escena ni en las dependencias de `playerWindowSnapshot`.
- Cambiar estado React solo al cambiar estado semantico (`sincronizada`, `desincronizada`, `cerrada`) o al consolidar una accion DM, no por cada pixel del pan del jugador.
- Las ordenes DM -> Player View contienen solo centro, zoom, revision y origen; nunca la escena completa.
- Los callbacks nuevos entregados a `MapViewport` deben ser estables.
- Todos los `requestAnimationFrame`, timers, listeners y mensajes pendientes deben cancelarse al desmontar/cerrar.

### Presupuesto funcional

- Arrastrar la camara principal en DM: actualizacion visual local por frame; un commit React y una orden IPC al soltar.
- Pan/zoom local del jugador: transformacion Pixi normal; reporte coalescido durante el gesto y uno final.
- Zoom remoto desde DM: una orden IPC y una llamada `setCameraSnapshot()` en Player View por click.
- Recentrar: una orden atomica para centro+zoom y una confirmacion correlacionada.
- Actualizar camara virtual: mutacion de posicion/escala/visibilidad del objeto persistente, sin redibujar el resto del viewport.

## 4. Decisiones tecnicas

- **Arquitectura:** reglas de comparacion y revision en dominio; orquestacion de ventana en renderer/main; Pixi encapsula marcadores e hit testing; React solo mantiene estado semantico y controles.
- **Persistencia:** estado efimero. No se agrega ningun campo a `SceneDocument` ni a SQLite.
- **IPC / Electron:** canales dedicados, payloads sanitizados y sender validado. Main enruta ordenes y reportes sin guardar copias de escena adicionales.
- **Render / PixiJS:** layer dedicado `playerCameraControls` por encima de `pointer`, presente solo en DM. Contenedores persistentes, actualizados in-place.
- **Coordenadas:** centro en mundo y zoom normalizado con helpers existentes. Marcadores con escala inversa al zoom DM para tamano visual constante.
- **Sincronizacion:** revision monotona por orden; reportes incluyen `acknowledgedCommandRevision` y origen para evitar loops.
- **Estado React:** refs para camaras de alta frecuencia; estado React reducido para disponibilidad/sincronizacion y render de toolbar.
- **Dependencias nuevas:** ninguna. Botones React usan `lucide-react` ya instalado; el simbolo dentro del canvas se dibuja una vez con Pixi o se convierte una sola vez a textura reutilizable.

## 5. Diseno de dominio

### Tipos nuevos

Crear o extender `src/domain/player/player-camera-control.ts` con tipos equivalentes a:

```ts
export interface PlayerCameraCommand {
  readonly revision: number;
  readonly camera: ViewportCameraSnapshot;
  readonly reason: "open" | "move" | "zoom" | "recenter" | "scene-change";
}

export interface PlayerCameraReport {
  readonly reportRevision: number;
  readonly acknowledgedCommandRevision: number | null;
  readonly camera: ViewportCameraSnapshot;
  readonly origin: "local-navigation" | "remote-command" | "initialization";
  readonly final: boolean;
}

export type PlayerCameraSyncStatus = "closed" | "synchronized" | "desynchronized" | "pending";
```

Los nombres definitivos pueden ajustarse al estilo local, conservando el contrato.

### Reglas puras

- `normalizePlayerCameraCommand` y `normalizePlayerCameraReport` rechazan revisiones invalidas y normalizan zoom/centro.
- `areCameraSnapshotsEquivalent(a, b, tolerance)` compara distancia de centro y diferencia de zoom.
- `derivePlayerCameraSyncStatus` distingue ventana cerrada, orden pendiente, sincronizada y desincronizada.
- `applyPlayerCameraReport` descarta reportes obsoletos y conserva la revision mas reciente.
- `zoomPlayerCamera` usa `clampZoom` y un factor/paso constante compatible con el viewport.
- El estado no depende de React, Electron, DOM ni PixiJS.

### Tolerancias iniciales

- Posicion: tolerancia expresada en pixeles de pantalla convertidos por zoom, no un valor fijo de mundo que cambie perceptualmente.
- Zoom: epsilon pequeno o diferencia relativa documentada.
- Ajustar valores durante smoke si producen parpadeo de sincronizacion, dejando tests para el valor final.

## 6. Cambios por capa

### `domain`

- Crear `src/domain/player/player-camera-control.ts`.
- Reutilizar `ViewportCameraSnapshot`, `normalizeCameraSnapshot` y `clampZoom`.
- Agregar sanitizadores sin `any` para comandos/reportes IPC.
- Agregar tests unitarios para:
  - normalizacion;
  - equivalencia con tolerancia;
  - orden de revisiones;
  - transiciones de sincronizacion;
  - clamp de zoom;
  - rechazo de NaN, infinito y revisiones negativas.

### `application`

- Mantener la orquestacion como estado de presentacion, separada de `SceneDocument`.
- Si la complejidad en `App.tsx` crece, extraer un hook/servicio `usePlayerCameraControl` que exponga:
  - refs de camara principal/efectiva;
  - estado semantico;
  - comandos `move`, `zoomIn`, `zoomOut`, `recenter`;
  - recepcion coalescida de reportes.
- El hook no debe construir ni publicar snapshots de escena.

### `infrastructure`

- No hay cambios de DB, filesystem, protocolos de imagen ni assets obligatorios.
- No serializar camaras en `.ttrpgscene`.

### `main`

- Extender `src/main/ipc/player-window-ipc.ts` con canales especificos:
  - `player-window:camera-command` DM -> Player View;
  - `player-window:camera-report` Player View -> DM.
- Validar sender:
  - solo DM envia comandos;
  - solo Player View envia reportes.
- Sanitizar payload antes de reenviar.
- Guardar como maximo la ultima orden necesaria para inicializar una ventana precargada/reabierta; no guardar historial.
- Reenviar reportes solo a ventanas DM, sin eco a Player View.
- Notificar disponibilidad/cierre para limpiar estado virtual.
- Evitar `invoke` concurrentes sin limite: usar evento especifico o protocolo coalescido con un unico envio pendiente.

### `preload`

- Exponer APIs pequenas y tipadas:
  - `commandPlayerCamera(command)` solo para DM;
  - `reportPlayerCamera(report)` solo para Player View;
  - `onPlayerCameraCommand(handler)`;
  - `onPlayerCameraReport(handler)`.
- Mantener o migrar `publishPlayerCamera/onPlayerCamera` sin romper el flujo actual durante la transicion.
- Retornar unsubscribe para listeners.
- No exponer canal generico ni `ipcRenderer`.
- Actualizar `src/preload/ttrpg-api.d.ts`.

### `renderer` DM

- Separar la camara local DM actual de la nueva camara principal del jugador; renombrar refs ambiguas como `playerCameraRef` si actualmente almacenan la camara DM.
- Inicializar la camara principal desde la camara DM vigente al abrir Player View o desde una camara valida al cambiar escena.
- Mantener camara principal y efectiva en refs para evitar renders por movimiento continuo.
- Mantener en estado React solo:
  - `isPlayerWindowOpen`;
  - `playerCameraSyncStatus`;
  - revision/feedback minimo necesario para controles.
- Escuchar reportes Player -> DM con callback estable.
- Actualizar el marcador virtual mediante API imperativa de `MapViewport`.
- Agregar grupo compacto de controles con iconos Lucide:
  - zoom out;
  - estado;
  - zoom in;
  - recentrar cuando aplique.
- Deshabilitar acciones que requieran Player View cuando no este visible/abierta.
- No agregar las camaras a `playerWindowSnapshot`, `scene`, autosave ni changelog de escena.

### `renderer` Player View

- Escuchar comandos remotos y aplicar solo comandos con revision nueva.
- Aplicar centro+zoom en una sola actualizacion de `cameraSnapshot` o API imperativa.
- Distinguir actualizacion programatica de navegacion local:
  - `setCameraSnapshot(..., emit = false)` no genera reporte manual;
  - despues de aplicar, emitir confirmacion correlacionada con origen `remote-command`.
- Exponer `onCameraChange` en rol player para navegacion local.
- Coalescer reportes con refs y `requestAnimationFrame`/timer; no ejecutar `setCamera` React durante cada pointermove.
- Emitir reporte final en `pointerup`, al finalizar wheel debounce, blur o cancelacion del gesto.
- Conservar bloqueo local de zoom; las ordenes remotas lo ignoran sin cambiar su estado.
- No agregar controles visuales nuevos en Player View.

### `render` / PixiJS

- Agregar `playerCameraControls` al final de `renderLayerNames`, exclusivo de la vista DM.
- No reutilizar `selection` ni `pointer` porque se limpian por otros flujos.
- Crear una estructura persistente con:
  - `primaryContainer`;
  - `virtualContainer`;
  - geometria y hit area creadas una vez;
  - visibilidad/alpha/posicion mutables.
- Agregar API a `PixiViewport`:
  - `setPlayerCameraControlState(...)`;
  - `clearPlayerCameraControlState()`;
  - callback final `onPlayerCameraControlMove`.
- Extender `MapViewportHandle` para actualizar markers imperativamente sin cambiar props de alta frecuencia.
- Al ejecutar `applyCamera()` en DM, actualizar solo escala inversa de ambos markers para conservar tamano constante.
- En drag del marker principal:
  - priorizar su hit test antes de elementos de escena;
  - mutar `primaryContainer.position` en `pointermove`;
  - no llamar `drawSelectionLayer` ni callbacks React por frame;
  - emitir posicion consolidada en `pointerup`.
- La camara virtual no participa en hit testing.
- Al aplicar una camara remota en Player View, usar la transformacion existente del `world`; solo oscuridad/fog pueden actualizarse por dependencia real de camara.
- No crear RenderTexture, Text, Sprite o Graphics por reporte.
- Destruir containers y listeners al destruir viewport.

## 7. Flujo de datos

### Apertura

1. DM obtiene su camara local actual y crea camara principal normalizada.
2. DM abre Player View con snapshot de escena y orden inicial correlacionada.
3. Player View hidrata escena, espera viewport listo y aplica la orden.
4. Player View confirma camara efectiva.
5. DM marca estado sincronizado y mantiene oculta la camara virtual.

### Movimiento de camara principal

1. DM arrastra marker; Pixi actualiza solo su posicion visual.
2. `pointerup` entrega una coordenada de mundo consolidada.
3. DM actualiza ref principal, incrementa revision y envia un comando pequeno.
4. Player View aplica la camara y confirma.
5. DM actualiza estado sincronizado sin reconstruir escena ni capas.

### Navegacion local del jugador

1. Pixi aplica pan/zoom local normalmente.
2. PlayerApp captura snapshots de camara en ref.
3. Un coalescer publica como maximo 10-15 reportes por segundo y un reporte final.
4. DM mueve directamente el marker virtual con el ultimo reporte.
5. React solo cambia si cambia el estado semantico de sincronizacion.

### Recentrado / zoom remoto

1. DM deriva nueva camara principal y crea revision.
2. Envia una orden atomica de centro+zoom.
3. Player aplica y confirma la revision.
4. DM elimina marker virtual al confirmar equivalencia.

## 8. Plan de trabajo

1. Actualizar la documentacion de Player View para aceptar reporte bidireccional controlado y ordenes explicitas.
2. Implementar tipos, sanitizadores, tolerancias y reducer/helpers puros de camara.
3. Agregar tests de dominio para sincronizacion, revisiones y zoom.
4. Extender canales main/preload con validacion de sender y payload.
5. Implementar coalescer de reportes Player -> DM sin colas IPC.
6. Habilitar callback de camara local en Player View sin emitir cambios programaticos.
7. Implementar layer Pixi dedicado con dos markers persistentes y escala constante.
8. Implementar drag del marker principal con mutacion local y callback solo al finalizar.
9. Exponer API imperativa de markers a traves de `MapViewportHandle`.
10. Separar refs de camara DM, principal y efectiva en `App`.
11. Implementar listener de reportes y actualizacion imperativa de camara virtual.
12. Agregar controles DM de zoom/recentrado/estado con callbacks estables.
13. Integrar apertura, cierre, cambio de escena y reapertura.
14. Verificar que camaras no entren en scene snapshots, autosave ni `.ttrpgscene`.
15. Ejecutar tests, typecheck, lint, build y smoke de dos ventanas.
16. Medir contadores/perfil Pixi durante drag y pan para confirmar ausencia de reconstrucciones nuevas.

## 9. Testing y verificacion

### Unit tests

- Normalizacion de comando/reporte.
- Equivalencia dentro/fuera de tolerancia.
- Estado sincronizado, pendiente, desincronizado y cerrado.
- Descarte de reportes/comandos obsoletos.
- Clamp y pasos de zoom.
- Reporte de confirmacion remota no produce desincronizacion falsa.

### Integration tests

- Main rechaza comando proveniente de Player View.
- Main rechaza reporte proveniente de DM.
- Main descarta payload invalido.
- Un comando se reenvia solo a Player View.
- Un reporte se reenvia solo a DM.
- Cierre limpia estado disponible.

### Verificacion de render/performance

- Instrumentar en desarrollo o espiar en tests que mover markers no llama metodos `draw*Layer`.
- Confirmar que el numero de hijos de `playerCameraControls` permanece constante durante 1 minuto de pan/zoom.
- Confirmar que no se crean multiples camaras virtuales.
- Confirmar que pan del jugador no dispara `publishPlayerScene`.
- Confirmar que un drag principal produce una sola orden al soltar.
- Confirmar que los reportes durante pan largo estan acotados por throttle y no acumulan Promises.
- Perfilar una escena pesada con fog, rios, fuego y tokens:
  - DM arrastrando marker;
  - jugador haciendo pan/zoom;
  - DM haciendo zoom remoto repetido.
- Observar memoria antes/despues de abrir/cerrar Player View varias veces y verificar limpieza de listeners/rAF.

### Comandos

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

### Smoke manual

1. Abrir una escena pesada y Player View.
2. Arrastrar camara principal y confirmar centro exacto del jugador.
3. Hacer pan local en jugador y verificar marker virtual en DM.
4. Hacer zoom local y verificar desincronizacion sin mover camara principal.
5. Recentrar y confirmar desaparicion del marker virtual.
6. Usar zoom remoto con zoom local bloqueado.
7. Cerrar/reabrir Player View y confirmar sincronizacion inicial.
8. Cargar otra escena con Player View abierta y comprobar reset seguro.
9. Verificar que Player View nunca muestra markers/controles DM.

## 10. Riesgos y mitigaciones

- **Riesgo:** loop comando -> confirmacion -> desincronizacion.
  **Mitigacion:** revision correlacionada, origen del reporte y `setCameraSnapshot` sin emision local.
- **Riesgo:** IPC flood durante pan/zoom.
  **Mitigacion:** coalescer con una operacion en vuelo, frecuencia maxima y reporte final.
- **Riesgo:** re-render completo de `App` por cada reporte.
  **Mitigacion:** refs + API imperativa Pixi; estado React solo en transiciones semanticas.
- **Riesgo:** recreacion de `PixiViewport` por callbacks nuevos.
  **Mitigacion:** `useCallback`, refs de handlers o actualizacion de opciones sin reinstanciar viewport.
- **Riesgo:** allocations/GC por markers.
  **Mitigacion:** dos containers persistentes y mutaciones in-place.
- **Riesgo:** costo existente de fog/oscuridad al mover Player View.
  **Mitigacion:** no agregar redraws; reutilizar RenderTexture y scheduler existentes, verificar con profiler.
- **Riesgo:** respuesta tardia de escena anterior.
  **Mitigacion:** revision de escena/camara y descarte de mensajes obsoletos.
- **Riesgo:** marker interfiere con herramientas DM.
  **Mitigacion:** hit test prioritario y drag dedicado; camara virtual sin eventos.
- **Riesgo:** diferencia de dimensiones entre viewports.
  **Mitigacion:** contrato limitado a centro+zoom, documentado en spec.

## 11. Criterios de aceptacion

- Spec 24 aceptada y plan tecnico documentado.
- Camara principal y virtual funcionan segun el spec sin persistencia de escena.
- DM controla centro y zoom de Player View sin cambiar su propia camara.
- Jugador conserva navegacion local y reporta desincronizacion.
- Recentrar elimina la camara virtual solo tras confirmacion valida.
- No hay controles de camara visibles en Player View.
- No existen loops ni mensajes fuera de orden aplicados.
- Mover markers no reconstruye capas PixiJS ni publica la escena.
- Reportes IPC estan coalescidos y sin cola creciente.
- Recursos visuales, listeners y schedulers se limpian al cerrar/destruir.
- Tests, typecheck, lint y build pasan.

## 12. Documentacion afectada

- `specs/24-player-camera-control/spec.md`.
- `specs/24-player-camera-control/plan.md`.
- `specs/15-player-window/spec.md`.
- `specs/15-player-window/plan.md`.
- Si cambia el contrato base de camara, revisar `specs/01-render-engine` y `specs/05-navigation-and-interaction`.

## 13. Checklist de cierre

- [x] Tipos y reglas puras de camara implementados.
- [x] IPC bidireccional especifico y validado.
- [x] Reportes Player -> DM coalescidos.
- [x] Markers Pixi persistentes y layer dedicado implementados.
- [x] Drag principal sin redraw de capas implementado.
- [x] Zoom remoto y recentrado implementados.
- [x] Integracion con apertura/cierre/cambio de escena implementada.
- [x] Spec/plan 15 actualizados.
- [x] Tests relevantes agregados o actualizados.
- [ ] Perfil de render/IPC ejecutado con una escena pesada; el smoke funcional se realizo sobre la escena vacia.
- [x] `pnpm test` ejecutado: 235 tests pasan.
- [x] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` global ejecutado; bloqueado por errores preexistentes en `index.js` generado y `MonsterLibraryModal.tsx`. Los archivos de esta feature pasan ESLint.
- [x] `pnpm build` ejecutado.
- [x] Smoke manual de dos ventanas realizado.
- [x] Sin cambios en `.ttrpgscene` ni persistencia.
- [x] Sin nuevas dependencias no justificadas.
