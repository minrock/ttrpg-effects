VEREDICTO: APROBADO

# Revisión UX — 004 Mesa sincronizada privada

Fecha: 2026-10-29. Ciclo 1, ronda 2. Revisión independiente conforme a `.codex/agents/ux.toml`, acotada al cierre de UX-1/UX-2 y regresiones relacionadas. Se contrastaron solicitud, spec, build actualizado, identidad de ronda y código congelado. Se conservan las convenciones de AGENTS.md leídas en la primera ronda. No se consultaron informes de otros revisores ni se modificó implementación, Git o tablero.

## Cierre de hallazgos

### UX-1 — Corregido: presencia y reconexión no recentran la cámara local

`src/renderer/src/App.tsx:1485–1522` limita ahora el comando automático `open` a Electron local. En modo servicio, tanto `onPlayerWindowReady` como el estado inicial actualizan la disponibilidad y el control de cámara sin enviar una nueva orden. Esto elimina la causa observada en la primera ronda, donde un cambio de `primaryId` terminaba generando un recentrado.

`src/application/services/table-session.ts:61–68` limpia el reporte del nuevo principal y le entrega un bootstrap para recoger su cámara actual. No emite un comando nuevo. La hidratación del mismo contexto en Player conserva su cámara y reenvía el reporte efectivo; los comandos explícitos siguen aplicándose.

Se inspeccionó y ejecutó la prueba conjunta en `src/renderer/src/App.workspace.test.tsx:482`: usa App, BrowserTableClient, TableSession y PlayerApp, con MapViewport sustituido por un doble. Parte de una cámara local divergente `{x:800,y:900,zoom:2}`; desconecta/reconecta al jugador, promueve al principal y remonta el DM. Comprueba ausencia de órdenes implícitas, conservación de la referencia de cámara de Player y reporte efectivo del jugador promovido. Luego confirma que una orden explícita de recentrado modifica la cámara aun con el zoom bloqueado. Es evidencia conjunta de la interacción que faltaba en ronda 1, aunque no es una prueba de render GPU ni una prueba HTTP completa.

La evidencia manual del constructor en `build.md` complementa esa cobertura: Chrome con Player a 132 %, corte real SIGSTOP/SIGCONT del servicio, nuevo principal, mismo centro/zoom y ningún comando nuevo. Está correctamente delimitada como UI jugador con sesión HTTP DM independiente; no se presenta como dos UI simultáneas. El builder también corrigió la afirmación anterior que había usado una cámara no divergente.

**Resultado:** UX-1 cerrado. La inicialización local Electron conserva su rama existente; la navegación del jugador deja de depender de las fluctuaciones de presencia del servicio.

### UX-2 — Corregido: anuncios accesibles fuera de Mesa colapsada

`src/web/ServiceApp.tsx:37–55` define el mensaje de estado y monta de forma persistente un `role="status"`, `aria-live="polite"`, `aria-atomic="true"` y un `role="alert"` como hermanos anteriores de `details`. Cerrar Mesa ya no los retira del árbol accesible. La clase `service-live-message` en `service.css` oculta visualmente sin `display:none`, `visibility:hidden` ni `aria-hidden`.

El texto depende de conexión/publicación/carga/error/listo, no de los valores de cada reporte de cámara. El evento `render-error` ahora actualiza también `tableStatus.error` en `table-client.ts`, por lo que llega a la región de alerta.

La prueba de `src/web/ServiceApp.test.tsx:57` usa eventos de TableSession y comprueba con Mesa cerrada: región fuera de `details`, cargando, error de imagen, listo, error de render y desconexión. También verifica que un reporte de cámara no cambia el texto anunciado. El constructor aporta además observación CUA de la región en el árbol accesible con Mesa cerrada. No se afirma una prueba auditiva con lector de pantalla.

**Resultado:** UX-2 cerrado. La corrección conserva el panel compacto y el manejo de Escape/foco, sin exigir que permanezca abierto para exponer cambios relevantes.

## Verificación propia y regresiones

Comando ejecutado en esta revisión:

`pnpm test src/renderer/src/App.workspace.test.tsx src/web/ServiceApp.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/infrastructure/browser/table-client.test.ts`

Resultado: **5 archivos, 58 pruebas PASS**, duración 3.77 s. Apareció el aviso conocido de canvas no implementado por jsdom; no produjo fallos. La selección incluye publicación explícita, acceso/recuperación de sesión, foco de diálogos, herramientas locales, hidratación/readiness, transporte y el recorrido conjunto de cámara corregido.

Se inspeccionó además la cadencia de reportes modificada: Player espera al menos 100 ms desde la finalización anterior para reportes intermedios, conserva serialización y entrega el reporte final. Las dos regresiones con latencias de 0/160 ms, incluidas en el comando anterior, pasan contra TableSession sin rechazos de cadencia. No se encontró regresión UX adicional en estos cambios.

Se verificó SHA-256 contra `ronda-2/huellas.json` de App y su prueba, Player y su prueba de imágenes, ServiceApp y su prueba, service.css, table-client y table-session: todos coinciden. La comparación de huellas entre rondas se usó para acotar los archivos modificados; no se escribieron fuentes congeladas.

## Límites y alcance de la aprobación

Esta ronda no repitió el humo completo ni abrió navegadores: el cierre se sustenta en inspección independiente, pruebas propias y evidencia manual atribuida al constructor, con sus límites indicados. Se coordinó con UI para no ocupar CUA durante su verificación. No se inició ningún servicio ni quedó proceso o pestaña propios por limpiar.

No se repitieron suite completa, compilaciones, lector de pantalla real, tres navegadores con promoción física, TLS/proxy ni Electron. Los resultados generales y del humo previo permanecen atribuidos a `build.md`; los límites de dados/crítico y dibujos del primer informe no cambian. Esta aprobación cierra los hallazgos UX revisados y no sustituye los veredictos independientes de seguridad, UI o código ni autoriza integración.

Informe publicado mediante temporal y renombrado. Sin hallazgos UX pendientes dentro del alcance de esta ronda.
