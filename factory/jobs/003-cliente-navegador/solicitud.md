# Solicitud — Cliente web con el frontend VTT existente

## Orden del usuario y contexto

Ejecutar esta spec usando la fábrica (`/fabric`), en español, como parte de convertir TTRPG Effects en API + frontend navegador manteniendo Electron como cliente válido. Alcance confirmado: servicio privado DM/jugador. Leer primero `factory/migracion-servicio.md`, `AGENTS.md`, `package.json`, las specs relacionadas y los artefactos de la dependencia.

## Autorización de esta sesión

- Fecha: 2026-10-28. Rama única autorizada: `feature/fabrica-software`. No crear ni cambiar ramas.
- Editar implementación/pruebas/documentación y ejecutar verificaciones locales está autorizado.
- Prohibidos staging, commits, push y merge a main/master. No desplegar ni generar DMG.
- Conservar los cambios previos de spec 40 y de los trabajos anteriores. Solo el orquestador escribe tablero, solicitud, backlog y evidencias de ronda.
- La prohibición de merge no impide avanzar a la siguiente spec tras aprobación técnica.

## Prompt de implementación

Implementa el adaptador navegador del contrato común y entrada/build web con frontend y API del mismo origen. Usa el contrato HTTP real de 002. Añade acceso DM/jugador, cierre de sesión, mensajes de fallo y selección de escenas guardadas accesible. Reutiliza App/PlayerApp, PixiJS y sus herramientas. Implementa guardar/cargar, importar/exportar .ttrpgscene, importar escena como mapa, selección/subida/reemplazo de mapas, imágenes de tokens/notas, plantillas y bibliotecas; enlaces internos de escenas deben usar IDs seguros del servicio y preservar las referencias que sea posible. Los archivos locales se seleccionan mediante navegador, jamás leyendo filesystem del servidor. Indica imágenes ausentes y permite reemplazarlas. Mantén modo Electron local y labs. Comandos dev:web y build:web; servidor puede servir estáticos de producción con fallbacks seguros. No simules éxito de métodos de tiempo real pendientes de 004: usa errores recuperables explícitos y una frontera clara para incorporar el transporte. Añade pruebas de adaptador/UI y comprobación real en navegador; documentación con matriz de paridad y limitaciones verificadas. Alcance: infraestructura HTTP/browser, bootstrap/capas UI de servicio, config web y ajustes necesarios de API para cerrar contratos.

## Dependencia y entrega

Dependencia: 002-api-privada. No iniciar construcción hasta que su contrato/evidencia esté disponible y el orquestador lo indique. Versión de cierre prevista: 3.4.0, bump minor único con changelog en español; no romper el formato de escena. Si aparece una incompatibilidad real, comunicarla antes de alterar el formato.

El especificador escribe `spec.md` de este expediente. El constructor escribe `build.md`, implementación y pruebas de su alcance. Las revisiones seguridad/UX/UI/código se escriben por agentes independientes en `ronda-N/`. El aprobador escribe `decision.md`. Todos leen los perfiles `.codex/agents/*.toml`. No crear otros agentes desde los subagentes.

## Verificación común

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; añadir comandos de API/web cuando existan. Comprobar aceptación con evidencia real. No simular conexiones, aprobaciones, tests o funcionalidades faltantes. Documentar los comandos y limitaciones en build.md.

## Ejecución y evidencia local

Para las pruebas/humo usa directorios y datos temporales, claves de prueba y puertos locales; no migres ni modifiques la biblioteca personal existente de Electron. Las interacciones con navegador o aplicaciones se hacen con las herramientas CUA disponibles; no mediante CDP/Playwright externos ni scripts que controlen la UI. Las pruebas unitarias/integración HTTP con fetch y jsdom siguen permitidas. Conserva límites de verificación explícitos y limpia procesos de prueba al terminar.

## Actualización de autorización — 2026-10-29

La orden posterior `$factory aprobar` autoriza al orquestador a crear commits locales e integrar la serie técnicamente aprobada en `main`, seguida del DMG. Reemplaza la prohibición inicial de commits/merge; no autoriza push ni despliegue. Ver [registro de aprobación](aprobacion-usuario.md). El constructor termina correcciones y revisiones en la rama actual; no integra por su cuenta.
