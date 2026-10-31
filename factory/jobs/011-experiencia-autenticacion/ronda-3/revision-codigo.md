VEREDICTO: CAMBIOS

# Revisión independiente de código — 011, ciclo 2, ronda 3

Fecha: 2026-10-31. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; base efectiva main `73b8e6de21af74912d23399f1b99f3c1112ade91`, rama acumulativa `feature/factory-006-persistencia-multidb`. Revisión del código congelado, sin modificaciones de producto ni escrituras Git.

## Alcance y congelación

Leídos AGENTS, perfil de código, package.json, solicitud/spec, build/coordinación, retrabajo del ciclo 2, revisión/huellas de ronda 3 e informe propio de ronda 2. Inspeccionadas las ocho rutas cambiadas desde ronda 2: `GameEditor.tsx`, `GameEditor.authority.test.tsx`, `Participants.tsx`, `dialogs.tsx`, `use-active-operation.ts`, `AccountAccess.tsx`, `docs/browser-client.md` y `CHANGELOG.md`, además de los consumidores pertinentes.

Verificación propia posterior a las pruebas: **655/655 huellas coinciden**, sin discrepancias; delta exactamente de ocho rutas. Se conserva 3.13.0, sin nuevas dependencias, cambios de backend, migraciones ni formato de escena. Las garantías de principal esperado y los cierres C1–C3 revisados en ronda 2 siguen intactos; no se repitieron contratos PostgreSQL ya comprobados porque el delta no los modifica.

## Hallazgo que requiere corrección

### C4 — P2: el terminal de un cierre confirmado invalida su propia actualización y deja una apertura obsoleta

**Fuentes:** `src/web/GameEditor.tsx:37`, en relación con `:20`, `:29–31`, `:43` y `:45`; `src/web/use-active-operation.ts:7–10`.

El aviso terminal de la mesa puede llegar como consecuencia del mismo cierre que el usuario acaba de confirmar. `terminalReceived` consulta la sesión y conserva una operación válida del editor. Cuando el POST de cierre termina, `apply` pone `running=false` y solicita la apertura actual. Desmontar `LiveEditor` no invalida la consulta de sesión ya iniciada en su padre. Si esta termina antes del GET de apertura, fija `terminal=access-ended`; el cambio a `active && !terminal === false` invalida la operación de cierre. La respuesta correcta del GET queda descartada por `if(current())`, conservándose el estado anterior `fresh`.

**Reproducción propia determinista, sin servidor ni cambios de archivos:** se transpilaron en memoria las fuentes reales de `GameEditor`, `useActiveOperation`, `ServiceDialog`/broker y foco; se montaron con React y jsdom. Se controlaron respuestas HTTP, callback de mesa y dependencias periféricas. Secuencia:

1. Continuar una apertura fresca, abrir «Cerrar partida» y confirmar con guard aceptado.
2. Emitir `access-ended` mientras el editor sigue montado y mantener pendiente `/identity/session`.
3. Resolver satisfactoriamente el POST de cierre; `running=false` y el GET de apertura queda pendiente.
4. Resolver la consulta de sesión con la misma cuenta válida.
5. Resolver el GET con la apertura cerrada.
6. Pulsar «Continuar partida».

Resultado observado: **«Tu acceso a esta partida ya no está disponible» + «Estado del anfitrión: Conectado» + «Continuar partida»**. La respuesta de apertura cerrada se había entregado. La pulsación de Continuar produce **cero peticiones**: su captura de operación ya está inactiva. El estado queda bloqueado en esa pantalla hasta salir/reentrar o recargar. No se acredita pérdida de datos ni acceso cruzado; la severidad P2 corresponde a una regresión funcional recuperable mediante navegación, pero bloquea la aceptación de cierre/continuidad.

El orquestador comunicó una observación visual similar durante la revisión; este hallazgo se sustenta en inspección y reproducción propias, sin leer el informe de otro revisor ni atribuirme CUA.

**Corrección requerida:** reconciliar el resultado del cierre/reapertura con los terminales de la apertura que se está retirando. El terminal anterior no debe cancelar la actualización autorizada ni afectar la nueva apertura. Distinguir la pérdida real de autoridad de la finalización causada por la propia operación, mantener el control de generación/cuenta para respuestas antiguas y terminar con estado consultado actual y una acción operable. No basta con ocultar el mensaje o habilitar el botón sobre `opening` obsoleto.

Añadir regresión determinista que cruce terminal y respuesta del POST/GET en ambos órdenes, incluyendo la consulta de sesión iniciada antes de desmontar `LiveEditor` y resuelta después. Comprobar apertura cerrada y siguiente acción válida; cubrir también la reapertura para que un terminal de la generación anterior no congele la nueva. Mantener las pruebas actuales de suspensión/reauth, y confirmar el recorrido real de cierre tras la corrección.

## Aspectos comprobados de la corrección de suspensión

La eliminación del diálogo privado depende ahora de `active`, `frozen`, validación y conflicto. `ServiceDialog` cierra el diálogo en la limpieza de layout; el foco no se devuelve a un ancestro oculto/inert. `AccountAccess` enfoca el correo al montar la recuperación retenida. `DialogBroker.setActive(false)` resuelve la decisión pendiente con cancelación y rechaza nuevas decisiones mientras está suspendido.

`useActiveOperation` conserva una generación a través de suspensión y reanudación: recuperar la misma cuenta no vuelve válidos los callbacks anteriores. Los handlers de cierre/reapertura/rotación y selección/expulsión comprueban vigencia tras los awaits pertinentes. Participants se desmonta al suspender y sus respuestas tardías no devuelven una invitación. La revalidación limpia el error anterior y empieza otra comprobación; el borrador permanece montado. Estas defensas son pertinentes, pero su aplicación al terminal de cierre produce C4.

La documentación y changelog describen la recuperación de sesión sin introducir otra versión para el mismo trabajo. Se mantienen las fronteras entre componentes, adaptadores de navegador, contratos y dominio. No se añadieron APIs Electron, acceso privilegiado del renderer ni persistencia privada nueva.

## Verificaciones propias y evidencia declarada

- `pnpm exec vitest run src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/ServiceApp.test.tsx --maxWorkers=2`: **3 archivos, 28 pruebas PASS**, 1.73 s. Incluye 14 regresiones nuevas de diálogos, decisiones/respuestas tardías y conservación del nodo/contenido; además, recuperación, invitación, historial y 401 anteriores.
- Reproducción adicional en memoria descrita en C4: resultado concluyente; proceso finalizado con código 0. No se modificaron tests ni producto. Los transportes/mesa del experimento son controlados, por lo que acredita la carrera del componente, no una prueba de SSE o base de datos reales.
- Verificación final de las 655 huellas: todas coinciden.

Build.md declara typecheck/lint, 134 archivos/1240 pruebas y builds desktop/API/web. Se atribuyen al constructor y no se repitieron completos. Coordinación declara un recorrido IAB de revocación con modal abierto, recuperación y conservación del borrador; es evidencia del orquestador. Esta revisión no realizó CUA ni certifica modalidad nativa de Electron, apariencia o teclado nativo a partir de jsdom. Las 28 pruebas propias pasan porque no ejercitan el interleaving de C4; no anulan el hallazgo.

## Cierre

Se requieren cambios por **C4** antes de aceptar esta ronda. La solución de suspensión se verifica con las limitaciones anteriores; el cierre confirmado todavía puede dejar controles inoperantes y estado obsoleto.

No se usó PostgreSQL en esta ronda: queda libre. No se tocaron servicios QA8891/8787, provisión personal, producto, Git, tablero ni informes ajenos. Única publicación: este informe mediante temporal y renombrado atómico.
