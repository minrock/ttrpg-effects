VEREDICTO: APROBADO

## Alcance

Revisión independiente de 004, ciclo 2, ronda global 3, el 2026-10-29. Alcance dirigido: cierre de UI-004-03, separación de brújula/sesión/Mesa, error de logout y regresiones visuales adyacentes. Leídos perfil UI, solicitud/spec/build vigentes, retrabajo-ciclo-2, identidad/diff de revisión y huellas. Se inspeccionaron directamente `src/web/ServiceApp.tsx`, `src/web/service.css` y `src/renderer/src/components/workspace/PlayerTools.css`; sus SHA-256 coinciden con ronda-3/huellas.json. No se leyeron informes ajenos ni se modificaron código, Git o tablero.

## Evidencia independiente

Build de producción web servido por la API 3.5.0 mediante `pnpm start:api`, puerto temporal 8797, datos sintéticos exclusivos en `/private/tmp/ttrpg-ui-review-004-8797`. Se publicó por HTTP autenticado una escena temporal con mapa 900×600, escala activa, contador y turnero; se ocultaron únicamente sus tarjetas sintéticas para inspeccionar el mapa. Acceso jugador y todas las interacciones de interfaz se realizaron mediante CUA en Chrome. No se usó biblioteca personal ni control externo del navegador.

Capturas reales inspeccionadas en la conversación de herramientas; no se guardaron PNG. Las medidas DOM complementan esas capturas y no sustituyen la inspección visual.

- Player 1024×768: se activó explícitamente «Mostrar brujula». La brújula completa queda entre Cerrar sesión y Mesa, con separación visible, tanto con Mesa cerrada como abierta.
- Se abrió Medir: las opciones permanecen utilizables arriba a la izquierda. Escala, contador, turnero y controles inferiores siguen legibles; el mapa conserva el espacio principal.
- Se inspeccionó la misma composición en 1440×900 y 1920×1080, con Mesa abierta: no reaparece el solapamiento ni se oculta un control.
- Se apagó realmente la API temporal y se pulsó Cerrar sesión. Apareció «No se pudo conectar con el servicio. Comprueba la conexión y reintenta.» conservando Player. La alerta se ve dentro de Mesa y fuera de details; permanece visible al cerrar el desplegable.
- Con conexión caída y logout fallido se inspeccionaron Mesa abierta y cerrada en los tres tamaños. También apareció el mensaje seguro de reporte descartado al redimensionar estando desconectado; el panel crece hacia abajo sin cubrir brújula, sesión, escala ni herramientas.
- Escape cerró Mesa y el árbol accesible confirmó el foco sobre su summary. La brújula permaneció identificada como «Brujula: norte 0 grados».
- `scrollWidth` coincidió con el ancho de viewport: 1024, 1440 y 1920, respectivamente.

## Cierre de UI-004-03

**Corregido.** `src/web/service.css` reserva filas distintas dentro de la composición Player web: sesión y16–60, brújula y70–154 y Mesa desde y166. La regla de brújula está acotada por `service-player-workspace`; no modifica el layout Electron ni se basa en ocultar controles o cambiar su z-index.

Mediciones independientes del render:

| Viewport | Brújula (x/y/ancho/alto) | Mesa abierta conectada | Mesa abierta tras logout fallido |
| --- | --- | --- | --- |
| 1024×768 | 924/70/84/84 | 648/166/360/97.5 | Visible desde y166, sin intersección |
| 1440×900 | 1340/70/84/84 | Captura sin intersección | 1064/166/360/171 |
| 1920×1080 | 1820/70/84/84 | Captura sin intersección | 1544/166/360/171 |

En 1024×768, Cerrar sesión mide 877.45/16/130.55/44; la escala, 70/722/212.89/30. Tras logout fallido, Mesa cerrada mide 648/166/360/81.5 y la alerta 661/175/334/33. El texto del error se ajusta en dos líneas; no ocupa la fila de la brújula. Esto cierra también el estado adyacente identificado antes de congelar la ronda.

No hay hallazgos UI pendientes ni corrección adicional solicitada en este alcance. El cierre previo de UI-004-01 (contraste) y UI-004-02 (escala) se conserva: las reglas de contraste permanecen y la escala se observó despejada durante esta revisión.

## Límites y limpieza

No se repitieron suite completa, flujo DM, dados, privacidad, cámaras, bibliotecas ni humo Electron, porque no cambian en este retrabajo. La verificación anterior de esos ámbitos sigue atribuida a sus responsables. No se ensayó proyector físico, teléfono ni lector de pantalla. No se afirma la matriz exhaustiva de doce capturas del constructor como evidencia propia; aquí se observaron los casos descritos, incluidos los estados de error reales en los tres tamaños.

La única pestaña propia quedó cerrada y el viewport restaurado. La API temporal fue terminada para producir el error real y no se dejó proceso activo. Se avisó al orquestador que CUA está libre. Única escritura: este informe, publicado íntegro mediante temporal y renombrado. La aprobación es técnica de UI, no autorización de merge.
