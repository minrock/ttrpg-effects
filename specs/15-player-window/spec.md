# Spec - Ventana de Jugador

Este documento describe de forma unificada la funcionalidad de ventana de jugador, consolidando el alcance funcional vigente en el proyecto.

## Ventana de jugador

### Estado

Implementada.

### Objetivo

Agregar una ventana Electron secundaria para jugadores que muestre una copia sincronizada de la escena del DM, sin controles de edicion. La ventana de jugador debe servir para proyectar o mover a otro monitor una vista limpia del mapa, con pan/zoom independiente del DM y reglas visuales orientadas a jugadores.

### Contexto

La app se usa en mesa presencial. El DM necesita editar mapa, tokens, efectos, luces, niebla y herramientas tacticas desde la ventana principal, mientras los jugadores ven una version limpia del mismo viewport.

Actualmente el viewport del DM incluye controles, sidebar, toolbar, seleccion, herramientas de edicion y feedback visual para manipular la escena. Esta spec separa la vista de control del DM de una vista read-only para jugadores.

### Alcance

- Agregar un boton principal en la ventana del DM para abrir la `Ventana de jugador`.
- Crear una segunda ventana Electron real (`BrowserWindow`) para la vista de jugadores.
- La ventana de jugador debe ocupar el 100% del viewport del mapa disponible en esa ventana.
- La ventana de jugador no muestra toolbar, sidebar, status bar, menus contextuales ni modales de edicion.
- La ventana de jugador es read-only para edicion de escena, pero permite navegar su propia vista.
- La camara de jugador es independiente de la camara del DM:
  - el DM no fuerza pan/zoom en jugador despues de abrir la ventana;
  - el jugador puede hacer pan con barra espaciadora presionada;
  - el jugador puede hacer zoom con rueda/trackpad si el zoom esta desbloqueado;
  - el jugador tiene un boton local para bloquear/desbloquear zoom;
  - la posicion visible del mapa en jugador puede diferir de la del DM.
- Al abrir o reabrir la ventana de jugador, puede inicializarse con la camara actual del DM como punto de partida, pero desde ahi queda desacoplada.
- Todo cambio de escena, mapa o estado visual realizado en DM se refleja en jugador.
- Los objetos creados/editados en DM se duplican visualmente en jugador:
  - mapa;
  - grilla;
  - formas;
  - mediciones;
  - caminos/path;
  - fuego;
  - agua;
  - luces;
  - oscuridad;
  - oscuridad magica;
  - niebla;
  - tokens;
  - emojis o patrones asociados a efectos/formas;
  - apuntador arcano.
- Las interacciones y ediciones solo ocurren desde la ventana del DM.
- Si la ventana de jugador esta cerrada y se vuelve a abrir, debe cargar el estado actual completo del DM.

### Diferencias entre vista DM y vista jugador

#### Niebla de guerra

- En la ventana del jugador, la niebla de guerra debe mostrarse negra/opaca como bloqueo visual real del mapa.
- En la ventana del DM, la niebla de guerra debe poder verse con opacidad reducida para que el DM entienda que zonas esta descubriendo.
- El DM debe tener un nuevo control para decidir si quiere ver la niebla de guerra en su propia ventana.
- Si el DM no quiere verla, la niebla no debe cubrir visualmente su mapa aunque siga existiendo para la ventana del jugador.
- El control de visibilidad de niebla para DM es una preferencia de vista del DM, no una regla de escena para jugadores.
- La ventana del jugador siempre respeta la niebla activa de la escena cuando `fogOfWar.enabled` esta encendido.

#### Oscuridad y vision

- La ventana del jugador debe respetar las capas y reglas visuales existentes:
  - oscuridad ambiental;
  - darkvision / vision en la oscuridad;
  - luces puntuales;
  - luces conicas;
  - fuego que emite luz;
  - oscuridad magica;
  - niebla de guerra.
- **La oscuridad ambiental y darkvision son exclusivas de la ventana del jugador.**
  - La capa de oscuridad en la ventana del DM siempre tiene opacidad cero; el DM ve el mapa completo sin overlay de oscuridad independientemente de lo configurado en escena.
  - El modo darkvision (mapa en blanco y negro con color en areas iluminadas) tampoco se aplica en la ventana del DM; el mapa del DM siempre se ve a color.
  - Los controles de oscuridad del DM afectan unicamente la ventana del jugador.
  - Esta regla es analoga al control de niebla del DM: el DM configura el efecto para jugadores sin sufrir ese efecto en su propia vista.
- En la ventana del DM, las luces y fuego siguen siendo visibles como indicadores de posicion y estado, pero no interactuan con una capa de oscuridad activa.
- La oscuridad magica conserva prioridad visual sobre mapa, luces y darkvision en ambas ventanas, segun su spec.
- La ventana del jugador debe respetar el orden de capas de gameplay: mapa -> tokens -> oscuridad ambiental -> luces/efectos -> oscuridad magica -> fog of war -> herramientas de area/seleccion. En particular, los tokens quedan debajo de oscuridad/fog y la niebla queda por encima de oscuridad magica.

#### Tokens ocultos

- Los tokens con `visible === false` no se muestran en la ventana del jugador.
- En la ventana del DM, los tokens ocultos se siguen mostrando para control del DM.
- Todo token oculto visible en DM debe mostrar un icono/indicador de ojo cerrado aunque no este seleccionado.
- El indicador de ojo cerrado debe ser legible y no debe confundirse con seleccion ni badge numerico.
- La seleccion de token en DM no se refleja como control editable en jugador.

#### Apuntador arcano

- El apuntador se dispara desde la ventana del DM.
- La misma animacion temporal debe aparecer en la ventana del jugador:
  - misma posicion de mundo;
  - mismo tamano configurado;
  - misma duracion;
  - mismo timing aproximado;
  - mismo asset visual.
- La ventana del jugador no puede crear apuntadores.

### Modelo de interaccion

#### Abrir ventana de jugador

- La toolbar principal del DM incluye un boton `Ventana de jugador` o texto equivalente.
- Si la ventana no existe, el boton crea y abre una nueva `BrowserWindow`.
- Si la ventana ya existe, el boton debe enfocarla o traerla al frente.
- La ventana debe abrirse con una vista limpia del mapa y ocupar el 100% del area disponible de su contenido.
- La ventana puede moverse a otro monitor/proyector por el sistema operativo.

#### Vista read-only con navegacion local

- La ventana de jugador no permite:
  - seleccionar elementos;
  - mover tokens;
  - abrir menu contextual;
  - crear formas, luces, efectos, tokens o apuntadores;
  - revelar niebla;
  - ajustar mapa;
  - ajustar grilla;
  - usar shortcuts de edicion.
- La ventana de jugador si permite:
  - pan local mientras la barra espaciadora esta presionada;
  - zoom local cuando el zoom no esta bloqueado;
  - bloquear/desbloquear zoom con un boton visible sobre la vista.
- Los eventos de mouse/teclado sobre el canvas de jugador se ignoran para edicion, pero se usan para navegacion local.
- Al presionar la barra espaciadora en jugador, el cursor cambia a mano/agarre y el drag mueve la camara de jugador.
- Al soltar la barra espaciadora, el cursor vuelve a modo normal y no se activa ninguna herramienta de edicion.
- El boton local de bloqueo de zoom debe ser visible pero discreto, sin convertirse en toolbar de edicion.

#### Sincronizacion

- El DM es la fuente de verdad.
- Toda actualizacion de escena en el DM debe publicar un snapshot o patch a la ventana de jugador.
- La camara del DM no debe sincronizarse continuamente con la ventana de jugador.
- La ventana de jugador mantiene su propia camara en memoria local mientras exista.
- La camara inicial de jugador puede provenir del snapshot actual del DM al abrir/reabrir la ventana.
- Cambios posteriores de pan/zoom en DM no deben mover automaticamente la ventana de jugador.
- Cambios locales de pan/zoom en jugador no deben emitirse al DM ni modificar escena.
- Si el mapa se carga, cambia, se mueve o se escala en DM, la ventana de jugador lo refleja.
- Si una escena se guarda/carga o se crea una nueva escena en DM, la ventana de jugador se actualiza con ese estado.
- Si se cierra la ventana de jugador, el DM no pierde estado ni falla al seguir editando.
- Si se reabre la ventana, recibe el estado actual completo.

### Render

- La ventana de jugador debe reutilizar el motor de viewport Pixi siempre que sea razonable, configurado en modo read-only/player.
- No debe duplicarse logica de dominio para calculos de mapa, grilla, vision, luces o efectos.
- El renderer debe poder renderizar el mismo documento de escena con diferencias de vista:
  - `viewRole: "dm"` o `viewRole: "player"`;
  - `showDmFogOverlay` o preferencia equivalente;
  - filtrado de tokens ocultos solo para jugador;
  - niebla negra/opaca para jugador.
- La ventana de jugador debe quedar debajo de UI React inexistente o minima; no requiere sidebar ni toolbar.
- El viewport debe redimensionarse al 100% de la ventana del jugador.
- Las animaciones de efectos existentes deben seguir corriendo en jugador.
- Las animaciones temporales del apuntador deben poder replicarse desde eventos emitidos por DM.

### IPC / Electron

- Agregar canales IPC especificos, tipados y validables para:
  - abrir/enfocar ventana de jugador;
  - enviar estado inicial de escena a jugador;
  - publicar actualizaciones de escena desde DM a jugador;
  - publicar eventos temporales como apuntador arcano;
  - notificar cierre de ventana de jugador si hace falta.
- La publicacion de camara DM -> jugador debe quedar limitada al snapshot inicial o a un evento explicito futuro, no al flujo normal de pan/zoom del DM.
- La camara local de jugador no debe viajar por IPC hacia el DM.
- No exponer APIs genericas de Electron al renderer.
- Mantener `contextIsolation: true`, `nodeIntegration: false` y preload tipado.
- La ventana de jugador no debe cargar contenido remoto.
- La CSP debe seguir permitiendo assets internos y protocolos seguros ya existentes para mapa/tokens.

### Estado y persistencia

- No se agregan datos obligatorios al formato `.ttrpgscene` para abrir la ventana de jugador.
- La existencia o posicion de la ventana de jugador no se guarda en la escena.
- La preferencia de vista del DM para mostrar/ocultar la niebla en su ventana puede ser estado local de UI.
- Los tokens ocultos ya se basan en estado de escena existente.
- El apuntador sigue siendo temporal y no se guarda.

### Controles nuevos

#### Toolbar DM

- Boton principal para abrir/enfocar la ventana de jugador.

#### Ventana de jugador

- Boton flotante o control discreto `Zoom bloqueado` / `Zoom desbloqueado`.
- El boton debe estar disponible en la vista jugador aunque no existan toolbar/sidebar.
- La navegacion local usa:
  - barra espaciadora sostenida + drag para pan;
  - rueda/trackpad para zoom cuando el zoom esta desbloqueado.
- No se agregan controles para crear, editar, seleccionar, borrar o revelar elementos.

#### Sidebar DM / Niebla

- Nuevo control para el DM:
  - mostrar/ocultar la niebla de guerra en la vista DM.
- Este control no cambia lo que ven los jugadores.
- Si la niebla esta activa en escena y la ventana de jugador existe, jugador la ve como bloqueo negro/opaco.

### Fuera de alcance

- Diferentes vistas por jugador o por token.
- Linea de vision automatica por personaje.
- Sincronizacion por red o multiplayer remoto.
- Chat, iniciativas o estados de combate.
- Permitir que jugadores interactuen con tokens o apuntadores.
- Persistir ubicacion/tamano de la ventana de jugador.
- Streaming externo o captura de pantalla.

### Criterios de aceptacion

- La ventana principal del DM muestra un boton para abrir la ventana de jugador.
- Al usar el boton se abre una segunda ventana Electron real.
- La ventana de jugador muestra solo el viewport del mapa, sin controles de edicion.
- La ventana de jugador ocupa el 100% del area visible de la ventana.
- La ventana de jugador es read-only para edicion.
- Pan y zoom del DM no se replican continuamente en jugador.
- La ventana de jugador permite pan local con barra espaciadora sostenida.
- La ventana de jugador permite bloquear/desbloquear zoom con un boton local.
- La ventana de jugador permite zoom local solo cuando el zoom esta desbloqueado.
- Pan/zoom local de jugador no cambia la escena ni la camara del DM.
- Cargar mapa, cargar escena, crear escena nueva y cambios de escena se reflejan en jugador.
- Formas, mediciones, paths, efectos, luces, oscuridad, grilla y tokens visibles se ven en jugador.
- Tokens ocultos no se ven en jugador.
- Tokens ocultos si se ven en DM con indicador de ojo cerrado aunque no esten seleccionados.
- El DM tiene control para mostrar/ocultar la niebla en su propia vista.
- La niebla de guerra se ve negra/opaca en jugador cuando esta activa.
- La niebla de guerra puede verse con opacidad reducida o esconderse en DM segun el control nuevo.
- Oscuridad, darkvision, luces y oscuridad magica se respetan en jugador.
- La capa de oscuridad ambiental no se renderiza en la ventana del DM (siempre transparente); el DM ve el mapa completo.
- El modo darkvision (mapa en escala de grises) no se aplica en la ventana del DM.
- Los controles de oscuridad del DM modifican lo que ve el jugador pero no afectan la propia vista del DM.
- El apuntador creado en DM aparece tambien en jugador con mismo lugar, tamano y duracion.
- Cerrar la ventana de jugador no rompe la ventana del DM.
- Reabrir la ventana de jugador carga el estado actual completo.
- No se agregan accesos directos inseguros de Electron al renderer.

### Riesgos

- Mantener dos viewports Pixi sincronizados puede exponer diferencias de timing si se usan efectos animados o eventos temporales.
- Enviar snapshots completos de escena en cada cambio puede ser costoso con mapas grandes o muchos objetos; puede requerir throttling, patches o dirty tracking.
- La independencia de camara debe evitar loops: jugador no emite cambios de camara de vuelta al DM y DM no pisa la camara local del jugador durante pan/zoom normal.
- Los assets de mapa/tokens deben resolverse en la ventana de jugador usando los mismos protocolos seguros que la ventana del DM.
- La diferencia de niebla DM vs jugador puede complicar la capa de render si se mezcla con oscuridad y darkvision; conviene modelarla como opcion de vista, no como mutacion de escena.

### Notas de implementacion futura

- La implementacion usa la misma entrada renderer con query `?view=player`.
- `MapViewport` y `PixiViewport` se reutilizan con props de rol, read-only, presentacion de niebla y politica de tokens ocultos.
- El estado compartido fluye desde DM hacia main y luego hacia la ventana de jugador mediante IPC especifico.
- La camara del DM se expone desde `PixiViewport` hacia React para usos del DM y puede usarse como camara inicial al abrir jugador, pero no se sincroniza continuamente con jugador.
- `PixiViewport` en modo jugador debe permitir input de navegacion aunque `readOnly` bloquee edicion.
- `MapViewport`/`PlayerApp` deben separar `readOnly` de `navigationEnabled` o equivalente para que jugador pueda pan/zoom sin herramientas de edicion.
- El apuntador arcano se emite como evento temporal DM -> jugador y no se persiste.
## Privacidad y highlights de anotaciones

- Player View nunca recibe pines, areas ni su contenido Markdown dentro del snapshot de escena.
- El DM puede publicar un highlight efimero de 5 segundos con solo id, tipo y celdas.
- Los highlights aparecen sobre fog, admiten convivencia multiple y no se retienen al abrir tarde Player View.
