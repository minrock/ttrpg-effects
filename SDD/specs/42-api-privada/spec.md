# 42 — API privada y recursos del servicio

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Ejecutar una API independiente de Electron que sirva el frontend y recursos autorizados del mismo origen.

## Contrato y aceptación vigente

1. Node 24 arranca la API compilada y publica salud con versión real; una configuración inválida falla antes de escuchar.
2. Validar Host, Origin de mutaciones, DTO, tamaños y credencial efectiva; rechazar rutas, symlinks o URL externas como referencias de almacenamiento.
3. El listener final compone identidad, propiedad, invitaciones y moderación; rutas globales y claves DM/jugador antiguas no autorizan.
4. Escenas y assets persistidos tienen propietario explícito; el invitado solo recibe assets de la proyección vigente.
5. Rechazar MIME falso, contenido activo y cuerpos excesivos; no almacenar ni interpretar rutas del cliente como archivos del servidor.

## Evolución y límites

La autenticación por dos claves compartidas y ServiceStore global de 002 es legado. Para contratos vigentes usar identidad, owned-data y moderation; private-api describe el listener final.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/private-api.md).
- [Spec original](../../../factory/jobs/002-api-privada/spec.md), [construcción](../../../factory/jobs/002-api-privada/build.md) y [decisión](../../../factory/jobs/002-api-privada/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
