# Solicitud — Persistencia común SQLite y PostgreSQL

Fecha: 2026-10-29T22:59:24.401498+00:00. Origen: invocación explícita `$factory` del usuario para descomponer, especificar y comenzar el desarrollo de cuentas DM/partidas/invitaciones/expulsión. Confirmó altas DM solo por administrador y PostgreSQL en producción (SQLite local).

Lee [decisiones y modelo comunes](../../autenticacion-partidas.md), AGENTS.md, README, package.json y los expedientes 001–005. Base integrada `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Prerrequisito copiado: configuración .env/URL 3.7.0 aún sin commit, registrada en factory/prerrequisitos-autenticacion.json. Nunca tocar el servidor/perfil/datos ni .env privados del repo original.

## Objetivo de este trabajo

Preparar puertos asíncronos, composición y migraciones versionadas para SQLite local/PostgreSQL producción. Incluir una implementación útil de repositorio del catálogo de partidas (metadatos básicos con propietario, sin APIs de autorización todavía), que demuestre CRUD/propiedad/transacciones/rollback y contrato equivalente en ambos motores; 008 lo extenderá. No mover todavía todos los endpoints de escenas a los nuevos repositorios ni instalar Better Auth en 006; sí dejar las fronteras para sus adaptadores en 007. Configuración validada con TTRPG_DB_DRIVER, TTRPG_DATABASE_URL, TTRPG_DEPLOYMENT, TLS y errores sin secretos. Un comando pnpm db:migrate explícito debe aplicar migraciones idempotentes y no tocar datos ajenos. Definir y probar fallo de arranque/uso productivo si la composición legada todavía no soporta PostgreSQL, sin afirmar servicio completo compatible hasta 008/011. Implementar tests PostgreSQL reales, sin skips verdes: si falta entorno intentar preparar instancia local temporal sin cambiar servicios del usuario y registrar cualquier bloqueo. Preservar setup:env, .env.example, modo Electron local y toda suite existente. Añadir guía de drivers y migraciones. Nueva versión minor 3.8.0. Concretar alcance pequeño que sea construible en un ciclo.

## Dependencias y ejecución

Dependencias: ninguna; usa la base 3.7.0 copiada. Rama prevista `feature/factory-006-persistencia-multidb`. Checkout para construcción 006: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Para otros trabajos, resolver checkout/rama al comenzar, no modificar Git ahora. Especificar en este checkout; código solo se construye tras aprobación técnica de sus dependencias.

Autorización: editar/especificar/implementar/probar, y rama aislada de 006. Sin staging, commits, push, merge, despliegue, modificación de servicios ajenos, credenciales reales ni DMG. Permisos previos de integración 001–005 no se aplican. Esta ejecución inicia 006; 007–011 quedan especificadas en cola. No presentar specs futuras como implementadas.

## Convenciones y alcance

Node 24, pnpm, TypeScript estricto/React/Vite/Electron/PixiJS, formato .ttrpgscene v2. Reutilizar src/server, src/infrastructure/server/database, application, shared/contracts y web existentes. Leer docs/private-api.md, docs/service-operations.md, docs/synchronized-table.md. Separar dominio, aplicación, persistencia y HTTP; motores DB solo infraestructura. Artefactos/documentación/instrucciones en español. Comandos pnpm typecheck,lint,test,build,build:api,build:web y contratos reales por driver cuando toque. Constructor único edita implementación/tests/docs/version/changelog; orquestador único escribe solicitud/tablero/cola; revisores solo informe propio. No introducir dependencias sin justificar; Better Auth candidato ya recomendado para 007, pg permitido como driver PostgreSQL 006.

Referencias y estado actual: Auth tiene dos claves globales y sesiones en memoria; ServiceStore SQLite global con tres bases; TableSession único por API. Son límites que esta serie eliminará por etapas, no garantías multiusuario existentes.

## Autorización de integración — 2026-10-30

El usuario ordenó integrar los trabajos en necesita-persona. Para este trabajo aprobado autoriza commit y merge local a main y DMG requerido, sin push. Alcance y separación de010 en factory/integracion-006-009-solicitud.md. No se autoriza incluir código010 aún sin revisar.
