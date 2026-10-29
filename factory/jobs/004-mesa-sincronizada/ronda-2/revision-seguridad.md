VEREDICTO: APROBADO

# Revisión independiente de seguridad — 004, ciclo 1, ronda 2

Fecha: 2026-10-29. Revisor: seguridad_004. Rama `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Las **520 huellas** de esta ronda coinciden con los archivos revisados. No se modificaron implementación, Git, tablero ni informes ajenos.

## Alcance

Aplicado el perfil `.codex/agents/seguridad.toml`; revisados solicitud, spec, build actualizado, identidad/diff de ronda 2 y cambios frente a las huellas de ronda 1. Se inspeccionaron directamente `table-session.ts`, `table-http.ts`, `http.ts`, la adaptación del cliente a los ACK compactos, regresiones nuevas y documentación. Se mantiene la revisión de la frontera pública de la ronda anterior y se vuelven a ejecutar sus pruebas HTTP/SSE y de privacidad.

No se identifican hallazgos de seguridad pendientes en el alcance examinado. Los dos bloqueos anteriores quedan cerrados mediante código y reproducción, no solo por el informe del constructor.

## Cierre de hallazgos

### SEG-004-01 — Cerrado: deduplicación compacta y presupuestos por rol

`src/server/table-http.ts` devuelve `{ok:true}` para reportes, ready, estado de imagen y acciones que no necesitan bootstrap; conserva snapshot en open/scene. El cliente `table-client.ts` valida ese ACK sin exigir estado completo. `src/application/services/table-session.ts` mantiene reservas independientes: 20.000 resultados por rol, 64 MiB DM y 8 MiB jugador. El rol de esa cuota procede de la sesión autenticada. El UUID y fingerprint conservan su retención de cinco minutos; una saturación jugador no consume la reserva DM.

Reejecuté el reproducer independiente de ronda 1, recompilando las fuentes actuales a bundles temporales. Misma escena de **367.308 bytes**, 20 trazos de 500 puntos, stream jugador real y reportes con contexto/conexión válidos a 10 Hz mediante reloj controlado:

- Ronda 1: fallaba el reporte 183 y también una orden DM.
- Ronda 2: **300 reportes aceptados**, respuestas compactas; la orden DM `/table/pointer` posterior devuelve **200**.

Además, la prueba HTTP nueva ejecutada acepta **500 reportes** sobre escena grande, comprueba respuestas de menos de 100 caracteres y éxito de la orden DM. La prueba de TableSession llena 20.000 UUID jugador y acredita que la reserva DM sigue disponible, que cambiar el fingerprint a 299.999 ms produce conflicto y que a 300.000 ms vence la retención. La corrección conserva idempotencia en lugar de desalojar prematuramente resultados.

### SEG-004-02 — Cerrado: revalidación tras esperas

`src/server/http.ts` captura la identidad de sesión y la vuelve a comprobar después de leer el cuerpo, antes de ejecutar mesa/dados. Una sesión revocada o distinta produce 401; no se adopta el rol de otra sesión. `protectedJson` aplica la misma comprobación a las rutas de escenas, enlaces, bibliotecas, plantillas y resolve. La subida de imágenes revalida después del cuerpo y después de decodificar antes de persistir; se preservan los controles existentes de MIME, límites y rutas.

Reejecuté la petición parcial original: iniciar `/dice/context` con cookie DM, enviar un carácter, completar logout y después terminar el cuerpo. Resultado actual: **logout 204, petición pendiente 401 UNAUTHORIZED**, en lugar del 200 con estado DM de ronda 1.

Las nuevas regresiones HTTP ejecutadas cubren logout, rotación y caducidad: todas devuelven 401 y comprueban que el contexto de dados no se aplicó. La matriz adicional prueba cuerpos pendientes en siete rutas (mesa, assets/resolve, escenas, enlaces, plantillas, bibliotecas y upload): todas rechazan con 401 después de logout.

## Evidencia ejecutada

Comando independiente:

`pnpm test src/server/table-http.test.ts src/server/http.test.ts src/server/auth.test.ts src/application/services/public-table-projection.test.ts src/application/services/table-session.test.ts src/infrastructure/browser/table-client.test.ts`

Resultado: **6 archivos, 73 tests aprobados**, 2,86 s. Además de las correcciones incluye privacidad del DTO, cookies separadas, rol falsificado por query rechazado, assets GET/HEAD/resolve vigentes y revocados, dados ocultos, conexión/contexto ajeno, consumidores lentos, reconexión y limpieza.

Reproducer independiente: `pnpm exec node /tmp/ttrpg-004-security/probe.mjs`. HTTP, SSE y cookies reales; bundles reconstruidos con esbuild instalado desde las fuentes congeladas. Directorio SQLite temporal eliminado y API/streams cerrados al finalizar. No se añadieron archivos de prueba a la implementación congelada.

## Fronteras conservadas y límites

La corrección no cambia el constructor público, formatos de escena, validadores de assets, CSP, preload, SQL ni configuración Electron examinados en ronda 1. Se conservan aislamiento Electron, APIs limitadas, Host/Origin, cookie HttpOnly/SameSite, ausencia de claves en URL, no-store/nosniff y exclusión de rutas/URLs arbitrarias de assets. Las pruebas de proyección y autorización vuelven a pasar. La promoción de principal envía estado autorizado jugador, sin introducir payloads privados del DM.

Las cuotas siguen siendo finitas y compartidas dentro de cada rol, tal como documenta `docs/synchronized-table.md`; esta aprobación verifica que el tráfico jugador ya no retiene snapshots por reporte ni consume la reserva de deduplicación DM. No constituye una prueba de resistencia a ataques distribuidos ni una auditoría de TLS/proxy o dependencias.

No se operó UI ni se repitieron builds generales: esta ronda de seguridad verificó las rutas afectadas, sus regresiones y el reproducer propio. Los resultados visuales y compilaciones de build.md pertenecen a sus autores. Se conserva el límite publicado sobre píxeles de mapas y bytes descargados antes de revocación. La aprobación es técnica del alcance de seguridad, no autorización para integrar o desplegar.
