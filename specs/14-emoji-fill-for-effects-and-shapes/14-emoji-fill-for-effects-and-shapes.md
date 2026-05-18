# Spec 14 - Relleno de Emojis para Efectos y Formas

## Objetivo

Permitir que efectos y formas rendericen emojis representativos dentro de su área, para que el mapa proyectado comunique visualmente qué elemento existe en una zona sin depender solo de contornos o colores.

## Contexto

La app ya permite:

- Dibujar fuego como círculo o como celdas pintadas.
- Crear formas tácticas: línea, círculo, cono y rectángulo.
- Seleccionar, mover, redimensionar y borrar formas.
- Configurar grilla, unidad y tamaño de casilla.
- Renderizar efectos y formas en PixiJS sobre el mapa.

Actualmente las áreas se representan con rellenos de color y bordes. Esta spec añade una capa visual adicional basada en emojis, útil para identificar zonas como fuego, veneno, hielo, magia u otros estados futuros.

## Alcance

- Renderizar emojis dentro de zonas de fuego.
- Renderizar emojis dentro de formas de área, excepto línea.
- Renderizar emojis distribuidos sobre líneas.
- Usar `🔥` como emoji obligatorio para fuego.
- Usar un emoji configurable o asociado para formas tácticas.
- Distribuir emojis en patrón tipo mosaico con ligera aleatoriedad visual dentro del área.
- Para líneas, distribuir emojis de manera equitativa a lo largo del segmento, al menos uno por cada cuadro de grilla.
- Mantener selección, movimiento, resize y borrado funcionando.
- Mantener persistencia suficiente para que una escena guardada pueda restaurar el emoji elegido por forma si se agrega configuración.

## Fuera de alcance

- Animar emojis.
- Usar sprites o imágenes externas en lugar de emojis.
- Crear un editor avanzado de patrones.
- Permitir emojis por cada celda individual dentro de una misma forma.
- Cambiar reglas de oscuridad, darkvision, niebla o luces.
- Cambiar el sistema de formas tácticas más allá de su decoración visual.
- Aplicar emojis a mapas, grilla, luces o tokens futuros.

## Modelo de interacción

### Fuego

- El fuego siempre usa el emoji `🔥`.
- Si el fuego es circular:
  - Los emojis se distribuyen dentro del círculo.
  - El patrón debe cubrir la zona sin saturarla.
  - La distribución usa el centro/centroide del fuego como referencia.
- Si el fuego está pintado por cuadrados:
  - Cada cuadrado de fuego puede mostrar uno o más emojis `🔥`.
  - Como mínimo debe haber una presencia clara de fuego por celda pintada.
  - Los emojis no deben aparecer fuera de las celdas pintadas.

### Formas de área

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

### Línea

Aplica a la forma interna `measurement`, usada como línea.

Reglas:

- La línea puede tener un emoji representativo.
- Los emojis se distribuyen a lo largo del segmento.
- La separación debe ser equitativa.
- Debe colocarse al menos un emoji por cada cuadro de grilla atravesado por la línea, usando `grid.cellSizeWorld` como referencia.
- Si la línea es más corta que una casilla, debe mostrar al menos un emoji.
- Los emojis deben seguir la dirección de la línea en posición, pero no es obligatorio rotar el glifo.

## Configuración de emoji

Decisión inicial propuesta:

- Fuego: fijo en `🔥`.
- Formas tácticas: agregar una propiedad opcional de emoji por forma, por ejemplo `emoji?: string`.
- Si una forma no tiene emoji configurado, no renderiza emojis o usa un default según tipo si se decide en el plan.

Requisitos:

- El emoji debe ser una cadena corta.
- Si se persiste, debe guardarse dentro del modelo de escena de la forma.
- Escenas antiguas sin emoji deben cargar sin cambios.
- El renderer debe tolerar emojis vacíos o inválidos sin romper.

## Reglas visuales

- Los emojis deben renderizarse sobre el relleno de la forma o fuego, pero debajo de selección/handles.
- El tamaño del emoji debe escalar de forma legible con la grilla.
- Valor sugerido inicial: entre `0.35` y `0.55` del tamaño de celda.
- La opacidad debe ser suficiente para verse en proyección, sin tapar completamente el mapa.
- El patrón debe evitar que los emojis se salgan visualmente del área.
- Para áreas pequeñas, renderizar pocos emojis o uno centrado.

## Reglas de distribución

### Mosaico para áreas

- Generar candidatos en una grilla interna basada en `grid.cellSizeWorld`.
- Aplicar jitter estable a cada candidato para que no se vea perfectamente mecánico.
- Filtrar candidatos que queden fuera de la geometría.
- Usar una semilla estable basada en el `id` del elemento, tipo y coordenadas principales.
- Recalcular cuando cambie geometría, radio, tamaño, posición, dirección o grilla.

### Línea

- Calcular longitud del segmento en coordenadas de mundo.
- Calcular cantidad como `max(1, floor(longitud / grid.cellSizeWorld))`.
- Distribuir puntos interpolados desde inicio hasta fin.
- Evitar colocar emojis exactamente encima de handles si es posible.

## Persistencia

Fuego:

- No requiere campo nuevo para emoji, porque usa `🔥` fijo.

Formas:

- Si se permite emoji configurable, agregar `emoji?: string` a `SceneShape`.
- El schema debe aceptar escenas antiguas sin `emoji`.
- Guardar/cargar debe preservar el emoji configurado.

## Render / PixiJS

- La implementación debe vivir encapsulada en `src/render/pixi`.
- Usar texto Pixi para renderizar emojis.
- Mantener los emojis dentro de capas existentes:
  - fuego dentro de capa de efectos,
  - formas dentro de capa de shapes/measurements,
  - selección y handles por encima.
- Evitar recrear patrones costosos en cada frame si no cambió la escena.
- Limpiar textos al redibujar capas.

## Criterios de aceptación

- El fuego circular muestra varios emojis `🔥` dentro de su área.
- El fuego pintado en celdas muestra emojis `🔥` dentro de las celdas pintadas.
- Los emojis de fuego no aparecen fuera del círculo o fuera de las celdas.
- Círculos, conos y rectángulos pueden renderizar un emoji dentro del área.
- La línea puede renderizar emojis distribuidos a lo largo del segmento.
- La línea muestra al menos un emoji por cuadro de grilla de longitud aproximada.
- El patrón de área usa posiciones tipo mosaico con variación visual estable.
- Al mover o redimensionar un elemento, los emojis se actualizan con la geometría.
- La selección y los handles siguen viéndose por encima de los emojis.
- Guardar/cargar conserva emojis configurados en formas si se agrega esa propiedad.
- Escenas antiguas sin emojis cargan sin errores.
- No se agregan accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.

## Riesgos

- Renderizar muchos emojis puede afectar rendimiento en mapas grandes o áreas enormes.
- Emojis pueden variar visualmente entre sistemas operativos.
- La aleatoriedad puede verse como parpadeo si no es estable.
- Los emojis pueden tapar demasiado el mapa si son grandes o muy densos.
- Persistir emojis implica migración suave del schema de formas.

## Notas de implementación

- Empezar con una densidad conservadora y ajustar manualmente.
- Usar una función determinista simple para jitter por elemento.
- Para fuego por celdas, usar el centro de cada celda como ubicación base.
- Para formas, considerar helpers puros para `pointInCircle`, `pointInCone`, `pointInRect` si la lógica crece.
- En el plan decidir si las formas tienen emoji por defecto o si se agrega UI para configurarlo.
