APROBAR

Decisión técnica de 010 — Expulsión inmediata y mesas independientes por partida. Ciclo 2, ronda global 3, 2026-10-31. Versión 3.12.0.

Se satisfacen los criterios de aceptación de 010 y no quedan hallazgos que requieran corrección dentro de su alcance. Seguridad, UX, UI y Código finalizaron con `VEREDICTO: APROBADO`. Esta decisión contrasta sus informes con solicitud, spec, build, retrabajo, coordinación, identidad de revisión y fuentes reales; no sustituye ninguna revisión faltante.

## Estado aprobado y verificaciones propias

Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Base de revisión registrada: main `feef7120e0a3145ddd345eed714deef3542007d4`; rama acumulativa `feature/factory-006-persistencia-multidb`, HEAD registrado `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. No se realizó ninguna operación Git durante esta aprobación.

Comprobé directamente **638/638 SHA256** de ronda-3/huellas.json, sin diferencias, y repetí la comprobación inmediatamente antes de publicar esta decisión. Frente a ronda2 solo cambian `src/server/moderation-http.ts`, `src/infrastructure/server/moderation/corrections.contract.ts` y `docs/moderation.md`; 635 archivos permanecen intactos, sin altas ni bajas. Frente a base-archivos.json: 29 modificados, 20 nuevos y cero bajas. Package/changelog conservan 3.12.0; no hay incremento adicional ni cambios de vistas, dependencias, IPC o formato de escena en la corrección.

Build final SHA256: `8ab91e21526135bf117ef37cb863f0fb8353348fa316d6b5df8d29b1a5ca349a`, coincidente con coordinación. Informes finales consumidos:

- `ronda-3/revision-seguridad.md`: `16465105a0d9710e5ccb6063c1c4047f33441117dddbc4478f8aed10d5d05a94`.
- `ronda-3/revision-ux.md`: `f490683efb659c9f8e3a217f66168f8958fa3effcf10747d457aae8d51f634c3`.
- `ronda-3/revision-ui.md`: `1f82d7e2a3258b2c05bdf44d9c9e115d36db6d170ef1973d54d80ff3da2c8f04`.
- `ronda-3/revision-codigo.md`: `b1476243149368aa774fa28a57b11085bd4f795b7d0a38ffc0155710fe353f8d`.

Inspección directa del cierre SSE: se observa `close` antes de esperar la segunda autorización; el efecto final comprueba otra vez el transporte antes de crear runtime/registro. La limpieza cancela registro, conexión y temporizadores idempotentemente, conserva los errores HTTP previos a cabeceras y cubre el cierre síncrono durante connect. La regresión mantenida usa barrera y cierre observado, comprueba ausencia de presencia/runtime/timers y luego principal, promoción y reemplazo con conexiones reales. Contrasté también la unidad transaccional de kick, invalidación de lectores/streams/transferencias por contexto, registro independiente, exclusión de runtime y adaptador contextual.

## Aceptación y evidencia

| Criterio | Conclusión y respaldo |
| --- | --- |
| A1 | Roster/autoridad por propietario, IDs estables, estados y presencia contextual comprobados; la corrección evita presencia fantasma. Contratos moderation/transport/corrections y cuatro revisiones coincidentes. |
| A2 | Revocación, rotación, auditoría e idempotencia dentro de la unidad compartida; rollback, reintento concurrente, ya revocado, conflicto de contenido y replay tras reinicio. Moderation y humo compilado. |
| A3 | Supervivientes conservan acceso y estado; principal se promueve dentro de su partida. Races y nueva regresión de cierre/promoción/reemplazo. |
| A4 | Revalidación después de esperas y antes de entregas; cierre del objetivo antes del ACK, cancelación de cuerpos y backpressure, rechazo de cookie copiada/HEAD/Range/resolve. Races/transport/corrections y probes independientes. |
| A5 | Carreras de join/kick, kicks iguales/distintos y lifecycle respetan la unidad transaccional; contexto antiguo no muta la nueva apertura. Contratos010 y regresiones007–009 conservadas con atribución histórica. |
| A6 | A1/A2/B1 separan cámaras, dados, publicación, assets, deduplicación y roster; centinelas privados ausentes del transporte público. Moderation/races/transport. |
| A7 | Lease, credencial absoluta, cierre/reapertura/disable/restore conservan la autoridad009; reinicio produce runtime vacío y epoch nuevo sin nueva gracia. Contratos010, humo compilado y gates009 históricos. |
| A8 | Exclusión de procesos y pérdida del canal PG fallan cerrado; cuotas y reserva DM, cancelación y limpieza verificadas. Exclusion/transport/corrections, incluidos dos motores reales. |
| A9 | Instancia contextual limpia y detiene retry al terminar acceso; descarta respuestas tardías y apertura antigua, distingue conflictos recuperables y reemplazo. Tests del adaptador y HTTP real. |
| A10 | SQLite físico/PostgreSQL real, sistema/hash exactos, migración y backend compilado, checks/builds satisfactorios; Electron y escena compatibles. Sin atribuir UI011 ni despliegue a esta evidencia. |

Leí los logs locales del constructor: ciclo2 `typecheck` y `lint` terminados, suite general **131 archivos/1213 pruebas**, build Electron y build API, y gate010 completo **6 archivos/41 pruebas**, todos satisfactorios. Verifiqué los logs históricos de gates DB32, identidad25, propiedad46 e invitaciones36, y build:web de la corrección de ronda2. Se conservan como evidencia de componentes intactos, sin presentarlos como ejecuciones nuevas. Los fallos iniciales de suite bajo compilaciones simultáneas están declarados en build y fueron seguidos por una ejecución completa sin contención; no se contabilizan como aprobados.

Verifiqué también los logs propios de Seguridad ronda3: **16/16** regresiones dirigidas de ambos motores y **2/2** del probe independiente de reconexión cancelada; la auditoría posterior registra cero bases, conexiones y locks de fixtures. Código aporta regresiones SQLite/probe independiente y typecheck; UX y UI aportan las comprobaciones dirigidas descritas en sus informes. No sumo esas ejecuciones como nuevos casos del gate ni las atribuyo al aprobador. No repetí suites/builds intactos: mi verificación fue de fuentes, aceptación, logs, integridad y consistencia de las cuatro revisiones.

## Hallazgos cerrados y riesgos residuales

Los tres hallazgos de ronda1 — cuotas/cancelación HTTP, bootstrap concurrente y apertura antigua — permanecen corregidos. El P2 de Código de ronda2 queda cerrado mediante código y evidencia positiva independiente en ronda3. Los informes anteriores se conservan como historia, no como veredictos vigentes. No hay decisión de producto pendiente ni excepción técnica necesaria para aprobar010.

El log de lint del ciclo2 contiene un warning de directiva eslint-disable innecesaria en moderation-http.ts, con cero errores y salida satisfactoria; es un aviso cosmético, no un hallazgo funcional ni una condición pendiente de esta aprobación. Se conservan los avisos ya documentados de jsdom/canvas, chunks y futura deprecación pg9. No se ocultaron ni se afirmó ausencia de warnings.

Los límites del contrato continúan: un proceso API por base; estado visual efímero; restore requiere invalidación previa; no se recuperan bytes ya entregados ni se promete expulsión permanente de una persona con un enlace posterior. No hay prueba prolongada de carga. Panel, confirmación, montaje/desmontaje visible, accesibilidad y humo visual final pertenecen a011; este expediente aprueba backend, protocolo y adaptador010.

## Siguiente acción

El orquestador puede marcar010 aprobado técnicamente, continuar011 y coordinar la integración local según `integracion-solicitud.md`. La autorización de commits/merge locales procede de la petición expresa del usuario allí registrada, no de este APROBAR. Deben verificarse otra vez base y huellas antes de transferir el delta aprobado; el DMG corresponde al integrador después de merge. Esta decisión no ejecuta integración, push, despliegue ni cambios en el servicio habitual.

Única salida del aprobador: decision.md, publicada mediante temporal y renombrado atómico. Sin edición de producto, tablero, otros informes o Git; sin delegación. Aprobación terminada.
