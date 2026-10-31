VEREDICTO: CAMBIOS

Revisión independiente de seguridad, 008, ciclo 1, ronda 1, 2026-10-30. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama declarada `feature/factory-006-persistencia-multidb`. Se revisaron AGENTS.md, perfil seguridad, solicitud/spec/build, identidad de ronda, modelo común y fuentes reales. Comparación SHA256 de los 583 archivos de huellas.json: **cero discrepancias**; base de 565 archivos, 38 archivos nuevos/modificados propios de 008. No se consultaron informes de otros revisores.

## Hallazgos que requieren corrección

### P2 — El catálogo prestado por `authorized` permite operar sobre otro propietario

**Ubicación:** `src/infrastructure/server/owned/repository.ts:35–37`, retorno `games` en el mismo archivo; `src/application/services/owned-store.ts:42`; `src/application/services/owned-games.ts:5–6`.

`ownedRepositories` deriva `owner` del principal para recursos, assets y aperturas, pero expone directamente `catalogRepository(execute, clock)` como `tx.games`. Ese catálogo conserva los argumentos `ownerId` del puerto global006 y no los compara con el principal autorizado. `OwnedTransaction` hereda `CatalogTransaction`, manteniendo esta capacidad no acotada. El envoltorio `ownedGames(owner, tx)` tampoco valida el owner recibido; solo lo reenvía.

**Reproducción real:** usando las fixtures de cuentas de 008 y SQLite temporal, B crea una partida `g`. Luego se ejecuta:

```ts
await identity.authorized(aCookie, "dm", (_, tx) => tx.games.find(b.id, g.id));
await identity.authorized(aCookie, "dm", (_, tx) =>
  tx.games.update(b.id, g.id, { name: "Modificado por A" }, 1));
```

Ambas operaciones confirman. Salida de la prueba independiente: `{"aCanReadB":true,"aCanModifyB":true}`. La segunda devuelve el recurso de B renombrado. No se suplantó cookie ni principal; se utilizó la API de aplicación publicada por 008.

**Impacto y límite:** actualmente `owned-http.ts` toma el owner del principal y por ello la matriz HTTP cruza propietarios correctamente; no afirmo una explotación HTTP existente. El defecto está en la frontera de aplicación que 008 presenta como repositorios ligados al principal y que consumirá la siguiente etapa. Basta que un caso de uso pase un contexto de owner equivocado para que una sesión A tenga capacidad de lectura/escritura sobre B. Contradice el requisito explícito de la spec: no depender de que cada caller recuerde filtrar una consulta global.

**Corrección esperada:** conservar el catálogo global006 únicamente en su infraestructura/operaciones administrativas y entregar en `OwnedTransaction` un catálogo cuyo owner esté cerrado sobre `identity.account.id`, sin parámetro arbitrario, o rechazar en todos sus métodos un owner distinto. Adaptar el envoltorio y consumidores y añadir regresión sobre el puerto autorizado (find/list/create/update/delete), no solo sobre rutas HTTP. No hace falta implementar UI ni invitados.

### P2 — `GameRuntimeRegistry.publish` hace visible una publicación que luego se revierte

**Ubicación:** `src/application/services/game-runtime.ts:17–24`; frontera de revalidación `src/infrastructure/server/identity/index.ts:186–196` y COMMIT en `src/infrastructure/server/identity/database.ts`.

El método indica ejecutarse dentro de `identity.authorized`, pero inserta/modifica el `TableSession` y llama a `runtime.publish(snapshot)` inmediatamente. La revalidación final de principal y el COMMIT ocurren después. El ROLLBACK SQL no restaura ni elimina ese runtime. Por tanto una excepción posterior, un fallo de COMMIT o una revalidación fallida dejan publicado un estado de una operación rechazada.

**Reproducción real:** con B, partida/apertura vigentes y `registry.context` resuelto en SQLite temporal:

```ts
try {
  await identity.authorized(bCookie, "dm", async (_, tx) => {
    await registry.publish(tx, context, snapshot);
    throw new Error("rollback");
  });
} catch { /* operación rechazada */ }
const remaining = registry.state(context);
```

`remaining` conserva `revision: 1` y `snapshot` completo en lugar del estado previo nulo. La prueba usó `createDefaultScene()` y el registry real, sin mock de autorización ni de transacción.

**Impacto y límite:** las rutas invitadas/SSE por partida aún no están montadas; no atribuyo una filtración remota ya disponible. Sí está implementada y probada como entregable008 la primitiva de publicación, y su contrato actual permite que un consumidor posterior entregue datos de una operación que el servidor rechazó. No basta documentar la futura comprobación de credencial/lease: esa comprobación puede ser válida mientras el snapshot residual proviene de una operación abortada.

**Corrección esperada:** preparar el cambio efímero sin hacerlo observable y aplicarlo solo después de la confirmación/autorización definitiva, mediante un mecanismo de post-commit ordenado con las transiciones de partida; o diseñar una unidad de publicación con rollback real y sin eventos visibles antes de confirmar. Añadir pruebas de fallo tardío y preservación del snapshot anterior. La corrección corresponde a la primitiva existente, no exige desarrollar 009/010.

## Evidencia y controles que sí funcionan

- Gate independiente: `python3 /tmp/ttrpg-auth-pg-run.py test:owned`, **2 archivos, 20/20 PASS, 81,71 s**, salida0. SQLite y PostgreSQL reales; configuración privada suministrada por el runner sin imprimir secretos. Incluye aislamiento HTTP, bytes/MIME, CAS, idempotencia, revocación durante body, enlaces multiescena, lease, migración, rollback y CLI compilada.
- Las dos reproducciones adicionales se ejecutaron con `python3 /tmp/ttrpg-auth-pg-run.py exec node --input-type=module` y `vite.ssrLoadModule`, reutilizando `owned/fixtures.ts`, `openIdentity` y los módulos reales. Se usaron solo directorios SQLite temporales propios. El primer intento de cargar Vite como dependencia directa falló por resolución; el segundo lo resolvió desde Vitest y completó ambas pruebas con salida0. Se cerraron identity, fixtures y Vite en finally.
- HTTP valida Host/Origin, rutas, cuerpo JSON/imagen y principal antes de leer el cuerpo y de nuevo dentro de transacción. No confía en owner del body. GET/HEAD/export/resolve no habilitan assets ajenos; SQL de recursos incluye owner y parámetros. Admin no recibe rol DM implícito. El control transitorio sigue sin dar a cuentas nuevas acceso a ServiceStore global.
- CAS, operación deduplicada y recursos comparten conexión/transacción. El bloqueo de identidad y revalidación protegen las mutaciones SQL frente a revocación. Hash/longitud de BLOB/bytea se comprueban al leer; los sobres corruptos fallan cerrados.
- Transferencia exige rutas físicas privadas, rechaza symlinks/hardlinks y destinos existentes, limita JSONL/blobs/registros, valida hashes/formatos/relaciones, exige DM activo y asignación explícita, y no copia credenciales. Backup usa exclusión de escritor y preserva las tres bases/sidecars; lectura legada usa copia descartable. Importación funcional se confirma atómicamente y el gate demuestra cancelación/reintento/restauración.
- No se modificó renderer/preload; no se introducen APIs Electron privilegiadas ni ejecución de Markdown/CSS/HTML durante transferencia. No se exigieron interfaces o admisión/moderación de 009–011.

## Límites

No se repitieron los gates generales, de identidad ni de DB completos: su resultado en build sigue siendo evidencia del constructor, no de esta revisión. No se realizó humo visual, carga prolongada ni pg_dump/pg_restore productivo. El gate mostró el aviso ya documentado sobre consultas concurrentes en pg8 y futura incompatibilidad pg9, sin fallo. Los probes de los dos hallazgos se ejecutaron en SQLite; ambos derivan de código común, pero no se atribuye una repetición de esos probes en PostgreSQL.

No se cambiaron código, specs, tablero, Git, configuración privada ni datos originales. PostgreSQL compartido permanece activo. Única escritura del revisor en el checkout: este informe, publicado mediante temporal y renombrado atómico.
