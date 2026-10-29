VEREDICTO: CAMBIOS

# Revisión independiente de seguridad — 004, ciclo 1, ronda 1

Fecha: 2026-10-29. Revisor: seguridad_004. Código congelado en `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. No se editaron implementación, Git, tablero ni informes ajenos.

## Alcance revisado

Leídos AGENTS.md, perfil seguridad.toml, solicitud.md, spec.md, build.md y revision.md. Inspeccionados fuentes reales, archivos nuevos, diff de integración, contratos HTTP/SSE, proyección pública, sesión de mesa/dados, autorización, rutas de assets y estáticos, adaptador navegador, consumo Player y documentación de límites. Las 519 huellas de `huellas.json` coinciden con el contenido revisado.

La revisión encuentra dos problemas demostrados. La separación de roles y la eliminación de secretos de la proyección funcionan en las pruebas ejecutadas, pero no bastan para aceptar la disponibilidad y revocación de las operaciones nuevas.

## Hallazgos

### SEG-004-01 — P1: un jugador agota la deduplicación global y bloquea operaciones del DM con reportes válidos

Ubicaciones: `src/server/table-http.ts:66` y `src/application/services/table-session.ts:114–115`.

Cada reporte de cámara devuelve `table.state(role)`, incluido el snapshot completo. `once` retiene el resultado y contabiliza su JSON completo por petición dentro de un único presupuesto global de 64 MiB durante cinco minutos. No hay separación entre reportes del jugador y órdenes del DM. Agotar ese presupuesto impide toda transición nueva, incluso publicar otra escena o emitir un puntero. El límite está documentado, pero su consumo depende del tamaño de la escena repetida en respuestas de reportes pequeños; un uso permitido consume el presupuesto en segundos.

Reproducción independiente con HTTP real, cookies DM/jugador separadas, SSE real y directorio SQLite temporal:

1. Publicar una escena válida con 20 trazos de 500 puntos; el snapshot público serializado ocupa **367.308 bytes**, muy por debajo del límite de 10 MiB. La escena parte de la fixture del proyecto y conserva un mapa activo.
2. Abrir stream jugador y usar su `connectionId`, contexto vigente, revisiones crecientes y coordenadas finitas. Enviar `camera-report` intermedios con UUID únicos a diez reportes por segundo, avanzando 100 ms el reloj inyectado del servidor entre peticiones. No se elude el throttle ni se alcanza el límite de 600 peticiones/minuto.
3. Se aceptan **182 reportes**. El **183.º**, a **18,3 segundos simulados**, responde **409 TABLE_CONFLICT**, «Demasiadas operaciones pendientes de deduplicación. Espera cinco minutos.»
4. Una orden DM nueva `POST /table/pointer` también responde **409** con ese mismo error.

Impacto: un jugador autenticado puede impedir cambios y efectos de la mesa sin permiso de edición; una navegación normal sostenida también puede producir el bloqueo. La reproducción no requiere payloads enormes del jugador, simultaneidad ni conocimiento de secretos.

Corrección esperada: evitar almacenar/contabilizar snapshots completos por acuses de reportes; conservar resultados idempotentes compactos y aislar cuotas para que actividad del jugador no agote la capacidad de órdenes DM. Mantener la ventana contractual de cinco minutos y el conflicto por reutilización de UUID, sin resolverlo eliminando prematuramente entradas válidas. Añadir una prueba de carga legítima con escena no trivial que demuestre que reportes dentro de sus límites no bloquean al DM.

### SEG-004-02 — P2: una operación de dados pendiente conserva autorización después de logout

Ubicación: `src/server/http.ts:98–104`.

Se obtiene `session = auth.require(req)` antes de esperar el cuerpo HTTP. Después de `await json(req, res)` se ejecuta la operación usando el rol capturado, sin comprobar que esa misma sesión siga vigente. Mientras se espera el cuerpo pueden completarse logout, rotación o caducidad. Las rutas nuevas de mesa/dados quedan expuestas a esta autorización obsoleta.

Reproducción independiente, en la misma API temporal pero **antes** de agotar la cuota del hallazgo anterior:

1. Iniciar `POST /api/v1/dice/context` con cookie DM válida y un cuerpo JSON correcto, enviando inicialmente solo su primer carácter. Dejar pendiente el resto del cuerpo.
2. Completar `POST /auth/logout` en otra conexión con la misma cookie: **204**.
3. Finalizar el cuerpo pendiente de `/dice/context`: devuelve **200**, ejecuta `setContext` y entrega `DiceSessionState` del DM pese a que la cookie ya fue revocada.

Impacto: logout no impide que una solicitud aún sin validar modifique el contexto de dados y reciba el estado privado. La ventana está acotada por el timeout del cuerpo (30 s); no se afirma que una cookie revocada pueda iniciar una petición nueva, ni que un jugador pueda convertirse en DM.

Corrección esperada: leer/validar el cuerpo y revalidar la sesión original inmediatamente antes de ejecutar o devolver datos protegidos, sin sustituirla por otra sesión. Rechazar con 401 si fue revocada, rotada o caducó, sin mutar la mesa/dados. Añadir regresión de cuerpo parcial + logout/expiración.

## Evidencias positivas y verificaciones

- Ejecutado `pnpm test src/server/table-http.test.ts src/server/http.test.ts src/server/auth.test.ts src/application/services/public-table-projection.test.ts`: **4 archivos, 58 tests aprobados**, 2,30 s. Incluyen HTTP/SSE con cookies independientes, suplantación por query denegada, ocultas sin evento jugador, assets vigentes/revocados, GET/HEAD/resolve, contexto/conexión ajena, consumidores lentos, cierre por logout/caducidad, reinicio y límites.
- La proyección reconstruye los campos públicos; elimina notas, fichas, labels/anotaciones/enlaces, mapas inactivos, objetos invisibles y diccionarios URL entrantes. El conjunto de assets se sustituye junto al snapshot; jugador recibe 404/null para referencias privadas y no hay lectura de rutas/URLs externas desde esta publicación.
- Host/Origin y cookie HttpOnly/SameSite permanecen; el rol deriva de la sesión. No se exponen claves en el enlace jugador. `no-store`, `nosniff`, MIME y separación de estáticos se conservan. CSP no introduce evaluación dinámica.
- Electron mantiene contextIsolation, nodeIntegration desactivado y sandbox. Esta entrega no amplía la superficie nativa de preload ni modifica SQL; no se encontró nueva concatenación SQL o exposición de Node en los cambios examinados.
- La documentación distingue correctamente niebla visual de secreto de píxeles y reconoce que la revocación no retira bytes previamente descargados.
- Las reproducciones adicionales se ejecutaron con `pnpm exec node /tmp/ttrpg-004-security/probe.mjs`, importando bundles temporales generados directamente de las fuentes congeladas con esbuild instalado. Script y bundles quedan en `/tmp/ttrpg-004-security/`; no se añadieron tests al código congelado. API, streams y datos SQLite de ese ensayo fueron cerrados/eliminados al finalizar.

## Límites y aceptación

No se operó UI, ni se ejecutó auditoría de dependencias, infraestructura TLS/proxy o penetración externa. El reloj controlado acelera la reproducción de carga; las peticiones, cookies, streams y ejecución de dominio fueron reales, sin mocks de autorización. El humo visual descrito por construcción no se atribuye a esta revisión. Los 58 tests existentes pasan, pero no cubrían los dos casos negativos adicionales.

Se requiere corregir SEG-004-01 y SEG-004-02 y aportar sus regresiones antes de aprobar seguridad. El alcance pedido se limita a disponibilidad, idempotencia y revocación del servicio privado ya especificadas; no agrega funciones de producto.
