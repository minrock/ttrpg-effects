VEREDICTO: CAMBIOS

Revisión UX independiente de 010, ciclo 1/ronda 1, 2026-10-31. Base main `feef7120e0a3145ddd345eed714deef3542007d4`; checkout canónico de autenticación. Leídos perfil UX, AGENTS, solicitud, spec, build, coordinación e identidad de ronda; comprobadas las 637 huellas congeladas sin discrepancias. El delta contiene 28 archivos modificados y 19 nuevos; ninguna vista React modificada.

## Hallazgo bloqueante

### UX-010-01 · P2 · La apertura anterior permanece visible y reintenta después de una reapertura durante la desconexión

**Reproducción:** un cliente contextual DM está conectado a apertura1 y tiene una publicación. Pierde la red y, antes de reconectar, otra pestaña/sesión del propietario cierra y reabre la partida como apertura2. El cliente antiguo no recibió el terminal de cierre. Al recuperar la conexión solicita `/table/events` sin openingId/generation; el servidor resuelve la apertura actual y devuelve un bootstrap autorizado de apertura2. El adaptador detecta la diferencia, pero la convierte en error transitorio, conserva `published=true` y no llama al callback terminal. Cada nuevo intento vuelve al mismo punto. La etiqueta «reconectando» ya no describe una recuperación posible de esa instancia inmutable.

**Evidencia de código:** `src/infrastructure/browser/table-client.ts:61` envía el stream sin el contexto persistido; `:78` lanza Error ante la apertura distinta; `:88–92` solo termina ante ServiceError HTTP401/403/404 y reintenta el resto. `src/server/moderation-http.ts:43` resuelve la apertura actual y `:66` comprueba la esperada únicamente cuando el cliente la envía como query. El cursor antiguo no impone apertura, correctamente: no es una credencial. Las lecturas `/table/state`, `/dice/sizes` y `/dice/session` del mismo adaptador tampoco envían openingId/generation (`table-client.ts:204,209,212`); las dos últimas ni siquiera tienen metadata contextual en la respuesta que permita detectar el salto de apertura.

**Comprobación ejecutada:** probe externo `/tmp/ttrpg-010-ux-probe.test.ts`, configuración `/tmp/ttrpg-010-ux-probe.config.mjs`, con TableSession real para el bootstrap, transporte simulado y temporizadores controlados. Recibe bootstrap de apertura1, corta el stream, recibe un bootstrap válido de apertura2 al reconectar y verifica `published=true`, cero llamadas terminales y una tercera petición de stream. Ejecutado con `pnpm exec vitest run --config /tmp/ttrpg-010-ux-probe.config.mjs`: 1/1 PASS reproduciendo el defecto. La primera ejecución del probe falló por capturar un evento de presencia posterior al bootstrap; corregida únicamente esa fixture externa, la reproducción final pasa. No es una prueba HTTP/DB de extremo a extremo; el camino servidor que hace posible la respuesta se comprobó por inspección.

**Impacto:** la instancia anterior conserva una proyección que corresponde a una apertura finalizada y deja al consumidor011 sin la señal para desmontarla o volver a seleccionar contexto. El usuario queda en un bucle de reconexión y puede recibir errores de contexto al operar. Esto incumple la recuperación/terminación del adaptador exigida en A7/A9; no depende de construir el panel011.

**Corrección esperada:** fijar openingId/generation en todas las lecturas y conexiones del adaptador contextual, y tratar la pérdida definitiva de ese contexto como terminal con limpieza/abort y sin nuevos reintentos. Diferenciar un conflicto de apertura de conflictos recuperables de revisión de mapa; no terminar indiscriminadamente ante cualquier409. Un sobre válido de otra apertura tampoco debe dejar una instancia vieja reintentando indefinidamente. Añadir una regresión de caída → cierre/reapertura desde otra sesión → reconexión que compruebe callback único, `published=false`, descarte de lecturas tardías y ausencia de nuevos retries; comprobar que el cliente de la apertura nueva sigue funcionando y que un corte de red dentro de la misma apertura conserva la recuperación transitoria.

## Flujos revisados sin otros bloqueos observados

- El roster identifica al objetivo por participantId y ofrece alias/discriminador, estado de admisión y presencia separada. La revisión durable no se confunde con la secuencia efímera. El contrato permite diferenciar reconexión, salida, caducidad y expulsión sin interpretar una caída de red como moderación.
- El servicio de expulsión y sus contratos distinguen primera respuesta con enlace, replay sin secreto y objetivo ya revocado sin nueva rotación. El replay se resuelve antes de exigir apertura vigente. La documentación explica la recuperación mediante rotación explícita tras perder la primera respuesta y no promete recuperar el enlace perdido.
- La invalidación del registro se limita a participante/contexto; no limpia al resto por una rotación. La promoción del principal limpia ACK/reporte y solicita bootstrap, conservando cámara y dado en el motor. Se inspeccionaron los escenarios de tres participantes, credenciales múltiples, A1/A2/B1, cámaras/dados y replay posterior al cierre en moderation.contract.ts y races.contract.ts. Sus resultados multi-DB son evidencia atribuida al build, no ejecuciones propias de esta revisión.
- Las pruebas existentes comprueban terminal solo en A conservando B, respuesta tardía tras abort, reemplazo de stream sin bucle, red transitoria y HTTP401. La guía documenta correctamente límites de cuotas, estado efímero tras reinicio, nueva publicación explícita, bytes ya entregados y ausencia de veto permanente.

## Verificación y límites

Ejecución propia: `pnpm test src/infrastructure/browser/contextual-table-client.test.ts src/infrastructure/browser/table-client.test.ts src/application/services/game-runtime.test.ts`, 3 archivos y 7/7 tests PASS; probe adicional 1/1 PASS reproduciendo UX-010-01. No se ejecutaron PostgreSQL, servicios privados, migraciones ni gates reservados a Seguridad. No se modificaron producto, Git, tablero ni informes ajenos.

No hubo inspección visual ni se atribuye QA de teclado, foco, Escape/Delete o proyección a tests de transporte. No hay vistas nuevas en010: panel, confirmación y montaje/desmontaje visual final corresponden a011. El único cambio exigido aquí pertenece al adaptador y su recuperación ya incluidos en010.

Revisión finalizada. Requiere corregir UX-010-01 y volver a comprobar su regresión antes de aprobar010 desde UX.
