VEREDICTO: CAMBIOS

## Alcance e independencia

Revisión UI del trabajo 003, ciclo 1, ronda 1, realizada el 2026-10-29. Leídos AGENTS.md, perfil `.codex/agents/ui.toml`, solicitud, spec, build, identidad/diff de `revision.md`, huellas y código real de la composición web, diálogos, estilos, cabecera y PlayerApp. No se consultaron informes de otros revisores. Las huellas SHA-256 de ServiceApp, dialogs, service.css, PlayerApp y WorkspaceHeader coinciden con la ronda.

Se revisaron jerarquía, legibilidad, identificación de estados, nombres largos, superposiciones y adaptación del acceso, selector y VTT compartido. No se modificó implementación, Git ni tablero.

## Evidencia observada

Servicio real Node 24.15.0 con `pnpm start:api`, build existente `out/api` y estáticos `out/web`, origen `http://127.0.0.1:8873`, directorio temporal propio bajo `/private/tmp` y claves ficticias DM/jugador. No se utilizó la biblioteca personal. Navegador IAB/Chromium mediante CUA exclusivamente; capturas y árboles accesibles constan en el historial de herramientas de esta revisión, sin PNG persistidos.

- **1440×900:** acceso con error de clave real; título, campos y mensaje legibles, sin depender del color para explicar el fallo. Menú de escena compacto, con importación/exportación diferenciadas. Selector vacío centrado, fondo atenuado y acciones visibles; Escape cierra. VTT real con grilla y paneles existentes.
- **1024×768:** guardado con nombre extenso, selector con escenas persistidas y apertura real. Viewport confirmado 1024×768 y `documentElement.scrollWidth` 1024. Cabecera trunca su nombre sin desplazar acciones. Drawers se alternan sin apilar ambos paneles y el inspector conserva scroll interno. El diálogo mantiene sus botones dentro del viewport. Foco del campo de nombre visible en la captura.
- Se subió por selector navegador el fixture propio `src/server/fixtures/pixel.jpg` (2×2) y se guardaron dos escenas con nombres largos similares para comprobar identificación, sin fingir un mapa de producción. Guardar y cargar mostraron éxito real del servicio.
- **1920×1080:** después del logout DM y acceso con rol jugador, solo aparece “Acceso jugador” y la explicación de proyección pendiente, con herramientas locales y sin nombres/paneles DM. El mensaje tiene contraste y espacio suficientes en captura; no afirma sincronización.
- **Fallo de red real:** detenido el proceso de API de esta revisión, Cerrar sesión jugador mantiene la vista y muestra “No se pudo conectar con el servicio. Comprueba la conexión y reintenta.” El aviso también fue inspeccionado a 1024×768, sin recorte ni solapamiento con el botón.
- Consulta de consola antes del fallo deliberado: sin entradas warn/error capturadas. Se restauró el viewport, cerró el tab propio y confirmó que 8873 quedó sin listener.

## Hallazgo que requiere corrección

### UI-003-01 — P2: nombres largos diferentes resultan indistinguibles en el selector

**Archivos:** `src/web/dialogs.tsx:28` y `src/web/service.css:18`.

**Pasos reproducidos:** guardar dos escenas con los nombres “La cripta bajo la montaña de los antiguos reyes — sesión extraordinaria del grupo de exploradores — encuentro final del corredor oriental” y el mismo nombre terminado en “occidental”. Abrir Cargar escena a 1024×768 y seleccionar una opción. Repetir a 1440×900.

**Resultado observado:** ambas filas muestran el mismo prefijo “La cripta bajo la montaña de los antiguos reyes — sesión …”. Seleccionar una solo cambia el resaltado; no revela el sufijo ni agrega un detalle legible. El modal conserva 540 px incluso en el viewport ancho. La comprobación DOM de solo lectura confirmó que ni el select ni su opción seleccionada tienen `title`; el árbol accesible sí conserva el texto completo, pero el usuario visual no puede distinguir el destino antes de abrir. La captura de 1440 muestra igualmente dos filas truncadas indistinguibles. Esto incumple el selector con nombre identificable y la revisión de nombres largos exigidos por la spec.

**Corrección esperada:** mostrar el nombre completo de la escena seleccionada en un bloque visible que ajuste líneas dentro del modal, o utilizar filas capaces de revelar el texto completo sin desplazar sus acciones. No basta ampliar un poco el ancho ni conservar únicamente el nombre accesible. Mantener teclado, foco y botones accesibles. Repetir la comparación de dos nombres con prefijo común y sufijos distintos en 1024×768 y 1440×900, verificando que se puede identificar el destino antes de confirmar.

## Observación menor

**UI-003-02 — P3:** `src/web/service.css:20` solo posiciona Cerrar sesión jugador; no le aplica el sistema de controles del resto de la interfaz. En 1920×1080 y 1024×768 aparece como botón nativo blanco de 96×21 px, fuente 13.33 px, mientras las herramientas inferiores usan controles oscuros de mayor superficie. Es operable y legible en monitor, pero rompe la coherencia visual y queda pequeño para el contexto de proyección. Reutilizar tamaño, tipografía, colores y foco de los controles existentes. Esta observación por sí sola no determina CAMBIOS.

## Límites

No se utilizó un proyector físico; la legibilidad se evaluó en capturas a los tamaños exigidos. No se repitió un humo completo de cada herramienta, bibliotecas, enlaces, reemplazo de mapa, notas con imágenes, Electron ni labs: esta revisión se centra en la UI introducida por 003 y su integración visual. No se afirma verificación manual de paginación de más de 50 escenas, recuperación 401 ni selector con error de red; sí se observaron el error de acceso y el error de logout descritos. No se atribuyen como propias las pruebas del constructor. El fixture mínimo permite probar guardado/selección y disposición, pero no evaluar detalle gráfico o rendimiento de mapas grandes.
