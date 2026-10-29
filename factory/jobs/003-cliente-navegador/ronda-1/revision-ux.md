VEREDICTO: CAMBIOS

# Revisión UX — 003, ciclo 1, ronda 1

Revisión independiente de AGENTS.md, perfil UX, solicitud, spec, build, revision.md y código real. No se editaron implementación, Git ni tablero. Los hallazgos requieren corrección antes de aceptar la experiencia descrita por la spec.

## Hallazgos

### UX-003-01 — P1: falta el flujo para conectar otra escena guardada

**Evidencia de código:** `src/renderer/src/App.tsx:3013` obtiene candidatos exclusivamente con `listInternalSceneLinkCandidateMaps(scene, scene.activeMapId)`. En `App.tsx:4973` se pasan esos mapas a `SceneLinkModal`; su `onConnect` termina en `connectInternalSceneLink` (`App.tsx:1056–1081`). `src/renderer/src/components/annotations/SceneLinkModal.tsx:136–171` solo ofrece “Mapa destino”/“Punto de entrada” de esa colección, o pide agregar otro mapa a la misma escena. La búsqueda de consumidores en fuentes confirma que `selectSceneLinkTargetFile`, `listSceneLinkCandidates` y la conexión remota están implementadas en el adaptador pero no invocadas por el renderer.

**Impacto:** un DM con dos escenas guardadas no puede seleccionar la segunda ni crear el enlace externo desde el producto. Tampoco puede reparar un destino local importado sustituyéndolo por una escena del servicio. No basta la integración HTTP que conecta recursos directamente: falta el acceso de usuario requerido. La documentación y build afirman ese selector como disponible.

**Corrección esperada:** incorporar una selección accesible de escena guardada y marcador, con carga/error/reintento/cancelación, y conectar mediante el contrato real de servicio manteniendo también los enlaces internos. Verificar el recorrido completo desde App, incluyendo reparación de referencia importada y conservación del trabajo ante fallo. Actualizar la evidencia para distinguir implementación HTTP y flujo UI. Esta constatación procede de lectura del código real, no de un humo visual de conexiones que no se realizó.

### UX-003-02 — P2: los nuevos diálogos pierden el foco al cerrarse en App real

**Reproducción CUA contra API real:** entrar como DM, abrir “Menu de escena” → “Cargar escena”, comprobar estado vacío y pulsar Escape desde “Cancelar”. El diálogo se cierra correctamente, pero la lectura DOM de solo lectura devuelve `document.activeElement.tagName === 'BODY'`, sin etiqueta accesible; AX confirma foco en la página. También se observó foco en página después de guardar una escena nueva desde el botón superior y confirmar su nombre.

**Causa contrastada:** `src/web/dialogs.tsx:19` captura el elemento activo al montar y restaura únicamente mediante `trigger.focus()` durante cleanup. El menú se cierra antes de iniciar la acción (`WorkspaceHeader.tsx:34–36`), ocultando el disparador; además, guardar/cargar deshabilita los disparadores durante la operación (`WorkspaceHeader.tsx:51–52,63`). Estar conectado al DOM no basta para que pueda recibir foco. El test de restauración usa un botón auxiliar siempre visible/habilitado y no reproduce estas condiciones.

**Impacto:** teclado y lector de pantalla pierden el punto de continuidad tras una operación habitual. Contradice la aceptación explícita de restaurar foco al disparador y exige volver a localizar controles del VTT.

**Corrección esperada:** conservar un destino visible/habilitado para restauración (por ejemplo, el resumen del menú cuando su acción queda oculta), y restaurarlo después de liberar el estado ocupado. Añadir una prueba con App/WorkspaceHeader reales y comprobar con navegador Escape/cancelación/confirmación, tanto desde menú como desde botón superior.

## Comprobaciones efectuadas

- API de producción local `127.0.0.1:8873`, Node 24.15.0, build 3.4.0 existente, almacenamiento creado en `/private/tmp/ttrpg-ux003.*` y claves temporales. El primer intento con `/tmp` fue rechazado por la validación de ruta física; se corrigió sin tocar perfiles personales.
- IAB Chromium mediante CUA exclusivamente: acceso DM con teclado; VTT real; selector vacío comprensible; Escape del selector; PNG temporal de 900×600 subido mediante selector; render de mapa; guardar con nombre “Revisión UX 003”; cambio de nombre de mapa; cerrar sesión muestra guardar/descartar/cancelar; cancelar conserva la edición; “Guardar y continuar” regresa al acceso.
- Acceso jugador posterior: únicamente estado explícito de proyección aún no disponible y controles locales; no nombres de escena, paneles o datos del DM en snapshot visible. Logout devuelve acceso.
- Lectura de código de protección de cambios: cargar/importar/logout consultan `allowServiceLeave`; fallo de guardado devuelve false; exportar conserva identidad; importación valida antes de sustituir; 401 oculta/inertiza App y mantiene memoria para reautenticar DM; errores y estado pendiente de login están diferenciados.
- Ejecución propia: `pnpm exec vitest run src/web/ServiceApp.test.tsx src/infrastructure/browser/browser-client.test.ts src/infrastructure/browser/files.test.ts src/renderer/src/App.workspace.test.tsx` — **4 archivos, 35 tests PASS**, 2,60 s. Aviso conocido de jsdom `HTMLCanvasElement.getContext` sin paquete canvas; no se toma como evidencia visual. Incluye errores/reintento, roles/expiración, cancelación/descartado, fallo al guardar y adaptador.
- Pestaña CUA cerrada y proceso API temporal detenido. Sin cambios de viewport ni datos personales.

## Límites

Esta revisión no repitió toda la batería ni el humo Electron/labs ya descrito por construcción. Importación/exportación, bibliotecas, enlaces HTTP, recuperación tras corte de red, reemplazo de mapa inactivo y tamaños 1024/1440/1920 se contrastaron con fuentes/pruebas/evidencia de construcción, pero no se presentan como recorridos CUA propios. No se realizó una auditoría completa de cada herramienta del canvas ni de todos los formularios de biblioteca. La aprobación queda pendiente por los dos hallazgos concretos anteriores, aunque las pruebas focalizadas pasen.
