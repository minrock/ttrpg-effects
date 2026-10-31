VEREDICTO: CAMBIOS

Revisión independiente de Código, trabajo010, ciclo1/ronda2, 2026-10-31. Base integrada feef7120e0a3145ddd345eed714deef3542007d4. Releí AGENTS.md y el perfil codigo.toml, contrato/solicitud/coordinación, build final, identidad/huellas de esta ronda y mi informe anterior. No consulté revisiones ajenas.

## Alcance y comprobación de la corrección

Contrasté las fuentes reales con la aceptación y con mi revisión de ronda1. Las huellas verificadas coinciden sin discrepancias. Frente a ronda1 hay10 archivos modificados y1 añadido; frente a base-archivos.json son49 archivos010, cero bajas. Consideré la nota del orquestador sobre las bajas aparentes del diff de la rama acumulativa: los archivos existentes se leyeron directamente. No traté el resumen de build como sustituto del código.

Inspeccioné los11 archivos de corrección completos: registro/cuotas de peticiones y cancelación, HTTP/SSE y body común, adaptadores cliente, regresiones y documentación. Persistencia/migraciones, versión3.12.0, lock y changelog no cambian respecto a la revisión anterior. El formato de escena, límites arquitectónicos y camino legado se conservan.

El P2 de ronda1 queda **resuelto**: moderation-http reconstruye bootstrap dentro de la autorización final con estado/revisión/secuencia actuales y connectionId propio. La cola descarta eventos previos ya incluidos en ese estado. Mi reproducción externa ahora recibe bootstrap primero, con revisión1, connectionId y mapa vigente. La nueva regresión mantenida usa el adaptador real y confirma imagen, ready y reporte de cámara después de publicar mientras el bootstrap espera. También sigue pasando kick antes del primer frame, sin snapshot revocado.

La corrección de consultas fijadas a apertura distingue OPENING_CHANGED del conflicto recuperable de mapa; la limpieza terminal y ausencia de reintentos están cubiertas. Las pruebas SQLite de cuerpos incompletos, cuotas y cancelación pasan. Sin embargo, la limpieza del establecimiento SSE tiene el defecto siguiente.

## Hallazgo que requiere corrección

### [P2] Registrar un SSE cuyo socket ya cerró deja presencia y cupo fantasma

Archivo/líneas: `src/server/moderation-http.ts:84–86` (espera de segunda autorización) y `103–106` (registro, instalación tardía del listener y escritura). El chequeo de res.destroyed anterior a esta segunda espera no cubre el cierre ocurrido durante ella.

Si el navegador cancela/cierra el stream mientras espera la autorización de establecimiento, ServerResponse puede haber emitido close antes de ejecutar scope.deliver. La continuación registra el stream y la conexión en TableSession y solo entonces añade res.on("close", ...). Ese evento ya pasó y no se repetirá. El escritor tampoco comprueba res.destroyed: sus reintentos/heartbeats no retiran la conexión del registro. El invitado aparece conectado pese a no tener transporte, conserva cuota y puede seguir siendo el principal que impide promover al siguiente jugador.

Reproducción propia, HTTP/SSE real y SQLite físico, fuera del repositorio:

1. Abrir una partida y admitir al invitado mediante los servicios reales.
2. Retener la segunda llamada a GuestAuthority.authorized del GET table/events, antes del registro SSE.
3. Cerrar el cliente HTTP y esperar que el ServerResponse emita close; la barrera confirma que el socket cerró, sin usar una espera arbitraria.
4. Liberar la autorización y esperar el registro y la primera autorización de heartbeat.
5. Consultar el registro y TableSession.

Resultado observado después del heartbeat: `{ connected: true, count: 1 }`; esperado `{ connected: false, count: 0 }`. Probe: `/tmp/ttrpg-010-codigo-r2-probe/disconnect.test.ts`. Falla de manera reproducible. La primera versión de la aserción se ejecutó dentro de la transacción y quedó envuelta como IdentityError; al trasladarla fuera se obtuvo el fallo explícito anterior. No era un problema de configuración/DB.

Es un defecto de establecimiento010 descubierto en esta ronda; no lo atribuyo como regresión introducida por el arreglo del bootstrap. Afecta A1 (presencia), A3 (principal/promoción) y A8 (limpieza/cuotas).

Corrección esperada: cubrir todo el establecimiento con el seguimiento de cierre/cancelación y revalidar el transporte inmediatamente antes de registrarlo; no crear conexión/timer para una respuesta ya cerrada. La limpieza debe liberar registro, TableSession y timers de forma idempotente en cualquier punto. Añadir regresión con cierre observado antes de liberar la autorización, y verificar ausencia de presencia/cupo, así como promoción si corresponde. Conservar bootstrap concurrente, reemplazo de credencial y kick antes del primer frame.

## Verificaciones propias

- `pnpm typecheck`: PASS, salida0.
- `pnpm test src/infrastructure/browser/contextual-table-client.test.ts src/infrastructure/browser/table-client.test.ts src/application/services/game-runtime.test.ts src/application/services/table-session.test.ts`: PASS,4 archivos/11 pruebas.
- `pnpm exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/corrections.contract.ts src/infrastructure/server/moderation/transport.contract.ts -t sqlite`: PASS de los7 casos SQLite seleccionados;7 casos PostgreSQL excluidos explícitamente por el filtro. No equivale al gate multidriver completo.
- Probe externo bootstrap: PASS,1 prueba. Conservé el probe original de ronda1; la copia de ronda2 espera el primer evento, porque el scene obsoleto ahora se descarta correctamente, y valida bootstrap/mapa/revisión/conexión.
- Probe externo disconnect: FAIL,1 prueba; estado fantasma demostrado después del heartbeat.
- Huellas de ronda2 contra todos sus archivos reales: sin diferencias.

Los comandos SQLite/probes usan `TTRPG_TEST_DATABASE_URL=postgres://unused@127.0.0.1/unused TTRPG_TEST_DB_CA_FILE=/tmp/unused` únicamente para satisfacer el guard de importación de fixtures compartidas; ejecutan setup("sqlite") y no conectan a PostgreSQL. Configuración externa: `/tmp/ttrpg-010-codigo-r2-probe/vitest.config.ts`; ejecutar con `pnpm exec vitest run --config /tmp/ttrpg-010-codigo-r2-probe/vitest.config.ts bootstrap.test.ts` o `disconnect.test.ts` y esas variables. Las bases, sockets y backend propios se limpiaron al terminar.

## Limitaciones y cierre

PostgreSQL permaneció reservado a Seguridad; no lo usé ni atribuyo sus resultados como propios. No repetí builds/gates completos: sus resultados del build final son evidencia del constructor. No hay nuevas vistas en010, así que no hice humo visual de011. No accedí al servicio8787, datos del checkout original ni informes ajenos. No ejecuté Git ni edité producto/tablero; la única salida en el repositorio es este informe, publicado atómicamente. Ronda1 se conserva.

Revisión terminada. El hallazgo anterior está corregido, pero el nuevo P2 de establecimiento/cierre impide aprobar Código en esta ronda.
