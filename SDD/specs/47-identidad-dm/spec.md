# 47 — Cuentas administradas y acceso DM

Fecha de consolidación: 2026-11-04.

**Estado:** Integrado según expediente histórico; contrato actualizado a la base actual.

## Objetivo

Autenticar administradores y DMs sin registro público y con credenciales protegidas.

## Contrato y aceptación vigente

1. Solo un administrador habilitado provisiona o deshabilita DMs; admin y DM tienen capacidades distintas.
2. Contraseñas de 10–128 puntos de código Unicode, máximo 512 bytes UTF-8, sin recorte ni normalización; rechazar sustitutos inválidos.
3. Better Auth y Kysely gestionan identidad con hash scrypt existente; no guardar contraseñas en texto plano ni exponer secretos en logs.
4. Cambiar contraseña, recuperar cuenta o deshabilitarla revoca sus sesiones conforme al contrato; las temporales exigen cambio.
5. Cookies de cuenta e invitado son separadas; el cliente no puede elevar rol declarando un campo o usando la cookie equivocada.
6. El alta de administradores ocurre por CLI local y permite varias cuentas; no existe endpoint público de alta administrativa.

## Evolución y límites

El mínimo 15 y el índice de administrador único de 007 fueron sustituidos por los cambios 3.15–3.17 (spec 53). No hay SMTP, verificación de correo ni registro público.

## Detalle y trazabilidad

- [Guía de referencia](../../guias/identity.md).
- [Spec original](../../../factory/jobs/007-cuentas-dm/spec.md), [construcción](../../../factory/jobs/007-cuentas-dm/build.md) y [decisión](../../../factory/jobs/007-cuentas-dm/decision.md).
- [Plan y validación](plan.md).
- [Estado y decisiones transversales](../../estado-actual.md).

Estos criterios consolidan comportamiento existente; no son una certificación nueva ni autorizan ampliar el alcance. Para un cambio posterior, crear una spec incremental y enlazar esta dependencia.
