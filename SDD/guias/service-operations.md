# Operación del servicio de cuentas

## Preparación local

Usa Node24 y pnpm desde la raíz física del proyecto:

```bash
pnpm install --frozen-lockfile
pnpm setup:env
pnpm build:api
pnpm build:web
pnpm db:migrate
pnpm createsuperuser
pnpm identity:password # Solo si generaste una contraseña temporal
pnpm identity:provision-dm
pnpm start:api
```

Las herramientas de identidad solicitan contraseñas en TTY oculto y confirmación. En `createsuperuser`, una contraseña elegida queda definitiva; Enter genera una temporal que se muestra una sola vez tras el alta y exige cambiarla al ingresar. No usar contraseñas en argv, pipes, variables de provisión, screenshots o logs. Bootstrap crea el primer administrador con cambio obligatorio; no ejecutarlo en cada arranque. Admin y DM son cuentas diferentes. El servicio no crea usuarios ni asigna contenido al primer login.

`pnpm createsuperuser` ejecuta `scripts/createsuperuser.mjs`, un comando exclusivo de terminal que carga el `.env` de la raíz del proyecto y delega en el CLI de identidad compilado. No usa HTTP, no inicia un listener y no se incluye en el frontend ni en un instalador nativo. Detén la API para provisionar con SQLite. Permite varios administradores con correos distintos después de aplicar la migración 7. No modifica cuentas existentes ni recupera contraseñas automáticamente; para recuperación explícita, detén el servicio y usa `pnpm identity:recover-admin`. Ayuda: `pnpm createsuperuser --help`.

Setup crea `.env` con0600 y `.local/service/{data,backups,logs}` con0700. Usa rutas absolutas derivadas de la raíz, incluso con espacios. `/.local/` y los env privados están ignorados y excluidos de bundles. SQLite usa `control.sqlite` dentro de data; PostgreSQL guarda también assets en su base y no necesita dataDir ni una copia local de bytes. Setup rechaza symlinks de sus rutas y conserva archivos/secretos existentes. Un `.env.electron` de una instalación anterior queda intacto: no se lee, genera, valida ni cambia su modo. Una instalación antigua incompleta da diagnóstico, sin activarla silenciosamente.

`pnpm dev` (alias de `pnpm start:api`) inicia el supervisor de desarrollo: compilación inicial y vigilancia incremental de API/web en `out/dev-service/`, reinicio ordenado de la API al cambiar sus fuentes o `.env`, y recarga manual del navegador para cambios web. No ejecuta typecheck por cambio. Para un build estable usa `pnpm build && pnpm start` (también disponibles como `build:service`/`start:api:built`), que carga `.env` sin vigilancia; el entorno explícito prevalece. Conserva `TTRPG_AUTH_SECRET` en reinicios ordinarios. Ausencia del secreto/migraciones falla antes de servir. Retira `TTRPG_IDENTITY_ENABLED=false`; las claves globales antiguas nunca autorizan. Antes de modificar configuración existente, crea respaldo privado y conserva sus valores originales.

## Navegador

Abre el origen de la API en el navegador. `pnpm build` genera `out/api` y `out/web`; `pnpm start` ejecuta la API estable y sirve la web. Se conservan `build:api` y `build:web` para construir cada salida por separado. Un enlace completo puede pegarse en la pantalla de acceso mediante «Entrar con invitación de jugador», siempre del mismo origen.

El editor y la vista de jugador usan HTTP/SSE y clientes explícitos. «Jugador» publica la escena para los participantes admitidos; no abre una ventana nativa. Las guardas de navegación y los respaldos IndexedDB/remotos conservan su comportamiento. Si falla conexión/certificado, diagnostica el origen y TLS; no omitas la verificación. [Recorridos de interfaz](browser-client.md).

Electron autónomo/conectado y su empaquetado se retiran en [SDD62](../specs/62-servicio-solo-web/spec.md). No se borran ni convierten automáticamente perfiles, escenas locales o antiguos instaladores. El servicio no adopta esos datos por el mero hecho de arrancar.

## Producción PostgreSQL y red

`TTRPG_DEPLOYMENT=production`, `TTRPG_DB_DRIVER=postgres`, URL privada, `TTRPG_DB_TLS=verify-full` y CA absoluta. No fallback, downgrade ni SQLite auxiliar. Un proceso por base: otro runtime falla antes de escuchar. Configura origenHTTPS exacto y proxy con Host/Origin conservados, bufferingSSE desactivado y timeouts largos. El servicio no confía en X-Forwarded-*; la cuota porIP ve el par del proxy. No agregar CORS comodín ni secretos VITE. [Persistencia](database.md) y [cuotas/contexto](moderation.md).

## Diferentes instalaciones

Distribuye el mismo artefacto en instalaciones con almacenamiento, secreto y host/origen propios. Un directorio SQLite o base PostgreSQL pertenece a una sola instancia API activa. Hosts independientes evitan solapar cookies: distintos puertos de un mismo hostname no bastan. Mantén `.env` fuera del frontend y de los artefactos públicos; no copies identidades o datos reales para hacer pruebas.

El estado de mesa y las conexiones siguen en RAM. Balancear varias réplicas contra la misma base requiere otra arquitectura de autoridad y sincronización; los locks existentes deben permanecer. La retirada de Electron no incorpora Django, Redis ni un despliegue automatizado.

## Adopción explícita del legado

Conserva el binario/configuración anterior y su fuente. Detén escritores solo al corte. Usa los comandos existentes de [transferencia](owned-data.md): `pnpm data backup-legacy`, `export-legacy`, `inspect`, `import`, `verify`, `export-owned` y `restore-legacy`, con las opciones allí documentadas. Backup de legado incluye tres bases y sidecars presentes como unidad; configuración se respalda aparte.

Importar exige DM propietario real explícito; el administrador no es propietario válido. El mapa de propietarios debe usar IDs verificados, completo e inyectivo. No inferir por nombre/email ni leer perfil Electron. Destino nuevo separado de la fuente; conservar la fuente tras verificar. Si falta propietario o referencia, mantener el legado preservado y registrar pendiente. En SDD 59 revisión 0.6, `export-owned` escribe paquete funcional v5 y `export-legacy` conserva v3; los lectores aceptan v1–v5. El paquete v5 añade las marcas de borrado de preparación a la jerarquía de v4 y conserva sus reservas, evitando que una transferencia restaure fichas borradas. Transporta catálogo/hash/bindings, contenido, campañas, arcos, asociaciones y preparación; excluye cuentas, sesiones, aperturas, invitaciones y borradores. Conserva procedencia y aliases históricos válidos, sin fusionar entidades por nombre. Su [validación e incorporación operativa](../specs/59-campanas-arcos-escenas/validacion.md) se registran por separado: el corte0.6 se validó en copia aislada y su incorporación al servicio local se autorizó y completó el2026-11-15, con respaldo y migraciónSQLite11. No incorpora una exportación de campañas en la interfaz. `.ttrpgscene` v2 sigue portable, con lectura/migración v1 y sin autoridad ni catálogo incorporado.

## Respaldo integral y restauración

El respaldo integral contiene cuentas/hashes/sesiones: trátalo como secreto0600, directorios0700. No confundirlo con exportación funcional. Conserva fuente y respaldo; nunca `--clean` sobre datos operativos ni sobrescritura de una fuente que recibió cambios.

SQLite: detén API, copia `control.sqlite` y todos sus sidecars presentes a un destino nuevo privado. No copiar en caliente una base SQLite. Verifica inventario, esquema, conteos, hashes, relaciones y cuentas antes de servir. El árbol de datos legados es una unidad aparte.

PostgreSQL: usa clientes oficiales pg_dump/pg_restore compatibles con versión del servidor. Configura PGHOST/PGPORT/PGUSER/PGDATABASE/PGSSLMODE=verify-full/PGSSLROOTCERT y PGPASSFILE0600 en entorno privado; no contraseña en argv ni salida. Ejemplo con destinos nuevos:

```bash
pg_dump --format=custom --file /ruta/privada/respaldo.dump
pg_restore --no-owner --no-privileges --exit-on-error --dbname destino_nuevo /ruta/privada/respaldo.dump
```

No copies el directorio del motor. Restaura primero aislado, compara esquema/conteos/hashes/relaciones y prueba accesoA/B por API. Mantén el origen y backup hasta completar verificación.

Antes de escuchar con una restauración antigua:

1. Apunta la configuración solo al destino nuevo restaurado, con API detenida.
2. Ejecuta `pnpm invitations:invalidate`: cierra aperturas y revoca participantes/credenciales.
3. Rota explícitamente `TTRPG_AUTH_SECRET` con un secreto aleatorio nuevo. Abrir identidad revoca persistentemente sesiones anteriores antes del listener.
4. Comprueba rechazo de cookies antiguas, acceso nuevo de cuentas y aislamiento de datos. Si falla cualquier paso, no sirvas ese destino.

Ambos pasos son repetibles y conservan contenido/cuentas. Esta rotación deliberada de restore no se hace en setup ni reinicio ordinario. Los contratos finales incluyen roundtripSQLite y pg_dump/pg_restore reales conTLS, cookies antiguas rechazadas y bytes/propietarios conservados.

## Corte y retorno

Anota hora de corte y escrituras posteriores. Tras aceptación técnica, integra los cambios autorizados y genera API/frontend con `pnpm build`; versión solo de package.json. El despliegue exige su propia autorización aplicable. El cierre operativo concreto se registra por el orquestador. Durante construcción se usan fixtures; no detener servicios personales para pruebas.

Si falla destino: detenlo, conserva sus datos y regresa a copia nueva verificada de fuente/configuración/binario anteriores. No hay sincronización bidireccional ni fallback automático. El binario anterior también trae su modelo de acceso antiguo: el retorno es decisión explícita del operador. Verifica salud/version/HTML y recorrido autenticado después de cada corte.
