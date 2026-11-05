# 44 — Proyección y sincronización de la mesa

> **Evolución implementada en 3.19.0 (pendiente de integración):** [SDD 55 — Mediciones y áreas compartidas](../55-mediciones-compartidas/spec.md) extiende las herramientas del jugador en el servicio: difusión entre DM/jugadores y etiqueta de autor. En servicio se aplica la capa compartida descrita en esa spec; Electron autónomo mantiene las herramientas locales. Consultar su registro de validación para gates pendientes.

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Enviar escena pública, cámaras, presencia, puntero, áreas y dados a jugadores sin filtrar datos privados del DM.

## Contrato y aceptación vigente

1. Construir una proyección pública explícita antes de enviar; no serializar directamente el estado interno del editor.
2. La autorización de assets depende del conjunto actualmente publicado y se verifica también en HEAD y resolución.
3. Reconectar obtiene bootstrap actual; eventos antiguos no retroceden mapa, cámara ni tirada.
4. Dados privados no producen payload ni aviso público; las operaciones reintentadas no duplican tiradas.
5. Conexiones, buffers y temporizadores tienen cuotas y limpieza; el estado visual se vuelve a publicar tras reiniciar la API.

## Evolución y límites

El motor 004 se conserva; el transporte final usa partidas/aperturas y sobre contextual de 010 (spec 50), no una única mesa global.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/synchronized-table.md).
- [Spec original](../../../factory/jobs/004-mesa-sincronizada/spec.md), [construcción](../../../factory/jobs/004-mesa-sincronizada/build.md) y [decisión](../../../factory/jobs/004-mesa-sincronizada/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
