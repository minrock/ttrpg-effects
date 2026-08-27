# Spec - Sistema de Entidades

Este documento describe de forma unificada la funcionalidad de sistema de entidades, consolidando el alcance funcional vigente en el proyecto.

## Biblioteca Persistente de Monstruos

### Objetivo

Agregar una biblioteca local persistente de monstruos para que el DM pueda reutilizar statblocks entre escenas. Al agregar un monstruo a la campaña/escena, el usuario puede elegir uno existente desde un listado con buscador o crear uno nuevo. Si crea uno nuevo, este se guarda en la base de datos local y se inserta inmediatamente en la escena actual.

### Contexto

El aside del DM ya permite crear monstruos dentro de una escena y el sistema de templates de monstruos agrega plantillas Markdown/CSS para facilitar statblocks por sistema. Sin embargo, los monstruos creados viven solamente dentro de la escena. Para preparar campañas de forma mas eficiente, se necesita una biblioteca persistente que sobreviva entre escenas y pueda alimentar el flujo de agregar monstruos.

La app debe seguir funcionando sin servicios externos. La persistencia recomendada es SQLite local en el proceso `main`, guardada bajo `app.getPath("userData")`, expuesta al renderer mediante preload + IPC tipado.

### Alcance

- Crear una biblioteca local persistente de monstruos respaldada por SQLite.
- Agregar flujo de seleccion al hacer `+ Agregar monstruo`:
  - abrir modal tipo grilla/listado;
  - buscar por nombre;
  - filtrar o visualizar sistema/template;
  - seleccionar un monstruo existente;
  - crear un monstruo nuevo si no existe.
- Al elegir un monstruo existente:
  - se crea una instancia dentro de la escena actual;
  - se copian nombre, contenido/notas, template/sistema e imagen si aplica;
  - se genera un id unico de escena para evitar colisiones.
- Al crear un monstruo nuevo:
  - se guarda primero en la biblioteca local;
  - se agrega inmediatamente como instancia en la escena actual;
  - queda disponible para futuras escenas.
- Persistir en la DB:
  - nombre de monstruo;
  - sistema al que pertenece;
  - `templateId` usado cuando aplique;
  - contenido Markdown del statblock/notas;
  - metadata minima de auditoria local.
- Mantener el `.ttrpgscene` como formato portable de escena: la escena guarda la instancia de monstruo, no depende de que la biblioteca exista.

### Fuera de alcance

- Sincronizacion cloud o multiusuario.
- Marketplace/descarga remota de monstruos.
- Compendios protegidos por copyright.
- Importacion masiva desde archivos externos.
- Versionado complejo de monstruos ya insertados en escenas.
- Actualizacion automatica de instancias existentes cuando cambia el monstruo en biblioteca.
- Busqueda full-text avanzada en esta primera iteracion.
- Imagen obligatoria del monstruo.

### Comportamiento

#### Abrir biblioteca desde agregar monstruo

- En el aside DM, la accion `+ Agregar monstruo` deja de abrir directamente el formulario vacio.
- En su lugar abre un modal de biblioteca de monstruos.
- El modal debe ser tipo grilla/listado y tener buscador visible arriba.
- Cada item muestra:
  - imagen del monstruo a ancho completo de la card (aspect-ratio 16:9, placeholder si no hay imagen);
  - nombre;
  - sistema y template usado si existe.
- El listado debe permitir seleccionar un monstruo y agregarlo a la escena.

#### Buscar y seleccionar

- El usuario puede escribir en el buscador.
- El listado filtra por nombre y, si es razonable en la implementacion, tambien por sistema.
- Si no hay resultados, se muestra estado vacio con accion `Crear monstruo nuevo`.
- Al seleccionar un monstruo existente:
  - se crea una instancia `SceneMonster`;
  - `visibleToPlayer` inicia en `false`;
  - `templateId` se copia si existe;
  - `notes` se inicializa con el contenido Markdown guardado;
  - `name` se copia desde la biblioteca;
  - `id` se slugifica y se hace unico dentro de la escena.

#### Crear monstruo nuevo

- Desde el modal de biblioteca, el usuario puede elegir `Nuevo monstruo`.
- Se abre el formulario de monstruo actual, pero conectado a la biblioteca.
- El usuario captura:
  - nombre;
  - sistema;
  - template;
  - contenido Markdown;
  - imagen opcional si el flujo actual ya la soporta.
- Al guardar:
  - se valida que el nombre no este vacio;
  - se guarda el monstruo en SQLite;
  - se agrega inmediatamente una instancia a la escena actual;
  - el modal se cierra o vuelve al listado con feedback claro.

#### Editar monstruo de escena vs biblioteca

- Editar un monstruo ya agregado a la escena modifica la instancia de escena, como hoy.
- En esta primera iteracion, editar una instancia de escena no actualiza automaticamente la biblioteca.
- Si se requiere guardar cambios de una instancia hacia biblioteca, quedara para un spec futuro como `Actualizar entrada de biblioteca`.

### Modelo de datos

#### Entidad de biblioteca

```ts
type MonsterLibraryEntry = {
  id: string;
  name: string;
  system: string;
  templateId: string | null;
  contentMarkdown: string;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
};
```

#### Instancia en escena

`SceneMonster` mantiene su rol actual como copia/instancia dentro de una escena:

```ts
type SceneMonster = {
  id: string;
  name: string;
  imagePath: string | null;
  visibleToPlayer: boolean;
  notes: string;
  templateId?: string | null;
};
```

La escena no debe guardar solo una referencia a la biblioteca. Debe guardar los datos necesarios para abrirse de forma portable aunque la DB local no exista.

### Persistencia SQLite

La DB vive en `app.getPath("userData")`, por ejemplo:

```text
TTRPG Effects/ttrpg-effects.sqlite
```

Tabla inicial sugerida:

```sql
CREATE TABLE monster_library_entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  system TEXT NOT NULL,
  template_id TEXT,
  content_markdown TEXT NOT NULL,
  image_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX monster_library_entries_name_idx
  ON monster_library_entries (name);

CREATE INDEX monster_library_entries_system_idx
  ON monster_library_entries (system);
```

Migraciones:

- Deben ser versionadas.
- Deben ejecutarse desde `main` al iniciar la app o al inicializar el repositorio.
- La version de migracion puede vivir en `PRAGMA user_version` o tabla `schema_migrations`.

### Arquitectura

- `domain` define `MonsterLibraryEntry`, validaciones y conversion de entrada de biblioteca a `SceneMonster`.
- `application` define casos de uso:
  - listar/buscar monstruos;
  - guardar monstruo nuevo;
  - obtener monstruo por id;
  - convertir entrada a instancia de escena.
- `infrastructure` implementa repositorio SQLite.
- `main` inicializa DB, migraciones y registra IPC.
- `preload` expone funciones especificas:
  - `searchMonsterLibrary(query)`
  - `saveMonsterLibraryEntry(entry)`
  - `getMonsterLibraryEntry(id)`
- `renderer` consume la API desde el modal de biblioteca.
- El renderer no accede directamente a SQLite, filesystem ni Electron internals.

### IPC

Canales sugeridos:

- `monster-library:search`
- `monster-library:save`
- `monster-library:get`

Los payloads deben validarse en `main` antes de tocar la DB.

### UI / UX

- Modal amplio, tipo grilla/listado, reutilizando el look del aside DM.
- Buscador arriba, siempre visible.
- Resultados escaneables en cards compactas.
- Acciones principales:
  - `Agregar a escena`;
  - `Nuevo monstruo`.
- Si no hay resultados:
  - mostrar estado vacio;
  - ofrecer `Crear monstruo nuevo`.
- El formulario de nuevo monstruo debe mantener el selector de template del templates de monstruos.
- El sistema puede autocompletarse desde el template seleccionado si el template tiene `system`.

### Validacion

- `name` requerido, trim, longitud razonable.
- `system` requerido, trim, con default si viene vacio desde UI.
- `contentMarkdown` requerido o default vacio permitido solo si el usuario confirma.
- `templateId` debe ser string no vacio o `null`.
- `imagePath` debe ser string no vacio o `null`.
- Fechas en ISO string.
- Queries parametrizadas, nunca concatenar SQL con input de usuario.

### Criterios de aceptacion

- Al hacer `+ Agregar monstruo`, se abre el modal de biblioteca.
- El modal muestra una grilla/listado con buscador.
- El usuario puede buscar monstruos por nombre.
- El usuario puede seleccionar un monstruo existente y agregarlo a la escena.
- El monstruo agregado a escena conserva nombre, template, contenido Markdown e imagen si existe.
- El usuario puede crear un monstruo nuevo desde ese flujo.
- El monstruo nuevo se guarda en SQLite y queda disponible al volver a abrir el modal.
- El monstruo nuevo se agrega inmediatamente a la escena.
- Las escenas guardadas siguen siendo portables: incluyen los datos del monstruo insertado.
- La DB se maneja desde `main`/infraestructura, no desde renderer.
- Las consultas usan parametros SQL.
- Hay migracion inicial versionada.
- Tests relevantes cubren conversion de biblioteca a `SceneMonster` y validaciones basicas.

## Biblioteca Persistente de NPCs

### Objetivo

Extender el sistema de entidades para que los NPCs tambien vivan en la base de datos local y puedan reutilizarse entre escenas. El flujo debe ser equivalente al de monstruos: el DM abre una biblioteca, selecciona un NPC existente o crea uno nuevo, y el NPC queda insertado en la escena actual.

### Alcance

- Crear una biblioteca local persistente de NPCs respaldada por SQLite.
- Al hacer `+ Agregar NPC`, abrir un modal tipo grilla/listado con buscador.
- Mostrar todos los NPCs guardados en DB con una card compacta.
- Permitir seleccionar un NPC existente y agregarlo a la escena.
- Incluir accion `Nuevo NPC` dentro del modal.
- Al guardar un nuevo NPC:
  - persistirlo primero en la DB;
  - agregarlo automaticamente a la escena actual;
  - dejarlo disponible para futuras escenas.
- Mantener la escena portable: la instancia de escena guarda una copia de los datos del NPC, no solo una referencia a DB.

### Modelo de datos

La entrada persistente de biblioteca debe compartir el patron de monstruos, pero modelada como NPC:

```ts
type NpcLibraryEntry = {
  id: string;
  name: string;
  imagePath: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
```

La instancia de escena debe mantenerse independiente de la DB:

```ts
type SceneNpc = {
  id: string;
  name: string;
  imagePath: string | null;
  visibleToPlayer: boolean;
  notes: string;
};
```

### UI / UX

- `+ Agregar NPC` abre la biblioteca de NPCs.
- El modal usa una experiencia visual equivalente a la biblioteca de monstruos:
  - buscador visible;
  - grilla/listado;
  - card con imagen o placeholder;
  - nombre;
  - accion `Agregar a escena`;
  - accion principal `Nuevo NPC`.
- El formulario de nuevo NPC debe reutilizar el estilo actual del aside DM y mantener el flujo de imagen existente mediante preload/IPC.

### Criterios de aceptacion

- `+ Agregar NPC` abre un modal de biblioteca, no un formulario directo.
- El modal lista NPCs persistidos en DB y permite buscarlos.
- El usuario puede agregar un NPC existente a la escena.
- El usuario puede crear un NPC nuevo desde el modal.
- Al guardar un NPC nuevo, se persiste en DB y se agrega inmediatamente a la escena.
- Guardar/cargar `.ttrpgscene` mantiene los NPCs de escena aunque la DB local no exista.
- El renderer no accede directamente a SQLite ni filesystem.
- La carga de imagen de NPC usa el protocolo/API de preload existente.

## Personajes Jugadores

### Objetivo

Agregar Personajes Jugadores como un nuevo tipo de entidad de campaña/escena para que el DM tenga a mano la informacion visual y tactica clave de cada jugador. Estos personajes deben persistirse en la DB local, poder agregarse a escenas y mostrarse en el panel del DM con una vista de detalle compacta inspirada en una ficha/carta fisica.

### Alcance

- Crear una biblioteca persistente de Personajes Jugadores respaldada por SQLite.
- Agregar una nueva seccion de entidades para Personajes Jugadores en el panel del DM.
- Permitir crear, listar, buscar y agregar Personajes Jugadores a la escena.
- Cada Personaje Jugador tiene una imagen del personaje/jugador.
- La informacion guardada debe ser suficiente para que el DM pueda consultar rapidamente estadisticas clave sin abrir una hoja completa.
- La escena guarda una copia portable de cada Personaje Jugador agregado.
- Antes de agregar un Personaje Jugador a la escena, el listado de biblioteca permite abrir un preview, editarlo y guardar los cambios en la DB.

### Campos de captura

En los formularios de captura/edicion se muestran nombres completos para las caracteristicas:

- Nombre del Personaje.
- Nivel.
- Especie.
- Clase(s).
- Fuerza.
- Constitucion.
- Destreza.
- Inteligencia.
- Sabiduria.
- Carisma.
- Las caracteristicas se capturan como texto libre para permitir modificadores o valores flexibles como `+2`, `+4`, `-1` o `10`.
- Iniciativa.
- CA, como numero o dos numeros separados por slash (`d` o `d/d`).
- Percepcion Pasiva.
- Puntos de golpe.
- CD Salvacion de hechizos.
- Velocidad(es).
- Nombre del Jugador.
- Imagen del personaje/jugador.
- Notas en Markdown, con captura equivalente a monstruos/NPCs y renderizado Markdown en la vista de detalle.

### Vista de detalle para el DM

En la vista de detalle, los campos se compactan para lectura rapida:

- Caracteristicas abreviadas:
  - `Fue`
  - `Con`
  - `Des`
  - `Int`
  - `Sab`
  - `Car`
- `CD Salvacion de hechizos` se muestra como `CD`.
- `CA`, `PG`, `Iniciativa`, `Percepcion Pasiva`, `Velocidad(es)`, `Nivel`, `Especie`, `Clase(s)` y `Nombre del Jugador` deben mostrarse como bloques escaneables.
- Las notas del personaje se renderizan como Markdown en el detalle, incluyendo tablas cuando el contenido use sintaxis GFM.

La UI debe inspirarse en las referencias visuales provistas:

- Estilo de ficha/carta fisica con bordes ornamentales discretos.
- Imagen grande del personaje como foco visual.
- Nombre en una banda o marco destacado.
- Bloques de datos con labels compactos y jerarquia clara.
- La card de preview/detalle debe ocupar aproximadamente la mitad del viewport disponible y quedar centrada en el modal.
- El preview de biblioteca incluye una accion `Editar` para modificar el personaje antes de agregarlo a escena.
- Apariencia legible en tema oscuro de la app, sin copiar literalmente el material fotografiado.

### Modelo de datos

```ts
type PlayerCharacterLibraryEntry = {
  id: string;
  characterName: string;
  playerName: string;
  level: string;
  species: string;
  classes: string;
  imagePath: string | null;
  stats: {
    strength: string;
    constitution: string;
    dexterity: string;
    intelligence: string;
    wisdom: string;
    charisma: string;
  };
  initiative: string;
  armorClass: string;
  passivePerception: string;
  hitPoints: string;
  spellSaveDc: string;
  speeds: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
```

La instancia de escena debe copiar estos datos y tener id unico dentro de la escena.

### Validacion

- `characterName` requerido.
- `armorClass` acepta un numero o formato `numero/numero`.
- Las caracteristicas aceptan texto libre para soportar modificadores, numeros o valores vacios.
- Campos tacticos como iniciativa, velocidad y PG se guardan como string para permitir notacion flexible.
- La imagen es opcional, pero si existe se carga mediante el protocolo/API de preload existente.

### Criterios de aceptacion

- Existe una seccion de Personajes Jugadores en el panel de entidades del DM.
- El DM puede abrir una biblioteca/listado de Personajes Jugadores con buscador.
- El DM puede previsualizar y editar un Personaje Jugador existente antes de agregarlo a la escena.
- El DM puede agregar un Personaje Jugador existente a la escena desde el preview o desde la card de biblioteca.
- El DM puede crear un Personaje Jugador nuevo, guardarlo en DB y agregarlo automaticamente a la escena.
- La vista de detalle usa labels abreviados para caracteristicas y `CD`.
- El preview de biblioteca ocupa aproximadamente la mitad del viewport y permite editar el personaje antes de agregarlo.
- El formulario usa nombres completos para captura.
- La imagen se muestra en el detalle como foco visual.
- Las notas del personaje se pueden escribir como Markdown y se renderizan en el detalle igual que monstruos/NPCs.
- Guardar/cargar `.ttrpgscene` preserva Personajes Jugadores de escena.
- La DB vive en `main`/infraestructura y el renderer consume solo preload/IPC tipado.

## Panel lateral izquierdo del DM: Monstruos, NPCs y Notas

### Estado

Implementada.

### Objetivo

Agregar un panel lateral izquierdo a la ventana del DM que permita gestionar Monstruos, NPCs y Notas asociadas a la escena activa. El panel es exclusivo de la ventana del DM: no aparece en la ventana de jugador. Algunos elementos (imágenes de monstruos, nombre e imagen de NPCs) pueden mostrarse opcionalmente en la ventana de jugador cuando ya existan en la escena.

### Contexto

Durante una sesión de mesa, el DM necesita llevar registro de los enemigos presentes, los personajes no jugadores y anotaciones sobre la situación de la escena: estado de combate, motivaciones, secretos, condiciones o cualquier información que no conviene dejar solo en papel. Actualmente la app no ofrece un lugar dentro de la escena para estas anotaciones.

El panel no reemplaza una hoja de personaje ni un sistema de iniciativa; es un bloc de campaña ligero embebido en la escena para que el DM tenga todo visible sin salir de la app.

### Alcance

- Agregar un panel lateral izquierdo a la ventana del DM.
- El panel es colapsable para ampliar el viewport del mapa cuando no se necesite.
- El panel contiene tres secciones independientes: Monstruos, NPCs y Notas.
- Cada sección muestra una lista de sus ítems y un botón para agregar nuevos.
- Toda creación y edición ocurre desde modales dedicados.
- Las notas se guardan en la escena (`.ttrpgscene`).
- Los monstruos y NPCs se guardan en la escena (`.ttrpgscene`).
- Las imágenes de monstruos y NPCs se cargan con el mismo patrón IPC ya existente para tokens y mapas: un IPC de apertura (`token:open-image` / `map:open-image`) abre el diálogo nativo de archivo y devuelve `imagePath` (ruta absoluta) e `imageUrl` (URL con el protocolo personalizado `map-asset:`); la ruta absoluta se persiste en la escena y se resuelve al protocolo `map-asset:` en el renderer mediante el IPC de resolución (`token:resolve-url` / `map:resolve-url`) o un IPC nuevo equivalente para el aside. El protocolo `map-asset:` ya está registrado como privilegiado en el proceso principal y es el canal seguro establecido para servir assets locales al renderer sin exponer `file://`.
- En la ventana de jugador, los monstruos visibles muestran solo su imagen. Los NPCs visibles muestran nombre e imagen. Las notas nunca se muestran en jugador.
- La visibilidad de cada monstruo o NPC en la ventana de jugador se controla con un toggle en el panel del DM.

### Secciones del panel

#### Monstruos

- Lista de monstruos asociados a la escena.
- Cada ítem muestra: thumbnail de imagen (si existe) y nombre.
- Cada ítem tiene: toggle de visibilidad para jugador (acceso rápido) y botón eliminar.
- Hacer clic sobre el área de thumbnail + nombre abre el **modal de detalle** del monstruo.
- Botón `+` o equivalente para agregar un monstruo nuevo.

#### NPCs

- Lista de NPCs asociados a la escena.
- Cada ítem muestra: thumbnail de imagen (si existe) y nombre.
- Cada ítem tiene: toggle de visibilidad para jugador (acceso rápido) y botón eliminar.
- Hacer clic sobre el área de thumbnail + nombre abre el **modal de detalle** del NPC.
- Botón `+` o equivalente para agregar un NPC nuevo.

#### Notas

- Lista de notas de la escena.
- Las notas pueden ser de raíz (sin padre) o de primer nivel (hijo de una nota raíz). Máximo dos niveles.
- Las notas raíz muestran sus notas hijas anidadas debajo en la lista.
- Cada ítem muestra: nombre (slug legible) e indicador de nivel.
- Cada ítem tiene: botón editar, botón ver (solo lectura renderizado MD), botón agregar nota hija (solo en notas raíz), botón eliminar.
- Eliminar una nota raíz elimina también sus notas hijas.
- Botón `+` o equivalente para agregar una nota raíz nueva.

### Modales

Toda creación, edición y presentación ocurre en modales. Cada tipo tiene su propio modal.

#### Modal de detalle: Monstruo / NPC

Se abre al hacer clic sobre el ítem en la lista del panel. Es el punto central de interacción para la presentación a jugadores.

- **Imagen grande** (100×100 px mínimo en el modal DM; ver sección de jugador para el tamaño en esa ventana).
- **Nombre** del monstruo/NPC y etiqueta de tipo.
- **Badge de estado de visibilidad**: indica si el monstruo/NPC está actualmente visible en la ventana de jugador.
- **Notas** del monstruo/NPC renderizadas como Markdown (si existen).
- **Botón "👁 Mostrar a jugadores"**: activa la visibilidad en jugador; se convierte en "🚫 Ocultar de jugadores" cuando ya es visible.
- **Botón "✏️ Editar"**: cierra el detalle y abre el modal de captura con los datos actuales.
- **Botón "Cerrar"**: cierra el modal y automáticamente oculta el monstruo/NPC de la ventana de jugador si estaba visible.
- **Tamaño del modal**: mínimo 80 % del viewport de ancho y 60 % del viewport de alto.
- **Comportamiento al cerrar**: cerrar el modal (botón, backdrop o transición a edición) siempre establece `visibleToPlayer = false` si el ítem estaba visible. La presentación está ligada a la vida del modal.

#### Modal de captura: Monstruo

- **Imagen:** área de carga de imagen local (click o drag & drop). Muestra preview si ya hay imagen. No es obligatoria.
- **Nombre:** campo de texto libre.
- **Notas:** editor WYSIWYG con renderización Markdown directa (Tiptap). Igual que las notas de escena.
- Acciones: Guardar / Cancelar.

#### Modal de captura: NPC

- **Imagen:** área de carga de imagen local (click o drag & drop). Muestra preview si ya hay imagen. No es obligatoria.
- **Nombre:** campo de texto libre.
- **Notas:** editor WYSIWYG con renderización Markdown directa (Tiptap).
- Acciones: Guardar / Cancelar.

#### Modal de captura: Nota

- **Ruta del padre:** muestra la ruta de jerarquía en formato `/ nombre-padre / nombre-nota` si tiene padre, o `/` si es una nota raíz. No es editable directamente: refleja quién es el padre. Se muestra en la parte superior del modal como breadcrumb.
- **Nombre:** campo de texto libre. Debajo del campo se muestra en tiempo real el slug generado (guiones medios, minúsculas, sin caracteres especiales). El slug es el identificador persistido.
- **Contenido:** editor WYSIWYG con renderización directa en estilo Notion (el usuario escribe Markdown y la sintaxis se convierte visualmente en tiempo real: `**texto**` se convierte en **texto**, `# Título` se convierte en un encabezado, etc.).
- Acciones: Guardar / Cancelar.

#### Modal de vista: Nota

Cuando el DM solo quiere leer una nota sin editar:

- **Ruta:** muestra `/ nombre-padre / nombre-nota` o `/` según corresponda, como breadcrumb en la parte superior.
- **Nombre:** nombre legible de la nota.
- **Contenido:** contenido MD renderizado como HTML, sin editor activo.
- Acciones: Cerrar / Editar (abre el modal de captura).

### Editor WYSIWYG para notas

El editor debe ofrecer renderización directa en línea (inline rendering): el Markdown no se muestra como texto plano con asteriscos sino que se aplica el formato visualmente mientras se escribe, similar a Notion o Typora.

#### Librería recomendada: Tiptap

Tiptap (sobre ProseMirror) es la opción recomendada:

- Licencia MIT.
- Integración React nativa con `@tiptap/react`.
- Extensión `@tiptap/extension-markdown` para importar/exportar Markdown y representarlo visualmente.
- Soporta encabezados, negrita, cursiva, listas, código inline, bloques de código, citas.
- El contenido se almacena como Markdown (string) en la escena, no como HTML ni JSON de ProseMirror.
- Activamente mantenido y usado en producción.

Alternativa si Tiptap resulta excesiva en bundle o en complejidad de integración: implementación propia con `textarea` controlada + parser Markdown liviano para preview en tiempo real en dos paneles (editar / previsualizar). Esta opción es más simple pero no ofrece renderización inline verdadera, solo preview lateral.

La decisión final entre Tiptap y la implementación propia se toma en el plan técnico, evaluando tamaño de bundle y complejidad de integración con el stack actual.

### Visibilidad en la ventana de jugador

- El DM controla con un toggle individual si cada monstruo o NPC se muestra en la ventana de jugador.
- Un monstruo con visibilidad activada en jugador muestra únicamente su imagen (sin nombre).
- Un NPC con visibilidad activada en jugador muestra **nombre arriba a la izquierda** e imagen debajo.
- Si un monstruo o NPC no tiene imagen, no se muestra nada en la ventana de jugador aunque esté marcado como visible.
- Las notas nunca se muestran en la ventana de jugador.
- La visibilidad de jugador es estado de escena, no preferencia de UI local.
- **Al cerrar el modal de detalle** del DM, el ítem se oculta automáticamente de la ventana de jugador. La presentación está ligada al ciclo de vida del modal de detalle.

#### Overlay de jugador

- Cuando hay uno o más ítems visibles, se muestra un overlay de presentación que **cubre toda la ventana de jugador** con un fondo oscuro semitransparente (y blur sutil).
- Las entidades visibles se presentan centradas en la pantalla dentro de un contenedor decorativo.
- Cada imagen se muestra a 440×440 px por defecto.
- **Zoom**: hacer clic sobre la imagen la amplía a `min(72vw, 72vh)` (y vuelve a 440 px al hacer clic de nuevo). Un icono 🔍 en la esquina inferior derecha indica la acción disponible.
- Si hay múltiples entidades visibles simultáneamente, aparecen en fila horizontal con scroll si supera el ancho disponible.

### Modelo de interacción

#### Panel lateral izquierdo

- El panel se muestra por defecto al abrir o cargar una escena.
- El panel puede ocultarse con un control visible (botón o flecha). Al ocultarse, el viewport del mapa se expande para ocupar el espacio liberado.
- Al mostrarse de nuevo, el viewport se contrae de vuelta.
- Las tres secciones (Monstruos, NPCs, Notas) coexisten en el panel; pueden estar siempre visibles en scroll o ser acordeones colapsables (a definir en plan).
- El panel no interfiere con herramientas de edición sobre el canvas.

#### Agregar / editar

- Clic en `+` abre el modal de captura correspondiente vacío.
- Clic en editar abre el modal de captura correspondiente con los datos actuales.
- Guardar escribe el ítem en el estado de escena y cierra el modal.
- Cancelar descarta cambios y cierra el modal.

#### Eliminar

- Eliminar muestra una confirmación mínima antes de borrar.
- Eliminar un monstruo o NPC lo quita de la escena; si estaba visible en jugador, deja de aparecer.
- Eliminar una nota raíz elimina también sus notas hijas (con confirmación explícita si tiene hijos).

#### Notas anidadas

- Solo existen dos niveles: nota raíz y nota hija.
- Una nota hija no puede tener hijos.
- El botón de agregar nota hija solo aparece en notas raíz.
- Al agregar una nota hija, el modal de captura muestra la ruta del padre en el breadcrumb.
- Al editar una nota hija, el breadcrumb refleja su padre.

### Layout y estilo

- El panel lateral izquierdo vive a la izquierda del canvas, debajo de la toolbar principal si existe.
- Ancho fijo suficiente para thumbnails de imagen, nombre y controles de ítem sin truncar.
- El panel es scrollable verticalmente si el contenido supera la altura disponible.
- Los thumbnails de imagen son cuadrados pequeños (aprox. 40×40 px) para Monstruos y NPCs en la lista.
- Los modales son overlays centrados con backdrop, sin bloquear la ventana del DM si se mueve.
- El estilo debe seguir el tema oscuro actual de la app.
- Los controles del panel no deben confundirse visualmente con controles de edición del canvas.

### Persistencia

- Los monstruos, NPCs y notas se guardan dentro del archivo `.ttrpgscene` de la escena activa.
- Se agrega un campo opcional `sceneAside` (o similar) al schema de escena.
- Si el campo no existe en un archivo de escena antiguo, se inicializa vacío (no rompe compatibilidad).
- Las imágenes se persisten como rutas absolutas locales (`imagePath`), siguiendo el patrón ya establecido para tokens y mapas. En el renderer se resuelven al protocolo `map-asset:` mediante IPC antes de renderizarlas.
- El slug de la nota se calcula al capturar y se persiste como identificador; el nombre legible se persiste por separado.
- La visibilidad de cada monstruo/NPC en jugador se persiste como campo del ítem en la escena.

### IPC / Electron

- Los cambios en el panel del DM se sincronizan a la ventana de jugador mediante los canales IPC existentes de actualización de escena (ver ventana de jugador).
- No se requieren canales IPC nuevos si los existentes ya transfieren el estado completo de escena.
- Si la imagen se persiste como ruta absoluta, la ventana de jugador debe poder resolverla con el mismo protocolo seguro usado para mapas/tokens.
- No se exponen APIs de Node.js o Electron directamente al renderer.

### Fuera de alcance

- Sistema de iniciativa o combate.
- Hoja de personaje o bloque de estadísticas.
- Relaciones entre monstruos, NPCs y tokens del mapa.
- Más de dos niveles de anidamiento de notas.
- Búsqueda o filtrado dentro del panel.
- Etiquetas o categorías adicionales.
- Compartir notas entre escenas.
- Sincronización de notas con jugadores.
- Rich text más allá de lo que soporte la librería elegida (tablas, imágenes inline en notas, etc.).
- Drag & drop para reordenar ítems de la lista.

### Criterios de aceptación

- La ventana del DM muestra un panel lateral izquierdo.
- El panel lateral puede ocultarse y mostrarse; el canvas ajusta su tamaño al espacio disponible.
- El panel muestra secciones para Monstruos, NPCs y Notas.
- El DM puede agregar un monstruo con nombre, imagen opcional y notas desde un modal.
- El DM puede agregar un NPC con nombre, imagen opcional y notas desde un modal.
- El DM puede editar y eliminar monstruos y NPCs existentes.
- Hacer clic sobre un monstruo o NPC en la lista abre el modal de detalle.
- El modal de detalle muestra imagen grande, nombre, badge de visibilidad y notas renderizadas.
- El modal de detalle ocupa mínimo 80 % del viewport de ancho y 60 % del viewport de alto.
- El modal de detalle tiene el botón "Mostrar a jugadores" / "Ocultar de jugadores" prominente.
- Cerrar el modal de detalle (cualquier método) oculta automáticamente la entidad de la ventana de jugador.
- El DM puede agregar una nota raíz con nombre y contenido WYSIWYG desde un modal.
- El DM puede agregar una nota hija de una nota raíz; el modal muestra la ruta del padre.
- El modal de captura de nota muestra el slug generado en tiempo real debajo del campo de nombre.
- El editor de nota renderiza el Markdown visualmente mientras se escribe (no muestra sintaxis cruda).
- El DM puede ver una nota en modo solo lectura con el contenido renderizado.
- El DM puede editar una nota abierta en modo vista desde un botón en ese modal.
- Eliminar una nota raíz con hijos pide confirmación explícita y borra los hijos también.
- Los monstruos y NPCs tienen un toggle de visibilidad rápido directamente en la fila de la lista.
- Cuando una entidad es visible en jugador, la ventana de jugador muestra el overlay de presentación centrado cubriendo el mapa.
- Un monstruo visible en jugador muestra solo su imagen (440×440 px por defecto).
- Un NPC visible en jugador muestra su nombre arriba a la izquierda y la imagen debajo.
- Las imágenes del overlay son ampliables al hacer clic (hasta `min(72vw, 72vh)`).
- Las notas no aparecen en la ventana de jugador en ningún caso.
- Los cambios persisten al guardar la escena en `.ttrpgscene`.
- Abrir una escena existente restaura monstruos, NPCs y notas del panel.
- Una escena sin datos de panel carga sin errores con el panel vacío.
- El panel lateral no aparece en la ventana de jugador.
- No se agregan accesos directos del renderer a Node.js, Electron internals o filesystem.

### Riesgos

- **Tamaño de bundle con Tiptap:** ProseMirror es pesado; si afecta el tiempo de carga de la app, evaluar la alternativa de implementación propia con preview separado.
  **Mitigación:** lazy loading del editor; el modal solo carga Tiptap cuando se abre por primera vez.

- **Portabilidad de imágenes entre máquinas:** las rutas absolutas son frágiles si la escena se mueve a otra máquina, igual que ocurre con mapas y tokens hoy.
  **Mitigación:** mismo comportamiento que el patrón existente de tokens/mapas; la portabilidad cross-máquina está fuera de alcance de esta spec.

- **Sincronización a jugador del nuevo campo de escena:** si el IPC de ventana de jugador serializa solo campos conocidos, el nuevo campo `sceneAside` podría perderse en tránsito.
  **Mitigación:** verificar que el canal IPC usa serialización completa del objeto de escena o añadir el nuevo campo al schema de transferencia.

- **Colisión de slugs en notas:** dos notas con el mismo nombre raíz tendrían el mismo slug.
  **Mitigación:** al guardar, verificar unicidad en el nivel correspondiente y agregar sufijo numérico si es necesario (`mi-nota`, `mi-nota-2`).

### Notas de implementación futura

- `sceneAside` es un campo opcional de primer nivel en el schema de escena Zod; si no existe, se inicializa como `{ monsters: [], npcs: [], notes: [] }`.
- Las notas hija guardan referencia al slug del padre, no a un id autogenerado; esto simplifica la edición manual del `.ttrpgscene`.
- La visibilidad de monstruos/NPCs en jugador (`visibleToPlayer: boolean`) se incluye en el estado de escena para que la sincronización IPC la transmita automáticamente.
- El panel lateral izquierdo es un componente React independiente del sidebar derecho existente (sidebar derecho). Ambos paneles coexisten.
- Si en el futuro se quieren relacionar monstruos/NPCs con tokens del mapa, el slug puede servir como clave de relación sin requerir UUIDs nuevos.

## Labels de Mapa Solo DM

### Objetivo

Permitir que el DM agregue textos tipo label sobre el mapa para identificar zonas, notas tacticas o referencias de preparacion, visibles solamente en el render del DM.

### Contexto

El DM necesita marcar areas del mapa con nombres o pistas operativas sin mostrarlas a los jugadores. Hoy existen herramientas visuales compartidas entre DM y ventana de jugador, pero no una herramienta de texto privada para preparacion o control durante la sesion.

### Alcance

- Agregar labels de texto sobre el mapa desde la UI del DM.
- Los labels se muestran solo en la vista del DM.
- Los labels no se muestran en la ventana de jugador ni se publican como contenido visible para jugadores.
- Los labels se pueden seleccionar y arrastrar sobre el mapa.
- Al seleccionar un label, sus propiedades se muestran en el aside derecho como el resto de propiedades de objeto seleccionado.
- Persistir los labels dentro de la escena `.ttrpgscene`.
- Cargar labels guardados cuando se abre una escena.

### Fuera de alcance

- Texto visible para jugadores.
- Texto enriquecido multilinea avanzado.
- Fuentes externas o embebidas.
- Rotacion de texto.
- Markdown, HTML o links clicables.
- Colisiones automaticas con tokens, efectos o figuras.

### Comportamiento

#### Crear label

- El usuario puede crear un label desde una accion de DM en la interfaz existente.
- El label se crea en el centro aproximado del viewport visible o en la celda/punto donde se haya invocado la accion si el flujo contextual lo permite.
- El texto inicial puede ser `Label` o un valor editable inmediatamente despues de crear.
- El label queda seleccionado despues de crearse para que el DM pueda editarlo desde el aside.

#### Mostrar label

- En el render del DM, el label se dibuja en coordenadas de mundo y se mueve con el mapa.
- En la ventana de jugador, el label no se renderiza.
- El label debe mantenerse por encima del mapa y de overlays tacticos que puedan ocultar informacion de preparacion del DM, sin modificar el orden publico de capas para el jugador.
- El label debe seguir siendo legible sobre mapas oscuros o claros mediante color, sombra y opacidad configurables.

#### Seleccionar y mover

- El label es seleccionable con click igual que otros objetos.
- Al estar seleccionado, puede arrastrarse libremente sobre el mapa.
- El movimiento guarda la nueva posicion en coordenadas de mundo.
- Delete y Backspace eliminan el label seleccionado, siguiendo el comportamiento actual de objetos seleccionables.
- Escape deselecciona o cancela segun el comportamiento global actual.

#### Propiedades en aside derecho

Cuando un label esta seleccionado, el aside derecho muestra un acordeon de propiedades con el tipo `Label` o `Texto`.

Propiedades editables:

- Texto.
- Font usando fuentes del sistema disponibles por CSS/font-family.
- Color del texto.
- Sombra activada/desactivada.
- Color de sombra.
- Intensidad o blur de sombra.
- Opacidad.

Restricciones:

- El texto debe tratarse como texto plano, nunca como HTML.
- La opacidad se limita entre 0 y 1.
- El color debe validarse como color CSS seguro usado por el input de color.
- La fuente debe seleccionarse desde una lista cerrada de fonts del sistema.

### Modelo de datos

Agregar una entidad persistente para labels de DM:

```ts
type SceneLabel = {
  id: string;
  type: "label";
  text: string;
  position: WorldPoint;
  fontFamily: string;
  color: string;
  opacity: number;
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
  };
};
```

La escena debe guardar un arreglo de labels, por ejemplo `labels: SceneLabel[]`, manteniendo compatibilidad con escenas previas sin labels.

### Arquitectura

- La definicion del tipo vive en dominio o tipos compartidos de escena.
- La serializacion y carga de `.ttrpgscene` debe aceptar escenas antiguas sin `labels`.
- PixiJS renderiza labels en una capa privada del DM.
- La ventana de jugador recibe la escena sin renderizar labels, o filtra labels en su adaptador de render.
- El renderer no accede directamente a filesystem ni Electron internals.

### Criterios de aceptacion

- El DM puede crear un label de texto sobre el mapa.
- El label se ve en la vista del DM.
- El label no se ve en la ventana de jugador.
- El label se puede seleccionar y arrastrar.
- Al seleccionar un label, el aside derecho muestra sus propiedades.
- Se puede cambiar texto, font, color, sombra y opacidad.
- Delete/Backspace elimina el label seleccionado.
- Los labels se guardan y cargan dentro de `.ttrpgscene`.
- Escenas antiguas sin labels siguen cargando correctamente.

## Sistema de Templates de Monstruos

### Objetivo

Permitir que el DM administre templates de Markdown para notas de monstruos, elija un template al crear o editar un monstruo, rellene datos con una estructura prehecha y visualice el resultado con estilos CSS propios del template.

### Contexto

Las notas de monstruos ya aceptan Markdown y tablas GFM. Para preparar encuentros mas rapido, el DM necesita templates por sistema de juego que funcionen como statblocks reutilizables. El primer template incluido sera D&D 5.5e, inspirado visualmente en statblocks de AideDD dentro de su contenedor `jaune`, pero traducido y estructurado con los campos definidos para esta aplicacion.

### Alcance

- Crear un sistema persistente de templates de monstruos dentro del software.
- Agregar una opcion en el menu de aplicacion: `File` / `Archivo` -> `Administrar templates de monstruos`.
- El administrador abre un modal con:
  - listado lateral de templates guardados;
  - editor de Markdown;
  - editor de CSS scoped;
  - previsualizacion del template;
  - boton para alternar entre editar y previsualizar;
  - boton guardar.
- Agregar selector de template en el formulario de monstruo:
  - `Sin template`;
  - templates guardados.
- Al elegir un template, las notas del monstruo se rellenan con el Markdown del template.
- Las notas de monstruo se editan como Markdown plano para preservar tablas GFM, pipes y placeholders sin que un editor rich text reserialice el contenido.
- Renderizar la vista de detalle del monstruo aplicando el CSS del template si el monstruo fue creado o marcado con ese template.
- Incluir un template semilla D&D 5.5e en espanol.
- Guardar templates de forma local para que persistan entre sesiones de la app.

### Fuera de alcance

- Marketplace o descarga remota de templates.
- Sincronizacion entre computadores.
- Variables interactivas con formularios por campo.
- Importar contenido protegido o copiar statblocks completos de terceros.
- Soporte completo de CSS arbitrario global.
- Editor visual avanzado de tablas o layout del template.
- Templates para NPCs o notas generales en esta iteracion.

### Comportamiento

#### Administrar templates

- Desde el menu de aplicacion, el DM abre `Administrar templates de monstruos`.
- El modal muestra a la izquierda los templates existentes.
- La derecha muestra:
  - nombre del template;
  - sistema o etiqueta, por ejemplo `D&D 5.5e`;
  - textarea/editor para Markdown;
  - textarea/editor para CSS;
  - boton `Previsualizar` / `Editar`;
  - boton `Guardar`.
- En modo edicion se editan Markdown y CSS.
- En modo previsualizacion se renderiza el Markdown con el CSS scoped del template.
- El usuario puede crear un template nuevo duplicando uno existente o desde un template vacio.
- El usuario puede guardar cambios.
- El template semilla D&D 5.5e debe estar disponible aunque no existan templates del usuario.

#### Usar un template en monstruos

- En el modal de crear/editar monstruo, sobre el editor de notas, se muestra un selector:
  - `Sin template`;
  - un item por template guardado.
- Si el usuario elige `Sin template`, las notas se comportan como hasta ahora.
- Si el usuario elige un template y las notas estan vacias, se rellena el Markdown del template.
- Si las notas ya tienen contenido y el usuario cambia de template, se debe pedir confirmacion antes de reemplazar las notas.
- El monstruo guarda el `templateId` usado.
- En la vista de detalle del monstruo, si `templateId` existe y el template esta disponible, el Markdown se renderiza dentro de un contenedor con el CSS scoped del template.
- El Markdown del monstruo no debe pasar por un editor rich text que agregue lineas vacias entre filas de tabla o transforme caracteres especiales.
- El Markdown visible/editable del usuario no debe incluir HTML estructural del card; el render del template agrega el wrapper HTML/clases necesarias segun el template seleccionado.
- Si el template fue eliminado o no se puede cargar, el monstruo se renderiza con el estilo Markdown normal y muestra un estado recuperable, sin romper la nota.

### Template semilla D&D 5.5e

El template debe capturar los siguientes campos en espanol y usar un estilo de card claro en blancos/grises con acentos rojos, borde redondeado, ancho amplio cercano a `672px` y tabla compacta de caracteristicas similar a un statblock moderno:

- Nombre.
- Descripcion corta, alineacion.
- Clase de Armadura usando `CA`.
- Iniciativa.
- Puntos de golpe usando `PG`.
- Velocidad.
- Tabla de caracteristicas:
  - `FUE` para STR.
  - `DES` para DEX.
  - `CON`.
  - `INT`.
  - `SAB` para WIS.
  - `CAR` para CHA.
- Habilidades.
- Inmunidades.
- Sentidos.
- Idiomas.
- Valor de Desafio usando `VD`.
- Bono de Competencia usando `Bonif.`.
- Rasgos.
- Acciones.
- Acciones Legendarias.
- Acciones de Guarida.
- Reacciones.

Markdown base sugerido:

```md
## {{Nombre}}

*{{Descripcion corta}}, {{alineacion}}*

**CA** {{CA}}  
**Iniciativa** {{Iniciativa}}  
**PG** {{PG}}  
**Velocidad** {{Velocidad}}

| | MOD | SALV. | | MOD | SALV. | | MOD | SALV. |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| **FUE** {{FUE}} | {{FUE_MOD}} | {{FUE_SALV}} | **DES** {{DES}} | {{DES_MOD}} | {{DES_SALV}} | **CON** {{CON}} | {{CON_MOD}} | {{CON_SALV}} |
| **INT** {{INT}} | {{INT_MOD}} | {{INT_SALV}} | **SAB** {{SAB}} | {{SAB_MOD}} | {{SAB_SALV}} | **CAR** {{CAR}} | {{CAR_MOD}} | {{CAR_SALV}} |

**Habilidades** {{Habilidades}}  
**Inmunidades** {{Inmunidades}}  
**Sentidos** {{Sentidos}}  
**Idiomas** {{Idiomas}}  
**VD** {{VD}}  
**Bonif.** {{Bonif}}

### Rasgos

**{{Rasgo 1}}.** {{Descripcion del rasgo.}}

### Acciones

**{{Accion 1}}.** {{Descripcion de la accion.}}

### Reacciones

**{{Reaccion 1}}.** {{Descripcion de la reaccion.}}

### Acciones Legendarias

**{{Accion legendaria 1}}.** {{Descripcion de la accion legendaria.}}

### Acciones de Guarida

**{{Accion de guarida 1}}.** {{Descripcion de la accion de guarida.}}
```

CSS base sugerido:

```css
.monster-card.dnd-55e {
  max-width: 760px;
  margin: 0 auto;
  border: 1px solid #d1a843;
  border-radius: 8px;
  padding: 18px 20px;
  color: #2b1a0b;
  background: #f7e7b6;
  box-shadow: inset 0 0 0 3px rgb(255 255 255 / 34%), 0 12px 24px rgb(0 0 0 / 24%);
}

.monster-card.dnd-55e h1 {
  margin: 0 0 4px;
  color: #7b1d12;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  letter-spacing: 0;
}

.monster-card.dnd-55e h2 {
  margin: 18px 0 8px;
  border-bottom: 2px solid #b73121;
  color: #7b1d12;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.25rem;
}

.monster-card.dnd-55e table {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
}

.monster-card.dnd-55e th,
.monster-card.dnd-55e td {
  border: 1px solid rgb(123 29 18 / 24%);
  padding: 6px 8px;
}

.monster-card.dnd-55e th {
  color: #fff7d8;
  background: #7b1d12;
}

.monster-card.dnd-55e strong {
  color: #7b1d12;
}
```

### Modelo de datos

Template:

```ts
type MonsterTemplate = {
  id: string;
  name: string;
  system: string;
  markdown: string;
  css: string;
  builtIn: boolean;
  updatedAt: string;
};
```

Monstruo:

```ts
type SceneMonster = {
  templateId?: string | null;
};
```

Persistencia local de templates:

- Los templates se guardan en almacenamiento local de la app, por ejemplo `userData/monster-templates.json`.
- El archivo debe incluir version de formato.
- Los templates built-in pueden declararse en codigo o en un asset local; si el usuario los edita, se guarda una copia editable.

### Seguridad y CSS

- El CSS de templates debe estar scoped al contenedor del template.
- El renderer no debe inyectar CSS global sin prefijo o id de alcance.
- El HTML renderizado desde Markdown debe mantenerse dentro del contenedor de preview/detalle.
- No se debe permitir que el CSS del template afecte la app completa, modales externos o controles del sistema.
- Si se decide sanitizar Markdown/HTML en una spec futura, este flujo debe integrarse con esa sanitizacion.

### Arquitectura

- `domain` define tipos y validaciones de `MonsterTemplate`.
- `infrastructure` maneja lectura/escritura del archivo local de templates.
- `main` registra IPC especifico para listar, guardar y eliminar templates.
- `preload` expone funciones pequenas y tipadas para templates.
- `renderer` muestra el administrador de templates y consume la lista en el formulario de monstruo.
- El detalle del monstruo aplica el render Markdown existente con CSS scoped.
- No debe haber acceso directo desde renderer a filesystem o Electron internals.

### Criterios de aceptacion

- Existe un menu de aplicacion para abrir `Administrar templates de monstruos`.
- El administrador permite ver, editar, previsualizar y guardar templates.
- El template D&D 5.5e existe por defecto.
- Al crear/editar monstruo se puede elegir `Sin template` o un template guardado.
- Elegir un template rellena las notas cuando estan vacias.
- Si las notas tienen contenido, cambiar de template pide confirmacion antes de reemplazar.
- La vista de detalle renderiza tablas Markdown como tablas.
- La vista de detalle aplica CSS scoped del template seleccionado.
- El CSS del template no afecta el resto de la app.
- El `templateId` del monstruo se guarda y carga dentro de `.ttrpgscene`.
- Si un template falta, el monstruo sigue siendo visible con Markdown normal.
## Markdown seguro compartido

- Todo Markdown mostrado con `dangerouslySetInnerHTML`, tanto de entidades como de anotaciones, debe pasar por el mismo pipeline GFM sanitizado.
- Se conservan tablas y caracteres especiales, pero se elimina HTML crudo, handlers y URLs inseguras.
