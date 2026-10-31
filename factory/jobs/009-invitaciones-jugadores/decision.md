APROBAR

# Decisión técnica de 009 — ciclo 1, ronda 1

Fecha: 2026-10-30. Aplicación 3.11.0. Se aprueba el alcance backend de invitaciones renovables y participantes con alias definido en la spec vigente. Los criterios A1–A14 están satisfechos por la implementación y la evidencia revisada. No quedan hallazgos obligatorios, checks fallidos ni decisiones de producto pendientes dentro de 009.

## Identidad y evidencia

Se leyeron el perfil aprobador, AGENTS.md, solicitud, spec, coordinación, build, identidad de revisión y las cuatro revisiones completas. Seguridad, UX, UI y Código comienzan con `VEREDICTO: APROBADO`; ninguno solicita correcciones. La coordinación registra el término de los cuatro agentes antes de esta decisión.

Comprobación propia: las 616 huellas SHA-256 de `ronda-1/huellas.json` coinciden con los archivos actuales, también inmediatamente antes de publicar esta decisión. La comparación con `base-archivos.json` identifica 37 archivos nuevos/modificados de 009. Rama real `feature/factory-006-persistencia-multidb`, HEAD `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`, coincidentes con la identidad congelada. La entrega continúa sin integración.

Se contrastaron directamente los servicios de anfitrión y autoridad invitada, repositorios y registros, unidad transaccional compartida, transporte HTTP, presencia, invalidación de restauraciones, módulo de fragmento, guía y aserciones de contratos. La evidencia respalda:

- A1/A2/A5/A6/A11: autoridad por partida/apertura, SystemRef de servidor, secretos independientes de 32 bytes y hashes contextualizados, DTO sin credenciales ni datos privados, alias Unicode y discriminador, cookies por partida, validación HTTP y cuotas acotadas.
- A3/A4/A7/A8/A9: contacto fresco de 30 segundos y lease de 150, reinicio sin presencia implícita, disable sin resurrección, rotación que conserva admitidos, CAS e idempotencia sin recuperar secretos. La admisión comparte exclusión real con identidad/propiedad, revalida antes de confirmar y no entrega token ante COMMIT incierto; los contratos usan barreras y comprueban rollback de escrituras parciales y rechazos capturados/falsy.
- A10/A12/A13/A14: migración 5 y persistencia en ambos motores, publicación exacta retenida, humo del artefacto compilado y comandos reales de migración/invalidación. Se conserva la frontera con el legado y se entrega el módulo de fragmento para su futura integración en 011.

## Checks y atribución

Se comprobaron los logs del constructor referidos en build.md: suite general 129 archivos/1206 pruebas; invitaciones 36/36, propiedad 46/46, identidad 25/25 y DB 32/32. Los contratos completos usan SQLite físico y PostgreSQL real, sin skips. Los logs de typecheck/lint no registran errores y los de builds Electron, web y API muestran finalización satisfactoria. La auditoría del constructor registra PostgreSQL 17.10 con cero bases y conexiones de fixtures.

Evidencia independiente de revisión: Seguridad ejecutó 36 contratos y dos probes propios en ambos motores; se comprobó además el log de estos dos probes. Código verificó 15 casos dirigidos SQLite, incluido artefacto compilado. UX y UI ejecutaron cinco pruebas de cliente cada uno. Son pasadas independientes de los mismos casos cuando corresponde, no nuevas pruebas acumulables. Este aprobador inspeccionó fuentes, huellas y logs; no reejecutó gates ni accedió a bases, servicios o configuración privada.

## Riesgos residuales y siguiente acción

La aprobación no certifica pantallas, navegación real de entrada, foco/teclado ni proyección física: el módulo de fragmento aún no está conectado a una pantalla. Moderación, proyección y SSE pertenecen a 010; experiencia visual y corte productivo a 011. Se mantiene un proceso API por base. Una respuesta perdida antes de instalar cookie puede consumir otra admisión; el alias no prueba identidad humana. Restaurar una copia integral exige invalidar el acceso antes de servirla. No se certifican carga prolongada, escalado horizontal ni backup PostgreSQL productivo. Persisten los avisos conocidos de canvas/jsdom, tamaño de chunks y consultas concurrentes de pg 8; la actualización a pg 9 requiere revisar esa compatibilidad.

Siguiente acción: el orquestador puede cerrar técnicamente 009 y registrar el resultado. Esta decisión no autoriza staging, commits, push, merge, despliegue ni DMG; cualquier integración espera la orden expresa del usuario. No se modificaron producto, Git, tablero ni informes ajenos. La única salida es esta decisión publicada mediante temporal y renombrado atómico.
