# 43 — Cliente web del editor VTT

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Usar el frontend existente desde navegadores con importación, edición, guardado y proyección sin privilegios Electron.

## Contrato y aceptación vigente

1. Adaptadores del mismo origen traducen HTTP a los contratos comunes y distinguen cancelación, red, acceso revocado y conflicto.
2. Importar/exportar .ttrpgscene y subir imágenes requiere selección explícita; nunca transmite una ruta para leerla en el host.
3. Reemplazar una imagen preserva mapa, geometría y referencias; los enlaces conservan reciprocidad y versiones compatibles.
4. Cambios sin guardar requieren una decisión visible; respuestas tardías no alteran otra cuenta, escena o apertura.
5. Teclado, foco, diálogos, paneles y herramientas funcionan en escritorio y ancho estrecho; Player no recibe controles privados.

## Evolución y límites

El login por clave de 003 fue sustituido por 007–011. Los controles antes repartidos en dos barras se consolidaron en la spec 54.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/browser-client.md).
- [Spec original](../../../factory/jobs/003-cliente-navegador/spec.md), [construcción](../../../factory/jobs/003-cliente-navegador/build.md) y [decisión](../../../factory/jobs/003-cliente-navegador/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
