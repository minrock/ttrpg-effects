# Identidad de revisión

Checkout: /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects

Rama: feature/factory-006-persistencia-multidb. Base main: feef7120e0a3145ddd345eed714deef3542007d4. HEAD: e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. Sin commits/merge.

Prerrequisitos.env3.7.0 heredados, en factory/prerrequisitos-autenticacion.json. base-archivos.json identifica contenido de main al inicio; huellas.json incluye código y docs. El diff compara objetos de la base Git con contenido físico final, incluidos los no rastreados en la rama acumulativa, para evitar bajas aparentes de archivos ya integrados. Registros de trabajos/tablero/cola excluidos.

## Archivos del trabajo

- `CHANGELOG.md`
- `README.md`
- `docs/moderation.md`
- `docs/private-api.md`
- `docs/service-operations.md`
- `docs/synchronized-table.md`
- `package.json`
- `src/application/services/game-runtime.test.ts`
- `src/application/services/game-runtime.ts`
- `src/application/services/host-invitations.ts`
- `src/application/services/invitations.ts`
- `src/application/services/moderation.ts`
- `src/application/services/public-table-projection.ts`
- `src/application/services/table-session.ts`
- `src/infrastructure/browser/contextual-table-client.test.ts`
- `src/infrastructure/browser/contextual-table-client.ts`
- `src/infrastructure/browser/http.ts`
- `src/infrastructure/browser/table-client.ts`
- `src/infrastructure/server/database/catalog.contract.ts`
- `src/infrastructure/server/database/migrations.ts`
- `src/infrastructure/server/identity/identity.contract.ts`
- `src/infrastructure/server/identity/index.ts`
- `src/infrastructure/server/invitations/compiled.contract.ts`
- `src/infrastructure/server/invitations/guest-authority.ts`
- `src/infrastructure/server/invitations/host-repository.ts`
- `src/infrastructure/server/invitations/index.ts`
- `src/infrastructure/server/invitations/invitations.contract.ts`
- `src/infrastructure/server/invitations/persistence.contract.ts`
- `src/infrastructure/server/moderation/compiled.contract.ts`
- `src/infrastructure/server/moderation/corrections.contract.ts`
- `src/infrastructure/server/moderation/exclusion.contract.ts`
- `src/infrastructure/server/moderation/fixtures.ts`
- `src/infrastructure/server/moderation/moderation.contract.ts`
- `src/infrastructure/server/moderation/races.contract.ts`
- `src/infrastructure/server/moderation/runtime-lease.ts`
- `src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs`
- `src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs`
- `src/infrastructure/server/moderation/transport.contract.ts`
- `src/infrastructure/server/moderation/vitest.config.ts`
- `src/infrastructure/server/owned/repository.ts`
- `src/infrastructure/server/owned/systems.contract.ts`
- `src/server/invitation-backend.ts`
- `src/server/invitation-http.ts`
- `src/server/moderation-backend.ts`
- `src/server/moderation-http.ts`
- `src/server/request-body.ts`
- `src/server/table-actions.ts`
- `src/server/table-http.ts`
- `src/shared/contracts/moderation.ts`

## Diff efectivo completo contra main (incluye archivos nuevos)

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 08bc202..a8ceb68 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,5 +1,14 @@
 # Changelog
 
+## 3.12.0 — 2026-10-31
+
+### Feature
+
+- Moderación por participante y apertura: roster privado, expulsión transaccional/idempotente, revocación de todas sus credenciales y rotación única del enlace; los demás participantes conservan acceso.
+- Mesas, proyección, assets, cámaras y dados independientes por partida; HTTP/SSE contextual con autorización vigente en la entrega y limpieza terminal del adaptador cliente.
+- Migración6 y contratos reales SQLite/PostgreSQL; exclusión de proceso API con bloqueo dedicado en PostgreSQL, cuotas globales y por mesa, reinicio vacío y cierre de transportes en revocación.
+- Composición backend optativa para007–010 sin ServiceStore legado. Panel visual y corte integrado del producto continúan en011; escena v2 y Electron local compatibles.
+
 ## 3.11.1 — 2026-10-30
 
 ### Corregido — bugfix
diff --git a/README.md b/README.md
index e9c8a92..d222bd1 100644
--- a/README.md
+++ b/README.md
@@ -170,3 +170,7 @@ La versión 3.10.0 entrega partidas y recursos privados por DM, catálogo de sis
 ## Invitaciones backend009 (3.11.0)
 
 La [guía de invitaciones](docs/invitations.md) describe apertura/presencia, enlaces efímeros, alias/cookies, replay, cuotas, migración5 y restauración segura. `pnpm test:invitations` verifica contratos reales SQLite/PostgreSQL y humo API compilada. Proyección/moderación010 y pantallas/corte011 siguen pendientes; no se retira el guard de transición.
+
+## Moderación y transporte contextual010 (3.12.0)
+
+[Moderación por participante y mesas independientes](docs/moderation.md): expulsión atómica con rotación única, roster privado, HTTP/SSE/assets/dados por partida y adaptador con terminación segura. `pnpm test:moderation` verifica ambos motores reales y el backend compilado. La composición optativa no activa el frontend legado; pantallas y corte integrado permanecen en011.
diff --git a/docs/moderation.md b/docs/moderation.md
new file mode 100644
index 0000000..49628db
--- /dev/null
+++ b/docs/moderation.md
@@ -0,0 +1,56 @@
+# Moderación y transporte contextual (010)
+
+Versión3.12.0. La composición `openModerationBackend` exportada por `out/api/invitation-backend.mjs` reúne identidad007, propiedad008, invitaciones009 y moderación010. Se abre con configuración DB explícita y configuración de identidad/origen; expone `handler` y `close`. Adquiere exclusión antes de que el llamador pueda escuchar. No construye ServiceStore, no mezcla cookies legadas y no activa por accidente el frontend antiguo. El corte de producto y las pantallas de login/partidas/expulsión corresponden a011; `start:api` mantiene su guard histórico.
+
+Cada partida conserva sistema/version/hash exactos del catálogo008. El transporte público incluye solo referencia, hash y manifest de módulos compilados; nunca la definición, presentations, bindings privados ni owner. Deshabilitar una versión conserva aperturas/recursos existentes. La publicación con monstruos requiere `sceneResourceId`, correspondencia contra el recurso guardado y validación de bindings antes del commit. No se reinterpreta la calibración ni la diagonal de escenas.
+
+## Rutas y comandos
+
+El namespace privado es `/api/v1/dm/games/:gameId`; el invitado, `/api/v1/games/:gameId`. IdentidadDM se valida únicamente en el primero; la cookie009 únicamente en el segundo, incluso cuando el navegador envía ambas. Se validan Host/Origin, DTOs estrictos, tamaño de cuerpo y contexto después de esperar. GET/HEAD pueden omitir Origin; POST exige el origen exacto. No hay IPC nuevo.
+
+| Sufijo | Principal | Contrato |
+| --- | --- | --- |
+| `participants` GET | DM propietario | Query openingId, generation, limit1–100(default50), offset0–1000, state opcional connected/reconnecting/revoked/left/expired. Devuelve items,total,revision durable,presenceSequence del contexto y estado de apertura. Orden por fecha de admisión eID. |
+| `participants/:participantId/kick` POST | DM propietario | Idempotency-Key UUID; If-Match revisión lifecycle; body openingId,generation,expectedInvitationVersion. |
+| `table/state`, `table/events` GET | DM/invitado según namespace | Estado oSSE de su partida. Query opcional openingId,generation en el protocolo; el adaptador contextual siempre los envía; cualquier query extra o duplicada se rechaza. |
+| `table/scene`, `camera`, `camera-command`, `pointer`, `area-highlight` POST | DM | Sobre contextual descrito abajo. Scene admite snapshot o null; no abre/reabre una partida. |
+| `table/camera-report`, `ready`, `map-image-status` POST | Invitado | Conexión y revisión propias; no concede ediciónDM. |
+| `dice/session`, `public`, `sizes` GET | DM | Sesión/historial privado o estado público/tamaños. |
+| `dice/context`, `preferences`, `begin`, `complete`, `fail`, `dismiss`, `visibility`, `clear-history`, `size`, `render-status` POST | DM | Motor004 aislado por apertura; deduplicación por principal/audiencia. |
+| `dice/public`, `sizes` GET; `dice/render-status` POST | Invitado | Solo proyección pública y reporte de tirada visible. |
+| `assets/:assetId` GET/HEAD | Invitado | Credencial vigente, publicación actual y propiedad del asset. |
+| `assets/resolve` POST | Invitado | `{ids:[UUID...]}` máximo100; respuesta `{ok:true,assets:{id:urlO_null}}`. |
+
+Mutaciones de mesa/dados: `{openingId,generation,command:{requestId,context,connectionId?,revision?,payload},sceneResourceId?}`. `context` es el contexto de mapa004; no sustituye openingId/generation. `sceneResourceId` solo se utiliza al publicar una escena. Las rutas de apertura y heartbeat permanecen en009. El cliente contextual no invoca `table/open` como atajo; el anfitrión abre explícitamente y luego publica.
+
+401: credencial ausente/expirada/revocada.403: capacidad incorrecta.404: recurso/partida ajena o asset no publicado para un principal válido.409: revisión/contexto/huella en conflicto. El código `OPENING_CHANGED` distingue una apertura finalizada de un conflicto recuperable de mapa.400/413: validación/tamaño.429: cuota.503: autoridad o exclusión no disponible. Todas las respuestas usan no-store; no se implementa304 ni entrega parcialRange que evite la autorización. HEAD valida igual queGET. El owner usa assets privados008, nunca una cookieDM para elevar una ruta invitada.
+
+## Expulsión y datos del panel011
+
+El objetivo es siempre participantId estable, nunca alias, posición, IP o connectionId. La lista incluye alias normalizado, discriminador, admisión, presencia derivada y admittedAt; no incluye credenciales, hashes, dirección de red, email, UA ni datos de otras partidas. Dos alias iguales siguen siendo participantes distintos. Connected significa al menos un stream vigente; varias credenciales cuentan una persona técnica. Sin stream, un admitido está reconnecting; una caída de red no lo expulsa.
+
+Una única transacción confirma revocación del participante/todas sus credenciales, nueva invitación, auditoría y resultado idempotente. No cambia generación, revisión lifecycle ni lease. La revisión durable del roster incluye admisiones, salidas y expulsiones; presenceSequence es efímera y está separada por apertura. No usarla como CAS de kick.
+
+Respuesta kick: participantId,outcome (`revoked` o `already-revoked`),previousPresence,revision,invitation(metadata),secretAvailable,replayed y, solo en primera ejecución efectiva, invitationUrl. La URL no se persiste dentro del resultado. Un reintento idéntico conserva el resultado sin recuperar secreto; una clave reutilizada para otro objetivo/contenido da409. Una clave nueva contra alguien ya revocado no vuelve a rotar. Replay autorizado sigue disponible después de cerrar/reabrir según ventana009 de24h. Para compartir otro enlace tras perder la primera respuesta, obtener una rotación explícita con precondiciones nuevas.
+
+Antes de responder éxito se cancelan sus lectores HTTP pendientes y se cierran todos los streams y transfers registrados del objetivo. Los demás conservan cookies, IDs, cámaras y dados. Expulsar al principal promueve al siguiente conectado de esa partida, limpia su ACK y solicita bootstrap sin recentrar ni tirar dados. La UI011 debe confirmar alias+discriminador, pérdida de acceso y cambio de enlace, indicando que los demás permanecen. Un enlace posterior permite otra admisión: no se promete veto permanente ni identidad humana verificada.
+
+## SSE y cliente
+
+Sobre protocolVersion2: gameId,openingId,generation,SystemRef (`systemRef`),systemHash,modules,audience,epoch,sequence,context,revision,serverTime y type/state/payload. El estado interno de table004 mantiene protocolVersion1 dentro de bootstrap; el sobre externo está validado. IDs SSE: gameId:openingId:generation:epoch:audience:sequence. Los cursores nunca autorizan; al reconectar se envía bootstrap actual, sin replay histórico ni mezcla de buffers. Si una publicación gana mientras espera el primer frame, el bootstrap se reconstruye dentro de la entrega autorizada con estado/revisión vigentes y connectionId propio antes de eventos ordinarios. Estado HTTP usa protocolVersion2 con la misma metadata contextual.
+
+Solo el DM del contexto recibe invalidación `roster`; el invitado no recibe alias/IDs ajenos ni notificaciones de expulsión de otros. Los eventos terminales `access-ended`, `replaced` o `unavailable` contienen únicamente metadata propia, sin snapshot, secreto o razón privada. Se intenta enviarlos sin esperar drain; si el socket tiene datos pendientes, se destruye. Ya no se encolan frames/chunks protegidos después de la revocación. Los bytes entregados antes al transporte/red/dispositivo no pueden recuperarse retroactivamente.
+
+`contextualTableClient` crea una instancia inmutable con transporte/aborts/cursor/cola propios y reutiliza BrowserTableClient. Terminal invalida peticiones, incrementa generación, cancela timers/retries y borra snapshot, cámara, dados, punteros, áreas y URLs; notifica callback para que011 desmonte la proyección. Todas las lecturas y conexiones fijan openingId/generation. OPENING_CHANGED o un sobre válido de otra apertura termina la instancia; un409 de revisión de mapa sigue siendo recuperable. Una respuesta que resuelve después de abort no repuebla. Replaced detiene la pestaña anterior hasta un inicio explícito. Una desconexión transitoria conserva vista desactualizada y reintenta;401/403/404 termina acceso. No reusa el secreto de invitación ni reingresa por alias automáticamente. La pantalla visible se prueba en011, no se atribuye a estas pruebas del adaptador.
+
+## Cuotas y operación
+
+Máximo32 runtimes por proceso,64 streams globales,32 por partida; jugadores tienen56 globales/28 por partida, reservando8 globales/4 por partida alDM. Un stream por credencial/contexto; reconexión sustituye únicamente el anterior de esa credencial.009 admite64 credenciales activas por apertura, pero eso no promete64 streams simultáneos junto alDM.429 mantiene al admitido reconectando.
+
+HeartbeatSSE1s, watchdog cliente15s, backoffmáximo30s, frame cliente12MiB, buffer y cola por socket2MiB, cierre si no drena en5s. Assets salen en chunks64KiB con nueva autorización antes de cada escritura, sin sostener la transacción durante drain. Máximo64 peticiones HTTP entre autenticación/establecimientoSSE y trabajo autorizado; como máximo48 autorizadas, con32 para invitados y16 reservadas paraDM. Límite4 por participante,12 invitadas por apertura; DM8 por cuenta y por apertura. Durante autenticación se limita a4 por huella de cookie, sin conceder privilegios por prefijo. La reserva DM exige identidad/propiedad verificadas. El establecimientoSSE mantiene un cupo transitorio hasta registrarse en la cuota propia de streams; no consume cuota de lectores de body. El cierre del socket se observa durante la autorización y se revalida antes del registro; una respuesta cerrada no crea presencia, conexión ni heartbeat. La limpieza de registro, conexión y temporizadores es idempotente, también ante fallos de establecimiento. Los lectores HTTP se registran por participante/apertura dentro de la frontera de commit y se cancelan al revocar/cerrar/expirar/perder autoridad; liberan su cupo idempotentemente antes del ACK. Los cuerpos pendientes quedan fuera de la transacción. Se mantienen límites JSON/imagen y presupuestos de deduplicación004 (separados por audiencia y runtime). Runtimes vencidos/cerrados se destruyen; no se recrean por peticiones anónimas ni por IDs inválidos.
+
+Un procesoAPI por base. SQLite conserva control.lock físico006 y no elimina locks de procesos vivos o de antigüedad desconocida. Tras caída, el operador comprueba ausencia del proceso y sigue recuperación006; no hay reapropiación automática por timeout. PostgreSQL usa una conexión dedicada con advisory lock783496103, distinta de783496102 transaccional; se verifica propiedad antes de operaciones/envíos y se escucha error/end. Perderla invalida el proceso y cierra recursos; no se reconecta para resucitar runtimes. Un proceso nuevo solo inicia al liberarse el lock. No hay Redis, bus distribuido ni promesa de escalado horizontal.
+
+Persisten participantes/credenciales/invitación, operaciones y auditoría en migración6 (`moderation_audit`). Estado visual, cámaras, tiradas/historial, conexiones y presencia son efímeros. Reinicio dentro del lease conserva admisión, da epoch nuevo y runtime vacío: elDM debe contactar antes de nuevas entradas y publicar de nuevo. No concede otra gracia.009 mantiene fresco<30s,gracia<150s,credencial absoluta8h. Expirar, cerrar, archivar, borrar o deshabilitar invalida accesos; habilitar no resucita aperturas cerradas. Restore antiguo exige invalidación009 antes de servir.
+
+Gate `pnpm test:moderation`: SQLite físico y PostgreSQL real/TLS obligatorios, sin skip por entorno ausente; incluye HTTP/SSE, carreras, buffers, exclusión entre procesos, pérdida de canal y humo del backend compilado. ConstruirAPI primero. Los comandos y resultados de cada entrega se registran en build.md; no equivalen a despliegue, prueba visual ni prueba prolongada de carga.
diff --git a/docs/private-api.md b/docs/private-api.md
index deea3f0..2997590 100644
--- a/docs/private-api.md
+++ b/docs/private-api.md
@@ -137,3 +137,7 @@ La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado
 ## Backend privado008
 
 Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
+
+## Familia contextual010
+
+La composición optativa de cuentas007–010 entrega [moderación, HTTP/SSE por partida y assets contextuales](moderation.md). Usa las cookies/autoridades propias de cada namespace y exclusión de proceso; las credenciales nuevas siguen sin autorizar la mesa global. La pantalla y el corte integrado pertenecen a011.
diff --git a/docs/service-operations.md b/docs/service-operations.md
index 49bc606..581aef4 100644
--- a/docs/service-operations.md
+++ b/docs/service-operations.md
@@ -150,3 +150,7 @@ La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado
 ## Backend privado008
 
 Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
+
+## Operación del backend contextual010
+
+Consultar [moderación y exclusión de proceso](moderation.md) antes de componer `openModerationBackend`. La conexión PostgreSQL dedicada conserva el advisory lock783496103; perderla deja el emisor indisponible y termina sus streams. Solo un proceso por base, sin takeover por timeout. Migración6 es explícita; restaurar un backup requiere invalidar acceso009 antes de escuchar. Reinicio crea transporte vacío y nuevo epoch, conserva plazos y exige republicaciónDM. El guard de `start:api` legado se conserva hasta011.
diff --git a/docs/synchronized-table.md b/docs/synchronized-table.md
index bfe3795..318a892 100644
--- a/docs/synchronized-table.md
+++ b/docs/synchronized-table.md
@@ -69,3 +69,7 @@ Bootstrap se emite en la misma transición síncrona que registra la suscripció
 - JSON máximo **10 MiB**, imágenes **20 MiB**, simulación **1 MiB/24 dados**, highlights **10 000 celdas**. Cámaras finitas y zoom 0,01–100; viewport positivo hasta 32768 px y DPR hasta 16. Errores de contexto/revisión: 409; validación: 400/422; rol:403; sesión:401; cuotas HTTP:429.
 
 Pruebas ejecutables: `public-table-projection.test.ts`, `table-http.test.ts`, `table-client.test.ts`, más regresión HTTP/cliente/Player. Detalles y límites del recorrido visual quedan en el expediente [004/build](../factory/jobs/004-mesa-sincronizada/build.md).
+
+## Mesas por partida/apertura (010)
+
+La [guía contextual](moderation.md) define protocolo2, aislamiento de cámaras/dados/proyección, roster privado, revocación en la frontera de envío y callback terminal del adaptador. El camino legado conserva protocolo1. Runtimes y streams tienen cuotas globales además de las de cada mesa; no hay una partida activa global en la composición nueva.
diff --git a/package.json b/package.json
index 3dc05b0..01cf4e1 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "ttrpg-effects",
-  "version": "3.11.1",
+  "version": "3.12.0",
   "description": "Desktop tool for TTRPG map effects and session projection.",
   "private": true,
   "type": "module",
@@ -30,7 +30,8 @@
     "data": "node --env-file-if-exists=.env out/api/data-cli.mjs",
     "test:owned": "vitest run --config src/infrastructure/server/owned/vitest.config.ts",
     "test:invitations": "vitest run --config src/infrastructure/server/invitations/vitest.config.ts",
-    "invitations:invalidate": "node --env-file-if-exists=.env out/api/invitation-invalidate.mjs"
+    "invitations:invalidate": "node --env-file-if-exists=.env out/api/invitation-invalidate.mjs",
+    "test:moderation": "vitest run --config src/infrastructure/server/moderation/vitest.config.ts"
   },
   "build": {
     "appId": "com.luismoncaris.ttrpg-effects",
diff --git a/src/application/services/game-runtime.test.ts b/src/application/services/game-runtime.test.ts
new file mode 100644
index 0000000..979cd6c
--- /dev/null
+++ b/src/application/services/game-runtime.test.ts
@@ -0,0 +1,27 @@
+import { expect, it } from "vitest";
+import { randomUUID } from "node:crypto";
+import { GameRuntimeRegistry } from "./game-runtime";
+it("cotas globales/por partida, reserva DM, participantes únicos y limpieza", () => {
+  const registry = new GameRuntimeRegistry(Date.now, randomUUID);
+  const contexts = Array.from({ length: 33 }, () => ({ ownerId: "owner", gameId: randomUUID(), openingId: randomUUID(), generation: 1 }));
+  for (const context of contexts.slice(0, 32)) registry.runtime(context);
+  expect(() => registry.runtime(contexts[32])).toThrow(); registry.discard(contexts[0]); registry.runtime(contexts[32]); registry.clear();
+  const releases: Array<() => void> = [];
+  for (const context of contexts.slice(0, 2)) for (let n = 0; n < 28; n++) { let release = () => {}; release = registry.register(context, randomUUID(), "player", () => release(), randomUUID()); releases.push(release); }
+  expect(() => registry.register(contexts[2], randomUUID(), "player", () => {})).toThrow();
+  for (const context of contexts.slice(0, 2)) for (let n = 0; n < 4; n++) { let release = () => {}; release = registry.register(context, randomUUID(), "dm", () => release()); releases.push(release); }
+  expect(() => registry.register(contexts[2], randomUUID(), "dm", () => {})).toThrow();
+  releases.forEach(release => release()); registry.clear(); expect(() => registry.register(contexts[0], "free", "player", () => {})).not.toThrow();
+});
+it("lectores HTTP tienen cupos de principal/apertura, reserva DM y cancelación de ciclo de vida", () => {
+  let at = 1000; const registry = new GameRuntimeRegistry(() => at, randomUUID), closed: string[] = [];
+  const ctx = (owner: string, game = randomUUID()) => ({ ownerId: owner, gameId: game, openingId: randomUUID(), generation: 1 });
+  const open = (context: ReturnType<typeof ctx>, principal: string, role: "player" | "dm", expiresAt?: string) => registry.request(context, principal, role, () => closed.push(principal), role === "player" ? principal : undefined, expiresAt);
+  const context = ctx("owner"); for (let i = 0; i < 4; i++) open(context, "player", "player"); expect(() => open(context, "player", "player")).toThrow(); registry.revoke(context, "player"); expect(registry.pendingRequests).toBe(0); expect(closed).toHaveLength(4);
+  for (let i = 0; i < 8; i++) { const c = ctx("owner"); for (let j = 0; j < 4; j++) open(c, `p${i}`, "player"); }
+  expect(() => open(ctx("owner"), "exceso", "player")).toThrow();
+  for (const owner of ["one", "two"]) { const c = ctx(owner); for (let i = 0; i < 8; i++) open(c, `${owner}${i}`, "dm"); }
+  expect(registry.pendingRequests).toBe(48); expect(() => open(ctx("three"), "other", "dm")).toThrow(); registry.clear(); expect(registry.pendingRequests).toBe(0);
+  const release = open(context, "expira", "player", new Date(2000).toISOString()); at = 2000; registry.expire(); release(); expect(registry.pendingRequests).toBe(0);
+  open(context, "leave", "player"); registry.leave(context.gameId, "leave"); open(context, "closed", "player"); registry.discardGame(context.gameId); open(context, "disabled", "player"); registry.discardOwner(context.ownerId); open(context, "session", "dm"); registry.revokeHost(context.ownerId, "session"); expect(registry.pendingRequests).toBe(0);
+});
diff --git a/src/application/services/game-runtime.ts b/src/application/services/game-runtime.ts
index be24d94..1ec5d06 100644
--- a/src/application/services/game-runtime.ts
+++ b/src/application/services/game-runtime.ts
@@ -3,21 +3,72 @@ import type { OwnedTransaction } from "./owned-store";
 import { OwnedError } from "./owned-store";
 import { TableSession } from "./table-session";
 import { publicTableProjection } from "./public-table-projection";
-export interface GameContext { readonly ownerId: string; readonly gameId: string; readonly openingId: string; readonly generation: number }
+export interface GameContext { readonly ownerId: string; readonly gameId: string; readonly openingId: string; readonly generation: number; readonly leaseExpiresAt?: string }
 /** Primitivas para009/010; ninguna ruta invitada montada en008. Un registro por proceso API. */
 export class GameRuntimeRegistry {
+  private readonly contexts = new Map<string, GameContext>();
+  private readonly streams = new Map<string, { context: GameContext; credential: string; participant?: string; role: "dm" | "player"; close: (reason: "access-ended" | "replaced" | "unavailable") => void }>();
+  private readonly transfers = new Set<{ context: GameContext; participant: string; close: () => void }>();
+  private readonly requests = new Set<{ context: GameContext; principal: string; role: "dm" | "player"; participant?: string; expiresAt?: string; close(): void }>();
+  get pendingRequests() { return this.requests.size; }
+  request(context: GameContext, principal: string, role: "dm" | "player", close: () => void, participant?: string, expiresAt?: string) {
+    const all = [...this.requests], local = all.filter(r => this.key(r.context) === this.key(context));
+    const principalCount = all.filter(r => r.role === role && (role === "dm" ? r.context.ownerId === context.ownerId : r.principal === principal)).length;
+    // Hasta48 solicitudes autorizadas;16 reservadas aDM y espacio para autenticar dentro de la cota HTTP64.
+    if (all.length >= 48 || principalCount >= (role === "dm" ? 8 : 4) || local.filter(r => r.role === role).length >= (role === "dm" ? 8 : 12) || role === "player" && all.filter(r => r.role === "player").length >= 32) throw new OwnedError("OPERATION_BUDGET");
+    const entry = { context, principal, role, participant, expiresAt, close }; this.requests.add(entry);
+    return () => { this.requests.delete(entry); };
+  }
+  private cancelRequests(predicate: (r: { context: GameContext; principal: string; role: "dm" | "player"; participant?: string; expiresAt?: string }) => boolean) { for (const request of [...this.requests]) if (predicate(request)) { this.requests.delete(request); request.close(); } }
+  track(context: GameContext, participant: string, close: () => void) { const entry = { context, participant, close }; this.transfers.add(entry); return () => { this.transfers.delete(entry); }; }
+  private readonly presenceRevisions = new Map<string, number>();
+  private presenceChanged(context: GameContext) { const key = this.key(context); this.presenceRevisions.set(key, (this.presenceRevisions.get(key) ?? 0) + 1); }
   private readonly entries = new Map<string, TableSession>();
   constructor(private readonly now: () => number, private readonly id: () => string) {}
   private key(context: GameContext) { return JSON.stringify([context.ownerId, context.gameId, context.openingId, context.generation]); }
   async context(tx: OwnedTransaction, owner: string, gameId: string): Promise<GameContext> {
     const game = await tx.games.find(owner, gameId), opening = game ? await tx.openings.current(gameId) : null;
     if (!game || game.state !== "ready" || !opening || opening.state !== "open" || Date.parse(opening.leaseExpiresAt) <= this.now()) throw new OwnedError("NOT_FOUND");
-    return Object.freeze({ ownerId: owner, gameId, openingId: opening.id, generation: opening.generation });
+    return Object.freeze({ ownerId: owner, gameId, openingId: opening.id, generation: opening.generation, leaseExpiresAt: opening.leaseExpiresAt });
+  }
+  renew(opening: import("./owned-store").Opening) { for (const r of this.requests) if (r.context.openingId === opening.id && r.context.gameId === opening.gameId) r.context = { ...r.context, leaseExpiresAt: opening.leaseExpiresAt }; for (const [key, context] of this.contexts) if (context.openingId === opening.id && context.gameId === opening.gameId) this.contexts.set(key, { ...context, leaseExpiresAt: opening.leaseExpiresAt }); }
+  expire() { this.cancelRequests(r => !!(r.expiresAt && Date.parse(r.expiresAt) <= this.now() || r.context.leaseExpiresAt && Date.parse(r.context.leaseExpiresAt) <= this.now())); for (const context of [...this.contexts.values()]) if (context.leaseExpiresAt && Date.parse(context.leaseExpiresAt) <= this.now()) this.discard(context); }
+  runtime(context: GameContext): TableSession {
+    this.expire();
+    const key = this.key(context);
+    for (const [other, value] of this.contexts) if (value.gameId === context.gameId && other !== key) this.discard(value);
+    let value = this.entries.get(key);
+    if (!value) {
+      if (this.entries.size >= 32) throw new OwnedError("OPERATION_BUDGET");
+      value = new TableSession(this.now, this.id, reference => /^asset:[a-f0-9-]{36}$/.test(reference) ? `/api/v1/games/${context.gameId}/assets/${reference.slice(6)}` : null);
+      this.entries.set(key, value); this.contexts.set(key, Object.freeze({ ...context }));
+    }
+    this.contexts.set(key, Object.freeze({ ...context }));
+    return value;
+  }
+  register(context: GameContext, key: string, role: "dm" | "player", close: (reason: "access-ended" | "replaced" | "unavailable") => void, participant?: string) {
+    const scoped = this.key(context) + key;
+    this.streams.get(scoped)?.close("replaced");
+    const local = [...this.streams.values()].filter(s => this.key(s.context) === this.key(context));
+    if (this.streams.size >= 64 || local.length >= 32 || role === "player" && ([...this.streams.values()].filter(s => s.role === "player").length >= 56 || local.filter(s => s.role === "player").length >= 28)) throw new OwnedError("OPERATION_BUDGET");
+    const entry = { context, credential: key, participant, role, close }; this.streams.set(scoped, entry); if (role === "player") this.presenceChanged(context);
+    return () => { if (this.streams.get(scoped) === entry) { this.streams.delete(scoped); if (role === "player") this.presenceChanged(context); } };
   }
+  connected(context: GameContext, participant: string) { return [...this.streams.values()].some(s => this.key(s.context) === this.key(context) && s.participant === participant); }
+  presenceSequence(context: GameContext) { return this.presenceRevisions.get(this.key(context)) ?? 0; }
+  discardOwner(owner: string) { this.cancelRequests(r => r.context.ownerId === owner); for (const context of [...this.contexts.values()]) if (context.ownerId === owner) this.discard(context); }
+  revokeHost(owner: string, session?: string) { this.cancelRequests(r => r.context.ownerId === owner && r.role === "dm" && (!session || r.principal === session)); for (const s of [...this.streams.values()]) if (s.context.ownerId === owner && s.role === "dm" && (!session || s.credential === session)) s.close("access-ended"); }
+  discardGame(game: string) { this.cancelRequests(r => r.context.gameId === game); for (const context of [...this.contexts.values()]) if (context.gameId === game) this.discard(context); }
+  leave(game: string, participant: string) { this.cancelRequests(r => r.context.gameId === game && r.participant === participant); for (const t of [...this.transfers]) if (t.context.gameId === game && t.participant === participant) t.close(); for (const s of [...this.streams.values()]) if (s.context.gameId === game && s.participant === participant) s.close("access-ended"); }
+  revoke(context: GameContext, participant: string) { this.cancelRequests(r => this.key(r.context) === this.key(context) && r.participant === participant); for (const t of [...this.transfers]) if (this.key(t.context) === this.key(context) && t.participant === participant) t.close(); for (const s of [...this.streams.values()]) if (this.key(s.context) === this.key(context) && s.participant === participant) s.close("access-ended"); }
   /** Ejecutar dentro de identity.authorized: la revalidación comparte exclusión con archivo/borrado. */
-  async publish(tx: OwnedTransaction, context: GameContext, snapshot: PlayerWindowSnapshot | null, sceneResourceId?: string): Promise<void> {
+  async publish(tx: OwnedTransaction, context: GameContext, snapshot: PlayerWindowSnapshot | null, sceneResourceId?: string, operation?: { owner: string; id: string; fingerprint: string }): Promise<void> {
     const current = await this.context(tx, context.ownerId, context.gameId);
     if (this.key(current) !== this.key(context)) throw new OwnedError("CONFLICT");
+    if (operation) {
+      try { if (this.entries.get(this.key(context))?.checkOnce(operation.owner, operation.id, operation.fingerprint)) return; }
+      catch { throw new OwnedError("OPERATION_CONTENT_CONFLICT"); }
+    }
     const prepared = structuredClone(snapshot);
     if (prepared) for (const asset of publicTableProjection(prepared).assets) if (!await tx.assets.has(asset.slice(6))) throw new OwnedError("NOT_FOUND");
     if (prepared?.scene.sceneAside.monsters.length && !sceneResourceId) throw new OwnedError("VALIDATION");
@@ -38,14 +89,14 @@ export class GameRuntimeRegistry {
       if (this.key(await this.context(tx, context.ownerId, context.gameId)) !== key) throw new OwnedError("CONFLICT");
     });
     tx.effects.afterCommit(() => {
-      let runtime = this.entries.get(key);
-      if (!runtime) { runtime = new TableSession(this.now, this.id); this.entries.set(key, runtime); }
-      runtime.publish(prepared);
-    }, () => { this.entries.delete(key); });
+      const table = this.runtime(context);
+      if (operation) table.once(operation.owner, operation.id, operation.fingerprint, () => { table.publish(prepared); return { ok: true }; });
+      else table.publish(prepared);
+    }, () => { this.discard(context); });
   }
   /** Esta comprobación sola no autoriza invitados:009/010 deben validar credencial, lease y generación. */
   allows(context: GameContext, reference: string): boolean { return this.entries.get(this.key(context))?.allows(reference) ?? false; }
   state(context: GameContext) { return this.entries.get(this.key(context))?.state("dm") ?? null; }
-  discard(context: GameContext): void { const key = this.key(context); this.entries.get(key)?.publish(null); this.entries.delete(key); }
-  clear(): void { for (const runtime of this.entries.values()) runtime.publish(null); this.entries.clear(); }
+  discard(context: GameContext): void { this.cancelRequests(r => this.key(r.context) === this.key(context)); for (const t of [...this.transfers]) if (this.key(t.context) === this.key(context)) t.close(); const key = this.key(context); for (const s of [...this.streams.values()]) if (this.key(s.context) === key) s.close("access-ended"); this.entries.delete(key); this.contexts.delete(key); this.presenceRevisions.delete(key); }
+  clear(): void { this.cancelRequests(() => true); for (const t of [...this.transfers]) t.close(); for (const s of [...this.streams.values()]) s.close("unavailable"); this.entries.clear(); this.contexts.clear(); this.presenceRevisions.clear(); }
 }
diff --git a/src/application/services/host-invitations.ts b/src/application/services/host-invitations.ts
index 152271b..09b08ee 100644
--- a/src/application/services/host-invitations.ts
+++ b/src/application/services/host-invitations.ts
@@ -6,7 +6,7 @@ import { presenceState } from "../../domain/invitations/invitation";
 import { canonicalUuid, expectedOpeningSchema, openingContextSchema, rotateSchema, type ExpectedOpening, type OpeningContext } from "../../shared/contracts/invitations";
 export interface Presence { has(opening: Opening): boolean; mark(opening: Opening): void; forget(gameId: string): void; clear(): void }
 export interface InvitationSecrets { generate(): string; hash(game: string, opening: string, version: number, secret: string): string }
-export function hostInvitations(identity: IdentityService, guests: GuestAuthority, presence: Presence, secrets: InvitationSecrets, origin: string, now: () => Date): InvitationService {
+export function hostInvitations(identity: IdentityService, guests: GuestAuthority, presence: Presence, secrets: InvitationSecrets, origin: string, now: () => Date, transition: (game: string) => void = () => {}, onContact: (opening: Opening) => void = () => {}): InvitationService {
   const valid = (game: string, revision?: number, request?: string) => { if (!canonicalUuid.safeParse(game).success || revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1) || request !== undefined && !canonicalUuid.safeParse(request).success) throw new InvitationError("INVALID_INPUT"); };
   const inspect = async (tx: OwnedTransaction, game: string): Promise<OpeningStatus> => {
     const opening = await tx.openings.current(game), system = await tx.links.resolve(game);
@@ -21,7 +21,7 @@ export function hostInvitations(identity: IdentityService, guests: GuestAuthorit
   };
   const contact = (tx: OwnedTransaction, opening: Opening) => {
     const captured = structuredClone(opening);
-    tx.effects.afterCommit(() => presence.mark(captured), () => presence.forget(captured.gameId));
+    tx.effects.afterCommit(() => { presence.mark(captured); onContact(captured); }, () => presence.forget(captured.gameId));
   };
   const final = (tx: OwnedTransaction, opening: Opening, fresh: boolean) => {
     const captured = structuredClone(opening);
@@ -47,6 +47,7 @@ export function hostInvitations(identity: IdentityService, guests: GuestAuthorit
           const opening = await tx.openings.start(game, revision);
           secret = secrets.generate(); await tx.invitations.issue(game, opening.id, 0, secrets.hash(game, opening.id, 1, secret));
           await tx.invitations.audit(game, opening.id, reopen ? "reopen" : "start");
+          tx.effects.afterCommit(() => transition(game), () => transition(game));
           contact(tx, opening); final(tx, opening, true);
           return { ...await inspect(tx, game), status: "fresh" as const };
         });
@@ -83,7 +84,7 @@ export function hostInvitations(identity: IdentityService, guests: GuestAuthorit
         if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
         await tx.operation(request, `close:${game}:${context.openingId}:${context.generation}`, { context, revision }, async () => {
           await tx.openings.close(game, context.openingId, context.generation, revision); await tx.invitations.audit(game, context.openingId, "close");
-          tx.effects.afterCommit(() => presence.forget(game), () => presence.forget(game)); return null;
+          tx.effects.afterCommit(() => { presence.forget(game); transition(game); }, () => { presence.forget(game); transition(game); }); return null;
         });
       });
     },
diff --git a/src/application/services/invitations.ts b/src/application/services/invitations.ts
index cc6034c..3e7d674 100644
--- a/src/application/services/invitations.ts
+++ b/src/application/services/invitations.ts
@@ -9,13 +9,20 @@ const messages: Record<InvitationCode, string> = {
 export class InvitationError extends ApplicationError { constructor(readonly code: InvitationCode, readonly retryAt?: string) { super(messages[code]); } }
 /** Privado del DM y prestado solamente dentro de IdentityService.authorized. */
 export interface InvitationRepository {
+  participants(gameId: string, openingId: string): Promise<{ items: import("../../shared/contracts/moderation").Participant[]; revision: number }>;
+  revoke(gameId: string, openingId: string, participantId: string, invitationVersion: number): Promise<boolean>;
   current(gameId: string, openingId: string): Promise<InvitationMetadata | null>;
   issue(gameId: string, openingId: string, expectedVersion: number, hash: string): Promise<InvitationMetadata>;
   sponsor(gameId: string, openingId: string): Promise<boolean>;
   audit(gameId: string, openingId: string, action: "start" | "reopen" | "rotate" | "close"): Promise<void>;
 }
 /** Capacidad010: no expone repositorios privados ni SQL. DTO no es autoridad. */
-export interface GuestTransaction { session(): Promise<GuestDto>; leave(): Promise<void> }
+export interface GuestTransaction {
+  session(): Promise<GuestDto>; leave(): Promise<void>;
+  transport(): Promise<{ context: import("./game-runtime").GameContext; system: import("../../domain/systems/system-catalog").ResolvedSystem }>;
+  asset(id: string): Promise<{ mime: string; bytes: Uint8Array } | null>;
+  deliver(effect: () => void, uncertain: () => void): Promise<void>;
+}
 export interface GuestAuthority {
   admit(gameId: string, input: { secret: string; alias: string }, requestId: string, token: string | null): Promise<{ guest: GuestDto; token?: string; replayed: boolean }>;
   authorized<T>(gameId: string, token: string | null, work: (guest: GuestDto, tx: GuestTransaction) => Promise<T>): Promise<T>;
diff --git a/src/application/services/moderation.ts b/src/application/services/moderation.ts
new file mode 100644
index 0000000..8763a9a
--- /dev/null
+++ b/src/application/services/moderation.ts
@@ -0,0 +1,53 @@
+import type { IdentityService } from "./identity";
+import { OwnedError } from "./owned-store";
+import type { InvitationSecrets } from "./host-invitations";
+import { InvitationError } from "./invitations";
+import { canonicalUuid, type OpeningContext } from "../../shared/contracts/invitations";
+import { kickSchema, rosterQuerySchema, type RosterQuery, type Roster } from "../../shared/contracts/moderation";
+import type { GameRuntimeRegistry } from "./game-runtime";
+export function moderation(identity: IdentityService, runtimes: GameRuntimeRegistry, secrets: InvitationSecrets, origin: string, guard: () => Promise<void> = async () => {}, now = Date.now) {
+  const valid = (...ids: string[]) => { if (ids.some(id => !canonicalUuid.safeParse(id).success)) throw new InvitationError("INVALID_INPUT"); };
+  return {
+    async roster(cookie: string, game: string, query: RosterQuery): Promise<Roster> {
+      valid(game); query = rosterQuerySchema.parse(query);
+      return identity.authorized(cookie, "dm", async (actor, tx) => {
+        const own = await tx.games.find(actor.account.id, game), opening = own ? await tx.openings.current(game) : null;
+        if (!own) throw new OwnedError("NOT_FOUND");
+        if (!opening || opening.id !== query.openingId || opening.generation !== query.generation) throw new InvitationError("REVISION_CONFLICT");
+        const ctx = { ownerId: actor.account.id, gameId: game, openingId: opening.id, generation: opening.generation };
+        const status = opening.state === "closed" ? "closed" : Date.parse(opening.leaseExpiresAt) <= now() ? "expired" : "open";
+        const data = await tx.invitations.participants(game, ctx.openingId);
+        const all = data.items.map(p => ({ ...p, presence: p.admission === "admitted" && status !== "open" ? "expired" as const : p.presence === "reconnecting" && runtimes.connected(ctx, p.participantId) ? "connected" as const : p.presence }));
+        const items = all.filter(p => !query.state || p.presence === query.state);
+        return { openingId: opening.id, generation: opening.generation, status, items: items.slice(query.offset, query.offset + query.limit), total: items.length, revision: data.revision, presenceSequence: runtimes.presenceSequence(ctx) };
+      });
+    },
+    async kick(cookie: string, game: string, target: string, input: OpeningContext & { expectedInvitationVersion: number }, revision: number, request: string) {
+      valid(game, target, request); input = kickSchema.parse(input);
+      if (!Number.isSafeInteger(revision) || revision < 1) throw new InvitationError("INVALID_INPUT");
+      let secret: string | undefined;
+      const result = await identity.authorized(cookie, "dm", async (actor, tx) => {
+        tx.effects.beforeCommit(guard);
+        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
+        return tx.operation(request, `kick:${game}:${input.openingId}:${input.generation}`, { target, input, revision }, async () => {
+          const ctx = await runtimes.context(tx, actor.account.id, game);
+          if (ctx.openingId !== input.openingId || ctx.generation !== input.generation) throw new InvitationError("REVISION_CONFLICT");
+          const roster = await tx.invitations.participants(game, ctx.openingId), participant = roster.items.find(p => p.participantId === target);
+          if (!participant) throw new OwnedError("NOT_FOUND");
+          const prior = await tx.invitations.current(game, ctx.openingId);
+          if (!prior) throw new InvitationError("UNAVAILABLE");
+          if (participant.admission === "revoked") return { participantId: target, outcome: "already-revoked" as const, previousPresence: participant.presence, revision: roster.revision, invitation: prior };
+          const opening = await tx.openings.current(game);
+          if (opening?.revision !== revision || prior.version !== input.expectedInvitationVersion) throw new InvitationError("REVISION_CONFLICT");
+          await tx.invitations.revoke(game, ctx.openingId, target, prior.version + 1);
+          secret = secrets.generate();
+          const invitation = await tx.invitations.issue(game, ctx.openingId, prior.version, secrets.hash(game, ctx.openingId, prior.version + 1, secret));
+          tx.effects.beforeCommit(async () => { const current = await runtimes.context(tx, actor.account.id, game); if (current.openingId !== ctx.openingId || current.generation !== ctx.generation) throw new InvitationError("REVISION_CONFLICT"); });
+          tx.effects.afterCommit(() => { runtimes.revoke(ctx, target); }, () => runtimes.discard(ctx));
+          return { participantId: target, outcome: "revoked" as const, previousPresence: runtimes.connected(ctx, target) ? "connected" as const : participant.presence, revision: roster.revision + 1, invitation };
+        });
+      });
+      return { ...result, secretAvailable: secret !== undefined, replayed: secret === undefined, ...(secret ? { invitationUrl: `${origin}/jugar/${game}#invitacion=${secret}` } : {}) };
+    }
+  };
+}
diff --git a/src/application/services/public-table-projection.ts b/src/application/services/public-table-projection.ts
index 8fb4cf3..fabe754 100644
--- a/src/application/services/public-table-projection.ts
+++ b/src/application/services/public-table-projection.ts
@@ -6,7 +6,7 @@ import { getPlayerVisibleSceneCounters } from "../../domain/counters/scene-count
 import { assetUrl } from "../../shared/contracts/service-references";
 
 /** Frontera de privacidad de red: los esquemas hoja eliminan propiedades desconocidas; nunca se copian ramas privadas. */
-export function publicTableProjection(input: PlayerWindowSnapshot): { snapshot: PlayerWindowSnapshot; assets: Set<string> } {
+export function publicTableProjection(input: PlayerWindowSnapshot, urlForAsset = assetUrl): { snapshot: PlayerWindowSnapshot; assets: Set<string> } {
   const assets = new Set<string>();
   const reference = (value: string | null): string | null => {
     if (!value || !assetUrl(value)) return null;
@@ -46,8 +46,8 @@ export function publicTableProjection(input: PlayerWindowSnapshot): { snapshot:
   };
   return { assets, snapshot: {
     scene, camera: { center: { ...input.camera.center }, zoom: input.camera.zoom },
-    mapImageUrl: map.map.imagePath ? assetUrl(map.map.imagePath) : null,
-    tokenImageUrls: Object.fromEntries(map.tokens.flatMap(t => { const url = assetUrl(t.imagePath); return url ? [[t.id, url]] : []; })),
+    mapImageUrl: map.map.imagePath ? urlForAsset(map.map.imagePath) : null,
+    tokenImageUrls: Object.fromEntries(map.tokens.flatMap(t => { const url = urlForAsset(t.imagePath); return url ? [[t.id, url]] : []; })),
     showDmFogOverlay: false, showZoomIndicator: input.showZoomIndicator ?? false,
     cameraSyncKey: input.cameraSyncKey ?? 0, informationAreaHighlightResetKey: input.informationAreaHighlightResetKey ?? 0
   } };
diff --git a/src/application/services/table-session.ts b/src/application/services/table-session.ts
index 9d2dd2f..bc7e50e 100644
--- a/src/application/services/table-session.ts
+++ b/src/application/services/table-session.ts
@@ -6,7 +6,7 @@ import type { TableEvent, TableState } from "../../shared/contracts/table";
 import type { ServiceRole } from "../../shared/contracts/http-api";
 
 export class TableConflict extends Error {}
-interface Connection { id: string; owner: string; role: ServiceRole; emit: (event: TableEvent) => void; report: PlayerCameraReport | null; ready: boolean; imageStatus: "waiting" | "loading" | "ready" | "error"; lastReport: number }
+interface Connection { id: string; owner: string; role: ServiceRole; participant?: string; emit: (event: TableEvent) => void; report: PlayerCameraReport | null; ready: boolean; imageStatus: "waiting" | "loading" | "ready" | "error"; lastReport: number }
 /** Transiciones síncronas: snapshot y permisos se actualizan juntos. */
 export class TableSession {
   readonly epoch: string;
@@ -24,7 +24,7 @@ export class TableSession {
   private sequence = { dm: 0, player: 0 };
   private dedup = new Map<string, { fingerprint: string; result: unknown; until: number; bytes: number; role: ServiceRole }>();
   private dedupBudgets = { dm: { count: 0, bytes: 0 }, player: { count: 0, bytes: 0 } };
-  constructor(readonly now: () => number, private readonly id: () => string) {
+  constructor(readonly now: () => number, private readonly id: () => string, private readonly assetUrl?: (reference: string) => string | null) {
     this.epoch = id();
     this.dice = new DiceRollSession((role, payload) => this.emit("dice", payload, role), now, id);
   }
@@ -33,7 +33,7 @@ export class TableSession {
   allows(reference: string): boolean { return this.assets.has(reference); }
   presence(): NonNullable<TableState["presence"]> {
     const p = this.primary;
-    return { count: [...this.connections.values()].filter(c => c.role === "player").length, primaryId: p?.id ?? null, ready: p?.ready ?? false, imageStatus: p?.imageStatus ?? "waiting", report: p?.report ?? null };
+    return { count: new Set([...this.connections.values()].filter(c => c.role === "player").map(c => c.participant ?? c.owner)).size, primaryId: p?.id ?? null, ready: p?.ready ?? false, imageStatus: p?.imageStatus ?? "waiting", report: p?.report ?? null };
   }
   state(role: ServiceRole, connectionId?: string): TableState {
     return { protocolVersion: 1, epoch: this.epoch, context: this.context, revision: this.revision, serverTime: this.now(), snapshot: this.snapshot, camera: this.camera, cameraCommand: this.command,
@@ -43,8 +43,9 @@ export class TableSession {
       highlight: this.highlight && this.highlight.expiresAt > this.now() ? this.highlight : null };
   }
   sizes(role: ServiceRole) { const sizes = this.dice.getSizes(); return role === "dm" ? sizes : { revision: sizes.revision, dm: 1, player: sizes.player }; }
+  transportSequence(role: ServiceRole) { return ++this.sequence[role]; }
   private event(type: TableEvent["type"], role: ServiceRole, payload?: unknown): TableEvent {
-    return { protocolVersion: 1, epoch: this.epoch, context: this.context, revision: this.revision, serverTime: this.now(), sequence: ++this.sequence[role], type, ...(payload === undefined ? {} : { payload }) };
+    return { protocolVersion: 1, epoch: this.epoch, context: this.context, revision: this.revision, serverTime: this.now(), sequence: this.transportSequence(role), type, ...(payload === undefined ? {} : { payload }) };
   }
   emit(type: TableEvent["type"], payload: unknown, role?: ServiceRole): void {
     for (const audience of role ? [role] : ["dm", "player"] as const) {
@@ -52,17 +53,17 @@ export class TableSession {
       for (const c of this.connections.values()) if (c.role === audience) c.emit(event);
     }
   }
-  connect(owner: string, role: ServiceRole, emit: Connection["emit"]): { id: string; close: () => void } {
+  connect(owner: string, role: ServiceRole, emit: Connection["emit"], participant?: string): { id: string; close: () => void } {
     // HTTP reemplaza el stream anterior de esta sesión antes de conectar.
     const id = this.id();
-    this.connections.set(id, { id, owner, role, emit, report: null, ready: false, imageStatus: this.snapshot ? "loading" : "waiting", lastReport: -Infinity });
+    this.connections.set(id, { id, owner, role, participant, emit, report: null, ready: false, imageStatus: this.snapshot ? "loading" : "waiting", lastReport: -Infinity });
     emit({ ...this.event("bootstrap", role), state: this.state(role, id) });
     this.emit("presence", this.presence(), "dm");
     return { id, close: () => {
       const wasPrimary = this.primary?.id === id;
       if (!this.connections.delete(id)) return;
       const promoted = wasPrimary ? this.primary : null;
-      if (promoted) promoted.report = null;
+      if (promoted) { promoted.report = null; promoted.ready = false; }
       this.emit("presence", this.presence(), "dm");
       // Solicitar confirmación actual sin una nueva orden ni cambiar navegación local.
       if (promoted) promoted.emit({ ...this.event("bootstrap", "player"), state: this.state("player", promoted.id) });
@@ -71,7 +72,7 @@ export class TableSession {
   publish(snapshot: PlayerWindowSnapshot | null): void {
     const identity = snapshot ? JSON.stringify([snapshot.scene.id, snapshot.scene.activeMapId, snapshot.cameraSyncKey ?? 0]) : "";
     const changed = this.context === null || identity !== this.identity;
-    const projected = snapshot ? publicTableProjection(snapshot) : null;
+    const projected = snapshot ? publicTableProjection(snapshot, this.assetUrl) : null;
     const changedImage = this.snapshot?.mapImageUrl !== projected?.snapshot.mapImageUrl;
     if (changed) {
       this.context = this.id(); this.command = null; this.pointer = null; this.highlight = null;
@@ -115,6 +116,12 @@ export class TableSession {
   }
   setPointer(value: NonNullable<TableState["pointer"]>["value"]) { this.pointer = { value, startedAt: this.now(), expiresAt: this.now() + value.durationMs }; this.emit("pointer", this.pointer); }
   setHighlight(value: NonNullable<TableState["highlight"]>["value"]) { this.highlight = { value, startedAt: this.now(), expiresAt: this.now() + 5000 }; this.emit("highlight", this.highlight); }
+  checkOnce(owner: string, requestId: string, fingerprint: string): boolean {
+    const old = this.dedup.get(`${owner}:${requestId}`);
+    if (!old || old.until <= this.now()) return false;
+    if (old.fingerprint !== fingerprint) throw new TableConflict("El identificador ya se usó con otro contenido.");
+    return true;
+  }
   once(owner: string, requestId: string, fingerprint: string, run: () => unknown, role: ServiceRole = "dm"): unknown {
     for (const [key, entry] of this.dedup) if (entry.until <= this.now()) {
       this.dedup.delete(key); this.dedupBudgets[entry.role].bytes -= entry.bytes; this.dedupBudgets[entry.role].count--;
diff --git a/src/infrastructure/browser/contextual-table-client.test.ts b/src/infrastructure/browser/contextual-table-client.test.ts
new file mode 100644
index 0000000..2d90aab
--- /dev/null
+++ b/src/infrastructure/browser/contextual-table-client.test.ts
@@ -0,0 +1,62 @@
+import { afterEach, expect, it, vi } from "vitest";
+import { randomUUID } from "node:crypto";
+import { contextualTableClient } from "./contextual-table-client";
+import { TableSession } from "../../application/services/table-session";
+import { systemSeeds } from "../../domain/systems/system-catalog";
+import { createDefaultScene } from "../../domain/sessions/default-scene";
+import type { TableEvent } from "../../shared/contracts/table";
+const clients: ReturnType<typeof contextualTableClient>[] = [];
+afterEach(() => { clients.splice(0).forEach(c => c.clear()); vi.useRealTimers(); });
+const flush = async () => { for (let n = 0; n < 25; n++) await Promise.resolve(); };
+function fixture() {
+  const context = { gameId: randomUUID(), openingId: randomUUID(), generation: 1, audience: "player" as const }, terminal = vi.fn();
+  const meta = { ...context, systemRef: systemSeeds[0].ref, systemHash: "a".repeat(64), modules: systemSeeds[0].definition.manifest };
+  const table = new TableSession(Date.now, randomUUID), events: TableEvent[] = [];
+  table.publish({ showDmFogOverlay: false, scene: createDefaultScene(), camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {} }); table.connect("guest", "player", event => events.push(event));
+  const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
+  let resolveRead: ((value: Response) => void) | undefined;
+  const fetcher = vi.fn(async (path: RequestInfo | URL) => String(path).split("?")[0].endsWith("/state") ? new Promise<Response>(resolve => { resolveRead = resolve; }) : new Response(new ReadableStream<Uint8Array>({ start(c) { controllers.push(c); } }), { headers: { "Content-Type": "text/event-stream" } }));
+  const client = contextualTableClient(context, terminal, fetcher); clients.push(client);
+  const send = (event: object, index = 0) => controllers[index].enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ ...events[0], ...event, ...meta, protocolVersion: 2 })}\n\n`));
+  return { client, terminal, context, fetcher, controllers, send, events, meta, resolve() { resolveRead?.(new Response(JSON.stringify({ ok: true, state: { ...table.state("player"), ...meta, protocolVersion: 2 } }), { headers: { "Content-Type": "application/json" } })); } };
+}
+it("terminal solo limpia su contexto, aborta lectura tardía y detiene reintentos", async () => {
+  vi.useFakeTimers(); const a = fixture(), b = fixture(), scene = vi.fn(); a.client.api.onPlayerScene(scene);
+  const late = a.client.api.getPlayerWindowState(); a.client.start("player"); b.client.start("player"); await flush();
+  a.send({}); b.send({}); await flush(); expect(a.client.getStatus().published).toBe(true);
+  a.send({ type: "terminal", terminal: "access-ended", state: undefined, sequence: 0 }); await flush();
+  expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended"); expect(a.client.getStatus().published).toBe(false); expect(b.client.getStatus().published).toBe(true);
+  a.resolve(); await late; await flush(); expect(a.client.getStatus().published).toBe(false);
+  const calls = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(a.fetcher.mock.calls.length).toBe(calls);
+  expect(scene).toHaveBeenCalledOnce();
+});
+it("reemplazo no reabre pestaña; corte de red conserva vista y reconecta con cursor aislado", async () => {
+  vi.useFakeTimers(); const a = fixture(); a.client.start("player"); await flush(); a.send({}); await flush();
+  a.controllers[0].close(); await flush(); expect(a.client.getStatus().published).toBe(true); await vi.advanceTimersByTimeAsync(500); await flush(); expect(a.controllers.length).toBe(2);
+  a.send({}, 1); await flush(); a.send({ type: "terminal", terminal: "replaced", state: undefined, sequence: 0 }, 1); await flush();
+  expect(a.terminal).toHaveBeenCalledExactlyOnceWith("replaced"); const count = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(30000); expect(a.fetcher.mock.calls.length).toBe(count);
+});
+
+it("401 HTTP limpia inmediatamente una vista publicada y cancela su reconexión", async () => {
+  vi.useFakeTimers(); const a = fixture(); a.client.start("player"); await flush(); a.send({}); await flush();
+  a.fetcher.mockImplementationOnce(async () => new Response(JSON.stringify({ ok: false, error: { code: "GUEST_UNAUTHORIZED", message: "Acceso finalizado" } }), { status: 401, headers: { "Content-Type": "application/json" } }));
+  await a.client.api.getDiceSizes(); await flush();
+  expect(a.client.getStatus().published).toBe(false); expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended");
+  const calls = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(a.fetcher.mock.calls.length).toBe(calls);
+});
+it("reconexión con otra apertura limpia, descarta lectura vieja y no reintenta", async () => {
+  vi.useFakeTimers(); const a = fixture(), b = fixture(); const late = a.client.api.getPlayerWindowState();
+  a.client.start("player"); b.client.start("player"); await flush(); a.send({}); b.send({}); await flush();
+  a.controllers[0].close(); await flush(); await vi.advanceTimersByTimeAsync(500); await flush();
+  a.controllers[1].enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ ...a.events[0], ...a.meta, protocolVersion: 2, openingId: randomUUID(), generation: 2 })}\n\n`)); await flush();
+  expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended"); expect(a.client.getStatus().published).toBe(false); expect(b.client.getStatus().published).toBe(true);
+  a.resolve(); await late; const calls = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(a.fetcher.mock.calls.length).toBe(calls); expect(a.client.getStatus().published).toBe(false);
+  for (const [path] of a.fetcher.mock.calls) { expect(String(path)).toContain(`openingId=${a.context.openingId}`); expect(String(path)).toContain("generation=1"); }
+});
+it("409 de mapa es recuperable; OPENING_CHANGED en lectura termina el contexto", async () => {
+  vi.useFakeTimers(); const a = fixture(); a.client.start("player"); await flush(); a.send({}); await flush();
+  const conflict = (code: string) => new Response(JSON.stringify({ ok: false, error: { code, message: "Conflicto" } }), { status: 409, headers: { "Content-Type": "application/json" } });
+  a.fetcher.mockImplementationOnce(async () => conflict("REVISION_CONFLICT")); await a.client.api.notifyPlayerContentReady(); expect(a.terminal).not.toHaveBeenCalled(); expect(a.client.getStatus().published).toBe(true);
+  a.fetcher.mockImplementationOnce(async path => { expect(String(path)).toContain(`/dice/sizes?openingId=${a.context.openingId}&generation=1`); return conflict("OPENING_CHANGED"); });
+  await a.client.api.getDiceSizes(); expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended"); expect(a.client.getStatus().published).toBe(false);
+});
diff --git a/src/infrastructure/browser/contextual-table-client.ts b/src/infrastructure/browser/contextual-table-client.ts
new file mode 100644
index 0000000..2d6b5c3
--- /dev/null
+++ b/src/infrastructure/browser/contextual-table-client.ts
@@ -0,0 +1,12 @@
+import { BrowserTableClient } from "./table-client";
+import { HttpTransport } from "./http";
+import { canonicalUuid } from "../../shared/contracts/invitations";
+export function contextualTableClient(context: { gameId: string; openingId: string; generation: number; audience: "dm" | "player" }, terminal: (reason: "access-ended" | "replaced" | "unavailable") => void, fetcher: typeof fetch = fetch, roster?: () => void) {
+  canonicalUuid.parse(context.gameId); canonicalUuid.parse(context.openingId);
+  if (!Number.isSafeInteger(context.generation) || context.generation < 1) throw new Error("Contexto inválido.");
+  // Cada instancia posee su transporte, aborts, cursor, cola y deduplicación.
+  const immutable = Object.freeze({ ...context });
+  const http = new HttpTransport(fetcher, () => client.accessEnded(), `/api/v1/${context.audience === "dm" ? "dm/" : ""}games/${context.gameId}`, `?openingId=${context.openingId}&generation=${context.generation}`);
+  const client = new BrowserTableClient(http, { ...immutable, terminal, roster });
+  return client;
+}
diff --git a/src/infrastructure/browser/http.ts b/src/infrastructure/browser/http.ts
index 7c338dc..f687016 100644
--- a/src/infrastructure/browser/http.ts
+++ b/src/infrastructure/browser/http.ts
@@ -11,7 +11,7 @@ export class HttpTransport {
   get sessionSignal(): AbortSignal { return this.lifecycle.signal; }
   private blocked = false;
   private readonly pending = new Set<AbortController>();
-  constructor(private readonly fetcher: typeof fetch = fetch, private readonly expired: () => void = () => {}) {}
+  constructor(private readonly fetcher: typeof fetch = fetch, private readonly expired: () => void = () => {}, private readonly prefix = API_PREFIX, private readonly readQuery = "") {}
   invalidate(): void { this.lifecycle.abort(); this.lifecycle = new AbortController(); this.generation++; this.blocked = true; for (const request of this.pending) request.abort(); this.pending.clear(); }
   resume(): void { this.blocked = false; }
   async request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
@@ -21,13 +21,14 @@ export class HttpTransport {
     const controller = new AbortController(); this.pending.add(controller);
     try {
       const fetchRequest = this.fetcher;
-      const response = await fetchRequest(API_PREFIX + path, { ...init, credentials: "same-origin", signal: controller.signal });
+      const response = await fetchRequest(this.prefix + path + ((init.method ?? "GET") === "GET" ? this.readQuery : ""), { ...init, credentials: "same-origin", signal: controller.signal });
       if (generation !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
       if (response.status === 401 && !path.startsWith("/auth/")) { this.invalidate(); this.expired(); }
       const bodyGeneration = this.generation;
       if (!response.ok) {
         let details: z.infer<typeof failure> | undefined;
         try { details = failure.parse(await response.json()); } catch { /* El status conserva su semántica aunque el proxy devuelva HTML. */ }
+        if (this.readQuery && ([403, 404].includes(response.status) || response.status === 409 && details?.error.code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
         if (bodyGeneration !== this.generation) throw new ServiceError("STALE", "La operación pertenece a una sesión anterior.");
         throw new ServiceError(details?.error.code ?? `HTTP_${response.status}`, details?.error.message ?? ({ 401: "La sesión expiró. Vuelve a acceder.", 403: "No tienes permiso para esta operación.", 404: "El recurso ya no existe.", 413: "El archivo supera el límite permitido." }[response.status] ?? "El servicio no pudo completar la operación. Reintenta."), response.status);
       }
@@ -46,9 +47,14 @@ export class HttpTransport {
   async stream(path: string, signal: AbortSignal, cursor?: string): Promise<Response> {
     if (this.blocked) throw new ServiceError("UNAUTHORIZED", "La sesión expiró.", 401);
     const fetchRequest = this.fetcher;
-    const response = await fetchRequest(API_PREFIX + path, { credentials: "same-origin", signal, headers: cursor ? { "Last-Event-ID": cursor } : {} });
+    const response = await fetchRequest(this.prefix + path + this.readQuery, { credentials: "same-origin", signal, headers: cursor ? { "Last-Event-ID": cursor } : {} });
     if (response.status === 401) { this.invalidate(); this.expired(); }
-    if (!response.ok) throw new ServiceError("STREAM", "No se pudo conectar la mesa.", response.status);
+    if (!response.ok) {
+      let code = "STREAM";
+      if (this.readQuery && response.status === 409) { try { code = failure.parse(await response.json()).error.code; } catch { /* Conflicto sin causa contextual verificable. */ } }
+      if (this.readQuery && ([403, 404].includes(response.status) || code === "OPENING_CHANGED")) { this.invalidate(); this.expired(); }
+      throw new ServiceError(code, "No se pudo conectar la mesa.", response.status);
+    }
     if (!response.headers.get("content-type")?.includes("text/event-stream")) throw new ServiceError("STREAM", "El servicio devolvió un stream inválido.");
     return response;
   }
diff --git a/src/infrastructure/browser/table-client.ts b/src/infrastructure/browser/table-client.ts
index 4a2ece0..92dc178 100644
--- a/src/infrastructure/browser/table-client.ts
+++ b/src/infrastructure/browser/table-client.ts
@@ -1,3 +1,4 @@
+import { contextualEventSchema, contextualStateSchema } from "../../shared/contracts/moderation";
 import { z } from "zod";
 import type { TtrpgApi } from "../../shared/api/ttrpg-api";
 import type { DiceContext, DiceEnvelope, DiceSessionState } from "../../domain/dice/dice";
@@ -7,7 +8,7 @@ import { cameraSchema, commandSchema, diceSessionSchema, envelopeSchema, highlig
 import { HttpTransport, ServiceError, result } from "./http";
 
 const ok = z.literal(true);
-const reply = z.object({ ok, state: tableStateSchema, playerUrl: z.string().optional() });
+
 const diceReply = <T>(value: z.ZodType<T>) => z.object({ ok, value });
 type RealtimeKey = "openPlayerWindow" | "getPlayerWindowState" | "publishPlayerScene" | "publishPlayerCamera" | "commandPlayerCamera" | "reportPlayerCamera" | "publishPlayerPointer" | "publishPlayerInformationAreaHighlight" | "notifyPlayerContentReady" | "reportPlayerMapImageStatus" | "onPlayerScene" | "onPlayerCamera" | "onPlayerCameraCommand" | "onPlayerCameraReport" | "onPlayerPointer" | "onPlayerInformationAreaHighlight" | "onPlayerWindowClosed" | "onPlayerWindowReady" | "onPlayerMapImageStatus" | keyof import("../../shared/api/dice-api").DiceApi;
 export interface TableConnectionStatus { phase: "connecting" | "connected" | "disconnected"; published: boolean; error: string; playerUrl: string; presence: TableState["presence"] }
@@ -32,7 +33,12 @@ export class BrowserTableClient {
   private diceContext: DiceContext | null = null;
   private generation = 0;
   private applied = new Set<string>();
-  constructor(private readonly http: HttpTransport) {}
+  constructor(private readonly http: HttpTransport, private readonly contextual?: { gameId: string; openingId: string; generation: number; audience: ServiceRole; terminal: (reason: "access-ended" | "replaced" | "unavailable") => void; roster?: () => void }) {}
+  private get reply() { return z.object({ ok, state: this.contextual ? contextualStateSchema.transform(value => { if (value.gameId !== this.contextual!.gameId || value.openingId !== this.contextual!.openingId || value.generation !== this.contextual!.generation || value.audience !== this.contextual!.audience) { this.terminal("access-ended"); throw new Error("Contexto de mesa inválido."); } return tableStateSchema.parse({ ...value, protocolVersion: 1 }); }) : tableStateSchema, playerUrl: z.string().optional() }); }
+  private ended = false;
+  accessEnded() { this.terminal("access-ended"); }
+  private terminal(reason: "access-ended" | "replaced" | "unavailable") { if (this.ended) return; this.ended = true; this.http.invalidate(); this.clear(); this.emit("closed"); this.contextual?.terminal(reason); }
+
   getStatus = () => this.status;
   subscribeStatus = (handler: () => void) => { this.statusHandlers.add(handler); return () => { this.statusHandlers.delete(handler); }; };
   private setStatus(patch: Partial<TableConnectionStatus>) { this.status = { ...this.status, ...patch }; for (const handler of this.statusHandlers) handler(); }
@@ -43,7 +49,7 @@ export class BrowserTableClient {
     return () => { handlers.delete(wrapped); if (!handlers.size) this.handlers.delete(name); };
   }
   start(role: ServiceRole): () => void {
-    this.stop(); this.role = role;
+    this.stop(); this.ended = false; if (this.contextual) this.http.resume(); this.role = this.contextual?.audience ?? role;
     const generation = this.generation, session = this.http.sessionSignal;
     const connect = async (attempt: number): Promise<void> => {
       if (generation !== this.generation || session.aborted) return;
@@ -65,7 +71,15 @@ export class BrowserTableClient {
             const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
             const data = block.split("\n").filter(line => line.startsWith("data: ")).map(line => line.slice(6)).join("\n");
             if (!data) continue;
-            const event = tableEventSchema.parse(JSON.parse(data));
+            const raw: unknown = JSON.parse(data);
+            let event: TableEvent;
+            if (this.contextual) {
+              const scoped = contextualEventSchema.parse(raw), context = this.contextual;
+              if (scoped.gameId !== context.gameId || scoped.openingId !== context.openingId || scoped.generation !== context.generation || scoped.audience !== context.audience) { this.terminal("access-ended"); return; }
+              if (scoped.type === "terminal") { this.terminal(scoped.terminal ?? "access-ended"); return; }
+              if (scoped.type === "roster") { context.roster?.(); continue; }
+              event = tableEventSchema.parse({ ...scoped, protocolVersion: 1 });
+            } else event = tableEventSchema.parse(raw);
             if (generation !== this.generation || session.aborted) return;
             this.accept(event); count = 0;
             const cursor = block.split("\n").find(line => line.startsWith("id: "))?.slice(4); if (cursor) this.cursor = cursor;
@@ -74,7 +88,7 @@ export class BrowserTableClient {
       } catch (error) {
         if (generation !== this.generation || session.aborted) return;
         this.setStatus({ phase: "disconnected", error: "Mesa desconectada. La vista está desactualizada; reconectando…" });
-        if (error instanceof ServiceError && [401, 403].includes(error.status)) return;
+        if (error instanceof ServiceError && [401, 403, 404].includes(error.status)) { if (this.contextual) this.terminal("access-ended"); return; }
         this.retry = setTimeout(() => { void connect(count + 1); }, Math.min(30000, 500 * 2 ** Math.min(count, 6)));
       } finally { clearTimeout(this.watchdog); controller.abort(); session.removeEventListener("abort", abort); }
     };
@@ -82,7 +96,7 @@ export class BrowserTableClient {
     return () => this.stop();
   }
   stop() { this.generation++; clearTimeout(this.retry); clearTimeout(this.watchdog); this.controller?.abort(); this.controller = null; this.connectionId = undefined; this.setStatus({ phase: "disconnected" }); }
-  clear() { this.stop(); this.current = null; this.epoch = ""; this.sequence = -1; this.cursor = ""; this.applied.clear(); this.diceContext = null; this.chain = Promise.resolve(); this.setStatus({ phase: "disconnected", published: false, error: "", playerUrl: "", presence: undefined }); }
+  clear() { if (this.contextual) this.http.invalidate(); this.stop(); this.current = null; this.epoch = ""; this.sequence = -1; this.cursor = ""; this.applied.clear(); this.diceContext = null; this.chain = Promise.resolve(); this.setStatus({ phase: "disconnected", published: false, error: "", playerUrl: "", presence: undefined }); }
   private timed(name: "pointer" | "highlight", value: TableState["pointer"] | TableState["highlight"], serverTime: number) {
     if (!value || value.expiresAt <= serverTime || this.applied.has(value.value.id)) return;
     this.applied.add(value.value.id); if (this.applied.size > 1000) this.applied.delete(this.applied.values().next().value!);
@@ -160,8 +174,8 @@ export class BrowserTableClient {
     const body = { requestId: crypto.randomUUID(), context: this.current?.context ?? null, connectionId: this.connectionId, revision: this.current?.revision, ...captured, payload };
     const startedAt = Date.now();
     // Un único reintento con el mismo ID, dentro de la ventana de cinco minutos.
-    try { return await this.http.json(path, schema, "POST", body); }
-    catch (error) { if (!(error instanceof ServiceError) || error.code !== "NETWORK" || Date.now() - startedAt >= 300000) throw error; return this.http.json(path, schema, "POST", body); }
+    try { return await this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body } : body); }
+    catch (error) { if (!(error instanceof ServiceError) || error.code !== "NETWORK" || Date.now() - startedAt >= 300000) throw error; return this.http.json(path, schema, "POST", this.contextual ? { openingId: this.contextual.openingId, generation: this.contextual.generation, command: body } : body); }
   }
   private mutation(action: string, payload: unknown) {
     const expectedContext = this.current?.context;
@@ -171,7 +185,7 @@ export class BrowserTableClient {
       const context = this.current?.context;
       let playerUrl: string | undefined;
       if (["open", "scene"].includes(action)) {
-        const response = await this.rpc(`/table/${action}`, payload, reply);
+        const response = await this.rpc(`/table/${action}`, payload, this.reply);
         this.applyState(response.state); playerUrl = response.playerUrl;
         if (playerUrl) this.setStatus({ playerUrl });
         if (context !== response.state.context && this.diceContext) await this.rpc("/dice/context", this.diceContext, diceReply(diceSessionSchema));
@@ -182,12 +196,12 @@ export class BrowserTableClient {
   }
   private diceMutation<T>(action: string, payload: unknown, schema: z.ZodType<T>) { return result(() => this.enqueue(() => this.rpc(`/dice/${action}`, payload, this.responseSchema(schema)))); }
   readonly api: Pick<TtrpgApi, RealtimeKey> = {
-    openPlayerWindow: snapshot => this.mutation("open", snapshot ? { snapshot } : {}),
+    openPlayerWindow: snapshot => this.contextual ? this.mutation("scene", snapshot ?? null) : this.mutation("open", snapshot ? { snapshot } : {}),
     publishPlayerScene: snapshot => this.mutation("scene", snapshot), publishPlayerCamera: camera => this.mutation("camera", camera), commandPlayerCamera: command => this.mutation("camera-command", command),
     reportPlayerCamera: report => this.mutation("camera-report", report), publishPlayerPointer: value => this.mutation("pointer", value), publishPlayerInformationAreaHighlight: value => this.mutation("area-highlight", value),
     notifyPlayerContentReady: () => this.mutation("ready", {}), reportPlayerMapImageStatus: async value => { await this.mutation("map-image-status", value); },
     getPlayerWindowState: async () => {
-      try { if (!this.current) this.applyState((await this.http.request("/table/state", reply)).state); }
+      try { if (!this.current) this.applyState((await this.http.request("/table/state", this.reply)).state); }
       catch (error) { this.setStatus({ error: error instanceof Error ? error.message : "No se pudo cargar la mesa." }); }
       return { snapshot:this.current?.snapshot ?? null,camera:this.current?.camera ?? null,cameraCommand:this.current?.cameraCommand ?? null,isOpen:(this.status.presence?.count ?? 0)>0 };
     },
@@ -196,6 +210,6 @@ export class BrowserTableClient {
     updateDiceContext: value => { this.diceContext=value;return this.diceMutation("context",value,diceSessionSchema); },updateDicePreferences: value=>this.diceMutation("preferences",value,draftSchema),
     beginDiceRoll: value=>this.diceMutation("begin",value,z.object({rollId:z.string()})),completeDiceRoll:(rollId,simulation)=>this.diceMutation("complete",{rollId,simulation},diceSessionSchema),failDiceRoll:rollId=>this.diceMutation("fail",{rollId},diceSessionSchema),
     getDmDiceSession:()=>result(()=>this.http.request("/dice/session",this.responseSchema(diceSessionSchema))),clearDiceHistory:()=>this.diceMutation("clear-history",{},diceSessionSchema),dismissDiceRoll:rollId=>this.diceMutation("dismiss",{rollId},diceSessionSchema),setDiceResultVisibility:(rollId,visible)=>this.diceMutation("visibility",{rollId,visible},diceSessionSchema),
-    getPublicDiceState:()=>result(async()=>{const response=await this.http.request("/table/state",reply);return {ok:true as const,value:this.dice(response.state.dice,response.state.serverTime)};}),reportDiceRenderStatus:(rollId,ok)=>result(()=>this.enqueue(()=>this.rpc("/dice/render-status",{rollId,ok},z.object({ok:z.literal(true)})))),onDicePresentation:h=>this.on("dice",h),onDiceRenderError:h=>this.on("renderError",h)
+    getPublicDiceState:()=>result(async()=>{const response=await this.http.request("/table/state",this.reply);return {ok:true as const,value:this.dice(response.state.dice,response.state.serverTime)};}),reportDiceRenderStatus:(rollId,ok)=>result(()=>this.enqueue(()=>this.rpc("/dice/render-status",{rollId,ok},z.object({ok:z.literal(true)})))),onDicePresentation:h=>this.on("dice",h),onDiceRenderError:h=>this.on("renderError",h)
   };
 }
diff --git a/src/infrastructure/server/database/catalog.contract.ts b/src/infrastructure/server/database/catalog.contract.ts
index c8b98df..0743548 100644
--- a/src/infrastructure/server/database/catalog.contract.ts
+++ b/src/infrastructure/server/database/catalog.contract.ts
@@ -142,7 +142,7 @@ for (const kind of ["sqlite", "postgres"] as const) describe(`Contrato real ${ki
   it("migración explícita e idempotente conserva datos y rechaza historial distinto", async () => {
     const config = await fixture(kind);
     await expect(openCatalog(config)).rejects.toMatchObject({ code: "MIGRATION_REQUIRED" });
-    expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5]); expect(await migrateCatalog(config)).toEqual([]);
+    expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5, 6]); expect(await migrateCatalog(config)).toEqual([]);
     const db = await openCatalog(config); const game = await db.games.create("dm", "preservada"); await db.close();
     await migrateCatalog(config);
     const next = await openCatalog(config); expect(await next.games.find("dm", game.id)).toEqual(game); await next.close();
@@ -162,7 +162,7 @@ for (const kind of ["sqlite", "postgres"] as const) describe(`Contrato real ${ki
   it("un fallo DDL revierte esquema y registro y permite reintentar", async () => {
     const config = await fixture(kind); await migrateCatalog(config);
     const driver = createDriver(config);
-    try { await expect(applyMigrations(driver, [...migrations, { version: 5, name: "fallo-prueba", statements: ["CREATE TABLE rollback_probe(id INTEGER)", "SQL INVALIDO"] }])).rejects.toBeDefined(); }
+    try { await expect(applyMigrations(driver, [...migrations, { version: 7, name: "fallo-prueba", statements: ["CREATE TABLE rollback_probe(id INTEGER)", "SQL INVALIDO"] }])).rejects.toBeDefined(); }
     finally { await driver.close(); }
     expect(await migrateCatalog(config)).toEqual([]);
     const db = await openCatalog(config); cleanups.push(() => db.close()); expect((await db.games.list("dm")).total).toBe(0);
@@ -191,7 +191,7 @@ it("SQLite no toca bases legadas y rechaza symlinks/hardlinks", async () => {
 });
 it("TLS real exige CA y hostname; credencial inválida se sanitiza y no hace fallback", async () => {
   const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
-  expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5]);
+  expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5, 6]);
   await expect(openCatalog({ ...config, caFile: undefined })).rejects.toMatchObject({ code: "UNAVAILABLE" });
   // 127.1 resuelve a loopback, pero no figura en el SAN del certificado de prueba.
   const host = new URL(config.url); host.hostname = "127.1";
@@ -215,7 +215,7 @@ function requireBuild(): void {
 for (const kind of ["sqlite", "postgres"] as const) it(`comando pnpm db:migrate compilado ${kind}, repetición sin pendientes`, async () => {
   requireBuild(); const config = await fixture(kind), env = commandEnv(config);
   const first = await exec("pnpm", ["db:migrate"], { env, timeout: 15000 });
-  expect(first.stdout).toContain(`Catálogo ${kind}: migraciones 1, 2, 3, 4, 5 aplicadas`);
+  expect(first.stdout).toContain(`Catálogo ${kind}: migraciones 1, 2, 3, 4, 5, 6 aplicadas`);
   const second = await exec("pnpm", ["db:migrate"], { env, timeout: 15000 });
   expect(second.stdout).toContain("sin migraciones pendientes");
   if (config.driver === "postgres") { expect(env.TTRPG_DATA_DIR).toBeUndefined(); expect(first.stdout + first.stderr).not.toContain(config.url); }
@@ -283,7 +283,7 @@ it("variables PG heredadas no cambian destino, TLS, contraseña ni search_path",
   const original = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
   try {
     Object.assign(process.env, overrides);
-    expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5]);
+    expect(await migrateCatalog(config)).toEqual([1, 2, 3, 4, 5, 6]);
     await expect(openCatalog({ ...config, caFile: undefined })).rejects.toMatchObject({ code: "UNAVAILABLE" });
     const empty = new URL(config.url); empty.password = "";
     await expect(openCatalog({ ...config, url: empty.href })).rejects.toMatchObject({ code: "UNAVAILABLE" });
diff --git a/src/infrastructure/server/database/migrations.ts b/src/infrastructure/server/database/migrations.ts
index a51666c..fa93945 100644
--- a/src/infrastructure/server/database/migrations.ts
+++ b/src/infrastructure/server/database/migrations.ts
@@ -59,6 +59,9 @@ export const migrations: readonly Migration[] = [{ version: 1, name: "catalogo-p
   "CREATE INDEX guest_credentials_capacity ON guest_credentials(opening_id,expires_at)",
   `CREATE TABLE guest_operations (game_id TEXT NOT NULL, opening_id TEXT NOT NULL, generation INTEGER NOT NULL, operation_id TEXT NOT NULL, fingerprint TEXT NOT NULL CHECK(length(fingerprint)=64), participant_id TEXT NOT NULL, expires_at TEXT NOT NULL, result_bytes INTEGER NOT NULL CHECK(result_bytes BETWEEN 1 AND 1048576), PRIMARY KEY(game_id,opening_id,operation_id), FOREIGN KEY(participant_id,game_id,opening_id,generation) REFERENCES guest_participants(id,game_id,opening_id,generation))`,
   `CREATE TABLE invitation_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, game_id TEXT NOT NULL, opening_id TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('start','reopen','rotate','admit','leave','close')), at TEXT NOT NULL, result TEXT NOT NULL CHECK(result='success'))`
+] }, { version: 6, name: "moderacion-participantes", statements: [
+  "CREATE TABLE moderation_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, game_id TEXT NOT NULL, opening_id TEXT NOT NULL, participant_id TEXT NOT NULL, invitation_version INTEGER NOT NULL, at TEXT NOT NULL, result TEXT NOT NULL CHECK(result='revoked'))",
+  "CREATE INDEX moderation_roster ON moderation_audit(opening_id)"
 ] }];
 function checksum(migration: Migration): string { return createHash("sha256").update(JSON.stringify(migration)).digest("hex"); }
 async function tableNames(connection: SqlConnection, kind: SqlDriver["kind"]): Promise<string[]> {
@@ -69,7 +72,7 @@ async function tableNames(connection: SqlConnection, kind: SqlDriver["kind"]): P
 }
 export async function verifySchema(connection: SqlConnection, kind: SqlDriver["kind"], expected = migrations, allowPending = false): Promise<number> {
   const tables = await tableNames(connection, kind);
-  if (tables.some(name => !["ttrpg_control_migrations", "ttrpg_games", "identity_user", "identity_account", "identity_session", "identity_verification", "identity_audit", "identity_settings", "owned_resources", "owned_assets", "game_openings", "owned_operations", "owned_imports", "system_catalog", "system_versions", "retained_templates", "game_resources", "game_invitations", "guest_participants", "guest_credentials", "guest_operations", "invitation_audit"].includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
+  if (tables.some(name => !["ttrpg_control_migrations", "ttrpg_games", "identity_user", "identity_account", "identity_session", "identity_verification", "identity_audit", "identity_settings", "owned_resources", "owned_assets", "game_openings", "owned_operations", "owned_imports", "system_catalog", "system_versions", "retained_templates", "game_resources", "game_invitations", "guest_participants", "guest_credentials", "guest_operations", "invitation_audit", "moderation_audit"].includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
   if (!tables.includes("ttrpg_control_migrations")) {
     if (tables.length) throw new CatalogError("SCHEMA_INCOMPATIBLE");
     if (allowPending) return 0;
@@ -85,6 +88,7 @@ export async function verifySchema(connection: SqlConnection, kind: SqlDriver["k
   if (rows.length >= 3 && ["owned_resources", "owned_assets", "game_openings", "owned_operations", "owned_imports"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
   if (rows.length >= 4 && ["system_catalog", "system_versions", "retained_templates", "game_resources"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
   if (rows.length >= 5 && ["game_invitations", "guest_participants", "guest_credentials", "guest_operations", "invitation_audit"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
+  if (rows.length >= 6 && !tables.includes("moderation_audit")) throw new CatalogError("SCHEMA_INCOMPATIBLE");
   if (!allowPending && rows.length !== expected.length) throw new CatalogError("MIGRATION_REQUIRED");
   return rows.length;
 }
diff --git a/src/infrastructure/server/identity/identity.contract.ts b/src/infrastructure/server/identity/identity.contract.ts
index 3e7b647..a483c2c 100644
--- a/src/infrastructure/server/identity/identity.contract.ts
+++ b/src/infrastructure/server/identity/identity.contract.ts
@@ -318,7 +318,7 @@ for (const kind of ["sqlite", "postgres"] as const) it(`migración006→007 ${ki
   const id = randomUUID(), now = new Date().toISOString();
   await raw(config, c => c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)", [id, "legacy-owner", "Conservar", "ready", now, now]));
   await expect(openIdentity(config, { secret, publicOrigin: origin })).rejects.toMatchObject({ code: "MIGRATION_REQUIRED" });
-  expect(await migrateCatalog(config)).toEqual([2, 3, 4, 5]); expect(await migrateCatalog(config)).toEqual([]);
+  expect(await migrateCatalog(config)).toEqual([2, 3, 4, 5, 6]); expect(await migrateCatalog(config)).toEqual([]);
   expect((await raw(config, c => c.query("SELECT id FROM ttrpg_games"))).rows).toEqual([{ id }]);
   const service = await open(config); await service.bootstrap(adminInput);
 });
diff --git a/src/infrastructure/server/identity/index.ts b/src/infrastructure/server/identity/index.ts
index 9feb6c3..45d97e7 100644
--- a/src/infrastructure/server/identity/index.ts
+++ b/src/infrastructure/server/identity/index.ts
@@ -34,7 +34,7 @@ function account(user: Record<string, unknown>): AccountDto {
   return { id: String(user.id), email: String(user.email), name: String(user.name), role: user.role as "admin" | "dm", enabled: user.enabled, mustChangePassword: user.mustChangePassword, emailVerified: user.emailVerified === true,
     createdAt: new Date(user.createdAt as string).toISOString(), updatedAt: new Date(user.updatedAt as string).toISOString() };
 }
-export async function openIdentity(database: DatabaseConfig, config: IdentityConfig, clock = { now: () => new Date(), id: randomUUID }): Promise<IdentityService> {
+export async function openIdentity(database: DatabaseConfig, config: IdentityConfig, clock = { now: () => new Date(), id: randomUUID }, lifecycle: { openingInvalidated?: (game: string) => void; accountDisabled?: (owner: string) => void; sessionRevoked?: (owner: string, session?: string) => void } = {}): Promise<IdentityService> {
   validateIdentityConfig(config);
   const unit = await identityDatabase(database);
   const secure = config.publicOrigin.startsWith("https:");
@@ -116,12 +116,13 @@ export async function openIdentity(database: DatabaseConfig, config: IdentityCon
     },
     session: rawCookie => transaction(() => principal(rawCookie)),
     async logout(rawCookie, all = false) {
-      await transaction(async c => {
+      await transaction(async (c, effects) => {
         let current: IdentitySessionDto;
         try { current = await principal(rawCookie); } catch (error) { if (!all && error instanceof IdentityError && error.code === "UNAUTHORIZED") return; throw error; }
         if (all) await adapter.deleteUserSessions(current.account.id);
         else await context.adapter.delete({ model: "session", where: [{ field: "id", value: current.sessionId }] });
         await audit(c, current.account.id, current.account.id, all ? "logout-all" : "logout");
+        effects.afterCommit(() => lifecycle.sessionRevoked?.(current.account.id, all ? undefined : current.sessionId), () => lifecycle.sessionRevoked?.(current.account.id));
       });
     },
     async changePassword(rawCookie, currentPassword, newPassword) {
@@ -130,13 +131,14 @@ export async function openIdentity(database: DatabaseConfig, config: IdentityCon
       const snapshot = await transaction(async () => { const identity = await principal(rawCookie); return { identity, ...await credentials(identity.account.email) }; });
       if (!await context.password.verify({ hash: snapshot.hash, password: currentPassword })) throw new IdentityError("UNAUTHORIZED");
       const hash = await context.password.hash(newPassword);
-      await transaction(async c => {
+      await transaction(async (c, effects) => {
         const current = await principal(rawCookie); const old = await credentials(current.account.email);
         if (current.sessionId !== snapshot.identity.sessionId || old.hash !== snapshot.hash) throw new IdentityError("UNAUTHORIZED");
         await adapter.updatePassword(current.account.id, hash);
         await adapter.updateUser(current.account.id, { mustChangePassword: false, authVersion: revision(old.user) + 1, updatedAt: new Date() });
         await adapter.deleteUserSessions(current.account.id);
         await audit(c, current.account.id, current.account.id, "change-password");
+        effects.afterCommit(() => lifecycle.sessionRevoked?.(current.account.id), () => lifecycle.sessionRevoked?.(current.account.id));
       });
     },
     async createDm(rawCookie, data) {
@@ -156,7 +158,7 @@ export async function openIdentity(database: DatabaseConfig, config: IdentityCon
     async administer(rawCookie, id, action, password) {
       await transaction(() => principal(rawCookie, "admin"));
       const hash = action === "password" ? (validatePassword(password), await context.password.hash(password)) : undefined;
-      await transaction(async c => {
+      await transaction(async (c, effects) => {
         const actor = await principal(rawCookie, "admin"); const user = await adapter.findUserById(id);
         if (!user || account(user).role !== "dm") throw new IdentityError("NOT_FOUND");
         if (action === "disable" || action === "enable") await adapter.updateUser(id, { enabled: action === "enable", authVersion: revision(user) + 1, updatedAt: new Date() });
@@ -165,6 +167,7 @@ export async function openIdentity(database: DatabaseConfig, config: IdentityCon
         if (action !== "enable") await adapter.deleteUserSessions(id);
         if (action === "disable") await c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE host_account_id=$2 AND state='open'", [new Date().toISOString(), id]);
         await audit(c, actor.account.id, id, action);
+        if (action !== "enable") effects.afterCommit(() => { if (action === "disable" || action === "password") lifecycle.accountDisabled?.(id); else lifecycle.sessionRevoked?.(id); }, () => lifecycle.accountDisabled?.(id));
       });
     },
     async bootstrap(data) {
@@ -202,7 +205,7 @@ export async function openIdentity(database: DatabaseConfig, config: IdentityCon
       }, identity, clock, {
         beforeCommit(check) { if (!active) throw new IdentityError("UNAVAILABLE"); checks.push(check); },
         afterCommit(apply, uncertain) { if (!active) throw new IdentityError("UNAVAILABLE"); effects.afterCommit(apply, uncertain); }
-      });
+      }, lifecycle.openingInvalidated);
       try {
         const result = await work(identity, owned);
         // Resolver escrituras ya iniciadas antes de validar el contexto que se publicará.
diff --git a/src/infrastructure/server/invitations/compiled.contract.ts b/src/infrastructure/server/invitations/compiled.contract.ts
index 49fbcdd..c68d4fd 100644
--- a/src/infrastructure/server/invitations/compiled.contract.ts
+++ b/src/infrastructure/server/invitations/compiled.contract.ts
@@ -6,7 +6,7 @@ afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await
 for (const kind of ["sqlite", "postgres"] as const) it(`artefacto compilado009 y pnpm db:migrate ${kind}`, async () => {
   const config = await fixture(kind, 4);
   const env = { ...process.env, TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile }) };
-  const migration = await promisify(execFile)("pnpm", ["db:migrate"], { env }); expect(migration.stdout).toContain("migraciones 5 aplicadas");
+  const migration = await promisify(execFile)("pnpm", ["db:migrate"], { env }); expect(migration.stdout).toContain("migraciones 5, 6 aplicadas");
   const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
     const child = spawn(process.execPath, ["src/infrastructure/server/invitations/test-fixtures/compiled-smoke.mjs"], { stdio: ["pipe", "pipe", "pipe"] }); let stdout = "", stderr = "";
     child.stdout.on("data", value => stdout += value); child.stderr.on("data", value => stderr += value); child.on("error", reject); child.on("exit", code => resolve({ code, stdout, stderr })); child.stdin.end(JSON.stringify(config));
diff --git a/src/infrastructure/server/invitations/guest-authority.ts b/src/infrastructure/server/invitations/guest-authority.ts
index e1868dd..27420a9 100644
--- a/src/infrastructure/server/invitations/guest-authority.ts
+++ b/src/infrastructure/server/invitations/guest-authority.ts
@@ -1,5 +1,6 @@
+import { readSystem } from "../owned/system-repository";
 import type { CommitEffects } from "../../../application/services/owned-store";
-import { randomUUID } from "node:crypto";
+import { createHash, randomUUID } from "node:crypto";
 import { z } from "zod";
 import { InvitationError, type GuestAuthority, type GuestTransaction } from "../../../application/services/invitations";
 import type { Presence } from "../../../application/services/host-invitations";
@@ -9,7 +10,7 @@ import { identityDatabase } from "../identity/database";
 import { ACCESS_MS, presenceState } from "../../../domain/invitations/invitation";
 import { admissionSchema, canonicalUuid, guestSchema, type GuestDto } from "../../../shared/contracts/invitations";
 import { alias, digest, gameContext, generateSecret, invitation, invitationDigest, latest, matches, parse, readParticipant, sponsor, tokenDigest, validToken } from "./records";
-export async function guestAuthority(database: DatabaseConfig, presence: Presence, now: () => Date): Promise<GuestAuthority> {
+export async function guestAuthority(database: DatabaseConfig, presence: Presence, now: () => Date, onLeave: (game: string, participant: string) => void = () => {}, allows: (context: import("../../../application/services/game-runtime").GameContext, id: string) => boolean = () => false): Promise<GuestAuthority> {
   const unit = await identityDatabase(database);
   const transaction = <T>(game: string, work: (connection: SqlConnection, effects: CommitEffects) => Promise<T>) => unit.transaction(work, outcome => { if (outcome === "uncertain") presence.forget(game); });
   const validGame = (game: string) => { if (!canonicalUuid.safeParse(game).success) throw new InvitationError("INVALID_INPUT"); };
@@ -79,7 +80,7 @@ export async function guestAuthority(database: DatabaseConfig, presence: Presenc
     },
     async authorized(game, token, work) {
       validGame(game);
-      return transaction(game, async c => {
+      return transaction(game, async (c, effects) => {
         const captured = await principal(c, game, token); let active = true, left = false, rejected = false, failure: unknown;
         const pending: Promise<unknown>[] = [];
         const run = <T>(action: () => Promise<T>): Promise<T> => {
@@ -88,8 +89,29 @@ export async function guestAuthority(database: DatabaseConfig, presence: Presenc
           pending.push(task.catch(() => undefined)); return task;
         };
         const tx: GuestTransaction = {
+          transport: () => run(async () => {
+            const guest = await principal(c, game, token), opening = (await latest(c, game))!;
+            const system = readSystem((await c.query("SELECT * FROM system_versions WHERE system_id=$1 AND version=$2", [guest.systemRef.systemId, guest.systemRef.version])).rows[0]);
+            return { context: { ownerId: opening.hostAccountId, gameId: game, openingId: opening.id, generation: opening.generation, leaseExpiresAt: opening.leaseExpiresAt }, system: { ref: guest.systemRef, definition: system.definition, hash: system.hash, availability: system.availability } };
+          }),
+          asset: id => run(async () => {
+            if (!canonicalUuid.safeParse(id).success) throw new InvitationError("INVALID_INPUT");
+            await principal(c, game, token); const opening = (await latest(c, game))!;
+            const context = { ownerId: opening.hostAccountId, gameId: game, openingId: opening.id, generation: opening.generation };
+            if (!allows(context, id)) return null;
+            effects.beforeCommit(async () => { if (!allows(context, id)) throw new InvitationError("GUEST_UNAUTHORIZED"); });
+            const row = (await c.query("SELECT mime,bytes,sha256,byte_length FROM owned_assets WHERE owner_id=$1 AND id=$2", [opening.hostAccountId, id])).rows[0];
+            if (!row) return null;
+            if (!(row.bytes instanceof Uint8Array) || !["image/png", "image/jpeg", "image/webp"].includes(String(row.mime)) || row.bytes.length !== row.byte_length || createHash("sha256").update(row.bytes).digest("hex") !== row.sha256) throw new InvitationError("UNAVAILABLE");
+            return { mime: String(row.mime), bytes: row.bytes };
+          }),
+          deliver: (effect, uncertain) => run(async () => {
+            await principal(c, game, token);
+            effects.beforeCommit(async () => { await principal(c, game, token); });
+            effects.afterCommit(effect, uncertain);
+          }),
           session: () => run(() => principal(c, game, token)),
-          leave: () => run(async () => { if (left) return; await principal(c, game, token); await revoke(c, captured); left = true; })
+          leave: () => run(async () => { if (left) return; await principal(c, game, token); await revoke(c, captured); left = true; effects.afterCommit(() => onLeave(game, captured.participantId), () => onLeave(game, captured.participantId)); })
         };
         try {
           const result = await work(structuredClone(captured), tx);
@@ -101,7 +123,7 @@ export async function guestAuthority(database: DatabaseConfig, presence: Presenc
         } finally { active = false; await Promise.all(pending); }
       });
     },
-    async leave(game, token) { validGame(game); await transaction(game, async c => { const guest = await optional(c, game, token); if (guest) await revoke(c, guest); }); },
+    async leave(game, token) { validGame(game); await transaction(game, async (c, effects) => { const guest = await optional(c, game, token); if (guest) { await revoke(c, guest); effects.afterCommit(() => onLeave(game, guest.participantId), () => onLeave(game, guest.participantId)); } }); },
     close: () => unit.close()
   };
 }
diff --git a/src/infrastructure/server/invitations/host-repository.ts b/src/infrastructure/server/invitations/host-repository.ts
index 41c1ed1..35f5add 100644
--- a/src/infrastructure/server/invitations/host-repository.ts
+++ b/src/infrastructure/server/invitations/host-repository.ts
@@ -2,7 +2,7 @@ import { ACCESS_MS } from "../../../domain/invitations/invitation";
 import { InvitationError, type InvitationRepository } from "../../../application/services/invitations";
 import { OwnedError } from "../../../application/services/owned-store";
 import type { Execute, CatalogClock } from "../database/catalog-repository";
-import { invitation, latest, metadata, sponsor } from "./records";
+import { invitation, latest, metadata, sponsor, readParticipant } from "./records";
 export function hostInvitationRepository(run: Execute, owner: string, clock: CatalogClock): InvitationRepository {
   const scoped: Execute = work => run(work);
   const own = async (c: Parameters<Parameters<Execute>[0]>[0], gameId: string, openingId: string) => {
@@ -11,6 +11,29 @@ export function hostInvitationRepository(run: Execute, owner: string, clock: Cat
     const opening = await latest(c, gameId); if (!opening || opening.id !== openingId) throw new InvitationError("REVISION_CONFLICT"); return opening;
   };
   return {
+    participants: (gameId, openingId) => scoped(async c => {
+      await own(c, gameId, openingId);
+      const rows = (await c.query("SELECT * FROM guest_participants WHERE game_id=$1 AND opening_id=$2 ORDER BY created_at,id", [gameId, openingId])).rows;
+      const items = [];
+      for (const row of rows) {
+        const p = readParticipant(row);
+        const live = (await c.query("SELECT token_hash FROM guest_credentials WHERE participant_id=$1 AND revoked_at IS NULL AND expires_at>$2 LIMIT 1", [p.id, clock.now().toISOString()])).rows.length > 0;
+        items.push({ participantId: p.id, alias: p.alias, discriminator: p.discriminator, admission: p.state, presence: p.state === "admitted" ? live ? "reconnecting" as const : "expired" as const : p.state, admittedAt: p.created_at });
+      }
+      const revision = Number((await c.query("SELECT (SELECT COUNT(*) FROM moderation_audit WHERE opening_id=$1) + (SELECT COUNT(*) FROM invitation_audit WHERE opening_id=$2 AND action IN ('admit','leave')) AS n", [openingId, openingId])).rows[0].n);
+      return { items, revision };
+    }),
+    revoke: (gameId, openingId, participantId, invitationVersion) => scoped(async c => {
+      await own(c, gameId, openingId);
+      const row = (await c.query("SELECT * FROM guest_participants WHERE id=$1 AND game_id=$2 AND opening_id=$3", [participantId, gameId, openingId])).rows[0];
+      if (!row) throw new OwnedError("NOT_FOUND");
+      const p = readParticipant(row); if (p.state === "revoked") return false;
+      const at = clock.now().toISOString();
+      await c.query("UPDATE guest_participants SET state='revoked',left_at=$1 WHERE id=$2", [at, participantId]);
+      await c.query("UPDATE guest_credentials SET revoked_at=$1 WHERE participant_id=$2 AND revoked_at IS NULL", [at, participantId]);
+      await c.query("INSERT INTO moderation_audit(id,actor,game_id,opening_id,participant_id,invitation_version,at,result) VALUES($1,$2,$3,$4,$5,$6,$7,'revoked')", [clock.id(), owner, gameId, openingId, participantId, invitationVersion, at]);
+      return true;
+    }),
     current: (gameId, openingId) => scoped(async c => { await own(c, gameId, openingId); const row = await invitation(c, gameId, openingId); return row ? metadata(row) : null; }),
     issue: (gameId, openingId, expectedVersion, hash) => scoped(async c => {
       const opening = await own(c, gameId, openingId), at = clock.now(), now = at.toISOString(), expiresAt = new Date(at.getTime() + ACCESS_MS).toISOString();
diff --git a/src/infrastructure/server/invitations/index.ts b/src/infrastructure/server/invitations/index.ts
index f7c749a..fe607aa 100644
--- a/src/infrastructure/server/invitations/index.ts
+++ b/src/infrastructure/server/invitations/index.ts
@@ -4,7 +4,7 @@ import type { DatabaseConfig } from "../database/config";
 import type { Opening } from "../../../application/services/owned-store";
 import { generateSecret, invitationDigest } from "./records";
 import { guestAuthority } from "./guest-authority";
-export async function openInvitations(database: DatabaseConfig, identity: IdentityService, publicOrigin: string, now = () => new Date()) {
+export async function openInvitations(database: DatabaseConfig, identity: IdentityService, publicOrigin: string, now = () => new Date(), onLeave: (game: string, participant: string) => void = () => {}, transition: (game: string) => void = () => {}, allows: (context: import("../../../application/services/game-runtime").GameContext, id: string) => boolean = () => false, onContact: (opening: Opening) => void = () => {}) {
   const origin = new URL(publicOrigin);
   if (origin.origin !== publicOrigin || !["http:", "https:"].includes(origin.protocol) || origin.username || origin.password) throw new Error("Origen de invitación inválido");
   const contacts = new Map<string, Pick<Opening, "id" | "hostSessionId" | "lastHeartbeatAt" | "leaseExpiresAt">>();
@@ -13,6 +13,6 @@ export async function openInvitations(database: DatabaseConfig, identity: Identi
     mark(opening) { for (const [game, value] of contacts) if (value.leaseExpiresAt <= now().toISOString()) contacts.delete(game); contacts.set(opening.gameId, { id: opening.id, hostSessionId: opening.hostSessionId, lastHeartbeatAt: opening.lastHeartbeatAt, leaseExpiresAt: opening.leaseExpiresAt }); },
     forget(game) { contacts.delete(game); }, clear() { contacts.clear(); }
   };
-  const guests = await guestAuthority(database, presence, now);
-  return hostInvitations(identity, guests, presence, { generate: generateSecret, hash: invitationDigest }, publicOrigin, now);
+  const guests = await guestAuthority(database, presence, now, onLeave, allows);
+  return hostInvitations(identity, guests, presence, { generate: generateSecret, hash: invitationDigest }, publicOrigin, now, transition, onContact);
 }
diff --git a/src/infrastructure/server/invitations/invitations.contract.ts b/src/infrastructure/server/invitations/invitations.contract.ts
index ee0c746..ad28b21 100644
--- a/src/infrastructure/server/invitations/invitations.contract.ts
+++ b/src/infrastructure/server/invitations/invitations.contract.ts
@@ -113,8 +113,11 @@ for (const kind of ["sqlite", "postgres"] as const) describe(`Invitaciones reale
     const s = await setup(kind), start = await s.service.start(s.aCookie, s.a1.id, null, 1, randomUUID());
     const g = await s.service.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "Capacidad" }, randomUUID(), null);
     let escaped!: GuestTransaction;
-    await s.service.guests.authorized(s.a1.id, g.token!, async (dto, tx) => { escaped = tx; dto.gameId = s.b1.id; dto.participantId = randomUUID(); expect(Object.keys(tx).sort()).toEqual(["leave", "session"]); expect((await tx.session()).gameId).toBe(s.a1.id); });
+    await s.service.guests.authorized(s.a1.id, g.token!, async (dto, tx) => { escaped = tx; dto.gameId = s.b1.id; dto.participantId = randomUUID(); expect(Object.keys(tx).sort()).toEqual(["asset", "deliver", "leave", "session", "transport"]); expect((await tx.session()).gameId).toBe(s.a1.id); });
     await expect(escaped.session()).rejects.toMatchObject({ code: "UNAVAILABLE" });
+    await expect(escaped.transport()).rejects.toMatchObject({ code: "UNAVAILABLE" });
+    await expect(escaped.asset(randomUUID())).rejects.toMatchObject({ code: "UNAVAILABLE" });
+    let delivered = false; await expect(escaped.deliver(() => { delivered = true; }, () => {})).rejects.toMatchObject({ code: "UNAVAILABLE" }); expect(delivered).toBe(false);
     for (const mode of ["catch", "settled", "unawaited"]) {
       await expect(s.service.guests.authorized(s.a1.id, g.token!, async (_, tx) => { await tx.leave(); const bad = tx.session(); if (mode === "catch") await bad.catch(() => undefined); else if (mode === "settled") await Promise.allSettled([bad]); else void bad.catch(() => undefined); })).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
       expect(await s.service.guests.authorized(s.a1.id, g.token!, async dto => dto)).toEqual(g.guest);
diff --git a/src/infrastructure/server/invitations/persistence.contract.ts b/src/infrastructure/server/invitations/persistence.contract.ts
index 518ae7b..6fcb0ba 100644
--- a/src/infrastructure/server/invitations/persistence.contract.ts
+++ b/src/infrastructure/server/invitations/persistence.contract.ts
@@ -26,7 +26,7 @@ for (const kind of ["sqlite", "postgres"] as const) describe(`Persistencia009 ${
       await c.query("INSERT INTO game_openings(id,game_id,generation,state,host_account_id,host_session_id,created_at,closed_at,last_heartbeat_at,lease_expires_at,revision) VALUES($1,$2,1,'open',$3,'old-session',$4,NULL,$5,$6,1)", [opening, game, owner, at, at, new Date(Date.now() + 150000).toISOString()]);
       const records = []; for (const table of ["ttrpg_control_migrations", "identity_user", "ttrpg_games", "owned_resources", "game_resources", "system_versions", "game_openings"]) records.push((await c.query(`SELECT * FROM ${table}`)).rows); return records;
     });
-    expect(await migrateCatalog(config)).toEqual([5]); expect(await migrateCatalog(config)).toEqual([]);
+    expect(await migrateCatalog(config)).toEqual([5, 6]); expect(await migrateCatalog(config)).toEqual([]);
     await raw(config, async c => {
       const after = []; for (const table of ["ttrpg_control_migrations", "identity_user", "ttrpg_games", "owned_resources", "game_resources", "system_versions", "game_openings"]) after.push((await c.query(`SELECT * FROM ${table}`)).rows);
       after[0] = after[0].slice(0, 4); expect(after).toEqual(before); expect((await c.query("SELECT * FROM game_invitations")).rows).toEqual([]);
diff --git a/src/infrastructure/server/moderation/compiled.contract.ts b/src/infrastructure/server/moderation/compiled.contract.ts
new file mode 100644
index 0000000..8e3816a
--- /dev/null
+++ b/src/infrastructure/server/moderation/compiled.contract.ts
@@ -0,0 +1,18 @@
+import { afterEach, expect, it } from "vitest";
+import { spawn, execFile } from "node:child_process";
+import { promisify } from "node:util";
+import { randomUUID } from "node:crypto";
+import { fixture, cleanup, snapshot, png } from "./fixtures";
+import { defaultDiceDraft } from "../../../domain/dice/dice";
+afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
+for (const kind of ["sqlite", "postgres"] as const) it(`humo HTTP/SSE del artefacto compilado010 y migración5→6 ${kind}`, async () => {
+  const config = await fixture(kind, 5), env = { ...process.env, TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile }) };
+  expect((await promisify(execFile)("pnpm", ["db:migrate"], { env })).stdout).toContain("migraciones 6 aplicadas");
+  const asset = randomUUID();
+  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
+    const child = spawn(process.execPath, ["src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs"], { stdio: ["pipe", "pipe", "pipe"] }); let stdout = "", stderr = "";
+    child.stdout.on("data", value => stdout += value); child.stderr.on("data", value => stderr += value); child.on("error", reject); child.on("exit", code => resolve({ code, stdout, stderr }));
+    child.stdin.end(JSON.stringify({ config, asset, snapshot: snapshot(asset), png: png.toString("base64"), draft: { ...defaultDiceDraft(), visibility: "open", groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, simulation: { values: [{ id: "f:d6:0", value: 4 }], replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, .5, 0, 0, 0, 1] } } }));
+  });
+  expect(result.code, result.stderr).toBe(0); expect(result.stdout).toContain("API compilada010: mapa/dado/SSE/kick/401/supervivientes/enlaces/restart PASS");
+});
diff --git a/src/infrastructure/server/moderation/corrections.contract.ts b/src/infrastructure/server/moderation/corrections.contract.ts
new file mode 100644
index 0000000..4702c5d
--- /dev/null
+++ b/src/infrastructure/server/moderation/corrections.contract.ts
@@ -0,0 +1,92 @@
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { randomUUID } from "node:crypto";
+import { Readable } from "node:stream";
+import { IncomingMessage, ServerResponse, request } from "node:http";
+import { setup, cleanup, context, invitationSecret, http, deferred, snapshot, png, stream } from "./fixtures";
+import { contextualTableClient } from "../../browser/contextual-table-client";
+afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
+function network(port: number, cookie: string): typeof fetch {
+  return (path, init) => new Promise<Response>((resolve, reject) => {
+    const req = request({ host: "127.0.0.1", port, path: String(path), method: init?.method ?? "GET", headers: { ...Object.fromEntries(new Headers(init?.headers)), host: "localhost:8787", origin: "http://localhost:8787", cookie } }, res => {
+      const headers = new Headers(); for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
+      resolve(new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, { status: res.statusCode, headers }));
+    });
+    const abort = () => req.destroy(new Error("Petición cancelada"));
+    init?.signal?.addEventListener("abort", abort, { once: true }); req.on("close", () => init?.signal?.removeEventListener("abort", abort)); req.on("error", reject);
+    if (init?.signal?.aborted) abort(); else req.end(typeof init?.body === "string" ? init.body : undefined);
+  });
+}
+for (const kind of ["sqlite", "postgres"] as const) describe(`Correcciones ronda1 ${kind}`, () => {
+  it("cerrar durante autorización SSE no registra fantasma; principal, promoción y reemplazo conservan cupos", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID());
+    const guests = await Promise.all(["cancelado", "principal", "siguiente"].map(alias => s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias }, randomUUID(), null)));
+    const reached = deferred(), release = deferred(), closed = deferred(), finished = deferred(); let calls = 0;
+    const original = s.invitations.guests.authorized.bind(s.invitations.guests);
+    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => {
+      const held = token === guests[0].token && ++calls === 2;
+      if (held) { reached.resolve(); await release.promise; }
+      const result = await original(game, token, work); if (held) finished.resolve(); return result;
+    });
+    const emit = ServerResponse.prototype.emit;
+    vi.spyOn(ServerResponse.prototype, "emit").mockImplementation(function (this: ServerResponse, ...args: Parameters<typeof emit>) { const value = emit.apply(this, args); if (args[0] === "close" && this.req.headers.cookie === `ttrpg_guest=${guests[0].token}`) closed.resolve(); return value; });
+    const registration = vi.spyOn(s.runtimes, "register"), interval = vi.spyOn(globalThis, "setInterval");
+    const cancelled = stream(s.port, s.a1.id, `ttrpg_guest=${guests[0].token}`); await reached.promise; cancelled.close(); await closed.promise; release.resolve(); await finished.promise;
+    const ctx = await s.identity.authorized(s.aCookie, "dm", (actor, tx) => s.runtimes.context(tx, actor.account.id, s.a1.id));
+    expect(registration).not.toHaveBeenCalled(); expect(interval).not.toHaveBeenCalled(); expect(s.runtimes.connected(ctx, guests[0].guest.participantId)).toBe(false); expect(s.runtimes.state(ctx)).toBeNull(); expect(s.runtimes.presenceSequence(ctx)).toBe(0);
+    const table = s.runtimes.runtime(ctx), connect = (index: number) => stream(s.port, s.a1.id, `ttrpg_guest=${guests[index].token}`);
+    const first = connect(1); await first.until(() => first.events.some(e => e.type === "bootstrap")); const second = connect(2); await second.until(() => second.events.some(e => e.type === "bootstrap"));
+    expect(table.primary?.participant).toBe(guests[1].guest.participantId); expect(table.connectionCount).toBe(2);
+    const bootstraps = second.events.filter(e => e.type === "bootstrap").length; first.close(); await second.until(() => second.events.filter(e => e.type === "bootstrap").length > bootstraps);
+    expect(table.primary?.participant).toBe(guests[2].guest.participantId); expect(table.connectionCount).toBe(1); expect(s.runtimes.connected(ctx, guests[1].guest.participantId)).toBe(false);
+    const replacement = connect(2); await replacement.until(() => replacement.events.some(e => e.type === "bootstrap")); await second.until(() => second.ended); expect(table.connectionCount).toBe(1);
+    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
+    // Una nueva conexión permite observar la limpieza del cierre normal sin sleeps.
+    const live = connect(0); await live.until(() => live.events.some(e => e.type === "bootstrap"));
+    const count = live.events.filter(e => e.type === "bootstrap").length; replacement.close(); await live.until(() => live.events.filter(e => e.type === "bootstrap").length > count);
+    expect(clearIntervalSpy).toHaveBeenCalled(); expect(table.connectionCount).toBe(1); expect(table.primary?.participant).toBe(guests[0].guest.participantId);
+  });
+  it("64 cuerpos invitados no impiden kick ajeno; expulsión cancela lectores antes del ACK y conserva otro", async () => {
+    const s = await setup(kind), a = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), b = await s.invitations.start(s.bCookie, s.b1.id, null, 1, randomUUID());
+    const target = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(a), alias: "objetivo" }, randomUUID(), null), attacker = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(b), alias: "lento" }, randomUUID(), null), survivor = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(b), alias: "sobrevive" }, randomUUID(), null);
+    const reached = deferred(), survivorReached = deferred(); let registered = 0, rejected = 0, cancelled = 0;
+    const original = s.runtimes.request.bind(s.runtimes);
+    vi.spyOn(s.runtimes, "request").mockImplementation((...args) => { const release = original(...args); if (args[4] === attacker.guest.participantId) { registered++; if (registered + rejected === 64) reached.resolve(); } if (args[4] === survivor.guest.participantId) survivorReached.resolve(); return release; });
+    const destroy = IncomingMessage.prototype.destroy;
+    vi.spyOn(IncomingMessage.prototype, "destroy").mockImplementation(function (this: IncomingMessage, ...args) { if (this.headers.cookie === `ttrpg_guest=${attacker.token}` && !this.destroyed) cancelled++; return destroy.apply(this, args); });
+    const requests = Array.from({ length: 64 }, () => { const req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.b1.id}/table/ready`, method: "POST", headers: { host: "localhost:8787", origin: "http://localhost:8787", cookie: `ttrpg_guest=${attacker.token}`, "content-type": "application/json", "content-length": 256 } }, res => { res.resume(); expect(res.statusCode).toBe(429); rejected++; if (registered + rejected === 64) reached.resolve(); }); req.on("error", () => {}); req.flushHeaders(); return req; });
+    cleanup.push(async () => { requests.forEach(req => req.destroy()); }); await reached.promise; expect(registered).toBe(4); expect(rejected).toBe(60);
+    const payload = JSON.stringify({ ids: [] }); let survivorRequest!: ReturnType<typeof request>;
+    const survivorResult = new Promise<number>((resolve, reject) => { survivorRequest = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.b1.id}/assets/resolve`, method: "POST", headers: { host: "localhost:8787", origin: "http://localhost:8787", cookie: `ttrpg_guest=${survivor.token}`, "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); survivorRequest.on("error", reject); survivorRequest.flushHeaders(); });
+    cleanup.push(async () => { survivorRequest.destroy(); }); await survivorReached.promise;
+    const kick = (cookie: string, game: string, id: string, start: typeof a) => http(s.port, `/api/v1/dm/games/${game}/participants/${id}/kick`, cookie, "POST", { ...context(start), expectedInvitationVersion: 1 }, { "if-match": "1" });
+    expect((await kick(s.aCookie, s.a1.id, target.guest.participantId, a)).status).toBe(200);
+    expect((await kick(s.bCookie, s.b1.id, attacker.guest.participantId, b)).status).toBe(200); expect(cancelled).toBeGreaterThanOrEqual(4); expect(s.runtimes.pendingRequests).toBe(1);
+    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/state`, s.aCookie)).status).toBe(200);
+    expect(survivorRequest.destroyed).toBe(false); survivorRequest.end(payload); expect(await survivorResult).toBe(200);
+  });
+  it("bootstrap se reconstruye tras publicación concurrente y el cliente real puede confirmar y reportar", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "bootstrap" }, randomUUID(), null);
+    const entered = deferred(), release = deferred(), ready = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests); let calls = 0;
+    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { if (token === guest.token && ++calls === 3) { entered.resolve(); await release.promise; } return original(game, token, work); });
+    const client = contextualTableClient({ ...context(start), gameId: s.a1.id, audience: "player" }, () => {}, network(s.port, `ttrpg_guest=${guest.token}`)); cleanup.push(async () => client.clear());
+    client.api.onPlayerScene(() => ready.resolve()); client.start("player"); await entered.promise;
+    const asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
+    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...context(start), command: { requestId: randomUUID(), context: null, payload: snapshot(asset) } })).status).toBe(200);
+    release.resolve(); await ready.promise; expect(client.getStatus().published).toBe(true);
+    const view = await client.api.getPlayerWindowState(); expect(view.snapshot?.mapImageUrl).toBeTruthy();
+    await client.api.reportPlayerMapImageStatus({ imageUrl: view.snapshot!.mapImageUrl!, ok: true });
+    const contentReady = await client.api.notifyPlayerContentReady(); expect(contentReady.ok, JSON.stringify(contentReady)).toBe(true);
+    expect(await client.api.reportPlayerCamera({ reportRevision: 1, acknowledgedCommandRevision: null, camera: { center: { x: 10, y: 20 }, zoom: 1 }, origin: "initialization", final: true })).toMatchObject({ ok: true });
+  });
+  it("reconexión DM de apertura vieja termina; lecturas fijadas y cliente nuevo siguen independientes", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
+    await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...context(start), command: { requestId: randomUUID(), context: null, payload: snapshot(asset) } });
+    const terminal = vi.fn(), ready = deferred(), ended = deferred(), client = contextualTableClient({ ...context(start), gameId: s.a1.id, audience: "dm" }, reason => { terminal(reason); ended.resolve(); }, network(s.port, s.aCookie)); cleanup.push(async () => client.clear());
+    client.api.onPlayerScene(() => ready.resolve()); client.start("dm"); await ready.promise; client.stop(); expect(client.getStatus().published).toBe(true);
+    const next = await s.invitations.start(s.aCookie, s.a1.id, { id: start.opening!.id, generation: 1, revision: 1 }, 1, randomUUID(), true);
+    const query = `?openingId=${start.opening!.id}&generation=1`;
+    for (const path of ["table/state", "dice/session", "dice/sizes"]) { const result = await http(s.port, `/api/v1/dm/games/${s.a1.id}/${path}${query}`, s.aCookie); expect(result.status).toBe(409); expect(result.json.error).toMatchObject({ code: "OPENING_CHANGED" }); }
+    client.start("dm"); await ended.promise; expect(client.getStatus().published).toBe(false); expect(terminal).toHaveBeenCalledExactlyOnceWith("access-ended");
+    const freshReady = deferred(), fresh = contextualTableClient({ ...context(next), gameId: s.a1.id, audience: "dm" }, () => {}, network(s.port, s.aCookie)); cleanup.push(async () => fresh.clear()); fresh.subscribeStatus(() => { if (fresh.getStatus().phase === "connected") freshReady.resolve(); }); fresh.start("dm"); await freshReady.promise; expect(fresh.getStatus().phase).toBe("connected");
+  });
+});
diff --git a/src/infrastructure/server/moderation/exclusion.contract.ts b/src/infrastructure/server/moderation/exclusion.contract.ts
new file mode 100644
index 0000000..07ce8b6
--- /dev/null
+++ b/src/infrastructure/server/moderation/exclusion.contract.ts
@@ -0,0 +1,38 @@
+import { afterEach, expect, it } from "vitest";
+import { spawn } from "node:child_process";
+import { unlink } from "node:fs/promises";
+import { join } from "node:path";
+import { fixture, cleanup, secret, http } from "./fixtures";
+import { postgresPool } from "../database/driver";
+import type { DatabaseConfig } from "../database/config";
+afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
+async function child(database: DatabaseConfig) {
+  const process = spawn(globalThis.process.execPath, ["src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs"], { stdio: ["pipe", "pipe", "pipe"] });
+  const exited = new Promise<void>(resolve => process.on("exit", () => resolve()));
+  cleanup.push(async () => { if (process.exitCode === null && process.signalCode === null) { process.stdin.end("close\n"); await exited; } });
+  const ready = new Promise<{ ready?: boolean; unavailable?: boolean; port: number }>((resolve, reject) => {
+    let buffer = ""; process.stdout.on("data", data => { buffer += data; const end = buffer.indexOf("\n"); if (end >= 0) resolve(JSON.parse(buffer.slice(0, end))); }); process.on("error", reject);
+    process.on("exit", () => { if (!buffer) reject(new Error("Subproceso sin resultado")); });
+  });
+  process.stdin.write(JSON.stringify({ database, secret }) + "\n"); return { process, ready: await ready, exited };
+}
+for (const kind of ["sqlite", "postgres"] as const) it(`exclusión de procesos compilados, cierre limpio y caída abrupta ${kind}`, async () => {
+  const config = await fixture(kind), first = await child(config); expect(first.ready.ready).toBe(true);
+  const blocked = await child(config); expect(blocked.ready.unavailable).toBe(true); await blocked.exited;
+  first.process.stdin.end("close\n"); await first.exited;
+  const second = await child(config); expect(second.ready.ready).toBe(true); second.process.kill("SIGKILL"); await second.exited;
+  if (config.driver === "sqlite") {
+    const stale = await child(config); expect(stale.ready.unavailable).toBe(true); await stale.exited;
+    // Reparación del operador en fixture propia, solo tras waitpid confirmado; nunca por antigüedad.
+    await unlink(join(config.dataDir, "control.lock"));
+  }
+  const recovered = await child(config); expect(recovered.ready.ready).toBe(true);
+});
+it("pérdida del canal PG detiene al emisor anterior y permite dueño nuevo", async () => {
+  const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
+  const first = await child(config); const pool = postgresPool(config);
+  try { const result = await pool.query("SELECT pg_terminate_backend(pid) AS stopped FROM pg_locks WHERE locktype='advisory' AND classid=0 AND objid=783496103 AND objsubid=1 AND granted"); expect(result.rows).toEqual([{ stopped: true }]); } finally { await pool.end(); }
+  expect((await http(first.ready.port, "/api/v1/dm/games", "")).status).toBe(503);
+  const next = await child(config); expect(next.ready.ready).toBe(true);
+  expect((await http(first.ready.port, "/api/v1/dm/games", "")).status).toBe(503);
+});
diff --git a/src/infrastructure/server/moderation/fixtures.ts b/src/infrastructure/server/moderation/fixtures.ts
new file mode 100644
index 0000000..6ee6a88
--- /dev/null
+++ b/src/infrastructure/server/moderation/fixtures.ts
@@ -0,0 +1,41 @@
+import { randomUUID } from "node:crypto";
+import { createServer, request } from "node:http";
+import { accounts, cleanup, fixture, origin, secret, http, png } from "../owned/fixtures";
+import { openModerationBackend } from "../../../server/moderation-backend";
+import { identityDatabase } from "../identity/database";
+import { createDefaultScene } from "../../../domain/sessions/default-scene";
+import type { ContextualEvent } from "../../../shared/contracts/moderation";
+export { cleanup, fixture, origin, secret, http, png };
+export { context, expected, invitationSecret, deferred } from "../invitations/fixtures";
+export async function setup(kind: "sqlite" | "postgres") {
+  const config = await fixture(kind), a = await accounts(config); await a.identity.close();
+  let time = Date.now(); const now = () => new Date(time);
+  const backend = await openModerationBackend(config, { publicOrigin: origin, secret }, now); cleanup.push(() => backend.close());
+  const unit = await identityDatabase(config); cleanup.push(() => unit.close());
+  const a1 = await backend.identity.authorized(a.aCookie, "dm", (_, tx) => tx.games.create(a.a.id, "A1", { systemId: "generic", version: 1 }));
+  const a2 = await backend.identity.authorized(a.aCookie, "dm", (_, tx) => tx.games.create(a.a.id, "A2", { systemId: "generic", version: 1 }));
+  const b1 = await backend.identity.authorized(a.bCookie, "dm", (_, tx) => tx.games.create(a.b.id, "B1", { systemId: "dnd-55e", version: 1 }));
+  const server = createServer((req, res) => { void backend.handler(req, res); });
+  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error();
+  cleanup.push(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
+  return { ...a, ...backend, config, unit, a1, a2, b1, port: address.port, now, advance(ms: number) { time += ms; }, setTime(value: number) { time = value; } };
+}
+export function snapshot(asset: string) {
+  const base = createDefaultScene();
+  const scene = { ...base, map: { ...base.map, imagePath: `asset:${asset}` }, maps: base.maps.map(map => ({ ...map, map: { ...map.map, imagePath: `asset:${asset}` } })), sceneAside: { ...base.sceneAside, notes: [{ id: randomUUID(), name: "PRIVADO_CENTINELA_010", parentId: null, content: "PRIVADO_CENTINELA_010" }] } };
+  return { scene, showDmFogOverlay: false, camera: { center: { x: 10, y: 20 }, zoom: 1 }, mapImageUrl: "PRIVADO_URL_010", tokenImageUrls: {} };
+}
+export function stream(port: number, game: string, cookie: string, dm = false, cursor?: string) {
+  const events: ContextualEvent[] = []; let bytes = "", ended = false;
+  let response: import("node:http").IncomingMessage;
+  let changed = () => {}; const listeners = new Set<() => void>();
+  changed = () => { for (const listener of listeners) listener(); };
+  const req = request({ host: "127.0.0.1", port, path: `/api/v1/${dm ? "dm/" : ""}games/${game}/table/events`, headers: { host: "localhost:8787", origin, cookie, ...(cursor ? { "Last-Event-ID": cursor } : {}) } }, res => {
+    response = res; let buffer = "";
+    res.on("data", chunk => { bytes += chunk; buffer += chunk; let end: number; while ((end = buffer.indexOf("\n\n")) >= 0) { const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2); const line = frame.split("\n").find(l => l.startsWith("data: ")); if (line) events.push(JSON.parse(line.slice(6))); } changed(); });
+    const finish = () => { ended = true; changed(); }; res.on("end", finish); res.on("close", finish);
+  }); req.on("error", () => { ended = true; changed(); }); req.end();
+  const close = () => { req.destroy(); response?.destroy(); }; cleanup.push(async () => close());
+  async function until(predicate: () => boolean) { if (predicate()) return; await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { listeners.delete(check); reject(new Error("Stream no alcanzó estado esperado")); }, 10000); const check = () => { if (predicate()) { clearTimeout(timer); listeners.delete(check); resolve(); } }; listeners.add(check); }); }
+  return { events, until, close, get bytes() { return bytes; }, get ended() { return ended; } };
+}
diff --git a/src/infrastructure/server/moderation/moderation.contract.ts b/src/infrastructure/server/moderation/moderation.contract.ts
new file mode 100644
index 0000000..0f1c95e
--- /dev/null
+++ b/src/infrastructure/server/moderation/moderation.contract.ts
@@ -0,0 +1,76 @@
+import { afterEach, describe, expect, it } from "vitest";
+import { randomUUID } from "node:crypto";
+import { setup, cleanup, context, expected, invitationSecret, http, stream, snapshot, png, origin, secret } from "./fixtures";
+import { generateSecret, tokenDigest } from "../invitations/records";
+import { openModerationBackend } from "../../../server/moderation-backend";
+import { moderation } from "../../../application/services/moderation";
+import { invitationDigest } from "../invitations/records";
+afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
+for (const kind of ["sqlite", "postgres"] as const) describe(`Moderación010 real ${kind}`, () => {
+  it("tres jugadores, credenciales múltiples, SSE, roster, replay y supervivientes", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID());
+    const original = invitationSecret(start), admitted = await Promise.all(["Ana", "Ana", "日本語"].map(alias => s.invitations.guests.admit(s.a1.id, { alias, secret: original }, randomUUID(), null)));
+    const copied = generateSecret(); await s.unit.transaction(c => c.query("INSERT INTO guest_credentials(token_hash,participant_id,game_id,opening_id,generation,expires_at,revoked_at) VALUES($1,$2,$3,$4,1,$5,NULL)", [tokenDigest(s.a1.id, copied), admitted[0].guest.participantId, s.a1.id, start.opening!.id, admitted[0].guest.expiresAt]));
+    const streams = admitted.map(a => stream(s.port, s.a1.id, `ttrpg_guest=${a.token}`)); const extra = stream(s.port, s.a1.id, `ttrpg_guest=${copied}`);
+    await Promise.all([...streams, extra].map(v => v.until(() => v.events.some(e => e.type === "bootstrap"))));
+    const roster = await s.service.roster(s.aCookie, s.a1.id, { ...context(start), limit: 100, offset: 0 }); expect(roster.total).toBe(3); expect(roster.items.every(p => p.presence === "connected")).toBe(true);
+    const dmState = await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/state`, s.aCookie); expect((dmState.json.state as { presence: { count: number } }).presence.count).toBe(3);
+    const key = randomUUID(), input = { ...context(start), expectedInvitationVersion: 1 }, route = `/api/v1/dm/games/${s.a1.id}/participants/${admitted[0].guest.participantId}/kick`;
+    const kicked = await http(s.port, route, s.aCookie, "POST", input, { "if-match": "1", "idempotency-key": key }); expect(kicked.status).toBe(200); expect(kicked.json.secretAvailable).toBe(true);
+    await Promise.all([streams[0], extra].map(v => v.until(() => v.ended))); expect(streams[1].ended).toBe(false); expect(streams[2].ended).toBe(false);
+    expect(streams[0].events.at(-1)?.type).toBe("terminal");
+    for (const token of [admitted[0].token, copied]) expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${token}`)).status).toBe(401);
+    for (const a of admitted.slice(1)) expect((await s.invitations.guests.authorized(s.a1.id, a.token!, async g => g)).participantId).toBe(a.guest.participantId);
+    await expect(s.invitations.guests.admit(s.a1.id, { alias: "viejo", secret: original }, randomUUID(), null)).rejects.toMatchObject({ code: "INVITATION_UNAVAILABLE" });
+    await s.invitations.guests.admit(s.a1.id, { alias: "nuevo", secret: invitationSecret(kicked.json) }, randomUUID(), null);
+    const retry = await http(s.port, route, s.aCookie, "POST", input, { "if-match": "1", "idempotency-key": key }); expect(retry.status).toBe(200); expect(retry.json.secretAvailable).toBe(false);
+    const fresh = await s.service.kick(s.aCookie, s.a1.id, admitted[0].guest.participantId, input, 1, randomUUID()); expect(fresh.outcome).toBe("already-revoked"); expect(fresh.invitation.version).toBe(2);
+    await expect(s.service.kick(s.aCookie, s.a1.id, admitted[1].guest.participantId, input, 1, key)).rejects.toMatchObject({ code: "OPERATION_CONTENT_CONFLICT" });
+    await s.invitations.end(s.aCookie, s.a1.id, context(start), 1, randomUUID());
+    const replayClosed = await http(s.port, route, s.aCookie, "POST", input, { "if-match": "1", "idempotency-key": key }); expect(replayClosed.status).toBe(200); expect(replayClosed.json).not.toHaveProperty("invitationUrl");
+    const dump = await s.unit.transaction(async c => JSON.stringify((await c.query("SELECT * FROM moderation_audit")).rows)); expect(dump).not.toContain("Ana"); expect(dump).not.toContain(original);
+  });
+  it("rollback, concurrencia, autorización y filtros estrictos", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "objetivo" }, randomUUID(), null), input = { ...context(start), expectedInvitationVersion: 1 };
+    const broken = moderation(s.identity, s.runtimes, { generate() { throw new Error("fallo entre revocación y rotación"); }, hash: invitationDigest }, origin);
+    await expect(broken.kick(s.aCookie, s.a1.id, guest.guest.participantId, input, 1, randomUUID())).rejects.toBeDefined();
+    expect((await s.invitations.guests.authorized(s.a1.id, guest.token!, async g => g)).participantId).toBe(guest.guest.participantId);
+    expect(await s.unit.transaction(async c => (await c.query("SELECT * FROM moderation_audit")).rows.length)).toBe(0);
+    const path = `/api/v1/dm/games/${s.a1.id}/participants?openingId=${start.opening!.id}&generation=1&limit=1&offset=0`;
+    for (const [cookie, status] of [["", 401], [s.bCookie, 404], [s.adminCookie, 403], [`ttrpg_guest=${guest.token}`, 401], ["ttrpg_session=legacy", 401]] as const) expect((await http(s.port, path, cookie)).status).toBe(status);
+    expect((await http(s.port, path + "&extra=x", s.aCookie)).status).toBe(400);
+    const key = randomUUID(), results = await Promise.all([1, 2].map(() => s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, input, 1, key))); expect(results.filter(v => v.secretAvailable)).toHaveLength(1);
+    expect((await s.service.roster(s.aCookie, s.a1.id, { ...context(start), limit: 1, offset: 0, state: "revoked" })).total).toBe(1);
+    const opened = await s.invitations.start(s.aCookie, s.a1.id, expected(start), 1, randomUUID(), true);
+    await expect(s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, input, 1, randomUUID())).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
+    expect((await s.invitations.status(s.aCookie, s.a1.id)).opening?.id).toBe(opened.opening?.id);
+  });
+  it("A1/A2/B1 aislados, assets contextuales, bytes privados, reemplazo y salida", async () => {
+    const s = await setup(kind), asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
+    const games = [s.a1, s.a2, s.b1], cookies = [s.aCookie, s.aCookie, s.bCookie];
+    const starts = await Promise.all(games.map((g, i) => s.invitations.start(cookies[i], g.id, null, 1, randomUUID())));
+    const guests = await Promise.all(games.map((g, i) => s.invitations.guests.admit(g.id, { alias: "p", secret: invitationSecret(starts[i]) }, randomUUID(), null)));
+    const publish = (index: number, payload: unknown) => http(s.port, `/api/v1/dm/games/${games[index].id}/table/scene`, cookies[index], "POST", { ...context(starts[index]), command: { requestId: randomUUID(), context: null, payload } });
+    for (const i of [0, 1]) expect((await publish(i, snapshot(asset))).status).toBe(200);
+    expect((await publish(2, snapshot(asset))).status).toBe(404);
+    const streams = guests.map((g, i) => stream(s.port, games[i].id, `ttrpg_guest=${g.token}`)); await Promise.all(streams.map(st => st.until(() => st.events.length > 0)));
+    expect(streams[0].bytes).not.toContain("PRIVADO"); expect(streams[0].bytes).not.toContain(s.a.id); expect(streams[0].events[0].state?.snapshot?.mapImageUrl).toBe(`/api/v1/games/${s.a1.id}/assets/${asset}`);
+    const getAsset = (index: number, cookieIndex = index, method = "GET") => http(s.port, `/api/v1/games/${games[index].id}/assets/${asset}`, `ttrpg_guest=${guests[cookieIndex].token}`, method, undefined, { Range: "bytes=0-9", "if-none-match": "*" });
+    expect((await getAsset(0)).bytes).toEqual(png); expect((await getAsset(1, 0)).status).toBe(401);
+    expect((await publish(0, null)).status).toBe(200); expect((await getAsset(0)).status).toBe(404); expect((await getAsset(1)).bytes).toEqual(png); expect((await getAsset(0, 0, "HEAD")).status).toBe(404);
+    const replacement = stream(s.port, s.a2.id, `ttrpg_guest=${guests[1].token}`, false, `${s.a1.id}:${starts[0].opening!.id}:1:${streams[0].events[0].epoch}:player:999`); await replacement.until(() => replacement.events.length > 0); await streams[1].until(() => streams[1].ended); expect(streams[1].events.at(-1)?.terminal).toBe("replaced"); expect(replacement.events[0].gameId).toBe(s.a2.id); expect(replacement.events[0].type).toBe("bootstrap");
+    await s.invitations.guests.leave(s.a2.id, guests[1].token!); await replacement.until(() => replacement.ended);
+    expect(streams[0].ended).toBe(false); expect(streams[2].ended).toBe(false);
+  });
+  it("gracia, límite exacto, restart vacío/epoch nuevo y exclusión de composición", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { alias: "p", secret: invitationSecret(start) }, randomUUID(), null);
+    const stream1 = stream(s.port, s.a1.id, `ttrpg_guest=${guest.token}`); await stream1.until(() => stream1.events.length > 0); const epoch = stream1.events[0].epoch;
+    await expect(openModerationBackend(s.config, { publicOrigin: origin, secret }, s.now)).rejects.toBeDefined();
+    await s.close(); await s.unit.close();
+    const next = await openModerationBackend(s.config, { publicOrigin: origin, secret }, s.now); cleanup.push(() => next.close());
+    await next.invitations.guests.authorized(s.a1.id, guest.token!, async (_, tx) => { const transport = await tx.transport(); expect(next.runtimes.runtime(transport.context).epoch).not.toBe(epoch); expect(next.runtimes.runtime(transport.context).state("player").snapshot).toBeNull(); });
+    await expect(next.invitations.guests.admit(s.a1.id, { alias: "nuevo", secret: invitationSecret(start) }, randomUUID(), null)).rejects.toMatchObject({ code: "HOST_UNAVAILABLE" });
+    s.advance(149999); expect((await next.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID())).outcome).toBe("revoked");
+    s.advance(1); await expect(next.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 2 }, 1, randomUUID())).rejects.toBeDefined();
+  });
+});
diff --git a/src/infrastructure/server/moderation/races.contract.ts b/src/infrastructure/server/moderation/races.contract.ts
new file mode 100644
index 0000000..ec2277e
--- /dev/null
+++ b/src/infrastructure/server/moderation/races.contract.ts
@@ -0,0 +1,107 @@
+import { postgresPool } from "../database/driver";
+import { defaultDiceDraft } from "../../../domain/dice/dice";
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { randomUUID } from "node:crypto";
+import { request } from "node:http";
+import { setup, cleanup, context, invitationSecret, http, deferred, stream, png, snapshot } from "./fixtures";
+import { systemSeeds } from "../../../domain/systems/system-catalog";
+import { ownedGames } from "../../../application/services/owned-games";
+afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
+for (const kind of ["sqlite", "postgres"] as const) describe(`Carreras010 ${kind}`, () => {
+  it("body lento no retiene lock; kick gana y los callbacks HTTP/SSE tardíos no entregan datos", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "lento" }, randomUUID(), null);
+    const initial = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests);
+    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { const result = await original(game, token, work); initial.resolve(); return result; });
+    const payload = JSON.stringify({ ...context(start), command: { requestId: randomUUID(), context: null, payload: {}, connectionId: randomUUID(), revision: 0 } });
+    let req!: ReturnType<typeof request>;
+    const pending = new Promise<number>((resolve) => { req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.a1.id}/table/ready`, method: "POST", headers: { host: "localhost:8787", origin: "http://localhost:8787", cookie: `ttrpg_guest=${guest.token}`, "content-type": "application/json", "content-length": Buffer.byteLength(payload) } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); req.on("error", () => resolve(0)); req.flushHeaders(); });
+    await initial.promise;
+    await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID());
+    req.end(payload); expect(await pending).toBe(0);
+    const count = await s.unit.transaction(async c => (await c.query("SELECT * FROM moderation_audit")).rows.length); expect(count).toBe(1);
+  });
+  it("consulta en cola y frame en cola se revalidan; orden anterior al kick queda explícito", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "barrera" }, randomUUID(), null);
+    const reached = deferred(), release = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests); let calls = 0;
+    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { if (++calls === 2) { reached.resolve(); await release.promise; } return original(game, token, work); });
+    const pending = http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${guest.token}`).catch(() => ({ status: 0 }));
+    await reached.promise; await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); release.resolve();
+    expect((await pending).status).toBe(0);
+    const next = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(await s.invitations.rotate(s.aCookie, s.a1.id, { ...context(start), expectedInvitationVersion: 2 }, 1, randomUUID())), alias: "ordenado" }, randomUUID(), null);
+    const lock = deferred(), unlock = deferred(); let sent = false;
+    const before = s.invitations.guests.authorized(s.a1.id, next.token!, async (_, tx) => { lock.resolve(); await unlock.promise; await tx.deliver(() => { sent = true; }, () => {}); }); await lock.promise;
+    const kick = s.service.kick(s.aCookie, s.a1.id, next.guest.participantId, { ...context(start), expectedInvitationVersion: 3 }, 1, randomUUID());
+    unlock.resolve(); await before; await kick; expect(sent).toBe(true);
+    await expect(s.invitations.guests.authorized(s.a1.id, next.token!, async (_, tx) => tx.deliver(() => { throw new Error("No debe entregar"); }, () => {}))).rejects.toMatchObject({ code: "GUEST_UNAUTHORIZED" });
+  });
+  it("kicks distintos serializan invitación; disable/archive limpian sin resurrección", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), secret = invitationSecret(start), guests = await Promise.all([1, 2].map(() => s.invitations.guests.admit(s.a1.id, { secret, alias: "igual" }, randomUUID(), null)));
+    const results = await Promise.allSettled(guests.map(g => s.service.kick(s.aCookie, s.a1.id, g.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID())));
+    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
+    const live = guests[results.findIndex(r => r.status === "rejected")], st = stream(s.port, s.a1.id, `ttrpg_guest=${live.token}`); await st.until(() => st.events.length > 0);
+    await s.identity.administer(s.adminCookie, s.a.id, "disable"); await st.until(() => st.ended);
+    await s.identity.administer(s.adminCookie, s.a.id, "enable"); expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${live.token}`)).status).toBe(401);
+    const bstart = await s.invitations.start(s.bCookie, s.b1.id, null, 1, randomUUID()), b = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(bstart), alias: "b" }, randomUUID(), null), bs = stream(s.port, s.b1.id, `ttrpg_guest=${b.token}`); await bs.until(() => bs.events.length > 0);
+    await s.identity.authorized(s.bCookie, "dm", (actor, tx) => ownedGames(actor.account.id, tx).update(s.b1.id, { state: "archived" }, 1)); await bs.until(() => bs.ended);
+  });
+  it("join que obtiene el lock antes de kick sobrevive; enlace viejo después no admite", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), secret = invitationSecret(start);
+    const target = await s.invitations.guests.admit(s.a1.id, { secret, alias: "objetivo" }, randomUUID(), null);
+    const reached = deferred(), release = deferred();
+    const blocker = s.unit.transaction(async () => { reached.resolve(); await release.promise; }); await reached.promise;
+    const join = s.invitations.guests.admit(s.a1.id, { secret, alias: "antes" }, randomUUID(), null);
+    // SQLite comparte cola. En PG esperamos la petición real del advisory lock antes de encolar kick.
+    if (s.config.driver === "postgres") {
+      const pool = postgresPool(s.config);
+      try { const deadline = Date.now() + 10000; for (;;) { const waiting = await pool.query("SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=783496102 AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())"); if (waiting.rows.length) break; if (Date.now() >= deadline) throw new Error("Admisión no alcanzó barrera DB"); } } finally { await pool.end(); }
+    }
+    const kick = s.service.kick(s.aCookie, s.a1.id, target.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID());
+    release.resolve(); await blocker; const admitted = await join; await kick;
+    expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/state`, `ttrpg_guest=${admitted.token}`)).status).toBe(200);
+    await expect(s.invitations.guests.admit(s.a1.id, { secret, alias: "después" }, randomUUID(), null)).rejects.toBeDefined();
+  });
+  it("cámaras/dados A1/A2/B1, promoción y callback de apertura vieja aislados", async () => {
+    const s = await setup(kind), games = [s.a1, s.a2, s.b1], cookies = [s.aCookie, s.aCookie, s.bCookie], assets = [randomUUID(), randomUUID()];
+    await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(assets[0], "image/png", png)); await s.identity.authorized(s.bCookie, "dm", (_, tx) => tx.assets.create(assets[1], "image/png", png));
+    const starts = await Promise.all(games.map((game, i) => s.invitations.start(cookies[i], game.id, null, 1, randomUUID()))), mapContexts: string[] = [];
+    const guests = await Promise.all(games.map((game, i) => s.invitations.guests.admit(game.id, { alias: "jugador", secret: invitationSecret(starts[i]) }, randomUUID(), null)));
+    const streams = guests.map((guest, i) => stream(s.port, games[i].id, `ttrpg_guest=${guest.token}`)); await Promise.all(streams.map(st => st.until(() => st.events.length > 0)));
+    const command = (i: number, family: string, action: string, payload: unknown, requestId = randomUUID()) => http(s.port, `/api/v1/dm/games/${games[i].id}/${family}/${action}`, cookies[i], "POST", { ...context(starts[i]), command: { requestId, context: mapContexts[i] ?? null, payload } });
+    const reused = randomUUID(), diceRequest = randomUUID();
+    for (let i = 0; i < 3; i++) {
+      const published = await command(i, "table", "scene", snapshot(assets[i === 2 ? 1 : 0]), reused); expect(published.status).toBe(200); mapContexts[i] = (published.json.state as { context: string }).context;
+      expect((await command(i, "table", "camera", { center: { x: i * 100, y: i * 20 }, zoom: i + 1 })).status).toBe(200);
+      expect((await command(i, "dice", "context", { token: mapContexts[i], sceneId: "scene", mapId: "map", sceneName: `PRIVADO_DADOS_${i}`, mapName: `PRIVADO_DADOS_${i}` })).status).toBe(200);
+      const begun = await command(i, "dice", "begin", { requestId: reused, contextToken: mapContexts[i], draft: { ...defaultDiceDraft(), visibility: i === 0 ? "hidden" : "open", groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, d20: null }, diceRequest);
+      expect(begun.status).toBe(200);
+      expect((await command(i, "dice", "complete", { rollId: (begun.json.value as { rollId: string }).rollId, simulation: { values: [{ id: "f:d6:0", value: i + 2 }], replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, .5, 0, 0, 0, 1] } } })).status).toBe(200);
+    }
+    const states = await Promise.all(games.map((g, i) => http(s.port, `/api/v1/games/${g.id}/table/state`, `ttrpg_guest=${guests[i].token}`)));
+    for (const [i, result] of states.entries()) { expect(result.json.state).toMatchObject({ camera: { center: { x: i * 100, y: i * 20 }, zoom: i + 1 } }); expect(result.bytes.toString()).not.toContain("PRIVADO"); }
+    expect((states[0].json.state as { dice: { presentation: unknown } }).dice.presentation).toBeNull(); expect((states[1].json.state as { dice: { presentation: unknown } }).dice.presentation).not.toBeNull();
+    const survivor = await s.invitations.guests.admit(s.a2.id, { alias: "superviviente", secret: invitationSecret(starts[1]) }, randomUUID(), null), survivorStream = stream(s.port, s.a2.id, `ttrpg_guest=${survivor.token}`); await survivorStream.until(() => survivorStream.events.length > 0);
+    await s.service.kick(s.aCookie, s.a2.id, guests[1].guest.participantId, { ...context(starts[1]), expectedInvitationVersion: 1 }, 1, randomUUID());
+    const after = await http(s.port, `/api/v1/games/${s.a2.id}/table/state`, `ttrpg_guest=${survivor.token}`); expect((after.json.state as { camera: unknown }).camera).toEqual((states[1].json.state as { camera: unknown }).camera); expect((after.json.state as { dice: unknown }).dice).toEqual((states[1].json.state as { dice: unknown }).dice);
+    await s.invitations.start(s.aCookie, s.a1.id, { id: starts[0].opening!.id, generation: 1, revision: 1 }, 1, randomUUID(), true);
+    expect((await command(0, "table", "camera", { center: { x: 999, y: 999 }, zoom: 1 })).status).toBe(409);
+    expect(streams[2].ended).toBe(false); expect(survivorStream.ended).toBe(false);
+  });
+  it("hash exacto de versiones retenidas; dados y deduplicación independientes", async () => {
+    const s = await setup(kind), ref = { systemId: "generic", version: 2 }, definition = structuredClone(systemSeeds[0].definition); definition.presentations[0].markdown = "PRIVADO_SISTEMA_010";
+    await s.identity.authorized(s.adminCookie, "admin", async (_, tx) => { await tx.systems.draft(ref, definition, 0); await tx.systems.publish(ref, 1); });
+    const game = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.games.create(s.a.id, "A2 versión2", ref));
+    const games = [s.a1, game], starts = await Promise.all(games.map(g => s.invitations.start(s.aCookie, g.id, null, 1, randomUUID())));
+    await s.identity.authorized(s.adminCookie, "admin", async (_, tx) => { for (const version of [1, 2]) { const current = await tx.systems.get({ systemId: "generic", version }); await tx.systems.availability({ systemId: "generic", version }, "disabled", current.revision); } });
+    const asset = randomUUID(); await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", png));
+    const requestId = randomUUID();
+    for (const [i, g] of games.entries()) {
+      const guest = await s.invitations.guests.admit(g.id, { alias: "retiene", secret: invitationSecret(starts[i]) }, randomUUID(), null);
+      const publish = { ...context(starts[i]), command: { requestId, context: null, payload: snapshot(asset) } };
+      expect((await http(s.port, `/api/v1/dm/games/${g.id}/table/scene`, s.aCookie, "POST", publish)).status).toBe(200);
+      const state = await http(s.port, `/api/v1/games/${g.id}/table/state`, `ttrpg_guest=${guest.token}`), resolved = await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.links.resolve(g.id));
+      expect(state.json.state).toMatchObject({ systemRef: { systemId: "generic", version: i + 1 }, systemHash: resolved.hash }); expect(state.bytes.toString()).not.toContain("PRIVADO_SISTEMA_010");
+      const retry = await http(s.port, `/api/v1/dm/games/${g.id}/table/scene`, s.aCookie, "POST", publish); expect((retry.json.state as { revision: number }).revision).toBe((state.json.state as { revision: number }).revision);
+      expect((await http(s.port, `/api/v1/games/${g.id}/dice/session`, `ttrpg_guest=${guest.token}`)).status).toBe(404);
+    }
+  });
+});
diff --git a/src/infrastructure/server/moderation/runtime-lease.ts b/src/infrastructure/server/moderation/runtime-lease.ts
new file mode 100644
index 0000000..3e2ea4b
--- /dev/null
+++ b/src/infrastructure/server/moderation/runtime-lease.ts
@@ -0,0 +1,26 @@
+import { postgresPool } from "../database/driver";
+import type { DatabaseConfig } from "../database/config";
+import { InvitationError } from "../../../application/services/invitations";
+export interface RuntimeLease { check(): Promise<void>; assert(): void; onLost(action: () => void): void; close(): Promise<void> }
+const sqliteOwners = new Set<string>();
+/** Lock de sesión dedicado; jamás se devuelve al pool mientras exista un emisor. */
+export async function runtimeLease(config: DatabaseConfig): Promise<RuntimeLease> {
+  let live = true; const listeners = new Set<() => void>();
+  const fail = () => { if (!live) return; live = false; for (const listener of listeners) listener(); };
+  const assert = () => { if (!live) throw new InvitationError("UNAVAILABLE"); };
+  if (config.driver === "sqlite") {
+    if (sqliteOwners.has(config.dataDir)) throw new InvitationError("UNAVAILABLE");
+    sqliteOwners.add(config.dataDir);
+    return { assert, async check() { assert(); }, onLost: action => { listeners.add(action); }, async close() { if (!live) return; fail(); sqliteOwners.delete(config.dataDir); } };
+  }
+  const pool = postgresPool(config); const client = await pool.connect().catch(async () => { await pool.end(); throw new InvitationError("UNAVAILABLE"); });
+  client.on("error", fail); client.on("end", fail);
+  try { if (!(await client.query("SELECT pg_try_advisory_lock(783496103) AS owned")).rows[0].owned) throw new Error(); }
+  catch { client.release(true); await pool.end(); throw new InvitationError("UNAVAILABLE"); }
+  let closed = false, checking: Promise<void> | undefined;
+  return {
+    assert, onLost(action) { listeners.add(action); },
+    async check() { assert(); if (checking) return checking; checking = (async () => { try { const result = await client.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=0 AND objid=783496103 AND objsubid=1 AND granted) AS owned"); if (!result.rows[0].owned) throw new Error(); assert(); } catch { fail(); throw new InvitationError("UNAVAILABLE"); } })().finally(() => { checking = undefined; }); return checking; },
+    async close() { if (closed) return; closed = true; fail(); client.release(true); await pool.end(); }
+  };
+}
diff --git a/src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs b/src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs
new file mode 100644
index 0000000..eac1c2f
--- /dev/null
+++ b/src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs
@@ -0,0 +1,55 @@
+import { Buffer } from "node:buffer";
+import { setTimeout, clearTimeout } from "node:timers";
+import process from "node:process";
+import { createServer, request } from "node:http";
+import { randomBytes, randomUUID } from "node:crypto";
+import assert from "node:assert/strict";
+import { openModerationBackend } from "../../../../../out/api/invitation-backend.mjs";
+let raw = ""; for await (const chunk of process.stdin) raw += chunk;
+const input = JSON.parse(raw), origin = "http://localhost:8787", secret = randomBytes(32).toString("base64url"), sockets = [];
+let backend, server;
+async function listen() { server = createServer((req, res) => { void backend.handler(req, res); }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve)); }
+async function stop() { sockets.splice(0).forEach(s => s.destroy()); await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await backend.close(); }
+async function http(path, cookie, method = "GET", data, headers = {}) { return new Promise((resolve, reject) => {
+  const req = request({ host: "127.0.0.1", port: server.address().port, path, method, headers: { host: "localhost:8787", origin, cookie, "content-type": "application/json", "idempotency-key": randomUUID(), ...headers } }, res => { const chunks = []; res.on("data", chunk => chunks.push(chunk)); res.on("end", () => { const bytes = Buffer.concat(chunks); let body; try { body = JSON.parse(bytes.toString()); } catch { /* assets */ } resolve({ status: res.statusCode, body, bytes, cookie: res.headers["set-cookie"]?.[0] }); }); }); req.on("error", reject); req.end(data === undefined ? undefined : JSON.stringify(data));
+}); }
+function stream(game, cookie) {
+  let ended = false, bytes = "", count = 0; const events = [], waiters = [];
+  const changed = () => { for (const f of [...waiters]) f(); };
+  const req = request({ host: "127.0.0.1", port: server.address().port, path: `/api/v1/games/${game}/table/events`, headers: { host: "localhost:8787", origin, cookie } }, res => { sockets.push(res); let buffer = ""; res.on("data", chunk => { bytes += chunk; buffer += chunk; let end; while ((end = buffer.indexOf("\n\n")) >= 0) { const block = buffer.slice(0, end); buffer = buffer.slice(end + 2); const data = block.split("\n").find(line => line.startsWith("data: ")); if (data) { events.push(JSON.parse(data.slice(6))); count++; } } changed(); }); const done = () => { ended = true; changed(); }; res.on("end", done); res.on("close", done); }); sockets.push(req); req.end();
+  const until = predicate => predicate() ? Promise.resolve() : new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error("Tiempo de stream")), 10000); const check = () => { if (predicate()) { clearTimeout(timeout); waiters.splice(waiters.indexOf(check), 1); resolve(); } }; waiters.push(check); });
+  return { events, until, get ended() { return ended; }, get bytes() { return bytes; }, get count() { return count; } };
+}
+try {
+  backend = await openModerationBackend(input.config, { publicOrigin: origin, secret }); await listen();
+  const temporary = "Temporal suficientemente larga 010", permanent = "Definitiva suficientemente larga 010";
+  await backend.identity.bootstrap({ email: "admin@example.test", name: "Admin", password: temporary });
+  const activate = async email => { const first = await backend.identity.login(email, temporary, email); await backend.identity.changePassword(first.cookie, temporary, permanent); return (await backend.identity.login(email, permanent, email)).cookie; };
+  const admin = await activate("admin@example.test"), dm = await backend.identity.createDm(admin, { email: "dm@example.test", name: "DM", password: temporary }), cookie = await activate(dm.email);
+  const game = await http("/api/v1/dm/games", cookie, "POST", { name: "Compilada010", systemRef: { systemId: "generic", version: 1 } }); assert.equal(game.status, 201);
+  const id = game.body.game.id, dmPath = `/api/v1/dm/games/${id}`, path = `/api/v1/games/${id}`;
+  const opened = await http(dmPath + "/opening/start", cookie, "POST", { expectedOpening: null }, { "if-match": "1" }); assert.equal(opened.status, 201);
+  const ctx = { openingId: opened.body.opening.id, generation: opened.body.opening.generation }, oldSecret = opened.body.invitationUrl.split("#invitacion=")[1];
+  const guests = []; for (const alias of ["Ana", "Ana", "Tercero"]) { const guest = await http(path + "/admission", "", "POST", { alias, secret: oldSecret }); assert.equal(guest.status, 201); guests.push(guest); }
+  await backend.identity.authorized(cookie, "dm", (_, tx) => tx.assets.create(input.asset, "image/png", Buffer.from(input.png, "base64")));
+  const cmd = async (family, action, payload, mapContext = null) => http(dmPath + `/${family}/${action}`, cookie, "POST", { ...ctx, command: { requestId: randomUUID(), context: mapContext, payload } });
+  const published = await cmd("table", "scene", input.snapshot); assert.equal(published.status, 200); const map = published.body.state.context;
+  await cmd("dice", "context", { token: map, sceneId: "scene", mapId: "map", sceneName: "PRIVADO_DADOS_010", mapName: "PRIVADO_DADOS_010" }, map);
+  const begun = await cmd("dice", "begin", { requestId: randomUUID(), contextToken: map, draft: input.draft, d20: null }, map); assert.equal(begun.status, 200);
+  assert.equal((await cmd("dice", "complete", { rollId: begun.body.value.rollId, simulation: input.simulation }, map)).status, 200);
+  const streams = guests.map(g => stream(id, g.cookie)); await Promise.all(streams.map(s => s.until(() => s.count > 0)));
+  assert.ok(streams[1].events[0].state.dice.presentation); assert.ok(!streams[1].bytes.includes("PRIVADO")); const epoch = streams[1].events[0].epoch;
+  const kickId = randomUUID();
+  const kicked = await http(dmPath + `/participants/${guests[0].body.participantId}/kick`, cookie, "POST", { ...ctx, expectedInvitationVersion: 1 }, { "if-match": "1", "idempotency-key": kickId }); assert.equal(kicked.status, 200);
+  await streams[0].until(() => streams[0].ended); assert.equal(streams[1].ended, false); assert.equal(streams[2].ended, false);
+  assert.equal((await http(path + "/table/state", guests[0].cookie)).status, 401); assert.equal((await http(path + `/assets/${input.asset}`, guests[0].cookie)).status, 401);
+  assert.equal((await http(path + `/assets/${input.asset}`, guests[1].cookie)).status, 200);
+  assert.equal((await http(path + "/admission", "", "POST", { alias: "Viejo", secret: oldSecret })).status, 401);
+  assert.equal((await http(path + "/admission", "", "POST", { alias: "Nuevo", secret: kicked.body.invitationUrl.split("#invitacion=")[1] })).status, 201);
+  await stop(); backend = await openModerationBackend(input.config, { publicOrigin: origin, secret }); await listen();
+  const replay = await http(dmPath + `/participants/${guests[0].body.participantId}/kick`, cookie, "POST", { ...ctx, expectedInvitationVersion: 1 }, { "if-match": "1", "idempotency-key": kickId }); assert.equal(replay.status, 200); assert.equal(replay.body.secretAvailable, false); assert.equal(replay.body.invitationUrl, undefined); assert.equal(replay.body.invitation.version, 2);
+  const restarted = await http(path + "/table/state", guests[1].cookie); assert.equal(restarted.status, 200); assert.notEqual(restarted.body.state.epoch, epoch); assert.equal(restarted.body.state.snapshot, null); assert.equal(restarted.body.state.dice.presentation, null);
+  assert.equal((await http(dmPath + "/opening/heartbeat", cookie, "POST", ctx)).status, 200); assert.equal((await cmd("table", "scene", input.snapshot)).status, 200);
+  process.stdout.write("API compilada010: mapa/dado/SSE/kick/401/supervivientes/enlaces/restart PASS\n");
+} catch (error) { process.stderr.write("Humo compilado010 falló: " + error.message + "\n"); process.exitCode = 1; }
+finally { if (backend && server) await stop(); }
diff --git a/src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs b/src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs
new file mode 100644
index 0000000..03da6a0
--- /dev/null
+++ b/src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs
@@ -0,0 +1,16 @@
+import process from "node:process";
+import { createInterface } from "node:readline";
+import { createServer } from "node:http";
+import { openModerationBackend } from "../../../../../out/api/invitation-backend.mjs";
+const lines = createInterface({ input: process.stdin });
+let backend, server;
+try {
+  for await (const line of lines) {
+    if (!backend) {
+      const config = JSON.parse(line); backend = await openModerationBackend(config.database, { publicOrigin: "http://localhost:8787", secret: config.secret });
+      server = createServer((req, res) => { void backend.handler(req, res); }); await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
+      process.stdout.write(JSON.stringify({ ready: true, port: server.address().port }) + "\n");
+    } else if (line === "close") break;
+  }
+} catch { process.stdout.write(JSON.stringify({ unavailable: true }) + "\n"); process.exitCode = 2; }
+finally { if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await backend?.close(); lines.close(); }
diff --git a/src/infrastructure/server/moderation/transport.contract.ts b/src/infrastructure/server/moderation/transport.contract.ts
new file mode 100644
index 0000000..90adc25
--- /dev/null
+++ b/src/infrastructure/server/moderation/transport.contract.ts
@@ -0,0 +1,54 @@
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { randomBytes, randomUUID } from "node:crypto";
+import { request, ServerResponse } from "node:http";
+import sharp from "sharp";
+import { setup, cleanup, context, invitationSecret, http, deferred, stream, snapshot } from "./fixtures";
+afterEach(async () => { vi.restoreAllMocks(); for (const action of cleanup.splice(0).reverse()) await action(); });
+for (const kind of ["sqlite", "postgres"] as const) describe(`Frontera de envío010 ${kind}`, () => {
+  it("kick antes del primer frame descarta bootstrap en cola y cierra antes del ACK", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "en cola" }, randomUUID(), null);
+    const reached = deferred(), release = deferred(), original = s.invitations.guests.authorized.bind(s.invitations.guests); let calls = 0;
+    vi.spyOn(s.invitations.guests, "authorized").mockImplementation(async (game, token, work) => { if (token === guest.token && ++calls === 3) { reached.resolve(); await release.promise; } return original(game, token, work); });
+    const st = stream(s.port, s.a1.id, `ttrpg_guest=${guest.token}`); await reached.promise;
+    const result = await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); expect(result.outcome).toBe("revoked");
+    release.resolve(); await st.until(() => st.ended); expect(st.events.map(e => e.type)).toEqual(["terminal"]); expect(st.bytes).not.toContain('"snapshot"');
+  });
+  it("backpressure real: no encola otro chunk tras kick y resolve/HEAD/range/cookie copiada deniegan", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), guest = await s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: "descarga" }, randomUUID(), null), asset = randomUUID();
+    const image = await sharp(randomBytes(2048 * 1536 * 4), { raw: { width: 2048, height: 1536, channels: 4 } }).png({ compressionLevel: 0 }).toBuffer();
+    await s.identity.authorized(s.aCookie, "dm", (_, tx) => tx.assets.create(asset, "image/png", image));
+    expect((await http(s.port, `/api/v1/dm/games/${s.a1.id}/table/scene`, s.aCookie, "POST", { ...context(start), command: { requestId: randomUUID(), context: null, payload: snapshot(asset) } })).status).toBe(200);
+    const reached = deferred(), originalWrite = ServerResponse.prototype.write, originalEmit = ServerResponse.prototype.emit; let protectedWrites = 0; const blocked = new Set<ServerResponse>();
+    vi.spyOn(ServerResponse.prototype, "write").mockImplementation(function (this: ServerResponse, ...args: Parameters<typeof originalWrite>) {
+      const result = originalWrite.apply(this, args);
+      if (this.req.url?.endsWith(`/assets/${asset}`)) { protectedWrites++; blocked.add(this); reached.resolve(); return false; }
+      return result;
+    });
+    vi.spyOn(ServerResponse.prototype, "emit").mockImplementation(function (this: ServerResponse, ...args: Parameters<typeof originalEmit>) { if (blocked.has(this) && args[0] === "drain") return false; return originalEmit.apply(this, args); });
+    let received = 0;
+    const ended = new Promise<void>((resolve, reject) => { const req = request({ host: "127.0.0.1", port: s.port, path: `/api/v1/games/${s.a1.id}/assets/${asset}`, headers: { host: "localhost:8787", cookie: `ttrpg_guest=${guest.token}` } }, res => { res.on("data", b => { received += b.length; }); res.on("close", resolve); res.on("error", () => resolve()); }); req.on("error", reject); req.end(); });
+    await reached.promise; expect(protectedWrites).toBe(1);
+    await s.service.kick(s.aCookie, s.a1.id, guest.guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); await ended;
+    expect(protectedWrites).toBe(1); expect(received).toBeLessThanOrEqual(65536); vi.restoreAllMocks();
+    for (const method of ["GET", "HEAD"]) expect((await http(s.port, `/api/v1/games/${s.a1.id}/assets/${asset}`, `ttrpg_guest=${guest.token}`, method, undefined, { Range: "bytes=0-999", "if-none-match": "*" })).status).toBe(401);
+    expect((await http(s.port, `/api/v1/games/${s.a1.id}/assets/resolve`, `ttrpg_guest=${guest.token}`, "POST", { ids: [asset] })).status).toBe(401);
+  });
+  it("cuota de streams reales reserva DM y libera capacidad al desconectar", async () => {
+    const s = await setup(kind), start = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID());
+    const guests = await Promise.all(Array.from({ length: 29 }, (_, i) => s.invitations.guests.admit(s.a1.id, { secret: invitationSecret(start), alias: `quota-${i}` }, randomUUID(), null)));
+    const streams = guests.slice(0, 28).map(g => stream(s.port, s.a1.id, `ttrpg_guest=${g.token}`)); await Promise.all(streams.map(st => st.until(() => st.events.length > 0)));
+    expect((await http(s.port, `/api/v1/games/${s.a1.id}/table/events`, `ttrpg_guest=${guests[28].token}`)).status).toBe(429);
+    const dm = stream(s.port, s.a1.id, s.aCookie, true); await dm.until(() => dm.events.length > 0); expect(dm.ended).toBe(false);
+    await s.service.kick(s.aCookie, s.a1.id, guests[0].guest.participantId, { ...context(start), expectedInvitationVersion: 1 }, 1, randomUUID()); await streams[0].until(() => streams[0].ended);
+    const replacement = stream(s.port, s.a1.id, `ttrpg_guest=${guests[28].token}`); await replacement.until(() => replacement.events.length > 0); expect(replacement.ended).toBe(false);
+  });
+  it("presencia de B1 no incrementa revisión ni invalida roster/SSE del propietario A1", async () => {
+    const s = await setup(kind), a = await s.invitations.start(s.aCookie, s.a1.id, null, 1, randomUUID()), b = await s.invitations.start(s.bCookie, s.b1.id, null, 1, randomUUID());
+    const ast = stream(s.port, s.a1.id, s.aCookie, true); await ast.until(() => ast.events.some(e => e.type === "bootstrap"));
+    const before = await s.service.roster(s.aCookie, s.a1.id, { ...context(a), limit: 50, offset: 0 });
+    const guest = await s.invitations.guests.admit(s.b1.id, { secret: invitationSecret(b), alias: "B privado" }, randomUUID(), null), bst = stream(s.port, s.b1.id, `ttrpg_guest=${guest.token}`); await bst.until(() => bst.events.length > 0);
+    const after = await s.service.roster(s.aCookie, s.a1.id, { ...context(a), limit: 50, offset: 0 }); expect(after).toEqual(before);
+    const heartbeats = ast.bytes.split(": heartbeat").length; await ast.until(() => ast.bytes.split(": heartbeat").length > heartbeats);
+    expect(ast.events.filter(e => e.type === "roster")).toEqual([]); expect(ast.bytes).not.toContain(s.b1.id); expect(ast.bytes).not.toContain("B privado");
+  });
+});
diff --git a/src/infrastructure/server/moderation/vitest.config.ts b/src/infrastructure/server/moderation/vitest.config.ts
new file mode 100644
index 0000000..6617458
--- /dev/null
+++ b/src/infrastructure/server/moderation/vitest.config.ts
@@ -0,0 +1,2 @@
+import { defineConfig } from "vitest/config";
+export default defineConfig({ test: { include: ["src/infrastructure/server/moderation/*.contract.ts"], testTimeout: 60000, hookTimeout: 30000, fileParallelism: false } });
diff --git a/src/infrastructure/server/owned/repository.ts b/src/infrastructure/server/owned/repository.ts
index 4473239..79f57e2 100644
--- a/src/infrastructure/server/owned/repository.ts
+++ b/src/infrastructure/server/owned/repository.ts
@@ -35,7 +35,7 @@ export const fingerprint = (value: unknown) => createHash("sha256").update(canon
 const openingSchema = z.object({ id: z.uuid(), gameId: z.uuid(), generation: z.number().int().min(1), state: z.enum(["open", "closed"]), hostAccountId: id, hostSessionId: id, createdAt: z.iso.datetime(), closedAt: z.iso.datetime().nullable(), lastHeartbeatAt: z.iso.datetime(), leaseExpiresAt: z.iso.datetime(), revision: z.number().int().min(1) }).strict();
 const openingColumns = 'id,game_id AS "gameId",generation,state,host_account_id AS "hostAccountId",host_session_id AS "hostSessionId",created_at AS "createdAt",closed_at AS "closedAt",last_heartbeat_at AS "lastHeartbeatAt",lease_expires_at AS "leaseExpiresAt",revision';
 function opening(row: Row): Opening { const result = openingSchema.safeParse(row); if (!result.success) throw new OwnedError("CORRUPT"); return result.data; }
-export function ownedRepositories(run: Execute, identity: IdentitySessionDto, clock: CatalogClock, commitEffects: CommitEffects): OwnedTransaction & { verifyInvariants(): Promise<void> } {
+export function ownedRepositories(run: Execute, identity: IdentitySessionDto, clock: CatalogClock, commitEffects: CommitEffects, onInvalidated: (game: string) => void = () => {}): OwnedTransaction & { verifyInvariants(): Promise<void> } {
   const { role, id: owner } = identity.account, sessionId = identity.sessionId;
   const requireDm = () => { if (role !== "dm") throw new OwnedError("FORBIDDEN"); };
   const execute: Execute = work => run(async c => { requireDm(); return work(c); });
@@ -130,7 +130,8 @@ export function ownedRepositories(run: Execute, identity: IdentitySessionDto, cl
       expected(revision); await ownGame(gameId);
       await execute(async c => { const result = await c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE game_id=$2 AND id=$3 AND generation=$4 AND revision=$5 AND state='open'", [clock.now().toISOString(), gameId, key, generation, revision]); if (!result.changes) throw new OwnedError("CONFLICT"); });
     },
-    async invalidate(gameId) { await ownGame(gameId); await execute(c => c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE game_id=$2 AND state='open'", [clock.now().toISOString(), gameId])); }
+    async invalidate(gameId) {
+      effects.afterCommit(() => onInvalidated(gameId), () => onInvalidated(gameId)); await ownGame(gameId); await execute(c => c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE game_id=$2 AND state='open'", [clock.now().toISOString(), gameId])); }
   };
   let operationUsed = false;
   const validateBudget = async () => {
diff --git a/src/infrastructure/server/owned/systems.contract.ts b/src/infrastructure/server/owned/systems.contract.ts
index d6c5f73..d139f4c 100644
--- a/src/infrastructure/server/owned/systems.contract.ts
+++ b/src/infrastructure/server/owned/systems.contract.ts
@@ -151,7 +151,7 @@ for (const kind of ["sqlite","postgres"] as const) describe(`Sistemas retenidos
     await expect(migrateCatalog(config)).rejects.toMatchObject({code:"TEMPLATE_MISSING"});
     expect((await raw(config,c=>c.query("SELECT version FROM ttrpg_control_migrations ORDER BY version"))).rows.map(r=>r.version)).toEqual([1,2,3]);
     await raw(config,c=>c.query("UPDATE owned_resources SET body=$1 WHERE kind='monsters'",[JSON.stringify(m)]));
-    expect(await migrateCatalog(config)).toEqual([4, 5]); expect(await migrateCatalog(config)).toEqual([]);
+    expect(await migrateCatalog(config)).toEqual([4, 5, 6]); expect(await migrateCatalog(config)).toEqual([]);
     await raw(config,async c=>{const row=(await c.query("SELECT bindings FROM owned_resources WHERE kind='monsters'")).rows[0]; expect(JSON.parse(String(row.bindings))).toMatchObject({root:{scope:"private",ownerId:owner,templateId,hash:definitionHash(t)}}); expect((await c.query("SELECT system_id,system_version FROM ttrpg_games")).rows[0]).toEqual({system_id:"generic",system_version:1});});
     const old=await legacyFixture(), root=directory(), backup=join(root,"backup"), bundle=join(root,"v1");backupLegacy(old.source,backup);await exportLegacy(backup,bundle);await inlineVersion2(bundle);const path=join(bundle,"manifest.json"), manifest=JSON.parse(readFileSync(path,"utf8"));delete manifest.catalog;delete manifest.links;manifest.version=1;writeFileSync(path,JSON.stringify(manifest));
     const dest=await fixture(kind), a=await accounts(dest); await importTransfer(dest,bundle,{owner:a.a.id,gameName:"Compatibilidad"}); await verifyTransfer(dest,bundle,{owner:a.a.id});
diff --git a/src/server/invitation-backend.ts b/src/server/invitation-backend.ts
index ccd68f0..c183b13 100644
--- a/src/server/invitation-backend.ts
+++ b/src/server/invitation-backend.ts
@@ -4,3 +4,4 @@ export { openInvitations } from "../infrastructure/server/invitations";
 export { createInvitationHttp, isInvitationPath } from "./invitation-http";
 export { createOwnedHttp } from "./owned-http";
 export { createIdentityHttp } from "./identity-http";
+export { openModerationBackend } from "./moderation-backend";
diff --git a/src/server/invitation-http.ts b/src/server/invitation-http.ts
index fac971e..a19fa21 100644
--- a/src/server/invitation-http.ts
+++ b/src/server/invitation-http.ts
@@ -29,7 +29,7 @@ export class AdmissionQuota {
   get size() { return this.entries.size; }
 }
 const statuses = { INVALID_INPUT: 400, INVITATION_UNAVAILABLE: 401, GUEST_UNAUTHORIZED: 401, HOST_UNAVAILABLE: 409, REVISION_CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, ADMISSION_ALREADY_PROCESSED: 409, ALIAS_CONFLICT: 409, RATE_LIMITED: 429, UNAVAILABLE: 503 } as const;
-export function isInvitationPath(path: string) { return /^\/api\/v1\/games\//.test(path) || /^\/api\/v1\/dm\/games\/[^/]+\/(opening|invitation)(\/|$)/.test(path); }
+export function isInvitationPath(path: string) { return /^\/api\/v1\/games\/[^/]+\/(admission|guest\/(session|leave))$/.test(path) || /^\/api\/v1\/dm\/games\/[^/]+\/(opening|invitation)(\/|$)/.test(path); }
 export function createInvitationHttp(service: InvitationService, identity: IdentityService, origin: string, now = Date.now) {
   const quota = new AdmissionQuota(now); let inFlight = 0;
   const send = (res: ServerResponse, status: number, value?: unknown) => { res.statusCode = status; if (value !== undefined) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); } else res.end(); };
diff --git a/src/server/moderation-backend.ts b/src/server/moderation-backend.ts
new file mode 100644
index 0000000..fa54a8f
--- /dev/null
+++ b/src/server/moderation-backend.ts
@@ -0,0 +1,36 @@
+import { randomUUID } from "node:crypto";
+import type { DatabaseConfig } from "../infrastructure/server/database/config";
+import type { IdentityConfig } from "../infrastructure/server/identity/config";
+import { openIdentity } from "../infrastructure/server/identity";
+import { openInvitations } from "../infrastructure/server/invitations";
+import { generateSecret, invitationDigest } from "../infrastructure/server/invitations/records";
+import { runtimeLease } from "../infrastructure/server/moderation/runtime-lease";
+import { GameRuntimeRegistry } from "../application/services/game-runtime";
+import { moderation } from "../application/services/moderation";
+import { createModerationHttp, isModerationPath } from "./moderation-http";
+import { createInvitationHttp, isInvitationPath } from "./invitation-http";
+import { createIdentityHttp } from "./identity-http";
+import { createOwnedHttp } from "./owned-http";
+import type { IncomingMessage, ServerResponse } from "node:http";
+export async function openModerationBackend(database: DatabaseConfig, config: IdentityConfig, now = () => new Date()) {
+  const lease = await runtimeLease(database);
+  const runtimes = new GameRuntimeRegistry(() => now().getTime(), randomUUID); lease.onLost(() => runtimes.clear());
+  try {
+    const identity = await openIdentity(database, config, { now, id: randomUUID }, { openingInvalidated: game => runtimes.discardGame(game), accountDisabled: owner => runtimes.discardOwner(owner), sessionRevoked: (owner, session) => runtimes.revokeHost(owner, session) });
+    try {
+      const invitations = await openInvitations(database, identity, config.publicOrigin, now, (game, participant) => runtimes.leave(game, participant), game => runtimes.discardGame(game), (context, id) => runtimes.allows(context, `asset:${id}`), opening => runtimes.renew(opening));
+      const service = moderation(identity, runtimes, { generate: generateSecret, hash: invitationDigest }, config.publicOrigin, () => lease.check(), () => now().getTime());
+      const contextual = createModerationHttp(identity, invitations, service, runtimes, lease, config.publicOrigin, () => now().getTime());
+      const invited = createInvitationHttp(invitations, identity, config.publicOrigin, () => now().getTime()), auth = createIdentityHttp(identity, config.publicOrigin), owned = createOwnedHttp(identity, config.publicOrigin);
+      const timer = setInterval(() => { runtimes.expire(); void lease.check().catch(() => runtimes.clear()); }, 1000); timer.unref();
+      return { identity, invitations, service, runtimes,
+        async handler(req: IncomingMessage, res: ServerResponse) {
+          try { await lease.check(); } catch { res.writeHead(503, { "Cache-Control": "no-store" }); res.end(); return; }
+          const path = (req.url ?? "").split("?")[0];
+          await (isModerationPath(path) ? contextual : isInvitationPath(path) ? invited : path.startsWith("/api/v1/identity/") ? auth : owned)(req, res);
+        },
+        async close() { clearInterval(timer); runtimes.clear(); await invitations.close(); await identity.close(); await lease.close(); }
+      };
+    } catch (error) { await identity.close(); throw error; }
+  } catch (error) { await lease.close(); throw error; }
+}
diff --git a/src/server/moderation-http.ts b/src/server/moderation-http.ts
new file mode 100644
index 0000000..36753d0
--- /dev/null
+++ b/src/server/moderation-http.ts
@@ -0,0 +1,202 @@
+import { createHash } from "node:crypto";
+import type { IncomingMessage, ServerResponse } from "node:http";
+import { z, ZodError } from "zod";
+import type { IdentityService } from "../application/services/identity";
+import { IdentityError } from "../application/services/identity";
+import { InvitationError, type InvitationService } from "../application/services/invitations";
+import { OwnedError, type OwnedTransaction } from "../application/services/owned-store";
+import type { GameContext, GameRuntimeRegistry } from "../application/services/game-runtime";
+import type { moderation } from "../application/services/moderation";
+import type { RuntimeLease } from "../infrastructure/server/moderation/runtime-lease";
+import { resolveCompiledModules, type ResolvedSystem } from "../domain/systems/system-catalog";
+import { canonicalUuid, openingContextSchema } from "../shared/contracts/invitations";
+import { contextualMutationSchema, kickSchema, rosterQuerySchema } from "../shared/contracts/moderation";
+import { mutationSchema, tablePayloads, type TableEvent } from "../shared/contracts/table";
+import { json } from "./request-body";
+import { HttpError } from "./errors";
+import { readGuestCookie } from "./invitation-http";
+import { executeTableCommand } from "./table-actions";
+interface Scope { context: GameContext; system: ResolvedSystem; participant?: string; expiresAt?: string; roster?: string; deliver(effect: () => void): Promise<void>; assets: OwnedTransaction["assets"]["get"]; publish?: (snapshot: ReturnType<typeof tablePayloads.scene.parse>, resource?: string, operation?: { owner: string; id: string; fingerprint: string }) => Promise<void> }
+export const isModerationPath = (path: string) => /^\/api\/v1\/(dm\/)?games\/[^/]+\/(participants|table|dice|assets)(\/|$)/.test(path);
+export function createModerationHttp(identity: IdentityService, invitations: InvitationService, service: ReturnType<typeof moderation>, registry: GameRuntimeRegistry, lease: RuntimeLease, origin: string, now = Date.now) {
+  let authenticating = 0; const authenticatingByCookie = new Map<string, number>();
+  const send = (res: ServerResponse, value: unknown) => { if (res.destroyed) return; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(value)); };
+  return async (req: IncomingMessage, res: ServerResponse) => {
+    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "no-referrer"); res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
+    let authenticatingSlot = false, authenticationKey = "", releaseRequest = () => {};
+    const requestAbort = new AbortController();
+    const cancelRequest = () => { releaseRequest(); requestAbort.abort(); req.destroy(); res.destroy(); };
+    const releaseAuthentication = () => { if (authenticatingSlot) { authenticatingSlot = false; authenticating--; const count = (authenticatingByCookie.get(authenticationKey) ?? 1) - 1; if (count) authenticatingByCookie.set(authenticationKey, count); else authenticatingByCookie.delete(authenticationKey); } };
+    try {
+      if (req.headers.host !== new URL(origin).host || req.headers.origin !== undefined && req.headers.origin !== origin || !["GET", "HEAD"].includes(req.method ?? "") && req.headers.origin !== origin) throw new HttpError(403, "FORBIDDEN", "El origen no está permitido.");
+      authenticationKey = createHash("sha256").update(req.headers.cookie ?? "").digest("hex");
+      if (authenticating + registry.pendingRequests >= 64 || (authenticatingByCookie.get(authenticationKey) ?? 0) >= 4) throw new InvitationError("RATE_LIMITED");
+      authenticating++; authenticatingSlot = true; authenticatingByCookie.set(authenticationKey, (authenticatingByCookie.get(authenticationKey) ?? 0) + 1);
+      const url = new URL(req.url!, origin), match = /^\/api\/v1\/(dm\/)?games\/([^/]+)\/(participants|table|dice|assets)(?:\/(.+))?$/.exec(url.pathname);
+      if (!match || /[%\\\0]/.test(url.pathname)) throw new InvitationError("INVALID_INPUT");
+      const [, dm, game, family, action = ""] = match; canonicalUuid.parse(game);
+      const cookie = req.headers.cookie ?? ""; if (cookie.length > 8192) throw new InvitationError("INVALID_INPUT");
+      const names = cookie.split(";").map(s => s.trim().split("=", 1)[0]); if (new Set(names).size !== names.length) throw new InvitationError("INVALID_INPUT");
+      const role = dm ? "dm" as const : "player" as const, token = dm ? null : readGuestCookie(cookie);
+      let key = createHash("sha256").update(dm ? cookie : token ?? "").digest("hex");
+      const query = Object.fromEntries(url.searchParams); if ([...url.searchParams.keys()].length !== Object.keys(query).length) throw new InvitationError("INVALID_INPUT");
+      const authorize = async (work: (scope: Scope) => Promise<void>) => {
+        await lease.check(); let deliveryFailure: unknown; let deliveryFailed = false;
+        const deliver = (effect: () => void) => { lease.assert(); try { effect(); } catch (error) { deliveryFailure = error; deliveryFailed = true; } };
+        if (dm) await identity.authorized(cookie, "dm", async (actor, tx) => {
+          key = actor.sessionId;
+          const context = await registry.context(tx, actor.account.id, game), system = await tx.links.resolve(game);
+          const roster = await tx.invitations.participants(game, context.openingId);
+          tx.effects.beforeCommit(async () => { await lease.check(); const next = await registry.context(tx, actor.account.id, game); if (next.openingId !== context.openingId || next.generation !== context.generation) throw new InvitationError("REVISION_CONFLICT"); });
+          await work({ context, system, expiresAt: actor.expiresAt, roster: `${roster.revision}:${roster.items.length}:${registry.presenceSequence(context)}`, assets: id => tx.assets.get(id), publish: (snapshot, resource, operation) => registry.publish(tx, context, snapshot, resource, operation), async deliver(effect) { tx.effects.afterCommit(() => { deliver(effect); }, () => registry.discard(context)); } });
+        }); else await invitations.guests.authorized(game, token, async (guest, tx) => {
+          const { context, system } = await tx.transport();
+          await work({ context, system, participant: guest.participantId, expiresAt: guest.expiresAt, assets: id => tx.asset(id), deliver: async effect => { await tx.deliver(() => { deliver(effect); }, () => registry.discard(context)); } });
+        });
+        if (deliveryFailed) throw deliveryFailure;
+      };
+      const establishingStream = family === "table" && action === "events" && req.method === "GET";
+      let captured: GameContext | undefined;
+      if (family !== "participants") await authorize(async scope => { captured = scope.context; if (!establishingStream) await scope.deliver(() => { releaseAuthentication(); releaseRequest = registry.request(scope.context, scope.participant ?? key, role, cancelRequest, scope.participant, scope.expiresAt); }); });
+      else { let quotaFailure: unknown; await identity.authorized(cookie, "dm", async (actor, tx) => {
+        if (!await tx.games.find(actor.account.id, game)) throw new OwnedError("NOT_FOUND");
+        const opening = await tx.openings.current(game);
+        tx.effects.beforeCommit(() => lease.check());
+        tx.effects.afterCommit(() => { releaseAuthentication(); try { releaseRequest = registry.request({ ownerId: actor.account.id, gameId: game, openingId: opening?.id ?? game, generation: opening?.generation ?? 0 }, actor.sessionId, "dm", cancelRequest, undefined, actor.expiresAt); } catch (error) { quotaFailure = error; } }, cancelRequest);
+      }); if (quotaFailure) throw quotaFailure; }
+      // El establecimiento SSE conserva su cupo transitorio hasta pasar al registro de streams; no es un lector de body.
+      if (!establishingStream) releaseAuthentication();
+      if (requestAbort.signal.aborted || res.destroyed) return;
+      const same = (ctx: GameContext) => { if (ctx.openingId !== captured!.openingId || ctx.generation !== captured!.generation) throw new HttpError(409, "OPENING_CHANGED", "La apertura de esta mesa finalizó."); };
+      const metadata = (scope: Scope) => { resolveCompiledModules(scope.system.definition.manifest); return { gameId: game, openingId: scope.context.openingId, generation: scope.context.generation, systemRef: scope.system.ref, systemHash: scope.system.hash, modules: scope.system.definition.manifest, audience: role }; };
+      if (family === "participants") {
+        if (!dm) throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");
+        if (req.method === "GET" && !action) { const roster = await service.roster(cookie, game, rosterQuerySchema.parse(query)); send(res, { ok: true, ...roster }); return; }
+        if (req.method !== "POST" || !/^([a-f0-9-]{36})\/kick$/.test(action) || url.search) throw new InvitationError("INVALID_INPUT");
+        const rawRevision = req.headers["if-match"]; if (typeof rawRevision !== "string" || !/^(?:[1-9][0-9]*|"[1-9][0-9]*")$/.test(rawRevision)) throw new InvitationError("INVALID_INPUT");
+        const result = await service.kick(cookie, game, action.split("/")[0], kickSchema.parse(await json(req, res, 8192, requestAbort.signal)), Number(rawRevision.replaceAll('"', "")), canonicalUuid.parse(req.headers["idempotency-key"]));
+        send(res, { ok: true, ...result }); return;
+      }
+      if (Object.keys(query).length) { const expected = openingContextSchema.extend({ generation: z.coerce.number().int().min(1) }).parse(query); if (expected.openingId !== captured!.openingId || expected.generation !== captured!.generation) throw new HttpError(409, "OPENING_CHANGED", "La apertura de esta mesa finalizó."); }
+      if (family === "table" && action === "events" && req.method === "GET") {
+        const cursor = req.headers["last-event-id"];
+        if (cursor !== undefined && (typeof cursor !== "string" || cursor.length > 200 || !/^[a-f0-9-]{36}:[a-f0-9-]{36}:\d{1,16}:[a-f0-9-]{36}:(dm|player):\d{1,16}$/.test(cursor))) throw new InvitationError("INVALID_INPUT");
+        let transportClosed = res.destroyed || res.writableEnded, dispose = () => {};
+        const disconnected = () => { transportClosed = true; releaseAuthentication(); dispose(); };
+        res.on("close", disconnected);
+        try { await authorize(async scope => {
+          same(scope.context);
+          await scope.deliver(() => {
+            if (transportClosed || res.destroyed || res.writableEnded) return;
+            // El cierre puede ser llamado por la reserva antes de crear el transporte.
+            // eslint-disable-next-line prefer-const
+            let closed = false, connection: { id: string; close(): void } | undefined, timer: ReturnType<typeof setInterval> | undefined;
+            let release = () => {}, pendingBytes = 0, heartbeatPending = false, chain = Promise.resolve(), roster = scope.roster, deliveredSequence = -1;
+            const table = registry.runtime(scope.context);
+            const drains = new Set<ReturnType<typeof setTimeout>>();
+            const close = (reason?: "access-ended" | "replaced" | "unavailable") => {
+              if (closed) return; closed = true; clearInterval(timer); for (const drain of drains) clearTimeout(drain); release(); connection?.close();
+              res.off("close", disconnected);
+              if (reason && res.headersSent && !res.destroyed) {
+                const state = table.state(role);
+                const terminal = { protocolVersion: 2, ...metadata(scope), epoch: state.epoch, context: state.context, revision: state.revision, serverTime: now(), sequence: table.transportSequence(role), type: "terminal", terminal: reason };
+                if (res.writableLength === 0) res.end(`event: table\ndata: ${JSON.stringify(terminal)}\n\n`); else res.destroy();
+              } else if (res.headersSent && !res.destroyed && !res.writableEnded) res.end();
+            };
+            dispose = () => close();
+            const unusable = () => transportClosed || res.destroyed || res.writableEnded;
+            const write = (bytes: string) => { if (closed) return; if (unusable()) { close(); return; } if (res.writableLength + Buffer.byteLength(bytes) > 2 * 1024 * 1024) { close(); return; } if (!res.write(bytes)) { const drain = setTimeout(() => { drains.delete(drain); if (res.writableLength) close(); }, 5000); drains.add(drain); drain.unref(); } };
+            const queue = (event?: TableEvent) => {
+              if (closed || !event && heartbeatPending) return;
+              if (unusable()) { close(); return; }
+              if (!event) heartbeatPending = true;
+              const size = event ? Buffer.byteLength(JSON.stringify(event)) : 0;
+              if (pendingBytes + size > 2 * 1024 * 1024) { close(); return; } pendingBytes += size;
+              chain = chain.then(async () => {
+                if (closed) return;
+                await authorize(async current => { same(current.context); await current.deliver(() => {
+                  if (closed) return;
+                  const table = registry.runtime(current.context);
+                  if (event) {
+                    const frame = event.type === "bootstrap" ? { ...event, epoch: table.epoch, context: table.context, revision: table.revision, serverTime: now(), sequence: table.transportSequence(role), state: table.state(role, connection!.id) } : event;
+                    if (frame.epoch !== table.epoch || frame.context !== table.context || frame.revision < table.revision || frame.sequence <= deliveredSequence) return;
+                    deliveredSequence = frame.sequence;
+                    const value = { ...frame, protocolVersion: 2, ...metadata(current) };
+                    write(`id: ${game}:${current.context.openingId}:${current.context.generation}:${frame.epoch}:${role}:${frame.sequence}\nevent: table\ndata: ${JSON.stringify(value)}\n\n`);
+                  } else { write(`: heartbeat ${now()}\n\n`); if (dm && roster !== current.roster) { roster = current.roster; write(`event: table\ndata: ${JSON.stringify({ protocolVersion: 2, ...metadata(current), epoch: table.epoch, context: table.context, revision: table.revision, serverTime: now(), type: "roster", sequence: table.transportSequence(role), payload: { revision: roster } })}\n\n`); } }
+                }); });
+              }).catch(() => close("access-ended")).finally(() => { pendingBytes -= size; if (!event) heartbeatPending = false; });
+            };
+            try {
+              release = registry.register(scope.context, key, role, close, scope.participant);
+              releaseAuthentication();
+              if (unusable()) { close(); return; }
+              res.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive", "X-Accel-Buffering": "no" }); res.flushHeaders();
+              if (unusable()) { close(); return; }
+              connection = table.connect(key, role, queue, scope.participant);
+              // connect puede cerrar sincrónicamente si el bootstrap excede la cola.
+              if (closed || unusable()) { connection.close(); close(); return; }
+              timer = setInterval(() => queue(), 1000); timer.unref();
+            } catch (error) { close(); throw error; }
+          });
+        }); } catch (error) { dispose(); throw error; }
+        finally { if (transportClosed || !res.headersSent) res.off("close", disconnected); }
+        return;
+      }
+      if (family === "assets") {
+        if (dm) throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");
+        if (action === "resolve" && req.method === "POST") {
+          const input = z.object({ ids: z.array(canonicalUuid).max(100) }).strict().parse(await json(req, res, 16384, requestAbort.signal));
+          await authorize(async scope => { same(scope.context); await scope.deliver(() => send(res, { ok: true, assets: Object.fromEntries(input.ids.map(id => [id, registry.allows(scope.context, `asset:${id}`) ? `/api/v1/games/${game}/assets/${id}` : null])) })); }); return;
+        }
+        canonicalUuid.parse(action); if (!["GET", "HEAD"].includes(req.method ?? "")) throw new InvitationError("INVALID_INPUT");
+        let bytes: Uint8Array | undefined, revision = -1;
+        let releaseTransfer = () => {};
+        const closeTransfer = () => { releaseTransfer(); res.destroy(); };
+        await authorize(async scope => {
+          same(scope.context); const table = registry.runtime(scope.context); if (!table.allows(`asset:${action}`)) throw new OwnedError("NOT_FOUND");
+          revision = table.revision; const asset = await scope.assets(action); if (!asset) throw new OwnedError("NOT_FOUND"); bytes = asset.bytes;
+          await scope.deliver(() => { if (table.revision !== revision || !table.allows(`asset:${action}`)) throw new OwnedError("NOT_FOUND"); releaseTransfer = registry.track(scope.context, scope.participant!, closeTransfer); res.once("close", () => releaseTransfer()); res.setHeader("Content-Type", asset.mime); res.setHeader("Content-Length", bytes!.length); if (req.method === "HEAD") res.end(); });
+        });
+        if (req.method === "HEAD") return;
+        for (let offset = 0; offset < bytes!.length && !res.destroyed; offset += 65536) {
+          let draining = false;
+          await authorize(async scope => { same(scope.context); await scope.deliver(() => { const table = registry.runtime(scope.context); if (table.revision !== revision || !table.allows(`asset:${action}`)) throw new OwnedError("NOT_FOUND"); draining = !res.write(bytes!.subarray(offset, offset + 65536)); }); });
+          if (draining) await new Promise<void>(resolve => { const done = () => { clearTimeout(timeout); res.off("drain", done); res.off("close", done); resolve(); }; const timeout = setTimeout(() => { res.destroy(); done(); }, 5000); res.once("drain", done); res.once("close", done); });
+        }
+        releaseTransfer(); res.end(); return;
+      }
+      if (req.method === "GET") {
+        await authorize(async scope => { same(scope.context); await scope.deliver(() => {
+          const table = registry.runtime(scope.context);
+          if (family === "table" && action === "state") send(res, { ok: true, state: { ...table.state(role), protocolVersion: 2, ...metadata(scope) } });
+          else if (family === "dice" && action === "public") send(res, { ok: true, value: table.dice.getPublicState() });
+          else if (family === "dice" && action === "sizes") send(res, { ok: true, value: table.sizes(role) });
+          else if (family === "dice" && action === "session" && dm) send(res, { ok: true, value: table.dice.getDmState() });
+          else throw new HttpError(404, "NOT_FOUND", "No se encontró el recurso.");
+        }); }); return;
+      }
+      if (req.method !== "POST") throw new InvitationError("INVALID_INPUT");
+      const tableActions = dm ? ["scene", "camera", "camera-command", "pointer", "area-highlight"] : ["camera-report", "ready", "map-image-status"];
+      const diceActions = dm ? ["context", "preferences", "begin", "complete", "fail", "dismiss", "visibility", "clear-history", "size", "render-status"] : ["render-status"];
+      if (!(family === "table" ? tableActions : diceActions).includes(action)) throw new HttpError(403, "FORBIDDEN", "La operación no está permitida.");
+      const input = contextualMutationSchema.parse(await json(req, res, undefined, requestAbort.signal));
+      if (input.openingId !== captured!.openingId || input.generation !== captured!.generation) throw new HttpError(409, "OPENING_CHANGED", "La apertura de esta mesa finalizó.");
+      const command = mutationSchema.parse(input.command);
+      const scenePayload = family === "table" && action === "scene" ? tablePayloads.scene.parse(command.payload) : null;
+      await authorize(async scope => {
+        same(scope.context);
+        if (family === "table" && action === "scene") {
+          await scope.publish!(scenePayload, input.sceneResourceId, { owner: key, id: command.requestId, fingerprint: createHash("sha256").update(JSON.stringify(input)).digest("hex") });
+          await scope.deliver(() => send(res, { ok: true, state: { ...registry.runtime(scope.context).state(role), protocolVersion: 2, ...metadata(scope) } }));
+        } else await scope.deliver(() => send(res, executeTableCommand(registry.runtime(scope.context), key, family, action, role, command)));
+      });
+    } catch (error) {
+      if (res.destroyed) return;
+      if (res.headersSent) { res.destroy(); return; }
+      const status = error instanceof HttpError ? error.status : error instanceof ZodError ? 400 : error instanceof InvitationError ? ({ GUEST_UNAUTHORIZED: 401, INVALID_INPUT: 400, REVISION_CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, RATE_LIMITED: 429 }[error.code as "GUEST_UNAUTHORIZED"] ?? 503) : error instanceof IdentityError ? ({ UNAUTHORIZED: 401, FORBIDDEN: 403, PASSWORD_CHANGE_REQUIRED: 403 }[error.code as "UNAUTHORIZED"] ?? 503) : error instanceof OwnedError ? ({ NOT_FOUND: 404, VALIDATION: 400, CONFLICT: 409, OPERATION_CONTENT_CONFLICT: 409, OPERATION_BUDGET: 429 }[error.code as "NOT_FOUND"] ?? 503) : 503;
+      res.statusCode = status; if (!req.complete) res.setHeader("Connection", "close");
+      send(res, { ok: false, error: { code: status === 503 ? "UNAVAILABLE" : status === 400 ? "INVALID_INPUT" : error instanceof Error && "code" in error ? String((error as { code: string }).code) : "UNAVAILABLE", message: status === 503 ? "No se pudo completar la operación. Consulta el estado antes de reintentar." : status === 400 ? "Los datos no son válidos." : (error as Error).message } });
+    } finally { releaseAuthentication(); releaseRequest(); }
+  };
+}
diff --git a/src/server/request-body.ts b/src/server/request-body.ts
index 9697048..22679e5 100644
--- a/src/server/request-body.ts
+++ b/src/server/request-body.ts
@@ -1,12 +1,12 @@
 import type { IncomingMessage, ServerResponse } from "node:http";
 import { HttpError } from "./errors";
 import { LIMITS } from "./config";
-export async function body(req: IncomingMessage, res: ServerResponse, limit: number): Promise<Buffer> {
+export async function body(req: IncomingMessage, res: ServerResponse, limit: number, signal?: AbortSignal): Promise<Buffer> {
   const length = Number(req.headers["content-length"] ?? 0);
   if (length > limit) { res.setHeader("Connection", "close"); throw new HttpError(413, "PAYLOAD_TOO_LARGE", "El contenido supera el límite permitido."); }
   return new Promise((resolve, reject) => {
     const chunks: Buffer[] = []; let size = 0; let oversized = false;
-    const clean = () => { clearTimeout(timer); req.off("data", data); req.off("end", end); req.off("error", error); req.off("aborted", aborted); };
+    const clean = () => { clearTimeout(timer); req.off("data", data); req.off("end", end); req.off("error", error); req.off("aborted", aborted); signal?.removeEventListener("abort", aborted); };
     const error = () => { clean(); reject(new HttpError(400, "INVALID_BODY", "No se pudo completar la carga.")); };
     const aborted = () => error();
     const data = (chunk: Buffer) => {
@@ -16,12 +16,14 @@ export async function body(req: IncomingMessage, res: ServerResponse, limit: num
     };
     const end = () => { clean(); if (oversized) reject(new HttpError(413, "PAYLOAD_TOO_LARGE", "El contenido supera el límite permitido.")); else resolve(Buffer.concat(chunks)); };
     const timer = setTimeout(() => { clean(); req.pause(); res.setHeader("Connection", "close"); reject(new HttpError(408, "REQUEST_TIMEOUT", "La carga tardó demasiado.")); }, LIMITS.bodyMs);
+    if (signal?.aborted) { aborted(); return; }
+    signal?.addEventListener("abort", aborted, { once: true });
     req.on("data", data); req.on("end", end); req.on("error", error); req.on("aborted", aborted);
   });
 }
-export async function json(req: IncomingMessage, res: ServerResponse, limit: number = LIMITS.jsonBytes): Promise<unknown> {
+export async function json(req: IncomingMessage, res: ServerResponse, limit: number = LIMITS.jsonBytes, signal?: AbortSignal): Promise<unknown> {
   if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Se requiere Content-Type application/json.");
-  const bytes = await body(req, res, limit);
+  const bytes = await body(req, res, limit, signal);
   try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
   catch { throw new HttpError(400, "INVALID_JSON", "El JSON no es válido."); }
 }
diff --git a/src/server/table-actions.ts b/src/server/table-actions.ts
new file mode 100644
index 0000000..ff05f44
--- /dev/null
+++ b/src/server/table-actions.ts
@@ -0,0 +1,61 @@
+import { createHash } from "node:crypto";
+import { ZodError } from "zod";
+import { TableConflict, type TableSession } from "../application/services/table-session";
+import { mutationSchema, tablePayloads, dicePayloads } from "../shared/contracts/table";
+import type { ServiceRole } from "../shared/contracts/http-api";
+import { HttpError, invalid, missing } from "./errors";
+import { parse } from "./schemas";
+const dmOnly = () => new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
+export function executeTableCommand(table: TableSession, key: string, family: string, action: string, role: ServiceRole, raw: unknown, publicOrigin = ""): unknown {
+    const playerActions = ["camera-report", "ready", "map-image-status"];
+    if (family === "table" && (playerActions.includes(action) ? role !== "player" : role !== "dm")) throw dmOnly();
+    if (family === "dice" && action !== "render-status" && role !== "dm") throw dmOnly();
+    const command = parse(mutationSchema, raw);
+    const fingerprint = createHash("sha256").update(JSON.stringify([family, action, command])).digest("hex");
+    try {
+      return table.once(key, command.requestId, fingerprint, () => {
+        if (!(family === "table" && ["open", "scene"].includes(action)) && !(family === "dice" && ["context", "preferences", "size", "clear-history"].includes(action))) table.check(command.context);
+        if (family === "table") {
+          switch (action) {
+            case "open": { const p = parse(tablePayloads.open, command.payload); if (p.snapshot) table.publish(p.snapshot); return { ok: true, state: table.state(role), playerUrl: publicOrigin + "/?view=player" }; }
+            case "scene": table.publish(parse(tablePayloads.scene, command.payload)); break;
+            case "camera": table.setCamera(parse(tablePayloads.camera, command.payload)); break;
+            case "camera-command": table.setCommand(parse(tablePayloads["camera-command"], command.payload)); break;
+            case "camera-report": table.report(key, command.connectionId, parse(tablePayloads["camera-report"], command.payload)); break;
+            case "pointer": table.setPointer(parse(tablePayloads.pointer, command.payload)); break;
+            case "area-highlight": table.setHighlight(parse(tablePayloads["area-highlight"], command.payload)); break;
+            case "ready": parse(tablePayloads.ready, command.payload); table.ready(key, command.connectionId, command.revision); break;
+            case "map-image-status": table.imageStatus(key, command.connectionId, command.revision, parse(tablePayloads["map-image-status"], command.payload)); break;
+            default: throw missing();
+          }
+          return action === "scene" ? { ok: true, state: table.state(role) } : { ok: true };
+        }
+        switch (action) {
+          case "context": table.dice.setContext(parse(dicePayloads.context, command.payload)); break;
+          case "preferences": return { ok: true, value: table.dice.setDraft(parse(dicePayloads.preferences, command.payload)) };
+          case "begin": return { ok: true, value: table.dice.begin(parse(dicePayloads.begin, command.payload)) };
+          case "complete": { const p = parse(dicePayloads.complete, command.payload); table.dice.complete(p.rollId, p.simulation); break; }
+          case "fail": table.dice.fail(parse(dicePayloads.fail, command.payload).rollId); break;
+          case "dismiss": table.dice.dismiss(parse(dicePayloads.dismiss, command.payload).rollId); break;
+          case "visibility": { const p = parse(dicePayloads.visibility, command.payload); table.dice.setResultVisibility(p.rollId, p.visible); break; }
+          case "clear-history": parse(dicePayloads["clear-history"], command.payload); table.dice.clearHistory(); break;
+          case "size": { const p = parse(dicePayloads.size, command.payload); const value = table.dice.setSize(p); table.emit("sizes", value, "dm"); if (p.view === "player") table.emit("sizes", table.sizes("player"), "player"); return { ok: true, value }; }
+          case "render-status": {
+            const p = parse(dicePayloads["render-status"], command.payload);
+            if (role === "player") table.connection(key, command.connectionId);
+            const current = role === "dm" ? table.dice.getDmState().envelope : table.dice.getPublicState();
+            if (current.presentation?.rollId !== p.rollId) throw new TableConflict("La tirada ya no está visible.");
+            if (!p.ok) table.emit("render-error", "No se pudo dibujar la tirada. Se conserva el resultado autorizado.", "dm");
+            return { ok: true };
+          }
+          default: throw missing();
+        }
+        return { ok: true, value: table.dice.getDmState() };
+      }, role);
+    } catch (error) {
+      if (error instanceof HttpError) throw error;
+      if (error instanceof TableConflict) throw new HttpError(409, "TABLE_CONFLICT", error.message);
+      if (error instanceof ZodError) throw invalid("Los datos de la mesa no son válidos.");
+      throw new HttpError(409, "DICE_CONFLICT", error instanceof Error ? error.message : "No se pudo completar la acción.");
+    }
+  }
diff --git a/src/server/table-http.ts b/src/server/table-http.ts
index a27a01a..61f6b05 100644
--- a/src/server/table-http.ts
+++ b/src/server/table-http.ts
@@ -1,11 +1,11 @@
 import { createHash, randomUUID } from "node:crypto";
 import type { IncomingMessage, ServerResponse } from "node:http";
-import { z, ZodError } from "zod";
-import { TableConflict, TableSession } from "../application/services/table-session";
-import { mutationSchema, tablePayloads, dicePayloads, type TableEvent } from "../shared/contracts/table";
+import { z } from "zod";
+import { TableSession } from "../application/services/table-session";
+import { type TableEvent } from "../shared/contracts/table";
 import type { Auth } from "./auth";
 import { HttpError, invalid, missing } from "./errors";
-import { parse } from "./schemas";
+import { executeTableCommand } from "./table-actions";
 import type { ServiceRole } from "../shared/contracts/http-api";
 
 const dmOnly = () => new HttpError(403, "FORBIDDEN", "Esta operación requiere acceso DM.");
@@ -40,62 +40,9 @@ export function createTableHttp(auth: Auth, now: () => number, publicOrigin: str
     }, 1000);
     heartbeat.unref();
   }
-  function execute(req: IncomingMessage, family: string, action: string, role: ServiceRole, raw: unknown): unknown {
-    const playerActions = ["camera-report", "ready", "map-image-status"];
-    if (family === "table" && (playerActions.includes(action) ? role !== "player" : role !== "dm")) throw dmOnly();
-    if (family === "dice" && action !== "render-status" && role !== "dm") throw dmOnly();
-    const command = parse(mutationSchema, raw);
-    const key = owner(req);
-    const fingerprint = createHash("sha256").update(JSON.stringify([family, action, command])).digest("hex");
-    try {
-      return table.once(key, command.requestId, fingerprint, () => {
-        if (!(family === "table" && ["open", "scene"].includes(action)) && !(family === "dice" && ["context", "preferences", "size", "clear-history"].includes(action))) table.check(command.context);
-        if (family === "table") {
-          switch (action) {
-            case "open": { const p = parse(tablePayloads.open, command.payload); if (p.snapshot) table.publish(p.snapshot); return { ok: true, state: table.state(role), playerUrl: publicOrigin + "/?view=player" }; }
-            case "scene": table.publish(parse(tablePayloads.scene, command.payload)); break;
-            case "camera": table.setCamera(parse(tablePayloads.camera, command.payload)); break;
-            case "camera-command": table.setCommand(parse(tablePayloads["camera-command"], command.payload)); break;
-            case "camera-report": table.report(key, command.connectionId, parse(tablePayloads["camera-report"], command.payload)); break;
-            case "pointer": table.setPointer(parse(tablePayloads.pointer, command.payload)); break;
-            case "area-highlight": table.setHighlight(parse(tablePayloads["area-highlight"], command.payload)); break;
-            case "ready": parse(tablePayloads.ready, command.payload); table.ready(key, command.connectionId, command.revision); break;
-            case "map-image-status": table.imageStatus(key, command.connectionId, command.revision, parse(tablePayloads["map-image-status"], command.payload)); break;
-            default: throw missing();
-          }
-          return action === "scene" ? { ok: true, state: table.state(role) } : { ok: true };
-        }
-        switch (action) {
-          case "context": table.dice.setContext(parse(dicePayloads.context, command.payload)); break;
-          case "preferences": return { ok: true, value: table.dice.setDraft(parse(dicePayloads.preferences, command.payload)) };
-          case "begin": return { ok: true, value: table.dice.begin(parse(dicePayloads.begin, command.payload)) };
-          case "complete": { const p = parse(dicePayloads.complete, command.payload); table.dice.complete(p.rollId, p.simulation); break; }
-          case "fail": table.dice.fail(parse(dicePayloads.fail, command.payload).rollId); break;
-          case "dismiss": table.dice.dismiss(parse(dicePayloads.dismiss, command.payload).rollId); break;
-          case "visibility": { const p = parse(dicePayloads.visibility, command.payload); table.dice.setResultVisibility(p.rollId, p.visible); break; }
-          case "clear-history": parse(dicePayloads["clear-history"], command.payload); table.dice.clearHistory(); break;
-          case "size": { const p = parse(dicePayloads.size, command.payload); const value = table.dice.setSize(p); table.emit("sizes", value, "dm"); if (p.view === "player") table.emit("sizes", table.sizes("player"), "player"); return { ok: true, value }; }
-          case "render-status": {
-            const p = parse(dicePayloads["render-status"], command.payload);
-            if (role === "player") table.connection(key, command.connectionId);
-            const current = role === "dm" ? table.dice.getDmState().envelope : table.dice.getPublicState();
-            if (current.presentation?.rollId !== p.rollId) throw new TableConflict("La tirada ya no está visible.");
-            if (!p.ok) table.emit("render-error", "No se pudo dibujar la tirada. Se conserva el resultado autorizado.", "dm");
-            return { ok: true };
-          }
-          default: throw missing();
-        }
-        return { ok: true, value: table.dice.getDmState() };
-      }, role);
-    } catch (error) {
-      if (error instanceof HttpError) throw error;
-      if (error instanceof TableConflict) throw new HttpError(409, "TABLE_CONFLICT", error.message);
-      if (error instanceof ZodError) throw invalid("Los datos de la mesa no son válidos.");
-      throw new HttpError(409, "DICE_CONFLICT", error instanceof Error ? error.message : "No se pudo completar la acción.");
-    }
-  }
+
   return {
-    table, stream, execute,
+    table, stream, execute: (req: IncomingMessage, family: string, action: string, role: ServiceRole, raw: unknown) => executeTableCommand(table, owner(req), family, action, role, raw, publicOrigin),
     read(family: string, action: string, role: ServiceRole) {
       if (family === "table" && action === "state") return { ok: true, state: table.state(role) };
       if (family === "dice" && action === "public") return { ok: true, value: table.dice.getPublicState() };
diff --git a/src/shared/contracts/moderation.ts b/src/shared/contracts/moderation.ts
new file mode 100644
index 0000000..3047f00
--- /dev/null
+++ b/src/shared/contracts/moderation.ts
@@ -0,0 +1,15 @@
+import { z } from "zod";
+import { canonicalUuid, openingContextSchema, rotateSchema } from "./invitations";
+import { systemRefSchema, moduleManifestSchema } from "../../domain/systems/system-catalog";
+import { tableEventSchema, tableStateSchema } from "./table";
+export const participantState = z.enum(["connected", "reconnecting", "revoked", "left", "expired"]);
+export const rosterQuerySchema = openingContextSchema.extend({ generation: z.coerce.number().int().min(1), limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(1000).default(0), state: participantState.optional() }).strict();
+export type RosterQuery = z.infer<typeof rosterQuerySchema>;
+export interface Participant { participantId: string; alias: string; discriminator: number; admission: "admitted" | "left" | "revoked"; presence: z.infer<typeof participantState>; admittedAt: string }
+export interface Roster { openingId: string; generation: number; status: "open" | "closed" | "expired"; items: Participant[]; total: number; revision: number; presenceSequence: number }
+export const kickSchema = rotateSchema;
+export const transportContextSchema = openingContextSchema.extend({ gameId: canonicalUuid, systemRef: systemRefSchema, systemHash: z.string().regex(/^[a-f0-9]{64}$/), modules: moduleManifestSchema, audience: z.enum(["dm", "player"]) }).strict();
+export const contextualEventSchema = tableEventSchema.extend({ protocolVersion: z.literal(2), ...transportContextSchema.shape, type: z.enum([...tableEventSchema.shape.type.options, "roster", "terminal"]), terminal: z.enum(["access-ended", "replaced", "unavailable"]).optional() }).strict();
+export type ContextualEvent = z.infer<typeof contextualEventSchema>;
+export const contextualStateSchema = tableStateSchema.extend({ protocolVersion: z.literal(2), ...transportContextSchema.shape }).strict();
+export const contextualMutationSchema = openingContextSchema.extend({ command: z.unknown(), sceneResourceId: canonicalUuid.optional() }).strict();

```
