# 59 — Campañas, arcos y escenas

**Revisión actual validada e incorporada localmente:** 0.10, escenas propias de cada arco, versión3.33.0 (2026-11-17).

**Estado:** Navegación de escenas desde el menú de campaña 0.8 validada localmente en3.31.0 ([evidencia](evidencia-ui-0.8.json)). Corrección de breadcrumbs 0.7 validada localmente en3.30.1 ([evidencia](evidencia-ui-0.7.json)); base 0.2 y ajustes 0.3/0.4/0.5 validados localmente; ampliación 0.6 implementada, validada e incorporada al servicio local3.30.0. CA-24–27 comprobados en [evidencia0.6](evidencia-ui-0.6.json). CA-19–23 comprobados en [evidencia 0.5](evidencia-ui-0.5.json). CA-01–15 conservan sus cortes históricos en [validación](validacion.md) y [evidencia 0.3](evidencia-ui-0.3.json); CA-16–18 comprobados en [evidencia 0.4](evidencia-ui-0.4.json). Sin integración. **Fecha:** 2026-11-15. **Revisión funcional:** 0.8. **Tipo:** funcionalidad incremental con corrección de experiencia.
**Dependencias:** SDD 16, 18, 29, 41–51, 54, 58 y catálogo de desarrollo SDD60. **Versión de entrega:** corte 0.4 en 3.28.2; corrección 0.5 validada en 3.29.1; ampliación 0.6 validada e incorporada al checkout y servicio local3.30.0; sin merge.

**Ajuste 0.9 (solicitado 2026-11-16, validado 2026-11-17):** selector de plantillas con autocompletado implementado y validado localmente en **3.32.1**, sin merge. [Evidencia y límites](validacion-ui-0.9.md). Conserva las entregas históricas anteriores. Alcance y criterios CA-32–34 al final de este documento.

**Orden de construcción:** el usuario invocó `$build spec 59` el 2026-11-13 en esta conversación. Acepta la revisión funcional 0.2 y autoriza planificar, implementar y validar su alcance. Se conserva la historia de revisión previa; las menciones inferiores a aprobación pendiente describen aquella fase y quedan sustituidas por esta orden. Git, integración y migraciones de datos reales mantienen autorizaciones independientes.

## Problema y objetivo

El DM necesita preparar una historia completa antes de entrar al editor: **Campaña → arcos → escenas → mapas**. Hoy el catálogo de partidas abre directamente el editor; la partida fija propietario y sistema, y el documento de escena contiene mapas, monstruos y NPCs.

Esta propuesta añade campaña y arco como organización narrativa y una administración previa al editor con tarjetas e imágenes. El resultado observable es poder entrar en una campaña, preparar sus arcos y personajes, elegir una escena y abrirla en el editor existente con sus mapas intactos.

Es una funcionalidad nueva: SDD 29 excluyó expresamente niveles superiores a escena y compartir NPCs entre escenas. El traslado de preparación de NPCs/monstruos es un delta sobre ese contrato, delimitado por D-03. No se reclasifican las entregas previas como no integradas.

**Procedencia:** necesidad del usuario conservada en el encargo privado del 2026-11-13 y petición de retomarla mediante factory, preparar especificación y mostrarla antes de implementar. Las capturas de Foundry y panel administrativo orientan estructura visual, sin incorporar funcionalidades ni assets ajenos.

## Base contrastada

| Fuente actual | Hallazgo y efecto en esta propuesta |
| --- | --- |
| `src/web/GameCatalog.tsx`, `src/web/ServiceApp.tsx` | Catálogo de partidas con sistema/versionado, estados y apertura directa del editor; nueva navegación propuesta en este espacio. |
| `src/domain/games/game-metadata.ts` | Partida con propietario, nombre, sistema, `ready/archived` y revisión. No representa aún campaña/arco. |
| `src/application/services/game-runtime.ts`, `src/application/services/owned-store.ts` | Aperturas, proyección y asociaciones dependen de `gameId`; campaña no debe confundirse silenciosamente con apertura. |
| `src/domain/sessions/scene-document.ts`, `scene-aside.ts` | Mapas y preparación de NPCs/monstruos pertenecen hoy a la escena; existen IDs y visibilidad para jugador que deben conservarse. |
| SDD 48–50, 58 y `SDD/estado-actual.md` | Propiedad DM, sistema exacto retenido, invitados por apertura y recuperación privada son contratos vigentes. |

La lectura de código y documentos no certifica pruebas actuales. Algunos resúmenes históricos conservan estados anteriores: la propuesta toma las decisiones vigentes de `estado-actual.md` y exige evidencia nueva al implementar.

## Alcance y exclusiones

Incluye crear y editar metadatos de campañas/arcos, navegar hasta escenas, portadas y miniaturas, campañas activas/inactivas, preparación de NPCs/monstruos en el arco y referencia local al último arco visitado. Crear/abrir escenas reutiliza sus capacidades actuales; la organización no crea una nueva herramienta de mapas.

| Cliente o rol | Alcance confirmado |
| --- | --- |
| DM en navegador y Electron conectado | Panel previo al editor compartido, confirmado en D-06. |
| Electron autónomo | Conserva editor y archivos actuales; la jerarquía nueva queda fuera de esta entrega por D-06. |
| Jugador/invitado | Mantiene entrada por enlace y proyección autorizada; no obtiene acceso al panel ni a preparación privada. |
| Admin del servicio | Conserva cuentas y publicación de sistemas; el nuevo panel DM no concede acceso a campañas ajenas. |

Fuera de alcance: rediseño del editor/canvas/toolbar, cambios de reglas de juego, nuevos plugins o frameworks, biblioteca pública, coautoría entre DMs, sistema nuevo de encuentros, notas o personajes jugadores a nivel arco, eliminación masiva, reordenación por arrastre, importación/exportación de campañas completas y despliegue. La construcción autoriza cambios de producto y pruebas con migraciones en bases sintéticas aisladas; no migraciones sobre datos reales.

## Reglas y contratos

### Jerarquía y metadatos

- Una campaña pertenece al DM y contiene arcos; cada arco pertenece a una campaña y contiene escenas; cada escena conserva sus múltiples mapas y sus IDs. Esta jerarquía de navegación no impone propiedad exclusiva del recurso escena: hoy puede estar asociado a varias partidas y esas asociaciones deben conservarse sin clonación ni fusión silenciosa. La política de recursos legados compartidos debe resolverse sin pérdidas antes de migrar.
- Campaña: ID estable, nombre, descripción, sistema con versión exacta retenida, imagen y estado activo/inactivo. Arco: ID estable, nombre, portada, descripción breve y cantidad de escenas derivada de sus asociaciones, sin contador editable.
- Escena: identidad y contenido existentes, relación con arco y configuración de portada. El mapa inicial es el de índice 0 del orden de mapas, no necesariamente el mapa activo.
- Propuesta de formulario: nombre obligatorio; descripción e imagen opcionales con placeholder. Selección explícita de sistema disponible al crear campaña; ninguna actualización automática a la última versión. Los recursos heredados conservan binding/hash. Cambiar el sistema de una campaña con contenido no forma parte de este alcance.
- Los IDs no se derivan de nombres. Renombrar o sustituir portada no altera mapas, entidades, escenas ni acceso a la sesión.
- Concreción técnica de D-05 durante Build: una escena compartida conserva un único contenido. Si alguna campaña vinculada está inactiva, se rechaza toda escritura de ese recurso compartido, también desde otra campaña activa o la API global. La consulta permanece disponible; el error identifica la campaña que debe reactivarse para editar. Así no se modifica por otra vía el contenido declarado de solo consulta, ni se crean copias o desvinculaciones silenciosas.

### Flujos previos al editor

1. El DM autenticado llega a **Campañas**, con activas por defecto y acceso visible a inactivas. Tarjetas con portada, nombre, sistema y estado distinguible sin depender solo del color.
2. Abrir una campaña muestra cabecera y tarjetas de arcos, con nombre, portada, descripción breve y número de escenas. La navegación mantiene el contexto mediante sidebar y ruta visible.
3. Abrir un arco muestra escenas con miniaturas y acceso a su preparación de NPCs/monstruos. El catálogo no abre una sesión de juego ni rota invitaciones por el mero hecho de navegar.
4. En una campaña activa, abrir una escena conserva su selección y carga exactamente esa escena en el editor existente. El editor de servicio actual requiere iniciar o continuar apertura; se conserva ese paso explícito cuando corresponda, sin abrir mesa automáticamente por navegación. Editar el canvas sin apertura queda fuera del alcance actual. Volver al panel respeta guardado, recuperación y cancelación vigentes; no descarta cambios para cambiar la ruta.
5. Desactivar/reactivar conserva contenido. Confirmado D-05: una campaña inactiva permite **solo consulta, sin editar ni jugar**. La restricción incluye sus metadatos, arcos, escenas, mapas, portadas y preparación de NPCs/monstruos; tampoco se permite crear o modificar hijos, guardar cambios contra ella ni iniciar/continuar juego. Se mantiene navegación de consulta, sin abrir el editor de juego ni añadir un nuevo visor de canvas. Reactivar es la transición de estado permitida para volver a preparar o jugar. No se desactiva mientras exista una apertura vigente: el DM debe cerrarla explícitamente primero. La API aplica la misma restricción, incluso ante URLs directas, pestañas antiguas o peticiones en curso.

### Portadas y mapa del arco — D-01/D-02 confirmadas

- El arco tiene solo portada; no incorpora un mapa independiente en esta entrega.
- La portada de escena usa la **imagen propia aportada por el DM si existe; en su ausencia, la imagen del mapa 0**. No se exige seleccionar entre modos. Eliminar la imagen propia devuelve la portada al mapa 0. Reordenar o reemplazar el mapa 0 actualiza la portada cuando no hay imagen propia; cambiar el mapa activo no la altera.
- Si no hay imagen propia ni mapa 0 utilizable, se muestra placeholder. Una referencia elegida que falla muestra un estado recuperable, sin eliminarla ni sustituirla silenciosamente; una subida fallida conserva la portada anterior y permite reintentar. Portadas son metadatos administrativos y no publican mapas a jugadores.

### NPCs y monstruos — D-03 confirmada

Confirmado: se preparan y viven en el arco, fuera del editor; el editor conserva lista/información de lo disponible. La preparación de instancias del arco reutiliza plantillas permitidas, sin otorgar al DM edición/publicación del catálogo global admin.

Todas las escenas del arco consultan el **catálogo completo del arco**, sin asignación de subconjuntos por escena. La preparación y edición permanente de fichas se realiza fuera; dentro se conserva consulta y uso táctico ya existente (colocación, visibilidad y estado de la escena) sin rediseñar paneles. En campaña inactiva se aplica la restricción de solo consulta de D-05.

La implementación debe distinguir ficha preparada de instancia táctica para evitar propagar accidentalmente daño/estado entre escenas. No fusionar NPCs históricos por nombre ni eliminar sus referencias. El plan propone snapshots portables y tratamiento conservador de copias como detalle técnico revisable; su contrato debe concretarse en T-01 sin ampliar D-03 ni alterar datos existentes silenciosamente.

### Último arco visitado: 15 días

Confirmado por corrección explícita del usuario: **15 días**, guardado local en navegador/IndexedDB. Se conserva una referencia por campaña, no una lista sincronizada en servidor.

Supuesto propuesto y reversible: registrar al entrar correctamente al arco o a una de sus escenas, con identificador y marca temporal; actualizar en cada nueva entrada y no por re-render. Resaltar si `0 <= ahora - última visita < 15 × 24 horas`; al cumplir 15 días deja de resaltarse. No cambia orden ni abre automáticamente el arco.

Separar por origen/cuenta/campaña para no mezclar DMs. No guardar fichas ni secretos en ese registro. Si desaparece el arco, cambia la cuenta o el almacenamiento falla, omitir resaltado y mantener navegación operativa; no recrear contenido remoto desde IndexedDB. Fecha futura inválida no genera resaltado indefinido. La persistencia local no promete continuidad entre dispositivos.

### Autoridad, errores y concurrencia

- Servidor valida propietario y relaciones completas campaña/arco/escena en lectura, escritura y acceso a imágenes. Un ID manipulado no concede acceso; admin tampoco hereda propiedad.
- Las descripciones se tratan como texto; imágenes pasan por validación existente de tipos/tamaño y autorización. No se habilita contenido remoto ejecutable ni acceso privilegiado del renderer.
- Guardado de metadatos usa revisión/concurrencia del servicio: ante conflicto, avisar y permitir recargar sin sobrescribir silenciosamente. Reintentar una creación tras fallo de red no duplica registros.
- Carga, vacío, error y pérdida de acceso tienen estados explícitos. Un error de portada no oculta acciones de navegación. Expiración de identidad conserva/suspende el editor conforme SDD 51/58; no presenta contenido de otro DM al volver a entrar.
- Sidebar y tarjetas se operan por teclado, foco visible y nombres accesibles; acción principal separada de menús. Diálogos restauran foco; Escape cancela. En ancho estrecho la navegación se contrae sin cubrir controles permanentemente. Identidad visual vigente conservada.

## Criterios de aceptación

Todos describen resultados exigidos, no pruebas superadas. D-01–06 registran decisiones del usuario incorporadas en esta revisión; construcción autorizada mediante la orden indicada arriba.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-01 | DM crea campañas y edita las activas con nombre, descripción, sistema exacto e imagen; solo ve las propias. | Recorrido con dos DMs y admin; intento de acceso cruzado por API/asset. |
| CA-02 | Inactiva permite solo consulta de campaña e hijos, sin editar ni jugar; reactivar restituye operaciones y desactivar exige cerrar explícitamente la apertura vigente. | Recorrido activar/desactivar sin pérdida, apertura vigente, edición de hijos, guardado desde pestaña antigua y rechazo API. |
| CA-03 | Campaña → arcos → escenas muestra metadatos, número correcto de escenas y navegación de regreso. | Crear dos arcos y varias escenas, recargar y comprobar conteo/contexto. |
| CA-04 | Arco tiene solo portada; escena prioriza imagen propia, después mapa 0 y finalmente placeholder, sin selector de modos. | Subir/quitar imagen propia, reordenar/reemplazar mapa 0, cambiar mapa activo y simular fallo de carga. |
| CA-05 | Abrir una escena de campaña activa carga sus mapas y estado tras el paso de apertura aplicable, sin rediseñar editor ni perder cambios al volver/cancelar. | Recorrido multimap, cambios pendientes, guardar/cancelar y recuperación SDD 58; inactiva no permite entrar a juego. |
| CA-06 | NPCs/monstruos se preparan/editan en arco activo y todas sus escenas consultan el catálogo completo; editor conserva consulta/uso táctico, sin filtrar fichas privadas ni alterar otra escena accidentalmente. | Dos escenas del arco, plantilla retenida, instancias tácticas, campaña inactiva y vista invitado. |
| CA-07 | Solo el último arco de cada campaña se resalta durante menos de 15 días con aislamiento local por cuenta. | Reloj controlado a 14 días, límite exacto 15, otra campaña/cuenta, recarga y fallo IndexedDB. |
| CA-08 | Una mesa por campaña conserva invitaciones/participantes al cambiar arco/escena; navegar el panel no abre, rota ni publica una mesa. | Recorrido DM/invitado continuar/reabrir/rotar/cerrar, cambiar arco/escena y volver a panel. |
| CA-09 | Cada partida previa pasa a campaña con arco inicial; migración conserva escenas, mapas, entidades, assets, IDs/bindings y borradores sin fusionar por nombre. | Fixture legada con escenas compartidas/entidades homónimas, inventario antes/después y reejecución en DB aisladas. |
| CA-10 | Teclado, foco, ancho estrecho y estados vacío/error/acceso perdido permiten completar la navegación en navegador y Electron conectado. | Recorrido visual en ambos clientes, lector/nombres accesibles y fallos simulados. |
| CA-11 | `.ttrpgscene` y modo autónomo mantienen carga/guardado de contenido legado y seguridad de clientes. | Roundtrip de escenas v1/v2 y entidades, revisión de límites IPC/API; resolver exportación según D-03. |
| CA-12 | Conflictos, red fallida y recursos ajenos no causan sobrescrituras, duplicados ni accesos cruzados. | Pruebas de contratos/casos de uso y SQLite/PostgreSQL aislados, más recorrido autenticado. |

## Reutilización y compatibilidad

Se reutilizan editor/multimapa (SDD 29), entidades (16), gestión de escena (18), contratos de cliente/API y persistencia (41–46), identidad/propiedad/sistemas (47–48), aperturas y moderación (49–50), experiencia/cabecera (51/54) y guardado/recuperación (58). Se conserva `.ttrpgscene` v2 con lectura v1; la jerarquía administrativa se propone separada del archivo de escena, sin volver el archivo dependiente de una cuenta remota.

**Correspondencia confirmada D-04:** cada partida previa se presenta como una campaña y recibe un arco inicial para sus escenas; se conserva identidad y sistema de la partida como continuidad de la mesa en vivo. Hay una mesa por campaña; la apertura no pertenece a cada arco/escena y cambiar entre ellos conserva invitaciones y participantes. Esta decisión funcional no fija el esquema técnico ni autoriza ejecutar la migración. Recursos vinculados a más de una partida, bibliotecas, borradores y escenas sin vínculo requieren inventario y reglas sin pérdida antes de migrar. No reagrupar historias por nombres ni borrar asociaciones antiguas sin equivalencia verificada.

La preparación en arco exige preservar una representación portable suficiente de entidades usadas al guardar/exportar escena. Concreción técnica aceptada durante Build: conservar snapshots autosuficientes en los campos v2 de NPCs/monstruos al incorporarlos a la escena; preparación/procedencia permanecen fuera del archivo. Editar una ficha del arco no refresca automáticamente copias tácticas ya materializadas, conforme a la independencia entre escenas y SDD 16. Las limitaciones actuales de assets/plantillas ausentes siguen siendo explícitas y recuperables.

El paquete de transferencia operativa evoluciona a v4 para conservar campaña, arcos, asociaciones y preparación, manteniendo lectura v1–v3. Es un formato distinto de `.ttrpgscene`, que conserva v2 y lectura v1. No agrega una función de exportación de campañas en la interfaz ni incorpora cuentas, aperturas o borradores al paquete. La validación exige roundtrip e identidad de recursos/bindings; no autoriza operaciones sobre datos reales.

## Decisiones confirmadas, riesgos y pendientes reales

**Procedencia de D-01–06:** respuestas humanas del usuario al formulario de aclaraciones de esta necesidad, recibidas el 2026-11-13 y trasladadas por la sesión principal. Las respuestas literales y consultas se conservan en seguimiento privado; aquí se registra su efecto funcional. Responder las consultas no autoriza implementación.

| ID | Decisión confirmada | Criterios afectados |
| --- | --- | --- |
| D-01 | El arco tiene solo portada, sin mapa independiente. | CA-03/04 |
| D-02 | Imagen propia de escena si existe; si no, mapa 0. Sin selector de modos obligatorio. | CA-04 |
| D-03 | Todas las escenas consultan catálogo completo del arco; preparación/edición fuera, consulta y uso táctico en paneles actuales del editor. | CA-05/06/09/11 |
| D-04 | Una campaña por partida actual con arco inicial; una mesa por campaña, conservando invitados al cambiar arco/escena. | CA-08/09 |
| D-05 | Inactiva solo consultable, sin editar ni jugar; cierre explícito de mesa antes de desactivar y reactivación para volver a operar. | CA-02/05/06/08/12 |
| D-06 | Primera entrega en navegador y Electron conectado; autónomo conserva comportamiento actual sin jerarquía nueva. | CA-01–12 |

Se mantienen los acuerdos del encargo original: jerarquía completa, metadatos solicitados, editor sin rediseño, sidebar/cards e imágenes, **15 días** en IndexedDB y revisión de spec antes de implementar. La revisión 0.1 conservó alternativas pendientes; la 0.2 incorpora las seis respuestas, especialmente la prioridad de imagen propia y el estado inactivo de solo consulta.

Migración/asociaciones, snapshots y portabilidad quedaron concretados en el [plan](plan.md) y los contratos T-01: migraciones aditivas 9/10, snapshots autosuficientes sin refresco automático y transferencia operativa v4 con lectores v1–v4. No quedan decisiones D-01–06 sin responder. La aprobación de implementación consta en la orden de Build.

Riesgos principales: confundir organización narrativa con sesión en vivo; perder asociaciones o entidades históricas; romper portabilidad por mover fichas fuera de escena; filtrar assets privados mediante miniaturas; permitir escrituras en campaña inactiva desde otro contexto. La matriz de [validación](validacion.md) registra las comprobaciones nuevas y los límites de esta implementación.

## Entrega y evidencia

Entregables de construcción: revisión funcional 0.2 aceptada, [plan](plan.md), [tareas](tareas.md), [ficha UX](../../guias/ui-ux/campanas-arcos-escenas.md) e implementación local 3.28.0. La [evidencia por criterio](validacion.md) registra pruebas superadas y distingue validación local de integración. Git e integración conservan sus autorizaciones independientes.

## Ajuste de experiencia 0.3 — 2026-11-13

**Procedencia y autorización:** el usuario pidió tres correcciones sobre capturas de la implementación local: retirar «Recuperar borradores de mis partidas» del panel y ofrecer recuperación únicamente al entrar al editor cuando quedó trabajo sin guardar; eliminar la pantalla intermedia de iniciar/continuar; situar el estado de guardado en el footer pequeño. Se continúa la entrega de SDD 59 en la rama feature ya autorizada, conservando cambios locales y sin operaciones de historial Git. Esta petición sustituye los requisitos anteriores que imponían un gate visual adicional y el acceso global a borradores; no autoriza borrado de copias ni recuperación de partidas eliminadas.

- El panel de campañas no muestra el archivo global de borradores. Al abrir una escena, la recuperación contextual se ofrece solo si existe trabajo pendiente de esa escena. Los borradores ajenos al contexto se conservan y no se cargan automáticamente.
- «Abrir escena» entra directamente al editor seleccionado. Tras validar permisos, pertenencia y estado activo, continúa la apertura vigente o inicia la necesaria como parte de esa misma acción. No publica escena ni rota/reabre la invitación vigente. El cierre explícito no provoca una reapertura automática; los errores ofrecen reintento voluntario y regreso al panel, sin bucles.
- El estado local de guardado ocupa el footer existente del editor, con texto pequeño y legible, sin franja superior ni superposición sobre Propiedades. Conserva información accesible de error/sincronización y las acciones necesarias para resolver conflictos.
- Se mantienen protección del borrador, aislamiento por cuenta y escena, revisión de autoridad, comportamiento autónomo y ausencia de migraciones nuevas. Alcance de clientes: navegador y Electron conectado.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-13 | Campañas no ofrece recuperación global; el editor ofrece recuperación solo ante trabajo pendiente del contexto elegido, conservando las otras copias. | Tests sin borrador, limpio, pendiente de escena actual y pendiente de otra escena; recorrido con copia local. |
| CA-14 | Elegir una escena válida abre el editor sin pantalla de iniciar/continuar; conserva apertura/invitación vigentes, rechaza selección inválida/inactiva y no reabre tras cierre explícito. | Tests de apertura nueva/vigente, reintento tras fallo, autoridad/StrictMode y cierre; recorrido real desde panel. |
| CA-15 | Estado de guardado pequeño en footer, accesible y sin superposición superior en escritorio y ancho estrecho; errores/conflictos siguen siendo resolubles. | Prueba de integración del footer, typecheck/lint/build y revisión visual del navegador. |

La revisión 0.2 y sus resultados permanecen como corte histórico; la evidencia del ajuste se añade por separado. Versión correctiva prevista: 3.28.1, conforme al bump patch para correcciones sin funcionalidad nueva.

## Ajuste visual 0.4 — 2026-11-14

**Procedencia y autorización:** petición humana con cuatro capturas: listados de ancho completo en pantallas pequeñas y grilla de dos columnas en grandes; centrar botones con sus iconos; reutilizar fuera del editor el switch de «Ajustar grilla», en particular «Campaña activa». Se continúa esta feature en su rama previamente autorizada y se preservan los cambios locales. No se autorizan operaciones de historial Git ni cambios de datos reales.

- Listados de tarjetas de campañas, arcos y escenas: una columna que usa todo el ancho disponible en pantallas pequeñas, conservando márgenes de lectura; exactamente dos columnas de igual ancho en pantallas grandes, incluso con una sola tarjeta. Sin desbordamiento horizontal ni una tercera columna.
- Acciones con icono y texto: ambos alineados y centrados como un conjunto, con espacio consistente y sin deformar iconos. Botones de solo icono mantienen icono centrado y nombre accesible. Navegación y breadcrumbs conservan su composición propia.
- «Campaña activa» reutiliza el componente y estilos del switch del editor, sin variante duplicada que pierda su forma fuera del VTT. Ambos estados, foco, teclado y deshabilitado mantienen la misma presentación. Cambia la apariencia, no el flujo de confirmación ni las reglas de activar/desactivar.
- Alcance compartido navegador/Electron conectado. Sin API, migraciones, dependencias ni formato nuevos; conservar la apariencia del switch dentro del editor.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-16 | Campañas/arcos/escenas muestran una columna de ancho completo en estrecho y dos columnas iguales en grande, aun con una tarjeta, sin overflow. | Inspección real a 390 px, umbral responsive y escritorio, con uno y varios elementos. |
| CA-17 | Icono y texto de acciones están centrados y alineados; botones de icono mantienen tamaño, foco y etiqueta. | Captura/medición real de Nueva campaña, Crear arco, Asociar escena y opciones. |
| CA-18 | Campaña activa reutiliza el switch del editor, con thumb contenido y estados/foco/teclado correctos, conservando confirmación y cancelación. | Pruebas existentes de transición, inspección de componente compartido y recorrido visual de formulario/editor. |

Versión correctiva entregada y validada localmente: **3.28.2**. CA-16–18 comprobados mediante 47 pruebas dirigidas, checks/builds y recorridos reales de navegador y Electron; [evidencia separada](evidencia-ui-0.4.json) de 0.2/0.3. Ninguna prueba histórica se presenta como ejecución de este ajuste. Sin commit, push, merge ni DMG.

## Corrección de navegación 0.5 — 2026-11-14

**Procedencia y autorización:** el usuario solicita sustituir el menú flotante Campañas/Arcos y el desplegable de la hamburguesa por un sidebar real, tomando una captura de SmartAdmin como referencia estructural. Limita expresamente el cambio a la administración fuera del editor. La petición autoriza implementación y validación de esta corrección; la creación de `fix/sidebar-administracion` fue autorizada por respuesta humana explícita en esta sesión, conservando cambios SDD59/60. No se autorizan commit, push, merge, publicación ni datos reales.

Se corrige el sidebar ya previsto por SDD59; no se añade una nueva jerarquía, permiso ni pantalla. Se conserva la paleta y los componentes actuales, sin incorporar SmartAdmin ni sus assets/dependencias.

- En administración, una columna lateral de unos 240 px ocupa toda la altura y forma parte del layout desde 960 px; la cabecera compacta ocupa la región principal. La marca no se duplica. La hamburguesa existente muestra/oculta esa columna y el contenido aprovecha el espacio libre. No se añade un rail alternativo ni persistencia de preferencias.
- Por debajo de 960 px, la misma hamburguesa abre la navegación como drawer lateral con fondo atenuado. Escape y clic en el fondo cierran y devuelven foco al disparador; el foco permanece dentro mientras esté abierto. Elegir destino cierra y sitúa el foco en el contenido nuevo. Al perder autorización, cambiar cuenta, entrar al editor o cambiar breakpoint, se cierra sin dejar top layer, foco atrapado ni contenido de la cuenta anterior.
- Una sola navegación muestra Campañas y el contexto seleccionado: nombre de campaña con Arcos; nombre de arco con Escenas y Monstruos y NPCs. No se carga un árbol completo de recursos. Solo la hoja actual tiene `aria-current="page"`; detalle de escena pertenece a Escenas y preparación a Monstruos y NPCs. Los nombres de campaña/arco son contexto legible, con tratamiento de texto largo.
- El administrador conserva Cuentas DM y Sistemas; DM no recibe esas opciones. La compatibilidad antigua conserva Partidas sin hijos ficticios. Carga/error/vacío no deben impedir volver a la raíz. Se retiran el antiguo aside flotante y su disparador móvil redundante. Las migas permanecen como ruta inline.
- El editor conectado y el autónomo conservan cabecera, menús, canvas, portales, guardas de salida/recuperación y estado de sesión actuales. Se limita CSS al shell de administración, dado que `.service-page` también se usa en fallbacks del editor. Las listas mantienen una columna estrecha y dos desde escritorio, sin overflow al abrir/cerrar sidebar.
- Reutilizar estado de ruta, permisos y clientes existentes; no duplicar cargas ni introducir almacenamiento, API, migraciones o dependencias. El nuevo componente recibe un nombre estable y se documenta en Storybook con datos sintéticos, sin montar aplicaciones completas ni motores.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-19 | Administración usa un sidebar estructural de altura completa; desaparecen el aside flotante de campañas y el desplegable hamburguesa exterior al editor. | Recorrido DM/admin y capturas escritorio; inspección de layout y navegación única. |
| CA-20 | Hamburguesa muestra/oculta sidebar en escritorio y abre drawer accesible en estrecho; foco/cierre correctos en navegación, Escape, fondo, autoridad y breakpoint. | Pruebas dirigidas y teclado real, con drawer abierto durante transiciones. |
| CA-21 | Jerarquía contextual, raíz, roles y fallback permanecen operativos, un activo exacto y migas visibles; sin nombres de otra cuenta ni cargas duplicadas. | Pruebas Catalog/Panel/ServiceApp y navegación con datos sintéticos. |
| CA-22 | Editor y protecciones conservados; CSS externo no altera fallback/editor; contenido y listas usan ancho restante sin overflow. | Regresiones, diff acotado, medidas 390/959/960/1440 y smoke del shell conectado. |
| CA-23 | Sidebar nombrado y catalogado en Storybook; versión/changelog y evidencia local actualizados. | Historias aisladas DM/admin/colapso/drawer, typecheck/lint/builds y pruebas pertinentes. |

Patch validado localmente **3.29.1**, al corregir la navegación existente sin nuevas capacidades de producto. Los cortes anteriores de aceptación se conservan; la evidencia 0.5 se registra separadamente y no certifica de nuevo todo el backend o motor visual.


## Listados separados y acciones de preparación 0.6 — 2026-11-15

**Orden humana:** separar NPCs y Monstruos en menús diferentes, mejorar su página con un listado por tipo y datos relevantes, agregar desde un botón arriba a la derecha, y editar/borrar mediante dropdown de acciones por fila. Editar abre el formulario del registro. Esta petición acepta planificar, implementar y validar el delta sobre SDD59; no autoriza operaciones Git ni migraciones sobre datos reales por sí sola.

### Resultado y alcance

- El sidebar del arco ofrece **NPCs** y **Monstruos** como destinos distintos, reemplazando la opción combinada. Cada pantalla conserva campaña/arco, migas, un único activo y encabezado propio. Navegar no abre una mesa ni publica a jugadores.
- Cada destino muestra solo su tipo en una lista de filas legibles a ancho completo, con imagen/placeholder, nombre, resumen de notas y procedencia; los monstruos incluyen nombre de plantilla cuando pueda resolverse. Se usan datos existentes: no se inventan HP, CA, estadísticas ni otros campos. Las notas completas se conservan en el formulario; el resumen visual no las modifica.
- La acción principal **Agregar NPC** o **Agregar monstruo** queda arriba a la derecha en escritorio, se adapta a pantallas estrechas y abre directamente el formulario correspondiente. No hace falta una pantalla intermedia. Se reutiliza selección de plantilla e imagen existente; estados sin plantillas explican por qué no se puede crear un monstruo.
- Cada fila editable presenta un botón de acciones con etiqueta accesible ligada a su nombre y dropdown **Editar / Borrar**. Editar abre el formulario precargado del registro; guardar actualiza el listado y cancelar no modifica datos. Errores conservan entradas y permiten reintentar. El formulario no debe confundirse al cambiar de tipo/arco/cuenta ni aceptar respuestas tardías de otro contexto.
- **Borrar** pide confirmación con nombre y deja claro que las copias ya usadas en escenas se conservan. La operación retira la ficha del listado y de nuevos usos; no elimina instancias tácticas, snapshots, assets o notas de escenas existentes. Tras borrar el último elemento de una página se muestra una página válida y se restaura foco en un destino existente.
- Las campañas inactivas permanecen de solo consulta: sin alta/edición/borrado, tanto en UI como servidor. Se conservan propiedad del DM, revisiones/conflictos e idempotencia. Admin/invitado no adquieren acceso a preparación privada.

### Extensión técnica necesaria y compatibilidad

La inspección de 3.29.1 confirma que `listPreparation` pagina hasta50 entradas mezcladas, admite limit/offset/text y no dispone de DELETE. Por ello el delta incluye un filtro opcional de tipo **aplicado antes de contar/paginar** y una operación de borrado autorizada/revisionada. Omitir el filtro conserva el catálogo completo que consume el editor.

El borrado será lógico: la migración11 añade la marca necesaria y conserva la fila, reservas y procedencia. El backfill no debe recrear fichas borradas. La transferencia operativa debe preservar esa marca y evitar resurrección: writer v5, lectores v1–v5 con compatibilidad anterior. Esto es independiente de `.ttrpgscene`, que conserva formato v2 y lector v1. No se edita una migración ya aplicada ni se ejecutan migraciones sobre bases reales sin autorización separada.

La presentación solo afecta administración en navegador y Electron conectado. El editor, canvas y sus controles conservan la UI y el consumo sin filtro; su catálogo completo deja de ofrecer registros borrados al volver a consultarlo. No incluye edición del catálogo global de plantillas, nuevos campos de reglas, búsqueda avanzada, borrado masivo ni restauración de fichas borradas en la interfaz.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-24 | NPCs y Monstruos son destinos separados, con contexto/activo/migas correctos, listado y paginación exclusivos de cada tipo. Omitir filtro conserva catálogo completo del editor. | Contratos mixtos de más50 registros, navegación y respuestas tardías. |
| CA-25 | Listado responsive con datos reales y estados legibles; CTA arriba derecha y dropdown de acciones por fila accesibles. | Storybook/recorrido real desktop y390px, teclado/foco y textos largos. |
| CA-26 | Alta/edición abren formularios adecuados; edición precargada. Borrar requiere confirmación y respeta revisión/propiedad/inactiva; desaparece de nuevos usos sin afectar copias ya creadas. | Pruebas frontend/API/DB, cancelación/error/conflicto y snapshots conservados. |
| CA-27 | Borrado sobrevive backfill y transferencia, migraciones compatibles; editor sin regresión, historias y documentación actualizadas. | Roundtrip operativo v5/lectores anteriores, migración sintética, regresiones y builds relevantes, QA navegador/Electron conectado. |

Versión prevista **3.30.0**: incorpora borrado de preparados como capacidad compatible. La aceptación histórica CA01–23 no se vuelve a declarar pendiente por este delta; su evidencia se conserva separada de la nueva validación0.6. No hay autorización de commit, push, merge, publicación ni DMG. El2026-11-15 el usuario autorizó por separado respaldo integral, incorporación del corte3.30.0, migración realSQLite10→11 y reinicio/verificación; la ejecución se registra en [validación](validacion.md).

## Corrección visual de breadcrumbs 0.7 — 2026-11-15

**Orden humana:** retirar la apariencia de botón de las migas de administración, subrayar los destinos anteriores y dejar el último sin subrayado. Se mantiene la navegación existente, sin cambios en API, datos, editor ni dependencias. Versión correctiva prevista **3.30.1**; la entrega 0.6 permanece validada.

Los ancestros se presentan como texto subrayado con foco de teclado visible. La hoja actual es texto no interactivo con `aria-current="page"`, sin subrayado ni parada de Tab. Ningún segmento lleva fondo, borde o sombra de botón. Se conservan separadores decorativos y ajuste de línea para nombres largos en pantalla estrecha. Las rutas de campañas, arcos, escenas, NPCs, Monstruos y detalle de escena siguen funcionando con el estado de navegación actual.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-28 | Breadcrumbs administrativos sin apariencia de botón: ancestros subrayados navegables y último texto sin subrayado ni acción, un único actual accesible, foco visible y sin desbordamiento. | Pruebas dirigidas de navegación/semántica y revisión real de estilos, teclado y nombres largos a390/1440px. |

El usuario autorizó crear y cambiar a `fix/breadcrumbs-administracion` desde el HEAD actual, conservando cambios locales; rama preparada el2026-11-15. Implementación pendiente al registrar la autorización. No se autorizan commit, push ni merge.

**Cierre 0.7:** T-14 y CA-28 validados en3.30.1 mediante17 pruebas dirigidas, typecheck/lint/build web y revisión visual de seis rutas a390/1440px. [Evidencia](evidencia-ui-0.7.json). Entrega en checkout y Storybook local; sin merge ni cambios sobre datos reales.


## Escenas en el menú de campaña 0.8 — 2026-11-15

**Orden humana:** «Haz que en este menú aparezcan las escenas pertenecientes a la campaña actual», señalando el desplegable de campaña del editor. Se acepta implementar y validar esta ampliación de la navegación SDD59. Los ajustes de etiquetas/cabecera 3.30.2–3.30.3 se conservan con su evidencia en validacion.md.

- El desplegable del editor lista escenas asociadas a la campaña actual, agrupadas por arco para conservar su contexto. Incluye todos los arcos y páginas; no usa el catálogo global de escenas ni carga documentos completos para enumerarlas.
- La selección actual se identifica visualmente y de forma accesible. Elegirla de nuevo no descarta ni recarga trabajo. La misma escena asociada a arcos distintos conserva cada contexto de preparación.
- Elegir otra escena usa la navegación y confirmación de cambios pendientes vigentes, sin una segunda confirmación redundante. Cancelar mantiene URL, documento y selección; aceptar abre exactamente la escena y arco elegidos. La apertura e invitación vigentes se conservan; seleccionar no publica a los jugadores.
- El enlace al catálogo se llama Campañas. Reabrir y Cerrar partida mantienen sus acciones y confirmaciones. El listado distingue carga, vacío y error recuperable; no presenta un fallo como lista vacía o completa. Contenido largo se desplaza dentro del menú y las etiquetas largas son legibles sin desbordar la pantalla.
- Contextos/cuentas o respuestas tardías no mezclan escenas de campañas distintas. La autoridad del servidor se revalida al cambiar y las campañas inactivas o inaccesibles mantienen las restricciones vigentes.
- Afecta navegador y Electron conectado, donde existe este menú. Sin cambios a Electron autónomo, Pixi, API, migraciones, permisos ni formatos. Se reutilizan las operaciones paginadas de campañas/arcos/escenas existentes.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-29 | Menú muestra únicamente escenas de la campaña actual, de todos sus arcos/páginas, con contexto y selección actual inequívocos. | Pruebas cliente/UI con dos campañas, múltiples arcos y páginas, asociaciones repetidas, carga/vacío/error y respuestas tardías. |
| CA-30 | Cambiar escena respeta confirmación/cancelación, carga destino correcto y conserva apertura/invitación sin publicación automática. | Integración de navegación/guardas y remonte contextual; regresiones de autoridad y cambio de escena. |
| CA-31 | Menú conserva acciones existentes, es usable con teclado y en ancho estrecho, y está documentado en Storybook. | QA de componente real, pruebas dirigidas, typecheck/lint/build web y evidencia. |

Versión minor prevista **3.31.0** por navegación compatible nueva. La preparación de una rama requiere permiso Git específico; no se autoriza commit, push, merge ni migración de datos reales.


**Ejecución0.8 autorizada:** el usuario autorizó crear y cambiar a `feature/escenas-menu-campana` conservando cambios locales. Rama preparada desde `6d1f195` el2026-11-15; T-15 despachada a frontend tras plan y acuerdo UX. Sin permiso de commit, push ni merge.


**Cierre0.8:** T-15/CA-29–31 validados localmente en3.31.0 con59 pruebas dirigidas, checks/builds, Storybook y recorridos sintéticos de navegador/Electron. Apertura e invitación conservadas; procesos QA detenidos. [Validación y límites](validacion.md#escenas-del-menú-de-campaña-08--cierre-t-15-2026-11-15). Sin integración Git ni operaciones sobre datos reales.

## Selector de plantillas con autocompletado — ajuste 0.9, 2026-11-16

El usuario solicita mejorar el campo Plantilla de agregar/editar monstruos, tomando como referencia un select con autocompletado tipo Select2. La búsqueda seguida de radios expuestos y truncados a diez resultados se sustituye por un único desplegable compacto y reutilizable. La petición autoriza este ajuste de interfaz; no exige incorporar una librería concreta.

- La etiqueta visible es **Plantilla**. El campo muestra la selección confirmada o una invitación a buscar/elegir. Al abrirlo permite filtrar por nombre y seleccionar una opción; la flecha conserva espacio propio a la derecha. Los nombres extensos se mantienen legibles.
- Escribir filtra opciones existentes, sin crear plantillas ni confirmar automáticamente. El filtro no modifica el ID guardado: cerrar sin seleccionar restaura el texto del valor confirmado. Se pueden alcanzar todos los resultados, también los posteriores al décimo, con una lista desplazable de altura acotada.
- Flechas recorren opciones, Enter confirma sin enviar el formulario, Escape cierra primero la lista sin cerrar el diálogo, y Tab continúa por el formulario sin selección accidental. Foco visible, etiqueta y estado de selección accesibles; ratón y teclado tienen resultados equivalentes.
- Conserva la plantilla/binding retenida al editar sin cambiarla, incluso si está ausente del catálogo habilitado o el templateId es null. No inventa IDs ni ofrece plantillas deshabilitadas para nuevas fichas. Sin resultados se informa explícitamente; durante una operación pendiente el selector queda deshabilitado.
- Se aplica al formulario administrativo de monstruos en navegador y Electron conectado. NPCs, catálogo de plantillas global, editor/canvas, router, API, formato y persistencia mantienen sus contratos. El fallo de navegación desde `/` diagnosticado antes queda fuera de este ajuste.
- Storybook presenta el componente real reutilizable y su uso en el formulario, con datos sintéticos, selección, búsqueda, lista larga, vacío/sin coincidencias, retenida y deshabilitado. La implementación se verifica bajo la cascada CSS real del servicio.

| ID | Condición observable | Forma de verificar |
| --- | --- | --- |
| CA-32 | Un único selector compacto de Plantilla permite buscar y elegir explícitamente cualquier opción habilitada, sin radios visibles ni límite oculto de diez; conserva la elección al cancelar la búsqueda. | Prueba del componente, lista larga y recorrido visual a 390/1440 px. |
| CA-33 | La selección y edición preservan IDs/bindings retenidos y guardado explícito; teclado, foco, Escape/Enter/Tab y estado pendiente funcionan dentro del diálogo. | Regresión de creación/edición con binding retenido y null, pruebas de eventos y QA del diálogo real. |
| CA-34 | El mismo componente productivo tiene nombre estable e historias interactivas en Storybook; tema, flecha y texto no se solapan, sin overflow en ancho estrecho. | Historias y formulario real, builds/controles estáticos dirigidos, evidencia y patch/changelog de la corrección. |


## Escenas propias de cada arco — revisión 0.10, 2026-11-17

**Orden de implementación:** retirar «Agregar a escena» de Mapas en el explorador y eliminar la posibilidad de compartir una escena entre arcos. Alcance aceptado por la petición; rama preparada, construcción y pruebas en copia aislada. El modelo vigente pasa a **una campaña → varios arcos; cada arco → sus escenas; cada escena → sus mapas**, gestionados desde el editor. Este delta sustituye expresamente las reglas de recursos escena compartidos y su bloqueo transversal por campaña inactiva de la base0.2/0.8; conserva su evidencia histórica.

### Comportamiento

- Cada escena vinculada tiene un único arco propietario y la campaña de ese arco. Nombres o contenido repetidos son válidos en escenas con IDs independientes; no se deduplica ni fusiona por nombre. No se introduce un botón Duplicar.
- En administración, «Crear escena» abre directamente el formulario existente dentro del arco. Se elimina el selector global y la acción «Asociar escena». Crear conserva el flujo actual: escena con Mapa1 vacío, sin abrir mesa ni publicar. Después del guardado confirmado se muestra/enfoca la nueva tarjeta. Campaña inactiva sigue siendo de solo consulta.
- Se retira únicamente el «Agregar a escena» de la sección Mapas, que importa mapas de otra escena; se conserva «Agregar mapa», selección, renombre, reordenación, sustitución de imagen y borrado. Los controles homónimos de NPCs/monstruos/personajes no forman parte de esta retirada. La infraestructura de importación portable general sigue compatible.
- La exclusividad se impone también en API, persistencia y transferencia. El endpoint antiguo de asociación no permite crear vínculos. Creación/guardado/importación contextual conserva el arco; guardar/publicar una escena existente nunca la añade al arco inicial ni a otra campaña.
- La recuperación de borradores y creación de copias reciben el arco contextual. Actualizar conserva el mismo ID y padre; copiar/nueva crea un ID independiente en ese arco. Compatibilidad con confirmaciones antiguas sin arco: derivar el arco único de la escena de la misma campaña cuando exista; en otro caso crear en el arco inicial de la campaña, sin mover recursos existentes. Sin campaña de destino no se crean nuevas escenas huérfanas.
- `.ttrpgscene` conserva v2 y lectura v1; formato/editor autónomo y mapas internos no cambian. La jerarquía sigue siendo metadato del servicio. Recursos históricos sin vínculo conservan lectura/exportación si existieran; no se borran ni asignan arbitrariamente.

### Persistencia y transición sin pérdida

La migración de esquema se ejecuta explícitamente, nunca al iniciar API. Antes de imponer exclusividad verifica escenas compartidas y relaciones contradictorias. Si aparecen, aborta transaccionalmente con diagnóstico recuperable: no clona, borra ni escoge un propietario silenciosamente. La misma regla se aplica a paquetes operativos antiguos: los compatibles conservan IDs/bytes/bindings y los que reintroduzcan relaciones compartidas se rechazan sin escrituras parciales. No se amplía este ajuste a una herramienta de conversión de datos ambiguos.

El inventario operativo de solo lectura del2026-11-17 encontró4escenas,4vínculos y2arcos:0escenas compartidas,0sin arco y0vínculos entre campañas. Este inventario orienta la transición; no equivale a migración ni autoriza ejecutarla. Construcción/fixtures en copia aislada; incorporación al checkout servido y migración real requieren autorización final sobre una entrega validada y respaldable.

### Criterios adicionales

| ID | Criterio | Verificación |
| --- | --- | --- |
| CA-35 | Mapas deja de mostrar Agregar a escena y conserva todas las operaciones de mapas restantes. | Pruebas existentes adaptadas y QA de explorador/Storybook; sin borrar botones de entidades. |
| CA-36 | Crear escena es directo dentro del arco; escenas homónimas de arcos distintos tienen ID y contenido independientes, con foco/estado vacío/error correctos. | Dos arcos, creación/reintento, edición y recarga; teclado y390/1440px. |
| CA-37 | API/DB impiden compartir IDs entre arcos/campañas, incluso con rutas antiguas, concurrencia o guardado/publicación posterior; conservan propiedad y campaña inactiva. | Contratos SQLite/PostgreSQL TLS, carreras y rollback; creación contextual sin huérfanos nuevos. |
| CA-38 | Guardado/importación/recuperación desde arco no inicial conservan destino; copias son independientes y confirmaciones antiguas siguen recuperables. | Regresiones de borradores, revisión/secuencias/idempotencia y recorrido contextual, sin pérdida de respaldo local. |
| CA-39 | Migración y transferencia verifican exclusividad, abortan datos ambiguos sin pérdida y reejecutan de forma idempotente sobre árboles válidos. | Migrar11→12, repetir, fixturesM:N/incoherentes, transferencia válida y rechazada; conservación de mapas/portadas/entidades/bindings. |
| CA-40 | Integración de navegador/Electron, navegación/preparación y formato portable siguen coherentes; versión/changelog y evidencia distinguen validación aislada de incorporación real. | Checks/builds y QA proporcionados; respaldo y revisión final antes de migrar datos operativos. |


**Cierre0.10:** CA35–40 implementados/validados e incorporados al servicio local3.33.0 tras autorización específica de respaldo/migración. SQLite12,30tablas de datos conservadas, APIactiva y configuración preservada. [Evidencia y límites de las corridas](validacion-ui-0.10.md). Sin integraciónGit.
