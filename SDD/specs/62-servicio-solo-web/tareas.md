# Tareas técnicas — 62 Servicio exclusivamente web

**Spec:** [revisión 0.1](spec.md). **Plan:** [plan.md](plan.md). **Fecha:** 2026-11-17. **Estado:** T-01–T-04 completadas por builders/PM en 3.35.0; entrega integrada en `main` mediante `9521af9`. TL mantiene únicamente la documentación.
**Base:** `feature/spec-62-solo-web` / `4dc2786584346e9c70120f03e4c94669f03e5880` (3.34.0). **Decisiones pendientes:** ninguna para el alcance actual. **UX:** [UX-62](../../guias/ui-ux/servicio-solo-web.md).

## Mapa

| ID | Resultado | Criterios | Responsable | Dependencias / barrera | Estado de ejecución |
| --- | --- | --- | --- | --- | --- |
| T-01 | Retirada nativa, dependencias y comandos de servicio | CA-01, CA-05, CA-06, CA-08 parcial | backend_builder | Integrada con T-02 | Completada |
| T-02 | Editor/jugador y contratos con composición exclusivamente web | CA-02, CA-03, CA-04, CA-06 parcial | frontend_builder | Integrada con T-01 | Completada |
| T-03 | Plataforma y operación vigentes documentadas | CA-07, CA-08 parcial | pm | T-01/T-02 verificadas | Completada |
| T-04 | Validación integrada, revisión y cierre sin procesos vivos | CA-01–CA-08 | pm, con evidencia de builders | T-01, T-02, T-03 completadas | Completada |

El PM despachó la implementación y confirmó el cierre de las cuatro tareas. Las fichas siguientes conservan el alcance/condiciones del encargo original; los resultados están en [validacion.md](validacion.md). No equivalen a autorización o ejecución de Git/despliegue.

## T-01 — Retirar el producto Electron y establecer comandos web

- **Objetivo:** ningún entrypoint, dependencia o comando de producto inicia/empaqueta Electron; el servicio Node/web conserva su operación.
- **Criterios:** CA-01/05 completos en su frente; CA-06/08 parciales hasta validación integrada.
- **Responsable:** backend_builder. No está solo; no revierte cambios de frontend/PM.
- **Lectura:** `src/server/index.ts`, `src/server/vite.config.ts`, `src/web/vite.config.ts`, `scripts/watch-service.mjs`, `src/infrastructure/server/service-store.ts`, contratos compartidos y plan.
- **Escritura exclusiva:** retirar `src/main/**`, `src/preload/**`, `src/infrastructure/file-system/**`, `electron.vite.config.ts`, `scripts/build-dmg.sh`, `.env.electron.example`; editar `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.js`, `scripts/setup-env.sh`, `src/server/environment-setup.test.ts`, `CHANGELOG.md`. Cualquier otro script/config necesario se acuerda con PM antes de colisionar con T-02.
- **Pasos:** confirmar consumidores; eliminar adaptadores nativos/tests exclusivos; quitar manifiesto builder y dependencias; `dev→start:api`, `build→build:service`, añadir `start→start:api:built`; conservar scripts independientes/CLIs/Storybook; setup deja intacto cualquier `.env.electron` preexistente y no lo crea; preparar minor 3.35.0/changelog.
- **Contrato estable:** no editar `src/shared/api/**`, browser ni producto renderer, que pertenecen a T-02; el PM coordinó por separado el reparto de tests renderer entre dos builders. La eliminación de preload puede dejar imports transitorios que resuelve T-02 antes del gate global.
- **Exclusiones:** no borrar `src/infrastructure/database` ni repositorios usados por compatibilidad; no modificar modelos, migraciones, runtime locks, handlers, datos reales, archivos privados o artefactos instalados; no instalar Django/Redis ni crear despliegue.
- **Seguridad/asincronía:** setup preserva secretos, `.env`, validación de rutas/symlinks y permisos privados. El watcher existente conserva apagado ordenado; no se modifica para saltar exclusión del servicio.
- **Dependencias de inicio:** spec/UX y ownership de este plan. **Barrera:** T-02 completo para typecheck/build de integración.
- **Validación propia:** tests de `environment-setup`, revisión de manifiesto/lock y referencias; coordinar instalación pnpm exclusiva. No ejecutar instalación desde una copia con `node_modules` compartido. Informar al PM cuando dependencias vuelvan a estar estables.
- **Entregables:** diff, inventario retirado/conservado, pruebas y límites, versión/changelog. **Cierre:** comandos web definidos, setup probado y cero dependencia activa de Electron en su frente; evidencia final conjunta en T-04.

## T-02 — Componer editor y jugador solo mediante clientes web

- **Objetivo:** eliminar dependencia del bridge y comportamiento exclusivamente autónomo conservando todos los flujos web actuales.
- **Criterios:** CA-02/03/04, compatibilidad CA-06 y aportación a CA-01/08.
- **Responsable:** frontend_builder. No está solo; no edita archivos de T-01 ni documentación PM.
- **Escritura exclusiva:** `src/renderer/**` (conservar editor/assets; retirar solo `index.html` y `src/main.tsx` nativos), `src/shared/api/**`, `src/infrastructure/browser/**`, `src/web/**` excepto `vite.config.ts` (T-01 si cambiarlo resulta imprescindible), `.storybook/**` y `src/stories/**`; incluye los cuatro archivos de licencia/atribución web en `src/renderer/public/licenses/`. Ajustar únicamente archivos afectados por retirada; no refactor general.
- **Entradas/lectura:** `GameEditor` y `GuestEntry` ya proveen clientes HTTP; `ClientProvider` conserva fallback; `WorkspaceHeader` detecta UA; App/PlayerApp mezclan dados autónomos y de servicio. Seguir UX-62 y el contrato del plan.
- **Pasos:** reemplazar imports desde preload por shared; retirar `readLocalApi/readLocalClient`, `LOCAL_CAPABILITIES`, `nativeMenus` y sus callbacks exclusivamente nativos coordinando consumidores; usar cliente explícito/null en producción, tests/lab/stories; eliminar UA/menu Electron y autosave autónomo; dejar dados del servicio y retirar hooks/paneles exclusivamente autónomos cuando no tengan consumidores; actualizar textos y tests compartidos.
- **Conservar:** Guardar/Jugador, menú de campaña, nombre de escena estático, herramientas, mapa/Pixi, PlayerApp, cámaras/mediciones locales del navegador, IndexedDB, guardas de escena/cuenta/apertura, compositor/simulador/overlays de dados del servicio. Los nombres `saveSceneToPath`, `openPlayerWindow` y tipos PlayerWindow siguen siendo contratos web reales; no requieren renombrado.
- **Pruebas:** adaptar `ClientProvider.test.tsx`, `App.workspace.test.tsx`, `PlayerApp.*.test.tsx`, `useMapImageReplacement*.test.tsx`, `LibraryClientLifecycle.test.tsx`, `SceneMapsSection.test.tsx` y otros consumidores encontrados. Retirar pruebas exclusivas de desktop; mantener aserciones compartidas con composición explícita. Conservar tests de `useServiceDiceSession`, `ServiceDicePanel`, `GameEditor`, `DraftRecovery`, clientes contextual/browser y serialización.
- **Seguridad/asincronía:** cliente ausente no habilita una API local; servicios incompatibles muestran estado recuperable; preservar cancelación, aislamiento entre roots, suscripciones, render estable y cierre de recursos. Capacidades no sustituyen autorización.
- **Exclusiones:** no nuevos menús import/export/Nueva/Cargar para reemplazar desktop; no nuevos endpoints, cambio de permisos, migración de datos, cambio de `.ttrpgscene` o traslado masivo de carpetas.
- **Dependencias de inicio:** spec/UX y contrato del plan. **Barrera:** T-01 y su instalación completados para comandos pnpm/globales. Puede editar mientras T-01 trabaja; no competir por instalación o outputs.
- **Entregables:** diff por frente, lista de pruebas retiradas/adaptadas y razones, regresiones y evidencia UI. **Cierre:** ningún bridge/UA nativo activo; flujos web y estados de ausencia mantienen comportamiento; T-04 verifica recorrido real.

## T-03 — Actualizar plataforma, operación y trazabilidad

- **Objetivo:** que las instrucciones vigentes permitan mantener/desplegar el producto web y no requieran DMG/Electron para nuevos cambios.
- **Criterios:** CA-07 y documentación CA-08. **Responsable:** PM.
- **Escritura:** `AGENTS.md`, `README.md`, `SDD/README.md`, `SDD/estado-actual.md`, `SDD/arquitectura.md`, `SDD/flujo.md`; guías vigentes `client-architecture.md`, `browser-client.md`, `service-operations.md` y otras referencias afectadas; `.codex/README.md`, contextos/perfiles y skills si su contrato vigente exige plataformas retiradas; spec/validación de SDD62. No reescribir evidencia histórica.
- **Pasos:** describir navegador + Node24; actualizar comandos y eliminar obligación de DMG del flujo vigente; documentar formatos/compatibilidad, datos privados conservados y una instancia API por DB; instalaciones independientes con host/DB/secreto propios; enlazar decisión que sustituye Electron. Ajustar mensajes sobre versiones solo cuando exista evidencia de implementación.
- **Exclusiones:** no cambiar funcionalidades, versiones/dependencias (T-01), plan/tareas TL salvo actualización coordinada de estado, ni asegurar escalado horizontal/Django/Redis.
- **Dependencias:** redacción puede empezar con plan; cierre requiere comandos finales de T-01 y contratos de T-02. **Validación:** enlaces/rutas, comandos y límites cotejados con diff; no arrancar servicio para validar Markdown.
- **Cierre:** documentación vigente coherente con fuentes, historia conservada y límites explícitos.

## T-04 — Integrar, validar y cerrar la retirada

- **Objetivo:** comprobar CA-01–08 sobre el resultado combinado, con datos sintéticos y sin servidores propios persistentes.
- **Responsable:** PM coordina evidencias de ambos builders; puede encargar correcciones al propietario correspondiente. No constituye permiso de commit/push/merge.
- **Dependencias:** T-01/T-02/T-03. No iniciar gates globales con instalación/imports a medio modificar.
- **Pasos:** revisar diff e inventario de consumidores; ejecutar typecheck/lint y suite general sin `.local`; construir API/web mediante `pnpm build` y Storybook; smoke comandos `dev/start` en entorno temporal; recorrido web DM/admin/jugador definido en plan y UX; revisión de datos/formatos/código persistente; comprobar cierre de procesos/puertos.
- **Pruebas de producto:** campaña→arco→escena, editar/guardar/recargar y recuperación pendiente; publicación explícita→invitación→vista jugador; tirada pública desde jugador con cierre por autor/DM; nombre de escena no interactivo, herramientas responsive, teclado/Escape/foco y zoom. Usar API sintética, no solo mocks.
- **Gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test --exclude '**/.local/**' --maxWorkers 4`, `pnpm build`, `pnpm build-storybook`. Reejecutar únicamente lo afectado tras una corrección; un gate ausente se documenta y no se marca PASS.
- **Persistencia/autoridad:** si el diff se mantiene sin cambios ejecutables a esas capas, registrar esa identidad respecto de 3.34.0 y no atribuir nueva corrida de los 219 contratos históricos. Si cambia alguna, ejecutar el gate contractual correspondiente con SQLite/PostgreSQL TLS temporal. Nunca borrar `.env` del usuario para satisfacer fixtures.
- **Operación:** registrar PID/puerto de cada API/watcher/Storybook/DB temporal; cerrar en `finally`, hijos incluidos, y comprobar liberación. Respetar servicios preexistentes. No compartir `node_modules` mutable entre checkouts ni ejecutar builds sobre la misma salida en paralelo.
- **Escritura:** PM `validacion.md`/estado; cada builder corrige solo su ownership. Logs/capturas operativas privados bajo `.local/validation/`, sin secretos.
- **Cierre:** matriz CA-01–08 con evidencia y límites, versión 3.35.0/changelog correctos, sin procesos propios activos y entrega distinguida de integración/despliegue.

## Propiedad y conflictos

| Recurso | Propietario | Coordinación |
| --- | --- | --- |
| `src/main`, `src/preload`, `src/infrastructure/file-system` | T-01 | T-02 elimina referencias, no repone shims |
| `package.json`, lock, `pnpm-workspace.yaml`, configuración TS/ESLint, setup y changelog | T-01 | Instalación exclusiva; notificar antes de pruebas T-02 |
| `src/shared/api`, browser, producto renderer/web, stories y cuatro licencias web | T-02 | Propiedad del contrato y sus consumidores preservada |
| Tests de renderer afectados | T-02, reparto operativo del PM | Dos builders con archivos asignados sin conflicto; conserva las aserciones compartidas |
| `src/web/vite.config.ts` | Conservado; T-01 si cambio imprescindible | Avisar a T-02 antes de editar; no renombrar assets/entradas compartidos |
| `.storybook/**` | T-02 | Conservar guard de aislamiento; referencias que prohíben Electron no son dependencia activa |
| Documentación vigente/contextos | T-03 PM | Ficha UX pertenece a UX; plan/tareas a TL |
| `out/`, `storybook-static/`, instalación y puertos | T-04 coordinado | Una tanda de builds; fixtures/puertos propios, cierre obligatorio |

## Tandas y cobertura

| Tanda | Tareas | Paralelismo seguro | Barrera de salida |
| --- | --- | --- | --- |
| P-01 | T-01 + T-02; T-03 documental | Edición con paths disjuntos y contrato de cliente fijado; instalación solo T-01 | Producto combinado sin imports nativos; instalación estable |
| P-02 | T-03 cierre + T-04 | Pruebas/builds serializados donde comparten recursos; revisión documental en paralelo sin fuentes | Evidencia por criterio y procesos cerrados |

Camino crítico: T-01/T-02 → T-03 cierre → T-04. No hay ciclos; la barrera de integración mutua entre T-01/T-02 no es una dependencia de inicio.

| Criterio | Tareas | Evidencia final |
| --- | --- | --- |
| CA-01 | T-01, T-02, T-04 | Inventario, manifiesto/lock, build e imports |
| CA-02 | T-02, T-04 | Proveedor explícito, pruebas compartidas/lab/Storybook |
| CA-03 | T-02, T-04 | Guardado/recuperación contextual y recorrido real |
| CA-04 | T-02, T-04 | Publicación/invitación/dados DM-jugador |
| CA-05 | T-01, T-04 | Comandos y smoke web estable/desarrollo |
| CA-06 | T-01, T-02, T-04 | Formatos/repositorios preservados, pruebas y diff |
| CA-07 | T-03, T-04 | Guías/reglas vigentes y límites de instancias |
| CA-08 | T-01, T-03, T-04 | Versión/changelog, validación y cleanup |

## Cierre de ejecución

T-01/T-02/T-03 fueron completadas por sus responsables y T-04 cerró gates, QA y limpieza según evidencia del PM. Typecheck/lint PASS; suite general 166 archivos y 1417 pruebas PASS; builds API/web y Storybook PASS. Los smoke de `dev/start` respondieron health 3.35.0 y HTML 200 en entorno sintético.

QA del PM: campaña/arco/escena, guardado y recarga, recuperación IndexedDB de edición pendiente y guardado posterior; publicación, invitado, dos tiradas públicas cerradas por autor y DM con historial conservado; editor 1440/390 px, ausencia de overflow y Escape/foco; cabecera Storybook en Chrome al 200 % real con callback Jugador y posterior restauración/cierre de pestaña. Todos los servidores QA fueron cerrados: puertos 8877/6006/8787/8766 libres y lock sintético ausente. Ver detalle y límites en [validacion.md](validacion.md).

Los 219 contratos backend de 3.34.0 no se reejecutaron; no hubo cambios de persistencia/autoridad ni operaciones sobre datos reales. El cierre Git autorizado posteriormente se registra en [validacion.md](validacion.md#integración-git); no incluye despliegue. TL comprobó únicamente coherencia documental, rutas, fronteras, cobertura e IDs, consultó UX-62 y actualizó estos estados con los resultados comunicados por el PM; no ejecutó producto, pruebas ni servidores.
