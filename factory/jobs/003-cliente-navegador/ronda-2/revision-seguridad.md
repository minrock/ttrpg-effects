VEREDICTO: APROBADO

# Revisión de seguridad — 003, ciclo 1, ronda 2

Revisión independiente de las correcciones de ronda 1 y de las regresiones relevantes. Se leyeron build.md actualizado y ronda-2/revision.md; se compararon las huellas entre rondas y se inspeccionó el código real afectado. Se mantienen las instrucciones de AGENTS.md y del perfil seguridad leídas en la revisión inicial. Las 509 entradas de ronda-2/huellas.json coinciden con el contenido actual. No se consultaron revisiones de otros agentes de esta ronda.

## Cierre de hallazgos anteriores

### P1 — Portales privados fuera del contenedor protegido: corregido

`src/web/ServiceApp.tsx` crea el destino de portales dentro de `.service-workspace` y monta App bajo `PortalTargetProvider` solamente cuando ese destino existe. `ModalBackdrop`, `ReplaceMapImageModal` y el portal de DicePanel usan el destino provisto. El inventario de `createPortal` del código de producción no revela otro portal privado que siga escribiendo directamente en body fuera de esta frontera.

Al recibir 401, tanto la vista como sus modales conservan los borradores dentro del mismo ancestro hidden/inert. No se necesita desmontar App ni perder el trabajo para ocultarlo. ReplaceMapImageModal comprueba además el estado oculto/inert antes de ejecutar su listener global de teclado; el código de restauración de foco también evita objetivos ocultos/inert.

Evidencia propia:

- La reproducción temporal de la ronda anterior, adaptada únicamente para exigir el comportamiento corregido, confirma que el modal real queda bajo un ancestro `[hidden][inert]` después del 401.
- ServiceApp.test verifica el portal real, el rechazo de recuperación con rol jugador y la recuperación del borrador intacto al volver a autenticar DM.
- ReplaceMapImageModal.test verifica confinamiento del preview y que Escape no actúa mientras su contenedor está bloqueado, volviendo a funcionar al recuperarlo.

### P2 — Selector anterior al 401 aceptado tras recuperar sesión: corregido

`HttpTransport` incorpora `sessionSignal`: toda invalidación aborta la señal de sesión y crea la siguiente. El adaptador captura esa misma señal antes de esperar selector de escena, nombre, archivo o lectura local, y la verifica al continuar. Ya no existe el AbortController independiente que sobrevivía a la expiración. `resume()` no revive señales anteriores y `clear()` conserva la invalidación común.

Evidencia propia:

- La reproducción temporal inicia un selector, provoca 401, realiza login con respuesta DM válida y resume el transporte. Al resolver el selector antiguo, su señal está abortada, el resultado es `ok:false` y no aparece el POST de asset.
- Las regresiones del repositorio cubren por separado selector tardío y `file.text()` tardío después de 401, sin recurrir a `browser.clear()` como sustituto del camino real de expiración. Ambas impiden una nueva petición de escritura.
- Siguen pasando los casos de cuerpos HTTP exitosos y fallidos que llegan después de invalidación, así como el bloqueo de operaciones privadas mientras la sesión está vencida.

## Revisión de regresiones y fronteras conservadas

- El flujo nuevo de conexión entre escenas consume el selector de IDs del servicio y candidatos validados; no solicita rutas del host. La UI presenta nombres y referencias como texto React. La autorización DM sigue ocurriendo en servidor antes de los endpoints de enlaces/candidatos.
- `SceneLinksService.connect` acumula modificaciones por identidad antes de escribir, conservando la desconexión del extremo anterior cuando comparte escena con el nuevo. La reparación de un destino ausente informa la limitación y no intenta abrir la ruta heredada. Se conservan schemas, revalidación recíproca, SQL parametrizado y transacción; pasan reconexión dentro de una escena, cambio a otra y rollback ante fallo del segundo guardado.
- Sin cambios de ronda 2 en autenticación del servidor, política Host/Origin, rutas privadas, archivos estáticos, CSP, validación de imágenes ni los resolvers seguros de assets. Se reejecutaron pruebas de autorización/HTTP, referencias locales rechazadas, fallback estático y respuestas inválidas. No se observó debilitamiento de esas garantías.
- Los cambios compartidos de portales tienen fallback a body para Electron local; no amplían preload/IPC ni conceden privilegios al cliente web. La entrada jugador mantiene capacidades privadas desactivadas y no monta App.
- La corrección del código de advertencia de enlace es compatible con el formato de escena; no introduce deserialización nueva ni interpreta las referencias heredadas como rutas.

No quedan hallazgos de seguridad bloqueantes demostrados en el alcance revisado.

## Verificación ejecutada

- `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts src/web/ServiceApp.test.tsx src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx src/server/auth.test.ts src/server/http.test.ts src/renderer/src/App.workspace.test.tsx`: **6 archivos, 101 pruebas aprobadas**. Advertencia conocida de jsdom sobre canvas sin implementación; ninguna prueba falló.
- `pnpm exec vitest run --config /private/tmp/ttrpg-003-security-review/vitest.config.mjs`: **2 pruebas independientes aprobadas**, ahora exigiendo la corrección de ambos defectos. Fuente temporal: `/private/tmp/ttrpg-003-security-review/privacy.test.tsx`.
- Comparación SHA-256 de las 509 huellas de ronda 2: **sin diferencias**.

Las pruebas HTTP utilizan almacenamiento y puertos temporales. No se modificaron implementación, Git, tablero, informes ajenos ni biblioteca personal. Solo se publica este informe mediante temporal y renombrado.

## Límites

No realicé acciones UI ni un nuevo humo CUA/Electron. El humo real de expiración con formulario NPC y recuperación de borrador descrito en build.md es evidencia del constructor; se distingue de mis comprobaciones por código, HTTP y jsdom. Tampoco repetí todos los builds ni la suite completa: la verificación propia se concentró en los defectos y las fronteras que podían sufrir regresión. Esta aprobación técnica de seguridad no autoriza merge, despliegue ni operaciones Git.
