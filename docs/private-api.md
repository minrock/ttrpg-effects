# Servicio privado HTTP (3.6.0)

El servicio Node.js 24 administra una instancia privada. Electron conserva su modo local y su perfil. Incluye el [cliente navegador](browser-client.md). La [mesa sincronizada](synchronized-table.md) añade SSE, publicación y assets autorizados para jugadores.

## Arranque y configuración

Instalar con `pnpm install`, compilar con `pnpm build:api` y ejecutar con `pnpm start:api`. `pnpm dev:api` compila y ejecuta; reiniciarlo tras editar fuentes. El artefacto es `out/api/index.mjs`, independiente de Electron. Para trasladarlo conservar `node_modules` de producción (Zod, honeycomb-grid y sharp son externos al bundle; sharp requiere los binarios de su plataforma instalados por pnpm). `pnpm dev` continúa ejecutando Electron local.

| Variable | Regla |
| --- | --- |
| `TTRPG_HOST` | Bind; predeterminado `127.0.0.1`. Mantener loopback detrás del proxy. |
| `TTRPG_PORT` | Entero 0–65535, predeterminado 8787; 0 sirve para pruebas con puerto efímero. |
| `TTRPG_DATA_DIR` | Obligatorio; ruta absoluta física a un directorio exclusivo, sin symlinks. No usar el perfil Electron. |
| `TTRPG_PUBLIC_ORIGIN` | Obligatorio; origen exacto, sin barra final/ruta/credenciales. Ejemplo `http://127.0.0.1:8787`. |
| `TTRPG_DM_KEY`, `TTRPG_PLAYER_KEY` | Obligatorias, distintas, entre 32 y 1024 caracteres, aleatorias y privadas. No existen valores predeterminados. |

Ejemplo de entorno, usando claves generadas previamente por el operador (los marcadores no son claves utilizables):

```sh
export TTRPG_HOST=127.0.0.1
export TTRPG_PORT=8787
export TTRPG_DATA_DIR=/ruta/fisica/privada/ttrpg-service
export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787
# Proporcionar TTRPG_DM_KEY y TTRPG_PLAYER_KEY desde un gestor de secretos.
pnpm build:api
pnpm start:api
```

Solo se permite HTTP para `localhost`, `127.0.0.1` o `[::1]`; para acceso remoto usar HTTPS en un proxy inverso. El proxy debe preservar `Host` igual al host/puerto de `TTRPG_PUBLIC_ORIGIN` y `Origin` del navegador. Reenviar `/api/v1/` al bind privado; servir el frontend desde ese mismo origen. No exponer el puerto Node a Internet. Por ejemplo, si el origen es `https://mesa.example`, el upstream recibe `Host: mesa.example`; si es `https://mesa.example:8443`, debe recibir ese puerto también. En desarrollo un proxy web puede conservar su propio origen configurado y reescribir el Host upstream a ese mismo host/puerto. No se aceptan hosts alternativos automáticamente.

El servidor no confía en `Forwarded` ni `X-Forwarded-*`, no habilita CORS y no deduce HTTPS del socket del proxy. La cookie Secure depende únicamente del origen configurado. Los límites de conexión se aplican a la IP real del par: clientes detrás de un mismo proxy comparten la cuota. Configurar también límites de cuerpo/tiempo en el proxy. Nunca añadir claves a URLs, bundles web, localStorage o logs.

## Sesiones, errores y límites

Prefijo de todas las rutas: `/api/v1`. Enviar `Content-Type: application/json` en JSON y `credentials: "same-origin"` desde el cliente. Cada mutación requiere `Origin` exactamente igual al configurado, incluido login/logout/upload. Un Origin ausente, `null` o distinto devuelve 403. GET autenticado puede omitirlo (imágenes/clientes HTTP), pero si lo incluye debe coincidir. CLI y pruebas deben enviarlo explícitamente; `curl` no lo añade solo.

Login acepta `{key:string}` y devuelve `{ok:true,role:"dm"|"player",expiresAt:ISO}`. El rol deriva de la clave; campos extra como `role` se rechazan. La cookie es `ttrpg_session`, aleatoria de 256 bits, `HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=28800`, más `Secure` con HTTPS, sin Domain. Expira absolutamente a las ocho horas en servidor; login rota la sesión enviada y logout la revoca. Máximo 1000 sesiones; vencidas se limpian. Reiniciar borra todas las sesiones, no los recursos.

Error común: `{ok:false,error:{code,message}}`, mensaje en español sin stack, SQL ni rutas físicas. Códigos: `VALIDATION_ERROR` (422), `INVALID_JSON`/`INVALID_ID`/`INVALID_PATH`/`INVALID_QUERY`/`INVALID_BODY` (400), `UNAUTHORIZED` (401), `FORBIDDEN`/`INVALID_ORIGIN`/`INVALID_HOST`/`BUILT_IN_TEMPLATE` (403), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `REQUEST_TIMEOUT` (408), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE`/`UNSUPPORTED_IMAGE_VARIANT` (415), `RATE_LIMITED` (429), `STORAGE_CORRUPT`/`INTERNAL_ERROR` (500). Un JSON bien formado con campos/tipos inválidos es 422. No hay hoy un flujo que produzca 409. Cualquier respuesta incluye `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`.

Límites centralizados en `src/server/config.ts`: login 10 intentos/minuto/IP; general 600 solicitudes/minuto/IP; mapa de cuotas hasta 10 000 claves; 429 con `Retry-After: 60`. Máximo 100 conexiones y 100 peticiones por socket. Cabeceras 16 KiB/10 segundos; cuerpo 30 segundos; keep-alive 5 segundos. JSON 10 MiB; login/logout 4 KiB; imagen 20 MiB. El contador se aplica también sin Content-Length. Al exceder un cuerpo chunked se descarta el buffer y se drena sin retener hasta finalización o timeout para devolver un error HTTP usable. Los errores tempranos con cuerpo pendiente cierran la conexión. No se escriben temporales de upload. Se admiten como máximo dos decodificaciones de imagen simultáneas por servidor, sin cola: saturación devuelve 429. Cada decodificación tiene límite de procesamiento de 15 segundos y 40 millones de píxeles; el resultado temporal RGBA de 8 bits no supera 160 millones de bytes por imagen.

## Rutas y DTO efectivos

Las rutas privadas devuelven 401 sin sesión y 403 con sesión jugador, antes de leer el cuerpo. El jugador consulta/cierra su sesión y usa las rutas de mesa y assets de la publicación vigente, descritas abajo. Escenas completas, plantillas y bibliotecas siguen reservadas al DM. Conocer un ID no concede acceso.

| Método/ruta | Acceso | Entrada | Éxito |
| --- | --- | --- | --- |
| GET `/health` | Todos | Sin query | 200 `{ok:true,status:"ok",version}` (package.json) |
| POST `/auth/login` | Todos | `{key}` | 200 SessionDto y cookie |
| GET `/auth/session` | DM/jugador | Cookie | 200 SessionDto |
| POST `/auth/logout` | Todos, idempotente | Sin cuerpo | 204 y cookie borrada |
| GET `/scenes` | DM | `limit=1..100` (50), `offset>=0` (0) | 200 `{ok:true,scenes:SceneSummary[],total}` |
| POST `/scenes` | DM | `{name,scene}` | 201 `{ok:true,resource}` y Location |
| POST `/scenes/import` | DM | `{name,scene}` (v1 o v2) | Igual creación, nuevo ID |
| GET `/scenes/:id` | DM | UUID | 200 `{ok:true,resource}` |
| PUT `/scenes/:id` | DM | `{name,scene}` | 200 `{ok:true,resource}`; desconocido 404 |
| DELETE `/scenes/:id` | DM | UUID | 204; desconocido 404 |
| GET `/scenes/:id/export` | DM | UUID | 200 documento JSON sin envoltorio, attachment `scene-UUID.ttrpgscene` |
| POST `/assets` | DM | Bytes PNG/JPEG/WebP, MIME exacto | 201 `{ok:true,asset:AssetDto}` |
| GET/HEAD `/assets/:id` | DM; jugador solo si publicado | UUID | 200 bytes con MIME verificado |
| POST `/assets/resolve` | DM; jugador solo referencias publicadas | `{references:string[]}` (máx. 200, cada referencia 2048 caracteres) | 200 `{ok:true,assets:[{reference,url:string|null}]}` |
| GET `/monster-templates` | DM | Sin query | 200 `{ok:true,templates:MonsterTemplate[]}` |
| PUT `/monster-templates/:id` | DM | `{template:MonsterTemplate}` | 200 `{ok:true,templates}` |
| DELETE `/monster-templates/:id` | DM | ID de usuario | 200 `{ok:true,templates}`; ausente 404 |
| GET `/libraries/:kind` | DM | `text` hasta 200 caracteres, `limit=1..100` (50) | 200 `{ok:true,entries}` |
| GET `/libraries/:kind/:id` | DM | UUID | 200 `{ok:true,entry}`; ausente 404 |
| POST `/libraries/:kind` | DM | `{entry:SaveInput}` sin `id` | 201 `{ok:true,entry}` |
| PUT `/libraries/:kind/:id` | DM | `{entry:SaveInput}` sin `id` | 200 `{ok:true,entry}`; ausente 404 |

Queries desconocidas/repetidas son 400; cuerpos de DTO admiten solo los campos declarados. Los métodos no soportados en rutas existentes son 405. `:kind` admite únicamente `monsters`, `npcs`, `player-characters`. Los UUID de recursos son generados en servidor; no se aceptan nombres de archivo, propietarios ni rutas de destino. IDs de plantillas existentes son `[a-zA-Z0-9_-]{1,128}` y pueden ser elegidos por el editor, conservando el contrato local. Built-ins no pueden guardarse ni eliminarse.

Tipos compartidos de respuesta: `src/shared/contracts/http-api.ts`. Tipos de escena/biblioteca/plantillas: los contratos de dominio reexportados por `src/shared/api/`. Esquemas estrictos de entrada HTTP: `src/server/schemas.ts`.

- `SceneSummary = {id,name,createdAt,updatedAt}`; nombre 1–200 caracteres tras trim, fechas ISO UTC. Lista por updatedAt descendente e ID ascendente.
- `SceneResource = {...SceneSummary,scene:SceneDocumentV2,warnings,missingImages}`. Warnings `{code:"scene-format-outdated"|"external-link-unresolved",message}`. `missingImages = [{reference,locations:string[]}]`, lugares `maps/<mapId>/map`, `maps/<mapId>/tokens/<tokenId>` y `sceneAside/<monsters|npcs|playerCharacters>/<id>`.
- `AssetDto = {id,reference:"asset:<UUID>",url:"/api/v1/assets/<UUID>",mimeType,byteLength}`. Guardar `reference` en `imagePath`, usar `url` para mostrar. No guardar el origen público como parte del documento.
- `MonsterTemplate` contiene `id,name,system,markdown,css,builtIn:false,updatedAt` (ISO válido). El servidor reemplaza updatedAt. Nombre/sistema 1–200 caracteres, markdown hasta 1 000 000, CSS hasta 200 000.
- `monsters` SaveInput: `name,system,contentMarkdown` obligatorios, `templateId?,imagePath?` opcionales y nullable. Nombre/sistema hasta 200, markdown hasta 1 000 000.
- `npcs`: `name` obligatorio, `imagePath?,notes?` opcionales.
- `player-characters`: `characterName` obligatorio; opcionales `playerName,level,species,classes,imagePath,stats,initiative,armorClass,passivePerception,hitPoints,spellSaveDc,speeds,notes`. stats acepta seis strings opcionales (`strength,constitution,dexterity,intelligence,wisdom,charisma`). Campos breves hasta 200, notes hasta 1 000 000, imagePath hasta 2048 y nullable. armorClass vacío, número o dos números separados por `/`. No se aceptan `id`, `createdAt`, `updatedAt` en SaveInput. Respuesta usa el Entry de dominio completo con metadatos de servidor.

## Imágenes e importación

Importar JSON no lee archivos ni hace fetch: referencias absolutas, relativas y URLs quedan ausentes. Enlaces legacy se conservan con advertencia y no se siguen. Se normaliza con el esquema/migración existente y se rechazan escenas sin mapas y versiones futuras. Se preservan IDs de mapas/objetos, geometría, calibración, contenido privado y mapas inactivos. La versión del formato continúa siendo 2.

Recuperación para 003: subir bytes a POST `/assets`, sustituir las referencias afectadas en la escena cliente (usar las reglas de sustitución de mapas existentes para preservar geometría/IDs), guardar PUT y releer. `missingImages` desaparece para esas referencias; resolve devuelve URL. Una referencia a un asset ausente no invalida toda la escena. Exportar no incrusta imágenes ni transfiere assets: Electron puede abrir el JSON y necesitar sustitución de referencias `asset:` por archivos locales.

PNG/JPEG/WebP se verifican por firma y estructura, no extensión. PNG: CRC de cada chunk, IHDR, IEND, dimensiones, descompresión zlib acotada y scanlines; solo no entrelazado. JPEG: segmentos delimitados, frame de 8 bits, tablas, scan y fin exacto. WebP: contenedor RIFF, tamaños/chunks/frame/dimensiones; solo estático. Máximo 40 millones de píxeles y 160 MiB de scanlines PNG. Después de validar el contenedor, sharp 0.35.5 decodifica el frame completo (también VP8/VP8L) a RGBA y falla ante avisos/errores/truncamientos. Se descarta ese resultado y se guardan los bytes originales: no se recodifica ni eliminan metadatos. No basta leer metadata para confirmar un asset. SVG/HTML, formato no soportado, MIME discordante, corrupción detectada y truncamiento se rechazan con 415/422. JPEG/WebP de prueba son imágenes reales propias. PNG entrelazado y WebP animado requieren conversión por el operador antes de subirlos; devuelven 415 `UNSUPPORTED_IMAGE_VARIANT` con una instrucción de conversión, sin afirmar que el archivo está dañado.

La dependencia nativa sharp se añadió para cerrar el caso de un WebP de 26 bytes cuyo contenedor parecía válido pero carecía de píxeles decodificables. Solo se importa desde infraestructura del servidor; no se incorpora al renderer/preload. En macOS arm64 de esta verificación, libvips ocupa aproximadamente 17 MiB y el binding nativo 300 KiB, más el paquete JavaScript y dependencias. Instalar con `pnpm install --frozen-lockfile` en la plataforma/arquitectura del servicio; no copiar node_modules entre arquitecturas. Se usan `failOn: "warning"`, `limitInputPixels`, `limitInputChannels` y `timeout` según la [documentación oficial del constructor](https://sharp.pixelplumbing.com/api-constructor/) y [timeout](https://sharp.pixelplumbing.com/api-output/#timeout). El límite temporal comienza al procesar en libvips; no incluye espera por el hilo de libuv, acotada por la cuota de solicitudes.

La autorización de mesa y assets está en `src/server/table-http.ts` y `src/server/http.ts`: el jugador solo resuelve o descarga referencias del conjunto reconstruido por `publicTableProjection`. `SceneService.resolve` por sí mismo no concede autorización. Escenas completas, bibliotecas y sus missingImages permanecen exclusivas del DM.

## Persistencia y operación

`ServiceStore` mantiene `service.sqlite` (escenas, assets como BLOB y plantillas), `monsters.sqlite` y `entities.sqlite` (repositorios existentes con migraciones independientes). Cada recurso/catalogación se confirma mediante una sentencia atómica SQLite; los bytes de asset solo se insertan después de validación. WAL y serialización síncrona impiden JSON parcial y pérdidas de catálogo por carreras. PUT aplica última escritura confirmada, sin control optimista de revisión. No hay una transacción entre recursos distintos ni colaboración multi-DM. Borrar una escena no borra assets compartidos; no hay limpieza automática de assets.

`service.lock` excluye instancias simultáneas. Se rechazan symlinks/hardlinks en bases y sidecars al arrancar y rutas de datos con ancestros enlazados; el directorio debe ser privado del usuario del servicio (recién creado usa 0700). No hay endpoints de filesystem ni nombres de archivo derivados de clientes. Un administrador local con escritura al directorio durante ejecución está fuera del aislamiento de red: no permitir procesos ajenos allí. El bloqueo se retira al cerrar por SIGINT/SIGTERM. Tras un cierre forzado, comprobar que no existe proceso vivo y retirar únicamente `service.lock` antes de reiniciar; SQLite recupera WAL. No borrar las bases ni sidecars.

Para backup consistente, detener el servicio y copiar las tres bases y sus sidecars presentes como una unidad; guardar las claves aparte. Restaurar con el servicio detenido y permisos privados. Las sesiones no se respaldan. No se migran ni modifican datos personales Electron. Las lecturas de escenas validan el sobre, UUID, nombre, fechas y su coherencia con las columnas del catálogo, además del documento con el parser/migración vigente y la regla de mapas. Versiones futuras, JSON inválido y sobres inconsistentes devuelven 500 `STORAGE_CORRUPT`, sin exportarse ni sobrescribirse mediante PUT. Solo se aplican las migraciones existentes en memoria, con advertencia. Las plantillas guardadas se revalidan por esquema, identidad, fechas y protección de built-ins; una biblioteca corrupta no se convierte en array vacío y bloquea guardados parciales. El operador puede restaurar una copia válida; otros recursos sanos continúan accesibles. Los demás errores internos devuelven 500 genérico. Al cerrar se liberan sockets/bases.

Verificación: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`. Las pruebas HTTP usan puertos efímeros, directorios temporales y credenciales ficticias; cubren reinicio, roles, límites, fallo SQLite, symlinks, exportación y uploads interrumpidos.

## Cliente y estáticos (3.4.0)

`TTRPG_WEB_DIR` opcional permite servir `out/web`. GET/HEAD confinados al build, CSP sin evaluación dinámica y fallback solo navegación HTML sin extensión; no se aplica a `/api/v1`, archivos ocultos ni assets ausentes. Guía de desarrollo/producción: [cliente navegador](browser-client.md).

Enlaces, todos exclusivos del DM y con esquema estricto:

| Método/ruta | Payload/resultado |
| --- | --- |
| GET `/api/v1/scenes/:id/links/candidates` | `{ok,candidate:{filePath,markers}}`; ID UUID en ruta |
| POST `/api/v1/scene-links/connect` | `{sourceScenePath,sourceMarkerId,targetScenePath,targetMarkerId}` → `{ok,mapAnnotations}` |
| POST `/api/v1/scene-links/disconnect` | `{scenePath,markerId}` → `{ok,mapAnnotations,warning?}` |
| POST `/api/v1/scene-links/validate` | `{scenePath,markers}` → `{ok,statuses}` |
| POST `/api/v1/scene-links/navigate` | `{scenePath,markerId}` → `{ok,resource,entryPoint}` |

Los campos `scenePath` son referencias `scene:UUID`, no rutas. El servidor rechaza IDs ambiguos/bloqueados, revalida reciprocidad y actualiza extremos en transacción, acumulando cambios si el destino anterior y el nuevo pertenecen a la misma escena. Reparar un destino ausente conserva un aviso explícito si ese extremo anterior no pudo actualizarse. La desconexión de un destino ausente limpia el extremo local con aviso; nunca afirma reparación del remoto ausente. Las imágenes Markdown de notas se incluyen en `missingImages`.

El endpoint de conexión entre escenas rechaza marcadores que aún tienen un enlace interno (`peer.mapId`). El cliente exige **Desligar** antes de cambiar de modalidad y solo aplica la desconexión interna cuando el guardado tiene éxito; el dominio rechaza sobrescribir un enlace remoto con uno interno. Esto conserva ambos extremos si la transición se rechaza o falla.

## Mesa privada (3.5.0)

La [mesa sincronizada](synchronized-table.md) completa `/table/*` y `/dice/*`, SSE, presencia e idempotencia. Assets GET/HEAD y resolve aceptan sesión jugador exclusivamente para referencias del conjunto público vigente; no exponen escenas ni bibliotecas privadas.

Guía operativa completa de producción, Electron servicio, HTTPS y respaldo: [Operar el servicio](service-operations.md).
