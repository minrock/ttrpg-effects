# Plan — 62 Servicio exclusivamente web

**Spec fuente:** [spec.md](spec.md), revisión 0.1. **Estado:** implementado y validado localmente en 3.35.0 por builders y PM; sin integración Git. **Fecha:** 2026-11-17.
**Base inspeccionada:** `feature/spec-62-solo-web`, `4dc2786584346e9c70120f03e4c94669f03e5880`, producto 3.34.0. Al iniciar solo existía la nueva spec sin rastrear; la ficha UX se escribió durante la consulta. La rama y la implementación fueron autorizadas; commit/push/merge/migraciones reales quedan fuera.

El diseño aprobado y sus restricciones se conservan como referencia. El resultado ejecutado figura en el cierre de este plan y en [validacion.md](validacion.md); TL únicamente mantiene estos artefactos documentales.

## Decisiones por capa

| Capa | Cambio acordado | Archivos / contratos |
| --- | --- | --- |
| Composición nativa | Retirar entradas, ventanas, menú, preload, IPC y adaptadores exclusivamente Electron | `src/main/**`, `src/preload/**`, `src/infrastructure/file-system/**`, `src/renderer/index.html`, `src/renderer/src/main.tsx` |
| Build y operación | Convertir comandos principales al servicio; retirar Electron y DMG; setup solo de API | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.js`, `electron.vite.config.ts`, `scripts/build-dmg.sh`, `scripts/setup-env.sh`, `.env.electron.example`, `src/server/environment-setup.test.ts` |
| Cliente y vistas | Composición explícita, sin bridge/UA/autosave autónomo/menús nativos; solo dados del servicio | `ClientProvider`, `App`, `PlayerApp`, `WorkspaceHeader`, `src/shared/api`, adaptadores `src/infrastructure/browser`, tests/lab/stories afectados |
| Núcleo y servidor | Conservar reglas, formatos, API, autenticación, runtime y persistencia | `src/domain`, `src/application`, `src/server`, `src/infrastructure/server`, repositorios SQLite compartidos |
| Documentación | Sustituir plataforma vigente sin reescribir historia | AGENTS/README, SDD/guías, contextos y contratos de agentes; propietario PM |

No se añaden dependencias de producto. T-01 añadió `pnpm-workspace.yaml` para declarar `allowBuilds.esbuild`; T-02 incorporó los cuatro archivos de licencia/atribución de `dice-box-threejs` y `kenney-casino-audio` a `src/renderer/public/licenses/`, conservando sus fuentes. Se conserva la ubicación del editor en `src/renderer/src` y de assets en `src/renderer/public`; el build web y el watcher ya usan esos assets. No se ejecuta una limpieza general de módulos puros ni se renombra todo contrato con terminología heredada.

## Núcleo compartido y contratos de integración

La ruta final es `src/web/main.tsx` → `ServiceApp` → `GameEditor` / `GuestEntry` → `ClientProvider` explícito → `App` / `PlayerApp` → clientes browser HTTP/SSE. El servidor sigue entrando por `src/server/index.ts` y `openServiceApi`; no requiere Electron hoy.

Contrato acordado para la tanda paralela:

1. Frontend es propietario de `src/shared/api/**` y de todos sus consumidores browser/React/tests. Retira `LOCAL_CAPABILITIES`, `nativeMenus` y los callbacks exclusivamente nativos (`onRecentSceneOpen`, `onOpenMonsterTemplateManager`) cuando complete sus referencias. `ClientProvider` recibe `TtrpgClient | null`; sin proveedor equivale a ausencia recuperable, nunca consulta un global.
2. Frontend cambia imports de tipos desde preload hacia los contratos compartidos. Backend elimina preload/main sin crear reexports ni shims nativos nuevos. Hasta la barrera de integración pueden existir errores transitorios de imports: no se certifica typecheck a mitad de la retirada.
3. Se conservan `TtrpgApi`, `saveSceneToPath`, `openPlayerWindow`, `PlayerWindowSnapshot` y contratos de dados usados por el servicio. Sus nombres no implican privilegios: browser usa `scene:<id>` y publicación HTTP. No eliminar `DiceRollSession` ni la capa de tipos de dados: `table-session.ts` todavía los reutiliza.
4. Frontend elimina las ramas autónomas de `useDiceSession` / `usePublicDice`, `useDiceSizes` y `DicePanel` solo después de sustituir los consumidores en App/PlayerApp. Se mantienen `useServiceDiceSession`, `ServiceDicePanel`, overlays, compositor, simulación Worker y reglas puras. El estado de servicio incompatible/ausente continúa visible; no hay fallback local.
5. Se retira el respaldo autónomo `sessionStorage` del editor; se mantienen `draft-coordinator`, IndexedDB y borradores remotos del servicio. Cámara, selección y otros estados visuales locales no son por sí mismos Electron y no se eliminan.
6. `src/infrastructure/database/sqlite-entity-library-repository.ts` y `sqlite-monster-library-repository.ts` siguen usados por `src/infrastructure/server/service-store.ts` y compatibilidad/transferencia: conservarlos. Igual para lectores de escenas y referencias históricas. El inventario de consumidores determina las retiradas.

## Comandos finales

| Comando | Contrato final |
| --- | --- |
| `pnpm dev` | Alias de `pnpm start:api`, supervisor actual API + web del mismo origen |
| `pnpm build` | Alias de `pnpm build:service`, TypeScript + API + web |
| `pnpm start` | Alias de `pnpm start:api:built`, artefacto estable sin vigilancia |
| `build:api`, `build:web`, `build:service`, `start:api`, `start:api:built`, `dev:api`, `dev:web` | Se conservan con su semántica vigente |
| Storybook y CLIs de identidad/datos/migración/invitaciones | Se conservan |
| `dist:mac`, `dev:service`, `start:service` y build DMG | Se retiran; no se conserva un alias que vuelva a iniciar Electron |

`package.json` pierde `main`, el objeto de configuración de electron-builder y las dependencias/permisos de build exclusivos de Electron. `setup-env.sh` deja de leer, crear, validar o cambiar permisos de `.env.electron`; conserva validación y permisos privados de `.env`, rechazo de symlinks pertinentes y ausencia de creación de cuentas/migración implícita. Los archivos privados existentes permanecen intactos.

## Seguridad, concurrencia y operación

La retirada no modifica roles, cookies, controles Host/Origin, autorización al confirmar/entregar, CSP, proyección pública ni los contratos HTTP/SSE. El navegador continúa sin filesystem/SQL/secreto de servidor. Preservar cancelación e identidad de cliente, invalidación por cuenta/apertura, suscripciones y recursos de canvas al cambiar de contexto.

Los locks `control.lock` de SQLite y `runtime-lease.ts` de PostgreSQL se conservan. Las instalaciones independientes requieren bases/almacenamientos, secretos y hosts propios; cambiar solo el puerto del mismo host no aísla cookies. Varias réplicas compartiendo una base siguen fuera de alcance. No se añade Django, Redis, bus, contenedores ni despliegue.

No se modifican migraciones, esquema 12, `.ttrpgscene` v2/lector v1 ni transferencia v5/lectores v1–v5. No se leen/borran/migran datos operativos para validar. La configuración y antiguos perfiles/DMGs del usuario no se eliminan junto con las fuentes de empaquetado.

## Decisiones UI/UX

Consulta resuelta con `/root/ux_web_only`: [UX-62 — servicio solo web](../../guias/ui-ux/servicio-solo-web.md). Mantener nombre de escena como texto, Guardar y Jugador explícitos, Herramientas responsive y menú de campaña independiente. Eliminar detección UA Electron y su dropdown de escena/mapa; no trasladar Nueva/Cargar/Importar/Exportar nativos a controles nuevos. Jugador publica por HTTP, nunca anuncia apertura de ventana nativa.

Storybook conserva datos sintéticos y proveedor explícito/null; actualizar textos de plataforma. El lab Player utiliza proveedor con doble explícito. Las pruebas de componentes compartidos se adaptan sin globals; los casos exclusivamente de ventanas/menús/hooks autónomos se retiran con esas capacidades. Conservar comprobaciones de guardado, cancelación y contexto mediante acciones web existentes o pruebas de los casos de uso, sin inventar UI para satisfacer tests antiguos.

No se necesita un prototipo nuevo: se conserva la interfaz web ya decidida. Validar cabecera y acciones a 1440/390 px, zoom 200 %, teclado/Escape/retorno de foco y ausencia de estados falsos de conexión según la ficha. Los navegadores soportados no se amplían por esta retirada.

## Secuencia y paralelismo

Se ejecutó la secuencia de [tareas.md](tareas.md): T-01 backend y T-02 frontend con propiedad coordinada, T-03 documentación del PM y T-04 validación integrada posterior. Durante la implementación, el PM repartió los tests de renderer entre dos builders sin conflictos; esa asignación de pruebas no cambió la propiedad del producto ni los contratos acordados.

La instalación/regeneración del lockfile pertenece solo a T-01 y se serializa: avisar al PM antes/después, no ejecutar `pnpm` desde otro agente mientras cambien dependencias. No compartir `node_modules` con snapshots que ejecuten autoinstalación pnpm 11. Un checkout de QA usa dependencias propias o un mecanismo que no escriba el almacén compartido. Los builds comparten `out/` y `storybook-static/`: ejecutar una sola tanda final, no dos builds concurrentes sobre las mismas salidas.

## Validación proporcional

| Criterio | Prueba / recorrido | Entorno / evidencia esperada |
| --- | --- | --- |
| CA-01 | Inventario de imports y manifest/lock; ausencia de main/preload/entradas desktop; builds | Checkout autorizado; lista de retiradas y excepciones históricas/guardrails justificadas |
| CA-02 | Tests ClientProvider/consumidores/lab y guard Storybook; sin globals ni detección UA | Vitest + montaje Storybook sintético |
| CA-03 | Tests GameEditor/recuperación/cliente contextual y smoke crear escena en arco, editar, guardar, recargar | API/SQLite sintéticos y navegador; IDs/contenido conservados |
| CA-04 | Tests de publicación y dados servicio; DM publica, invitado recibe/lanza y se aplican permisos de cierre | Dos contextos browser, API sintética; sin datos privados en jugador |
| CA-05 | `pnpm build`, builds independientes si no quedaron cubiertos, `build-storybook`; smoke `dev` y `start` con cierre | Entorno temporal sin `.env` operativo; health/HTML/JS correctos y puertos liberados |
| CA-06 | Suite general y pruebas dirigidas de setup/formato/compatibilidad; diff de código persistente | Configuración sintética; migraciones y modelos sin cambios |
| CA-07 | Revisión de guías, rutas y comandos y diferencias históricas | PM/TL, sin ejecución productiva |
| CA-08 | Lint/typecheck, suite general completa, builds, evidencia por criterio y cleanup | `validacion.md`, logs privados y procesos/puertos comprobados |

Comandos base finales: `pnpm typecheck`, `pnpm lint`, `pnpm test --exclude '**/.local/**' --maxWorkers 4`, `pnpm build`, `pnpm build-storybook`. La suite amplia cubre los tests dirigidos incluidos; no repetirlos después de una corrida completa verde salvo cambios/fallos nuevos. `build` debe construir API/web; no hace falta repetir ambos builds idénticos para inflar evidencia.

Los contratos adicionales `test:db`, `test:owned`, `test:invitations`, `test:moderation` no se presentan como reejecutados por haber pasado en 3.34.0. En este delta no cambia persistencia/autoridad: preservar archivos y comprobar importabilidad/recorridos. Si durante la implementación cambia un repositorio, migración, handler, transacción o autorización compartidos, elevar al PM y ejecutar la suite contractual afectada con SQLite y PostgreSQL real temporal/TLS y checkout sin `.env`. No usar la DB del usuario ni omitir un gate afectado silenciosamente.

Cada proceso de smoke tiene responsable, PID/puerto registrados y cierre en `finally`; detener watchers y descendientes, comprobar puerto libre. La API operativa permanece detenida y el PostgreSQL preexistente del usuario no se toca.

## Decisiones pendientes y cierre

No quedan decisiones de negocio pendientes para este alcance. Las decisiones de producto provienen de la spec 0.1 y la consulta UX-62; cualquier traslado de funcionalidad nativa a UI nueva o modificación de persistencia ampliaría el alcance y vuelve al PM.

Backend completó la versión 3.35.0 y su changelog; frontend completó la composición web y el PM verificó la entrega integrada. T-01, T-02, T-03 y T-04 quedan completadas localmente, con resultados comunicados por los ejecutores y detallados en [validacion.md](validacion.md).

| Comprobación final ejecutada por builders/PM | Resultado comunicado al cierre |
| --- | --- |
| Typecheck y lint | PASS |
| Suite general | PASS: 166 archivos, 1417 pruebas |
| `pnpm build` y `pnpm build-storybook` | PASS: API + web y catálogo con guard de imports |
| Smoke `pnpm dev` / `pnpm start` | Configuración sintética; health 3.35.0 y HTML 200; procesos cerrados |
| Navegador integrado DM | Campaña → arco → escena; círculo guardado y recargado; radio 150 pendiente recuperado desde IndexedDB tras cerrar/reabrir y luego guardado |
| Navegador integrado jugador | Publicación explícita, ingreso con alias, dos tiradas públicas con cierre por autor y por DM; historial conservado |
| Responsive/teclado | Editor a 1440 px; 390 px sin overflow, Escape y retorno de foco |
| Chrome Storybook | Cabecera al 200 % de zoom nativo, DPR 4 y viewport/scrollWidth 840; callback Jugador; zoom restablecido al 100 % y pestaña cerrada |
| Limpieza | Puertos 8877/6006/8787/8766 libres y lock sintético ausente; todos los servidores QA cerrados |

No se reejecutaron los 219 contratos backend de 3.34.0: persistencia y autoridad no cambiaron y su evidencia continúa siendo histórica. No hubo commit, push, merge, despliegue ni operaciones sobre datos reales. La participación TL en este cierre fue documental; no ejecutó esos gates/recorridos ni inició servidores.
