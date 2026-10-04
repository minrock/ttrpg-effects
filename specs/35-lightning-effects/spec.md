# Spec 35 - Efectos de Relampago

Estado: aprobado, implementado y aceptado por el usuario para cierre en main como 2.5.4 el 2026-10-03. El benchmark prolongado de 24 efectos queda como verificacion de rendimiento diferida, no como resultado obtenido.

Fecha: 2026-10-03. Rama de trabajo: `codex/lightning-lab`. Version actual sin cambios: 2.5.3.

## 1. Objetivo

Agregar relampagos animados en linea recta, cono y circulo, con el aspecto vivo de la prueba aprobada: nucleo blanco, halo cian, ramificaciones variables y chispas alrededor. Permitir dibujar, medir y editar su geometria real sin confundirla con la decoracion animada.

La referencia para el circulo es la descarga radial irregular de la esquina superior izquierda de la imagen entregada por el usuario, no un anillo electrico con el centro vacio. La referencia no se incorpora como asset.

## 2. Alcance

- Efectos persistentes pertenecientes al mapa activo, no a la escena completa ni al modulo de combate.
- Tres variantes independientes: `Linea`, `Cono` y `Circulo`.
- Creacion con preview y medidas en tiempo real, seleccion, traslado, edicion geometrica, visibilidad y borrado.
- Reproduccion equivalente en DM y Player View, con semilla y reloj comunes.
- Guias geometricas semitransparentes de cono y circulo visibles en ambas ventanas, confirmado expresamente por el usuario.
- Guardado/carga en `.ttrpgscene`, navegacion multi-mapa y orientacion cardinal.
- Controles de intensidad, velocidad, opacidad y chispas por efecto.

Fuera de alcance: apertura variable del cono, rayos encadenados entre tokens, lineas con multiples tramos, pintado libre de electricidad, tormentas globales, propagacion fisica, colisiones, sonido, dano o seleccion automatica de objetivos. El brillo no agrega una fuente de luz ni cambia reglas de oscuridad o vision. Los controles de pausa global, mapa de prueba y carga de 24 descargas siguen siendo exclusivos del laboratorio.

## 3. Creacion

Agregar `Relampago` dentro de `Efectos`, tanto en el acceso lateral existente como en el menu contextual. Ofrecer las variantes mediante controles compactos con iconos y tooltip.

Elegir una variante activa el modo de dibujo; la posicion donde se abrio el menu no confirma un punto automaticamente.

1. El primer clic normal fija el origen: inicio de la linea, vertice del cono o centro del circulo.
2. Mover el cursor presenta la geometria provisional y su medida en tiempo real, sin guardar un objeto por cada movimiento.
3. El segundo clic confirma un efecto valido y lo deja seleccionado. La herramienta vuelve a seleccion.
4. `Escape` cancela el borrador sin crear efectos ni borrar objetos existentes. Un segundo punto coincidente no crea un efecto degenerado y permite seguir dibujando.

Cambiar de mapa, cargar o crear escena y abandonar la herramienta cancela el borrador. El pan temporal con Espacio no confirma puntos ni mueve el origen. Las acciones sobre menus o formularios tampoco confirman el dibujo.

### Linea

- El DM dibuja un segmento recto entre dos extremos y ve su longitud mientras lo extiende.
- La longitud mide el segmento de referencia, nunca la suma de zigzags o ramificaciones del relampago.
- Al seleccionar, dos manivelas permiten mover cada extremo por separado; arrastrar el cuerpo traslada ambos conservando longitud y direccion.
- Mostrar `Largo: N ft` o `Largo: N m`. La longitud del panel es calculada, no un segundo dato persistido editable.
- Usar las reglas de la linea de medicion existente: unidad y distancia por celda, diagonales configuradas y distancia hexagonal. En hexagonal, ajustar extremos a centros de celda como la linea actual; en cuadrada conservar su dibujo libre.
- Es una linea visual medida, no una plantilla con ancho reglamentario. El grosor del brillo y sus chispas no representan casillas afectadas. Agregar un ancho tactico configurable queda fuera de esta iteracion.

### Cono

- El origen es el vertice; el segundo punto determina direccion y alcance.
- El alcance es la distancia geometrica desde el vertice hasta el arco frontal por el eje central, igual al radio de los conos actuales. No es el ancho del arco.
- Apertura fija de 60 grados. No medirla, mostrarla como etiqueta ni ofrecer controles para editarla.
- El angulo editable es exclusivamente `Direccion`: los grados hacia donde mira el cono. Girarlo no cambia su alcance ni su apertura.
- Mantener manivela de rotacion alrededor del origen y manivela de alcance en el eje central, como en la herramienta de area Cono. La direccion tambien puede editarse numericamente en grados desde propiedades, normalizada a [0, 360).
- Mostrar `Largo: N ft` o `Largo: N m` en la guia privada del DM. La medida cambia al editar el alcance; al girar, el sector y su etiqueta acompanian la nueva direccion sin cambiar el valor medido.
- La animacion y la guia giran juntas y conservan el sector de 60 grados. Completar una vuelta devuelve la misma orientacion; no convierte el cono en un disco.

### Circulo

- El primer punto fija el centro y el segundo el radio.
- La animacion ocupa el interior con descargas radiales irregulares; no se limita al perimetro ni conserva una estrella rigida.
- Arrastrar el cuerpo mueve el centro; la manivela del borde modifica el radio.
- Mostrar `Radio: N ft` o `Radio: N m`, sin confundir radio con diametro. El panel permite editar el radio en la unidad activa.

### Unidades y grilla

- Los radios de circulo y cono usan la conversion geometrica existente de mundo a ft/m, sin aplicar reglas de desplazamiento diagonal a un radio.
- Cambiar unidad o calibracion recalcula etiquetas y campos; no redimensiona ni reposiciona objetos ya guardados.
- El snap opcional de areas sigue el comportamiento existente de circulos y conos, en grillas cuadradas y hexagonales. No convertir sus contornos en poligonos de celdas.
- Las medidas y manivelas deben seguir legibles al alejar el zoom y con la grilla visualmente oculta.

## 4. Guia del area afectada

El contorno geometrico es la fuente de verdad del area, no la envolvente instantanea de la animacion.

- Cono: sector cerrado con dos lados y arco frontal; circulo: disco y circunferencia.
- La guia permanece estable aunque una descarga se apague o cambie de recorrido. No parpadea con el efecto.
- Usar un relleno cian tenue pero claramente visible y un contorno continuo. Valores iniciales: relleno al 18% y contorno al 55%; al editar, el DM puede verlos al 24% y 85%. El Player conserva el estilo base.
- La guia se ve por defecto tambien cuando el efecto no esta seleccionado, tanto en DM como en Player View.
- El toggle `Mostrar guia del area` de cada cono/circulo activa o desactiva su guia en ambas ventanas. Durante edicion se conserva la ayuda local del DM aunque ese toggle este apagado.
- Las medidas, manivelas, anillos de rotacion y previews de creacion son siempre privados del DM. El jugador ve solamente efectos confirmados y su guia compartida, nunca etiquetas numericas ni controles editoriales.
- Para la linea, el DM ve eje y medida como ayuda; no se agrega una superficie tactica artificial al Player.
- Las ramas principales respetan la geometria de cono/circulo. El halo y las chispas pueden sobresalir ligeramente, pero no amplian el area, la seleccion ni la medida.
- Las guias compartidas respetan niebla y ocultamiento igual que el efecto. No usar una capa de mediciones por encima de la niebla para mostrarlas al jugador.
- Ocultar el efecto u otorgarle opacidad cero retira tambien su guia compartida. Seleccionar un efecto oculto desde el arbol puede mostrar una ayuda editorial privada del DM, sin hacerlo visible al Player.

## 5. Animacion y controles

- Movimiento continuo con descargas sucesivas, ramificaciones de diferente longitud y chispas cortas que nacen cerca de las ramas/bordes, se desplazan y desaparecen.
- Mantener nucleos luminosos, halo suave y transparencia del prototipo aprobado, sin GIF repetido ni fogonazos a pantalla completa.
- Intensidad inicial 1.2, rango 0.4 a 2; velocidad inicial 0.7, rango 0.2 a 1.5; opacidad inicial 1, rango 0 a 1; chispas activadas por defecto.
- Intensidad modifica luminosidad; opacidad modifica transparencia. Ninguna cambia la geometria ni la medida. La guia conserva su contraste propio mientras el efecto sea visible y su opacidad sea mayor que cero.
- La semilla individual es estable. Seleccionar, panear, hacer zoom, cambiar orientacion norte o mover el efecto no reinicia el reloj ni genera otra identidad visual.
- Cambiar velocidad conserva la fase actual y modifica el ritmo futuro en ambas ventanas.
- Abrir Player View o volver a un mapa incorpora la animacion al tiempo vigente, sin simular todos los fotogramas omitidos.
- Solo se animan los efectos del mapa actualmente renderizado; mapas inactivos no mantienen recursos GPU.

## 6. Integracion y persistencia

- Mostrar cada relampago bajo `Objetos > Efectos` del mapa, con variante identificable; conservar seleccionar, centrar, ocultar y eliminar.
- Propiedades a la derecha: variante, geometria aplicable, medidas, intensidad, velocidad, opacidad, chispas, visibilidad y guia para cono/circulo.
- La variante se elige al crear. No convertir una linea existente a cono/circulo en esta entrega.
- Guardar ID, variante, geometria mundial, parametros visuales, visibilidad, guia y datos minimos de semilla/reloj. No guardar vertices de descargas, chispas, texturas ni etiquetas derivadas.
- Mantener el formato multi-mapa version 2 con una extension aditiva de los tipos de efecto. La nueva app debe abrir todas las escenas anteriores soportadas sin agregar relampagos automaticamente.
- No se promete que binarios antiguos puedan abrir escenas que contengan el nuevo tipo de efecto; no descartar relampagos silenciosamente para aparentar esa compatibilidad.
- Mapa, relampago y guia comparten las transformaciones de mundo y brujula. La guia no se desplaza respecto al efecto al girar 90, 180 o 270 grados.
- No modificar fuego, agua, filtros de hora, niebla, oscuridad ni el comportamiento de las figuras existentes.

## 7. Criterios de aceptacion

1. Dibujar una linea muestra su longitud mientras se mueve el cursor; confirmar, mover y editar extremos conservan medidas correctas con grilla cuadrada/hexagonal y ft/m.
2. Cono editable en alcance y direccion en grados, con apertura fija de 60 grados. La guia muestra el largo sin medir apertura; girar no cambia el alcance ni la forma del sector.
3. Circulo radial, no anillo, con radio medido y editable.
4. Cono y circulo tienen guia estable y visible para DM/jugadores; ninguna etiqueta ni manivela del DM aparece en Player View.
5. Las chispas existen alrededor de las figuras, pero no alteran su area afectada ni perforan niebla.
6. Zoom, pan, norte y navegacion entre mapas no deforman ni desplazan efecto/guia, ni producen framebuffers de dimensiones cero.
7. DM y Player coinciden en geometria, identidad y fase temporal; cambiar velocidad no los desincroniza.
8. Guardar/cargar conserva los tres tipos y los mapas a los que pertenecen. Cancelar un borrador no deja objetos ni datos parciales.
9. Intensidad, opacidad, chispas, guia y visibilidad funcionan sin recrear recursos innecesarios; borrar, ocultar y descargar liberan los recursos correspondientes.
10. La integracion pasa pruebas automatizadas, revision visual y medicion con las dos ventanas Electron. El resultado de FPS del laboratorio no sustituye esa verificacion.

## 8. Referencias y estado

- Base visual: `src/renderer/lightning-lab.html` y su renderer procedural. El laboratorio sigue disponible para comparar regresiones visuales.
- Contratos relacionados: specs 04 (grilla), 05 (interaccion), 06 (paneles), 07 (medicion), 15 (Player), 29 (multi-mapa) y 30 (brujula).
- Plan tecnico: [plan.md](./plan.md).
- Implementacion autorizada por el usuario el 2026-10-03. No se ha autorizado commit, merge, nueva version o instalador en esta etapa.

## 9. Verificacion de la implementacion

- Implementadas las tres variantes, dibujo de dos clics, preview medido, handles, propiedades, arbol y persistencia por mapa.
- Cono con apertura fija; `Direccion` y alcance independientes. Circulo radial y linea con extremos independientes.
- Guia compartida debajo de niebla; ayudas editoriales exclusivamente en DM. Animacion con semilla y reloj compartidos, dos bancos de geometria y presupuesto por mapa.
- 457 pruebas automatizadas, typecheck, lint y build correctos. Regresiones de geometria, medidas, interaccion, guardado, IPC, roles, caches y recursos.
- Smoke visual en navegador y Electron con DM/Player sobre la imagen de mapa aportada: tres variantes, chispas, guias, rotacion cardinal y ocultamiento por niebla. No se ha medido todavia el benchmark prolongado de 24 efectos en ambas ventanas; no se afirma una cifra de FPS de produccion.
