# Integración local — 011, experiencia de autenticación

Fecha: 2026-10-31. Estado: producto integrado localmente en main y DMG 3.13.0 arm64 construido y verificado. Pendiente cierre documental por el orquestador; el retorno del checkout habitual y corte operativo son etapas separadas.

## Autorización y aceptación

La solicitud del usuario autoriza cierre local en main y servicio preparado, sin push. Se aplica integracion-solicitud.md. Ronda 4/ciclo 2 finalizada con los cuatro informes APROBADO y decisión APROBAR; la aceptación técnica se conserva íntegra. Este integrador recuperado trabaja desde esos archivos, no afirma haber reanudado al agente perdido.

Origen canónico: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Destino: `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects`. Main comprobado intacto en `73b8e6de21af74912d23399f1b99f3c1112ade91` antes de crear `feature/factory-011-experiencia-autenticacion` desde esa base.

## Transferencia exacta

Se comprobaron las 655 huellas SHA-256 de ronda 4 en origen antes de copiar. Las únicas diferencias de producto respecto del destino/main son exactamente las 69 rutas enumeradas en ronda-4/revision.md; no hay eliminaciones. Se copiaron exclusivamente esas rutas y los 34 archivos del expediente 011. El preflight existente coincide byte a byte y se conservó sin sobrescribirlo. Se comprobaron nuevamente las 655 huellas en origen y destino después de la transferencia: cero discrepancias.

Agregado de las 69 rutas, ordenadas y codificadas como `SHA256  ruta\n`: `2fd869408ca0d697252bbb6935487192946533b665d1b3de07ceb6222f0dfed0`. Versión de package.json: 3.13.0. Entorno: Node 24.15.0, pnpm 11.1.2.

No se transfirieron configuración privada, datos, .local, node_modules ni salidas de compilación. No se modificó producto ni Git del origen, API 8787 ni el checkout habitual. Board/backlog corresponden exclusivamente al orquestador. La evidencia funcional de 1250 pruebas, contratos de motores, recorridos reales y tres builds pertenece al constructor y revisores; no se atribuye a esta transferencia.

## Secuencia acordada antes de integrar

Antes de staging se comprobará el alcance explícito y el estado coherente del tablero/cola. El commit local se avanzará a main con --ff-only y después se ejecutará `./scripts/build-dmg.sh`. El resultado, Info.plist, hdiutil, tamaño y SHA-256 se registrarán aquí con valores reales. Si falla el empaquetado se conservará el SHA integrado sin repetir merge. No se hará push.

## Comprobaciones de preparación

`git diff --check` contra main, excluyendo únicamente los diffs históricos de revisiones, identifica una línea vacía nueva al final de `.env.example:18`. Es parte del contenido aprobado y se conserva sin arreglos de producto del integrador. Se comunicó al orquestador antes de commit; no se declara ese check como PASS. El alcance de estado está limitado a las 69 rutas de producto y registros 011, con índice vacío y sin archivos privados rastreados.

El orquestador copió board/backlog coherentes con etapa integración y dio orden explícita de commit local, avance rápido de main y DMG. Confirmó conservar el EOF inocuo de `.env.example` aprobado; los espacios de los diffs históricos quedan igualmente intactos. `pnpm install --frozen-lockfile`: PASS, lockfile sin cambios.

## Resultado real de integración y DMG

Commit local de producto y expediente: `5a074b5209bc8a978f69ad7f5660643ec794ec6c`, creado en feature/factory-011-experiencia-autenticacion. Staging explícito de 103 rutas modificadas, con las 69 huellas de producto contrastadas también en el índice; backlog estaba idéntico y no generó diff. Main avanzó desde `73b8e6de21af74912d23399f1b99f3c1112ade91` mediante `git merge --ff-only`. Sin push.

`./scripts/build-dmg.sh`: PASS, salida 0, ejecutado después del merge. Incluyó typecheck y compilación Electron/Vite; empaquetado Electron 39.8.10 arm64. Log: `/tmp/ttrpg-011-integracion-dmg.log`. Advertencias conocidas: directivas use client ignoradas, chunks grandes, author ausente, dependencias esbuild opcionales de otras plataformas y deprecación del empaquetador; firma omitida según configuración identity:null. No se afirma distribución firmada/notarizada ni validación x64.

- DMG: `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects/dist/TTRPG Effects-3.13.0-arm64.dmg`.
- Tamaño: **152633363 bytes**.
- SHA-256: `616da698a36755e3228433bb13d1bf8e9e11423bf8995a72eacc92af92a6e19f`.
- `hdiutil verify`: **VALID**, CRC32 `060A6F3D`, salida 0.
- Imagen montada únicamente en lectura y sin abrir Finder; Info.plist interno y bundle de dist concuerdan: CFBundleShortVersionString y CFBundleVersion **3.13.0**, identificador `com.luismoncaris.ttrpg-effects`. Ejecutable Mach-O 64-bit arm64. Imagen desmontada correctamente.

Las 655 huellas coinciden nuevamente en origen/destino después del merge y compilación; producto aprobado intacto. `git diff --check` efectivo mantiene exclusivamente el EOF aprobado fuera de diffs históricos; deshabilitar solo la regla blank-at-eof para ese diagnóstico da salida 0, sin cambios de configuración persistente ni producto. El informe presente es el único cambio documental propio posterior al commit y espera autorización final junto al estado del tablero/cola. No se repitieron suites funcionales ya aceptadas sobre las mismas huellas.

No se modificaron Git/producto fuente, checkout habitual, API 8787, datos/configuración privada ni tablero/cola. El orquestador conserva el cierre operativo y la actualización final del tablero. No quedan procesos ni montajes propios abiertos.
