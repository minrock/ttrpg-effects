# 48 — Partidas privadas y catálogo de sistemas retenidos

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Aislar contenido por DM y adaptar la sesión a un sistema/versionado compartido administrado exclusivamente por admin.

## Contrato y aceptación vigente

1. Un DM opera solo sus partidas, escenas, assets y bibliotecas; admin no adquiere acceso al contenido privado por su rol.
2. Solo admin crea borradores, publica versiones inmutables y cambia disponibilidad de sistemas/plantillas. No hay borrado ni purga de catálogo.
3. Deshabilitar impide usos nuevos; instancias existentes conservan lectura y edición con su binding exacto y versión retenida.
4. La partida fija sistema, versión y hash; no resolver a latest ni reinterpretar calibración/cámara/diagonal de escenas existentes.
5. Manifest, reglas, esquema y presentación están separados; se resuelven únicamente módulos compilados conocidos, sin ejecutar plugins externos.
6. Recursos nuevos y enlaces validan compatibilidad y disponibilidad al confirmar la transacción; plantillas privadas históricas no se convierten en públicas.
7. Transferencias operativas requieren propietario DM explícito, conservan IDs/bindings y nunca adoptan automáticamente el perfil Electron.

## Evolución y límites

La propuesta inicial de plantillas editables por DM queda sustituida por catálogo admin sin borrado. El modelo de plugins estilo Foundry es evolución futura, no ejecución dinámica implementada.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/owned-data.md).
- [Spec original](../../../factory/jobs/008-partidas-propiedad/spec.md), [construcción](../../../factory/jobs/008-partidas-propiedad/build.md) y [decisión](../../../factory/jobs/008-partidas-propiedad/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
