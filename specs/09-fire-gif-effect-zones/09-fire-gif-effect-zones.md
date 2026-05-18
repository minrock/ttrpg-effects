# Spec 09 - Zonas de Fuego con GIF Animado

## Objetivo

Reemplazar el fuego procedural actual por el asset animado `assets/effects/fire.gif` y permitir crear zonas de fuego mas expresivas: circulos abiertos o cerrados y areas dibujadas a mano alzada que rellenen la zona con repeticiones del GIF.

## Contexto

La app ya cuenta con efectos de fuego creados desde el menu contextual, seleccionables, movibles, borrables, persistibles y opcionalmente emisores de luz. Esta spec mejora la representacion visual del fuego sin convertirlo en una simulacion fisica ni en una herramienta de reglas.

Asset fuente:

- `assets/effects/fire.gif`
- Formato: GIF animado.
- Dimensiones detectadas: `864 x 864`.
- Uso esperado: textura visual del efecto de fuego dentro de la app.

## Alcance

- Sustituir el render visual del fuego actual por el GIF `assets/effects/fire.gif`.
- Preservar obligatoriamente la transparencia del GIF al renderizarlo, incluyendo tiles y recortes.
- Mantener la creacion de fuego desde click derecho.
- Mantener seleccion, movimiento, borrado, visibilidad, opacidad, escala y emision de luz del efecto.
- Permitir que el fuego circular actual pueda alternar entre:
  - circulo cerrado, relleno o contenido por una zona circular,
  - circulo abierto, tipo aro o perimetro de fuego.
- Permitir dibujar una zona de fuego a mano alzada sobre el mapa.
- Guardar y cargar la forma de la zona de fuego dentro de `.ttrpgscene`.
- Si la zona de fuego es mas grande que el GIF, repetir el GIF en mosaico dentro de la zona.
- Colocar las repeticiones del GIF lo mas juntas posible para que el area se perciba como una superficie continua en llamas.
- Recortar o enmascarar las repeticiones para que no se salgan de la zona definida.
- Mantener el fuego por encima del mapa, la grilla y la oscuridad/fog cuando corresponda, sin tapar controles React.

## Fuera de alcance

- Simulacion fisica de propagacion de fuego.
- Danio, reglas de combate o automatizacion TTRPG.
- Colisiones con paredes, puertas u obstaculos.
- Edicion avanzada de nodos bezier para la zona a mano alzada.
- Importar multiples GIFs o libreria de efectos.
- Descargar assets externos desde la app.
- Reemplazar el sistema de luces completo.

## Modelo de interaccion

### Fuego circular

- Al crear fuego desde el menu contextual, el modo inicial puede seguir siendo un fuego circular.
- El fuego circular debe conservar un centro en coordenadas de mundo.
- Debe existir un control para alternar entre `cerrado` y `abierto`.
- En modo `cerrado`, el GIF se renderiza dentro del area circular.
- En modo `abierto`, el GIF se distribuye sobre el borde o anillo circular, dejando el centro visualmente libre.
- El radio del fuego debe poder ajustarse desde el panel de propiedades o desde handles futuros si se decide.
- El radio visual del fuego circular debe poder ajustarse arrastrando el contorno/handle del circulo seleccionado, de forma equivalente a las manivelas usadas por otras herramientas visuales.
- Si el fuego emite luz, el radio de esa luz debe poder ajustarse arrastrando un segundo contorno/handle de luz alrededor del fuego seleccionado.
- La luz emitida por el fuego debe comportarse como una luz normal frente a la capa de oscuridad: debe recortar/revelar la oscuridad y dejar ver el mapa dentro de su radio cuando `emitsLight` este activo.

### Fuego a mano alzada

- Debe existir una forma/herramienta para dibujar una zona libre de fuego.
- El usuario dibuja un trazo sobre el mapa y ese trazo se convierte en una zona de mundo persistible.
- La zona puede representarse como una lista de puntos en coordenadas de mundo.
- La zona debe cerrarse implicitamente para formar un area rellenable, salvo que el usuario elija explicitamente un modo abierto en una futura mejora.
- El render debe rellenar esa area con repeticiones del GIF.
- El trazo resultante debe poder seleccionarse, moverse y borrarse como los demas efectos.

## Render del GIF

- El motor visual debe cargar el GIF desde assets locales del proyecto, no desde rutas remotas.
- El renderer no debe acceder directamente al filesystem ni a APIs privilegiadas.
- La carga debe integrarse al pipeline de assets permitido por Electron/Vite/Pixi.
- Must-have: si el GIF contiene pixeles transparentes o canal alpha, esos pixeles deben mantenerse transparentes en el render final.
- La transparencia debe conservarse tanto en una unica instancia del fuego como en el mosaico de tiles dentro de zonas grandes.
- Si PixiJS no reproduce GIF animado directamente con la configuracion actual, la implementacion debe usar una estrategia compatible, por ejemplo:
  - decodificar frames a una textura animada,
  - usar una extension de PixiJS para GIF si es liviana y justificable,
  - convertir el GIF a sprite sheet dentro del pipeline de assets si resulta mas estable.
- La decision tecnica final debe quedar documentada en el plan de implementacion.
- El GIF debe poder respetar opacidad y escala del efecto.
- Las repeticiones deben limpiarse al destruir o actualizar la escena para evitar fugas de texturas/listeners.

## Mosaico y recorte

- Para zonas mayores al GIF, se debe crear un patron de tiles.
- Los tiles deben ubicarse sin espacios visibles o con solapamiento minimo si ayuda a ocultar bordes.
- El patron debe recortarse por la geometria de la zona:
  - circulo cerrado,
  - anillo/circulo abierto,
  - poligono generado por mano alzada.
- La densidad visual debe priorizar continuidad del fuego sobre exactitud geometrica perfecta.
- El tileado debe tener limites razonables para no degradar rendimiento con areas enormes.

## Persistencia

La escena debe conservar los datos necesarios para reconstruir el fuego:

- `id` estable.
- Tipo de efecto `fire`.
- Modo de zona: `circle` o `freehand`.
- Variante de circulo: `closed` o `open`.
- Posicion o puntos en coordenadas de mundo.
- Radio cuando aplique.
- Escala.
- Opacidad.
- Visibilidad.
- Emision de luz y radio de luz.
- Referencia estable al asset interno de fuego, sin depender de rutas absolutas del usuario.

## UI / UX

- La herramienta debe seguir siendo discreta y usable durante una sesion.
- El panel de propiedades del fuego debe incluir la opcion de alternar circulo abierto/cerrado.
- Al seleccionar un fuego circular, el canvas debe mostrar handles diferenciados para cambiar el radio de la zona de fuego y el radio de la luz emitida.
- El flujo para dibujar a mano alzada no debe bloquear pan, zoom, seleccion ni borrado.
- `Escape` debe cancelar el dibujo a mano alzada si aun no se ha confirmado.
- `Delete` o `Backspace` deben borrar una zona de fuego seleccionada.
- El usuario debe poder ver claramente el area que se va creando mientras dibuja.

## Criterios de aceptacion

- El fuego visible usa `assets/effects/fire.gif` o una derivacion tecnica documentada de ese mismo asset.
- La transparencia del GIF se preserva; no debe verse un fondo cuadrado u opaco alrededor de las llamas.
- Crear fuego desde click derecho muestra el nuevo efecto animado.
- Un fuego circular puede alternar entre modo cerrado y modo abierto.
- En modo cerrado, el fuego rellena la zona circular.
- En modo abierto, el fuego se percibe como un aro/perimetro y deja libre el centro.
- El usuario puede dibujar una zona de fuego a mano alzada.
- Una zona a mano alzada se rellena con repeticiones del GIF.
- Si la zona es mayor que el GIF, el GIF se repite de forma continua y recortada por la zona.
- El fuego conserva seleccion, movimiento, borrado, opacidad, escala y emision de luz.
- El usuario puede modificar el radio visual del fuego circular arrastrando su contorno/handle.
- El usuario puede modificar el radio de luz del fuego arrastrando su contorno/handle de luz.
- La luz del fuego revela el mapa a traves de la capa de oscuridad igual que una luz normal.
- Guardar y cargar escena conserva el modo de zona y la geometria del fuego.
- No se agregan accesos directos del renderer a Node.js, Electron internals o filesystem.

## Riesgos

- Los GIFs animados pueden no reproducirse de forma nativa en PixiJS segun version/configuracion.
- Un GIF de `864 x 864` y `19 MB` puede impactar memoria si se repite demasiadas veces.
- Tilear muchas copias animadas puede ser costoso con mapas grandes o areas extensas.
- Recortar patrones animados por mascaras complejas puede exponer diferencias entre WebGL/Canvas.
- El dibujo a mano alzada puede generar demasiados puntos si no se simplifica el trazo.

## Notas de implementacion

- Preferir un adapter de render para fuego en `src/render/pixi` y mantener reglas de geometria en `domain`.
- Simplificar o decimar puntos de mano alzada antes de persistirlos.
- Considerar un limite maximo de tiles visibles por efecto y avisar o degradar de forma controlada si se supera.
- Mantener el asset bajo `assets/effects/fire.gif` como fuente canonica.
- Documentar en el plan si el asset se usa como GIF directo, sprite sheet generado o textura animada derivada.
