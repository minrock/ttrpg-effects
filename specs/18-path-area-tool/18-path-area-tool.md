# Spec 18 - Herramienta de Path

## Objetivo

Agregar una herramienta para pintar caminos segmentados sobre el mapa. El usuario podra crear un `Path` haciendo clicks sucesivos sobre la grilla; cada punto se ajusta al centro de la celda elegida, la distancia total se recalcula en vivo y el resultado final queda como un objeto seleccionable y editable.

## Contexto

La app ya permite crear formas tacticas, mediciones lineales, fuego, luces, niebla, oscuridad ambiental y efectos. Las mediciones actuales sirven para un segmento simple, pero no cubren bien caminos compuestos por varios tramos, como rutas de movimiento, recorridos por pasillos o trayectorias tacticas con giros.

Esta spec agrega una herramienta especializada para paths poligonales, reutilizando las reglas de medicion existentes para unidad, distancia por celda y diagonales configurables.

## Alcance

- Agregar una accion `Path/Camino` dentro de `Herramientas de area` en el menu contextual.
- Entrar en modo de dibujo de path al elegir la accion.
- Cambiar el cursor mientras el modo path esta activo para dar feedback visual de pintado de caminos.
- Crear el primer punto con click normal despues de activar la herramienta.
- Ajustar cada punto al centro de la celda seleccionada.
- Mostrar una linea temporal desde el ultimo punto confirmado hasta la posicion actual del cursor.
- Mostrar una etiqueta temporal con la distancia total acumulada, incluyendo el tramo pendiente hasta el cursor.
- Permitir agregar puntos con clicks normales sucesivos.
- Recalcular la distancia total cada vez que se agregue un punto o se mueva el cursor.
- Confirmar el path con `Enter`.
- Cancelar el path con `Escape`.
- Borrar el ultimo punto confirmado con `Backspace` mientras se esta dibujando.
- Salir del modo path si `Backspace` elimina el ultimo punto restante.
- Guardar el path confirmado como objeto persistente de escena.
- Hacer que el path confirmado sea seleccionable.
- Mostrar como unica propiedad del path su distancia total en la unidad activa.
- Permitir editar el path confirmado moviendo sus puntos.
- Recalcular la distancia cuando cambien reglas de medida, unidad, distancia por celda o modo diagonal.
- No renderizar emojis en paths.

## Fuera de alcance

- Paths curvos o suavizados.
- Flechas de direccion.
- Anchura configurable del path.
- Colores configurables por path.
- Animacion de movimiento sobre el path.
- Etiquetas por segmento individual.
- Obstaculos, bloqueo por paredes o linea de vision.
- Pathfinding automatico.
- Snap libre fuera de grilla para esta herramienta.
- Emojis o patrones visuales dentro/sobre el path.

## Modelo de interaccion

### Activacion

- El usuario abre el menu contextual con click derecho sobre el canvas.
- Entra a `Herramientas de area`.
- Selecciona `Path/Camino`.
- La app entra en modo `dibujar path`.
- No se crea ningun punto inmediatamente al elegir la accion.
- El cursor cambia a un cursor asociado a pintado/trazado de path para mostrar que la herramienta esta activa.

### Crear puntos

- El primer click normal sobre el mapa crea el primer punto del path.
- Cada punto se ubica en el centro de la celda de grilla donde el usuario hizo click.
- Despues del primer punto, el cursor arrastra visualmente un tramo temporal desde el ultimo punto confirmado hasta la celda bajo el cursor.
- Cada click normal agrega un nuevo punto confirmado.
- La herramienta permanece activa hasta que el usuario confirme con `Enter` o cancele con `Escape`.

### Feedback temporal

Mientras se dibuja:

- Se renderizan los puntos confirmados.
- Se renderizan los segmentos entre puntos confirmados.
- Se renderiza un segmento temporal desde el ultimo punto confirmado hasta el centro de la celda bajo el cursor.
- Se muestra una etiqueta con la distancia total final si el usuario confirmara en ese momento.
- La distancia de la etiqueta incluye:
  - todos los segmentos confirmados;
  - el segmento temporal hasta la posicion actual del cursor.
- Si el cursor esta sobre la misma celda que el ultimo punto, la distancia temporal no debe sumar un tramo artificial.

### Confirmar

- Al presionar `Enter`, el path se confirma.
- Para confirmarse, debe tener al menos dos puntos distintos.
- El path confirmado queda persistido como objeto de escena.
- El path confirmado queda seleccionado.
- El modo de dibujo termina.
- Si el usuario presiona `Enter` con menos de dos puntos distintos, no se crea ningun objeto y se mantiene o cancela el modo segun sea mas consistente con las herramientas existentes. El plan debe definir la decision final.

### Cancelar

- Al presionar `Escape`, se descarta todo el path temporal.
- El modo de dibujo termina.
- No se crea ningun objeto persistente.

### Backspace durante dibujo

- Al presionar `Backspace`, se elimina el ultimo punto confirmado.
- Si `Backspace` elimina el ultimo punto restante, se sale del modo de dibujo y se descarta el path temporal.
- `Backspace` no debe borrar otros objetos seleccionados mientras el modo path esta activo.

## Path confirmado

Una vez confirmado:

- El path se comporta como un objeto seleccionable.
- Puede borrarse con `Delete` o `Backspace` cuando esta seleccionado y no se esta dibujando un path temporal.
- Se muestra con lineas y puntos de alto contraste, manteniendo el look and feel oscuro/dorado actual.
- No muestra emojis.
- No muestra propiedades de color, opacidad, emoji, radio ni longitud editable directa.
- La unica propiedad mostrada en el panel de seleccion es la distancia total en la unidad activa.

## Edicion posterior

El path confirmado debe permitir edicion de puntos si es viable dentro del modelo de interaccion actual.

Requisitos:

- Al seleccionar un path, el primer punto muestra un handle editable y un circulo de seleccion.
- El circulo de seleccion tiene un radio de al menos media celda de grilla.
- El handle y el circulo solo aparecen sobre el primer punto del path.
- Arrastrar el handle del primer punto (zona interna del circulo) mueve solo ese punto al centro de la celda destino, modificando el primer tramo.
- Arrastrar desde la zona externa del circulo (fuera del handle pero dentro del circulo) mueve el path completo manteniendo las posiciones relativas entre todos los puntos y haciendo snap al centro de celda.
- Al mover cualquier punto o el path completo, se recalculan los segmentos conectados y la distancia total.
- El path mantiene su orden de puntos.
- Hacer click o arrastrar desde los segmentos o puntos intermedios del path no mueve el path; solo lo selecciona.
- No se requiere agregar o eliminar puntos en modo edicion para esta spec.

## Reglas de medicion

- La distancia del path es la sumatoria de las distancias de cada segmento.
- Cada segmento debe usar las mismas reglas actuales de medicion de la app:
  - unidad activa (`ft` o `m`);
  - distancia por celda;
  - distancia metrica por celda;
  - modo de diagonal configurado.
- Si cambian la unidad, distancia por celda o regla diagonal, la distancia mostrada en paths existentes se recalcula.
- El modelo persistido debe guardar coordenadas/puntos en espacio de mundo o grilla, no una distancia congelada.
- La distancia puede derivarse al renderizar o al mostrar propiedades.

## Modelo de datos

Agregar un nuevo tipo persistible para paths.

Opcion sugerida:

- Extender las formas tacticas con `kind: "path"`.
- Guardar:
  - `id`;
  - `kind: "path"`;
  - `points`;
  - `visible` si aplica al modelo actual;
  - metadata minima compatible con seleccion/borrado.

Cada punto debe guardar una posicion estable en espacio de mundo o una referencia derivable de la grilla. Como el snap es al centro de celda, el plan puede decidir si se guardan coordenadas de mundo ya centradas o indices de celda, pero debe evitar depender de coordenadas de pantalla.

## Persistencia

- Guardar paths dentro de `.ttrpgscene`.
- Cargar escenas con paths preservando orden de puntos e ids.
- Escenas antiguas sin paths deben cargar sin errores.
- Si el schema usa union discriminada de formas, agregar `path` de forma retrocompatible.
- No persistir distancia calculada como fuente de verdad.

## Render / PixiJS

- Renderizar path en la capa de formas/mediciones, por encima de mapa, grilla, niebla, oscuridad y luces segun el orden actual de herramientas tacticas.
- Renderizar el path temporal solo mientras se esta dibujando.
- Renderizar puntos confirmados como nodos visibles.
- Renderizar el tramo temporal con estilo diferenciado o ligeramente translucido.
- Renderizar la etiqueta temporal cerca del cursor o del ultimo tramo, evitando tapar excesivamente el path.
- Al seleccionar el path, renderizar sobre el primer punto un circulo de seleccion (trazo visible) con radio de media celda y un handle interno centrado en el punto.
- Los handles de edicion deben renderizarse por encima del path.
- El path debe respetar pan y zoom.
- Limpiar recursos temporales al confirmar, cancelar, cargar escena o resetear escena.

## UI / UX

- La opcion en el menu contextual se llama `Path/Camino`.
- Debe vivir dentro de `Herramientas de area`.
- El cursor cambia mientras el modo path esta activo.
- `Enter` confirma.
- `Escape` cancela.
- `Backspace` borra el ultimo punto mientras se esta dibujando.
- La propiedad mostrada en el sidebar de objeto seleccionado debe ser solo `Total` o `Distancia total`.
- La etiqueta temporal debe usar la unidad activa y el formato existente de distancias.
- Al pasar el cursor sobre la zona externa del circulo de seleccion del primer punto, el cursor cambia a `grab` para indicar que se puede mover el path.
- Al arrastrar el path desde la zona externa del circulo, el cursor cambia a `grabbing`.
- Si el sidebar esta cerrado y se selecciona un path confirmado, debe seguir el comportamiento existente para propiedades de objetos seleccionados.

## Criterios de aceptacion

- El menu contextual muestra `Path/Camino` dentro de `Herramientas de area`.
- Al elegir `Path/Camino`, la app entra en modo de dibujo y cambia el cursor.
- Elegir `Path/Camino` no crea el primer punto automaticamente.
- El primer click normal crea el primer punto en el centro de la celda.
- Cada click normal adicional agrega un punto en el centro de la celda.
- Mientras se mueve el cursor, se ve una linea temporal desde el ultimo punto hasta la celda actual.
- Mientras se mueve el cursor, se ve una etiqueta con la distancia total acumulada incluyendo el tramo temporal.
- `Enter` confirma el path si hay al menos dos puntos distintos.
- `Escape` cancela el path temporal y no crea objeto.
- `Backspace` borra el ultimo punto confirmado mientras se dibuja.
- Si `Backspace` elimina el ultimo punto restante, se sale del modo path y se descarta el temporal.
- El path confirmado queda seleccionable.
- El path confirmado puede borrarse con `Delete` o `Backspace`.
- Al seleccionar el path, el panel de propiedades muestra solo la distancia total.
- El path no muestra emojis.
- La distancia usa las reglas actuales de unidad, distancia por celda y diagonal.
- Al cambiar unidad o reglas de medicion, la distancia mostrada se actualiza.
- Al seleccionar un path, el primer punto muestra un handle y un circulo de seleccion con radio de media celda.
- Arrastrar el handle del primer punto mueve solo ese punto con snap al centro de celda y recalcula distancia.
- Arrastrar desde la zona externa del circulo mueve el path completo con snap al centro de celda y recalcula distancia.
- Hacer click o arrastrar desde segmentos o puntos intermedios no mueve el path.
- Al pasar el cursor sobre la zona del circulo de seleccion, el cursor cambia a `grab`.
- Al arrastrar el path desde el circulo, el cursor cambia a `grabbing`.
- Guardar/cargar escena preserva el path y sus puntos.
- Escenas antiguas sin paths cargan sin errores.

## Riesgos

- La edicion de puntos puede chocar con el modelo actual de seleccion si todas las formas asumen un solo centro o un solo handle.
- La medicion por diagonales puede requerir reutilizar helpers existentes para evitar duplicar reglas.
- La etiqueta temporal puede tapar el mapa si se renderiza demasiado cerca del cursor.
- `Backspace` debe distinguir claramente entre borrar punto temporal y borrar objeto seleccionado.
- Guardar indices de celda podria complicarse si luego se ajusta la grilla; guardar mundo podria ser mas simple pero requiere recalcular centro de celda al editar.

## Notas de implementacion

- Reutilizar helpers de medicion existentes antes de agregar calculos nuevos.
- Mantener la logica de distancia en dominio o helpers testeables, no dentro de React.
- Considerar tests unitarios para sumar segmentos y reaccionar a cambios de unidad/regla diagonal.
- Mantener el renderer como adaptador visual: el modelo de path no debe depender de PixiJS.
- Si la edicion completa de puntos requiere mas trabajo que el MVP, implementar primero seleccion, persistencia y distancia, dejando la edicion de handles como subtarea explicita del plan.
