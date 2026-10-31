VEREDICTO: CAMBIOS

# UX — 011, ciclo 1, ronda 2

Revisión independiente el 2026-10-31 sobre 3.13.0 y las fuentes congeladas de ronda 2. Se contrastaron perfil UX, AGENTS, solicitud/spec, build, coordinación, revisión/diff de ronda y el informe UX de ronda 1. Las 653 huellas coinciden. Sin cambios de producto, Git, tablero ni informes ajenos.

## UX-3 · P1 · La revocación con un modal de partida abierto deja inaccesible la recuperación

Reproducción propia CUA en Electron servicio, perfil aislado `.local/qa-011/electron-profile`, contra SQLite sintético8891:

1. Acceder como DM Aurora, abrir/iniciar Campaña Aurora, cargar «Mapa de prueba Aurora» y modificar el nombre del mapa sin guardar.
2. Abrir «Cerrar partida», dejando Cancelar enfocado. No confirmar el cierre.
3. Revocar las sesiones de Aurora mediante la API administrativa del fixture. Se autentica exclusivamente la cuenta sintética; la sesión administrativa de prueba se cierra al terminar la petición.
4. Al recibir la pérdida de autoridad, desaparecen visualmente el editor y el modal. La captura muestra «Recuperar sesión» y sus campos con la promesa de borrador protegido.
5. Sin embargo, el árbol de accesibilidad queda reducido al contenido web sin campos ni botones. Clic sobre el correo y Tab no permiten enfocar nada; Escape tampoco restablece el formulario.
6. El menú nativo Reintentar conexión no recuperó una interfaz operable en la observación. Cmd+Q sí abrió la advertencia nativa de cambios; se cerró únicamente el proceso propio mediante «Descartar y salir» para repetir desde cero.

Impacto: el DM ve un formulario de recuperación que no puede utilizar. Aunque el borrador sigue en memoria, no hay recuperación operable observada; terminar la instancia conlleva descartarlo. Incumple A9, foco/teclado y el requisito de suspender todos los modales durante un401. No se observó exposición visual de datos privados en la captura; el hallazgo es un bloqueo de interacción.

Causa contrastada en fuentes: `src/web/GameEditor.tsx:19` solo limpia el enlace al perder active; el modal confirmation de la línea28 sigue montado sin condición active. `src/web/ServiceApp.tsx:42` oculta/inertiza su ancestro para retener el borrador. `src/web/dialogs.tsx:20` llama showModal al montar y close únicamente al desmontar. Así, el diálogo permanece modal aunque su ancestro quede oculto, y la recuperación situada fuera de él permanece bloqueada. La observación CUA confirma el efecto; no se deduce únicamente de mocks DOM.

Corrección esperada: retirar/cerrar de la capa modal todos los diálogos privados al perder autoridad sin desmontar el borrador. Cancelar decisiones pendientes y evitar que respuestas tardías vuelvan a abrirlos; colocar el foco en recuperación. Tras reautenticar al mismo ID deben conservarse los cambios, pero las acciones sensibles requieren una nueva decisión con contexto vigente. Cubrir Cerrar/Reabrir/renovar invitación, confirmación de expulsión y diálogo de revalidación; repetir al menos el caso real descrito en Electron/navegador. No basta con ocultar un ancestro de un dialog abierto.

## Cierre de los hallazgos anteriores

**UX-1 — cerrado en el recorrido corregido.** Se repitió desde un proceso limpio, sin modal previo: cargar escena, editar a «Borrador UX conservar ronda 2», revocar sesiones por API y pegar la ruta /jugar de esa misma partida sin fragmento. Ahora aparece «Conservar el borrador», Cancelar y recuperar sesión recibe foco inicial, Shift+Tab circula a Descartar y continuar, Escape cancela y devuelve el foco a Abrir invitación. La ruta sigue en el editor. Reautenticar al mismo DM recuperó el mapa con ese nombre exacto sin guardarlo. La recuperación real no quedó en Cargando partida. El caso con URL de otro origen, descarte consentido y vuelta posterior se contrastó adicionalmente mediante fuente y test, no se atribuye a CUA propio.

**UX-2 — cerrado por fuente y prueba selectiva.** LiveEditor distingue error temporal de conflicto durable; muestra Reintentar comprobación, conserva la instancia y demora el reintento conforme Retry-After. Se ejecutó `pnpm exec vitest run src/web/ServiceApp.test.tsx src/web/GameEditor.test.tsx --maxWorkers=1`: **14/14 PASS**, dos archivos,2.46s. Los casos503/429 revalidan sin desmontar el nodo del borrador, conservan su valor y prueban bloqueo durante12s de Retry-After. No se indujo caída de red mediante CUA ni se interrumpió el servicio compartido.

**Historial corregido:** se leyó use-service-navigation.ts y se ejecutaron los casos de Atrás/Adelante, cancelación y doble Atrás durante una decisión pendiente incluidos en los14tests. Verifican posición, longitud y conservación del nodo. La observación CUA de historial consignada en build/coordinación sigue atribuida al orquestador; no es ejecución propia de esta ronda.

## Verificación, límites y limpieza

- CUA propio de esta ronda: Electron servicio real3.13.0, login/catálogo, iniciar/continuar, carga del mapa, edición, guard normal Escape/foco, revocación con/sin modal, invitación/cancelación y recuperación del mismo DM, cierre nativo con advertencia. Captura del formulario bloqueado inspeccionada directamente a1440×900; no guardada en disco.
- Los recorridos generales de ronda1 se conservan con su atribución; no se repitieron todas las funciones de mesa, expulsión o Electron local. Matriz200%/nombres largos se asignó a UI. No se certifica proyector físico ni cambios de contraseña por CUA.
- IAB no estaba disponible para este subagente en ronda2; inventario ofrecía solo Chrome, reservado a UI. Se usó Electron aislado conforme coordinación, sin abrir pestañas ni tocar dashboard.
- PostgreSQL/backup/restauración y suites intensivas no se ejecutaron. No se reinició API8891, PostgreSQL ni servicio8787. No se leyó provisión personal, no se guardaron cambios de escena, no se publicaron invitaciones ni se cambiaron contraseñas.
- Dos procesos Electron propios cerrados normalmente mediante advertencia nativa y descarte del borrador sintético; sesiones de comando92863 y95429 confirmadas exit0. Las dos sesiones administrativas API propias se cerraron tras revocar; la prueba de autenticación API fue una cuenta de fixture sin salida de cookies. No se persistieron capturas ni secretos.

Los arreglos de ronda1 tienen evidencia satisfactoria dentro de los límites indicados. UX-3 impide aprobar la recuperación completa con los modales reales del producto.
