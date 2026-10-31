VEREDICTO: APROBADO

# Revisión UX — 012, ciclo 1, ronda 1

Fecha: 2026-10-31. Checkout: `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects`.

## Alcance y evidencia independiente

Leídos el perfil UX, AGENTS.md, solicitud, spec, build, coordinación, identidad/diff de la ronda y manifiestos de huellas. Revisados los archivos reales `package.json`, `pnpm-lock.yaml`, `CHANGELOG.md`, el flujo documentado de instalación/compilación y `scripts/build-dmg.sh`. No se consultaron informes de otros revisores.

Comparación SHA-256 ejecutada en esta revisión: las 618 entradas de `ronda-1/huellas.json` coinciden; frente a las 618 de `base-archivos.json` solo difieren los tres archivos autorizados. Frente a 009, 613/616 entradas coinciden. Se comprobó que las copias `.before` conservadas por el constructor tienen exactamente los hashes de ambas bases; el diff calculado directamente contra esas copias confirma únicamente la versión 3.11.1, Vite directo 7.3.3, tres líneas del importer y la nueva entrada del changelog. Se preservan scripts, fuentes, pruebas, vistas y documentación funcional.

## Flujo operativo y resultado

No hay hallazgos UX que requieran corrección. Los comandos documentados siguen siendo los mismos: instalar con pnpm y compilar Electron, API y web. La dependencia directa crea el ejecutable que los scripts API/web ya invocaban, eliminando el fallo de arranque del compilador sin exigir instalación global, reparación manual de enlaces ni nuevos pasos al operador. El changelog identifica el bugfix y la versión 3.11.1; el script de DMG sigue leyendo la versión del manifiesto.

Se ejecutó independientemente `pnpm exec vite --version`, con salida `vite/7.3.3 darwin-arm64 node-v24.15.0` y código 0. Se inspeccionó el shim actual: invoca `../vite/bin/vite.js`, resuelto dentro del `node_modules/.pnpm` de este checkout. La resolución local coincide con el importer fijado.

Se inspeccionaron los registros originales en `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-012-wqflzqsu`: `isolation.json`, `install-result.json`, `install.log`, `gates.json`, `gates-retry.json` y logs de typecheck, lint, pruebas y los tres builds. La evidencia del constructor acredita ausencia previa de instalación/salidas, instalación frozen exit 0 y lockfile sin cambios; los seis gates terminan correctamente tras la repetición íntegra de tests (129 archivos, 1206 pruebas). API y web generan salidas sin el error de ejecutable ausente. El intento inicial fallido se conserva y está explicado en build.md, separado del resultado exitoso; no se confunde con una primera pasada verde.

## Impacto y límites

No se modifican flujos de mesa, Escape/Delete, foco, teclado, cámara, bloqueo de escala, estados vacíos/carga/error ni privacidad DM/jugador. Su ausencia de cambios queda respaldada por la identidad de las fuentes, no por una nueva comprobación interactiva. No corresponde inventar QA visual ni requerir pantallas para este bug de herramientas.

Esta revisión no repitió instalación, suite completa, builds, contratos multi-DB ni pruebas manuales de Electron; evaluó los registros del constructor y realizó sus propias comprobaciones de hashes, diff y ejecutable local. DB32/identidad25/propiedad46/invitaciones36 siguen siendo evidencia heredada de 009, no ejecuciones de UX ni nuevas de 012. No se utilizaron PostgreSQL ni servicios privados. DMG y validación del instalable quedan para el cierre de integración previsto, después de aprobación y merge autorizado.

La aprobación se limita al alcance UX/operativo de 012; no equivale a autorización para escribir historial Git ni integrar.
