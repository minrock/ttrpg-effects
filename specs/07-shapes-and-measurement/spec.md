# Spec - Figuras y Medicion

Este documento describe de forma unificada la funcionalidad de figuras y medicion, consolidando el alcance funcional vigente en el proyecto.

## Herramientas Tacticas y Medicion

### Objetivo

Implementar herramientas para medir distancias y dibujar areas tacticas utiles en D&D 5e y juegos similares.

### Alcance

- Medicion lineal.
- Lineas.
- Circulo/esfera 2D.
- Cono.
- Rectangulo/cubo.
- Snap-to-grid opcional.
- Seleccion y borrado.
- Medidas en pies y metros.
- Diagonales configurables.

### Reglas iniciales

- Sistema principal: D&D 5e.
- Distancia por defecto: 5 ft por casilla.
- Metrico comun: 1.5 m por casilla.
- Diagonal por defecto: 5 ft.
- Diagonal configurable para soportar variantes.

### Comportamiento de formas

- Las formas se crean desde el menu contextual o herramienta activa.
- Las formas persisten hasta que el usuario las borre.
- Las formas pueden seleccionarse.
- Las formas pueden moverse o ajustarse si la herramienta lo permite.
- Las formas pueden encajar en la grilla si snap-to-grid esta activo.

### Preguntas pendientes

- Los conos deben seguir plantilla exacta de D&D 5e o geometria libre medida?
- Los cubos se alinean siempre a grilla o pueden rotarse/liberarse?
- Las esferas se representan solo como circulo 2D o con ayudas de diametro/radio?

### Criterios de aceptacion

- El usuario puede crear una medicion lineal.
- La medicion muestra distancia en la unidad activa.
- El usuario puede alternar pies/metrico.
- El usuario puede crear circulo, cono y rectangulo.
- El usuario puede activar/desactivar snap-to-grid.
- El usuario puede seleccionar y borrar formas.
- Las mediciones respetan la configuracion de diagonales.

### Riesgos

- Sobrecargar el MVP con demasiada exactitud de reglas.
- Hacer formas visualmente bonitas pero poco legibles en proyeccion.
- No distinguir entre forma temporal y forma persistente.

### Notas de implementacion

- Guardar formas en coordenadas de mundo.
- Guardar unidad y modo de diagonal en configuracion global de escena.
- Diseñar estilos de alto contraste pero no invasivos.

## Submenú de Herramientas de Área y Formas Editables

### Objetivo

Reorganizar las formas del menú contextual en un submenú llamado "Herramientas de área", eliminar la línea sin etiqueta, y añadir handles interactivos para redimensionar y rotar círculo, cono y rectángulo directamente sobre el mapa.

### Alcance

- Agrupar círculo, cono, rectángulo y línea (medición) en un submenú "Herramientas de área" dentro del menú contextual.
- Eliminar la forma `line` (línea sin etiqueta); la línea de medición pasa a ser la única línea disponible.
- La línea de medición conserva su etiqueta de distancia y se convierte en la línea default al crear.
- El círculo de forma puede redimensionarse arrastrando su contorno (handle en el borde).
- El cono de forma puede rotarse con una manivela en un anillo alrededor de su origen, y redimensionarse arrastrando su extremo.
- El rectángulo puede redimensionarse arrastrando cada esquina de forma independiente en X e Y.
- Los handles de las formas son visibles solo cuando el elemento está seleccionado.

### Fuera de alcance

- Luces (point light, cone light): no se modifican.
- Fuego (fire, fire-paint): no se modifica.
- Cambiar el ángulo de apertura del cono; el ángulo es fijo (60° por defecto).
- Cambiar el color, opacidad o propiedades visuales de las formas más allá del redimensionado/rotación.
- Snap a grilla al redimensionar (puede añadirse en spec futuro).
- Múltiples selecciones simultáneas.
- Transformaciones proporcionales del rectángulo (sin shift).

### Modelo de interacción

#### Submenú "Herramientas de área"

- El menú contextual expone una entrada "Herramientas de área ▶" que abre un submenú anidado.
- El submenú contiene: Línea, Círculo, Cono, Rectángulo.
- El resto del menú contextual (Pintar fuego, luces, configuración) permanece igual.
- Las formas del nivel raíz del menú contextual desaparecen; solo existirán dentro del submenú.

#### Línea (ex-medición)

- La forma `measurement` pasa a ser simplemente "Línea" en la UI.
- El tipo interno sigue siendo `measurement` para compatibilidad con escenas guardadas.
- Conserva la etiqueta de distancia calculada sobre el segmento.
- La forma `line` (sin etiqueta) se elimina del dominio, schema y UI.
- Las escenas existentes con tipo `line` se migran o ignoran silenciosamente al cargar.

#### Círculo - handle de radio

- Al seleccionar un círculo, aparece un handle circular en el borde (punto en el extremo derecho del radio).
- Arrastrar el handle cambia el radio del círculo.
- El radio mínimo es 10 unidades de mundo.
- El color del handle es el mismo color de contorno del círculo (azul, `#7fb8ff`).

#### Cono - handles de rotación y tamaño

- Al seleccionar un cono, aparece un anillo de rotación alrededor del origen del cono.
- Un handle sobre ese anillo indica la dirección actual; arrastrarlo cambia la dirección del cono.
- Un handle en el extremo del cono (a distancia `radius` del origen, en la dirección del cono) permite cambiar el radio.
- El radio mínimo es 10 unidades de mundo.
- El ángulo de apertura del cono es fijo en 60°; no se expone handle para modificarlo.
- El mecanismo de rotación y resize es equivalente al del cono de luz (iluminacion).

#### Rectángulo - handles de esquinas

- Al seleccionar un rectángulo, aparece un handle en cada una de sus cuatro esquinas.
- Arrastrar una esquina redimensiona el rectángulo en X e Y de forma independiente.
- La esquina opuesta al handle arrastrado permanece fija (el origen del rectángulo puede moverse para lograrlo).
- El tamaño mínimo en cada eje es 10 unidades de mundo.
- Se persiste `width`, `height` y `position` (esquina superior izquierda, o centro si ya se usa así).

### Persistencia

El schema de escena debe conservar:

- Formas `measurement` (sin cambio), `circle` con `radius`, `cone` con `radius` y `direction`, `rectangle` con `width` y `height`.
- La forma `line` se elimina del schema; las escenas viejas con `type: "line"` se cargan omitiendo esas formas con un warning.
- No se añaden nuevos campos al schema para las formas existentes; `radius`, `direction`, `width` y `height` ya están presentes.

### Criterios de aceptación

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

## Relleno de Emojis para Efectos y Formas

### Objetivo

Permitir que efectos y formas rendericen emojis representativos dentro de su área, para que el mapa proyectado comunique visualmente qué elemento existe en una zona sin depender solo de contornos o colores.

### Contexto

La app ya permite:

- Dibujar fuego como círculo o como celdas pintadas.
- Crear formas tácticas: línea, círculo, cono y rectángulo.
- Seleccionar, mover, redimensionar y borrar formas.
- Configurar grilla, unidad y tamaño de casilla.
- Renderizar efectos y formas en PixiJS sobre el mapa.

Actualmente las áreas se representan con rellenos, bordes o efectos animados. Esta spec añade una capa visual adicional basada en emojis para formas tácticas, útil para identificar zonas como veneno, hielo, magia u otros estados futuros.

### Alcance

- Renderizar emojis dentro de formas de área, excepto línea.
- Renderizar emojis distribuidos sobre líneas.
- Usar un emoji configurable para formas tácticas desde un selector único.
- Mantener un conjunto permitido de emojis en un archivo TypeScript compartido.
- Distribuir emojis en patrón tipo mosaico con ligera aleatoriedad visual dentro del área.
- Para líneas, distribuir emojis de manera equitativa a lo largo del segmento, al menos uno por cada cuadro de grilla.
- Mantener selección, movimiento, resize y borrado funcionando.
- Mantener persistencia suficiente para que una escena guardada pueda restaurar el emoji elegido por forma si se agrega configuración.

### Fuera de alcance

- Animar emojis.
- Reemplazar el GIF de fuego por emojis.
- Crear un editor avanzado de patrones.
- Permitir emojis por cada celda individual dentro de una misma forma.
- Cambiar reglas de oscuridad, darkvision, niebla o luces.
- Cambiar el sistema de formas tácticas más allá de su decoración visual.
- Aplicar emojis a mapas, grilla, luces o tokens futuros.

### Modelo de interacción

#### Fuego

- El fuego no renderiza emojis.
- La representacion visual del fuego vive en efectos de fuego como GIF interno enmascarado.
- El selector de emojis no aplica a fuego.

#### Formas de área

Aplica a:

- Círculo.
- Cono.
- Rectángulo.

Reglas:

- Cada forma de área puede tener un emoji representativo.
- Los emojis se renderizan dentro del área de la forma.
- La distribución se comporta como mosaico con posiciones ligeramente aleatorias.
- La aleatoriedad debe ser estable por elemento: no debe parpadear ni cambiar en cada render si la forma no cambió.
- Los emojis deben respetar la geometría visible:
  - círculo: dentro del radio,
  - cono: dentro del sector,
  - rectángulo: dentro de sus límites.

#### Línea

Aplica a la forma interna `measurement`, usada como línea.

Reglas:

- La línea puede tener un emoji representativo.
- Los emojis se distribuyen a lo largo del segmento.
- La separación debe ser equitativa.
- Debe colocarse al menos un emoji por cada cuadro de grilla atravesado por la línea, usando `grid.cellSizeWorld` como referencia.
- Si la línea es más corta que una casilla, debe mostrar al menos un emoji.
- Los emojis deben seguir la dirección de la línea en posición, pero no es obligatorio rotar el glifo.

### Configuración de emoji

Decisión inicial propuesta:

- Fuego: sin emoji; usa el GIF interno enmascarado definido por efectos de fuego.
- Formas tácticas: agregar una propiedad opcional de emoji por forma, por ejemplo `emoji?: string`.
- La UI debe ofrecer un único selector con opción vacía y los emojis permitidos.
- El conjunto permitido inicial vive en TypeScript y contiene: `💧`, `💨`, `🤐`, `🤢`, `💀`, `☠️`, `🔮`.
- Si una forma no tiene emoji configurado, no renderiza emojis.

Requisitos:

- El emoji debe ser una cadena corta.
- El selector permite escoger solo un emoji a la vez.
- Si se persiste, debe guardarse dentro del modelo de escena de la forma.
- Escenas antiguas sin emoji deben cargar sin cambios.
- El renderer debe tolerar emojis vacíos o inválidos sin romper.

### Reglas visuales

- Los emojis deben renderizarse sobre el relleno de la forma, pero debajo de selección/handles.
- El tamaño del emoji debe escalar de forma legible con la grilla.
- Valor sugerido inicial: entre `0.35` y `0.55` del tamaño de celda.
- La opacidad debe ser suficiente para verse en proyección, sin tapar completamente el mapa.
- El patrón debe evitar que los emojis se salgan visualmente del área.
- Para áreas pequeñas, renderizar pocos emojis o uno centrado.

### Reglas de distribución

#### Mosaico para áreas

- Generar candidatos en una grilla interna basada en `grid.cellSizeWorld`.
- Aplicar jitter estable a cada candidato para que no se vea perfectamente mecánico.
- Filtrar candidatos que queden fuera de la geometría.
- Usar una semilla estable basada en el `id` del elemento, tipo y coordenadas principales.
- Recalcular cuando cambie geometría, radio, tamaño, posición, dirección o grilla.

#### Línea

- Calcular longitud del segmento en coordenadas de mundo.
- Calcular cantidad como `max(1, floor(longitud / grid.cellSizeWorld))`.
- Distribuir puntos interpolados desde inicio hasta fin.
- Evitar colocar emojis exactamente encima de handles si es posible.

### Persistencia

Fuego:

- No requiere campo nuevo para emoji, porque no renderiza emojis. Su representacion visual vive en efectos de fuego.

Formas:

- Si se permite emoji configurable, agregar `emoji?: string` a `SceneShape`.
- El schema debe aceptar escenas antiguas sin `emoji`.
- Guardar/cargar debe preservar el emoji configurado.

### Render / PixiJS

- La implementación debe vivir encapsulada en `src/render/pixi`.
- Usar texto Pixi para renderizar emojis.
- Mantener los emojis dentro de capas existentes:
  - formas dentro de capa de shapes/measurements,
  - selección y handles por encima.
- Evitar recrear patrones costosos en cada frame si no cambió la escena.
- Limpiar textos al redibujar capas.

### Criterios de aceptación

- El fuego circular y el fuego pintado no muestran emojis.
- Círculos, conos y rectángulos pueden renderizar un emoji dentro del área.
- El emoji de formas se elige desde un selector único con el conjunto permitido.
- La línea puede renderizar emojis distribuidos a lo largo del segmento.
- La línea muestra al menos un emoji por cuadro de grilla de longitud aproximada.
- El patrón de área usa posiciones tipo mosaico con variación visual estable.
- Al mover o redimensionar un elemento, los emojis se actualizan con la geometría.
- La selección y los handles siguen viéndose por encima de los emojis.
- Guardar/cargar conserva emojis configurados en formas si se agrega esa propiedad.
- Escenas antiguas sin emojis cargan sin errores.
- No se agregan accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.

### Riesgos

- Renderizar muchos emojis puede afectar rendimiento en mapas grandes o áreas enormes.
- Emojis pueden variar visualmente entre sistemas operativos.
- La aleatoriedad puede verse como parpadeo si no es estable.
- Los emojis pueden tapar demasiado el mapa si son grandes o muy densos.
- Persistir emojis implica migración suave del schema de formas.

### Notas de implementación

- Empezar con una densidad conservadora y ajustar manualmente.
- Usar una función determinista simple para jitter por elemento.
- Para fuego por celdas, usar el centro de cada celda como ubicación base.
- Para formas, considerar helpers puros para `pointInCircle`, `pointInCone`, `pointInRect` si la lógica crece.
- En el plan decidir si las formas tienen emoji por defecto o si se agrega UI para configurarlo.

## Herramienta de Path

### Objetivo

Agregar una herramienta para pintar caminos segmentados sobre el mapa. El usuario podra crear un `Path` haciendo clicks sucesivos sobre la grilla; cada punto se ajusta al centro de la celda elegida, la distancia total se recalcula en vivo y el resultado final queda como un objeto seleccionable y editable.

### Contexto

La app ya permite crear formas tacticas, mediciones lineales, fuego, luces, niebla, oscuridad ambiental y efectos. Las mediciones actuales sirven para un segmento simple, pero no cubren bien caminos compuestos por varios tramos, como rutas de movimiento, recorridos por pasillos o trayectorias tacticas con giros.

Esta spec agrega una herramienta especializada para paths poligonales, reutilizando las reglas de medicion existentes para unidad, distancia por celda y diagonales configurables.

### Alcance

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

### Fuera de alcance

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

### Modelo de interaccion

#### Activacion

- El usuario abre el menu contextual con click derecho sobre el canvas.
- Entra a `Herramientas de area`.
- Selecciona `Path/Camino`.
- La app entra en modo `dibujar path`.
- No se crea ningun punto inmediatamente al elegir la accion.
- El cursor cambia a un cursor asociado a pintado/trazado de path para mostrar que la herramienta esta activa.

#### Crear puntos

- El primer click normal sobre el mapa crea el primer punto del path.
- Cada punto se ubica en el centro de la celda de grilla donde el usuario hizo click.
- Despues del primer punto, el cursor arrastra visualmente un tramo temporal desde el ultimo punto confirmado hasta la celda bajo el cursor.
- Cada click normal agrega un nuevo punto confirmado.
- La herramienta permanece activa hasta que el usuario confirme con `Enter` o cancele con `Escape`.

#### Feedback temporal

Mientras se dibuja:

- Se renderizan los puntos confirmados.
- Se renderizan los segmentos entre puntos confirmados.
- Se renderiza un segmento temporal desde el ultimo punto confirmado hasta el centro de la celda bajo el cursor.
- Se muestra una etiqueta con la distancia total final si el usuario confirmara en ese momento.
- La distancia de la etiqueta incluye:
  - todos los segmentos confirmados;
  - el segmento temporal hasta la posicion actual del cursor.
- Si el cursor esta sobre la misma celda que el ultimo punto, la distancia temporal no debe sumar un tramo artificial.

#### Confirmar

- Al presionar `Enter`, el path se confirma.
- Para confirmarse, debe tener al menos dos puntos distintos.
- El path confirmado queda persistido como objeto de escena.
- El path confirmado queda seleccionado.
- El modo de dibujo termina.
- Si el usuario presiona `Enter` con menos de dos puntos distintos, no se crea ningun objeto y se mantiene o cancela el modo segun sea mas consistente con las herramientas existentes. El plan debe definir la decision final.

#### Cancelar

- Al presionar `Escape`, se descarta todo el path temporal.
- El modo de dibujo termina.
- No se crea ningun objeto persistente.

#### Backspace durante dibujo

- Al presionar `Backspace`, se elimina el ultimo punto confirmado.
- Si `Backspace` elimina el ultimo punto restante, se sale del modo de dibujo y se descarta el path temporal.
- `Backspace` no debe borrar otros objetos seleccionados mientras el modo path esta activo.

### Path confirmado

Una vez confirmado:

- El path se comporta como un objeto seleccionable.
- Puede borrarse con `Delete` o `Backspace` cuando esta seleccionado y no se esta dibujando un path temporal.
- Se muestra con lineas y puntos de alto contraste, manteniendo el look and feel oscuro/dorado actual.
- No muestra emojis.
- No muestra propiedades de color, opacidad, emoji, radio ni longitud editable directa.
- La unica propiedad mostrada en el panel de seleccion es la distancia total en la unidad activa.

### Edicion posterior

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

### Reglas de medicion

- La distancia del path es la sumatoria de las distancias de cada segmento.
- Cada segmento debe usar las mismas reglas actuales de medicion de la app:
  - unidad activa (`ft` o `m`);
  - distancia por celda;
  - distancia metrica por celda;
  - modo de diagonal configurado.
- Si cambian la unidad, distancia por celda o regla diagonal, la distancia mostrada en paths existentes se recalcula.
- El modelo persistido debe guardar coordenadas/puntos en espacio de mundo o grilla, no una distancia congelada.
- La distancia puede derivarse al renderizar o al mostrar propiedades.

### Modelo de datos

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

### Persistencia

- Guardar paths dentro de `.ttrpgscene`.
- Cargar escenas con paths preservando orden de puntos e ids.
- Escenas antiguas sin paths deben cargar sin errores.
- Si el schema usa union discriminada de formas, agregar `path` de forma retrocompatible.
- No persistir distancia calculada como fuente de verdad.

### Render / PixiJS

- Renderizar path en la capa de formas/mediciones, como parte de las herramientas de area finales, por encima de mapa, tokens, oscuridad, luces, oscuridad magica y fog of war.
- Renderizar el path temporal solo mientras se esta dibujando.
- Renderizar puntos confirmados como nodos visibles.
- Renderizar el tramo temporal con estilo diferenciado o ligeramente translucido.
- Renderizar la etiqueta temporal cerca del cursor o del ultimo tramo, evitando tapar excesivamente el path.
- Al seleccionar el path, renderizar sobre el primer punto un circulo de seleccion (trazo visible) con radio de media celda y un handle interno centrado en el punto.
- Los handles de edicion deben renderizarse por encima del path.
- El path debe respetar pan y zoom.
- Limpiar recursos temporales al confirmar, cancelar, cargar escena o resetear escena.

### UI / UX

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

### Criterios de aceptacion

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

### Riesgos

- La edicion de puntos puede chocar con el modelo actual de seleccion si todas las formas asumen un solo centro o un solo handle.
- La medicion por diagonales puede requerir reutilizar helpers existentes para evitar duplicar reglas.
- La etiqueta temporal puede tapar el mapa si se renderiza demasiado cerca del cursor.
- `Backspace` debe distinguir claramente entre borrar punto temporal y borrar objeto seleccionado.
- Guardar indices de celda podria complicarse si luego se ajusta la grilla; guardar mundo podria ser mas simple pero requiere recalcular centro de celda al editar.

### Notas de implementacion

- Reutilizar helpers de medicion existentes antes de agregar calculos nuevos.
- Mantener la logica de distancia en dominio o helpers testeables, no dentro de React.
- Considerar tests unitarios para sumar segmentos y reaccionar a cambios de unidad/regla diagonal.
- Mantener el renderer como adaptador visual: el modelo de path no debe depender de PixiJS.
- Si la edicion completa de puntos requiere mas trabajo que el MVP, implementar primero seleccion, persistencia y distancia, dejando la edicion de handles como subtarea explicita del plan.

## Acceso desde el arbol lateral

- Las formas y mediciones persistidas aparecen bajo Areas en el arbol de Objetos de spec 06.
- Seleccionar abre sus propiedades; centrar mueve solo la camara del DM sin cambiar zoom. Papelera o Delete/Backspace enfocado elimina la hoja indicada.
- Mantener los controles y labels ya compensados por zoom-out; luces y efectos reutilizan ahora la misma escala visual.
- No cambiar reglas de medicion, snap ni datos persistidos de las formas.

## Cierre 1.9.0

Los cambios de controles de efectos, arbol de objetos y/o grilla descritos en las extensiones de esta especificacion fueron aceptados por el usuario el 2026-09-02 para cierre en main. El plan registra la verificacion realizada; los pendientes historicos ajenos a estas extensiones no se consideran ejecutados por este cierre.
