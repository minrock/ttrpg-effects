# Spec - Conexiones y Navegacion entre Escenas

Este documento define una funcionalidad para conectar puntos de distintas escenas `.ttrpgscene` y navegar entre mapas relacionados sin buscar y cargar manualmente cada archivo durante una sesion.

## Estado

Implementado y aceptado.

## Objetivo

Permitir que el DM cree marcadores privados de navegacion dentro de una escena, conecte dos marcadores ubicados en archivos `.ttrpgscene` diferentes y use esa relacion para cambiar de mapa mediante doble click.

La conexion debe ser reciproca y verificable:

- el marcador de la escena A conoce el archivo y marcador de destino en la escena B;
- el marcador de la escena B conoce el archivo y marcador correspondiente en la escena A;
- ambos archivos conservan la misma identidad de conexion y el sentido original `origen -> destino`;
- la aplicacion vuelve a validar ambos extremos al cargar una escena y antes de navegar;
- un enlace roto se muestra en rojo exclusivamente al DM.

## Contexto

TTRPG Effects ya permite cargar escenas, persistir datos en `.ttrpgscene`, mantener una ventana de jugador y colocar anotaciones privadas sobre el mapa. En una campana, un mismo lugar puede estar repartido entre varios mapas: pisos de una mazmorra, interiores y exteriores, habitaciones detalladas, ciudades o regiones conectadas.

Actualmente el DM debe recordar que archivo corresponde a cada salida, abrirlo manualmente y volver a ubicar la camara. Esta funcionalidad agrega una capa de navegacion espacial entre escenas sin convertir la aplicacion en un administrador completo de campanas.

## Terminologia

- **Marcador de conexion:** punto privado del DM colocado en coordenadas de mundo dentro de una escena.
- **Marcador sin enlazar:** marcador persistido sin archivo ni punto de destino.
- **Extremo:** uno de los dos marcadores que forman una conexion.
- **Escena par:** archivo `.ttrpgscene` que contiene el otro extremo.
- **Conexion reciproca:** relacion en la que ambos archivos identifican al otro extremo y coinciden en la identidad de la conexion.
- **Punto de entrada:** marcador de la escena destino sobre el cual debe centrarse Player View despues de navegar.
- **Enlace roto:** conexion cuyo archivo, escena, marcador o reciprocidad no puede validarse.

## Alcance

- Agregar una herramienta para crear `Marcador de conexion` en la vista DM.
- Guardar el marcador inicialmente sin enlace dentro del `.ttrpgscene` actual.
- Mostrar los marcadores exclusivamente en DM.
- Permitir seleccionar, mover, editar y eliminar un marcador usando los patrones vigentes de anotaciones.
- Al editar un marcador sin enlazar o reemplazar su conexion:
  - abrir un selector nativo de archivos limitado a `.ttrpgscene`;
  - leer y validar el archivo elegido sin cambiar la escena activa;
  - extraer unicamente sus marcadores de conexion;
  - mostrar esos marcadores en un listado para elegir el extremo destino;
  - no cargar mapa, tokens, efectos, entidades ni demas contenido del archivo durante esta seleccion.
- Crear la conexion reciproca al seleccionar un marcador destino.
- Persistir la actualizacion en ambos archivos `.ttrpgscene`.
- Guardar en ambos extremos:
  - identidad estable de la conexion;
  - archivo y marcador de origen;
  - archivo y marcador de destino;
  - rol local del extremo dentro de la conexion.
- Validar conexiones al cargar una escena.
- Volver a validar la conexion inmediatamente antes de navegar.
- Mostrar en rojo los marcadores con conexion rota.
- Mantener un estado visual distinto y no erroneo para marcadores todavia sin enlazar.
- Al hacer doble click sobre un marcador valido:
  - ejecutar las protecciones vigentes frente a cambios sin guardar;
  - cargar la escena par mediante el flujo seguro existente;
  - actualizar Player View con la nueva escena;
  - centrar Player View sobre el punto de entrada de la escena destino.
- Integrar los marcadores en el arbol izquierdo de anotaciones del DM.
- Mantener toda la informacion de conexiones fuera de Player View.

## Fuera de alcance

- Mostrar marcadores o nombres de conexiones en Player View.
- Permitir que Player View navegue o active conexiones.
- Cargar dos escenas simultaneamente en el canvas.
- Mostrar una previsualizacion grafica del mapa destino dentro del selector.
- Crear un mapa global o diagrama visual de todas las escenas conectadas.
- Copiar, incrustar o empaquetar escenas destino dentro del archivo actual.
- Sincronizar archivos mediante red, nube o repositorios externos.
- Buscar automaticamente archivos movidos o renombrados por todo el disco.
- Convertir rutas absolutas rotas en rutas nuevas sin intervencion del DM.
- Permitir conexiones a formatos diferentes de `.ttrpgscene`.
- Navegacion automatica por entrada de tokens, colisiones o line of sight.
- Mostrar el contenido privado de anotaciones de la escena destino durante la seleccion.
- Modificar mapa, camara, entidades, tokens, efectos o anotaciones no relacionadas del archivo destino al crear una conexion.

## Modelo de interaccion

### Crear un marcador sin enlazar

1. El DM activa `Marcador de conexion` desde las herramientas de anotaciones.
2. El cursor cambia para indicar que el siguiente click colocara el marcador.
3. El DM hace click sobre el mapa.
4. La posicion se convierte a coordenadas de mundo.
5. Se crea un marcador con id estable y `connection: null`.
6. El marcador queda guardado en memoria como contenido real de la escena.
7. Al guardar la escena, el marcador se persiste en `.ttrpgscene` aunque todavia no tenga destino.
8. La herramienta vuelve a seleccion.

Un marcador sin enlazar no se considera roto. Debe usar la presentacion neutral de la aplicacion y comunicar que aun requiere configuracion sin usar el rojo reservado para errores.

### Editar y elegir una escena destino

1. El DM selecciona el marcador y elige `Configurar conexion` o `Editar conexion`.
2. Se abre el dialogo nativo para elegir un `.ttrpgscene`.
3. La aplicacion valida el JSON y su version mediante el schema compartido.
4. Sin reemplazar la escena activa, se extraen solamente los marcadores de conexion del archivo elegido.
5. Se abre un modal con:
   - nombre del archivo destino;
   - ruta visible de solo lectura;
   - buscador por nombre de marcador;
   - lista de marcadores disponibles;
   - estado actual de cada marcador: sin enlazar, enlazado o roto si puede determinarse sin lecturas adicionales;
   - acciones `Cancelar` y `Conectar`.
6. El DM selecciona un marcador del archivo destino.
7. Antes de habilitar `Conectar`, se valida que:
   - el archivo siga disponible;
   - el marcador siga existiendo;
   - el marcador origen y destino sean diferentes;
   - los datos tengan ids y coordenadas validas.
8. Al confirmar, se escribe la relacion reciproca en ambos documentos.
9. La escena actualiza su estado en memoria con el extremo local ya conectado.
10. El modal se cierra y el marcador refleja su estado valido.

Cuando la escena actual ya tiene una ruta conocida, este flujo no abre un dialogo de guardado adicional:

- el unico selector visible es el dialogo para elegir el archivo `.ttrpgscene` destino;
- el estado vigente de la escena actual se persiste directamente en su ruta conocida;
- la escritura reciproca de origen y destino se ejecuta en segundo plano y confirma ambos archivos antes de cerrar el flujo;
- una escena nueva sin ruta solicita `Guardar como` una sola vez para establecer su archivo antes de conectar.

Si el archivo elegido no contiene marcadores de conexion, el modal muestra un estado vacio y no permite confirmar.

### Crear una relacion reciproca

La conexion se inicia desde el marcador A de la escena A hacia el marcador B de la escena B. Ambos archivos deben almacenar la misma informacion conceptual:

- `connectionId` comun;
- escena y marcador de origen: A;
- escena y marcador de destino: B;
- rol local `origin` en A y `destination` en B;
- referencia directa al extremo par para navegar en ambos sentidos.

Aunque exista un origen y destino historicos, la navegacion es bidireccional:

- doble click en A navega hacia B;
- doble click en B navega hacia A.

La direccion original se conserva para que ambos archivos puedan indicar de donde nacio y hacia donde fue creada la conexion, tal como requiere el flujo de preparacion del DM.

### Reconfigurar una conexion

- `Editar conexion` permite reemplazar la escena o marcador par.
- Antes de crear la nueva relacion, la aplicacion intenta localizar el extremo anterior y retirar su referencia reciproca.
- Si el extremo anterior no puede actualizarse, el DM recibe una advertencia clara antes de continuar.
- La nueva conexion solo se considera valida cuando ambos archivos contienen extremos reciprocos consistentes.
- Cancelar el flujo no modifica la conexion existente.

### Renombrar un marcador conectado

- `Guardar nombre` modifica solamente el nombre local; conserva id, posicion, `connectionId`, rol y referencias de ambos extremos.
- Si la escena actual ya tiene ruta, el nuevo nombre se escribe inmediatamente en ese `.ttrpgscene` mediante guardado directo en segundo plano y sin abrir `Guardar como`.
- La interfaz solo confirma el nuevo nombre despues de que Electron complete la escritura.
- El extremo remoto no se reescribe porque la conexion se identifica mediante ids y rutas, no mediante el nombre visible.
- Despues del guardado se vuelve a ejecutar la validacion habitual sin romper la reciprocidad.
- Si la escena aun no tiene ruta, el nombre queda en memoria y se incluye en el primer guardado requerido antes de conectar.

### Desligar sin eliminar el marcador

- El modal y el panel contextual del punto ofrecen `Desligar` para conservar la posicion local y volver a `connection: null`.
- La aplicacion lee el extremo remoto y solo lo libera si su `peer.scenePath` y `peer.markerId` todavia apuntan al archivo actual y al marcador local.
- Si el extremo remoto ya esta libre, se guarda solamente el extremo local sin enlace.
- Si el extremo remoto fue reasignado a otra escena o marcador, no se modifica: se desliga el extremo local y se advierte al DM.
- Si no puede acceder al archivo par, debe advertir que ese archivo puede conservar una referencia rota.
- Desligar no elimina ninguno de los dos marcadores.

### Cargar una escena con conexiones

1. La escena principal se carga mediante el flujo vigente.
2. Sus marcadores se renderizan de inmediato con estado `validando` o neutral, sin bloquear la aparicion del mapa.
3. Para cada marcador enlazado, la aplicacion intenta leer el archivo par.
4. La validacion comprueba:
   - que la ruta exista y sea legible;
   - que el archivo sea un `.ttrpgscene` valido y compatible;
   - que el marcador par exista;
   - que el `connectionId` coincida;
   - que origen y destino coincidan en ambos documentos;
   - que el extremo par apunte de vuelta al marcador local.
5. El estado visual del marcador pasa a valido o roto.
6. Un fallo no impide utilizar el resto de la escena.

La validacion es derivada y temporal. No se debe guardar `valid`, `broken` o mensajes de error como fuente de verdad dentro del documento de escena.

### Navegar mediante doble click

1. El DM hace doble click sobre un marcador enlazado.
2. La aplicacion vuelve a leer y validar el extremo par en ese momento.
3. Si la conexion es valida:
   - se ejecuta la proteccion vigente para cambios sin guardar en la escena actual;
   - se carga el archivo destino mediante el caso de uso normal de carga;
   - se resuelven sus assets mediante los protocolos seguros existentes;
   - Player View recibe la nueva escena;
   - Player View centra su camara en la coordenada del marcador de entrada;
   - el marcador de entrada queda disponible para regresar mediante doble click desde DM.
4. Si la conexion ya no es valida:
   - no se cambia de escena;
   - el marcador pasa a rojo;
   - se muestra un mensaje recuperable con la causa;
   - se ofrece `Editar conexion` para seleccionar nuevamente archivo y punto.

El doble click sobre un marcador sin enlazar abre su configuracion y no intenta navegar.

## Estados visuales

### Sin enlazar

- Presentacion neutral, diferenciable de un pin de habitacion.
- No usa rojo.
- Tooltip o propiedades indican `Sin conexion`.
- Doble click abre configuracion.

### Validando

- Puede usar una variacion temporal tenue o un indicador discreto.
- No bloquea el mapa ni el resto de controles.
- No participa como error hasta terminar la lectura.

### Conexion valida

- Mantiene el color normal/acento del marcador.
- Propiedades muestran el nombre del archivo y marcador par.
- Doble click navega despues de revalidar.

### Conexion rota

- El marcador se muestra rojo en la vista DM.
- El rojo se conserva mientras la validacion siga fallando.
- Propiedades muestran una causa concreta cuando sea conocida:
  - archivo no encontrado;
  - permiso denegado;
  - escena invalida o incompatible;
  - marcador destino inexistente;
  - identidad de conexion diferente;
  - reciprocidad ausente o inconsistente.
- Doble click no navega y vuelve a ejecutar la validacion.
- El DM puede editar, desligar o eliminar el marcador siguiendo las reglas normales.

## Arbol de anotaciones y propiedades

- El panel izquierdo agrega una rama `Conexiones de escena` dentro del arbol de anotaciones.
- Cada hoja muestra:
  - nombre local del marcador;
  - estado sin enlazar, valido, validando o roto;
  - nombre del archivo par cuando exista;
  - accion `Ir a` para centrar la camara local;
  - accion `Configurar` o `Editar conexion`;
  - accion `Desligar` cuando aplique.
- El buscador de anotaciones incluye nombre local y nombre del archivo par.
- Seleccionar una hoja selecciona el marcador correspondiente en el mapa.
- El accordion contextual del sidebar derecho muestra:
  - nombre editable del marcador;
  - estado de validacion;
  - archivo y marcador par;
  - rol local `Origen` o `Destino`;
  - acciones configurar, revalidar y desligar.
- El estado roto debe ser entendible sin depender solamente del color.

## Modelo de datos propuesto

Los marcadores forman parte de `mapAnnotations` para reutilizar persistencia, seleccion, privacidad y arbol existentes.

```ts
type SceneLinkRole = "origin" | "destination";

type SceneLinkEndpointReference = {
  scenePath: string;
  markerId: string;
};

type SceneLinkConnection = {
  connectionId: string;
  role: SceneLinkRole;
  origin: SceneLinkEndpointReference;
  destination: SceneLinkEndpointReference;
  peer: SceneLinkEndpointReference;
};

type SceneNavigationMarker = {
  id: string;
  kind: "scene-link";
  name: string;
  position: {
    x: number;
    y: number;
  };
  connection: SceneLinkConnection | null;
  locked: boolean;
};

type MapAnnotations = {
  pins: readonly MapInformationPin[];
  areas: readonly MapInformationArea[];
  sceneLinks: readonly SceneNavigationMarker[];
};
```

### Datos no persistentes

Los siguientes datos pertenecen al estado de ejecucion y no al `.ttrpgscene`:

- `validationStatus`;
- mensaje o codigo del ultimo error;
- fecha de ultima validacion;
- modal abierto;
- archivo candidato seleccionado pero no confirmado;
- listado temporal de marcadores leidos desde otro archivo;
- estado de carga o navegacion;
- color visual derivado.

## Persistencia y escritura reciproca

- `sceneLinks` se agrega al schema de escena con default `[]` para mantener compatibilidad con escenas anteriores.
- El marcador local se guarda con el flujo normal de escena.
- Establecer, reemplazar o retirar una conexion requiere escribir dos archivos.
- Antes de escribir se validan ambos documentos completos.
- La aplicacion debe evitar dejar una conexion parcialmente actualizada:
  - preparar ambos documentos en memoria;
  - escribir primero archivos temporales en sus respectivos directorios;
  - reemplazar los originales solo cuando ambas serializaciones esten listas;
  - si una sustitucion falla, reportar el estado y conservar o restaurar la ultima version valida cuando sea posible.
- Las escrituras usan main/infrastructure; el renderer nunca accede directamente a `fs`.
- Los payloads IPC contienen acciones especificas y datos validados, no canales genericos.
- No se modifican campos ajenos a `mapAnnotations.sceneLinks` en la escena par.
- Guardar manualmente la escena actual despues de establecer una conexion no debe borrar la actualizacion reciproca ya realizada.

## Rutas e identidad

- La primera version guarda rutas locales absolutas, coherente con las rutas de mapa vigentes.
- La identidad logica usa `connectionId` y ids estables de marcador; el nombre visible no participa en validacion.
- Renombrar un marcador no rompe la conexion.
- Mover un marcador dentro del mapa no rompe la conexion.
- Mover o renombrar un archivo `.ttrpgscene` fuera de la aplicacion rompe la ruta y produce estado rojo.
- Reubicar una conexion rota se hace mediante `Editar conexion`.
- No se permiten conexiones de un marcador consigo mismo.
- La primera version requiere escenas en archivos diferentes; no crea enlaces internos dentro del mismo `.ttrpgscene`.

## Integracion con Player View

- `sceneLinks` se elimina del snapshot publico de Player View, igual que las demas anotaciones privadas.
- Player View no recibe nombres, rutas, ids de conexion ni estados de validacion.
- Al navegar, Player View recibe la escena destino mediante el flujo normal DM -> jugador.
- Una vez cargada la escena destino, se envia una orden de camara especifica para centrar el punto de entrada.
- El centrado usa coordenadas de mundo del marcador destino.
- El zoom inicial conserva la politica vigente de Player View; este spec solo exige centrar el punto.
- Si Player View esta cerrada, la navegacion del DM sigue funcionando sin error.
- Si Player View se abre despues, recibe la escena actualmente activa, no un evento historico de navegacion.

## Integracion con guardado y cambios sin guardar

- Crear o mover un marcador marca la escena actual como modificada mediante el comportamiento vigente.
- Una conexion reciproca solo puede confirmarse cuando la escena origen tiene una ruta `.ttrpgscene` conocida.
- Si la escena actual nunca se ha guardado, `Configurar conexion` solicita guardarla antes de seleccionar el archivo par.
- Si hay cambios sin guardar al navegar, se reutiliza el modal existente para guardar, descartar o cancelar.
- Cancelar la navegacion conserva la escena y camaras actuales.
- Fallar al cargar la escena destino conserva la escena origen abierta y operable.
- Las escenas recientes pueden registrar la escena destino despues de una navegacion exitosa usando las reglas existentes.

## Conflictos entre herramientas

- La herramienta se puede activar desde `Anotaciones` en el sidebar derecho o desde `Anotaciones > Link a otro mapa` en el menu contextual del canvas.
- Ambos accesos activan el mismo flujo de colocacion y no crean implementaciones paralelas del marcador.
- `Marcador de conexion` es exclusivo con pin de habitacion, area informativa, niebla, fuego, agua, path, apuntador y demas herramientas de creacion.
- Space activa pan temporal sin crear un marcador.
- Escape cancela la colocacion o cierra el selector/modal sin modificar conexiones.
- Click derecho abre el menu contextual sin colocar un marcador accidentalmente.
- Un click selecciona; doble click configura o navega segun el estado.
- Un marcador bloqueado puede validarse y navegar, pero no moverse ni eliminarse hasta desbloquearlo.

## Seguridad y validacion

- Todo archivo elegido se valida con el schema versionado antes de leer marcadores.
- No confiar en ids, rutas, coordenadas ni `connectionId` provenientes del archivo.
- Rechazar coordenadas no finitas, ids vacios, rutas vacias y conexiones incompletas.
- Limitar cantidad y longitud de nombres para evitar escenas patologicas.
- No cargar imagenes, GIFs, tokens ni contenido Markdown del archivo candidato durante la seleccion de punto.
- No ejecutar HTML, scripts ni URLs almacenadas en el archivo.
- Las rutas se muestran como texto y no se convierten en enlaces ejecutables.
- La lectura y escritura de archivos ocurre mediante APIs tipadas de preload y handlers main validados.
- Los errores de filesystem se traducen a mensajes serializables y recuperables.

## Rendimiento

- La escena activa debe aparecer sin esperar a validar todos sus enlaces.
- Validar conexiones en segundo plano con concurrencia limitada para no abrir decenas de archivos a la vez.
- Deduplicar lecturas cuando varios marcadores apuntan al mismo `.ttrpgscene`.
- Cachear solo durante la ronda de validacion; doble click siempre revalida desde disco.
- No publicar snapshots completos a Player View durante la validacion.
- Cambiar un estado visual redibuja solo la capa de anotaciones/seleccion necesaria.
- Liberar operaciones y resultados temporales al cargar otra escena o destruir la ventana.

## Manejo de errores

- Un archivo par ausente no impide cargar la escena actual.
- Una escena par invalida no reemplaza la escena activa.
- Un marcador destino ausente deja el extremo local rojo y editable.
- Una relacion no reciproca se considera rota aunque el marcador remoto exista.
- Si la escritura reciproca falla, se informa que archivos fueron o no actualizados y se evita reportar exito.
- Si el archivo cambia entre seleccion y confirmacion, se vuelve a leer antes de escribir.
- Si el archivo cambia entre carga y doble click, la revalidacion usa el contenido mas reciente.
- Los mensajes deben indicar una accion recuperable: reintentar, editar conexion, desligar o cancelar.

## Testing y verificacion

### Dominio y schema

- Defaults de `sceneLinks` para escenas antiguas.
- Round-trip de marcador sin enlazar.
- Round-trip de ambos extremos de una conexion.
- Validacion de ids, roles, rutas, origen, destino y peer.
- Comparacion reciproca valida.
- Deteccion de connection id diferente.
- Deteccion de marcador remoto ausente.
- Renombrar o mover un marcador conserva la conexion.
- Renombrar un marcador con ruta conocida persiste el nombre sin abrir un dialogo y sin modificar su conexion.
- Snapshot de Player View elimina todos los datos de `sceneLinks`.

### Integracion de archivos

- Leer solo marcadores del archivo candidato.
- Conectar dos escenas actualiza ambos archivos.
- Desligar limpia ambos extremos cuando el remoto sigue ocupado por el archivo y marcador actuales.
- Desligar nunca libera un punto remoto que ya fue reasignado a otra conexion.
- Reconfigurar reemplaza la reciprocidad anterior.
- Fallo de lectura no modifica archivos.
- Fallo de validacion no modifica archivos.
- Fallo de escritura no reporta una conexion valida parcial.
- Escena origen sin ruta solicita guardado antes de conectar.

### Render e interaccion

- Marcador sin enlazar usa estado neutral.
- Marcador valido usa estado normal.
- Archivo o punto ausente vuelve rojo el marcador.
- El error tambien aparece como texto en propiedades.
- Marcadores nunca aparecen en Player View.
- Click selecciona y doble click configura o navega correctamente.
- Marcador bloqueado no se mueve ni elimina.

### Navegacion

- Doble click revalida antes de cargar.
- Conexion valida carga la escena par.
- Conexion rota no cambia la escena activa.
- Cambios sin guardar respetan guardar, descartar y cancelar.
- Player View recibe la nueva escena.
- Player View centra la coordenada del punto de entrada.
- La conexion permite regresar en sentido inverso.

## Criterios de aceptacion

- Existe una herramienta DM para crear marcadores de conexion.
- Un marcador nuevo puede guardarse sin conexion en `.ttrpgscene`.
- Los marcadores no aparecen ni viajan a Player View.
- Editar un marcador permite seleccionar otro archivo `.ttrpgscene`.
- La seleccion del archivo externo no reemplaza la escena activa.
- Del archivo externo se leen y muestran unicamente marcadores de conexion.
- El DM puede seleccionar un marcador destino ya existente.
- Confirmar crea una relacion reciproca consistente en ambos archivos.
- Ambos extremos conservan identidad, origen, destino y referencia al par.
- Renombrar o mover un marcador no rompe la relacion.
- Cargar una escena valida todos sus enlaces sin bloquear el mapa.
- Un archivo inexistente, punto inexistente o reciprocidad invalida muestra el marcador rojo al DM.
- El estado roto incluye una explicacion textual.
- Doble click vuelve a validar la conexion.
- Una conexion valida carga la escena par.
- Player View se actualiza y centra en el punto de entrada.
- Una conexion rota no cambia de escena y ofrece editarla.
- Es posible navegar de A hacia B y regresar de B hacia A.
- Las protecciones de cambios sin guardar se respetan.
- Escenas antiguas sin `sceneLinks` cargan con una lista vacia.
- La funcionalidad no rompe pines, areas, seleccion, pan, zoom, guardado, escenas recientes ni Player View.

## Riesgos y mitigaciones

- **Riesgo:** escribir dos archivos deja una relacion parcial.
  **Mitigacion:** preparar y validar ambos documentos, usar archivos temporales y reportar/recuperar fallos de sustitucion.
- **Riesgo:** el archivo par fue movido o eliminado.
  **Mitigacion:** validar al cargar y en doble click, mostrar rojo y permitir reconfigurar.
- **Riesgo:** el marcador par fue eliminado o enlazado de forma incompatible.
  **Mitigacion:** exigir coincidencia de id, connection id, origen, destino y referencia inversa.
- **Riesgo:** leer muchas escenas ralentiza la carga.
  **Mitigacion:** render inicial no bloqueante, lecturas deduplicadas y concurrencia limitada.
- **Riesgo:** Player View recibe rutas o secretos del DM.
  **Mitigacion:** eliminar `sceneLinks` al construir el snapshot publico y testear el payload.
- **Riesgo:** navegar descarta trabajo actual.
  **Mitigacion:** reutilizar el guard de cambios sin guardar antes de cargar el destino.
- **Riesgo:** una escena candidata maliciosa intenta cargar assets o contenido.
  **Mitigacion:** parsear solo el documento y extraer exclusivamente marcadores validados.

## Dependencias

- Spec 01 - Render engine y capas Pixi.
- Spec 03 - Persistencia y schema `.ttrpgscene`.
- Spec 05 - Seleccion, doble click, pan y conflictos de herramientas.
- Spec 06 - Sidebar derecho y panel izquierdo.
- Spec 15 - Player View y ordenes de camara.
- Spec 18 - Nueva escena, carga y guard de cambios sin guardar.
- Spec 19 - Escenas recientes.
- Spec 22 - Anotaciones, privacidad, arbol y render de marcadores DM.

## Decisiones confirmadas

1. **Escena origen guardada:** configurar una conexion exige que la escena actual ya tenga una ruta; si no, se abre primero `Guardar escena`.
2. **Rutas absolutas en la primera version:** mover un archivo fuera de la app rompe el enlace y requiere reconfigurarlo manualmente.
3. **Navegacion DM:** el DM carga la escena destino con el flujo normal; el requisito especial de camara se aplica a Player View, que se centra en el marcador de entrada.
4. **Reconfiguracion y desconexion:** la aplicacion intenta limpiar el extremo anterior; si no puede acceder a el, advierte que quedara una referencia rota en el otro archivo.
5. **Marcador destino preexistente:** ambos extremos deben crearse previamente como marcadores sin enlazar; el selector no crea automaticamente un punto dentro del archivo externo.
