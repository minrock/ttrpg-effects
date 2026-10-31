VEREDICTO: APROBADO

Revisión independiente de Seguridad — 010, ciclo 1/ronda 2, 2026-10-31. Revisión terminada.

## Alcance e identidad

Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Base real `feef7120e0a3145ddd345eed714deef3542007d4`; HEAD histórico del worktree `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Leídos AGENTS.md, perfil seguridad.toml, solicitud, spec, build final, coordinación, identidad/delta de ronda-2/revision.md y huellas.json. Se utilizó el informe propio y el probe de ronda1 como contexto del hallazgo, sin modificar esa evidencia ni usar informes de otros revisores como prueba.

Inspección directa de las fuentes nuevas y modificadas de autoridad, repositorios, migración6, moderación/idempotencia, cuotas, registro de runtimes, despacho HTTP, SSE/assets, exclusión de proceso, cliente contextual y pruebas. La comparación efectiva con main y los inventarios de archivos evita interpretar como eliminaciones los archivos006–009 que están presentes pero no rastreados en esta rama acumulativa:49 archivos010,29 modificados y20 nuevos. La corrección de ronda2 modifica10 huellas de ronda1 y añade corrections.contract.ts. Las638 huellas congeladas coinciden al finalizar, sin divergencias.

## Hallazgos y resolución

No quedan hallazgos de seguridad que requieran cambios en el alcance revisado. El P1 de ronda1 queda resuelto con evidencia propia en ambos motores.

La reserva de trabajo DM se concede después de autenticar identidad y propiedad; el prefijo de ruta no concede autoridad. GameRuntimeRegistry.request limita solicitudes por participante, apertura, cuenta y globalmente, con máximo32 invitadas dentro de48 autorizadas y espacio separado para autenticación. El establecimiento SSE conserva su cupo transitorio y luego usa las cuotas de streams. Las lecturas del body continúan fuera de la transacción.

Los tickets de solicitudes se registran dentro del efecto de commit, vinculados a contexto/principal y expiración. revoke/leave/discard/revokeHost/clear cancelan los tickets correspondientes de forma idempotente. El cancelador aborta el lector y destruye sus sockets; request-body retira listeners y timer al recibir AbortSignal. La cancelación del expulsado ocurre dentro de los efectos síncronos posteriores al commit, antes de responder éxito. Los tickets sobrevivientes se conservan. La renovación de lease actualiza los tickets pendientes y la caducidad no les concede otra gracia.

### Reproducción independiente del cierre de P1

Probe nuevo externo `/tmp/ttrpg-010-security-r2-probe/quota.test.ts`, derivado del escenario adversarial original; se preservó sin cambios `/tmp/ttrpg-010-security-probe/quota.test.ts`. Ejecutado con SQLite físico y PostgreSQL temporal real:

1. Crear DMs A/B, aperturas A1/B1 y admisiones reales objetivo/atacante.
2. Abrir64 POST reales a table/ready de B1 con cuerpos incompletos. Cada solicitud lleva una cookie auxiliar distinta junto al mismo token invitado: evita depender solamente del límite por huella literal de Cookie y comprueba la cuota del principal ya autenticado.
3. Una barrera espera la suma de registros y respuestas:4 lectores registrados,60 respuestas429; pendingRequests=4.
4. El kick HTTP del propietario A sobre A1 responde200. La cookie invitada en la ruta DM responde401 y no obtiene capacidad DM.
5. El kick HTTP del propietario B responde200 después de cancelar los4 lectores; pendingRequests=0 al observar el ACK. La lectura DM A1 sigue200 y el token expulsado recibe401.

Resultado:2/2 PASS,9.54s. La regresión mantenida corrections.contract.ts, también reejecutada en el gate, comprueba adicionalmente un lector sobreviviente que permanece abierto y termina200 después de la expulsión. No se usa un sleep como evidencia de haber alcanzado la frontera.

## Alcance original y regresiones

| Área | Evidencia propia y conclusión |
| --- | --- |
| A1, autorización/roster | Inspeccionadas autoridades DM/invitado y propiedad persistida, schemas estrictos y respuesta mínima. Gate real rechaza principales ajenos/legados/admin/invitado y preserva IDs distintos con alias iguales. |
| A2, atomicidad/idempotencia | Revocación de todas las credenciales, invitación, auditoría y resultado comparten unidad transaccional; el secreto queda fuera del resultado durable. Gate comprueba rollback, concurrencia, replay/no-op, conflicto de contenido y replay tras reinicio. |
| A3, supervivientes | Cierre por participante y contexto, conteo único y promoción local. Pruebas con múltiples credenciales/streams preservan acceso, cámara y dados de sobrevivientes; ahora también conservan su lector HTTP. |
| A4, revocación en vuelo | Reejecutadas barreras de body/consulta/frame/bootstrap, entrega ordenada por commit y descarga con backpressure. No se encola otro chunk tras kick; cookie copiada, HEAD, Range y resolve no eluden401. La cancelación pendiente que faltaba en ronda1 está probada antes del ACK. |
| A5, carreras | Gate cubre join antes/después del kick, kicks concurrentes, disable/archive y comandos de apertura vieja. Inspeccionados hooks y unidad compartida con lifecycle007–009; no se sustituye la autorización por un DTO. |
| A6, aislamiento | Runtimes separados por owner/game/opening/generation; A1/A2/B1 verifican assets, cámara, dados, dedup, cursores, roster y centinelas privados. La reserva HTTP permite moderar otra partida bajo cuerpos lentos invitados. |
| A7, ciclo de vida | Gate comprueba gracia/deadline de kick, reapertura, reinicio vacío/epoch nuevo y ausencia de resurrección por disable/enable. El cliente fija apertura/generación en lecturas/streams; una respuesta OPENING_CHANGED limpia la instancia anterior. |
| A8, exclusión/cuotas | Subprocesos reales comprueban segundo emisor rechazado, cierre limpio, caída abrupta y pérdida del canal PG sin recuperación del emisor viejo. Gate valida cuotas SSE y reserva DM; probe independiente valida cuotas HTTP autenticadas/cancelación. |
| A9, cliente | Siete tests de cliente/registro pasan: limpieza y aborts, respuesta tardía, aislamiento, reemplazo, reconexión transitoria, sobre de otra apertura, HTTP401 y409 recuperable. El bootstrap concurrente se reconstruye dentro de la autorización final con estado actual y connectionId propio; prueba de cliente real confirma imagen/ready/reporte. |
| A10, persistencia/entrega | Gate propio en ambos motores incluye humo compilado HTTP/SSE, migración5→6, reinicio/replay y sistema/hash exactos retenidos. Regresión HTTP/mesa legada propia65/65. No se atribuye a esta revisión un rebuild ni la suite general del constructor. |

SQL nuevo parametrizado y migraciones1–5 preservadas; migración6 agrega auditoría independiente. HTTP valida Host/Origin, métodos, IDs, contexto y payloads, aplica límites y respuestas no-store/nosniff/CSP. No se observan secretos en resultados durables, logs, eventos o roster. Assets se resuelven por owner y publicación autorizada; el manifest público no copia definición, presentations o bindings privados. No hay nuevo IPC/preload, acceso Node desde renderer, HTML sin sanitizar, eval, rutas privilegiadas, dependencias de producto ni cambio de formato de escena. La frontera Electron no se modifica y no exige una excepción de seguridad.

## Verificación ejecutada y limpieza

| Comando | Resultado propio | Log |
| --- | --- | --- |
| `python3 /tmp/ttrpg-auth-pg-run.py test:moderation` | PASS6 archivos,39/39,161.98s; SQLite/PostgreSQL, sin skips | `/tmp/ttrpg-010-security-r2-moderation.log` |
| `pnpm exec vitest run src/infrastructure/browser/contextual-table-client.test.ts src/application/services/game-runtime.test.ts` | PASS2 archivos,7/7,363ms | `/tmp/ttrpg-010-security-r2-client.log` |
| `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config /tmp/ttrpg-010-security-r2-probe/vitest.config.mts` | PASS2/2,9.54s | `/tmp/ttrpg-010-security-r2-probe-pass.log` |
| `pnpm exec vitest run src/server/http.test.ts src/server/table-http.test.ts` | PASS2 archivos,65/65,2.84s | `/tmp/ttrpg-010-security-r2-legacy.log` |
| Auditoría PG posterior con wrapper privado |0 bases fixtures,0 conexiones fixtures,0 advisory locks de autoridad/runtime | `/tmp/ttrpg-010-security-r2-cleanup.log` |
| Huellas y `git diff --check` |638/638 sin divergencias; diff check PASS | Comprobación final propia |

La primera invocación del probe externo falló antes de ejecutar tests porque el directorio temporal nuevo no resolvía vitest. Se añadió allí un enlace a node_modules del checkout y la ejecución completa posterior pasó. Log del fallo de infraestructura conservado en `/tmp/ttrpg-010-security-r2-probe.log`; no se contabiliza como prueba de producto ni como PASS.

Fixtures, sockets, timers, pools y subprocesos propios cerrados. PostgreSQL liberado y comunicado al orquestador; no se detuvo ni reconfiguró el clúster. No se usaron datos/configuración/servicio del checkout original, ni se ejecutaron escrituras Git, edición de producto, tablero o informes ajenos. Único entregable en repositorio: este informe, publicado mediante temporal y renombrado atómico.

Límites: verificación local acotada; no prueba prolongada de carga, despliegue ni escalado distribuido. No se repitieron lint/typecheck/builds, suite general ni gates006–009 completos: sus resultados del build son evidencia atribuida al constructor y los históricos de ronda1 conservan su identidad. Las fronteras completas de token8h/restore de009 no se presentan como nuevas ejecuciones propias. La revisión del adaptador y el humo HTTP no sustituyen la interfaz/panel ni su comprobación visual de011. La aprobación se refiere a seguridad de010 congelado y no autoriza por sí sola merge o despliegue.
