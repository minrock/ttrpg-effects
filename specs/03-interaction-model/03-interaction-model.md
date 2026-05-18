# Spec 03 - Modelo de Interaccion

## Objetivo

Definir los controles base para navegar, calibrar, seleccionar, borrar y agregar elementos durante una sesion de juego.

## Alcance

- Click derecho para menu contextual.
- Pan del mapa.
- Zoom controlado y bloqueable.
- Seleccion de elementos.
- Borrado por boton y teclado.
- Estados de herramienta activa.

## Controles propuestos

- Click derecho: abrir menu contextual en la posicion del mapa.
- Click izquierdo: seleccionar o interactuar con la herramienta activa.
- Arrastrar con herramienta de pan: mover camara.
- Rueda del mouse: zoom solo cuando el zoom/escala no este bloqueado.
- Delete o Backspace: borrar elemento seleccionado.
- Escape: cancelar herramienta activa o cerrar menu contextual.

Controles alternativos a evaluar:

- Space + arrastrar para pan.
- Boton medio para pan.
- Atajos numericos para herramientas frecuentes.

## Bloqueo de zoom/escala

El bloqueo del mapa protege la calibracion fisica de la grilla.

Cuando esta bloqueado:

- No debe cambiar el zoom/escala del mapa calibrado.
- El usuario debe poder seguir navegando si la navegacion no altera el tamano fisico proyectado.
- Las herramientas tacticas deben seguir funcionando.
- La UI debe indicar claramente que la escala esta bloqueada.

## Menu contextual

El menu contextual debe permitir crear:

- Medicion.
- Circulo/esfera 2D.
- Cono.
- Rectangulo/cubo.
- Luz puntual.
- Luz conica.
- Fuego animado.

## Criterios de aceptacion

- El click derecho abre un menu en la posicion correcta.
- El usuario puede seleccionar un elemento creado.
- El usuario puede borrar el elemento seleccionado con boton visible.
- El usuario puede borrar el elemento seleccionado con Delete o Backspace.
- El zoom no cambia cuando la escala esta bloqueada.
- La app no confunde navegacion con calibracion de grilla.

## Riesgos

- Hacer que el zoom de camara y la escala calibrada sean la misma cosa sin control claro.
- Crear demasiados atajos antes de validar uso real.
- Menus que tapen demasiado la proyeccion.

## Notas de implementacion

- Separar estado de herramienta activa de estado de seleccion.
- Mantener una maquina de estados simple para interacciones.
- Evitar acciones destructivas sin seleccion clara.

