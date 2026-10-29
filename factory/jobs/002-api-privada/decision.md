APROBAR

# Decisión técnica — trabajo 002 API privada

Fecha: 2026-10-28. Ciclo 1, ronda 2. Rama `feature/fabrica-software`; base y HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`.

## Fundamento e identidad

Se leyeron AGENTS.md, el perfil del aprobador, solicitud.md, spec.md, build.md, ronda-2/revision.md y las cuatro revisiones completas de esta ronda. Seguridad, UX, UI y código comienzan con `VEREDICTO: APROBADO`; ninguno deja correcciones pendientes. La dependencia 001 tiene decisión APROBAR. No se sustituyó ningún informe por juicio propio.

La verificación propia confirmó los SHA-256 de **488 archivos, sin divergencias**, tanto al contrastar la entrega como inmediatamente antes de publicar esta decisión. Rama y HEAD coinciden con la identidad congelada. `git diff --check` pasó. Se inspeccionaron directamente router, autenticación, configuración, servicio de escenas, persistencia, validación de registros, decodificación de imágenes, pruebas de regresión y guía HTTP. Sus controles y resultados corresponden a las evidencias de la ronda.

## Aceptación

- **Criterios 1–3:** composición Node independiente, versión/configuración documentadas, autenticación por claves con sesiones de rol derivado, rotación/expiración/logout, cookies, cuotas y validación exacta de Host/Origin. El router exige sesión y rol DM antes de servir las familias privadas; jugador y anónimo no obtienen assets por conocer un ID. Pruebas HTTP y humo compilado respaldan estos recorridos.
- **Criterios 4–6:** escenas CRUD/importación/exportación, tres bibliotecas y plantillas persisten al reiniciar. Se conserva el formato v2 y la migración v1, los mapas y datos privados. El resolver solo admite referencias asset con UUID existente; rutas y URLs importadas quedan como datos ausentes. Upload más PUT recupera imágenes conservando identidad y calibración.
- **Criterios 7–9:** el upload espera decodificación completa y acotada antes de publicar bytes originales en SQLite. Los tests cubren MIME, truncamiento, tamaño, interrupción, traversal, symlink, centinela externo, concurrencia y fallos de escritura. Escenas y plantillas persistidas se revalidan, y la corrupción devuelve STORAGE_CORRUPT sin sobrescribir filas ni exportar documentos incompatibles. Las consultas y escrituras conservan parámetros y atomicidad por recurso.
- **Criterios 10–11:** docs/private-api.md contiene configuración, proxy, sesiones, límites, rutas, DTO, errores, recuperación y extensión de autorización para 004. Comandos API separados, contrato compartido y versión/changelog **3.3.0** completos. La revisión UI confirma ausencia de cambios en las superficies visuales locales; suite y build Electron respaldan la conservación de ese cliente.

**Hallazgos cerrados:** C-1 (WebP con contenedor válido sin píxeles) se rechaza con 422 y cero assets publicados; C-2/P2 de seguridad (escena persistida incompatible) produce 500 STORAGE_CORRUPT en GET/exportación y no permite sobrescritura por PUT. Las reproducciones independientes de código y seguridad coinciden con las regresiones persistentes inspeccionadas. UX-01 queda resuelto con 415 UNSUPPORTED_IMAGE_VARIANT e instrucción de conversión para PNG entrelazado/WebP animado. UI no deja correcciones.

## Verificaciones y atribución

Checks obligatorios completos y satisfactorios según build.md: `pnpm typecheck`, `pnpm lint`, `pnpm test` (**114 archivos / 1068 pruebas**), `pnpm build`, `pnpm build:api` y humo real de `pnpm start:api` en Node 24.15.0. Además pasó instalación con lockfile congelado. Se leyeron los logs finales disponibles de test, build, build API/typecheck, lint, instalación y humo; concuerdan con el informe.

Código repitió typecheck, lint, diff check y las **50 pruebas del servidor**; seguridad y UX también ejecutaron esa suite. Seguridad y código repitieron por HTTP las reproducciones C-1/C-2; seguridad comprobó además imágenes reales con descarga idéntica. Estas ejecuciones se solapan y no se suman a las 1068. Este aprobador no volvió a ejecutar suites ni humo: sus comprobaciones propias son identidad, huellas, diff check, lectura de logs y contraste de código/pruebas/contrato.

## Riesgos residuales y límites

sharp 0.35.5 incorpora binarios nativos y libvips: su función y coste están justificados para validar píxeles comprimidos. La evidencia cubre macOS arm64/Node 24; no certifica otras plataformas, empaquetado ni distribución. Los límites de dos decodificaciones, píxeles y tiempo reducen recursos activos, pero no constituyen una prueba de carga prolongada ni fuzzing exhaustivo. El timeout de libvips mide procesamiento, no espera en libuv.

No hubo proxy TLS remoto, despliegue, humo visual Electron ni nueva UI; la ausencia de cambios visuales se comprobó por huellas y dependencias. El alcance de 002 no exige navegador. Recuperación de lock tras cierre forzado y respaldo con servicio detenido son procedimientos operativos documentados, no mecanismos automáticos probados ante toda corrupción física. Exportación no incorpora los assets y puede requerir sustitución en Electron. Estos límites son explícitos, coherentes con el alcance y no dejan un hallazgo pendiente.

## Siguiente acción

El orquestador puede registrar la aprobación técnica y avanzar al trabajo 003 en la rama autorizada, preservando los cambios acumulados y sin integrar 002. La aprobación no habilita acceso de jugador a contenido completo ni sustituye las revisiones futuras de cliente/proyección.

Se mantiene la prohibición expresa de staging, commit, push, merge, despliegue y DMG. Esta decisión no concede permiso de Git ni requiere solicitar ahora un merge ya prohibido. Única salida del aprobador: este decision.md, publicado mediante temporal y renombrado; sin cambios de código, tablero, Git ni otros informes.
