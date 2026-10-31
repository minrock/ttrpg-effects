VEREDICTO: APROBADO

Revisión UX independiente de010, ciclo2/ronda3,2026-10-31. Checkout canónico de autenticación; base main `feef7120e0a3145ddd345eed714deef3542007d4`. Leídos AGENTS.md, perfil UX, solicitud/spec, build final, retrabajo-ciclo-2, coordinación, identidad de ronda e informe UX anterior; contrastados con fuentes reales. Las638 huellas congeladas coinciden. Delta respecto a ronda2: solo `moderation-http.ts`, `corrections.contract.ts` y `docs/moderation.md`; sin archivos nuevos/eliminados ni cambios de cliente/vistas.

## Resultado y evidencia

No se observaron bloqueos UX nuevos. La corrección elimina la conexión fantasma que podía hacer aparecer conectado a alguien que ya había cerrado el navegador, ocupar cupo y convertirse en principal sin recibir la proyección.

En `src/server/moderation-http.ts:84` se observa el cierre antes de esperar la segunda autorización. La entrega comprueba otra vez que la respuesta sigue utilizable antes de crear runtime y registrar conexión. El cierre libera el cupo transitorio; una vez registrado, la limpieza retira listener, registro, conexión y temporizadores de forma idempotente. La cola y la escritura vuelven a comprobar el transporte. El caso de cierre síncrono durante el bootstrap también retira la conexión devuelta por `table.connect`. Si falla antes de enviar cabeceras, conserva la respuesta HTTP de error; no transforma una cuota agotada en éxito aparente.

**Verificación real propia:** la regresión de `src/infrastructure/server/moderation/corrections.contract.ts:20` pasó con SQLite físico y HTTP real. Retiene la segunda autorización, cierra el cliente y espera el evento close del servidor antes de liberarla. Comprueba ausencia de registro, runtime y nuevos intervalos, participante desconectado y secuencia de presencia0. Las siguientes conexiones válidas eligen el primer jugador real como principal; cerrar este promueve al sobreviviente mediante bootstrap. Reemplazar su stream conserva una sola conexión; el siguiente cierre cancela el temporizador y permite otra promoción. La prueba usa barreras/eventos observados, no una espera arbitraria para deducir el resultado.

## Presencia, roles y regresiones

- El registro conserva presencia por participante y apertura; los streamsDM no se convierten en participantes ni incrementan la secuencia de presencia del jugador. `TableSession.primary` selecciona únicamente rol player; `presence()` cuenta participantes únicos y expone la presencia alDM. Cerrar una conexión no cambia el estado durable admitted a revoked/left. El roster puede seguir mostrando reconnecting cuando corresponde.
- La promoción limpia ACK/reporte y solicita bootstrap al siguiente jugador sin emitir una orden nueva de cámara ni modificar dados. El delta no cambia estas reglas en `table-session.ts:56`. La prueba real confirmó la promoción y el reemplazo; la conservación detallada de cámara/dados de A1/A2/B1 se mantiene por inspección y por evidencia del gate completo atribuida al constructor, no por una nueva ejecución propia de ese contrato específico.
- Las otras tres regresiones reales SQLite también pasaron: cuerpos lentos no impiden expulsar en otra partida y el sobreviviente conserva su petición; publicación concurrente al bootstrap permite confirmar imagen/ready y reportar cámara; apertura antigua termina con callback único mientras la nueva conecta.
- UX-010-01 permanece resuelto: los archivos del adaptador conservan sus huellas de ronda2 y sus pruebas vuelven a pasar. Terminal limpia solo su contexto, respuestas tardías no repueblan, replaced detiene retries, red transitoria reconecta y OPENING_CHANGED se distingue de un conflicto recuperable.
- Los contratos consumibles por011 mantienen mensajes, identificación por participantId/alias/discriminador y distinción entre presencia y admisión. Este cambio no añade una pantalla ni modifica el contrato de confirmación/replay de expulsión.

## Verificación propia y límites

| Ejecución | Resultado |
| --- | --- |
| `pnpm test src/infrastructure/browser/contextual-table-client.test.ts src/infrastructure/browser/table-client.test.ts src/application/services/game-runtime.test.ts` | 3 archivos,10/10 PASS |
| `pnpm test src/application/services/table-session.test.ts` | 1 archivo,1/1 PASS; presupuesto de deduplicación/reservaDM |
| `python3 /tmp/ttrpg-auth-pg-run.py test:moderation src/infrastructure/server/moderation/corrections.contract.ts -t 'Correcciones ronda1 sqlite'` | 4/4 SQLite PASS,17.62s;4 PostgreSQL excluidos explícitamente por filtro |
| Huellas de producto al finalizar | 638/638 coincidentes |

El wrapper suministró las variables necesarias para importar fixtures; se ejecutó exclusivamente la selecciónSQLite y se avisó al orquestador. No se abrieron conexiones PostgreSQL ni se ejecutó el gate completo. Los41 contratos multi-DB y builds del build final son evidencia del constructor, no ejecuciones propias de esta revisión. No hubo fallos en las pruebas ejecutadas en esta ronda.

No se hizo CUA, QA visual, teclado/foco/Escape/Delete ni carga prolongada. No cambia ninguna vista010; el montaje/desmontaje visible, panel y confirmación se verificarán en011. Se comprueba aquí la corrección del flujo de transporte y sus señales para ese consumidor.

Sin cambios exigidos desde UX para esta ronda. No se modificaron producto, Git, tablero ni informes ajenos. Informe final publicado mediante temporal y renombrado atómico.
