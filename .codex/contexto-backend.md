# Contexto técnico del backend

Inspección: 2026-11-13, producto 3.27.2. Este mapa orienta al agente; las versiones actuales se consultan en `package.json` y el contrato vigente en SDD. Revalidar rutas y comportamiento antes de cada tarea.

## Stack comprobado

| Capa | Implementación | Fuente |
| --- | --- | --- |
| Runtime | Node.js 24, TypeScript estricto, ESM | `src/server/index.ts`, `tsconfig.json` |
| API | `node:http`, handlers propios, rutas `/api/v1` | `src/server/http.ts` |
| Tiempo real | HTTP + SSE, streams de fetch en cliente, cancelación con AbortController | `src/server/moderation-http.ts`, `src/infrastructure/browser/http.ts` |
| Contexto asíncrono | AsyncLocalStorage, unidades de trabajo, callbacks de confirmación, registros por partida | `src/server/moderation-backend.ts`, `src/infrastructure/server/identity/database.ts` |
| Identidad | Better Auth 1.7.14; codec scrypt propio sobre node:crypto; cookies de sesión | `src/infrastructure/server/identity/index.ts`, `src/infrastructure/server/identity/password.ts` |
| Validación | Zod 4 y validaciones de dominio | `src/server/schemas.ts`, `src/shared/contracts/` |
| Datos | SQLite `node:sqlite` / PostgreSQL `pg` 8.23.1, SQL parametrizado, migraciones con checksum | `src/infrastructure/server/database/` |
| Adaptador de identidad | Kysely 0.29.7 sobre el driver/unidad de trabajo común; no es un ORM global de todo el producto | `src/infrastructure/server/identity/database.ts` |
| Imágenes | Sharp 0.35.5 para validación/decodificación | `src/infrastructure/server/image-validation.ts` |
| Build y pruebas | pnpm, Vite 7.3.3, Vitest 4, ESLint y TypeScript | `package.json`, `src/server/vite.config.ts` |

No hay framework web Express/Nest ni Socket.IO en la composición actual. React y PixiJS pertenecen al cliente; Electron tiene además su modo local y su frontera IPC.

## Recorrido y límites

`src/server/index.ts` → `openServiceApi` en `http.ts` → `openModerationBackend` → handlers de identidad, recursos propios, invitaciones y moderación. Esta es la entrada de producto. Hay handlers/almacenes históricos usados por fixtures: no habilitarlos como rutas nuevas por su mera existencia.

- `src/application/services/`: puertos y orquestación; `game-runtime.ts`, `table-session.ts`, `moderation.ts`, `owned-store.ts` y `draft-store.ts` son referencias según la tarea.
- `src/domain/`: reglas puras. `src/shared/contracts/`: DTO/esquemas compartidos, versionado y contexto.
- `src/infrastructure/server/`: repositorios, identidad, invitaciones, migraciones y exclusión del runtime.
- `src/infrastructure/browser/`: consumidor a inspeccionar para compatibilidad; cambios requieren asignación.
- `src/server/moderation-http.ts`: SSE con reautorización en entrega, secuencias, límites de buffer, cierre y heartbeats. `src/infrastructure/server/moderation/runtime-lease.ts`: exclusión de runtime y pérdida de autoridad.
- `src/infrastructure/server/identity/database.ts`: transacciones serializadas, contexto asíncrono, efectos tras confirmación y resultado incierto. Respetar su semántica antes de paralelizar operaciones.

La apertura activa, presencia y publicaciones del runtime no son una cola durable. No existe bus distribuido ni replay histórico de SSE. Las escenas guardadas y la única copia recuperable por cuenta/partida/escena tienen finalidades distintas (SDD 58).

## Lectura SDD según el encargo

- Base: `SDD/estado-actual.md`, `SDD/arquitectura.md` y `SDD/flujo.md`.
- API/clientes: specs 41–45; leer las sustituciones posteriores de autenticación.
- Persistencia/identidad/propiedad: specs 46–48 y 53.
- Invitaciones/expulsión/operación: specs 49–52 y guías `database.md`, `identity.md`, `owned-data.md`, `moderation.md`, `service-operations.md`.
- Sincronización reciente: specs 55 (anotaciones), 56 (cámaras/foco), 57 (áreas) y 58 (guardado/recuperación); resolver las carpetas desde el índice SDD.

## Validación y operación

La suite general usa `pnpm test`. Para un recorrido amplio en este checkout, excluir las copias auxiliares: `pnpm test --exclude '**/.local/**' --maxWorkers 4`. Para una tarea concreta, seleccionar los archivos afectados. `.local/` contiene datos y copias privadas, no es código a modificar o publicar.

Los cinco scripts `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` seleccionan contratos adicionales. Revisar sus configs y fixtures. Requieren PostgreSQL real temporal/TLS y variables de prueba como `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE`; algunos también requieren `pnpm build:api`. Usar checkout aislado sin `.env`, nunca borrar el `.env` del usuario para satisfacer el arnés. Reportar gates pendientes si ese entorno no está disponible.

`pnpm start:api` inicia el watcher de desarrollo: compila inicialmente y reconstruye/reinicia al cambiar fuentes. `pnpm build:service` genera API/web estable y `pnpm start:api:built` lo ejecuta. Estos comandos pueden cargar la configuración real: no son un sustituto de las fixtures temporales para probar cambios.
