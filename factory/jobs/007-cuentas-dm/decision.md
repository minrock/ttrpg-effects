APROBAR

# Decisión técnica — 007, ciclo 1, ronda 1

Se aprueba técnicamente el alcance 007 sobre el checkout canónico y la evidencia congelada de esta ronda. Se leyeron solicitud vigente, spec, build, revision.md, las cuatro revisiones completas, base-archivos.json y código pertinente. Seguridad, UX, UI y Código emiten VEREDICTO: APROBADO. Las 565 huellas SHA-256 coinciden y el delta frente a la base contiene los 33 archivos declarados; no se detectó deriva durante esta decisión.

## Aceptación y observación UX

Los criterios de identidad persistente, administración exclusiva, credenciales, revocación, concurrencia/rollback, barrera legada, ambos motores reales y operación están respaldados por implementación y evidencia. No quedan defectos obligatorios del alcance identificados en esta ronda ni decisiones de producto necesarias para aceptar 007.

Se examinó expresamente **UX-007-01** contra el código y la spec: los prompts secundarios no recuerdan la política de contraseña y el error de entrada inválida no distingue una contraseña nueva fuera de límites de una idéntica a la actual. El revisor lo clasifica como menor, no bloqueante, y confirma el recorrido y la documentación. La spec exige prompts cancelables, mensajes en español, recuperación y privacidad; no exige repetir la política en cada prompt ni códigos diferenciados para esos dos casos. Los comandos cumplen esos requisitos y la guía expone la política. Por ello se considera una recomendación opcional de ayuda, no un defecto pendiente de aceptación. Se conserva íntegra en la revisión UX y no se declara corregida. La condición del perfil «ningún hallazgo pendiente» se evalúa sobre defectos pendientes del alcance, sin convertir esta sugerencia en un requisito nuevo.

## Evidencia contrastada

- `src/infrastructure/server/identity/index.ts`, `password.ts` y `database.ts`: Better Auth 1.7.14/Kysely 0.29.7 fijados; scrypt estándar N131072/r8/p1 con parámetros cerrados y dos KDF simultáneos; sesiones persistentes sin cache/renovación; revalidación después de KDF/cuerpo y transacción común para credenciales, estado, revocación y auditoría. La migración 2 utiliza la autoridad006; el callback autorizado presta recursos006 con caducidad y rollback.
- `src/server/identity-http.ts` y `http.ts`: rutas explícitas, DTO limitado, Host/Origin, JSON acotado y autorización administrativa previa al cuerpo. La identidad no se convierte en autoridad del guard legado. No se monta el handler general de Better Auth. CLI comparte los casos de uso, solicita secretos sin eco y revoca su sesión temporal.
- `package.json`, lockfile y CHANGELOG: versión 3.9.0 con un único bump minor y entrada fechada. Se mantiene formato de escena v2 y no hay cambios de vistas/preload.
- Se contrastaron los logs del constructor: typecheck y lint; 128 archivos/1201 pruebas generales; 25 contratos de identidad; 32 contratos DB; builds API, Electron y web. Se conserva la delimitación temporal de build.md: cambios posteriores solo en servidor/CLI/tests/docs, con API y gate identidad finales. No se presentan como ejecuciones propias del aprobador.
- Código ejecutó independientemente 25/25 contratos en 53,10 s; Seguridad completó después 25/25 en 52,59 s. Ambos informes corresponden a las mismas huellas. UX verificó siete recorridos PTY reales SQLite, ausencia de secretos y restauración de terminal. UI comprobó ausencia de cambios visuales; no se exige anticipar011.

## Timeout y riesgos residuales

Seguridad registró inicialmente 24/25 PASS y un timeout del contrato PostgreSQL de bootstrap/cambio/alta/persistencia: 126717 ms ante límite de 30000 ms; duración total178,61 s. Los dos gates posteriores completos de Código y Seguridad terminaron25/25 sin cambio de código ni límites. La contención o pausa del host sigue siendo hipótesis, no causa demostrada. El episodio se conserva como riesgo de reproducibilidad a investigar si reaparece; no se presenta como éxito inicial ni demuestra por sí mismo un defecto funcional pendiente tras ambas ejecuciones completas.

No hay prueba nueva CUA/proyector ni certificación de despliegue, carga prolongada, defensa horizontal o backup/restore operativo. Las cuotas son locales; el puente interno de Better Auth requiere reevaluación al actualizar. El VTT completo en PostgreSQL/producción continúa bloqueado por diseño. Propiedad funcional, invitados, moderación y pantallas008–011 quedan fuera de esta aprobación. La recomendación UX permanece disponible como mejora opcional.

## Siguiente acción y autorización

El orquestador puede continuar008 y, después de sus aprobaciones técnicas sucesivas,009–011 conforme a la continuación expresa de solicitud.md. La dependencia007 no necesita integración previa para avanzar. Esta aprobación es exclusivamente técnica: no autoriza staging, commit, push, merge, despliegue ni DMG; se mantiene la rama y el checkout autorizados. La falta de permiso de integración no constituye un bloqueo técnico ni justifica solicitar un merge prohibido.

Solo se publicó decision.md mediante temporal y renombrado. No se modificaron código, Git, tablero, specs, revisiones ni datos/configuración originales; no se ejecutaron procesos de prueba nuevos ni se detuvo PostgreSQL temporal.
