# Spec 22 - Minis Virtuales y Marcadores Futuros

## Objetivo

Definir e implementar un modulo opcional para tokens, minis virtuales o marcadores sin afectar el flujo principal de minis fisicas.

## Alcance

- Crear tokens desde el menu contextual.
- Cargar imagenes de tokens con el protocolo local seguro de assets, sin `file://` ni `data:`.
- Mover tokens sobre la grilla con snap.
- Renderizar la imagen de cada token como un circulo perfecto, recortando la imagen con comportamiento tipo `object-fit: cover`.
- Mostrar propiedades de tokens seleccionados en el aside lateral derecho, limitadas al color del selector.
- Mostrar en el menu lateral derecho una lista de tokens con imagen circular, cardinalidad por nombre y badge numerico cuando aplique.
- Permitir seleccionar un token desde la lista del menu lateral.
- Permitir mostrar u ocultar cada token desde su fila en la lista lateral.
- Mostrar al final de la lista un boton `Nuevo token` que abre el modal de creacion; la imagen se selecciona dentro del modal.
- Cuando el token se crea desde el menu lateral, ubicarlo en un punto aleatorio dentro del area visible actual del mapa.
- Configurar nombre, tipo, tamano, color de circunferencia de seleccion, badge numerico y orden.
- Guardar tokens en la escena `.ttrpgscene`.

## Tamano de tokens

- Diminuto, Pequeno y Mediano ocupan 1 casilla x 1 casilla.
- Grande ocupa 2 casillas x 2 casillas.
- Enorme ocupa 3 casillas x 3 casillas.
- Gargantuesco ocupa 4 casillas x 4 casillas.

## Seleccion y repetidos

- Cada token puede definir el color de su circunferencia de seleccion.
- Si existe mas de un token con el mismo nombre, los tokens muestran un badge numerico estable como numero pequeno en la esquina, sin encerrarlo en un circulo.
- Los consecutivos solo consideran tokens con el mismo `name`; el campo `type` no define si dos tokens son el mismo.
- El listado lateral debe mostrar la cardinalidad de tokens con el mismo nombre.
- El badge debe usar el color de seleccion del token.
- El badge no es modificable desde las propiedades.
- El campo `type` permanece oculto para el usuario y solo existe como dato interno/persistido.
- El badge, el orden y la visibilidad deben persistirse para que la escena cargue igual despues de guardarla.

## Persistencia

- La escena guarda `tokens`.
- Cada token guarda `id`, `name`, `type`, `imagePath`, `position`, `size`, `footprintCells`, `selectionColor`, `badgeNumber`, `order` y `visible`.
- Al cargar una escena se resuelven las rutas locales de imagen a URLs del protocolo local antes de renderizar.
- Las escenas antiguas sin `tokens` siguen siendo validas y cargan con `tokens: []`.

## Fuera del MVP

- Combate automatizado.
- Hojas de personaje.
- Iniciativa.
- Sincronizacion online.
- Automatizacion completa de reglas.
- Asociacion automatica de tokens a luces o vision.
- Vista separada de jugador/DM.

## Principios

- Las minis fisicas siguen siendo el caso principal.
- Los tokens no deben ser requeridos para usar luces o herramientas.
- Los tokens deben ser una capa opcional.
- El usuario debe poder ignorar completamente este modulo.

## Criterios de aceptacion

- El usuario puede crear un token con imagen cargada por protocolo seguro.
- El token se renderiza sobre la grilla con el tamano correcto.
- La imagen del token se ve circular, sin esquinas visibles ni deformacion ovalada.
- El token puede moverse con snap-to-grid.
- Al seleccionar el token, sus propiedades aparecen en el aside derecho y solo permiten cambiar el color del selector.
- El menu lateral de tokens lista cada token con su imagen, nombre, tamano, cardinalidad por nombre y badge si hay repetidos.
- Al hacer click en un token de la lista se selecciona en el mapa.
- Cada fila del listado permite mostrar u ocultar el token.
- El boton `Nuevo token` del panel lateral abre el modal de creacion y agrega el token dentro del viewport visible.
- El color de seleccion puede editarse.
- Al crear mas de un token con el mismo nombre, aparece un badge numerico.
- El token se guarda y carga con la escena, incluyendo su orden.

## Riesgos

- Convertir la app en un VTT completo antes de resolver la mesa fisica.
- Agregar complejidad visual innecesaria sobre la proyeccion.
- Confundir tokens virtuales con minis reales durante una sesion.
- Repetir problemas de carga de imagen si se salta el protocolo local seguro.
