# Coordinación010

Checkout único /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects. Rama feature/factory-006-persistencia-multidb, HEAD e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3. Dependencia009 aprobada, evidencia histórica inmutable. Sin Gitwrites/commits/merge. Constructor único edita producto; orquestador solicitudes/tablero/cola.

Preparación: reconciliar spec con009 real y preparar nuevoPG temporal. No iniciar construcción hasta spec final y orden del orquestador.

## PostgreSQL disponible

PostgreSQL17.10, loopback55283, runtime /private/tmp/ttrpg-auth-pg-cm9vzhn3, socket /tmp/pgs-hmpo6nwb. Paquete @embedded-postgres/darwin-arm64@17.10.0-beta.17 verificado SHA512; bibliotecas dentro del runtime. SCRAM/TLS conCAverificada, conexiónreal inicial confirmó17.10/cero bases yconexionesfixtures. Configuraciónprivada0600 /tmp/ttrpg-auth-pg-env.json: no imprimir. Wrapper python3 /tmp/ttrpg-auth-pg-run.py <script-pnpm> [args]. Solo orquestador detiene/reconfigura/retira; constructores/revisores limpian sus fixtures. No ejecutar setup contra clúster activo.

## Construcción ciclo 1

Especificador finalizó spec.md. Constructor único: /root/constructor_010. PostgreSQL temporal reservado en exclusiva para sus gates durante construcción. Base de 616 huellas capturada antes de cambios010. Cierre de versión previsto3.12.0 una sola vez. Orquestador mantiene el dashboard; producto congelará solo tras finalización explícita del constructor.

## Pausa por integración autorizada

El usuario pidió subagente de integración de006–009 y continuar010 después. /root/integracion_006_009 prepara checkout separado. Constructor010 pausado trasbuildAPI correcto, contratos iniciales8/8 ycliente2/2; carreras/exclusión ampliadas escritas pero pendientes de ejecutar. No es build final ni aprobación. Constructor reconstruye copias externas pre010 de19archivos modificados con verificaciónSHA contra base010; no revierte checkout. Luego se reanuda mismo constructor. Autoridad de Git solo para006–009 según factory/integracion-006-009-solicitud.md.

## Reanudación tras integración local — 2026-10-31

006–009 y fix012 integrados enmain: producto a64b5e9dcf7ba60be28047f890ab7edfecbb82df, cierre feef7120e0a3145ddd345eed714deef3542007d4. DMG3.11.1arm64 verificado. Constructor010 continúa en mismo checkout/rama feature/factory-006-persistencia-multidb, HEAD e1fd3ee sin mover rama ni Gitwrites. La autorización de integración cubrió006–009+fixnecesario012;010 sigue sin staging/commit/merge. La base de revisión010 ahora es main feef7120e0a3145ddd345eed714deef3542007d4; base-archivos-pre-integracion.json conserva base anterior y base-archivos.json refleja archivos de main integrado. No existió ronda010 antes de esta actualización.

Antes de continuar producto010, incorporar el fix012 aprobado a package/lock/changelog del checkout mediante comparación con main, preservando script test:moderation y todos los cambios010: vite7.3.3devdirecto, importerlock exacto y entrada3.11.1. Versiónfinal010 sigue3.12.0 una sola vez. Leer spec/build/decision012 y factory/integracion-006-009.md. Constructor es único escritor de estos tres archivos en este checkout. No copiar producto009 sobre010 ni revertir cambios. PostgreSQL temporal original010 sigue17.10/cero bases y conexionesfixtures (auditoría de reanudación correcta); wrapperprivado de coordinación vigente. Retomar pruebas ampliadas de carreras/exclusión y humo compilado, completar todos los gates010 y build.md final.

## Diagnóstico de arranque solicitado por el usuario — 2026-10-31

Durante construcción010 el usuario pidió revisar por qué no podía ejecutar servicio en checkout original. Orquestador reprodujo pnpmstart:api fallando por TTRPG_DATA_DIR: packageoriginal actual3.6.0/feature-configuracion-env aún usa node sin loader.env. No hubo edicionesproducto/Git allí. A petición de diagnóstico, inició build originalexistente3.7.0 con node --env-file=.env out/api/index.mjs; sesiónexec59098,loopback8787. APIhealth200 yHTML200 conAccept:text/html. Se abrió URLenapp; configuraciónsecretos no impresos ni modificados. Servicio queda activo para usuario; no detener al limpiarPGtemporal010. No confundir este runtimeviejo con main3.11.1ni010. Cambiosdeestadooriginal posteriores a snapshotsprerrequisito no se atribuyen a esteconstructor.

## Revisión ciclo 1, ronda 1

Constructor010 terminó explícitamente y publicó build.md final. Código congelado mediante ronda-1/revision.md y huellas.json. Seguridad tiene uso exclusivo del PostgreSQL temporal durante esta ronda; Código/UX/UI pueden usar pruebas sin DB o SQLite temporal propio sin tocar fixtures de Seguridad. Si Código necesita PG, debe coordinar el turno. No hay otro escritor de producto. Los cuatro revisores trabajan independientemente y solo escriben su informe propio. La continuación011 espera decisión técnica010.

## Corrección tras ronda 1 completa

Los cuatro revisores finalizaron. Seguridad, Código y UX pidieron CAMBIOS; UI aprobó. Las637huellas se comprobaron intactas antes de reanudar. Seguridad liberó PG con cero bases/conexiones/locks de fixtures. El mismo constructor010 recibe la ronda completa para corregir: P1 de cupos HTTP/cancelación de cuerpos; P2 de bootstrap perdido al publicar durante registro SSE; P2 de contexto viejo tras reapertura y reconexión. No hay decisiones de producto pendientes. Mantener versión3.12.0 y alcance010, sin tocar UI011. Añadir regresiones pertinentes y verificar el delta; conservar informes de ronda1 inmutables. Después se abrirá ronda2, la última del ciclo1.

## Revisión ciclo 1, ronda 2

Constructor finalizó corrección y publicó build SHA256 40d37f16a2fe88393996cf78b3e1a8c7503a417a745c40af57a26ad422f56ad8. Ronda2 congelada; no modificar producto. Seguridad tiene PG exclusivo durante revisión; Código/UX/UI solo pruebas sin DB o SQLite propio, avisar si necesitan PG. Constructor liberó PG con cero fixtures/conexiones/locks. Revisores deben verificar corrección de sus hallazgos y regresiones, fuentes completas y evidencia final, sin considerar esta nota aprobación. Orquestador esperará cuatro informes finales y cuatro agentes terminados.

## Ronda 2 cerrada — necesita persona

Los cuatro revisores finalizaron y las 638 huellas siguen intactas. Seguridad, UX y UI APROBADO; Código CAMBIOS por un nuevo P2 reproducido: el socket SSE puede cerrar mientras espera la segunda autorización y registrarse después, dejando presencia y cuota sin transporte. Informe y probe en ronda-2/revision-codigo.md. Los tres hallazgos de ronda1 quedaron resueltos. No se ejecuta aprobador ni merge con este pendiente.

Se solicitó al usuario un nuevo ciclo explícito `/factory rehacer 010-moderacion-tiempo-real`, según límite de dos rondas de skill. No se ha reanudado constructor ni incrementado ciclo sin respuesta. 011 conserva spec reconciliada y espera aprobación010. PG liberado por Seguridad con cero fixtures/conexiones/locks, servicio habitual intacto.

Al quedar pendiente autorización de nuevo ciclo, el orquestador detuvo únicamente PostgreSQL temporal010 con pg_ctl stop (exit0). Se conservaron binarios/configuración privada y herramientas de respaldo para reanudar sin initdb. Antes del próximo uso: pg_ctl del manifiesto privado, -D <root>/data -l <root>/postgres.log -w start; comprobar TLS/limpieza después. No ejecutar setup/initdb sobre este clúster existente. API original8787 y dashboard8765 siguen activos.

## Ciclo 2 autorizado

Usuario autorizó tercera ronda; leer retrabajo-ciclo-2.md. PostgreSQL temporal reiniciado correctamente, sin initdb ni cambio de credenciales. Constructor vuelve a tener PG exclusivo durante corrección; orquestador mantiene tablero.

## Ronda 3, ciclo 2

Constructor terminó explícitamente, build SHA256 8ab91e21526135bf117ef37cb863f0fb8353348fa316d6b5df8d29b1a5ca349a. Producto congelado en ronda-3/revision.md y huellas.json. Diff efectivo completo sobre base main, incluidos archivos no rastreados; tres archivos de corrección respecto a ronda2. Seguridad tiene PG exclusivo para revisión; restantes roles usan pruebas cliente o SQLite propias. Esperar cuatro informes y agentes terminados antes de decidir.

## Integración terminada

APROBAR ciclo2/ronda3. Producto integrado en main ae5c654f74962b1f6c8de18055d87f9192d1f9ce y DMG3.12.0 arm64 verificado, detalle en integracion.md. Las638 huellas fuente/destino siguen intactas. Tablero/cola actualizados por orquestador. Cierre documental local autorizado, sin push. 011 puede comenzar tras registrar base final; servicio anterior8787 continúa activo hasta corte011.
