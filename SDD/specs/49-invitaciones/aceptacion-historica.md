# Criterios de la entrega inicial — SDD 49

Rescatados el 2026-11-13 del expediente `009-invitaciones-jugadores` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git.

## Criterios conservados

| ID | Resultado observable requerido |
| --- | --- |
| A1 — Contextos | Dos DMs A/B y partidas A1/A2/B1, con sistemas/versiones diferentes: propietario controla solo su partida; admin/anónimo/legado no inician, rotan o mantienen leases. IDs/body/roles manipulados no cambian dueño ni SystemRef. Invitado no recibe puertos privados. |
| A2 — Secreto | 32 bytes CSPRNG, codificación canónica, DB contiene solo hashes; enlaces con fragmento, no query. Logs/respuestas/eventos fuera de primera entrega no contienen centinelas de secreto/token. GET no admite ni revela metadatos privados. |
| A3 — Lease | Reloj determinista prueba 29.999 s/30 s/149.999 s/150 s; admisión solo fresca, gracia conserva invitados, resume no rota, vencido no revive. Reapertura explícita sí cambia generación y enlace; heartbeat/SSE/pestaña no lo hacen. |
| A4 — DM y restart | Sesión patrocinadora revocada no conserva admisión por timestamp; otro contacto válido puede reanudar dentro de plazo. Restart exige presencia nueva y no regala otra gracia. Cuenta deshabilitada/partida archivada o eliminada corta autorización; enable/restore no resucita apertura ni invitados. |
| A5 — Alias | Unicode/NFC/límites/controles/bidi/HTML tratados según contrato; repetidos aceptados con IDs y discriminadores estables distintos. Alias no autoriza reentrada ni otra partida. |
| A6 — Credencial | Cookie independiente, HttpOnly/Secure/SameSite/path/salida correctos; tokens no aparecen en JSON/storage. Recarga con cookie conserva identidad; cookie A no autoriza B y cookie guest no autoriza identidad/DM/legado. |
| A7 — Rotación | Dos invitados admitidos conservan exactamente sus credenciales/IDs tras rotar; nuevo join con enlace viejo falla, nuevo funciona. Expiración de invitación no expira invitados por sí sola. Reabrir sí invalida ambos por nueva apertura. |
| A8 — Carreras | Barreras reales join/rotate, join/close, join/reopen, heartbeat/deadline, disable/join, capacidad concurrente y dos rotaciones/reaperturas CAS aun con revisión de partida intacta. Catch/allSettled/sin await/rechazos falsy/puerto escapado/DTO mutado no permiten confirmación parcial. Estado final válido y rollback sin participantes/credenciales huérfanos por commit parcial. |
| A9 — Idempotencia | Reintentos iguales no duplican efectos; payload distinto 409; contexto distinto no comparte resultado; replay sin secreto recuperable devuelve metadatos/estado explícito, nunca roto de nuevo. Admisión duplicada con/sin cookie según contrato; contexto de retry estable tras nueva generación; heartbeat no consume operaciones durables; cuotas se cumplen. |
| A10 — Ambos motores | Misma suite de contrato contra SQLite temporal y PostgreSQL real: migración vacía/4→5, checksums históricos, constraints, clocks/fechas, atomicidad, persistencia/revocación tras reabrir conexión y restart. No skips verdes ni emulación PostgreSQL. |
| A11 — Coste y privacidad | Ráfagas HTTP con IDs/tokens inválidos: 429/capacidad/memoria acotados; errores uniformes no enumeran partidas ni anfitriones. Host inválido y Origin ausente/null/ajeno en mutaciones rechazados; GET puede omitir Origin. Cuerpos sobredimensionados/chunked, cookies ambiguas y entradas malformadas rechazados. |
| A12 — Transición | Principal invitado todavía no accede a proyección global ni datos privados 008; contratos para 010 entregados sin fingir SSE ya implementado. Electron local, formato de escena y login legado mantienen pruebas existentes. |
| A13 — Catálogo retenido | Apertura/reapertura/admisión en partida cuya versión se deshabilitó conserva referencia/hash exactos; otra versión publicada no los cambia. No habilita nuevos usos ni revela borradores/privadas. Falta/corrupción de referencia falla sin fallback. |
| A14 — Cliente y operación | Módulo de fragmento limpia history antes de fetch/opcionales y no persiste secreto; guía explica perder enlace, nueva rotación, expiración, reconexión frente a reapertura, admisión incierta y restauración segura. |

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `a64b5e9dcf7ba60be28047f890ab7edfecbb82df`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/009-invitaciones-jugadores/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/009-invitaciones-jugadores/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/009-invitaciones-jugadores/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
