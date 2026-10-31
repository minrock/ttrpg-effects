VEREDICTO: APROBADO

# Revisión de código — 006, ciclo 1, ronda 2

Fecha: 2026-10-29. Checkout exclusivo `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama `feature/factory-006-persistencia-multidb`, HEAD/base `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`.

## Alcance y evidencia

Revisión independiente conforme al perfil codigo.toml, solicitud, spec, build actualizado e identidad de ronda 2; se conservan las instrucciones AGENTS.md ya leídas y la inspección independiente de ronda 1. No se consultaron informes ajenos de ronda 2.

Se compararon huellas entre rondas: cambiaron driver.ts, catalog.contract.ts, environment-setup.test.ts, setup-env.sh y docs/database.md; se añadió test-fixtures/idle-timeout-probe.ts. Se inspeccionaron completos el driver corregido y el nuevo subproceso, la integración de la regresión en los contratos y los cambios de setup/documentación. Los restantes archivos revisados en ronda 1 conservan su contenido. **548 huellas SHA-256, cero discrepancias**, comprobadas al inicio y antes de publicar; rama y HEAD coinciden.

## C1/P1 resuelto — errores del cliente PostgreSQL adquirido

`src/infrastructure/server/database/driver.ts:85–109` ahora registra listeners propios de error/end durante el préstamo. El error invalida la conexión; query comprueba su estado antes y después de ejecutar, por lo que una finalización o COMMIT posterior no puede tratar como válida la conexión perdida. Devuelve CatalogError UNAVAILABLE en ese caso, sin divulgar el error crudo. La unidad de trabajo conserva su manejo de rechazo y rollback.

Release es idempotente, descarta mediante `client.release(true)` cuando la conexión falló y conserva los listeners hasta end si todavía puede haber eventos tardíos. Una conexión sana vuelve al pool y retira los listeners del préstamo. La corrección no se limita a silenciar un evento: transmite el estado fallido a la siguiente operación/COMMIT. No modifica timeout, TLS ni política de conexión.

Se inspeccionó `src/infrastructure/server/database/test-fixtures/idle-timeout-probe.ts` y su ejecución desde `catalog.contract.ts:294–318`. El hijo ejecuta las fuentes actuales compiladas temporalmente, crea un registro dentro de una transacción real y espera 11 segundos frente al límite configurado de 10. Comprueba que el catch recibe CatalogError UNAVAILABLE con mensaje sanitizado, que el registro no persiste, que una nueva transacción sobre la misma instancia funciona, que close repetido es seguro y que reabrir conserva solo el registro recuperado. El padre exige salida 0/marcador esperado, ausencia de error sin manejar y cero conexiones a su base al terminar. No sustituye el timeout por un mock ni modifica el servidor.

**Se ejecutó esta regresión como parte del gate completo y pasó.** Cierra la reproducción propia de ronda 1, que terminaba Node con exit 1 antes del catch. Cuando el servidor ya cerró la conexión, la reversión ocurre allí; la corrección no pretende ejecutar ROLLBACK sobre un socket muerto.

## Otros cambios y aceptación

El setup ahora ofrece build:api/db:migrate y explica el bloqueo productivo cuando conserva una configuración PostgreSQL. Mantiene claves/arranque legado para SQLite. Las pruebas comprueban estos textos y preservación de archivos, ausencia de secretos en salida y de directorio SQLite. No se cambió el guard para resolver el mensaje.

No hay hallazgos obligatorios nuevos en el alcance revisado. Se mantienen las conclusiones válidas de ronda 1: puertos async separados de motores, SQL parametrizado/acotado por propietario, campos inmutables, contrato equivalente, migraciones explícitas, checksums, rollback/concurrencia, validación/TLS y guard antes de efectos. La corrección satisface el punto pendiente de recursos/errores controlados del criterio 3. Los criterios de compatibilidad, versión y documentación permanecen respaldados por los archivos sin cambios y la verificación actual.

Versión 3.8.0 intacta, sin segundo bump, dependencias nuevas, modificación de esquemas o formato .ttrpgscene. No se cambian renderer, coordenadas, mediciones, interfaz, autenticación ni endpoints.

## Verificaciones propias de esta ronda

- `pnpm test:db`: **1 archivo / 32 pruebas PASS**, salida 0, duración 20,31 s. Incluye SQLite físico, PostgreSQL temporal real, TLS, CLI compilados, humo HTTP legado y el subproceso de timeout. Variables privadas suministradas al subproceso desde el recurso autorizado, sin leer .env personal ni imprimir sus valores.
- `pnpm typecheck`: PASS, salida 0.
- `pnpm lint`: PASS, salida 0.
- `pnpm test src/infrastructure/server/database/config.test.ts src/server/environment-setup.test.ts`: **2 archivos / 22 pruebas PASS**, salida 0.
- `git diff --check`: PASS.
- Huellas: **548, cero discrepancias**. Rama/HEAD verificados.

Las fixtures del gate son bases UUID y directorios propios; su limpieza terminó sin errores. No se detuvo ni reconfiguró PostgreSQL ni se terminaron sesiones ajenas.

## Límites

No repetí las 1198 pruebas generales ni los builds completos Electron/web/API; sus resultados y reutilización justificada constan en build.md. Sí ejecuté los comandos compilados que verifica test:db y el nuevo bundle temporal de fuentes actuales. No se realizó humo visual, despliegue, carga prolongada o backup/restore.

El callback transaccional debe terminar para completar su limpieza: el driver no cancela una Promise externa que nunca resuelve. La siguiente consulta o COMMIT detecta el fallo; esta limitación está documentada y no impide cerrar C1. La aprobación se limita a la infraestructura entregada: no certifica el servicio completo PostgreSQL, las cuentas futuras ni autorización multiusuario.

Se conservó intacto el informe de ronda 1. Única salida nueva: este revision-codigo.md, publicado mediante temporal y renombrado; sin cambios de código, Git, tablero, specs u otros informes. La aprobación técnica no autoriza integración.
