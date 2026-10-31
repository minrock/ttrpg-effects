VEREDICTO: CAMBIOS

# Revisión UX — 011, ciclo 1, ronda 1

Revisión independiente sobre 3.13.0, el 2026-10-31, en el checkout canónico de autenticación. Se leyeron el perfil UX, AGENTS, solicitud, especificación, construcción, coordinación y diff de ronda. Las 651 entradas de huellas.json coinciden con los archivos físicos. No se modificó implementación, Git ni tablero.

## Hallazgos que impiden aprobar

### UX-1 · P1 · Abrir una invitación desde la recuperación de sesión elimina el borrador sin confirmarlo

Evidencia propia reproducida mediante CUA en IAB contra SQLite sintético 8891:

1. Acceder como DM Aurora, abrir Campaña Aurora e iniciar explícitamente tras caducidad.
2. Cargar «Mapa de prueba Aurora» y cambiar el nombre de su mapa a «Borrador UX sin guardar», sin guardar.
3. Cerrar la sesión desde una segunda pestaña propia. La primera oculta el editor y muestra «Recuperar sesión» / «El borrador está protegido en memoria para su cuenta original».
4. Expandir «Entrar con invitación de jugador», pegar la URL de /jugar de esa partida del mismo origen, sin fragmento, y pulsar «Abrir invitación».
5. La pantalla pasa directamente al formulario del jugador: no aparece Guardar/Descartar/Cancelar ni confirmación de abandonar el borrador.
6. Volver con Atrás sigue mostrando la promesa de borrador protegido. Reautenticar al mismo DM termina en «Cargando partida…» y «La sesión expiró. Vuelve a acceder para guardar», sin el editor previo.

La fuente explica la pérdida: src/web/ServiceApp.tsx:33 cambia path mediante onInvitation sin invocar el guard; el retorno temprano de la línea 29 desmonta GameEditor y su estado. Al volver se monta otra instancia mientras el transporte permanece bloqueado, y su carga inicial (GameEditor.tsx:22) no depende de active para repetir tras autenticar. Un enlace incluso incompleto basta para perder trabajo; la promesa posterior de retención deja de ser cierta. Incumple A9 y la preservación explícita bajo 401.

Corrección esperada: toda salida desde una sesión con borrador retenido debe mantener la instancia y pasar por una resolución segura. Si no puede guardarse sin autenticar, ofrecer recuperar la cuenta, cancelar o descartar explícitamente antes de navegar. Validar el enlace antes de comprometer esa transición. Volver y reautenticar al mismo ID debe recuperar el mismo borrador o reflejar un descarte previamente consentido, nunca una carga bloqueada. Añadir regresión de la secuencia real, con y sin fragmento, incluyendo Atrás.

### UX-2 · P2 · Un fallo transitorio al revalidar deja «Descartar borrador y recargar» como única salida

Evidencia de inspección independiente de fuente, no reproducción de red inducida: src/web/GameEditor.tsx:39 captura cualquier error de lectura de partida/configuración, browser.revalidate o heartbeat y lo convierte en resumeError. En la línea 41 todo resumeError abre «Borrador retenido en conflicto» con onCancel vacío y un único botón que hace location.reload(). No existe reintento de esa revalidación ni dependencia de recuperación de red; los contactos periódicos actualizan feedback pero no limpian resumeError. NETWORK, 429 o 503 siguen el mismo camino que un conflicto durable.

Impacto: al recuperar la sesión de un DM con cambios en memoria, una interrupción breve durante la revalidación lo obliga a descartar para continuar, incluso cuando el servicio ya volvió y su escena no cambió. Escape tampoco permite resolver el problema. Contradice la recuperación sin pérdida de A9; el texto «conflicto» afirma una causa no demostrada.

Corrección esperada: diferenciar incertidumbre/transporte de conflicto de revisión o pérdida de autoridad. Ofrecer reintento explícito que respete Retry-After, conserve la instancia y vuelva a comprobar el contexto. Mantener un descarte explícito como alternativa, sin que sea la única recuperación de un error temporal. Probar un fallo de revalidación después del login y su posterior éxito conservando el borrador.

## Comprobaciones propias satisfactorias

- pnpm exec vitest run src/web/ServiceApp.test.tsx --maxWorkers=1: 7/7 PASS, un archivo, 969 ms. Es prueba de componentes, no prueba visual; el editor de esos casos está simulado y no cubre los recorridos anteriores.
- CUA/IAB: acceso inválido muestra error genérico, acceso correcto dirige al catálogo DM, sistema/versión se distinguen y una apertura caducada exige «Iniciar partida». Escena persistida carga en el viewport común.
- CUA/IAB: el guard al pulsar Partidas con el mapa modificado ofrece Cancelar/Descartar/Guardar y continuar; Cancelar es el foco inicial, Shift+Tab llega a Guardar y continuar, Escape conserva el nombre modificado y devuelve el foco al botón Partidas invocador.
- CUA/IAB: logout desde otra pestaña oculta correctamente el canvas antes de la recuperación. La transición problemática se reproduce desde ese estado real, sin alterar React, DOM ni red por scripts.
- CUA/Electron local con el harness aislado existente: arranque 3.13.0, biblioteca local accesible con el monstruo sintético guardado, carga del PNG propio del proyecto mediante selector nativo y apertura de Player con sus controles. Escape cierra el menú de escena; el proceso propio se cerró con Cmd+Q. La captura inspeccionada del editor local fue de 1920×1080; no certifica el mínimo 820×520 ni un proyector físico.
- Lectura de AccountAccess, AdminAccounts, AdminSystems, GameCatalog, GameEditor, GuestEntry, Participants, diálogos y transporte: roles sin selector manual, separación de invitado, objetivo de expulsión capturado por ID y discriminador, cancelación inicial de acciones destructivas, invitación explícita y estados de carga/error textuales. Estas comprobaciones de fuente no equivalen a recorrer todas las acciones.

## Alcance, atribución y límites

El humo de tres jugadores/expulsión/sobrevivientes, cambios de contraseña, Electron servicio, 200% y matriz completa de tamaños registrado en build/coordinación pertenece al orquestador/constructor; no se presenta como ejecución propia. No se repitieron PostgreSQL, respaldo/restauración ni gates intensivos porque el entorno estaba asignado a seguridad. Tampoco se hizo CUA de cambio de contraseña, permisos, borrado permanente ni provisión personal. Los hallazgos anteriores son suficientes para requerir corrección aunque los casos ya ejecutados del build sean satisfactorios.

La API 8891 estuvo inicialmente rechazada también por curl; se informó al orquestador y se continuó después de su restauración coordinada. No se reinició ni detuvo API/PG desde este rol. No se usó 8787 ni provisión personal. No se guardó la edición del mapa ni se cambió una contraseña. Pestañas propias de pruebas funcionales 2 y 3 cerradas; Electron propio terminó (exit 0). La pestaña fallida inicial 1 quedó inaccesible al adaptador por la política de URL data: de su página de error; se informó al orquestador para limpieza. No se tocó la pestaña 4 del dashboard. No se persistieron capturas ni secretos.
