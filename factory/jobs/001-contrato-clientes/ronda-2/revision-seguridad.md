VEREDICTO: APROBADO

# Seguridad — contrato común de clientes, ronda 2

Fecha: 2026-10-28. Trabajo 001, ciclo 1. Rama `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

## Alcance y evidencia revisada

Se releyeron perfil de seguridad, solicitud, spec, build actualizado y la identidad de revisión de ronda 2. Se conservan las instrucciones AGENTS.md ya leídas y la inspección independiente de ronda 1. No se consultaron informes de otros revisores de ronda 2.

Se compararon las huellas de ambas rondas para delimitar el retrabajo: App, PlayerApp, las tres bibliotecas, pruebas workspace/composición/bibliotecas y documentación. Se inspeccionó su código real, diff contra HEAD y las nuevas pruebas. La comprobación SHA-256 de los **466 archivos** de `ronda-2/huellas.json` no encontró ninguna discrepancia con el árbol revisado.

## Hallazgos priorizados

No hay hallazgos bloqueantes de seguridad ni regresiones demostrables atribuibles a este cambio. Las correcciones revisadas refuerzan el descarte de respuestas que pertenecen a un cliente anterior.

## Correcciones contrastadas

- **Bibliotecas:** `src/renderer/src/components/aside/MonsterLibraryModal.tsx:45`, `NpcLibraryModal.tsx:41` y `PlayerCharacterLibraryModal.tsx:58` invalidan generaciones y reinician formularios al cambiar API. Los efectos de consulta vacían resultados/imágenes, cancelan timers y comprueban la cancelación después de recibir resultados y URLs; también protegen feedback e indicadores en catch/finally. Los resultados de guardado comprueban su generación antes de volver a modificar la UI. Así una consulta o imagen tardía de A no sustituye los datos visibles de B. La nueva suite parametrizada ejerce este comportamiento en las tres bibliotecas, incluida indisponibilidad y desmontaje.
- **Cámara Player:** `src/renderer/src/PlayerApp.tsx:92` captura la generación al despachar el reporte y la compara al finalizar. El cleanup de `PlayerApp.tsx:268` invalida esa generación, descarta la cola y libera el indicador de petición pendiente. La prueba deja la respuesta de A pendiente, cambia a B y verifica que la cámara nueva llega a B antes de resolver A; al resolver A no se envían datos nuevos al cliente antiguo. No se añade ningún canal ni permiso.
- **Borrado de áreas:** `src/renderer/src/App.tsx:910` vuelve a tratar la eliminación como edición local, manteniendo `canDeleteMapAnnotation`. Retirar la condición de disponibilidad de Player no elimina una validación de seguridad: las capacidades representan disponibilidad de operaciones, no autorización. La suite workspace comprueba ausencia de cliente, Player deshabilitado y área bloqueada.
- **Documentación:** `docs/client-architecture.md` explica el descarte de respuestas antiguas de bibliotecas y reportes de cámara sin declarar autenticación, autorización remota o aislamiento de tenants implementados. Mantiene la advertencia de que rutas locales/snapshots deben adaptarse antes del servicio futuro.

## Fronteras de seguridad conservadas

El contrato compartido, reexports y composición mantienen las mismas huellas de ronda 1. Los modelos se importan por tipo; no incorporan ejecución de Electron, Node, filesystem o repositorios. `ClientProvider.tsx:6` distingue proveedor ausente de `client={null}` y el cliente inyectado prevalece sobre el bridge. La búsqueda de `window.ttrpg` fuera de tests/labs sigue devolviendo solo la frontera de `ClientProvider.tsx:10`.

El diff sigue sin tocar main, dominio, infraestructura, CSP ni configuración de build. Se mantienen las opciones de aislamiento Electron y sandbox, los wrappers específicos de preload, los validadores de payload/remitente, los esquemas de escena, SQL y protocolos locales. El retrabajo no añade HTML sin sanitizar, URLs externas, secretos ni transporte de red. No amplía las capacidades nativas ni crea accesos libres al filesystem.

La protección de dados privados continúa en main: la suite IPC ejecutada comprueba remitentes/subframes no autorizados, payloads inválidos y que una tirada oculta no se publique ni aparezca en el estado Player. Las pruebas de mapa comprueban rechazo del remitente antes del diálogo. La aprobación es del alcance local actual, no certificación de seguridad del servidor futuro.

## Verificación independiente de esta ronda

Comando ejecutado:

`pnpm exec vitest run src/preload/index.test.ts src/renderer/src/client/ClientProvider.test.tsx src/renderer/src/components/aside/LibraryClientLifecycle.test.tsx src/main/ipc/dice-ipc.test.ts src/main/ipc/map-ipc.test.ts src/renderer/src/App.workspace.test.tsx`

Resultado: **6 archivos / 49 pruebas aprobados**, salida 0. Hubo dos avisos conocidos de jsdom por `HTMLCanvasElement.getContext` sin paquete canvas nativo; ninguna prueba falló. Se inspeccionó el contenido de las pruebas; sus dobles no se interpretan como un servicio HTTP ni como humo Electron.

Se volvió a ejecutar el bundle `out/preload/index.cjs` en una VM con un sustituto acotado de Electron y rechazo de otros `require`: **versión 3.2.0**, igual a package; **67 métodos**; **única dependencia requerida: electron**. Se verificaron también huellas y búsqueda del bridge.

## Límites

No se repitieron aquí typecheck, lint, build ni las 1018 pruebas completas informadas por el constructor; se distinguen de los 49 casos ejecutados en esta revisión. Tampoco se repitió humo Electron/CUA ni diálogos nativos. El build documenta qué humo corresponde a la primera ronda y cuál a la corrección UI.

Las capacidades no son una frontera de autorización; la selección de API por raíz tampoco promete aislamiento entre cuentas o tenants de todos los datos/cachés locales. Los snapshots actuales y rutas requieren el filtrado y adaptación previstos para futuras specs. No se declara ese servicio implementado ni validado.

La evidencia es suficiente para aprobar seguridad en esta ronda. Se conservó intacto el informe de ronda 1; no se modificaron código, configuración, Git, tablero ni informes ajenos. Única salida nueva: este informe, publicado mediante archivo temporal y renombrado.
