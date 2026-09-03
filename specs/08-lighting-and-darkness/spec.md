# Spec - Luces y Oscuridad

Este documento describe de forma unificada la funcionalidad de luces y oscuridad, consolidando el alcance funcional vigente en el proyecto.

## Iluminacion, Oscuridad y Fuego Animado

### Objetivo

Implementar una capa de oscuridad global, fuentes de luz que aclaren o revelen el mapa, linternas/conos de vision y fuego animado superpuesto.

### Alcance

- Capa global de oscuridad configurable.
- Luz puntual.
- Luz conica.
- Fuego animado.
- Configuracion de radio/longitud, color, intensidad y opacidad.
- Movimiento, seleccion, ocultado y borrado de efectos.
- Guardado y carga de efectos en la sesion.

### Capa de oscuridad

- Debe cubrir el mapa o el area de mundo visible.
- Debe tener opacidad configurable.
- Debe poder activarse/desactivarse.
- Las luces deben revelar visualmente el mapa debajo de esta capa, no solo dibujar una mancha clara encima.
- El revelado debe mantenerse claro aunque la opacidad de oscuridad global este alta.
- **La capa de oscuridad solo se renderiza en la ventana del jugador.**  En la ventana del DM la capa siempre tiene opacidad cero para que el DM vea el mapa completo.  Los controles de oscuridad del DM configuran el efecto para jugadores sin afectar la vista del DM.

### Luces

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

### Fuego visual

El fuego debe ser un efecto visual superpuesto al mapa.

Requerimientos:

- Poder colocarse con click derecho.
- Poder moverse, seleccionar y borrar.
- Poder ajustar escala/opacidad.
- Idealmente emitir o asociarse a una luz calida.

Implementacion vigente:

- Fuego circular o pintado por celdas, sin emojis; iluminacion asociada independiente de la decoracion animada.
- Render y presupuesto de llamas completos definidos en spec 10: atlas Fiya2 compartido, sin recortar las llamas en bordes y con variacion estable de distribucion/fase.
- El antiguo `area-fire.gif` se conserva como respaldo, sin llamadas desde el renderer.
- La licencia del GIF Fiya2 solicitado no esta confirmada para redistribucion. Consultar `assets/effects/fiya2-preview.md` antes de distribuir builds publicos.

### Criterios de aceptacion

- La capa de oscuridad se ve sobre el mapa.
- Una luz puntual aclara visualmente una zona.
- Una luz conica aclara visualmente una zona direccional.
- La luz puntual y la luz conica dejan ver el mapa claramente dentro de su geometria aunque la oscuridad global este alta.
- La luz conica mantiene 60 grados de apertura, permite cambiar longitud en cuadros y permite orientar desde el aro/manija en el canvas.
- El fuego animado se reproduce sobre el mapa.
- El fuego puede seleccionarse y borrarse.
- Las luces y fuego se guardan y cargan con la escena.

### Riesgos

- Blend modes inconsistentes entre plataformas.
- Efectos demasiado costosos para imagenes grandes.
- Fuego visualmente llamativo pero poco integrado con la iluminacion.

### Notas de implementacion

- PixiJS deberia facilitar mascaras, sprites y blend modes.
- La primera version no requiere sombras por paredes.
- Preparar el modelo de datos para futura interaccion con paredes y niebla de guerra.

## Handles de Tamaño para Luces

### Estado

Aceptado para implementación.

### Objetivo

Ajustar la usabilidad de la luz puntual y la luz cónica para que su tamaño pueda agrandarse o reducirse directamente desde el canvas, usando handles equivalentes a los de las formas editables.

### Contexto

La app ya permite:

- Crear luz puntual y luz cónica desde el menú contextual.
- Seleccionar, mover, ocultar y borrar luces.
- Cambiar propiedades de luz desde controles compactos.
- Rotar la luz cónica desde una manivela/anillo alrededor del origen.
- Redimensionar formas no luminosas como círculo, cono y rectángulo desde handles en el canvas.

Hoy la edición de tamaño de luces no es tan directa como la de las formas. Esta spec busca igualar esa experiencia para que el usuario no tenga que depender solo de inputs o sliders.

### Alcance

- Agregar resize interactivo para luz puntual.
- Agregar resize interactivo para luz cónica.
- Mantener el ángulo fijo de la luz cónica en 60 grados.
- Mantener la manivela/anillo actual para orientación del cono de luz.
- Mostrar handles solo cuando la luz esté seleccionada.
- Actualizar en tiempo real el radio/longitud visual mientras se arrastra.
- Persistir el nuevo radio/longitud usando el modelo actual de `SceneLight.radius`.
- Mantener compatibilidad con escenas existentes.

### Fuera de alcance

- Cambiar el ángulo de apertura de la luz cónica.
- Agregar luz brillante/tenue diferenciada.
- Agregar sombras, paredes o línea de visión.
- Cambiar el comportamiento de darkvision, oscuridad o fog of war.
- Cambiar el modelo de datos de luces salvo que sea estrictamente necesario.
- Rediseñar el panel lateral o menú contextual.
- Múltiples selecciones simultáneas.

### Modelo de interacción

#### Luz puntual

- Al seleccionar una luz puntual, se muestra su círculo de alcance como ya ocurre visualmente.
- Se agrega un handle en el borde derecho del círculo, alineado desde el centro hacia `0°`.
- Arrastrar ese handle cambia el radio de la luz puntual.
- El radio se calcula como la distancia entre el centro de la luz y el cursor en coordenadas de mundo.
- El radio mínimo debe evitar que la luz colapse visualmente. Valor sugerido: `10` unidades de mundo.
- El handle debe ser legible sobre mapa claro u oscuro.

#### Luz cónica

- Al seleccionar una luz cónica, se conserva el anillo/manivela de orientación actual.
- Se agrega un handle de longitud en el extremo del cono, ubicado sobre la dirección central del cono a distancia `radius`.
- Arrastrar ese handle cambia la longitud/radio de la luz cónica.
- Arrastrar la manivela del anillo sigue cambiando solo la dirección.
- El ángulo de apertura se mantiene fijo en `60°`.
- El radio mínimo debe evitar que el cono colapse visualmente. Valor sugerido: `10` unidades de mundo.

### Reglas visuales

- Los handles de resize deben aparecer solo para la luz seleccionada.
- El handle de resize debe diferenciarse de:
  - el centro/origen de la luz,
  - la manivela de orientación del cono,
  - los handles de formas tácticas.
- El estilo debe seguir el lenguaje visual actual de luces: tonos cálidos/dorados.
- Mientras se arrastra el handle, la geometría de luz debe actualizar:
  - visual de luz,
  - máscara de oscuridad,
  - máscara de darkvision,
  - aportes de visión/fog si dependen de luces visibles.

### Persistencia

- No se requiere un nuevo campo si `SceneLight.radius` representa el radio de luz puntual y la longitud de luz cónica.
- Guardar escena debe conservar el valor actualizado.
- Cargar escena debe restaurar las luces con el tamaño modificado.
- Escenas antiguas siguen cargando con su `radius` existente.

### Reglas de coordenadas

- El cálculo de resize debe usar coordenadas de mundo.
- El resultado no debe depender del zoom de cámara.
- Mover el mapa o hacer pan/zoom no debe desincronizar el handle.

### Criterios de aceptación

- Al seleccionar una luz puntual aparece un handle en el borde de su círculo.
- Arrastrar el handle de luz puntual agranda o reduce su radio.
- Al seleccionar una luz cónica aparece un handle en el extremo de su dirección central.
- Arrastrar el handle de luz cónica agranda o reduce su longitud.
- La luz cónica conserva su anillo/manivela para rotación.
- Rotar una luz cónica no cambia su longitud.
- Redimensionar una luz cónica no cambia su dirección.
- Las máscaras de oscuridad y darkvision se actualizan mientras se redimensiona.
- El tamaño editado se guarda y carga correctamente en `.ttrpgscene`.
- Los handles no aparecen en luces no seleccionadas.
- No se agregan accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.

### Riesgos

- Confundir hit testing entre manivela de rotación y handle de longitud en la luz cónica.
- Que el resize se sienta distinto al de las formas si no se reutilizan patrones existentes.
- Que la máscara de oscuridad o darkvision no se actualice durante el drag.
- Que el handle sea difícil de ver sobre mapas con alto contraste.

### Notas de implementación

- Reutilizar el patrón ya implementado para resize de círculo/cono en formas tácticas cuando sea posible.
- Mantener la lógica de cálculo en PixiViewport o extraer helper puro si empieza a repetirse demasiado.
- Usar `onLightRadiusChange` o un callback equivalente hacia React para actualizar `SceneLight.radius`.
- Evitar duplicar reglas de luz en el renderer si ya existen helpers para `SceneLight`.

## Controles de luz legibles con zoom-out

- Luces puntuales y conicas usan la misma escala minima visual de las herramientas de area (spec 01).
- Escalar manivela de radio/longitud, trazos y tolerancia de seleccion. Conservar radio, longitud, unidades y mascaras en coordenadas de mundo.
- La manivela de orientacion conica mantiene radio minimo visual de 72 px a zoom-out y hit testing coherente.
- Los controles solo aparecen para el objeto seleccionado en DM; Player View conserva exclusivamente la iluminacion.
- Ambas luces aparecen en el arbol de Efectos de spec 06 para seleccionar, localizar y borrar.

## Cierre 1.9.0

Los cambios de controles de efectos, arbol de objetos y/o grilla descritos en las extensiones de esta especificacion fueron aceptados por el usuario el 2026-09-02 para cierre en main. El plan registra la verificacion realizada; los pendientes historicos ajenos a estas extensiones no se consideran ejecutados por este cierre.
