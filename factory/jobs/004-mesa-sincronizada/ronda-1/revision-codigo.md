VEREDICTO: CAMBIOS

# Revisión independiente de código — 004, ciclo 1, ronda 1

Fecha: 2026-10-29. Revisor: `codigo_004`. Rama de referencia: `feature/fabrica-software`; HEAD de la ronda `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Se comprobaron las 519 huellas de `huellas.json`: ninguna diferencia. No se modificaron implementación, pruebas del repositorio, Git, tablero ni informes ajenos.

## Alcance

Se contrastaron `AGENTS.md`, perfil `codigo.toml`, solicitud, spec, build, identidad de ronda, paquete/changelog y código de la proyección pública, sesión de mesa/dados, rutas HTTP/SSE, autorización de assets, contratos, adaptador navegador y composición DM/Player. Se revisó la integración de estados, publicación explícita, imágenes de tarjetas/combate, suscripciones, temporizadores y regresiones automatizadas relacionadas. La versión es 3.5.0 con entrada minor fechada; no se introduce dependencia ni modificación de formato `.ttrpgscene`. Se mantiene TypeScript estricto y la separación principal aplicación/transporte/vista.

La proyección se reconstruye en servidor, el permiso de assets depende de su conjunto vigente y las pruebas HTTP ejercitan cookies y streams separados. Estos aspectos y las comprobaciones estáticas pasan, pero dos defectos de integración incumplen la conservación de cámara y el límite de reportes aceptados.

## Hallazgos

### COD-004-01 — P2: una reconexión SSE recentra involuntariamente al jugador

**Ubicación:** `src/infrastructure/browser/table-client.ts:114-116`; consumidor en `src/renderer/src/App.tsx:1485-1493`. La nueva identidad de conexión se crea en `src/application/services/table-session.ts:55-61`.

Cuando el stream jugador se reconecta, cambia `primaryId`. El adaptador DM emite `closed` y `ready`; el listener heredado de App interpreta `ready` como apertura y ejecuta `sendPlayerCameraCommand("open")`. La orden tiene revisión nueva y llega a todos los jugadores, que la aplican incluso si su cámara local ya estaba inicializada. Con ello un corte de red termina moviendo el encuadre sin una acción explícita del DM. La conservación aislada del snapshot en PlayerApp no evita esta orden adicional.

**Reproducción corroborada:** prueba temporal `REVIEW reconectar Player vuelve a ordenar open sin acción DM` en `/private/tmp/ttrpg-code-review-004/review.test.tsx`. Monta App real con BrowserTableClient y TableSession reales; únicamente controla el stream y sustituye viewport/operaciones periféricas. Tras conectar jugador y reportar navegación local `{center:{x:800,y:900},zoom:2}`, cierra y reabre su conexión. Sin interacción DM, App invoca exactamente una nueva orden `reason:"open"`, con cámara `{center:{x:0,y:0},zoom:1}`. La prueba pasa afirmando ese comportamiento defectuoso. En uso real: publicar, desplazar/zoom local Player, interrumpir/restaurar su stream manteniendo DM abierto; el encuadre vuelve a la cámara principal.

**Corrección esperada:** distinguir recuperación/promoción de presencia de una orden explícita de apertura/recentrado en el transporte de servicio. Restaurar estado y reportes al reconectar sin generar una orden de cámara nueva; conservar la apertura local Electron. Añadir regresión integrada DM–adaptador–Player que navegue localmente antes de reconectar y compruebe ausencia de una nueva orden y conservación del encuadre. Cubre aceptación 4, 6 y 7, y la cláusula de bootstrap sin reiniciar navegación local.

### COD-004-02 — P2: el emisor de cámara incumple el intervalo que exige el servidor

**Ubicación:** `src/application/services/table-session.ts:93` en combinación con `src/renderer/src/PlayerApp.tsx:135-136` y el vaciado inmediato de cola en `PlayerApp.tsx:105-112`. Propagación visible del error: `src/infrastructure/browser/table-client.ts:177`.

El servidor rechaza reportes intermedios separados por menos de 100 ms, pero PlayerApp programa reportes cada 80 ms. Además, cuando termina un reporte en vuelo, puede vaciar inmediatamente el siguiente sin considerar el instante del último envío. Con red local rápida, la navegación ordinaria genera respuestas 409 aunque no haya contexto/cámara inválidos. El adaptador convierte esos rechazos en el error visible «Espera antes de enviar otro reporte»; las respuestas exitosas posteriores no limpian por sí mismas ese error. El reporte final puede llegar, pero hay tráfico rechazado y feedback de fallo durante una acción válida.

**Reproducción corroborada:** prueba temporal `REVIEW reporta cada 80ms y el servidor rechaza navegación normal` en `/private/tmp/ttrpg-code-review-004/review-player.test.tsx`. Monta PlayerApp real, publica el mismo snapshot en TableSession y conecta su reporte directamente a la validación real, con reloj controlado. Tres cambios continuos de cámara producen envíos en `[80,160,240]` ms y el servidor rechaza el de `160` ms. La prueba pasa afirmando ambos resultados. La primera ejecución del arnés omitió publicar su mapa y rechazó todos los reportes por contexto de mapa; se corrigió esa preparación antes de obtener el resultado descrito.

**Corrección esperada:** aplicar un límite real de diez reportes intermedios por segundo, considerando el último envío y la cola en vuelo, y conservar el reporte final obligatorio. No basta con silenciar los 409 ni cambiar solo el temporizador si el vaciado inmediato aún puede exceder el límite. Añadir prueba de navegación continua con respuestas rápidas y lentas, sin errores de cuota internos y con posición final recibida. Cubre aceptación 6 y 7 y el requisito explícito de throttle de cámara.

## Verificaciones ejecutadas

- `pnpm test src/application/services/public-table-projection.test.ts src/server/table-http.test.ts src/infrastructure/browser/table-client.test.ts src/infrastructure/browser/browser-client.test.ts src/web/ServiceApp.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/App.workspace.test.tsx`: **7 archivos, 73 pruebas PASS**. Incluye HTTP real con datos temporales, privacidad, assets/revocación, deduplicación, límites y regresiones de UI/adaptador.
- `pnpm typecheck`: **PASS**.
- `pnpm lint`: **PASS**.
- `git diff --check`: **PASS**; operación exclusivamente de lectura.
- `pnpm exec vitest run --root /private/tmp/ttrpg-code-review-004 --config /private/tmp/ttrpg-code-review-004/vitest.config.mjs -t REVIEW`: **2 pruebas de reproducción PASS**, 34 pruebas heredadas del arnés omitidas por filtro. Los temporales no son cambios del repositorio y verifican los defectos actuales, no las correcciones esperadas.
- Comparación SHA-256 de `ronda-1/huellas.json`: **519 archivos, 0 diferencias** al finalizar las verificaciones.

Vitest/jsdom muestra el warning conocido de `HTMLCanvasElement.getContext` sin canvas nativo. No impide las verificaciones ni representa evidencia de render GPU.

## Limitaciones y evidencia de entrega

No se operó UI/CUA ni se repitieron humo visual, Electron, build completo o despliegue; se consultó la evidencia atribuida en `build.md` sin presentarla como ejecución de este revisor. La reproducción de cámara comprueba la orden involuntaria mediante la integración de código real con transporte controlado; no afirma haber capturado visualmente un navegador recentrándose. Las pruebas de render físico/replay y el humo manual permanecen con el alcance declarado por construcción.

Los tests existentes que preservan cámara tras `onScene(initial)` no incluyen el evento de presencia que dispara la orden DM; por eso pasan a pesar de COD-004-01. Los tests de límite de servidor comprueban rechazos de reportes cercanos, pero no hacen pasar el ritmo del emisor Player real por esa validación; por eso no detectan COD-004-02. Se requiere corregir ambos y añadir las regresiones integradas antes de aprobar código.
