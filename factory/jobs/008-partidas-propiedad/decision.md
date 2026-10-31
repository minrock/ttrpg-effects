APROBAR

Decisión técnica independiente de 008 — ciclo 2, ronda global 4 (segunda del ciclo). Fecha: 2026-10-30. Se acepta el alcance backend y operativo definido en spec.md y en el retrabajo autorizado. No quedan hallazgos pendientes ni decisiones de producto necesarias para cerrar técnicamente esta entrega.

La decisión corresponde al checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama comprobada `feature/factory-006-persistencia-multidb`, versión 3.10.0. No autoriza staging, commits, push, merge, DMG ni despliegue.

## Informes e integridad

Los cuatro informes completos de ronda 4 contienen `VEREDICTO: APROBADO`: Seguridad, UX, UI y Código. No se sustituyó ningún informe por juicio del aprobador. Se leyeron el perfil de aprobación, AGENTS.md, solicitud, spec vigente, retrabajo, coordinación, build e identidad de revisión; se contrastaron informes, fuentes y evidencias de ejecución.

Comprobación propia SHA-256 de las 593 entradas de ronda-4/huellas.json: cero discrepancias, incluida una segunda comprobación antes de publicar. Frente a ronda 3 hay nueve archivos cambiados o nuevos y ninguna eliminación. El delta coincide con las correcciones revisadas: cierre de identidad, transferencia y transporte segmentado de catálogo, contratos/fixture y documentación. La decisión no certifica archivos futuros ni cambios posteriores al conjunto congelado.

## Fundamento técnico

1. El catálogo separa reglas, esquema y presentación; sus publicaciones conservan referencias y hashes exactos. El puerto SystemCatalog carece de borrado, las mutaciones exigen administrador y los puertos privados conservan owner/rol capturados. `resources.put/remove` rechazan plantillas históricas con `IMMUTABLE`. La definición privada retenida se resuelve con owner/hash, sin hacerse pública.
2. El binding previo y la disponibilidad final se validan en la frontera de persistencia. Altas, copias, cambios de binding y vínculos nuevos requieren definición habilitada; edición de la misma instancia conserva su versión. Los contratos de sistemas acreditan coherencia con partida, concurrencia entre conexiones y dentro de una unidad, sin trasladar estas restricciones al editor local.
3. Se cierra el hallazgo de confirmación parcial: `identity/index.ts` registra un booleano irreversible independiente del motivo, conserva el primer rechazo, observa operaciones pendientes y lanzamientos síncronos, comprueba invariantes y revalida el principal antes del commit. La corrección no depende de la veracidad de null, undefined, false, cero o cadena vacía.
4. Se cierra el rechazo de exportaciones válidas: `inspectTransfer` valida sistema/version/presentación exactos y conserva la comprobación privada por owner/hash. Ya no exige que un ID publicado nuevo exista también en las plantillas incorporadas o privadas.
5. Se cierra el límite agregado del manifiesto: el paquete operativo v3 usa descriptor de catálogo y JSONL con cabeceras y presentaciones separadas. La implementación limita cada línea, valida estructura/definición y comprueba bytes, conteo y hash; vuelve a verificar los archivos antes de confirmar la importación. Conserva lectores explícitos v1/v2. Esto no cambia `.ttrpgscene` v2 ni la versión de aplicación 3.10.0.

Se inspeccionaron las aserciones de revision-3.contract.ts: motivos falsy con catch/allSettled/sin await y ambos órdenes de primer error, cero partidas/resultados confirmados, roundtrip de presentación nueva habilitada/deshabilitada, versión superior a 10 MiB y crecimiento acumulado, corrupción tardía con rollback, reintento, límite de línea y symlink. Están parametrizadas sobre SQLite y PostgreSQL reales.

## Aceptación y atribución

La matriz A1–A12 queda satisfecha dentro del alcance especificado: composición y autoridad, partidas, privacidad, retención, consumo/coherencia, concurrencia, idempotencia/revocación, runtime/aperturas, ambos motores/migraciones, transferencia/recuperación, compatibilidad y documentación. Esta conclusión combina inspección propia con las revisiones independientes y sus pruebas; no atribuye al aprobador ejecuciones ajenas.

- Constructor: los logs finales contrastados muestran propiedad 46/46, identidad 25/25, DB 32/32 y suite general 1201/1201. Build.md registra exit 0, ambos motores sin skips, typecheck, lint y builds API/web/Electron; se consultaron sus logs y las salidas de build. Su auditoría final registra PostgreSQL 17.10 y cero bases/conexiones de fixtures.
- Seguridad: ejecución independiente dirigida de las seis regresiones SQLite/PostgreSQL, 6/6, exit 0, 55,33 s; cierre explícito de sus dos hallazgos.
- Código: probes propios SQLite con identidad real para presentación nueva y lector v2, contenido con expansión JSON y transferencia v3, edición retenida y cinco rechazos falsy; cierre de sus dos hallazgos. Su informe distingue el fallo de preparación del arnés de la ejecución válida posterior.
- UX: cinco inspecciones de CLI compilada, incluyendo paquetes v2/v3 válidos, hash alterado, estructura truncada y versión futura; no se confunden con importaciones SQL propias.
- UI: comparación de huellas y consumidores confirma ausencia de cambio visual y conserva separada la evidencia visual anterior. No afirma humo nuevo.

El aprobador no reejecutó gates, no abrió bases ni utilizó servicios: verificó fuentes, cobertura declarada, resultados registrados y la identidad exacta del código. Los tres hallazgos únicos de ronda 3 están cerrados por corrección y regresión específica; los informes previos permanecen como evidencia histórica.

## Riesgos residuales y siguiente acción

La aceptación no certifica carga prolongada, proyector físico, escalado horizontal ni corte productivo. Se mantiene un proceso API por base; el catálogo depende de disco/tiempo y memoria suficiente para una versión reconstruida. Los borradores requieren respaldo integral y no viajan en el paquete funcional. Una confirmación incierta exige verificación o reintento idéntico. Los avisos no fatales de canvas/jsdom, chunks y cola de consultas de pg 8 quedan documentados; una actualización a pg 9 necesita revisar esa cola.

UI011, invitaciones009, expulsión/SSE010, plugins externos y respaldo/restauración PostgreSQL de producción siguen fuera de esta entrega. No exigirlos anticipadamente ni presentarlos como implementados. Se preservan las limitaciones del servicio legado hasta el corte previsto en 011.

Siguiente acción: el orquestador puede cerrar técnicamente 008 y continuar la secuencia ya autorizada, preservando esta evidencia y la rama actual sin commits ni merge. Cualquier integración requiere la orden explícita del usuario. La única escritura de este rol es decision.md, publicada mediante temporal y renombrado atómico.
