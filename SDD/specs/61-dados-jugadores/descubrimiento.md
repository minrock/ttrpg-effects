# Descubrimiento — SDD 61

Fecha: 2026-11-15. Consulta PM, TL y UI/UX de solo lectura sobre el checkout local 3.31.0; HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598` con cambios locales previos. [Spec propuesta](spec.md). La consulta no ejecutó tests, simulaciones ni acciones sobre el servicio del usuario.

## Fuentes contrastadas

| Fuente actual | Hallazgo e implicación |
| --- | --- |
| [SDD 37](../37-dm-dice-rolls/spec.md) | Excluye tiradas de jugadores y prescribe log privado, reemplazo de pública anterior y posibilidad de reabrir resumen histórico. SDD 61 sustituye esos puntos en servicio al implementarse; conserva el corte histórico y modo autónomo. |
| [Guía de mesa](../../guias/synchronized-table.md) | Mutaciones de dados DM y reproducción pública; protocolos estrictos y estado efímero. Requiere actualización de contrato al construir, no presentar la propuesta como API disponible. |
| [DicePanel](../../../src/renderer/src/components/dice/DicePanel.tsx) | Contiene composición y acciones exclusivas DM. Historial de hasta 500, diez por página. Se puede reutilizar UI con controlador tipado/capacidades, sin pasar callbacks privados al jugador. |
| [PlayerApp](../../../src/renderer/src/PlayerApp.tsx) | Solo `usePublicDice` y overlay. El lateral de Mesa existente es la ubicación propuesta para Dados. |
| [player-table.css](../../../src/renderer/src/components/workspace/player-table.css) | Lateral de 282 px y comportamiento estrecho bajo 1100 px; mantener su foco y espacio del mapa. |
| [Controls](../../../src/renderer/src/components/ui/Controls.tsx), [dice.css](../../../src/renderer/src/components/dice/dice.css), [workspace.css](../../../src/renderer/src/components/workspace/workspace.css) | Select es un wrapper nativo sin estilo propio; Material usa select inline y solo 7 px de padding derecho en dados. Estilos contextuales pueden anular una corrección aislada. |
| [DiceRollSession](../../../src/application/services/dice-roll-session.ts), [dominio dice](../../../src/domain/dice/dice.ts) | Un borrador, un contexto y una reserva sin autor. Begin bloquea preparación/animación, pero admite nueva pública tras asentarse la anterior. Cierre no borra `latestPublic` y visibilidad puede reabrirla. |
| [useDiceSession](../../../src/renderer/src/hooks/useDiceSession.ts), [browser-dice-simulation](../../../src/infrastructure/dice/browser-dice-simulation.ts) | Física en worker del iniciador y replay común; posible reutilización para jugador sin depender de navegador DM. Timeouts actuales de worker 15 s y reserva 20 s. |
| [moderation-http](../../../src/server/moderation-http.ts), [table-actions](../../../src/server/table-actions.ts) | Dos barreras DM-only. Respuestas de mutación devuelven estado DM completo; habilitar rutas sin proyección por rol filtraría datos privados. |
| [guest-authority](../../../src/infrastructure/server/invitations/guest-authority.ts) | Identidad ligada a participante/apertura/generación y revalidación antes de confirmar. Reutilizar esta autoridad; no confiar en autor recibido. |
| [game-runtime](../../../src/application/services/game-runtime.ts) | Estado efímero y limpieza por runtime; el tick actual barre anotaciones. La expiración de reserva de dados necesita notificación activa para no dejar Lanzar bloqueado hasta otra petición. |
| [dice-ipc](../../../src/main/ipc/dice-ipc.ts) | Modo autónomo restringe operaciones a DM y no dispone de autor invitado. Se conserva esta frontera. |
| [Inventario Storybook](../60-storybook-componentes-ui/inventario.md) | Existen Select y DiceResultSummary. DicePanel no tiene historia; puede aislarse con fixture tipada sin el hook ni motores. |

## Recomendaciones incorporadas

- Actor derivado de autoridad real; completar/fallar solo reserva propia; cierre autor o DM. Una respuesta pública es un DTO filtrado, no `DiceSessionState` privado.
- Adquirir reserva pública atómicamente antes de simular, preservando la independencia de las tiradas ocultas. No reabrir un registro cerrado al alternar resumen.
- Separar reserva sin resultado de resultado válido: timeout/fallo libera la primera; una desconexión no borra ni recalcula el segundo.
- Estado y log recuperables solo durante el runtime de la apertura. Propuesta de retención: 500 públicas y 500 ocultas, consulta combinada paginada DM; evita que actividad oculta desaloje públicas o que el DM pierda acceso a entradas todavía visibles para jugadores. No equivale a retener sus replays completos.
- Toda pública, incluida la DM, se vincula al contexto publicado; una reserva oculta no bloquea el turno público ni revela su actividad en errores de jugadores.
- Reutilizar el lateral del jugador y el selector existente. Material y los otros selectores de dados adoptan la mejora compartida; no se crea otra biblioteca ni un parche exclusivo de la captura.

## Modelo de confianza y verificación pendiente

El servidor actual comprueba estructura, rangos de caras, geometría y totales a partir de datos de simulación enviados por el cliente. El worker usa azar local; esta arquitectura no certifica imparcialidad ante un cliente alterado. SDD 61 conserva explícitamente esa limitación y no añade un servicio de azar autoritativo ni una garantía anti-trampas.

Suites existentes útiles para el futuro plan: `DicePanel.test.tsx`, `useDiceSession.test.tsx`, `dice-roll-session.test.ts`, `dice-ipc.test.ts`, `table-http.test.ts`, `PlayerApp.tools.test.tsx` y contratos de moderación. Algunas prueban expresamente la prohibición de tiradas invitadas o la reapertura de resumen: cambiarlas solo donde la nueva spec sustituye el contrato, conservando el aislamiento de tiradas ocultas y del modo autónomo.

Pendiente de construcción: plan técnico y tareas, DTO/negociación, implementación, historias, pruebas de concurrencia/privacidad, recorridos de navegador/Electron, memoria y render. No hay evidencia de aceptación de CA-01–18 por la mera existencia de estos documentos.

## Comprobación documental

Al finalizar la redacción se comprobaron enlaces locales en los seis documentos afectados: spec, descubrimiento, índice SDD, estado actual, aviso de evolución en SDD 37 y apéndice UI-004. Sin destinos de archivo ausentes; CA-01–18 únicos y consecutivos; `git diff --check` sin incidencias en ese alcance. La aplicación conserva versión 3.31.0. La revisión TL incorporó contexto público también para DM, independencia del turno público frente a reservas ocultas y retención pública/privada separada. Estos resultados verifican documentos, no funcionamiento del producto.
