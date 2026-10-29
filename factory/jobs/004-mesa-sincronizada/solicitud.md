# Solicitud — Sincronización privada entre DM y jugadores

## Orden del usuario y contexto

Ejecutar esta spec usando la fábrica (`/fabric`), en español, como parte de convertir TTRPG Effects en API + frontend navegador manteniendo Electron como cliente válido. Alcance confirmado: servicio privado DM/jugador. Leer primero `factory/migracion-servicio.md`, `AGENTS.md`, `package.json`, las specs relacionadas y los artefactos de la dependencia.

## Autorización de esta sesión

- Fecha: 2026-10-28. Rama única autorizada: `feature/fabrica-software`. No crear ni cambiar ramas.
- Editar implementación/pruebas/documentación y ejecutar verificaciones locales está autorizado.
- Prohibidos staging, commits, push y merge a main/master. No desplegar ni generar DMG.
- Conservar los cambios previos de spec 40 y de los trabajos anteriores. Solo el orquestador escribe tablero, solicitud, backlog y evidencias de ronda.
- La prohibición de merge no impide avanzar a la siguiente spec tras aprobación técnica.

## Prompt de implementación

Completa el transporte de eventos SSE y comandos HTTP entre clientes de una instancia privada. Implementa abrir proyección, estado inicial y reconexión, escena pública, cámara/comandos/reportes, puntero, áreas informativas, indicadores de carga y desconexión, y dados reutilizando DiceRollSession y simulación existente. Todas las operaciones tienen validación y autorización servidor; el jugador no puede modificar la escena, suplantar DM ni suscribirse a información privada. Filtra explícitamente notas/objetos privados y mapas no publicados; assets accesibles al jugador solo si pertenecen al contenido público vigente (también tokens, personajes o imágenes de anotaciones visibles). Dados ocultos e historial privados; eventos ordenados y reconexión sin duplicar acciones. Limpia suscripciones y conexiones; errores de red recuperables sin rechazos no manejados. Completa todos los métodos de tiempo real pendientes del adaptador web y muestra URL/flujo útil para conectar un jugador en otro navegador con su clave. Prueba con sesiones DM/jugador separadas, estado inicial, reconexión y fuga de datos. Alcance: dominio/aplicación de sesión de servicio, rutas/eventos API, adaptador HTTP, UI de proyección y tests.

## Dependencia y entrega

Dependencia: 003-cliente-navegador. No iniciar construcción hasta que su contrato/evidencia esté disponible y el orquestador lo indique. Versión de cierre prevista: 3.5.0, bump minor único con changelog en español; no romper el formato de escena. Si aparece una incompatibilidad real, comunicarla antes de alterar el formato.

El especificador escribe `spec.md` de este expediente. El constructor escribe `build.md`, implementación y pruebas de su alcance. Las revisiones seguridad/UX/UI/código se escriben por agentes independientes en `ronda-N/`. El aprobador escribe `decision.md`. Todos leen los perfiles `.codex/agents/*.toml`. No crear otros agentes desde los subagentes.

## Verificación común

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; añadir comandos de API/web cuando existan. Comprobar aceptación con evidencia real. No simular conexiones, aprobaciones, tests o funcionalidades faltantes. Documentar los comandos y limitaciones en build.md.

## Hallazgo de inspección inicial

`createPlayerSceneSnapshot` actualmente elimina anotaciones privadas, contadores no publicados y labels, pero no basta como frontera de privacidad en red: conserva otros campos del documento completo. Revisar explícitamente sceneAside (notas de monstruos/NPCs/personajes), mapas no activos, tokens invisibles, enlaces, URLs y cualquier contenido no publicado. `sanitizePlayerWindowSnapshot` valida estructura, no autorización ni redacción completa. La nueva proyección del servidor debe conservar lo visible sin transmitir secretos solo ocultados por la UI.

## Ejecución y evidencia local

Para las pruebas/humo usa directorios y datos temporales, claves de prueba y puertos locales; no migres ni modifiques la biblioteca personal existente de Electron. Las interacciones con navegador o aplicaciones se hacen con las herramientas CUA disponibles; no mediante CDP/Playwright externos ni scripts que controlen la UI. Las pruebas unitarias/integración HTTP con fetch y jsdom siguen permitidas. Conserva límites de verificación explícitos y limpia procesos de prueba al terminar.

## Actualización de autorización — 2026-10-29

La orden posterior `$factory aprobar` autoriza al orquestador a crear commits locales e integrar la serie técnicamente aprobada en `main`, seguida del DMG. Reemplaza la prohibición inicial de commits/merge; no autoriza push ni despliegue. Ver [registro de aprobación](aprobacion-usuario.md). El constructor termina correcciones y revisiones en la rama actual; no integra por su cuenta.
