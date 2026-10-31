# Integración local 006–009 y corrección 012

Fecha de cierre: 2026-10-31. **Integración y DMG completados.** Versión final **3.11.1**. Commit de producto `a64b5e9dcf7ba60be28047f890ab7edfecbb82df`, incorporado a `main` mediante `git merge --ff-only feature/integracion-006-009`. Sin push, instalación ni despliegue. No se integraron010/011.

## Autorización, aislamiento y alcance

La orden del usuario registrada en [solicitud de integración](integracion-006-009-solicitud.md) autoriza los commits y merge locales006–009; [solicitud012](jobs/012-build-reproducible/solicitud.md) incluye la corrección necesaria de reproducibilidad. El cierre documental también está autorizado. El orquestador mantiene la escritura exclusiva de board/backlog; este integrador no los modificó.

Checkout destino: `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects`. Rama de preparación `feature/integracion-006-009`, creada desde `main`/HEAD `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`, misma base de revisión. main no avanzó durante la preparación, por lo que no hubo reconciliación ni conflictos. Tras el commit se cambió exclusivamente este checkout a main y se realizó el avance rápido. Original `feature/configuracion-env` y fuente010 `feature/factory-006-persistencia-multidb` permanecieron en sus ramas/HEAD originales; no se modificaron sus fuentes, configuración privada, servicios ni datos.

Se integra conjuntamente el producto acumulado del prerrequisito3.7 y los trabajos006–009, con corrección012 y versión final3.11.1. No se inventan commits de estados intermedios no conservados. Se incluyen los expedientes aprobados, el cierre005 heredado y los registros preparados por orquestador; se excluyen producto/expedientes010–011, .env privados, node_modules, datos y buildoutputs del historial.

## Recuperación e identidad aprobada

Las huellas009 y base010 son idénticas:616archivos.010 había modificado19rutas preexistentes. Constructor010 recuperó sus versiones previas exclusivamente fuera del checkout, en `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-pre010-recovered-w5czz__w`, con verification.json. Integración comprobó cada SHA:616/616 exactos,19recuperados y597tomados de fuente. SHA256 del manifiesto009: `bc44a98465b5a3a6b3a76366ea254a43a22c15c6d79d16649f776d838af03342`.

Últimas aprobaciones comprobadas:006/ronda2,007/ronda1,008/ronda4 y009/ronda1, con16informes APROBADO y4decisiones APROBAR.012 añadió cuatro revisiones APROBADO y decisión APROBAR en ciclo1/ronda1. Antes del staging,618/618huellas012 coincidían; frente a009 solo difieren package.json,pnpm-lock.yaml yCHANGELOG.md. Todas las fuentes, pruebas, assets y configuraciones funcionales permanecen idénticas. Después del commit y del build se volvió a verificar: la única diferencia con618huellas es este informe de integración, actualizado expresamente como registro de cierre.

Se prepararon196rutas concretas con git add explícito, sin selección general. `git diff --cached --check` reportó862avisos de espacios en diffs archivados de revision.md; se conservaron intactos como evidencia histórica. El mismo check excluyendo exclusivamente esos revision.md pasó. No hubo errores de formato en producto ni tests funcionales pendientes.

## Verificaciones y corrección del impedimento inicial

Entorno: Node v24.15.0,pnpm11.1.2,macOS arm64. Checks propios iniciales del integrador en destino: instalación frozen exit0,typecheck exit0,lint exit0,129archivos/1206pruebas exit0 (22.73s),buildElectron exit0. Logs `/tmp/ttrpg-integration009-*.log`.

En ese primer intento build:api y build:web fallaron con `vite: command not found`: package.json usaba Vite sin declararlo directamente; instalación antigua conservaba un shim y la nueva no. No se creó un enlace manual ni se ocultó el fallo. Se detuvo la integración antes de commit y se ejecutó012 con constructor y cuatro revisiones independientes.

012 declara Vite7.3.3 directo en devDependencies, añade únicamente tres líneas del importer del lockfile y bump patch/changelog3.11.1. No cambia otras versiones, integridades, snapshots, scripts ni configuración. Su constructor retiró node_modules/out previos, realizó instalación realmente nueva frozen y ejecutó todos los gates. Integración inspeccionó sus registros originales en `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-012-wqflzqsu`: instalación, ejecutable local7.3.3,typecheck,lint,129archivos/1206tests y buildsElectron/API/web exit0. Son pruebas del constructor012 verificadas por el integrador, no nuevas ejecuciones propias.

La primera suite012 sufrió4timeouts y2workers fallidos durante suspensión documentada del equipo. El reintento íntegro, sin cambios de producto ni timeouts, pasó1206/1206. Se conserva el fallo original y su explicación en [build012](jobs/012-build-reproducible/build.md). No se suman pasadas ni se presenta la primera como exitosa.

Contratos DB32,identidad25,propiedad46 e invitaciones36 en SQLite/PostgreSQL son evidencia heredada de009 y sus revisores, corroborada en logs por identidad de fuentes. No se reejecutaron en integración/012 ni se utilizó PostgreSQL reservado a010. Permanecen avisos conocidos de canvas/jsdom,use client y tamaño de chunks; la corrección no los oculta.

## DMG y validación final

- Comando posterior al merge: `./scripts/build-dmg.sh`, exit0. Incluye typecheck,compilaciónElectron y electron-builder. Log: `/tmp/ttrpg-3.11.1-dmg.log`.
- Instalador arm64: `/Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects/dist/TTRPG Effects-3.11.1-arm64.dmg`.
- Tamaño:152683497bytes.
- SHA256: `b55b43276e7bd638ae7b3f5ed7054abd24de8d02a56e1b2581a6edddc368e084`.
- `hdiutil verify`:exit0,checksumVALID. Log: `/tmp/ttrpg-3.11.1-dmg-verify.log`.
- Info.plist del paquete confirma CFBundleShortVersionString y CFBundleVersion3.11.1.

El empaquetador mantuvo la configuración existente sin firma DeveloperID y emitió avisos de author ausente/dependencias opcionales de otras plataformas; terminó correctamente. No se instaló ni ejecutó el paquete con perfil personal, ni se certifica nueva inspección visual/proyección física. Se entrega el instalable local validado por integridad, conservando los límites funcionales aprobados: moderación/SSE010 y experiencia/corte011 siguen pendientes.

El orquestador actualiza board/backlog a integrado solo después de este éxito. El commit documental de cierre conserva estos resultados sin modificar producto; su SHA puede consultarse en el historial posterior al commit de producto citado arriba.
