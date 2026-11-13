# Criterios de la entrega inicial — SDD 47

Rescatados el 2026-11-13 del expediente `007-cuentas-dm` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. Los bloqueos transitorios de PostgreSQL/servidor fueron retirados en SDD 51; el alta de administradores y contraseñas evolucionó en SDD 53.

## Criterios conservados

| Criterio | Evidencia requerida |
| --- | --- |
| Dependencia y composición | Decisión APROBAR y contrato final 006 leídos antes de construir; integración usa driver/migraciones aprobados. Modo desactivado preserva servicio anterior; activación inválida falla sin crear archivos/DB inesperados. |
| Bootstrap/provisión | TTY sin eco, cancelación limpia, password ausente de argv/logs; bootstrap repetido rechazado y carrera de dos procesos crea exactamente un administrador. DM/anónimo no pueden crear usuarios ni autoelevarse, incluida invocación directa de rutas internas de biblioteca. |
| Contraseñas | Inspección de hashes persistidos, sales distintas para la misma contraseña, parámetros efectivos, límites sin truncamiento, verificación correcta/incorrecta/corrupción, cambio/reset y credencial anterior rechazada. Sin secretos en respuesta ni logs. |
| Roles/estado | DTOs mínimos, email canónico único con carrera real, admin crea solo DM; DM no lista/administra otras cuentas. Contraseña temporal limita operaciones. Disable/reset y revocaciones no dejan sesiones utilizables; enable no las restaura. |
| Sesiones y CSRF | Login rota token, cookie correcta HTTP loopback/HTTPS, fijación rechazada, expiración absoluta, logout-all, restart documentado, secreto rotado; Origin ausente/null/ajeno y Host distinto rechazados. Pruebas con dos instancias contra misma DB demuestran revocación sin cache obsoleta. |
| Concurrencia | Login detenido durante hash frente a disable/reset; mutación administrativa detenida durante cuerpo frente a logout/revocación; tras confirmación de la revocación no hay nueva sesión útil ni escritura tardía no autorizada. Rollback real no deja cuenta/credencial/estado parcial. |
| Frontera legada | Matriz anónimo, DM/admin nuevos, DM/jugador legados y cookies combinadas sobre cada familia global y de identidad. GET/HEAD/assets/resolve, SSE, dados y mutaciones incluidos; cero bytes privados con credencial nueva sola. |
| Multi-DB real | Mismo contrato de cuentas/sesiones/revocación/migración/rollback ejecutado contra SQLite temporal y PostgreSQL real temporal; migración desde vacío, segunda ejecución idempotente y reinicio conservan identidad. No mocks/SQLite como sustituto de PostgreSQL ni skips verdes. |
| Coste/errores | Ráfaga real de logins válidos/erróneos/inexistentes sobre implementación de hash: cuota, 429 y cupos medidos, health/logout responden; entradas malformadas y fallo DB no filtran SQL, secretos ni crean sesiones. |
| Compatibilidad/operación | Formato v2/migración v1 intactos, Electron local y cliente servicio legado conservados. Guía enlazada especifica provisión, recuperación, revocación, backup de identidad y secreto separado, diferencias frente a sesiones legadas y corte pendiente 011. |

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `a64b5e9dcf7ba60be28047f890ab7edfecbb82df`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/007-cuentas-dm/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/007-cuentas-dm/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/007-cuentas-dm/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
