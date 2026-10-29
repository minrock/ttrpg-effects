VEREDICTO: CAMBIOS

## Alcance

Revisión UI independiente de 004, ciclo 1, ronda 1, el 2026-10-29. Leídos el perfil `.codex/agents/ui.toml`, AGENTS.md, solicitud, spec, build, identidad/diff de ronda y huellas. Inspeccionados directamente `ServiceApp.tsx`, `service.css`, `PlayerApp.tsx`, estilos de Player y controles de cabecera. Los SHA-256 de ServiceApp, service.css, PlayerApp y PlayerTools.css coinciden con las huellas congeladas. No se leyeron informes de otros revisores ni se modificaron implementación, Git o tablero.

## Evidencia observada

Ensayo independiente CUA sobre build de producción API/web existente, versión 3.5.0, `pnpm start:api`, origen local puerto 8797 y datos exclusivos en `/private/tmp/ttrpg-ui-review-004-8797`. IAB para DM y Chrome para jugador con cookies independientes. Se cargó una escena sintética mediante el selector real; datos e imágenes se prepararon por HTTP en el servicio temporal usando el generador de humo del constructor. No se accedió a la biblioteca personal.

Capturas CUA inspeccionadas en esta revisión (quedan en la conversación de herramientas; no se guardaron PNG ni se atribuyen capturas del constructor como propias):

- DM 1440×900: escena con mapa, dos mapas disponibles, contadores, turnero y tarjetas. Cabecera compacta y paneles coherentes con la interfaz existente. El botón Jugador publica y la barra de estado confirma la publicación.
- Player antes de publicar: fondo de espera con «Acceso jugador / Esperando al DM», sin rueda indefinida. Después de publicar: mapa, token visible, contador 3 y turnero de ronda 2/iniciativa 12; no aparecen las etiquetas privadas SECRET del DM.
- Player 1920×1080: tarjetas públicas Ogro/Guía visibles; al ocultarlas desde DM se retiran y vuelve a dominar el mapa. El turnero queda en la zona inferior, con altura acotada. Herramientas locales y bloqueo de zoom conservan iconos reconocibles.
- DM con Mesa abierto: «Proyección publicada. Jugador listo», principal identificado y enlace sin clave. La copia funciona y muestra «Enlace copiado». Escape cierra el desplegable y devuelve foco al summary Mesa.
- DM y Player 1024×768: cabecera dentro de pantalla, paneles DM se ocultan adaptativamente. Inspección DOM de ambos confirma innerWidth=1024, innerHeight=768 y scrollWidth=1024. Persisten los problemas de contraste/posición descritos abajo.
- Consulta de consola DM: sin errores ni warnings en este recorrido.

## Hallazgos que requieren corrección

### UI-004-01 — P2: el botón Copiar enlace tiene texto prácticamente invisible

Archivo: `src/web/service.css:34`; control en `src/web/ServiceApp.tsx:45`.

Pasos: acceder como DM, abrir el desplegable Mesa inferior y mirar la acción situada debajo del enlace jugador. Reproducido en IAB a 1440×900. El botón se ve como un rectángulo claro aparentemente vacío; su nombre accesible sí es «Copiar enlace» y la acción funciona al pulsarlo.

La lectura de estilo computado mediante CUA confirma texto `rgb(238, 241, 244)` sobre fondo nativo `rgb(239, 239, 239)`. La regla hereda el texto claro del panel, pero no establece fondo para el botón. Esto impide reconocer visualmente una acción principal del flujo de invitación, especialmente en proyección; no es solo una preferencia estética.

Corrección esperada: asignar colores explícitos de fondo/texto/borde compatibles con los controles del servicio, manteniendo foco visible, y verificar por captura que «Copiar enlace» es legible en reposo y foco. No depender del fondo nativo del navegador.

### UI-004-02 — P2: Mesa tapa la escala del jugador

Archivos: `src/web/service.css:29`, `src/web/ServiceApp.tsx:40` y `src/renderer/src/components/workspace/PlayerTools.css:102`.

Pasos: publicar una escena, conectar un jugador, activar desde DM «Mostrar indicador de escala en Player View» y dejar Mesa cerrado. Reproducido en Player 1920×1080 y 1024×768. El distintivo «Mesa conectada» se superpone al inicio de «Zoom 100% Cuadro 100 px»; se oculta el rótulo Zoom y parte de la lectura. No hace falta abrir el popover: la colisión es permanente durante la sesión.

Medición DOM de la captura 1920×1080: escala x=70–282.89, y=1034–1064; Mesa x=8–133.98, y=1039.5–1072. Ambos ocupan la esquina inferior izquierda y Mesa tiene z-index 45. La captura muestra el texto de escala detrás del nuevo distintivo. La especificación exige conservar indicador de escala y evitar superposiciones permanentes.

Corrección esperada: reservar espacios independientes para estado de conexión y escala en el cliente servicio, tanto con Mesa cerrado como abierto, sin esconder la información de escala ni moverla fuera del viewport. Verificar 1440×900, 1024×768 y 1920×1080 con escala activada, además del estado desconectado cuyo texto es más largo.

## Límites y cierre

Esta revisión acredita apariencia mediante capturas reales y mediciones DOM, no solo tests. No repite la suite ni el humo completo del constructor. No se ensayaron de nuevo caída/restauración de red, error de imagen, tiradas/críticos, publicación con nombres excepcionalmente largos, teléfonos ni proyector físico; esos casos no se presentan como comprobación visual independiente. La evidencia de build sobre recuperación sigue siendo evidencia del constructor. El orquestador pidió cerrar tras confirmar los dos hallazgos y tamaños relevantes.

Se restauraron los overrides de viewport, se cerraron ambas pestañas propias y se terminó el proceso temporal de API. Solo se publica este informe, mediante temporal y renombrado. Los dos hallazgos son corregibles dentro del alcance de 004; no requiere decisiones nuevas del usuario.
