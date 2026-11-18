# 54 — Cabecera compacta compartida

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado en `main`; producto en el commit `c4e8831`, cierre y validación en [consolidación](../../consolidacion.md).

## Objetivo

Fusionar navegación de servicio, contexto de partida, controles del editor y perfil en una única cabecera compacta.

## Contrato y aceptación vigente

1. Una fila de 44 px muestra navegación, partida, escena, herramientas y perfil; no hay logo duplicado ni fila vacía del editor.
2. El editor comparte cabecera mediante portal con sus callbacks reales; Electron local conserva su cabecera autónoma.
3. Bajo 1100 px las acciones del editor se agrupan en desplegable conservando guardar, combate, contadores, dados, explorador e inspector. El ajuste 3.27.1–3.27.2 limitó «Jugador» a Electron; la corrección solicitada del 2026-11-15, descrita abajo, recupera esta acción en navegadores. Se conserva el comportamiento de ambos modos Electron.
4. Escape cierra y devuelve foco; salir con puntero/foco cierra menús; sus teclas no disparan atajos del canvas.
5. Suspensión de acceso oculta e inhabilita los controles compartidos; cerrar/reabrir conserva confirmaciones y protección de borrador.

## Evolución y límites

Consolida 3.18.0 y corrección 3.18.1 en el árbol de trabajo. La inspección anterior usó una fixture aislada; no equivale a probar de nuevo una partida real durante esta consolidación.

### Ajuste local solicitado — 2026-11-15

En 3.30.3, Chrome y otros navegadores muestran únicamente el nombre de la escena cargada como texto no interactivo, con elipsis para nombres largos. Se retiran de esa ubicación el desplegable, la flecha y el nombre del mapa. El guardado permanece en la barra de herramientas; Electron conserva su menú de escena. Cambio local pendiente de integración; [validación del ajuste](../59-campanas-arcos-escenas/validacion.md#cabecera-de-escena-en-navegador--2026-11-15).

### Corrección de publicación desde Chrome — 2026-11-15

**Estado:** implementado y validado localmente en 3.31.1; pendiente de integración Git. **Tarea:** FIX-01. Esta corrección sustituye la omisión de «Jugador» en navegadores del ajuste 3.27.1–3.27.2; no construye la propuesta SDD 61.

Al ocultar «Jugador» en Chrome se eliminó el único acceso a la publicación inicial de la escena. El callback y el cliente HTTP siguen disponibles, pero la presencia de jugadores o los controles contextuales «Mostrar» no inician la publicación. Restaurar el botón existente con icono Monitor y texto «Jugador», separado semánticamente de mostrar un token, resumen o panel.

| Modalidad | Acción del botón |
| --- | --- |
| Chrome y otros navegadores conectados | Publicar la escena actual para los jugadores, sin abrir ventanas/pestañas. Tooltip y nombre accesible: «Publicar escena para jugadores». |
| Electron conectado | Conservar la misma publicación HTTP, sin añadir una ventana nativa. Mismo tooltip de servicio. |
| Electron autónomo | Conservar abrir/enfocar la ventana local de jugador y mostrar la escena. Nombre accesible: «Abrir ventana de jugador». |

La aclaración humana conserva expresamente el comportamiento actual de ambos modos Electron. No se añade identidad invitada, ruta, ventana ni privilegio nativo. Mantener el callback `onPlayer`, su estado ocupado, la suspensión de acceso y la publicación explícita. Entrar al editor, recibir presencia o abrir Herramientas no publica automáticamente.

Ubicación: grupo de acciones actual, en la fila amplia y en Herramientas bajo 1100 px. Una única instancia, con foco y activación de teclado, sin rediseñar el reparto responsive. El menú de escena de Chrome sigue siendo solo nombre; la condición Electron continúa rigiendo ese menú.

| ID | Condición observable | Verificación |
| --- | --- | --- |
| CA-06 | Chrome presenta Jugador en la fila amplia y el menú estrecho; no duplica el botón ni restaura el menú de escena | Cabecera real/Storybook a 1440 y 390 px, teclado y pruebas de composición |
| CA-07 | Clic explícito publica el snapshot actual; montaje, presencia y apertura del menú no publican; ocupado/suspendido impiden operar | Regresiones de App/cabecera y Chrome con API aislada + invitado |
| CA-08 | Electron conectado conserva publicación; autónomo conserva abrir/enfocar/mostrar; labels describen su acción real | Regresiones por modalidad y humo pertinente, sin cambios API/IPC |
| CA-09 | Errores conservan feedback y no activan sincronización como si publicar hubiera funcionado; responsive/portal/foco conservados | Casos de error existentes/dirigidos, lint/typecheck/build y revisión UI |

Evidencia y límites en [validación de FIX-01](validacion-fix-01.md). La rama `fix/publicacion-jugador-chrome` fue autorizada conservando cambios locales; no incluye commit, push, merge ni cambios de datos operativos.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/browser-client.md).
- [CHANGELOG](../../../CHANGELOG.md) y fuentes/pruebas indicadas en el plan.
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
