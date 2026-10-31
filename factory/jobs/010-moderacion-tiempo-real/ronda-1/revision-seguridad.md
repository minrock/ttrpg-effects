VEREDICTO: CAMBIOS

Revisión independiente de Seguridad — 010, ciclo 1/ronda 1, 2026-10-31. Revisión terminada.

## Alcance e identidad

Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Base real `feef7120e0a3145ddd345eed714deef3542007d4`; no se confundió con HEAD antiguo del worktree. Leídos AGENTS.md, perfil seguridad.toml, solicitud, spec, build, coordinación, base-archivos.json, identidad/delta de revision.md y huellas.json. Se compararon fuentes existentes con la base de main y se inspeccionaron directamente archivos nuevos; el diff rastreado por sí solo muestra eliminaciones aparentes para archivos que este checkout conserva como nuevos y no representa todo el delta. El delta identificado consta de 47 archivos: 28 modificados y 19 nuevos. Verificación final: 637 huellas congeladas, cero divergencias.

Inspección de autoridad de identidad/invitado, repositorios, migración6, expulsión/idempotencia, registro de runtimes, despacho HTTP, entrega SSE/assets, exclusión de proceso, cliente contextual, pruebas y documentación operativa. No se consultaron otras revisiones ni se editó producto, Git, tablero o informes ajenos. No se utilizaron configuración, datos o servicios del checkout original.

## Hallazgo que requiere cambios

### P1 — Un invitado puede agotar la cuota HTTP global y bloquear la moderación de todas las partidas

Ubicación principal: `src/server/moderation-http.ts:29`; retención durante el body en `src/server/moderation-http.ts:152`, liberación únicamente al salir del handler en `src/server/moderation-http.ts:168`. La limpieza de revocación en `src/application/services/game-runtime.ts:52` cubre streams y transfers registrados, pero no estos lectores HTTP pendientes. El timeout del lector es de 30 segundos (`src/server/request-body.ts:19`, `src/server/config.ts:9`).

El contador `inFlight` se comparte entre invitados y DMs, entre partidas y entre lecturas y expulsión. No tiene reserva para moderación ni límite por participante. Un invitado válido puede abrir 64 POST `table/ready`, enviar sus cabeceras y mantener incompleto el cuerpo. Cada petición termina la autorización inicial y queda esperando en `json`; ninguna necesita tener una conexión SSE válida, porque la validación de la operación ocurre después de recibir el cuerpo. El siguiente kick HTTP del propietario, incluso en otra partida y de otro DM, obtiene 429 antes de poder autenticarse o ejecutar la expulsión. Los cuerpos no retienen el lock DB, pero sí toda la capacidad HTTP que necesita la moderación.

Además, aun revocando al atacante directamente mediante el servicio autorizado, esas 64 solicitudes no se cancelan ni liberan su cuota. Continúan bloqueando la API contextual hasta que el cliente completa/cierra los cuerpos o vence su timeout. Esto incumple A4 — cancelación de readers/tareas pendientes del participante — y A8, junto con la regla expresa de que cuerpos lentos de B1 no impidan moderar A1. No es una filtración de datos ni una evasión de la revocación persistida: es una denegación de servicio entre partidas con un único invitado y un número pequeño y acotado de conexiones.

Reproducción independiente, ejecutada en SQLite físico y PostgreSQL temporal real:

1. Crear DMs A/B y aperturas A1/B1 mediante las autoridades reales; admitir objetivo en A1 y atacante en B1.
2. Con la cookie del atacante, abrir 64 POST HTTP reales a `/api/v1/games/B1/table/ready`, con Origin/Host válidos, Content-Type JSON y Content-Length 256; enviar solo cabeceras. Una barrera observa que las 64 autorizaciones iniciales han terminado; no se usa un sleep como prueba.
3. Enviar kick HTTP con cookie del dueño A, contexto, versión, If-Match e Idempotency-Key válidos para el objetivo de A1: **429**. Consultar por el servicio confirma que el objetivo sigue `admitted`.
4. Revocar al atacante B1 por `service.kick` para comprobar la limpieza aun evitando el ingreso HTTP saturado. Un GET privado del DM A a `table/state` sigue dando **429**.
5. Destruir únicamente los sockets propios y cerrar/eliminar las fixtures.

Probe preservado fuera del repositorio: `/tmp/ttrpg-010-security-probe/quota.test.ts`; configuración `/tmp/ttrpg-010-security-probe/vitest.config.mts`. Comando: `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config /tmp/ttrpg-010-security-probe/vitest.config.mts`. Resultado: **2/2 casos pasan comprobando el defecto**, uno por motor, 9.32 s. Log: `/tmp/ttrpg-010-security-probe.log`. No contiene credenciales reales ni requiere el servicio original.

Corrección esperada: preservar una capacidad utilizable por operaciones DM/moderación frente a cuerpos de invitados y aplicar cuotas por principal/contexto además de la cota global; no basta reservar por el prefijo de URL sin autenticar. Registrar los lectores/peticiones en vuelo por participante/apertura y cancelarlos al revocar, cerrar, perder autoridad o terminar el proceso, liberando su cuota de manera idempotente. Mantener lectura del body y espera de red fuera de la transacción. Añadir regresión HTTP real en ambos motores: saturación invitada de B1, kick autorizado de A1 todavía disponible y liberación inmediata de los cuerpos del expulsado antes de confirmar su expulsión, sin cancelar sobrevivientes.

## Evaluación A1–A10 y demás límites

| Criterio | Evidencia y conclusión de Seguridad |
| --- | --- |
| A1 | Roster y kick usan identidad DM y propiedad persistida; IDs/contexto/queries estrictos. Contratos reales rechazan admin, DM ajeno, invitado, legado y anónimo; aliases homónimos conservan IDs distintos. Sin hallazgo adicional. |
| A2 | Inspeccionadas revocación de todas las credenciales, emisión única, auditoría e idempotencia dentro de la unidad compartida, con secreto fuera del resultado durable. Contratos verifican rollback, concurrentes/replay/no-op, contenido distinto y replay cerrado/restart. Sin hallazgo adicional. |
| A3 | Cierre por participante y contexto, promoción dentro de TableSession y conteo único. Contratos conservan credenciales, streams, cámara/dados de sobrevivientes y enlace nuevo. Sin hallazgo adicional. |
| A4 | Autorización final y efectos síncronos ordenados con COMMIT; no se entrega un DTO como permiso. Frames en cola y chunks se revalidan, HEAD/Range/resolve y cookie copiada no eluden revocación. La cancelación de cuerpos HTTP pendientes falla según P1. |
| A5 | Frontera transaccional común, revisión lifecycle/contexto y versión de invitación serializan conflictos; inspeccionados hooks de cierre, reapertura, disable/archivo. Suite010 prueba join antes/después de kick, kicks concurrentes y callbacks viejos. El build atribuye explícitamente otras carreras a regresión009; no las presento como pruebas nuevas propias. |
| A6 | Runtimes por owner/game/opening/generation; rutas invitadas no aceptan cookie DM como elevación. Assets dependen de publicación contextual y owner; manifest público con lista cerrada, sin definición/bindings privados. Pruebas reales A1/A2/B1 verifican cámaras/dados/cursores/dedup y centinelas. El aislamiento de disponibilidad HTTP queda bloqueado por P1. |
| A7 | Inspeccionados plazos, principal invitado en cada entrega, limpieza por hooks/watchdog y reconstrucción vacía. Suite010 prueba gracia, 149.999/150 s, restart/epoch y no admisión automática; fronteras009 restantes son evidencia heredada del build, no reejecutada por esta revisión. |
| A8 | Exclusión SQLite física y PG con conexión dedicada/lock783496103, independiente de783496102. Gate propio ejecutó segundo proceso, cierre, SIGKILL, recuperación y pérdida de canal sin reapropiación del emisor viejo; quotas de runtime/stream y reserva DM comprobadas. La reserva no cubre HTTP y bloquea aceptación según P1. |
| A9 | Inspección del adaptador por contexto e invalidación/aborts. Ejecutadas tres pruebas de cliente: terminal aislado, respuesta tardía, reemplazo, reconexión transitoria y HTTP401. Sin hallazgo adicional; no acredita panel011. |
| A10 | Gate propio completo en SQLite/PostgreSQL, humo compilado HTTP/SSE y migración5→6 incluidos; versiones/hash exactos y catálogo retenido inspeccionados. No se reejecutaron todos los gates históricos ni todos los builds. No cambia el formato de escena ni la frontera Electron. |

SQL nuevo parametrizado; migraciones1–5 preservadas y nueva6 separada. HTTP valida Host/Origin, limita payloads, rechaza campos extra y devuelve errores serializables; respuestas no-store, nosniff y CSP restrictiva. Metadatos de invitación/auditoría no guardan el secreto emitido. No hay nuevos IPC, preload, acceso Node del renderer, eval, HTML sin sanitizar, navegación externa ni dependencias de producto. El filtro público y URLs de assets mantienen el límite del propietario/contexto. El cambio no requiere una excepción a aislamiento Electron ni altera SQLite local de escenas.

## Verificación propia y limpieza

- `python3 /tmp/ttrpg-auth-pg-run.py test:moderation`: PASS, 5 archivos, 33/33, 134.27 s. Log `/tmp/ttrpg-010-security-moderation.log`.
- `pnpm exec vitest run src/infrastructure/browser/contextual-table-client.test.ts src/application/services/game-runtime.test.ts`: PASS, 2 archivos, 4/4, 362 ms. Log `/tmp/ttrpg-010-security-client.log`.
- Probe independiente de cuota/cancelación: PASS 2/2 confirmando el fallo descrito, sin editar tests del producto.
- Auditoría PostgreSQL posterior: cero bases fixture, cero conexiones fixture y cero advisory locks de autoridad/runtime. Log `/tmp/ttrpg-010-security-cleanup.log`.
- PostgreSQL liberado al orquestador; no se detuvo ni reconfiguró el clúster. Servicio original8787 intacto. Huellas de producto/docs sin divergencias al terminar.

Límites: pruebas locales acotadas, no prueba prolongada de carga ni despliegue; las pruebas del cliente son de adaptador, no una revisión visual de011. No se repitieron pnpm test completo, lint, typecheck, build Electron/web/API ni todos los gates006–009, cuyos resultados se mantienen como evidencia declarada del constructor. Los PASS existentes no sustituyen la regresión adversarial fallida para A4/A8. Se requiere resolver P1 y repetir la revisión del delta corregido antes de aprobar Seguridad.
