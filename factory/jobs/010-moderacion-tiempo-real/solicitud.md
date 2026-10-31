# Solicitud — Expulsión inmediata y mesas sincronizadas independientes

Fecha: 2026-10-29T22:59:24.401498+00:00. Origen: invocación explícita `$factory` del usuario para descomponer, especificar y comenzar el desarrollo de cuentas DM/partidas/invitaciones/expulsión. Confirmó altas DM solo por administrador y PostgreSQL en producción (SQLite local).

Lee [decisiones y modelo comunes](../../autenticacion-partidas.md), AGENTS.md, README, package.json y los expedientes 001–005. Base integrada `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Prerrequisito copiado: configuración .env/URL 3.7.0 aún sin commit, registrada en factory/prerrequisitos-autenticacion.json. Nunca tocar el servidor/perfil/datos ni .env privados del repo original.

## Objetivo de este trabajo

Implementar operaciones para listar jugadores por partida (ID, alias y estado) y permitir al propietario expulsarlos. Una transacción revoca todas las credenciales del participante y rota la invitación una sola vez ante reintentos; los demás invitados continúan. Cerrar sus conexiones SSE, rechazar HTTP, assets y comandos, y revalidar peticiones en curso sin filtrar secretos en eventos. Adaptar TableSession, dados, cámaras y retransmisión al contexto de cada partida. Probar varias partidas concurrentes del mismo DM y de distintos DMs, sin difusión global de información privada. Definir reinicio, expiración, reconexión y fin de partida sin restablecer permisos revocados. Persistir participantes e invitaciones en ambos motores; documentar qué estado es efímero. La confirmación visual y el panel pertenecen a 011.

## Dependencias y ejecución

Dependencias: 009-invitaciones-jugadores. Rama prevista `feature/factory-010-moderacion-tiempo-real`. Checkout para construcción 006: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Para otros trabajos, resolver checkout/rama al comenzar, no modificar Git ahora. Especificar en este checkout; código solo se construye tras aprobación técnica de sus dependencias.

Autorización: editar/especificar/implementar/probar, y rama aislada de 006. Sin staging, commits, push, merge, despliegue, modificación de servicios ajenos, credenciales reales ni DMG. Permisos previos de integración 001–005 no se aplican. Esta ejecución inicia 006; 007–011 quedan especificadas en cola. No presentar specs futuras como implementadas.

## Convenciones y alcance

Node 24, pnpm, TypeScript estricto/React/Vite/Electron/PixiJS, formato .ttrpgscene v2. Reutilizar src/server, src/infrastructure/server/database, application, shared/contracts y web existentes. Leer docs/private-api.md, docs/service-operations.md, docs/synchronized-table.md. Separar dominio, aplicación, persistencia y HTTP; motores DB solo infraestructura. Artefactos/documentación/instrucciones en español. Comandos pnpm typecheck,lint,test,build,build:api,build:web y contratos reales por driver cuando toque. Constructor único edita implementación/tests/docs/version/changelog; orquestador único escribe solicitud/tablero/cola; revisores solo informe propio. No introducir dependencias sin justificar; Better Auth candidato ya recomendado para 007, pg permitido como driver PostgreSQL 006.

Referencias y estado actual: Auth tiene dos claves globales y sesiones en memoria; ServiceStore SQLite global con tres bases; TableSession único por API. Son límites que esta serie eliminará por etapas, no garantías multiusuario existentes.

## Continuación autorizada — 007 a 011

2026-10-29. El usuario ordenó «continua con 007 a 011». Esta instrucción reemplaza el límite anterior que dejaba 007–011 solo en especificación. Implementar secuencialmente hasta 011, con sus revisiones y aprobación técnica; una dependencia aprobada puede continuar sin integración. Se conserva la restricción vigente de trabajar sin cambiar de rama ni hacer commits/merge. Checkout canónico: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama efectiva para esta continuación: `feature/factory-006-persistencia-multidb`. Las ramas futuras indicadas arriba eran propuestas; prevalece esta excepción. No crear otra rama, no staging/commit/push/merge/DMG. Mantener cada evidencia previa y guardar una nueva base de archivos al iniciar cada trabajo.

006 está aprobada técnicamente; consumir sus fuentes reales y su decisión. Los bloqueos históricos de las specs que describían dependencias aún no entregadas se evalúan por la evidencia actual; no impiden avanzar tras su aprobación. Los cambios de producto, pruebas, docs y versión pertenecen exclusivamente al constructor asignado. El orquestador sigue siendo único escritor del tablero/solicitudes/cola. Nunca usar datos, env ni servicios del checkout original. PostgreSQL temporal será preparado fuera del repositorio para contratos reales.

## Continuación010 tras aprobación009 — 2026-10-30

El usuario ordena «continua con la 10». 006–009 tienen aprobación técnica;009 cerró ciclo1/ronda1 con cuatro APROBADO y decisión APROBAR en3.11.0. Construir010 tras reconciliar su spec con las fuentes reales. Misma rama feature/factory-006-persistencia-multidb y checkout canónico anterior; sin staging/commit/push/merge/DMG/despliegue ni datos/env/servicios originales. Alcance inmediato010; UI/panel/corte011 siguen pendientes. Versión de cierre3.12.0 una sola vez. Spec propuesta preservada antes de reconciliar.

Preservar contratos009 de apertura, invitación, idempotencia24h y secreto solo en primera respuesta; catálogo008 exacto/retención. PG anterior fue retirado; el orquestador prepara nuevo entorno según coordinacion.md. No usar rutas privadas históricas.

## Reanudación tras integración local — 2026-10-31

006–009 y fix012 integrados enmain: producto a64b5e9dcf7ba60be28047f890ab7edfecbb82df, cierre feef7120e0a3145ddd345eed714deef3542007d4. DMG3.11.1arm64 verificado. Constructor010 continúa en mismo checkout/rama feature/factory-006-persistencia-multidb, HEAD e1fd3ee sin mover rama ni Gitwrites. La autorización de integración cubrió006–009+fixnecesario012;010 sigue sin staging/commit/merge. La base de revisión010 ahora es main feef7120e0a3145ddd345eed714deef3542007d4; base-archivos-pre-integracion.json conserva base anterior y base-archivos.json refleja archivos de main integrado. No existió ronda010 antes de esta actualización.

Antes de continuar producto010, incorporar el fix012 aprobado a package/lock/changelog del checkout mediante comparación con main, preservando script test:moderation y todos los cambios010: vite7.3.3devdirecto, importerlock exacto y entrada3.11.1. Versiónfinal010 sigue3.12.0 una sola vez. Leer spec/build/decision012 y factory/integracion-006-009.md. Constructor es único escritor de estos tres archivos en este checkout. No copiar producto009 sobre010 ni revertir cambios. PostgreSQL temporal original010 sigue17.10/cero bases y conexionesfixtures (auditoría de reanudación correcta); wrapperprivado de coordinación vigente. Retomar pruebas ampliadas de carreras/exclusión y humo compilado, completar todos los gates010 y build.md final.

## Cierre en main y servicio preparado — 2026-10-31

Petición literal del usuario: «cuando termines deja todo en main, y configura todo para correr el servicio. Importante crea los directorios necesarios dentro de la misma carpeta del proyecto e ingnoralos para que no se suban al control de versiones». Se confirma ejecución de la serie restante010y011, incluida interfaz pendiente, y autorización de commits/merge locales de trabajo aprobado, sinpush. Reemplaza la prohibiciónanterior de integración010/011, pero no omite cuatrorevisiones/decisión. Constructor sigue sin Gitwrites mientras construye; orquestador coordina integraciónposterior. Al finalizar, carpeta habitual /Users/minrock/Projects/ttrpg-effects debe quedar enmain conconfiguración/servicioarrancable, preservando cambios/datosprevios y resolviendo checkoutmainaislado de integraciónsinforce/reset.

Preparaciónoperativa en011: pnpmstart:api carga.env; datos,assets,logs y respaldos locales necesarios dentrodelproyecto en directoriosprivados ignorados porGit, rutasabsolutas calculadas desde raíz, permisos700directorios/600archivosprivados. .env/.env.electron/credenciales quedanignorados y no se imprimen. Conservar configuración/datos actuales; si se trasladan, respaldo consistente y comprobación antes de apuntar al destino, sinborrar fuente. No introducir claves públicas ni altasautomáticasalarrancar. PostgreSQLproducción,SQLitelocal. No desplegar ni usarservicioscloud. Serviciooriginalactualloopback8787 se podrá sustituir ordenadamente al cierre convalidación de salud/HTML y recorrido real; no detenerlo anticipadamente duranteconstrucción. DMG trasmerge según AGENTS.
