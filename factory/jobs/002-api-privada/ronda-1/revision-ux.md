VEREDICTO: APROBADO

# Revisión UX — 002 API privada

Ciclo 1, ronda 1. Revisión independiente sobre código y documentación de la ronda; no se consultaron los informes de otros revisores.

## Alcance

Se leyeron AGENTS.md, el perfil `.codex/agents/ux.toml`, `factory/migracion-servicio.md`, solicitud, spec, build y revisión de ronda. Se inspeccionaron handlers HTTP, autenticación, configuración/arranque, servicio de escenas, esquemas de entrada, almacenamiento, validación de imágenes, contratos compartidos, documentación operativa y pruebas reales.

Esta spec no incorpora interfaz nueva: navegador, pantallas de conexión/importación, sincronización y presentación al jugador pertenecen a 003/004. La evaluación UX se centra en el recorrido del operador y en la información que necesita el futuro cliente para presentar estados, errores y recuperación. No corresponde inventar pantallas ni exigir aquí pruebas visuales de foco, Escape/Delete o navegación de cámara. No se detectaron cambios de esta entrega en renderer, controles de escala ni motores visuales.

## Resultado y evidencia

- **Inicio y operación:** `src/server/config.ts` rechaza configuración incompleta antes de escuchar y `src/server/index.ts` presenta mensajes de configuración/arranque en español. `docs/private-api.md` explica comandos, directorio exclusivo, proxy/Host/Origin, HTTPS, límites, reinicio y respaldo. El cierre forzado requiere retirar un lock obsoleto después de verificar ausencia del proceso; es una limitación operativa explícita, no una recuperación automática prometida.
- **Sesión y permisos:** `src/server/auth.ts` y `http.ts` distinguen sesión ausente/vencida (401), operación reservada al DM (403), clave incorrecta y cuota (429 con Retry-After). El cliente dispone de rol y vencimiento sin acceder al secreto. Logout es idempotente. El reinicio invalida sesiones y conserva recursos; la guía permite explicar al usuario por qué debe entrar otra vez. No se presentan endpoints pendientes como funcionalidades disponibles al jugador.
- **Carga y conservación:** creación/importación devuelven un recurso completo con ID, fechas, escena, advertencias y ausencias; actualización conserva ID/createdAt. `scene-service.ts:34` normaliza mediante el dominio existente y rechaza documentos incompatibles o sin mapas antes de guardar. Exportación entrega JSON legible por el parser local y nombre seguro. La política de última escritura confirmada está documentada; no se promete colaboración multi-DM.
- **Recuperación de imágenes:** `scene-service.ts:15` agrupa referencias ausentes y sus ubicaciones en mapas activos/inactivos, tokens y retratos. El resolver devuelve null para referencias locales/remotas no disponibles y no impide abrir toda la escena. `docs/private-api.md:87` define upload → sustituir referencias → PUT → releer, y aclara que exportar JSON no empaqueta imágenes. La prueba HTTP de recuperación comprueba desaparición de missingImages, conservación de grilla/ID y persistencia del asset tras borrar la escena.
- **Enlaces y privacidad:** los enlaces heredados se conservan con advertencia legible; no se siguen archivos del servidor. Las escenas completas, notas privadas, bibliotecas y assets conocidos permanecen inaccesibles al jugador. La autorización se aplica antes de las operaciones privadas y no depende de controles futuros en React.
- **Estados vacíos y errores:** listas vacías se expresan mediante arrays y el catálogo de escenas incluye total/paginación. 404 permite distinguir recurso inexistente; 413/415/422 distinguen tamaño, tipo y entrada inválida; 500 conserva un mensaje seguro. La prueba de fallo SQLite comprueba que una actualización fallida mantiene el recurso anterior tras reinicio. Los códigos y formatos están descritos para implementar 003 sin adivinar las rutas.

## Observación menor, no bloqueante

**UX-01 — Mensaje de variantes de imagen no admitidas (P3).** En `src/infrastructure/server/image-validation.ts:110`, un PNG entrelazado o WebP animado rechazado termina con «La imagen está dañada, truncada o no corresponde al MIME declarado». Las restricciones reales sí figuran en `docs/private-api.md:89`, pero ese mensaje por sí solo puede hacer creer al DM que perdió o dañó un archivo válido y no le indica convertirlo.

Mejora recomendada: distinguir una variante no admitida mediante código/mensaje seguro, o incluir en el mensaje general la posibilidad de variante no compatible y la conversión a PNG no entrelazado/JPEG/WebP estático. El frontend 003 debe mostrar las variantes y límites antes del upload. No bloquea 002: el alcance documenta expresamente el subconjunto soportado, el rechazo no publica recursos parciales y existe un procedimiento de recuperación operativo.

## Verificación ejecutada y límites

Ejecutado independientemente: `pnpm exec vitest run src/server`, resultado **3 archivos y 33 pruebas aprobadas**, código 0. Son pruebas de HTTP real con puertos efímeros, directorios temporales y credenciales ficticias; se revisó su cobertura de sesiones, roles, importación/exportación, recuperación, reinicio, bibliotecas, errores y límites. No se modificó la biblioteca personal Electron.

No se repitieron la suite global, builds ni humo del artefacto compilado; sus resultados se atribuyen únicamente al informe del constructor. No se ejecutó CUA ni inspección visual, porque no hay UI nueva; tampoco se verificaron un proxy TLS real, accesibilidad del futuro cliente, render visual de todos los formatos de imagen o recuperación de un proceso terminado con SIGKILL. La aprobación corresponde al flujo operativo y contrato UX de 002, no a funciones pendientes de 003/004.

Sin hallazgos UX bloqueantes. Se escribió únicamente este informe, publicado mediante temporal y renombrado, sin modificar implementación, Git ni tablero.
