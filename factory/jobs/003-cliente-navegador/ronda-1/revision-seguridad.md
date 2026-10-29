VEREDICTO: CAMBIOS

# Revisión de seguridad — 003, ciclo 1, ronda 1

Revisión independiente del contenido congelado en `huellas.json`. Se comprobaron las 507 huellas y no hay diferencias. Se leyeron AGENTS.md, perfil seguridad, solicitud, spec, build y revisión de ronda; se contrastaron los contratos y construcciones 001/002 como base, sin consultar informes de otros revisores.

## Hallazgos que requieren corrección

### P1 — Los diálogos privados permanecen visibles e interactivos tras expirar la sesión

**Ubicación:** `src/web/ServiceApp.tsx:33`, en combinación con `src/renderer/src/components/aside/ModalBackdrop.tsx:65–84` y `src/renderer/src/components/aside/ReplaceMapImageModal.tsx:39–63`.

Al recibir un 401 se conserva App montada para recuperar los cambios y se aplican `hidden` e `inert` a `.service-workspace`. Los modales de notas, fichas y bibliotecas utilizan `createPortal(..., document.body)`, por lo que no pertenecen a ese contenedor DOM. Permanecen visibles, con controles operativos y z-index 1000, sobre la pantalla de recuperación. El cierre del DialogBroker en la línea 14 solo afecta los diálogos de servicio; no cierra estos portales. La persistencia en memoria está permitida por la spec, pero su exposición en la pantalla bloqueada no lo está.

**Reproducción:** acceder como DM, abrir una biblioteca/ficha privada o un editor de nota, expirar la sesión del servidor y realizar desde el modal una consulta de biblioteca o selección/subida de imagen que devuelva 401. El contenedor principal se oculta mientras el portal sigue mostrando la información privada. El modal también puede impedir ver correctamente el formulario de recuperación.

**Evidencia ejecutada:** prueba jsdom temporal usando ServiceApp, HttpTransport y ModalBackdrop reales; el contenido de App se sustituye por un modal mínimo que consulta el cliente real inyectado. Después del 401 se verifica simultáneamente `Recuperar sesión`, wrapper con `hidden`, texto privado todavía en `.modal-panel` y ausencia de cualquier ancestro `[hidden]` o `[inert]` para el modal. Reproducción confirmada. Las implementaciones reales NoteEditModal, NoteViewModal y NpcLibraryModal usan ese mismo ModalBackdrop.

**Corrección esperada:** hacer que todos los portales privados participen de la frontera de sesión, por ejemplo mediante un destino de portales dentro del contenedor protegido, o suspender/cerrar su presentación manteniendo los borradores en memoria. Cubrir notas, bibliotecas, fichas y preview de reemplazo; no basta ocultar App. Añadir una prueba de expiración con al menos un portal real y comprobar que los datos/controles no siguen visibles ni alcanzables hasta autenticar de nuevo como DM.

### P2 — Un selector de archivo anterior al 401 puede continuar en la sesión recuperada

**Ubicación:** `src/web/ServiceApp.tsx:14,28`; `src/infrastructure/browser/browser-client.ts:37–39,69–78`; `src/infrastructure/browser/http.ts:13,24`.

El 401 invalida y aborta solicitudes HTTP, pero no invalida el AbortController independiente de createBrowserClient. Ese controlador solo se aborta mediante `browser.clear()`, llamado al salir o desmontar. Tras `http.resume()`, una selección o lectura de archivo que comenzó antes de expirar puede pasar `ensureActive()` y efectuar un upload/import en la nueva sesión. Esto incumple el descarte de operaciones de sesiones anteriores anunciado por la spec y por build.md. No implica escalación de rol del servidor; es una falla de aislamiento del ciclo de vida y puede aplicar una operación antigua después de recuperar el trabajo.

**Evidencia ejecutada:** iniciar `openMapImage()` con selector diferido; provocar un 401 por HttpTransport; autenticar nuevamente y llamar `resume()` como hace ServiceApp; resolver el selector antiguo. Su señal sigue sin abortar, aparece una nueva petición POST `/api/v1/assets` y la operación devuelve `ok:true`. Prueba temporal confirmada con transporte real y respuestas HTTP controladas. La prueba incluida `selector pendiente de sesión anterior...` llama manualmente a `browser.clear()`, por lo que no cubre el camino efectivo de expiración.

**Corrección esperada:** invalidar también los selectores, lecturas locales y operaciones compuestas al expirar, sin perder la escena/borradores recuperables. Compartir una generación de sesión o notificar la invalidación al adaptador, verificándola después de cada espera relevante. Añadir regresión 401 → reautenticación → resolución tardía; no debe producir POST ni resultado exitoso.

## Alcance revisado y garantías conservadas

- Sesión y roles: cookie administrada por navegador con `credentials: same-origin`; servidor autoriza el rol DM antes de los endpoints privados, incluidos los nuevos enlaces/candidatos. La composición de jugador no monta App ni habilita capacidades privadas. Login borra el campo de clave y el logout no declara éxito antes de confirmar la API.
- Transporte: respuestas JSON/esquemas verificadas, errores de red/status distinguibles; se descartan cuerpos HTTP tardíos después de invalidación. El problema P2 está en operaciones que todavía no habían iniciado su siguiente solicitud HTTP.
- Archivos y assets: selector nativo del navegador, límites de tamaño/tipo, referencias UUID y correspondencia reference/url verificadas. Referencias locales, `file:`, protocolos Electron y URLs externas no se resuelven. Los nuevos endpoints de enlaces no abren rutas del host.
- Estáticos: revisión de validación de path, `realpath`, confinamiento al build, rechazo de ocultos/symlinks externos, extensiones, métodos y fallback. API y assets inexistentes no se transforman en index.html. CSP de producción conserva script-src self, sin unsafe-eval, y restringe conexiones/imágenes al origen; no hay relajación del aislamiento Electron.
- Notas: imágenes se transforman exclusivamente desde `asset:UUID`; renderer Markdown escapa referencias/texto y conserva DOMPurify. ServiceImage genera nodos DOM seguros y no convierte referencias importadas en URL arbitraria.
- Enlaces/persistencia: schemas estrictos para referencias/acciones, consulta por IDs, SQL parametrizado, revalidación de escenas y transacción de ambos extremos. La prueba de rollback ante fallo del segundo guardado pasa.
- Frontera Electron: 003 no amplía preload ni IPC privilegiado. Se revisaron las adaptaciones compartidas de recurso/reemplazo de mapas y la composición de entradas. La autorización del servidor no depende de capacidades React.

## Verificaciones ejecutadas y límites

- `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts src/web/ServiceApp.test.tsx src/server/auth.test.ts src/server/http.test.ts`: **4 archivos, 68 pruebas aprobadas**.
- `pnpm exec vitest run --config /private/tmp/ttrpg-003-security-review/vitest.config.mjs`: **2 pruebas aprobadas que reproducen los dos defectos**, no pruebas de que estén corregidos. Fuente temporal: `/private/tmp/ttrpg-003-security-review/privacy.test.tsx`. El primer intento del arnés no encontró el archivo por el alias macOS `/tmp`; se corrigió la raíz a `/private/tmp` y los dos casos ejecutaron correctamente.
- Verificación SHA-256 de las 507 entradas de huellas.json: **sin diferencias**.
- No se modificó código, Git, tablero ni otros informes. Las pruebas HTTP existentes usaron sus almacenes y puertos temporales; no se abrió la biblioteca personal.
- No se realizó una nueva inspección visual CUA ni se reclama reproducción visual manual de los defectos. La evidencia propia consiste en inspección de código, pruebas HTTP reales existentes y pruebas de integración jsdom expresamente permitidas. El humo CUA/build completo de build.md se reconoce como evidencia del constructor, no como ejecución de este revisor.

Ambos hallazgos deben corregirse y verificarse antes de aceptar la garantía de privacidad y descarte de operaciones de la sesión navegador.
