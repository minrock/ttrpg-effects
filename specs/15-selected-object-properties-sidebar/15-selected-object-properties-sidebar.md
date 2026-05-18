# Spec 15 - Propiedades del Objeto Seleccionado en Sidebar

## Objetivo

Mover las propiedades del objeto seleccionado desde la franja superior horizontal hacia el panel lateral derecho, usando un accordion contextual que aparece solo mientras hay un objeto seleccionado.

## Contexto

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

## Alcance

- Mover las propiedades del objeto seleccionado al sidebar derecho.
- Mostrar un accordion contextual arriba de todos los accordions existentes.
- El accordion debe usar como título el tipo de objeto seleccionado.
- El contenido del accordion debe contener las mismas propiedades que hoy aparecen en la barra superior.
- Abrir automáticamente el sidebar si estaba cerrado cuando se selecciona un objeto.
- Ocultar el accordion contextual cuando no haya objeto seleccionado.
- Eliminar la franja superior de propiedades para recuperar espacio vertical del mapa.
- Mantener la edición de propiedades funcionando igual que antes.

## Fuera de alcance

- Cambiar el modelo de datos de luces, fuego o formas.
- Rediseñar todos los controles del sidebar.
- Cambiar la lógica de selección del canvas.
- Agregar múltiples selecciones.
- Crear tabs o paneles flotantes.
- Cambiar el menú contextual de click derecho.

## Modelo de interacción

### Al seleccionar un objeto

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

### Al cambiar la selección

- El mismo accordion contextual cambia su título y contenido según el nuevo objeto.
- El accordion permanece en la primera posición del sidebar.
- Los valores mostrados deben corresponder al nuevo objeto seleccionado.

### Al deseleccionar

- El accordion contextual desaparece.
- El sidebar no se cierra automáticamente.
- Los accordions normales del sidebar conservan su estado abierto/cerrado.

### Al ocultar manualmente el sidebar

- El usuario puede ocultar el sidebar aunque haya un objeto seleccionado.
- Si luego selecciona otro objeto mientras el sidebar está oculto, debe abrirse automáticamente otra vez.

## Reglas de UI

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

## Estado

El estado de propiedades sigue derivándose del objeto seleccionado actual.

Requisitos:

- No duplicar estado de propiedades.
- No guardar estado UI contextual dentro de la escena.
- El accordion contextual puede tener estado local abierto/cerrado, pero al seleccionar un objeto debe abrirse.
- La visibilidad del sidebar sigue siendo estado UI local.

## Persistencia

- Sin cambios en `.ttrpgscene`.
- Los cambios de propiedades siguen guardándose a través de los modelos existentes.
- No se agregan campos nuevos.

## Render / PixiJS

- Sin cambios esperados en PixiJS.
- El canvas debe ganar el espacio vertical que antes ocupaba la barra de propiedades.

## Criterios de aceptación

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

## Riesgos

- El accordion contextual puede volverse muy alto si contiene muchos controles.
- Al abrir automáticamente el sidebar, puede sorprender si el usuario quería máximo viewport.
- Mover JSX existente puede romper callbacks o controles por tipo.
- Si el estado abierto/cerrado del accordion contextual no se maneja bien, puede quedar cerrado al seleccionar un objeto.

## Notas de implementación

- Reutilizar el componente `SidebarAccordion`.
- Extraer el contenido actual de `properties-panel` a un bloque reutilizable si evita duplicación.
- Eliminar o dejar sin uso la clase `.properties-panel` solo cuando no rompa otros estilos.
- Considerar un id estable para el accordion contextual, por ejemplo `selected-object-properties-panel`.
- La lógica `setIsSidebarVisible(true)` debe ocurrir cuando `interaction.selectedElementId` cambia de `null` a un id válido.
