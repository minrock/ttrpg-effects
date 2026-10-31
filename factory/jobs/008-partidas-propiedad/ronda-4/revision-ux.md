VEREDICTO: APROBADO

Revisión UX independiente de 008, ciclo 2, ronda global 4. Fecha: 2026-10-30. Checkout exclusivo: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Alcance: recuperación operativa, conservación de referencias y contratos de catálogo/transferencia tras las correcciones de ronda 3. No se encontraron hallazgos bloqueantes de UX en el alcance revisado.

## Resultado operativo

La exportación ya valida monstruos mediante su binding exacto de sistema/version/presentación (`owned/transfer.ts:196–219`), sin exigir que el ID de una presentación compartida nueva sea también un ID privado o incorporado. Esto permite respaldar las definiciones que el administrador publica y las instancias que el DM crea legítimamente. La comprobación conserva owner/hash para definiciones privadas y rechaza una referencia de catálogo ausente; no sustituye por la última versión ni elimina referencias.

El paquete operativo v3 separa `catalog.jsonl` de `manifest.json`. `transfer-catalog.ts` escribe una cabecera por versión y una línea por presentación, verifica bytes/conteo/hash y reconstruye una versión cada vez. El archivo privado de recursos conserva sus límites previos; el catálogo no hereda el límite agregado del manifiesto. El esquema limita cada presentación y cada versión, mientras cada línea JSONL conserva la cota de 10 MiB. La guía explica capacidad de disco/tiempo, compatibilidad de lectores v1/v2 y la diferencia respecto de `.ttrpgscene` v2. No se presenta como cambio de formato de escena ni como pérdida de las publicaciones ya admitidas.

`importTransfer` vuelve a verificar la integridad de ambos JSONL antes de confirmar. Los diagnósticos distinguen fallo previo, rollback confirmado y resultado incierto, y conservan la acción de verificar/reintentar con idéntico paquete y asignación. Los exportadores inspeccionan su salida antes de anunciar éxito y retiran el manifiesto de terminación ante una relación inválida. Los directorios parciales se conservan para diagnóstico y la guía pide un destino nuevo en el siguiente intento.

La marca independiente `rejected` en `identity/index.ts:190–215` evita que un motivo falso como null, false, cero o cadena vacía permita confirmar una unidad fallida. Preserva el primer motivo, observa trabajo pendiente y lanzamientos síncronos y normaliza fallos desconocidos al salir. Desde la perspectiva del usuario, un error capturado ya no puede producir una confirmación parcial de partida/resultado idempotente. El contrato nuevo exige cero partidas y cero operaciones confirmadas en esas condiciones.

## Semántica de catálogo conservada

No cambian los contratos de disponibilidad, revisión, sistema de partida ni bindings revisados en el ciclo 2. Admin publica versiones y modifica disponibilidad; no borra definiciones ni recibe acceso a los datos privados del DM. Una definición deshabilitada sigue disponible para lectura, edición de la misma instancia y exportación; copias, nuevos IDs, referencias o vínculos siguen sujetos a disponibilidad y coherencia exacta. La restauración operativa completa puede conservar instancias deshabilitadas, sin convertir esa excepción en una alta HTTP.

Se mantienen los errores recuperables `DISABLED`, `IMMUTABLE`, `INCOMPATIBLE`, conflicto de revisión, contenido idempotente diferente y presupuesto temporal con fecha de reintento. La deshabilitación no se describe como fallo transitorio 503. Los borradores quedan fuera del paquete funcional y la documentación pide respaldo integral para conservarlos. No se prometen transferencia de credenciales, recuperación de publicación/dados, sincronización de escrituras posteriores ni cambio automático de sistema de una partida.

## Comprobaciones propias

Se ejecutaron cinco invocaciones de la CLI compilada mediante `pnpm exec node out/api/data-cli.mjs inspect --bundle ...`, sin cargar `.env`, abrir bases, KDF ni usar PostgreSQL. Fixtures propias en directorios físicos privados temporales, eliminadas al terminar:

- Paquete v2 con sistema publicado propio, presentación de ID nuevo, Markdown/CSS propios, versión y presentación deshabilitadas, y un monstruo con binding exacto: exit 0, versión 2 y conteo de un monstruo.
- El mismo contenido en paquete v3 segmentado: exit 0, versión 3 y conteo correcto.
- Catálogo v3 alterado después de calcular el hash: exit 1, stdout vacío y `CORRUPT`.
- Cabecera v3 que declara una presentación ausente, con descriptor/hash del archivo truncado coherentes: exit 1, stdout vacío y `CORRUPT`.
- Versión futura 4: exit 1, stdout vacío y `CORRUPT`.

Los tres rechazos indicaron conservar respaldo y reparar/reexportar, sin anunciar importación confirmada ni revelar la ruta temporal. Estas comprobaciones acreditan inspección, compatibilidad y diagnóstico; no se presentan como importaciones completas ni como ejecución SQL propia.

## Evidencia y límites

Leídos AGENTS.md, perfil UX, solicitud/spec/retrabajo del ciclo 2, coordinación, build final e identidad de ronda; inspeccionadas las fuentes reales de catálogo/transferencia, rechazo transaccional y los contratos de regresión. No se leyeron informes de otros revisores. Se compararon las huellas de rondas 3 y 4: nueve archivos cambiados/nuevos, todos coinciden con SHA256 de ronda 4. No hay cambios de UI, renderer, web, main, preload o render en este delta.

`revision-3.contract.ts` contiene pruebas parametrizadas SQLite/PostgreSQL de presentación nueva con roundtrip v2/v3, conservación de disponibilidad/hash/instancia/vínculo, catálogo mayor de 10 MiB por versión y crecimiento acumulado, corrupción tardía con rollback y reintento, symlink/línea excesiva y rechazos falsy. Se revisaron sus aserciones y el log del constructor `/tmp/008-r4-owned-final.log`: 5 archivos / 46 pruebas PASS, 256,33 s. Ese gate y los demás gates/builds consignados en build.md son evidencia atribuida al constructor; no se repitieron ni se usó la ventana PostgreSQL reservada a Seguridad.

No hay nueva inspección CUA ni humo visual: 008 entrega backend y operación, no pantallas 011. No se exige ni se certifica foco/teclado, Escape/Delete, segundo viewport, invitados/SSE o proyector físico por este cambio. No se certifican carga prolongada, despliegue ni pg_dump/pg_restore productivo. No se modificaron código, Git, tablero, spec, datos/env originales ni servicios compartidos. La única salida es este informe, publicado mediante temporal y renombrado.
