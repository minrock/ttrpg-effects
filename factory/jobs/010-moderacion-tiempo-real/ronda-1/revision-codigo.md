VEREDICTO: CAMBIOS

Revisión independiente de Código, trabajo010, ciclo1/ronda1, 2026-10-31. Base integrada declarada: feef7120e0a3145ddd345eed714deef3542007d4. Checkout y fuentes congeladas corresponden a revisión.md/huellas.json; comprobé las huellas contra el contenido real sin discrepancias. El delta entre base-archivos.json y huellas.json comprende47 archivos.

## Alcance

Leí AGENTS.md, perfil codigo.toml, solicitud/spec/build/coordinación, identidad de revisión y los cambios de aplicación, contratos, adaptadores HTTP/cliente, infraestructura, migración6, pruebas y documentación de010. Contrasté la implementación real con aceptación A1–A10. Revisé especialmente transacciones de expulsión e idempotencia, cierre posterior al commit, publicación/autoridad en la entrega, separación de runtimes y secuencias, limpieza del cliente, compatibilidad de la mesa legada y pruebas de transporte/exclusión. No consulté informes de otros revisores.

La separación por capas y la reutilización del motor de mesa/dados son coherentes; la migración añade6 sin cambiar las anteriores. package.json está en3.12.0 y CHANGELOG incluye feature fechada y conserva3.11.1. No se cambia el formato de escena ni se introduce una dependencia nueva de010. La composición optativa y el aplazamiento de pantallas a011 están documentados correctamente. Esto no compensa la carrera reproducida a continuación.

## Hallazgo que requiere corrección

### [P2] Una publicación concurrente puede eliminar el único bootstrap de un stream nuevo

Ubicación principal: `src/server/moderation-http.ts:103` (descarte del evento), con registro/encolado en110 y consumo en `src/infrastructure/browser/table-client.ts:149–154`.

El bootstrap se crea al registrar la conexión pero se entrega después mediante otra autorización asíncrona. Si el DM publica antes de esa entrega, cambia el contexto o aumenta la revisión de TableSession. El filtro de103 descarta el bootstrap antiguo igual que cualquier evento obsoleto. La publicación posterior emite `scene`, pero ningún bootstrap actualizado ni connectionId para esa conexión. BrowserTableClient exige bootstrap para aceptar un epoch nuevo y por tanto ignora esa escena y los eventos siguientes. Los heartbeats mantienen vivo el stream, así que no hay una reconexión automática que repare la inicialización. También puede ocurrir durante una reconexión o una promoción que coincida con publicación.

Reproducción independiente realizada con SQLite físico y HTTP/SSE real:

1. Crear apertura y admitir un invitado mediante los servicios reales.
2. Abrir su stream y retener la tercera llamada de GuestAuthority.authorized, que es la autorización de entrega del primer bootstrap (misma clase de barrera usada por transport.contract.ts).
3. Publicar una escena válida por POST contextual; responde200.
4. Liberar la barrera y observar el stream.

Resultado real: `[{ type: 'scene', revision: 1, connectionId: undefined }]`; no se recibió bootstrap. La aserción que exige bootstrap falló. El probe está fuera del repositorio en `/tmp/ttrpg-010-codigo-probe/bootstrap.test.ts`, con configuración en el mismo directorio. No altera producto ni usa PostgreSQL.

Corrección esperada: asegurar que cada conexión recibe un bootstrap vigente y autorizado con su connectionId antes de los eventos ordinarios, también si la publicación cambia mientras el bootstrap espera. Puede reconstruirse desde el estado actual dentro de la frontera final de entrega, conservando orden/secuencia, o aplicar otro mecanismo equivalente. No enviar el snapshot obsoleto para saltarse la validación de publicación. Añadir regresión con barrera para este orden y conectar el adaptador real: debe inicializarse, publicar la vista y poder emitir ready/reporte válidos sin refresco manual. Mantener la regresión existente en que un kick gana antes del primer frame y no se entrega snapshot. Afecta a la garantía de bootstrap/reconexión del protocolo y a A9; no es un defecto posponible al panel011.

## Verificaciones propias

- `pnpm typecheck`: PASS, salida0.
- `pnpm test src/infrastructure/browser/contextual-table-client.test.ts src/infrastructure/browser/table-client.test.ts src/application/services/game-runtime.test.ts src/application/services/table-session.test.ts`: PASS,4 archivos y8 pruebas.
- Probe externo de concurrencia descrito arriba: FAIL esperado,1 prueba, por ausencia de bootstrap. Comando: `TTRPG_TEST_DATABASE_URL=postgres://unused@127.0.0.1/unused TTRPG_TEST_DB_CA_FILE=/tmp/unused pnpm exec vitest run --config /tmp/ttrpg-010-codigo-probe/vitest.config.ts`. Los valores inertes solo satisfacen el guard de importación de fixtures; el probe invoca exclusivamente setup("sqlite") y no conecta a PostgreSQL. No se presenta como gate multidriver.
- Comparación SHA256 de todos los archivos incluidos en huellas.json: sin diferencias.

## Limitaciones y cierre

No repetí los gates completos PostgreSQL ni los builds: PostgreSQL estaba reservado al revisor Seguridad. Inspeccioné sus contratos y el humo compilado como código, pero los resultados multidriver de build.md siguen siendo evidencia del constructor, no ejecución propia. No hice inspección visual:010 no cambia vistas y011 conserva ese trabajo. El probe limpió sus sockets y base SQLite temporal mediante los cleanups de fixtures; los archivos de reproducción permanecen en/tmp. No usé Git, no edité producto/tablero/otros informes y no accedí al servicio8787 ni a datos del checkout original.

Revisión terminada. Requiere corregir el hallazgo y verificar la regresión antes de aprobar Código.
