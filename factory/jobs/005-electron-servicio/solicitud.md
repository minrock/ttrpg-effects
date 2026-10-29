# Solicitud — Electron como cliente del servicio y entrega operativa

## Orden del usuario y contexto

Ejecutar esta spec usando la fábrica (`/fabric`), en español, como parte de convertir TTRPG Effects en API + frontend navegador manteniendo Electron como cliente válido. Alcance confirmado: servicio privado DM/jugador. Leer primero `factory/migracion-servicio.md`, `AGENTS.md`, `package.json`, las specs relacionadas y los artefactos de la dependencia.

## Autorización de esta sesión

- Fecha: 2026-10-28. Rama única autorizada: `feature/fabrica-software`. No crear ni cambiar ramas.
- Editar implementación/pruebas/documentación y ejecutar verificaciones locales está autorizado.
- Prohibidos staging, commits, push y merge a main/master. No desplegar ni generar DMG.
- Conservar los cambios previos de spec 40 y de los trabajos anteriores. Solo el orquestador escribe tablero, solicitud, backlog y evidencias de ronda.
- La prohibición de merge no impide avanzar a la siguiente spec tras aprobación técnica.

## Prompt de implementación

Añade un modo explícito de Electron para conectarse al mismo servicio web además de su modo local actual, por configuración/documentación clara. No expongas preload ni IPC local a la URL remota; contextIsolation true, nodeIntegration false y sandbox true. Restringe navegación, nuevas ventanas y permisos al origen configurado, sin abrir URLs arbitrarias. Usa exactamente el frontend/API del navegador y conserva la proyección DM/jugador, sin duplicar reglas de negocio. Valida URL de servicio, HTTPS fuera de loopback y errores de conexión recuperables. Completa scripts de ejecución/build del servicio y frontend, documentación de claves, directorios persistentes, HTTPS, backup/restore y compatibilidad de escenas. Ejecuta matriz de humo local Electron, web DM, web jugador y Electron servicio; corrige regresiones de integración. No desplegar, no generar DMG ni integrar rama. Alcance: main/config de Electron servicio, scripts/build/guía, pruebas de aislamiento y ajustes de integración justificados.

## Dependencia y entrega

Dependencia: 004-mesa-sincronizada. No iniciar construcción hasta que su contrato/evidencia esté disponible y el orquestador lo indique. Versión de cierre prevista: 3.6.0, bump minor único con changelog en español; no romper el formato de escena. Si aparece una incompatibilidad real, comunicarla antes de alterar el formato.

El especificador escribe `spec.md` de este expediente. El constructor escribe `build.md`, implementación y pruebas de su alcance. Las revisiones seguridad/UX/UI/código se escriben por agentes independientes en `ronda-N/`. El aprobador escribe `decision.md`. Todos leen los perfiles `.codex/agents/*.toml`. No crear otros agentes desde los subagentes.

## Verificación común

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; añadir comandos de API/web cuando existan. Comprobar aceptación con evidencia real. No simular conexiones, aprobaciones, tests o funcionalidades faltantes. Documentar los comandos y limitaciones en build.md.

## Ejecución y evidencia local

Para las pruebas/humo usa directorios y datos temporales, claves de prueba y puertos locales; no migres ni modifiques la biblioteca personal existente de Electron. Las interacciones con navegador o aplicaciones se hacen con las herramientas CUA disponibles; no mediante CDP/Playwright externos ni scripts que controlen la UI. Las pruebas unitarias/integración HTTP con fetch y jsdom siguen permitidas. Conserva límites de verificación explícitos y limpia procesos de prueba al terminar.

## Inspección actualizada del orquestador — 2026-10-29

001–003 tienen aprobación técnica; 004 tiene implementación y evidencia, con correcciones de primera ronda en curso. Esto actualiza el contexto histórico de la spec redactada antes de esas entregas; no habilita construir 005 hasta la decisión técnica de 004.

- Reutilizar `src/server/{config,index,http}.ts`, `src/web/` y `docs/{private-api,browser-client,synchronized-table}.md`. Ya existen los cinco comandos API/web y sus salidas independientes `out/api` y `out/web`.
- Revisar ambos puntos de creación de ventanas privilegiadas: `src/main/index.ts` y `src/main/ipc/player-window-ipc.ts`. Actualmente main inicializa infraestructura local incondicionalmente; el nuevo modo debe seleccionar la composición antes de hacerlo.
- `electron.vite.config.ts` mantiene salidas main/preload/renderer. `package.json` incluye `out/**/*` en empaquetado: comprobar qué artefactos finales corresponden a Electron sin ejecutar DMG.
- La API exige Node 24, rutas absolutas y origen exacto; `src/server/index.ts` dispone de cierre SIGINT/SIGTERM. Reutilizar esa salida limpia para demostrar respaldo y restauración en directorios temporales.
- La evidencia de humo previa está atribuida en los `build.md`. Reutilizarla para el alcance no modificado, pero verificar de forma real las nuevas fronteras de Electron y la integración final solicitada; no presentar pruebas anteriores como ejecuciones nuevas.

## Actualización de autorización — 2026-10-29

La orden posterior `$factory aprobar` autoriza al orquestador a crear commits locales e integrar la serie técnicamente aprobada en `main`, seguida del DMG. Reemplaza la prohibición inicial de commits/merge; no autoriza push ni despliegue. Ver [registro de aprobación](aprobacion-usuario.md). El constructor termina correcciones y revisiones en la rama actual; no integra por su cuenta.
