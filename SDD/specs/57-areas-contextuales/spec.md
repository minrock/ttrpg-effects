# 57 — Áreas con menú contextual, color, patrón, bloqueo y copia

**Estado:** Integrada en main (`62c351a`), versión 3.21.0; pendientes los recorridos de aceptación registrados en [validacion.md](validacion.md). **Fecha:** 2026-11-04. **Tipo:** funcionalidad.
**Base:** `0c8d245`, producto 3.20.0. **Rama:** `feature/sdd-areas-contextuales`.
**Dependencias:** [07 Formas](../07-shapes-and-measurement/spec.md), [03 Persistencia](../03-scene-persistence/spec.md), [39 Interfaz](../39-vtt-interface/spec.md), [44 Mesa](../44-mesa-sincronizada/spec.md), [55 Dibujos compartidos](../55-mediciones-compartidas/spec.md), [56 Cámaras libres](../56-camaras-libres-foco-atencion/spec.md).
**Evidencia:** validacion.md. **Versión de entrega:** 3.21.0; fuente oficial en package.json.

## Problema y objetivo

Al seleccionar un círculo o cono se necesita actuar directamente sobre él: elegir color, identificar el efecto mediante un patrón de emojis, bloquearlo, eliminarlo o duplicarlo. Hoy el color está fijado por tipo, el emoji se elige desde propiedades y su distribución tiene variación aleatoria estable. No hay estado de bloqueo ni copia de áreas.

Las dos capturas aportadas por el usuario son referencias de interacción: una barra compacta junto a la selección y una paleta desplegable de patrones. Se reutiliza la estética del VTT y su catálogo real; no se copian literalmente sus iconos ni se incorporan acciones solo por aparecer en la imagen.

## Alcance y sustituciones

- Círculos y conos tácticos (`SceneShape`), tanto del DM como propios del jugador, con las restricciones de propiedad de SDD 55.
- Barra contextual **Color · Patrón · Bloquear/Desbloquear · Eliminar · Copiar** al seleccionar; clic derecho sobre el área abre la misma barra.
- Relleno cuadriculado regular con emoji, recortado a la geometría; color configurable; copia independiente; protección contra modificaciones accidentales.
- Paridad de interacción en navegador, Electron servicio y Electron autónomo. Los dibujos locales de la ventana jugador autónoma siguen siendo locales; no se amplía su transporte.

No incluye líneas/mediciones, caminos, rectángulos/cuadrados, luces, fuego animado, agua, relámpagos, zonas informativas, tokens, selección múltiple, portapapeles del sistema ni copia entre partidas. No cambia medidas, reglas de cobertura, snap, forma geométrica del cono ni cámaras. «Ocultar» no se añade: no fue solicitado y requeriría definir visibilidad pública/privada.

Para círculos/conos, esta entrega sustituye en SDD 07 la exclusión de color, el selector de emoji como único acceso y el mosaico con jitter. Los contratos de líneas y rectángulos permanecen vigentes. SDD 55 conserva autoría, duración y moderación, con las precisiones de bloqueo descritas aquí. La sustitución está integrada en main desde 3.21.0 (`62c351a`).

## Interacción y presentación

### Barra de selección

- Seleccionar un área confirmada muestra una sola barra compacta, anclada a sus límites visibles; no apilar el menú general y el de área. Clic derecho sobre una zona vacía conserva el menú general.
- La barra se sitúa por encima o debajo según espacio y se limita al área útil del mapa. Evita cabecera, laterales, etiquetas y manivelas. Si el área sale de pantalla, la barra se oculta hasta volver a ser visible; su selección permanece accesible en el lateral.
- No aparece durante la creación incompleta; durante un arrastre se oculta y vuelve al confirmar/cancelar. Al cambiar de mapa, perder acceso o desaparecer la figura, se cierra y descarta borradores de estilo.
- Color y Patrón abren paneles exclusivos dentro de la misma barra. No requieren hover. Seleccionar con puntero no roba el foco de teclado. Desde la lista lateral se puede enfocar la barra con teclado.
- Botones con icono, nombre en español, tooltip y nombre accesible. Tab recorre controles; Enter/Espacio activa; flechas recorren la paleta; Escape cierra primero el panel y después la barra, devolviendo foco al disparador. Escape no elimina una figura confirmada.
- Delete/Backspace elimina únicamente una selección editable y desbloqueada cuando el foco está en el mapa. Nunca elimina desde inputs, selectores o laterales. En 390 px la barra puede ocupar dos filas y el panel tener desplazamiento propio; ninguna acción queda fuera de pantalla.

### Color

- Paleta predefinida y entrada hexadecimal `#RRGGBB`, con muestra y acción «Restablecer color». No aceptar CSS, URLs ni HTML. Un valor inválido muestra un error y conserva el último confirmado.
- El color elegido define contorno y relleno mediante opacidades de diseño; no se añade un control de opacidad en esta entrega. Medida, autor, candado y selección mantienen contraste independiente del color.
- La previsualización del selector es local y cancelable. Una elección de muestra o «Aplicar» confirma una operación; no emitir comandos por cada pulsación en el campo hexadecimal. Cambiar color no cambia emoji, dimensiones ni bloqueo.

### Patrón cuadriculado y catálogo

- «Patrón» abre una cuadrícula de botones con **Sin patrón** y las opciones de `src/domain/shapes/shape-emojis.ts` (`ALLOWED_SHAPE_EMOJIS`). Cada botón muestra el emoji y su nombre accesible, con tooltip y marca de selección.
- Una sola opción por área. Se incluyen los tipos reales actuales (frío, agua, viento, fuerza, tierra, veneno, ácido, etc.); no se inventan efectos de reglas ni se añaden los tipos de la captura que no existan en el catálogo. Escoger un patrón no modifica estadísticas ni el sistema de la sesión.
- Seleccionar un emoji activa un damero de celdas cuadradas alternadas, teñidas del color del área, con el emoji centrado en las celdas alternas. No hay jitter. «Sin patrón» retira damero y emojis y conserva el relleno translúcido y el contorno.
- La tesela usa el tamaño de celda en mundo y el origen de la grilla del mapa. Con grilla cuadrada coincide con ella; con grilla hexagonal se mantiene una textura cuadrada decorativa usando la misma escala, sin representar cobertura hexagonal. Ocultar la grilla no elimina el patrón.
- Al mover o rotar el cono cambia la máscara sobre esa trama anclada al mapa; al hacer pan/zoom o cambiar la orientación de cámara, la textura no se desplaza respecto al mundo ni cambia aleatoriamente. Dos clientes con cámaras distintas ven la misma distribución.
- Celdas y glifos se recortan al círculo/sector del cono, también en el borde. No convertir el cono en triángulo ni cambiar su apertura. En áreas menores que una tesela se permite un glifo central reducido y recortado. Autor y medida se dibujan por encima con contraste; no ocultarlos para acomodar el patrón.
- Reutilizar cachés y límites de render. No iterar todas las celdas de un área enorme para truncarlas después. Presupuesto máximo propuesto: 256 glifos por área y 2048 por viewport, con reducción determinista de densidad y descarte fuera de vista; nunca reservar memoria proporcional al área sin límite. Mantener contorno, selección y etiquetas al reducir detalle.

### Bloqueo

«Bloquear» fija la figura confirmada. Mantiene selección y visibilidad, pero impide mover, redimensionar, rotar, cambiar color/patrón, eliminar y copiar. Oculta manivelas de transformación y muestra candado. La barra conserva «Desbloquear» habilitado para quien tenga permiso; las demás acciones explican «Desbloquea el área para modificarla».

La protección se aplica igualmente a mapa, inspector, lateral, atajos y comandos. Un cliente no puede evadirla enviando una geometría con `locked: false`: desbloquear es una operación explícita, separada y autorizada. Bloquear cancela cualquier edición provisional y fija el último estado confirmado; una actualización atrasada no lo sobrescribe.

- DM: bloquea/desbloquea sus figuras persistentes. Jugador: solo sus figuras locales o compartidas. Otro jugador no adquiere permisos al seleccionar un área ajena.
- «Limpiar mis dibujos» omite figuras bloqueadas e informa cuántas conserva; no las desbloquea implícitamente. El deshacer local puede revertir la acción de bloqueo dentro del historial vigente, pero no debe funcionar como borrado encubierto de una figura aún bloqueada.
- **Excepción de moderación:** el DM conserva «Retirar dibujo» y «Limpiar dibujos de jugadores». Puede retirar un dibujo bloqueado con confirmación que lo indique; no recibe permiso para editar/copiar/desbloquear el dibujo ajeno. Son acciones distintas del borrado ordinario.
- Salida, expulsión, cierre, cambio de contexto y expiración limpian figuras según SDD 55 aunque estén bloqueadas. El candado protege de ediciones accidentales, no otorga persistencia ni impide moderación.

### Eliminar y copiar

Eliminar una figura propia desbloqueada conserva el mecanismo actual; la moderación conserva sus confirmaciones. Si la red falla, no mostrar éxito y conservar/restaurar el estado confirmado con mensaje recuperable.

«Copiar» duplica inmediatamente en el mismo mapa y selecciona la copia, sin usar el portapapeles. Mantiene radio, ángulo, dirección, color y patrón, asigna ID nuevo y desplaza el ancla una celda de mundo en X e Y; no cambia la cámara. Si el desplazamiento excede límites válidos, se informa y no se crea una copia inválida. Solo se copia una figura confirmada y desbloqueada; el resultado queda desbloqueado. Cada clic intencional es una copia, un reintento del mismo comando no lo es.

En servicio, el servidor valida origen, autoría, revisión y bloqueo y deriva la autoría de la nueva figura de la admisión actual. Copia y original son independientes. El nuevo objeto consume las mismas cuotas que una creación y no hereda referencias mutables, revisiones ni identidad del original. La copia DM es una edición persistente de escena; la copia del jugador sigue siendo efímera.

## Datos, transporte y compatibilidad

Campos opcionales implementados para círculos/conos: `color?: string`, `locked?: boolean` y `areaPattern?: "checkerboard"`; `emoji` conserva la selección del catálogo. Los schemas de escena y anotaciones validan estos campos. Ausencia de color usa el color histórico del tipo; ausencia de bloqueo equivale a `false`.

Las escenas antiguas sin `areaPattern` conservan su apariencia existente y sus emojis, incluidos valores múltiples históricos reconocidos, hasta elegir otro patrón. Al elegirlo se guarda una sola opción y `areaPattern: "checkerboard"`; «Sin patrón» elimina el emoji. Copiar no transforma silenciosamente un estilo heredado. Nuevas áreas sin selección de patrón nacen con relleno sólido y desbloqueadas.

- Guardar/cargar, autosave, biblioteca y exportación/importación conservan los campos de figuras DM. No persistir selecciones, paneles ni texturas. Se mantienen `.ttrpgscene` v2 y lectura v1 mediante extensión opcional compatible con archivos existentes; verificar round-trip y todos los sanitizadores. Lectores antiguos pueden perder campos nuevos al volver a guardar: documentar esta limitación, sin prometer round-trip en versiones antiguas.
- Los dibujos de jugadores permanecen fuera de `scene.shapes`, DB, exportaciones e historial DM. El estado confirmado, bootstrap y actualizaciones incluyen estilo/bloqueo mediante una extensión negociada; la proyección pública de figuras DM también debe conservar esos campos.
- Los schemas actuales de anotaciones son estrictos (`version: 1`). Se implementa la capacidad `areaToolsVersion=1` independiente de `annotationsVersion` y `focusVersion`, con adaptación explícita de mensajes. No añadir claves silenciosamente a clientes v1. Clientes antiguos reciben geometría/emoji compatibles; todas sus mutaciones quedan sometidas al bloqueo en servidor aunque no sepan representarlo. Eliminar campos al proyectar a un cliente antiguo nunca significa eliminarlos del estado canónico al recibir su actualización.
- Cliente nuevo contra servidor sin capacidad: mantiene el dibujo base y comunica que color/bloqueo/copia contextual compartida requieren actualizar el servicio. No simula persistencia local de operaciones rechazadas. La geometría histórica sigue con sus permisos existentes.
- Cada mutación compartida valida partida, apertura, contexto, propiedad, revisión, estado de bloqueo y límites. La copia usa identidad de solicitud estable ante reintentos y revisión del origen. La carrera copiar/bloquear/borrar se resuelve sobre estado autoritativo: conflicto visible y resincronización, nunca una operación obsoleta que resucite objetos o quite el candado.
- No se necesitan tablas nuevas por defecto: las figuras de escena ya viajan en documentos y las anotaciones son runtime. Verificar conservación del documento en SQLite y PostgreSQL, sin resetear bases ni introducir migraciones sin necesidad constatada.

## Criterios de aceptación

| ID | Condición observable | Verificación prevista |
| --- | --- | --- |
| CA-01 | Selección/clic derecho en círculo o cono abre una única barra; vacío abre menú general; líneas/caminos/rectángulos siguen iguales | UI DM/jugador, selección y clic derecho |
| CA-02 | Color válido cambia contorno/relleno; inválido o cancelado conserva el confirmado; restablecer recupera color histórico | Dominio, schema, selector y round-trip |
| CA-03 | Patrón presenta exactamente el catálogo compartido y Sin patrón; selección única, visible y operable con teclado | Comparación con constante y pruebas de foco |
| CA-04 | Damero y emojis regulares quedan recortados al círculo/cono; pequeñas áreas, bordes y etiquetas legibles | Render real en mapa claro/oscuro, grilla cuadrada/hexagonal y oculta |
| CA-05 | Distribución en mundo estable al mover/rotar y con zoom/pan/brújula independientes; no cambia medida ni cobertura | Geometría pura y dos vistas con cámaras distintas |
| CA-06 | Bloqueo impide toda edición, eliminación y copia desde cada entrada; permanece seleccionable y puede desbloquearse por su propietario | Dominio, UI, inspector, atajos y solicitudes directas |
| CA-07 | Limpiar propios conserva bloqueados; DM retira bloqueados con confirmación; expulsión/cierre/contexto limpian normalmente | Runtime, moderación y recorrido DM/jugador |
| CA-08 | Copia tiene ID nuevo, desplazamiento de una celda por eje, mismo estilo/geometría y autor correcto; cuotas y reintentos no duplican | Unitarias, HTTP/SSE y dos pestañas del mismo autor |
| CA-09 | Bloquear durante edición/copia y comandos tardíos produce conflicto coherente; no resucita ni desbloquea figuras | Carreras controladas, revisiones y reconexión |
| CA-10 | DM y dos jugadores ven color/patrón/candado confirmados y autor; no hay edición ajena ni contaminación de escena | Servicio autenticado real, bootstrap y snapshots persistibles |
| CA-11 | Escenas v1/v2 previas mantienen geometría/estilo; nuevos campos sobreviven guardado/exportación y repositorios; dibujos invitados no se persisten | Fixtures y contratos SQLite/PostgreSQL aislados |
| CA-12 | Clientes mixtos mantienen mesa base y rechazo autoritativo de edición bloqueada; negociación no rompe dibujos ni foco | Matriz de versiones y schemas estrictos |
| CA-13 | Barra/paleta no tapan navegación ni quedan fuera del mapa a 390 px; Escape y Delete respetan formularios; candado no depende solo de color | Recorrido teclado, escritorio, móvil y proyección |
| CA-14 | Render acotado en áreas enormes y muchas figuras; cambio de mapa/desmontaje libera recursos; paridad entre clientes | Presupuestos/caché, medición de render y humo Electron local/servicio + navegador |

## Decisiones y entrega

Solicitado: círculos/conos, menú contextual, color, patrones con emojis existentes, bloqueo y copia. La orden «implementa» autorizó construir este alcance, incluidas las reglas de bloqueo de estilo/copia, excepción de moderación, desplazamiento de copia y conservación visual de escenas heredadas.

Las capturas no cambian los permisos del servicio ni autorizan ocultar dibujos a otros jugadores. No se añade un catálogo de plugins nuevo. [Plan técnico](plan.md). La evidencia ejecutada y sus límites están en [validacion.md](validacion.md). La orden «ok, cierra a main y construye» autorizó commit, integración y construcción del DMG. Implementación `a09ea69`, merge `62c351a`. No se inició un ciclo factory ni se solicitó push en este cierre.
