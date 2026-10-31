# Integración de la serie 001–005

Fecha: 2026-10-29. Autorizada por la orden explícita `$factory aprobar`. Las cinco decisiones técnicas son APROBAR y sus últimas cuatro revisiones están aprobadas. La última congelación contiene 529 huellas coincidentes; 1176 pruebas satisfactorias y checks/builds documentados en build.md.

Se prepara un único commit de la serie acumulada en feature/fabrica-software, con integración por avance rápido a main y DMG 3.6.0. Sin push ni despliegue. La fábrica inicial también forma parte del alcance solicitado.

## Revisión del índice

El índice se preparó con rutas explícitas contrastadas contra el manifiesto congelado y los expedientes de fábrica, sin rutas ajenas. La comprobación completa `git diff --cached --check` señaló 840 espacios de contexto en los diffs archivados dentro de revision.md y una línea vacía final en src/shared/api/ttrpg-api.ts. Se conserva la evidencia inmutable y el código aprobado: son avisos de formato, no fallos funcionales. La comprobación del resto con `git -c core.whitespace=-blank-at-eof diff --cached --check -- . ":(exclude)factory/jobs/**/revision.md"` pasó. No se omite ningún fallo de tests o compilación.

## Resultado final

- Commit de integración: `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Avance rápido de `feature/fabrica-software` a `main`, sin conflictos.
- `./scripts/build-dmg.sh`: salida 0; typecheck, compilación y electron-builder correctos. Log local: `/tmp/ttrpg-3.6.0-dmg.log`.
- DMG: `dist/TTRPG Effects-3.6.0-arm64.dmg`, 149414812 bytes.
- SHA-256: `9f0123da40493235e9044e26cea8eba655f1a1952fdbccb71dd98a1be87b6415`.
- `hdiutil verify`: salida 0, checksum VALID. Log local: `/tmp/ttrpg-3.6.0-dmg-verify.log`.
- Paquete arm64 para uso personal/interno, sin firma Developer ID, según configuración existente. No se instaló ni desplegó. Sin push.
- Tablero y backlog marcan las cinco specs integradas tras el éxito del empaquetado. Estos registros posteriores al commit se conservan como cambios locales, conforme a la skill, sin crear un commit adicional por iniciativa propia.
