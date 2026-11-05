# 41 — Contrato común de clientes

> **Evolución integrada en 3.19.1 (main, 90dc50e):** [SDD 55 — Mediciones y áreas compartidas](../55-mediciones-compartidas/spec.md) extiende las herramientas del jugador en el servicio: difusión entre DM/jugadores y etiqueta de autor. En servicio se aplica la capa compartida descrita en esa spec; Electron autónomo mantiene las herramientas locales. Consultar su registro de validación para gates pendientes.

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Compartir el editor y la proyección entre Electron autónomo, navegador y Electron conectado, mediante contratos tipados y capacidades por cliente.

## Contrato y aceptación vigente

1. Inyectar un cliente por raíz React; dos raíces no comparten llamadas ni eventos.
2. Desmontar o cambiar de cliente libera suscripciones; un render ordinario no reinicia canvas, escena o dados.
3. Electron local conserva preload e IPC específicos; el navegador usa adaptadores HTTP/SSE sin acceso a Node o disco del servidor.
4. Las capacidades controlan disponibilidad visual; toda autorización del servicio se repite en servidor.
5. La información de versión procede de package.json; .ttrpgscene v2 conserva lectura/migración v1.

## Evolución y límites

La matriz original 001 sigue siendo antecedente; las capacidades de red pendientes allí se completaron con 004 y 010. No duplicar un segundo editor para web.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/client-architecture.md).
- [Spec original](../../../factory/jobs/001-contrato-clientes/spec.md), [construcción](../../../factory/jobs/001-contrato-clientes/build.md) y [decisión](../../../factory/jobs/001-contrato-clientes/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
