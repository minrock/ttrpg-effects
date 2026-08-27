# Spec - Sidebar y Propiedades

Este documento describe de forma unificada la funcionalidad de sidebar y propiedades, consolidando el alcance funcional vigente en el proyecto.

## Menú Lateral Derecho de Controles

**Estado:** Cerrada / Implementada

### Objetivo

Reemplazar la barra horizontal de controles de grilla, figuras, oscuridad y niebla por un menú lateral derecho organizado en secciones tipo accordion. La nueva UI debe ser más legible durante una sesión, ocupar menos ancho superior del mapa y agrupar acciones por intención.

### Contexto

Actualmente los controles aparecen en una barra horizontal sobre el canvas. En pantallas anchas funciona, pero la densidad es alta: grilla, opacidad, celda, unidad, snap, diagonal, preset, oscuridad, niebla, color y reveal compiten en una sola línea.

La nueva experiencia debe mover esos controles a un panel lateral derecho con submenús colapsables. La intención es que el mapa tenga más aire visual y que cada grupo de acciones sea más fácil de encontrar.

### Alcance

- Crear un panel lateral fijo a la derecha del viewport.
- Mover la barra horizontal de controles actuales a ese panel lateral.
- Agrupar controles en secciones accordion.
- Permitir abrir y cerrar cada sección de forma independiente.
- Usar icono + título grande para cada sección.
- El título de cada sección debe usar una fuente claramente mayor que los valores internos, aproximadamente `1.5rem` a `2rem`.
- Los valores internos, labels, inputs y selects deben mantenerse más pequeños y compactos que el título.
- Mantener funcionales los controles existentes sin cambiar su lógica de dominio.
- Mantener la UI discreta: el panel no debe bloquear innecesariamente el mapa durante una sesión.
- Adaptar el layout para que el canvas siga ocupando el área disponible restante.
- Permitir ocultar/mostrar el panel lateral completo para ampliar el viewport del mapa.

### Agrupación requerida

#### Grilla

Sección para controles directamente relacionados con la grilla visual:

- Activar/desactivar grilla.
- Opacidad de grilla.
- Ajustar mapa.
- Ajustar escala visual del mapa en porcentaje (`Escala mapa`) cuando hay mapa cargado.
- Switch `Ajustar grilla`.
- Tamaño de celda, visible solo cuando `Ajustar grilla` esta activo.
- Unidad.
- Preset de escala.

Icono sugerido: grilla/cuadrícula.

#### Figuras

Sección para controles que afectan herramientas de medición y formas tácticas:

- Snap.
- Diagonal.
- Valor por casilla.
- Cualquier control existente que afecte creación o cálculo de figuras/mediciones.

Nota: si `valor por casilla` ya está representado internamente por `distancePerCell` y/o `metricDistancePerCell`, debe exponerse aquí con el texto de UI más claro posible.

Icono sugerido: formas geométricas o regla.

#### Oscuridad

Sección para controles de oscuridad ambiental:

- Activar/desactivar oscuridad.
- Overlay/opacidad de oscuridad.

Icono sugerido: luna, sombra o círculo oscuro.

#### Niebla

Sección para controles de fog of war:

- Activar/desactivar niebla.
- Activar/salir de `Modo niebla`.
- Opacidad de fog.
- Color de niebla.
- Radio de reveal.
- Reset de niebla.

Icono sugerido: nube, ojo cubierto o niebla.

### Modelo de interacción

- Cada sección del panel lateral es un accordion.
- Las secciones pueden iniciar cerradas para reducir ruido visual.
- El usuario puede abrir una o varias secciones a la vez.
- Abrir una sección no debe cerrar automáticamente las demás, salvo que se decida explícitamente en el plan por limitaciones de espacio.
- Cada header de accordion debe ser clickeable y tener:
  - icono,
  - título,
  - indicador visual de abierto/cerrado.
- El estado abierto/cerrado puede ser local de UI; no necesita persistirse en `.ttrpgscene`.
- La visibilidad global del panel puede ser local de UI; no necesita persistirse en `.ttrpgscene`.
- Debe existir un control visible para ocultar o mostrar el panel lateral completo.
- Al ocultar el panel, el viewport del mapa debe expandirse para ocupar el espacio liberado.
- Los controles internos deben conservar los mismos handlers y efectos que hoy tienen en la barra horizontal.
- `Escala mapa` debe cambiar `scene.map.scale`, no `camera.zoom`, y debe tener una accion para volver a 100%.
- El panel no debe interferir con click derecho, selección, pan, zoom, pintado de fuego, niebla o herramientas tácticas sobre el canvas.

### Layout y estilo

- El panel vive al lado derecho de la app, debajo de la toolbar principal si la toolbar superior sigue existiendo.
- El panel debe tener ancho estable y suficiente para inputs/selects sin truncarlos.
- El canvas debe recalcularse para ocupar el área restante.
- El panel puede ser scrollable verticalmente si el contenido supera la altura disponible.
- Cuando el panel esté oculto, debe quedar un botón discreto para volver a mostrarlo.
- El diseño debe evitar cards anidadas; cada sección del accordion puede ser un bloque simple con borde/separador.
- El contraste debe seguir el tema oscuro actual.
- Los iconos deben sentirse consistentes con la app y con el resto de controles.
- Si el proyecto ya tiene icon library disponible, usarla; si no, se puede resolver con símbolos/componentes simples sin introducir dependencia pesada.
- El texto interno no debe solaparse ni salirse de sus controles.

### Fuera de alcance

- Cambiar reglas de grilla, medición, oscuridad, niebla o visión.
- Cambiar el comportamiento de `Pintar fuego`, luces o formas, salvo retirar acciones redundantes de la toolbar superior.
- Persistir el estado abierto/cerrado de accordions o la visibilidad del panel en archivo de escena.
- Crear navegación global o paneles de herramientas adicionales fuera de los grupos descritos.
- Rediseñar la toolbar principal de carga/guardado/mapa, salvo ajustes mínimos de layout necesarios.
- Cambiar atajos de teclado.

### Persistencia

No se agregan campos a `.ttrpgscene`.

La spec es de presentación e interacción de UI. Los valores editados por el panel siguen actualizando el mismo estado de escena existente:

- `grid`
- `settings`
- `darkness`
- `fogOfWar`

### Accesibilidad y UX

- Cada header de accordion debe ser un botón real o equivalente accesible.
- Usar `aria-expanded` en headers de accordion.
- Los grupos deben tener labels accesibles.
- Los controles deben seguir siendo navegables por teclado.
- El tamaño visual del título debe mejorar escaneo sin hacer que los inputs internos parezcan secundarios ilegibles.
- Los controles frecuentes deben mantener feedback claro de estado activo/inactivo.

### Criterios de aceptación

- La barra horizontal de controles ya no aparece como una sola línea sobre el mapa.
- Existe un panel lateral derecho con secciones accordion.
- Las secciones mínimas son: Grilla, Figuras, Oscuridad y Niebla.
- Cada sección tiene icono, título grande e indicador de abierto/cerrado.
- Los headers usan una fuente aproximadamente entre `1.5rem` y `2rem`.
- Los valores internos son visualmente más pequeños que los headers.
- La sección Grilla contiene los controles de grilla actuales.
- La sección Grilla contiene `Ajustar mapa`.
- La sección Grilla contiene `Escala mapa` con slider, input porcentual y reset a 100% cuando hay mapa cargado.
- La sección Grilla permite activar `Ajustar grilla` con switch, no checkbox.
- El tamaño de celda se oculta mientras `Ajustar grilla` esta inactivo.
- La sección Figuras contiene Snap, Diagonal y Valor por casilla.
- La sección Oscuridad contiene toggle y overlay de oscuridad.
- La sección Niebla contiene toggle, opacidad/fog, color, reveal y reset.
- La sección Niebla contiene `Modo niebla`.
- Los controles siguen modificando el estado de escena igual que antes.
- El canvas no queda cubierto por el panel; se ajusta al área disponible.
- El usuario puede ocultar el panel lateral para ampliar el viewport del mapa.
- El usuario puede volver a mostrar el panel lateral desde un control visible.
- No se agregan cambios de persistencia innecesarios.
- No se agregan accesos directos del renderer a Node.js, Electron internals o filesystem.

### Decisiones para implementación

- El panel lateral queda visible por defecto y puede ocultarse/mostrarse desde un control global.
- Varias secciones pueden permanecer abiertas simultáneamente.
- `Valor por casilla` edita `distancePerCell` cuando la unidad activa es `ft` y `metricDistancePerCell` cuando la unidad activa es `m`.

### Cierre

- Implementada en el renderer con panel lateral derecho, accordions y colapso global del sidebar.
- No introduce cambios de persistencia ni APIs nuevas.
- La validación automática quedó registrada en el plan de implementación.

## Propiedades del Objeto Seleccionado en Sidebar

### Objetivo

Mover las propiedades del objeto seleccionado desde la franja superior horizontal hacia el panel lateral derecho, usando un accordion contextual que aparece solo mientras hay un objeto seleccionado.

### Contexto

Actualmente, cuando se selecciona una luz, fuego o forma táctica, sus propiedades aparecen en una barra horizontal superior debajo del estado de escena. Esto reduce el espacio vertical del mapa y separa controles contextuales del resto de herramientas que ya viven en el sidebar derecho.

La app ya tiene:

- Sidebar lateral derecho con accordions para grilla, figuras, oscuridad y niebla.
- Botón para ocultar/mostrar el sidebar.
- Propiedades contextuales para:
  - luz puntual,
  - luz cónica,
  - fuego,
  - línea/medición,
  - círculo,
  - cono,
  - rectángulo.
- Selección y deselección de objetos desde el canvas.

### Alcance

- Mover las propiedades del objeto seleccionado al sidebar derecho.
- Mostrar un accordion contextual arriba de todos los accordions existentes.
- El accordion debe usar como título el tipo de objeto seleccionado.
- El contenido del accordion debe contener las mismas propiedades que hoy aparecen en la barra superior.
- Abrir automáticamente el sidebar si estaba cerrado cuando se selecciona un objeto.
- Ocultar el accordion contextual cuando no haya objeto seleccionado.
- Eliminar la franja superior de propiedades para recuperar espacio vertical del mapa.
- Mantener la edición de propiedades funcionando igual que antes.

### Fuera de alcance

- Cambiar el modelo de datos de luces, fuego o formas.
- Rediseñar todos los controles del sidebar.
- Cambiar la lógica de selección del canvas.
- Agregar múltiples selecciones.
- Crear tabs o paneles flotantes.
- Cambiar el menú contextual de click derecho.

### Modelo de interacción

#### Al seleccionar un objeto

- Si el sidebar derecho está visible:
  - aparece un accordion arriba de todos los demás.
  - el accordion se muestra abierto por defecto.
- Si el sidebar derecho está oculto:
  - el sidebar se abre automáticamente.
  - aparece el accordion contextual abierto arriba de todos.
- El título del accordion indica el tipo de objeto seleccionado, por ejemplo:
  - `Luz puntual`,
  - `Luz cónica`,
  - `Fuego`,
  - `Línea`,
  - `Círculo`,
  - `Cono`,
  - `Rectángulo`.

#### Al cambiar la selección

- El mismo accordion contextual cambia su título y contenido según el nuevo objeto.
- El accordion permanece en la primera posición del sidebar.
- Los valores mostrados deben corresponder al nuevo objeto seleccionado.

#### Al deseleccionar

- El accordion contextual desaparece.
- El sidebar no se cierra automáticamente.
- Los accordions normales del sidebar conservan su estado abierto/cerrado.

#### Al ocultar manualmente el sidebar

- El usuario puede ocultar el sidebar aunque haya un objeto seleccionado.
- Si luego selecciona otro objeto mientras el sidebar está oculto, debe abrirse automáticamente otra vez.

### Reglas de UI

- El accordion contextual debe estar arriba de:
  - Grilla,
  - Figuras,
  - Oscuridad,
  - Niebla.
- Debe tener un icono representativo según el tipo si ya existe un patrón simple:
  - luz: símbolo de luz o punto,
  - fuego: fuego,
  - formas: símbolo geométrico.
- No debe ocupar una franja horizontal del viewport.
- Los controles internos deben mantener la misma funcionalidad:
  - toggles,
  - inputs numéricos,
  - sliders,
  - color picker,
  - select de emoji,
  - controles específicos por tipo.
- El contenido debe ser escaneable en columna y no desbordarse horizontalmente.

### Estado

El estado de propiedades sigue derivándose del objeto seleccionado actual.

Requisitos:

- No duplicar estado de propiedades.
- No guardar estado UI contextual dentro de la escena.
- El accordion contextual puede tener estado local abierto/cerrado, pero al seleccionar un objeto debe abrirse.
- La visibilidad del sidebar sigue siendo estado UI local.

### Persistencia

- Sin cambios en `.ttrpgscene`.
- Los cambios de propiedades siguen guardándose a través de los modelos existentes.
- No se agregan campos nuevos.

### Render / PixiJS

- Sin cambios esperados en PixiJS.
- El canvas debe ganar el espacio vertical que antes ocupaba la barra de propiedades.

### Criterios de aceptación

- Al seleccionar una luz puntual, sus propiedades aparecen en el accordion contextual del sidebar.
- Al seleccionar una luz cónica, sus propiedades aparecen en el accordion contextual del sidebar.
- Al seleccionar fuego, sus propiedades aparecen en el accordion contextual del sidebar.
- Al seleccionar una línea, círculo, cono o rectángulo, sus propiedades aparecen en el accordion contextual del sidebar.
- El accordion contextual aparece arriba de los demás accordions.
- Si el sidebar estaba cerrado, seleccionar un objeto lo abre automáticamente.
- Al deseleccionar, el accordion contextual desaparece.
- La antigua barra superior de propiedades deja de renderizarse.
- El mapa recupera el espacio vertical de esa barra.
- Todas las propiedades editables siguen modificando el objeto seleccionado correctamente.
- No hay cambios de schema ni persistencia.
- No se agregan accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.

### Riesgos

- El accordion contextual puede volverse muy alto si contiene muchos controles.
- Al abrir automáticamente el sidebar, puede sorprender si el usuario quería máximo viewport.
- Mover JSX existente puede romper callbacks o controles por tipo.
- Si el estado abierto/cerrado del accordion contextual no se maneja bien, puede quedar cerrado al seleccionar un objeto.

### Notas de implementación

- Reutilizar el componente `SidebarAccordion`.
- Extraer el contenido actual de `properties-panel` a un bloque reutilizable si evita duplicación.
- Eliminar o dejar sin uso la clase `.properties-panel` solo cuando no rompa otros estilos.
- Considerar un id estable para el accordion contextual, por ejemplo `selected-object-properties-panel`.
- La lógica `setIsSidebarVisible(true)` debe ocurrir cuando `interaction.selectedElementId` cambia de `null` a un id válido.
## Accordion de anotaciones

- El sidebar derecho incluye `Anotaciones` con visibilidad global local y acciones de creacion.
- El panel lateral izquierdo incluye el arbol de anotaciones con buscador, grupos por tipo, seleccion, edicion, bloqueo, `Ir a` y accion de highlight para areas.
- Al seleccionar un pin o area se abre el sidebar y aparecen sus acciones contextuales.
- Ocultar la capa no elimina datos ni oculta el arbol izquierdo.
