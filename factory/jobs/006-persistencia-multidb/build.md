# Build — 006 Persistencia común SQLite/PostgreSQL

Construcción de ciclo 1, 2026-10-29. Rama comprobada antes de editar: `feature/factory-006-persistencia-multidb`. Checkout exclusivo `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se leyeron perfil constructor, AGENTS.md, solicitud/spec, modelo común y prerrequisitos; no se usó el contexto histórico de 005 como requisito nuevo. Versión **3.8.0**, bump minor único sobre el prerrequisito 3.7.0. Formato `.ttrpgscene` v2 y migración v1 conservados.

## Resultado y límites funcionales

Catálogo real con UUID, ownerId opaco, nombre, estado ready/archived y fechas UTC. Puertos de application asíncronos; validación pura de dominio; SQL, conexión, errores y migraciones encapsulados en infraestructura. CRUD/listado son siempre por propietario; no se expone listado global ni transferencia de dueño. ownerId aún no acredita identidad ni existencia de cuenta: no hay autenticación nueva, endpoints de partidas ni permisos multiusuario en la API global.

SQLite usa `control.sqlite` y `control.lock` en el directorio privado, separado de las tres bases legadas. PostgreSQL usa pg.Pool y base dedicada; no crea SQLite, locks ni directorios funcionales locales. La misma secuencia SQL portable se aplica con el adaptador de cada motor y registro de migraciones independiente por destino, con versión/nombre/checksum. No se duplicó SQL idéntico por dialecto. Las diferencias de placeholders, transacciones y bloqueo están en infraestructura.

La factoría pública espera el esquema migrado. `pnpm db:migrate`, desde su artefacto compilado, aplica DDL y registro atómicamente, con repetición idempotente y rechazo de historial ajeno/cambiado/futuro. PostgreSQL usa advisory lock transaccional; SQLite, exclusión y BEGIN IMMEDIATE. No se añadió reset/down destructivo ni migración automática de datos legados.

Las transacciones esperan callbacks async y usan repositorios ligados a una sola conexión. El acceso raíz se serializa por instancia en ambos motores; SQLite no incluye inadvertidamente una operación concurrente en la transacción de otra tarea. Rechazo/errores revierten las escrituras; tx caducado, reentrada/nesting y uso raíz dentro de tx fallan explícitamente. Close espera operaciones en curso, rechaza nuevas y es idempotente.

Config: `TTRPG_DEPLOYMENT`, `TTRPG_DB_DRIVER`, URL privada, `TTRPG_DB_TLS` y CA opcional. Defaults local/sqlite independientes de NODE_ENV. Production exige postgres y TLS verificado. Disable solo se admite explícitamente en local loopback. Query/fragmentos y puerto cero inválidos se rechazan; PG* no cambia destino, contraseña, search_path ni política TLS. No se muestran URI, contraseñas, SQL ni errores crudos.

**Transición obligatoria:** readConfig y composición directa createApi rechazan postgres/production antes de abrir ServiceStore, crear archivos o escuchar. La infraestructura/migraciones PostgreSQL funcionan; el servicio completo PostgreSQL sigue pendiente de 008/011. No se instaló Better Auth ni se cambiaron login, sesiones, publicación, SSE, dados, escenas o bibliotecas. No hay adopción implícita de propietario ni alteración de la biblioteca personal.

## Archivos propios y diferencia respecto a 3.7.0

- Nuevos `src/domain/games/game-metadata.ts` y `src/application/services/game-catalog.ts`: modelo/validaciones y puertos/errores seguros.
- Nuevo `src/infrastructure/server/database/`: config, driver, migraciones, repositorio, composición/cierre; tests de configuración y contrato; configuración Vitest exclusiva del gate DB.
- Nuevo `src/server/db-migrate.ts`; `src/server/vite.config.ts` produce ambas entradas y chunk común. `src/server/config.ts` añade configuración/guard de transición; no se reescribió http.ts ni ServiceStore.
- `package.json`: 3.8.0, scripts db:migrate/test:db, pg **8.23.1** y tipos @types/pg **8.23.1** fijados; lockfile pnpm actualizado. pg es el driver PostgreSQL requerido; no se añadió ORM ni framework de migraciones.
- `.env.example`, `scripts/setup-env.sh`, `src/server/environment-setup.test.ts`: defaults local/sqlite en archivos nuevos, documentación de variables y preservación del setup existente; `.env` postgres ya creado no genera directorio SQLite ni filtra URI.
- Nuevo `docs/database.md`; README, private-api y service-operations enlazan y explican la transición, migraciones, comandos, pruebas y límites. CHANGELOG contiene una entrada 3.8.0 fechada.

Los cambios de configuración previos 3.7.0 permanecen. Se verificaron contra sus hashes de prerrequisito `.gitignore`, `.env.electron.example`, `src/server/index.ts` y el registro de integración 005: idénticos. No se modificaron código original, board/backlog, solicitud/spec, informes de otros agentes o registros de prerrequisito. Los cambios de fábrica visibles pertenecen al orquestador y no se atribuyen a este constructor. No se leyeron `.env` privados del usuario.

## Criterio → evidencia

| Criterio | Evidencia real |
| --- | --- |
| 1. Fronteras | Tipos/puertos sin imports DB/Node; factories en infraestructura. Build web/preload/renderer no contiene símbolos de migración ni variable DATABASE_URL en la búsqueda final. No se añadió endpoint ni UI. |
| 2. Paridad | La misma suite corre contra SQLite físico y PostgreSQL 17.10: CRUD, Unicode/normalización, repetición de nombres, varios propietarios, paginación/orden/total, inmutabilidad, ausencia ajena, UUID duplicado sin sobrescritura e inyección SQL como texto. |
| 3. Consistencia | Commit tras await, rollback después de escritura y fallo posterior/duplicado, reapertura, barrera entre transacción y operación raíz concurrente, rechazo de nesting/reentrada/tx expirado, cierre esperando trabajo y reapertura sin lock residual. |
| 4. Migraciones | Base vacía, apertura sin migrar, idempotencia con datos conservados, checksum cambiado, versión futura, tabla ajena centinela, fallo DDL intermedio revertido y dos migradores simultáneos. En SQLite uno puede fallar explícitamente por lock; el esquema final queda íntegro. |
| 5. Configuración/TLS | Matriz local/production/driver, TLS requerido, URL inválida/ambigua y CA inválida; PostgreSQL real con CA/hostname correctos, CA ausente, hostname 127.1 no incluido en SAN y contraseña errónea. Variables PG* adversas no alteran destino/política, y contraseña ausente no hereda PGPASSWORD. |
| 6. Guard y comandos | `pnpm db:migrate` compilado, en ambos motores, aplicado y repetido. PostgreSQL sin DATA_DIR/claves/webDir. `pnpm start:api` real con local/postgres, production/postgres y production/sqlite sale no cero sin crear destino ni anunciar escucha. Direct createApi también rechaza. API compilada local: salud, login, guardar escena, cierre/reinicio/login y lectura idéntica. |
| 7. Compatibilidad | 1198 tests generales incluyen escenas v1/v2, mapas/enlaces, persistencia local y clientes existentes. Centinela service.sqlite intacta al migrar catálogo. Symlink/hardlink de control.sqlite rechazados sin tocar el destino; lock propio retirado al fallar. Sin cambio de formato ni adopción. |
| 8. Operación | Gate DB real, comandos compilados, fixtures aisladas, limpieza de pools y bases; PostgreSQL quedó activo para el orquestador. Setup conserva configuraciones y secretos. Guía enlazada documenta versión de infraestructura y servicio legado. |
| 9. Entrega | Checks y builds completos; versión/changelog. Gate sin configuración ejecutado con salida 1: no hay skip verde ni sustitución PostgreSQL/SQLite. Sin operaciones Git de escritura, despliegue o DMG. |

## Entorno, comandos y resultados finales

Node **24.15.0**, pnpm **11.1.2**, macOS; PostgreSQL temporal **17.10**, TCP loopback puerto **55273**, SCRAM y TLS. PostgreSQL fue preparado y es administrado por el orquestador. Credenciales/CA se leyeron únicamente del recurso temporal privado `/tmp/ttrpg-auth-pg-env.json` para poblar TTRPG_TEST_DATABASE_URL/TTRPG_TEST_DB_CA_FILE en un subproceso, sin imprimir valores. No se copiaron al repositorio ni se usó la URL del servicio del usuario.

Se ejecutó `pnpm install --frozen-lockfile`, después `pnpm add --save-exact pg` y `pnpm add -D --save-exact @types/pg`. Los paquetes quedaron fijados en los valores anteriores. Avisos de dependencias deprecadas existentes se conservaron; no se actualizó el resto del stack intencionadamente.

| Comando | Resultado/log |
| --- | --- |
| `pnpm typecheck` | PASS final, `/tmp/006-typecheck-final.log`; también en los builds. |
| `pnpm lint` | PASS final, `/tmp/006-lint-final.log`. |
| `pnpm test` | **127 archivos / 1198 pruebas PASS**, `/tmp/006-tests-final.log`, última ejecución 18:23:22 local; 12,53 s. |
| `pnpm build:api` | PASS final, `/tmp/006-build-api-final.log`; incluye `index.mjs`, `db-migrate.mjs` y chunk de config. Este artefacto se verificó con comandos reales. |
| `pnpm test:db` | **1 archivo / 31 pruebas PASS**, `/tmp/006-db-final.log`, última ejecución 18:22:54; 7,68 s. Contratos en ambos motores más TLS/comandos/humo legado. |
| `pnpm build` | PASS, `/tmp/006-build-electron.log`. No hay cambios posteriores en su grafo de producto; ajuste final solo en driver PostgreSQL y tests. |
| `pnpm build:web` | PASS, `/tmp/006-build-web.log`. Grafo web inalterado después. |
| `pnpm test:db` sin variables de prueba | Fallo esperado exit 1, `/tmp/006-db-missing-env.log`; no skip. |
| `git diff --check` | PASS final. |

Las 31 pruebas DB no forman parte de las 1198 generales; no se suman ejecuciones repetidas. Para reproducir: construir API, proporcionar las dos variables privadas de tests y ejecutar `pnpm test:db` en checkout sin `.env`. No se incluye un comando que imprima o inserte credenciales en shell/history. El test exige ese entorno, crea bases con UUID propios y usa únicamente directorios SQLite temporales.

## Hallazgos de construcción corregidos

1. Primer lint detectó regex de controles. Se reemplazaron por predicado explícito de caracteres; se rechazan controles antes de trim del nombre para no aceptar silenciosamente saltos de línea externos.
2. Vite con `ssr` apuntando a un entry ignoraba el mapa de inputs y no emitía el comando. Se usó `ssr: true` con ambas entradas; los comandos compilados comprueban su existencia y ejecución.
3. El humo HTTP inicial usó fetch, que no conservó el Host de ensayo con puerto efímero. El arnés usa HTTP nativo con Host/Origin explícitos, igual que las suites del servicio; sin alterar la política del producto.
4. Inspección de pg mostró que valores vacíos podían heredar PGPASSWORD/PGOPTIONS. Se fijaron parámetros efectivos, callback explícito de contraseña, search_path público, encoding y negociación TLS. Una regresión con PG* adversas verifica estas fronteras.
5. La regresión de contraseña vacía descubrió un socket de conexión fallida que pg-pool retiraba de su lista sin cerrar: el backend seguía esperando SCRAM y bloqueaba DROP de la fixture. Inicialmente se ensayó ampliar el plazo de limpieza, sin resolver la causa; ese cambio se retiró. `ManagedClient` encapsula connect y destruye/cierra el transporte fallido antes de devolver error al pool. La suite final pasa con los límites originales. No se deshabilitó TLS ni se terminaron backends ajenos.

Estas correcciones pertenecen a construcción inicial, no a una ronda de revisión; no se duplicó versión/changelog.

## Limpieza, límites y entrega

La comprobación final por SQL encontró **0 bases `ttrpg_test_%` y 0 conexiones de fixtures**; el servidor PostgreSQL seguía activo. Se eliminaron explícitamente las dos bases propias que habían quedado de los intentos de limpieza fallidos, una vez sin conexiones, sin terminar sesiones ajenas. Los demás recursos se retiraron por afterEach; procesos API del humo terminaron por SIGTERM y código 0. El constructor no detuvo PostgreSQL ni modificó su configuración.

No hubo CUA ni nueva inspección visual: no cambia UI/renderer/CSS. Se conserva evidencia automatizada y builds del cliente local, no se afirma un nuevo humo Electron manual. No hubo despliegue remoto, carga prolongada, pruebas de todos los sistemas operativos, backup/restore PostgreSQL ni exportación cruzada de motores. La persistencia/reapertura y rollback se probaron realmente; guía de respaldo distingue procedimiento operativo de pruebas realizadas.

Avisos conocidos de canvas/jsdom, chunks grandes y directivas de dependencias no impidieron tests/builds. Las operaciones raíz se serializan por instancia: esta entrega no promete alto throughput ni transacciones distribuidas. Los puertos son async aunque SQLite usa DatabaseSync en infraestructura. Falta incorporar identidad autenticada, FK/validación de cuenta, todos los repositorios funcionales y corte de la API en entregas siguientes. El guard mantiene esa limitación visible.

Sin staging, commit, push, merge, DMG ni despliegue. Implementación disponible para cuatro revisiones independientes. Único archivo escrito por el constructor dentro del expediente: este build.md, publicado mediante temporal y renombrado atómico. No es una aprobación técnica.


## Corrección de ronda 1 — C1/P1 y UX-006-01

Ciclo 1, corrección posterior a la primera ronda completa, 2026-10-29. Se leyeron íntegros los cuatro informes: seguridad y UI APROBADO; código y UX CAMBIOS. Versión permanece **3.8.0**, sin bump ni entrada de changelog adicionales. El informe inicial anterior se conserva como historial; esta sección acredita el estado nuevo.

### C1/P1 — Error asíncrono del cliente PostgreSQL adquirido

`src/infrastructure/server/database/driver.ts` instala listeners de error/end durante toda la vida de la conexión prestada. El listener marca el cliente como fallido; las consultas posteriores y COMMIT rechazan con `CatalogError UNAVAILABLE` sin emitir el error crudo. La liberación descarta el cliente fallido con la semántica de pg.Pool, es idempotente y conserva protección frente a errores tardíos hasta end. Un cliente sano se devuelve al pool y retira los listeners del préstamo, evitando acumularlos al reutilizarlo.

No se cambió el timeout de 10 s, TLS, credenciales, límites ni la lógica de propiedad. La unidad de trabajo existente recibe el fallo al intentar terminar, no confirma y ejecuta su camino de rollback/liberación; cuando PostgreSQL ya cerró la sesión, el servidor revierte la transacción y no es posible enviar un ROLLBACK nuevo sobre esa conexión. La siguiente operación puede adquirir un cliente nuevo. No se simula una reversión SQL exitosa sobre un socket muerto.

**Regresión real aislada:** nuevo `test-fixtures/idle-timeout-probe.ts`, ejecutado como subproceso Node desde la suite de contratos. El padre compila temporalmente las fuentes actuales con el Vite ya disponible mediante pnpm, usa dependencias del checkout y configuración sintética del PostgreSQL temporal autorizado. Solo crea/retira su base UUID y directorio propios; no termina backends ajenos ni modifica el servidor.

El hijo migra/abre catálogo, crea una partida dentro de una transacción y espera **11 000 ms**, superando el idle timeout real configurado de 10 000 ms. El callback termina normalmente, pero el COMMIT debe rechazarse. El catch exige exactamente CatalogError con código UNAVAILABLE y mensaje sanitizado; después comprueba cero partidas del intento fallido, crea otra en una nueva transacción usando la misma instancia de catálogo, cierra dos veces, reabre y confirma exclusivamente el registro recuperado. Sale con código 0 y marcador fijo `TIMEOUT_RECOVERED_ROLLBACK_CLOSED`. El padre verifica la salida, ausencia de error crudo/unhandled y cero conexiones de esa base. Esto acredita supervivencia del proceso, reversión, descarte efectivo, recuperación y cierre; no es un mock de error.

El callback consumidor sigue siendo responsable de terminar su trabajo externo: un error de conexión no cancela una Promise ajena que nunca resuelva. La siguiente consulta o COMMIT detecta la invalidación; este límite queda explícito en docs/database.md.

### UX-006-01 — Siguiente paso correcto para PostgreSQL

`scripts/setup-env.sh` condiciona ahora también sus instrucciones finales. Con PostgreSQL indica conservar configuración, ejecutar `pnpm build:api` y `pnpm db:migrate`, consultar docs/database.md y reconocer el bloqueo transitorio del servicio completo. No recomienda start:api/start:service ni buscar claves globales. Local/SQLite conserva las instrucciones previas de claves y arranque.

`src/server/environment-setup.test.ts` verifica ambos mensajes, incluyendo la ausencia de instrucciones incompatibles para PostgreSQL. Conserva las aserciones de archivo intacto, secreto ausente de salida, falta de directorio SQLite y archivo del cliente sin DATABASE. No se retiró el guard ni se regeneraron credenciales para solucionar el hallazgo. La guía documenta esta orientación.

### Archivos y verificaciones de la corrección

Frente a las huellas congeladas de ronda 1 cambiaron únicamente cinco archivos existentes: driver.ts, catalog.contract.ts, environment-setup.test.ts, setup-env.sh y docs/database.md. Se añadió el fixture de subproceso `src/infrastructure/server/database/test-fixtures/idle-timeout-probe.ts`. Dentro del expediente solo se actualizó este build. No cambian aplicación visual, contratos de dominio, versión, dependencias, esquemas, SQL, guard de producción o informes anteriores.

| Comando | Resultado nuevo |
| --- | --- |
| `pnpm exec vitest run src/server/environment-setup.test.ts src/infrastructure/server/database/config.test.ts` | 2 archivos / **22 pruebas PASS**, `/tmp/006-r1-directed.log`. |
| `pnpm build:api` | PASS, `/tmp/006-r1-build-api.log`; incluye typecheck y el driver corregido en db-migrate.mjs. |
| `pnpm test:db` | 1 archivo / **32 pruebas PASS**, `/tmp/006-r1-db.log`; 24,07 s, incluye la espera real y los contratos previos SQLite/PostgreSQL. |
| `pnpm test` | 127 archivos / **1198 pruebas PASS**, `/tmp/006-r1-tests.log`; 13,90 s. |
| `pnpm typecheck` | PASS final, `/tmp/006-r1-typecheck.log`. |
| `pnpm lint` | PASS final, `/tmp/006-r1-lint.log`. |
| `git diff --check` | PASS. |

La primera variante del arnés intentó importar Vite como dependencia directa y typecheck lo rechazó, porque el proyecto lo expone mediante su CLI existente. Se corrigió usando `pnpm exec vite` con configuración temporal, sin añadir dependencias. No hubo fallo de producto adicional en la regresión del timeout después de la corrección.

Se reutilizan los builds Electron/web de construcción inicial: sus grafos no incluyen los módulos corregidos y no cambió package.json ni UI. No se repitieron CUA, matriz visual, TLS remoto ni backup/restore. Los 32 contratos incluyen de nuevo TLS local positivo/negativo y comandos compilados; no se suman los 22 dirigidos a las 1198 pruebas. Persisten únicamente avisos conocidos de canvas/jsdom.

### Limpieza y entrega de corrección

Comprobación final: **0 bases ttrpg_test_% y 0 conexiones de fixtures**. El servidor PostgreSQL del orquestador sigue activo y sin cambios de configuración. El hijo del timeout terminó con código 0; su bundle/directorio temporal y la base propia se eliminaron por el arnés. No se leyó un .env personal, se modificó el checkout original, se usó CUA ni se realizaron operaciones Git de escritura, DMG o despliegue.

Correcciones disponibles para nueva ronda completa de las cuatro revisiones. Esta sección no sustituye sus veredictos. Build publicado íntegro mediante temporal y renombrado atómico; el constructor termina hasta recibir un nuevo encargo del orquestador.
