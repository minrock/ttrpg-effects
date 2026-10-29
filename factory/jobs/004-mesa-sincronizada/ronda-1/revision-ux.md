VEREDICTO: CAMBIOS

# Revisión UX — 004 Mesa sincronizada privada

Fecha: 2026-10-29. Ciclo 1, ronda 1. Revisión independiente según `.codex/agents/ux.toml`. Leídos `AGENTS.md`, `solicitud.md`, `spec.md`, `build.md`, `ronda-1/revision.md` y las huellas pertinentes. No se leyeron informes de otros revisores. Sin modificaciones de implementación, Git ni tablero.

## Hallazgos que requieren corrección

### UX-1 · P2 — La reconexión recentra al jugador sin una orden explícita

**Reproducción real:** API de producción temporal en `http://127.0.0.1:8814`, DM en IAB y jugador en Chrome con cookies independientes. Publicar una imagen, desbloquear el zoom local del jugador y pulsar «Acercar vista local». El DM pasa a «Vista libre». Suspender el proceso API con SIGSTOP hasta que ambos clientes indican «Mesa desconectada» y reanudarlo con SIGCONT, sin tocar controles de cámara. Después de reconectar, el mapa del jugador vuelve visualmente al zoom anterior y el DM pasa a «Sincronizada». La identidad de principal cambió de `e1b3d757` a `3cb27877`; volvió a haber una sola conexión y «Jugador listo».

Las capturas CUA antes/después muestran el cambio de encuadre de la misma imagen: durante la desconexión el contorno del logo estaba más cerca de los bordes; al recuperar se redujo. No hubo publicación nueva, cambio de mapa ni orden del DM durante la interrupción. Por tanto, el resultado contradice la conservación de navegación local declarada en `build.md` para la reconexión: aquella evidencia no cubre una vista local distinta de la cámara autorizada.

**Causa en el código congelado:** `src/infrastructure/browser/table-client.ts:110–118` traduce cualquier cambio de `primaryId` a `closed` y `ready`. `src/renderer/src/App.tsx:1485–1493` responde a `onPlayerWindowReady` con `sendPlayerCameraCommand("open")` sin distinguir la recuperación de un stream de una apertura explícita. El comando tiene una revisión nueva y Player lo aplica. También se manda `open` al montar el DM si ya existe un jugador (`App.tsx:1499–1511`), por lo que ese camino merece la misma cobertura.

**Impacto:** una interrupción de red altera el encuadre usado en la mesa física, pierde la navegación local y puede mover la imagen bajo las miniaturas. La promoción de otro jugador puede provocar la misma orden implícita a toda la audiencia. Infringe los apartados «SSE, bootstrap y reconexión» y «Cámaras, presencia y carga», y aceptación 4/7/8: el bootstrap no debe resetear navegación local; las órdenes remotas son explícitas.

**Corrección esperada:** separar la presencia/recuperación de una apertura o recentrado solicitado. Al recuperar el mismo contexto, pedir/aceptar un reporte actualizado para reconstruir el preview sin emitir una orden de cámara nueva. Conservar la inicialización para un jugador recién abierto y las órdenes explícitas, incluida su aplicación con zoom bloqueado. Añadir una regresión que integre DM, presencia y Player con una cámara local divergente, y repetir el corte/restauración y la promoción del principal. La prueba aislada de Player que conserva cámara ante un snapshot no detecta esta orden generada por el DM.

### UX-2 · P2 — Los anuncios de estado quedan ocultos al cerrar Mesa

**Evidencia:** `src/web/ServiceApp.tsx:41–50` coloca el único `role="status"` de conexión/carga y el `role="alert"` del transporte dentro de un `<details>` inicialmente cerrado. El `<summary>` que permanece visible cambia de texto, pero no es región viva. En la inspección CUA con Mesa cerrada, la transición dejó únicamente el botón «Mesa desconectada» en el árbol accesible; el texto «Reconectando… La vista está desactualizada» y el error solo aparecieron después de expandirlo. Carga, listo y fallo de imagen tampoco cambian el resumen DM, que sigue mostrando únicamente el número de jugadores.

**Impacto:** el DM o jugador que utiliza lector de pantalla no recibe de forma fiable las transiciones relevantes salvo que mantenga abierto un panel que cubre parte del mapa. Se incumple la exigencia explícita de anuncios live y estados de carga/error accesibles en el flujo compacto. No se ha ejecutado una sesión de lector de pantalla; la constatación se basa en la estructura DOM y el árbol accesible observado, no en una afirmación de haber oído anuncios.

**Corrección esperada:** mantener una región de estado accesible fuera del contenido colapsado, con mensajes breves para conexión/desconexión, carga/listo y fallos, y detalle ampliable. Evitar anuncios por heartbeat o por cada reporte de cámara. Verificar que una transición con Mesa cerrada sigue exponiendo la región viva y, cuando sea viable, validar los anuncios con tecnología asistiva.

## Comprobaciones realizadas

- Código revisado: composición `ServiceApp`, cliente SSE/comandos, presencia `TableSession`, publicación y cámara DM, hidratación/readiness/cámara Player, estilos de Mesa y pruebas asociadas. SHA-256 de `ServiceApp.tsx`, `table-client.ts`, `App.tsx`, `PlayerApp.tsx` y `table-session.ts` coincide con `ronda-1/huellas.json` al terminar.
- Servicio real iniciado con `pnpm start:api`, build entregado `out/api` + `out/web`, Node 24.15.0 y pnpm 11.1.2. Datos propios bajo `/private/tmp/ttrpg-ux004.*`, claves exclusivamente de prueba y puerto 8814. El primer arranque bajo `/tmp` fue rechazado por el control de ruta física; se corrigió a `/private/tmp`. No se usó biblioteca personal.
- Acceso DM y jugador por CUA. Antes de publicar, el jugador mostró «Esperando al DM» y no mostró controles privados. Publicación explícita de escena vacía y después de un mapa real (logo existente del proyecto, 1254×1254) produjo la vista Player y «Jugador listo» en el DM.
- Mesa mostró enlace seleccionable sin clave, instrucciones de navegador/perfil independiente, identidad del preview y las dos limitaciones de privacidad. Escape desde el campo del enlace cerró el panel y devolvió el foco al summary Mesa, comprobado en el árbol accesible.
- Zoom local desbloqueado funcionó y el DM distinguió «Vista libre». Durante el corte se conservó la imagen, herramientas y controles locales; el resumen indicó desconexión. La recuperación automática y la ausencia de doble conexión funcionaron, con la regresión de encuadre descrita.
- Capturas visuales inspeccionadas por CUA del jugador durante y después del corte, viewport natural de Chrome 1680×912. No se guardaron imágenes como archivos ni se modificaron overrides globales.
- `pnpm test src/web/ServiceApp.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/infrastructure/browser/table-client.test.ts`: **4 archivos / 35 tests PASS**, duración 1.41 s. Acredita regresiones dirigidas de acceso/recuperación, foco en diálogos, herramientas, hidratación y transporte, pero no sustituye el recorrido conjunto que encontró UX-1.
- Consulta final de consola mediante CUA: sin entradas `warn` o `error` en ambos clientes.

## Alcance y límites

La evidencia de construcción para dados abiertos/ocultos, tarjetas, turnero, puntero, áreas, revocación de assets, resoluciones 1440×900/1024×768/1920×1080 y Electron se leyó como evidencia atribuida al constructor/orquestador; no se presenta como verificación propia. Esta revisión no repitió esos recorridos, la suite completa ni builds, ni auditó exhaustivamente los bytes privados de HTTP/SSE. Tampoco probó expiración real de ocho horas, TLS/proxy, múltiples equipos físicos o promoción manual de un segundo jugador. Las pruebas dirigidas incluyen recuperación de sesión y herramientas locales; no acreditan por sí solas su interacción con el ciclo de presencia del DM.

Las dos pestañas propias se cerraron. El proceso temporal se reanudó antes de terminarlo, y `lsof` confirmó que el puerto 8814 quedó sin listener. CUA queda libre para la revisión UI. Los datos temporales no se integran al repositorio. Este informe se publica por archivo temporal y renombrado; no constituye aprobación de merge.
