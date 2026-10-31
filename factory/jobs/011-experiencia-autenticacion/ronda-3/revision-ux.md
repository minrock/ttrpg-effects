VEREDICTO: APROBADO

# UX — 011, ciclo 2, ronda 3

Revisión independiente del 2026-10-31 sobre 3.13.0. Leídos perfil UX, AGENTS, solicitud/spec, build, coordinación, retrabajo del ciclo2, revisión/huellas de ronda3 y mi informe de ronda2. Inspeccionadas las fuentes finales de AccountAccess, GameEditor, Participants, dialogs y use-active-operation, además de las regresiones pertinentes. Las 655 huellas congeladas coinciden, comprobadas otra vez al finalizar. No se encontraron nuevos bloqueos UX en el alcance corregido.

## UX-3 cerrado: recuperación operable sin perder borrador

Evidencia propia mediante CUA, Electron servicio real, perfil aislado `.local/qa-011/electron-profile`, API sintética SQLite8891. Ventana observada a1440×900; no se usó el perfil personal.

1. Acceder como Aurora, abrir Campaña Aurora e iniciar explícitamente su apertura caducada. Cargar «Mapa de prueba Aurora» y renombrar el mapa a «Borrador UX Electron ronda 3», sin guardar.
2. Abrir «Cerrar partida»: Cancelar recibe foco inicial. Revocar las sesiones Aurora con el helper privado autorizado del fixture. No se confirma cierre de apertura.
3. Desaparecen editor y confirmación. La captura y el árbol de accesibilidad muestran «Recuperar sesión», su correo automáticamente enfocado y los controles operables. Tab mueve el foco a contraseña. No permanece el bloqueo modal invisible reproducido en ronda2.
4. Reautenticar a la misma Aurora restaura el nombre exacto del mapa y el editor; no reaparece la confirmación previa. Abrir una nueva decisión «Reabrir partida» muestra su contexto y Cancelar enfocado. Escape la cancela y devuelve foco al botón Reabrir partida.
5. Segunda variante real: abrir Cerrar partida y Confirmar mientras existe el borrador. Aparece el guard «Cambios sin guardar» por encima, con Cancelar inicial. Sin elegir guardar/descartar, revocar Aurora de nuevo. Ambos diálogos dejan de bloquear la interfaz; correo de recuperación enfocado y pegado/Tab/autenticación operables. La segunda recuperación conserva otra vez «Borrador UX Electron ronda 3», el editor activo y ninguna decisión antigua visible. La apertura no se cerró por aceptar tardíamente ese guard.
6. Cmd+Q muestra la advertencia nativa de cambios pendientes. Se termina únicamente la instancia propia con «Descartar y salir», sin guardar la escena sintética.

La liberación de modalidad en Electron está acreditada por interacción real, además de observación visual y accesibilidad. No se afirma haber contado dialog[open] en Electron: ese conteo corresponde al recorrido IAB del orquestador consignado en coordinación.

## Contraste de fuente y pruebas propias

ServiceDialog cierra el elemento en cleanup de layout y evita devolver foco a disparadores ocultos/inertes. AccountAccess enfoca el correo al recuperar. GameEditor condiciona sus confirmaciones/retención a autoridad activa, descarta selección al suspender e invalida operaciones mediante generación. LiveEditor cancela el broker y retira sus diálogos durante suspensión/revalidación; Participants se desmonta, cancelando selección y resultados tardíos. La instancia del viewport continúa retenida.

Ejecutado `pnpm exec vitest run src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/ServiceApp.test.tsx --maxWorkers=1`: **3 archivos, 28/28 pruebas PASS**, 2.95s. No se ejecutaron suites de motores ni gates intensivos.

Las14 regresiones nuevas cubren Cerrar/Reabrir/Crear enlace/expulsión, cierre del dialog, foco y mismo nodo de borrador; cuatro selecciones resueltas tarde; guard anidado cancelado y guard que responde tras recuperar; revalidación503/409; resultados tardíos de expulsión/rotación. Usan transportes controlados y App reducido a un input; demuestran ciclo de vida y conservación DOM, no modalidad nativa. El recorrido Electron anterior complementa esa limitación.

Las otras14 pruebas selectivas conservan la evidencia de UX-1 y UX-2 cerrados en ronda2: navegación de invitación con descarte explícito, historial Atrás/Adelante y doble Atrás, revalidación temporal con reintento y Retry-After sin sustituir el nodo del borrador. No se volvió a forzar caída de red por CUA ni a recorrer historial manual en esta ronda; se mantiene la atribución del informe anterior.

## Alcance, atribución y limpieza

- CUA propio nuevo: acceso/catálogo/apertura, carga/edición, revocación con modal simple y guard anidado, dos recuperaciones del mismo DM, Escape/foco de decisión nueva y cierre nativo con advertencia. Captura de recuperación inspeccionada sin guardar archivo ni revelar contraseñas/enlaces.
- Expulsión, creación de enlace, respuestas tardías y diálogos de revalidación tienen inspección de fuente y ejecución de pruebas controladas en esta ronda; no se presentan como recorridos nuevos de Electron. El caso IAB previo es evidencia del orquestador, no mía. Las1240 pruebas/builds generales de build.md son evidencia del constructor, no ejecución propia.
- Los recorridos amplios de las rondas anteriores conservan su atribución. Herramientas de mapa, cámara/escala, Player, Electron local, matriz200% y administración no se repitieron completos por este arreglo delimitado. No se certifica proyector físico. El nuevo foco/cleanup no modifica esos controles y el recorrido del mapa siguió operable.
- Proceso Electron propio39886 cerrado normalmente y confirmado exit0. No se abrieron pestañas de navegador ni se tocó dashboard. Las dos invocaciones del helper terminaron exit0 y cierran la sesión administrativa sintética en finally. No se cambiaron contraseñas ni guardaron escenas; no se reinició API8891/PG/8787 ni se leyó provisión personal.
- Aurora/Electron liberados y comunicado al orquestador. Sin cambios de producto, Git, tablero ni informes ajenos. Este informe se publica por temporal y renombrado.

UX-3 queda cerrado con evidencia independiente de Electron. Los cierres UX-1/UX-2 permanecen válidos; no quedan cambios UX obligatorios de esta revisión.
