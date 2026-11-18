# Plan — 61 Dados de jugadores e historial público

**Spec fuente:** [spec.md](spec.md), revisión 0.1, 2026-11-15. **Estado:** plan ejecutado bajo coordinación PM; entrega 3.32.0 validada e incorporada al checkout local, sin merge. La evidencia de producto se mantiene en [validacion.md](validacion.md), separada de la planificación. **Encargo:** PM `/root`, autorización humana Q0022 del 2026-11-15 comunicada por PM para CA-01–18. **Dependencias:** SDD 37, 41, 44, 45, 49, 50, 55 y 60. [Tareas y ownership](tareas.md).

## Base inspeccionada

- Rama preparada `feature/spec-61-dados-jugadores`; HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`; producto 3.31.2. Inspección 2026-11-15, por `/root/tl_draft409`.
- SHA256 vigente de spec tras sincronización Q0022 por PM: `7c03e772db65a8071bd59fe11099849df767acbb32efbea3f3507907cb82d9ba`. Hash previo al ajuste de estado: `3f9a664718b331dc4208c6c9dfb89135e3b4824134489b5e9806836631f5e1d5`; se conserva trazabilidad, sin cambio de CA. PM aceptó corte C-61 durante esta consulta. TL no edita spec ni deduce nuevos requisitos. Un cambio funcional de la fuente exige revisar este plan.
- Checkout con cambios anteriores SDD59/60, recuperación SDD58/3.31.2, cabecera54 y documentación/configuración sin commit; se conservan. `App.tsx`, `GuestEntry.tsx`, `shared/api/client.ts`, `browser-client.ts` y pruebas relacionadas ya tienen cambios: integrar sobre ellos, sin restaurarlos desde HEAD. No cambiar rama ni Git, API8787, Storybook6006 o servicio8766. Construcción/QA en entornos sintéticos coordinados por PM.
- Lecturas: AGENTS, SDD README/estado/arquitectura/flujo, contexto backend/frontend y rol TL; [descubrimiento](descubrimiento.md) contrastado en los recorridos citados abajo. No se ejecutaron producto, tests, migraciones ni builds para elaborar el plan.

## Decisiones por capa

| Capa | Cambio previsto | Archivos / símbolos |
| --- | --- | --- |
| Dominio compartido | Reutilizar composición, fórmula, expansión, percentil, resolución y validación de simulación; tipos de actor/contexto público separados de identidad privada | `src/domain/dice/dice.ts`, `formula.ts`, `critical.ts`; nuevo `src/shared/contracts/service-dice.ts` |
| Aplicación servicio | Sesión de dados de apertura con dos canales independientes, autoría, exclusión pública, log y deduplicación acotados | Nuevo `src/application/services/service-dice-session.ts`; integración `table-session.ts`, `game-runtime.ts` |
| HTTP/SSE | Actor autorizado, endpoints versionados, negociación estricta, proyección por audiencia y cleanup efectivo | `src/server/moderation-http.ts`, nuevo `src/server/service-dice-actions.ts`, `src/shared/contracts/table.ts`, `moderation.ts` |
| Cliente de servicio | Puerto opcional inyectado, negociación, cursor, conciliación por ID y composición local por participante | Nuevo `src/shared/api/service-dice-client.ts`; `src/shared/api/client.ts`, `src/infrastructure/browser/table-client.ts`, `browser-client.ts` |
| UI | Compositor e historial presentacionales reutilizados, tabs jugador, controller servicio, cierre independiente del resumen, Select real y stories | `components/dice/`, `hooks/`, `App.tsx`, `PlayerApp.tsx`, `GuestEntry.tsx`, `components/ui/Controls.tsx`, `src/stories/` |

No nuevas dependencias, SQL ni migraciones. HTTP nativo, Zod, React y worker existente permanecen. El alcance no modifica la aritmética ni añade azar autoritativo.

## Núcleo compartido y adaptadores

`DiceRollSession` actual tiene un único contexto/borrador/reserva y se usa desde IPC local y `TableSession`. No convertirlo silenciosamente en multijugador. Mantener `DiceApi`, `DICE_PROTOCOL_VERSION=4`, `dice-ipc.ts` y comportamiento autónomo. Introducir la orquestación de servicio en `ServiceDiceSession`, reutilizando `requestSchema`, `expandDice`, `validateSimulation`, `resolveDiceRoll`, `naturalTwenty` y fórmulas existentes. Es otro ciclo de autoridad, no otra implementación de la física ni de la suma.

`TableSession` recibe una opción explícita de modo de dados: el registro contextual `GameRuntimeRegistry` selecciona servicio; la composición histórica/fixtures no contextuales conserva su modo anterior. Exponer la sesión de servicio de forma tipada; evitar casts para hacerla pasar por `DiceRollSession`. Las respuestas legacy de presentación se proyectan desde la sesión servicio cuando corresponda. No mantener dos fuentes mutables de la misma pública.

Electron autónomo comparte dominio, compositor presentacional, `Select` y render, mediante su adaptador `DiceApi` actual. Navegador y Electron servicio comparten `ServiceDiceClient` por HTTP/SSE, sin preload privilegiado. El puerto nuevo es opcional en `TtrpgClient`; su ausencia no habilita a invitados a invocar el API DM legado. `ClientCapabilities.dice` continúa siendo disponibilidad, nunca autorización. Renderer no conoce DB, cookies, secretos o Node.

Recorridos finales:

1. Compositor → controller servicio → `ServiceDiceClient.begin` → HTTP contextual autorizado → reserva pública síncrona → ACK con ID → worker del iniciador → complete → validación/resultado → evento público filtrado → replay y log. El begin se acepta antes de simular; ningún receptor ejecuta azar.
2. Cierre por ID → autoridad de participante/DM → retirar presentación y liberar reserva → evento; entrada del log conservada. Cierre atrasado no toca una tirada distinta.
3. GET/bootstrap → estado público coherente y primera página del log → paginación HTTP por versión de log. No animar entradas históricas ni emitir sonido por bootstrap.
4. Publicación/retirada → nueva identidad de contexto público → interrumpir reserva y retirar presentación anterior → preservar log de apertura. Navegación privada DM solo afecta su canal privado.
5. Tick del registro/leave/revoke/discard → limpieza acotada y evento si cambia ocupación. Desconectar un stream no equivale a revocar al participante ni borrar un resultado aceptado.

## Contrato temprano C-61 — versión 1

Contrato propuesto para fijar en T-01 antes de separar consumidores. Nombres siguientes son el objetivo implementable; cualquier ajuste interno de nombres debe comunicarse por PM a ambos responsables y actualizar esta sección antes de consumo. Todas las variantes nuevas son Zod estrictas; reutilizar validaciones numéricas actuales y rechazar campos de autor/identidad en comandos.

### Tipos y proyecciones

| Tipo | Campos / semántica |
| --- | --- |
| `DicePublicAuthor` | Unión `{kind:'dm'}` o `{kind:'player', publicId:UUID, alias, discriminator}`. `publicId` opaco estable por participante/apertura; mapping privado servidor. No accountId, cookie, IP ni roster. `selfPublicId` solo identifica al receptor. Reutilizar patrón de autores de anotaciones. |
| `ServiceDiceContext` | `{token,sceneId,mapId,label}` para público: derivados exclusivamente de proyección autorizada; `label` acotado200 y sin nombres internos. No usar `sceneName/mapName` del editor privado. Contexto privado DM usa `DiceContext` actual y nunca cruza proyección pública. |
| `ServiceDiceSelection` | Composición de `DiceDraft` sin `visibility/showPlayerResult`, más `d20`; conserva grupos, modificadores, appearance y force. Convertir al request común después de imponer privacidad/resultado por actor. |
| `ServiceDiceEntry` | `{id,author,visibility:'public'|'hidden',context,selection,createdAt,settledAt,status:'complete'|'failed'|'interrupted',result}`. `result` completo siempre para públicas, incluso cuando resumen mapa oculto; errores solo estado seguro. Sin replay ni IDs de requests en historial público. |
| `ServiceDiceOccupancy` | null o `{rollId,author,phase:'preparing'|'rolling'|'settled',createdAt,expiresAt:null|number}`. Reserva vence a20s; después de complete no vence por desconexión. Phase rolling/settled deriva del reloj servidor/settledAt; mismo ID hasta cierre. |
| `ServiceDicePresentation` | Envelope/presentation existentes más autor y contexto público tipados; resumen (`result` del overlay) nullable según preferencia DM; resultado de log no nullable si complete. Cierre/permiso se calculan desde autor+audiencia, sin depender de resumen/replay. |
| `ServiceDiceHistoryPage` | `{revision,total,offset,limit,entries}`; limit10 por defecto, máximo50; público≤500, mezcla DM≤1000. Public/DM revisiones separadas. En páginas posteriores `revision` requerida; conflicto `DICE_HISTORY_CHANGED` solicita nueva primera página, sin mezclar snapshots. |
| `ServiceDicePublicState` | `{version:1,sequence,serverTime,selfPublicId,publishedContext,occupancy,presentation,history}`. `history` primera página10; self nullable para DM. Secuencia cambia exclusivamente por actividad pública. |
| `ServiceDiceDmState` | Unión discriminada por `audience:'dm'`, añade canal privado y página combinada. Variante player (`audience:'player'`) contiene únicamente estado público. No usar omit sobre estado DM como política de privacidad. |
| ACK de comando | `{ok:true,version:1,requestId,rollId?,outcome:'accepted'|'already-applied'|'obsolete',publicSequence}` sin snapshot ni replay. Completar/fallar añade estado final del ID cuando sea necesario para conciliación. GET de operación autorizado recupera estado por requestId; nunca dispara física. |

El log no incluye composición aún no enviada. En fases preparing se divulga solo ocupación/autor, no variables privadas. Las entradas públicas de fallo usan la composición pública aceptada y un estado seguro. El DM conserva acceso al resultado público aun navegando por otra escena. Las páginas DM combinan por tiempo servidor y orden estable de registro, nunca por reloj cliente.

### Puerto inyectado y preferencias

`ServiceDiceClient` nuevo: `getSnapshot(): ServiceDiceView`, `subscribe(listener): unsubscribe`, `begin(input,requestId)`, `complete(rollId,simulation,requestId)`, `fail(rollId,requestId)`, `dismiss(rollId,requestId)`, `history({offset,limit,revision?})`, `operation(requestId)`, y acciones DM tipadas `setPrivateContext`, `setMapResultVisibility`, `clearHistory`. `ServiceDiceView` contiene supported/connected/audience/state/error; estado inmutable y snapshot estable para `useSyncExternalStore`. Separar puerto jugador del subconjunto DM por unión discriminada o campo `dm` ausente en jugador; no pasar funciones privilegiadas a su compositor.

`begin` recibe `{visibility,selection,contextToken}`; para jugador el schema solo admite pública (o se omite el campo y el adaptador impone pública). La ruta servidor rechaza petición hidden/showPlayerResult=false de invitado aunque el renderer haya sido modificado. No acepta contexto privado ni nombres/autor arbitrarios. El DM declara public/hidden; públicas usan token publicado, ocultas token del contexto privado.

Preferencias y composición son estado **local de la sesión de cliente**, separado del borrador global DM: keyed por origen/campaña/apertura/actor, reseteado al cambiar autoridad; conservar al alternar tabs, ocultar lateral, cambiar mapa y reconectar misma admisión. Cada pestaña conserva su selección; no se sincroniza por servidor ni se modifica al editar otra pestaña. Sonido y tamaño afectan solo esa vista; sin escribir tamaños globales mediante `/dice/size`. Dos pestañas del mismo participante comparten autoría y permisos, pero no comparten un objeto mutable de composición. Esta decisión interna no promete persistencia entre cierres de aplicación.

### HTTP, negociación y compatibilidad

- GET contextual `/dice/capabilities` devuelve `{ok:true,version:1,limits}` bajo autorización vigente y contexto openingId/generation. Cliente nuevo hace una negociación por instancia; 404/versión no admitida marca unsupported sin sondeo repetido. No confundir desconexión/401/503 con falta de capacidad.
- Nueva familia `/dice/v1/state`, `/dice/v1/history`, `/dice/v1/operations/:requestId` por GET; POST `/dice/v1/begin|complete|fail|dismiss|private-context|visibility|clear-history`. Prefijos existentes `/api/v1/dm/games/:gameId` y `/api/v1/games/:gameId`; misma autoridad/cookies/Host/Origin. Los GET admiten solo query contextual y campos de paginación propios. Los POST conservan sobre `contextualMutationSchema` y `mutationSchema`, con `requestId` UUID; payload nuevo estricto por acción. No poner simulación en query.
- Después de negociar: `diceVersion=1` solo en `/table/state` y `/table/events`. Extensión opcional `serviceDice` en estado y evento nuevo `service-dice`; protocolo externo contextual permanece2, interno mesa1. Extender schemas estrictos de modo explícito. Versiones desconocidas devuelven error, no fallback silencioso. Client que no negocia recibe exactamente sobre/eventos base sin campo nuevo; nueva capacidad no aparece en eventos legacy por accidente.
- SSE proyecta en entrega según receptor autorizado, no cuando se encola: `selfPublicId`, resumen e historial por audiencia. Primera página y ocupación se toman del mismo estado síncrono. Eventos de cambio pueden transportar el estado compacto sin replay; replay se envía solo para presentación nueva. Secuencias públicas no avanzan por actividad hidden. Proyección legacy `dice` sigue mostrando solo presentación autorizada sin autores/entradas nuevas.
- Mutaciones legacy de dados en **servicio contextual** rechazan `426 DICE_UPGRADE_REQUIRED` antes de efectos, excepto report de render que mantiene su contrato seguro. Incluye begin/complete/dismiss/visibility/context/preferences/size/clear-history: un cliente antiguo no puede sobrepasar exclusión ni cancelar pública mediante contexto DM. Lectura base de mesa/dados públicos permanece; GET sesión DM legado puede devolver426 explícito. API/IPC autónomo y handler histórico no contextual conservan su contrato.
- Cliente nuevo contra servidor antiguo mantiene mesa base y comunica indisponibilidad de las acciones SDD61 sin éxito ficticio; no cae al begin legado. Reintentar capacidad solo tras crear nueva instancia/conexión explícita, no cada render. Fijar fixtures de matrices en T-01/T-04.

### Idempotencia, autoridad y resultados inciertos

Actor real deriva de `Scope` en `moderation-http`: participante autorizado para guest; propietario de campaña para DM. Mapping de autor público vive en runtime; alias duplicado no identifica al dueño. Las comprobaciones de scope/lease/commit y `scope.deliver` se conservan antes de la transición síncrona; no mutar sesión desde un callback preparatorio que aún puede hacer rollback.

Deduplicar por apertura + actor estable + requestId + fingerprint canónico de comando, no cookie/tab ni requestId global. Misma clave/cuerpo retorna mismo efecto; contenido distinto409. Comprobar ownership **antes de devolver recibos**. Repetir complete acepta solo simulación idéntica ya aceptada; no revalida un nuevo resultado sobre el mismo roll. Dismiss viejo devuelve obsolete/no-op sin alterar la presentación actual. Completar/fallar requieren autor de reserva; DM solo puede cancelar/cerrar reserva ajena, no suministrarle resultado.

No reutilizar `TableSession.once` devolviendo estado DM completo a invitado, ni almacenar snapshots/replays en cada recibo. Nuevo recibo compacto y presupuesto de dados independiente de moderación. Un ACK perdido se concilia con GET operación/estado por ID, no vuelve a simular ni crea nuevo begin. El cliente conserva una operación incierta inmutable y una simulación temporal hasta resolución/cancelación; no cola offline. Si recibo ya expiró y no hay registro conocido, mostrar resultado indeterminado y permitir nueva acción explícita; no atribuir fracaso automáticamente ni relanzar.

Errores tipados propuestos: `DICE_OCCUPIED`409 con ocupación pública segura, `DICE_CONTEXT_CHANGED`409, `DICE_STALE_ROLL`409, `DICE_HISTORY_CHANGED`409, `DICE_OPERATION_CONTENT_CONFLICT`409, `DICE_UPGRADE_REQUIRED`426, `DICE_RATE_LIMITED`429 con Retry-After, `FORBIDDEN`403. No filtrar datos de canal oculto al elegir mensaje/código de jugador.

## Seguridad, concurrencia y ciclo de vida

- `ServiceDiceSession` mantiene una pública y una privada DM; operaciones/transiciones síncronas dentro de entrega autorizada. Preparando pública → complete/rolling → settled → dismiss; nunca comienza otra pública mientras haya ocupación. Privada no consulta ni afecta exclusión/contadores/eventos públicos. Tener reserva privada no cambia resultado de begin público.
- Comprobar token de publicación en begin/complete; token privado solo para hidden. La revisión de escena aumenta también por cambios menores: no cancelar una pública por cualquier incremento; usar identidad de contexto de `TableSession.publish` (escena/mapa/marco) y retirada, conforme al contrato. Retirada, cambio real de contexto y cancelación aceptada invalidan resultado pendiente; log completo anterior permanece.
- `GameRuntimeRegistry.expire` (tick existente1s) llama `serviceDice.sweep`; vencimiento `now>=createdAt+20000`, evento de liberación aun sin requests; también tick de fase settled si necesario. `leave/revoke` cancela únicamente preparación del participante; preserva resultado completo. Revocación tardía antes de entrega impide mutación/replay. No cancelar por desconexión SSE transitoria.
- `discard/discardGame/discardOwner/clear` liberan canales, recibos, mappings y logs. Cierre/reapertura/lease/API restart no reconstruyen dados desde DB. Eventos encolados revalidan epoch/apertura/contexto antes de entrega. Continuar misma apertura sin runtime devuelve estado vacío explícito.
- Validación de complete reutiliza máximo24 piezas,361 frames,1MiB/simulación,12s de replay y rangos/rotaciones/caras. Resultado y totales se calculan en servidor desde valores; no aceptar total enviado. Worker actual15s; reserva20s. Mantener límite de confianza cliente sin promesa anti-trampas.
- Retención: anillos separados500 públicas/500 ocultas, sin replay en entradas ni recibos. Máximo2 trayectorias activas (pública/privada), cada una≤1MiB; después de asentarse, compactar a frame final para presentación estática/reconexión, descartando trayectoria completa. Receptor que reconecta obtiene último frame sin repetir animación/audio. Nunca conservar replay en historial ni caché React de páginas.
- Presupuestos internos propuestos para T-02: recibos≤64 por actor/5min,≤1024 por audiencia (jugadores/DM) y64 reservados para moderación DM; ACK compacto sin snapshots. Implementación comprobada: recibo serializado314B en el fixture máximo medido (incluye hashSHA256),≈648KiB para2112recibos/runtime sin overhead de Map. Rechazar antes de efectos si no hay capacidad; los límites/recibos DM no los consumen invitados. Begin por actor burst4 y recuperación1/s; fail/dismiss propios y moderación conservan presupuesto independiente para no impedir liberar una reserva. Limpiar buckets por expiración/revocación y limitar actores a los admitidos; pruebas de1000IDs maliciosos no aumentan memoria sin cota.
- Historial: schema de entrada sin campos de tamaño libre, máximo64KiB codificados por entrada, comprobado antes de mutar; el fixture de12grupos/24piezas eIDs escapables mide46.266B y el típico759B. Registrar tamaño total real de500+500 y demostrar la cota agregada hasta32runtimes por cálculo comprobado/tests equivalentes o medición; no exigir32procesos/renderers. El límite no es licencia para descartar públicas por actividad hidden. No guardar toda página/colección repetidamente en dedup.
- SSE conserva límites existentes2MiB de cola/buffer, backpressure5s, reautorización, cierre y limpieza. Bootstrap máximo10 entradas+presentación compacta; un replay no se suma a todo historial. Nuevas páginas HTTP tienen body acotado y autorización vigente. Mantener reservas de solicitudes/streams del DM actuales.

## Decisiones UI/UX y prototipos

Consulta **UX-61-TL-01**, `/root/ux_player_dice61`, resuelta el2026-11-15 en [UI-004, acuerdo de interacción para Build61](../../guias/ui-ux/storybook.md). No requiere lab nuevo ni imports de motores en historias. Es acuerdo de diseño, no QA ejecutada.

- PlayerApp conserva aside282px y único chevrón, tabs Mesa/Dados; adaptar `RightSidebarTabs` a opciones e IDs por instancia o reutilizar su patrón roving. Mantener paneles/controller montados al cambiar tab/colapsar, sin foco robado por resultados. Mesa conserva sesión/salida/dibujos.
- Compositor real con props tipadas: autor/ocupación, readiness, composición local, callbacks de su rol; ocupación pública bloquea solo Lanzar. Animación propia conserva bloqueos de edición existentes; d20 abre antes de reservar, Normal enfocado, cancelar no dispara begin.
- Autor/estado/X viven en área textual estable **independiente del resumen** y de WebGL. X autor/DM por ID, pendiente/error visibles. DM dispone además de control de pública vigente al consultar oculta, otro tab o mapa privado; cuando no coincide el marco, solo presentación textual/contexto público o vista publicada existente, nunca dados sobre mapa privado ni navegación forzada.
- Log10/página, jugador500 y DM mezcla500+500, valores públicos siempre. No acciones de reanimar registros ni borrar para jugador. Limpieza DM confirma alcance público/privado y conserva presentación actual. Si se oculta resumen, el control de cierre sigue visible.
- Sonido y resumen sobre mapa: `SharedSwitch` UI-001; d20 inclusión conserva selección. Select nativo real, padding derecho de clase compartida que prevalece al contexto, sin segunda flecha. Material/grupo/tipo; ≥8px visibles texto/flecha a282/390/1440px y200%.
- Story compositor/historial real por rol, estados ocupado/autor/otro/DM viendo oculta, pendiente/error/sin publicación/incompatible/fallo visual textual. Sin hook, App, PlayerApp, Pixi, Three, API real. Decoradores con `ClientProvider(null)`/portal del catálogo. Frontend conserva contraste/foco/eventos y registra revisión real.

## Datos y operación

Todo estado de dados es efímero por runtime; ningún cambio en tablas, migraciones, exportación, `.ttrpgscene`, autosave, undo ni dirty state. No tocar DB/usuarios/configuración operativa para probar. Un proceso API por base. Mantener Electron servicio sandbox/contextIsolation/sin preload y CSP existente. Si un gate necesita binario compilado, generarlo en checkout QA aislado coordinado por PM, no sobre watcher de usuario.

## Secuencia de implementación

T-01 fija DTO/puerto/fixtures y modo de composición. T-05 Select/extracción presentacional comienza en paralelo sin depender de DTO; consumir fixtures queda detrás de T-01. Después T-02 núcleo servicio y T-04 cliente pueden avanzar por fronteras distintas. T-03 integra autoridad/HTTP/runtime tras T-02; T-06 conecta React tras T-05 y puerto estable, con barrera T-03/T-04 para recorrido real. T-07 verifica integración/cierre. [Encargos completos](tareas.md); PM decide capacidad/despacho. Contratos compartidos tienen propietario backend_shared (T-01–03); adapters de navegador pertenecen a responsable client_adapter separado (T-04), frontend solo renderer/stories/GuestEntry (T-05–06). Cambios de contrato requieren coordinación, no edición simultánea.

## Decisiones pendientes para PM

No hay ambigüedad funcional bloqueante tras spec0.1 y UX-61-TL-01. PM aceptó C-61 y sincronizó autorización Q0022 en fuente. Presupuestos internos deben verificarse en T-02 y pueden ajustarse con evidencia dentro del contrato funcional; no convierten cargas sintéticas orientativas en nuevos requisitos arbitrarios. Una insuficiencia real de presupuesto se mide y ajusta dentro de límites de dominio, sin inventar reglas de composición ni eludir CA-13.

## Validación y matriz de aceptación

| Criterio | Tareas | Prueba/recorrido | Entorno y evidencia esperada |
| --- | --- | --- | --- |
| CA-01 | T-05,T-06,T-07 | Tabs/colapso conservan composición y foco | React + Chrome/Electron servicio390/1440; vídeo/capturas |
| CA-02 | T-01,T-02,T-05,T-06 | Fórmulas/grupos/percentil/d20, cancelación antes de begin | Dominio/controller/UI; fixtures de valores esperados |
| CA-03 | T-01,T-02,T-03,T-04,T-06 | Dos participantes+dos tabs mismo actor; hidden/prefs ajenas rechazados | HTTP real, React y navegador; requests/resultados |
| CA-04 | T-02,T-03,T-04,T-06,T-07 | DM+2invitados, alias duplicado/autor falseado | SQLite/PostgreSQL TLS +3vistas; bytes públicos y resultados |
| CA-05 | T-02,T-03,T-04,T-06 | Carrera begin, request perdido/repetido y ocupación settled | Unitarias+HTTP real; un ganador, cero cola |
| CA-06 | T-02,T-03,T-05,T-06 | Autor/otro/DM/DM ajeno, ID viejo, DM vista oculta/resumen off | Contrato+UI real; cierre solo objetivo |
| CA-07 | T-02,T-03,T-04,T-05 | Historial paginado mixto, cerrar/navegar/reconectar | Contrato+3clientes; páginas/recuentos coherentes |
| CA-08 | T-02,T-03,T-05,T-06 | Resumen off log con totales; toggle tras cierre | Bytes HTTP/SSE +UI; no resurrección |
| CA-09 | T-01,T-02,T-03,T-04 | Centinelas privados en todos canales; simultánea hidden/public | Contratos reales; mismos contadores/errores públicos |
| CA-10 | T-04,T-06,T-07 | Simulación única,3tamaños, reconexión/replay sin audio | Worker/render real; contador simulaciones y grabación |
| CA-11 | T-02,T-03,T-04,T-06 | Tick20s sin request, worker15s, complete perdido/reconexión | Reloj+HTTP+cliente; evento/liberación sin relanzar |
| CA-12 | T-02,T-03,T-04,T-06 | Revoke/leave/publicación/lease/COMMIT incierto y respuestas tardías | Contratos moderación SQLite/PostgreSQL TLS; cero mutación tras pérdida |
| CA-13 | T-02,T-03,T-04,T-07 | 501+501, replay compactado, cleanup/dedup/32runtimes/reinicio | Tests+medición heap JS/GPU; filas/escena sin cambios |
| CA-14 | T-05,T-07 | Select real282/390/1440 y200%, teclado/disabled | Storybook+Chrome+Electron; medidas/capturas |
| CA-15 | T-05,T-06,T-07 | Tabs/d20/Escape/cierre no disparan mapa ni roban foco | React y teclado real; nombres accesibles |
| CA-16 | T-01,T-03,T-04 | Negociación/strict schemas/legacy426/nuevo contra viejo | Contratos y clientes tipados; ningún falso éxito |
| CA-17 | T-01,T-02,T-05,T-06,T-07 | IPC player DM-only, serialización/dirty/undo iguales | Unitarias+Electron autónomo; fixture antes/después |
| CA-18 | T-05,T-07 | Historias reales rol/Select sin motores/red | Build/grafo Storybook y recorrido interactivo |

Comandos reales propuestos (no ejecutados por TL):

```sh
pnpm typecheck
pnpm lint
pnpm test src/domain/dice src/application/services/dice-roll-session.test.ts src/application/services/service-dice-session.test.ts src/application/services/game-runtime.test.ts src/infrastructure/browser/table-client.test.ts src/infrastructure/browser/service-dice-client.test.ts --maxWorkers 4
pnpm test src/renderer/src/components/dice src/renderer/src/hooks/useDiceSession.test.tsx src/renderer/src/hooks/useServiceDiceSession.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/renderer/src/PlayerApp.dice.test.tsx src/main/ipc/dice-ipc.test.ts src/server/table-http.test.ts --maxWorkers 4
pnpm test:moderation src/infrastructure/server/moderation/service-dice.contract.ts
pnpm test:moderation
pnpm check:storybook-imports
pnpm build-storybook
pnpm build:service
pnpm build
```

Los paths nuevos están marcados en tareas y se ejecutan después de crearlos. `test:moderation` selecciona *.contract.ts fuera de suite general; requiere `TTRPG_TEST_DATABASE_URL`, `TTRPG_TEST_DB_CA_FILE`, PostgreSQL real temporal/TLS, SQLite temporal y build API previo para contratos compilados. Sus fixtures importan requisitos de owned; no saltar PostgreSQL. Ejecutar en checkout aislado sin `.env` del usuario, con puertos efímeros, sin tocar8787/6006/8766. No borrar `.env` ni ejecutar migraciones sobre datos reales. Suites DB/owned completas no son gate adicional automático porque esta entrega no cambia persistencia; añadirlas si la implementación altera esas fronteras.

Plataformas: navegador DM+2jugadores y Electron servicio DM/jugador (misma UI HTTP, sin privilegios), además humo autónomo DM+PlayerIPC para Select/regresión sin función nueva. QA nativa incluye3vistas, pérdida de red, WebGL fallido, reduced motion, worker/audio cancelados, conteo canvas/listeners/heap;20ciclos abrir/cerrar/reconectar/cambiar mapa son muestra orientativa, sustituible por evidencia equivalente justificada de estabilidad, no criterio funcional adicional. Mocks React no acreditan render ni aislamiento. Registrar límites si plataforma no disponible, no sustituir por story.

## Cierre

PM consolida `validacion.md` por CA-01–18 con comandos/fechas/entornos, memoria y límites; guías de mesa/clientes y aviso de evolución37/estado/índice actualizados tras implementación. Versión minor compatible desde base3.31.2 en `package.json` y changelog por responsable de cierre propuesto T-07; TL no hace bump. No hay permiso nuevo de commit/push/merge/DMG por este plan. Revisión de documentación realizada por TL: enlaces/rutas existentes o nuevas, IDs/cobertura/grafo/ownership; pruebas de producto continúan pendientes.
