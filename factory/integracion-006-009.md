# Integración 006–009 — verificación previa

Informe inicial: 2026-10-30. Estado histórico de la primera verificación: detenida antes de commit/merge por un fallo reproducible de build API/web en instalación limpia. No hay SHA de integración ni DMG nuevo; main continúa en e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3.

## Alcance y recuperación exacta

Autorización: factory/integracion-006-009-solicitud.md. Integración conjunta del producto acumulado 3.11.0 (prerrequisito 3.7.0 y trabajos 006–009). No se inventan commits de estados intermedios. Las últimas rondas son 006/ronda-2, 007/ronda-1, 008/ronda-4 y 009/ronda-1: 16 informes APROBADO y cuatro decisiones APROBAR comprobados.

Huellas009 y base010 contienen el mismo conjunto de 616 archivos. La fuente tiene 19 versiones posteriores de010; constructor010 recuperó versiones anteriores en una carpeta externa, sin alterar el checkout. Integración comprobó por separado cada SHA contra ronda-1/huellas.json: 616/616 exactos, 19 recuperados y 597 tomados de fuente. SHA256 del manifiesto009: bc44a98465b5a3a6b3a76366ea254a43a22c15c6d79d16649f776d838af03342. Recuperación: /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-pre010-recovered-w5czz__w, con verification.json.

Checkout separado: /Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects. Rama feature/integracion-006-009 creada desde main e1fd3ee, misma base de revisión. Copiados únicamente los 616 archivos aprobados, expedientes006–009, cierre005 heredado y solicitud de integración. El orquestador preparó board/backlog en etapa integración. No se copiaron producto/expedientes010–011, .env privado, datos ni buildoutputs. Dependencias se instalaron de nuevo. No se modificaron los checkouts fuente/original, sus servicios ni configuración.

## Checks propios del destino

Node v24.15.0; pnpm 11.1.2. Logs en /tmp/ttrpg-integration009-*.log.

- pnpm install --frozen-lockfile: exit0 (install.log).
- pnpm typecheck: exit0 (typecheck.log).
- pnpm lint: exit0 (lint.log).
- pnpm test: exit0, 129 archivos/1206 pruebas, 22.73 s (test.log). Avisos conocidos canvas/jsdom.
- pnpm build: exit0, Electron/main/preload/renderer compilados (build.log).
- pnpm build:api: exit1 tras typecheck, sh: vite: command not found (build-api.log).
- pnpm build:web: exit1 tras typecheck, sh: vite: command not found (build-web.log).

No se abrió ni reutilizó PostgreSQL reservado a010. Los gates finales009 del mismo producto se comprobaron en logs y se atribuyen al constructor/revisores: DB32, identidad25, propiedad46 e invitaciones36, en SQLite/PostgreSQL real. No equivalen a nuevas ejecuciones de integración.

## Impedimento concreto y siguiente acción

El package.json aprobado usa el comando vite en build:api/build:web/dev:web, pero no declara vite como dependencia directa. Lockfile registra vite7.3.3 transitivo/peer de electron-vite y vitest. La instalación limpia no expone node_modules/.bin/vite. La instalación de origen conserva un shim anterior (2026-10-29); allí pnpm exec vite --version responde7.3.3. Ambos .modules.yaml registran pnpm11.1.2, nodeLinker isolated, hoistPattern[*], publicHoistPattern[], sin .npmrc de proyecto ni configuración distinta documentada. El fallo no se resuelve recurriendo al entorno viejo como prueba de reproducibilidad.

No se creó shim manual, no se alteró package/lockfile ni se ocultaron los fallos. El orquestador indicó corrección de manifiesto por constructor y revisiones explícitas de integración antes de merge. Se requiere esa evidencia para continuar; no se marca integrado. Rama/destino quedan recuperables, sin staging ni commits. El producto aprobado conserva todavía las616huellas exactas; los cambios010 permanecen intactos en su checkout.

## Reanudación aprobada — 2026-10-31

012 corrigió el manifiesto mediante Vite7.3.3 directo, tres líneas del importer y bump patch3.11.1/changelog. Cuatro revisiones APROBADO y decisión APROBAR en ciclo1/ronda1. Integración comprobó de nuevo618/618huellas012 exactas antes de preparar el índice; frente a009 solo difieren los tres archivos autorizados. main sigue en la basee1fd3ee. No existe producto010/011 en el checkout de destino.

Instalación realmente nueva y seis gates de012 verificados en logs originales del constructor: typecheck/lint, suite129archivos/1206tests y buildsElectron/API/web terminan exit0. La primera ejecución de tests sufrió timeouts/workers durante suspensión del equipo; evidencia y reintento íntegro sin cambios se conservan en build012. No se repiten los gates sin una causa nueva. Los checks propios iniciales de integración y sus fallos deVite permanecen arriba como historial, resueltos por012.

Se prepara un único commit del producto acumulado006–009 con prerrequisito3.7 y corrección012, versión final3.11.1, sin inventar estados intermedios.196rutas seleccionadas explícitamente; no git add general. Incluye expedientes aprobados, tablero/cola preparados por orquestador, cierre005 heredado y autorización. La comprobación git diff --cached --check identifica862avisos de espacios en diffs archivados de revision.md, que se preservan como evidencia inmutable; la comprobación sin esos archivos debe pasar antes del commit. Sin fallos funcionales pendientes.

Siguiente paso autorizado: commit local, avance rápido de main y ./scripts/build-dmg.sh; resultado final aún pendiente en esta sección.
