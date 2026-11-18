# Tareas técnicas — 61 Dados de jugadores e historial público

**Fuente:** [spec.md](spec.md), rev0.1, CA-01–18. **Plan y contrato:** [plan.md](plan.md), C-61. **Estado:** T-01–T-07 completadas bajo coordinación PM; 3.32.0 validada e incorporada al checkout local, sin merge. La definición técnica siguiente se conserva como contrato de ejecución. **Autorización:** Q0022 comunicada por PM `/root`, 2026-11-15. **Base:** `feature/spec-61-dados-jugadores`, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, producto3.31.2 con cambios locales previos preservados. Hash fuente al iniciar y actualización de estado por PM en plan.

Producto se construye en copia aislada preparada por PM `/private/tmp/ttrpg-dice61-tijz35yg`; documentación canónica en SDD del checkout habitual. No Git/env/DB reales ni puertos8787/6006/8766. No estás solo: respetar cambios ajenos, no revertirlos, comunicar conflictos de archivos al PM. Los perfiles siguientes fueron asignados por PM; TL no despachó builders. UX-61-TL-01 resuelta en [UI-004](../../guias/ui-ux/storybook.md).

## Mapa de tareas

| ID | Resultado concreto | Criterios fuente | Perfil propuesto | Dependencias de inicio | Estado de entrega |
| --- | --- | --- | --- | --- | --- |
| T-01 | Contrato C-61 y puertos/fixtures tipados estables | CA-02/03/04/09/16/17 | backend_shared (backend_builder) | C-61 aceptado por PM | Implementada y comprobada |
| T-02 | Sesión servicio con dos canales, actores, logs y límites | CA-02–13/17 | backend_shared | T-01 | Implementada y comprobada |
| T-03 | HTTP/SSE autorizado, negociación y lifecycle runtime | CA-03–13/16 | backend_shared | T-02 | Implementada y comprobada |
| T-04 | Cliente HTTP/SSE y conciliación por ID | CA-03–13/16 | client_adapter, separado de backend_shared | T-01; barrera T-03 | Implementada y comprobada |
| T-05 | Compositor/historial presentacional, Select y stories | CA-01/02/06/07/08/14/15/17/18 | frontend_builder | C-61/UI-004; contrato importable T-01 para fixtures | Implementada y comprobada |
| T-06 | Controller servicio y UI DM/jugador conectada | CA-01–12/15/17 | frontend_builder | T-01,T-05; barrera T-03,T-04 | Implementada y comprobada |
| T-07 | Integración real, matriz de aceptación y cierre documental | CA-01–18 | PM con responsables originales y consulta UX | T-03,T-04,T-06 | Validada e incorporada localmente |

## T-01 — Fijar contrato C-61 sin ampliar IPC autónomo

- **Objetivo/contexto:** habilitar implementación paralela con tipos reales. Hoy `DiceApi` devuelve sesión DM y `DiceRollSession` no conoce autor; la ampliación servicio necesita un puerto explícito distinto. Leer C-61 completo del plan, spec0.1 y descubrimiento. Reutilizar validaciones/resultado actuales, no reescribir aritmética.
- **Responsable propuesto:** backend_shared; propietario único de contratos durante entrega. **Criterios:** CA-02/03/04/09/16/17, habilitador de los restantes.
- **Lectura:** `src/domain/dice/dice.ts`, `src/shared/api/dice-api.ts`, `src/shared/contracts/shared-annotations.ts`, `src/shared/contracts/table.ts`, `moderation.ts`, `src/shared/api/client.ts`, `src/main/ipc/dice-ipc.ts`.
- **Escritura:** nuevos `src/shared/contracts/service-dice.ts`, `src/shared/api/service-dice-client.ts`, `src/shared/contracts/service-dice.test.ts`; extensiones de `src/shared/contracts/table.ts`, `moderation.ts`, `src/shared/api/client.ts`. Fixture nueva `src/shared/contracts/service-dice.fixtures.ts` solo para tests/stories, sin runtime/Node; exportar fixtures tipadas pública/DM/ocupada/fallo y excluir imports de producción a fixture.
- **Pasos:** declarar unions estrictas de actor público, selección, ocupación, entrada sin replay, páginas, estado por rol, comandos y ACK; puerto opcional `TtrpgClient.serviceDice`, capabilities/version y helpers de proyección tipados; garantizar consistencia GET/SSE/schema contextual2; documentar acciones públicas/DM y errores de C-61. Acordar con PM nombres finales antes de entregar a frontend. Compilación del puerto con cliente legacy sin propiedad nueva.
- **Exclusiones:** implementar runtime/HTTP/UI, ampliar preload/IPC, cambiar protocolo local4, modificar spec. No crear un segundo catálogo de componentes.
- **Dependencia/barra:** PM acepta corte C-61; entrega de tipos y fixtures desbloquea T-02/T-04/T-06. T-05 puede avanzar extracción/Select sin esperar funcionamiento remoto.
- **Seguridad/asincronía:** autor no aceptado en input; campos extra rechazados; estado player no tiene propiedades hidden ni callbacks DM. Tipos no sustituyen validación servidor.
- **Clientes/roles:** servicio DM/jugador; autónomo compila sin nueva capacidad.
- **Entregables/cierre:** contratos importables con fixtures y schema tests; PM/frontend conocen exactamente método/campos. `pnpm typecheck` y `pnpm test src/shared/contracts/service-dice.test.ts --maxWorkers 1` en copia aislada. Documentar cualquier desvío C-61 antes de continuar consumidores. **Riesgo:** ampliar schema base sin negociación; tests de payload antiguo y rechazo de campos desconocidos lo detectan.

## T-02 — Sesión efímera de servicio con pública excluyente y privada independiente

- **Objetivo/contexto:** una pública bloquea desde reserva hasta cierre, no solo durante animación; oculta DM tiene canal independiente. Historial500 públicas+500 ocultas sin replays; preferencias privadas del usuario no son estado global. Reutilizar funciones puras de dados, mantener `DiceRollSession` local intacta salvo extracción imprescindible demostrada.
- **Responsable:** backend_shared. **Criterios:** CA-02–13 y CA-17.
- **Lectura:** C-61, `dice-roll-session.ts`, dominio `dice.ts/formula.ts/critical.ts`, `table-session.ts`, `game-runtime.ts`, `dice-simulation.ts`.
- **Escritura:** nuevos `src/application/services/service-dice-session.ts`, `service-dice-session.test.ts`; `src/domain/dice/` únicamente helpers puros realmente comunes y tests si hay extracción. Sin edición de `TableSession` en esta tarea: integración T-03.
- **Pasos:** máquina síncrona por canal; public-context obtenido de publicación y private-context independiente; actor real suministrado por composición autorizada; begin atómico, complete validado/calculado, fail/cancel/dismiss por objetivo y actor; toggle de resumen sin reabrir; clear-history preservando presentación; anillos independientes y páginas con revisión; actor-publicId estable; recibos compactos/fingerprint/cotas previos al efecto. APIs `sweep`, `revokeParticipant`, `setPublishedContext`, `clear` para T-03. Frame final después de settled y eliminación de trayectoria; no replay en log/recibos.
- **Exclusiones:** transportes, SQL, UI, cambios de publicación de escena, pruebas contra datos de usuario. No copiar la física/aritmética dentro de la nueva sesión.
- **Dependencias:** T-01. **Barrera:** T-03 para autoridad real y tick efectivo, T-04/T-06 para pérdida ACK real.
- **Seguridad/asincronía:** lectura/fingerprint scoped por actor/apertura; cambiar alias no otorga propiedad; otra persona no recupera recibo ajeno; hidden no cambia secuencia/recuento/errores públicos. Reserva expires exactamente a20s; complete posterior no resucita. Resultado aceptado persiste tras desconexión, revocación solo cancela preparación.
- **Entregables/validación:** tests con reloj y IDs deterministas: carrera pública única, pública+oculta simultánea, cierre propio/DM/viejo, misma clave distinta simulación,500+501 por canal, clear-history y memoria de replay, revoke durante pending/completed y private navigation sin cancelar pública. `pnpm test src/application/services/service-dice-session.test.ts src/application/services/dice-roll-session.test.ts src/domain/dice --maxWorkers 4`.
- **Cierre:** reglas y cota demostradas sin entorno HTTP, legado local conserva pruebas. **Riesgo:** recibos que guardan estado grande o conjunto de actores creciente; medir tamaños y limpiar según límites C-61. Si32KiB de entrada no admite máximo del dominio, demostrar y ajustar cota técnica, sin cambiar reglas de composición.

## T-03 — Autoridad contextual, HTTP/SSE negociado y limpieza real

- **Objetivo/contexto:** conectar sesión al runtime API compartido por una apertura. Dos barreras DM-only actuales (`moderation-http`/`table-actions`) no pueden simplemente quitarse: respuestas actuales filtran sesión DM. Las nuevas rutas siempre proyectan por actor y audiencia.
- **Responsable:** backend_shared. **Criterios:** CA-03–13/16.
- **Lectura:** `src/server/moderation-http.ts`, `table-actions.ts`, `moderation-backend.ts`, `src/application/services/table-session.ts`, `game-runtime.ts`, `moderation.ts`, `src/infrastructure/server/invitations/guest-authority.ts`, contratos moderación y C-61.
- **Escritura:** nuevo `src/server/service-dice-actions.ts`; `moderation-http.ts`, `table-session.ts`, `game-runtime.ts`; `table-actions.ts` solo guardas/proyección legacy necesarias; `moderation-backend.ts` solo si tick ya existente necesita conexión. Nuevos `src/infrastructure/server/moderation/service-dice.contract.ts`; ampliar `src/application/services/game-runtime.test.ts` y contratos existentes solo donde semántica contextual cambia. `src/server/table-http.test.ts` conserva handler histórico local.
- **Pasos:** componer modo servicio en registro; endpoints C-61; derive actor de scope, reautorización/lease y transición solo en `scope.deliver`; negociar query/evento/estado, proyectar bootstrap y respuesta por receptor; legacy contextual mutaciones426; conectar published identity, revoke/leave y discard; tick1s expira20s y notifica. Páginas log/GEToperation autorizadas independientes de mapa actual para conservar historial de apertura. Mantener body bounds/SSE/backpressure y reservas DM.
- **Dependencias:** T-02 y T-01. **Barrera:** T-04/T-06 para integración3clientes.
- **Exclusiones:** ampliar transacciones DB, schemas/migraciones, reset runtime real, privilegiar otro DM, aceptar actor en JSON o autenticar con alias. No renombrar protocolos locales para resolver negociación.
- **Seguridad:** DM ajeno404/403 según frontera existente; invitado sin admisión401; actor falsificado400/403; complete/fail ajeno403; command old opening/publication409; delivery tras revoke no contiene éxito ni datos privados. Resultado COMMIT incierto invalida runtime como infraestructura existente; no aplicar transición anticipada.
- **Validación:** `pnpm test:moderation src/infrastructure/server/moderation/service-dice.contract.ts` con SQLite/PostgreSQL real TLS. Contratos:2DM/2invitados, alias iguales, dos tabs mismo participante, carreras begin/cierre/publicación/revoke, POST body lento hasta revoke, SSE pendiente,500+500, bootstrap paginado sin centinelas privados, hidden simultánea sin tocar contadores, tick sin request, cierre/lease/restart y pérdida lease proceso. Negociación old/new y legacy bypass. No atribuir cobertura HTTP real a mocks.
- **Cierre:** autoridad y bytes públicos demostrados en ambos motores; lifecycle sin listeners/timers/replays residuales. **Riesgo:** payload encolado deja pasar datos previos; proyectar/revalidar en entrega y descartar epoch/contexto antiguo.

## T-04 — Puerto HTTP/SSE de dados y conciliación sin relanzar

- **Objetivo/contexto:** consumidor reusable por navegador/Electron servicio; preserve base transport y no reintente un begin como nueva operación. Hook React no implementa protocolos.
- **Responsable:** client_adapter designado por PM, distinto del escritor backend_shared; no cambia contratos compartidos. **Criterios:** CA-03–13/16.
- **Lectura:** `src/infrastructure/browser/table-client.ts`, `contextual-table-client.ts`, `http.ts`, `browser-client.ts`, C-61, contratos compartidos y `service-dice-client.ts` nuevo.
- **Escritura:** esos adapters (evitar tocar `http.ts` si transporte actual basta), nuevo `src/infrastructure/browser/service-dice-client.ts` si separa implementación del puerto, nuevo `service-dice-client.test.ts`; `table-client.test.ts` y `owned-client.test.ts` solo cambios necesarios de wiring. Client_adapter conecta `TtrpgClient.serviceDice` en `browser-client.ts`. Frontend conecta GuestEntry en T-06. Extensiones de shared/contracts/api se solicitan al propietario T-01 mediante PM.
- **Pasos:** negociar una vez, tablas base contra servidor viejo, extensión query/schema/evento; snapshot estable y subscribe; mapear reloj servidor y actor sin duplicar bootstrap; comandos tipados por actor, ID estable/fingerprint, operación incierta consultable; GET paginación/revision y refresh explícito; desconexión deshabilita mutación, no cola offline. Limpiar listeners/requests/snapshots en clear/cambio autoridad; mantener composición fuera del transport.
- **Dependencia inicio:** T-01; puede trabajar con fixtures congeladas mientras T-02/T-03 avanzan. **Barrera:** T-03 para prueba HTTP/SSE real.
- **Exclusiones:** React, stores de escena, motor worker, tamaño global DM, nuevo socket. No aplicar reintentos serializados de la mesa a nuevos lanzamientos sin comprobar generación/estado conectado.
- **Seguridad/asincronía:** bootstrap viejo no repuebla log; actualizar publicaciones con token nuevo no borra historial salvo nueva apertura/epoch; eventos hidden no actualizan player; reconciliar complete perdido conserva simulación y consulta ID, nunca una segunda física. Cache log acotada a páginas necesarias, no1MiB por recibo.
- **Validación/cierre:** `pnpm test src/infrastructure/browser/service-dice-client.test.ts src/infrastructure/browser/table-client.test.ts src/infrastructure/browser/owned-client.test.ts --maxWorkers 4`; escenarios eventos duplicados/fuera de orden, dos openings, downgrade/version desconocida,404cap único vs503, fallo de complete/red/retry mismo ID, log cambiado durante paginación. Entregar implementación usable del puerto T-01 a T-06, sin éxitos ficticios.

## T-05 — UI reutilizable, Select y catálogo por rol

- **Objetivo/contexto:** extraer solo límites presentacionales del panel actual para DM y jugador, conservando composición y reglas; stories usan componentes de producción sin cargar motores. UX-61-TL-01/UI-004 fija interacción y Select.
- **Responsable:** frontend_builder. **Criterios:** CA-01/02/06/07/08/14/15/17/18.
- **Lectura:** `DicePanel.tsx`, `DiceResultSummary.tsx`, `RightSidebarTabs.tsx`, `DiceOverlay.tsx`, `hooks/useDiceSession.ts`, `components/ui/Controls.tsx`, `workspace.css`, `player-table.css`, stories/fixtures actuales, C-61.
- **Escritura:** `src/renderer/src/components/dice/DicePanel.tsx`, `dice.css`, `RightSidebarTabs.tsx` y pruebas; nuevos componentes `DiceComposer.tsx`, `DiceHistory.tsx`, `DicePublicStatus.tsx` si necesarios para separar responsabilidades (nombres a consolidar por frontend); `components/ui/Controls.tsx` y su CSS existente/nuevo acotado; CSS contextual `workspace.css` solo para resolver precedencia Select; nuevas pruebas presentacionales. `src/stories/controls/Select.stories.tsx`, nuevas stories `src/stories/compositions/workspace/DicePanel.stories.tsx` y fixtures UI tipadas. No importar hook en runtime de historia, solo tipos desacoplados.
- **Pasos:** modelo presentacional independiente de ReturnType del hook con unión rol y callbacks permitidos; adaptador local mantiene panel existente; manual/fórmula/grupos/d20 reutilizan dominio; tabs con IDs únicos/roving/tabpanels; compositor montado al ocultar; log10página y autor/estado; busy pública solo bloquea lanzamiento, permite preparar siguiente. Sonido/resumen SharedSwitch, texto pública/oculta solo nuevo servicio sin romper contratos locales. Select compartido con una flecha nativa/padding efectivo, adopción Material/grupo/tipo.
- **Dependencias:** UI-004 resuelta y C-61 escrito. Puede comenzar Select/extracción sin API; fixtures e imports de puerto se integran tras T-01. **Barrera:** T-06 para producto y T-07 para QA real.
- **Seguridad/accesibilidad:** jugador sin callbacks ocultos, clear global ni tamaños DM. X independiente de resumen/WebGL con nombre accesible, pending y error por ID; DM cierre público disponible al mirar oculta/otro panel. d20 enfoca Normal, Escape cancela sin reserva, foco vuelve al disparador; atajos no llegan canvas.
- **Exclusiones:** imports App/PlayerApp/Three/Pixi en story, nuevas librerías, migración general de formularios, HTTP, alterar API/IPC. No canvas oculto por historia ni timer de producto simulado como autoridad.
- **Validación/cierre:** tests `pnpm test src/renderer/src/components/dice --maxWorkers 4`, `pnpm check:storybook-imports`, `pnpm build-storybook` en salida aislada; historia real DM/jugador/autor/otro/ocupada/hidden/resumen off/fallo visual/incompatible/sin publicación/empty/paginación. Select a282/390/1440 y200%,≥8px, disabled/teclado; evidencias finales T-07. Riesgo de especificidad CSS medido en contexto real, no solo story vacía.

## T-06 — Integrar controller, player lateral y presentación de servicio

- **Objetivo/contexto:** jugadores preparan y lanzan con API autorizada; DM públicas y ocultas independientes. Reutilizar worker/renderer/audio, nunca depender de una pestaña DM para simular una tirada guest. Autónomo mantiene sus hooks/IPC.
- **Responsable:** frontend_builder. **Criterios:** CA-01–12/15/17.
- **Lectura:** C-61, T-05/UI-004, `useDiceSession.ts`, `useDiceSizes.ts`, `browser-dice-simulation.ts`, `DiceRollAudio`, `App.tsx`, `PlayerApp.tsx`, `GuestEntry.tsx`, `ClientProvider.tsx`, `SharedDrawingPanel`/vista publicada existente.
- **Escritura:** nuevo `src/renderer/src/hooks/useServiceDiceSession.ts` y test; `useDiceSession.ts` solo extracción compartida/adaptador si necesaria (conservar rama local), `App.tsx`, `PlayerApp.tsx`, `components/dice/DiceOverlay.tsx` y tests, `components/workspace/player-table.css`, `src/web/GuestEntry.tsx`; nuevos `PlayerApp.dice.test.tsx`; ampliar `PlayerApp.tools.test.tsx`, `App.workspace.test.tsx` y `GuestEntry.test.ts` para integración relevante. Render/audio/worker existentes solo si adaptación de frame final necesita fix delimitado; no rediseño motor.
- **Pasos:** servicio elige controller nuevo por puerto, nunca monta hook legacy que envía `/dice/context` en paralelo; wire GuestEntry con `serviceDice` de table. Estado local por actor/apertura, tamaño/sonido propios; tabs Mesa/Dados en lateral actual (nombre «Panel del jugador» para evitar título duplicado). Begin reserva primero; luego una física; complete perdido concilia sin fail automático que borre resultado válido. Cancelar worker ante pérdida contexto/autoridad; no lanzar por reconexión. Presentación pública sobre marco publicado compatible; mapa privado DM mantiene canal hidden, control público textual siempre accesible. Log y composición separados de escena/dirty/undo.
- **Dependencias inicio:** T-01,T-05; controller puede usar fixture de puerto. **Barrera:** T-03,T-04 para integración. Archivo App/PlayerApp pertenece solo a frontend, no backend ni cierre simultáneo.
- **Seguridad/asincronía:** actor estable/pestaña no autoriza por alias; una nueva admisión reinicia preferencias; ocultar panel no aborta tirada ni pierde selección. Audio solo iniciador de ese request, no otra pestaña mismo participante ni bootstrap. Close pendiente evita doble envío pero usa requestId estable al reintentar. RollId viejo no cierra nueva tirada. Error render mantiene resumen textual/log y control de cierre.
- **Validación:** `pnpm test src/renderer/src/hooks/useServiceDiceSession.test.tsx src/renderer/src/hooks/useDiceSession.test.tsx src/renderer/src/PlayerApp.dice.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/renderer/src/App.workspace.test.tsx src/web/GuestEntry.test.ts src/main/ipc/dice-ipc.test.ts --maxWorkers 4`; selección conservada en conflicto, timer/autoritad/worker tardío, publicación nueva, hidden+public y tamaño independiente, cierre con resumen off, serialización/undo/dirty iguales.
- **Cierre:** recorrido funcional con puerto real y tests específicos, sin función guest en autónomo. **Riesgo:** render ambos overlays en mapa privado o montar doble controller; pruebas y revisión de árbol deben demostrar una única fuente por entorno.

## T-07 — Validación integrada y cierre de entrega

- **Objetivo/responsabilidad:** PM coordina evidencia CA-01–18, UX revisa interacción y cada responsable corrige sus archivos. No reasignar contratos/frontend en paralelo durante estabilización. Cierre no equivale a merge.
- **Contexto/entradas:** T-03/T-04/T-06 integrados, matriz de [plan](plan.md), copia aislada y fixture QA preparada por PM (API8877 si libre; no iniciar dos procesos sobre la misma DB). Dependencias funcionales cerradas; no pedir decisiones ya aceptadas.
- **Lectura:** todo diff del alcance, outputs de pruebas y guías. **Escritura:** nuevo `SDD/specs/61-dados-jugadores/validacion.md`, actualización plan/tareas solo estado/evidencia por PM, `SDD/guias/synchronized-table.md`, `client-architecture.md`, `browser-client.md`, aviso evolución37, índice/estado; inventario60/UI-004 por acuerdo UX. `package.json`/`CHANGELOG.md` únicamente responsable de cierre designado por PM, bump minor después de validar. Builders no editan estos simultáneamente.
- **Pasos:** gates del plan incluidos `pnpm typecheck`, `pnpm lint`, contratos moderación completos sobre2motores reales/TLS, builds service/Electron/Storybook; tres clientes sintéticos Chrome/Electron, retención501+501, estabilidad de render/limpieza (20ciclos orientativos o evidencia equivalente justificada) y fallo WebGL; humo autónomo. Revisar bytes SSE/HTTP/caches por centinelas privados y negativos multiDM, no solo capturas.
- **Entregables:** tabla CA→evidencia/fecha/comando/entorno, capturas Select/tab/cierre por rol, memoria/cotas, resultados contratos reales y límites pendientes, versión/changelog; ningún criterio verde por mera existencia del test.
- **Exclusiones:** Git/merge/push/DMG, DB operativa, reiniciar watchers de usuario, recuperar logs históricos desde DB, prueba de azar imparcial. **Cierre:** PM verifica cobertura y riesgos; si entorno falta se registra gate pendiente, no se sustituye PostgreSQL o render nativo por mock.

## Propiedad y conflictos

| Archivo / recurso | Propietario propuesto | Consumidores / estabilidad |
| --- | --- | --- |
| `shared/contracts/service-dice.ts`, `table.ts`, `moderation.ts`, fixture compartida y `shared/api/service-dice-client.ts`, `client.ts` | backend_shared T-01 | T-02–06; corte de contrato antes de consumidores, cambios coordinados por PM |
| `application/services/service-dice-session.ts` y dominio compartido | backend_shared T-02 | T-03; ninguna extracción simultánea frontend |
| `table-session.ts`, `game-runtime.ts`, `moderation-http.ts`, `service-dice-actions.ts`, contratos reales | backend_shared T-03 | T-04/T-06; HTTP/SSE fijados C-61 |
| `infrastructure/browser/` afectados, wiring `browser-client.ts` | client_adapter T-04 | T-06; frontend y backend_shared no cambian adapters |
| `components/dice`, `Controls`, CSS, stories | frontend_builder T-05→T-06 | Misma persona/tanda secuencial, no dos escritores de DicePanel/Overlay |
| Hooks React, App, PlayerApp, GuestEntry, pruebas renderer/web | frontend_builder T-06 | Backend solo provee puerto; no cambios concurrentes a shared/api/client.ts |
| QA `.local/qa-fixture`, DB/puertos8877 y PostgreSQL temporal | PM coordina | Un proceso por base; suites crean fixtures separadas; no8787/6006/8766 |
| `out/`, `storybook-static/`, builds en copia aislada | PM serializa T-07 | No builds API/Electron simultáneos con contratos compilados usando mismos outputs |
| versión/changelog/guías/validacion.md | PM o cierre designado T-07 | Builders entregan evidencia, no bump competidor |

## Tandas paralelas propuestas

| Tanda | Tareas | Condiciones | Independencia / riesgo | Barrera de salida |
| --- | --- | --- | --- | --- |
| P-01 | T-01 y parte presentacional T-05 | PM revisa C-61, UI-004 disponible | Backend contracts; frontend Select/extracción/CSS. No importar tipos aún inexistentes sin fixture temporal local que luego se sustituya | Contratos importables y fixtures estables |
| P-02 | T-02,T-04,T-05 | T-01 cerrado técnicamente para adapters/DTO | Aplicación/adapter/UI separados; client_adapter no cambia contratos y frontend no cambia adapters | Núcleo probado, cliente con fixtures, compositor listo |
| P-03 | T-03,T-06 | T-02 para T-03; T-05 y puerto T-01 para T-06 | Servidor y UI separados; mocks tipados hasta backend listo, no afirmar integración | T-03/T-04/T-06 juntos en copia QA |
| P-04 | T-07 | Todos los anteriores | Tests ligeros independientes; builds/contratos reales serializados cuando comparten outputs/puertos | Evidencia CA-01–18 y revisión |

Grafo de inicio sin ciclos: `T-01→T-02→T-03→T-07`; `T-01→T-04→T-07`; `T-05→T-06→T-07` y `T-01→T-06`. T-05 empieza Select/extracción independientemente; tiene barrera T-01 solo al consumir DTO/fixtures. T-06 tiene barrera de integración T-03/T-04 aunque puede empezar con fixture. Camino crítico habitual T-01/T-02/T-03 y T-05/T-06 convergiendo en T-07. PM acordó separar backend_shared T-01–03, client_adapter T-04 y frontend T-05–06; no se prescribe concurrencia simultánea ni se despacha desde este documento.

## Cobertura y devolución al PM

La matriz detallada criterio→tareas→prueba→entorno está en [Validación del plan](plan.md#validación-y-matriz-de-aceptación); cubre todos CA-01–18, sin renumerar spec. T-01 es habilitador necesario para contrato/privacidad/compatibilidad, T-07 para evidencia de plataforma; ninguna tarea añade producto fuera de alcance.

- Suficientemente definidas: T-01 y T-05 para comienzo; T-02–04/T-06 para despacho cuando sus predecesoras estén estables. T-07 definida con gates explícitos.
- UX: resuelta UX-61-TL-01/UI-004; no lab pendiente. Si la flecha nativa no cumple medida en plataforma, frontend consulta variante decorativa a UX, sin añadir segunda flecha.
- Riesgos principales: mantener separación public/private al navegar DM, recibos sin snapshots, versiones legacy, operación incierta sin nueva física, y cierre accesible sin resumen. Mitigaciones/negativos constan en cada tarea y C-61.
- Validación documental: rutas existentes o nuevas señaladas, enlaces, IDs/dependencias/cobertura y ownership revisados. Pruebas de producto propuestas, ninguna ejecutada por TL. El PM registra despacho/ejecución real, sin inferirlos del estado del plan.

## Cierre de ejecución

PM coordinó las entregas y correcciones con builders; TL revisó contratos, compatibilidad y asincronía. Se completaron T-01–T-07. [Validación](validacion.md) registra 59 contratos reales de moderación, 45 pruebas finales del cliente/estado, regresiones de dominio/UI/IPC, builds y recorridos con tres clientes. La copia aislada se incorporó con hashes, preservando cambios previos. No se ejecutaron operaciones de historial Git ni migraciones operativas. Las instrucciones anteriores describen el contrato de trabajo; el estado real está en esta sección y la matriz de aceptación.
