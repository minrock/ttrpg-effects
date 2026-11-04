# SDD — Especificaciones de TTRPG Effects

Este es el punto de entrada para planificar por especificaciones. Reúne el producto de escritorio, la evolución a servicio privado API + frontend y los cambios posteriores a la fábrica. Corte documental: **2026-11-04**, código de referencia **3.18.1** según `package.json`.

1. Lee [estado actual y decisiones](estado-actual.md) para conocer qué existe y qué sigue pendiente.
2. Consulta [arquitectura y datos](arquitectura.md) y la [operación local](guias/service-operations.md) para preparar una propuesta compatible.
3. Usa [el flujo SDD](flujo.md) y las plantillas de [spec](specs/templates/spec-template.md) y [plan](specs/templates/plan-template.md) para la siguiente entrega.

## Organización y autoridad

```text
SDD/
  README.md                 Índice y trazabilidad
  estado-actual.md          Base vigente, decisiones y límites
  arquitectura.md           Clientes, servidor, persistencia y datos
  flujo.md                  Planificación → implementación → evidencia
  specs/00-… a 54-…/        spec.md + plan.md por alcance
  specs/templates/          Plantillas de planificación
  guias/                    Contratos detallados y operación
factory/
  jobs/                     Solicitudes, contratos de ejecución y revisiones históricas
  board.json                Estado operativo de la fábrica
```

Las specs de SDD definen el producto y las guías detallan sus contratos. Un expediente de fábrica conserva el contrato de una entrega concreta y la evidencia de esa revisión; no redefine por sí solo el producto vigente. `package.json` sigue siendo la única fuente de versión de aplicación y las migraciones la fuente del esquema físico. Si código y spec difieren, registrar la discrepancia antes de planificar; no inventar una aceptación.

`specs/` y `docs/` originales conservan únicamente enlaces de compatibilidad. Edita sus destinos en SDD. Las solicitudes, revisiones, huellas y decisiones históricas de fábrica no se movieron ni reescribieron; el dashboard mantiene sus rutas.

## Escritorio y fábrica: specs 00–40

El [catálogo histórico completo](catalogo-historico.md) enlaza las 40 specs y sus planes originales: motor, mapas, grilla, efectos, entidades, Player View, dados, interfaz y fábrica. Sus estados son los registrados en cada documento; esta reorganización no certifica nuevamente sus pruebas. El salto de numeración 20 → 22 se conserva.

## Servicio y cambios posteriores: specs 41–54

Los identificadores de spec SDD y trabajo factory son espacios distintos. Por ejemplo, SDD 48 corresponde al trabajo factory 008; no renumerar expedientes ni rondas.

| Spec SDD | Procedencia | Estado de entrega |
| --- | --- | --- |
| [41-contrato-clientes: Contrato común de clientes](specs/41-contrato-clientes/spec.md) | [001-contrato-clientes](../factory/jobs/001-contrato-clientes/spec.md) | Integrado en tablero; ver evolución |
| [42-api-privada: API privada y recursos del servicio](specs/42-api-privada/spec.md) | [002-api-privada](../factory/jobs/002-api-privada/spec.md) | Integrado en tablero; ver evolución |
| [43-cliente-navegador: Cliente web del editor VTT](specs/43-cliente-navegador/spec.md) | [003-cliente-navegador](../factory/jobs/003-cliente-navegador/spec.md) | Integrado en tablero; ver evolución |
| [44-mesa-sincronizada: Proyección y sincronización de la mesa](specs/44-mesa-sincronizada/spec.md) | [004-mesa-sincronizada](../factory/jobs/004-mesa-sincronizada/spec.md) | Integrado en tablero; ver evolución |
| [45-electron-servicio: Electron como cliente alternativo](specs/45-electron-servicio/spec.md) | [005-electron-servicio](../factory/jobs/005-electron-servicio/spec.md) | Integrado en tablero; ver evolución |
| [46-persistencia-multidb: Persistencia SQLite y PostgreSQL](specs/46-persistencia-multidb/spec.md) | [006-persistencia-multidb](../factory/jobs/006-persistencia-multidb/spec.md) | Integrado en tablero; ver evolución |
| [47-identidad-dm: Cuentas administradas y acceso DM](specs/47-identidad-dm/spec.md) | [007-cuentas-dm](../factory/jobs/007-cuentas-dm/spec.md) | Integrado en tablero; ver evolución |
| [48-partidas-sistemas: Partidas privadas y catálogo de sistemas retenidos](specs/48-partidas-sistemas/spec.md) | [008-partidas-propiedad](../factory/jobs/008-partidas-propiedad/spec.md) | Integrado en tablero; ver evolución |
| [49-invitaciones: Invitaciones renovables y entrada por alias](specs/49-invitaciones/spec.md) | [009-invitaciones-jugadores](../factory/jobs/009-invitaciones-jugadores/spec.md) | Integrado en tablero; ver evolución |
| [50-moderacion: Moderación y transporte por apertura](specs/50-moderacion/spec.md) | [010-moderacion-tiempo-real](../factory/jobs/010-moderacion-tiempo-real/spec.md) | Integrado en tablero; ver evolución |
| [51-experiencia-servicio: Experiencia de cuentas, partidas y operación local](specs/51-experiencia-servicio/spec.md) | [011-experiencia-autenticacion](../factory/jobs/011-experiencia-autenticacion/spec.md) | Integrado en tablero; ver evolución |
| [52-build-reproducible: Construcción reproducible](specs/52-build-reproducible/spec.md) | [012-build-reproducible](../factory/jobs/012-build-reproducible/spec.md) | Integrado en tablero; ver evolución |
| [53-administracion-local: Administradores locales y política de contraseñas](specs/53-administracion-local/spec.md) | Cambios locales posteriores | Implementado; commit c4e8831 |
| [54-cabecera-unificada: Cabecera compacta compartida](specs/54-cabecera-unificada/spec.md) | Cambios locales posteriores | Implementado; commit c4e8831 |

Los 12 trabajos figuran integrados en el tablero; las specs 41–52 consolidan su comportamiento final, incluidas sustituciones posteriores. Las specs 53–54 documentan los cambios posteriores registrados en el commit `c4e8831`, incluidos en el cierre autorizado de esta entrega; no se les atribuye una revisión de fábrica. [Registro de consolidación y límites de validación](consolidacion.md).

## Guías técnicas y operativas

| Tema | Documento |
| --- | --- |
| Clientes, capacidades y paridad | [Arquitectura de clientes](guias/client-architecture.md) |
| Configuración, seguridad HTTP y rutas | [API privada](guias/private-api.md) |
| Pantallas, borradores y recuperación | [Cliente navegador](guias/browser-client.md) |
| Proyección y payloads visuales | [Mesa sincronizada](guias/synchronized-table.md) |
| Drivers, migraciones y contratos reales | [Base de datos](guias/database.md) |
| Cuentas, contraseñas y CLI | [Identidad](guias/identity.md) |
| Propiedad, sistemas, bindings y transferencia | [Datos privados](guias/owned-data.md) |
| Aperturas, lease y admisión | [Invitaciones](guias/invitations.md) |
| Expulsión, HTTP/SSE contextual y cuotas | [Moderación](guias/moderation.md) |
| Instalación, env, respaldo y producción | [Operación del servicio](guias/service-operations.md) |
| Visión original de mesa física | [Requerimientos iniciales, históricos](guias/requirements.md) |

## Siguiente planificación

La siguiente numeración disponible es **55** al momento de esta consolidación; comprueba el índice antes de reservarla. Las ideas futuras de [estado actual](estado-actual.md#pendiente-de-especificar) no son tareas autorizadas ni se agregaron automáticamente a la cola. Puedes pedir «planifica SDD 55: …» y después «ejecuta con `$factory` la spec SDD …».

## Antecedentes de planificación de la fábrica

[Migración a servicio](../factory/migracion-servicio.md), [cuentas y partidas](../factory/autenticacion-partidas.md), [prerrequisitos históricos](../factory/prerrequisitos-autenticacion.json), [informe de integración 006–009](../factory/integracion-006-009.md) y [cola ejecutada](../factory/backlog.md). Se conservan como procedencia de las entregas; sus restricciones temporales no sustituyen las decisiones vigentes de SDD.
