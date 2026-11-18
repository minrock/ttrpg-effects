# Estado actual y decisiones vigentes

**Entrega integrada vigente — 2026-11-17, versión 3.35.0.** [SDD62](specs/62-servicio-solo-web/spec.md) retira Electron y deja navegador + API Node.js. Implementada y validada en `feature/spec-62-solo-web`, commit `e2e5b69`, integrada en `main` mediante `9521af9` por orden explícita del usuario. El merge también incorpora la consolidación 3.34.0 (`4dc2786`). [Evidencia](specs/62-servicio-solo-web/validacion.md):1417 pruebas, checks/builds, recorridos DM/jugador y procesos QA cerrados. Datos reales y formatos intactos; no incorpora Django/Redis ni escalado horizontal.

**Cierre anterior — 2026-11-17, versión 3.34.0.** Consolida los cambios locales de SDD59 (hasta revisión 0.10), SDD60 y SDD61, junto con las correcciones documentadas de SDD33, SDD54 y SDD58. Commit y push autorizados por el usuario en `feature/escenas-propias-por-arco`; integración posterior en `main` incluida en `9521af9` junto con SDD62. [Validación de consolidación](validaciones/2026-11-17-cierre-3.34.0.md). El esquema sigue en 12 y `.ttrpgscene` conserva v2 con lectura de v1; no se aplican nuevas migraciones a datos reales. El servicio local queda detenido por instrucción del usuario. La propuesta Django/PostgreSQL + Node/caché permanece como análisis, sin implementación. Los cortes de entrega siguientes son históricos y no sustituyen este estado.

Corte: 2026-11-12. Entrega 3.25.0: cierre autorizado en `main` de SDD 58 (guardado y recuperación), correcciones de auditoría 3.23.0, celda de calibración/alineación de SDD 04 y reconstrucción automática del servicio. Conserva las entregas SDD 55–57 y la trazabilidad inicial de SDD 41–52. Las pruebas y límites se registran por entrega; integración no equivale a despliegue.

Cierre autorizado 3.27.2: vigilancia de desarrollo del servicio, corrección del 413 por cuota, una única copia de recuperación por escena en IndexedDB/servidor, botón «Jugador» exclusivo de Electron y slider de niebla de 0,5 a 8 cuadros en pasos de 0,5. Las escenas guardadas con nombre permanecen independientes. Integración en `main`, push y artefactos según el registro de validación de esta entrega.

## Producto disponible

La implementación local de SDD62 deja TTRPG Effects como servicio privado Node.js HTTP/SSE y cliente React/Pixi en navegador, validada conforme a [SDD62](specs/62-servicio-solo-web/validacion.md). Retira Electron autónomo y conectado. Las cuentas admin gestionan DMs y sistemas; cada DM prepara campañas/arcos/escenas y comparte una apertura con jugadores sin cuenta mediante enlace y alias.

Una partida fija una versión de sistema. El catálogo separa reglas, datos y presentación, con módulos compilados. La proyección pública excluye información privada del DM. Las herramientas visuales y reglas del editor se consumen mediante un cliente explícito; el navegador no tiene privilegios de Node.

## Qué decisión reemplaza a cuál

| Tema | Decisión vigente | Antecedente sustituido |
| --- | --- | --- |
| Plataforma | Navegador + API Node.js; retirada local de Electron en SDD62 | Electron autónomo y Electron conectado al servicio |
| Acceso del servicio | Cuentas admin/DM y cookies de invitado por partida | Dos claves globales de 002–005 |
| Alta DM | Solo admin; no autorregistro ni correo automático | Crear usuarios libremente o enviar invitaciones por SMTP |
| Alta admin | CLI local, varios correos únicos; bootstrap solo base vacía | Un único administrador y alta exclusivamente inicial de 007 |
| Contraseña | 10–128 puntos de código, máximo 512 bytes, sin recortar | Mínimo 15 |
| Contraseña de admin por CLI | Elegida y confirmada: definitiva; Enter: generada temporal y cambio obligatorio | Obligar a cambiar siempre la contraseña que el operador acaba de elegir |
| Persistencia | SQLite del servicio; PostgreSQL con TLS en producción | SQLite como único almacén del servicio |
| Propiedad | Datos por DM; admin no es dueño de sus mesas | Bibliotecas y escenas globales |
| Plantillas en servicio | Solo admin edita/publica; deshabilitar sin borrar | Edición de plantillas por DM y borrado de catálogo |
| Versión de sistema | Referencia exacta retenida y hash; módulos compilados | Resolver a la última versión o ejecutar plugins externos |
| Invitación | Se renueva al abrir/reabrir; continuar conserva apertura | Rotar por cualquier recarga o pedir contraseña personal a jugador |
| Expulsión | Revoca participante y rota enlace; los demás permanecen | Cambiar todas las credenciales o desconectar toda la mesa |
| Alineación de grilla | Celda de calibración mueve el origen persistente por mapa; snap y medición comparten ese origen | Guía temporal independiente de la grilla |
| Arranque API | `pnpm start:api` compila inicialmente y vigila cambios; `start:api:built` ejecuta el build estable | Reiniciar sobre una compilación fallida o antes de liberar SQLite |
| Menú | Una fila compartida, herramientas agrupadas en ancho estrecho | Cabecera de servicio y toolbar del editor apiladas |

Los perfiles, bases y archivos privados de instalaciones Electron anteriores no se eliminan; su ejecución y empaquetado se retiran del código vigente. El catálogo de plantillas usa las reglas del servicio.

## Integración y evidencia

La organización anterior de fábrica se retiró el 2026-11-13. Las specs SDD 41–52 incluyen criterios iniciales y enlaces a evidencia inmutable; la [correspondencia de cierres](retirada-factory.md) conserva los SHA de integración sin depender de un tablero.

Los cambios de administradores/contraseñas 3.14–3.17 y cabecera 3.18–3.18.1 estaban pendientes al iniciar la consolidación. El usuario autorizó después commit e integración: el producto quedó registrado en `c4e8831`, junto al cierre documental desde `feature/sdd-consolidado`. Las specs 53–54 no simulan rondas ni aprobación de fábrica. Resultados nuevos y cierre en [registro de consolidación](consolidacion.md).

Las pruebas registradas en builds antiguos pertenecen a su código y fecha. La consolidación histórica de las specs 41–54 no ejecutó los gates reales de PostgreSQL. SDD 59 sí dispone de evidencia nueva en un entorno PostgreSQL dedicado, registrada en su validación. Un test de UI en jsdom o fixture aislada no sustituye el recorrido autenticado de API real.

## Invariantes para las próximas specs

- Mantener dominio independiente de React, Pixi, HTTP y SQL; las vistas invocan servicios/puertos.
- Autorizar por cuenta/propietario/apertura en el servidor, incluyendo revalidación al confirmar y entregar datos; una capacidad UI no autoriza.
- Mantener publicaciones inmutables y versiones retenidas; deshabilitar impide nuevos usos y conserva instancias existentes.
- No borrar bases ni restablecer usuarios durante configuración/arranque. `.local/service` y env son privados e ignorados.
- Conservar formato `.ttrpgscene` v2 y lector/migrador v1; la transferencia operativa escribe v5 y sus lectores aceptan v1–v5. Son formatos distintos; la transferencia no transporta cuentas, aperturas ni borradores.
- Un proceso API por base; reiniciar conserva persistencia pero vacía proyección/cámaras/dados. No prometer recuperación de ese estado efímero.
- La niebla no evita que el jugador inspeccione los píxeles de una imagen de mapa ya descargada. No usarla como control de confidencialidad.
- Cambios de código requieren evidencia nueva y permiso de integración; una decisión técnica anterior no concede permisos Git.

## Entrega anterior — SDD 55

[SDD 55 — Mediciones y áreas compartidas con autor visible](specs/55-mediciones-compartidas/spec.md) implementa una capa efímera compartida entre DM/jugadores **en servicio**, con alias/discriminador del autor, edición propia y retirada por DM. Versión 3.19.1, integrada desde `feature/sdd-mediciones-compartidas` a `main` (`90dc50e`), con laterales de mesa DM/jugador y chevrón de borde; Electron autónomo conserva herramientas locales. La consolidación 3.18.1 descrita arriba es la base histórica. [Validación y pendientes](specs/55-mediciones-compartidas/validacion.md); no se inició un trabajo factory ni se simuló aprobación.

## Entrega anterior — SDD 56

[Cámaras libres y foco de atención](specs/56-camaras-libres-foco-atencion/spec.md) implementa navegación propia y un foco puntual que centra el área útil conservando el zoom actual. Retira controles remotos, cámara principal/virtual y previews de la interfaz. Incluye API/SSE negociado e IPC específico. Implementada en `feature/sdd-foco-atencion` (`34d938c`) e integrada en `main` (`3d35876`), versión 3.20.0, con autorización explícita del usuario. [Plan técnico](specs/56-camaras-libres-foco-atencion/plan.md) y [evidencia/límites](specs/56-camaras-libres-foco-atencion/validacion.md).

## Entrega anterior — SDD 57

[Áreas contextuales](specs/57-areas-contextuales/spec.md) implementa para círculos/conos una barra de selección con color, patrones cuadriculados de emojis existentes, bloqueo y copia. Conserva propiedad/moderación y separación entre figuras DM persistentes y dibujos efímeros de jugadores. [Plan técnico](specs/57-areas-contextuales/plan.md). Implementada en `feature/sdd-areas-contextuales` (`a09ea69`) e integrada en `main` (`62c351a`), 3.21.0, por orden explícita del usuario. No se inició un trabajo factory. [Validación y pendientes](specs/57-areas-contextuales/validacion.md).

## Pendiente de especificar

Estas son direcciones mencionadas o límites explícitos, no una cola aprobada:

- Ecosistema de sistemas/plugins estilo Foundry: formato de paquete, compatibilidad del motor, instalación, permisos, aislamiento y actualización de instancias retenidas. Hoy solo se ejecutan módulos compilados incluidos.
- Despliegue productivo concreto: infraestructura, dominio/HTTPS, PostgreSQL, respaldo y operación. El soporte del motor existe; falta decidir y ejecutar un despliegue específico.
- Escalado horizontal, bus de eventos y recuperación durable del estado visual: requieren nuevas garantías de consistencia y autoridad.

Cualquier otro alcance nuevo debe describir problema, usuario, criterios y exclusiones antes de comenzar su implementación. Las preguntas originales de requirements no se reabren automáticamente: primero contrastarlas con specs y código existentes.


## Corrección pendiente de integración — Recuperación de sesión

3.21.1 en `fix/recuperacion-sesion-memoria`: liberar el render durante suspensión, detener renders de conflictos, descartar el editor antes de recargar el contexto y acotar resolución de imágenes ausentes. [Diagnóstico y evidencia](specs/51-experiencia-servicio/recuperacion-memoria.md). Sin cambios de DB ni expedientes factory nuevos.


## Implementación en rama — SDD 58: borradores recuperables

[Spec 58](specs/58-borradores-recuperables/spec.md) y [plan](specs/58-borradores-recuperables/plan.md): respaldo IndexedDB a 1 s/máximo 5 s, borrador privado remoto a 5 s/máximo 30 s y confirmación manual separada. Incluye recuperación por cuenta/rama, conflictos sin sobrescritura, persistencia local selectiva de Electron servicio y contratos SQLite/PostgreSQL. Estado: implementada y consolidada para la versión 3.22.1 en `fix/recuperacion-local-figuras`, pendiente de merge y sin trabajo factory nuevo. Migración aditiva 8; DB operativa sin modificar. IndexedDB privado sustituye la prohibición anterior y Electron servicio usa partición persistente por origen, con limpieza de credenciales. [Evidencia y límites](specs/58-borradores-recuperables/validacion.md).

Corrección 3.22.1 en `fix/recuperacion-local-figuras`: respalda figuras sin mapa, inicia escritura al crearlas y ofrece recuperar IndexedDB o cargar la escena. Conserva SDD 58 pendiente de integrar.

Corrección 3.22.2 en `fix/guardado-escena-confirmada`: confirmación completa y reapertura automática desde el servidor; IndexedDB solo solicita recuperación por cambios de contenido pendientes. Incluida en la entrega 3.23.0; pendiente de integración.

## Correcciones de auditoría pendientes de integrar — 2026-11-11

B01–B06 corregidos en `fix/hallazgos-auditoria-escena`, conservando los cambios previos de guardado. Entrega 3.23.0 por solicitud de incremento minor. El usuario autorizó commit y push de esta rama; sigue pendiente de integración a main. Evidencia y límites en [validación de auditoría](validaciones/2026-11-11-auditoria-escena.md).


## Entrega local validada — SDD 59

[Campañas, arcos y escenas](specs/59-campanas-arcos-escenas/spec.md), revisión 0.2 aceptada con Build el 2026-11-13, incorpora un panel previo al editor en navegador y Electron conectado. Cada partida conserva su identidad como campaña y recibe un arco inicial; hay una mesa por campaña. El modo autónomo conserva su editor y archivos locales.

La preparación permanente de NPCs/monstruos vive en el arco; cada escena materializa snapshots independientes. Una campaña inactiva permite solo consulta y exige cerrar explícitamente su apertura antes de desactivarla. Un recurso compartido no puede escribirse si cualquiera de sus campañas está inactiva. El último arco se recuerda localmente por cuenta/campaña durante menos de 15 días.

Versión local 3.28.0, rama `feature/spec-59-campanas-arcos-escenas`, **sin commit ni integración**. Las migraciones 9/10 se validaron primero con datos sintéticos. Tras el reporte de arranque del servicio local, se aplicaron a su SQLite con respaldo privado, ensayo separado y conservación verificada de las 24 tablas previas; API 3.28.0 responde correctamente en el puerto 8787. CA-01–12 y gates completos. [Evidencia y límites de integración](specs/59-campanas-arcos-escenas/validacion.md).


### Ajuste de experiencia 0.3 — solicitado el 2026-11-13

Corrección autorizada sobre la entrega local de SDD 59: recuperación contextual solo ante trabajo pendiente al entrar a la escena, entrada directa al editor sin pantalla intermedia y estado de guardado pequeño en el footer. T-08 y CA-13–15 validados localmente en 3.28.1: 90 pruebas dirigidas finales, checks/builds web/Electron y recorridos sintéticos con recuperación, cierre, footer a 390 px y zoom real 200 %. [Evidencia del ajuste](specs/59-campanas-arcos-escenas/evidencia-ui-0.3.json). La base 0.2 conserva su corte histórico; no se repitieron los gates generales/backend como parte del delta. Sin cambios de API, migraciones, datos operativos ni historial Git; integración pendiente.

### Ajuste visual 0.4 — solicitado el 2026-11-14

Petición humana: listas de campañas/arcos/escenas a ancho completo en estrecho y dos columnas desde 960 px; alineación de iconos/botones y switch compartido entre editor y formularios del servicio. T-09 / CA-16–18 validados localmente en **3.28.2**: 47 pruebas dirigidas, lint/typecheck/builds, medidas a 390/959/960/1440 px, teclado/cancelación, Chrome al 200 % y smoke Electron conectado/autónomo. [Evidencia 0.4](specs/59-campanas-arcos-escenas/evidencia-ui-0.4.json). Se mantienen confirmaciones y reglas de campaña, sin API ni migraciones nuevas. Cortes 0.2/0.3 históricos preservados; sin integración.


### Corrección de navegación 0.5 — solicitada el 2026-11-14

Sidebar estructural solo fuera del editor, controlado por hamburguesa: T-10 y CA-19–23 validados localmente en **3.29.1**. 69 pruebas dirigidas, typecheck/lint, builds web/Electron/Storybook, responsive 390/959/960/1440, teclado/foco, Chrome 200 % y recorrido Electron conectado comprobados. [Evidencia 0.5](specs/59-campanas-arcos-escenas/evidencia-ui-0.5.json). Los 182 archivos contrastados de editor/renderer/main/preload permanecen idénticos al inicio del delta. Catálogo vigente ampliado a 31 familias, 59 historias y 31 autodocs con AdminShell/AdminSidebar; el corte SDD60 3.29.0 se conserva histórico. Rama autorizada `fix/sidebar-administracion`, cambios previos conservados; sin commit/push/merge, DMG ni operaciones sobre datos reales.

## Validada localmente — SDD 60: catálogo Storybook

Petición explícita del 2026-11-14 implementada en **3.29.0**: Storybook 10.6.7 con 12 familias de controles, 17 composiciones, 54 historias y 29 páginas autodocs. [Spec 60](specs/60-storybook-componentes-ui/spec.md) revisión 0.1, [inventario](specs/60-storybook-componentes-ui/inventario.md) y [validación](specs/60-storybook-componentes-ui/validacion.md). Montajes, seis pruebas play, recorridos interactivos, responsive, 64 regresiones, typecheck/lint y builds web/Electron/Storybook comprobados. Grafo sin Pixi/Three ni código privilegiado; clientes sintéticos y proveedor nulo. Hallazgos de contraste y etiquetado accesible documentados para UX; sin certificación completa de accesibilidad ni nuevo smoke nativo Electron. Rama autorizada `feature/spec-60-storybook-componentes-ui`, cambios previos conservados, sin commit/push/merge ni publicación. Catálogo local: `http://127.0.0.1:6006/` mediante `pnpm storybook`.


### Ampliación de preparación 0.6 — solicitada el 2026-11-15

[SDD59 revisión0.6](specs/59-campanas-arcos-escenas/spec.md#listados-separados-y-acciones-de-preparación-06--2026-11-15): destinos NPCs/Monstruos separados, listados de filas, alta en formulario y acciones Editar/Borrar. La extensión compatible implementa filtro por tipo y borrado lógico, migración11 sintética y transferencia operativa v5 que conserva marcas de borrado/reservas. `.ttrpgscene` y editor mantienen contratos. Validada3.30.0 en copia aislada. Q-0010 resuelta; rama `feature/preparacion-npcs-monstruos` creada desde el HEAD inspeccionado y T-11/T-12 implementadas y validadas:82owned,32DB,14contrato/cliente,19UI y69regresiones; builds y QA navegador/Electron/Chrome200% correctos. [Evidencia0.6](specs/59-campanas-arcos-escenas/evidencia-ui-0.6.json). Incorporación operativa autorizada y completada: backup privado íntegro,28 archivos verificados, SQLite11 y API8787 en3.30.0;30 proyecciones de contenido preservadas. Sin commit/push/merge.

### Corrección de breadcrumbs 0.7 — 2026-11-15

T-14 / CA-28 validada localmente en **3.30.1**, rama autorizada `fix/breadcrumbs-administracion`. Migas de administración como texto: ancestros subrayados navegables y último sin subrayado ni acción; foco visible y wrap. 17 pruebas dirigidas, typecheck/lint/build web y QA de seis rutas a390/1440px aprobados. [Evidencia0.7](specs/59-campanas-arcos-escenas/evidencia-ui-0.7.json). Fuentes y Storybook actualizados, sin reinicio de servicio, datos reales ni integración Git. La entrega operativa3.30.0 anterior conserva su evidencia histórica.


### Ajustes de cabecera y navegación de campaña — 2026-11-15

Los ajustes locales **3.30.2–3.30.3** renombraron el enlace del hamburger a Campañas y dejaron en navegador únicamente el nombre de escena, manteniendo el menú de escena en Electron. Las pruebas dirigidas y límites están en [validación SDD59](specs/59-campanas-arcos-escenas/validacion.md).

La [revisión0.8 de SDD59](specs/59-campanas-arcos-escenas/spec.md#escenas-en-el-menú-de-campaña-08--2026-11-15) está validada localmente en **3.31.0**. Q-0013 resuelta y rama `feature/escenas-menu-campana` preparada conservando cambios locales. T-15/CA-29–31: menú con escenas agrupadas por arco, selección protegida y apertura/invitación preservadas;59 pruebas dirigidas, checks/builds, Storybook y QA navegador/Electron sintéticos aprobados. [Evidencia0.8](specs/59-campanas-arcos-escenas/evidencia-ui-0.8.json). API/Electron de prueba detenidos sin locks; servicio del usuario y datos reales sin intervención. Sin integración Git.

### Publicación de jugador en Chrome — 2026-11-15

La corrección [FIX-01 de SDD54](specs/54-cabecera-unificada/spec.md#corrección-de-publicación-desde-chrome--2026-11-15) está implementada y validada localmente en **3.31.1**. «Jugador» vuelve a publicar explícitamente en Chrome, en la fila amplia o en Herramientas; Electron conectado conserva HTTP y el autónomo abre/enfoca su ventana. Sin cambios de API/IPC ni publicación automática. Pasaron 42 pruebas dirigidas, typecheck, lint, builds web/Storybook/Electron y recorridos de Chrome con invitado y ambos modos Electron sobre fixtures sintéticas. [Evidencia y límites](specs/54-cabecera-unificada/validacion-fix-01.md). Procesos QA cerrados, puerto 8877 libre y sin lock sintético; servicio operativo sin intervención directa. Rama `fix/publicacion-jugador-chrome`, sin commit/push/merge. En esa entrega SDD61 seguía como propuesta; su construcción posterior se describe a continuación.

## Dados de jugadores — SDD 61 / 3.32.0

[Dados de jugadores e historial público](specs/61-dados-jugadores/spec.md), revisión 0.1 del 2026-11-15. Jugadores del servicio preparan tiradas con los controles de composición DM, siempre públicas; el autor cierra las suyas y el DM cualquiera. Las aclaraciones humanas fijan espera con Lanzar bloqueado y reintento manual, historial de todas las públicas incluso después de cerrarlas y valores/totales visibles en el log aunque el DM oculte el resumen sobre el mapa. Incluye espacio de flecha en Select compartido y cobertura de Storybook.

Estado: revisión 0.1 implementada, validada e incorporada localmente en **3.32.0**. Pasaron 59 contratos de moderación con SQLite/PostgreSQL TLS, 45 pruebas finales de cliente/estado, regresiones de dominio/UI/IPC, typecheck/lint y builds API/web/Electron/Storybook. Recorridos DM, Chrome y Electron conectado; humo autónomo correcto. [Evidencia y límites](specs/61-dados-jugadores/validacion.md): historial efímero y acotado, simulación cliente sin garantía contra trampas y sin perfil sostenido RSS/VRAM. Rama `feature/spec-61-dados-jugadores`, cambios previos preservados; sin commit/push/merge ni migraciones reales. Procesos QA detenidos. El ajuste anterior «Volver a los arcos» permanece pendiente y fuera de SDD 61.

## Corrección local validada — recuperación de apertura SDD58

La corrección [FIX-01 de SDD58](specs/58-borradores-recuperables/validacion-fix-01.md) está implementada y validada localmente en **3.31.2**. El 409 de heartbeat muestra su causa y consulta una vez la apertura; continuar o iniciar exige una acción explícita y conserva el checkpoint, sin publicación automática. Pasaron 70 pruebas dirigidas, lint/typecheck y builds web/Electron. La recuperación real se verificó en Chromium integrado y Electron servicio con API/SQLite sintéticos y teclado; Chrome/390 px quedó sin completar por bloqueo del Mac. No cambió la escena canónica de la fixture. QA detenida, puerto8877 libre, servicio operativo8787 saludable y sin migraciones reales. Rama `fix/recuperacion-borrador-409`, sin commit/push/merge. Conserva límites y evidencia histórica de SDD58.


## Ajuste local — selector de plantillas con autocompletado

SDD59 ajuste0.9 completado el2026-11-17 en **3.32.1**: control reutilizable SearchableSelect en agregar/editar monstruos, búsqueda y selección explícita, bindings retenidos preservados y catálogo Storybook ampliado. Pruebas dirigidas, builds y QA navegador1440/390 aprobados; [evidencia y límites](specs/59-campanas-arcos-escenas/validacion-ui-0.9.md). Sin merge ni migraciones.

## Retirada del acceso flotante de contadores — 2026-11-17

[SDD33 FIX-01](specs/33-floating-dm-counters/validacion-fix-01.md) validado localmente en **3.32.2**. El botón flotante de administración se retira y el overlay vacío no se monta; el acceso de cabecera y las barras existentes se conservan. Checks dirigidos y QA sintético de navegador aprobados; sin smoke nativo Electron, cambios de datos o merge.

## En construcción aislada — escenas propias de cada arco

Petición2026-11-17 aceptada en [SDD59 revisión0.10](specs/59-campanas-arcos-escenas/spec.md#escenas-propias-de-cada-arco--revisión-010-2026-11-17): creación directa en arco, exclusividad en persistencia/API, conservación de destino al guardar/recuperar y retirada del importador de mapas «Agregar a escena» del explorador. Rama `feature/escenas-propias-por-arco` autorizada; producto se construye fuera del checkout vigilado para preservar la API operativa. Sin migración real ni integración autorizadas; validación pendiente.


**Cierre aislado0.10 (2026-11-17):** implementación y validación3.33.0 completas; T-17/T-17B/T-18/T-19 cerradas con [evidencia](specs/59-campanas-arcos-escenas/validacion-ui-0.10.md).33archivos revisables, checks/builds y QA navegador/ambosElectron aprobados. Migración12 ensayada sobre copia reciente sin pérdida, no sobre base operativa. T-20 pendiente de autorización final para respaldo/incorporación/migración/reinicio. API8787 sigue3.32.2. Sin merge.


**Incorporación0.10 completada:** 2026-11-17, servicio local3.33.0 activo8787;33archivos aplicados, SQLite12 y30tablas preservadas, configuración sin cambios. Backup íntegro privado y [evidenciaT20](specs/59-campanas-arcos-escenas/validacion-ui-0.10.md#cierre-operativo-t-20--2026-11-17). Sustituye el estado pendiente anterior; sinmergeGit.


## Entrega local — SDD62: servicio exclusivamente web

Petición del 2026-11-17: eliminar Electron autónomo/conectado y conservar el producto web. [Spec62 revisión0.1](specs/62-servicio-solo-web/spec.md), rama autorizada `feature/spec-62-solo-web` desde cierre 3.34.0. La retirada conserva React/Pixi, API Node.js, datos y formatos; no implementa Django/Redis ni múltiples réplicas de runtime sobre la misma base. Implementación y validación completas en 3.35.0; [evidencia e integración Git](specs/62-servicio-solo-web/validacion.md). Integrada en `main` mediante `9521af9`; sin despliegue ni nuevas migraciones reales.
