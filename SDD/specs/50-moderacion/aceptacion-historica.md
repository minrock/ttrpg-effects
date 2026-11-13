# Criterios de la entrega inicial — SDD 50

Rescatados el 2026-11-13 del expediente `010-moderacion-tiempo-real` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git.

## Criterios conservados

| ID | Evidencia exigida |
| --- | --- |
| A1 — Autorización/roster | Principales reales 007/009; solo owner ve/modera su apertura. Admin, DM ajeno, legado, anónimo y datos falsificados no autorizan. Lista/totales/estados correctos; alias repetidos se distinguen por ID, sin metadata privada ajena. |
| A2 — Atomicidad/idempotencia | Revocación de todas las credenciales + invitación + auditoría/revisión/resultado se confirman juntos. Fallo intermedio revierte todo. Repetición concurrente y requestId nuevo sobre revoked no rotan otra vez; contenido distinto 409. Replay perdido/restart confirma sin secreto. |
| A3 — Supervivientes | Expulsar uno de tres conserva cookies, IDs, streams, cámaras y dados de los otros. Enlace viejo falla, nuevo admite. Expulsar principal promueve solo dentro de su partida sin mover cámara ni producir tirada. |
| A4 — Revocación en vuelo | Barreras en body, DB, escritura/frame y backpressure: revocar y liberar no muta ni encola datos nuevos del objetivo. Todos sus streams cierran antes del ACK. GET/HEAD/resolve/dedup/304/Range y cookie copiada no eluden rechazo. |
| A5 — Carreras | join/kick, kick/close/reopen, dos kicks iguales/distintos, lease/heartbeat y revocación DM respetan orden transaccional. Join que ganó antes puede sobrevivir como otro ID; con enlace viejo después del kick falla. Ningún resultado antiguo muta nueva apertura. |
| A6 — Aislamiento | A1/A2 del mismo DM y B1 de otro: publicaciones, assets, cámaras, dados, cursores y dedup separados; UUID iguales en otro contexto no comparten resultado. Asset compartido sigue accesible solo donde esté publicado y autorizado. Datos privados no aparecen en bytes jugador. |
| A7 — Ciclo de vida | Fronteras 29.999/30/149.999/150 s y token a 8 h según 009; caída/resume, cierre/reapertura, disable y restore. Restart da epoch nuevo/runtime vacío, no nueva gracia ni invitación por reconexión. |
| A8 — Exclusión/cuotas | Segundo proceso contra la misma base falla antes de servir; caída/pérdida de propiedad detiene al anterior y permite recuperación sin dos emisores. Límites de runtimes/streams/buffers y limpieza reales; cuerpo lento ajeno no bloquea moderación. |
| A9 — Cliente | Terminal limpia y detiene retry solo del contexto; respuesta tardía tras abort no repuebla. Sobrevivientes no se limpian; reemplazo de stream no crea bucle entre pestañas. No atribuirlo todavía a panel visual de 011. |
| A10 — Multi-DB/entrega | Retención exacta del sistema/hash, versiones deshabilitadas y centinelas privados comprobados. Mismo contrato HTTP/DB/SSE y carreras en SQLite/PostgreSQL reales; checks/builds, migraciones y humo compilado. Escena v2/Electron local preservados; sin skips verdes, Git write o despliegue. |

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `ae5c654f74962b1f6c8de18055d87f9192d1f9ce`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/010-moderacion-tiempo-real/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/010-moderacion-tiempo-real/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/010-moderacion-tiempo-real/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
