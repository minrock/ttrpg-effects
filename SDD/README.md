# SDD — Especificaciones de TTRPG Effects

Este es el punto de entrada para planificar por especificaciones. La entrega **3.35.0** retira Electron y conserva navegador + API Node.js. Integra en `main` SDD62 y la consolidación **3.34.0** de campañas/arcos/escenas (SDD59 hasta revisión 0.10), Storybook (SDD60), dados de jugadores (SDD61) y correcciones de interfaz, publicación y recuperación. Commit, push y merge autorizados por el usuario el **2026-11-17**; merge `9521af9`. Fuente de versión: `package.json`; [estado vigente](estado-actual.md) y [validación e integración](specs/62-servicio-solo-web/validacion.md). Las evidencias anteriores conservan su fecha y alcance; integración no equivale a despliegue.

1. Lee [estado actual y decisiones](estado-actual.md) para conocer qué existe y qué sigue pendiente.
2. Consulta [arquitectura y datos](arquitectura.md) y la [operación local](guias/service-operations.md) para preparar una propuesta compatible.
3. Usa [el flujo SDD](flujo.md) y las plantillas de [spec](specs/templates/spec-template.md) y [plan](specs/templates/plan-template.md) para la siguiente entrega.

La planificación técnica puede desglosarse con las plantillas de [plan](specs/templates/plan-template.md) y [tareas](specs/templates/tareas-template.md): `plan.md` y `tareas.md` junto a la spec, con dependencias, propiedad de archivos y paralelismo propuesto. El TL devuelve esos artefactos al hilo principal en rol PM para decidir y orquestar; no despacha constructores. En el flujo de agentes del proyecto, [Factory](../.agents/skills/factory/SKILL.md) prepara la spec y [Build](../.agents/skills/build/SKILL.md) parte de ella para aceptar su alcance, planificar y construir. El [contrato del equipo](../.codex/README.md) define PM en el hilo principal y consultas mediante User Ask; SDD sigue siendo utilizable fuera de ese flujo.

## Organización y autoridad

```text
SDD/
  README.md                 Índice y trazabilidad
  estado-actual.md          Base vigente, decisiones y límites
  arquitectura.md           Clientes, servidor, persistencia y datos
  flujo.md                  Planificación → implementación → evidencia
  specs/00-… a 62-…/        spec.md; plan.md + tareas.md al planificar construcción
  specs/templates/          Plantillas de planificación
  guias/                    Contratos detallados y operación
  retirada-factory.md       Conservación de criterios y trazabilidad de la organización retirada
```

Las specs de SDD definen el producto y las guías detallan sus contratos. `package.json` sigue siendo la única fuente de versión y las migraciones la fuente del esquema físico. Los criterios y evidencia iniciales rescatados se distinguen del contrato vigente. Si código y spec difieren, registrar la discrepancia antes de planificar.

Las rutas antiguas `specs/` y `docs/` conservan enlaces de compatibilidad. La fábrica y sus instrucciones fueron retiradas el 2026-11-13; [correspondencia, criterios conservados e historial](retirada-factory.md). SDD no impone una organización de agentes.

## Escritorio y alcance retirado: specs 00–40

El [catálogo histórico completo](catalogo-historico.md) enlaza las 40 specs y sus planes originales: motor, mapas, grilla, efectos, entidades, Player View, dados, interfaz y fábrica. La spec 40 está retirada; las demás conservan el estado registrado en cada documento; esta reorganización no certifica nuevamente sus pruebas. El salto de numeración 20 → 22 se conserva.

Ajuste local posterior: [SDD33 FIX-01](specs/33-floating-dm-counters/validacion-fix-01.md), retirada del acceso flotante duplicado de contadores, validado en3.32.2 el2026-11-17 e integrado con la consolidación 3.34.0 en `9521af9`.

## Servicio y cambios posteriores: specs 41–54

Los identificadores de spec SDD son independientes de los antiguos trabajos de ejecución. SDD 48 corresponde a la entrega histórica 008; la tabla conserva esa procedencia.

| Spec SDD | Procedencia | Estado de entrega |
| --- | --- | --- |
| [41-contrato-clientes: Contrato común de clientes](specs/41-contrato-clientes/spec.md) | [001-contrato-clientes](specs/41-contrato-clientes/aceptacion-historica.md) | Integrado; ver evolución |
| [42-api-privada: API privada y recursos del servicio](specs/42-api-privada/spec.md) | [002-api-privada](specs/42-api-privada/aceptacion-historica.md) | Integrado; ver evolución |
| [43-cliente-navegador: Cliente web del editor VTT](specs/43-cliente-navegador/spec.md) | [003-cliente-navegador](specs/43-cliente-navegador/aceptacion-historica.md) | Integrado; ver evolución |
| [44-mesa-sincronizada: Proyección y sincronización de la mesa](specs/44-mesa-sincronizada/spec.md) | [004-mesa-sincronizada](specs/44-mesa-sincronizada/aceptacion-historica.md) | Integrado; ver evolución |
| [45-electron-servicio: Electron como cliente alternativo](specs/45-electron-servicio/spec.md) | [005-electron-servicio](specs/45-electron-servicio/aceptacion-historica.md) | Integrado; ver evolución |
| [46-persistencia-multidb: Persistencia SQLite y PostgreSQL](specs/46-persistencia-multidb/spec.md) | [006-persistencia-multidb](specs/46-persistencia-multidb/aceptacion-historica.md) | Integrado; ver evolución |
| [47-identidad-dm: Cuentas administradas y acceso DM](specs/47-identidad-dm/spec.md) | [007-cuentas-dm](specs/47-identidad-dm/aceptacion-historica.md) | Integrado; ver evolución |
| [48-partidas-sistemas: Partidas privadas y catálogo de sistemas retenidos](specs/48-partidas-sistemas/spec.md) | [008-partidas-propiedad](specs/48-partidas-sistemas/aceptacion-historica.md) | Integrado; ver evolución |
| [49-invitaciones: Invitaciones renovables y entrada por alias](specs/49-invitaciones/spec.md) | [009-invitaciones-jugadores](specs/49-invitaciones/aceptacion-historica.md) | Integrado; ver evolución |
| [50-moderacion: Moderación y transporte por apertura](specs/50-moderacion/spec.md) | [010-moderacion-tiempo-real](specs/50-moderacion/aceptacion-historica.md) | Integrado; ver evolución |
| [51-experiencia-servicio: Experiencia de cuentas, partidas y operación local](specs/51-experiencia-servicio/spec.md) | [011-experiencia-autenticacion](specs/51-experiencia-servicio/aceptacion-historica.md) | Integrado; ver evolución |
| [52-build-reproducible: Construcción reproducible](specs/52-build-reproducible/spec.md) | [012-build-reproducible](specs/52-build-reproducible/aceptacion-historica.md) | Integrado; ver evolución |
| [53-administracion-local: Administradores locales y política de contraseñas](specs/53-administracion-local/spec.md) | Cambios locales posteriores | Integrado; commit c4e8831 |
| [54-cabecera-unificada: Cabecera compacta compartida](specs/54-cabecera-unificada/spec.md) | Base integrada; corrección local 3.31.1 | Base c4e8831; Jugador en Chrome integrado en `9521af9` ([evidencia](specs/54-cabecera-unificada/validacion-fix-01.md)) |

El registro histórico conserva los 12 trabajos integrados; las specs 41–52 consolidan su comportamiento final, incluidas sustituciones posteriores. Las specs 53–54 documentan los cambios posteriores registrados en el commit `c4e8831`, incluidos en el cierre autorizado de esta entrega; no se les atribuye una revisión de fábrica. [Registro de consolidación y límites de validación](consolidacion.md).

## Especificaciones en desarrollo

| Spec | Estado | Plan |
| --- | --- | --- |
| [55 — Mediciones y áreas compartidas con autor visible](specs/55-mediciones-compartidas/spec.md) | Integrada en main, 3.19.1 (`90dc50e`); validación PostgreSQL/visual pendiente | [Plan](specs/55-mediciones-compartidas/plan.md) · [Evidencia](specs/55-mediciones-compartidas/validacion.md) |
| [56 — Cámaras libres y foco de atención](specs/56-camaras-libres-foco-atencion/spec.md) | Integrada en main, 3.20.0 (`3d35876`); cámaras libres y foco puntual | [Plan](specs/56-camaras-libres-foco-atencion/plan.md) |
| [57 — Áreas contextuales: color, patrones, bloqueo y copia](specs/57-areas-contextuales/spec.md) | Integrada en main, 3.21.0 (`62c351a`); ver validación | [Plan](specs/57-areas-contextuales/plan.md) · [Evidencia](specs/57-areas-contextuales/validacion.md) |
| [58 — Borradores recuperables y autoguardado del servicio](specs/58-borradores-recuperables/spec.md) | Base integrada; FIX-01 validado en 3.31.2 e integrado en `9521af9`; límites históricos de rendimiento conservados | [Plan](specs/58-borradores-recuperables/plan.md) · [Evidencia FIX-01](specs/58-borradores-recuperables/validacion-fix-01.md) |
| [59 — Campañas, arcos y escenas](specs/59-campanas-arcos-escenas/spec.md) | Base 0.2 y ajustes 0.3–0.5 validados; ampliación0.6 incorporada al servicio local3.30.0; breadcrumbs0.7 y ajustes de cabecera validados hasta3.30.3; navegación de escenas0.8 validada localmente en3.31.0; selector de plantillas0.9 validado localmente en3.32.1; revisión0.10 validada e incorporada al servicio local3.33.0 con migración12 y respaldo; integrada hasta revisión0.10 en `9521af9` | [Plan](specs/59-campanas-arcos-escenas/plan.md) · [Tareas](specs/59-campanas-arcos-escenas/tareas.md) · [Evidencia](specs/59-campanas-arcos-escenas/validacion.md) |

| [60 — Storybook de componentes UI](specs/60-storybook-componentes-ui/spec.md) | Implementada y validada en 3.29.0; integrada con sus ajustes posteriores en `9521af9` | [Plan](specs/60-storybook-componentes-ui/plan.md) · [Inventario](specs/60-storybook-componentes-ui/inventario.md) · [Validación](specs/60-storybook-componentes-ui/validacion.md) |
| [61 — Dados de jugadores e historial público](specs/61-dados-jugadores/spec.md) | Revisión 0.1 implementada y validada en 3.32.0; integrada en `9521af9` | [Plan](specs/61-dados-jugadores/plan.md) · [Tareas](specs/61-dados-jugadores/tareas.md) · [Validación](specs/61-dados-jugadores/validacion.md) |

## Retirada de Electron — SDD62

[Servicio exclusivamente web](specs/62-servicio-solo-web/spec.md), revisión 0.1 solicitada el 2026-11-17: retirar ambos modos Electron y conservar editor/jugador por navegador y API Node.js. Rama autorizada `feature/spec-62-solo-web`; implementación y [validación](specs/62-servicio-solo-web/validacion.md) completas en 3.35.0, integrada en `main` mediante `9521af9`. No incluye Django, Redis, escalado horizontal ni migraciones reales.

## Guías técnicas y operativas

El [catálogo UI/UX](guias/ui-ux/catalogo.md) registra patrones de interacción, componentes reutilizables y acuerdos de diseño, distinguiendo propuestas de implementaciones verificadas.

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

La siguiente numeración disponible es **63** tras reservar la spec 62; comprueba el índice antes de reservarla. Las ideas futuras de [estado actual](estado-actual.md#pendiente-de-especificar) no son tareas autorizadas ni se agregaron automáticamente a la cola. Puedes pedir «planifica SDD 63: …» y después autorizar su implementación. La organización de agentes no está predeterminada.

## Procedencia de las entregas

[Retirada de la fábrica y conservación de criterios](retirada-factory.md). El registro enlaza cierres, contratos y evidencia en Git, sin conservar un flujo operativo paralelo a SDD.

Corrección 3.22.1 en `fix/recuperacion-local-figuras`: respalda figuras sin mapa, inicia escritura al crearlas y ofrece recuperar IndexedDB o cargar la escena. Conserva SDD 58 pendiente de integrar.
