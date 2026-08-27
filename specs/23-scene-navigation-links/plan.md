# Plan - Conexiones y Navegacion entre Escenas

Este documento define el plan tecnico para crear marcadores privados que conecten de forma reciproca dos archivos `.ttrpgscene`, validar sus extremos y navegar entre escenas desde el mapa del DM.

## 1. Resumen

- **Spec fuente:** `./specs/23-scene-navigation-links/spec.md`
- **Objetivo:** Implementar marcadores persistentes de conexion entre escenas, escritura reciproca recuperable, validacion asincrona de enlaces y navegacion segura con centrado de Player View en el punto de entrada.
- **Estado:** Implementado; pendiente de smoke visual y aceptacion final.
- **Prioridad:** Alta.
- **Dependencias:** Specs 01, 03, 05, 06, 15, 18, 19 y 22; schema de escena V1; casos de uso de guardar/cargar; anotaciones DM; Player View y sincronizacion de camara.

## 2. Alcance

### Incluido

- Agregar marcadores `scene-link` privados del DM dentro de `mapAnnotations`.
- Crear, seleccionar, mover, bloquear, editar, desconectar y eliminar marcadores.
- Guardar marcadores inicialmente sin enlace.
- Exigir una ruta de archivo para la escena origen antes de configurar una conexion.
- Seleccionar otro `.ttrpgscene` mediante dialogo nativo.
- Leer del archivo candidato solo los marcadores de conexion validados.
- Elegir un marcador destino preexistente.
- Persistir una conexion reciproca con la misma identidad en ambos archivos.
- Reconfigurar y desconectar limpiando el extremo remoto cuando sea accesible.
- Validar enlaces de forma asincrona al cargar una escena.
- Revalidar inmediatamente antes de navegar.
- Mostrar estados neutral, validando, valido y roto solo en DM.
- Cargar la escena destino con el flujo existente y centrar Player View en el marcador de entrada.
- Integrar los marcadores en el sidebar derecho y en el arbol izquierdo de anotaciones.
- Mantener escenas antiguas compatibles mediante `sceneLinks: []` por defecto.
- Excluir marcadores, rutas y diagnosticos del snapshot de Player View.

### Fuera de alcance

- Crear automaticamente un marcador dentro del archivo destino.
- Mostrar marcadores o metadatos de conexion al jugador.
- Buscar archivos movidos o renombrados por todo el disco.
- Usar rutas relativas, ids globales de campana o un indice SQLite de escenas.
- Cargar o mostrar dos escenas simultaneamente.
- Previsualizar graficamente el mapa destino.
- Navegar por colision de tokens o entrada automatica a un area.
- Sincronizar archivos por red o nube.
- Prometer atomicidad transaccional real entre dos archivos independientes.

## 3. Decisiones tecnicas

- **Arquitectura:** Las reglas de identidad, reciprocidad y estado de enlace viven en `domain`. La orquestacion de lectura, conexion, desconexion, validacion y navegacion vive en `application`. El acceso a archivos y reemplazos temporales vive en `infrastructure`. Electron expone acciones especificas por IPC. React conserva solo estado visual y coordina los flujos. Pixi dibuja e interactua con marcadores ya resueltos.
- **Persistencia:** Extender `MapAnnotations` con `sceneLinks`. El campo es compatible hacia atras y usa una lista vacia por defecto, por lo que `SCENE_DOCUMENT_VERSION` permanece en `1`. Las referencias de archivo son rutas absolutas en esta primera version.
- **Estado derivado:** `validating`, `valid` y `broken` no se guardan en `.ttrpgscene`. Se mantienen en un mapa de estado de ejecucion indexado por id de marcador y se recalculan al cargar, reconfigurar o navegar.
- **Escritura reciproca:** Preparar y validar ambos documentos antes de escribir. Crear archivos temporales en el mismo directorio que cada escena y reemplazar los originales. Conservar los JSON originales durante la operacion para intentar restaurar el primer archivo si falla el segundo reemplazo. El resultado debe distinguir exito, fallo recuperado y posible inconsistencia que requiere revision.
- **Lectura externa:** El renderer no recibe la escena externa completa. Main devuelve un DTO reducido con ruta, marcador, nombre y estado util para la seleccion.
- **IPC / Electron:** Agregar canales dedicados para elegir archivo candidato, listar marcadores, conectar, desconectar, validar y cargar un destino validado. Todos los payloads se validan, el sender debe ser la ventana DM y no se expone `fs`, `path` ni un canal generico.
- **Navegacion:** Reutilizar `loadSceneUseCase` para obtener el documento, mapa y tokens. Extraer en `App.tsx` una unica rutina que aplique el resultado cargado tanto desde dialogo, recientes como desde una conexion.
- **Player View:** La escena cargada se publica con `createPlayerSceneSnapshot`. Para la navegacion se incrementa `cameraSyncKey` y se envia una camara cuyo centro sea la posicion del marcador destino; el DM conserva el comportamiento normal de camara de la escena cargada.
- **Render / PixiJS:** Reutilizar `mapAnnotations` como capa DM. El color final del marcador se obtiene del estado de validacion proporcionado por React. Player View recibe `sceneLinks: []` y ademas Pixi no renderiza anotaciones en rol jugador.
- **Validacion:** Zod valida documentos y modelos persistidos. Reglas puras validan coincidencia de `connectionId`, ids de extremos, rutas, roles y referencia inversa.
- **Rendimiento:** La validacion inicial no bloquea el primer render, deduplica rutas destino y limita lecturas concurrentes. Los resultados obsoletos se descartan con un id de solicitud.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

### Entidades y tipos

Crear `src/domain/annotations/scene-navigation-links.ts` con tipos equivalentes a:

```ts
export type SceneLinkRole = "origin" | "destination";

export interface SceneLinkEndpointReference {
  readonly scenePath: string;
  readonly markerId: string;
}

export interface MapSceneLinkMarker {
  readonly id: string;
  readonly kind: "scene-link";
  readonly position: WorldPoint;
  readonly name: string;
  readonly locked: boolean;
  readonly connection: {
    readonly connectionId: string;
    readonly role: SceneLinkRole;
    readonly origin: SceneLinkEndpointReference;
    readonly destination: SceneLinkEndpointReference;
    readonly peer: SceneLinkEndpointReference;
  } | null;
}

export type SceneLinkValidationStatus =
  | { readonly state: "unlinked" }
  | { readonly state: "validating" }
  | { readonly state: "valid" }
  | {
      readonly state: "broken";
      readonly reason: SceneLinkBrokenReason;
      readonly message: string;
    };
```

Extender `MapAnnotations`:

```ts
export interface MapAnnotations {
  readonly pins: readonly MapInformationPin[];
  readonly areas: readonly MapInformationArea[];
  readonly sceneLinks: readonly MapSceneLinkMarker[];
}
```

Definir DTOs compartidos y acotados:

- `SceneLinkCandidateFile` con ruta y marcadores elegibles.
- `SceneLinkCandidateMarker` con `id`, `name`, `position` y disponibilidad.
- `ConnectSceneLinkRequest` con ruta origen, marcador origen, ruta destino y marcador destino.
- `DisconnectSceneLinkRequest` con ruta actual e id de marcador.
- `ValidateSceneLinksRequest` y resultado por marcador.
- `LoadSceneLinkTargetRequest` y respuesta con `SceneOperationResult` mas punto de entrada.

### Reglas puras

- `createDefaultMapAnnotations()` incluye `sceneLinks: []`.
- `createSceneLinkConnection(...)` genera una identidad estable y los dos extremos reciprocos.
- `getSceneLinkPeer(marker)` obtiene el extremo opuesto segun el rol local.
- `validateSceneLinkPair(local, remote, localPath, remotePath)` comprueba:
  - ids no vacios y diferentes;
  - `connectionId` identico;
  - roles complementarios;
  - origen y destino identicos en ambos extremos;
  - referencia `peer` inversa exacta;
  - ruta e id locales coherentes con el archivo que contiene cada extremo.
- `replaceSceneLinkMarker(annotations, marker)` reemplaza por id sin alterar otras anotaciones.
- `disconnectSceneLinkMarker(marker)` conserva el punto y lo deja sin enlace.
- `getSceneLinkDisplayStatus(marker, validation)` mantiene neutral un marcador sin enlazar y rojo solo un enlace roto.
- `stripPrivateMapAnnotationsForPlayer(scene)` vacia pines, areas y `sceneLinks`.
- `searchMapAnnotations()` incorpora nombre y termino de conexiones sin filtrar rutas completas en UI.

### Invariantes y errores

- Id de marcador unico dentro de todos los objetos de escena.
- Nombre de 1 a 120 caracteres.
- Coordenadas finitas.
- `connectionId`, rutas e ids de extremos no vacios para una conexion persistida.
- Un marcador no puede conectarse consigo mismo ni con otro marcador del mismo archivo en esta version.
- El destino debe existir, ser `scene-link` y no estar conectado de forma incompatible.
- Un marcador bloqueado no se mueve, desconecta ni elimina.
- Una ruta o marcador ausente produce estado `broken`; no invalida la carga del resto de la escena.
- Fallos de lectura, parse o validacion no escriben ningun archivo.
- Fallos de escritura devuelven mensajes serializables y nunca reportan la conexion como valida.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/annotations/scene-navigation-links.ts` y tests unitarios.
- Extender `src/domain/annotations/map-annotations.ts` con `sceneLinks`, busqueda, centro, transformacion, bloqueo y privacidad.
- Extender `SceneDocumentV1` indirectamente mediante `MapAnnotations`.
- Actualizar `src/domain/sessions/default-scene.ts`.
- Actualizar `src/domain/sessions/scene-schema.ts` con schema Zod y default compatible.
- Actualizar `src/domain/sessions/scene-content.ts` para considerar marcadores como contenido.
- Actualizar tests de schema, contenido y snapshot publico.
- Extender `InteractionTool` con `scene-link`.

### `application`

- Extender `SceneFileStorage` con operaciones sin dialogo y de escritura controlada:
  - seleccionar ruta `.ttrpgscene` candidata;
  - leer JSON por ruta;
  - escribir/reemplazar JSON en una ruta concreta mediante una operacion recuperable.
- Crear `src/application/use-cases/scene-navigation-links.ts` con casos de uso para:
  - listar marcadores candidatos;
  - conectar dos marcadores;
  - desconectar o reconfigurar una conexion;
  - validar enlaces de la escena activa;
  - revalidar y cargar el destino.
- Reutilizar `parseSceneJson`, `serializeSceneDocument` y `loadSceneUseCase`; no duplicar carga de assets.
- Hacer que conectar/desconectar retorne el `MapAnnotations` actualizado de la escena actual para sincronizar inmediatamente memoria y archivo.
- Deduplicar archivos durante validacion y limitar concurrencia para no bloquear el renderer.

### `infrastructure`

- Extender `ElectronSceneFileStorage` con un dialogo de seleccion especifico para conexiones que no cambia la escena activa.
- Implementar lectura por ruta sin resolver mapa o tokens para la pantalla de candidatos.
- Implementar escritura segura por ruta:
  - serializar antes de tocar archivos;
  - crear temporales junto a los originales;
  - validar el contenido temporal;
  - reemplazar ambos archivos;
  - limpiar temporales;
  - intentar restaurar originales ante fallo parcial.
- No usar SQLite para conexiones.
- Normalizar rutas solo para comparacion; persistir la ruta absoluta seleccionada.

### `main`

- Crear `src/main/ipc/scene-navigation-links-ipc.ts`.
- Registrar handlers especificos, por ejemplo:
  - `scene-link:select-target-file`;
  - `scene-link:list-candidates`;
  - `scene-link:connect`;
  - `scene-link:disconnect`;
  - `scene-link:validate`;
  - `scene-link:load-target`.
- Validar payloads y restringir los handlers a la ventana DM.
- Reutilizar el registro de escenas recientes al navegar exitosamente.
- Registrar el nuevo IPC desde `src/main/index.ts` usando la misma instancia de `ElectronSceneFileStorage`.
- No incluir documentos externos completos en respuestas de listado o validacion.

### `preload`

- Agregar funciones concretas para cada accion de conexion en `src/preload/index.ts`.
- Agregar firmas y resultados discriminados en `src/preload/ttrpg-api.d.ts`.
- Compartir DTOs seguros desde dominio/application sin importar Electron en renderer.
- Mantener `contextIsolation`, sandbox y ausencia de APIs genericas.

### `renderer`

- En `App.tsx`:
  - agregar contador de ids `scene-link-*` y sincronizarlo al cargar;
  - agregar modo de colocacion y draft de marcador;
  - incluir marcadores en seleccion, movimiento, borrado, conteos y limpieza de nueva escena;
  - exigir guardado inicial antes de abrir la configuracion;
  - administrar estados de validacion por id sin persistirlos;
  - lanzar validacion asincrona despues de cada carga;
  - ignorar resultados de validaciones de escenas ya reemplazadas;
  - revalidar al doble click antes de navegar;
  - reutilizar el guard de cambios sin guardar;
  - extraer una funcion comun para aplicar `SceneOperationResult` desde dialogo, recientes y navegacion;
  - publicar la nueva escena a Player View y forzar el centro de entrada mediante `cameraSyncKey`;
  - limpiar modal, seleccion, drafts y validaciones al cambiar de escena.
- Crear `SceneLinkModal.tsx` para nombre, archivo, listado de marcadores, estado de carga, errores, conectar, reconfigurar y desconectar.
- Extender `MapAnnotationsSection.tsx` con la accion `Conexion de escena`.
- Extender el submenu contextual `Anotaciones` con `Link a otro mapa`, reutilizando el mismo handler de activacion de `scene-link` del sidebar.
- Extender `MapAnnotationsTree.tsx` con rama `Conexiones`, estado visual, `Ir a`, editar y bloquear.
- Extender `DmAsidePanel` y el accordion contextual de propiedades con nombre, archivo destino, marcador destino, estado y diagnostico.
- Mostrar confirmacion antes de borrar un marcador conectado; ejecutar desconexion reciproca antes de eliminarlo localmente.
- Mantener accesibles los errores y estados de carga sin tapar el mapa.

### `render`

- Extender `MapViewportProps` con modo de creacion, estados de validacion y callbacks de place/preview/double click.
- Extender `PixiViewport` para:
  - dibujar `sceneLinks` en `mapAnnotations` solo en DM;
  - usar un icono estable y un hit target independiente del zoom;
  - diferenciar sin enlazar, validando, valido y roto;
  - mostrar rojo solo para enlaces rotos;
  - mantener el nombre legible con escala inversa de camara;
  - integrar seleccion, drag, lock, Delete/Backspace y doble click;
  - evitar hit testing y render en Player View;
  - redibujar solo la capa de anotaciones cuando cambia una validacion.
- El doble click emite el id; React decide configurar o navegar tras validar.
- No cargar archivos ni ejecutar IPC desde Pixi.

## 6. Plan de trabajo

1. Crear tipos, estados, razones de error y DTOs de conexiones.
2. Implementar reglas puras de creacion, reciprocidad, desconexion y validacion de pares.
3. Extender `MapAnnotations`, defaults, busqueda, transformacion, privacidad y contenido de escena.
4. Extender el schema Zod y agregar pruebas de compatibilidad con escenas anteriores.
5. Agregar tests de round-trip para marcador sin enlace y conexion reciproca.
6. Ampliar el puerto `SceneFileStorage` con lectura/escritura por ruta y selector candidato.
7. Implementar reemplazo temporal recuperable de dos archivos y sus tests en directorios temporales.
8. Crear casos de uso para listar candidatos, conectar, desconectar, validar y cargar destino.
9. Probar casos de uso con archivos validos, destino ausente, marcador ausente, reciprocidad invalida y fallo parcial simulado.
10. Crear y registrar handlers IPC con validacion de sender y payload.
11. Exponer la API tipada en preload.
12. Extender herramienta, estado y callbacks de `MapViewport`/`PixiViewport`.
13. Renderizar marcadores DM y sus cuatro estados sin afectar Player View.
14. Integrar seleccion, movimiento, bloqueo, borrado y doble click.
15. Crear el modal para elegir archivo y marcador destino sin cargar la escena externa.
16. Integrar la herramienta en sidebar derecho, arbol izquierdo y panel contextual.
17. Implementar el guard de escena origen guardada y sincronizar el resultado de escritura en React.
18. Lanzar validacion asincrona no bloqueante al cargar y descartar respuestas obsoletas.
19. Extraer y reutilizar la aplicacion comun de escenas cargadas.
20. Implementar navegacion revalidada, registro en recientes y retorno reciproco.
21. Publicar Player View sin anotaciones privadas y centrarla en el marcador destino con una nueva `cameraSyncKey`.
22. Verificar reconfiguracion, desconexion y borrado con limpieza remota y advertencias recuperables.
23. Ejecutar tests, typecheck, lint y build.
24. Realizar smoke manual con dos escenas y Player View.
25. Al aceptar y cerrar la feature, incrementar version minor y actualizar `CHANGELOG.md` conforme a `AGENTS.md`.

## 7. Testing y verificacion

### Unit tests

- Crear una conexion produce extremos con igual `connectionId`, roles complementarios y referencias inversas.
- Validar un par correcto devuelve `valid` desde ambos extremos.
- Detectar archivo ausente, marcador ausente, id de conexion distinto, rol incorrecto y referencia inversa invalida.
- Desconectar conserva id, nombre, posicion y bloqueo, pero elimina la conexion.
- Buscar anotaciones encuentra conexiones por nombre sin depender de la ruta.
- `stripPrivateMapAnnotationsForPlayer` elimina tambien `sceneLinks`.
- Escena nueva incluye `sceneLinks: []`.
- Escena antigua sin `sceneLinks` carga con lista vacia y queda marcada para re-guardado.

### Integration tests

- Listar candidatos lee solo marcadores del archivo seleccionado.
- Conectar actualiza ambos archivos con una relacion reciproca.
- Reconfigurar limpia el par anterior antes de crear el nuevo.
- Desconectar limpia ambos extremos cuando son accesibles.
- Un fallo previo a escritura no modifica archivos.
- Un fallo durante el segundo reemplazo intenta restaurar el primero y reporta el resultado real.
- Validar varias conexiones deduplica lecturas de la misma escena.
- Cargar destino revalida y devuelve escena, assets y punto de entrada.
- IPC rechaza payloads invalidos y llamadas que no provienen de DM.

### Verificacion estatica

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

### Smoke manual

1. Crear y guardar escenas A y B con un marcador sin enlazar en cada una.
2. Desde A, elegir B y su marcador sin cambiar la escena visible.
3. Confirmar y revisar que ambos archivos contengan extremos reciprocos.
4. Cargar A y comprobar estado valido sin bloqueo inicial del mapa.
5. Abrir Player View y verificar que no reciba marcadores ni rutas.
6. Hacer doble click en A, cargar B y comprobar que Player View se centra en el marcador B.
7. Hacer doble click en B para regresar a A.
8. Mover o renombrar un marcador y comprobar que la conexion siga valida por id.
9. Mover/eliminar el archivo B y comprobar marcador rojo, diagnostico y ausencia de navegacion.
10. Restaurar o reconfigurar B y comprobar recuperacion del estado valido.
11. Eliminar el marcador remoto y comprobar deteccion de punto inexistente.
12. Probar guardar, descartar y cancelar cambios pendientes antes de navegar.

## 8. Riesgos y mitigaciones

- **Riesgo:** una escritura de dos archivos queda a medias.
  **Mitigacion:** validar primero, usar temporales, conservar originales, intentar rollback y nunca devolver exito ante incertidumbre.
- **Riesgo:** una escritura externa queda sobrescrita luego por el estado React anterior.
  **Mitigacion:** retornar y aplicar inmediatamente `mapAnnotations` de la escena actual despues de conectar o desconectar.
- **Riesgo:** resultados asincronos de validacion colorean una escena ya reemplazada.
  **Mitigacion:** asociar cada solicitud con ruta y generacion de carga; ignorar respuestas obsoletas.
- **Riesgo:** rutas privadas llegan a Player View.
  **Mitigacion:** filtrado de snapshot en dominio, render defensivo por rol y test del payload publico.
- **Riesgo:** validar muchas conexiones ralentiza la carga.
  **Mitigacion:** render inmediato, deduplicacion por ruta, limite de concurrencia y cache solo durante una pasada.
- **Riesgo:** mover o renombrar archivos rompe rutas absolutas.
  **Mitigacion:** estado rojo, mensaje accionable y reconfiguracion manual, segun la decision aceptada.
- **Riesgo:** el archivo externo cambia entre seleccion y confirmacion.
  **Mitigacion:** releer y revalidar ambos documentos inmediatamente antes de escribir.
- **Riesgo:** doble click navega con datos ya obsoletos.
  **Mitigacion:** revalidar en main antes de ejecutar `loadSceneUseCase`.

## 9. Criterios de aceptacion

- Se pueden crear y persistir marcadores sin enlace.
- El selector externo no reemplaza la escena activa ni carga sus assets.
- Solo se muestran marcadores destino preexistentes y validos.
- La conexion queda reciproca y coherente en ambos archivos.
- Reconfigurar, desconectar y borrar intentan limpiar ambos extremos.
- La validacion al cargar no bloquea el mapa.
- Un enlace roto se ve rojo y explica la causa solo en DM.
- Doble click revalida antes de navegar.
- Una conexion rota no reemplaza la escena actual.
- Una conexion valida carga el destino y permite el regreso.
- Player View recibe la nueva escena y se centra en el punto de entrada.
- Player View nunca recibe marcadores, nombres, rutas o errores de conexion.
- Escenas antiguas siguen cargando con `sceneLinks: []`.
- No se rompen pines, areas, escenas recientes, guardado, carga, pan, zoom ni sincronizacion de Player View.
- Tests, typecheck, lint y build pasan.

## 10. Documentacion afectada

- `specs/23-scene-navigation-links/spec.md`.
- `specs/23-scene-navigation-links/plan.md`.
- `CHANGELOG.md` al cerrar la implementacion.
- `package.json` con bump minor al aceptar la feature terminada.
- Specs 03, 15, 18, 19 y 22 solo si durante la implementacion cambia un contrato compartido respecto a lo ya documentado.

## 11. Checklist de cierre

- [x] Tipos, reglas y schema de conexiones implementados.
- [x] Compatibilidad con escenas antiguas verificada.
- [x] Escritura reciproca recuperable implementada y testeada.
- [x] IPC y preload especificos y validados.
- [x] Herramienta, modal, arbol y propiedades DM implementados.
- [x] Acceso `Link a otro mapa` agregado al submenu contextual `Anotaciones` reutilizando el flujo existente.
- [x] Estados neutral, validando, valido y roto renderizados.
- [x] Validacion al cargar y antes de navegar implementada.
- [x] Navegacion reciproca y centrado de Player View verificados por tests automatizados.
- [x] Privacidad de Player View verificada por test.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm test` ejecutado: 225 tests aprobados.
- [x] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` global: bloqueado por errores preexistentes en `index.js` y `MonsterLibraryModal.tsx`; los archivos de esta feature pasan ESLint.
- [x] `pnpm build` ejecutado.
- [ ] Smoke manual DM + Player View completado.
- [x] Version minor y `CHANGELOG.md` actualizados al cerrar la feature.
- [x] Sin acceso directo del renderer a filesystem, Electron internals o SQLite.
- [x] Sin dependencias nuevas.
