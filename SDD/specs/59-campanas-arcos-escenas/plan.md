# Plan — 59 Campañas, arcos y escenas

**Delta vigente 0.6 (2026-11-15):** [listados y acciones de preparación](#listados-y-acciones-de-preparación-06--ca-2427), T-11 backend y T-12 frontend definidos para PM. Q-0010 resuelta con «Sí, crear la rama y continuar»; rama `feature/preparacion-npcs-monstruos` preparada desde el HEAD inspeccionado. T-11 y T-12 implementadas y validadas en copia aislada, versión 3.30.0; `test:owned` completo superado (82/82 en ocho archivos). La incorporación al checkout y servicio local fue autorizada y completada en T-13; SQLite11 y health3.30.0 verificados. Sin merge. El cierre 0.5 siguiente conserva su evidencia histórica.

**Vigencia del delta 0.5 (2026-11-14):** [corrección de navegación](#corrección-de-navegación-05--ca-1923) y T-10 implementadas y validadas localmente en 3.29.1 según evidencia final PM; sin integración. [Cierre local](#cierre-local-del-delta-05). Los encabezados y cierres siguientes conservan el corte histórico 0.2–0.4.

**Spec fuente:** [spec.md](spec.md), revisión 0.4, 2026-11-14. T-09 delimita el ajuste vigente, implementado, revisado y validado localmente en 3.28.2 según QA final de PM; los cortes 0.2/0.3 conservan su evidencia histórica. Sin integración. **Estado:** base 0.2 ejecutada en la implementación local 3.28.0 y validada; delta 0.3 implementado, revisado y validado localmente en T-08, producto 3.28.1; CA-13–15 comprobados según QA final de PM. Sin integración. Los gates históricos corresponden al corte de [validación](validacion.md). El alcance fue aceptado mediante `$build spec 59` y conserva D-01–06. Los apartados de base inspeccionada documentan la fase previa de planificación. PM recibió permiso expreso Q-0007 y preparó `feature/spec-59-campanas-arcos-escenas` desde la base inspeccionada; sin permiso de add/commit/push/merge. **Dependencias:** SDD 16, 18, 29, 41–51, 54 y 58. [Tareas y dependencias](tareas.md).

## Base inspeccionada

- Inspección documental y de código: 2026-11-13; rama inspeccionada `feature/agente-backend`, SHA `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`; producto 3.27.2. No se cambió rama ni historial.
- Reinspección Build del 2026-11-13: contratos, migraciones, `OwnedSceneService`, repositorios de recursos/sistemas/borradores, transferencia operativa, `ServiceApp`, `GameEditor`, cliente HTTP y formularios de entidades. Solo lectura de producto; no se ejecutaron builds, servicios ni migraciones.
- Rama de ejecución comunicada por PM tras Q-0007: `feature/spec-59-campanas-arcos-escenas`, misma base SHA; autoriza iniciar producto conforme Build.
- Cambios locales conservados: `.gitignore`, AGENTS, índice/flujo/plantillas SDD; `.agents/`, `.codex/`, guías UX y carpeta 59 sin seguimiento. SHA fuente actual al cierre en tareas.md; PM puede actualizar estado de spec sin cambiar revisión funcional.
- Lectura base: AGENTS, README/estado/arquitectura/flujo SDD, contextos backend/frontend, plantillas, spec 59 completa y contratos relacionados de multimapa, propiedad/sistemas, invitación, moderación y borradores. No se hereda evidencia histórica como prueba del cambio.
- Huella de la spec revisión 0.2: se registra junto con el corte final de fuentes en [evidencia.json](evidencia.json). Los cambios de estado y evidencia no alteran D-01–06 ni la revisión funcional.

### Recorridos observados y diferencias

| Recorrido actual | Código/símbolo contrastado | Consecuencia para el plan |
| --- | --- | --- |
| `/partidas` → catálogo → `/partidas/:id` → iniciar/continuar → editor | `src/web/ServiceApp.tsx`, `GameCatalog.tsx`, `GameEditor.tsx`: `GameEditor`, `LiveEditor` | Actualmente `App` solo se monta con apertura. Propuesta comunicada al PM: llevar escena seleccionada hasta el gate explícito iniciar/continuar; navegar nunca abre una mesa. No prometer edición sin apertura. |
| Apertura/contexto → cliente de escena → recursos privados | `src/infrastructure/browser/browser-client.ts`: `createBrowserClient`, `openSaved`, `latestSavedScene`; `src/server/owned-scene-service.ts`: `OwnedSceneService` | Cargar ID elegido debe prevalecer sobre selección automática de última escena, conservando elección/recuperación del trabajo pendiente de SDD 58. |
| Cuenta → HTTP owned → unidad de trabajo → repositorios → DB | `src/server/owned-http.ts`, `src/application/services/owned-store.ts`: `OwnedTransaction`; `src/infrastructure/server/owned/repository.ts`: `ownedRepositories` | Añadir jerarquía dentro de autoridad del propietario, con revisión e idempotencia existentes. |
| Partida → recursos/sistema retenido → apertura/invitación → publicación | `src/infrastructure/server/owned/system-repository.ts`: `systemRepositories`; `src/application/services/game-runtime.ts`: `GameRuntime`; `src/server/moderation-http.ts` | Mantener `gameId`, apertura y generación. `game_resources` admite el mismo recurso en distintas partidas. Jerarquía de navegación no justifica exclusividad ni copia. |
| Archivar partida → invalidar apertura | `src/application/services/owned-games.ts`: `ownedGames.update` | D-05 confirma cierre explícito previo y solo consulta en inactiva; requiere condición transaccional y bloqueo de escrituras, no basta renombrar «archivar». |
| NPC/monstruo → `SceneAside` → guardado y proyección | `src/domain/sessions/scene-aside.ts`, `scene-document.ts`, `scene-schema.ts`; `src/renderer/src/App.tsx`, `components/aside/DmAsidePanel.tsx` | Hoy las fichas pertenecen a escena. Hay que separar preparación del arco de copias/estado por escena sin mover notas/PJs ni propagar estado táctico. |
| Respaldo → IndexedDB/DB → recuperación | `src/web/DraftRecovery.tsx`, `src/application/services/draft-coordinator.ts`, `src/infrastructure/browser/drafts/indexeddb-store.ts` | Preservar claves origen/cuenta/gameId/sceneId y operaciones pendientes. Un arco reciente no es un borrador ni un permiso. |

El código contiene migración **8** de borradores aunque el resumen de arquitectura enumera hasta 7. La siguiente migración se determinará desde el historial vigente al implementar, sin editar ninguna aplicada.

## Decisiones por capa

D-01–06 están confirmadas en la revisión 0.2, cuyo alcance ya aceptó Build. Las decisiones internas siguientes delimitan implementación y se devuelven al PM; no sustituyen el permiso Git ni el despacho.

| Capa | Cambio previsto | Archivos / puertos |
| --- | --- | --- |
| Dominio/aplicación | Metadatos de campaña/arco, asociaciones de escena y portada; reglas puras de reciente y separación ficha/copia. Casos de uso con puertos pequeños de jerarquía y preparación. | Nuevos `src/domain/campaigns/`, `src/application/services/campaigns.ts`; reutilizar `GameMetadata`, `ResourceBindings`, `OwnedTransaction` y parseo de escena. |
| Contratos | DTOs Zod paginados, revisiones, errores, operación idempotente y contexto elegido; política de compatibilidad. | Nuevo `src/shared/contracts/campaigns.ts`; ampliación mínima de `src/shared/api/client.ts` solo para capacidades de preparación que consuma editor. |
| Infraestructura/API | Extensión privada de partida 1:1 como campaña conforme D-04; arcos/asociaciones/portadas/preparación en tablas nuevas y repositorio transaccional. | `database/migrations.ts`, nuevo `owned/campaign-repository.ts`, `owned/repository.ts`, `server/owned-http.ts`, nuevo `server/campaign-http.ts`. |
| Clientes | Cliente administrativo HTTP separado del adaptador del editor; panel en `src/web`, integración mínima al editor, registro reciente IndexedDB separado. | Nuevo `infrastructure/browser/campaign-client.ts`, `src/web/campaigns/`; `ServiceApp`, `GameEditor`, `DraftRecovery`, `browser-client`, aside existente. |
| Render | Ningún motor nuevo ni mini-canvas por tarjeta: imágenes estáticas autorizadas y carga acotada. | Reutilizar `MapViewport`/`PixiViewport` sin cambios planificados; validación real del montaje/desmontaje. |

No introducir dependencias ni sustituir Node HTTP/SSE, Zod, React, Pixi o los drivers actuales. Diseñar primero contratos; evitar imponer métodos obligatorios sin adaptador disponible durante la transición.

## Núcleo compartido y adaptadores

El núcleo común sigue siendo `SceneDocument` v2, parseo/serialización v1→v2, reglas de entidades/mapas y casos de uso de carga/guardado. Las reglas nuevas de snapshot portable deben ser puras y utilizables por API y cliente; autorización y transacción siguen en extremos.

Navegador y Electron servicio comparten panel React y cliente HTTP. API compone casos de jerarquía con puertos sobre la unidad de trabajo y repositorios SQLite/PostgreSQL; Kysely sigue limitado al uso actual de identidad. Electron autónomo conserva API tipada preload, `src/main/ipc/scene-ipc.ts` y `src/infrastructure/file-system/electron-scene-file-storage.ts`; no recibe un repositorio remoto ni una jerarquía local por inferencia. Los dos modos comparten contrato de escena/capacidades, no una implementación de persistencia ya unificada. D-06 excluye jerarquía autónoma de esta entrega; se conserva su comportamiento y se valida su regresión.

Las capacidades describen disponibilidad; no autorizan. Una capacidad opcional de preparación de arco no debe deshabilitar bibliotecas/edición local existentes. Frente a servidor sin jerarquía, detectar falta una sola vez y conservar recorrido previo de partidas sin fabricar campañas locales; formalizar negociación y errores en T-01.

## Contrato técnico acordado para T-01

Acuerdo PM `/root`, 2026-11-13, consulta TL-59-02: la escena compartida sigue siendo única y no puede mutarse si cualquiera de sus campañas está inactiva; snapshots v2 sin refresco automático; paquete operativo v4 con lector v1–v3. Son concreciones de D-03/04/05/CA-09/11, no nuevos requisitos de producto. El resto de elecciones de estructura/nombres es interno y reversible antes de congelar T-01.

| Contrato | Campos/regla para implementación |
| --- | --- |
| `CampaignDto` | `id` = UUID `gameId`; `name`, `description` (texto ≤4000), `coverAssetId: UUID|null`, `state: active|inactive`, `systemRef`, `revision`, `createdAt`, `updatedAt`. Nombre reutiliza `gameNameSchema` (1–200). Estado traduce ready/archived, no almacena una segunda fuente. Revisión es la de `ttrpg_games`, también incrementa al cambiar descripción/portada. Sistema inmutable tras crear. |
| `ArcDto` | UUID `id`, `campaignId`, nombre 1–200, descripción ≤4000, `coverAssetId`, `revision`, fechas y `sceneCount` calculado. No contiene mapa. |
| `ArcSceneDto` | `sceneId`, `arcId`, `campaignId`, nombre/revisión del recurso, `coverRevision`, `customCoverAssetId`, referencia de portada calculada y `writeBlock` autorizado. Lista no entrega el documento completo. Portada propia global del recurso; una misma escena conserva portada propia al verse desde varios arcos. |
| `PreparedEntityDto` | UUID `id`, `arcId`, discriminante `monster|npc`, `name`, `imagePath`, `notes`; monstruo añade `templateId` y binding exacto, `revision`, fechas y procedencia opcional `{sceneId,kind,entityId}`. No contiene visibilidad, HP de combate, tokens ni estado de apertura. Lista paginada completa por arco, sin asignación de subconjuntos. |
| `CampaignSelection` | `{campaignId,arcId,sceneId}` validado en servidor y retenido por navegación. No es credencial ni apertura. Se pasa a GameEditor y createBrowserClient; el gate actual sigue usando gameId. |
| Puertos | `CampaignRepository` y `ArcPreparationRepository` nuevos, ligados a la misma transacción de `OwnedTransaction`. Métodos específicos list/get/create/update/setState/createArc/updateArc/listScenes/createScene/attachScene/updateSceneCover y list/get/create/updatePreparation; no SQL en dominio. Crear escena + asociación es una operación atómica. No DELETE de campañas/arcos/preparación nuevo en esta entrega. |
| Preparación del cliente | Miembro opcional tipado `TtrpgClient.arcPreparation` con contexto, listado, resolución de ficha/binding y conversión de snapshot. Su ausencia conserva capacidades locales existentes. HTTP vive en adaptador; ni DTOs ni núcleo importan React/Node. Contrato compartido estable antes de T-04/T-05. |

Operaciones HTTP privadas nuevas bajo `/api/v1/dm/campaigns`: GET/POST colección; GET/PATCH `/:campaignId`; GET/POST `/:campaignId/arcs`; GET/PATCH `/:campaignId/arcs/:arcId`; GET/POST `.../:arcId/scenes`; POST `.../:arcId/scenes/:sceneId` para asociar existente compatible; PATCH `.../:arcId/scenes/:sceneId/cover`; GET/POST `.../:arcId/preparation`; GET/PATCH `.../:arcId/preparation/:preparedId`. POST de escena acepta `{name,scene,bindings}` y la asocia al arco en la misma transacción. Asociar no clona. Retirar imagen propia usa `null`. `GET /dm/campaign-capabilities` devuelve versión 1; un 404 de capacidad permite usar el catálogo anterior una vez por sesión, no fabricar datos locales ni interpretar un 401 como falta de capacidad.

Todas las listas usan `limit` predeterminado 50/máximo 100, `offset`, `total`, orden estable por fecha/ID; búsquedas con texto ≤200. GET de detalle puede consultar inactiva. POST usa `Idempotency-Key`, PATCH además `If-Match`; creación revisión cero, actualización entera positiva. Igual clave/contexto/cuerpo devuelve el mismo resultado; distinto cuerpo conflicto. Owner proviene de sesión. Reutilizar errores 401/403/404/409/422 actuales; añadir 409 distinguibles `CAMPAIGN_INACTIVE`, `CAMPAIGN_OPEN`, `SCENE_SHARED_INACTIVE` con mensaje/IDs de resolución solamente del propietario. No convertir incapacidad de almacenar en éxito.

Rutas antiguas `/dm/games`, `/dm/scenes`, recursos/bibliotecas, apertura, links y confirmación de borradores deben pasar las mismas comprobaciones; no basta proteger rutas nuevas. Creaciones por API anterior reciben campaña/metadatos/arco inicial; asociaciones antiguas de escenas se reflejan en arco inicial si aún no existe asociación narrativa. Ediciones por API anterior actualizan la misma revisión de campaña. Un cliente antiguo puede seguir guardando recursos no bloqueados, sin recibir privilegio para editar inactiva. Cambiar campaña a inactiva exige `opening.state !== open` (incluida apertura con lease vencido aún no cerrada), con cierre explícito; no llamar a invalidación automática como sustituto.

### Ajuste de secuencia y consumo — consulta PM del 2026-11-13

Observado en la implementación de T-01/T-02: `CampaignRepository.createScene` recibe `{name,scene,bindings}` y crea/asocia en una transacción; `ArcSceneDto` incluye `mapCount`, `map0ImagePath` y `map0AssetId`. T-01 y T-06 completos según reporte PM; esta revisión no certifica sus pruebas ni cambia estados operativos.

**Crear escena es responsabilidad T-04**, en `src/web/campaigns/` y `src/infrastructure/browser/campaign-client.ts`. Reutilizar `createDefaultScene()` de `src/domain/sessions/default-scene.ts` y enviar `{name,scene:createDefaultScene(),bindings:{monsters:{}}}` al endpoint de creación del arco. La factory existente crea v2 con un «Mapa 1» sin imagen y sin entidades; «vacía» significa lienzo inicial, no documento con cero mapas. No inventar JSON, plantilla ni sistema `generic`; el binding vacío expresa que no hay monstruos. El servidor valida la campaña, su sistema exacto y disponibilidad al asociar y antes de commit: funciona para cualquier sistema permitido, pero debe rechazarse si ese sistema ya no admite nuevos recursos. Mantener defaults de mapa vigentes, sin inventar calibración ni parámetros de reglas por sistema. Crear la escena no inicia apertura, publica mesa ni monta editor; tras ACK enfocar la tarjeta creada según UI-003. Conservar nombre y clave idempotente ante fallo incierto. Validación: campaña de sistema no genérico, creación repetida con misma clave, rechazo en inactiva/sistema deshabilitado y ausencia de apertura nueva. T-02 mantiene endpoint/composición y contratos reales; T-04 implementa cliente/formulario. No trasladar esta función a T-05 por ausencia de mapa o sistema en el formulario.

**Detalle consultable:** `mapCount` sirve para la tarjeta, pero no satisface el listado textual de mapas acordado en UI-003. T-04 añade lectura bajo demanda mediante el GET privado existente `/dm/scenes/:sceneId`, desde el cliente HTTP y con contexto de asociación previamente obtenido para campaña/arco/escena. Extraer nombres e IDs en orden de `resource.scene.maps` y mostrarlos como texto, incluida escena sin imagen; renderizar nombres con escape React. Una sola lectura de cuerpo para la escena seleccionada, nunca una por tarjeta ni un canvas oculto. Invalidar/cancelar al cambiar cuenta/ruta y conservar error/reintento sin mostrar datos de la selección anterior. No confiar en path de frontend como autorización: GET valida dueño y el panel valida la asociación del contexto con la lista autorizada. No se requiere ampliar `ArcSceneDto` ni añadir endpoint/backend para esta entrega. Un futuro resumen de detalle más pequeño sería optimización separada, no bloqueo de T-04.

**Inicio de T-05:** basta T-01 estable y entrega explícita de los archivos frontend de T-04 aceptada por PM, aunque la integración backend de T-02 aún cierre pruebas. T-05 puede implementar selección exacta, gate, recuperación, retorno al arco, formularios de preparación y aside contra fixtures del contrato de preparación/reserva congelado. No debe editar concurrentemente panel/router/cliente/CSS de T-04. La API T-03 es dependencia de integración/cierre, no de inicio: no declarar CA-06 implementado/validado solo con mocks, no simular guardado remoto exitoso ni activar fallback privilegiado si falta endpoint. T-03 y T-05 pueden trabajar simultáneamente con propiedad disjunta; si aparece un cambio indispensable de DTO, PM secuencia actualización backend y adopción frontend antes de continuar el tramo afectado. Cierre de T-05 requiere T-02/T-03 reales, recorridos completos y preservación de los tres modos.

## Datos y operación

### Esquema aditivo y migración conservadora

Siguiente versión libre tras 8, a revalidar al implementar. T-02 añade migración 9 para campaña/arcos/asociaciones/portadas y su backfill; T-03 añade migración 10 para preparación, reservas de instancia y backfill de entidades. Numeración sujeta a historial vigente. Ninguna tarea modifica una migración aplicada por otra; los hooks de datos se versionan con algoritmo congelado. T-02 y el bloque de persistencia de T-03 son secuenciales y comparten propietario backend; el bloque de transferencia de T-03 puede tener un segundo implementador según las condiciones siguientes.

| Tabla nueva propuesta | Clave y relación |
| --- | --- |
| `campaign_details` | `(owner_id,game_id)`, FK compuesta a `ttrpg_games`; descripción/portada; revisión vive en partida. |
| `campaign_arcs` | `(owner_id,id)`, FK a campaña, revisión/fechas/portada; `initial_game_id` nullable UNIQUE para un único arco inicial por partida. |
| `arc_scenes` | `(owner_id,arc_id,scene_id)`, FK al arco y recurso de tipo scenes mediante columna `kind CHECK(kind='scenes')`; conserva N:M. Índice por propietario/scene_id. |
| `scene_covers` | `(owner_id,scene_id)`, FK a escena, asset nullable y revisión separada; no cambia cuerpo de escena. |
| `scene_preparation_instances` | `(owner_id,scene_id,prepared_id)`, clase/entity_id, snapshot y binding retenidos al primer uso; FK a recurso/preparación propios. No UNIQUE global por escena/clase/entity_id: admite alias históricos verificados según regla inferior. Una reserva no significa que el snapshot ya esté guardado en la escena. |
| `arc_preparations` | `(owner_id,id)`, FK arco, clase/body/binding, revisión/fechas y procedencia; unique de `(owner_id,arc_id,source_scene_id,kind,source_entity_id)` para legados. |

Assets conservan `owned_assets`; portada nueva solo admite UUID del dueño. Si la referencia después falla, devolverla como ausente sin borrarla ni sustituir por mapa 0. FKs compuestas y validación de repositorio impiden relaciones entre dueños. No FK de origen de preparación con borrado en cascada: la procedencia no hace que la copia dependa de la supervivencia de su escena fuente.

Backfill, dentro de la transacción de migración existente: (1) inventariar recursos/asociaciones/bindings y validar JSON antes de transformar; (2) crear extensión y arco inicial «Arco inicial» de cada partida, incluso archivada o borrada lógicamente, conservando visibilidad previa; IDs de partida no cambian, arco obtiene UUID persistido una sola vez; (3) copiar cada enlace de escena de `game_resources` a `arc_scenes`; conservar todos los enlaces antiguos; (4) en la migración posterior de T-03, por escena/arco, copiar cada NPC/monstruo a preparación independiente con procedencia y binding exactos; jamás fusionar por nombre; (5) verificar inventario y registrar versión/checksum al final. Paginación de lectura y JSON por escena, sin reunir assets o todos los documentos en memoria. Los hooks versionados nuevos `campaign-backfill.ts` y `arc-preparation-backfill.ts` usan el driver común y parser de escena puro; no depende de dialectos JSON SQL distintos. `verifySchema` debe reconocer y exigir las tablas nuevas.

| Fixture | Resultado obligatorio |
| --- | --- |
| Una escena en dos partidas | Mismo ID/body/revisión/bindings, dos asociaciones a sus arcos iniciales; preparación copiada por arco con procedencia explícita. |
| Dos entidades homónimas o mismo ID local en escenas distintas | Entradas diferentes por `(arc,scene,kind,entityId)`, sin fusión ni colisión táctica. |
| Escena sin partida, bibliotecas y assets | Intactos y accesibles por los flujos existentes; no crear campaña ni asignación automática. |
| Partida archivada/borrada lógicamente | Estado/borrado respetados; no reaparece en activas ni se abre mesa. |
| Borradores/operaciones/aperturas/invitaciones | IDs, bytes, contexto y referencias existentes sin reescritura; el contenido no se usa como escena canónica para backfill. |
| Error a mitad / repetir migración | Rollback completo en ambos motores; reejecución no duplica arcos ni fichas. Corrupción detiene migración con diagnóstico, no descarta filas. |

El backfill de entidades no modifica originales; las escenas existentes y sus referencias de combate conservan sus IDs exactos. Los contadores son consultas a asociaciones, nunca columnas editables. La migración no es ejecutable contra datos reales durante construcción. Preparar inventario sintético antes/después, backup integral/restauración aislada y fallo inyectado. Reversión operativa por copia íntegra validada, sin down-migration destructiva ni sobrescribir escrituras posteriores.

### Snapshots v2 y datos retenidos

La representación portable suficiente ya existe: `SceneNpc` contiene `id,name,imagePath,visibleToPlayer,notes`; `SceneMonster` añade `templateId`. `notes` guarda el Markdown completo, no solo variables dependientes de la plantilla. Tokens, combatTracker y mapas siguen en la escena. El CSS de plantilla y los bytes de imágenes nunca estuvieron embebidos en v2; se mantienen esa limitación y sus fallbacks/avisos, sin afirmar portabilidad idéntica de presentación. Ni campaignId, arcId, preparedId, cookies ni endpoints remotos se añaden como dependencia obligatoria al archivo.

Consulta del catálogo no modifica la escena. Al primer uso táctico de una ficha (visibilidad/colocación/incorporación) se materializa una copia completa con visibilidad inicialmente falsa, luego se aplica la acción solicitada; se respalda en SDD 58 como cualquier edición. Antes de materializar, `POST .../preparation/:preparedId/instance` con `{sceneId}` reserva o devuelve un `entityId` estable y snapshot/binding en `scene_preparation_instances`, idempotente y autorizado por arco/campaña/escena activa. No guarda ni publica escena. El UUID aleatorio se contrasta con IDs existentes/reservados de esa escena; si colisiona se genera otro dentro de la transacción. Backfill reserva los IDs históricos exactos para su escena de origen, sin renombrar referencias. La regla pura recibe la reserva y el documento: conserva la instancia si ese ID ya existe; de otro modo copia el snapshot. La reserva no reemplaza el documento, no modifica su revisión ni ocupa el lugar del borrador. Al guardar, validar las reservas/bindings involucradas; confirmar borrador/copia debe conservar las fichas propias aunque no tenga reserva (portabilidad/legado). Volver a pedir una reserva devuelve la misma identidad y snapshot retenido, incluso tras respuesta perdida; su cardinalidad máxima es una por escena y preparación, bajo límites de payload/cuotas existentes. Una ficha ya incorporada conserva su snapshot: cambiar preparación no propaga nombre/notes/imagen/estado sobre copias existentes. Todas las escenas siguen viendo el catálogo actualizado completo, distinguido de las instancias incorporadas.

Las fichas históricas que no tienen correspondencia en el arco actual permanecen visibles como contenido propio de la escena; no desaparecen al navegar a otro arco. La procedencia sirve para enlazar una copia existente, nunca para probar autorización. El catálogo no se introduce entero en `sceneAside` ni en el borrador; solo las fichas efectivamente usadas. El límite del documento/borrador sigue siendo el existente; si una incorporación lo supera se rechaza antes de reemplazar la última copia válida. Preparaciones también paginadas y payload sujeto al límite HTTP actual, sin aumentar cuotas por esta función.

El binding de monstruo se copia desde el registro preparado; conservar versión/hash exactos y definición retenida. Preparación histórica de una instancia deshabilitada puede consultarse/editarse conservando binding; un uso nuevo en otra escena exige disponibilidad vigente y sistema compatible. El backfill no cuenta como nueva selección de plantilla. Validar por servidor al guardar/materializar, no confiar en una capacidad o respuesta anterior. El archivo local sin catálogo conserva Markdown/imagen referenciada y fallback actual; no instala ni ejecuta plantillas remotas. No se cambia `SceneDocument` ni su serializador: pruebas roundtrip v1→v2 y v2, incluyendo NPC, monstruo, tokens y combatientes, deben demostrarlo.

### Identidad de reservas históricas compartidas

Corrección de precisión del plan, 2026-11-13: una escena compartida por dos campañas genera dos preparaciones, una por arco, con procedencia idéntica `(sceneId,kind,entityId)`. Ambas reservas deben referir el mismo ID táctico histórico sin clonar ni renombrar. Por tanto, la unicidad obligatoria de reserva es `(owner_id,scene_id,prepared_id)`; **no** imponer `UNIQUE(owner_id,scene_id,kind,entity_id)` sobre todas las reservas.

Se permite alias de `entity_id` entre reservas únicamente si ambas preparaciones tienen procedencia legada no nula, `provenance.sceneId` coincide con la escena reservada, clase e ID de procedencia coinciden con la reserva y entre sí, y los snapshots y bindings retenidos son semánticamente idénticos. Backfill crea esos alias en la misma transacción. La procedencia es inmutable; editar posteriormente una preparación no refresca sus reservas. Cada reserva mantiene el snapshot original, no se compara con el contenido actual ya editado de la preparación para autorizar un alias. Un alias contradictorio detiene migración/importación con diagnóstico y rollback; no se corrige cambiando IDs.

Las reservas nuevas generan ID contrastado contra entidades de la escena y todas las reservas de esa escena/clase; no pueden adoptar un ID ocupado por contenido coincidente ni por un nombre igual. El único alias permitido es el histórico demostrado arriba. La transacción serializada asegura comprobar e insertar sin carrera; añadir índice no único por propietario/escena/clase/entity_id para esa consulta. La inspección/importación v4 aplica la misma regla, incluida comprobación de owner, pertenencia y procedencia. Fixtures obligatorias: dos campañas compartiendo escena/entidad → dos reservas con ID original; snapshot o binding divergente → rechazo; dos usos nuevos concurrentes → identidades no colisionan; volver por otro arco → una única instancia táctica en documento.

### Paralelismo interno de T-03

T-03 permanece una sola tarea/entrega, con dos responsabilidades posibles que decide PM:

| Responsabilidad | Escritura exclusiva | Dependencia de inicio |
| --- | --- | --- |
| Persistencia/preparación | Migración 10, `arc-preparation-repository.ts`, `arc-preparation-backfill.ts`, `arc-preparation-http.ts`, montaje/puertos/guardas y `arc-preparation.contract.ts`; contratos compartidos solo por este propietario si hay cambio acordado. | Entrega T-02 y contrato T-01. |
| Transferencia operativa | Solo `src/infrastructure/server/owned/transfer.ts`, `transfer-catalog.ts`, `transfer.contract.ts`, `transfer-fixture.ts`. No migra/crea tablas ni modifica DTOs, puertos, tests de preparación o frontend. | T-01 v4 congelado y cesión explícita de esos cuatro archivos tras pruebas T-02 que los estén usando, o pruebas T-02 en una copia estable. |

El segundo implementador puede comenzar inmediatamente por manifest/streaming, discriminantes de registros, inspección de relaciones, reglas de alias, remapeo de owners/bindings privados, lectura v1–v3 y fixtures de paquetes. Ese trabajo depende del contrato de intercambio, no del esquema SQL físico. **Antes de escribir el acceso SQL y los fixtures que insertan filas de T-03**, el propietario de persistencia entrega a PM y al implementador de transferencia un corte explícito del DDL de migración 10 y de los codecs/backfill: nombres/columnas/tipos/nullabilidad/PK/FK/índices; formato JSON de body/snapshot/binding; campos de procedencia; firma del backfill reutilizable y momento permitido de invocación. El mapa mínimo es `PreparedEntityDto ↔ arc_preparations` y `ScenePreparationReservationDto ↔ scene_preparation_instances`; tabla de reservas permite los alias históricos anteriores. El DTO lógico de T-01 por sí solo no congela nombres o representación física. No duplicar DDL en transferencia ni inventar otra transformación legada para avanzar.

Contrato de integración: exportar registros de toda la jerarquía del dataset, incluyendo campañas borradas lógicamente, mediante datos persistidos y no repositorios UI que ocultan filas; los registros game conservan deletedAt/estado, campaña no duplica ni contradice esas fuentes. Importar primero catálogo/recursos/assets/partidas, después campaña/arcos, asociaciones/portadas, preparación y finalmente reservas; validar antes de commit. Importación v1–v3 invoca los backfills compartidos después de recursos/links; importación v4 preserva IDs explícitos y no genera arcos/preparaciones adicionales por backfill. Recalcular/validar sceneCount derivado, no tratarlo como contador editable. Bindings privados se remapean junto a owner en preparación y en ambos lugares del snapshot/reserva, preservando identidad de definición.

La barrera de cierre es conjunta: migración 10 y API integradas, codec SQL validado contra DDL real, roundtrip v4 con alias y casos negativos, importaciones v1–v3 y contratos SQLite/PostgreSQL TLS. Transferencia no se declara terminada con paquetes en memoria. T-05 puede consumir API/preparación sin esperar terminar CLI, pero T-03/T-07 no cierran sin ambos bloques. Con cuatro slots: PM + backend persistencia + backend transferencia + frontend T-05; TL entrega y libera slot. No ejecutar builds ni suites completas sobre archivos a medio editar: copia estable para gates T-02 y, después, una ejecución integrada serializada de build:api/test:owned; asignar DB temporales distintas o serializar fixtures/puertos. Cambios de contrato vuelven por PM, no por escrituras simultáneas.

### Transferencia operativa

Paquete nuevo **v4**, con lectura v1/v2/v3/v4; distinto de `.ttrpgscene` v2. Conserva catálogo/hash/bindings/assets del v3 y añade registros tipados de campaña, arco, relación, portada, preparación y reservas de instancia. Escritor v4 siempre; versiones anteriores no se reinterpretan ni alteran. Importar paquete antiguo crea arco inicial y preparación con el mismo algoritmo de backfill, en la transacción de importación después de cargar recursos/links. Importar v4 preserva IDs/relaciones/revisiones y aplica remapeo de dueño a todas las filas; inspección rechaza relaciones huérfanas, sistemas incompatibles, duplicados, hashes rotos y assets ajenos antes de commit. El lector viejo rechaza v4 explícitamente: nunca exportar v3 omitiendo jerarquía. Conservar límites de filas/bytes, streaming de registros y verificación de huella/recibo idempotente. No incluir cuentas, claves, aperturas, invitados ni borradores; mantener aviso existente sobre borradores excluidos. Sin nueva UI de exportación de campañas.

## Seguridad, concurrencia y ciclo de vida

- DM propietario autoriza campaña→arco→escena y portada en cada lectura/escritura; IDs, revisiones, texto e imágenes del cliente son no confiables. Otro DM obtiene ausencia compatible con el contrato actual; admin/invitado no heredan acceso. Validar pertenencia incluso si todos los UUID son válidos y revalidar identidad/sistema al commit y al entregar datos.
- Reutilizar cookies, Host/Origin/CSRF, límites de payload y validación/decodificación de imágenes. Miniaturas y rutas de portada son privadas; no añadirlas a SSE/proyección pública. No aceptar URLs externas arbitrarias, HTML ni ampliar CSP. Fichas privadas/notas y mapas inactivos quedan fuera del snapshot público.
- Crear/editar/asociar/estado usan revisión esperada y `OwnedTransaction.operation` en la misma transacción. Repetir petición exacta conserva ID; misma clave con otro cuerpo da conflicto. En COMMIT incierto mantener solicitud original y conciliar resultado; no inventar clave nueva ni publicar éxito anticipado. No aplicar efecto runtime antes del commit confirmado; reutilizar `beforeCommit`/`afterCommit` y su rama incierta.
- Estado inactivo/apertura vigente: comprobar autoridad, revisión y apertura dentro de la transacción, serializado con iniciar/reabrir. D-05 exige rechazar desactivación mientras exista apertura vigente y pedir cierre explícito; un heartbeat tardío no la reactiva. Campaña inactiva y sus hijos son solo consultables: bloquear crear/editar metadatos, arcos, escenas, mapas, portadas y preparación, así como guardado e iniciar/continuar juego; solo reactivar habilita de nuevo esas operaciones. Revalidar estado al commit, también para URL directa, pestaña antigua y petición en curso. Regla acordada PM: una escena vinculada a cualquier campaña inactiva bloquea todas sus mutaciones globales, también desde otra campaña activa, portada, confirmación de borrador, enlace recíproco o API legada; conserva consulta y ofrece reactivar el vínculo propio. No clonar ni desvincular silenciosamente. No sustituir esta regla por el `invalidate` automático actual.
- Carga de escena/portada por cuenta, campaña, arco, escena y generación de navegación; cancelar solicitudes al salir y descartar respuestas tardías. Cambiar cuenta no aplica un ACK pendiente de la anterior. La guarda de salida resuelve dirty/confirmación incierta antes de cambiar contexto; una escena elegida no borra respaldo de otra.
- Mantener un proceso API por DB, lease, cuotas/backpressure/heartbeats SSE existentes. El panel no crea streams adicionales ni mantiene uno por tarjeta. Al retirarse editor, limpiar listeners/timers y recursos propios sin destruir texturas compartidas; nada de canvas ocultos para recuperación/miniaturas.
- Electron servicio permanece sin preload privilegiado; autónomo mantiene sender/IPC específico, `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. No migrar credenciales ni perfil local para compartir código.

## Decisiones UI/UX y prototipos

Referencia: [UI-003, propuesta](../../guias/ui-ux/campanas-arcos-escenas.md), [UI-001/UI-002](../../guias/ui-ux/catalogo.md). Consulta **TL-59-02** a instancia `/root/ux_spec59`, continuación de **TL-59-01**, respondida por el perfil ui_ux, 2026-11-13. Sidebar contextual solo en panel, tarjetas con acción explícita separada de opciones, cabecera única y acceso estable a borradores. «Campaña activa» usa switch en ajustes; el filtro de listado no es switch. D-02 no incorpora selector de modos: imagen propia si existe, si no imagen del mapa 0, y placeholder si ninguno es utilizable. Una referencia elegida fallida conserva estado recuperable, sin sustituirla silenciosamente. Inactiva permite navegar y consultar, sin abrir editor de juego ni añadir visor de canvas; reactivación permanece disponible.

Concreción TL-59-02: tarjeta activa «Abrir editor de {escena}» mantiene selección hasta gate «Iniciar/Continuar partida»; inactiva «Ver detalles» sin canvas; preparación permanente en arco, secciones «Preparados en el arco» y «En esta escena» en aside. Escena compartida bloqueada explica el vínculo propio que debe reactivarse.

Validación propuesta: teclado/Escape, foco/restauración, nombres accesibles, zoom 200 %, ancho 390 px, estados vacío/cargando/error/imagen rota/sin acceso y regreso con borrador. No hace falta prototipo para revisar este borrador; un lab futuro solo si permanece incertidumbre concreta de navegación/preparación tras D-03, con pregunta/estados acordados con UX. HTML no certifica React, Electron ni GPU. Acuerdo TL/UX del 2026-11-13: no hay laboratorio obligatorio; validar producto real por cliente/rol. Recorte, placeholder y ubicación final se concretan con UX al implementar sin alterar D-01–06.

## Decisiones confirmadas y concreción técnica

Procedencia: respuestas del usuario del 2026-11-13 incorporadas por PM en spec 0.2. D-01–06 no son obstáculos de negocio pendientes; Build aceptó revisión 0.2. La interpretación de recursos compartidos, snapshots y paquete v4 fue confirmada por PM el 2026-11-13. Q-0007 resuelta por el usuario: «Sí, crear la rama y continuar»; PM preparó la rama de ejecución. No quedan preguntas de negocio abiertas para estas tareas.

| ID | Decisión confirmada | Tareas/criterios afectados |
| --- | --- | --- |
| D-01 | Solo portada de arco, sin mapa independiente. | T-01/02/04; CA-03/04 |
| D-02 | Imagen propia de escena si existe; en su ausencia mapa 0; placeholder si ninguno utilizable. Sin selector de modos. | T-01/02/04; CA-04 |
| D-03 | Catálogo completo de arco en todas las escenas; preparar/editar fuera, consultar/usar tácticamente en paneles existentes. | T-01/03/05; CA-05/06/09/11 |
| D-04 | Cada partida pasa a campaña con arco inicial; una mesa por campaña. Cambiar arco/escena conserva invitados y participación. | T-01/02/05; CA-08/09 |
| D-05 | Inactiva solo consulta de campaña e hijos, sin editar/guardar/jugar; reactivar permitido. Cierre explícito previo a desactivar. API aplica la misma restricción. | T-01/02/03/04/05; CA-02/05/06/08/12 |
| D-06 | Navegador y Electron conectado; autónomo conserva comportamiento sin jerarquía nueva. | T-01–07 y matriz |

T-01 implementa los contratos y ejemplos concretados arriba, sin ampliar el negocio. El momento de registrar reciente permanece supuesto reversible de entrada correcta al arco/escena, una vez por navegación y no por render. Si un detalle técnico obliga a alterar comportamiento confirmado o formato, elevar ese delta a PM antes de construirlo.

## Secuencia de implementación

T-01 fija contratos y compatibilidad; T-02 implementa jerarquía/transición; T-03 preparación y snapshots; T-04 panel administrativo, creación de escena vacía y detalle textual; T-05 entrada/salida del editor y preparación, con inicio tras cesión frontend T-04 y cierre dependiente de T-02/T-03; T-06 registro reciente; T-07 validación integrada. Detalle, propiedad y tandas en [tareas.md](tareas.md). La planificación distingue dependencias de inicio de barreras de integración; PM conserva despacho/seguimiento operativo.

## Validación

| Criterio | Tareas | Prueba/recorrido y entorno | Evidencia esperada |
| --- | --- | --- | --- |
| CA-01 | T-01/02/04/07 | Crear/editar; 2 DMs + admin; acceder por ID/asset ajeno; sistema exacto. SQLite/PG y servicio real. | Contratos y capturas/resultados autorizados. |
| CA-02 | T-02/03/04/05/07 | Inactiva solo consulta: rechazo de escritura de hijos/guardado/API desde pestaña antigua; reactivar; cierre previo y carrera iniciar/desactivar. | Revisión, datos e invitados antes/después. |
| CA-03 | T-02/04/07 | Dos arcos/varias escenas, conteos, regreso y recurso legado compartido. | Relaciones/conteos y navegación real. |
| CA-04 | T-02/04/07 | Subir/quitar imagen propia; mapa 0 reordenado/reemplazado vs activo; placeholder y fallo recuperable; sin selector de modos ni mapa del arco. | Pruebas de selección y capturas. |
| CA-05 | T-05/07 | Escena activa distinta de última guardada, dirty/guardar/cancelar/recuperar; multimap. Inactiva no abre editor ni guarda. | Documento/IDs intactos y foco al volver. |
| CA-06 | T-03/05/07 | Catálogo completo en dos escenas, edición fuera; homónimos, sistema retenido/deshabilitado, uso táctico aislado/jugador y consulta sin edición en inactiva. | Snapshots/bindings y proyección sin privados. |
| CA-07 | T-06/04/07 | Reloj 14 días, exactamente 15, futuro, cuentas/orígenes/campañas, IDB denegada. | Unitarias y recarga real; un resaltado. |
| CA-08 | T-02/05/07 | Navegar no abre/publica/rota; cambiar arco/escena conserva invitados; continuar/reabrir/rotar/cerrar conserva reglas por mesa/campaña. | Contratos de apertura y recorrido autenticado. |
| CA-09 | T-01/02/03/07 | Partida→campaña+arco inicial; inventario y migración repetida/fallida/restauración; compartidas/sin vínculo/borradores. SQLite y PG TLS. | Inventario semántico antes/después, sin pérdidas. |
| CA-10 | T-04/05/07 | Teclado, foco, 390 px, zoom, carga/error/acceso perdido. Web/Electron servicio. | Matriz visual por plataforma. |
| CA-11 | T-01/03/05/07 | Roundtrip v1/v2, referencias ausentes, abrir local y conservar editor/plantillas. | Archivos sintéticos y smoke autónomo/aislamiento. |
| CA-12 | T-01/02/03/05/07 | Revisiones, petición repetida, ACK/COMMIT incierto, cuentas cruzadas, respuesta tardía y estado inactivo revalidado antes de escritura. | Casos negativos ambos motores y cliente real. |

Comandos definidos durante la planificación; sus resultados ejecutados están en [validación](validacion.md): `pnpm typecheck`, `pnpm lint`; unitarias dirigidas como `pnpm test src/domain/sessions/scene-schema.test.ts src/domain/sessions/scene-aside.test.ts src/infrastructure/browser/owned-client.test.ts src/infrastructure/browser/scene-save-recovery.test.ts src/application/services/game-runtime.test.ts` más suites nuevas. Regresión general ejecutada al integrar: `pnpm exec vitest run --exclude '**/.local/**' --maxWorkers 2`.

Gates separados: `pnpm test:db`, `pnpm test:owned`, `pnpm test:invitations`, `pnpm test:moderation`, `pnpm test:identity` por cambios en composición/transacción de identidad. PM verificó binarios PostgreSQL 18 en `/Applications/Postgres.app/Contents/Versions/18/bin/` y Node/pnpm disponibles; eso no es evidencia de tests. Preparar cluster sintético TLS bajo `/private/tmp` y copia/checkout aislado sin `.env` (PM gestiona autorización si implica Git). Requieren PostgreSQL real temporal con TLS (`TTRPG_TEST_DATABASE_URL`, `TTRPG_TEST_DB_CA_FILE`) y fixtures SQLite aisladas; revisar prerrequisitos y ejecutar `pnpm build:api` cuando el arnés consuma CLI compilado. Usar checkout aislado sin `.env` operativo; no borrar el del usuario. Unitarias no sustituyen estos contratos `*.contract.ts`.

| Cliente/rol | Validación de plataforma prevista |
| --- | --- |
| Navegador DM | Flujo completo, dos cuentas/pestañas, recuperación, IDB y 20 ciclos panel/editor con listeners/canvas/memoria sin crecimiento retenido inexplicado. |
| Electron servicio DM | Mismo flujo HTTP, cerrar/reabrir conserva datos locales de recuperación pero exige autenticación; aislamiento de origen y ausencia de preload. |
| Electron autónomo | Cargar/guardar escena v1/v2, bibliotecas locales, mapas/player view y no aparición de jerarquía remota; obligatorio aunque D-06 no añada función. |
| Invitado/jugador y admin | Invitación/rotación/cierre/publicación intactos; sin panel, miniaturas privadas ni fichas de preparación. |

Builds de desarrollo previstos tras checks: `pnpm build:web`, `pnpm build` y `pnpm build:api`; no empaquetado de publicación desde este plan. Smoke con configuraciones sintéticas, sin arrancar servicios operativos durante planificación.

## Cierre

La planificación inicial verificó documentos, rutas, cobertura CA-01–12 y propiedad de archivos. La ejecución posterior implementó la versión local 3.28.0, actualizó CHANGELOG y produjo contratos, builds y recorridos reales registrados en [validación](validacion.md). Las migraciones se probaron exclusivamente con bases sintéticas. Los gates integrados están completos; commit, push, merge, DMG y migración de datos reales no forman parte de esta entrega local.


## Delta de experiencia 0.3 — CA-13–15

**Estado del delta:** T-08 implementada, revisada y validada localmente; CA-13–15 comprobados mediante pruebas dirigidas y QA final de PM. Entrega 3.28.1 sin commit ni integración. La solicitud explícita del usuario y la revisión 0.3 sustituyen, únicamente para la entrada de escena, las menciones anteriores a gate «Iniciar/Continuar» y acceso global a borradores. El resto de T-01–07 y su evidencia describe la entrega histórica 0.2; no se repiten como resultados de este ajuste. Navegar campañas/arcos continúa sin abrir mesa; activar «Abrir editor» sí constituye la intención de abrir/continuar el editor.

**Base reinspeccionada:** 2026-11-13, rama `feature/spec-59-campanas-arcos-escenas`, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, producto local 3.28.0 con todos sus cambios sin commit conservados. Spec 0.3 inspeccionada SHA-256 `5fc805eb9bfa114814c3cc40ab6aa975ca7122f7981c0efc143a087dff22ba7e`. PM conserva escritura de spec/evidencia; TL solo modifica plan/tareas. No cambió rama, producto, datos ni historial y no ejecutó servicios/builds/tests.

### Recorrido y cambio acotado

| Frontera observada | Cambio propuesto para T-08 |
| --- | --- |
| `ServiceApp` monta `DraftArchive` antes de `CampaignCatalog` | Retirar ese montaje/import. No borrar IndexedDB ni copias existentes, ni añadir recuperación de partidas eliminadas. |
| `CampaignCatalog` emite `CampaignSelection`; `ServiceApp` navega; `GameEditor` valida campaña/arco/escena y espera botón adicional | Usar esa intención de selección para una única entrada automática después de validar la selección, cargar configuración/apertura y comprobar cuenta activa. Mantener una carga breve «Abriendo {escena}…», seguida de editor o error accionable. |
| `GameEditor.start/continueGame` → HTTP opening → autoridad existente | Reutilizar heartbeat si `fresh/reconnecting`, `start` idempotente si `absent/expired`. No usar `reopen`, rotate ni publish para la entrada. Validar resultado vigente antes de montar/revelar sesión. |
| `LiveEditor` → `DraftRecovery` → IndexedDB y `browser.openSaved` → `DraftCoordinator.restore` → `App` | Consultar solo escena seleccionada. Confirmada por hash/documento o conciliación existente: cargar escena guardada sin modal. Pendiente: ofrecer recuperación contextual; otras escenas no aparecen en selector ni sustituyen la seleccionada y sus copias quedan intactas. |
| `DraftRecovery` muestra botón de estado permanente encima del workspace; `App` tiene `aside.scene-status` | Eliminar banda/botón superior permanente. Integrar texto de persistencia local en primer segmento del footer real, mediante dato o slot tipado entre `LiveEditor`, `ServiceWorkspace` y `App`. No duplicar coordinador, suscripción ni lógica de guardado. |

El cambio comparte React/HTTP entre navegador y Electron servicio. `DraftCoordinator`, puertos de escena, normalización de documentos y contratos HTTP se reutilizan sin duplicación. `App` admite la integración opcional de estado; autónomo conserva su composición IPC/preload, footer y carga/guardado locales. No se añaden capacidades privilegiadas, SQL, FS, dependencias, migraciones ni cambios de formato. API conserva autorización del propietario y bloqueo de campañas inactivas; una selección validada en UI no es credencial.

### Concurrencia y recuperación

- Clave de intento: cuenta/partida/selección y generación de navegación/autoridad. Un marcador síncrono evita doble entrada por render/StrictMode antes de que `busy` se refleje; comprobar vigencia tras cada `await`. No basar la deduplicación exclusivamente en estado React o en `running`.
- Conservar `Mutations` y sus claves inciertas para reintentar exactamente payload/revisión. Errores tienen reintento voluntario, respetando Retry-After cuando proceda; no bucle automático que acumule aperturas o cambie precondiciones ante ACK perdido. Un conflicto requiere revalidar contexto, sin adoptar silenciosamente una respuesta vieja.
- El cierre explícito confirmado vuelve al panel por el callback existente; no dispara otra entrada automática. Suspensión de cuenta, pérdida de autoridad, terminal SSE y recuperación de borrador conservan sus guardas y no equivalen a seleccionar una escena nueva. Reabrir/rotar siguen acciones explícitas ya existentes.
- Aislar lista, lectura de cuerpo y restauración por origen/cuenta/gameId/sceneId; cancelar resultado tardío al cambiar selección o autoridad. No restaurar checkpoint en memoria de otra escena ni cargar `latestSavedScene` cuando se recibió selección concreta. Sin selección explícita, la compatibilidad de ruta legada sigue contextual a su partida y no habilita archivo global.
- `App` puede montarse oculto/inert para registrar la restauración que necesita el coordinador; revelarlo solo al cargar la escena elegida o aceptar recuperación. El modal no debe quedar encerrado en un contenedor oculto/inert. Cancelar/Escape vuelve al arco y conserva el borrador; no dejar un editor oculto esperando indefinidamente. Errores/confirmaciones inciertas siguen resolubles aunque se retire el botón permanente.
- Navegar de regreso desmonta suscripciones/listeners/timers del editor como ahora. No cambiar SSE, leases, protocolo público ni propiedad de texturas; las pruebas de autoridad/cancelación demuestran la preservación relevante.

### Acuerdo UX TL-59-03

Consulta a `/root/ux_spec59`, respondida el 2026-11-13 y recogida en [UI-003](../../guias/ui-ux/campanas-arcos-escenas.md). Sin laboratorio nuevo: la petición ya delimita interacción y componentes existentes.

Entrada directa con «Abriendo {escena}…». Error conserva contexto con «Reintentar» y «Volver al arco». Diálogo «Cambios sin guardar de {escena}», fecha y acciones «Recuperar borrador» (foco inicial), «Abrir escena guardada» (explica conservación de copia local) y «Volver al arco»; Escape equivale a volver. Foco en editor/escena al entrar y tarjeta origen al regresar. No selector de otras escenas en esta recuperación.

Footer real: `.vtt-interface .scene-status` en `src/renderer/src/components/workspace/workspace.css`, 28 px, 25 px móvil, fuente existente 10 px. Conservar texto inequívoco «Guardado en este dispositivo · HH:MM» cuando la persistencia local confirmó; no confundirlo con confirmación de servidor. Pendientes/error se expresan con texto y anuncios accesibles adecuados, sin anunciar cada segundo. Evitar truncar la única explicación del error o dejar acciones necesarias fuera de teclado. No franja superior ni tamaño global nuevo.

### Validación proporcionada del delta

| Criterio | Tarea y comprobación | Entorno / evidencia prevista |
| --- | --- | --- |
| CA-13 | T-08: catálogo sin recuperación; sin copia/limpia/cámara sola carga directa; pendiente actual muestra elección; pendiente ajena no aparece; recuperación/carga guardada/cancelación preservan otras copias; respuesta tardía no restaura escena equivocada. | `ServiceApp.test.tsx`, `DraftRecovery.test.tsx`, integración de `App.workspace.test.tsx`; recorrido con IndexedDB sintética. |
| CA-14 | T-08: selección válida entra sin segundo clic; apertura vigente preserva id/generación/invitación; ausencia crea una apertura; StrictMode/reintentos/cuenta suspendida/selección inválida/inactiva/cierre no duplican ni reabren. | `GameEditor.authority.test.tsx`, `GameEditor.test.tsx`, panel y `scene-save-recovery.test.ts`; recorrido API sintética y navegador/Electron servicio. |
| CA-15 | T-08: estado solo dentro de `.scene-status`, texto local distinguible, error resoluble, teclado/foco, escritorio, 390 px y 200 % sin banda superior. | Integración `App.workspace.test.tsx` más captura real navegador y smoke Electron servicio/autónomo por composición compartida. |

Comandos propuestos: `pnpm test src/web/ServiceApp.test.tsx src/web/DraftRecovery.test.tsx src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/campaigns src/renderer/src/App.workspace.test.tsx src/infrastructure/browser/scene-save-recovery.test.ts --maxWorkers 2`, `pnpm typecheck`, `pnpm lint`, `pnpm build:web`, `pnpm build`. Si se modifica otro contrato o puerto, ampliar pruebas conforme a ese cambio; mocks no certifican foco real ni Electron. No repetir contratos DB/identidad/owned/invitaciones/moderación de 0.2 como si fueran del delta: no hay cambio de backend previsto; si aparece, vuelve a PM para delimitar y activar gates apropiados. Smoke real con fixtures aisladas y otro puerto, nunca arrancar/parar API operativa 8787 ni migrar sus datos.

Secuencia propuesta: T-07 histórico → T-08 código/pruebas dirigidas → checks/builds serializados → QA sintética y evidencia de PM. Un solo propietario frontend porque comparten `GameEditor`, `DraftRecovery`, `App` y CSS; no hay paralelismo útil dentro del producto. PM puede preparar entorno sintético y documentación en paralelo sin modificar esos archivos ni salidas de build. Versión correctiva prevista 3.28.1 y CHANGELOG son responsabilidad del builder si PM la asigna; este plan no hace bump. T-08 no está completa por quedar planificada; requiere resultados CA-13–15 y límites documentados por PM.


### Revisión dirigida de T-08 tras implementación

El TL inspeccionó en lectura los cambios de `ServiceApp`, `GameEditor`, navegación, `DraftRecovery`, integración del footer y regresión de salida. Los hallazgos iniciales quedaron corregidos: validación ligada a la selección actual, rearme controlado tras suspensión/descarte, cierre sin autoapertura, selección exacta también ante error/404, recuperación legada de `sceneId:null` sin adoptar otra escena y guard de render para transición desde ruta legada.

El último bloqueo de integración quedó resuelto mediante `onExitAfterLeave`: `GameEditor` lo usa únicamente tras cierre ya autorizado o descarte explícito, con `closedForExit` establecido; `ServiceApp` reemplaza la ruta de retorno sin consultar por segunda vez el guard del editor que se desmonta. La salida ordinaria conserva `navigate` y su guard. Se inspeccionó la regresión `ServiceApp.test.tsx` que mantiene bloqueada la salida ordinaria y permite la ya confirmada sin aumentar las llamadas al guard. No quedan hallazgos bloqueantes en el ámbito revisado.

Frontend/PM informan 90 pruebas dirigidas verdes y checks/builds completos del corte final; el TL no los ejecutó ni convierte ese informe en validación de plataforma. PM completó después el QA manual de CA-13–15, según el cierre siguiente. La revisión técnica por sí sola no sustituyó esa validación, ni altera la evidencia histórica de 0.2 o autoriza Git/integración.


### Cierre local del delta 0.3

PM comunicó QA final completado de CA-13–15: recuperación contextual en IAB, Escape con retorno a tarjeta (`ARTICLE`) y ningún canvas retenido, recuperación del cambio de grilla pendiente y entrada a otra escena limpia sin modal; entrada directa en Chrome y Electron servicio; comprobación de misma apertura/invitación al pasar de Foco a Santuario; cierre con cambios pendientes mediante Confirmar → Descartar y retorno único al arco, generación 7 cerrada sin inicio adicional, seguido de nueva apertura solo tras elegir otra escena. Footer comprobado en escritorio, ancho 390 px y zoom real 200 % en Chrome. Smoke Electron autónomo 3.28.1 con canvas/footer y sin estado de servicio; ajuste del icono limitado al appPath privado del arnés, sin cambio del producto.

T-08 queda **validada localmente**, con revisión TL sin bloqueos y evidencia de ejecución a cargo del PM en [validación, sección Ajuste de experiencia 0.3](validacion.md) y [evidencia del delta](evidencia-ui-0.3.json). Ese registro separa resultados finales, plataformas y huellas del corte histórico 0.2. Este cierre se basa en la evidencia comunicada por los ejecutores y PM; TL solo planificó, inspeccionó y actualizó estos documentos. No implica commit, push, merge, DMG ni publicación.


## Delta visual 0.4 — CA-16–18

**Estado:** T-09 implementada, revisada y validada localmente para CA-16–18, versión 3.28.2 según evidencia final de PM. La planificación y revisiones intermedias siguientes conservan su procedencia histórica. Solicitud humana del 2026-11-14 incorporada en spec 0.4; T-09 continúa la rama autorizada `feature/spec-59-campanas-arcos-escenas` sin cambios Git. Base reinspeccionada: HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, producto local 3.28.1 y cambios previos conservados. SHA-256 de spec inspeccionada: `34140205afda23990a8a315a091e618d7c47969f70daa9b20e1ecd5d0e64714d`. TL escribe solo plan/tareas; PM conserva spec/evidencia y UX su ficha.

### Inspección y solución acotada

- **CA-16:** los tres listados de `CampaignPanel.tsx` usan `ul.campaign-cards`; `service.css` define `auto-fit` con mínimo 300 px, que puede expandir una tarjeta a todo el ancho o producir más de dos columnas. Cambiar a una columna `minmax(0,1fr)` por defecto y exactamente `repeat(2,minmax(0,1fr))` desde 960 px de viewport. Una tarjeta ocupa una celda en escritorio; no `auto-fit/auto-fill`. Mantener ancho disponible, márgenes y sidebar/drawer existentes; `min-width:0` en ítems evita que nombres largos impongan overflow. Detalle de escena y listas de preparación no cambian.
- **CA-17:** botones de acciones del panel (cabeceras, tarjetas y formularios) requieren `inline-flex`, `align-items:center`, `justify-content:center`, separación consistente 6–8 px y texto centrado; SVG sin encogerse. Usar clase/selector acotado para no convertir el switch, breadcrumbs ni navegación lateral en botones de acción. Eliminar el `text-align:left` de la acción primaria de tarjeta donde contradiga ese centrado; conservar el tamaño y nombre accesible de opciones solo icono.
- **CA-18:** el editor usa Radix `Switch.Root/Thumb` en dos lugares de `App.tsx` y en `MapAnnotationsSection.tsx`, con clases `switch-root/switch-thumb`. No existe aún un componente React compartido con ese nombre. `CampaignPanel` recrea Radix con `campaign-switch*`; `.service-page button` y `.service-dialog button` tienen mayor especificidad que `.campaign-switch` y pisan padding/borde/fondo. Extraer un componente pequeño `SharedSwitch` bajo `src/renderer/src/components/` (ruta nueva) y estilos compartidos, reutilizados por esos consumidores reales y Campaña activa. Conservar API controlada `checked/onCheckedChange`, disabled, asociación de etiqueta y accesibilidad Radix. No cambiar cuándo ni cómo se confirma el estado remoto.
- Geometría vigente final del editor: raíz 40×22, thumb 16, desplazamiento 2→20, redondeado y contenido recortado. `styles.css` conserva dos capas históricas de estilos y selectores bajo `.sidebar-accordion-content`; extraer la geometría/estados sin depender de ese ancestro y retirar solo duplicación sustituida. La regla `.vtt-interface .switch-root[data-state=checked]` de `workspace.css` puede conservar la presentación del editor o trasladarse sin alterarla. No reconstruir estilos globales ni migrar checkboxes ajenos.
- **Contraste del riesgo de listas:** en el código inspeccionado ya no existe `.service-page ul`; las reglas antiguas están acotadas a `.service-cards` y sus hijos (service.css:98–100). No documentarlo como fallo vigente ni reintroducir un selector que alcance todas las listas. Para el switch sí evitar interferencia de reglas genéricas de botones, excluyendo `.switch-root` de estilos incompatibles o usando prioridad compartida controlada; contemplar tanto `.service-page` como `.service-dialog`, orden de import de CSS y disabled/focus. No resolverlo acumulando `!important`.

Consulta **TL-59-04** a `/root/ux_spec59`, 2026-11-14: acuerdo recogido en [UI-003](../../guias/ui-ux/campanas-arcos-escenas.md) y reutilización [UI-001](../../guias/ui-ux/catalogo.md). Umbral elegido 960 px de viewport por simplicidad y coherencia con el encargo; la alternativa de container query no se necesita en esta corrección. No laboratorio nuevo: producto real demuestra dimensiones, alineación y estados. Nombre accesible explícito para «Campaña activa» y conservación de confirmación/cancelación/foco; los filtros Activas/Inactivas/Todas siguen botones.

### Fronteras, propiedad y validación

Solo composición React/CSS compartida: navegador y Electron servicio cargan renderer styles/workspace styles y luego service.css; autónomo usa los mismos componentes de editor con sus estilos y sin service.css. `SharedSwitch` depende de React/Radix existentes, no del cliente HTTP, dominio, Electron, FS o SQL. La función `setCampaignState` y sus revisiones, guards de inactiva, cancelación y cierre previo permanecen en CampaignPanel/cliente/API actuales. No cambia autorización, persistencia, snapshots, publicación ni apertura; no se añade efecto asíncrono al switch ni estado optimista independiente del valor confirmado.

Un propietario frontend de T-09 posee CSS compartido y todos los consumidores, evitando carreras entre extracción y adopción. PM puede preparar fixtures y evidencia en paralelo; builds sobre el mismo out se serializan. Dependencia `T-08 → T-09`, sin ciclos ni precondición backend nueva. Patch previsto 3.28.2/CHANGELOG tras completar corrección; sin Git ni publicación.

| Criterio | Prueba/recorrido de T-09 | Entorno y evidencia |
| --- | --- | --- |
| CA-16 | Tres niveles, uno y varios elementos: una columna de ancho útil a 390 y 959; exactamente dos a 960 y 1440, incluyendo una sola tarjeta; nombres largos y sin overflow. | Navegador real, medidas/capturas, zoom real 200 %; smoke Electron servicio. CSS real, no simulación jsdom. |
| CA-17 | Nueva campaña, Crear arco, Asociar escena y opciones; grupo icono/texto centrado, separación y tamaño, foco visible y teclado. | Inspección visual/DOM en esos mismos anchos; breadcrumbs/sidebar sin regresión. |
| CA-18 | Activo/inactivo, click/Espacio, cancelación/confirmación y valor remoto, disabled/pendiente; geometría idéntica fuera/dentro editor y thumb contenido. | Pruebas existentes CampaignPanel/App/MapAnnotationsSection cuando corresponda; navegador y Electron servicio; smoke autónomo del switch de Ajustar grilla. |

Comandos proporcionados: `pnpm test src/web/campaigns/CampaignPanel.test.tsx src/renderer/src/App.workspace.test.tsx --maxWorkers 2`, añadiendo la suite existente de anotaciones afectada si cambia ese consumidor; `pnpm typecheck`, `pnpm lint`, `pnpm build:web`, `pnpm build`. Adaptar en CampaignPanel el selector de test de `.campaign-switch` a rol/nombre accesible, conservando prueba de reactivación; no crear tests que copien reglas CSS o comprueben constantes de anchura. Solo ampliar comportamiento si la extracción exige un caso real no cubierto. No repetir contratos DB/API ni migraciones, ya que no cambian; cualquier necesidad inesperada de backend vuelve a PM. QA con fixtures aisladas y API sintética existente; no datos operativos ni nuevo proceso 8787.

Comprobación TL realizada: rutas/consumidores reales, fuente 0.4, criterios CA-16–18 completos, propiedad única y grafo sin ciclos. No se ejecutaron tests, builds, servicios o migraciones. La tarea está lista para que PM la asigne; esta propuesta no implica que se haya implementado o validado.


### Revisión del primer corte T-09

Inspección TL de producto en lectura: grilla y adopción React de `SharedSwitch` presentes; el componente usa finalmente clases encapsuladas `shared-switch/shared-switch__thumb`, elección interna equivalente al objetivo compartido. Nombre accesible, valor controlado y callback remoto existentes se conservan.

Hallazgo bloqueante CA-18 enviado al frontend y PM: la regla base `.shared-switch` tiene menor especificidad que `.service-page button`, `.service-dialog button` y `.sidebar-accordion-content button`; estos selectores siguen aplicando padding/borde/fondo, incluida regresión dentro del editor al retirar la antigua regla más específica. Corregir alcance/prioridad de las reglas comunes, también hover, y revisar geometría/estados reales. Revisión técnica y QA pendientes de esa corrección; no se declara T-09 validada. TL no ejecutó pruebas ni builds.


### Revisión final de CSS T-09

Hallazgo de especificidad cerrado por inspección TL del corte corregido: service-access/dialog/page excluyen `.shared-switch` de los estilos generales de botón; ambos bloques históricos de `.sidebar-accordion-content button` y sus variantes hover/activo también lo excluyen. La geometría y estados de SharedSwitch quedan bajo su CSS compartido, con la variante de color vigente del editor preservada. No quedan hallazgos bloqueantes en el ámbito revisado; no se amplió el cambio a lógica de estado remoto.

PM informó QA real de grillas completado a 390/959/960/1440 px: una tarjeta de arco conserva media grilla en escritorio y cinco escenas mantienen una/dos columnas sin overflow. La revisión técnica está completa; comprobación real de switches y cierre de evidencia CA-16–18 siguen a cargo de PM. No se declara T-09 validada globalmente antes de ese cierre. TL no ejecutó tests/builds ni modificó producto.


### Cierre local del delta 0.4

T-09 queda **validada localmente en 3.28.2**, sin integración, según QA final comunicado por PM. CA-16: campañas medidas a 390/959 px con una columna y 960/1440 con dos; arco único a 1440 ocupa 515 px de grilla de 1046 px, conservando la segunda columna vacía; cinco escenas sin overflow en 390/1440. CA-17: Nueva campaña con alineación vertical de icono/texto sin diferencia, separación 8 px y conjunto centrado; opciones solo icono centradas. CA-18: switch 40×22 y thumb de 16 contenido en ambos estados dentro y fuera del editor; Tab muestra foco de 2 px, Espacio abre la confirmación y Cancelar conserva el estado activo/inactivo confirmado.

PM comprobó capturas en Chrome con zoom real 200 % sin recorte del control, restauró zoom y verificó formulario en Electron conectado y switch encendido/apagado en Electron autónomo 3.28.2. Frontend/PM informan 47 pruebas de cuatro archivos, typecheck, lint y builds web/Electron superados. Resultados, configuraciones y huellas se registran en [validación, sección del ajuste 0.4](validacion.md) y [evidencia del delta 0.4](evidencia-ui-0.4.json), separados de 0.2/0.3.

Lectura TL del último ajuste de paleta: `SharedSwitch.css` consolida los colores efectivos del editor como valores compartidos — activo `#8ed5b6`, fondo apagado `#0f141a`, borde `#50565d`, thumb apagado `#a0a7af` — y workspace elimina su override redundante. Geometría, semántica Radix y confirmación remota no cambian; el ajuste cierra la presentación consistente pedida, sin ampliar alcance. No quedan hallazgos bloqueantes en la revisión. TL no ejecutó producto/tests/builds ni modifica la evidencia comunicada por los ejecutores; este cierre documental no autoriza commit, push, merge, DMG ni publicación.


## Corrección de navegación 0.5 — CA-19–23

**Estado:** completo para revisión y asignación por PM; no es evidencia de ejecución. **Fuente:** [spec 0.5](spec.md#corrección-de-navegación-05--2026-11-14), SHA-256 inspeccionado `22d2c0570ea5254f8adadd8a387802a3aaba4fe5a3a5119826f57cdd28336d26`. **Base:** 2026-11-14, rama `fix/sidebar-administracion` preparada por PM tras autorización humana Q-0009, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, versión local 3.29.0. Cambios locales SDD59/60, fuentes web/editor, componentes compartidos, historias, configuraciones y documentación conservados. El SHA no representa por sí solo este árbol sin commit. Se sustituye únicamente la navegación exterior flotante de T-04/T-09; se preservan su contenido y evidencia anterior. Dependencias funcionales: SDD54 cabecera/guardas y SDD60 historias aisladas.

### Inspección y composición propuesta

| Recorrido observado | Frontera propuesta |
| --- | --- |
| `ServiceApp` → `HeaderDropdown` Navegación → `/partidas` o administración | Fuera del editor, la hamburguesa controla `AdminShell` (nuevo). Dentro del editor conserva el dropdown y cabecera vigentes, sin cambiar su ciclo de vida. |
| `CampaignCatalog` → capabilities → `CampaignPanel` o `GameCatalog` | Mantener cliente, propiedad de `CampaignRoute`, recientes y fallback. Añadir transporte del slot de navegación, sin segunda carga de campañas. |
| `CampaignPanel` → carga de campañas/arcos/escenas → aside contextual y breadcrumbs | Extraer representación `AdminSidebar` (nuevo) y portarla al slot del shell. Panel conserva datos, mutaciones, restricciones, foco de retorno a escena y breadcrumbs. Retirar su drawer, trigger y listeners de navegación anteriores. |
| Selección de escena → `ServiceApp.setCampaignSelection` → `GameEditor` | Ruta/guardas/selección permanecen; el shell administrativo se desmonta al entrar al editor. Ninguna selección del sidebar inicia una apertura. |
| Cuenta admin → `AdminAccounts` / `AdminSystems` | Mismo shell, opciones existentes derivadas del rol; seguir usando `navigate` y `useServiceNavigation`. |

`AdminShell` posee layout, breakpoint, apertura, disparador y foco. Recibe cabecera/contenido React y proporciona un host de navegación DOM dentro de su sidebar. Contrato interno mínimo propuesto: `navigationSlot: HTMLElement | null` y `onNavigation?: () => void`, propagados por `CampaignCatalog` a `CampaignPanel`. El panel monta exclusivamente su navegación mediante `createPortal`; no porta el contenido ni mueve el formulario. El callback informa al shell de una selección antes de invocar el `onNavigate` existente. Puede suministrarse por render prop tipada del shell para evitar un registro global. `null` significa que el host todavía no está montado; no debe provocar otro aside inline o un segundo menú.

`AdminSidebar` recibe un modelo discriminado de presentación: DM con ruta y contexto mínimo `{id,name}` ya validado, admin con destino Cuentas/Sistemas, o legacy con Partidas. Sus callbacks son tipados, no rutas arbitrarias ni clientes completos. La raíz DM vuelve a `{level:"campaigns"}` del Catalog; no recarga la página ni reinicia cliente. Durante capabilities/carga, la raíz sigue disponible; el fallback sin campañas muestra solo Partidas. Las historias usan los mismos componentes y un modelo sintético, sin `ServiceApp` completo.

El host puede cambiar al pasar entre sidebar y dialog, pero solo se remontan sus enlaces; **CampaignCatalog/Panel y formularios no se remontan al abrir, cerrar o cambiar ancho**. El contexto de cuenta/cliente debe ser inequívoco: usar una clave de propietario cuando cambie la cuenta y desmontar la navegación al salir del shell. No almacenar metadatos en callbacks/estado de `ServiceApp`, ni conservarlos en un singleton o preferencia persistida.

### Decisiones UX y ciclo de vida

Consulta **TL-59-05**, acordada con `/root/ux_spec59` y PM el 2026-11-14; [UI-005: sidebar administrativo](../../guias/ui-ux/sidebar-administracion.md), documentada por UX. No hace falta prototipo paralelo: las historias de componentes reales son el laboratorio de esta corrección.

- Desde 960 px: sidebar de aproximadamente 240 px, altura `100dvh`, marca propia y contenido vecino; cabecera de 44 px en la región principal. Hamburguesa oculta/muestra la columna sin rail. Ocultar con foco dentro devuelve al disparador; abrir por teclado lleva al destino activo o primero. No persistir preferencias.
- Debajo: drawer lateral modal con scrim, nombre accesible, cierre explícito, foco inicial en activo/primer destino, Tab/Shift+Tab contenidos. Escape/scrim/cierre restaura trigger. Al elegir destino, cerrar sin restauración tardía y enfocar el h1 nuevo; coordinar con `CampaignPanel.focusTitle` para no competir. Si se elige el destino ya activo, cerrar y enfocar el contenido aunque no cambie la ruta.
- Usar semántica `nav`, listas y botones/enlaces según navegación actual; no `role=menu` o `tree` sin su patrón. Solo una hoja activa por sidebar. Campaña y arco son encabezados de contexto, no disclosures ficticios. Detalle de escena activa Escenas; preparación activa Monstruos y NPCs. Breadcrumbs siguen inline y con su propia semántica.
- Al cambiar breakpoint, cerrar modal antes de mostrar la variante estructural, liberar top layer/listeners/foco y evitar dos navegaciones accesibles simultáneas. Registrar y limpiar `matchMedia` y listeners. No montar contenido duplicado para móvil y escritorio.
- Ante carga/error de nueva campaña/arco, no mostrar nombres o destinos hijos de los datos anteriores; mantener raíz y estado de carga accesible. El reintento permanece en contenido. La generación de solicitudes existente debe impedir que respuestas tardías repueblen contexto antiguo.
- Expiración, logout, cambio de cuenta/rol, contraseña obligatoria o entrada al editor desmontan/cierran explícitamente el drawer. Un `dialog.showModal()` puede escapar visualmente de un ancestro oculto: `hidden/inert` de `.account-guard` por sí solos no sustituyen ese cierre. No enfocar triggers desmontados/ocultos. Conservar `retained`, `registerLeave`, guard, portales del editor y recuperaciones actuales.

### CSS, plataformas y seguridad

Acotar layout con `.admin-shell` y descendientes. `.service-page` aparece también en fallbacks de `GameEditor`, por lo que no cambiar su geometría global. Retirar solo reglas obsoletas `.campaigns-sidebar`, `.campaign-nav-trigger` y la columna de navegación interior; conservar controles, formularios y grilla de tarjetas de una columna / dos desde 960 px. Usar `min-width:0`, scroll vertical contenido y texto largo sin overflow; la marca se muestra una vez, incluso colapsado/estrecho. Mantener paleta y controles existentes, sin SmartAdmin, assets o dependencias nuevos.

Navegador y Electron servicio comparten estos componentes HTTP sin preload privilegiado. Electron autónomo no monta este shell y conserva su editor. No cambia código de dominio/aplicación, puertos, DB, IPC, CSP, autorización HTTP ni persistencia: no hay nueva unificación de adaptadores. Visibilidad por rol no concede autoridad; no mostrar opciones admin a DM ni contexto privado a invitado. No se requieren contratos SQLite/PostgreSQL para este delta exclusivamente visual; un cambio posterior a backend requeriría replanificar sus gates.

### Secuencia, propiedad y validación

Única tarea de producto **T-10** con un frontend_builder propuesto, seguida de QA/evidencia PM. Orden interno: shell/contrato → navegación extraída → integración exterior en ServiceApp/Catalog → retirada CSS/listeners anteriores → pruebas/stories → patch 3.29.1 y checks. No hay ganancia en repartir esos archivos entre builders. PM/UX/TL pueden trabajar documentación independiente; builds que escriben outputs comunes se serializan. Grafo: `T-09 + SDD60 local + spec0.5/Q-0009 → T-10 → QA PM`, sin ciclos ni backend pendiente.

| Criterio | Tarea | Prueba/recorrido y entorno | Evidencia esperada |
| --- | --- | --- | --- |
| CA-19 | T-10 | Shell DM/admin, escritorio expandido/oculto, ausencia del antiguo aside y dropdown exterior | Tests de composición y capturas/medidas reales; sidebar de altura completa y marca única |
| CA-20 | T-10 | Drawer con Tab/Shift+Tab/Escape/scrim/navegación, cambio 959↔960 abierto, pérdida de autorización/owner | Tests de comportamiento y teclado real; top layer liberado, foco correcto, sin listener remanente |
| CA-21 | T-10 | Root→Arcos→Escenas/Preparación/detalle; carga/error/vacío; rol admin/DM/legacy y respuesta tardía/cambio cuenta | Pruebas Panel/Catalog/ServiceApp; un activo por nav, raíz disponible, sin contexto anterior ni fetch extra por togglear |
| CA-22 | T-10 | Editor/contenido protegido, retorno de escena, fallbacks y ancho 390/959/960/1440, zoom 200 % | Regresiones y smoke navegador/Electron servicio con fixture; una/dos columnas sin overflow; autónomo sin diff productivo |
| CA-23 | T-10 | Historias `Composiciones/AdminShell` y `Composiciones/AdminSidebar`, CampaignPanel actualizado | Storybook aislado, grafo sin motores, checks, patch/changelog y evidencia PM separada 0.5 |

Comandos propuestos (no ejecutados por TL):

```sh
pnpm test src/web/AdminShell.test.tsx src/web/ServiceApp.test.tsx src/web/campaigns/CampaignCatalog.test.tsx src/web/campaigns/CampaignPanel.test.tsx src/web/HeaderDropdown.test.tsx src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx --exclude '**/.local/**' --maxWorkers 4
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build
pnpm build-storybook
```

`AdminShell.test.tsx` es nuevo; si el builder separa pruebas propias de `AdminSidebar`, añadirlas al comando. Cubrir transiciones y efectos observables, no tests que solo repitan nombres CSS. Storybook build ya ejecuta `check:storybook-imports`; revisar índice/guard y probar historias reales con fixtures sin red de servicio. No lanzar la API operativa en 8787, migraciones ni DB reales para validar este ajuste.

Matriz de cierre mínimo: navegador DM/admin/legacy con teclado y medidas, más recorrido entrada/salida del editor y suspensión preservando borrador mediante fixtures existentes; Electron servicio smoke de navegación lateral y vuelta al editor por el mismo cliente; autónomo verificación de ausencia de cambios en su árbol/cabecera y build (no presentar esta revisión estática como nuevo smoke nativo). Invitado: prueba de no montaje de shell privado. Si una plataforma no está disponible, consignar el límite en la evidencia y no atribuirle validación ejecutada. PM registra archivos/huellas, comandos y capturas 0.5; conserva cortes anteriores y cobertura SDD60.

**Verificación documental TL:** rutas de lectura existentes contrastadas, archivos nuevos marcados, CA-19–23 cubiertos por T-10, propiedad única y dependencias sin ciclos. No se ejecutaron producto, pruebas, builds, servicios o migraciones. No quedan decisiones funcionales pendientes; nombres de archivos nuevos indicados son contrato propuesto de implementación, ajustables por builder con trazabilidad.


### Revisión dirigida de T-10 — 2026-11-14

Inspección estática TL de los hallazgos concretos, sin repetir auditoría ni ejecutar producto: el guard `isDmEditor` conserva la rama administrativa para un admin con URL de editor; la geometría del drawer usa flex y resta el cierre del área desplazable; el cambio de breakpoint detecta foco dentro del sidebar además de drawer abierto y restaura la hamburguesa. La prueba nueva de escritorio→estrecho cubre ese último escenario. Estos hallazgos quedan cerrados en revisión de código.

El foco de navegación administrativa admite h1/h2 y espera la Promise real de `navigate`. Esto corrige el retorno `void` temprano, pero el commit del nuevo DOM y la retirada de `inert` deben preceder al foco: los tests inspeccionados no cubren aún un h2 que se sustituya tras navegación asíncrona. Pendiente de comprobación dirigida PM: abrir drawer admin, elegir Sistemas desde Cuentas y verificar foco en el encabezado nuevo; resolver mediante efecto posterior al commit si la microtarea actual se adelanta. No se declara cerrada esa comprobación ni ejecutado QA/build por TL.

**Ampliación acotada de soporte CA-23, autorizada por PM:** el mismo builder T-10 posee también `.storybook/preview.tsx` y `.storybook/preview.css` para contexto `administration`, sin wrappers service-page/editor ni padding externo, y historias fullscreen. La inspección visual PM detectó que padding24px más padding16px de Storybook distorsionaban el shell100dvh y su overflow. Esta adaptación no incorpora dependencias ni autoriza otros cambios de configuración. QA visual y builds finales permanecen en curso por PM; su evidencia se registra separadamente al terminar.


### Cierre de hallazgos dirigidos de T-10

PM comunica el 2026-11-14 verificación real del corte final a 390 px, con web final y API sintética: Cuentas DM→Sistemas→Cuentas y elección del mismo destino cierran el drawer, dejan el h2 correcto enfocado y eliminan `inert` del contenido. Esta observación cierra la comprobación de orden de foco/commit que permanecía pendiente en la revisión anterior; no se atribuye su ejecución a TL. Los hallazgos dirigidos de rol, altura del drawer, transición de breakpoint y foco administrativo quedan cerrados, sin bloqueos técnicos abiertos en la revisión acotada.

Resultados recibidos de PM para el mismo corte: 69/69 pruebas en siete archivos, lint y builds web/Electron/Storybook superados. Medidas reales: 390/959 px una columna, 960/1440 px dos columnas, sin overflow; sidebar de 240 px por 900 px de alto en el viewport inspeccionado. Son resultados comunicados por el ejecutor/PM, no comandos ejecutados por TL. El recorrido final nativo Electron y el zoom siguen pendientes de cierre PM y **no** quedan certificados por este registro. PM mantiene el cierre integral CA-19–23 y su evidencia separada; esta revisión no autoriza Git ni integración.


### Cierre local del delta 0.5

T-10 queda **implementada y validada localmente en 3.29.1**, sin integración, según cierre comunicado por PM el 2026-11-14. CA-19–23 cuentan con la [validación de entrega](validacion.md) y [evidencia separada 0.5](evidencia-ui-0.5.json), mantenidas por PM. Los resultados anteriores de pruebas, builds, responsive y foco permanecen vigentes para ese corte; no se convierten en ejecución propia de TL.

PM completó los recorridos antes pendientes: Electron servicio 3.29.1 navega Campañas→Arcos→Escenas→editor sin sidebar administrativo; el editor conserva su menú de navegación y Partidas devuelve al catálogo con foco en h1. La comparación de 182 archivos de GameEditor/HeaderDropdown y renderer/main/preload frente al baseline del delta confirma identidad de esos archivos, conservando el alcance exterior y el editor autónomo sin modificación. Esta evidencia de identidad no equivale a un nuevo recorrido nativo autónomo.

Chrome nativo al 200 % fue confirmado mediante accesibilidad y capturas: scroll vertical sin recorte horizontal. PM restauró 100 % y cerró las pestañas sintéticas. Quedan cerrados los pendientes de Electron servicio y zoom declarados en el registro anterior. La revisión técnica dirigida no conserva hallazgos bloqueantes; implementación local, aceptación y evidencia se distinguen de commit, merge, publicación o integración, que no se han autorizado ni realizado como parte de este cierre.


## Listados y acciones de preparación 0.6 — CA-24–27

**Estado actual:** T-11/T-12 implementadas y validadas en copia aislada 3.30.0; gate `test:owned` completo superado e incorporación operativa pendiente. El resto de este párrafo conserva el corte inicial de planificación. **Fuente:** [spec 0.6](spec.md#listados-separados-y-acciones-de-preparación-06--2026-11-15), SHA-256 `b6e92f9f36b1fb70637fe9e8297ad8d4e4221e4fcd3026b58a150a27a6c0ffd9`. **Inspección:** 2026-11-15, rama `fix/sidebar-administracion`, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, producto local 3.29.1 y cambios SDD59/60 preservados. PM propone `feature/preparacion-npcs-monstruos`; Q-0010 pendiente al redactar, sin despacho hasta resolver. El permiso Git previo no se amplía por este documento. La versión de entrega será **3.30.0**, porque borrar preparados añade una capacidad compatible; `.ttrpgscene` sigue v2.

### Evidencia y límites de reutilización

`CampaignPanel.CampaignRoute` tiene una ruta `preparation` única y `CampaignNavigation` un enlace combinado. `ArcPreparationPanel` obtiene una página mixta de50, la divide localmente en dos grupos y abre `PreparationForm`, que ya precarga nombre/notas/imagen y conserva binding retenido al editar. `CampaignClient`/`ArcPreparationRepository` ofrecen list/get/create/update/reserve; **no hay DELETE**. `arc-preparation-http.ts` solo admite limit/offset/text; filtrar una página mixta en UI daría vacíos y totales falsos. La extensión backend descrita abajo es necesaria, no opcional.

`scene_preparation_instances` referencia preparados con `ON DELETE CASCADE`; el backfill identifica fichas históricas por propietario/arco/escena/tipo/entidad. Por eso se requiere tombstone: el borrado físico perdería reservas y permitiría recrear la ficha histórica. `transfer.ts` v4 exporta preparados y reservas sin marca de borrado; ignorar esa marca al restaurar resucitaría fichas. La corrección incluye migración/transferencia, conservando documentos de escena y assets.

### Contrato acordado con PM

- Nuevo `PreparedEntityListQuery` y esquema específico: extender `CampaignPageQuery` con `kind?: "npc" | "monster"`. `CampaignClient.listPreparation` y `ArcPreparationRepository.list` reciben ese tipo. GET `/dm/campaigns/:campaignId/arcs/:arcId/preparation?kind=npc|monster` filtra en SQL **antes de COUNT/LIMIT/OFFSET**, combinando texto/tipo y excluyendo tombstones. Sin kind conserva catálogo mixto completo del editor. Tipo inválido se rechaza; no ensanchar query de campañas/arcos ajenos.
- `CampaignClient.deletePreparation(campaignId, arcId, preparedId, revision): Promise<void>`; puerto `remove(campaignId, arcId, preparedId, expectedRevision, idempotencyKey): Promise<void>`. DELETE de la ruta de detalle, cuerpo `{}`, `If-Match` obligatorio y `Idempotency-Key` por `Mutations.send`, respuesta `{ok:true}`. Reutilizar `tx.operation` de `owned-http.ts`; no crear otra deduplicación. Validar IDs/revisión/cuerpo, dueño/campaña/arco y estado activo dentro de la unidad de trabajo existente. Missing/ajeno/borrado usa NOT_FOUND; revisión desactualizada usa CONFLICT; falta de precondición se rechaza como validación, no como éxito o error500. Repetir la misma clave/huella conserva resultado previo; nueva clave sobre ficha ya borrada no restaura ni vuelve a mutar.
- Migración aditiva **11**: columna nullable `arc_preparations.deleted_at`; filas previas quedan activas. DELETE hace UPDATE condicionado por owner/arc/id/revision y `deleted_at IS NULL`, incrementa revisión y actualiza fecha. No editar migración10/checksum previo ni borrar fila, asset, reserva o documento. List/get/update y nuevas reservas excluyen borrados; solicitudes idempotentes confirmadas mantienen la semántica actual de replay. La carrera reservar/borrar debe dejar un orden transaccional definido: si reserva confirma primero conserva snapshot; si borrado confirma primero impide nuevo uso. Inactiva/ajeno tampoco borra mediante ruta directa.
- Backfill conserva detección de filas incluidas tombstones: no quitar marca ni crear duplicado de la misma procedencia. Probar repetición sobre datos sintéticos. No añadir restauración pública.
- **DTO público `PreparedEntityDto` intacto.** Writer operativo v5; lectores1–5. El registro de transporte `prepared-entity` agrega `deletedAt` nullable fuera de `value`; v4 ausente se normaliza a null, v5 lo conserva. Exportar también tombstones y reservas para preservar relaciones/procedencia; import/verify/counts validan marca y consistencia sin exponerla al listado público. Mantener hash/límites/owners/bindings del formato operativo. El umbral de introducción de jerarquía es **4**, separado de versión writer5: sustituir comparaciones al CURRENT que hoy rechazarían registros v4, omitirían sus validaciones o ejecutarían backfill legado por error. Backfill de import sigue reservado a versiones<4/legado; `export-legacy` conserva su formato anterior. Roundtrip v5 no reactiva preparados borrados; lectores v1–4 y catálogo sin tombstones siguen compatibles.

### Frontend y UX acordados

Consulta **TL-59-06 / UX-59-06** con `/root/ux_spec59`, 2026-11-15; [ficha UI-006](../../guias/ui-ux/catalogos-preparacion-arco.md), enlazada desde [catálogo](../../guias/ui-ux/catalogo.md) y mantenida por UX. Dos rutas internas discriminadas `npcs` y `monsters`, con campaignId/arcId; no nuevas URLs públicas ni estado paralelo. Actualizar todas las comprobaciones de contexto de `CampaignPanel` y la navegación de historias. Cada vista pasa `kind` fijo a `ArcPreparationPanel` y mantiene una hoja activa, migas y foco de h1. La ruta combinada es interna, sin contrato externo que migrar.

Reutilizar `PreparationForm` y `ServiceDialog`; la lista ocupa ancho completo, cada fila es composición semántica con miniatura/placeholder, nombre, resumen de notas y procedencia; monstruos agregan nombre de plantilla disponible o «Plantilla no disponible», sin IDs crudos/stats. Resumen recortado solo visualmente, texto seguro; no interpretar HTML sin sanitización ni modificar notas almacenadas. Miniaturas usan referencias de assets privados existentes, con placeholder ante ausencia/error; no transformar rutas heredadas en accesos a filesystem ni fetch remoto arbitrario.

CTA **Agregar NPC / Agregar monstruo** en cabecera derecha, adaptable a estrecho; monstruo sin plantillas explica limitación y deshabilita alta, sin impedir editar binding retenido. Cada fila reutiliza patrón `HeaderDropdown` con «Acciones de {nombre}», Editar/Borrar. No cambiar el dropdown global/editor salvo necesidad acordada: estilos de fila acotados, foco/Escape/cierre ya existentes. Editar abre formulario con todos los campos existentes, clave por ID/contexto y revisión correcta; getPreparation puede refrescar datos antes de abrir, sin perder entradas ante error. Cancelar no escribe. Estado inactivo oculta alta/edición/borrado; no inventar campos de reglas.

Borrar usa `ServiceDialog`, Cancelar con foco inicial, nombre y texto: «Borrar {nombre} del catálogo de este arco. Las copias ya utilizadas en escenas se conservarán.» Sin prometer eliminación física ni restauración visible. Pending deshabilita confirmación repetida; error/conflicto mantiene diálogo y permite cancelar/recargar sin sobrescribir. Éxito actualiza/refresca página, anuncia resultado y enfoca siguiente fila o encabezado si vacía; no restaurar foco al botón eliminado. Si queda página vacía y offset>0, volver a página válida y recalcular total del tipo. Crear/editar refresca orden/paginación confirmados: no agregar a ciegas una fila51 ni alterar total con respuestas tardías.

`ArcPreparationPanel` actual carece de descarte de solicitudes tardías. Añadir generación/live para carga y callbacks de guardar/borrar; clave/contexto incluye cliente/cuenta por composición, campaña/arco/tipo. Al cambiar contexto, cerrar formulario/confirmación, resetear offset/estado y no permitir que una respuesta anterior rellene otra lista. Desmontar/recrear solo preparación por contexto es válido; no remontar AdminShell/editor. Mantener respuestas y errores autoritativos del servidor, sin optimismo que borre la fila antes del ACK.

### Responsabilidad, secuencia y plataformas

**T-11 backend** posee contrato compartido, cliente HTTP, migración/repositorio/handler/backfill/transfer y sus pruebas. **T-12 frontend** posee rutas/listas/formularios/CSS/tests/historias y versión/changelog. PM conserva spec/guías de operación/validación; TL plan/tareas; UX fichas. Tras firma del contrato y rama preparada, T-12 puede trabajar con fixture tipada en paralelo a T-11, sin editar DTO/cliente ni sus tests. Integración y cierre T-12 esperan T-11 con contratos reales. No hacen falta nuevos puertos del renderer o cambios al editor.

Grafo sin ciclos: `{T-10, spec0.6, Q-0010/rama} → T-11.contrato → {T-11.persistencia/transfer, T-12.UI}`; `{T-11.validación, T-12.UI} → T-12.integración/QA PM`. Builds, DB temporales y outputs compartidos se secuencian o aíslan; PM decide concurrencia y despacho. Ninguna autorización para migrarDB operativa8787 ni bases reales.

Navegador/Electron servicio DM comparten UI/HTTP; editor consume mismo endpoint sin kind, mantiene controles y snapshots ya materializados. Autónomo no recibe catálogo remoto ni API nueva; build/diff del árbol local justifican no modificación, no equivalen a smoke ejecutado. Admin/invitado no ganan acceso privado. Servidor mantiene Host/Origin/cookies, propietario, transacciones SQLite/PostgreSQL, revisión/idempotencia y validación de commit; no cambia SSE/apertura/proyección ni políticas de publicación.

### Validación y matriz de cierre

| Criterio | Tareas | Prueba/entorno | Evidencia esperada |
| --- | --- | --- | --- |
| CA-24 | T-11 + T-12 | Más50 registros mixtos, kind opcional/incorrecto, count/page filtrados; cambio rápido NPC/monstruo/arco con respuesta tardía | Contrato SQLite/PostgreSQL, cliente y test UI; navegación real con activo/migas correctos |
| CA-25 | T-12 | Listado vacío/carga/error, nombres/notas largos, miniatura ausente, plantilla retenida; CTA/acciones y teclado a390/960/1440 y zoom200% | Historias reales aisladas y capturas/medidas sin overflow |
| CA-26 | T-11 + T-12 | Crear/editar precargado/cancelar/error/conflicto; DELETE sin revisión/ajeno/inactivo/replay/carrera reservar; borrar último de página | API/DB reales temporales, frontend y recorrido CRUD sintético; escenas/reservas/asset intactos |
| CA-27 | T-11 + T-12 | Migración10→11/repetida/checksums; backfill tras borrar; roundtripv5 con tombstones/reservas y compatibilidadv1–4; editor sin kind | Contratos/fixtures, regresiones/builds, QA navegador/Electron servicio, evidencia0.6 separada |

Comandos previstos, **no ejecutados por TL**:

```sh
pnpm test src/shared/contracts/campaigns.test.ts src/infrastructure/browser/campaign-client.test.ts --exclude '**/.local/**' --maxWorkers 4
pnpm test:owned src/infrastructure/server/owned/arc-preparation.contract.ts src/infrastructure/server/owned/transfer.contract.ts
pnpm test:db
pnpm test:owned
pnpm test src/web/campaigns/ArcPreparationPanel.test.tsx src/web/campaigns/CampaignPanel.test.tsx src/web/campaigns/CampaignCatalog.test.tsx src/web/AdminShell.test.tsx src/web/ServiceApp.test.tsx src/web/HeaderDropdown.test.tsx src/renderer/src/components/aside/ArcPreparationUseSection.test.tsx --exclude '**/.local/**' --maxWorkers 4
pnpm typecheck
pnpm lint
pnpm build:api
pnpm build:web
pnpm build
pnpm build-storybook
```

`test:owned` exige PostgreSQL temporal real/TLS incluso al importar fixture SQLite: `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE`; no sustituir por skips o mocks. Ejecutar gates en checkout/copia aislada sin `.env` operativo cuando fixtures/builds lo requieran; conservar el archivo del usuario. Ajustar expectativas de versión migratoria afectadas sin debilitar contratos; suite DB/owned integrada es barrera de cierre por cambio persistente/transferencia. No repetir suites no afectadas solo para sumar checks. PM puede reutilizar entorno sintético dedicado, actualizándolo con migración nueva únicamente sobre sus datos de prueba.

**Revisión documental:** rutas fuente contrastadas; esquemas/componentes/rutas nuevos señalados, CA-24–27 cubiertos, ownership disjunto y grafo sin ciclos. No quedan decisiones funcionales pendientes de TL; la precondición de rama sigue a cargo de PM. Alcance sustituye solo preparación combinada de UI0.5, preservando cortes anteriores y sin declarar implementación/validación realizada.


### Aislamiento del watcher operativo — condición de ejecución 0.6

PM informa que el usuario mantiene `start:api` vigilando este checkout y sirviendo 8787 desde `out/dev-service/api` (proceso padre 41540 observado por PM el 2026-11-15). La inspección posterior del watcher confirma que editar backend/migraciones aquí reinicia el servicio, pero no ejecuta migraciones: la API nueva falla con MIGRATION_REQUIRED sobre esquema10. Incorporar el corte requiere migración11 explícita; ni rama Git ni validación sintética autorizan esa operación sobre datos reales. No modificar watcher, `.env`, locks, DB o configuración de producto como atajo.

T-11 y T-12 deben ejecutarse en **una copia de trabajo de filesystem aislada preparada por PM**, con los cambios locales actuales preservados, sin usar `.env`, `.local`, bases, outputs ni procesos operativos; dependencias/outputs y puertos propios. No crear worktree Git bajo esta decisión. Las rutas de ownership de tareas son relativas a esa copia, cuya ruta y baseline PM proporciona al despachar. No sincronizar automáticamente de vuelta durante construcción. PM compara huellas de origen antes de incorporar para no sobrescribir cambios concurrentes del usuario.

Entrega técnica: diff revisable, manifiesto de archivos/base y validación completa en la copia. **Incorporar backend/migración al checkout vigilado sigue siendo un paso operativo separado**: mientras el watcher esté activo, diferir esa escritura hasta que PM disponga de autorización explícita para coordinar su detención y la actualización/migración real que corresponda. No dejar procesos suspendidos con SIGSTOP ni presentar copia aislada como servicio actualizado. El permiso de creación de rama Q-0010 no autoriza por sí solo intervenir datos o procesos operativos. Una incorporación parcial UI no debe anunciar acciones que la API actual no implementa; se recomienda integrar el corte compatible completo tras resolver la condición operativa.


**Preparación de ejecución 0.6 (2026-11-15):** rama `feature/preparacion-npcs-monstruos` preparada desde la base inspeccionada, conservando cambios locales. La precondición de rama del plan queda resuelta; implementación y validación se ejecutarán en la copia aislada prevista. La incorporación al servicio operativo sigue siendo un paso separado.


### Entrega técnica aislada y revisión dirigida 0.6 — 2026-11-15

T-11 y T-12 están **implementadas y validadas en la copia `/private/tmp/ttrpg-preparation59-06-rnp3g6p8`, versión 3.30.0**. Q-0010 quedó resuelta con autorización humana y PM preparó `feature/preparacion-npcs-monstruos`, conservando cambios locales. Este estado sustituye los estados iniciales de planificación/implementación anteriores, que se conservan como historia; no equivale a incorporación al checkout vigilado ni actualización del servicio operativo.

La revisión TL de solo lectura sobre contrato, migración11, borrado lógico, exclusión de tombstones, transacción/autoridad/idempotencia, reservas, backfill y transferencia encontró dos P2, ambos cerrados por inspección posterior de las correcciones: el lector v4 rechaza `deletedAt` antes de normalizar registros auténticos sin ese campo; `verifyTransfer` compara también `deleted_at` contra el metadato transferido. Se incorporó el caso de destino con tombstone alterado a NULL que debe rechazarse como CORRUPT. No quedan bloqueos en esta revisión dirigida; no constituye una auditoría general ni ejecución de pruebas por TL.

El borrado usa ahora placeholders SQL distintos para `deleted_at` y `updated_at`, con el mismo valor temporal enviado en ambas posiciones. Esta corrección de compatibilidad del adaptador conserva el UPDATE revisionado y parametrizado; PM informa que pasó los contratos dirigidos. Se mantienen writer operativo5, lectores1–5 y umbral de jerarquía4, sin cambiar `.ttrpgscene` v2.

Resultados comunicados por PM para el corte aislado: **40 pruebas owned dirigidas, 32 DB, 14 de contrato/cliente, 19 UI y 69 de regresión, todas superadas**; también `typecheck`, `lint` y builds API/web/Electron/Storybook superados. Son resultados recibidos de los ejecutores/PM, no comandos ejecutados por TL. **Cierre posterior comunicado por PM: `pnpm test:owned` completo superado, 82/82 pruebas en ocho archivos, 467.88 s**, registro `t11-test-owned-full.log`. Este resultado cierra el gate que estaba pendiente en el corte dirigido anterior. PM mantiene el cierre de QA, la [validación](validacion.md), evidencia 0.6 e índice; este registro no certifica recorridos nativos o visuales adicionales.

La incorporación del corte compatible completo al checkout original vigilado queda **pendiente de permiso operativo separado y coordinación PM**. No se migró la DB real ni se autoriza detener/modificar el watcher, copiar producto automáticamente, integrar Git o publicar. La validación de la copia no presenta el servicio del usuario como actualizado.


### Incorporación operativa autorizada — 2026-11-15

Después de completar la entrega revisable y todos los gates, el usuario autorizó expresamente el respaldo integral, incorporación de28 archivos conservando cambios locales, migraciónSQLite10→11 y reinicio/verificación del servicio local. PM despachó T-13 al backend para ejecución controlada; resultado pendiente al registrar la orden. Esta autorización resuelve la condición operativa anterior, sin autorizar Git add/commit/push/merge ni publicación. Se conservan las instrucciones de aislamiento como evidencia de la construcción previa.


**Cierre operativo T-13:** autorización aplicada, respaldo íntegro verificado,28 archivos incorporados con huellas coincidentes, builds reales correctos, SQLite10→11 con30 proyecciones de contenido preservadas y API8787 reiniciada en3.30.0. [Validación final y límites](validacion.md#incorporación-operativa-completada--2026-11-15). No se escribió historial Git ni se generó DMG.


## Breadcrumbs de administración 0.7 — CA-28

**Corte de planificación, 2026-11-15:** corrección solicitada por el usuario y delimitada por PM; fuente CA-28 en actualización por PM. Base de producto inspeccionada 3.30.0 tras T-13, rama comunicada `feature/preparacion-npcs-monstruos`. Rama `fix/…` aún pendiente de autorización/preparación PM al redactar; no ejecutar implementación antes de esa precondición. Entrega prevista patch **3.30.1**. Conserva todos los cambios e historia anteriores.

**Causa observada:** `CampaignPanel.tsx:47` renderiza Campañas/campaña/arco siempre como botones; solo NPCs/Monstruos son hoja textual actual. En `service.css`, `.service-page button:not(.shared-switch)` tiene especificidad `(0,2,1)` y prevalece sobre `.campaign-breadcrumbs button` `(0,1,1)`, dejando fondo, borde y padding de botón pese a la intención visual de enlace. La corrección afecta únicamente las migas administrativas.

**Diseño mínimo propuesto en consulta TL-59-07:** conservar `nav` con nombre accesible, callbacks de navegación por estado y rutas existentes. Ancestros: `button type="button"` visualmente de enlace subrayado, sin fondo/borde/sombra de control y con foco visible; no inventar `href`, cambiar router ni usar roles ficticios. Último segmento: `span aria-current="page"`, sin subrayado, sin acción ni parada Tab. Campañas es hoja en raíz; campaña en arcos; arco en escenas; NPCs/Monstruos en sus rutas. Para detalle de escena se propone añadir nombre de escena validado como hoja (o etiqueta neutra durante carga); arco sigue navegable, sin nueva ruta. No exponer nombres de contexto anterior durante carga/error. Separadores decorativos conservan `aria-hidden`. Consulta enviada a `/root/ux_spec59`; acuerdo/ficha se registra a continuación cuando llegue.

Resolver la cascada con selector contextual de breadcrumb que iguale/supere la especificidad vigente, definido después de la regla base; acotar también el aspecto hover/focus y la hoja actual. No cambiar el estilo global de botones, controles compartidos, sidebar, editor o formularios. No perder outline de teclado al retirar apariencia de botón. Texto largo y wrap deben mantener lectura sin desbordar a390px. No extraer un sistema genérico de navegación para este ajuste.

**Secuencia y propiedad:** T-14 único frontend_builder propuesto, una vez CA-28 y rama fix estén preparados por PM; modificación de componente/estilo → comprobaciones dirigidas → patch/changelog → QA PM. TL solo plan/tareas; UX ficha; PM spec/evidencia/Kanban. Sin paralelismo sobre producto ni dependencias de API/DB. Grafo: `{T-13, CA-28, acuerdo UX, rama fix} → T-14 → QA PM`.

**Validación proporcional:** reutilizar `CampaignPanel.test.tsx` y `CampaignCatalog.test.tsx` para navegación y actuales; añadir únicamente cobertura observable de hoja no interactiva y callbacks de ancestros, sin tests que repliquen CSS. Ejecutar tests dirigidos, `pnpm typecheck`, `pnpm lint`, `pnpm build:web`; `pnpm build-storybook` si cambia la historia. Comprobar en navegador real dentro de `.service-page` estilos calculados de fondo/borde/subrayado (jsdom no certifica la cascada), hover/foco/Tab y click en ancestros a390/1440px, con nombre largo. Verificar las seis rutas indicadas, un único `aria-current` dentro del breadcrumb y conservación de la navegación/foco del panel. Reutilizar historia `Composiciones/CampaignPanel` con fixture sintética; no API real ni datos del usuario. Navegador/Electron servicio comparten componente; editor/autónomo quedan sin cambios. No suites completas, contratos DB, migraciones ni smoke general para esta corrección visual.

**Estado:** tarea definida para revisión PM; consulta UX y rama fix pendientes al redactar. CA-28→T-14→prueba semántica/navegación + inspección visual de cascada. No producto, pruebas ni comandos Git ejecutados por TL.

**Acuerdo UX recibido:** `/root/ux_spec59` confirmó el contrato y lo documentó en [UI-003](../../guias/ui-ux/campanas-arcos-escenas.md#ajuste-de-migas-07--ca-28). Detalle de escena usa el nombre cargado o «Detalle de escena» como texto neutro. CA-28 ya está registrada en la spec; solo quedaba pendiente la autorización de rama antes de despachar implementación.

**Ejecución autorizada:** el usuario autorizó la rama correctiva y PM creó `fix/breadcrumbs-administracion` conservando todos los cambios locales. T-14 despachada a `/root/frontend_breadcrumbs07`; precondiciones resueltas. No hay autorización de add/commit/push/merge ni nuevas operaciones sobre datos reales.

**Cierre T-14:** implementación y QA proporcional completadas en3.30.1:17 pruebas, checks/build web y seis rutas de navegador a390/1440px, con foco y navegación preservados. [Evidencia0.7](evidencia-ui-0.7.json). No se modificaron API, datos, editor ni historias; integración Git pendiente.


## Escenas en el menú de campaña 0.8 — CA-29–31

**Plan listo para revisión PM, 2026-11-15.** Fuente: [spec0.8](spec.md#escenas-en-el-menú-de-campaña-08--2026-11-15), CA-29–31; base actual comunicada por PM `fix/breadcrumbs-administracion`, producto3.30.3 y cambios locales previos preservados. Entrega minor **3.31.0**. PREP-08/Q-0013 pertenece a PM: autorización de `feature/escenas-menu-campana` o continuación de rama actual pendiente al redactar; no despachar producto antes de resolver. No sobrescribe cierres históricos ni requiere backend nuevo.

### Recorrido y contrato mínimo

Explorer `/root/explore_campaign_menu_scenes` confirmó API suficiente: `CampaignClient.listArcs(campaignId,{limit,offset})` y `listScenes(campaignId,arcId,{limit,offset})`, `CampaignPage` con default50/max100. No existe listado directo de todas las escenas de campaña; no usar catálogo global ni cargar documentos/previews para construir el menú. Reutilizar sus DTOs y validación HTTP. Recorrer todas las páginas de arcos y luego las escenas de cada arco; solicitudes secuenciales o concurrencia pequeña acotada, sin Promise.all ilimitado. Preservar orden recibido; ignorar duplicados de la misma asociación si una página repetida los entrega. No deduplicar por sceneId entre arcos. Avanzar por elementos recibidos, detectar página vacía/no progreso antes del total como resultado incompleto recuperable y evitar bucle infinito; un fallo parcial no se presenta como catálogo completo.

Carga de metadatos al abrir el desplegable, vigente solo para cuenta/cliente/campaña activos. Invalidar generación al cerrar/suspender/desmontar o cambiar contexto; descartar entregas tardías y detener nuevas páginas. Una carga ya emitida puede finalizar, pero no repoblar menú cerrado/otra cuenta. Volver a abrir/reintentar obtiene catálogo vigente sin polling. No borrar el transporte compartido para cancelar un componente. Campaña inaccesible/inactiva, `writeBlock` y autoridad se mantienen sujetos a validación del servidor, no a visibilidad del menú.

`ServiceApp.setCampaignSelection` ya construye URL contextual y usa `useServiceNavigation` con guard. Pasar callback tipado a `GameEditor` y delegar en ese único camino; **no invocar además guard.current desde la fila**. Preferir retorno Promise con resultado aceptado/cancelado para controlar pendientes/foco sin prometer éxito anticipado. Capturar cuenta/campaña/contexto al elegir y revalidar antes del commit tras el guard (el hook ya ofrece `beforeCommit`); bloquear doble elección mientras hay transición. La fila actual exacta es no-op, sin nuevo historial, guard ni remonte. No resolver un conflicto de cuenta con replace/salto del guard.

Mantener key de `GameEditor` por cuenta:campaña para conservar apertura/generación/invitación/running. `LiveEditor` hoy usa apertura/generación/sceneId: ampliar a selección completa campaña/arco/sceneId, porque cambiar la misma escena de arco debe renovar `ServiceWorkspace.campaignSelection` y preparación. Validar destino mediante flujo existente antes de montar editor contextual y conservar su liberación de leases/listeners/recursos al desmontar. No llamar start/reopen/rotate/close ni publicar por elegir una escena cuando ya existe apertura vigente. Cancelación o fallo del guard/commit deja URL/editor/selección anteriores; un rechazo remoto posterior a aceptación conserva el fallback de selección bloqueada/reintento existente, sin fingir carga ni abrir escena alternativa. No agregar un mecanismo de rollback del editor aceptado y descartado.

### Acuerdo UX TL-59-08

Consulta con `/root/ux_campaign_scene_menu`: sección «Escenas» agrupada por arco en el dropdown existente; cada asociación tiene una fila y solo el triple actual lleva «Actual»/`aria-current`. Enlace al catálogo **Campañas**; Reabrir/Cerrar mantienen sus confirmaciones. Lista con scroll vertical acotado y acciones de campaña fuera del scroll; nombres largos legibles, separadores/encabezados sin interacción ficticia. Carga, vacío y error con Reintentar pertenecen a la sección, sin ocultar las acciones existentes ni mostrar datos antiguos. Ficha acordada y documentada: [UI-003, extensión del menú0.8](../../guias/ui-ux/campanas-arcos-escenas.md#extensión-del-menú-del-editor-08--ca-2931). PM confirmó el límite de conservar selección ante cancelación/fallo precommit y usar fallback vigente ante rechazo remoto posterior a aceptación, sin rollback nuevo.

Conservar details/summary y Tab/Escape del `HeaderDropdown`, sin role=menu añadido. Enfocar Actual al abrir solo si está disponible o cuando termina carga y el foco sigue en el disparador; no robar foco desde otra acción ni al reintentar. Escape/cierre devuelve al trigger; selección cierra según patrón actual y cancelación del guard conserva escena y foco coherente. `HeaderDropdown` hoy cierra en click capture de cualquier botón: extensión opt-in mínima para Reintentar, más notificación de apertura si hace falta carga lazy; defaults de otros consumidores intactos. Menú inactivo/terminal no entrega selección ni conserva nombres privados.

### Tarea, ownership y validación

Única **T-15 frontend**: componente de sección de escenas reutilizable en producción/historias, pequeño loader/hook específico de metadatos; integración GameEditor/ServiceApp, extensión opcional HeaderDropdown, estilos acotados, pruebas y minor/changelog. No cambios API/DB/IPC/Pixi/formatos ni Electron autónomo. PM evidencia/QA; UX ficha; TL plan/tareas. Grafo `{spec0.8, acuerdoUX, PREP-08/rama} → T-15 → QA PM`, sin tareas backend ni ciclos. Composición navegador y Electron servicio compartida; autónomo sin jerarquía conserva su menú local.

| Criterio | Cobertura T-15 | Evidencia esperada |
| --- | --- | --- |
| CA-29 | Loader paginado: varios arcos/páginas, dos campañas, asociación repetida, vacío/error/progreso detenido y respuesta tardía | Unitarias del loader/componente con transporte sintético; todas las asociaciones correctas sin documentos |
| CA-30 | ServiceApp/guard y GameEditor: cancelar/aceptar, doble selección, misma asociación no-op, misma escena otro arco, cambio de autoridad mientras espera | Tests de integración: selección contextual exacta, apertura e invitación idénticas; sin endpoints de publicación/reapertura |
| CA-31 | HeaderDropdown y sección real en Storybook: carga/vacío/error/Actual/texto largo/lista extensa, Tab/Escape/foco/Reintentar | Navegador real390/1440 y Electron servicio; controles de campaña visibles, sin overflow; historias aisladas sin App/Pixi |

Comandos proporcionales: `pnpm test src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx src/web/ServiceApp.test.tsx src/web/HeaderDropdown.test.tsx --exclude '**/.local/**' --maxWorkers 4`, añadiendo tests nuevos del componente/loader; `pnpm typecheck`, `pnpm lint`, `pnpm build:web`, `pnpm build`, `pnpm build-storybook`. No suites DB/owned ni migraciones para este cambio de consumo HTTP. QA usa fixtures/datos sintéticos sin publicar contenido del usuario. PM separa checks de mocks, recorrido nativo y revisión de ausencia de cambios autónomos; un build no certifica navegación real.

**Riesgos explícitos:** completitud de páginas sin snapshot transaccional (no garantizar catálogo inmóvil ante cambios concurrentes; selección se revalida), resultados tardíos/guard pendiente, remonte insuficiente por sceneId y efectos colaterales del dropdown compartido. No quedan decisiones API pendientes; PREP-08 es barrera de ejecución. TL inspeccionó código y acordó contrato UX; no ejecutó producto/pruebas/builds/Git.


**Inicio T-15, 2026-11-15:** PREP-08 completada tras autorización humana de rama. `feature/escenas-menu-campana` creada conservando cambios locales; PM `/root` despachó producto a `/root/frontend_campaign_scene_menu`. Implementación/validación en curso; sin permiso de historial Git ni migraciones.


### Cierre de revisión dirigida T-15 — 2026-11-15

TL comprobó por lectura el cierre de los hallazgos del núcleo: selección desde catálogo y desde editor conservan sus entradas; `beforeCommit` acepta efectos `void` existentes y solo cancela ante `false`; paginación consulta vigencia antes/después de cada espera y entre arcos; foco tardío verifica que sigue en el disparador; `busy`/confirmación deshabilitan selección durante operaciones de apertura. La clave completa de `LiveEditor` conserva contexto campaña/arco/escena sin remontar `GameEditor`.

El residual del catálogo queda cerrado: `ServiceApp.setCampaignSelection` limita el no-op al origen editor (`editorMatch`). La URL del catálogo puede conservar los mismos query params del retorno sin impedir abrir otra vez esa escena. Se inspeccionó la regresión añadida en `ServiceApp.test.tsx` para este recorrido. No quedan bloqueos de la revisión dirigida para CA-29/30; no se amplió a auditoría general ni se ejecutaron pruebas por TL.

Resultados recibidos de frontend/PM para el corte final: **55/55 pruebas en cinco archivos**, typecheck, lint y builds web/Electron/Storybook superados. PM comunica guard de navegación aprobado en navegador y recorrido real catálogo→misma escena Santuario→editor correcto. **Electron nativo sigue en QA PM**; este registro no certifica ese recorrido ni anticipa el cierre integral CA-29–31. PM mantiene estado final y [validación/evidencia](validacion.md); TL solo documenta la revisión y resultados recibidos. Sin operaciones Git, migraciones o publicación.


**Cierre integral PM T-15 (2026-11-15):** CA-29–31 validados en3.31.0. Cobertura final ampliada a59/59 pruebas en cinco archivos; typecheck/lint y builds web/Electron/Storybook superados. QA navegador390/1440, guard/cancelación/contexto, apertura e invitación idénticas y recorrido Electron conectado completados. Estados de Storybook/lista larga aprobados. API/Electron sintéticos detenidos y lock/puerto liberados. [Evidencia0.8](evidencia-ui-0.8.json). Sustituye el estado de QA pendiente anterior; sin integración ni datos reales.

## Selector de plantillas 0.9 — CA-32–34

**Estado:** plan completo para revisión/asignación PM, sin ejecución de producto. **Fuente:** [ajuste 0.9 de la spec](spec.md#selector-de-plantillas-con-autocompletado--ajuste-09-2026-11-16), SHA-256 `bb63a65e57edf9a72f7c8556cde5257b6eaac80c7327fd1776dbc74e353e6c0e`. Inspección 2026-11-16: HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, producto 3.32.0, cambios locales extensos SDD59/60/61 conservados. Se comenzó leyendo `feature/spec-61-dados-jugadores`; PM confirmó Q-0023 y preparó `fix/selector-plantillas-autocompletado`, comprobada al redactar. **PREP-09:** condición de rama resuelta por PM; no autoriza historial Git. Este apéndice sustituye únicamente la interacción de Plantilla descrita en T-12, conservando decisiones, contratos y evidencia anteriores.

### Recorrido observado y cambio propuesto

`CampaignCatalog` carga `/dm/systems/selectable`; `CampaignPanel` pasa las plantillas del sistema/versión exactos a `ArcPreparationPanel`. `PreparationForm` filtra por nombre y dibuja radios con `matchingTemplates.slice(0, 10)`: el resto de candidatos no es alcanzable sin afinar búsqueda. El `Select` de `components/ui/Controls.tsx` es nativo, sin búsqueda. Se propone **`SearchableSelect`** React nuevo, con su CSS y pruebas propios en ese directorio, adoptado por el formulario real y por Storybook. No hace falta jQuery, Select2 ni dependencia nueva; no se modifica el contrato del select nativo ni se migran otros selectores.

La confirmación local actualiza solamente `templateId`. Guardar sigue por `CampaignClient.createPreparation/updatePreparation` → `arcPreparationRoute` y esquemas compartidos → puerto `ArcPreparationRepository` → repositorio transaccional existente → DTO confirmado → `afterSaved`. El repositorio preserva binding si PATCH no incluye sustitución y valida disponibilidad ante una nueva selección. No cambian esos contratos, adaptadores ni almacenamiento. La propuesta elimina lógica visual duplicable, no extrae un caso de uso nuevo.

**Contrato del control propuesto:** `options: readonly { id: string; label: string }[]`, `value: string | null`, `onChange(id: string)`, etiqueta/nombre accesible, `disabled`, texto de vacío, y `fallbackLabel` para un valor retenido no elegible. Permitir asociación de ayuda/error mediante `aria-describedby`; generar IDs DOM únicos, sin usar etiquetas como identidad. Consulta, apertura y opción activa pertenecen al control; ID confirmado pertenece al formulario. Un texto libre nunca se convierte en ID. `fallbackLabel` puede representar la ficha retenida incluso con `value === null`; es texto visual/accesible, no una opción inventada. El formulario decide cuándo aplicarlo y mantiene sus reglas de guardado.

### Acuerdo UX y ciclo de vida

Consulta **UX-SDD59-09**, acordada por TL `/root/tl_template_combobox` y UX `/root/ux_template_combobox`; ficha [UI-007](../../guias/ui-ux/selector-plantilla.md), escritura documental a cargo de UX. Se reutiliza UI-006 para el resto del formulario. No se requiere prototipo HTML: las historias del control productivo y su consumidor constituyen el laboratorio verificable.

- Una entrada con etiqueta **Plantilla** y chevrón decorativo con espacio propio; el foco inicial del modal sigue en Nombre. Foco por Tab no abre por sí solo. Clic, ArrowDown, Alt+Down o escritura abren; al abrir sin consulta mostrar opciones completas y permitir reemplazar el texto seleccionado de la elección actual.
- Filtrar por nombre mantiene la identidad confirmada. Clic/Enter sobre opción activa confirma; Enter dentro del control no envía el formulario. No confirmar durante composición IME. ArrowUp/Down recorren candidatos y mantienen visible la opción activa dentro del scroll; Home/End conservan edición del texto.
- Escape con lista abierta previene el comportamiento nativo, cierra y restituye etiqueta confirmada, manteniendo el modal. Con lista cerrada se conserva Escape del diálogo. Tab cierra sin elegir y se propaga al trap de foco de `ServiceDialog`. Clic exterior cierra sin elegir; confirmar con puntero mantiene foco en la entrada. No hay tab stops de opciones.
- `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`; lista `role="listbox"`, opciones con identidad estable y `aria-selected` del valor confirmado. `aria-activedescendant` solo apunta a una opción montada/activa. Contador «N resultados» y vacío «No hay plantillas coincidentes», sin confundir foco con selección. Etiquetas seguras como texto React.
- Lista de altura acotada (~240 px) con scroll para **todas** las coincidencias, sin corte silencioso a diez. Ancho del campo, nombres con envoltura y sin overflow a 390 px/zoom 200 %. Popup dentro del `<dialog>`, sin portal a body; puede ocupar flujo bajo el campo para evitar recorte por `overflow:auto`. No alterar el diálogo compartido para un problema local de posicionamiento.
- `disabled={busy}` impide editar/confirmar durante guardado/subida, cierra popup pendiente y no dispara `onChange`. Cambiar `value` externamente sincroniza la etiqueta; cambiar opciones elimina una referencia activa inválida sin seleccionar otra automáticamente. Desmontaje limpia cualquier listener/timer; no se añaden búsquedas remotas ni debounce asíncrono.
- Ficha retenida ausente o `templateId:null`: mostrar «Plantilla retenida (no disponible)» y el aviso actual. Guardar sin sustitución omite **ambos** `templateId` y `binding`; elegir una vigente explícitamente permite enviar ambos. Alta sin ID confirmado permanece sin Guardar habilitado; búsqueda o blur no habilitan alta.

### Seguridad, modos y operación

DM autenticado en navegador/Electron servicio consume la misma UI y cliente HTTP. Opciones y nombres recibidos son datos, no autoridad: servidor sigue validando dueño, campaña activa, revisión, sistema y disponibilidad. El control no accede a secretos, filesystem, SQL ni preload y no expone plantillas al jugador/admin. Electron servicio conserva aislamiento sin preload privilegiado. Autónomo no monta el panel de campañas: no se cambia su editor ni se añade adaptador local. Sin alteración de núcleo de dominio, SSE, aperturas, GPU, escenas portables, migraciones SQLite/PostgreSQL ni transacciones.

PM puede despachar **T-16** sobre el checkout preparado, con un único propietario de producto: los archivos previstos pertenecen solo al grafo web. Lectura de `scripts/watch-service.mjs` confirma que un rebuild web no reinicia una API ya activa; no escribir backend/configuración/.env. `src/server/index.ts` importa `package.json`, por lo que el bump puede recompilar/reiniciar la API. **PM posee `package.json`/`CHANGELOG.md` y coordina ese último paso después de validar y comunicar su efecto operativo**; entrega patch prevista 3.32.1 si sigue base3.32.0. No disfrazar ese reinicio como una edición UI inocua: puede perder estado efímero de mesa. No se pide ni ejecuta migración, build de publicación, cambio de watcher o servicio durante esta planificación.

### Propiedad, secuencia y validación

Grafo sin ciclos: `{spec0.9, PREP-09, acuerdo UI-007} → T-16.control → T-16.formulario/historias → T-16.checks/QA → cierre PM/versión`. Son pasos de una tarea completa, no despachos independientes. PM/UX pueden mantener evidencia/ficha en paralelo al dueño frontend, sin editar sus archivos; builds de `out/` y `storybook-static/` se serializan. No hay tarea backend ni barrera de migración.

| Criterio | Tarea / comprobación | Entorno y evidencia esperada |
| --- | --- | --- |
| CA-32 | T-16: selección explícita, query/ID independientes, blur/Escape sin cambios, opción posterior a décima alcanzable | Prueba del control y recorrido de lista larga en navegador 390/1440 px |
| CA-33 | T-16: alta, edición, retenida ausente y null; payload sin sustitución; Enter/IME/Escape/Tab; busy y cambio de opciones/value | Unitarias/consumidor, más diálogo nativo real Chrome o navegador embebido equivalente; mocks de dialog no certifican cancel nativo |
| CA-34 | T-16 + cierre PM: primitiva y composición productivas con selección, búsqueda, vacío, larga, retenida y disabled | Storybook sin API/Pixi/Three; tema/flecha/texto, teclado/zoom200%; comandos y patch registrados por ejecutor |

Comandos propuestos, **no ejecutados por TL**:

```sh
pnpm test src/renderer/src/components/ui/SearchableSelect.test.tsx src/web/campaigns/ArcPreparationPanel.test.tsx --exclude '**/.local/**' --maxWorkers 4
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build
pnpm build-storybook
```

`SearchableSelect.test.tsx` es nuevo. Conservar regresiones existentes de NPCs/CRUD/contexto del panel; añadir cobertura observable del control y payloads, sin reescribir suites no afectadas. `build-storybook` ya incluye guarda de imports. Chrome o navegador embebido equivalente: crear y editar monstruo mediante el consumidor real con fixture de Storybook, elegir candidato >10, cambiar búsqueda sin confirmar, restaurar selección y guardar; retenida sin catálogo y con ID null; error de guardado conserva elección; Escape primero lista y luego modal; Tab/Shift+Tab sin fuga, opciones largas y 200 %. No utilizar datos de usuario ni levantar servicio/DB para estas mutaciones QA. Por decisión PM, Electron servicio queda cubierto por identidad del componente compartido, con ausencia de smoke nativo declarada como límite, sin gate adicional. Admin/invitado: revisión de límites de montaje sin nuevas rutas; autónomo: identidad del árbol no afectado y build, consignados como evidencia estática. No corresponde ejecutar `test:owned`/DB: no se modifica su contrato ni persistencia; ampliar alcance exigiría replantear los gates.

**Verificación documental TL:** fuentes y contratos contrastados; rutas nuevas identificadas; CA-32–34 cubiertos; propietario único, dependencias íntegras y sin ciclos. Pendiente solamente ejecución/asignación y evidencia de producto por PM; decisiones de interacción resueltas. No se ejecutaron pruebas, builds, servicios, migraciones, Git ni implementación. Este plan no certifica la corrección anterior de `/partidas`, excluida expresamente.


## Escenas propias de cada arco 0.10 — CA-35–40

**Estado:** plan listo para revisión y despacho PM; no representa ejecución. Fuente: [spec0.10](spec.md#escenas-propias-de-cada-arco--revisión-010-2026-11-17), hash SHA-256 `729921766ef16290b5638426dbe9a7deb6bedaafc49ba24ad54d3210c497909e`, fecha2026-11-17. Base observada3.32.2, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, rama autorizada `feature/escenas-propias-por-arco`, con cambios locales anteriores preservados. Este apéndice sustituye el modelo de asociación M:N de la base0.2 y del menú0.8; no invalida su evidencia histórica.

**Separación operativa obligatoria:** producto y pruebas solo en `/Users/minrock/Projects/ttrpg-effects-staging/sdd59-arc-scenes-20261117`, copia sin `.env`/`.git`, con `node_modules` enlazado a dependencias existentes. No editar el destino del symlink ni reinstalar dependencias. El checkout original puede estar servido por `start:api`: nadie modifica sus fuentes de producto, versión, configuración ni DB durante T-17/T-18/T-19. PM conserva baseline en `.local/validation/arc-scenes-exclusive/stage-baseline.json`. TL/UX/PM escriben únicamente sus documentos en SDD original; PM los refleja en la copia. Incorporación y migración real son T-20 separada, sujeta a permiso final.

### Recorrido observado y cambio

- `CampaignPanel.AttachScene` lista recursos globales y llama `CampaignClient.attachScene` → `campaignRoute` → `campaigns.attachScene`; la creación actual reutiliza esa asociación. `arc_scenes` permite varios arcos por escena y `game_resources` varias campañas. El nuevo acceso usa directamente `NewScene`/`createScene` y la creación materializa recurso, vínculo al único arco y vínculo a su campaña en la misma transacción.
- `ownedRepositories.links.link` es otra entrada: publicación/guardado de borrador la usan y `reflectLegacySceneLink` siempre añade arco inicial. Debe validar/conservar el dueño existente: enlace a misma campaña no cambia arco; otro destino se rechaza. La validación de mesa `links.validate` tampoco puede autorizar una escena cuyo arco pertenece a otra campaña solamente porque el sistema sea compatible.
- El botón del screenshot es `SceneMapsSection.onImportScene` → `DmAsidePanel.onImportSceneAsMap` → `App.handleImportSceneAsMap`. Retirar ese acceso y código UI que quede muerto; no eliminar importación portable general, adaptadores/IPC ni las acciones homónimas de entidades.
- BrowserClient recibe hoy `gameId` sin arco; `DraftContext` y confirmaciones guardadas no incluyen arco. Extender el destino de comandos nuevos, no exigir reescritura destructiva de checkpoints antiguos. Las escenas siguen siendo documentos v2 independientes de React/DB; IDs de mapas/entidades, assets y bindings no se deduplican por nombre.

### Contrato backend/frontend para esta entrega

| Entrada | Contrato acordado |
| --- | --- |
| `POST /dm/campaigns/:campaignId/arcs/:arcId/scenes` | Conserva payload `CreateArcSceneInput` y respuesta `ArcSceneDto`; crea ID nuevo exclusivamente en ese arco. Reintento con la misma clave devuelve el resultado confirmado, no duplica. |
| `POST /dm/scenes` y `/dm/scenes/import` | Conservan `name`, `scene`, `bindings?`; agregan **`campaignId: UUID` requerido**, `arcId?: UUID`. La respuesta `resource` permanece igual. Sin campaña: error validado y cero inserciones. Sin arco: crear en inicial de la campaña como compatibilidad legada; con arco: validar pertenencia/actividad. |
| `PUT /dm/scenes/:sceneId` | Payload/respuesta actuales. Conserva ID y padre; valida propietario/campaña activa. No crea enlaces adicionales. Un recurso histórico no asociado conserva lectura/exportación; no se le elige padre silenciosamente. |
| Confirmación de borrador | `DraftConfirmation.payload` añade **`targetArcId?: UUID`**. Campos restantes, respuesta y `DraftCheckpoint.schemaVersion=1` permanecen. No hacer obligatorio arcId en `DraftContext`, ni cambiar la identidad del slot de recuperación. |
| Borrador update | Resolver arco único de la escena; exigir misma campaña y, si llega `targetArcId`, ese mismo arco. Mantener revisión base/secuencia/recibo; error no descarta respaldo. |
| Borrador copy/new | ID nuevo en `targetArcId` validado; si falta, derivar arco de escena fuente existente de la misma campaña; si no es posible, inicial de destino. Se conserva la desconexión de enlaces de copia mediante `detachedScene`. No mover ID fuente. |
| Cliente contextual | `createBrowserClient(..., owned)` admite `owned.arcId?: string`, pasado desde `GameEditor.selection?.arcId`. Envía destino en creación/importación y `targetArcId` en confirmación. Dependencias memo/contexto deben cambiar al cambiar selección, sin respuestas tardías de otra escena. |
| Asociación retirada | El endpoint antiguo `POST .../arcs/:arcId/scenes/:sceneId` no inserta vínculos. Retirar `attachScene` del puerto público/cliente; separar un método interno de asignación para creación. Usar un error HTTP estable documentado por backend y comprobarlo; el frontend nuevo no invoca esta ruta. |

Backend es dueño de los tipos/esquemas compartidos: puede introducir un schema específico de creación contextual sin cambiar `sceneInputSchema` legado usado por otros modos. Comunica exportaciones y códigos concretos al PM antes de habilitar el tramo cliente de T-18. Errores de exclusividad deben ser reconocibles (409), sin exponer SQL, rutas ni recursos ajenos. La falta de destino es validación; destinos ajenos/inexistentes conservan el comportamiento no revelador de autorización. El código histórico `SCENE_SHARED_INACTIVE` puede mantenerse como compatibilidad de tipos antiguos, pero el flujo nuevo bloquea por la única campaña propietaria.

### Persistencia, concurrencia y transferencia

Migración **12**, nueva y con checksum: preflight dentro de la transacción de migración, luego índice único `arc_scenes(owner_id,scene_id)` e índice único parcial `game_resources(owner_id,resource_id) WHERE kind='scenes'`. Preflight detecta M:N, vínculos de campaña contradictorios, arco/escena inexistentes y asociaciones sin vínculo consistente. Ante ambigüedad aborta con diagnóstico seguro que indica preservar respaldo y resolver la jerarquía explícitamente; no clona, borra ni decide dueño. No modificar migraciones1–11. Recursos históricos sin vínculos no se asignan arbitrariamente.

La unicidad cubre carreras reales; los guardas del repositorio y la comprobación final transaccional verifican campaña del arco, actividad, propiedad y compatibilidad de sistemas. No sustituir constraints por un `SELECT` previo vulnerable a carrera. Creación/confirmación comparten unidad de trabajo, idempotencia y límites existentes. Publicar/enlazar una escena de arco no inicial no añade el inicial. Fallo o COMMIT incierto conserva el protocolo actual de recuperación/recibos; no informar éxito anticipado.

Transferencia operativa conserva formas v1–v5 mientras no se agreguen campos de paquete. `inspectTransfer` valida exclusividad en registros de arco y vínculos de catálogo; versiones anteriores a4 requieren comprobar los vínculos que el backfill convertiría en arcos iniciales. Paquetes M:N se rechazan con diagnóstico propio antes de escrituras funcionales; la transacción sigue siendo la última barrera y confirma rollback ante cualquier fallo. Paquetes válidos conservan IDs, contenido, portadas, preparación/reservas, marcas de borrado, assets y bindings. No clonación ni herramienta de reparación nueva; lectura v1/v2 `.ttrpgscene` no cambia.

### UX y plataformas

Acuerdo con `/root/ux_exclusive_arc_scenes`, [UI-003 ajuste0.10](../../guias/ui-ux/campanas-arcos-escenas.md): **Crear escena** abre `NewScene` directamente; vacío «No hay escenas en este arco»; nombre inicial editable y foco en Nombre; cancelar/errores conservan contexto, pendiente evita doble envío, éxito enfoca tarjeta confirmada. Sin botón Duplicar ni selector de arco nuevo en recuperación. Nombres repetidos permitidos, IDs distintos. El menú conserva agrupación por arco y guardas al cambiar escena. Inactiva permanece de solo consulta.

Navegador y Electron conectado comparten frontend/cliente HTTP y nuevas reglas; Electron autónomo solo recibe retirada del acceso import-as-map del explorador. No mover SQL, filesystem o secreto a renderer/preload. Mantener aislamiento/CSP y publicación explícita. Pixi, formato portable y cámara no se rediseñan; el recorrido real confirma que cambiar mapa/escena sigue hidratando el documento correcto.

### Tandas y propiedad

`PREP-10 + spec/UX → T-17` y, en paralelo, `PREP-10 + spec/UX → T-18(UI independiente)`. Gate interno: `contratos compartidos de T-17 confirmados por PM → T-18(cliente contextual)`. No es necesario esperar toda la implementación backend para retirar el botón o sustituir AttachScene por NewScene. Backend no edita browser/renderer/web; frontend no edita shared/domain/application/server. Tras ambas entregas: `T-17 + T-18 → T-19(validación aislada y paquete revisable) → permiso humano específico → T-20(incorporación operativa)`. No ejecutar suites DB ni builds de salida compartida simultáneamente. El PM despacha; este plan no invoca builders.

### Matriz de validación y evidencia

| Criterio | Tareas | Evidencia mínima |
| --- | --- | --- |
| CA-35 | T-18/T-19 | Explorador sin import-as-map, `Agregar mapa` y acciones restantes; regresión de DmAsidePanel y QA componente/editor. |
| CA-36 | T-17/T-18/T-19 | Dos arcos con nombres iguales/IDs diferentes, editar uno sin alterar el otro; creación/reintento/foco/error;390/1440 y teclado. |
| CA-37 | T-17/T-19 | SQLite y PostgreSQL TLS: segundo arco/campaña rechazados, carrera, misma vinculación no-op, llamadas antiguas sin inserción, propiedad ajena/inactiva; publicación conserva arco no inicial. |
| CA-38 | T-17/T-18/T-19 | Guardado/import/copia desde arco no inicial; update mismo padre; borrador antiguo sin targetArcId, fuente eliminada/lienzo nuevo, conflicto y pérdida de respuesta sin perder copia. |
| CA-39 | T-17/T-19 | Migración11→12 válida y repetición; M:N/incoherencia aborta con DB intacta; transferencia válida v1–v5 y paquetes ambiguos con rollback; checksum/contenidos preservados. |
| CA-40 | T-18/T-19/T-20 | Checks/builds y QA navegador/Electron servicio; smoke autónomo del explorador/portable; evidencia aislada separada de respaldo/incorporación/migración real autorizada. |

Comandos desde la copia aislada: `pnpm typecheck`, `pnpm lint`; pruebas dirigidas `pnpm vitest run --exclude '**/.local/**'` sobre CampaignPanel, GameEditor, BrowserClient/owned-client, DraftRecovery, DmAsidePanel y contratos compartidos afectados. `pnpm test:db` y `pnpm test:owned` usan sus configs reales, que exigen **PostgreSQL temporal real con TLS** además de SQLite: suministrar `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE` privados del entorno de pruebas, nunca URL/DB operativa ni skips para declarar PASS. Los tests de CLI pueden requerir `pnpm build:api` previo. Evaluar contratos moderation/contextual-table cuando cambie validación de publicación; ese tramo requiere `pnpm test:moderation` con el mismo aislamiento. Serializar `pnpm build:api`, `pnpm build:web`, `pnpm build`, `pnpm build-storybook` y reservar puertos de QA distintos de8787. Ningún test puede tocar `.env`/DB original.

Revisión TL de este artefacto: rutas/recorridos y puertos existentes inspeccionados; IDs y grafo sin ciclos, ownership exclusivo. No ejecutadas pruebas/builds/migraciones. La falta de entorno PostgreSQL o de smoke debe registrarse como pendiente, no como aprobación. Versión minor prevista3.33.0, solo al cierre coordinado por PM; sin bump en original antes de T-20.
