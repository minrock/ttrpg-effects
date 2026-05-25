# Spec 19 - Leyenda de Navegacion

## Objetivo

Mostrar una leyenda pill fija en la parte inferior central del viewport del mapa con los atajos de navegacion esenciales: panning con boton central del mouse o Space + click izquierdo, y zoom con la rueda del mouse.

## Contexto

La app no tiene ningun indicador visual de los controles de navegacion. Los usuarios nuevos no saben como moverse por el mapa ni hacer zoom. Una leyenda discreta y permanente en el viewport resuelve esto sin interferir con las herramientas ni el canvas.

## Alcance

- Renderizar un pill fijo en la parte inferior central del viewport del mapa.
- El pill muestra tres grupos de atajo separados por divisores visuales:
  - **Menu**: icono de mouse con boton derecho resaltado.
  - **Panning**: badge de tecla `Space`, signo `+`, icono de mouse con boton izquierdo resaltado.
  - **Zoom**: icono de mouse con rueda resaltada.
- El pill es puramente informativo; no tiene interaccion.
- El pill se renderiza sobre el canvas del mapa, por encima de cualquier contenido.
- El pill no se mueve ni desaparece al hacer pan, zoom o al cambiar de herramienta.

## Fuera de alcance

- Ocultar o mostrar la leyenda con un boton de toggle.
- Animaciones de entrada o salida.
- Atajos adicionales (no agregar atajos de otras herramientas en esta leyenda).
- Legenda en otras posiciones que no sea el centro inferior.
- Version movil o adaptaciones de tamano responsivo.

## Visual

- Forma: pill (rectangulo con bordes completamente redondeados).
- Posicion: centrado horizontalmente, anclado al borde inferior del viewport con un margen interno.
- Fondo: oscuro semitransparente, consistente con el estilo oscuro/dorado de la app.
- Texto: claro, tipografia de la app.
- Badge de tecla (`Space`): rectangulo redondeado con borde, similar al estilo de un keycap.
- Iconos de mouse: representacion minimalista con el boton o zona relevante visualmente destacada.
- Divisor: separador vertical sutil entre el grupo Panning y el grupo Zoom.
- Sin emojis.

## Estructura de contenido

```
[ Menu  [mouse-right]  |  [Space] + [mouse-left]  |  Zoom  [mouse-scroll] ]
```

Cada icono de mouse muestra:
- `mouse-right`: boton derecho iluminado.
- `mouse-left`: boton izquierdo iluminado.
- `mouse-scroll`: rueda de scroll iluminada.

## Implementacion

- El pill se implementa como un componente React posicionado con `position: absolute` sobre el contenedor del `MapViewport`.
- No requiere cambios en PixiJS ni en el canvas.
- No requiere cambios en el estado de la app, IPC, preload, main ni filesystem.
- Los iconos de mouse se implementan con SVG inline o con un componente SVG reutilizable.

## Criterios de aceptacion

- El pill aparece centrado en la parte inferior del viewport del mapa en todo momento.
- El pill muestra el atajo de menu contextual con click derecho.
- El pill muestra el atajo de panning con Space + click izquierdo.
- El pill muestra el atajo de zoom con la rueda del mouse.
- El pill no reacciona a clicks ni interacciones del usuario.
- El pill no desaparece ni se mueve al hacer pan o zoom sobre el mapa.
- El pill no interfiere con el menu contextual ni con ningun otro control.
- El estilo es consistente con el resto de la UI (fondo oscuro, texto claro).
