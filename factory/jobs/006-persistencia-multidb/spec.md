# 006 — Persistencia común SQLite y PostgreSQL

## Estado, objetivo y autorización

Especificación propuesta, ciclo 1, 2026-10-29. Define trabajo por construir; no acredita implementación ni verificaciones. Rigen [solicitud](solicitud.md), [decisiones comunes](../../autenticacion-partidas.md), [prerrequisitos](../../prerrequisitos-autenticacion.json) y AGENTS.md. Base integrada e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3 más prerrequisito 3.7.0 copiado. Checkout exclusivo: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama prevista `feature/factory-006-persistencia-multidb`, preparada por el orquestador. Sin staging, commit, push, merge, despliegue ni DMG. No tocar checkout original, servicios, perfiles, claves o datos personales.

Preparar una frontera de persistencia asíncrona con SQLite para uso local y PostgreSQL para producción. Entregar un catálogo útil de metadatos de partidas, con operaciones acotadas por propietario y transacciones reales, migraciones explícitas y contrato equivalente en ambos motores. Esta entrega habilita la construcción posterior de cuentas y propiedad; no convierte la API global actual en un servicio multiusuario.

Cierre previsto: **3.8.0**, bump minor único y entrada fechada de tipo feature en CHANGELOG.md. `.ttrpgscene` sigue en formato v2 con migración v1; versión de almacenamiento, versión de aplicación y formato de escena son independientes.

## Base inspeccionada y reutilización

- `src/server/config.ts`, `index.ts` y `http.ts`: configuración global, arranque Node 24 y creación síncrona de `ServiceStore`. `createApi` abre almacenamiento antes de escuchar; añadir el rechazo de composiciones no soportadas antes de cualquier efecto persistente o socket.
- `src/infrastructure/server/service-store.ts`: SQLite síncrono, `service.lock`, `service.sqlite`, `monsters.sqlite` y `entities.sqlite`; migración por user_version y transacciones síncronas. Conservar estos archivos y comportamiento legado. No reutilizar su callback síncrono como si esperara Promises.
- `src/infrastructure/database/`, `src/application/services/`, `src/application/use-cases/`: fronteras y repositorios existentes. El directorio `src/infrastructure/server/database/` todavía no existe; crearlo para la nueva infraestructura, sin fingir que ya hay adaptadores multi-DB.
- `src/domain/sessions/` y contratos HTTP: conservar validación, migración y serialización de escenas. [002](../002-api-privada/spec.md) define persistencia/API y [003](../003-cliente-navegador/spec.md) los flujos web; [001](../001-contrato-clientes/spec.md) mantiene inyección de clientes. [004](../004-mesa-sincronizada/spec.md) conserva la mesa global efímera y [005](../005-electron-servicio/spec.md) la separación Electron local/servicio. Sus decisiones técnicas constan en los expedientes; las nuevas órdenes de esta serie no heredan autorización Git.
- `.env.example`, `.env.electron.example`, `scripts/setup-env.sh`, `src/server/environment-setup.test.ts`: prerrequisito 3.7.0 que conserva archivos privados, permisos y precedencia del entorno. No trasladar credenciales DB al archivo del cliente.
- `src/server/vite.config.ts`, scripts de package.json y [guía operativa](../../../docs/service-operations.md): extender compilación para el comando de migración sin borrar entradas ni salidas existentes. [API privada](../../../docs/private-api.md) y [mesa sincronizada](../../../docs/synchronized-table.md) describen el servicio legado que continúa activo solo en configuración local soportada.

## Alcance y exclusiones

Incluye tipos/validaciones de metadatos, puertos asíncronos, conexión/ciclo de vida, unidad de trabajo, repositorios SQLite/PostgreSQL del catálogo, migraciones versionadas por motor, configuración y política TLS, comando `pnpm db:migrate`, tests reales y guía. Se permite `pg` como driver y sus tipos necesarios, instalados con pnpm y justificados; no introducir un ORM ni framework de migraciones pesado para esta etapa.

No instalar Better Auth ni crear usuarios, contraseñas, cookies, sesiones, bootstrap administrador, invitaciones, participantes, expulsiones, aperturas o leases. Eso corresponde a 007 y siguientes. No crear endpoints HTTP de partidas ni UI de catálogo. No trasladar escenas/assets/bibliotecas/plantillas al nuevo almacenamiento ni adoptar datos legados: corresponde a 008/011 con propietario explícito. No convertir SSE/dados en multi-partida, prometer autorización basada en un ownerId proporcionado por un cliente, ni preparar tablas vacías de todos los trabajos futuros.

No hay cambio visual solicitado; conservar teclado, proyección, tamaños y composición Electron actuales. Solo se exige humo visual dirigido si un ajuste de arranque afecta realmente al cliente; no reconstruir la matriz visual completa para código de infraestructura.

## Contrato de aplicación y catálogo

Los nombres de símbolos pueden ajustarse al repositorio; estas semánticas son obligatorias:

- Puertos en application y tipos/validadores puros en domain, sin imports de `pg`, `node:sqlite`, Electron, SQL o filesystem. Toda operación pública de repositorio, apertura/cierre y transacción devuelve Promise. El renderer no conoce esta nueva infraestructura.
- `GameMetadata`: id UUID estable generado por la aplicación, ownerId opaco estable, nombre, estado `ready|archived`, createdAt y updatedAt ISO UTC con precisión de milisegundos. `ready` significa disponible en catálogo, no anfitrión conectado ni apertura activa. En 006 la creación usa ready; se permite renombrar y archivar/restaurar metadatos.
- ownerId es texto no vacío de 1–128 caracteres, sin controles ni espacios externos. No exigir UUID ni email: 007 suministrará el ID estable de cuenta. No crear una cuenta ficticia ni una FK a una tabla de autenticación inexistente. Identidad y existencia del propietario se validarán en aplicación al integrar cuentas; este repositorio solo garantiza el ámbito persistido. Documentar esa frontera.
- Nombre: trim, 1–200 caracteres, sin NUL/controles; Unicode ordinario permitido. Id, ownerId y createdAt son inmutables. updatedAt no precede a createdAt. Validar datos al escribir y al reconstruir filas; corrupción no equivale a catálogo vacío. Reloj/UUID inyectables para pruebas deterministas.
- Operaciones mínimas: crear, obtener por ownerId+id, listar por ownerId con paginación, actualizar nombre/estado por ownerId+id y eliminar por ownerId+id. Un propietario puede tener varias partidas y nombres repetidos. Listado ordenado por updatedAt descendente e id ascendente, limit 1–100 y offset entero no negativo; devolver total del propietario. Predeterminado 50/0. Sin método público de listado global ni cambio de propietario.
- Obtener/actualizar/eliminar un id ajeno produce el mismo resultado de ausencia que un id inexistente (null/false o error de aplicación común documentado). Aplicar ownerId en la consulta/mutación, no filtrar después de cargar o autorizar leyendo y escribiendo por separado. Colisión de UUID en create devuelve conflicto sin sobrescribir propietario ni datos.
- Parametrizar valores. Diferencias de placeholders, almacenamiento de fechas/estado, conteos y errores se resuelven en adaptadores. Resultados son valores de dominio, no filas/conexiones del driver. Normalizar errores de validación, conflicto, ausencia, almacenamiento corrupto/no disponible sin SQL, URL, contraseña o rutas privadas.

## Conexiones, transacciones y ciclo de vida

Una factoría de infraestructura recibe configuración validada y compone exclusivamente el motor seleccionado. PostgreSQL usa `pg.Pool`, límites finitos de conexiones y timeout de conexión/operación documentados; SQLite usa un archivo físico privado. Ni dominio ni casos de uso ramifican por dialecto.

La unidad de trabajo ofrece `transaction(async tx => ...)`, donde tx contiene repositorios ligados a la misma transacción. En PostgreSQL BEGIN/consultas/COMMIT/ROLLBACK se ejecutan sobre **el mismo cliente adquirido**, nunca repartidos por pool.query. Liberar cliente incluso al fallar. Esperar la resolución del callback antes de confirmar; un rechazo después de un await debe revertir todas las operaciones.

SQLite puede usar DatabaseSync dentro del adaptador, pero debe serializar el acceso mientras la transacción asíncrona esté abierta: otra operación raíz no puede entrar y quedar incluida accidentalmente. Probar dos tareas intercaladas con barreras. El callback utiliza solo tx; documentar y rechazar transacciones anidadas no soportadas, sin deadlocks silenciosos. No se exige distribuir transacciones entre varias bases, motores o servicios ni reintentar automáticamente callbacks que puedan tener efectos externos.

Repositorios de tx no son utilizables después de terminar. Cierre espera trabajo en curso y libera conexiones/locks; nuevas operaciones tras comenzar cierre fallan de forma controlada. Cerrar dos veces es seguro. Fallos de apertura o migración dejan recursos cerrados. Registrar únicamente diagnósticos sanitizados; no imprimir configuración completa ni errores crudos del driver.

## Almacenamiento y migraciones

Usar **`control.sqlite`** dentro de TTRPG_DATA_DIR para el nuevo catálogo local, con namespace de migraciones propio; no modificar user_version ni tablas de las tres bases legadas. Este archivo será extensible por 007/008. Conservar directorio físico exclusivo, permisos privados y rechazo de enlaces simbólicos/hardlinks peligrosos en archivo y sidecars. Usar exclusión propia del catálogo (por ejemplo control.lock), sin retirar locks ajenos o stale automáticamente. No abrir el perfil Electron ni inventar migración de datos del usuario.

PostgreSQL utiliza una base dedicada indicada por la URL y objetos de aplicación identificables, con tabla propia de versiones. No necesita TTRPG_DATA_DIR ni crea SQLite/lock/directorios de datos funcionales. No crear/borrar bases, roles ni esquemas ajenos desde la aplicación. El aprovisionamiento de la base/credenciales corresponde al operador o arnés temporal.

Migraciones iniciales por motor crean catálogo, restricciones y el índice necesario para listar por ownerId/orden. Mantener una secuencia lógica equivalente y registro de versión, nombre y checksum. Reejecutar una migración aplicada no altera datos; historial desconocido/más nuevo o checksum diferente falla antes de aplicar cambios. DDL y registro de cada migración son atómicos. No exigir rollback destructivo de versiones: ante fallo revierte la migración incompleta y permite reintentar una vez corregida.

Serializar ejecutores concurrentes en el destino: transacción/exclusión SQLite y bloqueo PostgreSQL ligado a conexión con espera acotada. Dos `db:migrate` simultáneos terminan sin duplicados ni esquema parcial, o uno falla explícitamente por contención; ninguno confirma una versión sin su DDL. No tocar una base ajena detectada como incompatible ni ejecutar DROP/RESET generales. La limpieza de fixtures se limita a sus recursos temporales identificados.

`pnpm db:migrate` carga `.env` con la misma precedencia segura del arranque, valida únicamente configuración de persistencia y aplica pendientes al motor elegido; no exige claves globales, frontend, Electron o configuración de autenticación. Debe existir una entrada compilada reproducible y documentarse cómo construirla con `pnpm build:api`; no depender de un ejecutor TypeScript global. Exit 0 para éxito/sin pendientes y distinto de 0 para error. Salida muestra motor/versiones/resultados, nunca URL ni secretos. No inicia el servidor. La apertura normal del catálogo verifica el esquema y pide ejecutar migración si falta; no altera DDL silenciosamente. Las migraciones legadas existentes mantienen su flujo local.

## Configuración y transición de arranque

| Variable | Contrato propuesto |
| --- | --- |
| TTRPG_DEPLOYMENT | `local|production`, local si falta; vacío/desconocido inválido. No deducir de NODE_ENV. |
| TTRPG_DB_DRIVER | `sqlite|postgres`, sqlite si falta para conservar configuración local. Production exige postgres explícito; cualquier combinación inválida falla. |
| TTRPG_DATA_DIR | Obligatorio para SQLite, con validaciones físicas existentes. No obligatorio para infraestructura PostgreSQL ni migraciones PostgreSQL. |
| TTRPG_DATABASE_URL | Obligatoria y privada para postgres, con esquema postgres/postgresql, host, base y usuario explícitos. Validar estructura sin conectar ni imprimirla. Rechazar fragmento y opciones query no admitidas; en esta etapa no admitir opciones TLS/host que sustituyan la política. En sqlite, una URL suministrada es configuración contradictoria y falla. |
| TTRPG_DB_TLS | `verify-full|disable`; predeterminado verify-full para postgres. Disable solo permitido explícitamente en deployment local con host loopback exacto/literal; nunca en production ni host remoto. |
| TTRPG_DB_CA_FILE | Opcional para verify-full: ruta absoluta de CA legible, cargada solo en infraestructura. Si falta, usar autoridades confiables del runtime. Fallar si se configuró pero no puede leerse. No aceptar con disable. |

verify-full exige cifrado, cadena confiable y coincidencia de hostname; nunca `rejectUnauthorized:false`, bypass de certificados ni downgrade al fallar TLS. El backend HTTP/origen y TLS PostgreSQL son configuraciones independientes. Las variables heredadas PG* o query de conexión no pueden anular esta política. Credenciales y CA no se incorporan al frontend ni empaquetado Electron. Los errores por certificado, contraseña, host, puerto o base erróneos deben ser útiles sin revelar valores privados.

**Límite explícito de 006:** `start:api`/`createApi` siguen sirviendo la composición legada solo con local+sqlite. Rechazar production (incluido production+postgres) y local+postgres con mensaje que explica que falta la migración del almacenamiento funcional, **antes de crear ServiceStore, archivos, migraciones o listener HTTP**. No hacer fallback ni servir salud positiva de una API incompleta. Validar en la factoría pública además del entrypoint para impedir eludir el guard mediante llamada programática. La infraestructura y `db:migrate` sí admiten production+postgres con TLS verificado; esto no autoriza arrancar el servicio completo. 008/011 retirarán el guard cuando tengan evidencia de todos los repositorios y del corte integrado.

Sin variables nuevas, .env local existente mantiene arranque y autenticación global actual. `setup:env` sigue generando una configuración local funcional y preservando archivos/valores existentes; puede añadir defaults local/sqlite al archivo recién creado. No convertir ni sobrescribir .env existentes, no generar URL PostgreSQL con contraseña de ejemplo operativa, ni crear directorios locales cuando una configuración postgres válida ya existe. Documentar preparación manual de PostgreSQL y la limitación transitoria. `.env.electron` conserva exclusivamente configuración cliente.

## Criterios de aceptación observables

1. **Fronteras:** puertos async sin imports de motores en domain/application/renderer. Factores de composición y cierre reales; pg no aparece en bundles web ni preload. No endpoint ni cambio de autenticación nuevo.
2. **Paridad del catálogo:** la misma suite de contrato corre contra archivo SQLite y servidor PostgreSQL real. CRUD, múltiples partidas por propietario, paginación/orden, inmutabilidad, nombres Unicode, entradas inválidas y ausencia ajena se comportan igual. Inyección SQL permanece como texto y no modifica esquema.
3. **Consistencia:** commit tras await, rollback por rechazo tras una primera escritura y error de segunda operación; reabrir conexión confirma estado. Duplicado no sobrescribe. Prueba concurrente entre transacción y operación raíz demuestra que la segunda no se confirma/revierte con la primera. No se reutiliza tx terminado ni se fuga cliente/lock tras error.
4. **Migraciones:** base nueva, segunda ejecución sin cambios, datos conservados, versión futura/checksum inválido rechazados, fallo intermedio sin versión parcial y competencia entre ejecutores. Fixtures separados por motor. Abrir sin migrar informa la acción necesaria.
5. **Configuración/TLS:** matriz local/production y sqlite/postgres; NODE_ENV no cambia selección; ausencia de URL, driver inválido, parámetros ambiguos y disable remoto/producción rechazados. Con PostgreSQL temporal TLS: conexión válida con CA/hostname correctos, certificado no confiable y hostname incorrecto rechazados sin fallback. Conexión/credencial inválida no filtra URL/contraseña en stdout/stderr.
6. **Guard transitorio:** procesos reales `start:api` con postgres/production salen no cero sin escuchar ni crear SQLite/directorios. También llamada directa a composición. `db:migrate` PostgreSQL funciona sin DATA_DIR/claves/webDir y no crea archivos funcionales locales. local+sqlite conserva humo HTTP de salud/login/guardar/reabrir recurso temporal.
7. **Compatibilidad:** suite existente conserva escenas v1/v2, imágenes/mapas/enlaces, repositorios legados y Electron local. No adopción de propietario ni cambio de formato. Centinelas del almacenamiento legado permanecen intactos al migrar el catálogo nuevo.
8. **Operación reproducible:** scripts reales, logs/versión de cada motor y Node, reinicio/reapertura y limpieza de procesos propios acreditados. Setup conserva archivos privados y tests actuales. Guía de drivers/migraciones enlazada desde README y guía operativa explica separación control/legado y límites productivos.
9. **Entrega:** checks comunes/builds completos, 3.8.0/changelog, sin credenciales ni datos de prueba en repositorio. Ningún skip o mock se presenta como aprobación del motor PostgreSQL.

## Verificación y evidencia

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api`, `pnpm build:web`. Añadir **`pnpm test:db`** como gate explícito que corre la suite compartida completa contra ambos motores reales y falla si no hay PostgreSQL/configuración válida. Puede separarse de la suite general para no exigir infraestructura a tests de UI, pero es obligatorio para cerrar 006 y futuras modificaciones del contrato; no usar skip condicional, motor emulado o resultado global verde que oculte su ausencia. Documentar variable de conexión de pruebas distinta de la URL de despliegue y evitar leer un .env privado real por accidente.

El orquestador prepara PostgreSQL temporal. Constructor/revisores usan únicamente ese destino descartable; registrar versión real, puerto/base/fixture sin credenciales, comandos reproducibles y quién controla su limpieza. Si falla disponibilidad, coordinar reparación o aprovisionamiento temporal sin cambiar servicios del usuario. No declarar aceptación hasta ejecutar ambos motores; documentar impedimento concreto si no se logra. No se exige desplegar infraestructura remota: TLS puede probarse con CA y certificado de prueba locales.

Pruebas de integración pueden usar Node/SQL y procesos locales, no requieren CUA. Si aparece una regresión visual pertinente, usar CUA sobre perfiles temporales. Smoke API y comando migración deben ejecutarse también desde artefactos compilados, no solo imports de tests.

`build.md` debe distinguir pruebas propias, regresiones reutilizadas, versiones, comandos, número de tests por suite (sin sumas duplicadas), datos temporales, fallos corregidos, cierre de pools/procesos y límites pendientes. La guía debe describir backup coherente de control.sqlite junto al legado detenido, uso de herramientas PostgreSQL por operador y ausencia de exportación/migración automática entre motores en 006; no prometer restauraciones no ensayadas.

## Riesgos y dependencias de construcción

No hay una decisión de producto pendiente para comenzar. El acceso a PostgreSQL temporal, incluidos certificados para el gate TLS, es un requisito de verificación coordinado con el orquestador, no un permiso para omitir pruebas. La nueva dependencia pg requiere resolver/fijar una versión compatible mediante pnpm y documentarla; Better Auth se decide/integra en 007.

El principal riesgo técnico es introducir Promises sobre una conexión SQLite compartida sin exclusión o repartir la transacción PostgreSQL entre clientes. Otro riesgo es inicializar el ServiceStore legado antes del guard y dejar SQLite en una configuración declarada productiva. Las pruebas concurrentes, de rollback y de arranque sin efectos son obligatorias por esas fronteras.

Los ownerId de 006 aún no prueban identidad ni existencia de cuenta. El modelo queda preparado para 007/008, sin atribuir aislamiento multiusuario a rutas globales vigentes. Cualquier necesidad de cambiar formato de escena, migrar datos personales, añadir UI/autenticación o levantar anticipadamente el guard debe volver al orquestador para redefinir alcance; no ampliarlo durante construcción.
