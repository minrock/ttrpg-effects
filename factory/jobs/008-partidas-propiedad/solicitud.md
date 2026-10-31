# Solicitud — Partidas de cada DM y datos aislados en ambos motores

Fecha: 2026-10-29T22:59:24.401498+00:00. Origen: invocación explícita `$factory` del usuario para descomponer, especificar y comenzar el desarrollo de cuentas DM/partidas/invitaciones/expulsión. Confirmó altas DM solo por administrador y PostgreSQL en producción (SQLite local).

Lee [decisiones y modelo comunes](../../autenticacion-partidas.md), AGENTS.md, README, package.json y los expedientes 001–005. Base integrada `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Prerrequisito copiado: configuración .env/URL 3.7.0 aún sin commit, registrada en factory/prerrequisitos-autenticacion.json. Nunca tocar el servidor/perfil/datos ni .env privados del repo original.

## Objetivo de este trabajo

CRUD de múltiples partidas por DM y propiedad por servidor, aislamiento entre DMs de escenas/assets/plantillas/bibliotecas y accesos por contexto. Adaptar los repositorios del servicio a puertos async SQLite/PostgreSQL, incluyendo BLOB/bytea, JSON, fechas y transacciones multi-entidad. Nada de SQLite oculto en producción Postgres. Formato escena v2 y Electron local permanecen. Preparar registros de apertura/lease del anfitrión y revisión optimista/idempotencia para 009/010. El catálogo de 006 se reutiliza. Migrar/adoptar datos globales previos con respaldo y selección explícita de propietario, sin atribuirlos a cualquier primer usuario ni perder vínculos/imágenes; documentar ruta reproducible SQLite→PostgreSQL y tests reales de migración a DB vacía con validación y rollback. Endpoints protegidos por principal de 007, ningún body ownerId permite suplantar. Definir operaciones preparadas para UI de 011.

## Dependencias y ejecución

Dependencias: 007-cuentas-dm. Rama prevista `feature/factory-008-partidas-propiedad`. Checkout para construcción 006: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Para otros trabajos, resolver checkout/rama al comenzar, no modificar Git ahora. Especificar en este checkout; código solo se construye tras aprobación técnica de sus dependencias.

Autorización: editar/especificar/implementar/probar, y rama aislada de 006. Sin staging, commits, push, merge, despliegue, modificación de servicios ajenos, credenciales reales ni DMG. Permisos previos de integración 001–005 no se aplican. Esta ejecución inicia 006; 007–011 quedan especificadas en cola. No presentar specs futuras como implementadas.

## Convenciones y alcance

Node 24, pnpm, TypeScript estricto/React/Vite/Electron/PixiJS, formato .ttrpgscene v2. Reutilizar src/server, src/infrastructure/server/database, application, shared/contracts y web existentes. Leer docs/private-api.md, docs/service-operations.md, docs/synchronized-table.md. Separar dominio, aplicación, persistencia y HTTP; motores DB solo infraestructura. Artefactos/documentación/instrucciones en español. Comandos pnpm typecheck,lint,test,build,build:api,build:web y contratos reales por driver cuando toque. Constructor único edita implementación/tests/docs/version/changelog; orquestador único escribe solicitud/tablero/cola; revisores solo informe propio. No introducir dependencias sin justificar; Better Auth candidato ya recomendado para 007, pg permitido como driver PostgreSQL 006.

Referencias y estado actual: Auth tiene dos claves globales y sesiones en memoria; ServiceStore SQLite global con tres bases; TableSession único por API. Son límites que esta serie eliminará por etapas, no garantías multiusuario existentes.

## Continuación autorizada — 007 a 011

2026-10-29. El usuario ordenó «continua con 007 a 011». Esta instrucción reemplaza el límite anterior que dejaba 007–011 solo en especificación. Implementar secuencialmente hasta 011, con sus revisiones y aprobación técnica; una dependencia aprobada puede continuar sin integración. Se conserva la restricción vigente de trabajar sin cambiar de rama ni hacer commits/merge. Checkout canónico: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama efectiva para esta continuación: `feature/factory-006-persistencia-multidb`. Las ramas futuras indicadas arriba eran propuestas; prevalece esta excepción. No crear otra rama, no staging/commit/push/merge/DMG. Mantener cada evidencia previa y guardar una nueva base de archivos al iniciar cada trabajo.

006 está aprobada técnicamente; consumir sus fuentes reales y su decisión. Los bloqueos históricos de las specs que describían dependencias aún no entregadas se evalúan por la evidencia actual; no impiden avanzar tras su aprobación. Los cambios de producto, pruebas, docs y versión pertenecen exclusivamente al constructor asignado. El orquestador sigue siendo único escritor del tablero/solicitudes/cola. Nunca usar datos, env ni servicios del checkout original. PostgreSQL temporal será preparado fuera del repositorio para contratos reales.

## Entorno temporal de validación preparado

Para esta continuación existe PostgreSQL 17.10 temporal con TLS/SCRAM; el recurso privado `/tmp/ttrpg-auth-pg-env.json` contiene la conexión y CA (no imprimir). `python3 /tmp/ttrpg-auth-pg-run.py <script-pnpm>` transmite esas variables a los gates desde el checkout. Para respaldo/restauración hay clientes oficiales pg_dump/pg_restore 17.10; rutas y receta en `/tmp/ttrpg-auth-pg-tools.json`, sin credenciales. Se verificaron integridad/firma y un roundtrip mínimo con bases UUID propias; esto prepara infraestructura, no sustituye las pruebas de datos y cuentas de esta spec. Usar solo fixtures propias, no detener servidor ni borrar herramientas: el orquestador controla la limpieza final. No poner contraseña en argv; usar archivo pgpass temporal privado según la receta.

## Cambio de alcance autorizado — ciclo 2

2026-10-30. Prevalece [retrabajo-ciclo-2.md](retrabajo-ciclo-2.md) sobre plantillas personales editables por DM y eliminación de plantillas descritas anteriormente. Catálogo administrado, versiones retenidas, deshabilitación para nuevos usos y sistema por partida. Usuario autoriza continuar008 con esta propuesta; sin commits/merge. Specs y build de ciclo1 archivados para conservar evidencia. PostgreSQL antiguo ya eliminado; se preparará recurso nuevo.

## Autorización de integración — 2026-10-30

El usuario ordenó integrar los trabajos en necesita-persona. Para este trabajo aprobado autoriza commit y merge local a main y DMG requerido, sin push. Alcance y separación de010 en factory/integracion-006-009-solicitud.md. No se autoriza incluir código010 aún sin revisar.
