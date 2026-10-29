VEREDICTO: CAMBIOS

## Alcance

Revisión independiente de 003, ciclo 1/ronda 2, según el perfil codigo.toml. Se conserva el contexto de AGENTS.md, solicitud y spec; se leyó build.md actualizado y ronda-2/revision.md/huellas.json, y se inspeccionó el código real de los 22 archivos modificados desde ronda 1. No se leyeron informes ajenos.

Las 509 huellas de esta ronda coinciden al inicio y al cierre de la revisión. Se mantienen versión 3.4.0, formato de escena 2, TypeScript estricto y ausencia de dependencias nuevas. La extensión de SceneWarning solo agrega un código de resultado, sin alterar el formato persistido. Se revisaron también confinamiento de portales, limpieza de listeners, restauración acotada de foco y documentación de la corrección.

## Cierre de hallazgos anteriores

- **C-003-01: corregido.** SceneLinkModal ofrece la selección remota y sus marcadores; App consume selectSceneLinkTargetFile/listSceneLinkCandidates/connectSceneLink, guarda la fuente antes de conectar y aplica anotaciones solo tras éxito. Las pruebas de App cubren conexión, fallo sin aplicar y reparación de referencia heredada. El build registra además un recorrido CUA real, atribuido al constructor.
- **C-003-02: corregido.** SceneLinksService.connect acumula modificaciones por escena utilizando el documento ya actualizado, por lo que cambiar A:a de B:b a B:c libera B:b. La reproducción independiente de ronda 1 ahora pasa. La nueva integración HTTP comprueba además cambio a otra escena y disponibilidad; permanece la prueba de rollback.
- **C-003-03: corregido.** HttpTransport expone una señal de ciclo de sesión que se aborta también ante 401; selector, nombre y lectura local capturan esa señal. La reproducción independiente anterior ahora pasa sin llamar browser.clear. Las pruebas nuevas cubren selector y file.text tardíos después de 401/resume, sin POST.

El cierre de esos tres casos no cubre la transición siguiente, ahora accesible desde el mismo modal con sus alternativas interna y remota.

## Hallazgo pendiente

### C-003-04 — P2: cambiar una conexión remota a un mapa interno deja ocupado el extremo remoto anterior

**Ubicación:** `src/renderer/src/App.tsx:1069`–1080, conectado desde la alternativa interna de `src/renderer/src/components/annotations/SceneLinkModal.tsx`. Causa de dominio relevante: `src/domain/annotations/internal-scene-links.ts:133`–136.

El modal permite configurar tanto un destino de otra escena como otro mapa de la escena abierta. Si el marcador ya está conectado a otra escena, pulsar «Conectar habitaciones» sigue llamando a connectInternalSceneLink y guardando únicamente la escena actual. disconnectExistingInternalPeer retorna sin hacer nada cuando la conexión anterior no tiene mapId; no hay llamada a disconnectSceneLink ni rechazo preventivo. App muestra «Conexion interna guardada» mientras el marcador de la escena remota conserva la conexión anterior, ya sin reciprocidad.

**Reproducción:**

1. Crear la escena A con dos mapas: marcador a en el primero y c libre en el segundo. Crear B con b libre.
2. Desde el flujo nuevo, conectar A:a con B:b.
3. Reabrir el editor de A:a, elegir el segundo mapa de A y c en «Mapa destino»/«Punto de entrada»; pulsar «Conectar habitaciones», sin pulsar «Desligar» previamente.
4. A:a queda conectado internamente con A:c y se guarda correctamente. B:b sigue apuntando a A:a, queda ocupado en candidatos y falla la validación/navegación de su enlace.

Se ejecutó una reproducción con SceneLinksService, SceneService, ServiceStore/SQLite y connectInternalSceneLink reales, siguiendo exactamente la secuencia de dominio/guardado de handleConnectSceneLink. Tras guardar A con el nuevo enlace interno, la aserción de B:b `connection === null` falla y devuelve su conexión remota anterior. No depende de datos personales, mocks de persistencia ni de simultaneidad.

**Corrección esperada:** impedir que la alternativa interna sobrescriba una conexión remota sin liberar ambos extremos. Puede hacerse mediante una transición consistente del servicio, o rechazando expresamente la acción y solicitando usar «Desligar» antes de continuar; en ese caso no debe alterarse ni guardarse la conexión original. Cubrir el recorrido del modal/App y comprobar B:b después de la transición (o su conservación íntegra si se rechaza), además del comportamiento ante fallo de desconexión. La ruta inversa tampoco debe producir éxito parcial.

**Impacto y alcance:** se rompe la reciprocidad requerida por la spec y queda un destino ocupado que necesita reparación manual. Es una integración faltante entre las dos opciones del flujo recién completado, no una solicitud de refactor ajeno a 003.

## Verificaciones ejecutadas

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts src/infrastructure/browser/files.test.ts src/web/ServiceApp.test.tsx src/renderer/src/App.workspace.test.tsx src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx`: PASS, 5 archivos/56 pruebas, 4.40 s. Advertencia conocida de canvas no implementado en jsdom.
- SHA-256 de ronda-2/huellas.json: 509 archivos, ninguna diferencia.
- Reproducciones independientes temporales: **2 PASS** (C-003-02/C-003-03 originales), **1 FAIL confirmado** (C-003-04).

Archivo temporal reproducible: `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc/reconnect.test.ts`, con vitest.config.mts vecino. Comando utilizado:

```sh
pnpm exec vitest run --root /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc --config /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-003-code-review-ppt9nwxc/vitest.config.mts
```

Las bases temporales se cierran y eliminan mediante finally. La prueba adicional relevante se llama `switching a remote connection to an internal map releases the remote peer`.

## Limitaciones

No repetí la suite completa, builds ni humo CUA de build.md; se conserva su atribución original. No se ejecutó UI por scripts ni se tomó el turno CUA de UX. El hallazgo combina recorrido comprobado de App/modal con reproducción real de sus operaciones de dominio y persistencia. No se modificó implementación, Git ni tablero. Se necesita corregir C-003-04 y revisar nuevamente para aprobar.
