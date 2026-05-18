# Spec 06 - Iluminacion, Oscuridad y Fuego Animado

## Objetivo

Implementar una capa de oscuridad global, fuentes de luz que aclaren o revelen el mapa, linternas/conos de vision y fuego animado superpuesto.

## Alcance

- Capa global de oscuridad configurable.
- Luz puntual.
- Luz conica.
- Fuego animado.
- Configuracion de radio/longitud, color, intensidad y opacidad.
- Movimiento, seleccion, ocultado y borrado de efectos.
- Guardado y carga de efectos en la sesion.

## Capa de oscuridad

- Debe cubrir el mapa o el area de mundo visible.
- Debe tener opacidad configurable.
- Debe poder activarse/desactivarse.
- Las luces deben revelar visualmente el mapa debajo de esta capa, no solo dibujar una mancha clara encima.
- El revelado debe mantenerse claro aunque la opacidad de oscuridad global este alta.

## Luces

Tipos iniciales:

- Luz puntual, como antorcha.
- Luz conica, como linterna o vision dirigida.

Propiedades:

- Posicion.
- Radio.
- Color.
- Intensidad.
- Opacidad.
- Direccion, para luces conicas.
- Snap-to-grid opcional.

Reglas especificas:

- La luz conica siempre usa angulo fijo de 60 grados.
- La luz conica se configura por longitud en cuadros de grilla, por ejemplo 1 cuadro, 2 cuadros, 5 cuadros.
- La UI debe mostrar la equivalencia de esa longitud en distancia de juego segun la escala actual, por ejemplo 5 ft, 10 ft, 25 ft.
- La orientacion de la luz conica se ajusta desde el canvas mediante un aro/manija alrededor del origen de la luz.
- Arrastrar el centro/origen de la luz conica mueve la luz.
- Arrastrar el aro/manija de orientacion cambia la direccion sin cambiar la posicion.
- La luz puntual revela un area circular del mapa debajo de la oscuridad.
- La luz conica revela un sector conico del mapa debajo de la oscuridad.
- El motor visual puede usar blend modes para perforar la oscuridad, pero debe tener un resultado claro en Electron: una estrategia aceptada es renderizar una copia del mapa encima del overlay y enmascararla con la geometria de cada luz.

## Fuego animado

El fuego debe ser un efecto visual animado superpuesto al mapa.

Requerimientos:

- Usar sprite sheet, secuencia transparente o GIF animado transparente.
- Poder colocarse con click derecho.
- Poder moverse, seleccionar y borrar.
- Poder ajustar escala/opacidad.
- Idealmente emitir o asociarse a una luz calida.

Decision posterior:

- Spec 09 reemplaza el fuego procedural por `assets/effects/fire.gif`.
- El render debe preservar la transparencia del GIF para evitar fondos cuadrados u opacos.
- El fuego puede ser circular cerrado, circular abierto tipo aro o zona dibujada a mano alzada.

Fuente de asset:

- Preferir asset CC0 o generado para el proyecto.
- Candidato inicial: OpenGameArt "Animated flame / Fire sprite Sheet", CC0.
- Si se usa asset externo no CC0, guardar licencia y atribucion.

## Criterios de aceptacion

- La capa de oscuridad se ve sobre el mapa.
- Una luz puntual aclara visualmente una zona.
- Una luz conica aclara visualmente una zona direccional.
- La luz puntual y la luz conica dejan ver el mapa claramente dentro de su geometria aunque la oscuridad global este alta.
- La luz conica mantiene 60 grados de apertura, permite cambiar longitud en cuadros y permite orientar desde el aro/manija en el canvas.
- El fuego animado se reproduce sobre el mapa.
- El fuego puede seleccionarse y borrarse.
- Las luces y fuego se guardan y cargan con la escena.

## Riesgos

- Blend modes inconsistentes entre plataformas.
- Efectos demasiado costosos para imagenes grandes.
- Fuego visualmente llamativo pero poco integrado con la iluminacion.

## Notas de implementacion

- PixiJS deberia facilitar mascaras, sprites y blend modes.
- La primera version no requiere sombras por paredes.
- Preparar el modelo de datos para futura interaccion con paredes y niebla de guerra.
