# Criterios de la entrega inicial — SDD 46

Rescatados el 2026-11-13 del expediente `006-persistencia-multidb` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. Los bloqueos transitorios de PostgreSQL/servidor fueron retirados en SDD 51; el alta de administradores y contraseñas evolucionó en SDD 53.

## Criterios conservados

1. **Fronteras:** puertos async sin imports de motores en domain/application/renderer. Factores de composición y cierre reales; pg no aparece en bundles web ni preload. No endpoint ni cambio de autenticación nuevo.
2. **Paridad del catálogo:** la misma suite de contrato corre contra archivo SQLite y servidor PostgreSQL real. CRUD, múltiples partidas por propietario, paginación/orden, inmutabilidad, nombres Unicode, entradas inválidas y ausencia ajena se comportan igual. Inyección SQL permanece como texto y no modifica esquema.
3. **Consistencia:** commit tras await, rollback por rechazo tras una primera escritura y error de segunda operación; reabrir conexión confirma estado. Duplicado no sobrescribe. Prueba concurrente entre transacción y operación raíz demuestra que la segunda no se confirma/revierte con la primera. No se reutiliza tx terminado ni se fuga cliente/lock tras error.
4. **Migraciones:** base nueva, segunda ejecución sin cambios, datos conservados, versión futura/checksum inválido rechazados, fallo intermedio sin versión parcial y competencia entre ejecutores. Fixtures separados por motor. Abrir sin migrar informa la acción necesaria.
5. **Configuración/TLS:** matriz local/production y sqlite/postgres; NODE_ENV no cambia selección; ausencia de URL, driver inválido, parámetros ambiguos y disable remoto/producción rechazados. Con PostgreSQL temporal TLS: conexión válida con CA/hostname correctos, certificado no confiable y hostname incorrecto rechazados sin fallback. Conexión/credencial inválida no filtra URL/contraseña en stdout/stderr.
6. **Guard transitorio:** procesos reales `start:api` con postgres/production salen no cero sin escuchar ni crear SQLite/directorios. También llamada directa a composición. `db:migrate` PostgreSQL funciona sin DATA_DIR/claves/webDir y no crea archivos funcionales locales. local+sqlite conserva humo HTTP de salud/login/guardar/reabrir recurso temporal.
7. **Compatibilidad:** suite existente conserva escenas v1/v2, imágenes/mapas/enlaces, repositorios legados y Electron local. No adopción de propietario ni cambio de formato. Centinelas del almacenamiento legado permanecen intactos al migrar el catálogo nuevo.
8. **Operación reproducible:** scripts reales, logs/versión de cada motor y Node, reinicio/reapertura y limpieza de procesos propios acreditados. Setup conserva archivos privados y tests actuales. Guía de drivers/migraciones enlazada desde README y guía operativa explica separación control/legado y límites productivos.
9. **Entrega:** checks comunes/builds completos, 3.8.0/changelog, sin credenciales ni datos de prueba en repositorio. Ningún skip o mock se presenta como aprobación del motor PostgreSQL.

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `a64b5e9dcf7ba60be28047f890ab7edfecbb82df`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/006-persistencia-multidb/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/006-persistencia-multidb/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/006-persistencia-multidb/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
