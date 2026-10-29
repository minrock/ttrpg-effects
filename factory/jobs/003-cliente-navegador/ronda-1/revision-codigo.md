VEREDICTO: CAMBIOS

## Alcance

Revisión independiente del ciclo 1/ronda 1 de 003. Leídos AGENTS.md, perfil codigo.toml, package.json, solicitud, spec, build y revisión/huellas. Inspeccionados adaptador HTTP/navegador, composición de sesión/diálogos, integración App/PlayerApp, imágenes/notas, importación de mapas, enlaces/estáticos/persistencia del servicio, pruebas, configuración y documentación del alcance. No se consultaron informes de otros revisores.

Las 507 huellas coinciden con el árbol revisado. Se mantiene TypeScript estricto, versión de aplicación 3.4.0 y formato de escena 2; la composición web reutiliza el VTT y las capacidades impiden invocar continuamente transporte de proyección ausente. La separación de contratos, referencias opacas y validación de resultados tiene cobertura pertinente. Los siguientes defectos impiden aceptar la funcionalidad completa declarada.

## Hallazgos

### C-003-01 — P1: falta el flujo de UI para conectar y reparar enlaces entre escenas

Ubicación: `src/renderer/src/App.tsx:4973`–4976; `src/renderer/src/App.tsx:1057`–1080; `src/renderer/src/components/annotations/SceneLinkModal.tsx:139`–184. Contrato implementado pero sin consumidor: `src/infrastructure/browser/browser-client.ts:94`–96.

El modal recibe únicamente `candidateMaps` de la escena abierta y su callback llama a `connectInternalSceneLink`. No hay llamadas del renderer a `selectSceneLinkTargetFile`, `listSceneLinkCandidates` ni `connectSceneLink`. Por tanto, el selector de escenas sí sirve para cargar/importar, pero no para elegir el destino de un enlace. La existencia de endpoints y pruebas que llaman directamente al adaptador no completa este flujo de producto.

Reproducción por recorrido de código: guardar dos escenas A/B con un marcador en cada una; abrir el editor del marcador A. Si A tiene un solo mapa, el modal pide agregar otro mapa a esa misma escena. No ofrece B ni sus marcadores y no puede crear la conexión recíproca con ella. Un enlace heredado roto tampoco puede repararse eligiendo una escena del servicio. Esto contradice la aceptación de «Enlaces entre escenas» y la afirmación del selector en docs/browser-client.md/build.md.

Corrección esperada: incorporar elección accesible de escena guardada y marcador remoto, persistir/proteger cambios pendientes, invocar el contrato real y aplicar el resultado sin afirmar conexión parcial ante un fallo. Mantener también los enlaces internos. Añadir una prueba de App/modal que atraviese el flujo hasta la operación remota y otra de reparación de referencia heredada; ajustar la matriz de evidencia al resultado observado.

### C-003-02 — P2: reconectar a otro marcador de la misma escena destino deja un extremo huérfano

Ubicación: `src/server/scene-links.ts:35`–39.

Al reconectar, se prepara la desconexión del destino anterior en `updates.set(old.id, ...)`. Si el nuevo marcador pertenece a esa misma escena destino, `updates.set(target.id, ...)` reemplaza esa actualización con una copia tomada de `target.scene` anterior a la desconexión. La transacción guarda un documento consistente como JSON, pero con reciprocidad rota: el marcador antiguo sigue apuntando al origen que ya apunta al marcador nuevo.

Reproducción ejecutada contra SceneLinksService + SceneService + SQLite real en directorio temporal: crear A con marcador a y B con b/c; conectar A:a → B:b; conectar A:a → B:c; releer B. c está conectado, pero b conserva la conexión anterior (se esperaba `connection === null`). El endpoint devuelve éxito; b queda ocupado y la validación/navegación posterior falla.

Corrección esperada: acumular las mutaciones por identidad de escena sobre el documento ya modificado, de manera que liberar b y conectar c sobrevivan en una única escritura de B. Cubrir reconexión dentro de la misma escena destino, cambio a otra escena y rollback; comprobar ambos extremos y disponibilidad del marcador liberado.

### C-003-03 — P2: la expiración no invalida selectores y lecturas de archivos del adaptador

Ubicación: `src/web/ServiceApp.tsx:14`, `src/infrastructure/browser/browser-client.ts:37`–39 y 69–76; `browser.clear()` al final del mismo archivo.

El callback de 401 cierra el diálogo del broker y oculta App. HttpTransport aborta solicitudes HTTP, pero el AbortController que protege selectores/lecturas pertenece a createBrowserClient y solo se aborta mediante `browser.clear()` (logout/desmontaje). La recuperación usa `http.resume()` sin invalidar ese controlador. Una selección o lectura de archivo iniciada antes del 401 puede completar después y pasar `ensureActive`, subir/importar y entregar un resultado del contexto anterior. La prueba existente de selector obsoleto llama explícitamente `browser.clear()`, por lo que verifica logout, no el recorrido real de expiración.

Reproducción ejecutada con adaptador real y transporte/selector diferidos: iniciar openMapImage; provocar 401 en una segunda solicitud; recuperar el transporte como hace login; completar el selector anterior. Se produce un POST /assets y el resultado es exitoso; el test esperaba cero uploads. El problema también alcanza importFile mientras espera file.text, pues utiliza el mismo controlador.

Corrección esperada: invalidar la generación de operaciones de navegador y abortar selectores/lecturas ante 401, sin eliminar la escena retenida para recuperación. Tras autenticar, solo las operaciones iniciadas en la nueva generación deben poder subir/aplicar datos. Cubrir el recorrido de ServiceApp ante expiración, además de logout, y las respuestas de selector/lectura que finalizan tarde.

## Verificaciones ejecutadas

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts src/infrastructure/browser/files.test.ts src/web/ServiceApp.test.tsx src/renderer/src/App.workspace.test.tsx`: PASS, 4 archivos/35 pruebas, 2.94 s. Advertencia conocida de canvas no implementado en jsdom.
- Comparación SHA-256 de ronda-1/huellas.json: 507 archivos, cero diferencias.
- Dos reproducciones adicionales fuera del repositorio: FAIL esperado en ambas, confirmando C-003-02 y C-003-03. Archivo `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc/reconnect.test.ts`; configuración vecina `vitest.config.mts`. Comando: `pnpm exec vitest run --root /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc --config /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc/vitest.config.mts`. SQLite temporal cerrado y eliminado mediante finally; ninguna biblioteca personal se abrió.

## Límites

No repetí los builds, la suite completa ni el humo navegador/Electron aportados en build.md; no los atribuyo a esta revisión. No se controló UI mediante scripts ni se requirió CUA para estos hallazgos: C-003-01 se verifica en el cableado real del modal/consumidores y los otros dos con reproducciones de comportamiento aisladas. No se modificó implementación, Git ni tablero. Los éxitos de pruebas existentes no cubren los recorridos defectuosos descritos; se requiere otra revisión tras corregirlos.
