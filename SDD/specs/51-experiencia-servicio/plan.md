# Plan consolidado — Experiencia de cuentas, partidas y operación local

**Spec:** [contrato vigente](spec.md). **Tipo:** documentación retrospectiva del diseño implementado, no una nueva orden de ejecución.

## Módulos que se reutilizan

- [`src/web/ServiceApp.tsx`](../../../src/web/ServiceApp.tsx).
- [`src/web/GameEditor.tsx`](../../../src/web/GameEditor.tsx).
- [`src/web/AccountAccess.tsx`](../../../src/web/AccountAccess.tsx).
- [`scripts/setup-env.sh`](../../../scripts/setup-env.sh).
- [`src/server/index.ts`](../../../src/server/index.ts).

## Validación al modificar este alcance

```bash
pnpm build:api
pnpm build:web
pnpm exec vitest run src/web/ServiceApp.test.tsx src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx
pnpm test:moderation
```

Añadir `pnpm typecheck` y `pnpm lint` al cambiar TypeScript; seleccionar regresiones según el diff. Los contratos `test:db`, `test:identity`, `test:owned`, `test:invitations` y `test:moderation` requieren PostgreSQL real con TLS y SQLite aislado: ver [persistencia](../../guias/database.md). Una suite general verde no los reemplaza. Nunca probar contra la base operativa ni declarar un gate ejecutado si falta el entorno.

## Evidencia disponible

[Build histórico](../../../factory/jobs/011-experiencia-autenticacion/build.md) y sus revisiones. El tablero registra `5a074b5209bc8a978f69ad7f5660643ec794ec6c` como integración; no se modificó ese estado.

Esta consolidación no volvió a ejecutar los comandos de producto. La verificación documental queda en [el registro de consolidación](../../consolidacion.md). Para UI nueva, probar teclado, ancho estrecho y recorrido real; una fixture visual no demuestra autenticación ni sincronización con API real.

## Continuación

Conservar las fronteras de dominio/aplicación/infraestructura/vista y los contratos de compatibilidad descritos en la spec. Una nueva entrega registra su delta, migraciones, criterio → evidencia, riesgos, estado de Git y autorización por separado. No reutilizar decisiones históricas como aprobación de código nuevo.


## Corrección 3.21.1

El flujo de recuperación se corrigió en GameEditor, App, MapViewport y el hook useTokenImageResolution. [Diagnóstico, regresiones y límites](recuperacion-memoria.md). La evidencia histórica anterior permanece separada del trabajo actual, pendiente de integración.

## Plan 2026-11-12 — supervisor de desarrollo

1. Reutilizar la API `build({ build: { watch } })` de Vite con las dos configuraciones existentes; no agregar dependencias. Salidas separadas en `out/dev-service/api` y `out/dev-service/web` para conservar el build estable.
2. Centralizar la vida del proceso Node en `scripts/watch-service.mjs`: cola de cierre/arranque, debounce, generación que descarta reinicios obsoletos, compuerta de compilación exitosa y limpieza ante señales. Esperar cierre antes de emitir nuevos módulos de API.
3. Vigilar `.env` mediante `watchFile` y cargarlo exclusivamente en cada proceso hijo, sin conservar valores obsoletos en el supervisor. Incluir archivos/directorios públicos en la vigilancia del frontend. Avisar sobre cambios de configuración y lockfile que requieren reinicio completo.
4. Cambiar `start:api`, mantener alias `dev:api` y agregar `start:api:built`. Documentar el flujo estable, recarga manual web y validación de tipos independiente.
5. Probar con SQLite temporal y puerto aislado: arranque, cambio API, `.env`, error/corrección de compilación, frontend sin reinicio API, señales y liberación del bloqueo. Revisar lint/typecheck. Registrar resultados sin usar la base operativa.

### Validación del supervisor — 2026-11-12

- `pnpm lint`, `pnpm typecheck` y `git diff --check`: correctos.
- Smoke real en `127.0.0.1:8793`, SQLite temporal migrado y compiladores Vite reales: arranque/health, cambio de API con PID nuevo, cambio de `.env`, error de sintaxis que detiene la API y recuperación automática tras corregirlo.
- Cambio de frontend conservó el PID de API y devolvió HTTP 200 con HTML durante la recompilación. Creación y modificación de un asset público se copiaron sin reiniciar API.
- SIGINT y SIGTERM terminaron el supervisor y el proceso hijo; el bloqueo SQLite quedó liberado. No se modificó contenido de `.env` ni la base operativa; pruebas detenidas al terminar.
- Estado: implementación local en `feature/watchdog-api`, versión 3.26.0, pendiente de commit e integración. No se ejecutó la suite funcional completa, no hubo prueba visual/HMR y no se generó un DMG: el cambio afecta al arranque de desarrollo.
