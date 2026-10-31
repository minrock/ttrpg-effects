VEREDICTO: APROBADO

# Revisión de seguridad — 011, ciclo 2 / ronda 3

Revisión independiente del 2026-10-31 en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Leídos el perfil seguridad, AGENTS.md, solicitud, especificación, build, coordinación, retrabajo del ciclo 2 y revisión congelada. Contrastados los archivos físicos, el diff efectivo y las huellas de rondas 2 y 3. Las **655 huellas coinciden**, al comienzo y antes de publicar este informe.

No se encontraron defectos de seguridad nuevos demostrables que bloqueen esta disciplina. Esta aprobación no sustituye la revisión UX de modalidad nativa, las otras disciplinas ni la decisión técnica global; tampoco declara integración o corte operativo.

## Alcance y resultado

El delta desde la ronda 2 comprende ocho archivos: CHANGELOG, guía de navegador, AccountAccess, GameEditor, Participants, dialogs, el nuevo hook use-active-operation y sus regresiones GameEditor.authority. Servidor, transportes, identidad, persistencia, main/preload y contratos conservan exactamente las huellas de ronda 2. Se inspeccionaron las fuentes reales del delta completo y su interacción con ServiceApp, HttpTransport y la autorización del servidor.

- `src/web/use-active-operation.ts:6`–`14` invalida la generación tanto al suspender como al desmontar. Recuperar la misma cuenta no vuelve a habilitar promesas iniciadas antes de la suspensión. No se utiliza solamente el valor actual de active para aceptar una respuesta antigua.
- `src/web/GameEditor.tsx:20`–`44` limpia la confirmación y el enlace al perder autoridad; comprueba la generación después de esperar el guard y después de respuestas de apertura/rotación/continuidad. Las consultas tardías para mostrar una confirmación no la reabren. La comprobación de sesión desencadenada por un terminal también descarta su resultado obsoleto. Los diálogos privados requieren active al renderizar.
- `src/web/GameEditor.tsx:49`–`71` desactiva el broker durante suspensión, congelación y revalidación; desmonta Participants y su diálogo, conserva el viewport/borrador y retira el diálogo de error de revalidación cuando la cuenta deja de estar activa. Recuperar exige de nuevo la comprobación de partida, configuración, recursos y heartbeat antes de habilitar el espacio.
- `src/web/Participants.tsx:8`–`16` protege la consulta que prepara la expulsión y el resultado de la mutación por generación. Un resultado que llega después del desmontaje no entrega una invitación al editor recuperado. Una nueva confirmación vuelve a consultar la apertura vigente; el POST conserva sus precondiciones y autorización servidor.
- `src/web/dialogs.tsx:11`–`12` cancela decisiones con null al desactivar el broker y rechaza aperturas mientras está desactivado. `:22` conserva el elemento dialog concreto para cerrarlo al desmontar y evita restaurar foco dentro de hidden/inert. DialogHost deja de renderizar cuando no está activo. `src/web/AccountAccess.tsx:14`–`15` dirige el foco a recuperación. Esto no expone un nuevo recurso privilegiado ni guarda contraseñas o borradores fuera de memoria.

La limpieza de interfaz complementa las defensas anteriores, no las sustituye. Se contrastaron `HttpTransport` (binding X-TTRPG-Account, invalidación/abort y generación antes y después de leer JSON), ServiceApp (descarte explícito antes de otra cuenta) y la comprobación del principal original en `src/server/moderation-backend.ts` / `src/infrastructure/server/identity/index.ts`. Permanecen intactos los cierres S1/S2 documentados en ronda 2; no se reabre la escritura cruzada ni la excepción amplia de 401 administrativo.

## Otros límites de confianza

Sin nuevas APIs IPC, acceso Node desde renderer, rutas de filesystem, consultas SQL ni formato portable. La ventana servicio conserva sandbox/contextIsolation, Node deshabilitado, ausencia de preload y partición efímera (`src/main/service-app.ts:15`–`22`). CSP del servicio permanece confinada al mismo origen (`src/server/static-files.ts:25`). El delta no introduce HTML sin sanear, ejecución dinámica, URLs externas, persistencia de secretos ni registros de credenciales. Los textos de diálogo siguen siendo interpolaciones React.

## Verificación propia

`pnpm test src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/ServiceApp.test.tsx src/infrastructure/browser/owned-client.test.ts src/infrastructure/browser/browser-client.test.ts --maxWorkers=2`: **5 archivos, 54/54 pruebas PASS, 2,05 s**.

Las regresiones comprueban suspensión con Cerrar/Reabrir/Crear enlace/Expulsar abiertos; ausencia de POST por la decisión cancelada; conservación de la misma instancia y contenido del borrador; consulta tardía que no reabre confirmación; guard anidado cancelado; guard tardío que no envía reapertura; revalidación 503/409 suspendida; y respuestas tardías de expulsión/rotación que no reponen enlaces. Las suites complementarias ejercitan recuperación por ID, cambio entre cuentas, 401 administrativo y transporte ligado al principal.

`git diff --check`: PASS. Verificación SHA-256 final: **655 entradas, cero discrepancias**.

## Límites y coordinación

Las pruebas DOM usan mocks de showModal/close y adaptadores para aislar el ciclo de vida: acreditan cancelación y actualización de estado, no modalidad nativa ni controles de foco de Electron. No se realizó CUA propio. La observación IAB previa pertenece al orquestador; la comprobación Electron de UX se evalúa por su informe independiente, sin atribuirla a esta revisión.

No se repitieron PostgreSQL, SQLite, restauración ni gates generales porque el backend conserva sus huellas y no apareció una causa nueva. La evidencia de ambos motores permanece atribuida a construcción y seguridad de ronda 2; no se presenta como una ejecución de ronda 3.

No se usaron ni modificaron API8891, cuentas compartidas, API8787, provisión o datos personales. No quedan procesos ni fixtures propios. No hubo cambios de producto, Git, tablero ni informes ajenos. Única publicación: este informe mediante temporal y renombrado atómico.
