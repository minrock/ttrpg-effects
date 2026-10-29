VEREDICTO: APROBADO

# Revisión independiente de código — 004, ciclo 2, ronda global 3

Fecha: 2026-10-29. Revisor: `codigo_004`. Referencia de la ronda: rama `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Las 520 huellas coinciden con `ronda-3/huellas.json`, comprobado al iniciar y al cerrar. Sin cambios de implementación, Git, tablero, pruebas del repositorio ni informes ajenos.

## Alcance y resultado

Se leyeron el perfil de código, solicitud/spec, `retrabajo-ciclo-2.md`, identidad de ronda y ampliaciones de `build.md`, conservando las instrucciones de AGENTS.md ya revisadas. Se compararon las huellas con la aprobación de ronda 2: únicamente cambian `src/web/ServiceApp.tsx`, `src/web/ServiceApp.test.tsx`, `src/web/service.css` y `docs/synchronized-table.md`. Se inspeccionaron los cuatro archivos y las pruebas relevantes de composición Player.

No se identificaron defectos de código que requieran cambios en esta corrección. Los cierres COD-004-01 y COD-004-02 siguen vigentes: App, PlayerApp, TableSession y adaptador conservan exactamente las huellas aprobadas. Tampoco cambian autorización HTTP/SSE, assets, dominio, persistencia, dados, dependencias ni formato `.ttrpgscene`. Versión 3.5.0 y changelog permanecen sin un bump adicional, según el retrabajo autorizado.

## Comprobación de la corrección

- **Composición acotada al servicio:** `src/web/ServiceApp.tsx:42` incorpora el contenedor `service-player-workspace` manteniendo ClientProvider, identidad de PlayerApp, condición de sesión y operación de logout. El contenedor tiene altura completa. No introduce una nueva suscripción, temporizador ni remonte por cambios de estado de Mesa.
- **Separación de controles:** `src/web/service.css:39` sitúa Mesa en y=166 y `service.css:43` sitúa la brújula en y=70, con selector limitado al contenedor del servicio. Se conserva la posición del botón de sesión. No se resuelve el conflicto ocultando controles ni alterando z-index; la disposición local Electron no recibe esa regla. La documentación describe la distribución nueva. La verificación gráfica final compete al revisor UI.
- **Logout fallido:** `src/web/ServiceApp.tsx:46` presenta el error mediante un párrafo con `role="alert"`, hijo directo de Mesa y fuera de details. `service.css:21` limita altura, permite scroll y ajuste de texto; se retiró la posición fija que lo situaba sobre la brújula. La operación mantiene la sesión/vista cuando falla y permite reintentar. El test nuevo simula respuesta 503 y comprueba conservación de Player, alerta visible en la estructura y details cerrado.
- **Estados y teclado:** siguen presentes las regiones live fuera de details y el cierre de Mesa con Escape/foco al summary. El cambio no modifica los manejadores ni la lógica de reportes. Las regresiones existentes de sesión, imagen, cámara y herramientas pasan.

No hay nuevos hallazgos que enumerar ni correcciones de código pendientes dentro del alcance revisado.

## Verificaciones ejecutadas

- `pnpm test src/web/ServiceApp.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/PlayerApp.tools.test.tsx`: **3 archivos, 36 pruebas PASS**, incluida la regresión nueva de logout fallido.
- `pnpm typecheck`: **PASS**.
- `git diff --check`: **PASS**, solo lectura.
- SHA-256 de `ronda-3/huellas.json`: **520 archivos, 0 diferencias**.

Se consultaron los logs de construcción `/tmp/004-c2-tests.log` (121 archivos/1135 pruebas), `/tmp/004-c2-logout-tests.log` (8 pruebas), `/tmp/004-c2-lint-final.log` y `/tmp/004-c2-build-web-final.log` (build web finalizado). Esta evidencia pertenece al constructor. Se conserva la distinción de `build.md`: la suite completa precede a la nueva prueba de logout; no se afirma una ejecución completa de 1136 pruebas.

## Limitaciones

No se operó CUA ni se repitieron suite completa, compilaciones, humo Electron o pruebas HTTP: las huellas confirman que sus fuentes no cambiaron, y los dirigidos no revelaron regresiones. Las doce combinaciones de layout y el caso de fallo real de logout a 1024×768 están documentados por construcción; no se presentan como observaciones visuales propias. Los tests jsdom verifican comportamiento y estructura, no medidas gráficas ni voz de lector de pantalla.

Esta aprobación es de código para la ronda global 3. No reemplaza la revisión UI ni autoriza commits, merge, despliegue o DMG.
