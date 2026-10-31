VEREDICTO: APROBADO

# Revisión independiente de código — 011, ciclo 2, ronda 4

Fecha: 2026-10-31. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; base efectiva main `73b8e6de21af74912d23399f1b99f3c1112ade91`, rama acumulativa `feature/factory-006-persistencia-multidb`. Revisión independiente del código congelado, sin consultar informes de otros revisores de esta ronda ni modificar producto/Git.

## Alcance y congelación

Leídos perfil de código, AGENTS, manifiesto, solicitud/spec, build/coordinación, retrabajo del ciclo 2, identidad/huellas de ronda 4 e informe propio de ronda 3. Inspeccionadas las cuatro rutas del delta: `src/web/GameEditor.tsx`, `src/web/GameEditor.authority.test.tsx`, `docs/browser-client.md` y `CHANGELOG.md`, junto a los consumidores pertinentes de autoridad, transporte y ciclo de vida.

**655/655 huellas coinciden**, sin discrepancias después de las pruebas. El agregado de las 69 rutas del trabajo es `2fd869408ca0d697252bbb6935487192946533b665d1b3de07ceb6222f0dfed0`, coincidente con build.md. Se conserva versión3.13.0, TypeScript strict, dependencias y formato `.ttrpgscene`v2/lectura v1. No cambian backend, persistencia, reglas de mapa/medición ni Electron local. No procede repetir contratos de motores intactos.

## Cierre del hallazgo C4

**C4 — cerrado.** `GameEditor.tsx` separa la vigencia de cuenta (`captureAuthority`) de la operación visual y del contexto de apertura (`id:generation`). Antes del POST de cierre/reapertura confirmado registra la apertura que se está retirando. Un terminal de ese contexto sigue comprobando identidad, pero su efecto visual se conserva pendiente mientras se conoce el resultado.

El cierre ahora espera el GET actual antes de desmontar el editor, limpia el contexto anterior y aplica el estado devuelto. La reapertura compara tanto ID como generación de la respuesta y del GET; al aceptar la nueva apertura cambia el contexto antes de permitir resultados anteriores. La consulta de sesión iniciada por un terminal viejo vuelve a comprobar contexto al terminar, tanto en éxito como en error. Un callback de la apertura vieja recibido después de la transición no inicia otra consulta.

Repetí **el interleaving exacto de mi reproducción de ronda 3** sobre las fuentes actuales: iniciar editor, confirmar cierre, emitir terminal con sesión pendiente, resolver POST, resolver sesión y finalmente entregar apertura cerrada. El arnés transpila en memoria GameEditor, useActiveOperation, diálogos y foco reales, montados con React/jsdom; transporte, mesa y dependencias periféricas controlados. Resultado propio: sin alerta terminal, sin «Conectado», sin «Continuar partida» obsoleto; **«Iniciar partida» visible y habilitado, cero diálogos**. El proceso terminó con código0 y no escribió archivos de producto.

Las regresiones nuevas ejercitan también la acción siguiente real del componente: tras cerrar envían inicio; tras reabrir mantienen el editor de la nueva generación operativo. Un terminal de esa nueva generación sigue mostrando el estado de borrador conservado, de modo que la corrección no consiste en ignorar todos los terminales.

## Autoridad, errores y regresiones

- La suspensión invalida ambas capturas y elimina el retiro pendiente. Reautenticar la misma cuenta no reactiva una respuesta anterior. El control original de generación y cuenta no fue relajado.
- Un cierre incierto con503 y terminal recibido conserva el mismo borrador congelado, sin afirmar cierre completado ni reanudar autoridad automáticamente.
- Un401 durante el cierre conserva la invalidación de HttpTransport y la recuperación de sesión; una respuesta del POST posterior a la suspensión no restaura estado.
- Un503 de la consulta de sesión de una apertura ya reemplazada no congela la nueva. Un401 tardío de esa misma consulta sigue invalidando la autoridad a través del transporte compartido: descartar el callback de contexto no descarta la semántica de autenticación.
- Las defensas de modal/foco de ronda3 permanecen: cancelación del broker al suspender, cierre del diálogo en layout, conservación del nodo y contenido y nueva decisión después de recuperar. Invitación, historial, recuperación y401 administrativos anteriores se vuelven a comprobar en la selección focal.

Las referencias nuevas pertenecen a la instancia React y al contexto inmutable de apertura; no introducen singleton, acceso privilegiado ni almacenamiento. La limpieza previa de streams, temporizadores, recursos y broker se conserva. Docs/changelog describen el comportamiento final y mantienen la versión del mismo trabajo.

## Verificaciones propias

1. `pnpm exec vitest run src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/ServiceApp.test.tsx --maxWorkers=2`: **3 archivos, 38 pruebas PASS**,2.08s. Incluye las diez regresiones nuevas de esta ronda, las14 de suspensión y los casos anteriores de recuperación/navegación.
2. Reproducción independiente en memoria del orden que causaba C4: corregido, con resultado descrito arriba. No constituye CUA ni tráfico SSE real.
3. Huellas completas y agregado de las69 rutas: coinciden después de ejecutar las comprobaciones.

## Evidencia declarada y límites

Build.md declara typecheck/lint,134 archivos/1250pruebas y builds desktop/API/web finales. Es evidencia del constructor, conservada con atribución; no repetí los gates generales. Coordinación registra CUA/IAB del orquestador enQA8891: cierre, nuevo inicio, reapertura y segundo cierre con estado/acciones operables. Ese recorrido complementa los órdenes deterministas; no se presenta como observación propia de este revisor.

Esta revisión no realizó CUA ni certifica apariencia o modalidad nativa por jsdom. Las revisiones visuales independientes y la decisión técnica siguen siendo etapas distintas. La aprobación de código no equivale a integración, despliegue personal ni DMG.

**No quedan hallazgos de código que requieran cambios en el alcance revisado.** Los cierres C1–C3 y las comprobaciones de principal esperado de rondas anteriores se conservan; C4 queda cerrado por inspección y evidencia propia.

PostgreSQL no se utilizó y queda libre. Todos los procesos propios de prueba terminaron; no quedan recursos de revisión pendientes. No se tocaron API8891/8787, datos/provisión personal, producto, Git, tablero ni informes ajenos. Única publicación: este informe mediante temporal y renombrado atómico.
