# Spec 40 — Implementación y verificación

## Resultado

2026-10-28. Implementada en `feature/fabrica-software`, versión `3.1.0`. Skill local, siete perfiles TOML de Codex, tablero autónomo, cola vacía y documentación en español. Los expedientes se crean al ejecutar un trabajo; la demostración visual no modifica el estado persistente.

## Verificación

- `pnpm typecheck` y `pnpm lint`: sin errores.
- `pnpm test`: 108 archivos y 998 pruebas aprobadas, incluidas siete del tablero con Vitest y jsdom.
- Las pruebas del tablero cubren tarjetas/veredictos, Markdown inerte, rechazo de rutas y rondas inválidas, recuperación ante errores, documentos atrasados, estado vacío/404, sondeo automático y demostración sin solicitudes al tablero real.
- `pnpm build`: completado. Avisos del bundler sobre directivas `use client` en dependencias Radix/lucide; no impiden el build. jsdom avisa que no implementa canvas en una prueba existente.
- Validador de skills: aprobado. Siete perfiles TOML parseados y enlace local de la skill verificado.
- Navegador local: ejemplo, apertura de expediente, selección de revisión, Escape con retorno de foco y regreso al tablero real vacío. Inspección visual en panel estrecho; a 1440 px se comprobaron las siete columnas y ausencia de desbordamiento horizontal del documento mediante geometría DOM.
- Evaluación independiente del flujo con subagente: espera de cuatro informes, límite de dos rondas, permisos de Git, recuperación tras pérdida de sesión y avance de main. Se corrigió el archivado de decisiones al iniciar cualquier ciclo nuevo.

## Estado de entrega

Cambios preparados sin staging, commit, push ni merge. El DMG corresponde al cierre posterior a la orden de integrar, según `AGENTS.md`. No se ha ejecutado un trabajo de producto completo con la nueva skill; la validación del ciclo fue documental y por escenarios, sin simular integraciones reales.
