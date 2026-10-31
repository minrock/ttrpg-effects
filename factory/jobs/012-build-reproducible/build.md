# Build 012 — ciclo 1, entrega para revisión

Inicio: 2026-10-30. Verificación y publicación: 2026-10-31. Tipo: bugfix de herramientas. Versión final **3.11.1**, un único incremento patch desde 3.11.0.

Checkout exclusivo: `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects`. Rama comprobada `feature/integracion-006-009`; HEAD `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Se aplica la excepción expresa de solicitud/coordinación a crear otra rama. Se leyeron AGENTS, perfil constructor, skill factory, README, contrato factory, solicitud/spec/coordinación 012 y evidencia/decisión de 009 e integración.

## Resultado y archivos afectados

- `package.json`: versión 3.11.1 y dependencia directa de desarrollo `vite: "7.3.3"`.
- `pnpm-lock.yaml`: exactamente tres líneas añadidas al importer raíz; specifier 7.3.3 y resolución existente `7.3.3(@types/node@24.12.4)(jiti@2.7.0)`. Sin cambios en packages, snapshots, integridades ni otras versiones.
- `CHANGELOG.md`: entrada 3.11.1 fechada 2026-10-30 de tipo bugfix; contenido anterior íntegro.

Único informe escrito en el expediente: este `build.md`, publicado mediante temporal y renombrado atómico. No se modificaron fuentes, pruebas, assets, scripts, configuraciones de compilación, escenas ni documentación funcional. No hacen falta pruebas nuevas que repliquen el manifiesto.

## Aislamiento real y evidencia

Directorio de evidencia: `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-012-wqflzqsu`. Los nombres de logs de este informe son relativos a ese directorio. Antes de editar se verificaron **616/616** SHA-256 de `../009-invitaciones-jugadores/ronda-1/huellas.json` (`before.json`). Se conservaron copias de los tres archivos originales y el diff exacto contra 009 en `product.diff`.

Antes de instalar se movieron completos los antiguos `node_modules` y `out` del checkout a `node_modules.previous` y `out.previous` dentro de la carpeta externa de evidencia. Una aserción confirmó que ambas rutas habían dejado de existir en el checkout (`isolation.json`). Así la instalación nueva no pudo heredar enlaces/shims ni artefactos compilados previos. No se tocó el checkout original ni 010. pnpm reutilizó la caché de 601 paquetes, admitida por la spec; recreó sus enlaces y ejecutables locales con el linker existente, sin configuración global nueva ni hoisting especial.

Entorno comprobado: **Node v24.15.0, pnpm 11.1.2, macOS arm64**. `pnpm install --frozen-lockfile` terminó con código 0 en 2.48 s. SHA-256 del lockfile antes/después de instalar y después de los gates: `2b65a1d86a7bcb43844a9ecd9465d1e13615ad80821999a25ed22a2eaf06c3fc`.

`pnpm exec vite --version` terminó con código 0: `vite/7.3.3 darwin-arm64 node-v24.15.0`. El shim recién generado `node_modules/.bin/vite` llama `../vite/bin/vite.js`, cuyo destino real es `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects/node_modules/.pnpm/vite@7.3.3_@types+node@24.12.4_jiti@2.7.0/node_modules/vite/bin/vite.js`. Se comprobaron existencia, contenido y resolución local; no se creó un shim manual ni se recurrió a Vite global. Evidencia: `vite-local.log`.

## Criterios → comprobación propia

| Criterio de spec | Evidencia propia de 012 |
| --- | --- |
| 1. Manifiesto coherente | `product.diff` muestra solo los tres cambios previstos. Aserción byte a byte: retirar las tres líneas nuevas del importer reproduce el lockfile 009 completo. |
| 2. Instalación realmente nueva | `isolation.json`, `install.log`, `install-result.json`: ausencia previa de node_modules/out, instalación frozen exit 0, lockfile idéntico antes/después. |
| 3. Ejecutable local | `vite-local.log`: shim generado por pnpm, destino dentro del checkout, versión 7.3.3 y exit 0. |
| 4. Gates nuevos | Tabla siguiente y `gates.json`/`gates-retry.json`; los seis gates completados en la misma instalación. `artifacts.json` conserva tamaño y SHA-256 de nueve entradas compiladas Electron/API/web. |
| 5. Producto preservado | `product-verification.json`: 613/616 archivos sin cambio y exactamente package.json, lockfile y changelog diferentes. Comparación repetida tras los builds con el mismo resultado; todas las fuentes, pruebas, assets/configuraciones intactas. Formato de escena 2 y lector legado 1 conservados en `src/domain/sessions/scene-document.ts`. |
| 6. Trazabilidad | Resultados propios en este informe; multi-DB heredado atribuido abajo. Versión 3.11.1 y cero escrituras Git del constructor. |

## Comandos y resultados propios

Todos los comandos se ejecutaron desde el checkout exclusivo con la instalación nueva. Los builds incluyen de nuevo su typecheck según scripts existentes; no se suman como pruebas nuevas.

| Comando | Resultado | Log |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | exit 0, 2.48 s; 601 paquetes, lock intacto | `install.log` |
| `pnpm exec vite --version` | exit 0, Vite 7.3.3 local | `vite-local.log` |
| `pnpm typecheck` | exit 0, 7.61 s | `typecheck.log` |
| `pnpm lint` | exit 0, 5.91 s | `lint.log` |
| `pnpm test`, primer intento | exit 1, 1846.42 s de pared; 4 fallos de tiempo y 2 workers fallidos; 1186 pruebas pasaron, 4 fallaron; 127 archivos ejecutados | `test.log` |
| `pnpm test`, repetición completa | exit 0, 14.88 s de pared (Vitest 14.38 s); **129 archivos, 1206/1206 pruebas** | `test-retry.log` |
| `pnpm build` | exit 0, 13.59 s; main/preload/renderer nuevos | `build.log` |
| `pnpm build:api` | exit 0, 8.34 s; API y CLI nuevos | `build-api.log` |
| `pnpm build:web` | exit 0, 13.04 s; cliente web nuevo | `build-web.log` |

Artefactos verificados: `out/main/index.js`, `out/preload/index.cjs`, `out/renderer/index.html`, `out/api/index.mjs`, `out/api/db-migrate.mjs`, `out/api/identity-cli.mjs`, `out/api/data-cli.mjs`, `out/api/invitation-invalidate.mjs` y `out/web/index.html`. API/web usan Vite 7.3.3 y ya no presentan `vite: command not found`.

## Incidencia de ejecución y límites

La primera suite comenzó a las 07:09:31 UTC−5. El registro real `pmset -g log`, guardado en `power-context.log`, muestra suspensión a las 07:09:45, DarkWake a las 07:25:28, nueva suspensión a las 07:25:30 y despertar a las 07:40:16. Esas suspensiones explican el salto de tiempo y son consistentes con los timeouts de cuatro pruebas y dos workers. Antes de repetir, la inspección de procesos (`retry-context.log`, 12:45:32 UTC) no encontró Vitest/procesos de este checkout residuales. Se repitió íntegramente la misma suite sin modificar producto, timeout, paralelismo ni seleccionar pruebas. Los 1206 casos pasaron. Se conserva el fallo original; no se presenta como una ejecución exitosa ni se suman ambas pasadas.

Durante preparación/verificación, dos aserciones auxiliares fallaron por supuestos del script de evidencia: buscar una única etiqueta vitest en todo el lockfile (también aparece en snapshots) y esperar preload `.js` (la configuración produce `.cjs`). Se acotó la edición al primer importer y se comprobó el artefacto real `.cjs`; no requirió cambios adicionales de producto ni ocultó fallos de gates.

Avisos no fatales: canvas/getContext no implementado en jsdom; directivas `use client` de dependencias ignoradas al empaquetar; chunks web mayores de 500 kB. No se cambiaron dependencias o límites para silenciarlos. No se hizo inspección visual, smoke interactivo de Electron, proyección física, despliegue ni DMG; este cambio solo afecta declaración del toolchain. El DMG corresponde al integrador después de las revisiones/aprobación y merge autorizado.

## Evidencia heredada y cierre

Los contratos **DB 32, identidad 25, propiedad 46 e invitaciones 36** en SQLite/PostgreSQL pertenecen a [build 009](../009-invitaciones-jugadores/build.md) y su [decisión](../009-invitaciones-jugadores/decision.md). Se heredan por identidad SHA-256 de todas sus fuentes/configuraciones/pruebas; **no se ejecutaron de nuevo en 012**. No se inició ni se utilizó PostgreSQL reservado a 010, ni servicios/configuración/datos privados.

Ciclo 1: corregida la ausencia de dependencia directa de Vite, instalación y gates completados, sin hallazgos de revisión todavía. Producto congelado a la espera del orquestador. **Sin staging, commit, merge, push ni otras escrituras Git del constructor**. La integración y su autorización son responsabilidad del integrador tras cuatro revisiones y decisión; no se infiere aprobación de este build.
