VEREDICTO: CAMBIOS

# Revisión de seguridad — 002 API privada

Ciclo 1, ronda 1. Revisión independiente del código real, especificación y evidencia congelada. No se modificó implementación, Git, tablero ni informes ajenos.

## Alcance revisado

Se leyeron AGENTS.md, el perfil seguridad.toml, migracion-servicio.md, solicitud.md, spec.md, build.md y ronda-1/revision.md. Se inspeccionaron configuración/arranque, autenticación, router HTTP, esquemas, servicio de escenas, persistencia SQLite, validación de imágenes, contratos compartidos, repositorios reutilizados y documentación operativa. Las 484 entradas de huellas.json coinciden con los archivos actuales; no hubo diferencias.

## Hallazgo requerido

### P2 — Validar escenas persistidas antes de entregarlas o exportarlas

**Ubicación:** `src/infrastructure/server/service-store.ts:56–58`, consumo en `src/server/scene-service.ts:30–32`.

`getScene` aplica `JSON.parse(row.body) as StoredScene`, pero la conversión TypeScript no valida el contenido. `SceneService.get` solo recorre algunas propiedades para calcular imágenes ausentes. La validación de versión/esquema de `save` no se ejecuta durante la lectura. Por ello una fila con JSON sintácticamente válido, pero documento incompatible o incompleto, sale por GET y exportación como un recurso confirmado con HTTP 200.

**Reproducción ejecutada:** arranqué `out/api/index.mjs` con Node v24.15.0, puerto efímero, directorio temporal exclusivo y credenciales ficticias. Tras iniciar sesión DM, inserté mediante SQLite una fila temporal cuyo cuerpo contenía metadatos de recurso y `scene: {version: 999, maps: [], sceneAside: {}}`. Tanto `GET /api/v1/scenes/:id` como `GET /api/v1/scenes/:id/export` devolvieron **200**; el primero incluyó `ok:true` y `missingImages:[]`, y el segundo exportó literalmente ese documento de versión 999. Proceso y directorio se eliminaron al terminar.

**Impacto:** una base restaurada, alterada o corrupta puede saltarse las garantías de versión y estructura que la API aplica al importar. El cliente recibe contenido inválido etiquetado como válido y puede descargar una escena que el propio importador rechaza. Incumple la regla explícita de AGENTS.md: «No confiar en datos guardados aunque sean locales». No se presenta como escalada remota ni como lectura de archivos externos; la reproducción requiere datos almacenados inválidos, y el administrador local continúa fuera del aislamiento de red documentado.

**Corrección esperada:** validar el registro persistido (metadatos, identidad y documento de escena con el esquema/versionado vigente) antes de devolverlo, exportarlo o reutilizarlo como estado anterior. Rechazar corrupción/incompatibilidad con error serializable y sin detalles internos; no transformarla en éxito o biblioteca vacía. Añadir prueba HTTP de lectura/exportación de una fila incompatible o malformada tras reiniciar, conservando el resto de recursos válidos. Revisar también las conversiones equivalentes de JSON persistido de plantillas para aplicar la misma frontera de confianza.

## Controles comprobados y satisfactorios

- **Autenticación y roles:** tokens aleatorios de 32 bytes, rol almacenado en servidor, comparación de hashes mediante timingSafeEqual, DTO de login estricto, expiración absoluta, rotación y revocación. Cookie HttpOnly/SameSite=Strict, Path limitado y Secure para origen HTTPS. Sesiones y cuotas acotadas; no se confía en X-Forwarded-For. El control DM precede a todas las familias privadas, incluyendo descarga y resolución de assets.
- **Origin/Host:** comparación exacta con origen público configurado; toda mutación exige Origin, incluidos login/logout y uploads. GET con Origin inesperado también falla. No se habilita CORS ni se deriva confianza de headers de proxy. Configuración remota HTTP rechazada; operación detrás de proxy HTTPS documentada.
- **Rutas y referencias:** IDs opacos validados, rechazo de traversal simple/codificado/doble y separadores. Imágenes y enlaces importados no conceden lectura del disco ni fetch remoto; resolver solo consulta IDs de assets. Nombre de exportación generado con UUID, sin interpolar nombres de usuario.
- **Uploads:** límite real de bytes tanto con Content-Length como chunked; solo PNG/JPEG/WebP con validación estructural, límite de píxeles y descompresión PNG acotada. Se validan antes de insertar bytes/metadata en una sola fila. Rechazos y abortos no publican assets. MIME/nosniff y CSP defensiva en respuestas.
- **Persistencia/escritura:** consultas parametrizadas, bases separadas para migraciones existentes, escrituras de cada recurso atómicas y bloqueo exclusivo. Comprobaciones iniciales de symlinks/hardlinks y sidecars; error de escritura SQLite no reemplaza el estado confirmado. El hallazgo anterior se refiere a la validación de lectura, no a SQL injection ni a atomicidad de escritura.
- **Límites y errores:** cuerpos/headers/conexiones acotados, DTO estrictos, campos y queries limitados, errores en español sin stack/SQL/rutas internas. Cache-Control no-store en respuestas gestionadas por el router.
- **Electron y frontend:** esta spec no cambia aislamiento de ventanas, preload, IPC ni navegación. El servidor no incorpora Electron ni APIs de filesystem al contrato HTTP compartido. No introduce ejecución de HTML, eval ni URLs externas abiertas desde el servidor.

## Evidencia ejecutada

- `pnpm exec vitest run src/server`: **PASS**, 3 archivos y 33 pruebas, duración 650 ms. Se inspeccionaron los casos, que utilizan HTTP real y directorios temporales para roles, persistencia, traversal, cuotas, cargas, fallo SQLite y symlinks.
- Cotejo SHA-256 de `ronda-1/huellas.json`: **484 archivos, 0 diferencias**.
- Prueba independiente de documento persistido incompatible contra el artefacto Node compilado: **reproducción confirmada**, GET y exportación 200 con versión 999.
- Node usado: **v24.15.0**. No se tocaron datos personales de Electron ni se dejaron servidores de prueba activos.

## Límites de verificación

No se repitió toda la suite común ni el build Electron; sus resultados pertenecen al informe del constructor. No hubo despliegue, proxy TLS real, UI/navegador ni humo visual Electron. La revisión acepta el alcance documentado de validación estructural de JPEG/WebP; no equivale a decodificación completa ni a fuzzing de codecs. No se probó corrupción física exhaustiva de SQLite, pérdida de energía ni modificación concurrente del directorio por un administrador local. El veredicto requiere resolver la validación de datos persistidos descrita antes de aceptar esta ronda.
