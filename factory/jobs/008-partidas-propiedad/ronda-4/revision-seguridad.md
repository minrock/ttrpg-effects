VEREDICTO: APROBADO

Revisión independiente de seguridad de 008, ciclo 2, ronda global 4, 2026-10-30. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se aplicó el perfil `.codex/agents/seguridad.toml` y se consultaron AGENTS.md, solicitud, spec final, retrabajo, coordinación, build, revisión/huellas de ronda 4 y el informe propio de ronda 3. No se consultaron informes de otros revisores.

## Alcance e integridad

Se verificaron las **593 huellas congeladas**, con **cero discrepancias**, incluidas la comprobación inicial y la final. Respecto de la ronda 3 cambian nueve archivos: identidad, transferencia, nuevo lector/escritor de catálogo, dos contratos de pruebas, fixture de transferencia y tres documentos. Se inspeccionaron las fuentes reales completas pertinentes, los archivos nuevos y el delta. El resto de las fronteras de autoridad, HTTP, repositorios, migración, runtime y Electron conserva las huellas revisadas en ronda 3; su evidencia previa se atribuye a aquella revisión, no a una nueva ejecución completa.

No quedan hallazgos de seguridad demostrables que requieran cambios en este alcance. Los dos hallazgos propios de la ronda anterior están corregidos.

## Cierre de hallazgos anteriores

**Rechazos falsy y confirmación parcial — cerrado.** `src/infrastructure/server/identity/index.ts:190–215` mantiene una marca irrevocable `rejected` separada del valor de rechazo, conserva el primer motivo y normaliza null/undefined. El drenaje vuelve a comprobar esa marca antes de permitir la confirmación; los rechazos posteriores no borran el fallo previo. La prueba real ejecutada cubre undefined, null, false, cero y cadena vacía mediante catch, allSettled y operación iniciada sin await individual, además de ambos órdenes de un error tipado y uno nulo. En ambos motores la unidad rechaza y quedan cero partidas y cero resultados idempotentes. Esto cierra exactamente el caso que antes confirmaba una partida sin resultado de operación.

**Presentación publicada con ID nuevo que bloqueaba exportación — cerrado.** `src/infrastructure/server/owned/transfer.ts:187–238` valida el binding contra la publicación y presentación exactas; ya no aplica la segunda restricción heredada de pertenecer a plantillas incorporadas o privadas. No se sustituye por una allowlist global ni se acepta una referencia ausente. La regresión real publica una presentación con ID nuevo y contenido original, crea un monstruo y vínculo a partida, exporta, inspecciona, importa y verifica. Acredita la conservación de definición, hash, binding y vínculo con versión habilitada en paquete v2 y deshabilitada en paquete v3, tanto en SQLite como PostgreSQL.

## Seguridad del formato operativo 3

Se inspeccionó `src/infrastructure/server/owned/transfer-catalog.ts` completo y sus consumidores de exportación, inspección, importación y verificación. El manifiesto mantiene descriptor acotado; catálogo y enlaces pasan a JSONL. El lector conserva ramas explícitas v1/v2, rechaza mezclas de representaciones y reconstruye cada versión con su cantidad declarada de presentaciones. La validación comprueba esquema, estado publicado, módulos conocidos y hash de la definición; la inspección detecta referencias/versiones duplicadas o inconsistentes.

El archivo de catálogo pasa por la misma frontera física de directorio privado y archivo regular sin symlinks/hardlinks. Se valida tamaño, número de líneas y SHA256, junto con la cota de 10 MiB por línea. La importación vuelve a verificar los dos JSONL antes del COMMIT. Se conservan asignación completa/inyectiva de propietarios, cuentas DM activas, destino funcional vacío, seeds compatibles, referencias privadas, transacción y resultado de recuperación. Restaurar una definición deshabilitada sigue siendo una capacidad operativa explícita; no se ha abierto una excepción HTTP para crear instancias nuevas.

La prueba dirigida cubre una versión válida mayor de 10 MiB y varias versiones acumuladas, manifiesto menor de 1 MiB, roundtrip y hashes. También modifica el catálogo después de empezar la importación: se obtiene `CORRUPT` con `rolled_back`, sin partida ni versión importadas. Rechaza modificación posterior, línea sobredimensionada aun con descriptor/hash coincidentes y symlink. El crecimiento total del catálogo exige disco y tiempo; el diseño y la documentación no prometen un límite global ni memoria independiente del tamaño de una versión.

## Evidencia ejecutada por este revisor

Comando ejecutado sobre las fuentes congeladas:

```text
python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/owned/vitest.config.ts src/infrastructure/server/owned/revision-3.contract.ts
```

Resultado: **1 archivo, 6/6 PASS, exit 0, 55,33 s**, sin skips; las tres familias de regresión se ejecutaron con SQLite físico y PostgreSQL real en el entorno temporal autorizado. Se inspeccionó el contenido de los tests y la conversión explícita a paquete v2; no se interpreta el conteo como seis comprobaciones triviales. Los fixtures incluyen cuentas y conexiones reales y limpieza en afterEach/finalización del arnés. No se imprimió configuración privada.

Los resultados completos de `test:owned` (46/46), identidad, base de datos, suite general, typecheck, lint y builds se atribuyen al constructor según `build.md`; no los repetí por rutina. La ejecución independiente de ronda 3 y sus probes permanecen evidencia histórica, anterior a estas correcciones.

## Fronteras conservadas y límites

El delta no altera captura de owner/rol/sesión, separación admin/DM, SQL parametrizado, controles Host/Origin y payloads HTTP, respuestas ajenas indistinguibles, ni la ausencia de borrado de definiciones. Conserva la preparación runtime invisible, efectos síncronos post-COMMIT bajo exclusión, rollback y descarte ante confirmación incierta. El catálogo transporta datos declarativos y referencias a módulos compilados; no ejecuta Markdown/CSS/HTML, código de terceros ni descarga recursos durante importación.

No cambia main/preload/CSP, renderer ni Pixi. No se exige ni se acredita UI011, invitados/SSE009–010, plugins externos, humo visual, carga prolongada ni respaldo/restauración productivos con pg_dump. La aceptación corresponde a las fuentes congeladas y al alcance backend/operativo de 008, no a un despliegue final.

La ventana PostgreSQL se liberó después del gate; el servidor compartido permanece activo. No hubo cambios de producto, Git, tablero, specs, datos originales ni configuración privada. Única escritura del revisor en el checkout: este informe, publicado mediante temporal y renombrado atómico.
