# Solicitud — Cuentas DM administradas y autenticación segura

Fecha: 2026-10-29T22:59:24.401498+00:00. Origen: invocación explícita `$factory` del usuario para descomponer, especificar y comenzar el desarrollo de cuentas DM/partidas/invitaciones/expulsión. Confirmó altas DM solo por administrador y PostgreSQL en producción (SQLite local).

Lee [decisiones y modelo comunes](../../autenticacion-partidas.md), AGENTS.md, README, package.json y los expedientes 001–005. Base integrada `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Prerrequisito copiado: configuración .env/URL 3.7.0 aún sin commit, registrada en factory/prerrequisitos-autenticacion.json. Nunca tocar el servidor/perfil/datos ni .env privados del repo original.

## Objetivo de este trabajo

Integrar Better Auth con adaptadores SQLite/PostgreSQL según 006. Identidad del administrador/DM, email y contraseña segura, sesiones HTTP-only revocables, alta DM solo administrador y bootstrap local de primer administrador. No registro público. Recuperación administrativa sin enviar correo en esta entrega; no inventar SMTP ni asegurar email verificado sin prueba. Preferir CLI seguro para bootstrap/provisión inicial (password no argumentos/historial, no logs) y endpoints administrativos autenticados si necesarios. Bloquear impersonación/cambio de roles innecesarios. Cookie/sesión de identidad separada del acceso invitado/legado. Endpoints de identidad nueva no autorizan rutas de mesa global antigua mientras no exista aislamiento de 008. Comprobar parámetros reales de hash y límites de coste/concurrencia/anti-enumeración; usar mecanismo mantenido estándar y no criptografía ad hoc. Migraciones en ambos motores y revocación/logout/cambio contraseña/usuario deshabilitado verificables. UI de login completa llega en 011. Reutilizar config/env, no almacenar secretos en bundle. Versionado minor una vez al construir.

## Dependencias y ejecución

Dependencias: 006-persistencia-multidb. Rama prevista `feature/factory-007-cuentas-dm`. Checkout para construcción 006: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Para otros trabajos, resolver checkout/rama al comenzar, no modificar Git ahora. Especificar en este checkout; código solo se construye tras aprobación técnica de sus dependencias.

Autorización: editar/especificar/implementar/probar, y rama aislada de 006. Sin staging, commits, push, merge, despliegue, modificación de servicios ajenos, credenciales reales ni DMG. Permisos previos de integración 001–005 no se aplican. Esta ejecución inicia 006; 007–011 quedan especificadas en cola. No presentar specs futuras como implementadas.

## Convenciones y alcance

Node 24, pnpm, TypeScript estricto/React/Vite/Electron/PixiJS, formato .ttrpgscene v2. Reutilizar src/server, src/infrastructure/server/database, application, shared/contracts y web existentes. Leer docs/private-api.md, docs/service-operations.md, docs/synchronized-table.md. Separar dominio, aplicación, persistencia y HTTP; motores DB solo infraestructura. Artefactos/documentación/instrucciones en español. Comandos pnpm typecheck,lint,test,build,build:api,build:web y contratos reales por driver cuando toque. Constructor único edita implementación/tests/docs/version/changelog; orquestador único escribe solicitud/tablero/cola; revisores solo informe propio. No introducir dependencias sin justificar; Better Auth candidato ya recomendado para 007, pg permitido como driver PostgreSQL 006.

Referencias y estado actual: Auth tiene dos claves globales y sesiones en memoria; ServiceStore SQLite global con tres bases; TableSession único por API. Son límites que esta serie eliminará por etapas, no garantías multiusuario existentes.

## Continuación autorizada — 007 a 011

2026-10-29. El usuario ordenó «continua con 007 a 011». Esta instrucción reemplaza el límite anterior que dejaba 007–011 solo en especificación. Implementar secuencialmente hasta 011, con sus revisiones y aprobación técnica; una dependencia aprobada puede continuar sin integración. Se conserva la restricción vigente de trabajar sin cambiar de rama ni hacer commits/merge. Checkout canónico: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama efectiva para esta continuación: `feature/factory-006-persistencia-multidb`. Las ramas futuras indicadas arriba eran propuestas; prevalece esta excepción. No crear otra rama, no staging/commit/push/merge/DMG. Mantener cada evidencia previa y guardar una nueva base de archivos al iniciar cada trabajo.

006 está aprobada técnicamente; consumir sus fuentes reales y su decisión. Los bloqueos históricos de las specs que describían dependencias aún no entregadas se evalúan por la evidencia actual; no impiden avanzar tras su aprobación. Los cambios de producto, pruebas, docs y versión pertenecen exclusivamente al constructor asignado. El orquestador sigue siendo único escritor del tablero/solicitudes/cola. Nunca usar datos, env ni servicios del checkout original. PostgreSQL temporal será preparado fuera del repositorio para contratos reales.

## Autorización de integración — 2026-10-30

El usuario ordenó integrar los trabajos en necesita-persona. Para este trabajo aprobado autoriza commit y merge local a main y DMG requerido, sin push. Alcance y separación de010 en factory/integracion-006-009-solicitud.md. No se autoriza incluir código010 aún sin revisar.
