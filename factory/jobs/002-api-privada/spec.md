# 002 — API privada, escenas, imágenes y bibliotecas

## Estado y dependencia

Especificación propuesta, ciclo 1, 2026-10-28. No representa implementación ni verificación ejecutada. La construcción requiere entrega y aprobación técnica de [001](../001-contrato-clientes/solicitud.md), su contrato común, mapa de capacidades y evidencia; el orquestador autoriza el comienzo. Al redactar este archivo todavía no hay `build.md` de 001.

Se aplican [solicitud](solicitud.md), [migración a servicio](../../migracion-servicio.md) y [AGENTS.md](../../../AGENTS.md). Continuar en `feature/fabrica-software`, conservar los cambios previos, sin staging, commits, push, merge, despliegue ni DMG. Cierre previsto 3.3.0: único bump minor en `package.json` y entrada fechada en español en `CHANGELOG.md`.

## Objetivo y alcance

Ejecutar una instancia privada Node 24 independiente de Electron que gestione escenas, imágenes, plantillas de monstruos y bibliotecas de monstruos/NPC/personajes. El navegador futuro consume HTTP JSON del mismo origen bajo `/api/v1`; Electron local conserva su funcionamiento. Las claves configuradas distinguen DM de jugador. Solo el DM accede a contenido completo, imágenes y bibliotecas en este trabajo.

Incluye servidor, contratos DTO/esquemas compartidos seguros, almacenamiento persistente configurable, importación/exportación `.ttrpgscene`, recuperación de imágenes ausentes, autenticación, límites, pruebas HTTP reales y guía de operación/contrato. La composición arranca y cierra limpiamente sin importar `electron`, abrir ventanas ni depender de `app.getPath()`.

Excluye frontend navegador, diálogos de acceso, SSE, publicación de proyección, cámaras/puntero/dados remotos y exposición de imágenes al jugador: corresponden a 003/004. Excluye cuentas públicas, campañas, varias mesas simultáneas, edición colaborativa, hospedaje, migración automática de datos del perfil Electron y cambios de motores visuales. No crear endpoints vacíos que aparenten soportar operaciones pendientes. La ausencia de UI nueva hace que teclado, proyección y tamaños de ventana se comprueben como ausencia de regresión local, no mediante pantallas ficticias.

## Base existente y reutilización

- `src/domain/sessions/scene-schema.ts`, `scene-document.ts`, `scene-maps.ts`: formato vigente v2, lectura/migración v1, serialización y regla de al menos un mapa para guardar. La versión de aplicación no cambia la versión del documento.
- `src/application/use-cases/save-scene.ts`, `load-scene.ts`, `import-scene-map.ts`: reutilizar reglas y puertos compatibles. No reutilizar ciegamente carga de grafos de archivos enlazados: en servidor ninguna ruta del documento concede lectura del disco.
- `src/application/use-cases/monster-templates.ts`, `monster-library.ts`, `entity-library.ts`, interfaces de repositorios y normalizadores de dominio: conservar comportamiento y validarlo en la frontera HTTP.
- Repositorios SQLite existentes de monstruos/NPC/personajes en `src/infrastructure/database/`: reutilizar; conservar archivos separados si sus migraciones `user_version` independientes así lo necesitan. No compartir una base sin resolver la colisión de migraciones.
- El repositorio de plantillas actual escribe directamente y oculta errores de lectura; se necesita un adaptador seguro para servidor, con escritura consistente y errores recuperables. No convertir corrupción de almacenamiento en una biblioteca vacía silenciosa.
- No reutilizar `map-asset:` ni los adaptadores con diálogos Electron como servidor de archivos.
- Contratos/resultados y composición producidos por 001 se reutilizan; HTTP puede añadir DTO propios sin cambiar firmas nativas ni introducir rutas físicas en la API común.

Reglas funcionales existentes: [escenas multi-mapa](../../../specs/29-multi-map-scenes/spec.md), [conexiones](../../../specs/23-scene-navigation-links/spec.md), [VTT](../../../specs/39-vtt-interface/spec.md), [privacidad de dados](../../../specs/37-dm-dice-rolls/spec.md). No extender sus funcionalidades en este trabajo.

## Configuración y ejecución

Variables documentadas: `TTRPG_HOST` (predeterminado `127.0.0.1`), `TTRPG_PORT` (predeterminado `8787`), `TTRPG_DATA_DIR` (directorio exclusivo del servicio), `TTRPG_PUBLIC_ORIGIN`, `TTRPG_DM_KEY`, `TTRPG_PLAYER_KEY`. Ambas claves son obligatorias, distintas, sin valores predeterminados; exigir al menos 32 caracteres. Rechazar configuración inválida antes de escuchar. No registrar valores, cookies ni cuerpos de login.

El origen público es único y exacto, con esquema/host/puerto; en desarrollo puede ser el origen del proxy web. HTTP solo se permite para origen loopback de desarrollo. Origen remoto exige HTTPS del proxy y cookie Secure. Documentar proxy inverso, bind seguro y configuración; no confiar en `Forwarded`/`X-Forwarded-*` para identidad, seguridad de cookies u origen por defecto. Si se incorpora confianza en proxy debe ser explícita y limitada a pares conocidos. Validar `Host` según despliegue/origen configurado para no permitir DNS rebinding.

Comandos nuevos obligatorios: `pnpm dev:api`, `pnpm build:api`, `pnpm start:api`. Build genera artefacto separado del Electron y start ejecuta ese artefacto en Node 24. El operador puede reiniciar con el mismo directorio y recuperar todos los recursos confirmados. Sesiones pueden ser efímeras y expirar al reiniciar; documentarlo. No cambiar `pnpm dev` local.

## Convenciones HTTP

Todas las rutas de las tablas llevan prefijo `/api/v1`. JSON UTF-8. Éxitos JSON llevan `ok: true` y los campos explícitos de cada ruta; fallo común:

```json
{"ok":false,"error":{"code":"VALIDATION_ERROR","message":"La escena no es válida."}}
```

`message` comprensible en español; `code` estable para el cliente. Opcional `details` solo con nombres de campos seguros, nunca stack, SQL, claves o rutas del servidor. Códigos HTTP: 400 JSON/ID/query inválidos, 401 sin sesión/vencida o credenciales inválidas, 403 rol/origen prohibido, 404 recurso inexistente, 405 método no soportado, 409 conflicto, 413 cuerpo demasiado grande, 415 MIME no admitido, 422 documento/entrada inválida, 429 límite, 500 error interno. Error de credenciales no distingue cuál clave existe. Respuestas privadas y de sesión llevan `Cache-Control: no-store`.

IDs nuevos de escenas, assets y entradas de biblioteca los genera el servidor, opacos (por ejemplo UUID aleatorio); nunca representan rutas. Los IDs de objetos dentro de escenas y las identidades existentes de plantillas conservan sus reglas de dominio. Parámetros de ruta se validan tras decodificación y no se concatenan como rutas libres. Consultas desconocidas, payloads de forma incorrecta y propiedades privilegiadas como `role`, rutas de salida o propietarios no conceden capacidades.

### Salud y sesión

| Método y ruta | Acceso | Entrada | Respuesta |
| --- | --- | --- | --- |
| `GET /health` | Sin sesión | Ninguna | 200 `{ok:true,status:"ok",version}`; versión de `package.json`, sin detalles de disco/configuración |
| `POST /auth/login` | Sin sesión | `{key:string}` | 200 `{ok:true,role:"dm"\|"player",expiresAt:string}` y cookie; rol derivado de clave |
| `GET /auth/session` | DM/jugador | Cookie | 200 `{ok:true,role,expiresAt}`; sesión inválida da 401 |
| `POST /auth/logout` | Sesión o cookie caducada | Sin cuerpo | 204, revoca token y borra cookie; idempotente |

Token aleatorio con entropía suficiente, no contiene clave ni rol modificable. Cookie `HttpOnly; SameSite=Strict; Path=/api/v1`, sin `Domain`, `Secure` en origen HTTPS; HTTP loopback es excepción documentada. Expiración absoluta predeterminada 8 horas, contrastada en cada petición; no basta el vencimiento del navegador. Login rota/reemplaza sesión previa y logout revoca del lado servidor. Comparar secretos sin filtraciones triviales por tiempo. Almacén de sesiones acotado (máximo documentado, inicialmente 1000) y limpieza de vencidas.

Rechazar `Origin` inesperado en toda petición que lo incluya. Exigir `Origin` igual al configurado en métodos mutantes, login y logout incluidos; ausencia o `null` da 403. Esto también aplica a uploads. No habilitar CORS comodín ni reflejar orígenes arbitrarios. GET/HEAD autenticados sin Origin pueden servir imágenes o clientes HTTP; no tienen efectos secundarios. Documentar cómo los tests/CLI envían Origin. El proxy web mantiene el origen permitido.

Límite de login inicialmente 10 intentos por minuto por dirección de conexión, con 429 y `Retry-After`; almacén acotado y vencimiento. No aceptar IP elegida por header no confiable. Límite general por sesión/dirección y timeouts de cabeceras/cuerpo documentados. El constructor puede ajustar valores por evidencia, manteniendo constantes centralizadas, contrato y tests actualizados.

### Escenas

`SceneSummary = {id,name,createdAt,updatedAt}`. `SceneResource = {id,name,createdAt,updatedAt,scene,warnings,missingImages}`. `scene` usa el documento v2 existente; advertencias de migración son explícitas. Fechas ISO 8601 UTC y nombre limitado a 1–200 caracteres.

`missingImages` enumera `{reference,locations}`: referencia original y ubicaciones estables de sus usos (mapa/token/entidad), solo para DM. Identificar mapas activos e inactivos, tokens y retratos de escena. Una ruta de usuario puede aparecer como dato original de una importación, nunca como ruta física del almacenamiento del servicio.

| Método y ruta | Acceso | Entrada | Respuesta |
| --- | --- | --- | --- |
| `GET /scenes` | DM | `limit` 1–100 (50), `offset` entero no negativo (0) | 200 `{ok:true,scenes:SceneSummary[],total:number}`; orden estable por actualización e ID |
| `POST /scenes` | DM | `{name,scene}` | 201 `{ok:true,resource:SceneResource}` y `Location` |
| `GET /scenes/:id` | DM | ID | 200 `{ok:true,resource:SceneResource}` |
| `PUT /scenes/:id` | DM | `{name,scene}` | 200 `{ok:true,resource:SceneResource}`; ID desconocido da 404 |
| `DELETE /scenes/:id` | DM | ID | 204; posterior lectura 404 |
| `POST /scenes/import` | DM | `{name,scene:unknown}`; documento v1 o v2 parseado por cliente | 201 `{ok:true,resource:SceneResource}`; nunca requiere ruta de archivo |
| `GET /scenes/:id/export` | DM | ID | 200 JSON de escena sin envoltorio, `Content-Disposition: attachment` con nombre seguro `.ttrpgscene` |

Crear/importar genera un nuevo ID de recurso independiente de IDs internos de mapas; actualizar conserva ID y `createdAt`. Reutilizar serialización/normalización existente y conservar contenido, objetos, cámaras, efectos, datos privados, mapas y enlaces internos. No guardar borrador sin mapas. PUT es reemplazo completo consistente; no requiere colaboración multi-DM. Si no se incorpora control de revisión, declarar política de última escritura confirmada y probar que no produce JSON parcial ni pérdida del catálogo por carreras.

Importación no sigue rutas absolutas/relativas de imágenes ni enlaces heredados a otros archivos. La imagen queda ausente y recuperable; un enlace externo queda sin resolver con advertencia. El fichero original no se modifica. No quitar contenido silenciosamente ni añadir un nuevo formato incompatible. Exportar devuelve el documento normalizado que también entiende Electron local; las referencias de assets remotos pueden necesitar sustitución de imágenes allí. El archivo sigue siendo JSON sin imágenes incrustadas y sin promesa de paquete autocontenido.

### Imágenes y recuperación

Referencia canónica en campos `imagePath` existentes: `asset:<id>`; URL utilizable por el cliente: `/api/v1/assets/<id>`. Se guardan referencias, no URLs absolutas ni rutas del servidor. El esquema actual ya admite strings; no incrementar su versión. Las referencias locales importadas quedan como datos no resolubles hasta que el DM las sustituya. Ningún resolver intenta leerlas ni descargar URLs remotas.

| Método y ruta | Acceso | Entrada | Respuesta |
| --- | --- | --- | --- |
| `POST /assets` | DM | Bytes de imagen como cuerpo; `Content-Type` permitido | 201 `{ok:true,asset:{id,reference,url,mimeType,byteLength}}` |
| `GET /assets/:id` | DM | ID | 200 bytes verificados, MIME real, `X-Content-Type-Options: nosniff` |
| `POST /assets/resolve` | DM | `{references:string[]}`; máximo 200 | 200 `{ok:true,assets:[{reference,url:string\|null}]}`; locales/desconocidas dan null |

MIME inicial permitido PNG/JPEG/WebP. Verificar firmas y estructura mínima del formato; no confiar en extensión ni header. Rechazar SVG/HTML y MIME declarado que no coincide, archivos truncados o inválidos. No usar Electron para decodificar. Documentar tamaño/píxeles soportados si se validan dimensiones. Límite inicial 20 MiB por imagen con contador de bytes real incluso sin `Content-Length`, comprobado antes de retener un cuerpo ilimitado; limpiar temporales al abortar/rechazar. JSON máximo 10 MiB, login 4 KiB, referencias 2 KiB por string. No aceptar nombres de archivo como destinos.

Recuperación concreta: subir archivo, sustituir referencias afectadas en la escena cliente y guardar con PUT; al releer, `missingImages` ya no incluye esas referencias y resolver devuelve la URL. No hace falta endpoint de parche por ruta JSON arbitraria. Usar las reglas existentes de sustitución de mapas para conservar IDs/calibración al efectuar esta acción en 003. Asset inexistente referenciado por escena queda ausente recuperable; no falla la lectura completa. No borrar assets al borrar escenas porque pueden estar compartidos; limpieza automática y eliminación de assets quedan fuera de alcance.

En 002 el jugador y anónimo no pueden descargar ni resolver assets, aunque conozcan un ID válido. En 004 se añadirá autorización explícita únicamente para assets referenciados por una proyección filtrada/validada. No preparar acceso global por el mero hecho de tener cookie de jugador ni por marcar `visible` dentro de una escena completa.

### Plantillas y bibliotecas

Solo DM. Reutilizar tipos de dominio comunes de 001, con esquemas HTTP estrictos y límites antes de normalizar. Sin operaciones de borrado de biblioteca nuevas: el contrato nativo hoy expone búsqueda, lectura y guardado. Se mantiene borrado de plantillas de usuario y protección de plantillas incorporadas.

| Método y ruta | Entrada | Respuesta |
| --- | --- | --- |
| `GET /monster-templates` | Ninguna | 200 `{ok:true,templates:MonsterTemplate[]}` |
| `PUT /monster-templates/:id` | `{template:MonsterTemplate}` con ID coincidente | 200 `{ok:true,templates}`; validar reglas de plantilla editable |
| `DELETE /monster-templates/:id` | ID de plantilla de usuario | 200 `{ok:true,templates}` |
| `GET /libraries/:kind` | `text` hasta 200 caracteres; `limit` 1–100, predeterminado 50 | 200 `{ok:true,entries}` |
| `GET /libraries/:kind/:id` | ID | 200 `{ok:true,entry}`; desconocido 404 |
| `POST /libraries/:kind` | `{entry}` con SaveInput del tipo sin ID elegido por cliente | 201 `{ok:true,entry}` |
| `PUT /libraries/:kind/:id` | `{entry}` con campos SaveInput; ID solo en ruta | 200 `{ok:true,entry}`; desconocido 404 |

`:kind` solo `monsters`, `npcs`, `player-characters`. Imágenes de biblioteca usan referencias iguales a las escenas. Normalizadores existentes conservan reglas de negocio, pero no sustituyen validación HTTP de tipos/longitudes ni autorización. Los metadatos de creación/actualización los controla el servidor. Los payloads no pueden sobrescribir plantillas incorporadas ni convertirlas en editables.

## Persistencia y consistencia

Separar handlers/transporte, servicios de aplicación y adaptadores de infraestructura. Guardar bajo `TTRPG_DATA_DIR` con nombres derivados exclusivamente de IDs validados. Ningún endpoint lista directorios ni recibe rutas para abrir/guardar. Revisar symlinks y asegurar confinamiento de recursos; la importación de una ruta local nunca toca esa ruta, aunque exista en el host.

Escenas/catálogo y plantillas se escriben en transacción SQLite o mediante temporal/rename más serialización de mutaciones; definir la unidad de consistencia. Repositorios SQLite con consultas parametrizadas y migraciones versionadas. Un fallo no debe dejar un recurso confirmado ilegible ni perder otro recurso confirmado. Assets se publican solo después de escritura completa y validación; ante fallo eliminar temporales o registrar recuperación segura. No servir archivos de staging ni permitir acceso estático directo al directorio de datos. Al cerrar liberar sockets y bases.

## Criterios de aceptación observables

1. API compilada arranca con Node 24 sin proceso ni import runtime de Electron. Salud muestra la versión real; configuración insegura/incompleta falla de forma útil sin secretos.
2. Login DM y jugador crea sesiones de rol correcto; cambiar `role` en payload/cookie no eleva privilegios. Expiración y logout invalidan peticiones posteriores. Rotación, cookie y límites verificados.
3. Matriz HTTP real de anónimo/DM/jugador para cada familia: 401 anónimo, 403 jugador, éxito DM; salud/login y sesión/logout son excepciones explícitas. Rechazo de origen ausente/inesperado en mutaciones, de Host inesperado y de credenciales inválidas.
4. CRUD de escenas y búsqueda/guardado de las tres bibliotecas y plantillas funciona y sobrevive a reinicio. La eliminación de escena es observable y no elimina imágenes compartidas.
5. Importar fixtures v1/v2 preserva datos y migración existente. Exportación parsea con `parseSceneJson`; escenas sin mapas/JSON inválido/versión futura fallan sin escritura parcial. Documentos multi-mapa conservan referencias e imágenes de todos sus mapas.
6. Una referencia a un archivo real externo, una URL remota o un enlace legacy no provoca lectura ni fetch del host. Se informa ausencia; upload + PUT la resuelve sin cambiar geometría, calibración ni IDs.
7. Imágenes válidas se sirven con MIME verificado y bytes idénticos; SVG/HTML, MIME falso, truncados, tamaño excesivo y upload interrumpido son rechazados sin publicar recurso. Jugador no obtiene asset privado por ID conocido.
8. Traversal simple, codificado y doblemente codificado, separadores, IDs inválidos, symlinks y nombre sugerido malicioso no permiten leer/escribir fuera del directorio. Se comprueba con archivo centinela externo.
9. Pruebas de cuerpos con y sin Content-Length, límites, consultas inválidas, SQL como texto, escrituras concurrentes y fallo de persistencia prueban errores útiles y estado anterior válido. Tras reinicio se recuperan todos los recursos confirmados.
10. Guía del servidor contiene variables, comandos, proxy/HTTPS, sesión/expiración, almacenamiento/respaldo, límites, todas las rutas/DTO/errores y ejemplos redactados sin claves reales. 003 puede implementar adaptador sin inferir endpoints; 004 identifica dónde extender autorización de assets.
11. Electron local conserva contratos y comportamiento; no se expone fs/Electron en tipos compartidos ni se agrega credencial al renderer. CI local común y build/start API pasan con evidencia real.

## Verificación y entrega

En `build.md` registrar entorno Node 24, comandos, pruebas y limitaciones. Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`; humo de `pnpm start:api` contra puerto efímero o libre y directorio temporal. Incluir pruebas con servidor HTTP real y `fetch`/cliente Node, cookies separadas por rol, temporales aislados y reinicio de instancia; no basta mock de handlers. Probar tiempo de expiración con reloj inyectable sin esperas largas. Prueba de arranque del artefacto compilado además de tests de fuentes.

No se exige navegador ni publicación en este trabajo. Si el entorno impide un humo Electron, documentar el límite y evidencias disponibles sin declarar comprobación visual ejecutada. No generar DMG.

## Riesgos y dudas de construcción

- Bloqueo actual de secuencia: contrato/evidencia de 001 aún pendientes; el orquestador decide su disponibilidad. No construir adelantadamente.
- Los puertos de carga locales contemplan lectura de grafos/rutas; reutilizarlos sin adaptador restringido vulneraría el aislamiento. Reutilizar dominio y proporcionar almacenamiento con referencias autorizadas.
- Referencias `asset:` mantienen el JSON legible por el esquema, pero no transfieren archivos al exportar. La recuperación de imágenes debe quedar clara en contrato y UI posterior; si aparece incompatibilidad real del formato, informar antes de modificarlo.
- Validación de imágenes debe verificarse con fixtures reales. Elegir implementación pequeña y justificar cualquier dependencia; una firma aislada no demuestra que el archivo sea válido.
- Estructura final de contratos puede variar por 001. El constructor coordina nombres/imports con ese resultado y documenta cualquier ajuste del contrato HTTP antes de desbloquear 003/004; no cambia silenciosamente rutas o permisos aquí definidos.
