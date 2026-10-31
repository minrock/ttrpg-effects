VEREDICTO: APROBADO

## Alcance y evidencia

Revisión UI independiente de010, ciclo2/ronda3, sobre base integrada `feef7120e0a3145ddd345eed714deef3542007d4`. Se leyeron el perfil UI, instrucciones AGENTS, solicitud/spec, retrabajo-ciclo-2, build final y coordinación; se contrastaron ronda-3/revision.md, huellas, fuentes reales y el informe UI propio de ronda2. No se consultaron informes ajenos para determinar este veredicto.

Comprobación propia: **638/638 huellas SHA256 coinciden**. Respecto a ronda2 solo cambian `src/server/moderation-http.ts`, `src/infrastructure/server/moderation/corrections.contract.ts` y `docs/moderation.md`; no hay altas ni bajas entre rondas. Respecto a la base integrada se conservan49 archivos de delta y cero bajas. Ningún TSX, CSS o HTML cambia. Clientes, contratos de presentación, TableSession y proyección pública conservan las huellas ya inspeccionadas en ronda2.

## Inspección de presencia, cierre y promoción

- En `moderation-http.ts:86`, el listener de cierre se instala antes de esperar la segunda autorización. El efecto autorizado vuelve a comprobar `transportClosed`, `destroyed` y `writableEnded` antes de obtener el runtime/registrar el stream. Una conexión cerrada durante esa espera no pasa a figurar como presencia conectada ni puede ocupar el puesto de principal después de desaparecer.
- El cierre libera registro y conexión, cancela intervalos/drenajes y retira el listener idempotentemente. La cola y el escritor verifican que el transporte continúe utilizable. El establecimiento también limpia ante excepciones y cierre síncrono de la cola inicial. Se conserva la respuestaHTTP de error previa a cabeceras, en vez de convertir un fallo de cuota en aparente éxito.
- `corrections.contract.ts:20` incorpora una barrera explícita: espera la segunda autorización, cierra el cliente, observa close del ServerResponse y solo entonces libera la autorización. Comprueba ausencia de registro, intervalos, runtime, participante conectado y cambios de presencia. Continúa con dos conexiones reales, verifica principal, cierra la primera, observa bootstrap de promoción, reemplaza la sobreviviente y exige una sola conexión. Una promoción adicional comprueba cancelación del temporizador. Se inspeccionó esta regresión en código; su ejecución multi-DB se atribuye al constructor, no a esta revisión.
- Se inspeccionó `table-session.ts` para comprobar el efecto consumible por UI: cierre retira la conexión, actualiza presencia, limpia reporte/readiness del principal promovido y emite bootstrap para confirmación. No añade una orden de cámara ni una tirada. El contrato de alias/discriminador, estados textuales, roster, callback terminal y distinción entre desconexión y revocación no cambia.
- `docs/moderation.md` describe la observación de cierre durante autorización, la ausencia de presencia/conexión/heartbeat tras cerrar y la limpieza idempotente. Mantiene explícita la entrega visual futura de011.

## Verificación propia

`pnpm test src/application/services/table-session.test.ts src/infrastructure/browser/contextual-table-client.test.ts`

Resultado: **2 archivos,6/6 pruebas,exit0**,duración1.23s. La regresión del cliente conserva aislamiento entre contextos, descarte de respuestas tardías, limpieza ante terminal/401/cambio de apertura, ausencia de retry tras reemplazo y recuperación de conflicto de mapa. No se presenta este comando como ejecución de la nueva carrera HTTP ni como prueba visual.

## Hallazgos y corrección esperada

No se identifican hallazgos UI bloqueantes ni correcciones requeridas en ronda3. La corrección observada evita comunicar presencia de un transporte que ya cerró y conserva la promoción del principal en conexiones válidas.

No hay componentes, controles ni estilos nuevos que permitan evaluar una apariencia distinta. No se hicieron capturas ni se ejecutó la aplicación: jerarquía, contraste en proyección, nombres largos, viewport estrecho, estados sin depender solo del color, superposiciones, foco y Escape siguen perteneciendo a la integración visual011. La aprobación de contratos010 no sustituye esa verificación ni afirma un panel ya implementado.

## Límites y disciplina de revisión

El gate010 de41/41 en SQLite/PostgreSQL y los builds son evidencia declarada en build.md; no se reejecutaron aquí. La nueva carrera se revisó en fuentes y la evidencia de transporte queda para las revisiones correspondientes. No se usó PostgreSQL exclusivo de Seguridad, el servicio original8787 ni datos personales.

011 debe probar el desmontaje visible al terminar acceso, mensajes, listado/confirmación de expulsión, estados de presencia y proyección tras promoción. Esta revisión no acredita esas pantallas futuras. No se modificó producto, Git, tablero ni informes ajenos; se publica únicamente este archivo mediante temporal y renombrado atómico.
