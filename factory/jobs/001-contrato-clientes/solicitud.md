# Solicitud — Contrato común para clientes web y Electron

## Orden del usuario y contexto

Ejecutar esta spec usando la fábrica (`/fabric`), en español, como parte de convertir TTRPG Effects en API + frontend navegador manteniendo Electron como cliente válido. Alcance confirmado: servicio privado DM/jugador. Leer primero `factory/migracion-servicio.md`, `AGENTS.md`, `package.json`, las specs relacionadas y los artefactos de la dependencia.

## Autorización de esta sesión

- Fecha: 2026-10-28. Rama única autorizada: `feature/fabrica-software`. No crear ni cambiar ramas.
- Editar implementación/pruebas/documentación y ejecutar verificaciones locales está autorizado.
- Prohibidos staging, commits, push y merge a main/master. No desplegar ni generar DMG.
- Conservar los cambios previos de spec 40 y de los trabajos anteriores. Solo el orquestador escribe tablero, solicitud, backlog y evidencias de ronda.
- La prohibición de merge no impide avanzar a la siguiente spec tras aprobación técnica.

## Prompt de implementación

Extrae TtrpgApi, DiceApi y tipos de resultado a un módulo compartido seguro y ajeno a Electron. Conserva reexports compatibles en preload y las pruebas/labs existentes. Introduce una composición explícita de cliente/capacidades que permita el adaptador HTTP posterior sin reescribir App ni PlayerApp. No implementes todavía un backend o métodos HTTP simulados. Corrige getAppInfo para que versión provenga de package.json y deje de estar fijada a 0.0.0, sin ampliar APIs privilegiadas. Documenta el mapa de paridad entre funciones nativas y futuras operaciones del servicio. Mantén Electron local funcional y verifica regresiones. Alcance principal: contratos compartidos, preload, composición del renderer, configuración de tipos/build si es necesaria y documentación de arquitectura.

## Dependencia y entrega

Dependencia: Ninguna. No iniciar construcción hasta que su contrato/evidencia esté disponible y el orquestador lo indique. Versión de cierre prevista: 3.2.0, bump minor único con changelog en español; no romper el formato de escena. Si aparece una incompatibilidad real, comunicarla antes de alterar el formato.

El especificador escribe `spec.md` de este expediente. El constructor escribe `build.md`, implementación y pruebas de su alcance. Las revisiones seguridad/UX/UI/código se escriben por agentes independientes en `ronda-N/`. El aprobador escribe `decision.md`. Todos leen los perfiles `.codex/agents/*.toml`. No crear otros agentes desde los subagentes.

## Verificación común

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; añadir comandos de API/web cuando existan. Comprobar aceptación con evidencia real. No simular conexiones, aprobaciones, tests o funcionalidades faltantes. Documentar los comandos y limitaciones en build.md.

## Actualización de autorización — 2026-10-29

La orden posterior `$factory aprobar` autoriza al orquestador a crear commits locales e integrar la serie técnicamente aprobada en `main`, seguida del DMG. Reemplaza la prohibición inicial de commits/merge; no autoriza push ni despliegue. Ver [registro de aprobación](aprobacion-usuario.md). El constructor termina correcciones y revisiones en la rama actual; no integra por su cuenta.
