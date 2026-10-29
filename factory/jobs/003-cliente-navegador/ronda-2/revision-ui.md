VEREDICTO: CAMBIOS

## Alcance e identidad

Revisión UI independiente de 003, ciclo 1, ronda 2, 2026-10-29. Se revisaron el build actualizado, `ronda-2/revision.md`, las huellas y la implementación real, conservando el contexto de AGENTS, solicitud y spec leído en ronda 1. No se consultaron informes ajenos de esta ronda. Coinciden los SHA-256 de `src/web/{ServiceApp.tsx,dialogs.tsx,service.css}`, WorkspaceHeader y SceneLinkModal con las huellas de ronda 2.

Alcance: cierre de UI-003-01/UI-003-02, regresión de selector/foco y apariencia del panel remoto añadido en SceneLinkModal. Solo se escribe este informe; sin modificaciones de código, Git ni tablero.

## Evidencia real

Tras coordinar la liberación de CUA con UX, se inició un proceso propio `pnpm start:api` con Node 24, estáticos actuales `out/web`, API `out/api`, origen `http://127.0.0.1:8874`, directorio nuevo `/private/tmp/ttrpg-ui003r2.*` y claves ficticias. Se prepararon por HTTP dos escenas con nombres largos y un origen con marcador a partir de fixtures propios de la ronda anterior. Esto fue preparación de datos, no una prueba del importador UI. Las referencias de imagen ausentes del fixture se notificaron al cargar, como corresponde; no se usaron datos personales.

IAB no estuvo disponible; se utilizó Chrome por CUA. Todas las interacciones de producto, selección y capturas se hicieron mediante CUA. Capturas disponibles en el historial de herramientas de esta revisión, sin PNG persistidos.

- **1024×768:** selección de “La cripta bajo la montaña de los antiguos reyes — sesión extraordinaria del grupo de exploradores — encuentro final del corredor occidental”. El bloque Escena seleccionada muestra las tres líneas completas, incluido el sufijo, con borde/contraste legibles. Cancelar y Abrir escena quedan visibles. `innerWidth=1024`, `innerHeight=768`, `documentElement.scrollWidth=1024`.
- **1440×900:** selección del nombre equivalente terminado en “oriental”. El bloque actualiza el texto completo y permite distinguir el destino antes de confirmar. Captura inspeccionada; Cancelar devuelve el foco a SUMMARY con `aria-label=Menu de escena`, confirmado por estado accesible y lectura DOM.
- Cargar “Origen UI” → Explorador → Mapa → Editar Puerta UI abre el modal real. A1024 el estado inicial del nuevo panel Otra escena guardada es legible, con aviso previo a conectar y Cancelar visible. Elegir escena del servicio abre el selector encima; al confirmar el destino largo vuelve el foco al botón de selección y se muestra el nombre completo junto al marcador. El scroll interno permite alcanzar Conectar con esta escena. La superposición encontrada se detalla abajo.
- **1920×1080:** acceso jugador después de logout DM; estado veraz de proyección pendiente, sin nombres ni paneles privados. Cerrar sesión tiene estilo oscuro, borde y tipografía coherentes:130.55×44px y fuente16px, frente a96×21px y13.33px anteriores. Captura inspeccionada; el botón cierra correctamente y vuelve al acceso.
- Consola capturada al terminar: sin warn/error. Viewport restaurado, tab propio cerrado y proceso detenido. Se confirmó8874 sin listener.

## Hallazgos anteriores cerrados

**UI-003-01 — corregido.** `src/web/dialogs.tsx` agrega un detalle visible del nombre seleccionado; `src/web/service.css` permite ajuste de líneas. Las dos variantes que antes eran indistinguibles se identifican ahora antes de abrir en ambos tamaños. Las filas pueden seguir truncadas porque el detalle sí muestra la identidad completa.

**UI-003-02 — corregido.** El cierre jugador utiliza controles de44px, fuente heredada, colores y borde coherentes. Verificado visualmente y mediante logout real. No queda pendiente la observación menor de ronda1.

## Hallazgo que requiere corrección

### UI-003-03 — P2: la cabecera del VTT tapa el modal remoto cuando crece

**Archivos:** `src/renderer/src/components/annotations/SceneLinkModal.tsx:208` (contenido seleccionado que amplía el modal), `src/renderer/src/styles.css:3327` (backdrop con z-index20), `src/renderer/src/styles.css:4291` (alto del modal) y `src/renderer/src/components/workspace/workspace.css:26` (cabecera con z-index30).

**Pasos:** a1024×768 abrir una escena con marcador; Explorador → Mapa → Editar marcador → Elegir escena del servicio; elegir una escena con el nombre largo indicado arriba y confirmar Abrir escena. No es necesario conectar.

**Resultado observado:** el modal crece hasta ocupar y20..748. Su encabezado ocupa y21..103, mientras la barra superior del VTT permanece dibujada por encima hasta aproximadamente y54. La captura muestra oculta la etiqueta superior “Habitacion enlazada” y cubierta la franja superior del encabezado y del área del control de cierre. La cabecera del VTT conserva su fondo opaco encima del diálogo. Desplazar el cuerpo del modal permite llegar a Conectar, pero no corrige la superposición. Lectura DOM de solo inspección confirmó backdrop z-index20, workspace-header z-index30 y `elementFromPoint(400,35)` perteneciente a workspace-header. Incumple la exigencia de evitar superposición de controles en1024×768.

**Corrección esperada:** ubicar el backdrop y modal completos por encima de la cabecera, conservando la frontera hidden/inert de sesión incorporada en esta ronda; alternativamente ajustar su área disponible para que no entre bajo la cabecera. Mantener scroll interno, pie y cierre accesibles. Repetir la selección de destino largo en1024×768 y1440×900 y verificar que todo el encabezado del diálogo se ve y recibe interacción sin una barra del VTT por encima. No resolverlo portando contenido privado fuera del contenedor protegido.

## Límites

No se probó con proyector físico;1920×1080 evalúa disposición y contraste en captura. Esta ronda no repite todas las herramientas, bibliotecas, reemplazos,401, Electron ni labs, ni valida la transacción de conectar: el recorrido remoto se realizó hasta selección y cancelación para inspección visual. No se ejecutó una suite automatizada propia ni se toman los resultados del constructor como observación visual independiente. La aprobación queda pendiente únicamente del solapamiento documentado dentro de este alcance.
