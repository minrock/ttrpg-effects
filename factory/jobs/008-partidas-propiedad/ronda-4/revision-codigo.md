VEREDICTO: APROBADO

## Alcance y resultado

Revisión independiente de Código del ciclo 2, ronda global 4, sobre el checkout canónico. Se leyeron perfil, AGENTS.md, package.json, solicitud, retrabajo, spec, coordinación, build e identidad de revisión; se contrastaron las fuentes reales, las 593 huellas y el informe propio de ronda 3. No se leyeron informes de otros revisores. Las huellas coinciden antes y después de las pruebas propias.

Se examinó todo el delta de nueve archivos frente a ronda 3: transferencia, nuevo transporte de catálogo, cierre de la unidad autorizada, regresiones/fixtures y documentación. Se mantiene la revisión previa del resto de 008, cuyas huellas no cambiaron. No se encontraron defectos bloqueantes nuevos. Los dos hallazgos propios de ronda 3 están corregidos en su causa y las comprobaciones dirigidas confirman el comportamiento esperado.

## Cierre de hallazgos

- **CÓDIGO-008-C2-01, cerrado.** `src/infrastructure/server/owned/transfer.ts`, `inspectTransfer`: desaparece la comprobación residual que exigía un ID privado o incorporado después de validar el binding. Se comprueba la publicación exacta y su presentación; los bindings privados siguen verificando owner, existencia y hash. La derivación histórica sigue rechazando referencias ausentes. Un ID nuevo ya no impide exportar/restaurar el dataset.
- **CÓDIGO-008-C2-02, cerrado.** `src/infrastructure/server/owned/transfer-catalog.ts:51` y `transfer.ts`, escritor/exportador: el paquete operativo v3 transporta versiones y presentaciones en `catalog.jsonl`, con cabecera de versión y líneas separadas de presentación. El manifiesto contiene un descriptor pequeño. No se eleva arbitrariamente su límite ni se introduce un máximo agregado de catálogo que vuelva a bloquear el crecimiento. Se acota cada línea en bytes, se valida la estructura/definición reconstruida y se verifica longitud, número de registros y SHA-256; importación revalida el archivo antes de confirmar. El generador libera el stream incluso ante error. Permanecen lectores v1/v2 explícitos con su representación anterior.
- **Rechazos de la unidad, comprobado.** `src/infrastructure/server/identity/index.ts:190–215`: una marca booleana independiente conserva el primer rechazo, incluidos valores falsy, y captura lanzamientos síncronos. El drenaje y la comprobación final no dependen de la veracidad del motivo. La capa transaccional normaliza los motivos desconocidos sin confirmar las escrituras. Los efectos posteriores al commit y la revalidación de principal permanecen.

El nuevo formato corresponde al paquete operativo, no a `.ttrpgscene`. Se conserva la versión de aplicación 3.10.0, el formato portable v2, las migraciones y la separación entre catálogo compartido y contenido privado. El delta no modifica renderer, preload, main, web, Pixi, cámara, escala ni algoritmos de medición. README, documentación operativa y changelog distinguen las versiones y sus límites; no presentan UI011 ni plugins externos como entregados.

## Verificación propia

Ejecutada con `pnpm exec node --input-type=module`, módulos TypeScript reales cargados mediante Vite SSR, Node 24.15.0, SQLite físico temporal, migraciones reales, Better Auth y cuentas admin/DM reales. Sin mocks del repositorio ni escrituras directas en tablas para crear los casos funcionales.

1. Publicar sistema con presentación `custom-card`, guardar monstruo con binding exacto y vincularlo a una partida. Exportar y materializar la representación histórica v2 con catálogo embebido. **PASS:** inspección, importación a otra DB/owner, verificación y resolución autorizada de la definición exacta. El ID no existe en las plantillas incorporadas ni en recursos privados históricos.
2. Publicar presentación con 1.000.000 caracteres NUL en Markdown y 200.000 en CSS, válidos según el esquema, cuya serialización JSON requiere aproximadamente 7,2 MB. Crear monstruo/vínculo y deshabilitar la versión antes de exportar. **PASS:** paquete v3, manifiesto menor de 1 MiB, catálogo mayor de 7.000.000 bytes, inspect/import/verify, igualdad completa de la definición restaurada, estado deshabilitado conservado y edición posterior del mismo monstruo por su propietario.
3. Cinco operaciones autorizadas que crean una partida y después rechazan con `undefined`, `null`, `false`, `0` o cadena vacía; el callback captura cada rechazo. **PASS:** cada unidad termina con `UNAVAILABLE` y la cuenta conserva únicamente su partida anterior, sin confirmar las nuevas.
4. Comparación SHA-256 de las **593** entradas de `ronda-4/huellas.json`, antes y después: **sin discrepancias**.

La primera ejecución del arnés pasó el caso v2 y luego abortó al preparar otra cuenta porque el secreto aleatorio hexadecimal no alcanzó la diversidad mínima exigida. Fue un defecto del arnés propio: se cambió a base64url con diversidad comprobada; la segunda ejecución completó los casos restantes con exit 0. Ambas ejecuciones cerraron conexiones/Vite y retiraron exclusivamente sus directorios temporales en `finally`. No se modificó configuración del producto para obtener el resultado.

## Evidencia atribuida y límites

Se inspeccionaron `revision-3.contract.ts`, los cambios de `systems.contract.ts` y el helper de paquetes anteriores: cubren ambos motores, rechazo falsy capturado/allSettled/sin await, preservación del primer motivo, presentación nueva habilitada/deshabilitada, versión de más de 10 MiB, crecimiento acumulado, corrupción tardía con rollback, líneas excesivas y symlinks. No sustituyen los contratos anteriores de propiedad/transferencia.

El constructor registra gates finales correctos en `build.md`. Se contrastaron sus logs: `owned` **46/46**, identidad **25/25**, DB **32/32** y general **1201/1201**. Typecheck/lint y builds API/web/Electron constan en su evidencia final. Estos resultados se atribuyen al constructor, no a ejecución propia de esta revisión. No se repitieron gates por rutina ni se utilizó la ventana PostgreSQL compartida; las comprobaciones propias se concentraron en las causas corregidas comunes a los motores.

No se acredita carga prolongada ni humo visual nuevo, y el catálogo sigue sujeto a recursos de disco/tiempo y memoria de una versión reconstruida. Son límites documentados y no impiden la aceptación de 008. No se exige trabajo de 009–011. Sin cambios de código, Git, tablero, entorno original ni informes ajenos; única salida de esta revisión publicada por temporal y renombrado.
