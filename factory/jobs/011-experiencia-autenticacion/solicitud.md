# Solicitud — Acceso DM, invitaciones y panel de jugadores en web y Electron

Fecha: 2026-10-29T22:59:24.401498+00:00. Origen: invocación explícita `$factory` del usuario para descomponer, especificar y comenzar el desarrollo de cuentas DM/partidas/invitaciones/expulsión. Confirmó altas DM solo por administrador y PostgreSQL en producción (SQLite local).

Lee [decisiones y modelo comunes](../../autenticacion-partidas.md), AGENTS.md, README, package.json y los expedientes 001–005. Base integrada `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`. Prerrequisito copiado: configuración .env/URL 3.7.0 aún sin commit, registrada en factory/prerrequisitos-autenticacion.json. Nunca tocar el servidor/perfil/datos ni .env privados del repo original.

## Objetivo de este trabajo

Integrar en React el acceso DM por email y contraseña, el catálogo de partidas, su creación y apertura, y la acción de compartir el enlace vigente. Crear entrada de jugador con alias y estados de enlace caducado, anfitrión ausente y expulsión. Añadir un panel discreto con nombres, estado y confirmación inequívoca al expulsar; mostrar el enlace nuevo y conservar a los demás jugadores. Exponer administración de DMs mediante UI o CLI documentada, sin autorregistro. Preservar borradores, foco, teclado y modales del mapa. Retirar el acceso mediante claves globales y rutas transitorias al completar el cambio; actualizar setup y ejemplos .env sin regenerar credenciales existentes inadvertidamente. Adoptar datos legados solo mediante la migración explícita de 008, con respaldo y retorno documentado. Verificar de extremo a extremo dos DMs, varias partidas, rotaciones y expulsiones en navegador y Electron como cliente; mantener Electron local. Probar SQLite local y PostgreSQL real en modo productivo y documentar respaldo/restauración. Sin despliegue ni DMG salvo orden posterior.

## Dependencias y ejecución

Dependencias: 010-moderacion-tiempo-real. Rama prevista `feature/factory-011-experiencia-autenticacion`. Checkout para construcción 006: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Para otros trabajos, resolver checkout/rama al comenzar, no modificar Git ahora. Especificar en este checkout; código solo se construye tras aprobación técnica de sus dependencias.

Autorización: editar/especificar/implementar/probar, y rama aislada de 006. Sin staging, commits, push, merge, despliegue, modificación de servicios ajenos, credenciales reales ni DMG. Permisos previos de integración 001–005 no se aplican. Esta ejecución inicia 006; 007–011 quedan especificadas en cola. No presentar specs futuras como implementadas.

## Convenciones y alcance

Node 24, pnpm, TypeScript estricto/React/Vite/Electron/PixiJS, formato .ttrpgscene v2. Reutilizar src/server, src/infrastructure/server/database, application, shared/contracts y web existentes. Leer docs/private-api.md, docs/service-operations.md, docs/synchronized-table.md. Separar dominio, aplicación, persistencia y HTTP; motores DB solo infraestructura. Artefactos/documentación/instrucciones en español. Comandos pnpm typecheck,lint,test,build,build:api,build:web y contratos reales por driver cuando toque. Constructor único edita implementación/tests/docs/version/changelog; orquestador único escribe solicitud/tablero/cola; revisores solo informe propio. No introducir dependencias sin justificar; Better Auth candidato ya recomendado para 007, pg permitido como driver PostgreSQL 006.

Referencias y estado actual: Auth tiene dos claves globales y sesiones en memoria; ServiceStore SQLite global con tres bases; TableSession único por API. Son límites que esta serie eliminará por etapas, no garantías multiusuario existentes.

## Continuación autorizada — 007 a 011

2026-10-29. El usuario ordenó «continua con 007 a 011». Esta instrucción reemplaza el límite anterior que dejaba 007–011 solo en especificación. Implementar secuencialmente hasta 011, con sus revisiones y aprobación técnica; una dependencia aprobada puede continuar sin integración. Se conserva la restricción vigente de trabajar sin cambiar de rama ni hacer commits/merge. Checkout canónico: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`; rama efectiva para esta continuación: `feature/factory-006-persistencia-multidb`. Las ramas futuras indicadas arriba eran propuestas; prevalece esta excepción. No crear otra rama, no staging/commit/push/merge/DMG. Mantener cada evidencia previa y guardar una nueva base de archivos al iniciar cada trabajo.

006 está aprobada técnicamente; consumir sus fuentes reales y su decisión. Los bloqueos históricos de las specs que describían dependencias aún no entregadas se evalúan por la evidencia actual; no impiden avanzar tras su aprobación. Los cambios de producto, pruebas, docs y versión pertenecen exclusivamente al constructor asignado. El orquestador sigue siendo único escritor del tablero/solicitudes/cola. Nunca usar datos, env ni servicios del checkout original. PostgreSQL temporal será preparado fuera del repositorio para contratos reales.

## Entorno temporal de validación preparado

Para esta continuación existe PostgreSQL 17.10 temporal con TLS/SCRAM; el recurso privado `/tmp/ttrpg-auth-pg-env.json` contiene la conexión y CA (no imprimir). `python3 /tmp/ttrpg-auth-pg-run.py <script-pnpm>` transmite esas variables a los gates desde el checkout. Para respaldo/restauración hay clientes oficiales pg_dump/pg_restore 17.10; rutas y receta en `/tmp/ttrpg-auth-pg-tools.json`, sin credenciales. Se verificaron integridad/firma y un roundtrip mínimo con bases UUID propias; esto prepara infraestructura, no sustituye las pruebas de datos y cuentas de esta spec. Usar solo fixtures propias, no detener servidor ni borrar herramientas: el orquestador controla la limpieza final. No poner contraseña en argv; usar archivo pgpass temporal privado según la receta.

## Reconciliación pendiente por sistemas de juego — 2026-10-30

El usuario aceptó el diseño previo de catálogo de sistemas administrado, versiones retenidas y viewport compartido configurable, y autorizó implementarlo ahora en008. Ver ../008-partidas-propiedad/retrabajo-ciclo-2.md y ../../autenticacion-partidas.md. Al llegar a011, actualizar spec antes de construir para consumir contratos reales de008: selección de sistema/versión por partida, capacidades y fichas según sistema, plantillas de servicio sin edición DM ni borrado admin, estado deshabilitado que conserva usos existentes. Mantener UI de cuentas/invitaciones/moderación y compatibilidad local. No se autoriza instalar plugins externos ahora ni se declara esta integración implementada.

## Cierre en main y servicio preparado — 2026-10-31

Petición literal del usuario: «cuando termines deja todo en main, y configura todo para correr el servicio. Importante crea los directorios necesarios dentro de la misma carpeta del proyecto e ingnoralos para que no se suban al control de versiones». Se confirma ejecución de la serie restante010y011, incluida interfaz pendiente, y autorización de commits/merge locales de trabajo aprobado, sinpush. Reemplaza la prohibiciónanterior de integración010/011, pero no omite cuatrorevisiones/decisión. Constructor sigue sin Gitwrites mientras construye; orquestador coordina integraciónposterior. Al finalizar, carpeta habitual /Users/minrock/Projects/ttrpg-effects debe quedar enmain conconfiguración/servicioarrancable, preservando cambios/datosprevios y resolviendo checkoutmainaislado de integraciónsinforce/reset.

Preparaciónoperativa en011: pnpmstart:api carga.env; datos,assets,logs y respaldos locales necesarios dentrodelproyecto en directoriosprivados ignorados porGit, rutasabsolutas calculadas desde raíz, permisos700directorios/600archivosprivados. .env/.env.electron/credenciales quedanignorados y no se imprimen. Conservar configuración/datos actuales; si se trasladan, respaldo consistente y comprobación antes de apuntar al destino, sinborrar fuente. No introducir claves públicas ni altasautomáticasalarrancar. PostgreSQLproducción,SQLitelocal. No desplegar ni usarservicioscloud. Serviciooriginalactualloopback8787 se podrá sustituir ordenadamente al cierre convalidación de salud/HTML y recorrido real; no detenerlo anticipadamente duranteconstrucción. DMG trasmerge según AGENTS.

## Entorno real para la preparación operativa

El 2026-10-31 se comprobó que la carpeta habitual está en `feature/configuracion-env` y su manifiesto declara 3.6.0. El servicio compilado anterior declara 3.7.0 y fue iniciado expresamente por el orquestador para resolver el problema de arranque del usuario. Está activo en `http://127.0.0.1:8787`, sesión de terminal59098; no detener durante construcción. La causa del fallo de `pnpm start:api` era que el script antiguo no cargaba `.env`, aunque el archivo privado existe.

La configuración actual usa `TTRPG_DATA_DIR=/Users/minrock/.local/share/ttrpg-effects-service` y `TTRPG_WEB_DIR=/Users/minrock/Projects/ttrpg-effects/out/web`; no tiene identidad nueva configurada. No se imprimieron secretos. Para cumplir la última petición, preparar el destino local dentro de la raíz del proyecto (por ejemplo `.local/service/data`, `.local/service/backups`, `.local/service/logs`) y excluir el árbol completo de Git. El traslado del legado debe conservar la fuente, crear una copia consistente y usar la adopción explícita de008 con propietario elegido; no asignar datos al primer login. Separar almacenamiento nuevo del legado preservado hasta validar la adopción.

Se preguntó al usuario mediante entrada asíncrona qué correo desea para la cuenta administradora inicial, indicando que no envíe contraseñas. Esa respuesta no bloquea diseño, construcción ni pruebas temporales. Registrar la respuesta cuando llegue; no inventar cuentas personales ni credenciales predeterminadas. La provisión real se realiza al cierre operativo, con secretos privados y permisos600, nunca en el tablero, Git, argumentos o salida de herramientas.

## Preparación privada confirmada

El usuario respondió el correo administrador. Está guardado exclusivamente en `/Users/minrock/Projects/ttrpg-effects/.local/service/provisioning.json` (modo600), fuera de Git; no copiar su contenido a expedientes, código, ejemplos o informes. Todavía no se creó la cuenta ni contraseña. El orquestador creó `.local/service/{data,backups,logs}` y sus padres con modo700. Se verificó exclusión mediante `.git/info/exclude` como protección inmediata, sin editar producto durante010;011 debe añadir `/.local/` al `.gitignore` versionado y verificarlo antes del cierre. Ningún dato legado fue movido ni modificado. Leer este archivo privado solo durante la provisión real autorizada, no para pruebas.

## Reconciliación de especificación, antes de construir

Se autoriza actualizar la especificación de 011 en paralelo a la corrección de 010, exclusivamente documentación del especificador. La propuesta original queda en spec-propuesta.md. Usar las decisiones aprobadas 006–009, fix 012 y contratos actuales de 010; indicar explícitamente que 010 sigue en revisión y que ninguna construcción de 011 empieza hasta APROBAR. Al terminar 010 se comprobará el contrato final antes de construir. No modificar producto ni consumir el servicio o datos personales. El cierre operativo y Git autorizado más arriba prevalecen sobre prohibiciones antiguas, pero el constructor sigue sin escribir historial durante implementación.

## Preflight del cierre operativo

Lectura no modificadora del legado: service.sqlite contiene una escena y ningún asset/plantilla; las bibliotecas de monstruos, PNJ y personajes están vacías. Se preguntó por nombre/correo de la cuenta DM propietaria (distinta de administrador); pendiente respuesta. No se ha adoptado ni modificado contenido.

Respaldo privado preventivo de siete archivos de configuración y cambios locales: `/Users/minrock/Projects/ttrpg-effects/.local/service/backups/pre-integracion-20261031-084641`, directorios 0700 y archivos 0600. Incluye manifiesto de huellas, env privados, tres archivos no rastreados que difieren de main, tablero y cola reflejados. No contiene respaldo de bases: crear el respaldo consistente de datos al corte definitivo. No copiar el contenido de ese respaldo a Git ni informes.

## Inicio de construcción 011 autorizado — 2026-10-31

010 terminó ciclo2/ronda3 con cuatro APROBADO y decisión APROBAR, integrada como producto ae5c654 y cierre documental en main 73b8e6de21af74912d23399f1b99f3c1112ade91. DMG3.12.0 verificado. Spec011 reconciliada y contraste contractual final completados por especificador. Se autoriza ahora construir011, ciclo1, versión objetivo3.13.0. Base de revisión main 73b8e6de21af74912d23399f1b99f3c1112ade91; base-archivos.json contiene 638 huellas verificadas idénticas al checkout fuente.

Se mantiene la excepción autorizada de misma rama acumulativa feature/factory-006-persistencia-multidb en /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects; HEAD históricoe1fd3ee, sin Git writes del constructor. No revertir/copiar producto viejo; conservar todas las entregas anteriores. Un único constructor011 edita producto/tests/docs/version/changelog y build.md; orquestador tablero/solicitudes/cola. Commit/main y DMG ocurren después de revisión, coordinados por integrador, sin push.

PG temporal17.10/TLS disponible y limpio, reservado a constructor011; wrapper/configuración privada y herramientas de respaldo17.11 en coordinacion.md. No imprimir secretos ni tocar servicio/datos del usuario durante pruebas. Ejecutar suites de CPU y compilaciones en serie para evitar contención observada en010. Pruebas deben acreditar composición final, contratos y UI real; no sustituir CUA por resultados DOM. Los cambios de contraseña/cuentas reales se harán solo en cierre operativo mediante mecanismos privados; durante construcción usar fixtures propias.

## Continuación autorizada de 011

El usuario ordena «inicia ronda 3» tras el cierre de ronda2. Autoriza corregir UX-3 y abrir ciclo2/ronda3 con cuatro revisores. Se mantienen los permisos previos de cierre local en main y preparación del servicio tras aceptación; sin push.
