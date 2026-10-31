# Build009 — ciclo1, entrega para revisión

Fecha: 2026-10-30. Versión 3.11.0, único bump minor y entrada feature en CHANGELOG.md. Checkout exclusivo `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama comprobada `feature/factory-006-persistencia-multidb`, HEAD base e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. Sin staging, commit, push, merge, DMG, despliegue ni modificación del checkout original/configuraciones/datos/servicios personales. Se leyó perfil constructor, AGENTS, solicitud/spec009 final/coordinación/modelo común, decisiones006–008, puertos/fuentes y guías pertinentes. No se delegó.

## Resultado implementado

Migración 5 en la autoridad006, hash CSPRNG de invitación/credencial separados, aperturas existentes008 con CAS de contexto/revisión, contacto fresco 30 s y lease 150 s, rotación que conserva participantes, alias normalizado/discriminador, cookie por partida, salida y principal transaccional estrecho. IdempotenciaDM conserva24 h/1000/64MiB y solo metadatos; admisión tiene presupuesto propio24 h/1000/1 MiB. Ningún resultado durable recupera secretos ni cookies. Emisión se entrega después del COMMIT; confirmación incierta no entrega éxito y descarta presencia afectada. Disable007 cierra aperturas en su misma unidad y evita resurrección al habilitar.

La admisión utiliza identityDatabase y su exclusión real SQLite/PostgreSQL, sin falsificar usuario BetterAuth ni entregar OwnedTransaction al invitado. Drena capacidades iniciadas, recuerda rechazos falsy aunque sean capturados y caduca puertos. SystemRef/hash retenidos se validan desde partida persistida; no se vuelve a elegir latest ni se habilitan nuevos usos de versiones deshabilitadas. No se conecta el invitado a proyección global, recursos privados ni SSE. Módulo de fragmento para011 y operación CLI explícita `pnpm invitations:invalidate` para un destino restaurado, con guía propia.

## Evidencia por criterio

| Criterio | Evidencia propia009 y regresiones |
| --- | --- |
| A1 Contextos | `invitations.contract.ts`: DMs A/B, A1/A2/B1, admin/legado/ajeno, cuerpo extra, cookie cruzada; `edges.contract.ts`: versiones1/2 del mismo sistema. El DTO mutado no cambia autoridad y la capacidad solo expone session/leave.007/008 completos conservan separación y puertos privados. |
| A2 Secreto | Generación real32 bytes/base64url canónico; hashes con dominio/contexto y comparación segura. Dump de tablas de invitaciones/credenciales/operaciones/auditoría compara centinelas de secreto/token. HTTPGET de admisión no admite; errores/logs capturados sin secreto. `compiled.contract.ts` prueba entrega real por HTTP en artefacto compilado. |
| A3 Lease | Reloj controlado29.999/30/149.999/150 s, gracia y vencimiento, heartbeat de otra partida no salva esta; resume conserva versión, reopen cambia generación. Heartbeat con reloj atrasado no reduce deadline. |
| A4 DM/restart | Revocación patrocinadora exige contacto de segunda sesión real; disable→enable y archivo→restore no resucitan. Conexiones cerradas y reabiertas preservan invitado activo/revocación, exigen presencia nueva y conservan plazo. |
| A5 Alias | Tests puros de NFC,40 puntos/160 bytes, Unicode, control/bidi/formato/surrogate, HTML tratado como texto; contrato real normaliza Ána, acepta repetidos y asigna IDs/discriminadores distintos. Alias/cookie ajenos no recuperan participante. |
| A6 Credencial | HTTP realcookie HttpOnly/SameSite/path, borrado, ausencia tokenJSON, recarga por cookie y separación identidad/DM. Test exacto Secure enHTTPS. Contexto persistido bloquea cookieA enB. Expiración absoluta8 h sin renovaciónGET. |
| A7 Rotación | Tres invitados admitidos conservan IDs/tokens tras rotar; anterior401/nuevo201; invitación8 h vence sin expirar al invitado admitido después. Reabrir invalida generación anterior. |
| A8 Carreras | Barreras SQL reales después de INSERTparticipante frente a rotate/close/reopen/disable, lock frente a heartbeat/deadline, última plaza concurrente, dos rotaciones/reaperturasCAS. Inyección de fallos después de participante revierte participante/credencial/operación; catch/allSettled/sin await y cinco motivos falsy dentro de capacidad revierten salida parcial. Puerto escapado/DTO mutado denegados. COMMIT real confirmado con respuesta perdida se trata incierto: no token, presencia retirada y replay 409 sin identidad; no se finge rollback. |
| A9 Idempotencia | ReplayDM tras rotación/reapertura devuelve metadatos históricos sin URL; distinta huella 409; precondición original de clave expirada no reabre. Admisión con/sin cookie, enlace rotado, alias distinto y token perdido según contrato. Heartbeat no crea owned_operations. Presupuesto1 MiB,1000 admisiones y64 vigentes comprobados por separado. |
| A10 Ambos motores | Suite común de 18 contratos por motor, 36 en total, contra SQLite físico/PostgreSQL 17.10 TLS, sin skips. Migración vacía en gateDB;4→5 con cuenta/partida/recurso/binding/publicación deshabilitada/apertura conserva filas y checksums1–4. FK contexto inválido falla; apertura008 no recibe enlace implícito. Reinicio/copia/persistencia/revocación y comandos migración compilados reales. |
| A11 Coste/privacidad | HTTP ráfaga IDs inválidos devuelve429; cuota IP/partida y mapa saturado acotado probado; límites8 KiB con chunked explícito, cuerpo lento durante revocación, Host/Origin ausente/null/ajeno, GET sin Origin, cookies ambiguas y cuerpo extra. Categoría/cuerpo401 uniforme sin existencia/propietario. No se usa Forwarded no confiable. |
| A12 Transición | Handler/backend aislado no crea ServiceStore enPG; producción/legado conservan guard. Invitado rechazado por identidad/DM. Gates generales/007/008/DB completos: escena/Electron/legado permanecen compatibles.010 recibe capacidad, no SSE ficticio. |
| A13 Catálogo | Versión deshabilitada permite apertura/reapertura/admisión retenida con SystemRef/hash exactos; nueva versión no sustituye la anterior; nueva partida con versión deshabilitada falla. Hash corrupto falla cerrado. No se entrega definición privada/binding/owner/email al invitado. |
| A14 Cliente/operación | `invitation-fragment.test.ts` instrumenta history antes de fetch, consume/cancela una sola vez, inválidos también limpian. Guía explica pérdida/replay, rotación, vencimiento, resume/reopen, admisión incierta, límites y restore seguro. Copia integral SQLite y clon temporal PG invalidados mediante operación explícita. |

## Comandos y resultados

Entorno: Node v24.15.0, pnpm 11.1.2, SQLite 3.51.3 de Node, pg 8.23.1, Kysely 0.29.7, Better Auth 1.7.14. PostgreSQL temporal 17.10 con TLS/SCRAM, loopback 52370, reservado por orquestador. Se consumió únicamente `python3 /tmp/ttrpg-auth-pg-run.py <script-pnpm>`; configuración privada nunca se imprimió ni se incorporó. Cada suite creó sus bases/directorios aleatorios exclusivos y sus cuentas sintéticas. PG no creó SQLite auxiliar. No hubo skips, emulación PG ni uso de datos personales.

| Comando | Resultado/log |
| --- | --- |
| `pnpm typecheck` | exit 0; `/tmp/ttrpg-009-typecheck-final.log`. También incluido en builds. |
| `pnpm lint` | exit 0; `/tmp/ttrpg-009-lint-final.log`. |
| `pnpm test` |129 archivos/1206 tests PASS,16.78s; `/tmp/ttrpg-009-test-final.log`. Incluye 5 tests nuevos de cliente/alias/cuotas/cookies; no se suman de nuevo. |
| `pnpm build` | exit 0 Electron/main/preload/renderer; `/tmp/ttrpg-009-build.log`. |
| `pnpm build:web` | exit 0; `/tmp/ttrpg-009-build-web.log`. |
| `pnpm build:api` | exit 0 final; `/tmp/ttrpg-009-build-api-final.log`. Incluye módulo de composición backend y CLI invalidación. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:db` |32/32 PASS,22.75s; `/tmp/ttrpg-009-db.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:identity` |25/25 PASS,62.19s; `/tmp/ttrpg-009-identity.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:owned` |46/46 PASS,281.75s; `/tmp/ttrpg-009-owned.log`. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:invitations` |5 archivos/36 tests PASS (18 por motor),161.74s, exit 0; `/tmp/ttrpg-009-invitations-frozen.log`. |
| `pnpm db:migrate` / `pnpm invitations:invalidate` | Ejecutados realmente por `compiled.contract.ts`, ambos motores con entorno sintético: migración5 y éxito de invalidación. No se cuenta como suite adicional. |

El humo compilado009 usa el módulo generado por la misma composición de API: cuentas reales, crear partida, emitir→canjear→rotar→401 enlace viejo / 201 nuevo→consultar primer invitado→cerrar→401. Se ejecuta en subproceso Node contra cada motor y se cierran servidor/identity/guest/pool. No requiere ni simula pantalla 011; no retira guard para arrancar un servicio PG global.

Atribución: todos los comandos/resultados anteriores son ejecuciones de este constructor. Los gates006–008 se reejecutaron, no se reutiliza una aprobación anterior como prueba actual. Builds Electron/web preceden a los últimos ajustes exclusivamente de servidor/tests; sus grafos no cambiaron después. API/typecheck/lint y suite general/009 final corresponden al producto final. No se duplican conteos al sumar pasadas:14/14 inicial (60.66s),28/28 (121.19s),36/36 ampliado (165.53s) y36/36 verified (164.33s) son progresión histórica del mismo gate.

`invitations-frozen` se ejecutó porque después de iniciar verified se cerró la incertidumbre de rotación (descarta presencia), se ajustó el mensaje 403 al DM y se completaron regresiones: chunked explícito, heartbeat de otra partida y reloj atrasado, fixture 008 con NPC válido y revocación conservada tras restart. No fue repetición rutinaria. Producto/tests quedaron congelados para esa ejecución; huella propia de 37 archivos en `/tmp/ttrpg-009-frozen-product.json`, contrastada antes de publicar.

## Fallos corregidos y límites

Durante construcción, typecheck detectó un campo `manifest.name` inexistente en una fixture; se corrigió para modificar una presentación válida. Lint detectó `process` sin import explícito en el script MJS de humo; corregido. Un lanzamiento final tuvo cwd sin barra inicial y fue rechazado antes de crear proceso; se relanzó en checkout canónico. No fueron fallos funcionales omitidos ni se ocultaron mediante skip. Gates finales sin fallos pendientes.

Se conservan avisos no fatales conocidos: canvas/jsdom no implementado, chunks Vite grandes y deprecación de consultas concurrentes pg 8 (una migración a pg 9 requiere revisar esa cola). No se certifica rendimiento prolongado, timing constante HTTP, escalado horizontal, proyector físico, despliegue remoto, backup/restore PG productivo ni COMMIT distribuido. La prueba de copia/restauración es fixture controlada; la guía exige invalidar acceso antes de servir una copia antigua. Alias no es identidad humana y una respuesta perdida antes de instalar cookie puede consumir otra admisión. Cierre de permisos no retira bytes previamente descargados.

No se tocaron vistas, mapa, canvas o atajos. No se realizó CUA ni se presenta el test de history como inspección visual. Formularios, foco/teclado, mensajes anunciados y cableado final 011 quedan documentados; proyección/moderación/SSE 010 fuera de 009. `.ttrpgscene` v2 y lector v1 intactos; transferencia funcional v3/lectores v1–v2 sigue excluyendo acceso invitado.

Auditoría final propia 2026-10-30T22:54UTC: PostgreSQL 17.10, **0 bases y 0 conexiones de fixtures**; `/tmp/ttrpg-009-audit.log`. Comparación SHA256 de los 37 archivos de producto/pruebas/docs congelados: **0 discrepancias**. Los tests cerraron sus servidores, subprocesos, unidades y pools; retiraron sus directorios/bases temporales. Los logs y scripts de evidencia quedan en /tmp. El clúster del orquestador sigue activo; no se detuvo ni reconfiguró.

## Archivos afectados frente a base 009

Modificados (14):

- `CHANGELOG.md`
- `README.md`
- `package.json`
- `src/application/services/owned-store.ts`
- `src/infrastructure/server/database/catalog.contract.ts`
- `src/infrastructure/server/database/migrations.ts`
- `src/infrastructure/server/identity/identity.contract.ts`
- `src/infrastructure/server/identity/index.ts`
- `src/infrastructure/server/owned/fixtures.ts`
- `src/infrastructure/server/owned/repository.ts`
- `src/infrastructure/server/owned/systems.contract.ts`
- `src/server/http.ts`
- `src/server/index.ts`
- `src/server/vite.config.ts`

Nuevos (23):

- `docs/invitations.md`
- `src/application/services/host-invitations.ts`
- `src/application/services/invitations.ts`
- `src/domain/invitations/invitation.ts`
- `src/infrastructure/server/invitations/adversarial.contract.ts`
- `src/infrastructure/server/invitations/compiled.contract.ts`
- `src/infrastructure/server/invitations/edges.contract.ts`
- `src/infrastructure/server/invitations/fixtures.ts`
- `src/infrastructure/server/invitations/guest-authority.ts`
- `src/infrastructure/server/invitations/host-repository.ts`
- `src/infrastructure/server/invitations/index.ts`
- `src/infrastructure/server/invitations/invitations.contract.ts`
- `src/infrastructure/server/invitations/persistence.contract.ts`
- `src/infrastructure/server/invitations/records.ts`
- `src/infrastructure/server/invitations/restore-access.ts`
- `src/infrastructure/server/invitations/test-fixtures/compiled-smoke.mjs`
- `src/infrastructure/server/invitations/vitest.config.ts`
- `src/server/invitation-backend.ts`
- `src/server/invitation-http.ts`
- `src/server/invitation-invalidate.ts`
- `src/shared/contracts/invitations.ts`
- `src/web/invitation-fragment.test.ts`
- `src/web/invitation-fragment.ts`

## Estado de entrega

Pendiente de cuatro revisiones y decisión técnica del orquestador. Sin commit ni permiso inferido de integración. Única escritura del constructor dentro del expediente: este build.md, publicado por temporal/renombrado. Producto congelado; esperar indicación del orquestador antes de corregir.
