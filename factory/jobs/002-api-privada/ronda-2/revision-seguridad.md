VEREDICTO: APROBADO

# Revisión de seguridad — 002 API privada

Ciclo 1, ronda 2. Revisión independiente del código y pruebas actuales, contrastados con build.md actualizado, ronda-2/revision.md y huellas.json. Se mantienen como requisitos AGENTS.md, solicitud.md, spec.md y migracion-servicio.md, leídos durante la revisión del mismo trabajo. No se usaron veredictos de otros revisores como evidencia.

## Resultado y hallazgos

No quedan hallazgos de seguridad que requieran cambios en el alcance de esta ronda. El P2 de mi ronda anterior queda **resuelto y verificado**: las escenas persistidas incompatibles ya no se entregan ni exportan como éxito. La decodificación real de imágenes incorpora controles de recursos y se completa antes de publicar el asset.

## Correcciones revisadas

### Validación de persistencia

Se inspeccionaron `src/infrastructure/server/persisted-records.ts`, `service-store.ts`, `src/server/scene-service.ts` y la traducción de errores en `http.ts`.

- La lectura valida el sobre de escena, UUID, nombre, fechas y warnings; exige coherencia con las columnas del catálogo. El documento pasa por el parser/serialización versionados y por la regla de mapas.
- GET, exportación y lectura previa de PUT utilizan esa misma validación. Versiones futuras, documentos rotos y sobres incoherentes producen `500 STORAGE_CORRUPT`, sin detalles internos y sin reescribir la fila afectada.
- La migración admitida v1 a v2 ocurre en memoria con advertencia. El catálogo valida sus metadatos.
- Las plantillas se validan por estructura, identidad frente a la fila, fechas y protección de built-ins. La validación previa a mutaciones evita publicar una escritura para luego fallar al construir la respuesta. La corrupción no se convierte en una biblioteca vacía.

Repetí independientemente la reproducción original contra `out/api/index.mjs`: inicialicé y cerré el servicio, inserté una fila temporal con `scene: {version:999,maps:[],sceneAside:{}}` y metadatos válidos, reinicié y consulté GET y exportación. Ambas operaciones devolvieron **500 STORAGE_CORRUPT**; el cuerpo persistido siguió intacto. Esto cierra el caso concreto que antes devolvía 200.

### Decodificación de imágenes

Se inspeccionaron `image-validation.ts`, su integración HTTP, constantes, dependencia fijada `sharp: 0.35.5`, lockfile, tipos instalados, fixtures y pruebas.

- Los controles de formato/estructura preceden a una decodificación completa con sharp, `failOn: warning`, límite de 40 millones de píxeles y cuatro canales. La salida temporal es RGBA de ocho bits y se descarta; los bytes originales solo se guardan después de terminar correctamente.
- El servidor permite dos validaciones simultáneas, sin cola propia de decodificación. La saturación da 429 y el bloque finally libera el cupo también ante error. El timeout de procesamiento configurado es 15 segundos; la documentación distingue procesamiento de espera en libuv.
- Se conservan límite de cuerpo real de 20 MiB, autorización DM anterior a la carga, MIME permitido y nosniff. PNG entrelazado y WebP animado reciben una indicación de conversión sin publicarse.
- El único import de sharp del código de aplicación está en infraestructura del servidor. No se añadió al renderer, preload, main ni contratos compartidos. La necesidad de binarios por plataforma está documentada.

Comprobé por HTTP contra el artefacto compilado el WebP de 26 bytes `5249464612000000574542505650384c060000002f0000000000`: devolvió **422**, con **cero filas de assets**. Subí luego los fixtures reales JPEG, WebP VP8 y WebP VP8L: los tres devolvieron **201** y sus descargas conservaron exactamente los bytes originales.

## Controles conservados

La comparación de huellas identifica los cambios entre rondas; autenticación y esquemas de entrada no cambiaron. La inspección del router y la suite HTTP confirman que se conservan autorización central DM/jugador, expiración/rotación/revocación, cookies HttpOnly/SameSite/Secure según origen, validación exacta Host/Origin, cuotas y rechazo de headers de proxy como fuente de identidad. Las rutas no aceptan destinos del filesystem y la resolución sigue limitada a IDs de assets. Persisten SQL parametrizado, escrituras atómicas por recurso, bloqueo exclusivo y protección inicial contra symlinks/hardlinks. No se modificaron superficies Electron/IPC ni se incorporaron secretos al cliente.

## Evidencia ejecutada

- `pnpm exec vitest run src/server`: **PASS**, 3 archivos, **50 pruebas**, 1,34 segundos. Incluye la matriz de roles, Host/Origin, límites, traversal, persistencia/reinicio, corrupción de escenas y plantillas, rechazo de WebP sin flujo/truncado y control/liberación de cupos de decodificación.
- Cotejo SHA-256 de ronda-2/huellas.json antes y después de la revisión: **488 archivos, cero divergencias**.
- Prueba HTTP independiente contra el artefacto compilado en Node 24: versión 999 rechazada tras reinicio, fila intacta, WebP malformado sin publicación y tres formatos válidos con descarga idéntica.
- Se usaron puerto efímero, claves ficticias y directorio temporal. Los procesos se cerraron y los datos temporales se eliminaron; no se tocó el perfil personal Electron.

## Límites

No se repitieron toda la suite común, builds ni instalación; sus resultados se atribuyen a build.md, no a esta ejecución. No hubo despliegue, proxy TLS real, UI ni humo visual Electron. No se afirma fuzzing exhaustivo de codecs, resistencia medida a carga máxima, timeout forzado de libvips, corrupción física exhaustiva de SQLite ni auditoría de todas las dependencias nativas. La validación usa los esquemas/migraciones de dominio existentes; no redefine el formato de escenas. El administrador local con control del directorio continúa fuera del aislamiento de red documentado.

Solo se publicó este informe mediante temporal y renombrado. Sin cambios de implementación, Git, tablero ni informes ajenos. La aprobación es técnica y no autoriza integración ni despliegue.
