# 52 — Construcción reproducible

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Construir API, frontend y Electron desde una instalación limpia de dependencias locales.

## Contrato y aceptación vigente

1. Vite 7.3.3 es dependencia de desarrollo directa y el importer del lockfile coincide.
2. pnpm install --frozen-lockfile desde node_modules ausente produce el ejecutable local sin depender de Vite global.
3. Typecheck, lint, pruebas y builds de Electron/API/web completan con esa instalación.
4. No alterar fuentes funcionales o formato de escena para reparar la declaración de toolchain.

## Evolución y límites

El trabajo 012 se integró junto a 006–009. Sus 1206 pruebas históricas no son una nueva ejecución ni sustituyen contratos multi-DB posteriores.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/service-operations.md).
- [Spec original](../../../factory/jobs/012-build-reproducible/spec.md), [construcción](../../../factory/jobs/012-build-reproducible/build.md) y [decisión](../../../factory/jobs/012-build-reproducible/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
