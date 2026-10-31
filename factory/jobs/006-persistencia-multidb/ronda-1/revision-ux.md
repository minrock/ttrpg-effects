VEREDICTO: CAMBIOS

# Revisión UX — 006, ciclo 1, ronda 1

Revisión independiente del flujo operativo, realizada el 2026-10-29 en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se leyeron perfil UX, AGENTS.md, solicitud, spec, build, identidad de ronda, huellas, fuentes de configuración/migración/setup y documentación afectada. No se consultaron informes de otros revisores.

## Hallazgo que requiere corrección

### UX-006-01 — P2: setup recomienda un arranque incompatible después de conservar PostgreSQL

**Evidencia:** `scripts/setup-env.sh:62` distingue correctamente la configuración PostgreSQL, pero las líneas 63–64 imprimen incondicionalmente instrucciones del servicio legado. Reproducción propia con copia aislada del script y un `.env` temporal de `production + postgres`, sin credenciales reales:

```text
Configuración PostgreSQL conservada; no se creó almacenamiento SQLite.
Se conservaron los valores existentes. Consulta las claves de acceso en .env.
Arranque: pnpm start:api; en otra terminal, pnpm start:service.
```

El setup terminó con código 0, preservó exactamente la configuración y no creó directorio SQLite. Seguí la instrucción usando el artefacto real mediante `pnpm start:api` con esa selección de motor y variables sintéticas. Terminó con código 1:

```text
TTRPG_DB_DRIVER/TTRPG_DEPLOYMENT: la API legada solo admite local + sqlite.
Falta migrar el almacenamiento funcional; db:migrate sí admite PostgreSQL.
```

El guard funciona correctamente. El problema está en el siguiente paso que comunica el asistente de configuración: conduce de forma determinista a un arranque rechazado y pide buscar claves globales que ni siquiera son necesarias para migrar PostgreSQL. Contradice el límite bien explicado en `docs/database.md:3` y la secuencia de migración de `docs/database.md:34`. Afecta al operador que acaba de preparar PostgreSQL y confía en la salida exitosa del comando.

**Corrección esperada:** condicionar también las instrucciones finales. Para PostgreSQL, indicar que se conservó la configuración, dirigir a construir/ejecutar `pnpm db:migrate` y a la guía de persistencia, y explicar que el servicio completo permanece bloqueado en esta entrega. Mantener las instrucciones de claves y arranque para local + SQLite. No retirar el guard, cambiar credenciales ni regenerar archivos para resolver este hallazgo.

**Verificación esperada:** extender la prueba de configuración PostgreSQL de `src/server/environment-setup.test.ts:66` para comprobar que la salida propone el paso permitido y no presenta `start:api`/`start:service` como disponibles. Conservar las comprobaciones de privacidad, archivo intacto y ausencia de almacenamiento SQLite. El test actual acredita esas garantías, pero no detecta las instrucciones contradictorias.

## Comprobaciones propias

- `pnpm exec vitest run src/server/environment-setup.test.ts src/infrastructure/server/database/config.test.ts`: **2 archivos / 22 pruebas PASS**, 1,43 s. Incluye configuración, guard y preparación de entorno; no son pruebas PostgreSQL adicionales a las del constructor.
- `pnpm db:migrate` compilado, sin claves/webDir ni `.env` del checkout, contra directorio SQLite temporal privado: código 0 y «migraciones 1 aplicadas»; segunda ejecución, código 0 y «sin migraciones pendientes». Solo quedó `control.sqlite`, sin lock residual.
- Simulación de lock propio en ese destino temporal: código 1, mensaje sanitizado que orienta a conexión/TLS/permisos/exclusión y lock existente conservado. Retirado únicamente el centinela creado por esta revisión, el reintento terminó 0 y sin lock residual. No se borró ningún lock ajeno.
- Setup PostgreSQL y guard productivo reproducidos como se detalla en UX-006-01. No hubo conexión a PostgreSQL en esa comprobación: el rechazo ocurre antes. El centinela de contraseña sintética no apareció en stdout/stderr.
- Comparación SHA-256 de **547 archivos** contra `huellas.json` al iniciar y al terminar: **0 diferencias**. No se alteró código, documentación de producto, specs, Git, tablero o informes ajenos.

Las salidas de éxito, ausencia de pendientes y error de migración son legibles en español y usan códigos de salida coherentes. La guía identifica la separación entre `control.sqlite` y las tres bases legadas, exige migración explícita, distingue persistencia de autenticación y no promete traslado/restauración PostgreSQL ya ensayados. Las variables del proceso y los archivos de entorno se documentan sin pedir secretos en el cliente.

## Impacto visual y evidencia atribuida

No se añadió interfaz ni se modificaron renderer, CSS, herramientas de mapa o composición de vistas en el alcance de 006. El catálogo todavía carece de endpoints/pantallas; no corresponde exigir navegación de partidas o autenticación de cuentas de trabajos posteriores. Por ello no abrí CUA ni repetí pruebas de Escape/Delete, foco, cámaras, escala o tamaños de ventana. Esta revisión no certifica un nuevo humo visual Electron.

Se reutiliza **con atribución al build 006**, sin presentarlo como ejecución propia, la evidencia de 1198 pruebas generales, 31 pruebas del gate DB sobre SQLite/PostgreSQL 17.10, builds y humo API legado compilado. Se inspeccionaron los contratos de pruebas y las fuentes de migración/driver para contextualizar esa evidencia. Las comprobaciones propias se centraron en las instrucciones que recibe el operador y en resultados observables de los comandos, no en repetir toda la suite DB.

## Límites y limpieza

No se ejecutó despliegue, backup/restore PostgreSQL, carga prolongada ni nueva matriz visual. No se leyó el recurso privado de credenciales PostgreSQL, no se conectó a ese servidor y no se detuvo ni modificó. No se usaron datos, `.env` o perfiles del checkout original.

Los subprocesos de esta revisión terminaron; el directorio temporal propio y sus fixtures se eliminaron y se comprobó su ausencia. CUA no se utilizó. Informe publicado completo mediante temporal y renombrado. El único cambio solicitado es corregir y verificar la orientación operativa del setup; la aceptación UX queda pendiente de ese ajuste.
