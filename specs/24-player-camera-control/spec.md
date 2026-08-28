# Spec - Control de Camara de Jugador

## Estado

Aceptada.

## Objetivo

Permitir que el DM controle y supervise desde su propia ventana la camara visible de la Ventana de Jugador, sin quitar al jugador la posibilidad de navegar localmente.

El DM debe disponer de una **camara principal** representada sobre su mapa. Esta camara define el centro y el zoom que el DM desea proyectar. Cuando el jugador modifica manualmente su vista, la aplicacion debe detectar la desincronizacion y representar en el mapa del DM una **camara virtual** con la posicion y zoom reales del jugador. El DM puede recentrar al jugador en cualquier momento y volver a una unica camara sincronizada.

## Contexto

La Ventana de Jugador actualmente mantiene pan y zoom independientes despues de abrirse. Esa independencia permite que el jugador explore la vista, pero el DM no puede saber que zona esta viendo ni recuperar rapidamente una composicion concreta desde su propia interfaz.

Esta funcionalidad agrega control de presentacion al DM sin convertir la Ventana de Jugador en una superficie editable ni mostrar controles de direccion de escena a los jugadores.

## Terminologia

### Camara principal

- Es el control de camara creado y manipulado por el DM.
- Se representa exclusivamente en el viewport del DM como un circulo con icono de camara.
- Su posicion en coordenadas de mundo define el centro esperado de la Ventana de Jugador.
- Mantiene el zoom esperado de la Ventana de Jugador.
- Es la fuente de verdad cuando ambas ventanas estan sincronizadas.

### Camara virtual

- Representa la posicion y el zoom reales de la Ventana de Jugador cuando el jugador se aparta de la camara principal.
- Se muestra exclusivamente en el viewport del DM.
- No reemplaza ni mueve la camara principal.
- Existe solo mientras la Ventana de Jugador esta desincronizada.
- Se elimina al recentrar o cuando la camara del jugador vuelve a coincidir con la camara principal dentro de la tolerancia definida.

### Estado sincronizado

- El centro y zoom efectivos de Player View coinciden con la camara principal dentro de una tolerancia pequena para evitar cambios de estado por ruido decimal.
- Solo se muestra la camara principal en el DM.

### Estado desincronizado

- El jugador hizo pan o zoom local y su camara efectiva ya no coincide con la camara principal.
- Se mantienen visibles en DM la camara principal y la camara virtual.
- La UI del DM muestra una accion clara para recentrar.

## Alcance

### Incluido

- Mostrar en el viewport del DM un control circular con icono de camara para la camara principal.
- Permitir al DM arrastrar la camara principal sobre el mapa.
- Centrar la Ventana de Jugador en la posicion de mundo indicada por la camara principal cuando el DM termine de moverla.
- Agregar controles de zoom in y zoom out para Player View dentro de la interfaz del DM.
- Enviar al DM los cambios efectivos de pan y zoom realizados localmente en Player View.
- Detectar y comunicar visualmente que Player View esta desincronizada.
- Crear una camara virtual en el viewport del DM para mostrar el centro real del jugador sin mover la camara principal.
- Permitir al DM recentrar Player View sobre la camara principal.
- Eliminar la camara virtual despues de una resincronizacion valida.
- Mantener Player View libre de controles, iconos o indicadores relacionados con estas camaras.
- Mantener el pan local con barra espaciadora y el zoom local de Player View segun su bloqueo de zoom vigente.

### Fuera de alcance

- Multiples ventanas de jugador o una camara independiente por jugador.
- Vista previa rectangular exacta del viewport del jugador sobre el mapa del DM.
- Animaciones cinematograficas, recorridos de camara o keyframes.
- Guardar presets o marcadores de camara.
- Persistir la camara principal o virtual dentro de `.ttrpgscene`.
- Control remoto por red.
- Bloquear permanentemente la navegacion local del jugador desde el DM.
- Cambiar la posicion o escala del mapa, la grilla o cualquier elemento de escena al mover una camara.

## Reglas funcionales

### Creacion e inicializacion

- La camara principal existe como estado de presentacion mientras la ventana del DM esta activa.
- Al abrir Player View por primera vez:
  - la camara principal toma como referencia la camara inicial que se enviara al jugador;
  - Player View abre centrada y con el zoom de esa camara principal;
  - el estado inicial es sincronizado;
  - no se crea camara virtual.
- Si Player View esta cerrada, el DM puede ver y mover la camara principal, pero no debe producir errores de IPC.
- Al abrir o reabrir Player View, esta se inicializa en la camara principal vigente.

### Control central desde el DM

- La camara principal se renderiza como un circulo con un icono de camara reconocible.
- El control debe conservar un tamano legible en pantalla durante pan y zoom del viewport del DM; su tamano visual no depende del zoom del mapa.
- Su centro corresponde a una coordenada de mundo valida.
- El DM puede arrastrarlo libremente sobre el mapa.
- Mientras se arrastra debe existir feedback visual inmediato.
- Al terminar el drag, Player View se centra en esa coordenada.
- Mover la camara principal no mueve la camara local del DM ni modifica la escena.
- Mientras el DM ordena un nuevo centro, la camara principal sigue siendo la referencia esperada.
- Cuando Player View confirma la nueva camara efectiva, el estado vuelve a sincronizado y se elimina cualquier camara virtual.

### Navegacion local del jugador

- Player View conserva pan local con barra espaciadora sostenida y drag.
- Player View conserva zoom local con rueda o trackpad cuando el zoom local esta desbloqueado.
- Los controles de camara del DM no aparecen en Player View.
- Al completar un cambio local de pan o zoom, Player View publica al DM su camara efectiva normalizada:
  - centro en coordenadas de mundo;
  - zoom;
  - identificador o revision suficiente para distinguir actualizaciones recientes.
- El movimiento local no modifica la camara principal.
- Si la camara efectiva difiere de la principal, el estado pasa a desincronizado y aparece la camara virtual en DM.
- Si el jugador regresa manualmente a la posicion y zoom de la camara principal dentro de la tolerancia, la camara virtual desaparece.

### Camara virtual y desincronizacion

- La camara virtual debe diferenciarse claramente de la camara principal sin confundirse con tokens, apuntadores, pines o selecciones.
- Debe mostrar un estado visual de camara secundaria/desincronizada.
- La camara virtual se coloca en el centro real reportado por Player View.
- La camara virtual no es arrastrable ni editable.
- Un cambio posterior del jugador actualiza la misma camara virtual; no crea multiples objetos.
- El estado desincronizado debe ofrecer al DM una accion `Recentrar jugador` o texto equivalente.
- La ausencia o cierre de Player View elimina la camara virtual y deshabilita acciones que requieran una ventana activa.

### Recentrar jugador

- La accion `Recentrar jugador` ordena a Player View adoptar el centro y zoom actuales de la camara principal.
- La orden debe incluir ambos valores en una sola actualizacion para evitar estados intermedios inconsistentes.
- La camara virtual puede mantenerse visible mientras se espera confirmacion del jugador.
- Solo debe eliminarse cuando Player View confirme una camara efectiva equivalente a la principal o cuando la ventana se cierre.
- La resincronizacion no cambia el bloqueo de zoom local del jugador.
- Despues de recentrar, el jugador puede volver a navegar localmente y generar una nueva desincronizacion.

### Zoom remoto desde el DM

- La interfaz del DM debe incluir controles claros de zoom in y zoom out para Player View.
- Los controles modifican el zoom esperado de la camara principal y ordenan a Player View aplicar ese zoom alrededor del centro principal.
- El zoom remoto del DM debe funcionar aunque el boton local de Player View indique `Zoom bloqueado`; ese bloqueo solo protege la entrada local del jugador.
- El zoom debe respetar los limites minimos y maximos ya definidos por el motor de camara.
- Cada paso de zoom debe ser predecible y consistente con la politica de zoom existente.
- Al aplicar zoom remoto, Player View se recentra en la camara principal y vuelve al estado sincronizado tras confirmar la actualizacion.
- El control remoto no modifica el zoom del viewport del DM.

## Interfaz del DM

### Control sobre el mapa

- Circulo compacto con icono de camara en el centro.
- Tamano estable en pantalla y hit area suficiente para arrastrar con precision.
- Cursor y feedback de drag coherentes con los controles existentes.
- Estado visual principal claramente distinguible.
- La camara virtual usa una variante visual secundaria o de advertencia.
- Ambos controles se muestran solo en DM y deben permanecer por encima del mapa y las capas de gameplay, sin publicarse a Player View.

### Controles asociados

- Accion de zoom in.
- Accion de zoom out.
- Indicador `Sincronizada` / `Desincronizada` o equivalente.
- Accion `Recentrar jugador`, visible o habilitada solo cuando existe desincronizacion y Player View esta abierta.
- Los controles pueden vivir en la toolbar o en un grupo compacto dedicado a Player View, respetando el look and feel vigente.
- Se deben usar iconos conocidos con tooltip y labels accesibles.

## Interfaz de Player View

- No se muestra la camara principal.
- No se muestra la camara virtual.
- No se muestra el estado de sincronizacion.
- No se muestra la accion de recentrado ni los controles remotos del DM.
- Se conserva el boton local de bloqueo de zoom.
- Se conservan las interacciones locales de pan y zoom ya existentes.
- Las ordenes remotas deben aplicarse sobre el viewport sin agregar chrome nuevo.

## Estado y persistencia

- El estado de control de camara es efimero y no forma parte del documento de escena.
- No se modifica la version ni el schema de `.ttrpgscene`.
- Estado minimo de presentacion:
  - camara principal: centro y zoom;
  - camara efectiva reportada por Player View;
  - estado de conexion/apertura de Player View;
  - estado sincronizado o desincronizado;
  - revision de la ultima orden y del ultimo reporte.
- Cargar mapa, cargar escena o crear una escena nueva debe reinicializar la camara principal con una posicion valida para el nuevo mapa y resincronizar Player View si esta abierta.
- Cerrar Player View descarta su camara efectiva y cualquier camara virtual.

## IPC y Electron

- El DM sigue siendo el proceso de control y la fuente de ordenes de presentacion.
- Se requieren canales IPC especificos y tipados para:
  - enviar una orden de camara DM -> Player View;
  - reportar camara efectiva Player View -> DM;
  - notificar apertura/disponibilidad de Player View;
  - notificar cierre de Player View.
- Las ordenes y reportes deben validar centro, zoom y revision.
- Los reportes de camara del jugador deben aplicar throttling o emitirse al finalizar/interrumpir una interaccion para evitar saturar IPC durante cada `pointermove`.
- Si se desea feedback continuo, debe usarse un throttle con frecuencia acotada y siempre emitir un reporte final.
- Debe evitarse un loop donde una orden DM -> jugador produzca un reporte interpretado como navegacion manual y genere desincronizacion falsa.
- Cada orden del DM debe poder correlacionarse con la confirmacion efectiva de Player View.
- No se exponen `ipcRenderer`, canales genericos ni APIs Electron completas al renderer.
- Se mantienen `contextIsolation: true`, `nodeIntegration: false` y el preload tipado.

## Render y coordenadas

- Las posiciones de ambas camaras se expresan en coordenadas de mundo, no de pantalla.
- El zoom se normaliza usando el mismo contrato de camara compartido por DM y Player View.
- La comparacion de sincronizacion debe usar tolerancias explicitas para posicion y zoom.
- Los iconos de camara son overlays privados del DM y no entidades del documento de escena.
- El adaptador Pixi debe exponer actualizaciones de camara efectivas sin acoplar reglas IPC al motor de render.
- Los objetos visuales y listeners de camara deben limpiarse al destruir el viewport o cerrar una ventana.
- Mover la camara no debe disparar reconstruccion completa de capas ni recrear assets del mapa.

## Compatibilidad con la Ventana de Jugador existente

Esta spec modifica las reglas de camara de `specs/15-player-window/spec.md`:

- Player View sigue teniendo navegacion local independiente.
- Player View ahora si reporta su camara efectiva al DM.
- El DM ahora puede enviar ordenes explicitas de centro y zoom despues de abrir la ventana.
- La camara del jugador no se sincroniza continuamente con la camara local del DM; se sincroniza con la camara principal dedicada.
- El pan/zoom del viewport del DM sigue sin mover Player View.
- Solo mover la camara principal, usar zoom remoto o recentrar produce una orden DM -> Player View.

Al aceptar e implementar esta spec, deben actualizarse el spec y plan de `15-player-window` para eliminar las reglas anteriores que prohiben Player View -> DM y las ordenes explicitas posteriores a la apertura.

## Casos limite

- Si Player View no esta abierta, mover la camara principal o cambiar su zoom actualiza la referencia local sin fallar.
- Si Player View se cierra durante una orden, el DM limpia el estado pendiente y la camara virtual.
- Si Player View se abre durante una escena sin mapa, la camara usa valores seguros del viewport vacio.
- Si se carga otra escena mientras existe desincronizacion, se descarta la camara virtual anterior y se inicializa una camara valida para la nueva escena.
- Si llegan reportes fuera de orden, solo se aplica el reporte valido mas reciente.
- Si el viewport cambia de tamano, se conserva el centro de mundo y zoom; el cambio de dimensiones por si solo no representa navegacion manual.
- Si el jugador hace pan mientras llega una orden remota, la orden del DM tiene prioridad para esa revision y el siguiente gesto local puede volver a desincronizar.

## Criterios de aceptacion

- Existe una rama de funcionalidad separada y el spec queda documentado antes de implementar.
- El DM ve una camara principal circular con icono de camara sobre su mapa.
- El control conserva un tamano legible durante zoom in/out del viewport del DM.
- Arrastrar la camara principal centra Player View sin mover el viewport del DM.
- El DM puede hacer zoom in/out de Player View sin cambiar su propio zoom.
- El zoom remoto funciona aunque el zoom local del jugador este bloqueado.
- Player View sigue permitiendo pan local y zoom local cuando corresponda.
- Al navegar localmente, Player View reporta su camara efectiva al DM.
- La navegacion local del jugador no mueve la camara principal.
- Al desincronizarse aparece una unica camara virtual en el centro real del jugador.
- El DM puede recentrar al jugador en el centro y zoom de la camara principal.
- La camara virtual desaparece despues de confirmar la resincronizacion.
- Ningun control o icono de camara se muestra en Player View.
- Las camaras no se guardan en `.ttrpgscene` y no cambian su compatibilidad.
- Las ordenes de camara no provocan loops IPC ni reconstruccion completa de capas.
- Cerrar o reabrir Player View mantiene un flujo recuperable y sin errores.

## Riesgos

- **Loops de sincronizacion:** una orden remota puede ser reportada como gesto local y recrear inmediatamente la camara virtual.
  - Mitigacion: revisiones correlacionadas, origen explicito de actualizacion y tolerancias de comparacion.
- **Saturacion IPC durante pan:** publicar por cada movimiento puede degradar ambas ventanas.
  - Mitigacion: throttle acotado y reporte final obligatorio al terminar el gesto.
- **Diferencias de tamano entre ventanas:** el mismo centro y zoom no implica la misma extension visible cuando los viewports tienen dimensiones distintas.
  - Mitigacion: esta spec controla centro y zoom; una representacion exacta del rectangulo visible queda fuera de alcance.
- **Interferencia con herramientas DM:** el control circular puede competir con seleccion o drag de objetos.
  - Mitigacion: hit testing dedicado, prioridad clara y feedback visual del control.
- **Carga de escena durante una orden:** una respuesta tardia puede aplicar coordenadas del mapa anterior.
  - Mitigacion: incluir revision de escena/camara y descartar mensajes obsoletos.

## Dependencias

- `specs/01-render-engine/spec.md`: contrato de camara y conversion de coordenadas.
- `specs/05-navigation-and-interaction/spec.md`: pan, zoom, cursores e interacciones.
- `specs/15-player-window/spec.md`: BrowserWindow, snapshot, Player View read-only y navegacion local.
- APIs preload e IPC existentes para publicacion entre DM, main y Player View.

## Documentacion a actualizar al aceptar

- `specs/15-player-window/spec.md`.
- `specs/15-player-window/plan.md`.
- El plan tecnico de esta spec, una vez aprobado el alcance funcional.
