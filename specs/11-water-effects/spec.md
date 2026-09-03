# Spec - Efectos de Agua

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- El punto de trazo que usa snap al centro se ajusta al centro de la celda elegida, cuadrada o hexagonal, segun spec 04.
- Rios y cuerpos de agua siguen siendo lineas/poligonos continuos: no se convierten en pintado de hexagonos. Ancho, union por proximidad, texturas, rotacion, hue y saturacion mantienen comportamiento.
- Cambiar de grilla no mueve agua ya guardada ni cambia sus puntos/mascaras.


Este documento describe de forma unificada la funcionalidad de efectos de agua, consolidando el alcance funcional vigente en el proyecto.

## Aguas, rios y cuerpos de agua

### Objetivo

Agregar un efecto de agua que permita dibujar rios/riachuelos abiertos y cuerpos de agua cerrados sobre el mapa, usando tiles GIF internos para representar movimiento de agua y costa.

### Alcance

- Crear una herramienta de efecto `Agua`.
- Permitir que el usuario dibuje una linea/polilinea sobre el mapa.
- Si la linea no cierra cerca de su punto inicial, el resultado se representa como rio o riachuelo.
- Si la linea cierra cerca de su punto inicial, el resultado se representa como cuerpo de agua cerrado.
- Permitir controlar el ancho del rio/riachuelo.
- Usar assets internos del renderer, sin rutas locales ni protocolo `map-asset:`.

### Assets animados

El efecto usa 9 GIFs internos en `src/renderer/public/effects/water/`:

- `water-center.gif`: agua interior sin costa.
- `water-coast-left.gif`: costa vertical a la izquierda.
- `water-coast-right.gif`: costa vertical a la derecha.
- `water-coast-top.gif`: costa horizontal arriba.
- `water-coast-bottom.gif`: costa horizontal abajo.
- `water-coast-top-left.gif`: costa diagonal/esquina superior izquierda.
- `water-coast-top-right.gif`: costa diagonal/esquina superior derecha.
- `water-coast-bottom-left.gif`: costa diagonal/esquina inferior izquierda.
- `water-coast-bottom-right.gif`: costa diagonal/esquina inferior derecha.

Los GIFs deben ser generados o propiedad del proyecto. No se deben usar assets con licencia dudosa.

La base visual inicial del agua usa el GIF provisto por el usuario (`Q52D8P.gif`) como tile animado. Los 8 GIFs de costa se derivan aplicando mascaras sobre esa base:

- Las costas verticales y horizontales cubren una franja completa de tierra contra el borde correspondiente.
- Las costas diagonales deben ser una division diagonal completa: tierra de un lado de la diagonal y agua del otro.
- Las diagonales no deben verse como islas, parches circulares o esquinas curvas; deben leerse como costa diagonal continua.

### Dibujo de rios y riachuelos

- El usuario inicia el dibujo desde el menu contextual o el submenu de efectos.
- Click normal agrega puntos a la polilinea.
- Mientras se mueve el cursor, se muestra preview del siguiente segmento.
- `Enter` confirma el agua.
- `Escape` cancela el dibujo.
- `Backspace` elimina el ultimo punto agregado.
- Si la polilinea confirmada no termina cerca del primer punto, se guarda como `river`.
- Si un rio nuevo queda consecutivo a uno o mas rios existentes, se deben unir en un unico efecto `river`.
- Dos rios se consideran consecutivos cuando el inicio o fin de uno queda a una distancia maxima de 1 cuadro del inicio o fin del otro.
- La union de rios consecutivos debe ser iterativa: si el rio nuevo conecta dos rios existentes, los tres quedan consolidados en un solo efecto para reducir carga de render.
- El ancho del rio/riachuelo es configurable en unidades de mundo y debe poder editarse al seleccionar el efecto.
- El render del rio usa agua animada en el centro y costa animada a ambos lados del trazo.
- El GIF de agua del rio debe repetirse muchas veces a lo largo del trazo, cada cierta distancia, en lugar de estirarse como una unica textura sobre todo el bounding box.
- Los tiles GIF del rio deben ser pequenos y distribuirse de forma continua sin solaparse entre si; el espaciado base debe coincidir con el tamano visual del tile para evitar apilamiento.
- Los extremos redondeados y esquinas/puntos intermedios del rio tambien deben recibir tiles GIF centrados sobre cada punto para evitar huecos sin textura dentro de la mascara.
- El rio debe exponer una manivela de rotacion sobre un circulo de seleccion para girar la direccion visual del GIF sin mover la geometria del cauce.
- El rio debe exponer una segunda manivela sobre otro circulo de seleccion para rotar la geometria de la linea/cauce sin rotar el GIF por separado.
- Los dos circulos de rotacion deben tener suficiente separacion visual para que sus manivelas se puedan manipular sin interferirse.
- El panel lateral derecho debe permitir ajustar `hue` y `saturation` del GIF de agua.

### Dibujo de cuerpos cerrados

- Si al confirmar la polilinea el ultimo punto queda cerca del punto inicial, se cierra el loop automaticamente.
- El resultado se guarda como `water-body`.
- El borde del poligono cerrado se renderiza con costa animada.
- El interior del poligono se rellena con `water-center.gif`.
- El interior del cuerpo de agua debe rellenarse con varios GIFs repetidos en mosaico y recortados por la mascara del poligono, no con un unico GIF estirado a todo el bounding box.
- Los tiles GIF del cuerpo de agua deben ser pequenos y formar un mosaico continuo sin solapamiento intencional entre tiles.
- El cuerpo cerrado debe exponer los mismos dos controles de rotacion que el rio: una manivela para orientar la geometria completa del poligono y otra para rotar el patron GIF en mosaico sin mover la forma.
- Los dos circulos de rotacion del cuerpo cerrado deben tener suficiente separacion visual para evitar interferencias al arrastrar.
- El cuerpo cerrado debe conservar su forma al seleccionarlo, moverlo, guardarlo y cargarlo.

### Reglas de cierre

- La deteccion de loop debe usar una distancia configurable o constante razonable basada en el tamano de celda actual.
- El cierre debe comparar el ultimo punto con el primer punto en coordenadas de mundo.
- Si el usuario confirma con menos de 2 puntos, no se crea agua.
- Si el usuario confirma un loop con menos de 3 puntos utiles, no se crea cuerpo cerrado.

### Persistencia

La escena debe conservar:

- `id` estable.
- Tipo de efecto `water`.
- Variante `river` o `water-body`.
- Puntos en coordenadas de mundo.
- Ancho en modo `river`.
- Rotacion del patron de agua en modo `river` y `water-body`.
- Rotacion de la linea/cauce o geometria del poligono en modo `river` y `water-body`.
- Hue y saturacion del GIF.
- Visibilidad.
- Opacidad.
- Orden de render.

### Render

- El agua debe renderizarse sobre el mapa y debajo de figuras, mediciones, tokens y UI de seleccion.
- La animacion se carga como asset interno del renderer.
- El render debe reutilizar patrones/tile sprites o sprites enmascarados para evitar crear demasiados objetos cuando el area sea grande.
- El render debe destruir los objetos Pixi retirados de capas dinamicas al refrescar para evitar acumulacion de sprites/graphics.
- La limpieza de capas dinamicas debe ser compatible con `GifSprite`: remover hijos recursivamente y destruir cada objeto sin pasar opciones de destruccion de texturas que puedan romper sprites animados compartidos.
- Para rios o cuerpos muy grandes, el render puede aumentar progresivamente el tamano de tile hasta un limite documentado para mantener una cantidad razonable de sprites animados.
- El agua no debe revelar oscuridad por si misma; si en el futuro se agrega brillo/reflejo, debe definirse en otro spec.

### Criterios de aceptacion

- Existen los 9 GIFs internos del efecto de agua.
- El usuario puede dibujar una linea abierta y confirmar un rio/riachuelo.
- Varios rios consecutivos se consolidan automaticamente en un solo efecto si sus extremos quedan a 1 cuadro o menos.
- El usuario puede dibujar un loop y confirmar un cuerpo cerrado.
- El rio permite editar su ancho desde propiedades.
- El rio permite editar la rotacion del patron de agua arrastrando la manivela sobre el circulo externo de seleccion.
- El rio permite editar la rotacion de la linea/cauce arrastrando una manivela separada sobre otro circulo de seleccion.
- El cuerpo cerrado permite editar la orientacion de su poligono y la rotacion del patron GIF con las mismas dos manivelas separadas.
- Los controles de `hue` y `saturation` del GIF aparecen en el aside derecho y se guardan en la escena.
- El cuerpo cerrado rellena su interior con agua y conserva costa en el borde.
- El cuerpo cerrado usa multiples tiles GIF repetidos dentro de la mascara del poligono para evitar que el agua se vea estirada.
- Los efectos de agua se guardan y cargan en `.ttrpgscene`.
- Los assets se cargan desde rutas internas del renderer.

## Usabilidad de controles de agua

- Escalar trazos, manivelas y tolerancia de hit testing como herramientas de area (spec 01).
- Mantener un gap minimo de 42 px en zoom-out entre aros de orientacion de geometria y patron; no escalar el cuerpo de agua ni los tiles al escalar controles.
- Rios y cuerpos cerrados aparecen en el arbol de Efectos para seleccionar, centrar y borrar (spec 06).
- Los controles no aparecen en jugador ni agregan trabajo de animacion por frame.

## Cierre 1.9.0

Los cambios de controles de efectos, arbol de objetos y/o grilla descritos en las extensiones de esta especificacion fueron aceptados por el usuario el 2026-09-02 para cierre en main. El plan registra la verificacion realizada; los pendientes historicos ajenos a estas extensiones no se consideran ejecutados por este cierre.
