VEREDICTO: CAMBIOS

## Alcance

Revisión independiente de código del trabajo 001, ciclo 1, ronda 1, sobre los archivos enumerados en revision.md. Leídos AGENTS.md, perfil codigo.toml, package.json, solicitud.md, spec.md, build.md y revision.md; inspeccionados contratos/reexports, preload, composición, App/PlayerApp, hooks, todos los consumidores modificados, pruebas nuevas y documentación/versionado. No se consultaron otras revisiones ni se modificaron código o Git.

La extracción conserva las firmas y los modelos existentes; los contratos solo importan tipos. La composición permite ausencia explícita y precedencia del proveedor, conserva API requerida y carece de registro global mutable. La versión deriva de package.json (3.2.0), con changelog y matriz de paridad. No se observan cambios de esquema de escena, dependencias, canales IPC ni reglas de coordenadas. Sin embargo, hay tres defectos que impiden aceptar los criterios de independencia y regresión.

## Hallazgos

### C1 — P2: borrar un área local queda condicionado a la proyección

**Archivo/líneas:** `src/renderer/src/App.tsx:910-925`, especialmente 911-914.

Se añadió una salida temprana cuando `playerApi` no está disponible en `handleDeleteInformationArea`. El cuerpo restante solo modifica la escena/interacción local; no requiere Player ni transporte. Un montaje sin bridge o con `capabilities.player = false` permite trabajar con anotaciones, pero el borrado por esta acción ahora muestra «La proyeccion no esta disponible en este cliente» y conserva el área. Además, el callback mantiene dependencias vacías: si el cliente inicialmente carecía de Player, continúa rechazando el borrado después de inyectar uno que sí lo tiene.

**Reproducción:** montar App con `client={null}` o con proyección deshabilitada; crear/usar un área desbloqueada y accionar su eliminación desde el editor/listado que invoca `handleDeleteInformationArea`. Se toma el retorno de la línea 913 antes de `removeInformationArea`. La inspección del diff confirma que la comprobación no existía antes de esta spec.

**Corrección esperada:** conservar el borrado local sin exigir proyección; cubrir el flujo sin cliente y con Player deshabilitado. Mantener las comprobaciones de bloqueo del área. Afecta aceptación 5 y 9.

### C2 — P2: un reporte en vuelo envía la cámara del nuevo cliente al cliente anterior

**Archivo/líneas:** `src/renderer/src/PlayerApp.tsx:75-110`, especialmente 100-107; lifecycle 218-276.

`flushPlayerCameraReport` captura `playerApi`, pero su `finally` usa refs que se reutilizan después de cambiar cliente y agenda su propia función antigua. El cambio de proveedor no invalida la generación ni restablece la operación en vuelo/cola. Si A tiene un reporte pendiente, B no puede enviar mientras `isCameraReportInFlightRef` sigue activo. Al terminar A, su `finally` observa la cola de B y la vacía mediante el callback que todavía llama a A. Si A no termina, los reportes B permanecen bloqueados.

**Reproducción corroborada:** ejecuté en Node el cuerpo real del callback extraído/transpilado desde PlayerApp, con las mismas refs compartidas y promesas controladas: iniciar A con cámara x=1; sustituir por B mientras A espera; encolar x=99 en B; resolver A y ejecutar el timer. Resultado observado: `{"oldClientCameras":[1,99],"newClientCalls":0}`. Es una comprobación dirigida del callback, no un humo Electron ni una prueba de montaje completa.

**Corrección esperada:** vincular cola, operación en vuelo y finalización a la generación de cliente; cancelar/inutilizar timers y finalizaciones antiguas, permitir que B reporte sin esperar A y evitar que un callback A consuma datos de B. Añadir prueba React con promesa A diferida y cambio de proveedor. Afecta aceptación 2 y 3.

### C3 — P2: las bibliotecas aceptan respuestas del cliente sustituido

**Archivo/líneas:** `src/renderer/src/components/aside/NpcLibraryModal.tsx:41-76`; patrón equivalente en `MonsterLibraryModal.tsx` y `PlayerCharacterLibraryModal.tsx`.

El efecto relanza `refresh` al cambiar API, pero su cleanup únicamente cancela el timer de debounce. Una consulta A ya iniciada continúa aplicando `setEntries`, `setImageUrls`, feedback y loading después del cambio a B. Por ello puede sustituir las entradas de B por datos de A; la acción de añadir sigue disponible y permite incorporar esa entrada ajena a la escena actual. Desactivar la capacidad tampoco invalida la respuesta pendiente. No basta con cambiar las dependencias de `useCallback`.

**Reproducción corroborada:** ejecuté el cuerpo real de `refresh` de NpcLibraryModal con promesas controladas: consulta A pendiente, consulta B completada, resolución tardía A. Resultado observado: `{"activeClient":"B","visibleEntries":["A"]}`. El efecto solo limpia un timeout y no contiene mecanismo que impida este orden. Esta comprobación dirigida no modifica archivos de implementación.

**Corrección esperada:** invalidar resultados anteriores al cambiar cliente/desmontar o iniciar otra consulta, incluyendo resolución de imágenes y actualización de indicadores; vaciar/inutilizar resultados pertenecientes al cliente anterior cuando la capacidad quede ausente. Revisar el mismo patrón en las tres bibliotecas y añadir cobertura de respuestas fuera de orden entre clientes. Afecta aceptación 2, 3 y 5.

## Verificaciones realizadas

- `pnpm typecheck`: PASS, salida 0.
- `pnpm lint`: PASS, salida 0.
- `pnpm test src/renderer/src/client/ClientProvider.test.tsx src/preload/index.test.ts src/renderer/src/App.workspace.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/renderer/src/PlayerApp.map-image.test.tsx`: PASS, 5 archivos / 40 pruebas. Aparece el aviso conocido de canvas no implementado por jsdom.
- `git diff --check`: PASS.
- Búsqueda `window.ttrpg` en producción: una única coincidencia en `client/ClientProvider.tsx:10`.
- Comprobaciones dirigidas con promesas diferidas de C2/C3: reproducen los resultados descritos. Se ejecutaron desde stdin usando TypeScript instalado; no se añadieron tests ni cambios al código congelado.
- Revisión de cobertura nueva: comprueba precedencia, aislamiento entre raíces, limpieza de suscripciones, revisiones de dados y versión; no cubre respuestas pendientes durante sustitución ni borrado local sin Player.

## Limitaciones y aceptación

No repetí build completo, suite completa ni sesión Electron. build.md registra 110 archivos / 1005 pruebas, build satisfactorio, verificación del preload construido y humo parcial; esos resultados son evidencia del constructor, no ejecuciones de este revisor. Sus límites de diálogos, guardado/carga manual y teclado están declarados. Las comprobaciones propias no contradicen esos pases: los hallazgos son caminos no cubiertos.

Solicito corregir C1-C3 y verificar los casos específicos antes de una nueva ronda. La extracción y documentación son adecuadas, pero los pases existentes no demuestran el lifecycle completo exigido por esta spec.
