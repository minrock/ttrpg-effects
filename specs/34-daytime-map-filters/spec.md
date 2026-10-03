# Spec 34 - Filtros de hora del dia por escena

## Estado

Implementado en `feature/daytime-map-filters`; pendiente de validacion funcional y cierre de la feature.

## Objetivo

Permitir al DM ambientar visualmente una escena con un filtro de hora del dia. El filtro puede cubrir todos los mapas de la escena o solamente las zonas que el DM haya pintado en cada mapa. Las zonas pintadas de todos los mapas comparten siempre la misma hora del dia activa.

La primera iteracion cubre tres momentos: dia, atardecer y noche. Clima, transiciones animadas, horas continuas y filtros combinables quedan para specs posteriores.

## Contexto

Una misma escena puede estar compuesta por mapas que representan distintas habitaciones, niveles o porciones de un entorno. El DM necesita comunicar el avance del tiempo sin editar las imagenes originales ni configurar de nuevo el efecto en cada mapa.

La hora del dia es una decision narrativa de nivel escena. La cobertura visual, en cambio, puede ser global o depender de las partes que el DM marco dentro de cada mapa. Por ello, cambiar de dia a atardecer o noche debe actualizar todas las zonas ya pintadas de la escena, aunque los mapas inactivos solo se rendericen cuando se vuelvan a abrir.

## Definiciones

- **Hora del dia:** preset visual comun de la escena: `dia`, `atardecer` o `noche`.
- **Filtro de ambiente:** transformacion visual no destructiva aplicada a la imagen base del mapa.
- **Cobertura global:** el filtro cubre la imagen completa de todos los mapas de la escena.
- **Cobertura pintada:** el filtro cubre solamente la union de las celdas marcadas en cada mapa.
- **Zona pintada:** region de cobertura creada con topologia de grilla o con pincel circular. Varias pinceladas forman una unica cobertura por mapa y no poseen presets independientes.
- **Mascara de mapa:** mascara compuesta y cacheable que delimita donde el filtro de escena puede transformar la imagen del mapa.
- **Pincel topologico:** pinta las celdas cuadradas o hexagonales de la grilla activa.
- **Pincel circular:** pinta discos y trazos circulares en coordenadas de mundo, sin depender de que el mapa tenga una grilla regular.

## Alcance

### Incluido

- Elegir una hora del dia unica a nivel escena: dia, atardecer o noche.
- Activar o desactivar el filtro de ambiente sin borrar las zonas pintadas.
- Elegir entre cobertura global para toda la escena y cobertura pintada por mapa.
- Pintar y borrar zonas de cobertura sobre el mapa activo con pincel topologico o circular.
- Usar la topologia y el tamano de la grilla activa cuando se selecciona el pincel topologico: celda cuadrada o hexagonal segun el mapa.
- Permitir pincel circular con radio configurable para mapas irregulares o sin una grilla util para delimitar las zonas.
- Permitir pintar varias zonas desconectadas dentro de un mismo mapa.
- Aplicar el mismo preset activo a todas las zonas pintadas en todos los mapas de la escena.
- Actualizar inmediatamente el mapa activo al cambiar preset o cobertura.
- Aplicar el preset vigente a un mapa inactivo cuando este se carga o vuelve a ser activo.
- Reflejar el resultado visual en DM View y Player View.
- Guardar el preset de escena y las mascaras de cada mapa dentro de `.ttrpgscene`.
- Cargar escenas existentes sin filtros ni zonas pintadas con defaults compatibles.

### Fuera de alcance

- Lluvia, nieve, niebla atmosferica, viento, tormentas u otros efectos de clima.
- Selector de hora continua, amanecer, mediodia, madrugada o transiciones temporizadas.
- Un preset de hora diferente por mapa o por zona.
- Opacidad, temperatura de color o parametros manuales por zona.
- Edicion de pixeles libres sin relacion con la grilla.
- Modificar permanentemente los archivos de imagen originales.
- Cambiar reglas de vision, oscuridad, fog of war, luces o darkvision.
- Animaciones de transicion entre presets.

## Reglas funcionales

### Preset unico de escena

- La escena conserva un unico estado de filtro de hora del dia con `enabled`, `preset` y `coverage`.
- `preset` admite inicialmente:
  - `dia`: aspecto neutral y luminoso, cercano a la imagen original.
  - `atardecer`: apariencia calida y ligeramente reducida en luminosidad.
  - `noche`: apariencia fria y oscura, sin convertirse en una regla de oscuridad de juego.
- Cambiar el preset desde cualquier mapa cambia el preset de la escena completa.
- En cobertura pintada, el nuevo preset se aplica a todas las mascaras existentes de todos los mapas; no se duplica ni se edita una configuracion por mapa.
- Desactivar el filtro deja de renderizarlo en todos los mapas, pero conserva preset, modo de cobertura y zonas para reactivarlos despues.

### Cobertura global

- En modo `Toda la escena`, la imagen completa de cada mapa de la escena recibe el preset activo.
- El DM no necesita pintar cada mapa individualmente.
- El renderer usa una mascara uniforme completamente revelada (blanca/opaca) para la imagen completa, sin construir geometria por celda o zona.
- Las zonas pintadas se conservan en el documento, pero no afectan el render mientras la cobertura global este activa.
- Volver a `Zonas pintadas` restaura las zonas previamente marcadas en cada mapa.

### Cobertura pintada

- En modo `Zonas pintadas`, solo reciben el filtro las partes reveladas por la mascara compuesta del mapa activo.
- Un mapa sin regiones pintadas no muestra filtro aunque otros mapas de la escena si lo hagan.
- El DM puede crear varias regiones desconectadas; todas representan la misma hora del dia activa.
- El pincel topologico agrega o elimina celdas. Una celda no se guarda dos veces.
- El pincel circular agrega o elimina regiones circulares y trazos compuestos de radio configurable. Cada pincelada se compone como una sola figura continua con extremos redondeados, no como una coleccion de discos por punto. Los puntos y radios se guardan en coordenadas de mundo, nunca en pixeles de pantalla.
- El pincel topologico usa la grilla logica aunque sus lineas esten ocultas visualmente. Si la calibracion de grilla cambia, las celdas conservan sus coordenadas de mundo ya registradas, siguiendo la politica existente para datos basados en grilla.
- El pincel circular puede usarse con grilla visible, oculta o no calibrada; su radio se muestra en unidades de mundo y se puede presentar como cantidad de cuadros cuando exista una grilla util.
- Al entrar al modo de pintado, el DM ve bajo el puntero una guia de celda o de circulo segun el pincel elegido. La guia se actualiza con cada movimiento del puntero y es privada del DM.
- Mientras el modo de pintado esta activo, las regiones ya confirmadas se muestran al DM con una sobreimpresion roja translucida uniforme y de contraste alto. El renderer rasteriza una mascara acumulada por mapa a partir de los trazos persistidos y aplica un unico overlay rojo, por lo que las pasadas superpuestas no suman opacidad. Los trazos de borrado recortan tambien esta retroalimentacion visual; Player View nunca la recibe.
- El filtro ambiental se pausa por completo mientras el modo de pintado esta activo, incluso si ya estaba habilitado. Al salir del modo, vuelve a mostrarse segun el toggle `Activar filtro`; esto deja la edicion dedicada exclusivamente a la mascara roja.
- El radio del pincel se controla y se muestra en cuadros de la grilla activa, con incrementos de `0.25` cuadros. Internamente se conserva en unidades de mundo.
- `Escape` sale del modo de pintado sin modificar las zonas ya confirmadas.

### Mascaras de render

- Cada mapa mantiene una sola mascara compuesta para su cobertura de ambiente, aunque esta se origine en varias pinceladas topologicas o circulares.
- La mascara se actualiza incrementalmente cuando el DM pinta o borra; el renderer no debe volver a calcular el filtro para regiones que no cambiaron.
- Al activar un mapa, se reutiliza o reconstruye su mascara solo si sus datos persistidos, la imagen o la calibracion relevante cambiaron.
- El filtro se aplica exclusivamente a los pixeles de imagen visibles a traves de la mascara. Las zonas transparentes de la mascara dejan la imagen sin transformar.
- En `Toda la escena`, la mascara de cada mapa es uniforme y completamente revelada. En `Zonas pintadas`, la mascara contiene solamente la union de las regiones marcadas en ese mapa.
- La mascara y sus recursos de render se liberan al destruir el viewport o sustituir la textura de mapa, siguiendo la politica actual de limpieza de PixiJS.

### Orden visual y reglas de juego

- El filtro transforma solo la imagen base del mapa, a traves de la mascara activa cuando corresponda.
- La grilla, tokens, etiquetas, formas, mediciones, anotaciones privadas, controles y overlays de UI conservan sus colores normales.
- La capa de filtro se renderiza por encima de la imagen base y por debajo de la grilla, tokens, oscuridad, luces, efectos, oscuridad magica y fog of war.
- El filtro no modifica `darkness`, `fogOfWar`, `darkvision`, luces, lineas de vision ni visibilidad de tokens. Noche es una apariencia ambiental, no una mecanica de ocultamiento.
- DM View y Player View ven el mismo filtro de ambiente del mapa activo. Las guias de pintado, controles y mascara editable solo aparecen en DM View.

### Navegacion entre mapas

- Las mascaras pertenecen al mapa donde se pintaron.
- Al cambiar de mapa, el renderer lee el preset de hora del dia de la escena y la mascara del mapa nuevo.
- Si se modifica el preset mientras otro mapa esta inactivo, no se necesita renderizar ni cargar ese mapa en segundo plano; aplicara el preset nuevo al abrirse.
- En cobertura global, cambiar de mapa siempre mantiene el filtro activo sobre la imagen completa.

## Interfaz del DM

- La tab `Mapa` del panel izquierdo incorpora una seccion plegable `Ambiente`.
- La seccion incluye:
  - toggle para activar o desactivar `Hora del dia`;
  - control segmentado `Toda la escena` / `Zonas pintadas`;
  - selector de preset `Dia`, `Atardecer`, `Noche`;
  - en `Zonas pintadas`, control segmentado para seleccionar `Topologia` o `Circular`;
  - botones de herramienta con iconos para `Pintar zonas` y `Borrar zonas`;
  - control de tamano de pincel que presenta su valor en cuadros y permite incrementos de `0.25` cuadros, tanto para topologia como para circular;
  - accion clara para borrar todas las zonas pintadas del mapa activo, con confirmacion cuando exista cobertura;
  - contador discreto de regiones y celdas pintadas en el mapa activo.
- El selector de preset permanece disponible en ambos modos, porque siempre configura la escena completa.
- Al editar el preset desde cualquier mapa, la UI comunica que el cambio aplica a todos los mapas de la escena.
- El panel no debe cubrir el canvas ni impedir pan, zoom, seleccion u otras herramientas fuera del modo de pintado activo.

## Modelo de datos esperado

El formato exacto se definira en el plan tecnico, pero debe respetar esta separacion:

- Nivel escena: estado unico de hora del dia, por ejemplo `enabled`, `preset` y `coverage`.
- Nivel mapa: regiones topologicas y circulares que forman la mascara de ambiente de ese mapa. La textura o recurso de mascara cacheado es transitorio de render y no se serializa.
- Estado transitorio: herramienta activa, hover, previsualizacion, borrador de stroke y seleccion. No se guarda.

El cambio debe ser aditivo para el formato actual de escena. Las escenas que no tengan los nuevos campos se interpretan como filtro desactivado y sin celdas pintadas.

## Criterios de aceptacion

- El DM puede activar un filtro de dia, atardecer o noche desde cualquier mapa de una escena.
- Cambiar el preset modifica visualmente el mapa activo de inmediato y aplica el mismo preset a los demas mapas cuando se abren.
- `Toda la escena` filtra la imagen completa de todos los mapas de la escena.
- `Zonas pintadas` filtra solo las regiones topologicas o circulares marcadas del mapa activo; distintos mapas pueden tener mascaras distintas.
- Dos o mas zonas pintadas de uno o varios mapas comparten siempre el mismo preset de escena.
- El DM puede agregar y borrar zonas topologicas o circulares con guia visual y retroalimentacion roja de las zonas confirmadas; Player View no ve esas ayudas.
- Player View ve el mismo resultado de ambiente que DM View para el mapa activo, respetando sus propias capas de fog y oscuridad.
- El filtro no altera tokens, grilla, UI ni reglas de oscuridad/vision.
- Guardar y cargar conserva preset, modo de cobertura y mascaras por mapa.
- Escenas existentes se cargan sin error y con el filtro desactivado.
- Cambiar de mapa no pierde ni mezcla mascaras de ambiente.

## Riesgos y mitigaciones

- **Riesgo:** aplicar filtros a toda la escena obligue a mantener texturas de mapas inactivos en memoria.
  **Mitigacion:** renderizar solamente el mapa activo; la configuracion compartida se evalua al cargar cada mapa.

- **Riesgo:** una mascara por pixel degrade rendimiento y haga dificil la persistencia.
  **Mitigacion:** persistir geometria topologica o trazos circulares y construir una sola imagen de mascara cacheable por mapa; evitar overlays por celda o por punto de mouse.

- **Riesgo:** se confunda noche ambiental con oscuridad de juego.
  **Mitigacion:** mantener datos, controles y capas separados; el preset no cambia ninguna regla de vision.

- **Riesgo:** filtros sobre tokens o UI reduzcan legibilidad durante una sesion.
  **Mitigacion:** limitar el filtro a la imagen base del mapa y mantener capas tacticas por encima.

## Decisiones para validar durante la revision

- Esta spec propone dos modos: topologia de grilla para celdas cuadradas/hexagonales y pincel circular para mapas irregulares. No incluye un pincel de pixeles libres arbitrario; ambos modos se convierten en una mascara compuesta por mapa.
- Esta spec interpreta `toda la escena` como aplicar el filtro completo a todos los mapas, no solo al mapa activo.
- Los presets iniciales son discretos (`Dia`, `Atardecer`, `Noche`); no se incluye una hora numerica continua en esta iteracion.
- El filtro se aplica a la imagen del mapa y no a tokens ni a overlays de juego. Esto deja la noche de ambiente separada de las mecanicas existentes de oscuridad y vision.

## Documentacion afectada al implementar

- `specs/29-multi-map-scenes/spec.md` y su plan, por el nuevo estado compartido de escena y las mascaras por mapa.
- `specs/15-player-window/spec.md` y su plan, por la reproduccion visual en Player View.
- `specs/01-render-engine/spec.md` y su plan, si el orden final de capas requiere una actualizacion explicita.
- `CHANGELOG.md` y `package.json` al cerrar la feature.
