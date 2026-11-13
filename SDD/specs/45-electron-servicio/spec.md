# 45 — Electron como cliente alternativo

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Permitir conectar Electron al mismo servicio web manteniendo el modo autónomo independiente.

## Contrato y aceptación vigente

1. TTRPG_ELECTRON_MODE=local|service elige explícitamente el modo; local es el valor predeterminado.
2. En servicio, TTRPG_SERVICE_URL es un origen raíz validado; HTTPS fuera de loopback, sin credenciales, query ni fragmento.
3. La ventana remota no tiene preload ni Node, conserva aislamiento/sandbox y no ignora errores TLS.
4. Usar el mismo acceso y frontend que el navegador; la partición es efímera y cerrar exige nueva autenticación/admisión.
5. La pérdida de red ofrece reintentar/salir; cerrar con borrador requiere confirmación. Electron local conserva archivos y PlayerIPC.

## Evolución y límites

Las variables de claves compartidas de la entrega 005 ya no son configuración válida del servicio final. El modo y origen se cargan desde .env.electron.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/service-operations.md).
- [Criterios y evidencia de la entrega inicial](aceptacion-historica.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.

## Actualización 2026-11-05 — borradores del servicio

[SDD 58](../58-borradores-recuperables/spec.md) implementa respaldo privado IndexedDB, borradores remotos separados y confirmación explícita. Sustituye para el cliente de servicio las decisiones anteriores de retener borradores solo en memoria y de usar una partición Electron efímera. Mantiene autenticación nueva al arrancar Electron y el flujo autónomo. La migración aditiva 8 conserva hasta tres generaciones por rama en SQLite/PostgreSQL; no cambia `.ttrpgscene` v2. Estado en rama y [límites de validación](../58-borradores-recuperables/validacion.md).
