# Plan consolidado — Cabecera compacta compartida

**Spec:** [contrato vigente](spec.md). **Tipo:** documentación retrospectiva del diseño implementado, no una nueva orden de ejecución.

## Módulos que se reutilizan

- [`src/web/HeaderDropdown.tsx`](../../../src/web/HeaderDropdown.tsx).
- [`src/web/ServiceApp.tsx`](../../../src/web/ServiceApp.tsx).
- [`src/web/GameEditor.tsx`](../../../src/web/GameEditor.tsx).
- [`src/renderer/src/components/workspace/WorkspaceHeader.tsx`](../../../src/renderer/src/components/workspace/WorkspaceHeader.tsx).
- [`src/renderer/src/components/workspace/workspace.css`](../../../src/renderer/src/components/workspace/workspace.css).

## Validación al modificar este alcance

```bash
pnpm exec vitest run src/web/HeaderDropdown.test.tsx src/web/ServiceApp.test.tsx src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx src/renderer/src/components/workspace/WorkspaceChrome.test.tsx
pnpm build:web
```

Añadir `pnpm typecheck` y `pnpm lint` al cambiar TypeScript; seleccionar regresiones según el diff. Los contratos `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` requieren PostgreSQL real con TLS y SQLite aislado: ver [persistencia](../../guias/database.md). Una suite general verde no los reemplaza. Nunca probar contra la base operativa ni declarar un gate ejecutado si falta el entorno.

## Evidencia disponible

El CHANGELOG y las pruebas presentes documentan la implementación local; no existe una aprobación de fábrica específica de estos cambios.

Esta consolidación no volvió a ejecutar los comandos de producto. La verificación documental queda en [el registro de consolidación](../../consolidacion.md). Para UI nueva, probar teclado, ancho estrecho y recorrido real; una fixture visual no demuestra autenticación ni sincronización con API real.

## Continuación

Conservar las fronteras de dominio/aplicación/infraestructura/vista y los contratos de compatibilidad descritos en la spec. Una nueva entrega registra su delta, migraciones, criterio → evidencia, riesgos, estado de Git y autorización por separado. No reutilizar decisiones históricas como aprobación de código nuevo.
