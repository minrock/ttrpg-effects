VEREDICTO: APROBADO

# Revisión de seguridad — 006, ciclo 1, ronda 1

Revisión independiente del constructor, 2026-10-29. Checkout exclusivo `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama `feature/factory-006-persistencia-multidb`. Se leyeron el perfil de seguridad, AGENTS.md, solicitud, spec, build, identidad/diff de revisión y manifiesto. Las 547 huellas congeladas coinciden con los archivos revisados, incluidos archivos nuevos. No se consultaron otros informes para decidir el veredicto.

## Resultado y alcance

No se encontraron hallazgos de seguridad demostrables que requieran cambios en el alcance de 006. La aprobación corresponde a la infraestructura del catálogo y su transición protegida; no acredita autenticación por cuentas ni autorización multiusuario de la API legada.

Se inspeccionaron directamente los puertos y validaciones de `game-catalog.ts` y `game-metadata.ts`; configuración, driver, repositorio, migraciones y composición de `src/infrastructure/server/database/`; comando compilado, configuración y arranque del servidor; setup/plantillas de entorno, dependencias fijadas y documentación operativa. Se contrastaron los cambios rastreados con el prerrequisito 3.7.0 y se leyeron los archivos nuevos completos relevantes.

## Fronteras comprobadas

- **Propiedad y SQL:** `catalog-repository.ts` aplica `owner_id` en SELECT, UPDATE y DELETE; un ID ajeno devuelve ausencia y no permite modificar la fila. Los valores se parametrizan; las interpolaciones SQL contienen columnas/placeholders controlados por código. El esquema de patch es estricto, no acepta transferencia de propietario y el UUID duplicado produce conflicto sin sobrescritura. Filas corruptas se rechazan al reconstruirlas. ownerId continúa siendo un ámbito proporcionado por aplicación, sin atribuirle identidad autenticada en esta entrega.
- **TLS y configuración:** `config.ts` rechaza drivers/despliegues incoherentes, query/fragmento de URL y disable fuera de local loopback. `driver.ts:68` construye el pool con campos explícitos y `rejectUnauthorized: true`, sin connectionString que reemplace la política. La versión instalada de pg pasa también el host a TLS para verificar certificados al usar IP. La contraseña se obtiene por callback explícito: no recurre a PGPASSWORD/pgpass por ausencia. Search path, negociación SSL, destino y timeouts están fijados; no existe fallback a SQLite o transporte sin cifrar.
- **Archivos y exclusión SQLite:** `driver.ts:14` valida ruta física y permisos privados, crea lock con exclusión/O_NOFOLLOW y comprueba archivo/sidecars regulares, enlaces y permisos antes de abrir. Los rechazos posteriores a adquirir el lock retiran el propio; un lock ya existente no se elimina. No hay recuperación automática por antigüedad. El nuevo catálogo no utiliza las bases funcionales legadas.
- **Transacciones y migraciones:** `index.ts:25` serializa el acceso raíz, espera el callback async y liga cada transacción a una conexión; controla uso de tx caducado, reentrada y cierre. `migrations.ts` verifica historial/checksum y tablas ajenas, aplica DDL y registro juntos y utiliza bloqueo transaccional PostgreSQL/BEGIN IMMEDIATE SQLite. Los tests reales acreditan rollback, conservación de centinelas y competencia entre migradores sin esquema parcial.
- **Secretos y fallos:** la frontera pública normaliza errores a CatalogError; el comando muestra mensajes acotados, sin URL/contraseña/SQL. No se registran errores crudos de clientes ociosos. ManagedClient cierra el transporte de una conexión fallida antes de devolverla al pool. Setup conserva la URL privada existente y no la copia al cliente ni la imprime.
- **Guard productivo:** `src/server/config.ts` valida tanto readConfig como validateConfig. `createApi` invoca esta validación antes de construir ServiceStore. Se rechazan local/postgres y production antes de archivos/listener; las migraciones PostgreSQL siguen disponibles sin configuración del servicio web. El guard y los límites constan en las guías.
- **Electron, IPC y navegador:** 006 no modifica preload, ventanas, canales, HTML, CSP ni renderer; la nueva infraestructura solo se importa desde servidor/tests. No se añade una API privilegiada ni credenciales al cliente. No corresponde repetir la auditoría visual de 005 para este cambio.

## Verificación propia

| Comprobación | Resultado |
| --- | --- |
| `pnpm test:db`, con configuración temporal suministrada por el orquestador | **31 pruebas PASS**, 1 archivo, 6,84 s. SQLite físico y PostgreSQL real; CRUD/propiedad/inyección, rollback, migraciones, CA/hostname/contraseña negativos, PG* adversas, comandos compilados, guard y humo HTTP local. Log: `/tmp/006-seguridad-db-r1.log`. |
| `pnpm exec vitest run src/infrastructure/server/database/config.test.ts src/server/environment-setup.test.ts` | **22 pruebas PASS**, 2 archivos, 1,48 s. Selección/configuración, guard programático, setup privado y conservación de PostgreSQL sin crear datos SQLite. |
| Arnés propio contra `pnpm exec node out/api/db-migrate.mjs`, solo directorios temporales | **10 casos PASS**: symlink y hardlink en cada sidecar WAL/SHM/journal, directorio con permisos públicos, lock ajeno, lock symlink y ancestro symlink. Todos salieron 1, conservaron centinelas y locks ajenos, no crearon catálogo ni dejaron lock propio. Evidencia: `/tmp/006-seguridad-rutas-r1.json`. |
| SHA-256 contra `ronda-1/huellas.json` | **547 archivos, 0 diferencias** al iniciar y cerrar la revisión. |

Las credenciales temporales se leyeron únicamente para poblar variables del subproceso; no se imprimieron, copiaron al repositorio ni utilizaron desde un .env personal. La suite crea y elimina bases con UUID propias y espera la limpieza de pools; terminó sin errores. El arnés adicional retiró sus directorios en finally. No se detuvo ni reconfiguró el servidor PostgreSQL del orquestador.

## Límites

Se reutiliza como evidencia del constructor la suite general de 1198 pruebas y los builds documentados; no se presenta como ejecución propia. No se hizo auditoría de vulnerabilidades de todas las dependencias, despliegue remoto, prueba prolongada de carga, backup/restore PostgreSQL ni nueva inspección CUA. TLS se verificó contra el servidor temporal real, no contra infraestructura productiva. La protección de archivos se evalúa bajo el directorio privado y permisos del sistema operativo; no se afirma resistencia frente a un proceso ya comprometido con la misma identidad del sistema o privilegios de administrador.

Cuentas, FK de identidad, aislamiento funcional de escenas/assets/bibliotecas y retirada del guard pertenecen a entregas posteriores. La aprobación de 006 no autoriza servir la API completa sobre PostgreSQL ni alterar ese límite. Solo se publicó este informe, mediante temporal y renombrado atómico; sin cambios de código, Git, tablero o informes ajenos.
