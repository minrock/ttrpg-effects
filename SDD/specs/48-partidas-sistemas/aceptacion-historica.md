# Criterios de la entrega inicial — SDD 48

Rescatados el 2026-11-13 del expediente `008-partidas-propiedad` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. La recuperación de estado y la retención de una copia por escena se definen actualmente en SDD 58.

## Criterios conservados

| ID | Resultado verificable |
| --- | --- |
| A1 — Composición y autoridad | Catálogo/transacciones 006 y principal real 007; A/B/admin/legado/anónimo con matriz HTTP y puertos. Admin solo administra definiciones; DTO mutado/owner falso/puerto escapado no concede recursos privados. Ningún fallback SQLite en nueva composición PG. |
| A2 — Partidas | CRUD previo, CAS/revisiones, varias partidas por DM, sistema/version explícitos e inmutables; archivo/borrado invalida apertura y conserva recursos. Migración de partida histórica mantiene datos y perfil de compatibilidad. |
| A3 — Privacidad | Todos los caminos incluidos HEAD/resolve/export/count y enlaces filtran owner. Plantillas históricas coincidentes entre owners siguen privadas y no aparecen en catálogo admin/otro DM. |
| A4 — Catálogo retenido | Admin crea/edita borrador/publica; DM no puede. Borrador invisible, payload publicado inmutable, nueva versión no cambia instancia previa. Deshabilitar/rehabilitar versión y plantilla conservan hashes/lectura; no DELETE ni puerto capaz de borrar aun sin referencias. |
| A5 — Consumo y coherencia | Instancia existente se lee/edita/exporta con definición deshabilitada; alta/copia/import/nuevo vínculo falla sin escrituras. Escena guardada distingue IDs existentes/nuevos. Partida/recurso de otra versión se rechaza incluso con mismo nombre; resolvedor entrega datos/reglas/presentación separados. |
| A6 — Concurrencia | Ambos órdenes entre conexiones y dentro de Promise.all: creación frente a deshabilitación, edición retenida frente a deshabilitación, cambio de binding, publicación concurrente/CAS, intento remove+put histórico. Estado final siempre válido y exportable; rechazos capturados/operaciones pendientes no confirman parcial. |
| A7 — Idempotencia/revocación | Mantener replay tras reinicio, revocación durante body/espera, contenido distinto, presupuesto/retryAt y resultado excesivo. Replay previo a deshabilitación no crea otra instancia; admin revocado no publica/deshabilita tarde. |
| A8 — Runtime/aperturas | Lease/generación y contextos aislados, mismo owner/dos partidas; validación de sistema sin cambiar viewport. Fallo tardío/revalidación/COMMIT incierto no filtra publicación ni efectos. No afirmar invitados/SSE implementados. |
| A9 — Ambos motores/migraciones | Misma suite SQLite físico/PostgreSQL real; esquema vacío y upgrade desde 3, migraciones repetidas/checksums intactos; JSON/fechas/nulls/Unicode/BLOB/bytea/constraints y cierre. Sin skips ni simulador PG. |
| A10 — Transferencia y recuperación | Legado→SQLite, legado→PG y SQLite privado con dos owners→PG vacío; paquete v1 y nuevo, seeds compatibles, versiones deshabilitadas/privadas y bindings preservados. Fallo/cancelación/commit incierto/replay/restauración y corrupción/owner ausente/destino ocupado, con fuente intacta y lecturas autorizadas posteriores. |
| A11 — Compatibilidad | Escenas v1/v2, múltiples mapas/enlaces/imágenes ausentes y bibliotecas previas. Pruebas de medición conservan resultados. Electron local sin cuentas conserva plantillas editables; sin adaptación de UI011. |
| A12 — Entrega | Documentación del alcance final/HTTP/CLI/migraciones/futuras fronteras, changelog actualizado en 3.10.0, gates verdes con atribución y límites. Sin Git write, despliegue, DMG ni datos personales. |

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `a64b5e9dcf7ba60be28047f890ab7edfecbb82df`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/008-partidas-propiedad/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/008-partidas-propiedad/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/008-partidas-propiedad/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
