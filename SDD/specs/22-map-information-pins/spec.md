# Spec - Pines y Areas de Informacion del Mapa

## Borrado de areas desde mapa y arbol

- Backspace y Delete eliminan el area seleccionada en el mapa, tanto cuadrada como hexagonal, sin depender de una seleccion anterior del callback.
- Cada terreno/trampa del arbol incorpora una papelera Lucide con tooltip y nombre accesible. La accion elimina esa fila por ID aunque otro objeto este seleccionado; no requiere seleccionar primero ni abrir un modal.
- Con foco en una fila de area, Backspace/Delete eliminan esa fila y no propagan el evento al borrado global. No interceptar edicion en buscadores, campos o WYSIWYG.
- Conservar la proteccion existente: un area bloqueada debe desbloquearse antes de borrar. Deshabilitar su papelera con tooltip explicativo y dar feedback si se intenta por teclado.
- Eliminar limpia la seleccion/propiedades si correspondian al area borrada, retira su geometria y actualiza el arbol/estado guardable. No modificar otros objetos, pines ni conexiones.
- Mantener titulo legible y controles en una segunda linea de cada area para no comprimir el nombre con la nueva accion.
- Cambio aceptado por el usuario el 2026-09-02 para cierre 1.10.0 y merge a main.

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- Area de informacion rasteriza cada trazo a las celdas de la grilla activa: cuadrados o hexagonos completos. Interpolar el trazo para no dejar huecos por movimientos rapidos.
- Persistir layout por celda con x/y/size mundial; traslacion conserva forma. Cambiar grilla no convierte anotaciones ya guardadas.
- Preview, relleno, contorno exterior y hit testing usan geometria real, sin bordes internos entre hexagonos contiguos ni seleccion en esquinas vacias del bounding box.
- Highlight de 5 s en Player View conserva geometria hexagonal y colores de terreno/trampa; payload permite layout validado y nunca incluye nombre/contenido privado.
- Pines de habitacion, links, WYSIWYG y arbol de anotaciones no cambian.


Este documento define la funcionalidad para guardar informacion contextual directamente sobre posiciones y areas del mapa, visible para el DM y persistente dentro de la escena.

## Estado

Aceptado e implementado. Pendiente de smoke visual y aceptacion final.

## Objetivo

Permitir que el DM documente habitaciones, terrenos, trampas y otras zonas relevantes sin separar esa informacion de su ubicacion espacial en el mapa.

La funcionalidad tendra dos tipos de anotacion:

- `Pin de habitacion`: punto puntual con informacion privada asociada a una coordenada del mapa.
- `Area de informacion`: region pintada y clasificada inicialmente como `Terreno` o `Trampa`, con una descripcion privada y capacidad de resaltarse temporalmente en la ventana del jugador.

## Contexto

TTRPG Effects ya permite cargar mapas, crear formas y efectos, guardar escenas y mantener una ventana de jugador sincronizada. Sin embargo, el DM no puede asociar informacion narrativa o tactica a una posicion concreta sin recurrir a notas externas.

Los pines y areas de informacion deben funcionar como herramientas de preparacion y consulta durante la sesion. Su contenido es privado para el DM. Las areas pueden comunicarse visualmente a los jugadores mediante un highlight temporal, sin revelar el texto guardado.

## Alcance

- Agregar una accion para crear un `Pin de habitacion` desde las herramientas del mapa.
- Al activar la accion, permitir un click normal sobre el mapa para elegir la coordenada del pin.
- Guardar la coordenada del pin en espacio de mundo.
- Abrir inmediatamente un modal para capturar la informacion de la habitacion.
- Guardar los pines y su contenido en el archivo `.ttrpgscene`.
- Mostrar los pines exclusivamente en la ventana del DM.
- Agregar una accion separada para crear un `Area de informacion`.
- Permitir pintar una region irregular sobre el mapa usando el flujo de trazo existente como referencia de interaccion.
- Al finalizar el trazo, abrir un modal para seleccionar el tipo del area y escribir su descripcion.
- Incluir inicialmente los tipos:
  - `Terreno`;
  - `Trampa`.
- Guardar las areas, su geometria y su contenido en `.ttrpgscene`.
- Mostrar las areas persistentes exclusivamente en la ventana del DM.
- Permitir al DM editar y eliminar pines y areas existentes.
- Agregar herramientas `Anotaciones` en el sidebar derecho y un arbol navegable de pines/areas en el panel lateral izquierdo.
- Permitir buscar anotaciones y centrar la camara sobre una anotacion desde el indice.
- Permitir ocultar o mostrar globalmente las anotaciones en la vista DM para reducir ruido visual.
- Permitir bloquear individualmente pines y areas para evitar movimientos o borrados accidentales.
- Permitir escribir y renderizar el contenido de pines y areas usando Markdown.
- Permitir que el DM haga doble click sobre un area ya creada para resaltarla en la ventana del jugador durante 5 segundos.
- El highlight del jugador usa:
  - verde oliva semitransparente para `Terreno`;
  - rojo semitransparente para `Trampa`.
- El highlight es temporal y no modifica ni vuelve visible el contenido textual del area.
- Sincronizar el evento temporal con la ventana del jugador mediante el flujo seguro DM -> jugador existente.

## Fuera de alcance

- Mostrar pines de habitacion en la ventana del jugador.
- Mostrar de forma permanente las areas de informacion en la ventana del jugador.
- Mostrar la descripcion, titulo o tipo del area al jugador.
- Permitir que la ventana del jugador cree, seleccione, edite o elimine anotaciones.
- Ejecutar automaticamente una trampa cuando un token entra al area.
- Aplicar modificadores de movimiento por terreno.
- Vincular pines o areas con monstruos, NPCs, personajes, tokens o entradas de la biblioteca local.
- Adjuntar imagenes, audio, video, PDFs o archivos externos.
- Crear categorias personalizadas diferentes de `Terreno` y `Trampa`.
- Sincronizacion por red o por usuario individual.
- Historial o versionado del contenido de las anotaciones.
- Busqueda global entre escenas o una biblioteca de anotaciones fuera de la escena activa.
- HTML arbitrario dentro del contenido Markdown.

## Modelo de interaccion

### Crear un pin de habitacion

1. El DM elige `Pin de habitacion` desde el menu o grupo de herramientas correspondiente.
2. El cursor cambia para indicar que el siguiente click colocara un pin.
3. El DM hace click normal sobre una posicion del mapa.
4. La posicion se convierte de pantalla a coordenadas de mundo y se conserva sin depender del pan o zoom actual.
5. Se abre un modal con los campos:
   - `Nombre de la habitacion`;
   - `Informacion` como editor Markdown multilínea con modo de previsualizacion.
6. `Guardar` crea el pin y cierra el modal.
7. `Cancelar`, `Escape` o cerrar el modal descarta el pin provisional y no modifica la escena.
8. Al terminar, la herramienta vuelve al modo de seleccion.

El nombre de la habitacion es obligatorio. La informacion puede quedar vacia para permitir completar la preparacion despues. El contenido se guarda como Markdown y se renderiza con el mismo pipeline seguro ya utilizado por las notas de entidades.

### Consultar y editar un pin

- El pin se representa con un icono puntual grande y legible sobre mapas claros u oscuros, con un diametro visual aproximado de 64 unidades de mundo y un area de interaccion de 46 unidades de radio.
- Junto al pin se muestra el nombre de la habitacion mediante un label claramente legible, con una escala visual comparable al selector, opacidad alta y contraste suficiente sobre mapas claros u oscuros.
- El tamano del texto se mantiene constante en pantalla al hacer zoom in/out; solo cambia su posicion junto con el pin en coordenadas de mundo.
- El icono solo existe en la vista DM.
- Un click selecciona el pin usando el sistema de seleccion existente.
- Un doble click abre el modal primero en `Vista previa`, mostrando nombre e informacion renderizada; el usuario debe activar `Editar` antes de modificar campos.
- Las acciones explicitas `Editar` del arbol y de propiedades abren directamente el formulario de edicion.
- Guardar desde el modal actualiza el mismo pin y conserva su `id`.
- El pin puede arrastrarse para cambiar su coordenada.
- `Delete` o `Backspace` elimina el pin seleccionado mediante las reglas de borrado existentes.
- Si el pin esta bloqueado, puede consultarse y editarse, pero no puede arrastrarse ni eliminarse hasta ser desbloqueado.
- El contenido se muestra como Markdown renderizado al consultar o previsualizar, sin exponer HTML arbitrario.

### Crear un area de informacion

1. El DM elige `Area de informacion` desde una accion distinta a `Pin de habitacion`.
2. El cursor cambia para indicar modo de pintado.
3. El DM mantiene click y pinta la region sobre el mapa.
4. Durante el trazo se muestra feedback visual local al DM.
5. Al terminar el trazo se consolida una sola geometria de area, evitando guardar un objeto visual independiente por cada evento de movimiento del mouse.
6. Se abre un modal con los campos:
   - `Tipo`: selector obligatorio con `Terreno` o `Trampa`;
   - `Nombre`: texto corto opcional;
   - `Descripcion`: editor Markdown multilínea con modo de previsualizacion.
7. `Guardar` crea el area y cierra el modal.
8. `Cancelar`, `Escape` o cerrar el modal elimina la geometria provisional y no modifica la escena.
9. Al terminar, la herramienta vuelve al modo de seleccion.

El pincel debe mantener un tamano estable basado en la grilla y producir una region irregular util para marcar varias casillas. La geometria final se guarda en coordenadas de mundo y no en coordenadas de pantalla.

La descripcion se guarda como Markdown y se renderiza con el mismo pipeline seguro de notas existente.

### Consultar y editar un area

- El area persistente se muestra solo en la vista DM con una presentacion semitransparente.
- `Terreno` usa una identidad visual verde oliva.
- `Trampa` usa una identidad visual roja.
- La presentacion DM debe permitir leer el mapa debajo y distinguir el contorno del area.
- Un click selecciona el area.
- El accordion de propiedades del objeto seleccionado muestra como minimo:
  - tipo;
  - nombre;
  - estado bloqueado/desbloqueado;
  - una accion para abrir y editar la descripcion.
- `Delete` o `Backspace` elimina el area seleccionada.
- Mover un area desplaza su geometria completa como un solo objeto, si el sistema de seleccion permite arrastre para esta clase de elemento.
- Si el area esta bloqueada, puede consultarse, resaltarse para jugadores y editarse, pero no puede moverse ni eliminarse hasta ser desbloqueada.
- La descripcion se muestra como Markdown renderizado al consultar o previsualizar.

### Indice de anotaciones

- El panel lateral izquierdo de escena incluye un accordion `Anotaciones` disponible en la vista DM.
- El accordion muestra un arbol compacto con todos los pines y areas de la escena activa.
- La jerarquia del arbol agrupa `Habitaciones` y `Areas`; dentro de `Areas` separa `Terrenos` y `Trampas`.
- Cada entrada muestra:
  - icono del tipo de anotacion;
  - nombre o titulo;
  - indicador de bloqueo cuando corresponda.
- El indice incluye un buscador de texto.
- La busqueda compara, sin distinguir mayusculas y minusculas:
  - titulo o nombre;
  - categoria;
  - contenido o descripcion Markdown sin renderizar.
- Seleccionar una entrada del indice selecciona la anotacion correspondiente en el mapa.
- La accion `Ir a` centra la camara del DM sobre la coordenada del pin o el centro geometrico del area, conservando el zoom actual.
- Cada hoja de area incluye una accion explicita para mostrarla durante 5 segundos en Player View.
- El indice se mantiene disponible aunque la capa visual de anotaciones este oculta.
- Si no hay resultados, se muestra un estado vacio claro y no se modifica la seleccion actual.

### Visibilidad y bloqueo

- El accordion `Anotaciones` del sidebar derecho conserva las herramientas de creacion y el control global `Mostrar anotaciones` para la vista DM.
- Desactivar el control oculta pines, areas y sus contornos del canvas DM, pero no elimina datos ni afecta el indice.
- El control global es una preferencia local de UI y no modifica lo que se guarda en `.ttrpgscene`.
- Ocultar anotaciones no cambia la ventana del jugador, donde ya permanecen ocultas por defecto.
- Cada pin y area incluye una propiedad persistente `locked`.
- Una anotacion bloqueada:
  - sigue visible si la capa global esta activa;
  - sigue apareciendo en el indice;
  - puede abrirse, leerse y editar su contenido;
  - no puede arrastrarse;
  - no puede eliminarse con `Delete` o `Backspace`;
  - puede desbloquearse desde el indice o sus propiedades.
- Bloquear un area no impide disparar su highlight temporal para jugadores.

### Resaltar un area para jugadores

- El DM hace doble click sobre un area existente, usa la accion contextual del objeto seleccionado o la accion visible de la hoja correspondiente en el arbol izquierdo.
- El doble click no abre el modal de edicion del area; dispara el highlight temporal para jugador.
- El DM puede editar el area desde la accion explicita de propiedades para evitar conflicto con el doble click.
- La ventana del jugador recibe un evento con:
  - id temporal del evento;
  - id del area;
  - tipo del area;
  - geometria en coordenadas de mundo;
  - duracion de `5000 ms`.
- La ventana del jugador reproduce una capa semitransparente sobre la geometria:
  - `Terreno`: verde oliva;
  - `Trampa`: rojo.
- El highlight aparece de inmediato, permanece legible y desaparece automaticamente al finalizar los 5 segundos.
- El evento no revela nombre ni descripcion.
- El evento no se persiste en `.ttrpgscene` ni queda activo al reabrir la ventana del jugador.
- Varios highlights pueden coexistir si el DM activa areas diferentes antes de que terminen sus 5 segundos.

## Conflictos entre herramientas

- `Pin de habitacion` y `Area de informacion` son modos exclusivos entre si y con niebla, fuego, agua, path, apuntador y otras herramientas de creacion.
- Mantener la barra espaciadora activa el pan temporal sin crear pines ni pintar areas.
- Al soltar la barra espaciadora, la interaccion vuelve a seleccion, siguiendo el comportamiento global vigente.
- `Escape` cancela el pin provisional, el trazo provisional o el modal activo y vuelve a seleccion.
- El click derecho puede abrir el menu contextual sin crear una anotacion accidental.
- El doble click para highlight solo se reconoce sobre areas persistentes en la vista DM.

## Modelo de datos

Los objetos usan ids estables y coordenadas de mundo.

```ts
type MapInformationPin = {
  id: string;
  kind: "room-pin";
  position: {
    x: number;
    y: number;
  };
  title: string;
  content: string;
  locked: boolean;
};

type InformationAreaType = "terrain" | "trap";

type InformationAreaCell = {
  x: number;
  y: number;
  size: number;
};

type MapInformationArea = {
  id: string;
  kind: "information-area";
  areaType: InformationAreaType;
  name: string;
  description: string;
  cells: readonly InformationAreaCell[];
  locked: boolean;
};

type MapAnnotations = {
  pins: readonly MapInformationPin[];
  areas: readonly MapInformationArea[];
};
```

Reglas:

- `position`, `x`, `y` y `size` se expresan en espacio de mundo.
- `cells` representa la union consolidada de las celdas o muestras pintadas, sin duplicados.
- La implementacion puede normalizar celdas contiguas para reducir memoria y trabajo de render, siempre que preserve la forma visible del area.
- `content` y `description` guardan Markdown como texto fuente; el HTML renderizado nunca se persiste.
- `locked` usa `false` como valor por defecto para compatibilidad y nuevas anotaciones.
- El modelo no incluye estado de seleccion, modal abierto ni highlight temporal.

## Persistencia y compatibilidad

- Agregar `mapAnnotations` al documento de escena.
- Guardar `pins` y `areas` en `.ttrpgscene`.
- Validar todos los campos al cargar una escena.
- Escenas anteriores sin `mapAnnotations` deben cargar con:

```ts
{
  pins: [],
  areas: []
}
```

- El cambio debe ser compatible hacia atras y no requiere invalidar escenas existentes.
- Los datos temporales de highlight no forman parte del schema persistente.
- El estado `locked` de cada anotacion forma parte del schema persistente.
- La visibilidad global del accordion `Anotaciones` es una preferencia local de UI y no forma parte del schema de escena.
- Crear una nueva escena limpia tambien reinicia pines y areas.
- Guardar, cargar, recuperar una escena en memoria y publicar una escena a jugador deben conservar o filtrar estos datos segun el rol de vista.

## Render y orden de capas

### Vista DM

- Crear una capa Pixi dedicada para anotaciones de mapa o separar pines y areas dentro de un contenedor comun.
- Las anotaciones deben renderizarse por encima del mapa, tokens, oscuridad, luces, oscuridad magica y niebla para que el DM pueda consultarlas durante la preparacion y la sesion.
- Deben quedar por debajo de seleccion, controles de transformacion, menus y modales.
- Pines y areas participan en hit testing solo en la vista DM.
- Cuando `Mostrar anotaciones` esta desactivado, el contenedor persistente no se renderiza ni participa en hit testing.
- Una anotacion bloqueada puede participar en seleccion y consulta, pero no en transformacion o borrado.
- La capa debe usar dirty tracking para no reconstruirse cuando cambia una parte no relacionada de la escena.

### Vista jugador

- No renderizar la capa persistente de anotaciones.
- No enviar titulo, contenido, nombre ni descripcion al renderer del jugador.
- Crear una capa temporal de highlights por encima de niebla y efectos para que el area comunicada sea visible durante los 5 segundos.
- La capa temporal no participa en hit testing.
- Destruir cada objeto Pixi, timer y listener al finalizar la animacion o al destruir el viewport.

## Sincronizacion DM -> jugador

- El snapshot normal de jugador debe excluir el contenido privado de pines y areas.
- El highlight se transmite como evento ligero e independiente del snapshot completo de escena.
- Reutilizar el patron IPC del apuntador arcano para evitar publicar toda la escena por cada doble click.
- Agregar funciones especificas y tipadas, por ejemplo:
  - `publishPlayerInformationAreaHighlight(event)`;
  - `onPlayerInformationAreaHighlight(handler)`.
- Main solo enruta el evento desde la ventana DM hacia la ventana jugador.
- El payload debe validarse y limitarse a geometria, tipo, duracion e identificadores tecnicos.
- No exponer `ipcRenderer` ni canales genericos al renderer.
- Si la ventana jugador no existe, el doble click no debe producir error ni bloquear la vista DM.

## UI

### Acciones de creacion

- `Pin de habitacion` y `Area de informacion` deben estar disponibles en el grupo de herramientas relacionado con anotaciones o areas del mapa.
- Usar iconos diferenciables y tooltips claros.
- No agregar controles permanentes grandes sobre el viewport.

### Accordion de anotaciones

- Agregar un accordion `Anotaciones` al panel izquierdo con buscador y arbol jerarquico de `Habitaciones` y `Areas > Terrenos/Trampas`.
- Cada hoja del arbol permite seleccionar, `Ir a`, editar y bloquear/desbloquear; las areas agregan una accion para mostrarlas al jugador durante 5 segundos.
- El arbol debe tener conectores, indentacion y contadores de grupo que comuniquen claramente su jerarquia.
- Mantener en el accordion `Anotaciones` del sidebar derecho solo el toggle `Mostrar anotaciones` y las acciones para crear pin o area.
- El panel izquierdo usa su overflow vertical existente y no debe solaparse con sus otros accordions.

### Modal de pin

- Titulo contextual para crear o editar.
- Campo `Nombre de la habitacion`.
- Editor Markdown multilínea `Informacion`.
- Control para alternar entre `Editar` y `Previsualizar`.
- Acciones `Cancelar` y `Guardar`.
- Validacion visible y no destructiva.

### Modal de area

- Titulo contextual para crear o editar.
- Selector `Tipo` con `Terreno` y `Trampa`.
- Campo `Nombre` opcional.
- Editor Markdown multilínea `Descripcion`.
- Control para alternar entre `Editar` y `Previsualizar`.
- Muestra de color asociada al tipo seleccionado.
- Acciones `Cancelar` y `Guardar`.

## Arquitectura

- El dominio define tipos, defaults, validaciones y operaciones puras de anotaciones.
- La consolidacion de celdas y traslacion de geometria deben ser helpers testeables fuera de React y PixiJS.
- React administra herramientas activas, modales y formularios.
- PixiJS administra dibujo, hit testing, feedback de pintado y highlights temporales.
- El schema de escena valida datos persistidos y aplica defaults compatibles.
- Electron main/preload solo participan en el evento temporal hacia la ventana jugador; el renderer no accede directamente a filesystem.

## Seguridad y privacidad

- El contenido privado de pines y areas no debe incluirse en el snapshot de la ventana jugador.
- El payload temporal solo contiene la informacion visual minima necesaria.
- El texto capturado se renderiza como texto, no como HTML sin sanitizar.
- El Markdown se procesa con el renderer seguro ya usado por las notas de entidades.
- No habilitar HTML crudo dentro del Markdown.
- Links y contenido embebido deben seguir las restricciones de seguridad existentes; no abrir URLs desde el renderer sin el flujo seguro de Electron.
- Los datos cargados desde `.ttrpgscene` se validan antes de entrar al estado de la app.
- No se cargan assets remotos ni se agregan permisos de filesystem para esta funcionalidad.

## Rendimiento

- No crear un objeto persistente por cada evento `pointermove`.
- Consolidar el trazo al finalizar y eliminar celdas duplicadas.
- Actualizar el feedback visual del trazo de forma incremental.
- Mantener un limite razonable de muestras por trazo o simplificar la geometria sin alterar perceptiblemente su forma.
- Redibujar solo la capa de anotaciones cuando cambian pines o areas.
- Los highlights temporales se destruyen al terminar y no se acumulan en memoria.
- La sincronizacion del highlight no publica el snapshot completo de la escena.

## Testing y verificacion

- Tests unitarios para:
  - defaults de `mapAnnotations`;
  - validacion y normalizacion de pines;
  - validacion, deduplicacion y traslacion de celdas de area;
  - mapeo de tipo a color;
  - filtrado del payload privado para jugador;
  - busqueda de anotaciones por titulo, categoria y contenido;
  - calculo del centro de un area para `Ir a`;
  - reglas de bloqueo para mover y eliminar.
- Tests de schema para cargar escenas antiguas sin anotaciones.
- Tests de serializacion para guardar y cargar pines/areas sin perder coordenadas ni contenido.
- Tests del evento temporal para confirmar que no contiene descripcion.
- Smoke manual en Electron para crear, editar, mover, guardar, cargar y borrar anotaciones.
- Smoke manual con ventana jugador para confirmar privacidad y highlight de 5 segundos.

## Criterios de aceptacion

- Existe una accion `Pin de habitacion` para el DM.
- Un click con la herramienta activa guarda una coordenada de mundo y abre el modal.
- Cancelar el modal no deja un pin vacio en la escena.
- Guardar crea un pin visible solo para DM.
- El pin conserva nombre, informacion y posicion al guardar/cargar `.ttrpgscene`.
- El DM puede seleccionar, mover, editar y borrar un pin.
- El contenido del pin admite Markdown y puede alternarse entre edicion y previsualizacion.
- Existe un accordion `Anotaciones` en el panel izquierdo con arbol jerarquico y buscador.
- Buscar encuentra pines y areas por nombre, categoria o contenido.
- `Ir a` centra la camara sobre la anotacion sin cambiar el zoom.
- El DM puede ocultar o mostrar globalmente las anotaciones sin borrar datos.
- El indice sigue disponible cuando las anotaciones estan ocultas.
- El DM puede bloquear y desbloquear cada pin o area.
- Una anotacion bloqueada no puede moverse ni borrarse accidentalmente.
- El estado bloqueado se conserva al guardar/cargar `.ttrpgscene`.
- Existe una accion separada `Area de informacion`.
- El DM puede pintar una region con feedback visual durante el trazo.
- Al terminar el trazo se abre el modal de clasificacion y descripcion.
- Cancelar el modal no deja geometria provisional.
- El tipo admite `Terreno` y `Trampa`.
- El area conserva tipo, nombre, descripcion y geometria al guardar/cargar `.ttrpgscene`.
- El area persistente se muestra solo para DM.
- El DM puede seleccionar, editar y borrar un area.
- La descripcion del area admite Markdown y puede alternarse entre edicion y previsualizacion.
- Doble click, propiedades o la accion de una hoja de area disparan un highlight de 5 segundos en jugador.
- `Terreno` se resalta en verde oliva semitransparente.
- `Trampa` se resalta en rojo semitransparente.
- El jugador nunca recibe ni visualiza el contenido textual privado.
- El highlight desaparece y libera sus recursos al finalizar.
- Escenas antiguas sin anotaciones cargan correctamente con listas vacias.
- La funcionalidad no rompe seleccion, pan, zoom, niebla, fuego, agua, path ni apuntador.

## Riesgos y mitigaciones

- **Riesgo:** filtrar solo visualmente las anotaciones podria enviar secretos al renderer jugador.
  **Mitigacion:** construir un snapshot publico que excluya el contenido antes de IPC.
- **Riesgo:** el doble click puede confundirse con edicion o seleccion.
  **Mitigacion:** reservar doble click de area para highlight y ofrecer edicion desde propiedades.
- **Riesgo:** areas pintadas muy extensas pueden crecer demasiado en escena y memoria.
  **Mitigacion:** deduplicar, simplificar y consolidar geometria al terminar cada trazo.
- **Riesgo:** el highlight puede quedar oculto bajo niebla u oscuridad.
  **Mitigacion:** renderizarlo en una capa temporal superior de comunicacion visual.
- **Riesgo:** una ventana jugador cerrada puede causar errores IPC.
  **Mitigacion:** tratar la publicacion como best-effort y validar que exista un destino activo.

## Dependencias

- Spec 01 - Render engine.
- Spec 03 - Persistencia y formato de escena.
- Spec 05 - Navegacion e interaccion.
- Spec 06 - Sidebar y propiedades.
- Spec 09 - Fog of war, por convivencia de capas y herramientas.
- Spec 15 - Ventana de jugador y sincronizacion DM -> jugador.
- Spec 16 - Entidades, por reutilizacion del pipeline seguro de Markdown.
- Spec 17 - Apuntador arcano, como referencia para eventos visuales temporales.
