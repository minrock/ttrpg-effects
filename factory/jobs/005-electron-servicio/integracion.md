# Integración de la serie 001–005

Fecha: 2026-10-29. Autorizada por la orden explícita `$factory aprobar`. Las cinco decisiones técnicas son APROBAR y sus últimas cuatro revisiones están aprobadas. La última congelación contiene 529 huellas coincidentes; 1176 pruebas satisfactorias y checks/builds documentados en build.md.

Se prepara un único commit de la serie acumulada en feature/fabrica-software, con integración por avance rápido a main y DMG 3.6.0. Sin push ni despliegue. La fábrica inicial también forma parte del alcance solicitado.

## Revisión del índice

El índice se preparó con rutas explícitas contrastadas contra el manifiesto congelado y los expedientes de fábrica, sin rutas ajenas. La comprobación completa `git diff --cached --check` señaló 840 espacios de contexto en los diffs archivados dentro de revision.md y una línea vacía final en src/shared/api/ttrpg-api.ts. Se conserva la evidencia inmutable y el código aprobado: son avisos de formato, no fallos funcionales. La comprobación del resto con `git -c core.whitespace=-blank-at-eof diff --cached --check -- . ":(exclude)factory/jobs/**/revision.md"` pasó. No se omite ningún fallo de tests o compilación.

Estado: integración y empaquetado en ejecución; resultado final pendiente.
