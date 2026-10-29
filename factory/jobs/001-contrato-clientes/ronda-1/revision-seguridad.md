VEREDICTO: APROBADO

# Revisión de seguridad — 001 contrato de clientes

Fecha: 2026-10-28. Ciclo 1, ronda 1. Revisión independiente del código congelado sobre `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

## Alcance revisado

Se leyeron `AGENTS.md`, el perfil `seguridad.toml`, `solicitud.md`, `spec.md`, `build.md` y la identidad/diff de `ronda-1/revision.md`. Se inspeccionaron directamente los nuevos contratos, composición, pruebas y documento de arquitectura, además del diff real de preload, App, PlayerApp, hooks y consumidores de imágenes/bibliotecas/combate/dados. No se consultaron revisiones de otros especialistas.

Se contrastaron también los límites existentes de Electron, CSP, autorización de dados/mapas y generación de snapshots. La revisión evalúa las modificaciones de este trabajo; los cambios anteriores de la fábrica no se atribuyen a esta spec.

## Hallazgos priorizados

No se identificaron hallazgos bloqueantes ni regresiones de seguridad demostrables introducidas por este cambio.

## Evidencias

1. **Contrato sin privilegios de ejecución.** `src/shared/api/ttrpg-api.ts:1` y `src/shared/api/dice-api.ts:1` importan modelos únicamente por tipo. Sus interfaces/resultados no ejecutan Electron, filesystem, React ni repositorios. `src/shared/api/client.ts:1` solo incorpora por tipo la API; la implementación crea objetos de composición y copia/congela capacidades. Los reexports históricos conservan la declaración opcional del bridge sin añadir APIs genéricas.

2. **Sin ampliación del bridge ni relajación de Electron.** El diff de `src/preload/index.ts:4` añade únicamente la importación de versión de package y reemplaza el literal anterior. No cambia canales, wrappers IPC ni listeners. Se preservan `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true` en `src/main/index.ts:49` y `src/main/ipc/player-window-ipc.ts:199`; esos archivos no tienen cambios en el diff. Tampoco cambia `src/renderer/index.html`, incluido su CSP existente. La aprobación no significa una auditoría integral o endurecimiento de ese CSP.

3. **Ausencia e inyección explícitas.** `src/renderer/src/client/ClientProvider.tsx:6` diferencia falta de proveedor (`undefined`) de ausencia explícita (`null`). El bridge solo se consulta cuando falta proveedor; el cliente inyectado prevalece y no existe registro global mutable. La búsqueda de `window.ttrpg` en producción devolvió únicamente `ClientProvider.tsx:10`. Las pruebas comprueban ausencia con bridge presente, capacidad deshabilitada, llamadas de App y un consumidor anidado, aislamiento de dos raíces Player y liberación de listeners bajo StrictMode/cambio/desmontaje.

4. **Capacidades no presentadas como autorización.** `src/shared/api/client.ts:3` y `docs/client-architecture.md` establecen expresamente esa distinción. La matriz enumera operaciones nativas, propuestas de servicio y roles pendientes; las rutas locales y `SceneOperationResult.filePath` no se presentan como permisos para leer el servidor. El documento exige autorización por rol y filtrado antes de transmitir snapshots, notas, bibliotecas y tiradas ocultas. No se introduce HTTP, autenticación ficticia ni un backend inseguro bajo apariencia de implementado.

5. **Dados y remitentes conservados.** `src/main/ipc/dice-ipc.ts:13` valida ventana y frame principal; sus handlers privados siguen restringidos al DM y `dice:public-state` entrega el estado público. Los parsers existentes siguen rechazando payloads malformados. `usePublicDice` conserva el consumo de presentación pública en lugar del historial DM. La suite IPC ejecutada comprueba rechazo de Player/externos/subframes en operaciones privadas, ausencia de transmisión de tiradas ocultas, validación de datos y tamaños. Los tests de mapa comprueban el rechazo de remitentes no autorizados antes de abrir el diálogo.

6. **Persistencia y exposición de contenido sin nuevas superficies.** No hay cambios en main, dominio, infraestructura, SQL, protocolos de assets o esquemas de escena. Los cambios de consumidores sustituyen la fuente de API manteniendo las operaciones tipadas existentes. No se añaden lectores libres de archivos, interpolación SQL, HTML sin sanitización, URLs externas, secretos ni llamadas de red. `createPlayerSceneSnapshot` y el motor de privacidad de dados permanecen sin cambios. El documento identifica correctamente que los snapshots locales actuales no constituyen una frontera de seguridad remota.

7. **Preload construido verificado independientemente.** Se ejecutó `out/preload/index.cjs` en una VM de Node con un sustituto acotado de Electron que rechaza cualquier otra dependencia. Resultado: versión `3.2.0`, igual a `package.json`; único `require`: `electron`; 67 métodos expuestos. La versión se incorpora en build, sin acceso nuevo al filesystem desde renderer/preload sandboxed.

## Comprobaciones ejecutadas por esta revisión

`pnpm exec vitest run src/preload/index.test.ts src/renderer/src/client/ClientProvider.test.tsx src/main/ipc/dice-ipc.test.ts src/main/ipc/map-ipc.test.ts`

Resultado: **4 archivos y 28 pruebas aprobados**, salida 0. Aviso de jsdom por `HTMLCanvasElement.getContext` sin implementación nativa; no produjo fallos. Se inspeccionaron los tests y no se interpretan los dobles como transporte HTTP ni como humo Electron real.

Se comprobó además el diff de las fronteras privilegiadas y la búsqueda global del bridge, y se ejecutó la verificación VM del bundle descrita arriba.

## Límites y conclusión

No se repitieron las 1005 pruebas completas, typecheck, lint ni build: sus resultados son evidencia del constructor, separada de las 28 pruebas ejecutadas aquí. No se abrió otra instancia Electron ni se recorrieron diálogos nativos; el humo y sus omisiones están identificados en `build.md`. No se verificó seguridad de un servidor futuro porque está expresamente fuera del alcance y no existe en esta entrega.

La composición aísla la selección de API por raíz; no debe interpretarse como aislamiento entre cuentas, tenants o documentos privados ni como autorización de métodos. Los datos locales, cachés y snapshots requieren las decisiones de seguridad previstas antes de ofrecer un servicio remoto. Esa limitación está documentada y no se presenta como una garantía implementada.

Con el alcance local de esta spec, la evidencia es suficiente para aprobar seguridad. No se modificaron código, configuración, Git, tablero ni informes ajenos; la única salida de revisión es este archivo.
