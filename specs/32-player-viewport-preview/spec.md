# Spec 32 - Preview del viewport de Player View en DM

## Estado

Implementada para revision.

## Objetivo

Mostrar en el canvas del DM un rectangulo que represente exactamente el area del mundo que Player View esta mostrando a los jugadores.

El rectangulo debe aparecer como feedback temporal cuando el DM mueve la camara principal del jugador, y debe permanecer visible cuando Player View esta desincronizada y existe una camara auxiliar. El objetivo es que el DM pueda dirigir la vista proyectada con precision, entendiendo el encuadre real del jugador segun el tamano y orientacion de su ventana.

## Contexto

El control de camara de jugador actual permite al DM posicionar una camara principal y detectar una camara auxiliar cuando Player View se desincroniza. Sin embargo, el indicador actual representa principalmente el centro de la camara, no el area visible real.

En mesa, el DM necesita saber que porcion del mapa, fog, tokens, habitaciones y conexiones se esta viendo en la pantalla/proyector del jugador. Ese encuadre depende de:

- tamano real de la ventana de Player View;
- orientacion y aspect ratio de esa ventana;
- zoom efectivo de Player View;
- centro de camara;
- orientacion cardinal del mapa activo y rotacion aplicada a Player View.

Esta spec agrega un overlay privado para el DM que dibuja el area visible real de Player View sobre el canvas del DM.

## Definiciones

- **Viewport de jugador:** area rectangular del contenido visible en Player View, medida en pixeles CSS despues de descontar cualquier overlay local que no cambie el canvas.
- **Preview de viewport:** rectangulo dibujado en el canvas del DM que representa el area de mundo visible en Player View.
- **Preview principal:** rectangulo asociado a la camara principal del jugador controlada por el DM.
- **Preview auxiliar:** rectangulo asociado a la camara auxiliar, es decir, la camara efectiva real reportada por Player View cuando esta desincronizada.
- **Camara principal:** camara esperada por el DM segun `specs/24-player-camera-control/spec.md`.
- **Camara auxiliar:** camara efectiva real de Player View cuando no coincide con la camara principal.
- **Sincronizado:** estado en el que centro, zoom y mapa activo efectivos de Player View coinciden con la camara principal dentro de tolerancias definidas.
- **Desincronizado:** estado en el que Player View reporta una camara efectiva distinta a la principal.

## Alcance

### Incluido

- Calcular el area visible real de Player View usando el tamano actual de su ventana/canvas.
- Reportar al DM el tamano del viewport de jugador y sus cambios por resize, pantalla u orientacion.
- Dibujar en el canvas del DM un rectangulo de preview durante el drag de la camara principal.
- Mantener visible el preview principal mientras el DM arrastra la camara principal.
- Al soltar la camara principal, mantener el preview principal durante 3 segundos y luego ocultarlo con fade-out.
- Si Player View esta desincronizada, mostrar un preview auxiliar permanente asociado a la camara auxiliar.
- Dibujar el preview auxiliar en azul, coherente con el color visual de la camara auxiliar actual.
- Ocultar el preview auxiliar cuando se reciba o detecte el evento de resincronizacion.
- Si la camara principal se mueve mientras existe camara auxiliar desincronizada, no mostrar el preview principal temporal hasta que Player View vuelva a sincronizarse.
- Una vez resincronizado, el preview vuelve a comportarse como preview principal temporal durante futuros drags.
- Considerar la orientacion de pantalla y aspect ratio real de Player View.
- Considerar la orientacion cardinal del mapa activo aplicada por la brujula al calcular el rectangulo visible.
- Mantener el preview como overlay privado del DM: no aparece en Player View y no se persiste en la escena.

### Fuera de alcance

- Multiples Player Views simultaneas.
- Un preview distinto por jugador.
- Persistir preferencias del preview en `.ttrpgscene`.
- Permitir editar el viewport arrastrando los bordes del rectangulo.
- Animaciones cinematicas o keyframes de camara.
- Mostrar safe areas de proyector, overscan o limites fisicos de pantalla.
- Calibrar monitores externos desde el sistema operativo.
- Cambiar el tamano de Player View desde el DM.
- Agregar controles nuevos en Player View.

## Modelo funcional

Player View debe reportar al DM un estado efimero de viewport:

- `width`: ancho visible del canvas de jugador en pixeles CSS.
- `height`: alto visible del canvas de jugador en pixeles CSS.
- `devicePixelRatio`: valor informativo para diagnostico; el calculo visual debe basarse en pixeles CSS salvo que el motor requiera otra unidad.
- `orientation`: `landscape`, `portrait` o equivalente derivado de `width >= height`.
- `camera.center`: centro visible en coordenadas de mundo.
- `camera.zoom`: zoom efectivo de Player View.
- `mapId`: mapa activo que esta renderizando Player View.
- `revision`: revision monotona para ordenar reportes.

El DM usa ese estado para calcular los limites de mundo visibles en Player View:

- ancho de mundo visible = `viewportWidth / zoom`.
- alto de mundo visible = `viewportHeight / zoom`.
- centro = centro de la camara principal o auxiliar segun el caso.
- si Player View aplica rotacion por brujula, el preview debe representar el area real visible despues de esa rotacion.

Cuando el mapa activo tiene orientacion cardinal distinta de `0`, el rectangulo en mundo puede requerir una transformacion equivalente a la usada en Player View para que el area dibujada en DM coincida con lo proyectado. La implementacion puede representarlo como rectangulo rotado o como poligono de cuatro vertices si el sistema de render lo necesita, pero funcionalmente debe verse como el marco del area visible real.

## Reglas funcionales

### Inicializacion y disponibilidad

1. Si Player View no esta abierta, el DM no muestra preview de viewport.
2. Al abrir Player View, esta reporta su tamano visible inicial y camara efectiva.
3. Si Player View cambia de tamano, pantalla, orientacion o escala efectiva, reporta el nuevo viewport al DM.
4. Si Player View se cierra, el DM elimina cualquier preview principal o auxiliar.
5. Cargar escena, crear escena nueva o cambiar mapa activo limpia previews obsoletos hasta recibir un reporte compatible del mapa activo.

### Preview principal durante drag del DM

1. Al comenzar a arrastrar la camara principal, el DM muestra el preview principal.
2. El preview principal usa el centro y zoom de la camara principal.
3. El tamano del preview principal usa el ultimo tamano reportado por Player View.
4. Mientras se arrastra, el preview se actualiza en tiempo real con el centro de la camara principal.
5. El preview principal no debe modificar la escena, ni Player View, ni la camara local del DM.
6. Al soltar la camara principal, el preview permanece visible durante 3 segundos.
7. Despues de esos 3 segundos, el preview hace fade-out y desaparece.
8. Si durante los 3 segundos comienza otro drag de camara principal, se cancela el fade anterior y el preview vuelve a estado visible.
9. Si Player View se desincroniza durante o despues del drag, prevalecen las reglas de preview auxiliar.

### Preview auxiliar en desincronizacion

1. Cuando Player View reporta una camara efectiva distinta a la principal, el estado pasa a desincronizado.
2. En estado desincronizado se muestra un preview auxiliar permanente.
3. El preview auxiliar representa el area real que Player View esta viendo, usando su centro, zoom y tamano reportados.
4. El preview auxiliar usa color azul y debe asociarse visualmente con la camara auxiliar actual.
5. El preview auxiliar no hace fade-out mientras Player View siga desincronizada.
6. Si el jugador mueve o hace zoom local en Player View mientras sigue desincronizado, el preview auxiliar se actualiza, no se duplica.
7. Si Player View vuelve manualmente al centro y zoom de la camara principal dentro de tolerancias, se emite/detecta sincronizacion y el preview auxiliar desaparece.
8. Si el DM usa `Recentrar jugador`, el preview auxiliar puede mantenerse visible mientras se espera confirmacion.
9. Cuando Player View confirma la camara principal, el preview auxiliar desaparece.

### Interaccion entre camara principal y auxiliar

1. Si existe camara auxiliar desincronizada y el DM mueve la camara principal, no se muestra el preview principal temporal.
2. En ese caso, solo permanece visible el preview auxiliar, porque representa lo que el jugador realmente esta viendo.
3. Si mover la camara principal hace que la camara principal coincida con la auxiliar dentro de tolerancias, el sistema debe emitir/detectar sincronizacion y ocultar el preview auxiliar.
4. Si el DM mueve la camara auxiliar hacia la principal mediante una accion de sincronizacion existente, el preview auxiliar desaparece al confirmarse la sincronizacion.
5. Si el jugador o el DM hacen que ambas camaras coincidan por cualquier flujo valido, se considera el mismo evento de sincronizacion y se limpian previews auxiliares.
6. Despues de sincronizar, el siguiente drag de la camara principal vuelve a mostrar el preview principal temporal.

### Camara principal moviendose con auxiliar presente

1. Mientras Player View esta desincronizada, los movimientos de la camara principal no deben producir previews temporales.
2. La razon funcional es evitar mostrarle al DM un rectangulo que no corresponde a lo que los jugadores estan viendo.
3. El DM debe seguir viendo el preview auxiliar permanente hasta que el estado vuelva a sincronizado.
4. Las ordenes de recentrado siguen funcionando igual que en `specs/24-player-camera-control/spec.md`.

### Resize, pantalla y orientacion

1. Player View debe recalcular su viewport al montar, al cambiar el tamano de ventana y cuando cambie la orientacion efectiva.
2. El preview debe respetar portrait y landscape sin asumir un aspect ratio fijo.
3. Si Player View esta en un monitor vertical, el preview debe ser alto y angosto.
4. Si Player View esta en un monitor horizontal, el preview debe ser ancho y bajo.
5. Cambios de fullscreen, maximizado, redimensionado manual o movimiento entre pantallas deben reflejarse en el siguiente reporte de viewport.
6. No se requiere detectar el monitor fisico por API nativa si el tamano del canvas reportado representa correctamente lo visible.

### Brujula y rotacion de Player View

1. El preview debe coincidir con el mundo visible real aun cuando Player View este rotado por la orientacion de brujula del mapa.
2. La brujula visual de Player View no altera el area visible y no debe ser considerada en el calculo.
3. La rotacion por brujula puede hacer que el area visible en coordenadas del mapa original no sea un rectangulo alineado a ejes.
4. Si la orientacion del mapa activo cambia mientras Player View esta abierta, el preview debe actualizarse con la nueva transformacion.
5. El overlay del DM debe mantenerse en coordenadas de mundo y no debe rotar con la camara local del DM.

### Visibilidad y estilo

1. El preview debe dibujarse solo en el canvas del DM.
2. El preview debe renderizarse por encima del mapa y las capas tacticas, pero debajo de modales, menus contextuales y UI React.
3. El preview no debe capturar eventos de puntero ni bloquear herramientas del DM.
4. El preview principal debe ser visible durante drag sin confundirse con seleccion, mediciones, shapes o anotaciones.
5. El preview auxiliar debe ser azul y permanente mientras dure la desincronizacion.
6. El fade-out del preview principal debe durar lo suficiente para sentirse suave, pero no debe exceder el estado funcional de 3 segundos posteriores al drag.
7. Si hay zoom alto o bajo en el viewport del DM, el borde debe seguir siendo legible con grosor estable en pantalla.
8. Debe evitarse llenar el rectangulo con una opacidad que tape detalles importantes del mapa.

## Interfaz esperada

### Canvas del DM

- Durante drag de camara principal sincronizada:
  - aparece un marco de preview sobre el mapa;
  - el marco se mueve con la camara principal;
  - al soltar, queda visible 3 segundos y luego se desvanece.
- En estado desincronizado:
  - aparece un marco azul permanente sobre el area real de Player View;
  - el marco sigue a la camara auxiliar;
  - desaparece al sincronizar.

### Player View

- No muestra ningun rectangulo de preview.
- No agrega controles nuevos.
- Reporta tamano/camara al DM de forma transparente.
- Conserva pan, zoom, bloqueo de zoom y brujula segun specs existentes.

### Controles del DM

- No se requieren nuevos botones para esta spec.
- Se reutilizan las acciones existentes de camara principal, camara auxiliar y recentrado.
- Si ya existe un indicador de sincronizado/desincronizado, debe seguir siendo la fuente visual principal del estado; el rectangulo complementa ese indicador.

## Casos de uso

### El DM mueve la camara principal con Player View sincronizado

1. Player View esta abierta y sincronizada.
2. El DM comienza a arrastrar la camara principal.
3. Aparece el preview principal con el tamano real del viewport del jugador.
4. El DM mueve la camara principal y el rectangulo actualiza su posicion.
5. El DM suelta la camara.
6. Player View recibe la orden de camara.
7. El preview permanece 3 segundos.
8. El preview hace fade-out y desaparece.

### Player View esta en pantalla vertical

1. Player View esta abierta en una ventana alta y angosta.
2. Player View reporta su viewport portrait.
3. El DM arrastra la camara principal.
4. El preview aparece alto y angosto, mostrando la porcion real que los jugadores veran.

### Player View se desincroniza

1. Player View esta sincronizada.
2. El jugador hace pan o zoom local.
3. Player View reporta su nueva camara efectiva.
4. El DM detecta desincronizacion.
5. Aparece un preview auxiliar azul permanente sobre el area real que ve el jugador.
6. El preview se mantiene hasta sincronizar.

### El DM mueve la camara principal mientras hay camara auxiliar

1. Player View esta desincronizada y se muestra el preview auxiliar azul.
2. El DM mueve la camara principal.
3. No aparece preview principal temporal.
4. El preview auxiliar azul sigue mostrando lo que el jugador realmente ve.
5. Al sincronizar, el preview auxiliar desaparece.

### Cambio de orientacion por brujula

1. Player View esta abierta.
2. El mapa activo tiene norte configurado hacia la derecha.
3. Player View rota el mundo para presentar ese norte hacia arriba.
4. El preview del DM representa el area visible real despues de esa rotacion.
5. El DM puede usar el rectangulo sin hacer conversion mental de orientacion.

## Compatibilidad con specs existentes

Esta spec actualiza el alcance de `specs/24-player-camera-control/spec.md`:

- Lo que antes estaba fuera de alcance como "vista previa rectangular exacta del viewport del jugador" ahora queda incluido.
- La camara principal y auxiliar siguen siendo efimeras y no se persisten.
- La sincronizacion/desincronizacion sigue usando el contrato de camara del spec 24.

Tambien se integra con:

- `specs/15-player-window/spec.md`, porque Player View debe reportar su tamano visible real.
- `specs/30-map-compass/spec.md`, porque el calculo del preview debe considerar la rotacion visual aplicada en Player View.

## Criterios de aceptacion

- Al abrir Player View y mover la camara principal, el DM ve un rectangulo proporcional al tamano real de la ventana de jugador.
- El rectangulo aparece al iniciar drag de la camara principal y sigue el movimiento.
- Al soltar drag, el rectangulo permanece 3 segundos y luego desaparece con fade-out.
- Si Player View se redimensiona, el siguiente preview usa el nuevo aspect ratio.
- Si Player View esta desincronizada, se muestra un rectangulo azul permanente para la camara auxiliar.
- Mientras haya camara auxiliar desincronizada, mover la camara principal no muestra un preview principal temporal.
- Al resincronizar por cualquier flujo valido, el rectangulo auxiliar desaparece.
- La rotacion por brujula no rompe la correspondencia entre el preview y lo visto en Player View.
- El preview nunca aparece en Player View.
- El preview no bloquea clicks, drags ni herramientas existentes del DM.
- No se modifica el formato `.ttrpgscene`.
