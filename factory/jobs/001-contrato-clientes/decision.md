APROBAR

# Decisión técnica — trabajo 001

Fecha: 2026-10-28. Ciclo 1, ronda 2. Rama `feature/fabrica-software`; base y HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

## Fundamento

Se leyeron AGENTS.md, el perfil del aprobador, solicitud.md, spec.md, build.md, la identidad de ronda y las cuatro revisiones completas de ronda 2. Seguridad, UX, UI y código comienzan con `VEREDICTO: APROBADO`. Ninguna deja hallazgos obligatorios pendientes. No se sustituyeron revisiones ausentes por juicio del aprobador.

La verificación propia de SHA-256 confirmó **466 archivos y cero discrepancias** frente a ronda-2/huellas.json. Rama y HEAD coinciden con la identidad congelada. `git diff --check` pasó. Se contrastaron contratos, reexports, proveedor, versión del preload, documentación de paridad y las correcciones de borrado, cámara y bibliotecas con su código actual. La búsqueda propia de `window.ttrpg` en producción encontró solamente la frontera de ClientProvider.

## Aceptación

- Criterios 1–4: fuente única de contratos sin imports runtime privilegiados, reexports históricos, inyección por raíz con ausencia explícita, precedencia frente al bridge y frontera única. Las pruebas revisadas cubren aislamiento, StrictMode, desuscripción y estabilidad del canvas/dados.
- Criterios 5–6: capacidades representan disponibilidad y mantienen caminos recuperables; versión 3.2.0 derivada de package.json. El constructor y seguridad verificaron el bundle de preload, con 67 métodos y electron como único require.
- Criterios 7–8: se conservan canales, resultados, cancelaciones, privacidad y formato de escena 2 con legado 1. La suite completa incluye persistencia, escenas, enlaces, imágenes e IPC; el humo Electron inicial comprobó bridge, bibliotecas, Player y dados abiertos/ocultos.
- Criterio 9: se conservan disposición, teclado, drawers y controles Player. C1/UI-01/UX-001 quedaron resueltos: borrar áreas es local y mantiene el bloqueo. Código y pruebas comprueban C2, descartando finalizaciones de cámara del cliente previo, y C3, invalidando consultas/imágenes/feedback de bibliotecas. UI confirmó el borrado mediante interacción real sin bridge.
- Criterio 10: labs conservados, matriz documentada para los 67 métodos, README enlazado, versión/changelog y build completos. HTTP, autenticación y servicio remoto siguen explícitamente fuera de alcance.

Checks obligatorios de construcción completos: typecheck, lint, test (**111 archivos / 1018 pruebas**) y build, todos satisfactorios según build.md. Se inspeccionaron los logs finales disponibles de tests y build y concuerdan con esos resultados. Código repitió typecheck/lint y 53 pruebas; seguridad ejecutó 49, UX 58 y UI 11. Son suites solapadas, no se suman como pruebas distintas. Este aprobador no repitió esos comandos ni el humo: distingue esa evidencia de sus verificaciones de identidad, huellas, búsqueda e inspección.

## Riesgos residuales y límites

Los diálogos nativos de selección/cancelación y guardado/carga temporal, reemplazo manual y formulario de biblioteca no se recorrieron en el humo; su respaldo son las suites existentes. La corrección tuvo humo CUA de borrado y no una repetición integral de Electron. Los tamaños fueron viewports emulados, no monitores físicos. Los avisos conocidos de canvas en jsdom no produjeron fallos. Estas limitaciones están declaradas y no constituyen un hallazgo abierto en el alcance de extracción/composición; no se afirma validación manual de recorridos que no se hicieron.

Esta aprobación no certifica seguridad ni funcionamiento HTTP. Capacidades y snapshots locales no sustituyen autorización remota; rutas y recursos requieren la adaptación documentada en trabajos posteriores. La evidencia temporal de /tmp puede desaparecer y sus resultados están resumidos en el expediente.

## Siguiente acción

Registrar aprobación técnica y conservar este trabajo en `necesita-persona` únicamente por la prohibición vigente de integración. Puede comenzar la siguiente dependencia conforme a solicitud.md, en la rama autorizada y preservando estos cambios. No solicitar un merge ya prohibido. No ejecutar staging, commit, push, merge, despliegue ni DMG: una orden explícita posterior del usuario sería necesaria para integrar. Esta decisión no concede esa autorización.

Única salida del aprobador: este decision.md, publicado mediante archivo temporal y renombrado; sin cambios de código, Git, tablero ni otros informes.
