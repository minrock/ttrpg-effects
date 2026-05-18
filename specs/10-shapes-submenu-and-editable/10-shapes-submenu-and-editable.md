# Spec 10 - Submenú de Herramientas de Área y Formas Editables

## Objetivo

Reorganizar las formas del menú contextual en un submenú llamado "Herramientas de área", eliminar la línea sin etiqueta, y añadir handles interactivos para redimensionar y rotar círculo, cono y rectángulo directamente sobre el mapa.

## Alcance

- Agrupar círculo, cono, rectángulo y línea (medición) en un submenú "Herramientas de área" dentro del menú contextual.
- Eliminar la forma `line` (línea sin etiqueta); la línea de medición pasa a ser la única línea disponible.
- La línea de medición conserva su etiqueta de distancia y se convierte en la línea default al crear.
- El círculo de forma puede redimensionarse arrastrando su contorno (handle en el borde).
- El cono de forma puede rotarse con una manivela en un anillo alrededor de su origen, y redimensionarse arrastrando su extremo.
- El rectángulo puede redimensionarse arrastrando cada esquina de forma independiente en X e Y.
- Los handles de las formas son visibles solo cuando el elemento está seleccionado.

## Fuera de alcance

- Luces (point light, cone light): no se modifican.
- Fuego (fire, fire-paint): no se modifica.
- Cambiar el ángulo de apertura del cono; el ángulo es fijo (60° por defecto).
- Cambiar el color, opacidad o propiedades visuales de las formas más allá del redimensionado/rotación.
- Snap a grilla al redimensionar (puede añadirse en spec futuro).
- Múltiples selecciones simultáneas.
- Transformaciones proporcionales del rectángulo (sin shift).

## Modelo de interacción

### Submenú "Herramientas de área"

- El menú contextual expone una entrada "Herramientas de área ▶" que abre un submenú anidado.
- El submenú contiene: Línea, Círculo, Cono, Rectángulo.
- El resto del menú contextual (Pintar fuego, luces, configuración) permanece igual.
- Las formas del nivel raíz del menú contextual desaparecen; solo existirán dentro del submenú.

### Línea (ex-medición)

- La forma `measurement` pasa a ser simplemente "Línea" en la UI.
- El tipo interno sigue siendo `measurement` para compatibilidad con escenas guardadas.
- Conserva la etiqueta de distancia calculada sobre el segmento.
- La forma `line` (sin etiqueta) se elimina del dominio, schema y UI.
- Las escenas existentes con tipo `line` se migran o ignoran silenciosamente al cargar.

### Círculo - handle de radio

- Al seleccionar un círculo, aparece un handle circular en el borde (punto en el extremo derecho del radio).
- Arrastrar el handle cambia el radio del círculo.
- El radio mínimo es 10 unidades de mundo.
- El color del handle es el mismo color de contorno del círculo (azul, `#7fb8ff`).

### Cono - handles de rotación y tamaño

- Al seleccionar un cono, aparece un anillo de rotación alrededor del origen del cono.
- Un handle sobre ese anillo indica la dirección actual; arrastrarlo cambia la dirección del cono.
- Un handle en el extremo del cono (a distancia `radius` del origen, en la dirección del cono) permite cambiar el radio.
- El radio mínimo es 10 unidades de mundo.
- El ángulo de apertura del cono es fijo en 60°; no se expone handle para modificarlo.
- El mecanismo de rotación y resize es equivalente al del cono de luz (spec 06).

### Rectángulo - handles de esquinas

- Al seleccionar un rectángulo, aparece un handle en cada una de sus cuatro esquinas.
- Arrastrar una esquina redimensiona el rectángulo en X e Y de forma independiente.
- La esquina opuesta al handle arrastrado permanece fija (el origen del rectángulo puede moverse para lograrlo).
- El tamaño mínimo en cada eje es 10 unidades de mundo.
- Se persiste `width`, `height` y `position` (esquina superior izquierda, o centro si ya se usa así).

## Persistencia

El schema de escena debe conservar:

- Formas `measurement` (sin cambio), `circle` con `radius`, `cone` con `radius` y `direction`, `rectangle` con `width` y `height`.
- La forma `line` se elimina del schema; las escenas viejas con `type: "line"` se cargan omitiendo esas formas con un warning.
- No se añaden nuevos campos al schema para las formas existentes; `radius`, `direction`, `width` y `height` ya están presentes.

## Criterios de aceptación

- El menú contextual muestra "Herramientas de área" como entrada de submenú.
- El submenú contiene: Línea, Círculo, Cono, Rectángulo.
- No existe opción "line" sin etiqueta en ningún parte de la UI.
- Las escenas con formas `line` cargadas no rompen la app (se omiten o se migran).
- Al seleccionar un círculo, el handle de borde aparece y permite cambiar el radio.
- Al seleccionar un cono, el anillo de rotación y el handle de radio aparecen y funcionan.
- Al seleccionar un rectángulo, las cuatro esquinas aparecen y permiten redimensionar en X e Y.
- Los handles no se muestran cuando el elemento no está seleccionado.
- Las formas editadas persisten correctamente en `.ttrpgscene`.
- No se agregan accesos directos del renderer a Node.js, Electron internals o filesystem.
