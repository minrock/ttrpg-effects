VEREDICTO: APROBADO

## Alcance

Revisión independiente UI de 005, ciclo 1, ronda 1, el 2026-10-29. Leídos perfil UI, AGENTS.md, solicitud, spec, build e identidad/diff de revisión. Inspección directa de `src/main/service-app.ts`, composición local y frontend reutilizado. Las huellas de service-app, local-app, App, PlayerApp, ServiceApp y service.css coinciden con la ronda congelada.

El cambio visual nuevo es la ventana de servicio, su título/menú y la recuperación. No cambia el VTT: se verificó contra `base-archivos.json` que App, PlayerApp, ServiceApp, service.css, workspace.css y PlayerTools.css son idénticos a la entrega 004. La aprobación visual previa de proyección se conserva con atribución expresa a `004-mesa-sincronizada/ronda-3/revision-ui.md`; no se presenta ese recorrido como ejecución nueva.

## Evidencia observada

Prueba real con los artefactos compilados entregados, Electron y API 3.6.0. Todas las acciones UI, capturas y consultas a DevTools se realizaron mediante CUA. Directorios descartables: `/private/tmp/ttrpg-ui005-review-data`, perfiles `/tmp/ttrpg-ui005-review-service` y `/tmp/ttrpg-ui005-review-local`; puerto 8895 y claves sintéticas. No se accedió a datos personales.

Comandos principales: `TTRPG_SERVICE_URL=http://127.0.0.1:8895 pnpm start:service --user-data-dir=/tmp/ttrpg-ui005-review-service`, `pnpm start:api` con configuración temporal y web compilada, y `NODE_OPTIONS=--experimental-sqlite pnpm exec electron . --user-data-dir=/tmp/ttrpg-ui005-review-local`. El primer arranque API con `/tmp` fue rechazado correctamente por no ser ruta física; se corrigió a `/private/tmp` antes de continuar.

- **Recuperación 1440×900 y 1024×768:** puerto inicialmente cerrado, mensaje en español con origen visible, jerarquía clara y párrafos legibles. Reintentar y Salir caben completos; no se observa desbordamiento horizontal ni recorte. Tab muestra un contorno azul claro alrededor de Reintentar; el siguiente Tab hace lo mismo en Salir. Los estados se distinguen mediante texto y foco, además del color.
- **Reintento real por teclado:** se arrancó la API y se ejecutó Shift+Tab/Enter sobre Reintentar. Apareció el login del frontend real sin reiniciar Electron. Login completo y legible en 1024×768.
- **Servicio DM 1024×768 y 1440×900:** acceso con clave temporal; cabecera, botones y controles de cámara conservan su distribución. El título nativo mantiene «TTRPG Effects · Servicio · http://127.0.0.1:8895» tanto en recuperación como en login/VTT. Identifica el destino sin añadir otro panel sobre el mapa. Los menús accesibles son Editar, Servicio y Ventana, diferenciados del modo local.
- **Proyección y alternativa de copia:** en 1024×768 se abrió Mesa. URL jugador completa, texto sobre perfil independiente y Copiar enlace legibles. Al pulsar Copiar enlace apareció «Selecciona el enlace y cópialo manualmente». Escape cerró Mesa y dejó foco en su summary. La copia manual efectiva se deja a la revisión UX; aquí no se afirma haber leído el portapapeles.
- **Local 820×520:** arranque con perfil vacío y API apagada. La cabecera, guardar, botones de panel y Jugador permanecen completos; los paneles se repliegan como drawers. Se abrió Explorador: acciones iniciales y explicación legibles, con desplazamiento vertical del contenido. La barra inferior trunca textos mediante elipsis como comportamiento previo; no se atribuye un rediseño a 005.

Los tamaños exteriores 1024×768, 1440×900 y 820×520 se confirmaron mediante `outerWidth/outerHeight` en consola CUA; el título nativo ocupa parte del alto. Las capturas reales están en el historial de herramientas y fueron inspeccionadas; no se crearon PNG. La consola servicio registró el 401 inicial de sesión esperado. Local mostró el aviso CSP previo y la salida de procesos avisos de Autofill de DevTools; no se afirma una consola vacía.

## Hallazgos y corrección esperada

No se encontraron defectos visuales nuevos que requieran corrección en este alcance. La recuperación de `src/main/service-app.ts:8` mantiene contraste, espaciado y foco visibles, y su integración real permite continuar al servicio. El título de `src/main/service-app.ts:17` distingue el modo durante todo el recorrido. No se solicita cambio adicional de UI.

## Límites y limpieza

La escena de esta revisión estaba vacía: no se repitieron mapas, dados, combate, bibliotecas, privacidad ni todas las herramientas ya revisadas. Proyección 1920×1080, brújula/escala/Mesa y sus estados de desconexión conservan la evidencia independiente de 004 ronda 3, con frontend sin cambios; la integración cruzada Electron/jugador y las capturas 005 con mapa quedan atribuidas al constructor en build.md. Tampoco se ensayaron dominio de origen muy largo, proyector físico, lector de pantalla o certificados en esta revisión UI. La regla `overflow-wrap:anywhere` del origen se inspeccionó en fuente, sin presentarla como captura de un origen largo.

Se cerraron ambas ventanas/procesos Electron propios con salida 0 y la API temporal con salida 0. No se crearon pestañas. Se avisó al orquestador y a UX que CUA está libre antes de publicar. Única escritura en el repositorio: este informe, íntegro mediante temporal y renombrado. Sin implementación, Git, tablero ni delegación. La aprobación UI es técnica; no autoriza merge.
