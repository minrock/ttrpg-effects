# Partidas y recursos privados (008)

El servicio final3.13.0 compone `/api/v1/dm` y `/api/v1/admin/systems` sobre SQLite/local o PostgreSQL/production conTLS, sin almacén global ni claves legadas. Las cuentas siempre se validan y el administrador no obtiene capacidadDM. Las pantallas consumen revisiones/bindings y catálogo exacto.

## Datos y autorización

Partidas y biblioteca pertenecen al DM autenticado. Escenas, assets, monstruos, NPCs y personajes se reutilizan entre todas sus partidas. El administrador gestiona cuentas y catálogo compartido, sin acceso a recursos privados. El owner procede del principal007, no de JSON ni de una cabecera elegida por cliente. Los IDs son opacos; conocerlos no concede acceso. Las publicaciones son inmutables; disponibilidad separada permite deshabilitar nuevos usos sin borrar definiciones. Las plantillas personales históricas quedan retenidas y privadas, sin altas, edición ni borrado en el servicio.

La migración3 de `pnpm db:migrate` extiende el catálogo006 y crea tablas funcionales en la misma base que identidad. En SQLite es `control.sqlite`; en PostgreSQL es la base indicada por configuración006, con TLS verificado. PostgreSQL no abre `service.sqlite`, `monsters.sqlite`, `entities.sqlite` ni el perfil Electron. La migración 4 añade catálogo/versiones, definiciones privadas retenidas, bindings y enlaces de recursos a partidas. Las partidas existentes reciben `generic@1`; sus escenas, cámaras y mediciones no se reinterpretan. Migraciones 1–3 conservan su contenido/checksum. No hay migración automática al arrancar ni al iniciar sesión.

Las unidades de trabajo prestadas por `IdentityService.authorized` contienen `games`, `systems`, `links`, recursos, assets, aperturas e idempotencia. Comparten conexión/COMMIT/ROLLBACK con la revalidación de identidad y mantienen el bloqueo007 frente a revocaciones. Se comprueba principal antes del cuerpo y de nuevo dentro de la transacción; el resultado deduplicado también exige sesión vigente. Se registra cada método completo: un rechazo incluso capturado por el callback, una operación sin await o un fallo posterior revierte toda la operación. Una marca irreversible conserva el primer motivo; rechazar sin argumento, con null, false, cero o cadena vacía también aborta y no permite que un rechazo posterior borre el fallo. Se capturan argumentos antes del primer await; la revalidación final comprueba disponibilidad de todos los usos nuevos y coherencia de los enlaces. Los puertos caducan al salir del callback. Los callbacks deben terminar y no realizar red prolongada; PostgreSQL conserva sus timeouts006. La exclusión global007 serializa mutaciones autorizadas entre conexiones: no se promete rendimiento horizontal.

## HTTP de recursos propios

Todas las rutas requieren cookie de cuenta DM activa, contraseña temporal ya cambiada, Host correcto y Origin exacto para mutaciones. No se acepta cookie legada ni rol admin como DM. Se conservan límites de10MiB JSON,20MiB imagen,40millones de píxeles y decodificador acotado de002. Respuestas JSON `{ok:true,...}` o `{ok:false,error:{code,message}}`. Ausencia de principal401; rol incorrecto403; recurso ausente o ajeno404 sin distinguirlos; validación422; revisión/conflicto409; corrupción500; almacenamiento503. Referencias de imagen no resolubles devuelven `url:null` y avisos genéricos, sin comprobar la existencia en otro owner.

| Ruta bajo `/api/v1/dm` | Contrato |
| --- | --- |
| GET/POST `games` | GET `limit`1–100/default50, `offset`≥0/default0; `{games,total}`. POST `{name,systemRef:{systemId,version}}`;201, Location y `{game}`. Nombre trim1–200, sin controles; repetidos permitidos. |
| GET/PATCH/DELETE `games/:id` | GET `{game}`. PATCH `{name?,state?:ready\|archived}`. DELETE cuerpo `{}`. Requieren revisión en mutaciones; devuelven recurso actualizado o `{ok:true}`. |
| GET/POST `scenes`, POST `scenes/import` | Lista paginada `{scenes,total}`; creación/importación `{name,scene,bindings?}`,201/Location y `{resource}`. UUID nuevo, versión portable2; conserva migración1 y avisos de imágenes ausentes. |
| GET/PUT/DELETE `scenes/:id` | PUT `{name,scene,bindings?}`. GET/PUT `{resource}` incluye `revision`, `warnings`, `missingImages`; DELETE `{}` y `{ok:true}`. |
| GET `scenes/:id/export` | Documento `.ttrpgscene` v2, sin owner/revisión de persistencia, Content-Disposition. No incorpora bytes. |
| GET `scenes/:id/links/candidates` | Candidatos de marcadores propios, contrato existente. |
| POST `assets` | Bytes PNG/JPEG/WebP y Content-Type exacto.201 `{asset:{id,reference,url,mimeType,byteLength}}`. UUID servidor; assets inmutables, sin limpieza automática. |
| GET/HEAD `assets/:id`, POST `assets/resolve` | Bytes privados o404. Resolve `{references}`→`{assets:[{reference,url}]}`. Solo URLs `/api/v1/dm/assets/...` propias. Hash SHA256 y longitud verificados al leer bytes persistidos. |
| GET `definitions/:kind/:id` | kind=`scenes` o `monsters`; resuelve exclusivamente bindings del recurso propio. `{templates,monsters}` contiene definiciones exactas y mapa monsterId→índice en templates (deduplicadas por referencia completa) para evitar colisiones de IDs privados/compartidos. No es un catálogo de selección nuevo. |
| GET `monster-templates` | Página personal `limit/offset`→`{builtIn,templates,total}`; builtIn se entrega separado, no consume paginación personal. |
| GET `monster-templates/:id` | Fachada de lectura histórica. Prioriza la definición privada del owner ante ID coincidente. PUT/DELETE devuelven 409 `IMMUTABLE`, incluso si nadie la referencia. |
| GET/POST `libraries/:kind`, GET/PUT `libraries/:kind/:id` | kind=`monsters`, `npcs`, `player-characters`. Campos `{entry,bindings?}` y normalizadores/casos de uso anteriores. Respuestas `{entry}` con revisión; listas `{entries,total}`, `text`, `limit`, `offset`. No se añade DELETE. |
| POST `scene-links/connect`, `disconnect` | Campos anteriores más `expectedRevisions:{[sceneId]:revision}` para todos los extremos modificados, incluida tercera escena de reconexión. Operación atómica completa; respuesta `revisions:{[sceneId]:revisionConfirmada}` para actualizar CAS sin releer una revisión posterior. |
| POST `scene-links/validate`, `navigate` | Contratos anteriores, solo escenas propias; validate conserva diagnóstico genérico de destino ausente. |

Toda mutación persistida lleva `Idempotency-Key: UUID`; GET/HEAD y los POST de solo lectura resolve/validate/navigate no la requieren. Editar/borrar exige `If-Match: "revision"` (se acepta también número sin comillas). La creación de un borrador exige revisión 0. La revisión es entera y aumenta en cada escritura; no vive dentro del documento portable. Las creaciones no aceptan IDs/owner/fechas/revisión del body. Eliminar devuelve200 `{ok:true}`, por lo que DELETE envía JSON `{}` y Content-Type; no hay cuerpo vacío implícito.

Idempotencia: clave compuesta owner+ruta/contexto+UUID; huella de método, contenido y revisión (uploads incluyen MIME y hash). Igual contenido devuelve el resultado confirmado; distinto 409 `OPERATION_CONTENT_CONFLICT`. Resultado y mutación se escriben juntos y sobreviven reinicio. Retención24h, limpieza de vencidos al comenzar una nueva operación del owner, máximo1000 resultados/64MiB por owner. Al agotar presupuesto se devuelve 429 `OPERATION_BUDGET`, sin confirmar la operación, con `error.retryAt` ISO: vencimiento del último registro actual. Esperar hasta esa fecha libera todo el presupuesto actual; nuevas operaciones de la cuenta pueden extenderla. Reintentar con la misma clave; recargar o generar otra no libera presupuesto. Un resultado individual mayor de 64 MiB devuelve 413 `RESULT_TOO_LARGE` y requiere reducir contenido, porque esperar no lo resolvería. El límite se revalida al cerrar la transacción, incluyendo operaciones paralelas dentro de la misma unidad. Es del contenido UTF8 persistido, no del tamaño del objeto JS. No hay caché global ni traslado de resultados entre owners/partidas. Un recurso borrado no se recrea al repetir una creación todavía registrada.

Búsqueda: trim, normalizaciónNFC y minúsculas Unicode de JavaScript; `%`, `_` y `\` son literales escapados. Filtrado y paginación SQL por owner, sin cargar el catálogo entero. Orden updatedAt descendente y ID binario ascendente, con clave hexadecimal de orden para equivalencia entre collations de recursos. JSON validado/normalizado al escribir y releer; corrupción no equivale a lista vacía.

Las revisiones obsoletas de partida devuelven 409 `REVISION_CONFLICT`: conservar cambios locales, releer la partida y resolver antes de reintentar. Se distingue de `CONFLICT` por ID duplicado. Las definiciones no se borran nunca mediante producto. `IMMUTABLE`, `DISABLED` e `INCOMPATIBLE` devuelven 409 con acción recuperable; la indisponibilidad de una definición no es un fallo 503.

El catálogo prestado por `authorized` conserva la firma de 006 por compatibilidad, pero rechaza en todos sus métodos un owner distinto del principal con `NOT_FOUND`. Repositorios y efectos funcionales exigen además rol DM: un preflight administrativo puede usar `authorized` sin operar esos puertos, pero no obtiene capacidades DM por omitir el rol o pedir admin. El rol, owner y sesión patrocinadora se capturan al crear el puerto: mutar el DTO recibido por el callback no altera su autoridad. El catálogo global permanece reservado a infraestructura. Los métodos de recursos y aperturas también cierran su owner sobre el principal.

## Catálogo compartido y consumo

El puerto `tx.systems` usa el principal capturado por identidad. Solo admin crea sistemas, escribe borradores, publica o cambia disponibilidad; DM puede leer publicaciones exactas y `selectable()`. No existen métodos de borrado/purga. Admin no puede acceder a `games/resources/assets/openings/links` ni efectos de publicación privados. `tx.operation` admite ambos roles para envolver sus propias capacidades: no concede las del otro rol. Todos los comandos HTTP administrativos usan la misma idempotencia, límites, revalidación de sesión y transacción que DM.

| Ruta bajo `/api/v1/admin/systems` | Contrato |
| --- | --- |
| GET / POST raíz | Lista compartida; POST `{systemId,name}`, 201. |
| GET / PUT `:systemId/versions/:version` | Lee o escribe borrador completo; PUT cuerpo `SystemDefinition`, If-Match 0 para crear, revisión actual para editar. Una publicación devuelve IMMUTABLE. |
| POST `:systemId/versions/:version/publish` | Cuerpo `{}`, revisión de borrador. Fija `publishedAt` del servidor, habilita versión y conserva payload/hash. Replay devuelve la misma publicación. |
| PATCH `:systemId/versions/:version/availability` | `{availability:enabled\|disabled}`, CAS sobre revisión de versión. Borrador puede quedar deshabilitado; sigue invisible hasta publicar. |
| PATCH `:systemId/versions/:version/templates/:templateId/availability` | Mismo cuerpo; CAS sobre revisión propia de presentación. Solo publicaciones. Rehabilitar versión no altera esta metadata. |

DM tiene GET `systems`, `systems/selectable` y `systems/:systemId/versions/:version`. La lista seleccionable devuelve `{ref,name,templates:[{id,name}]}` y excluye versiones/plantillas deshabilitadas. Las lecturas exactas permiten publicaciones deshabilitadas. GET `games/:id/configuration` retorna `ResolvedSystem`; POST `games/:id/resources` recibe `{kind,resourceId}` y persiste asociación propia coherente. No hay resolución a «latest» ni fallback si falta versión.

`SystemDefinition` separa `manifest` (version 1; reglas `generic-v1|dnd-55e-v1`, medición `grid-measurement-v1`, presentación `monster-markdown-v1`), `rules` (version 1, `defaultDiagonalMode`, capacidades cerradas `grid-measurement` y `markdown-monsters`), `dataSchema` (`generic-notes|monster-markdown`, version 1) y `presentations` (plantillas estrictas existentes). `resolveCompiledModules` apunta a funciones compiladas ya existentes. No admite rutas, código, módulos desconocidos ni diseñador de esquema. Los valores por defecto sirven para documentos nuevos; el resolvedor no modifica calibración, cámara ni diagonalMode de escenas guardadas. D&D usa plantilla 5.5 y medición existente, no un reglamento completo. Cada versión incluye `createdAt`, `publishedAt`, hash de contenido, revisión y disponibilidad; esta última nunca modifica el hash.

Los sobres de recurso devuelven `bindings:{root?,monsters:{[monsterId]:DefinitionRef}}`. Un monstruo de biblioteca exige root; una escena exige entrada por cada monstruo de `sceneAside`, incluidos los que usan plantilla vacía. Referencia compartida: `{scope:"catalog",systemId,version,templateId}`. Referencia histórica: `{scope:"private",ownerId,templateId,version:1,hash}`. Un monstruo con templateId nulo usa `generic@1/generic-markdown`. `system` sigue siendo etiqueta libre, nunca autoridad. Escenas sin monstruos, NPC y personajes pueden ser neutrales. Los bindings no se escriben en `.ttrpgscene`; exportar solo ese archivo no incluye catálogo, CSS, reglas externas ni autorización para crear recursos nuevos en otra instalación.

«Existente» exige misma fila owner/kind/ID y binding al comenzar la unidad; en escena, además mismo ID del monstruo dentro de esa escena. El servidor captura esa evidencia, no acepta marcas de cliente. Una edición sin bindings conserva los anteriores; nuevos IDs/copias/referencias/enlaces exigen versión y plantilla habilitadas al operar y al confirmar. Una deshabilitación final en la misma unidad revierte cualquier uso nuevo, incluso enable→create→disable. Editar notas/estadísticas/imagen con binding intacto sigue permitido. Los enlaces validan sistema y versión exactos, incluso entre versiones de igual nombre. Una privada retenida pertenece al perfil genérico de compatibilidad y nunca puede originar un enlace nuevo; conservar asociaciones históricas requiere restauración completa controlada.

La migración 4 y el lector v1 preservan las plantillas personales por owner/ID/hash; un ID coincidente con built-in utiliza el contenido privado real. Un ID incorporado sin definición privada se vincula a su publicación exacta. Texto `system` desconocido se conserva sin inferir reglas. Referencia ausente produce `TEMPLATE_MISSING`: el operador debe reparar/mapear explícitamente una copia de la fuente y exportarla otra vez. No se publica automáticamente material personal. El import operativo completo puede restaurar instancias deshabilitadas con mismos IDs y bindings; esta excepción no existe en HTTP ni en import portable. Leer paquete v1 es explícito y produce las mismas referencias deterministas que migración 4. No se añaden automáticamente enlaces entre la partida genérica adoptada y sus recursos.

## Aperturas y runtime preparado

La entrega 008 creó los puertos de apertura; el servicio final los completa con [invitaciones/admisión](invitations.md) y [expulsión](moderation.md). El puerto de apertura verifica partida propia ready, genera UUID/generación creciente y cierra la anterior en la misma transacción. Como máximo una abierta por partida (índice parcial), hostAccountId pertenece al owner (FK compuesta). La sesión patrocinadora procede del principal verificado y no contiene cookie/token. Heartbeat nominal10s, fresco30s y gracia120s: deadline total150s desde último latido. Renovar durante gracia desde otra sesión vigente del mismo DM cambia patrocinador, sin cambiar generación ni revisión de transición. Cerrar, archivar o eliminar impide renovar. Deadline alcanzado requiere apertura nueva; heartbeat viejo nunca resucita una generación.009 decide admisión y010 conecta SSE/moderación.

`GameRuntimeRegistry` prepara contextos validados y tablas independientes por owner/partida/apertura/generación. Reutiliza TableSession y proyección pública; verifica assets del owner antes de publicar. Un snapshot con monstruos requiere `sceneResourceId` como cuarto argumento de `publish`: valida IDs/plantillas contra la escena persistida y su asociación al sistema de partida, también antes de COMMIT. Un snapshot neutro conserva la interfaz previa. Sus métodos son internos, se usan dentro del callback autorizado. `publish` prepara una copia sin eventos ni cambios observables; se drenan las escrituras ya iniciadas y se revalida el contexto al terminar el callback y se aplica únicamente después del COMMIT. El lock de sesión PostgreSQL (liberado en finally) y la cola SQLite mantienen la exclusión hasta terminar estos efectos síncronos. Un fallo previo conserva el snapshot anterior. Ante respuesta de COMMIT incierta o fallo al aplicar efectos se descarta el runtime afectado y no se publica la preparación; exige nueva validación/publicación. Los participantes no deben ejecutar trabajo externo ni lanzar desde sus efectos. El contrato vigente de invitados se describe en las guías de invitaciones y moderación. `allows` por sí solo NO autoriza a un invitado:009/010 comprueban simultáneamente credencial, apertura, lease y conjunto público. Al reiniciar el proceso el registro está vacío; leer filas de apertura no demuestra presencia. No se promete recuperación de proyección/dados ni múltiples procesos API activos.

Archivar/restaurar conserva catálogo; restaurar ready no abre. El borrado es lógico (`deleted_at`) y no añade estado público. No hay recuperación HTTP de borrados, limpieza automática ni borrado de escenas/assets al eliminar partida. Retención indefinida hasta decisión operativa de purga futura; recuperación solo mediante respaldo y restauración completa en entorno dedicado. Deshabilitar DM no transfiere datos;007 no elimina identidades físicas.

## Diagnósticos operativos

La CLI imprime categorías sanitizadas y una acción siguiente: `USAGE` y uso breve; `PATH_MISSING`, `PATH_UNSAFE`, `WRITER_ACTIVE`, `OWNER_INVALID`, `TARGET_OCCUPIED`, `CORRUPT`, `TEMPLATE_MISSING`, `CANCELLED` o `UNAVAILABLE`. No imprime excepciones externas, SQL, URLs, cookies ni rutas completas. Error termina con código 1 y cancelación con 130. SIGINT/SIGTERM solicitan cancelación cooperativa; se comprueba antes y durante la importación y justo antes de registrar el resultado. Una señal recibida después de la última comprobación puede coincidir con un COMMIT ya iniciado: el resultado confirmado se informa como éxito, no como rollback.

Si una importación falla después de comenzar la transacción, solo anuncia «Rollback confirmado» cuando la base respondió a ROLLBACK antes de intentar COMMIT. Si COMMIT pudo alcanzar la base o no se confirmó ROLLBACK, anuncia «Estado incierto»: conservar respaldo, ejecutar `verify` y repetir `import` con idéntico paquete/asignación para consultar su registro idempotente. No borrar ni reasignar el destino por suposición. Los fallos anteriores a iniciar la transacción no afirman una importación confirmada.

Ambos exportadores inspeccionan el paquete completo antes de devolver éxito. Si detectan relaciones inválidas eliminan el manifiesto de terminación y dejan el directorio parcial para diagnóstico; usar otro destino en el siguiente intento. Para legado con monstruo y plantilla ausente, reparar explícitamente la referencia en una copia de la fuente, generar otro respaldo y exportar de nuevo. No se elimina la referencia ni se inventa una plantilla silenciosamente.

## Transferencia operativa explícita

La herramienta `pnpm data` se compila con `pnpm build:api`. Escritura de paquete operativo 3 y lectores explícitos de paquetes 1 y 2 anteriores, distintos de `.ttrpgscene` v2. `manifest.json` conserva tipo/conteos/owners/hash y un descriptor `catalogData:{records,bytes,sha256}`. `records.jsonl` transporta los recursos privados con IDs/relaciones/revisión y bindings, incluidas definiciones privadas retenidas; los blobs se identifican por SHA256. `catalog.jsonl` transporta cabeceras de versiones publicadas (fechas, manifest, hash, disponibilidad), una línea por presentación y los enlaces partida–recurso. Cada cabecera declara cuántas presentaciones consecutivas la completan; se valida el hash de la definición reconstruida. La integridad de monstruos usa el binding y la publicación exactos, también para IDs nuevos de presentación que no existen en las plantillas incorporadas.

No hay compresión, rutas relativas arbitrarias, extracción, ejecución Markdown/CSS/HTML ni descargas remotas. Rechaza symlinks, archivos duros, versiones futuras, hashes incorrectos y relaciones incoherentes entre escenas presentes. Destinos históricos ausentes siguen como advertencias. Valida también monstruo→plantilla y todos los campos de NPC/personaje.

Manifiesto máximo 1 MiB; límite de 100000 registros privados y 1 GiB en `records.jsonl`, 10 MiB por línea JSONL y 20 MiB por blob. El catálogo no se acumula en el manifiesto ni tiene el límite global de 1 GiB de los recursos privados: se recorre en streaming, con longitud/conteo exactos en enteros seguros y SHA256 del archivo completo. Se reconstruye una versión cada vez (hasta 100 presentaciones según el esquema publicado); un catálogo creciente requiere espacio de disco y tiempo de operación, pero no un aumento del límite del manifiesto. Exporta por lotes (assets de uno en uno), no todos los BLOBs o publicaciones a memoria. Antes de confirmar importación se vuelven a verificar ambos archivos JSONL; una modificación tardía revierte las filas.

Los lectores v1/v2 conservan sus límites y representación originales, incluido el catálogo embebido de v2.

Detener limpiamente la API fuente y todos los escritores antes del respaldo. `backup-legacy` toma el mismo `service.lock` por exclusión; si existe, falla y jamás lo elimina. El operador resuelve un lock huérfano solo tras comprobar que no quedan procesos. Copia las tres bases y TODOS sus sidecars presentes, más inventario de hashes, a un directorio nuevo privado. No copiar solo service.sqlite en caliente. La lectura del respaldo usa una copia privada descartable, porque SQLite WAL puede crear sidecars aun en modo readOnly; no ejecuta migraciones ni modifica fuente/respaldo. La configuración/credenciales se respaldan por separado, con permisos privados; nunca van en el paquete funcional.

Receta con rutas temporales físicas y nuevas (reemplazar por directorios propios). El operador detiene su proceso API mediante su supervisor antes del primer comando; estas órdenes no detienen servicios ajenos:

```sh
pnpm build:api
pnpm data backup-legacy --source /ruta/privada/fuente-detenida --target /ruta/privada/respaldo-nuevo
pnpm data export-legacy --source /ruta/privada/respaldo-nuevo --target /ruta/privada/paquete-nuevo
pnpm data inspect --bundle /ruta/privada/paquete-nuevo
```

En shell dedicado, configurar exclusivamente el DESTINO vacío mediante variables006 o `.env` privado correspondiente. Para SQLite usar `TTRPG_DB_DRIVER=sqlite`, `TTRPG_DEPLOYMENT=local`, `TTRPG_DATA_DIR` de destino nuevo. Para PostgreSQL usar `TTRPG_DB_DRIVER=postgres`, `TTRPG_DEPLOYMENT=production`, `TTRPG_DATABASE_URL` privada y CA conforme a [database.md](database.md). No poner URL/contraseña en argv ni copiar `.env` dentro del paquete.

```sh
pnpm db:migrate
# Provisionar/cambiar contraseña de los DMs de destino con comandos007: docs/identity.md.
# El ID explícito se obtiene del catálogo administrativo, nunca se deduce por email.
pnpm data import --bundle /ruta/privada/paquete-nuevo --owner ID_DM_ACTIVO --game-name "Mesa adoptada"
pnpm data verify --bundle /ruta/privada/paquete-nuevo --owner ID_DM_ACTIVO
```

Se asigna biblioteca completa al DM, sin copiarla dentro de la partida inicial. El destino puede contener esquema, cuentas y las semillas exactas intactas, pero ninguna partida/recurso/apertura/idempotencia/importación/definición privada anterior ni catálogo modificado. Se verifica el contenido de semillas coincidentes; no se sobrescribe un seed divergente. La restauración puede reproducir disponibilidad deshabilitada y sus revisiones sobre seeds compatibles. El plan y cada propietario deben validarse antes de escribir. La importación completa y su huella se confirman en una transacción; error/cancelación antes de COMMIT revierte todo cuando ROLLBACK se confirma. Una respuesta de COMMIT perdida o rollback fallido se informa como estado incierto, sin prometer destino vacío. Repetir paquete+asignación devuelve resultado previo, nunca duplica. Un destino funcional no vacío o mapa inválido falla sin sobrescribir.

Para trasladar un almacén ya privado SQLite→PostgreSQL, detener escritores de fuente y exportar con su configuración explícita:

```sh
# Shell configurado para FUENTE privada detenida.
pnpm data export-owned --target /ruta/privada/paquete-privado
pnpm data inspect --bundle /ruta/privada/paquete-privado
# Cambiar al shell/configuración del DESTINO migrado y provisionado.
pnpm data import --bundle /ruta/privada/paquete-privado --owner-map /ruta/privada/mapa-owners.json
pnpm data verify --bundle /ruta/privada/paquete-privado --owner-map /ruta/privada/mapa-owners.json
```

El mapa JSON es `{ "ID_ORIGEN_A":"ID_DESTINO_A", "ID_ORIGEN_B":"ID_DESTINO_B" }`, completo e inyectivo. Si los IDs válidos ya existen en destino se puede omitir mapa: se conservan exactamente. No mapear por correo. Se preservan UUIDs de partidas/recursos/objetos internos, fechas, documentos normalizados, MIME y bytes. Los borradores no forman parte de la transferencia funcional: conservarlos mediante respaldo integral de base antes del corte. No se trasladan cuentas, contraseñas, sesiones, auditoría, aperturas, publicación, tiradas ni operaciones de runtime. El destino comienza sin aperturas/proyección. `verify` compara registros, bindings, definiciones retenidas, catálogo, enlaces, bytes y conteos; después releer/exportar por HTTP con el DM elegido y confirmar404 con otro DM, como hace `test:owned`.

## Retorno y respaldo PostgreSQL

Ante fallo de cambio, no borrar automáticamente destino ni sobrescribir fuente. Si la fuente no recibió escrituras posteriores, restaurar a un directorio NUEVO y apuntar allí el ejecutable/configuración anteriores:

```sh
pnpm data restore-legacy --source /ruta/privada/respaldo-nuevo --target /ruta/privada/restauracion-nueva
```

La restauración valida inventario/hashes y conserva las tres bases/sidecars. Nunca arrancar binario legado contra control.sqlite nuevo. Mantener paquete, inventario y configuración anterior privados. Escrituras posteriores al corte requieren nuevo respaldo y reconciliación; no hay sincronización automática ni downgrade transparente.

Para PostgreSQL usar herramientas oficiales de versión compatible; copiar directorio SQLite no respalda PostgreSQL. Con API detenida, TLS verify-full/CA y PGPASSFILE privado0600 (sin password en argv):

```sh
pg_dump --no-password --format=custom --no-owner --no-acl --file /ruta/privada/respaldo.dump --dbname BASE_ORIGEN
pg_restore --list /ruta/privada/respaldo.dump
# Crear BASE_RESTAURACION vacía mediante administración PostgreSQL, sin tocar origen.
pg_restore --no-password --exit-on-error --no-owner --no-acl --dbname BASE_RESTAURACION /ruta/privada/respaldo.dump
```

Configurar PGHOST/PGPORT/PGUSER/PGSSLMODE=verify-full/PGSSLROOTCERT y PGPASSFILE por entorno privado. Una restauración completa PostgreSQL incluye identidad; tratar dump como secreto y revalidar/cerrar sesiones según operación007. No usar `--clean` sobre una base con escrituras. Esta receta es distinta del paquete funcional, que excluye identidad. La evidencia008 prueba restauración temporal SQLite y transferencia a PostgreSQL; el gate de moderación incluye roundtrip integral real y cookies antiguas rechazadas antes de servir.

## Verificación reproducible

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:api
pnpm build:web
# TTRPG_TEST_DATABASE_URL y TTRPG_TEST_DB_CA_FILE: clúster temporal dedicado real.
pnpm test:db
pnpm test:identity
pnpm test:owned
```

Los gates fallan si PostgreSQL real/TLS no están disponibles; no omiten motor. Crean y retiran basesUUID/directorios/HTTP propios y no tocan perfiles/env personales. `test:owned` incluye principal Better Auth real, CRUD y matriz de aislamiento, carreras entre conexiones, corrupción, rollback tras await, enlaces2/3 escenas, lease con reloj, bytea/BLOB, imágenes huérfanas, Unicode/Markdown, transferencia/adopción/rollback/restauración y CLI inspect/verify/import compilado. La UI011 consume estos contratos; su evidencia visual se registra separadamente de los contratos backend. Electron local conserva abrir/guardar/Player sin cuentas/API/PG.

GET `/api/v1/dm/definitions/{scenes,monsters}/:id` devuelve `{ok,templates}` únicamente para los bindings de la instancia propia. Conserva definiciones privadas retenidas y versiones exactas; no resuelve referencias libres, no admite admin ni publica definiciones a invitados.

El cliente011 separa presentaciones habilitadas para crear de la definición exacta retenida de cada instancia. Reutilizar una ficha de biblioteca comprueba su referencia exacta antes de agregarla; persistencia vuelve a validar autoridad/disponibilidad. Una coincidencia de templateId no convierte una privada en compartida ni cambia su binding.
