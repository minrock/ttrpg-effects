VEREDICTO: CAMBIOS

# Revisión de código — 002 API privada

Fecha: 2026-10-28. Ciclo 1, ronda 1. Revisión independiente según `.codex/agents/codigo.toml`, sin consultar informes de otros revisores.

## Alcance e identidad

Leí AGENTS.md, migración al servicio, solicitud, spec, build y revisión congelada; inspeccioné los 22 archivos enumerados para 002, incluyendo servidor, infraestructura, DTO, fixtures/pruebas, build/configuración, versión y documentación. Contrasté además los casos de uso, repositorios y normalizadores reutilizados. Verifiqué las 484 entradas de `huellas.json`: ninguna divergencia. Los cambios de 001 y fábrica se consideran base previa, no cambios nuevos de 002.

La implementación separa el arranque Node del Electron local, conserva TypeScript estricto y las reglas de dominio, usa consultas parametrizadas, IDs de recurso opacos y bases separadas para las migraciones preexistentes. La autorización central precede los recursos privados; no observé rutas del cliente usadas para abrir archivos. Sesiones, cuotas, límites de cuerpo, cierre de sockets y lock tienen implementación y pruebas reales. La versión 3.3.0 y su changelog corresponden al cierre minor previsto; el formato declarado continúa en 2. No se modifican coordenadas, mediciones, renderer, Pixi ni preload en este trabajo.

No puedo aprobar todavía por los dos comportamientos reproducidos a continuación.

## Hallazgos

### C-1 — P2: el upload acepta un WebP sin flujo de imagen válido

**Ubicación:** `src/infrastructure/server/image-validation.ts:91–95`, retorno en 102; publicación en `src/server/http.ts` dentro de POST `/assets`.

La rama VP8L considera válido un chunk con firma, dimensiones y un solo byte restante, sin comprobar que exista un flujo decodificable. Se puede publicar un archivo de 26 bytes sin una imagen válida. El servidor confirma 201 y genera un asset permanente; cualquier escena que apunte a ese ID deja de señalar la imagen como ausente aunque el cliente no pueda mostrarla. Esto incumple el rechazo de imágenes inválidas/truncadas y la recuperación prevista en los criterios 6/7. La limitación documentada de no hacer decodificación visual completa no convierte este contenido incompleto en una imagen válida.

**Reproducción ejecutada:** sesión DM real; POST `/api/v1/assets` con `Content-Type: image/webp`, Origin autorizado y estos bytes hexadecimales:

```text
5249464612000000574542505650384c060000002f0000000000
```

Resultado real: HTTP **201**, `mimeType: image/webp`, `byteLength: 26`, con ID/reference/url de asset. Pillow 12.2.0, usado únicamente como comprobación independiente del fixture, falla al cargar los mismos bytes: `OSError: failed to read next frame`. La prueba no usa navegador ni cambia dependencias del proyecto.

**Corrección esperada:** validar suficientemente el flujo de las variantes anunciadas antes de guardar el BLOB, mediante un decodificador apropiado y acotado o rechazando explícitamente las variantes que aún no se puedan validar. Añadir una prueba HTTP con este caso (y datos de frame truncados con tamaños del contenedor coherentes), exigir 422 y ausencia de fila publicada. Mantener los fixtures válidos y límites de bytes/píxeles. No basta comprobar el tamaño RIFF o la firma VP8L.

### C-2 — P2: escenas persistidas se devuelven sin validar esquema ni versión

**Ubicación:** `src/infrastructure/server/service-store.ts:56–58`; consumo en `src/server/scene-service.ts:30–32` y GET de exportación en `src/server/http.ts`.

`getScene` convierte cualquier JSON almacenado en `StoredScene` mediante un cast. La validación de escena solo se ejecuta al crear/actualizar; la lectura y exportación confían en datos guardados. Una base restaurada, modificada por otra versión o con contenido lógicamente corrupto puede devolver con éxito un documento incompatible, incluso tras reiniciar. La API anuncia `SceneDocumentV2`, pero entrega versión 99 y exporta un `.ttrpgscene` que el parser vigente rechaza. AGENTS.md exige validar también datos locales guardados y rechazar versiones incompatibles. Esto no es una hipótesis de acceso remoto al SQLite: es una omisión del límite de persistencia y recuperación.

**Reproducción ejecutada:** crear una escena válida por POST; cerrar API; en su directorio temporal abrir `service.sqlite`, parsear el JSON de `scenes.body`, cambiar únicamente `scene.version` a `99` y guardar la fila con SQL parametrizado; cerrar SQLite; reiniciar API y volver a iniciar sesión DM. GET `/scenes/:id` devuelve **200** con `resource.scene.version = 99`; GET `/scenes/:id/export` devuelve **200** con `version = 99`. El JSON restante, mapas y metadatos se conservaron para aislar el defecto. No se tocó ninguna base personal.

**Corrección esperada:** validar el sobre persistido y su documento mediante esquemas reales al leer, aplicar solo las migraciones admitidas y devolver error recuperable ante contenido inválido/incompatible, sin sobrescribir la fila ni exportarla como éxito. Verificar coherencia de identidad/metadatos del recurso. Añadir pruebas de reinicio con JSON sintácticamente válido pero versión/estructura inválidas; mantener accesibles los demás recursos válidos y no interpretar corrupción como biblioteca vacía. Revisar también la lectura de plantillas en `service-store.ts:73–74`, que usa el mismo patrón de cast, al cubrir el límite de persistencia.

## Verificaciones realizadas

- `pnpm exec vitest run src/server`: **PASS**, 3 archivos / 33 pruebas, Node v24.15.0. Incluyen HTTP real, roles, CRUD, importación/exportación, reinicio, bibliotecas, plantillas, fallo SQLite, rutas y límites.
- `pnpm typecheck`: **PASS**, salida 0.
- `git diff --check`: **PASS**.
- SHA-256 de las 484 entradas congeladas: **PASS**, sin diferencias.
- Reproducción independiente HTTP de C-1 y C-2: ambos confirmados contra código fuente actual, compilado a un artefacto de prueba bajo `/tmp`. Puertos efímeros, credenciales ficticias, bases temporales y cierre/limpieza en `finally`.
- Decodificación independiente del WebP de C-1 con Pillow: rechazada, como se detalla arriba.

El primer intento de generar el arnés mediante `pnpm exec esbuild` falló porque no existe ese binario directo en el proyecto. Se usó posteriormente la API de esbuild ya instalada por el toolchain, invocada mediante `pnpm exec node`; compilación y reproducción concluyeron correctamente. No se instaló nada ni se cambió configuración.

## Aceptación y límites

Las evidencias de autorización, sesiones, rutas opacas, persistencia de recursos válidos, preservación v1/v2 y contratos son sustanciales. Las pruebas comunes/build/humo compilado declarados por el constructor están documentados en build.md; esta revisión repitió las pruebas de servidor y typecheck y realizó las dos reproducciones adicionales, no la suite completa ni los builds. Sus resultados anteriores no subsanan los defectos reproducidos. El caso de C-1 no aparece en la suite: las pruebas actuales truncan el contenedor sin reconstruir tamaños. Tampoco hay prueba de lectura de JSON persistido con esquema incompatible.

No se hizo humo visual Electron, inspección de UI ni proxy TLS real; no hay UI nueva en 002 y estos límites no originan los hallazgos. No se crearon subagentes, no se modificó implementación, tablero, informes ajenos ni historial Git. Único archivo del repositorio escrito por este revisor: este informe, publicado mediante temporal y renombrado.
