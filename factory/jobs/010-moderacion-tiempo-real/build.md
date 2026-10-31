# Construcción010 — ciclo 2 (historial de ciclo 1 conservado)

Estado: **CONSTRUCCIÓN DE CICLO 2 TERMINADA; LISTA PARA CONGELAR Y REVISAR EN RONDA 3**. Fecha: 2026-10-31. No equivale a aprobación técnica, integración ni despliegue.

## Resultado

Implementado el contrato final de moderación por participante y transporte por partida/apertura. La expulsión confirma en la unidad transaccional007–009 la revocación del participante y todas sus credenciales, una única rotación de invitación, auditoría y resultado idempotente. La cancelación de lectores HTTP y la invalidación de streams y descargas ocurren después del commit y antes de responder éxito; los sobrevivientes conservan credenciales, cámara y dados. El secreto solo se entrega en la primera respuesta efectiva, nunca en replay/auditoría/eventos.

El registro existente ahora administra runtimes, cámaras, dados, proyección, assets, presencia, deduplicación y streams por owner/game/opening/generation. Las rutas DM e invitadas usan autoridades separadas; el cursor no autoriza. El roster privado incluye estados derivados, paginación, revisión durable y secuencia de presencia local a la apertura. La actividad de otra partida no altera esa secuencia ni invalida su roster.

La composición optativa `openModerationBackend`, exportada también por el artefacto `invitation-backend.mjs`, integra007–010 sin ServiceStore. PostgreSQL mantiene una conexión dedicada y advisory lock783496103, separado del lock transaccional783496102. Perder propiedad detiene entregas y cierra recursos; no hay reapropiación automática del emisor viejo. SQLite conserva la exclusión física006 y exige recuperación explícita del operador tras comprobar muerte del proceso.

El adaptador contextual utiliza una instancia inmutable de BrowserTableClient/HttpTransport. Terminal, HTTP401 o pérdida definitiva de la apertura limpia el estado, aborta pendientes y detiene reintentos del contexto; respuestas tardías no repueblan. Una caída transitoria mantiene la vista desactualizada y reconecta. El callback informa a011 para desmontar la proyección.

## Base, versión y autorización

Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama efectiva `feature/factory-006-persistencia-multidb`; HEAD conservado `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Base de revisión actual: main integrado `feef7120e0a3145ddd345eed714deef3542007d4`, según base-archivos.json actualizado por coordinación.

La construcción se pausó por la integración autorizada006–009+012. Se recuperaron externamente los19 originales pre010 y verificaron19/19 SHA256; el integrador validó616/616. La recuperación no revirtió el checkout. Tras reanudación, se incorporó012: vite7.3.3 directo en desarrollo, lock exacto integrado y entrada3.11.1, preservando010. `pnpm install --frozen-lockfile` pasó. La versión final010 es **3.12.0**, un único bump minor, con entrada feature2026-10-31. El lock no añade dependencias010 y coincide con la base integrada.

Sin staging, commits, cambio de rama, merge, push, despliegue o DMG de010. El constructor no tocó .env, servicios, datos o perfiles del checkout original. El arranque posterior del servicio antiguo por el orquestador está registrado en coordinación y queda ajeno a esta entrega; no se detiene durante limpieza. Los artefactos de integración y DMG3.11.1 pertenecen al integrador, no a esta evidencia010.

## Implementación y archivos

- Aplicación: `moderation.ts` orquesta roster/kick y replay; `game-runtime.ts` amplía el registro existente; `host-invitations.ts` notifica transiciones y contacto; `invitations.ts` define capacidades estrechas de transporte/envío/asset; `table-session.ts` cuenta participantes únicos y promueve principal sin cambiar cámara/tirada; `public-table-projection.ts` genera URLs contextuales manteniendo el default legado.
- Persistencia: migración6 agrega `moderation_audit`; no se reescriben migraciones1–5. `host-repository.ts` lista/revoca/audita y deriva revisión; `guest-authority.ts` revalida en lectura y entrega; hooks de identidad/propiedad invalidan runtimes tras commit. Se preserva el drenaje/rollback de puertos prestados y el catálogo exacto008.
- Transporte: `moderation-http.ts`, `moderation-backend.ts`, `runtime-lease.ts`, despacho específico de invitaciones y extracción reutilizable `table-actions.ts`. Se conserva el servidor/guard legado. JSON se lee fuera del lock; frames y chunks se autorizan al entregar. Assets se fragmentan en64KiB; esperar drain no retiene transacción. Cuotas:32 runtimes,64 streams globales/32 por partida,56 jugadores globales/28 por partida, reserva DM8/4;64 HTTP entre autenticación/trabajo,48 autorizados con máximo32 invitados y reserva16DM,4 por participante/12 invitados por apertura y8 por cuentaDM/apertura;2MiB de cola/buffer por socket, drain5s.
- Contratos/cliente: `shared/contracts/moderation.ts`; `contextual-table-client.ts`; modificaciones acotadas en `http.ts` y `table-client.ts`. Sin cambios de vistas React, IPC/preload, formato escena ni dependencias.
- Documentación: nueva `docs/moderation.md` y enlaces en README, API privada, operación y mesa sincronizada. Versionado en package.json/CHANGELOG.md.
- Pruebas: gate `test:moderation` (contratos, carreras, transporte, exclusión y humo compilado), fixtures/subprocesos propios, test del registro y cinco tests del cliente; las regresiones de ronda1 se detallan más abajo. Ajustes de expectativas de migración en contratos database/identity/owned/invitations.

Lista exacta respecto de base-archivos.json: 29 archivos modificados y 20 nuevos (sin contar este informe).

```text
MODIFICADOS
CHANGELOG.md
README.md
docs/private-api.md
docs/service-operations.md
docs/synchronized-table.md
package.json
src/application/services/game-runtime.ts
src/application/services/host-invitations.ts
src/application/services/invitations.ts
src/application/services/public-table-projection.ts
src/application/services/table-session.ts
src/infrastructure/browser/http.ts
src/infrastructure/browser/table-client.ts
src/infrastructure/server/database/catalog.contract.ts
src/infrastructure/server/database/migrations.ts
src/infrastructure/server/identity/identity.contract.ts
src/infrastructure/server/identity/index.ts
src/infrastructure/server/invitations/compiled.contract.ts
src/infrastructure/server/invitations/guest-authority.ts
src/infrastructure/server/invitations/host-repository.ts
src/infrastructure/server/invitations/index.ts
src/infrastructure/server/invitations/invitations.contract.ts
src/infrastructure/server/invitations/persistence.contract.ts
src/infrastructure/server/owned/repository.ts
src/infrastructure/server/owned/systems.contract.ts
src/server/invitation-backend.ts
src/server/invitation-http.ts
src/server/table-http.ts
src/server/request-body.ts
NUEVOS
docs/moderation.md
src/application/services/game-runtime.test.ts
src/application/services/moderation.ts
src/infrastructure/browser/contextual-table-client.test.ts
src/infrastructure/browser/contextual-table-client.ts
src/infrastructure/server/moderation/compiled.contract.ts
src/infrastructure/server/moderation/corrections.contract.ts
src/infrastructure/server/moderation/exclusion.contract.ts
src/infrastructure/server/moderation/fixtures.ts
src/infrastructure/server/moderation/moderation.contract.ts
src/infrastructure/server/moderation/races.contract.ts
src/infrastructure/server/moderation/runtime-lease.ts
src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs
src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs
src/infrastructure/server/moderation/transport.contract.ts
src/infrastructure/server/moderation/vitest.config.ts
src/server/moderation-backend.ts
src/server/moderation-http.ts
src/server/table-actions.ts
src/shared/contracts/moderation.ts
```

## Verificación inicial y entorno

Node24.15.0, pnpm11.1.2, PostgreSQL17.10 temporal TLS/SCRAM con CA verificada, driver pg8.23.1; SQLite3.51.3 físico mediante node:sqlite. Better Auth1.7.14/Kysely0.29.7 conservados. Wrapper de coordinación: `python3 /tmp/ttrpg-auth-pg-run.py <script-pnpm>`; no imprime credenciales y nunca carga el .env original. PostgreSQL se usó en exclusiva y los gates de DB se ejecutaron en serie.

La tabla siguiente conserva la ejecución inicial anterior a ronda1. Los resultados del delta corregido figuran en la sección de corrección; no se presentan las cifras históricas como nuevas ejecuciones.

| Comando | Resultado inicial | Log |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS; lock exacto de base integrada, vite7.3.3 | `/tmp/ttrpg-010-install.log` |
| `pnpm typecheck` | PASS; exit0 | `/tmp/ttrpg-010-typecheck.log` |
| `pnpm lint` | PASS; exit0 | `/tmp/ttrpg-010-lint.log` |
| `pnpm test` | **PASS 131 archivos / 1210/1210**, 15.76 s; sin skips | `/tmp/ttrpg-010-test.log` |
| `pnpm test:db` | **PASS 1 archivos / 32/32**, 22.46 s; sin skips | `/tmp/ttrpg-010-gate-db.log` |
| `pnpm test:identity` | **PASS 1 archivos / 25/25**, 58.80 s; sin skips | `/tmp/ttrpg-010-gate-identity.log` |
| `pnpm test:owned` | **PASS 5 archivos / 46/46**, 263.13 s; sin skips | `/tmp/ttrpg-010-gate-owned.log` |
| `pnpm test:invitations` | **PASS 5 archivos / 36/36**, 154.83 s; sin skips | `/tmp/ttrpg-010-gate-invitations.log` |
| `pnpm test:moderation` | **PASS 5 archivos / 33/33**, 135.56 s; sin skips | `/tmp/ttrpg-010-gate-moderation.log` |
| `pnpm build` | PASS; exit0 | `/tmp/ttrpg-010-build.log` |
| `pnpm build:api` | PASS; exit0 | `/tmp/ttrpg-010-build-api.log` |
| `pnpm build:web` | PASS; exit0 | `/tmp/ttrpg-010-build-web.log` |
| `pnpm db:migrate` | PASS en subprocesos compilados de ambos motores: nuevo esquema, repetición sin pendientes y5→6 | gates DB/invitations/moderation |
| `git diff --check` | PASS; solo lectura Git | ejecución final |

`pnpm db:migrate` se ejecutó realmente como subproceso del gate DB en destinos nuevos SQLite/PostgreSQL (1→6 y segunda ejecución sin pendientes), y en el humo010 desde esquema5→6; no es una simulación del comando. Los builds compilaron con vite7.3.3. Warnings no bloqueantes: canvas no implementado en jsdom, `use client` ignorado de dependencias y tamaños de chunks del frontend; test:owned y test:invitations también emiten aviso de pg8 sobre consultas concurrentes en un cliente (deprecación futura de pg9). Los gates terminan correctamente; no se cambió driver ni se ocultaron warnings.

Los logs completos están fuera del repositorio en `/tmp/ttrpg-010-*.log`. Sus rutas son evidencia local de esta ejecución, no recursos operativos ni credenciales. Auditoría final `/tmp/ttrpg-010-cleanup.log`: PostgreSQL17.10/TLS verdadero, SQLite3.51.3, **0 bases fixtures, 0 conexiones fixtures, 0 locks de identidad/runtime**. Los tests cierran sus sockets, timers, pools y subprocesos; el clúster temporal y el servicio original8787 permanecen activos para coordinación/usuario.

## Correspondencia de aceptación

| Criterio | Evidencia propia010 y procedencia de regresión |
| --- | --- |
| A1 | `moderation.contract.ts`: identidades/admisiones reales, owner/admin/DM ajeno/anónimo/legado/invitado, query estricta, alias repetidos con IDs distintos, roster/totales/filtro revoked y credenciales múltiples contadas una vez. `transport.contract.ts`: presencia B1 no cambia roster ni bytes SSE A1. |
| A2 | Fallo deliberado entre revocar y generar secreto revierte y conserva credencial; segunda conexión verifica auditoría vacía. Dos kicks con mismo UUID solo emiten un secreto; UUID nuevo sobre revoked no rota; contenido distinto409; replay después de cierre. Humo compilado: replay del mismo kick después de restart conserva versión2 y no devuelve secreto. Persistencia/idempotencia de la unidad compartida se vuelve a comprobar en gates007–009. |
| A3 | Tres invitados reales, dos credenciales del objetivo y cuatro streams; ambas conexiones objetivo terminan y sobrevivientes conservan identidad/acceso. Enlaces viejo/nuevo comprobados. Prueba A1/A2/B1 mantiene cámara y dado del sobreviviente tras expulsar al principal y conserva otros streams; promoción reutiliza004 sin nueva tirada. |
| A4 | Pruebas nuevas010 con barreras reales: body parcial que no retiene lock; lectura HTTP en cola liberada después de kick; orden de entrega anterior/posterior al commit; bootstrap retenido antes del primer frame; descarga12MiB con escritura real del primer chunk y drain retenido. Tras kick no se escribe otro chunk (máximo64KiB previos), se cierra transferencia y GET/HEAD/Range/If-None-Match/resolve con cookie copiada dan401. No se usa evidencia009 de admisión como sustituto de estos escenarios de transporte. |
| A5 | Nuevas010: join en espera del lock antes de kick sobrevive como otro ID y enlace viejo después falla; kicks iguales/distintos serializan versión; comando de apertura vieja tras reabrir409; disable/archive cierran streams y reenable no resucita acceso. Se heredan y reejecutan `adversarial.contract.ts`/`invitations.contract.ts`009 para las carreras de rotate/close/reopen/disable y heartbeat/deadline dentro de la misma frontera transaccional; no se presentan como tests010 nuevos de cada combinación kick/lifecycle. |
| A6 | A1/A2 del mismo DM y B1 de otro: mapa/asset/cámara/dado público u oculto independientes; UUID repetido por contexto no comparte dedup. A1 retira asset compartido sin afectar A2; tokenA1 enA2 da401 y ownerB no publica assetA. Cursor bien formado deA1 enA2 obtiene bootstrapA2 autorizado. Centinelas privados de notas/URLs/nombres de dados/sistema no aparecen en bytes públicos. Presencia y roster son locales al contexto. |
| A7 | Nuevas010: cierre de streams por leave/disable/archive, reapertura, límite149.999/150s de kick, restart con nuevoepoch/runtime vacío y sin nueva presencia/admisión automática. Humo compilado vuelve a publicar explícitamente tras contactoDM. Se reejecuta evidencia009 para29.999/30/149.999/150s, token absoluto8h, reanudación, revocación del patrocinador y restore con invalidación; no se atribuye como nueva prueba visual. |
| A8 | Nuevos subprocesos compilados reales en ambos motores: segundo emisor rechazado antes de escuchar, cierre limpio, SIGKILL y recuperación; SQLite no borra lock stale automáticamente. PG termina canal propietario mediante pg_terminate_backend y el proceso anterior responde503 incluso tras iniciar dueño nuevo. Registro prueba32 runtimes y64 streams/reservas; HTTP real prueba28 streams jugador,29.º429, DM aceptado y capacidad liberada por kick. Body lento ajeno permite moderar. Buffer/chunk/backpressure comprobados en transporte; no es carga prolongada. |
| A9 | Cinco pruebas del adaptador tras ronda1 (tres iniciales): terminal solo limpia contextoA y conservaB; respuesta pendiente tras abort no repuebla; no retry tras terminal/replaced; red transitoria conserva vista y reconecta; HTTP401 sobre vista publicada limpia inmediatamente. No se afirma existencia o verificación del panel011. |
| A10 | Mismos contratos010 en SQLite/PostgreSQL reales, sin skips. Versiones1/2 exactas del mismo sistema, hash y usos deshabilitados retenidos. Regresión008 comprueba bindings/recursos/catálogo; gates y humo del artefacto compilado propio010 ejecutados. Build Electron/web/API y1213 tests generales tras ronda1 preservan herramientas y escena v2. |

## Hallazgos resueltos durante ciclo1

- Fixture inicial de snapshot omitía `showDmFogOverlay`; se corrigió la fixture y se adelantó validación de escena para devolver400 antes de transacción. Se eliminó instrumentación temporal.
- En la primera ampliación,25/27 casos pasaron y dos detectaron invalidaciones espurias del roster: la secuencia global filtraba actividad entre partidas y el alta de streamDM invalidaba su propio baseline. Ahora la secuencia pertenece a la apertura y cambia solo por streams jugador; regresión específica en ambos motores pasa.
- Se cerró el camino HTTP401 del cliente, que invalidaba el transporte sin limpiar necesariamente la última vista. La primera prueba usaba la lectura cacheada; se corrigió para efectuar una petición real y pasó.
- Los dos fallos iniciales del gate DB y los dos de identidad fueron expectativas históricas del listado de migraciones sin la nueva6. Se actualizaron, junto a las expectativas equivalentes de propiedad/invitaciones, y se ejecutaron los gates completos. No fue un fallo de ejecución de la migración.
- La regresión009 tenía la lista cerrada de capacidades antigua (`leave/session`). Se actualizó a las cinco capacidades estrechas explícitas010 y se comprobó también que `transport/asset/deliver` escapadas rechazan sin ejecutar efectos; no se expone SQL ni OwnedTransaction.
- Lint detectó aliases/reasignación innecesaria en pruebas/cliente; corregidos. No quedan depuradores, procesos de prueba ni cambios de integración pendientes.

## Corrección tras ronda1 completa — 2026-10-31

Se leyeron las cuatro revisiones finales: Seguridad/Código/UX CAMBIOS y UI APROBADO. Se mantuvieron sus informes y huellas inmutables, versión3.12.0 y rama/HEAD. La corrección modifica10 archivos de la congelación y añade `src/infrastructure/server/moderation/corrections.contract.ts`; el total frente a base integrada es29 modificados+20 nuevos. No se ha abierto otra ronda desde el constructor.

- **Seguridad P1, A4/A6/A8:** se reemplazó el contador compartido por cupos acotados de autenticación y trabajo autorizado. Solo después de verificar identidad/propiedad se concede el cupoDM. El registro limita globalmente48 autorizadas (máximo32 invitadas),4 por participante,12 invitados por apertura y8 por cuentaDM/apertura; la cota total64 incluye autenticación/establecimientoSSE, limitada también a4 por huella de cookie. El establecimientoSSE conserva el cupo transitorio hasta registrarse como stream y usa sus cuotas propias; no consume cupo de lectores de body. Las peticiones autorizadas se registran dentro del efecto de commit y sus cuerpos se leen fuera de la transacción con AbortSignal. Revocación/leave/cierre/archivo/disable/logout/expiración/pérdida de lease/cierre de proceso cancelan los lectores apropiados, destruyen sockets y liberan cuotas idempotentemente. Los sobrevivientes quedan activos. La renovación de lease actualiza también los tickets en vuelo.
- **Código P2, A4/A9:** el bootstrap se reconstruye con estado/revisión/secuencia vigentes y connectionId propio dentro de la autorización final; precede a los eventos ordinarios y los eventos anteriores al snapshot se descartan por secuencia. Se conserva la barrera existente de kick antes del primer frame, sin entregar snapshot revocado.
- **UX-010-01 P2, A7/A9:** todas las lecturas y streams de una instancia contextual fijan openingId/generation. El servidor distingue `OPENING_CHANGED`; el cliente limpia/aborta/termina una apertura perdida y un sobre válido de otra apertura. Un409 recuperable de mapa conserva la instancia; los fallos transitorios dentro de la misma apertura siguen reconectando.

Regresión nueva `corrections.contract.ts`, tres casos por motor:64 POST incompletos deB1,4 registrados/60 rechazados, kick HTTP enA1 todavía200 y kickB1 cancela los cuatro lectores antes del ACK sin cancelar al sobreviviente; bootstrap retenido mediante barrera mientras publicaDM, inicialización del adaptador real y confirmación de imagen/ready/reporte válidos; desconexión DM, reapertura, rechazo409 de lecturas antiguas, terminal único y cliente nuevo operativo. `contextual-table-client.test.ts` añade ausencia de retry/limpieza de respuesta tardía ante sobre extranjero, query fija y separación del409 de mapa. `game-runtime.test.ts` añade cuotas/reserva/cancelaciones de ciclo de vida. Las carreras existentes de body/HTTP retenido ahora comprueban cierre inmediato del socket al revocar, en vez de esperar401 tras completar el cuerpo.

Las reproducciones externas de los revisores se leyeron y se incorporaron como regresiones mantenidas del producto. No se atribuye una reejecución de los probes externos inmutables, cuyas expectativas originales reproducían el defecto.

### Verificación de la corrección

| Comando | Resultado de esta corrección | Log |
| --- | --- | --- |
| `pnpm typecheck` | PASS; también ejecutado dentro del último build:api | `/tmp/ttrpg-010-r2-typecheck.log` |
| `pnpm lint` | PASS; exit0 tras el ajuste finalSSE | `/tmp/ttrpg-010-r2-lint.log` |
| `pnpm test` | PASS,131 archivos,1213/1213,17.09s; sin skips | `/tmp/ttrpg-010-r2-test.log` |
| `pnpm build` | PASS, Electron | `/tmp/ttrpg-010-r2-build.log` |
| `pnpm build:api` | PASS; recompilado después del ajuste finalSSE | `/tmp/ttrpg-010-r2-build-api.log` |
| `pnpm build:web` | PASS | `/tmp/ttrpg-010-r2-build-web.log` |
| `pnpm test:moderation` mediante wrapperPG | **PASS,6 archivos,39/39,158.68s; sin skips** | `/tmp/ttrpg-010-r2-moderation.log` |
| Auditoría posterior | PG17.10/TLS,SQLite3.51.3;0 bases,0 conexiones y0 locks de fixtures | `/tmp/ttrpg-010-r2-cleanup.log` |
| `git diff --check` | PASS; lectura solamente | comprobación final |

El gate completo incluye las seis regresiones nuevas, primer frame/kick, publicación/bootstrap, cuerpo/consulta en vuelo, backpressure, cuotasHTTP/SSE, aislamiento, exclusión de procesos, pérdida del canal propietario y humo del artefacto recién compilado en ambos motores. El humo vuelve a comprobar migración5→6 y reinicio/replay. No se repitieron `test:db`, `test:identity`, `test:owned` ni `test:invitations` en esta corrección: se conserva su evidencia inicial explícita de arriba; no cambian persistencia, migraciones ni las autoridades007–009. La lectura de body común conserva sus parámetros anteriores y suma únicamente la cancelación opcional usada por010; el gate nuevo verifica ese camino real. La prueba general conserva la regresión del transporte legado. No se han repetido inspecciones visuales inexistentes ni pruebas de carga prolongada.

Auditoría de alcance final:29 modificados+20 nuevos frente a base integrada,0 archivos base eliminados;10 huellas de ronda1 cambiadas y1 archivo añadido, todos dentro de implementación/pruebas/docs010. Package/lock/changelog no cambian en esta corrección. Clúster temporal y servicio original8787 permanecen activos; no quedan fixtures propias. Rama/HEAD confirmados sin modificacionesGit.


Incidencias durante desarrollo de las pruebas: el primer adaptador de red usaba fetch nativo, que no conservó el Host de la fixture y recibió403; se sustituyó únicamente ese adaptador de prueba por node:http. El primer caso de bootstrap intentó ready antes de confirmar la imagen publicada y obtuvo correctamente «La proyección actual aún está cargando»; se completó la precondición mediante la API real de reporte de imagen. El primer gate completo dio38/39:28 altasSSE simultáneas enPG chocaron con la cuota12 de lectores durante la segunda autorización. Se corrigió el traspaso de cupos:el establecimientoSSE conserva su cupo transitorio hasta el registro y después aplica el presupuesto de streams. La regresión dirigida volvió a pasar2/2 (6 casos no seleccionados explícitamente) y se volvió a ejecutar el gate completo sin filtros. Log del intento fallido:`/tmp/ttrpg-010-r2-moderation-attempt1.log`; dirigido:`/tmp/ttrpg-010-r2-stream-quota.log`. Estos intentos fallidos no se contabilizan como PASS; sus logs se conservan en `/tmp/ttrpg-010-r2-corrections.log` y `/tmp/ttrpg-010-r2-bootstrap.log`.

## Ciclo 2 autorizado — corrección de ronda2, 2026-10-31

Se leyeron las cuatro revisiones finales de ronda2 y retrabajo-ciclo-2.md. Seguridad/UX/UI aprobaron; Código reprodujo un P2 nuevo de establecimientoSSE después de cerrar el socket. Las correcciones anteriores conservan su evidencia y no se acepta el defecto pendiente. El usuario autorizó explícitamente nuevo ciclo. Este constructor no abre una ronda ni interpreta esa autorización como permiso de escrituraGit.

**P2 de Código resuelto en la construcción.** `moderation-http.ts` observa close antes de esperar la segunda autorización, libera el cupo transitorio al desconectar y vuelve a comprobar destroyed/writableEnded dentro del efecto de entrega inmediatamente antes del registro. No crea runtime/presencia/conexión/heartbeat para una respuesta ya cerrada. El cierre posterior retira listener, registro, conexión y temporizadores idempotentemente; también limpia errores durante el establecimiento y un cierre síncrono de la cola inicial. El escritor y la cola verifican que el transporte sigue utilizable. Un error previo a enviar cabeceras conserva su respuestaHTTP original (p.ej.429), en lugar de finalizar accidentalmente con200.

Delta respecto a la congelación de ronda2: **3 archivos modificados**, sin nuevos ni bajas: `src/server/moderation-http.ts`, `src/infrastructure/server/moderation/corrections.contract.ts` y `docs/moderation.md`. Se conserva el total de29 modificados+20 nuevos frente a base integrada; package.json3.12.0, lock y changelog permanecen intactos. No hay cambios de persistencia, autoridades007–009, cliente, vistas, IPC o formato de escena.

**Regresión propia y aceptación A1/A3/A8:** en ambos motores, una barrera retiene la segunda autorización real del invitado, cierra el cliente HTTP y observa el evento close del ServerResponse antes de liberarla. Tras completar la autorización, verifica cero registrosSSE, cero nuevos intervalos, runtime ausente, participante desconectado y secuencia de presencia0. Abre después dos conexiones reales, comprueba que la primera válida es principal, cierra esa conexión y observa el bootstrap de promoción en la sobreviviente. Reemplaza la credencial superviviente y comprueba una única conexión; vuelve a promover y observa cancelación del timer. No usa sleeps como evidencia. El probe externo de Código se leyó y permanece inmutable: su espera del registro fantasma deja de ser una condición válida después del arreglo, por lo que se mantiene la regresión positiva del producto en vez de contabilizar un timeout de aquel probe.

| Comando | Resultado propio del ciclo2 | Log |
| --- | --- | --- |
| `pnpm typecheck` | PASS,exit0 | `/tmp/ttrpg-010-c2-typecheck.log` |
| `pnpm lint` | PASS,exit0 | `/tmp/ttrpg-010-c2-lint.log` |
| `pnpm test` sin compilaciones simultáneas | **PASS,131 archivos,1213/1213,18.11s; sin skips** | `/tmp/ttrpg-010-c2-test.log` |
| `pnpm build` | PASS,Electron | `/tmp/ttrpg-010-c2-build.log` |
| `pnpm build:api` | PASS,artefactoAPI actual | `/tmp/ttrpg-010-c2-build-api.log` |
| Regresión dirigida de cierre en ambos motores | PASS,2/2 seleccionados,13.96s;6 casos fuera por filtro explícito | `/tmp/ttrpg-010-c2-disconnect.log` |
| `pnpm test:moderation` mediante wrapperPG,sin filtros | **PASS,6 archivos,41/41,175.82s; sin skips** | `/tmp/ttrpg-010-c2-moderation.log` |
| Auditoría posterior | PG17.10/TLS,SQLite3.51.3;0 bases,0 conexiones y0 locks de fixtures | `/tmp/ttrpg-010-c2-cleanup.log` |
| `git diff --check` | PASS; lectura solamente | comprobación final |

El gate completo vuelve a comprobar los escenarios corregidos de rondas anteriores, incluida publicación mientras espera bootstrap, ready/reporte mediante cliente real, cuotas de cuerpos/SSE y reservaDM, primer frame después de kick, backpressure, promoción y reemplazo, apertura vieja, exclusión entre procesos y humo del backendAPI recién compilado en SQLite/PostgreSQL. La migración5→6 y el reinicio/replay se ejecutan otra vez dentro del humo. A2/A4–A7/A9/A10 conservan la correspondencia histórica de arriba y su regresión010 completa; la prueba nueva añade evidencia directa A1/A3/A8.

El único cambio de esta corrección en el expediente es este build, publicado mediante temporal y renombrado. Informes/rondas anteriores permanecen intactos. No se ejecutaron operaciones de escrituraGit; rama/HEAD conservados y versión3.12.0. Fixtures/sockets/pools propios cerrados; clústerPG temporal y servicio original8787 permanecen activos, disponibles para coordinación/usuario.


Incidencia de validación: la primera suite general, ejecutada simultáneamente con dos compilaciones, dio1210PASS/3FAIL: timeout de contraseña Unicode, cupoKDF aún ocupado después del timeout y timeout de saturación de UUID en TableSession. Se preserva `/tmp/ttrpg-010-c2-test-contended.log`. No se modificaron esos módulos ni sus tiempos de test; se repitió la suite sin compilaciones simultáneas para comprobar la hipótesis de contención de CPU. Resultado de esa repetición en la tabla. Ninguno de los fallos se presenta como PASS ni como defecto corregido por este delta.

No se repiten gates006–009 intactos ni build:web sin cambio de cliente/vistas: conservan sus resultados históricos atribuidos en este informe. El gate010 vuelve a ejecutar ambos motores, exclusión y humoAPI recién compilada. No hay prueba visual nueva, despliegue, DMG o carga prolongada. El cierre técnico de esta construcción queda a disposición de las cuatro revisiones independientes del ciclo2.

## Límites y entrega a011

Esta construcción entrega backend, contratos y adaptador. No agrega panel/login/lobby ni conecta automáticamente el frontend legado; esas vistas y su humo CUA pertenecen a011. No se hizo inspección visual nueva porque no se modificaron vistas. No hay prueba de carga prolongada ni afirmación de soporte distribuido: un procesoAPI por base es el límite deliberado.

La garantía de revocación impide nuevas entregas protegidas tras la frontera de autorización/commit; no recupera bytes previamente aceptados por red/dispositivo. Un enlace posterior permite una identidad técnica nueva. La pérdida de primera respuesta no permite recuperar el secreto; una rotación explícita posterior es necesaria si elDM necesita otro enlace. Restore de backup exige invalidar accesos antes de servir.

La evidencia general de herramientas004/Electron/escena se conserva y reejecuta, pero no sustituye aceptación visual011. La entrega queda sin commit y lista para las cuatro revisiones independientes; el constructor no modifica producto después de comunicar congelación salvo orden de retrabajo.
