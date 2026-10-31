VEREDICTO: APROBADO

Revisión UX independiente de 010, ciclo 1/ronda 2, 2026-10-31. Base main `feef7120e0a3145ddd345eed714deef3542007d4`; checkout canónico de autenticación. Leídos AGENTS.md, perfil UX, solicitud, spec vigente, build final, coordinación, identidad de ronda, informe UX de ronda1 y su probe externo; inspeccionadas las fuentes reales. Verificadas las 638 huellas congeladas sin discrepancias. La corrección cambia diez archivos y agrega un contrato respecto de ronda1; no modifica vistas React ni elimina archivos congelados.

## Cierre del hallazgo UX-010-01

**Resuelto.** `src/infrastructure/browser/contextual-table-client.ts:9` fija openingId/generation en el transporte de cada instancia. `http.ts:24,50` los añade a todas las lecturas y al stream, incluidas las lecturas de dados que no llevan metadata en su respuesta. El servidor compara el contexto solicitado y devuelve `OPENING_CHANGED` en `src/server/moderation-http.ts:79` y en la validación de mutaciones. Si una apertura se cerró o venció sin reemplazo, `game-runtime.ts:29` rechaza el contexto con NOT_FOUND, que también termina el acceso del adaptador.

`http.ts:31,55` distingue el conflicto definitivo de apertura de un409 recuperable; `table-client.ts:37,78` termina también ante estado/sobre válido de otra apertura. La terminación es idempotente, invalida HTTP, cancela el stream y sus reintentos, limpia la publicación y notifica al consumidor011. Una respuesta antigua no restaura la vista. El usuario ya no queda mirando una apertura finalizada bajo un mensaje de reconexión imposible;011 dispone de la señal necesaria para desmontar la proyección.

La regresión de HTTP real `corrections.contract.ts:53` se ejecutó con SQLite físico: publicación DM, desconexión, reapertura desde otra operación,409 OPENING_CHANGED en state/session/sizes de la apertura antigua, callback terminal único al reconectar y cliente nuevo conectado. La prueba del cliente añade sobre extranjero, lectura tardía y ausencia de retries durante60s. También pasa la separación entre REVISION_CONFLICT recuperable y OPENING_CHANGED terminal.

Se reejecutó sin modificar el probe histórico `/tmp/ttrpg-010-ux-probe.test.ts`. Su expectativa del defecto falla ahora exactamente en la línea22: esperaba `published=true` y recibe `false`. Este resultado no se contabiliza como test PASS; confirma que dejó de reproducirse la observación antigua, complementada por las regresiones positivas anteriores.

## Contratos y regresiones revisados

- Terminal de A conserva B; HTTP401 limpia una publicación; reemplazo de stream detiene la pestaña anterior; una caída transitoria mantiene la vista desactualizada y reconecta dentro de la misma apertura. Cursor, cola y aborts permanecen por instancia.
- El bootstrap concurrente reconstruido entrega una publicación utilizable: el cliente real obtiene imagen y puede confirmar carga/ready y reportar cámara. Este recorrido pasó sobre SQLite; no queda una pantalla conectada sin snapshot inicial por esa carrera.
- La prueba de cuerpos incompletos conserva moderación disponible en otra partida, cancela los lectores del expulsado antes del ACK y permite concluir al sobreviviente. Pasó sobre SQLite. Su impacto UX es que una expulsión no espera indefinidamente cuerpos de otro participante.
- Roster y expulsión conservan objetivo por participantId, alias/discriminador, presencia separada del estado durable, precondiciones, replay sin secreto y rotación explícita tras perder el enlace. La documentación entrega a011 los mensajes y límites necesarios, sin prometer veto permanente ni confundir caída de red con expulsión. No se observó una regresión de estos contratos en el delta.

## Verificación propia y límites

1. `pnpm test src/infrastructure/browser/contextual-table-client.test.ts src/infrastructure/browser/table-client.test.ts src/application/services/game-runtime.test.ts`: **3 archivos,10/10 PASS**.
2. `python3 /tmp/ttrpg-auth-pg-run.py test:moderation src/infrastructure/server/moderation/corrections.contract.ts -t 'Correcciones ronda1 sqlite'`: **3/3 casos SQLite PASS**,13.02s. Los tres casos PostgreSQL quedan fuera por el filtro explícito; no es una ejecución del gate completo ni evidencia propia PostgreSQL. El wrapper solo suministró las variables exigidas al importar fixtures; el código seleccionado creó exclusivamente SQLite temporal. Se avisó al orquestador y no se abrieron conexiones PostgreSQL.
3. El primer intento directo del mismo contrato no ejecutó tests: el guard de importación exige variables PostgreSQL incluso al filtrar SQLite. Se conserva esta incidencia como intento fallido de entorno, no defecto del producto ni PASS.
4. Probe histórico: fallo esperado de la aserción que describía el defecto, detallado arriba. Comparación SHA256:638/638 coincidentes.

La evidencia PostgreSQL, builds y gates generales del build final es atribuida al constructor; no se presenta como ejecución propia. No se hicieron pruebas de carga prolongada ni inspección visual. Panel, confirmación, foco/teclado, Escape/Delete y desmontaje visible final pertenecen a011; ninguna vista cambió aquí. Se revisó la capacidad del adaptador para permitir ese flujo, sin acreditar una UI todavía inexistente.

Sin nuevos hallazgos bloqueantes UX en el alcance010. No se modificaron producto, Git, tablero ni informes ajenos. Informe publicado mediante temporal y renombrado atómico.
