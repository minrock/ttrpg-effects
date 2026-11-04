# Plan consolidado — Administradores locales y política de contraseñas

**Spec:** [contrato vigente](spec.md). **Tipo:** documentación retrospectiva del diseño implementado, no una nueva orden de ejecución.

## Módulos que se reutilizan

- [`scripts/createsuperuser.mjs`](../../../scripts/createsuperuser.mjs).
- [`src/server/identity-commands.ts`](../../../src/server/identity-commands.ts).
- [`src/application/services/identity-validation.ts`](../../../src/application/services/identity-validation.ts).
- [`src/infrastructure/server/database/migrations.ts`](../../../src/infrastructure/server/database/migrations.ts).

## Validación al modificar este alcance

```bash
pnpm exec vitest run src/server/identity-commands.test.ts src/infrastructure/server/identity/local-admin.test.ts src/infrastructure/server/identity/password.test.ts
pnpm test:identity
```

Añadir `pnpm typecheck` y `pnpm lint` al cambiar TypeScript; seleccionar regresiones según el diff. Los contratos `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` requieren PostgreSQL real con TLS y SQLite aislado: ver [persistencia](../../guias/database.md). Una suite general verde no los reemplaza. Nunca probar contra la base operativa ni declarar un gate ejecutado si falta el entorno.

## Evidencia disponible

El CHANGELOG y las pruebas presentes documentan la implementación local; no existe una aprobación de fábrica específica de estos cambios.

Esta consolidación no volvió a ejecutar los comandos de producto. La verificación documental queda en [el registro de consolidación](../../consolidacion.md). Para UI nueva, probar teclado, ancho estrecho y recorrido real; una fixture visual no demuestra autenticación ni sincronización con API real.

## Continuación

Conservar las fronteras de dominio/aplicación/infraestructura/vista y los contratos de compatibilidad descritos en la spec. Una nueva entrega registra su delta, migraciones, criterio → evidencia, riesgos, estado de Git y autorización por separado. No reutilizar decisiones históricas como aprobación de código nuevo.
