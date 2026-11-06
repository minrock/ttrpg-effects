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


## Corrección de recuperación — 3.21.1 (2026-11-05)

Implementada en `fix/recuperacion-sesion-memoria`, pendiente de integración. Al caducar o revalidar el acceso se conserva el documento en memoria, pero se libera el lienzo Pixi y se suspende la resolución de imágenes de tokens. Reanudar correctamente reconstruye el lienzo y restaura su cámara.

Un conflicto de revisión no activa sondeo ni renders periódicos. La cuenta regresiva solo existe durante Retry-After y termina al vencer. «Descartar borrador y recargar» desmonta el editor, libera sus recursos y vuelve a consultar partida/configuración/apertura; después se permite continuar o iniciar según el estado actual. No guarda el borrador descartado ni recarga toda la página con el documento anterior todavía activo.

Los recursos de tokens ausentes o fallidos no disparan actualizaciones vacías del estado ni reintentos por movimientos del token. Los fallos se aíslan de las imágenes válidas; un cambio de referencia, contexto o recuperación de acceso permite intentarlo de nuevo. Las respuestas de un contexto cancelado no se aplican.

[Diagnóstico y validación de la corrección](recuperacion-memoria.md).

## Actualización 2026-11-05 — borradores del servicio

[SDD 58](../58-borradores-recuperables/spec.md) implementa respaldo privado IndexedDB, borradores remotos separados y confirmación explícita. Sustituye para el cliente de servicio las decisiones anteriores de retener borradores solo en memoria y de usar una partición Electron efímera. Mantiene autenticación nueva al arrancar Electron y el flujo autónomo. La migración aditiva 8 conserva hasta tres generaciones por rama en SQLite/PostgreSQL; no cambia `.ttrpgscene` v2. Estado en rama y [límites de validación](../58-borradores-recuperables/validacion.md).
