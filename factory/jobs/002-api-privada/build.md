# Construcción 002 — API privada

Fecha: 2026-10-28. Ciclo 1, corrección de ronda 1 terminada y lista para ronda 2. Rama comprobada: `feature/fabrica-software`. Dependencia 001 con decisión APROBAR y cuatro revisiones APROBADO leídas; se conservaron sus cambios y los anteriores de la fábrica.

## Resultado

Servicio HTTP real en Node.js 24, independiente de Electron, bajo `/api/v1`. Incluye configuración validada, sesiones privadas DM/jugador, cookies y cuotas, escenas CRUD/importación/exportación, uploads y resolución privada de imágenes, plantillas y tres bibliotecas persistentes. Solo DM accede a recursos privados. El jugador puede iniciar, consultar y cerrar sesión; no hay endpoints simulados de proyección/SSE.

Versión de aplicación **3.3.0**, bump minor único de este trabajo y changelog en español. Formato `.ttrpgscene` sigue en 2 con migración de 1. Se añadió sharp 0.35.5 exclusivamente para decodificación real de imágenes en el servidor, con justificación y límites descritos abajo. No se alteraron contratos/preload/renderer de Electron. Se reutilizan dominio de escenas, casos de uso de bibliotecas/plantillas y repositorios SQLite existentes, en archivos distintos.

## Archivos afectados por 002

- `src/server/{index,http,config,auth,errors,schemas,scene-service,vite.config}.ts`: composición Node, rutas, autenticación, validación y servicio de escenas.
- `src/infrastructure/server/{service-store,image-validation,persisted-records}.ts`: persistencia SQLite transaccional, revalidación de sobres/documentos guardados y validación estructural más decodificación real de imágenes.
- `src/shared/contracts/http-api.ts`: DTO de sesión, errores, recursos de escena, warnings e imágenes, sin imports runtime privilegiados.
- `src/server/{http,auth,image-validation}.test.ts` y `src/server/fixtures/`: pruebas HTTP reales, límites y fixtures propios JPEG/WebP con procedencia CC0. PNG mínimo válido incluido como base64 de prueba.
- `package.json` y `pnpm-lock.yaml`: dependencia sharp, versión conservada 3.3.0 y comandos `dev:api`, `build:api`, `start:api`.
- `docs/private-api.md`: contrato completo efectivo, configuración, proxy, sesiones, límites, operación, recuperación y extensión para 004.
- `README.md`, `CHANGELOG.md` y estado inicial de `docs/client-architecture.md`: enlaces/versión y reconocimiento del backend ya implementado.

No se editaron tablero, backlog, solicitud, spec, revisiones ni decisiones. El único archivo de expediente escrito por este constructor es este informe (publicado por temporal/rename).

## Contrato para 003/004 y decisiones concretas

La fuente operativa es `docs/private-api.md`: tablas de todas las rutas, cuerpos, respuestas y códigos. Prefijo exacto `/api/v1`, cookie `ttrpg_session`; referencias `asset:<UUID>` y URL `/api/v1/assets/<UUID>`. El cliente debe enviar Origin en toda mutación y cookies same-origin. Errores `{ok:false,error:{code,message}}`. `SceneResource` incluye documento normalizado, warnings y `missingImages` por mapa/token/entidad. Los links de archivos se conservan pero no se siguen; no existe endpoint de filesystem.

Decisiones dentro del margen del contrato:

- Assets como BLOB SQLite: bytes, metadata e ID se publican en una única escritura atómica, sin archivos temporales ni rutas de recurso que puedan atravesarse. No se borran al eliminar escenas.
- Escenas y su catálogo comparten fila SQLite; lista consulta solo metadatos, no carga documentos enteros. PUT aplica última escritura confirmada, sin control de revisión.
- Tres bases separadas para conservar migraciones existentes. Un lock exclusivo impide dos instancias sobre el directorio. Cierre SIGINT/SIGTERM idempotente; tras kill forzado se requiere comprobar ausencia de proceso y retirar lock obsoleto, documentado.
- JPEG/PNG/WebP permitidos con estructura mínima y límite de 40 millones de píxeles; PNG no entrelazado (CRC + descompresión + scanlines hasta 160 MiB), JPEG de 8 bits con segmentos/tablas/scan/fin, WebP estático con contenedor/chunks/frame. Tras validar estructura, sharp/libvips decodifica el frame completo a RGBA acotado, también JPEG/VP8/VP8L. El resultado se descarta; el BLOB conserva los bytes originales. No basta el éxito de una lectura de metadatos. PNG entrelazado y WebP animado necesitan conversión antes del upload.
- Decodificación con failOn warning, límite de 40 millones de píxeles/4 canales, 15 s de procesamiento y dos operaciones simultáneas sin cola por servidor; saturación devuelve 429. PNG entrelazado y WebP animado devuelven 415 UNSUPPORTED_IMAGE_VARIANT con instrucciones de conversión.
- Cabeceras 16 KiB/10 s, cuerpo 30 s, JSON 10 MiB, imagen 20 MiB, login/logout 4 KiB, 100 conexiones. Login 10/min/IP, general 600/min/IP. Proxy comparte IP/cuota; no se confía en Forwarded/X-Forwarded-*.
- Un cuerpo chunked excesivo descarta memoria retenida y se drena hasta fin/timeout antes de responder; evita un reset TCP que oculta el 413. Content-Length excesivo permite rechazo temprano.
- `dev:api` compila y ejecuta; no implementa watcher. Artefacto `out/api/index.mjs` usa dependencias de producción, incluyendo sharp y binarios nativos de la arquitectura instalada; no es un ejecutable autocontenido.
- Se documenta 408 por timeout. No hay caso actual de conflicto 409. IDs de plantillas conservan edición por ID de usuario, y built-ins son protegidas.

Para 004 el punto de extensión está antes de la descarga privada en `http.ts`: autorizar assets del jugador únicamente mediante referencias de una proyección filtrada/validada. `SceneService.resolve` solo resuelve IDs, no concede permisos. El cliente 003 debe mantener desactivadas capacidades aún no implementadas, sin convertir el rol en una comprobación de seguridad React.

## Criterios y evidencia

| Criterio | Evidencia real |
| --- | --- |
| 1. Arranque Node/configuración | Build separado, sin import runtime Electron en artefacto; humo `pnpm start:api` con Node 24.15.0 y salud 3.3.0. Pruebas rechazan claves iguales/cortas, origen remoto HTTP, origen con ruta y puerto inválido antes de escuchar. |
| 2. Sesiones/rol | HTTP real verifica DM/player, cookie HttpOnly/SameSite/Path/Max-Age/Secure, rechazo de role extra, cookie manipulada, rotación, revocación, logout idempotente y reloj inyectado para expiración. Prueba de 1000 sesiones y recuperación de capacidad. |
| 3. Matriz de acceso | Todas las familias y mutaciones probadas con anónimo 401, jugador 403 y DM exitoso; assets conocidos siguen privados. Host/Origin ausentes/inesperados y claves inválidas rechazados; cuotas e IP de conexión ignorando X-Forwarded-For. |
| 4. Persistencia | CRUD escenas, búsqueda/lectura/guardado/actualización de tres bibliotecas y plantillas comprobados antes/después de reinicio. Built-ins protegidas; borrar escena deja asset compartible. Humo compilado repite reinicio y biblioteca persistida. |
| 5. Escenas | Fixtures de dominio v1/v2, multi-mapa activo/inactivo, import/export parseable por parseSceneJson. Versión futura, documento roto y escena sin mapas rechazados sin publicar. |
| 6. Imágenes ausentes/enlaces | Archivo centinela real y URL no resuelven; links legacy conservan referencia/aviso. MissingImages incluye mapas, tokens y retratos. Upload + PUT elimina ausencia conservando ID y grilla/calibración. Ningún resolver abre rutas importadas ni hace fetch. |
| 7. Uploads | PNG/JPEG/WebP reales regresan bytes idénticos con MIME/nosniff; MIME falso, SVG, HTML, truncamiento y dimensiones excesivas rechazados. Upload abortado y excesivo no publican filas de assets. |
| 8. Confinamiento | Traversal crudo simple, codificado/doble, separadores y UUID inválidos dan 400; exportación usa nombre UUID seguro incluso ante nombre con CRLF. Symlink de base a centinela externo y segunda instancia rechazados sin modificar centinela. Revisión de código: ni endpoints ni referencias conceden rutas. |
| 9. Límites/consistencia | Cuerpos Content-Length y chunked, límites de referencias/campos, queries inválidas/repetidas, SQL como texto y escrituras concurrentes. Trigger SQLite fuerza fallo de PUT: 500 sin SQL/path, estado confirmado previo sobrevive reinicio. Corrupción lógica de documentos/sobres/plantillas produce STORAGE_CORRUPT al releer, exportar o reutilizar; no se reescribe y los recursos sanos siguen accesibles. |
| 10. Guía completa | docs/private-api.md incluye variables, comandos, proxy/HTTPS, DTO/rutas/errores, cookies, cuotas, respaldo/recuperación, variantes de imagen y punto de autorización de assets para 004. |
| 11. Sin regresión local | Suite común y build Electron pasan; sin cambios de UI, preload, IPC, motores ni perfil local. Tipos HTTP importan dominio solo por tipo. Humo API usa datos/credenciales temporales y limpia procesos/directorio. |

## Comandos y resultados

Entorno real: Node **v24.15.0**, pnpm **11.1.2**, macOS arm64. Todos los procesos HTTP de pruebas y humo usan puertos efímeros/libres y directorios temporales; no se abrió ni migró la biblioteca personal Electron.

- `pnpm typecheck`: PASS, código 0. Último log `/tmp/ttrpg-002-r2-build-api.log (incluye typecheck)`.
- `pnpm lint`: PASS, código 0. Último log `/tmp/ttrpg-002-r2-lint.log`.
- `pnpm test`: PASS, **114 archivos / 1068 pruebas**. Log `/tmp/ttrpg-002-r2-test.log`. Advertencias conocidas de canvas jsdom sin paquete nativo; no fallos.
- `pnpm exec vitest run src/server`: PASS, **3 archivos / 50 pruebas**. Ejecutado directamente en esta corrección y contenido en la suite global `/tmp/ttrpg-002-r2-test.log`. Son parte de la suite común, no se suman de nuevo.
- `pnpm build`: PASS; main/preload/renderer compilados. Log `/tmp/ttrpg-002-r2-build.log`.
- `pnpm build:api`: PASS; typecheck y artefacto `out/api/index.mjs` (~100 KiB), log `/tmp/ttrpg-002-r2-build-api.log`.
- Humo real: `pnpm exec node /tmp/ttrpg-002-r2-smoke.mjs`, que lanza **pnpm start:api**, consulta salud/login/roles, escribe NPC, cierra/reinicia y comprueba persistencia, invalida sesión anterior y prueba logout. Además rechaza el WebP C-1 con cero assets publicados y comprueba GET/exportación de versión 999 tras reiniciar: 500 STORAGE_CORRUPT. PASS; log `/tmp/ttrpg-002-r2-smoke.log`.
- `pnpm install --frozen-lockfile`: PASS; log `/tmp/ttrpg-002-r2-install.log`, sin cambios de resolución pendientes.
- Búsqueda de import/require Electron en artefacto API: sin resultados. Procesos de humo cerrados.
- `git diff --check`: PASS.

Los logs/scripts bajo `/tmp` son evidencia temporal; resultados y procedimientos están resumidos aquí y las pruebas persistentes viven en src/server.

## Historial de construcción y corrección

La construcción inicial pasó 114 archivos/1051 pruebas, 33 de servidor. El desarrollo resolvió errores de tipos de repositorio/config Vite, fixtures PNG con CRC inválido, arnés HTTP que normalizaba Host/rutas, manejo de límites chunked con respuesta 413 y shutdown idempotente ante señales duplicadas del grupo pnpm. Se verificó de nuevo la funcionalidad afectada; no quedan checks fallidos abiertos.

### Ronda 1: hallazgos resueltos

Se leyeron completos los cuatro informes `ronda-1/revision-{seguridad,ux,ui,codigo}.md`. Seguridad y código pidieron CAMBIOS; UX/UI aprobaron y UX dejó una mejora no bloqueante. No se reanudó construcción antes de recibir los cuatro.

- **C-1 (código):** se mantiene la reproducción hexadecimal exacta de 26 bytes y se añaden truncamientos de VP8 y VP8L cuyos tamaños RIFF/chunk se recalculan. HTTP devuelve 422 y la tabla assets sigue vacía. VP8L real válido devuelve 201 y bytes idénticos. Antes de insertar se exige decodificación completa con sharp, failOn warning, límites de píxeles/canales/tiempo y cuota por instancia; un test comprueba 429 al saturar y liberación de cupos incluso tras error.
- **C-2 (código) y P2 seguridad:** nuevo `persisted-records.ts` valida el sobre guardado, UUID, nombre, fechas, warnings y coherencia con columnas SQLite. El documento se procesa con el esquema/serialización versionados existentes y regla de mapas; versiones desconocidas, estructura rota y JSON inválido nunca salen como éxito ni se exportan. GET y PUT consultan el mismo límite de persistencia; la lectura no escribe. El catálogo valida sus metadatos. Migración admitida v1 conserva compatibilidad y produce warning.
- **Plantillas persistidas:** se valida esquema, ID frente a la fila, fechas y protección de plantillas incorporadas. Listas corruptas devuelven STORAGE_CORRUPT, nunca array vacío. Antes de guardar/borrar se valida el estado existente para evitar una escritura seguida por un error al construir la respuesta. Pruebas de identidad, builtIn, forma, fecha y JSON corruptos comprueban fila original intacta y ausencia de una nueva fila parcial.
- **UX-01:** PNG entrelazado y WebP animado válidos devuelven 415 UNSUPPORTED_IMAGE_VARIANT con instrucción de conversión; fixtures reales verifican que no se describen como archivos dañados.
- **UI:** sin correcciones requeridas ni cambios de presentación. Todos los comentarios nuevos de esta implementación están en español.

**Dependencia justificada:** sharp 0.35.5 y lockfile se añadieron con pnpm porque validar solo el contenedor admitía un flujo de imagen inexistente. Se verificó su API en documentación oficial del [constructor](https://sharp.pixelplumbing.com/api-constructor/) y [timeout](https://sharp.pixelplumbing.com/api-output/#timeout), además de tipos instalados. En este macOS arm64 se midieron ~17 MiB de libvips, 300 KiB del binding y ~1 MiB del paquete sharp. Es dependencia nativa del servicio: instalar con pnpm en su plataforma/arquitectura, sin copiar node_modules entre arquitecturas. El timeout de libvips mide procesamiento, no espera en libuv; cuota sin cola limita solicitudes activas. No hay import de sharp/libvips en main/preload/renderer. La búsqueda textual del bundle renderer encuentra solo términos existentes de Pixi (`sharpCorner`, comentarios); su hash de archivo permanece igual. El único import real de sharp del build nuevo está en el artefacto API. El empaquetado multiplataforma corresponde a la entrega posterior; aquí se verificaron Node local y build Electron, sin producir DMG.

No hay fallos pendientes ni bump adicional; versión final sigue **3.3.0**. La suite global final de 1068 incluye los 50 tests de servidor; no deben sumarse otra vez.

## Límites de verificación y Git

No se ejecutó inspección visual ni humo Electron manual en 002: no hay UI nueva ni cambios de renderer y la evidencia local es suite/build. No se levantó proxy TLS real ni un despliegue remoto; Secure/Host/Origin HTTPS se probaron en servidor HTTP local con headers de proxy controlados. Se prueba decodificación real de los fixtures admitidos y de los ataques reproducidos; no se afirma fuzzing exhaustivo ni compatibilidad con todos los codificadores. No se promete backup sin detener ni supervivencia automática del lock a SIGKILL.

Sin staging, commits, push, merge, despliegue ni DMG. Los cambios quedan sin commit en la rama autorizada, listos para las cuatro revisiones. No se escribió historial Git; una aprobación técnica no concede autorización para integrarlos.
