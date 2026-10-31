VEREDICTO: APROBADO

# Revisión UX — 006, ciclo 1, ronda 2

Revisión independiente realizada el 2026-10-29, exclusivamente en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se releyeron perfil UX, solicitud, criterios de la spec, build actualizado e identidad/huellas de ronda 2, y se inspeccionaron las fuentes reales corregidas. Se conservan las convenciones de AGENTS.md leídas en esta revisión continuada. No se consultaron informes ajenos de ronda 2.

## Resolución de UX-006-01

**Corregido.** `scripts/setup-env.sh:63` condiciona ahora los siguientes pasos al motor seleccionado. Para PostgreSQL comunica:

```text
Se conservaron los valores existentes. Siguiente paso: pnpm build:api y pnpm db:migrate.
El servicio completo PostgreSQL permanece bloqueado en esta entrega. Consulta docs/database.md.
```

Ya no invita a arrancar una composición rechazada ni a buscar claves globales que la migración no necesita. Para SQLite mantiene las instrucciones anteriores de claves, `start:api` y `start:service`. No se quitó el guard de producción ni se regeneran credenciales para resolver el problema.

La documentación de `docs/database.md:9` coincide con el comando: separa preparación/migración PostgreSQL del servicio completo pendiente. La sección de migraciones continúa indicando cómo compilar el artefacto, qué configuración necesita y qué significan éxito, ausencia de pendientes y fallo. No detecté otra indicación incompatible en el flujo modificado.

## Verificación propia

Ejecuté:

```sh
pnpm exec vitest run src/server/environment-setup.test.ts src/infrastructure/server/database/config.test.ts
```

Resultado: **2 archivos / 22 pruebas PASS**, 1,45 s. Las pruebas de setup ejecutan el script real en directorios temporales mediante subprocesos, con configuraciones sintéticas. Comprobé sus aserciones: mensajes correctos para ambos motores; ausencia de `start:api`, `start:service` y «claves de acceso» en la salida PostgreSQL; archivo existente intacto; secreto ausente de salida; ausencia de directorio SQLite; configuración del cliente sin datos DB; permisos y conservación de valores. También pasan las pruebas del guard/configuración.

Comparé las huellas de ambas rondas: únicamente los seis archivos declarados por la corrección cambian, incluido el fixture nuevo. Las **548 huellas de ronda 2** coinciden con el checkout al comenzar y al finalizar: **0 diferencias**. No se modificaron código, specs, Git, tablero o informes ajenos.

## Recuperación operativa e impacto visual

Leí el cambio del driver PostgreSQL y la explicación nueva en `docs/database.md:56`: una conexión adquirida que falla queda invalidada, la operación rechaza de forma sanitizada y puede recuperarse mediante otra conexión. La guía explica que el callback debe terminar y no promete cancelar trabajo externo pendiente. Esta explicación resulta coherente con la implementación inspeccionada.

Atribuyo al constructor, sin contarlo como ejecución propia, el gate actualizado de **32 pruebas SQLite/PostgreSQL reales**, incluida la regresión de timeout con rollback/recuperación, y las **1198 pruebas generales** declaradas en el build. No repetí esa suite técnica ni una conexión PostgreSQL para verificar el cambio de instrucciones. Se conserva la evidencia operativa propia de ronda 1 sobre migración SQLite, repetición, bloqueo, recuperación y guard; esos contratos no cambiaron en esta corrección.

No hay UI nueva ni cambios en renderer/CSS, herramientas de mapa o flujos visuales de Electron. Las correcciones afectan setup, documentación y recuperación de infraestructura. No procede repetir la matriz de foco, Escape/Delete, cámaras, escala o proyección; no se usó CUA ni se afirma un humo visual nuevo. La revisión no adelanta aceptación de cuentas, partidas visuales o PostgreSQL completo de trabajos posteriores.

## Límites y limpieza

Sin despliegue, backup/restore, carga prolongada ni acceso a datos/env del original. No se leyó el recurso privado PostgreSQL, no se conectó ni detuvo su servidor. El proceso de pruebas terminó con código 0 y sus fixtures se limpian en afterEach; no quedó ningún proceso propio activo ni se crearon ventanas/pestañas. CUA permanece libre.

No quedan hallazgos UX abiertos en el alcance revisado. Informe publicado completo mediante temporal y renombrado; la aprobación corresponde a experiencia operativa de 006 y no autoriza integración Git ni despliegue.
