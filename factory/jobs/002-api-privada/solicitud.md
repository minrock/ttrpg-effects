# Solicitud — API privada, escenas, imágenes y bibliotecas

## Orden del usuario y contexto

Ejecutar esta spec usando la fábrica (`/fabric`), en español, como parte de convertir TTRPG Effects en API + frontend navegador manteniendo Electron como cliente válido. Alcance confirmado: servicio privado DM/jugador. Leer primero `factory/migracion-servicio.md`, `AGENTS.md`, `package.json`, las specs relacionadas y los artefactos de la dependencia.

## Autorización de esta sesión

- Fecha: 2026-10-28. Rama única autorizada: `feature/fabrica-software`. No crear ni cambiar ramas.
- Editar implementación/pruebas/documentación y ejecutar verificaciones locales está autorizado.
- Prohibidos staging, commits, push y merge a main/master. No desplegar ni generar DMG.
- Conservar los cambios previos de spec 40 y de los trabajos anteriores. Solo el orquestador escribe tablero, solicitud, backlog y evidencias de ronda.
- La prohibición de merge no impide avanzar a la siguiente spec tras aprobación técnica.

## Prompt de implementación

Implementa un servicio Node independiente de Electron bajo /api/v1. Incluye salud, autenticación DM/jugador por claves configuradas y cookies seguras, logout/expiración, límites y rechazo de orígenes inesperados; escenas CRUD con IDs opacos, imágenes subidas y servidas con MIME verificado, plantillas y bibliotecas reutilizando casos de uso/repositorios. Los jugadores no pueden leer ni mutar escenas completas/bibliotecas; el acceso público de assets se habilitará únicamente para referencias de una proyección validada en 004. No aceptar rutas locales del cliente como rutas del servidor. Preserva formato .ttrpgscene, importa/exporta JSON y permite identificar imágenes ausentes para recuperarlas. Incluye almacenamiento persistente configurable, escritura consistente, errores útiles, endpoints concretos para el cliente siguiente y tests HTTP reales de autorización, traversal, inputs, tamaño y reinicio. Añade comandos dev:api/build:api/start:api y documenta el contrato de rutas/respuestas para 003/004. Usa Node 24 y herramientas ya instaladas cuando sea posible; no añadas dependencias pesadas. Alcance principal: src/server, infraestructura del servicio, contratos HTTP, scripts/config de build, documentación y tests.

## Dependencia y entrega

Dependencia: 001-contrato-clientes. No iniciar construcción hasta que su contrato/evidencia esté disponible y el orquestador lo indique. Versión de cierre prevista: 3.3.0, bump minor único con changelog en español; no romper el formato de escena. Si aparece una incompatibilidad real, comunicarla antes de alterar el formato.

El especificador escribe `spec.md` de este expediente. El constructor escribe `build.md`, implementación y pruebas de su alcance. Las revisiones seguridad/UX/UI/código se escriben por agentes independientes en `ronda-N/`. El aprobador escribe `decision.md`. Todos leen los perfiles `.codex/agents/*.toml`. No crear otros agentes desde los subagentes.

## Verificación común

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; añadir comandos de API/web cuando existan. Comprobar aceptación con evidencia real. No simular conexiones, aprobaciones, tests o funcionalidades faltantes. Documentar los comandos y limitaciones en build.md.

## Ejecución y evidencia local

Para las pruebas/humo usa directorios y datos temporales, claves de prueba y puertos locales; no migres ni modifiques la biblioteca personal existente de Electron. Las interacciones con navegador o aplicaciones se hacen con las herramientas CUA disponibles; no mediante CDP/Playwright externos ni scripts que controlen la UI. Las pruebas unitarias/integración HTTP con fetch y jsdom siguen permitidas. Conserva límites de verificación explícitos y limpia procesos de prueba al terminar.

## Actualización de autorización — 2026-10-29

La orden posterior `$factory aprobar` autoriza al orquestador a crear commits locales e integrar la serie técnicamente aprobada en `main`, seguida del DMG. Reemplaza la prohibición inicial de commits/merge; no autoriza push ni despliegue. Ver [registro de aprobación](aprobacion-usuario.md). El constructor termina correcciones y revisiones en la rama actual; no integra por su cuenta.
