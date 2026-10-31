# Persistencia del servicio final

Desde3.13.0, `start:api` utiliza exclusivamente `control.sqlite` local o PostgreSQL productivo conTLS. La identidad es obligatoria, las rutas globales están retiradas y no hay ServiceStore auxiliar. Las referencias históricas a la transición006 describen esa entrega; la configuración operativa vigente está en [operación](service-operations.md).

# Persistencia SQLite y PostgreSQL — 3.8.0

El catálogo y los recursos propios tienen adaptadores SQLite/PostgreSQL con contratos asíncronos equivalentes. SQLite es local; producción exige PostgreSQL. El servicio final usa estas fronteras para cuentas, partidas, contenido e invitados, sin almacén global auxiliar.

El catálogo guarda UUID, propietario opaco, nombre, estado ready/archived y fechas UTC. Ready no significa partida abierta ni DM presente. Los repositorios reciben ownerId y restringen consultas/mutaciones a ese propietario; ese parámetro no autentica a nadie. No hay transferencia de propietario ni adopción automática de recursos legados.

## Configurar

Node24 y pnpm. `.env` se carga como datos y variables del proceso prevalecen; las rutas no se expanden. Setup conserva archivos/secretos y no crea SQLite si se selecciona PostgreSQL. Crea directorios privados internos, sin duplicar assetsPG. PostgreSQL requiere configuraciónURL/TLS privada0600; setup no genera sus credenciales ni modifica servidores. Consulta [operación](service-operations.md).

| Variable | Uso |
| --- | --- |
| TTRPG_DEPLOYMENT | local (default) o production. Independiente de NODE_ENV. Vacío/desconocido falla. |
| TTRPG_DB_DRIVER | sqlite (default local) o postgres. Production requiere postgres explícito. |
| TTRPG_DATA_DIR | SQLite: directorio absoluto físico exclusivo, permisos 0700. PostgreSQL no lo necesita. |
| TTRPG_DATABASE_URL | Solo postgres: URI postgres/postgresql con host, usuario y base explícitos; contraseña privada cuando la autenticación la requiera. Sin query, fragmento ni opciones SSL embebidas. |
| TTRPG_DB_TLS | verify-full (default postgres) o disable. Disable exige local y localhost/IP loopback literal; producción siempre verifica TLS. |
| TTRPG_DB_CA_FILE | Opcional con verify-full: ruta absoluta a CA legible. Si falta usa confianza del runtime; una ruta configurada ilegible falla. No aplicable a disable. |

Una URL/TLS/CA configurada con sqlite se rechaza como contradicción. PostgreSQL usa host, puerto, usuario, contraseña, base y TLS explícitos, sin dejar que variables PG* cambien su destino o relajan TLS. No usa `rejectUnauthorized:false` ni fallback SQLite/no cifrado. El backend HTTPS y el transporte PostgreSQL se configuran por separado.

Ejemplo conceptual de `.env` para migraciones PostgreSQL; sustituir marcadores en un archivo privado, no usarlo como configuración copiable de producción:

```dotenv
TTRPG_DEPLOYMENT=production
TTRPG_DB_DRIVER=postgres
TTRPG_DATABASE_URL=postgresql://usuario:SECRETO_CODIFICADO@db.example/base_dedicada
TTRPG_DB_TLS=verify-full
TTRPG_DB_CA_FILE=/ruta/absoluta/ca.pem
```

El operador crea una base dedicada y credenciales de alcance limitado. El usuario de migración necesita permiso para sus tablas/índices; el código no crea bases, roles ni borra esquemas generales. En esta entrega se exige que la base del catálogo no tenga tablas ajenas; no apuntar a una base compartida. La URL admite solo el esquema documentado y no importa un search_path. Para desarrollo temporal sin TLS: deployment local, host loopback literal y disable explícito. No cambiar configuración de un servicio del usuario para ejecutar tests.

## Migrar explícitamente

```sh
pnpm install --frozen-lockfile
pnpm build:api
pnpm db:migrate
```

El build genera `out/api/index.mjs`, `out/api/db-migrate.mjs` y sus chunks compartidos; conservar **todo out/api**, package.json y dependencias de producción de la plataforma. `db:migrate` carga solo configuración de persistencia; no exige claves DM/jugador, estáticos, Electron ni DATA_DIR para PostgreSQL. Muestra motor/versiones, sin URI ni credenciales. Exit 0 indica éxito o ausencia de pendientes; error devuelve código no cero con instrucciones sanitizadas.

En SQLite crea `control.sqlite` y usa `control.lock` dentro del directorio privado. No altera service.sqlite, monsters.sqlite, entities.sqlite ni su user_version. Rechaza symlinks, hardlinks de archivos y permisos públicos, también en sidecars. El lock es exclusivo de esta infraestructura; un error libera su propio lock y conexiones. No se retiran locks ajenos automáticamente; tras una muerte forzada confirmar antes que no quede propietario vivo.

PostgreSQL mantiene el catálogo en tablas `ttrpg_games` y `ttrpg_control_migrations` de la base dedicada. Los metadatos se representan como texto portable/fechas ISO UTC normalizadas; las diferencias de placeholders y errores están encapsuladas. No crea SQLite ni necesita filesystem local para datos funcionales. El archivo CA es configuración de transporte, no almacenamiento de partidas.

El registro de migraciones guarda versión, nombre y checksum. Segunda ejecución es idempotente. Un historial más nuevo, cambiado o incompatible se rechaza. DDL y registro se confirman juntos; ante fallo se revierten. La migración PostgreSQL usa un advisory lock transaccional; SQLite, exclusión de archivo y BEGIN IMMEDIATE. Contención falla explícitamente o espera dentro de límites, sin duplicar versiones. No existe comando reset/drop/down destructivo.

Abrir sin esquema actualizado produce MIGRATION_REQUIRED y pide `pnpm db:migrate`. Ningún arranque adopta datos legados ni migra perfilElectron. El listener final espera apertura de identidad y exclusión antes de servir.

## Transacciones y recursos

`CatalogDatabase.transaction(async tx => …)` espera el callback y usa exclusivamente `tx.games`. PostgreSQL adquiere un único cliente hasta COMMIT/ROLLBACK. SQLite serializa las operaciones de esa instancia y evita que otra tarea entre en la transacción. Usar repositorios raíz, llamar close o iniciar una transacción anidada desde el callback falla con TRANSACTION_SCOPE. No guardar referencias tx para utilizarlas después. No hay transacciones distribuidas ni reintento automático del callback.

Las operaciones raíz se serializan por instancia también en PostgreSQL para conservar semántica común. No es una promesa de rendimiento para edición masiva. El pool tiene máximo 4 conexiones, timeout de conexión/lock/statement de 5 s, query de 6 s, conexión ociosa de 1 s y sesión inactiva dentro de transacción de 10 s. No esperar interacción humana o llamadas de red largas dentro de una transacción. Un fallo se sanitiza; no se registra SQL ni el error crudo del driver. Un error asíncrono del cliente adquirido, incluso entre consultas, invalida la conexión: la siguiente consulta o COMMIT rechaza, la transacción falla y el cliente se descarta. El callback debe terminar para completar su limpieza; no se cancela automáticamente trabajo externo del consumidor. La siguiente operación puede adquirir una conexión nueva. Close espera trabajo ya encolado, rechaza trabajo nuevo y es idempotente.

## Verificar ambos motores

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build:api
pnpm test:db
pnpm build
pnpm build:web
```

`test:db` es un gate **adicional obligatorio** para persistencia. Necesita `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE` en el entorno apuntando a un servidor temporal con SCRAM/TLS y CA de prueba. No carga `.env` real y rechaza el checkout si encuentra uno; usar checkout de pruebas aislado. La credencial de pruebas necesita CREATE DATABASE: cada fixture crea una base `ttrpg_test_<UUID>` y elimina solo esa base después de cerrar pools. SQLite usa directorios temporales separados. No usar una cuenta/base productiva para este arnés.

El certificado de prueba debe cubrir localhost y 127.0.0.1, pero no 127.1, para la prueba negativa de hostname; el servidor debe escuchar loopback. El gate falla si falta configuración, no existe PostgreSQL o no están los artefactos compilados. No simula PostgreSQL ni hace skip verde. La suite general no incluye los archivos `.contract.ts`: el comando test:db los selecciona expresamente. Las mismas pruebas de repositorio/migraciones corren en ambos motores y se añaden TLS, comandos compilados y humo del listener final.

La evidencia real de construcción y limpieza está en [build 006](../factory/jobs/006-persistencia-multidb/build.md). El gate no certifica despliegue remoto, carga prolongada ni todas las plataformas.

## Compatibilidad y respaldo

`.ttrpgscene` sigue en v2 con carga/migración v1. Catálogo, cuentas futuras e invitaciones no se serializan dentro del documento. Exportar JSON no incorpora imágenes; no se implementa aún traslado de datos SQLite/PostgreSQL ni adopción de recursos con un propietario elegido por defecto.

Para respaldo local detén consumidores/migradores y copia como unidad `control.sqlite` y sidecars presentes a destino nuevo privado. Conserva bases legadas aparte. PostgreSQL utiliza pg_dump/pg_restore consistentes conTLS verificado, configuración/CA y credenciales separadas. El gate final verifica roundtrip de ambos motores, datos/cuentas y rechazo de cookies restauradas tras invalidación explícita; consulta [respaldo/retorno](service-operations.md).

## Backend privado008

Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migraciones 3/4, catálogo administrativo versionado y rutas `/api/v1/dm` y `/api/v1/admin/systems`, revisiones, idempotencia y pruebas reales de ambos motores. 011 conecta esta superficie al listener final; las rutas globales históricas no existen en el producto y el driver productivo nunca cae al almacén legado.
