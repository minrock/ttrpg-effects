# 46 — Persistencia SQLite y PostgreSQL

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Usar repositorios y migraciones comunes con SQLite local y PostgreSQL productivo sin contaminar dominio o vista.

## Contrato y aceptación vigente

1. TTRPG_DB_DRIVER selecciona explícitamente sqlite o postgres; producción exige PostgreSQL con TLS verify-full.
2. No hay fallback de motor, SQLite auxiliar productivo ni acceso SQL desde renderer.
3. Las migraciones son versionadas y verificadas por checksum; conservar 1–6 y aplicar 7 para múltiples administradores.
4. Transacciones, revisiones e idempotencia mantienen aislamiento entre cuentas incluso ante carreras.
5. Un proceso API por base: lock físico SQLite o advisory lock PostgreSQL; la pérdida de autoridad cierra transportes.
6. Restaurar una copia antigua exige invalidar aperturas/credenciales y rotar explícitamente el secreto de identidad antes de servir.

## Evolución y límites

El soporte productivo PostgreSQL está implementado; no equivale a un despliegue realizado ni a escalado horizontal. La migración 7 procede del cambio posterior 3.15.0.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/database.md).
- [Spec original](../../../factory/jobs/006-persistencia-multidb/spec.md), [construcción](../../../factory/jobs/006-persistencia-multidb/build.md) y [decisión](../../../factory/jobs/006-persistencia-multidb/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
