VEREDICTO: APROBADO

# Revisión UX — 002 API privada, ronda 2

Ciclo 1. Revisión independiente de los cambios reales, el build actualizado y la identidad de esta ronda. Se conserva el marco de AGENTS.md, el perfil UX, la solicitud y la spec ya leídos. No se consultaron informes de otros revisores de la ronda 2.

## Alcance y resultado

Se revisaron el flujo operativo, el contrato para el cliente 003 y la recuperación ante errores de persistencia e imágenes. Esta spec sigue sin UI nueva: no se añaden pantallas de conexión/importación, navegación, controles de cámara/escala o interacción de teclado. Por ello no se ejecutó CUA ni se inventaron pantallas para comprobar foco, Escape o Delete. La revisión visual de esas funciones corresponde a las entregas que implementen el cliente.

El alcance UX de 002 queda aprobado. La observación UX-01 de ronda 1 está resuelta y no se encontraron nuevos hallazgos bloqueantes.

## Verificaciones y evidencia

### Variantes e imágenes inválidas

`src/infrastructure/server/image-validation.ts` diferencia PNG entrelazado y WebP animado con 415 `UNSUPPORTED_IMAGE_VARIANT`. Los mensajes indican convertir a una variante admitida; no describen como dañado un archivo válido de esas variantes. `docs/private-api.md:89` documenta el mismo comportamiento. Las dos pruebas HTTP con fixtures reales en `src/server/http.test.ts:194` comprobaron código, instrucción de conversión y ausencia del texto «dañada». **UX-01 cerrada.**

La ruta de upload espera la validación y decodificación completa antes de guardar o devolver un asset (`src/server/http.ts:115`). Las pruebas reproducen el WebP sin píxeles y los VP8/VP8L truncados con tamaños coherentes: se rechazan con 422 y no aparecen filas de assets. Una imagen lossless válida se acepta y devuelve sus bytes originales. Esto evita confirmar al DM una imagen que luego no podrá utilizar.

La cuota de decodificación presenta 429 con un mensaje que permite reintentar. La prueba de concurrencia comprueba que los cupos vuelven a estar disponibles tanto al terminar como después de un error. La documentación explica dos decodificaciones simultáneas, límites de tamaño/píxeles y tiempo, así como el requisito de instalar la dependencia nativa en la plataforma del servicio. No se promete compatibilidad de todos los codificadores.

### Persistencia y recuperación

`src/infrastructure/server/persisted-records.ts` valida identidad, fechas, nombre y coherencia entre el sobre y el catálogo; el documento pasa por el parser/migración existente. `src/server/http.ts:160` convierte `StoredDataError` en 500 `STORAGE_CORRUPT`, con mensaje en español que indica restaurar una copia válida. Es distinguible de una entrada incorrecta del usuario o un fallo temporal genérico, sin exponer detalles físicos del almacenamiento.

Las pruebas HTTP de siete corrupciones de escena comprueban lectura/exportación rechazadas después del reinicio, rechazo de PUT, conservación de la fila original y acceso a una escena sana. El formato v1 admitido migra en memoria con advertencia; la lectura no reescribe la fila. Los metadatos inválidos del catálogo provocan error explícito. No se presenta una escena corrupta como cargada ni una colección corrupta como vacía.

Las cinco variantes de corrupción de plantilla provocan error y no permiten que un nuevo guardado se confirme parcialmente. El almacenamiento comprueba el conjunto existente antes de mutarlo. Una escena sana sigue accesible mientras las plantillas requieren recuperación. Esta restricción está documentada; no se afirma que cada plantilla sana pueda editarse individualmente dentro de una colección corrupta.

`docs/private-api.md:101` explica restauración con servicio detenido, bases/sidecars, permisos y ausencia de respaldo de sesiones. El contrato conserva la recuperación normal de imágenes ausentes mediante upload, sustitución, PUT y relectura; la suite volvió a comprobar ese recorrido junto con conservación de grilla/ID. No se añade una reparación destructiva automática.

### Contrato para el frontend y comportamiento previo

La guía incorpora `UNSUPPORTED_IMAGE_VARIANT` y `STORAGE_CORRUPT` al catálogo de errores, manteniendo `{ok:false,error:{code,message}}`. Así 003 puede diferenciar conversión de imagen, reintento y restauración por el operador. Los endpoints y DTO de escenas, warnings y missingImages siguen utilizables sin inferir rutas nuevas.

Volvieron a pasar las pruebas de login/expiración/logout, permisos DM/jugador, rechazo de referencias locales/remotas, importación/exportación, reinicio, bibliotecas y fallos de escritura. No hay nuevos endpoints que sugieran publicación de mesa o acceso de jugador a escenas completas; esos flujos siguen fuera de 002.

## Ejecución y límites

- Se compararon las **488 huellas** de `ronda-2/huellas.json` con los archivos actuales: **sin diferencias**. La comparación con ronda 1 confirmó cambios en infraestructura/servidor, fixtures, documentación y dependencia, sin cambios de renderer.
- Se ejecutó independientemente `pnpm exec vitest run src/server`: **3 archivos y 50 pruebas aprobadas**, código 0. Las pruebas usan HTTP real, puertos efímeros, credenciales ficticias y directorios temporales; no se accedió al perfil personal Electron.
- No se repitieron instalación, suite global, builds ni humo del artefacto compilado. Esas evidencias se atribuyen al constructor. No se verificó proxy TLS real, accesibilidad del cliente futuro, SIGKILL ni una restauración manual completa de backup. Se verificaron el contrato, la conservación ante fallos y la documentación de recuperación, no una herramienta automática de reparación.

No se requieren correcciones UX adicionales para esta ronda. Solo se escribió este informe mediante temporal y renombrado; sin modificar implementación, Git, tablero ni informes ajenos.
