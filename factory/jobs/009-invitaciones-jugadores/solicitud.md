# Solicitud — Enlaces renovables y entrada de jugadores con alias

Fecha: 2026-10-29T22:59:24.401498+00:00. Origen: invocación explícita `$factory` del usuario para descomponer, especificar y comenzar el desarrollo de cuentas DM/partidas/invitaciones/expulsión. Confirmó altas DM solo por administrador y PostgreSQL en producción (SQLite local).

Lee [decisiones y modelo comunes](../../autenticacion-partidas.md), AGENTS.md, README, package.json y los expedientes 001–005. Base integrada `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Prerrequisito copiado: configuración .env/URL 3.7.0 aún sin commit, registrada en factory/prerrequisitos-autenticacion.json. Nunca tocar el servidor/perfil/datos ni .env privados del repo original.

## Objetivo de este trabajo

Invitación por partida y apertura con secreto aleatorio de 256 bits, verificador hash, expiración y rotación transaccional. El enlace lleva el secreto en su fragmento; su canje por POST con alias crea un participante con cookie independiente. Admitir solo en una partida activa con DM presente. Definir aperturas, presencia y reconexión breve sin rotar por cada pestaña o reconexión SSE. Validar el alias y distinguir nombres repetidos. El jugador no necesita cuenta ni contraseña personal. Impedir fuerza bruta y enumeración de datos privados. Rotar invalida el enlace anterior, conservando a los participantes admitidos de la misma apertura. Integrar con 007/008 y probar carreras de admisión/rotación en ambos motores. Los formularios finales pertenecen a 011; aquí se construyen contratos HTTP utilizables.

## Dependencias y ejecución

Dependencias: 008-partidas-propiedad. Rama prevista `feature/factory-009-invitaciones-jugadores`. Checkout para construcción 006: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Para otros trabajos, resolver checkout/rama al comenzar, no modificar Git ahora. Especificar en este checkout; código solo se construye tras aprobación técnica de sus dependencias.

Autorización: editar/especificar/implementar/probar, y rama aislada de 006. Sin staging, commits, push, merge, despliegue, modificación de servicios ajenos, credenciales reales ni DMG. Permisos previos de integración 001–005 no se aplican. Esta ejecución inicia 006; 007–011 quedan especificadas en cola. No presentar specs futuras como implementadas.

## Convenciones y alcance

Node 24, pnpm, TypeScript estricto/React/Vite/Electron/PixiJS, formato .ttrpgscene v2. Reutilizar src/server, src/infrastructure/server/database, application, shared/contracts y web existentes. Leer docs/private-api.md, docs/service-operations.md, docs/synchronized-table.md. Separar dominio, aplicación, persistencia y HTTP; motores DB solo infraestructura. Artefactos/documentación/instrucciones en español. Comandos pnpm typecheck,lint,test,build,build:api,build:web y contratos reales por driver cuando toque. Constructor único edita implementación/tests/docs/version/changelog; orquestador único escribe solicitud/tablero/cola; revisores solo informe propio. No introducir dependencias sin justificar; Better Auth candidato ya recomendado para 007, pg permitido como driver PostgreSQL 006.

Referencias y estado actual: Auth tiene dos claves globales y sesiones en memoria; ServiceStore SQLite global con tres bases; TableSession único por API. Son límites que esta serie eliminará por etapas, no garantías multiusuario existentes.

## Continuación autorizada — 007 a 011

2026-10-29. El usuario ordenó «continua con 007 a 011». Esta instrucción reemplaza el límite anterior que dejaba 007–011 solo en especificación. Implementar secuencialmente hasta 011, con sus revisiones y aprobación técnica; una dependencia aprobada puede continuar sin integración. Se conserva la restricción vigente de trabajar sin cambiar de rama ni hacer commits/merge. Checkout canónico: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama efectiva para esta continuación: `feature/factory-006-persistencia-multidb`. Las ramas futuras indicadas arriba eran propuestas; prevalece esta excepción. No crear otra rama, no staging/commit/push/merge/DMG. Mantener cada evidencia previa y guardar una nueva base de archivos al iniciar cada trabajo.

006 está aprobada técnicamente; consumir sus fuentes reales y su decisión. Los bloqueos históricos de las specs que describían dependencias aún no entregadas se evalúan por la evidencia actual; no impiden avanzar tras su aprobación. Los cambios de producto, pruebas, docs y versión pertenecen exclusivamente al constructor asignado. El orquestador sigue siendo único escritor del tablero/solicitudes/cola. Nunca usar datos, env ni servicios del checkout original. PostgreSQL temporal será preparado fuera del repositorio para contratos reales.

## Continuación de 009 tras cierre de 008 — 2026-10-30

El usuario ordena «continua con 9». 006, 007 y 008 están técnicamente aprobadas; 008 cerró ciclo 2/ronda 4 con cuatro APROBADO y decisión APROBAR, aplicación3.10.0. No requieren merge para esta dependencia. Se conserva el checkout y rama efectiva anteriores, sin cambios Git, staging, commit, push, merge, DMG ni despliegue. El alcance inmediato es 009. La spec propuesta se conserva en spec-propuesta.md y debe reconciliarse con código real antes de construir: catálogo/retención de sistemas, apertura/generación, autoridad, transacciones y respuesta idempotente sin secretos. Versionar009 como3.11.0 una sola vez al finalizar.

El clúster PostgreSQL anterior fue retirado. El orquestador preparará uno nuevo y registrará los datos no secretos en coordinacion.md. Nunca usar configuraciones, perfiles, bases ni servicios originales. Nuevas pruebas contra ambos motores reales. Se mantienen frontera backend de009, moderación/SSE010 y UI/corte011.

## Autorización de integración — 2026-10-30

El usuario ordenó integrar los trabajos en necesita-persona. Para este trabajo aprobado autoriza commit y merge local a main y DMG requerido, sin push. Alcance y separación de010 en factory/integracion-006-009-solicitud.md. No se autoriza incluir código010 aún sin revisar.
