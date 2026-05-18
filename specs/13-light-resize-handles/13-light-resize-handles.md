# Spec 13 - Handles de Tamaño para Luces

## Estado

Aceptado para implementación.

## Objetivo

Ajustar la usabilidad de la luz puntual y la luz cónica para que su tamaño pueda agrandarse o reducirse directamente desde el canvas, usando handles equivalentes a los de las formas editables.

## Contexto

La app ya permite:

- Crear luz puntual y luz cónica desde el menú contextual.
- Seleccionar, mover, ocultar y borrar luces.
- Cambiar propiedades de luz desde controles compactos.
- Rotar la luz cónica desde una manivela/anillo alrededor del origen.
- Redimensionar formas no luminosas como círculo, cono y rectángulo desde handles en el canvas.

Hoy la edición de tamaño de luces no es tan directa como la de las formas. Esta spec busca igualar esa experiencia para que el usuario no tenga que depender solo de inputs o sliders.

## Alcance

- Agregar resize interactivo para luz puntual.
- Agregar resize interactivo para luz cónica.
- Mantener el ángulo fijo de la luz cónica en 60 grados.
- Mantener la manivela/anillo actual para orientación del cono de luz.
- Mostrar handles solo cuando la luz esté seleccionada.
- Actualizar en tiempo real el radio/longitud visual mientras se arrastra.
- Persistir el nuevo radio/longitud usando el modelo actual de `SceneLight.radius`.
- Mantener compatibilidad con escenas existentes.

## Fuera de alcance

- Cambiar el ángulo de apertura de la luz cónica.
- Agregar luz brillante/tenue diferenciada.
- Agregar sombras, paredes o línea de visión.
- Cambiar el comportamiento de darkvision, oscuridad o fog of war.
- Cambiar el modelo de datos de luces salvo que sea estrictamente necesario.
- Rediseñar el panel lateral o menú contextual.
- Múltiples selecciones simultáneas.

## Modelo de interacción

### Luz puntual

- Al seleccionar una luz puntual, se muestra su círculo de alcance como ya ocurre visualmente.
- Se agrega un handle en el borde derecho del círculo, alineado desde el centro hacia `0°`.
- Arrastrar ese handle cambia el radio de la luz puntual.
- El radio se calcula como la distancia entre el centro de la luz y el cursor en coordenadas de mundo.
- El radio mínimo debe evitar que la luz colapse visualmente. Valor sugerido: `10` unidades de mundo.
- El handle debe ser legible sobre mapa claro u oscuro.

### Luz cónica

- Al seleccionar una luz cónica, se conserva el anillo/manivela de orientación actual.
- Se agrega un handle de longitud en el extremo del cono, ubicado sobre la dirección central del cono a distancia `radius`.
- Arrastrar ese handle cambia la longitud/radio de la luz cónica.
- Arrastrar la manivela del anillo sigue cambiando solo la dirección.
- El ángulo de apertura se mantiene fijo en `60°`.
- El radio mínimo debe evitar que el cono colapse visualmente. Valor sugerido: `10` unidades de mundo.

## Reglas visuales

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

## Persistencia

- No se requiere un nuevo campo si `SceneLight.radius` representa el radio de luz puntual y la longitud de luz cónica.
- Guardar escena debe conservar el valor actualizado.
- Cargar escena debe restaurar las luces con el tamaño modificado.
- Escenas antiguas siguen cargando con su `radius` existente.

## Reglas de coordenadas

- El cálculo de resize debe usar coordenadas de mundo.
- El resultado no debe depender del zoom de cámara.
- Mover el mapa o hacer pan/zoom no debe desincronizar el handle.

## Criterios de aceptación

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

## Riesgos

- Confundir hit testing entre manivela de rotación y handle de longitud en la luz cónica.
- Que el resize se sienta distinto al de las formas si no se reutilizan patrones existentes.
- Que la máscara de oscuridad o darkvision no se actualice durante el drag.
- Que el handle sea difícil de ver sobre mapas con alto contraste.

## Notas de implementación

- Reutilizar el patrón ya implementado para resize de círculo/cono en formas tácticas cuando sea posible.
- Mantener la lógica de cálculo en PixiViewport o extraer helper puro si empieza a repetirse demasiado.
- Usar `onLightRadiusChange` o un callback equivalente hacia React para actualizar `SceneLight.radius`.
- Evitar duplicar reglas de luz en el renderer si ya existen helpers para `SceneLight`.
