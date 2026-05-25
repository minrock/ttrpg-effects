# Spec - Navegacion e Interaccion

Este documento describe de forma unificada la funcionalidad de navegacion e interaccion, consolidando el alcance funcional vigente en el proyecto.

## Modelo de Interaccion

### Objetivo

Definir los controles base para navegar, calibrar, seleccionar, borrar y agregar elementos durante una sesion de juego.

### Alcance

- Click derecho para menu contextual.
- Pan del mapa.
- Zoom controlado y bloqueable.
- Seleccion de elementos.
- Borrado por boton y teclado.
- Estados de herramienta activa.

### Controles propuestos

- Click derecho: abrir menu contextual en la posicion del mapa.
- Click izquierdo: seleccionar o interactuar con la herramienta activa.
- Arrastrar con herramienta de pan: mover camara.
- Rueda del mouse: zoom solo cuando el zoom/escala no este bloqueado.
- Menu contextual: alternar bloqueo/desbloqueo de zoom sin volver a la toolbar.
- Delete o Backspace: borrar elemento seleccionado.
- Escape: cancelar herramienta activa o cerrar menu contextual.

Controles alternativos a evaluar:

- Space + arrastrar para pan.
- Boton medio para pan.
- Atajos numericos para herramientas frecuentes.

### Bloqueo de zoom/escala

El bloqueo del mapa protege la calibracion fisica de la grilla.

Cuando esta bloqueado:

- No debe cambiar el zoom/escala del mapa calibrado.
- El usuario debe poder seguir navegando si la navegacion no altera el tamano fisico proyectado.
- Las herramientas tacticas deben seguir funcionando.
- La UI debe indicar claramente que la escala esta bloqueada.

### Menu contextual

El menu contextual debe permitir crear:

- Alternar bloqueo/desbloqueo de zoom.
- Medicion.
- Circulo/esfera 2D.
- Cono.
- Rectangulo/cubo.
- Luz puntual.
- Luz conica.
- Fuego animado.

### Criterios de aceptacion

- El click derecho abre un menu en la posicion correcta.
- El usuario puede seleccionar un elemento creado.
- El usuario puede borrar el elemento seleccionado con boton visible.
- El usuario puede borrar el elemento seleccionado con Delete o Backspace.
- El zoom no cambia cuando la escala esta bloqueada.
- El usuario puede bloquear o desbloquear zoom desde el menu contextual.
- La app no confunde navegacion con calibracion de grilla.

### Riesgos

- Hacer que el zoom de camara y la escala calibrada sean la misma cosa sin control claro.
- Crear demasiados atajos antes de validar uso real.
- Menus que tapen demasiado la proyeccion.

### Notas de implementacion

- Separar estado de herramienta activa de estado de seleccion.
- Mantener una maquina de estados simple para interacciones.
- Evitar acciones destructivas sin seleccion clara.

## Leyenda de Navegacion

### Objetivo

Mostrar una leyenda pill fija en la parte inferior central del viewport del mapa con los atajos de navegacion esenciales: panning con boton central del mouse o Space + click izquierdo, y zoom con la rueda del mouse.

### Contexto

La app no tiene ningun indicador visual de los controles de navegacion. Los usuarios nuevos no saben como moverse por el mapa ni hacer zoom. Una leyenda discreta y permanente en el viewport resuelve esto sin interferir con las herramientas ni el canvas.

### Alcance

- Renderizar un pill fijo en la parte inferior central del viewport del mapa.
- El pill muestra tres grupos de atajo separados por divisores visuales:
  - **Menu**: icono de mouse con boton derecho resaltado.
  - **Panning**: badge de tecla `Space`, signo `+`, icono de mouse con boton izquierdo resaltado.
  - **Zoom**: icono de mouse con rueda resaltada.
- El pill es puramente informativo; no tiene interaccion.
- El pill se renderiza sobre el canvas del mapa, por encima de cualquier contenido.
- El pill no se mueve ni desaparece al hacer pan, zoom o al cambiar de herramienta.

### Fuera de alcance

- Ocultar o mostrar la leyenda con un boton de toggle.
- Animaciones de entrada o salida.
- Atajos adicionales (no agregar atajos de otras herramientas en esta leyenda).
- Legenda en otras posiciones que no sea el centro inferior.
- Version movil o adaptaciones de tamano responsivo.

### Visual

- Forma: pill (rectangulo con bordes completamente redondeados).
- Posicion: centrado horizontalmente, anclado al borde inferior del viewport con un margen interno.
- Fondo: oscuro semitransparente, consistente con el estilo oscuro/dorado de la app.
- Texto: claro, tipografia de la app.
- Badge de tecla (`Space`): rectangulo redondeado con borde, similar al estilo de un keycap.
- Iconos de mouse: representacion minimalista con el boton o zona relevante visualmente destacada.
- Divisor: separador vertical sutil entre el grupo Panning y el grupo Zoom.
- Sin emojis.

### Estructura de contenido

```
[ Menu  [mouse-right]  |  [Space] + [mouse-left]  |  Zoom  [mouse-scroll] ]
```

Cada icono de mouse muestra:
- `mouse-right`: boton derecho iluminado.
- `mouse-left`: boton izquierdo iluminado.
- `mouse-scroll`: rueda de scroll iluminada.

### Implementacion

- El pill se implementa como un componente React posicionado con `position: absolute` sobre el contenedor del `MapViewport`.
- No requiere cambios en PixiJS ni en el canvas.
- No requiere cambios en el estado de la app, IPC, preload, main ni filesystem.
- Los iconos de mouse se implementan con SVG inline o con un componente SVG reutilizable.

### Criterios de aceptacion

- El pill aparece centrado en la parte inferior del viewport del mapa en todo momento.
- El pill muestra el atajo de menu contextual con click derecho.
- El pill muestra el atajo de panning con Space + click izquierdo.
- El pill muestra el atajo de zoom con la rueda del mouse.
- El pill no reacciona a clicks ni interacciones del usuario.
- El pill no desaparece ni se mueve al hacer pan o zoom sobre el mapa.
- El pill no interfiere con el menu contextual ni con ningun otro control.
- El estilo es consistente con el resto de la UI (fondo oscuro, texto claro).
