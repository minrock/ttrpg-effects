VEREDICTO: APROBADO

# Revisión independiente de código — 004, ciclo 1, ronda 2

Fecha: 2026-10-29. Revisor: `codigo_004`. Rama y HEAD declarados por la ronda: `feature/fabrica-software`, `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Las 520 huellas de código/configuración/documentación coinciden con `ronda-2/huellas.json`, comprobado al inicio y al terminar. Sin escrituras de implementación, pruebas del repositorio, Git, tablero o informes ajenos.

## Alcance

Se retomaron las instrucciones de `AGENTS.md` y el perfil `codigo.toml`, solicitud/spec vigentes, `build.md` actualizado, identidad de revisión y paquete. Se compararon huellas de las dos rondas: hay 14 archivos nuevos o modificados en la corrección. Se inspeccionaron todos, concentrando el análisis en App/PlayerApp, TableSession, adaptador navegador, rutas HTTP, pruebas y documentación de los contratos revisados. Los demás archivos conservan las huellas de la revisión anterior.

Se verificaron los dos hallazgos propios, sus regresiones integradas y los efectos de los cambios de autorización, deduplicación y ACK sobre el contrato del cliente. Versión 3.5.0 y changelog único conservados; sin nuevas dependencias ni cambios de formato `.ttrpgscene`. Se mantienen TypeScript estricto, separación de aplicación/transporte/vista y el camino Electron local.

## Cierre de hallazgos de ronda 1

### COD-004-01 — Cerrado: reconexión sin orden involuntaria de cámara

En `src/renderer/src/App.tsx:1485`, la disponibilidad de jugador actualiza presencia/preview y conserva la llamada de apertura únicamente para Electron. La hidratación mediante `getPlayerWindowState` aplica la misma distinción. La publicación/recentrado explícitos mantienen su orden remota.

`src/application/services/table-session.ts:61` limpia el reporte del principal promovido y solicita estado actual mediante bootstrap; no crea un comando. El snapshot ordinario conserva cámara local y el receptor sigue descartando órdenes ya aplicadas por revisión.

Se ejecutó la regresión de `src/renderer/src/App.workspace.test.tsx:482`, que integra App, BrowserTableClient, TableSession y PlayerApp con transporte/viewport controlados. Comprueba cámara divergente `{center:{x:800,y:900},zoom:2}`, desconexión/reconexión, promoción y remonte DM, sin órdenes nuevas ni reinicio de cámara. Luego comprueba que un recentrado explícito sí se aplica. También pasan las regresiones de snapshot, imagen y herramientas locales de Player.

La corrección responde a aceptación 4, 6 y 7 y al defecto reproducido en ronda 1. El nuevo `build.md` reconoce que el primer humo carecía de cámara divergente y aporta un recorrido posterior al 132 %; se trata de evidencia del constructor, no de ejecución visual de este revisor.

### COD-004-02 — Cerrado: cadencia compatible con el servidor

En `src/renderer/src/PlayerApp.tsx:94`, el emisor verifica 100 ms desde la finalización de la petición anterior antes de enviar un reporte intermedio. El control está dentro del vaciado efectivo, por lo que también limita la cola acumulada mientras hay una petición en vuelo. El reporte final puede saltar la espera, conservando la serialización y la última cámara.

Se ejecutaron los dos casos de `src/renderer/src/PlayerApp.map-image.test.tsx:339`: gesto con actualizaciones cada 20 ms durante 800 ms, respuestas de 0 y 160 ms, validación mediante TableSession real, ningún rechazo por cadencia y reporte final correcto. El adaptador también limpia el error recuperable después de una mutación exitosa.

La corrección satisface el límite de diez reportes intermedios por segundo y la entrega final exigidos en aceptación 6 y 7; no se limita a ocultar el error.

## Regresiones y coherencia del resto de la corrección

- Los POST de mesa distintos de open/scene devuelven ACK compacto; el adaptador usa el esquema correspondiente y solo aplica snapshots donde existen. El test HTTP con escena grande procesa 500 reportes y mantiene disponible una orden DM posterior.
- La deduplicación conserva cinco minutos y separa presupuestos DM/jugador. El nuevo test de TableSession comprueba saturación de 20000 identificadores jugador, disponibilidad DM y límites de vencimiento.
- Las rutas protegidas vuelven a validar la sesión después de recibir el cuerpo. Upload verifica también tras decodificación de imagen. Las pruebas HTTP reales cubren logout, rotación, caducidad y cuerpos pendientes en mesa, assets, escenas, enlaces, plantillas y bibliotecas.
- Las regiones de estado/error de ServiceApp existen fuera del elemento details y su texto permanece estable ante reportes de cámara. La prueba correspondiente pasa. Los cambios de CSS son acotados a contraste/foco y posición de Mesa jugador; su inspección visual corresponde al revisor UI.
- La documentación describe ACK, presupuestos, promoción y cadencia de acuerdo con el código. La proyección pública y los validadores de escena no cambiaron respecto de la revisión anterior.

No se identificaron hallazgos nuevos que requieran corrección dentro de este alcance.

## Verificaciones ejecutadas

- `pnpm test src/application/services/table-session.test.ts src/server/table-http.test.ts src/server/http.test.ts src/infrastructure/browser/table-client.test.ts src/renderer/src/App.workspace.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/web/ServiceApp.test.tsx`: **8 archivos, 124 pruebas PASS**.
- `pnpm typecheck`: **PASS**.
- `pnpm lint`: **PASS**.
- `git diff --check`: **PASS**, lectura solamente.
- Comparación SHA-256 de `ronda-2/huellas.json`: **520 archivos, 0 diferencias**.

Se consultaron además los logs del constructor `/tmp/004-r1-tests.log` y `/tmp/004-r1-build-{electron,api,web}.log`: registran 121 archivos/1135 pruebas aprobadas y las tres compilaciones finalizadas. No se atribuyen como ejecuciones propias ni sustituyen los dirigidos anteriores.

## Limitaciones

No se operó CUA ni se repitieron humo visual, GPU, Electron, suite completa o compilaciones: las correcciones quedaron cubiertas por inspección, pruebas dirigidas y logs de construcción, sin fallos que justificaran repetirlos. El warning conocido de canvas ausente en jsdom no impidió los tests; no constituye verificación gráfica. La evidencia de navegador, contraste, layout y reconexión física permanece atribuida al constructor y a las revisiones visuales independientes.

La aprobación se limita a código en esta ronda y no autoriza commits, merge, despliegue o DMG.
