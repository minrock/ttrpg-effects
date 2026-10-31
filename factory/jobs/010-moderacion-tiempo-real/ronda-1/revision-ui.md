VEREDICTO: APROBADO

## Alcance

Revisión UI independiente del delta010, ciclo1/ronda1, sobre la base integrada `feef7120e0a3145ddd345eed714deef3542007d4`, en el checkout de autenticacion-mesas. Leídos AGENTS.md, perfil `.codex/agents/ui.toml`, solicitud, spec, build, coordinación, base de archivos y evidencia de ronda. Se inspeccionaron los cambios reales de contratos, cliente contextual, transporte HTTP, proyección pública y TableSession; no se consultaron informes de otros revisores.

La entrega comprende backend/protocolo/adaptador. No entrega el panel de moderación ni el cableado final de las pantallas, expresamente reservados a011. Esta aprobación se limita a su impacto UI y contratos de presentación; no acredita una interfaz de moderación ya terminada.

## Evidencia observada

- Comprobación independiente de SHA256: **637/637 huellas coinciden** con `ronda-1/huellas.json`. La comparación contra `base-archivos.json` identifica47 archivos nuevos/modificados y **ningún cambio en TSX, CSS o HTML**. No se modifican controles, estructura visual, estilos ni vistas de React.
- `src/shared/contracts/moderation.ts` entrega ID estable, alias, discriminador, admisión y presencia textual; separa `connected`, `reconnecting`, `revoked`, `left` y `expired`. La lista tiene paginación y revisión durable distinta de la secuencia de presencia. Estos datos permiten que011 distinga participantes con alias repetido y presente estados sin depender solo del color.
- `src/application/services/moderation.ts` resuelve objetivo por participantId y devuelve outcome, previousPresence y disponibilidad del nuevo enlace. `docs/moderation.md` especifica confirmar alias+discriminador, pérdida de acceso, cambio de enlace y permanencia de los demás, además de la imposibilidad de recuperar el secreto tras perder la primera respuesta. No se promete expulsión permanente de una persona.
- `src/infrastructure/browser/contextual-table-client.ts` crea contexto inmutable y transporte propio. `table-client.ts` valida ámbito/audiencia del sobre, limpia estado/cursor/cola al terminal, aborta solicitudes y avisa al consumidor para desmontar la proyección. El reemplazo de stream detiene reintentos; una caída de red conserva la vista y comunica que está desactualizada. `http.ts` invalida solicitudes ante401 y descarta respuestas de generaciones anteriores.
- `src/application/services/public-table-projection.ts` permite URLs contextuales conservando el generador legado por defecto. `table-session.ts` cuenta participantes únicos y al promover principal reinicia reporte/readiness sin introducir una orden de cámara ni una tirada nueva. Se inspeccionaron además las pruebas de roster, terminales y aislamiento de `moderation.contract.ts` y `transport.contract.ts`, sin ejecutar su gate DB.
- Verificación propia: `pnpm test src/infrastructure/browser/contextual-table-client.test.ts src/infrastructure/browser/table-client.test.ts src/application/services/table-session.test.ts src/application/services/public-table-projection.test.ts src/application/services/game-runtime.test.ts` → **5 archivos,10/10 pruebas, exit0**, duración1.27s. Incluye terminal de A sin limpiar B, respuesta tardía descartada, ausencia de retry tras terminal/replaced, reconexión transitoria y limpieza por401 sobre vista publicada, junto a regresión del cliente/proyección/mesa.

## Hallazgos y correcciones

No se identifican hallazgos UI bloqueantes en el delta010. No se requiere corrección para esta ronda.

No hay nuevos controles que evaluar por jerarquía, contraste en proyección, textos largos, viewport estrecho, foco/Escape o superposiciones. Exigir capturas de un panel inexistente ampliaría el alcance a011. La ausencia de QA visual nueva es por ausencia comprobada de cambios de vistas, no porque los tests unitarios sustituyan una inspección visual.

## Límites

No se ejecutó la aplicación ni se produjeron capturas. En011 deberá verificarse el consumidor real del callback terminal: desmontaje visible de escena/dados/punteros/imágenes, mensajes finales, confirmación de expulsión, estados del listado, nombres largos, navegación por teclado y viewports previstos. La revisión actual no asegura esas propiedades futuras.

Los contratos DB/SSE completos y las cifras generales del build son evidencia declarada por el constructor; aquí solo se reejecutaron los cinco archivos de pruebas citados. No se usó PostgreSQL reservado a Seguridad, el servicio original8787, datos personales ni Git de escritura. La única salida de esta revisión es este informe, publicado mediante temporal y renombrado atómico.
