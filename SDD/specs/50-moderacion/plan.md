# Plan consolidado — Moderación y transporte por apertura

**Spec:** [contrato vigente](spec.md). **Tipo:** documentación retrospectiva del diseño implementado, no una nueva orden de ejecución.

## Módulos que se reutilizan

- [`src/application/services/moderation.ts`](../../../src/application/services/moderation.ts).
- [`src/server/moderation-http.ts`](../../../src/server/moderation-http.ts).
- [`src/server/moderation-backend.ts`](../../../src/server/moderation-backend.ts).
- [`src/web/Participants.tsx`](../../../src/web/Participants.tsx).

## Validación al modificar este alcance

```bash
pnpm build:api
pnpm test:moderation
```

Añadir `pnpm typecheck` y `pnpm lint` al cambiar TypeScript; seleccionar regresiones según el diff. Los contratos `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` requieren PostgreSQL real con TLS y SQLite aislado: ver [persistencia](../../guias/database.md). Una suite general verde no los reemplaza. Nunca probar contra la base operativa ni declarar un gate ejecutado si falta el entorno.

## Evidencia disponible

[Build histórico](aceptacion-historica.md) y sus revisiones. El registro histórico conserva `ae5c654f74962b1f6c8de18055d87f9192d1f9ce` como integración. La fábrica se retiró el 2026-11-13; esta evidencia no se volvió a ejecutar.

Esta consolidación no volvió a ejecutar los comandos de producto. La verificación documental queda en [el registro de consolidación](../../consolidacion.md). Para UI nueva, probar teclado, ancho estrecho y recorrido real; una fixture visual no demuestra autenticación ni sincronización con API real.

## Continuación

Conservar las fronteras de dominio/aplicación/infraestructura/vista y los contratos de compatibilidad descritos en la spec. Una nueva entrega registra su delta, migraciones, criterio → evidencia, riesgos, estado de Git y autorización por separado. No reutilizar decisiones históricas como aprobación de código nuevo.
