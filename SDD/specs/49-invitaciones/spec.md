# 49 — Invitaciones renovables y entrada por alias

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Admitir jugadores sin cuenta ni contraseña personal mediante enlace compartido por el DM y alias visible.

## Contrato y aceptación vigente

1. Una apertura nueva de partida genera invitación nueva; continuar una apertura válida no equivale a reabrir.
2. El enlace lleva el secreto en fragmento; la UI lo retira del historial y lo envía al endpoint de admisión, nunca como query/log persistido.
3. Validar apertura, generación, lease y secreto; guardar su hash y emitir cookie invitada independiente.
4. Solicitar alias; dos alias iguales conservan IDs y discriminadores diferentes, sin afirmar identidad humana verificada.
5. Rotar invitación invalida entradas con el enlace anterior pero mantiene participantes ya admitidos.
6. Cerrar, expirar o perder autoridad termina el acceso; heartbeat tardío no resucita otra generación.

## Evolución y límites

El jugador ya no usa contraseña global. Las invitaciones no prometen veto permanente: otro enlace válido permite una nueva admisión.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/invitations.md).
- [Spec original](../../../factory/jobs/009-invitaciones-jugadores/spec.md), [construcción](../../../factory/jobs/009-invitaciones-jugadores/build.md) y [decisión](../../../factory/jobs/009-invitaciones-jugadores/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
