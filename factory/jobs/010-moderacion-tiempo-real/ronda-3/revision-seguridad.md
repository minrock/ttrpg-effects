VEREDICTO: APROBADO

Revisión independiente de Seguridad — 010, ciclo 2/ronda 3, 2026-10-31. Revisión terminada.

## Identidad y alcance

Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, base main `feef7120e0a3145ddd345eed714deef3542007d4`, rama acumulativa sin cambios Git. Leídos AGENTS.md, perfil seguridad.toml, solicitud/spec, build final, retrabajo-ciclo-2.md, coordinación, ronda-3/revision.md y huellas, informe propio de ronda2 y fuentes reales. El probe externo referido en el retrabajo se leyó como contexto de reproducción, no como resultado propio ni como aprobación ajena.

Build SHA256 confirmado: `8ab91e21526135bf117ef37cb863f0fb8353348fa316d6b5df8d29b1a5ca349a`. Comparación independiente de huellas ronda2→ronda3: exactamente tres archivos cambiados — moderation-http.ts, corrections.contract.ts y docs/moderation.md — y635 intactos, sin nuevos ni bajas. Total congelado638/638 verificado al inicio y al finalizar, cero divergencias. El delta acumulado sobre main conserva29 modificados y20 nuevos.

La revisión se concentra en cierre durante establecimiento SSE, liberación de cuotas, presencia/conexiones/timers, errores antes de cabeceras, reemplazo, promoción y efectos sobre la revocación. Las áreas intactas conservan la evidencia propia atribuida de ronda2; no se repiten sus gates sin motivo.

## Hallazgos y corrección comprobada

No se identificaron hallazgos de seguridad que requieran cambios. La carrera de registro SSE tras cerrar el socket queda corregida y la corrección no debilita la autoridad ni el cierre por expulsión.

- `src/server/moderation-http.ts:84`: el estado inicial de respuesta cerrada se captura y el listener close se instala antes de esperar la segunda autorización. La desconexión libera el cupo transitorio mediante un liberador idempotente.
- `src/server/moderation-http.ts:90`: dentro del efecto autorizado se comprueban transportClosed, destroyed y writableEnded antes de crear runtime o registrar presencia. Un resultado de autorización que llega después del cierre no crea conexión ni heartbeat.
- `src/server/moderation-http.ts:97`: close cancela intervalos y timeouts de drain, libera registro y conexión y retira el listener una sola vez. El registro, escritura de cabeceras y connect quedan protegidos por limpieza ante errores. Las comprobaciones posteriores a flushHeaders/connect cubren el cierre durante establecimiento, incluido el cierre síncrono al exceder la cola inicial.
- `src/server/moderation-http.ts:100`: un fallo antes de cabeceras no finaliza accidentalmente la respuesta con200; el catch HTTP conserva su error, incluido429. La cuota real de streams se vuelve a comprobar con HTTP en ambos motores.
- La cola y el escritor comprueban transporte utilizable. Se conserva la autorización final por entrega, el orden commit→invalidación→ACK, el bootstrap reconstruido con contexto actual y la separación por owner/partida/apertura. El cierre no añade secretos, snapshots ni motivos privados al terminal.

Se inspeccionaron también las interacciones con GameRuntimeRegistry.register/revoke, TableSession.connect y la frontera de entrega; sus archivos están intactos respecto a la evidencia anterior. La reserva DM y los tickets HTTP del P1 anterior permanecen sin cambios y su regresión se reejecutó dentro del archivo corrections.

## Evidencia propia de esta ronda

**Regresiones dirigidas del producto, ambos motores reales:** ejecutados completos corrections.contract.ts y transport.contract.ts.16/16 PASS,75.93s, sin casos omitidos dentro de esos dos archivos. Se eligieron por compartir el establecimiento/cierre y entrega que modifica el delta. Comprueban:

- Barrera en segunda autorización, cierre HTTP observado antes de liberarla, cero registros/intervalos, runtime ausente y presencia0; apertura posterior de streams válidos, principal, promoción y reemplazo sin conexión fantasma.
-64 cuerpos invitados, moderación disponible en otra partida, cancelación del objetivo antes del ACK y conservación del lector sobreviviente.
- Publicación mientras espera bootstrap, cliente real con imagen/ready/reporte, reconexión de apertura vieja rechazada.
- Kick antes del primer frame, backpressure sin otro chunk protegido posterior, denegación de cookie copiada/HEAD/Range/resolve, cuotas SSE con reserva DM y aislamiento de roster/presencia.

Comando: `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/corrections.contract.ts src/infrastructure/server/moderation/transport.contract.ts`.
Log: `/tmp/ttrpg-010-security-r3-targeted.log`.

**Probe independiente complementario:** `/tmp/ttrpg-010-security-r3-probe/closed-replacement.test.ts`.2/2 PASS,8.97s, SQLite físico y PostgreSQL temporal/TLS. Parte de un stream válido; abre una reconexión con la misma credencial, retiene la segunda autorización, cierra esa reconexión y observa close del servidor antes de liberar la barrera. Comprueba que no se llama register, que el stream original sigue vivo, que connectionCount=1 y que no cambian el principal ni la secuencia de presencia. Luego un kick HTTP real responde200, cierra el original con terminal access-ended, deja connectionCount=0 y presencia desconectada; la cookie expulsada recibe401. No usa sleeps para acreditar la carrera.

Comando: `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config /tmp/ttrpg-010-security-r3-probe/vitest.config.mts`.
Log: `/tmp/ttrpg-010-security-r3-probe.log`.

La prueba independiente verifica una variante que la prueba nueva del producto no cubre directamente: una reconexión cancelada no debe sustituir o expulsar la conexión viva de la misma credencial. El probe histórico de Código permanece inmutable y no se contabiliza como ejecución propia.

## Continuidad de seguridad y límites

El delta no modifica SQL, migraciones, autoridades de identidad/invitado, propiedad, idempotencia, credenciales, expiración, filtros de proyección, schemas, cliente, IPC/preload, renderer, CSP, rutas de assets ni formato de escena. La inspección del handler confirma que la reserva requiere identidad/propiedad autenticadas y que las entregas siguen pasando por la autoridad vigente. No aparecen nuevas dependencias, accesos a filesystem del renderer, eval, HTML no sanitizado, URLs externas o exposición de secretos. Estas áreas conservan la evaluación de ronda2, donde se ejecutaron el gate010 completo39/39, cliente/registro7/7, probe adversarial2/2 y regresión HTTP legada65/65; esas cifras son históricas y no se suman como pruebas nuevas.

A1/A3/A4/A8 reciben evidencia dirigida nueva sobre presencia, promoción, revocación y cuotas. A6/A7/A9 conservan regresión pertinente de aislamiento, contexto y bootstrap dentro de los dos archivos ejecutados. A2 y la persistencia/exclusión de A10 permanecen intactas; el gate completo41/41 y los checks/builds del ciclo2 se atribuyen al constructor, no a esta revisión. No repetí suite general, gates006–009, compilaciones, migraciones ni exclusión entre procesos sin cambios en esos componentes. No hay prueba prolongada de carga, inspección visual011 ni despliegue.

## Limpieza y entrega

Auditoría posterior mediante wrapper privado y consulta propia: **0 bases fixtures,0 conexiones fixtures,0 advisory locks de autoridad/runtime**. Log `/tmp/ttrpg-010-security-r3-cleanup.log`. Fixtures, sockets, timers y pools propios cerrados. PostgreSQL liberado y comunicado al orquestador; clúster sin detener ni reconfigurar. Servicio original y datos/configuración privados intactos. `git diff --check` PASS y638 huellas finales sin divergencias.

No se editó producto, Git, tablero ni informes ajenos; no se delegó. Único entregable en repositorio: este informe, publicado mediante temporal y renombrado atómico. La aprobación corresponde a seguridad del producto010 congelado; no sustituye las otras revisiones ni la decisión de integración.
