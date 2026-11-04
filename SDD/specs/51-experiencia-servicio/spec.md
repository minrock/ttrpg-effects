# 51 — Experiencia de cuentas, partidas y operación local

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Unir los backends de cuentas/partidas/invitaciones/moderación en un producto accesible desde web y Electron servicio.

## Contrato y aceptación vigente

1. Admin dispone de cuentas DM y catálogo; DM elige sistema al crear partida y dispone de apertura, invitación y panel de jugadores.
2. El invitado entra con alias y recibe solo proyección autorizada; expulsión/cierre muestran un estado terminal claro.
3. Caducidad de identidad suspende canvas y portales, cancela confirmaciones pendientes y protege borrador para la misma cuenta.
4. Reapertura propia reconcilia terminales antiguos sin congelar una apertura nueva; rotar enlace no remonta la mesa ni pierde el borrador.
5. setup:env crea .env/.env.electron privados y .local/service/{data,backups,logs} ignorados, sin sobrescribir secretos existentes.
6. start:api carga .env y anuncia enlace/host/puerto; el servicio sirve out/web y exige migraciones/configuración válidas.
7. Respaldos y restauración conservan cuentas/contenido y revocan accesos antiguos explícitamente; nunca resetear datos como paso ordinario de arranque.

## Evolución y límites

El listener de 011 sustituye definitivamente la composición global 002–005. La cabecera final de una sola fila se detalla en la spec 54.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/service-operations.md).
- [Spec original](../../../factory/jobs/011-experiencia-autenticacion/spec.md), [construcción](../../../factory/jobs/011-experiencia-autenticacion/build.md) y [decisión](../../../factory/jobs/011-experiencia-autenticacion/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
