VEREDICTO: APROBADO

# Revisión de código — 002 API privada, segunda ronda

Fecha: 2026-10-28. Ciclo 1, ronda 2. Revisión independiente según `.codex/agents/codigo.toml` y los requisitos de AGENTS.md, solicitud y spec. No consulté informes de otros revisores de esta ronda.

## Alcance y estado revisado

Leí build.md actualizado, ronda-2/revision.md y las huellas; contrasté el delta respecto de ronda 1 y revisé código, pruebas, fixtures, contrato operativo, package.json y pnpm-lock.yaml. Se mantienen las conclusiones de arquitectura y autorización de la primera revisión. Verifiqué las **488 huellas** al iniciar y al terminar: ninguna divergencia.

La corrección permanece en la rama autorizada y conserva la versión 3.3.0. No altera el formato .ttrpgscene, renderer, preload, coordenadas ni mediciones. Las modificaciones de esta ronda cubren decodificación real de imágenes, validación de registros persistidos, errores recuperables y sus regresiones, sin extender funciones del producto.

## Comprobación de los hallazgos anteriores

**C-1 resuelto.** `src/infrastructure/server/image-validation.ts` ahora exige, después del control estructural, la decodificación completa del frame mediante sharp, con rechazo de avisos, límites de píxeles/canales, timeout y cuota de dos operaciones por instancia sin cola ilimitada. El router espera el resultado antes de insertar el asset. La cuota se libera en `finally`, también ante error.

Repetí independientemente el POST autenticado con el WebP original de 26 bytes:

```text
5249464612000000574542505650384c060000002f0000000000
```

Resultado actual: **422 VALIDATION_ERROR**, frente al 201 de ronda 1. Las pruebas persistentes cubren además VP8/VP8L truncados con tamaños RIFF coherentes, tabla de assets vacía tras el rechazo, VP8L real válido, descarga de bytes idénticos y liberación de cupos. PNG/JPEG/WebP válidos mantienen el comportamiento esperado. Las variantes no admitidas responden 415 con instrucción de conversión.

**C-2 resuelto.** `src/infrastructure/server/persisted-records.ts` valida el sobre, identidad, nombre, fechas, warnings y coherencia frente a las columnas SQLite. Lee el documento mediante parser/serializador existentes, rechaza versiones incompatibles y conserva migraciones admitidas. `ServiceStore.getScene` usa esta frontera antes de que GET, PUT o exportación puedan consumir el registro. `StoredDataError` se convierte en 500 `STORAGE_CORRUPT` con mensaje recuperable y sin detalles internos.

Repetí independientemente la reproducción original: crear escena por HTTP, detener API, cambiar solo `scene.version` a 99 en el JSON de la base temporal, reiniciar e iniciar sesión. Tanto GET como exportación devuelven ahora **500 STORAGE_CORRUPT**, frente a los 200 incompatibles de ronda 1. Las pruebas cubren también JSON roto, estructura, identidad, metadatos, fechas y warnings inválidos; comprueban que PUT no sobrescribe la fila y que otros recursos sanos siguen disponibles. La migración de una escena persistida v1 a v2 conserva el aviso y no escribe durante la lectura.

La validación se extendió a plantillas persistidas, incluyendo identidad de fila, esquema y protección de incorporadas. Se comprueba el estado existente antes de mutar para evitar confirmar una escritura y fallar al construir la lista de respuesta. Los tests prueban corrupción y ausencia de una inserción parcial. No se convierte corrupción en listas vacías.

## Dependencia y compatibilidad

sharp está fijado a **0.35.5** en package.json y lockfile. Su incorporación tiene una función concreta y justificación de tamaño/plataforma en build.md y la guía operativa: decodificar formatos comprimidos que el validador artesanal no podía confirmar. La dependencia se importa desde infraestructura de servidor y el artefacto API; la búsqueda de imports no encontró su incorporación a main/preload. La versión instalada cargó correctamente en Node 24.15.0 con libvips 8.18.7 y ejecutó las pruebas reales. Los tipos instalados incluyen las opciones de límites y timeout utilizadas.

La guía advierte que se necesitan binarios nativos de la plataforma y que no se deben copiar node_modules entre arquitecturas. Este coste no queda oculto ni se atribuye al renderer. La validación descarta el resultado RGBA y mantiene los bytes originales del recurso. La compatibilidad de distribución multiplataforma no se afirma como verificada en este trabajo.

## Verificaciones ejecutadas

- `pnpm exec vitest run src/server`: **PASS**, 3 archivos / 50 pruebas.
- `pnpm typecheck`: **PASS**.
- `pnpm lint`: **PASS**.
- `git diff --check`: **PASS**.
- Verificación SHA-256 de las 488 huellas, antes y después: **PASS**.
- Arnés HTTP independiente con las reproducciones C-1/C-2: **PASS**, rechazos esperados. Compilado desde las fuentes actuales a `/tmp`, usando la dependencia sharp instalada, con puerto efímero, claves ficticias, SQLite temporal y cierre/limpieza en `finally`.

No encontré nuevos hallazgos accionables de corrección, persistencia o compatibilidad dentro del alcance revisado. Los criterios afectados por mi primera revisión cuentan ahora con implementación y evidencia ejecutada.

## Límites

No repetí en esta ronda la suite global de 1068 pruebas, los builds ni el humo de `pnpm start:api`; sus resultados actualizados figuran en build.md. Mis ejecuciones cubren la suite completa del servidor, lint, TypeScript y un arnés adicional sobre las fuentes actuales. No hice fuzzing exhaustivo de imágenes, pruebas de carga prolongadas, humo visual Electron, proxy TLS real ni empaquetado de otras arquitecturas. Estas limitaciones están documentadas y no dejan abierto C-1/C-2.

Las consultas auxiliares de inspección de sharp necesitaron localizar su estructura instalada actual (`dist/index.cjs` y `lib/index.d.ts`); no se modificaron dependencias ni archivos para ello. No modifiqué implementación, tablero, otros informes o Git, ni creé subagentes. Único archivo del repositorio escrito: este informe, publicado mediante temporal y renombrado. La aprobación es técnica y no autoriza integración.
