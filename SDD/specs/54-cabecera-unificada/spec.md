# 54 — Cabecera compacta compartida

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado en `main`; producto en el commit `c4e8831`, cierre y validación en [consolidación](../../consolidacion.md).

## Objetivo

Fusionar navegación de servicio, contexto de partida, controles del editor y perfil en una única cabecera compacta.

## Contrato y aceptación vigente

1. Una fila de 44 px muestra navegación, partida, escena, herramientas y perfil; no hay logo duplicado ni fila vacía del editor.
2. El editor comparte cabecera mediante portal con sus callbacks reales; Electron local conserva su cabecera autónoma.
3. Bajo 1100 px las acciones del editor se agrupan en desplegable conservando guardar, combate, contadores, dados, explorador, inspector y jugador.
4. Escape cierra y devuelve foco; salir con puntero/foco cierra menús; sus teclas no disparan atajos del canvas.
5. Suspensión de acceso oculta e inhabilita los controles compartidos; cerrar/reabrir conserva confirmaciones y protección de borrador.

## Evolución y límites

Consolida 3.18.0 y corrección 3.18.1 en el árbol de trabajo. La inspección anterior usó una fixture aislada; no equivale a probar de nuevo una partida real durante esta consolidación.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/browser-client.md).
- [CHANGELOG](../../../CHANGELOG.md) y fuentes/pruebas indicadas en el plan.
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
