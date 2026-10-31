VEREDICTO: CAMBIOS

# Revisión de código — 006, ciclo 1, ronda 1

Fecha: 2026-10-29. Checkout exclusivo `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama `feature/factory-006-persistencia-multidb`, HEAD/base `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`.

## Alcance

Revisión independiente conforme a codigo.toml, AGENTS.md, solicitud, spec, build y evidencia congelada. Se inspeccionaron los archivos nuevos reales de dominio, puertos, configuración, drivers, composición, repositorio, migraciones y contratos; comandos/build/setup, tests de configuración y setup, dependencias, versión/changelog y documentación modificada. Se distinguió el prerrequisito 3.7.0 del trabajo 006. No se consultaron revisiones ajenas ni se modificaron implementación, Git, tablero, specs u otros informes.

Las **547 huellas SHA-256** coinciden con el árbol actual, comprobadas al inicio y antes de publicar. Rama y HEAD coinciden con revision.md.

## Hallazgo obligatorio

### C1 — P1: un error del cliente PostgreSQL adquirido termina el proceso

Ubicación: `src/infrastructure/server/database/driver.ts:84–90` (wrap/adquisición); contexto en líneas 77–81 y `index.ts:55–67`.

El pool tiene listener de error para clientes ociosos, pero el cliente adquirido mediante pool.connect queda sin listener propio durante la transacción. La política configura `idle_in_transaction_session_timeout: 10000`. Si el callback pasa más de diez segundos entre consultas, PostgreSQL cierra esa sesión y el cliente emite `error` mientras no hay query pendiente. El evento no llega al catch/normalización de la unidad de trabajo: Node termina por `Unhandled 'error' event`. También deja expuesto ese intervalo a errores asíncronos de conexión. La documentación advierte evitar esperas largas, pero un timeout configurado debe producir un fallo controlado del almacenamiento, no derribar el proceso consumidor.

**Reproducción propia, PostgreSQL real:** en un subproceso Node con fuentes actuales, una base privada `ttrpg_review_<UUID>` creada solo para esta prueba y la CA temporal provista:

```ts
await migrateCatalog(config);
const db = await openCatalog(config);
try {
  await db.transaction(async tx => {
    await tx.games.create("review", "timeout");
    await new Promise(resolve => setTimeout(resolve, 11_000));
  });
} catch (error) {
  // Debiera recibir CatalogError UNAVAILABLE.
} finally {
  await db.close();
}
```

Resultado observado por el proceso padre: **exit 1**, ningún mensaje del catch, stderr contiene `Unhandled 'error' event` y `idle-in-transaction timeout`. No se imprimieron URI, contraseña, CA ni stderr crudo. El padre eliminó únicamente su base después de terminar el hijo; el servidor temporal quedó activo y no se terminaron sesiones ajenas.

**Corrección esperada:** manejar el error del cliente adquirido durante toda su vida útil, marcar la conexión como fallida, impedir reutilizarla/confirmarla y liberar o destruir ese cliente de forma coherente con pg.Pool. La transacción debe rechazar con error sanitizado, conservar rollback y permitir cerrar/reabrir o continuar con una conexión nueva. No basta un listener que silencie el evento sin propagar el fallo. Añadir regresión en proceso aislado que espere el timeout (o fuerce la desconexión exclusivamente de su propia sesión) y compruebe supervivencia del proceso, ausencia del registro no confirmado, recuperación y limpieza del pool. No desactivar TLS ni retirar el timeout para ocultar el fallo.

Este hallazgo impide aceptar plenamente el criterio 3 de recursos/transacciones y la semántica de errores controlados del catálogo.

## Aspectos verificados sin cambios solicitados

- Puertos async y modelos puros; SQL y motores encapsulados en infraestructura. No cambios de renderer, coordenadas, mediciones, UI, autenticación o formato de escena.
- Consultas parametrizadas y filtro ownerId en cada consulta/mutación; creación sin sobrescritura de UUID; campos inmutables fuera del patch; validación de filas y paginación.
- Serialización por instancia y conexión única por transacción; espera del callback, rollback, detección de ámbito caducado/reentrada y cierre idempotente cubiertos en las pruebas ordinarias.
- Migraciones con historial/checksum y exclusión/advisory lock; rechazos de versión futura/base ajena, rollback DDL y centinelas legados. No migración implícita de datos personales.
- Guard de la composición legada antes de almacenamiento/listener, PostgreSQL sin dependencia de DATA_DIR y local/sqlite conservado.
- Política TLS y parámetros PG explícitos, sin fallback ni credenciales en frontend. Dependencias pg y tipos fijadas y justificadas; documentación distingue infraestructura PostgreSQL de servicio todavía incompleto.
- Versión 3.8.0 y changelog coherentes; no cambio de .ttrpgscene.

## Verificaciones ejecutadas

- `pnpm test:db`: **31/31 pruebas**, un archivo, salida 0. Contratos SQLite físico/PostgreSQL real, TLS, migraciones/CLI compilados y humo HTTP legado. Variables privadas provistas al subproceso desde el recurso temporal autorizado, sin leer .env real.
- `pnpm typecheck`: PASS, salida 0.
- `pnpm lint`: PASS, salida 0.
- `pnpm test src/infrastructure/server/database/config.test.ts src/server/environment-setup.test.ts`: **22/22 pruebas**, dos archivos, salida 0.
- Reproducción adicional C1: fallo confirmado descrito arriba, fixture propia retirada.
- `git diff --check`: PASS. Comparación de 547 huellas: cero discrepancias.

El gate verde actual no cubre el error asíncrono de un cliente adquirido; por eso no sustituye la reproducción de C1.

## Límites

No repetí las 1198 pruebas generales ni los builds Electron/web/API completos; sus resultados pertenecen a build.md. Sí ejecuté los comandos compilados que verifica test:db. No realicé humo visual, despliegue, carga prolongada ni backup/restore. La revisión se limita a infraestructura local y el PostgreSQL temporal autorizado; no presenta las futuras cuentas/partidas multiusuario como implementadas.

La única salida persistida de esta revisión es revision-codigo.md, mediante temporal y renombrado. No autoriza operaciones Git ni integración.
