# Validación — retirada del acceso flotante de contadores

Fecha: 2026-11-17. Versión: 3.32.2. Fuente: [spec](spec.md#retirada-del-acceso-flotante-de-gestión--2026-11-17), [plan](plan.md#ajuste-retirada-del-acceso-flotante-de-gestión--2026-11-17) y [tarea FIX-01](tareas.md). Rama autorizada `fix/retirar-control-flotante-contadores`; sin commit, push ni merge.

## Evidencia

- **FIX01-CA01:** retirada del botón Settings2, prop `onManage` y CSS exclusivo. En Storybook real, estado vacío sin región de contadores ni botón de administración (ambos con cero coincidencias). Retorno `null` compartido para colección vacía DM/jugador.
- **FIX01-CA02:** revisión del delta contra baseline privada: `App` solo pierde el callback del overlay, conserva `onCounters` de cabecera y montaje del gestor. QA IAB sobre fixtures: aumentar Turnos de 3 a 4; publicar Con etiqueta cambia el control a Ocultar; vista jugador muestra Amenaza12 sin botones. Cabecera de Storybook a1440 y390 mantiene acción Contadores y dispara su callback; el gestor completo se conserva por inspección del consumidor y regresiones existentes, no se atribuye apertura operativa autenticada.
- **FIX01-CA03:** frontend comunicó `pnpm typecheck`, ESLint focal, 42/42 pruebas existentes de WorkspaceChrome/App.workspace, `pnpm build:web`, `pnpm build-storybook` y `git diff --check` aprobados. Sin pruebas nuevas de estructura. Ajuste local de la historia a contexto workspace con superficie de320px para evitar recorte: QA visual final PASS, barras completas y estado vacío sin control. Después de este ajuste, frontend volvió a ejecutar typecheck, ESLint y diff-check correctamente.

PM revisó el diff de los seis archivos contra su baseline y ejecutó `git diff --check`. La API existente respondió HTTP200 en3.32.2 tras la actualización del watcher. No se reinició manualmente ni se alteraron datos/configuración/API. Capturas y baseline privadas: `.local/validation/counter-access/`.

## Límites

QA de controles productivos con datos sintéticos en navegador integrado; sin guardar partidas operativas, smoke nativo Electron ni recorrido completo autenticado de editor. Los avisos de build sobre `use client` de dependencias y tamaño de chunks no impidieron compilación. No se modificaron contratos de contador, persistencia, filtros de jugador o PixiJS.

Captura final: `.local/validation/counter-access/contadores-sin-acceso-flotante.jpg`. Pestañas de QA cerradas y viewport restaurado.

PM ejecutó también `pnpm build-storybook` final tras el ajuste de superficie: PASS (92 historias y 35 autodocs). Log privado `build-storybook-final.log`. Servidor Storybook temporal detenido; instancia API del usuario conservada.
