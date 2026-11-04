# 50 — Moderación y transporte por apertura

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Expulsar un participante y cerrar sus transportes sin interrumpir a los demás jugadores de la partida.

## Contrato y aceptación vigente

1. El panel privado identifica participante por ID y alias/discriminador, con presencia conectada/reconectando; no filtra cookies ni datos ajenos.
2. Kick transaccional revoca todas sus credenciales, rota una vez la invitación y registra auditoría e idempotencia.
3. Antes del éxito se cancelan lectores pendientes y streams del objetivo; los supervivientes conservan cookies, cámara y dados.
4. Reintentar la misma expulsión no rota otra vez ni recupera un secreto; conflictos de contexto/revisión no mutan otra apertura.
5. HTTP/SSE incluyen partida, apertura, generación y audiencia; terminales limpian estado y no aceptan respuestas tardías.
6. La autorización se comprueba en la entrega, con cuotas acotadas; bytes ya entregados no pueden recuperarse.

## Evolución y límites

Un único proceso API por base. No hay bus distribuido, replay histórico de SSE ni persistencia de presencia/cámaras/dados entre reinicios.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/moderation.md).
- [Spec original](../../../factory/jobs/010-moderacion-tiempo-real/spec.md), [construcción](../../../factory/jobs/010-moderacion-tiempo-real/build.md) y [decisión](../../../factory/jobs/010-moderacion-tiempo-real/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
