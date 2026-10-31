# Coordinación 011

## Especificación

Especificador /root/especificador_011 finalizó spec.md reconciliada el 2026-10-31. La construcción espera APROBAR de 010 y comprobación final de contratos. No hay constructor011 activo todavía.

## PostgreSQL de pruebas y herramientas de respaldo

El clúster temporal010 sigue reservado a su constructor hasta finalizar sus gates. No usar simultáneamente ni detenerlo. Configuración privada /tmp/ttrpg-auth-pg-env.json (no imprimir), wrapper /tmp/ttrpg-auth-pg-run.py. Al empezar011 el orquestador confirmará disponibilidad real y asignación exclusiva.

Se prepararon herramientas cliente PostgreSQL17.11 de Postgres.app2.9.6, compatibles por versión mayor con el servidor17.10. Descarga oficial https://github.com/PostgresApp/PostgresApp/releases/download/v2.9.6/Postgres-2.9.6-17.dmg, SHA256 b38bb00b8c8702a568270aab85995c550f7f93d1503b818efdc5ff9a519b7168 contrastado contra digest de release oficial. codesign --verify --deep --strict correcto; firma Developer ID Application: Jakob Egger (ZF84SJ5A3G), cadena Apple. Copia únicamente temporal, imagen desmontada; no instalación global ni servidor adicional.

Rutas en /tmp/ttrpg-auth-pg-tools.json (0600); raíz /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-pg-tools-lhd0tfpg. pg_dump, pg_restore y psql --version correctos17.11. Esto verifica disponibilidad de herramientas, todavía no prueba respaldo/restauración de la app. Consumir conexión mediante PGPASSFILE temporal0600 y PGSSLMODE=verify-full/PGSSLROOTCERT; contraseña nunca en argv o logs. Limpiar únicamente fixtures propias; orquestador retirará herramientas al final.

## Cierre real

Leer solicitud completa y su preflight. No leer datos personales ni archivos privados durante construcción/revisión. La adopción de escena legada espera propietario DM, sin bloquear implementación. Servicio antiguo8787 permanece activo hasta corte del orquestador.

## Comprobación de herramientas de respaldo

Con PG liberado por todos los revisores010 se realizó un roundtrip independiente: pg_dump17.11 formato custom y pg_restore17.11 contra servidor17.10, TLS verify-full y PGPASSFILE0600. Dos bases UUID propias, tabla mínima y contenido Unicode verificado en destino; ambas bases y archivos de prueba retirados. Verifica herramientas, no sustituye respaldo/restauración integral de aplicación exigido en011.

## Construcción ciclo1 iniciada

Base final main 73b8e6de21af74912d23399f1b99f3c1112ade91,638 huellas coinciden antes de cambios011. Dependencias y spec completadas. PostgreSQL temporal arrancado y liberado por revisores010, cero fixtures/conexiones/locks; uso exclusivo constructor011. Herramientas de backup siguen disponibles. No detener/reconfigurar cluster ni API8787. Publicar build final antes de congelar; orquestador asignará cuatro revisores.

## Preparación operativa del orquestador

Constructor real `/root/constructor_011` iniciado. El checkout habitual continúa en `feature/configuracion-env` con cambios previos conservados; main pertenece al checkout de integración. El cambio del checkout habitual a main se realizará solo después de aceptación/integración011, liberando primero main del checkout de integración y respaldando los archivos locales que colisionen. No usar reset/force ni sobrescribir configuración.

Preflight local: API antigua responde200 en `/api/v1/health` (3.7.0); dashboard8765 refleja010integrado/011construccion. Directorios `.local/service/{data,backups,logs}`700 y archivo privado de provisión600, sin enlaces simbólicos, ignorados provisionalmente vía exclusión local Git.011 añade regla versionada. El respaldo preventivo existente conserva configuración y archivos de arranque anteriores; todavía no es respaldo de bases. En el corte, detener solo el proceso propio verificado, respaldar mediante `data backup-legacy`, validar inventario y conservar fuente. La adopción de la escena exige propietarioDM confirmado y no se atribuirá al administrador.

La provisión real inicial se ejecutará con CLI TTY existente tras migrar destino; datos personales y contraseña temporal permanecerán en almacenamiento privado ignorado. No imprimirlos en registros ni incorporarlos a expedientes. El constructor prueba exclusivamente fixtures; el orquestador realiza el cierre local real.

Configuración de destino preparada por el orquestador dentro de `.local/service`, modo600, sin modificar `.env` activo ni arrancar/provisionar destino. El manifiesto privado de corte conserva huellas para detectar cambios de configuración antes de aplicar. No es evidencia de despliegue terminado; se usará solo tras aceptación y copia de respaldo consistente. Se preparó arnés temporal de provisión inicial mediante CLI TTY existente, aún no ejecutado.

## QA visual preliminar del orquestador (construcción, no aceptación final)

Servicio propio SQLite8891, fixture `.local/qa-011`, cuentas sintéticas. CUA: IAB admin/DM y jugador, Chrome segundo jugador y Electron servicio como tercero (proceso de prueba del orquestador). No datos personales ni servicio8787. Frontend previo al bump011, compilado durante construcción; repetir los casos afectados tras correcciones. Capturas inspeccionadas en herramientas, no archivos de imagen versionados.

- Login admin, listaDM y catálogo de sistemas legibles a1024×768. Crear versión2 genérica, editar nombre de presentación, guardar/publicar/deshabilitar: versión1 conservada y versión2 visible deshabilitada; selección de DM solo ofrece v1. Modal con scroll y foco inicial.
- LoginDMAurora, partida existente, editor a1440×900; importar PNG del logo del propio proyecto como mapa de prueba, guardar escena y publicar. Invitación abre formulario sin fragmento en URL; alias Unicode Álex admitido#1 y recarga conserva identificador. Proyección observada a1920×1080.
- Chrome admite segundo Álex#2. Electron servicio abre raíz sin preload y permite pegar enlace del mismo origen; tercer invitado#3 muestra proyección. Identidades ficticias distinguidas en roster.
- Expulsión deÁlex#2 confirmada con alias/número/partida: Chrome desmonta proyección y muestra fin de acceso; IAB#1 yElectron#3 mantienen conexión e identidad. Enlace anterior rechazado; enlace renovado permite nueva entrada#4. Roster conserva expulsado como estado durable separado de los tres conectados. No se copian secretos de invitación al expediente.
- Cambiar nombre del mapa y salir aPartidas abre Guardar/Descartar/Cancelar; Escape conserva cambio. Hallazgos comunicados al constructor antes de congelar: etiquetas técnicas de diagonales, ausencia de aviso de guardado del borrador, recuperación poco clara de invitación definitivamente rechazada, retorno del foco siempre aGuardar escena en vez del invocadorPartidas y Shift+Tab desdeCancelar pasa al chrome del navegador en vez de circular al último control. Pendiente confirmar correcciones en build final.

No se modificaron contraseñas por CUA ni se crearon cuentas personales. Flujo sensible de contraseñas se verifica mediante contratos/CLI y observación de formularios; no atribuir inspección de pantalla como cambio real de credencial. Este humo no sustituye pruebas de ambos motores ni revisiones independientes.

## QA adicional durante construcción

Las dimensiones citadas en el primer humo IAB eran las solicitadas al adaptador: una comprobación posterior del DOM mostró que no siempre coincidían con el viewport efectivo. No certifican por sí solas esos tres tamaños. Chrome sí confirmó viewport1024×768 y zoom nativo200% (DOM512×384, DPR2), sin desbordamiento horizontal. Formulario de cuentas y borrador de sistema operables; scroll llevó al botón Guardar, Shift+Tab circuló al último control y el guardado mostró confirmación explícita. Etiquetas de diagonales ya traducidas y campos compartidos Nombre/Sistema/Markdown/CSS con previsualización. Se creó un borrador genérico v3 sintético, sin publicarlo. Zoom devuelto100% y overrides retirados.

Guard de cambios del editor: Cancelar/Escape conservaron borrador y devolvieron foco aPartidas; Tab/Shift+Tab circularon por las opciones. Guardar y continuar persistió el nombre del mapa y reabrir lo recuperó. Revocación de sesiones del DM sintético mediante API administrativa produjo401: canvas oculto y recuperación requerida. Intentar otro DM pidió descartar; Cancelar mantuvo el borrador original. Reautenticación del mismoDM recuperó el nombre no guardado. El constructor está añadiendo revalidación de contexto/revisión y resolución de plantillas retenidas por instancia; estos casos requieren comprobación selectiva del build final.

## Compatibilidad local observada

Electron3.13.0 con arnés privado que fija appPath al proyecto y userData a fixture aislada; sin dependencia de API para operaciones. Ventana reducida mediante CUA hasta820×520, screenshot de ese tamaño. Carga del PNG propio, creación y guardado de monstruo en biblioteca local, y proyección en ventana Player correctos. Administrador nativo de plantillas abre la base D&D. Se detectó regresión al reutilizar campos: Nombre/Sistema y previsualización duplicados, layout de botón gigante con scroll horizontal. Constructor corrigió fuente antes de congelar; repetir presentación local al terminar build. No se certifica cierre local con guard (la prueba de protección nativa corresponde al cliente servicio).

Cliente web actualizado: tras salir del invitado sintético y pegar enlace ya sustituido, rechazo muestra «El enlace no está disponible. Solicita uno vigente al DM y pégalo aquí» y campo de enlace vacío listo para recuperación. No hay secreto retenido visible en error.

## Cliente servicio y tamaños confirmados

Electron servicio3.13.0: login DM sintético, iniciar una apertura después de lease caducada, cargar escena guardada, editar nombre y publicar: proyección recibida por invitado Chrome. Cerrar ventana y Cmd+Q mostraron aviso nativo; Escape y Seguir editando conservaron nombre. Descartar y salir cerró el proceso propio normalmente. No se modificó escena persistida con ese descarte.

Chrome: pestaña dimensionada efectivamente a1920×1080 (DOM contrastado) y captura fullPage completa mostró proyección/mapa y controles discretos sin datos de cuenta. A1440×900 se verificó catálogo, Continuar partida, carga de escena y editor DM, captura completa sin superposición. La capacidad de viewport quedó ligada a la pestaña seleccionada al inicializar; usar esa pestaña permitió certificar dimensiones reales. La captura simple puede recortar al tamaño físico de ventana; se usó fullPage para inspección completa. Overrides restablecidos tras prueba.

## Entorno disponible para revisión independiente

API sintética en http://127.0.0.1:8891, SQLite, frontend 3.13.0. No usar 8787 ni leer archivos privados personales. Las credenciales sintéticas están en `.local/qa-011/access.json` (0600); no copiarlas al informe. Hay una campaña Aurora con sistema genérico v1 y una escena llamada «Mapa de prueba Aurora» que usa el PNG del logo. La versión genérica v2 está deshabilitada y v3 es un borrador. Hay cuentas de administrador y dos DMs. El estado del fixture cambia durante QA: observar la UI para conocer la apertura y la invitación vigente. No copiar secretos de invitación en capturas o informes.

El orquestador retiró los tamaños de prueba y restableció el zoom de Chrome al 100%. La pestaña 4 de IAB es el dashboard del usuario: no cerrarla. Los revisores crean sus propias pestañas de prueba. UI usa Chrome; UX usa IAB/Electron para evitar competencia sobre ventanas. Cambiar de cuenta en un navegador afecta sus demás pestañas del mismo origen; usar únicamente el fixture. No reiniciar API ni PostgreSQL sin coordinación.

Electron local se lanza con `.local/qa-011/local-harness.cjs`, que fija appPath al proyecto y userData a un directorio aislado. Electron servicio se lanza con modo service, origen 8891 y userData `.local/qa-011/electron-profile`; su sesión remota es efímera. No usar el perfil real. El orquestador terminó sus procesos Electron anteriores.

Las pruebas de bases se ejecutan de forma secuencial para evitar carga excesiva y contaminación de fixtures. PostgreSQL se asignará primero al revisor de seguridad cuando lo libere el constructor. Otros revisores no deben lanzar suites de integración al mismo tiempo. La lectura de fuentes y la revisión visual pueden continuar en paralelo.

La aceptación exige cuatro informes sobre el código congelado. Esta preparación no inicia una ronda ni aprueba el código todavía en construcción.

## Repetición del editor local corregido

Build desktop final 3.13.0, Electron aislado y ventana de 820×520. Se confirmó un único conjunto Nombre/Sistema/Previsualizar, listado y editor apilados, toolbar compacto y campos Markdown/CSS accesibles al recibir foco y desplazar el modal. Sin superposición ni controles inaccesibles. Persiste una barra horizontal mínima del contenedor, registrada como límite visual observado. El proceso propio se cerró normalmente al terminar.

## Ronda 1 y continuidad operativa

Huella agregada de los 62 archivos comprobada contra build.md; ronda 1 abierta con huellas completas. Revisores independientes de seguridad, UX y UI iniciados; código se asignará al liberarse un cupo. No cambios de implementación durante la ronda.

El proceso de QA terminó al cerrar el constructor y dejó un lock del fixture. El orquestador comprobó ausencia de listener 8891 y de archivos de DB/lock abiertos, conservó el lock huérfano fuera de data y reinició únicamente la API sintética con su env. Versión 3.13.0, proceso raíz 97957. No cambios de datos, configuración de producto ni huellas. PostgreSQL quedó liberado por seguridad tras comprobar sus seis contratos finales.

Antes del futuro corte se respaldaron 84 archivos del out anterior y los manifiestos package.json/pnpm-lock en `.local/service/backups/binario-previo-20261031-113409` del checkout habitual. Copias privadas 0600, directorios 0700, manifiesto de modos originales y SHA-256 verificados contra origen. Este respaldo de binarios complementa la configuración anterior; todavía no es un respaldo de bases. El servicio habitual sigue intacto.

## Corrección tras las cuatro revisiones de ronda 1

Los cuatro informes terminaron con CAMBIOS y las huellas de la ronda se conservaron. Se consolida la corrección, sin alterar informes cerrados:

1. S1: ligar contextos y operaciones privadas al principal original; comprobarlo en el servidor al autorizar la mutación, sin carrera entre consulta previa y POST. Cubrir cambio de cookie entre pestañas, respuestas tardías y recuperación del mismo ID.
2. S2/C3: un 401 de administración debe invalidar y ocultar la interfaz privada; delimitar excepciones de acceso público.
3. UX1/C1: entrar mediante invitación desde recuperación no puede desmontar el borrador sin descarte explícito. Cubrir cancelar, descartar, URL inválida y navegación posterior.
4. UX2: una revalidación temporal fallida debe permitir reintentar conservando el borrador y respetando Retry-After, sin afirmar un conflicto no confirmado.
5. C2: corregir Atrás/Adelante sin insertar entradas al aceptar popstate; conservar posiciones al cancelar.
6. UI1: formularios de acceso, recuperación, contraseña e invitado desplazables al 200 %.
7. UI2: nombres largos con/sin espacios no desbordan cabeceras antes/durante la partida.

La fuente completa de cada hallazgo son los cuatro informes en ronda-1/. Mantener versión 3.13.0. PostgreSQL temporal está libre y asignado al constructor para las comprobaciones necesarias; no detenerlo. API personal 8787 intacta. API sintética 8891 fue iniciada por el orquestador (sesión 97957); coordinar su reinicio después del build. No editar Git ni integrar desde construcción.

Recuperación de agentes: el inventario actual conserva los revisores de código, UI y UX, pero no el constructor anterior ni seguridad. Se registra un constructor de reemplazo que continúa desde estos archivos persistidos; no se afirma haber reanudado el agente perdido. El orquestador actualizará su ID real en el tablero.

## QA de las correcciones antes de ronda 2

API sintética reiniciada limpiamente con build corregido, proceso raíz 16506; la API habitual 8787 no se tocó. CUA/IAB, dos pestañas inicialmente anónimas: login Aurora, abrir su partida, cargar escena y modificar nombre de mapa sin guardar; login Boreal en la otra pestaña ocultó inmediatamente el editor Aurora y mostró recuperación. Pegar ruta de invitación de esa partida sin fragmento abrió «Conservar el borrador» con foco en Cancelar y recuperar sesión. Cancelar conservó ruta y borrador; reautenticar Aurora recuperó el nombre modificado sin guardar. No se creó ningún recurso bajo Boreal durante este recorrido.

Atrás con cambios abrió el guard; Cancelar conservó editor y nombre. Repetir Atrás y elegir Descartar volvió al catálogo; Adelante recuperó la pantalla de apertura de la misma partida, sin insertar un ciclo alternante de entradas. La escena persistida no se modificó. Ambas pestañas propias se cerraron. Esto es evidencia CUA del orquestador; el rechazo de escritura cruzada atómico corresponde además a contratos API de ambos motores y revisión independiente posterior. No se certifica todavía la nueva ronda ni la UI al 200 %.

QA visual corregida del orquestador, Chrome: viewport confirmado 1024×768 y zoom nativo 200 % (DOM 512×384, DPR2). Acceso: main de 384px y scrollHeight601; rueda llevó scrollTop217 hasta Acceder/invitación. Formulario de contraseña: main384, contenido760, scrollTop375.5, ambas acciones visibles; no se introdujo contraseña nueva. Entrada de invitado y aviso de entrada cancelada también accesibles con rueda. Body512 sin desbordamiento horizontal. Capturas observadas directamente, sin archivos versionados.

Partida sintética de nombre continuo de182 caracteres: capturas fullPage a1440×900 y1024×768 antes y durante apertura muestran nombre envuelto completo, sistema/versión y controles legibles; ancho del body igual al viewport. No se publicó escena ni se alteró partida Aurora. No se probó aquí la variante de nombre con espacios ni recuperación al200 %: permanecen para contraste independiente UI. Zoom restablecido100 %, viewport retirado y pestaña propia cerrada. Dashboard conservado.

## Cierre de ronda 2

Los cuatro revisores finalizaron y los 653 archivos mantienen las huellas congeladas. Seguridad, UI y código: APROBADO. UX: CAMBIOS por UX-3, bloqueo de recuperación al revocar la sesión con un diálogo privado abierto. Los siete hallazgos de ronda1 están cerrados según sus revisores. No se reanuda construcción a mitad de ronda ni se integra011 con ese bloqueo.

El expediente pasa a necesita-persona conforme al límite de dos rondas del ciclo1. La tercera ronda solicitada por el usuario correspondía a010, ya integrada; abrir una tercera de011 requiere rehacer/ciclo2 explícito según skill. La corrección concreta pendiente consiste en cerrar/cancelar todos los diálogos privados al perder autoridad, impedir su reapertura por respuestas tardías y recuperar foco/borrador con el mismo ID; debe contrastarse con navegador y Electron antes de cuatro revisiones nuevas. Se conserva autorización previa de cierre local en main para trabajo técnicamente aceptado, sin push.

Entorno real conservado: servicio habitual8787 sigue en versión3.7.0 y checkout habitual aún feature/configuracion-env; main contiene hasta010/3.12.0 en checkout de integración. No se realizó el corte, bootstrap personal ni adopción de escena. Directorios/env privados y copias previas verificados. Herramienta temporal de respaldo de colisiones preparada en /tmp/ttrpg-backup-checkout.py, sintaxis verificada pero sin ejecutar; recibe el SHA final aceptado, crea copia privada e inventario exacto y no modifica Git. Debe ejecutarse solo durante el cierre autorizado tras aceptación011 y reinspección final.

## QA del orquestador antes de ronda 3 (ciclo 2)

API sintética reiniciada limpiamente con bundle corregido, sesión raíz 18384, puerto8891; servicio personal8787 intacto. CUA/IAB: cargar escena Aurora, renombrar mapa «Borrador recuperado ronda 3» sin guardar y abrir Cerrar partida. Revocar únicamente sesiones Aurora mediante helper privado /tmp/ttrpg-011-revoke-qa.mjs (admin de fixture cerrado en finally). Recuperación visible y operable; foco automático en correo, Tab pasa a contraseña; DOM de solo lectura confirma cero dialog[open]. Reautenticar mismo Aurora restaura exactamente el nombre no guardado, sin modal antiguo. Partidas abre el guard de cambios; Descartar mediante locator semántico vuelve a Tus partidas, sin guardar la escena. Un primer clic AX no produjo navegación y se verificó el estado antes de usar el control semántico. Evidencia atribuida al orquestador, no al constructor. Electron queda para comprobación independiente de UX en ronda3.

La nueva ronda está autorizada por «inicia ronda 3»: ciclo2 conserva rondas anteriores, constructor reemplazado documentado en retrabajo-ciclo-2.md. Producto estable con 1240 pruebas y tres builds; no integración hasta cuatro informes y decisión técnica.

## Hallazgos de ronda3 y recursos liberados

Seguridad y UX terminaron APROBADO. UX confirmó en Electron real recuperación con Cerrar partida y guard anidado, conservación del borrador, foco y cierre de decisiones antiguas; liberó Aurora/Electron. UI terminó CAMBIOS: cierre voluntario deja estado Conectado y Continuar inoperante, reproducido dos veces en fixture Boreal. Código contrasta la carrera HTTP/terminal. No se reanuda constructor hasta finalizar su cuarto informe. UI liberó Chrome/viewport y dejó cerradas sus aperturas de prueba. API8891 sigue bajo control del orquestador;8787 intacta.

## Cierre de ronda3 y corrección dentro de ciclo2

Los cuatro informes están completos y los cuatro agentes terminaron;655huellas intactas. Seguridad/UX APROBADO; UI/Código CAMBIOS por el mismo cierre propio C4/UI-011-3. Se reanuda el mismo constructor /root/constructor_011_ciclo2 con followup_task, confirmado por herramienta, para reconciliar HTTP/terminal y reapertura de generación anterior sin debilitar suspensión por cuenta. Añadir regresiones de ambos órdenes y consulta de sesión tardía; repetir cierre/inicio real. La ronda4 será segunda de ciclo2, dentro del retrabajo explícito ya autorizado, sin solicitar un ciclo adicional. No modificar backend/repetir PG salvo causa. No Git/merge desde construcción.

## QA del orquestador antes de ronda4

API8891 reiniciada limpiamente con bundle final corregido; sesión raíz82256. CUA/IAB con Boreal y partida QA UI ronda tres: iniciar, Cerrar partida/Confirmar → estado Acceso caducado e Iniciar partida operable, sin aviso de pérdida de acceso. Iniciar nuevamente → editor; Reabrir/Confirmar → editor operativo, sin modal antiguo ni aviso terminal. Segundo cierre → Acceso caducado/Iniciar. Se observó interfaz y DOM; no se atribuye simulación del orden HTTP a CUA (regresiones deterministas del constructor cubren esos órdenes). Sin cambios de escenas/publicación. Se cerró sesión Boreal y pestaña propia, ambas aperturas cerradas. Servicio habitual8787 intacto. Retest independiente de UI/Código deberá cerrar C4/UI-011-3.

## Cierre técnico de ronda4

Cuatro informes APROBADO, cuatro agentes finalizados y655huellas intactas. C4/UI-011-3 cerrado por reproducción determinista de Código y CUA independiente Chrome/Electron; guard con mapa modificado y Escape/descarte verificado por UX. Seguridad64focalesPASS; Código/UX38selectivasPASS. El constructor declara134archivos/1250pruebasPASS, typecheck/lint y tres builds. RecursoElectron/Aurora/Boreal/Chrome liberados, API8891 sigue bajo raíz82256. Aprobador independiente evalúa expediente; no hay hallazgos abiertos registrados.

## Cierre local completado

011 integrado5a074b5 y DMG3.13.0verificado; cierre documental iniciald475f95. Checkout habitual conservado con respaldo/stash verificables y cambiado a main. Servicio3.13.0 activo8787 con configuración/datos dentro de.local ignorada, migraciones1–6 y administrador inicial con cambio obligatorio. Salud/HTML/accesoAPI y pantalla real comprobados. Fuente y paquete legado conservados sin asignaciónDM inferida. Detenidos QA8891/PG temporal; recursosCUA propios liberados. Detalles y límites en operacion-local.md. Orquestador actualiza tablero y prepara exclusivamente registros finales para commit local autorizado, sin push.
