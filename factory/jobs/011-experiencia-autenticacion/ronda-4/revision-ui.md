VEREDICTO: APROBADO

# Revisión UI — 011, ciclo 2 / ronda 4

Fecha: 2026-10-31. Revisión independiente del producto 3.13.0 congelado en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Perfil UI, AGENTS, solicitud/spec/build/coordinación/retrabajo, identidad/diff de ronda4, huellas y mi informe de ronda3 contrastados. Las 655 huellas coinciden al publicar. El delta respecto de ronda3 comprende `GameEditor.tsx`, su prueba de autoridad, documentación del cliente y changelog; no hay cambios CSS ni backend.

## Alcance y cierre de UI-011-3 / C4

Se repitió personalmente el recorrido que produjo UI-011-3, mediante Chrome/CUA contra QA8891/SQLite: cuenta sintética Boreal y la misma partida propia «QA UI ronda tres — recuperación de sesión», ID `7070fed2-ebe0-469a-82c8-8fadeff58d28`. Se inspeccionaron capturas reales del estado posterior al cierre, confirmación de reapertura y editor reabierto. Las mediciones DOM complementan la inspección visual; no son su sustituto.

1. Abrir editor e Iniciar partida. Con la mesa conectada, pulsar Cerrar partida y Confirmar.
2. Ahora desaparece el editor y se presenta «Estado del anfitrión: Acceso caducado» con **Iniciar partida** habilitado. No aparece «Tu acceso a esta partida ya no está disponible», ni «Conectado», ni Continuar inoperante. Hay cero diálogos abiertos. Captura a1024×768 CSS, DPR1 y body.scrollWidth1024 confirmados: título, explicación, estado y acción completos, jerarquía clara y sin desbordamiento.
3. Pulsar Iniciar partida en esa misma pantalla, sin recargar ni volver al catálogo: devuelve al editor. La conexión pasa por Reconectando y termina Conectada.
4. Pulsar Reabrir partida: diálogo centrado con nombre/sistema, consecuencia y Cancelar/Confirmar legibles. Cancelar recibe foco; Shift+Tab circula a Confirmar. Confirmar devuelve al editor conectado, sin modal antiguo ni alerta de pérdida de acceso. La captura muestra el foco visible sobre Reabrir partida y el canvas disponible.
5. Cerrar la apertura resultante y confirmar: vuelve de nuevo al estado coherente Acceso caducado/Iniciar partida. Se inspeccionó la segunda captura y no se reprodujo la contradicción de ronda3.

**UI-011-3 cerrado.** El resultado solicitado es visible y la acción que se ofrece después del cierre funciona en el recorrido real. No quedan correcciones UI solicitadas por este informe.

## Contraste de implementación

`src/web/GameEditor.tsx` separa vigencia de cuenta de contexto de apertura; registra el contexto que se retira durante cierre/reapertura y difiere sus terminales mientras se resuelve la acción. El cierre exitoso aplica la apertura consultada y limpia el terminal; la reapertura comprueba ID y generación antes de cambiar de contexto. Los callbacks terminales se ligan al contexto que los originó. Esta lectura es coherente con los resultados observados; la comprobación determinista de ambos órdenes HTTP/SSE, fallos y respuestas tardías corresponde a pruebas/revisión de código, no se atribuye a CUA.

## Límites y limpieza

Revisión proporcional al delta: se mantienen las conclusiones de UI de rondas anteriores para formularios, nombres largos, recuperación/modal y estilos intactos. No se repitió toda la matriz de administración, zoom200%, proyección, expulsión ni Electron. La recuperación ante revocación sigue bajo contraste funcional UX/código; esta prueba usa escena vacía y no acredita preservación de un borrador modificado. No se probaron proyectores físicos ni otros sistemas operativos. No se detectaron defectos visuales nuevos en el alcance inspeccionado.

No se tocaron Aurora, API8787, perfiles/datos personales, PostgreSQL, Git, producto ni tablero. Credenciales sintéticas consumidas en memoria, sin imprimir secretos ni guardar enlaces de invitación en evidencias. No se guardó ni publicó escena. Se cerraron las aperturas propias (la primera por cierre; la segunda se retiró por reapertura y su sucesora terminó cerrada), se cerró sesión Boreal y la única pestaña de esta ronda. Viewport restablecido, zoom sin modificar y DPR1 confirmado; no procesos propios pendientes. La fixture existente permanece para el orquestador. Única escritura: este informe completo publicado mediante temporal y renombrado.

Este APROBADO corresponde a UI y al cierre de UI-011-3; no sustituye las otras tres revisiones ni la decisión técnica de la fábrica.
