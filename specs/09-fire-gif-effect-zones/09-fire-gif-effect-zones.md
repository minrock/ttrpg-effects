# Spec 09 - Zonas de Fuego Animado y Pintado por Celdas

## Objetivo

Simplificar el efecto de fuego para que no dependa de dibujo a mano alzada. El fuego debe representarse como un GIF interno de area, con transparencia, enmascarado a un circulo seleccionable o a grupos contiguos de celdas de grilla pintadas con un pincel circular.

## Alcance

- Usar un asset interno generado para el proyecto en `src/renderer/public/effects/area-fire.gif`.
- Eliminar el modo de dibujo freehand para fuego.
- Mantener creacion de fuego desde click derecho.
- Mantener seleccion, movimiento, borrado, visibilidad, opacidad, escala y emision de luz.
- Renderizar el fuego circular como un unico GIF escalado al diametro del circulo y enmascarado por la geometria circular.
- Renderizar el fuego con un multiplicador de alpha `0.65` sobre la opacidad del efecto para permitir leer el mapa debajo.
- Permitir ajustar el radio del fuego circular arrastrando su contorno/handle naranja.
- Permitir ajustar el radio de luz del fuego arrastrando su contorno/handle de luz.
- Agregar un modo `Pintar fuego` que pinte cuadrados de la grilla.
- El pincel de pintado debe ser circular: las celdas cuyo centro queda dentro del radio de pintado se agregan al area en fuego.
- Si el radio de pintado cubre una sola celda, se renderiza un unico GIF enmascarado a esa celda.
- Si el radio cubre varias celdas contiguas, todas las celdas dentro del area del pincel se agrupan y usan un unico GIF escalado al bounding box de esa region.
- Si existen regiones separadas de celdas, cada region contigua usa su propio GIF enmascarado.
- Guardar y cargar las celdas pintadas dentro de `.ttrpgscene`.
- La luz emitida por el fuego debe revelar la capa de oscuridad igual que una luz normal.

## Fuera de alcance

- Dibujo de multiples tiles por una misma region contigua.
- Dibujo freehand/poligonal para fuego.
- Simulacion fisica de propagacion de fuego.
- Danio, reglas de combate o automatizacion TTRPG.
- Colisiones con paredes, puertas u obstaculos.
- Importar multiples assets de fuego.
- Renderizar emojis dentro del fuego; el GIF animado reemplaza esa decoracion.

## Modelo de interaccion

### Fuego circular

- Al crear fuego desde el menu contextual, el modo inicial sigue siendo un fuego circular.
- El fuego circular conserva un centro en coordenadas de mundo.
- El area visual del fuego se renderiza como un unico GIF interno, escalado al diametro del circulo y recortado con una mascara circular.
- El contorno/handle naranja controla el radio del area en fuego.
- El contorno/handle de luz controla el radio de iluminacion si `emitsLight` esta activo.
- El panel de propiedades permite ajustar radio, color, opacidad, escala y radio de luz.

### Pintado por celdas

- Debe existir un modo `Pintar fuego` disponible desde el menu contextual.
- En modo pintado, click o drag sobre el mapa agrega celdas de grilla al fuego.
- El pincel usa un radio circular configurable desde el handle naranja del fuego seleccionado.
- El radio por defecto del pincel es 25 unidades de mundo.
- Si no hay fuego por celdas seleccionado, el primer click crea uno nuevo y lo selecciona.
- Si hay un fuego por celdas seleccionado, los nuevos cuadrados se agregan a ese mismo efecto.
- Las celdas pintadas se agrupan por conectividad cardinal. Cada grupo contiguo se renderiza con un unico GIF interno escalado a su bounding box y recortado por una mascara de celdas.
- El resultado debe persistir como coordenadas de mundo por celda, no como coordenadas de pantalla.
- Las celdas se calculan usando el origen mundial (0, 0) como base, identico al grid visual, para garantizar alineacion cuando el mapa se mueve.

### Iluminacion por celdas

- En modo `cells`, la luz del fuego no usa un radio circular; se deriva geometricamente del contorno de las celdas pintadas.
- Las celdas cardinalmente adyacentes al area de fuego (sin ser fuego) emiten **luz brillante** (anillo 1).
- Las celdas cardinalmente adyacentes al anillo brillante (sin ser fuego ni anillo 1) emiten **luz tenue** (anillo 2).
- La capa de oscuridad se borra sobre el fuego + anillo brillante + anillo tenue.
- El fog of war se revela sobre el fuego + anillo brillante + anillo tenue.
- En modo `cells` no se muestran los handles de radio de fuego ni de luz (circulos naranjas/amarillos), ya que la iluminacion esta determinada por la forma pintada.

## Persistencia

La escena debe conservar:

- `id` estable.
- Tipo de efecto `fire`.
- Zona `circle` con radio cuando el fuego es circular.
- Zona `cells` con lista de celdas `{ x, y, size }` y radio de pincel.
- Posicion en coordenadas de mundo.
- Escala.
- Opacidad.
- Color.
- Visibilidad.
- Emision de luz y radio de luz.

## Criterios de aceptacion

- Se carga `src/renderer/public/effects/area-fire.gif` como asset interno del renderer, sin protocolo `map-asset:` ni rutas locales de usuario.
- El modo freehand de fuego ya no aparece en UI ni en schema nuevo.
- Crear fuego desde click derecho muestra un area circular animada, transparente y enmascarada.
- El radio del fuego circular se ajusta arrastrando el handle naranja.
- El modo `Pintar fuego` permite pintar una o varias celdas de grilla con el GIF animado enmascarado.
- El radio del pincel por defecto es 25 unidades de mundo.
- El radio del pincel define cuantas celdas quedan pintadas.
- Las celdas se alinean al grid visual independientemente de la posicion del mapa.
- En modo `cells`, los handles de radio (naranja y amarillo) no se muestran.
- En modo `cells`, el contorno de 1 celda alrededor del fuego emite luz brillante.
- En modo `cells`, el contorno de 2 celdas alrededor del fuego emite luz tenue.
- La oscuridad se borra y el fog of war se revela en fuego + ambos anillos.
- Las celdas pintadas se guardan y cargan en `.ttrpgscene`.
- El fuego no renderiza emojis.
- No se agregan accesos directos del renderer a Node.js, Electron internals o filesystem.
