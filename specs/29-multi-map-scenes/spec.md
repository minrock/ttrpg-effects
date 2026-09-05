# Spec 29 - Escenas con multiples mapas

## Estado

Draft funcional para revision.

## Objetivo

Convertir la escena de TTRPG Effects en un contenedor de uno o varios mapas, donde el DM pueda dirigir una misma escena compuesta por varias partes visuales del entorno sin salir del archivo actual.

La escena pasa a representar el conjunto jugable completo: mapas, notas generales, monstruos, NPCs, personajes jugadores y estado compartido de preparacion. Cada mapa conserva su propio contenido visual y tactico: imagen, grilla, camara, niebla, oscuridad, luces, efectos, formas, mediciones, tokens, objetos y anotaciones espaciales.

Una escena debe contener minimo un mapa para poder guardarse como archivo valido, aunque una escena nueva puede iniciar en blanco mientras el DM aun no ha agregado el primer mapa.

## Contexto

El DM puede dividir un entorno grande en varios archivos o mapas para controlar mejor lo que se muestra a los jugadores. Actualmente la app opera alrededor de un solo mapa cargado dentro de una `.ttrpgscene`, lo que obliga a tratar cada parte visual como archivo separado y dificulta dirigir una escena completa con varias zonas conectadas.

Esta spec introduce una evolucion del formato `.ttrpgscene`: los archivos antiguos de un solo mapa se abren y migran automaticamente a una escena nueva de un mapa. Desde esa escena migrada o desde una escena nueva, el DM puede agregar mapas adicionales y navegar entre ellos desde el panel izquierdo.

## Definiciones

- **Escena:** archivo `.ttrpgscene` nuevo, compuesto por uno o varios mapas y por entidades/documentos de nivel escena.
- **Mapa:** unidad visual dentro de una escena. Contiene una imagen de mapa y todo el estado tactico asociado a esa imagen.
- **Mapa activo:** mapa que el DM esta viendo/editando en el canvas y que se sincroniza con Player View.
- **Contenido de nivel escena:** informacion compartida entre todos los mapas de la escena.
- **Contenido de nivel mapa:** informacion que pertenece exclusivamente al mapa activo.
- **Escena en borrador:** estado inicial de una escena nueva sin mapas. Permite preparar la estructura, pero no puede guardarse hasta tener al menos un mapa.

## Alcance

### Incluido

- Cambiar el modelo funcional de escena para soportar multiples mapas.
- Mantener minimo un mapa por escena guardable.
- Permitir crear una escena nueva que inicialmente no tenga mapas.
- Bloquear el guardado de una escena mientras no tenga al menos un mapa.
- Migrar automaticamente archivos `.ttrpgscene` antiguos de un solo mapa al nuevo modelo con un solo mapa.
- Permitir agregar a la escena actual mapas provenientes de archivos `.ttrpgscene` antiguos.
- Al agregar archivos antiguos, incorporar su mapa y contenido de nivel mapa en la escena abierta.
- Mantener notas generales a nivel escena.
- Mantener monstruos, NPCs y personajes jugadores a nivel escena.
- Mantener objetos, anotaciones, grilla, mapa, luces, efectos, niebla, oscuridad, formas, mediciones, tokens y controles tacticos a nivel mapa.
- Agregar un navegador de mapas en el panel izquierdo.
- Reorganizar el panel izquierdo con tabs horizontales para alternar entre contenido de escena y contenido del mapa activo.
- Sincronizar Player View con el mapa activo seleccionado por el DM.
- Conservar camara y zoom por mapa.
- Cambiar el zoom bloqueado para que por defecto inicie desbloqueado; el DM decide cuando bloquearlo.
- Preparar el modelo para que las instancias de monstruos/tokens en mapa referencien informacion de nivel escena mediante ids estables.
- Permitir que los links entre mapas evolucionen para apuntar a mapas internos de la escena.
- Al migrar una escena antigua con conexiones a otros archivos, permitir construir una escena multi-mapa importando los archivos conectados y evitando duplicados por referencias circulares.

### Fuera de alcance

- Crear niveles superiores como campaña, capitulo, aventura o mundo.
- Sincronizacion por servidor, cuentas o colaboracion remota.
- Edicion simultanea por varios DMs.
- Persistencia en SQLite para campañas completas.
- Compartir notas, monstruos, NPCs o personajes entre varias escenas.
- Convertir automaticamente todos los tokens existentes en un sistema completo de encuentros multi-mapa.
- Automatizar IA, tacticas o comportamiento de monstruos.
- Historial/versionado de cambios por mapa.
- Resolver conflictos entre escenas importadas con ids duplicados mas alla de reglas seguras de remapeo.
- Generar builder, DMG o empaquetado como parte de esta spec.

## Modelo funcional de escena

Una escena nueva contiene:

- metadatos de escena;
- una coleccion de mapas;
- id del mapa activo, si existe;
- notas generales de escena;
- monstruos preparados para la escena;
- NPCs preparados para la escena;
- personajes jugadores preparados para la escena.

Cada mapa contiene:

- id estable;
- nombre visible;
- imagen/ruta del mapa;
- camara del DM;
- camara/estado relevante de Player View cuando aplique;
- grilla y calibracion;
- oscuridad y darkvision;
- niebla de guerra;
- luces;
- efectos;
- fuego/agua/efectos animados;
- formas y mediciones;
- tokens e instancias colocadas;
- pines de habitacion;
- areas de informacion;
- links visuales o navegables;
- seleccion y datos persistibles propios del mapa cuando correspondan.

Los estados puramente temporales de UI, como modales abiertos, texto de busqueda, herramienta activa o hover, no forman parte del modelo persistente salvo que ya exista una razon funcional para guardarlos.

## Nivel escena vs nivel mapa

### Nivel escena

El siguiente contenido pertenece a la escena completa:

- notas generales y su jerarquia;
- monstruos disponibles/preparados en la escena;
- NPCs de la escena;
- personajes jugadores de la escena;
- lista de mapas de la escena;
- orden y nombres de mapas;
- mapa activo al guardar, si existe.

Estas entidades pueden consultarse desde cualquier mapa. Cuando mas adelante existan niveles superiores como campaña o capitulo, este contenido podra moverse nuevamente hacia arriba, pero en esta spec sube un nivel respecto al mapa.

### Nivel mapa

El siguiente contenido pertenece solo al mapa activo:

- imagen del mapa;
- ajustes de grilla;
- fog of war;
- oscuridad;
- darkvision;
- luces;
- efectos visuales;
- formas;
- mediciones;
- tokens y posiciones;
- objetos del mapa;
- pines de habitacion;
- areas de informacion;
- trampas y terrenos espaciales;
- links colocados sobre el mapa;
- controles tacticos asociados al mapa.

Cambiar de mapa activo no debe mezclar ni perder contenido de otro mapa. Cada mapa conserva su propio estado al volver a seleccionarlo.

## Modelo de interaccion

### Crear nueva escena

1. El DM usa `Nueva escena`.
2. La app aplica el flujo de confirmacion/guardado vigente si hay cambios sin guardar.
3. Si se confirma la creacion, la app abre una escena en borrador sin mapas.
4. La UI indica que se debe agregar al menos un mapa para guardar.
5. El canvas queda vacio hasta que exista un mapa activo.
6. Las secciones de nivel escena pueden estar disponibles aunque aun no exista mapa.
7. Las herramientas de nivel mapa permanecen deshabilitadas o en estado vacio hasta agregar el primer mapa.

### Agregar primer mapa

1. El DM usa una accion visible `Agregar mapa` o `Agregar a escena`.
2. La app permite seleccionar una fuente valida.
3. Si se agrega una imagen de mapa nueva, se crea un mapa con defaults nuevos.
4. Si se agrega un archivo `.ttrpgscene` antiguo, se importa como un mapa dentro de la escena actual.
5. El primer mapa agregado se convierte automaticamente en mapa activo.
6. Desde ese momento la escena ya cumple el minimo funcional para guardarse.

### Agregar mapas adicionales

1. El DM usa `Agregar mapa` o `Agregar a escena` desde el navegador de mapas.
2. La app permite incorporar otro mapa sin descartar el mapa activo.
3. El mapa nuevo recibe un nombre editable y un id estable.
4. El DM puede elegir si el nuevo mapa queda activo inmediatamente o si se agrega sin cambiar el mapa activo. Por defecto queda activo para permitir calibrarlo y prepararlo.
5. El mapa anterior conserva su contenido, camara y estado tactico.

### Agregar archivos `.ttrpgscene` antiguos

La accion `Agregar a escena` acepta, por ahora, archivos `.ttrpgscene` en formato viejo o compatible de un solo mapa.

Al importar:

- se lee el archivo seleccionado mediante el flujo seguro existente de Electron/preload;
- se migra su contenido a un nuevo mapa dentro de la escena abierta;
- las notas generales, monstruos, NPCs y personajes del archivo importado se tratan como contenido de nivel escena y deben incorporarse con cuidado;
- el contenido visual y tactico del archivo importado se guarda dentro del nuevo mapa;
- si existen ids duplicados, la app debe remapearlos o resolverlos de forma segura sin sobrescribir contenido existente;
- si el archivo no contiene mapa valido, la app debe rechazar la importacion con un error recuperable.

La importacion no debe reemplazar la escena actual salvo que el usuario use explicitamente `Cargar escena`.

### Cargar una escena antigua

1. El DM abre un archivo `.ttrpgscene` antiguo.
2. La app detecta que pertenece al modelo anterior de un solo mapa.
3. La app lo migra automaticamente en memoria a una escena nueva con un solo mapa.
4. El mapa migrado queda como mapa activo.
5. Las notas generales quedan en nivel escena.
6. Las anotaciones espaciales, objetos y controles tacticos quedan dentro del mapa migrado.
7. Al guardar, la app guarda usando el nuevo formato hacia adelante.

El archivo viejo no se modifica en disco hasta que el usuario guarde.

### Cargar una escena nueva

1. El DM abre un archivo `.ttrpgscene` ya guardado con el nuevo modelo.
2. La app carga la lista de mapas.
3. El mapa activo guardado se restaura si sigue existiendo.
4. Si no hay mapa activo guardado o el id ya no existe, se selecciona el primer mapa disponible.
5. Cada mapa conserva su estado propio.
6. Las secciones de nivel escena muestran el contenido compartido.

### Navegar entre mapas

1. El DM abre el tab de escena/mapas del panel izquierdo.
2. Selecciona un mapa desde el navegador.
3. La app cambia el mapa activo.
4. El canvas muestra imagen, grilla, luces, fog, efectos, tokens, objetos y anotaciones del mapa seleccionado.
5. El mapa anterior conserva su camara, zoom y estado tactico.
6. El mapa nuevo restaura su propia camara y zoom.
7. La seleccion de objetos/anotaciones se limpia si pertenecia al mapa anterior.
8. Player View cambia automaticamente al nuevo mapa activo.

### Renombrar, ordenar y eliminar mapas

- Cada mapa tiene nombre editable.
- El navegador permite ordenar mapas para que el DM pueda reflejar progresion narrativa, pisos, regiones o flujo de sesion.
- El orden de mapas se persiste en la escena.
- El ultimo mapa de una escena guardable no puede eliminarse si eso dejaria la escena sin mapas, salvo que el flujo vuelva explicitamente a una escena en borrador no guardable.
- Si se intenta eliminar un mapa con contenido, la app muestra confirmacion.
- Eliminar un mapa borra todo su contenido de nivel mapa.
- Eliminar un mapa no borra notas, monstruos, NPCs ni personajes de nivel escena.
- Si se elimina el mapa activo, la app selecciona otro mapa disponible.
- Si no queda ningun mapa por una accion permitida de borrador, el canvas queda vacio y el guardado se bloquea hasta agregar uno nuevo.

## Panel izquierdo con tabs

El panel izquierdo adopta tabs horizontales para cambiar su contenido, inspirado en paneles de aplicaciones creativas como Illustrator o Photoshop, pero manteniendo la identidad visual de TTRPG Effects.

### Tabs iniciales

La primera version incluye al menos:

- `Escena`: contenido compartido de la escena.
- `Mapa`: contenido del mapa activo.

Los nombres finales pueden ajustarse en UI, pero la separacion conceptual debe ser clara.

### Tab Escena

El tab `Escena` contiene:

- navegador/listado de mapas;
- acciones para agregar mapa o agregar a escena;
- notas generales;
- monstruos;
- NPCs;
- personajes jugadores.

Estas secciones representan contenido disponible para toda la escena, no solo para el mapa visible.

### Tab Mapa

El tab `Mapa` contiene:

- arbol de objetos del mapa activo;
- arbol de anotaciones del mapa activo;
- pines de habitacion;
- areas de informacion;
- terrenos y trampas;
- accesos de busqueda, seleccion, centrado, bloqueo y borrado asociados al mapa activo.

Este tab cambia su contenido cuando cambia el mapa activo.

### Panel derecho

El panel derecho conserva su rol actual:

- herramientas;
- propiedades;
- controles contextuales;
- ajustes visuales/tacticos del mapa activo.

Por ahora el panel derecho no adopta tabs. Los objetos y anotaciones siguen manejandose desde el panel izquierdo cuando correspondan, aunque sus propiedades o acciones contextuales puedan seguir apareciendo a la derecha segun el comportamiento vigente.

## Player View

Player View siempre representa el mapa activo seleccionado por el DM.

Al cambiar el mapa activo:

- se publica el snapshot del nuevo mapa;
- se ocultan datos privados como hasta ahora;
- se conserva la separacion DM/jugador para pines, areas privadas y notas;
- se aplican fog, oscuridad, efectos y visibilidad propias de ese mapa;
- se restablece o aplica la camara de jugador correspondiente al nuevo mapa segun las reglas vigentes;
- no se revela contenido de nivel escena que no haya sido explicitamente enviado o permitido.

Si Player View esta abierta y el DM agrega o cambia mapas, la actualizacion debe ser recuperable aunque la ventana de jugador no este lista en ese instante.

## Zoom bloqueado

El zoom deja de iniciar bloqueado por defecto.

- Una escena nueva inicia con zoom desbloqueado.
- Un mapa importado desde archivo antiguo puede conservar su estado persistido si existe.
- Si no existe estado persistido, el mapa queda con zoom desbloqueado.
- El DM puede bloquearlo manualmente cuando quiera fijar escala o evitar cambios accidentales.
- Cambiar de mapa debe restaurar el estado de bloqueo correspondiente a ese mapa si se decide persistirlo como parte del mapa; si es preferencia de UI, debe mantenerse consistente y documentarse en el plan tecnico.

## Links internos entre mapas

Los links actuales que apuntan a otros archivos de escena pueden evolucionar para apuntar a mapas internos de la escena multi-mapa.

### En nueva escena multi-mapa

- Un link sobre el mapa puede apuntar a otro mapa dentro de la misma escena.
- El modal de nueva conexion no abre archivos externos; lista los mapas ya cargados en la escena, excluyendo el mapa activo.
- Al seleccionar un mapa destino, el modal muestra sus puntos de conexion y permite elegir solamente puntos libres.
- Guardar la conexion crea ambos extremos de forma reciproca usando `mapId` internos.
- Despues de conectar o desligar, la escena actual se guarda en background. Si la escena aun no tiene ruta, se solicita guardarla una vez.
- Activar el link cambia el mapa activo.
- Activar el link mueve la camara del DM y del jugador al punto de conexion del mapa destino.
- El link debe conservar una referencia estable al mapa destino.
- Si el destino ya no existe, el link queda marcado como roto de forma recuperable.

### Migracion desde escenas antiguas conectadas

Cuando una escena antigua contiene conexiones a otros archivos:

- la app puede importar automaticamente el archivo conectado como otro mapa de la escena nueva;
- si ese archivo conectado contiene conexiones adicionales, la app puede seguir el arbol de conexiones para construir una escena multi-mapa;
- si aparece una referencia circular hacia un archivo ya importado, no se vuelve a cargar;
- los links se remapean para apuntar al mapa interno ya creado;
- la importacion debe evitar loops infinitos y duplicados;
- los errores de archivos faltantes, inaccesibles o invalidos deben dejar links rotos recuperables, no abortar toda la escena si el mapa principal se pudo cargar.

Esta migracion debe ser forward-only: una vez guardada en formato nuevo, la escena resultante no tiene que poder abrirse en versiones antiguas de la app.

## Persistencia y compatibilidad

- El formato `.ttrpgscene` cambia hacia adelante para soportar multiples mapas.
- Archivos antiguos deben poder abrirse.
- Archivos antiguos se migran en memoria sin modificar el archivo original hasta que el usuario guarde.
- Al guardar una escena migrada, se escribe el formato nuevo.
- La compatibilidad hacia atras con versiones antiguas de la app no es requerida.
- El nuevo formato debe versionarse explicitamente.
- El schema debe validar minimo un mapa para archivos guardados.
- Una escena en borrador sin mapas puede existir solo en memoria.
- Si se intenta guardar una escena sin mapas, la app muestra un mensaje claro y no escribe archivo.
- Las rutas locales de imagen siguen siendo validas segun el comportamiento actual.
- Datos externos o importados no se consideran confiables y deben validarse.

## Seguridad

- El renderer no debe acceder directamente a filesystem, SQLite ni APIs Electron.
- Abrir, cargar, importar o agregar archivos debe pasar por preload/IPC tipado.
- La importacion de `.ttrpgscene` debe validar schema, version, rutas y payloads.
- Errores de importacion deben ser serializables y legibles.
- No se debe ejecutar contenido proveniente de notas, Markdown, nombres de mapas o rutas.
- La migracion de conexiones debe tener limites claros para evitar loops infinitos o cargas excesivas.

## Rendimiento

- Cambiar de mapa no debe reconstruir ni recalcular contenido de mapas no activos.
- El canvas solo renderiza el mapa activo.
- Los assets de mapas no activos pueden mantenerse en cache si mejora la experiencia, pero deben poder liberarse para evitar presion de memoria.
- Mapas grandes importados no deben bloquear la UI mas de lo necesario.
- El navegador de mapas debe poder manejar una cantidad razonable de mapas sin degradar la sesion.
- Cambiar entre mapas preparados debe sentirse inmediato para el DM una vez cargados los assets necesarios.

## Estados vacios y errores recuperables

### Escena sin mapas

- El canvas muestra un estado vacio claro.
- Las herramientas de mapa quedan deshabilitadas.
- El guardado queda deshabilitado o muestra error recuperable.
- El DM puede agregar el primer mapa desde una accion visible.

### Mapa sin imagen valida

- Si un mapa importado referencia una imagen faltante o rota, el mapa sigue existiendo.
- La app muestra un error recuperable y permite relocalizar o reemplazar la imagen en una mejora futura.
- El resto de la escena debe seguir accesible.

### Links rotos

- Un link cuyo destino no pudo importarse o ya no existe se marca como roto.
- El link no debe bloquear la carga de la escena completa.
- El DM debe poder editarlo o eliminarlo.

## Criterios de aceptacion

- Una escena nueva puede iniciar en blanco, pero no puede guardarse hasta tener al menos un mapa.
- Se puede agregar el primer mapa a una escena en blanco.
- Se pueden agregar mapas adicionales a una escena existente.
- Se puede abrir una `.ttrpgscene` antigua y queda representada como una escena nueva de un solo mapa.
- Guardar una escena migrada escribe el formato nuevo.
- Una escena puede contener varios mapas y navegar entre ellos desde el panel izquierdo.
- Cambiar de mapa activo reemplaza el contenido visible del canvas por el contenido propio de ese mapa.
- Cada mapa conserva su camara y zoom al cambiar entre mapas.
- Player View cambia automaticamente al mapa activo del DM.
- Notas generales se muestran y persisten a nivel escena.
- Monstruos, NPCs y personajes se muestran y persisten a nivel escena.
- Objetos, pines, areas, links visuales, grilla, fog, oscuridad, luces, efectos, formas, mediciones y tokens se muestran y persisten a nivel mapa.
- El panel izquierdo tiene tabs horizontales para alternar entre contenido de escena y contenido del mapa activo.
- El panel derecho conserva herramientas y propiedades/contexto del mapa activo.
- El zoom inicia desbloqueado por defecto en escenas/mapas nuevos.
- El ultimo mapa no puede eliminarse sin dejar la escena en un estado de borrador no guardable y claramente comunicado.
- Eliminar un mapa con contenido requiere confirmacion.
- Importar un `.ttrpgscene` antiguo mediante `Agregar a escena` incorpora su mapa sin reemplazar la escena abierta.
- Conexiones antiguas a otros archivos pueden migrarse a links internos entre mapas, evitando duplicados por referencias circulares.
- Links con destino faltante quedan rotos de forma recuperable.
- No hay acceso directo del renderer a Node.js, Electron internals, filesystem o SQLite.

## Riesgos

- Mezclar contenido de nivel escena y nivel mapa durante la migracion.
- Perder anotaciones, fog, luces o tokens al cambiar de mapa.
- Duplicar ids al importar varios archivos antiguos.
- Crear ciclos infinitos al seguir conexiones entre archivos.
- Consumir demasiada memoria si muchos mapas grandes quedan cargados al mismo tiempo.
- Confundir al DM si el panel izquierdo no comunica claramente si esta viendo informacion de escena o del mapa activo.
- Romper Player View al cambiar rapidamente entre mapas.
- Guardar una escena sin mapas por accidente.

## Notas para el plan tecnico

- Definir el nuevo schema versionado de `.ttrpgscene`.
- Diseñar una migracion pura desde documento antiguo a documento nuevo.
- Separar explicitamente tipos de `SceneDocument`, `SceneMapDocument` y contenido de nivel escena.
- Revisar si `SceneAside` actual debe convertirse en contenido de nivel escena.
- Revisar si `mapAnnotations`, `elements`, `shapes`, `lights`, `effects`, `tokens`, `grid`, `fog` y `darkness` deben moverse bajo cada mapa.
- Diseñar remapeo estable de ids al importar archivos.
- Definir limites para importacion recursiva de conexiones.
- Diseñar API de preload/IPC especifica para `Agregar a escena`.
- Validar que los callbacks de `MapViewport` sigan estables al cambiar de mapa.
- Agregar tests de serializacion, migracion, importacion, links circulares y seleccion de mapa activo.
