# Plan consolidado — Cuentas administradas y acceso DM

**Spec:** [contrato vigente](spec.md). **Tipo:** documentación retrospectiva del diseño implementado, no una nueva orden de ejecución.

## Módulos que se reutilizan

- [`src/application/services/identity.ts`](../../../src/application/services/identity.ts).
- [`src/application/services/identity-validation.ts`](../../../src/application/services/identity-validation.ts).
- [`src/infrastructure/server/identity`](../../../src/infrastructure/server/identity).
- [`src/server/identity-cli.ts`](../../../src/server/identity-cli.ts).

## Validación al modificar este alcance

```bash
pnpm build:api
pnpm test:identity
```

Añadir `pnpm typecheck` y `pnpm lint` al cambiar TypeScript; seleccionar regresiones según el diff. Los contratos `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` requieren PostgreSQL real con TLS y SQLite aislado: ver [persistencia](../../guias/database.md). Una suite general verde no los reemplaza. Nunca probar contra la base operativa ni declarar un gate ejecutado si falta el entorno.

## Evidencia disponible

[Build histórico](../../../factory/jobs/007-cuentas-dm/build.md) y sus revisiones. El tablero registra `a64b5e9dcf7ba60be28047f890ab7edfecbb82df` como integración; no se modificó ese estado.

Esta consolidación no volvió a ejecutar los comandos de producto. La verificación documental queda en [el registro de consolidación](../../consolidacion.md). Para UI nueva, probar teclado, ancho estrecho y recorrido real; una fixture visual no demuestra autenticación ni sincronización con API real.

## Continuación

Conservar las fronteras de dominio/aplicación/infraestructura/vista y los contratos de compatibilidad descritos en la spec. Una nueva entrega registra su delta, migraciones, criterio → evidencia, riesgos, estado de Git y autorización por separado. No reutilizar decisiones históricas como aprobación de código nuevo.
