# Spec consolidado - Entity Scene Panel

<!-- Archivo consolidado mecanicamente desde:
- 26-dm-scene-aside.md
- 28-dm-map-labels.md
-->

---

## Fuente: 26-dm-scene-aside.md

# Spec 26 - Panel lateral izquierdo del DM: Monstruos, NPCs y Notas

## Estado

Implementada.

## Objetivo

Agregar un panel lateral izquierdo a la ventana del DM que permita gestionar Monstruos, NPCs y Notas asociadas a la escena activa. El panel es exclusivo de la ventana del DM: no aparece en la ventana de jugador. Algunos elementos (imágenes de monstruos, nombre e imagen de NPCs) pueden mostrarse opcionalmente en la ventana de jugador cuando ya existan en la escena.

## Contexto

Durante una sesión de mesa, el DM necesita llevar registro de los enemigos presentes, los personajes no jugadores y anotaciones sobre la situación de la escena: estado de combate, motivaciones, secretos, condiciones o cualquier información que no conviene dejar solo en papel. Actualmente la app no ofrece un lugar dentro de la escena para estas anotaciones.

El panel no reemplaza una hoja de personaje ni un sistema de iniciativa; es un bloc de campaña ligero embebido en la escena para que el DM tenga todo visible sin salir de la app.

## Alcance

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

## Secciones del panel

### Monstruos

- Lista de monstruos asociados a la escena.
- Cada ítem muestra: thumbnail de imagen (si existe) y nombre.
- Cada ítem tiene: toggle de visibilidad para jugador (acceso rápido) y botón eliminar.
- Hacer clic sobre el área de thumbnail + nombre abre el **modal de detalle** del monstruo.
- Botón `+` o equivalente para agregar un monstruo nuevo.

### NPCs

- Lista de NPCs asociados a la escena.
- Cada ítem muestra: thumbnail de imagen (si existe) y nombre.
- Cada ítem tiene: toggle de visibilidad para jugador (acceso rápido) y botón eliminar.
- Hacer clic sobre el área de thumbnail + nombre abre el **modal de detalle** del NPC.
- Botón `+` o equivalente para agregar un NPC nuevo.

### Notas

- Lista de notas de la escena.
- Las notas pueden ser de raíz (sin padre) o de primer nivel (hijo de una nota raíz). Máximo dos niveles.
- Las notas raíz muestran sus notas hijas anidadas debajo en la lista.
- Cada ítem muestra: nombre (slug legible) e indicador de nivel.
- Cada ítem tiene: botón editar, botón ver (solo lectura renderizado MD), botón agregar nota hija (solo en notas raíz), botón eliminar.
- Eliminar una nota raíz elimina también sus notas hijas.
- Botón `+` o equivalente para agregar una nota raíz nueva.

## Modales

Toda creación, edición y presentación ocurre en modales. Cada tipo tiene su propio modal.

### Modal de detalle: Monstruo / NPC

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

### Modal de captura: Monstruo

- **Imagen:** área de carga de imagen local (click o drag & drop). Muestra preview si ya hay imagen. No es obligatoria.
- **Nombre:** campo de texto libre.
- **Notas:** editor WYSIWYG con renderización Markdown directa (Tiptap). Igual que las notas de escena.
- Acciones: Guardar / Cancelar.

### Modal de captura: NPC

- **Imagen:** área de carga de imagen local (click o drag & drop). Muestra preview si ya hay imagen. No es obligatoria.
- **Nombre:** campo de texto libre.
- **Notas:** editor WYSIWYG con renderización Markdown directa (Tiptap).
- Acciones: Guardar / Cancelar.

### Modal de captura: Nota

- **Ruta del padre:** muestra la ruta de jerarquía en formato `/ nombre-padre / nombre-nota` si tiene padre, o `/` si es una nota raíz. No es editable directamente: refleja quién es el padre. Se muestra en la parte superior del modal como breadcrumb.
- **Nombre:** campo de texto libre. Debajo del campo se muestra en tiempo real el slug generado (guiones medios, minúsculas, sin caracteres especiales). El slug es el identificador persistido.
- **Contenido:** editor WYSIWYG con renderización directa en estilo Notion (el usuario escribe Markdown y la sintaxis se convierte visualmente en tiempo real: `**texto**` se convierte en **texto**, `# Título` se convierte en un encabezado, etc.).
- Acciones: Guardar / Cancelar.

### Modal de vista: Nota

Cuando el DM solo quiere leer una nota sin editar:

- **Ruta:** muestra `/ nombre-padre / nombre-nota` o `/` según corresponda, como breadcrumb en la parte superior.
- **Nombre:** nombre legible de la nota.
- **Contenido:** contenido MD renderizado como HTML, sin editor activo.
- Acciones: Cerrar / Editar (abre el modal de captura).

## Editor WYSIWYG para notas

El editor debe ofrecer renderización directa en línea (inline rendering): el Markdown no se muestra como texto plano con asteriscos sino que se aplica el formato visualmente mientras se escribe, similar a Notion o Typora.

### Librería recomendada: Tiptap

Tiptap (sobre ProseMirror) es la opción recomendada:

- Licencia MIT.
- Integración React nativa con `@tiptap/react`.
- Extensión `@tiptap/extension-markdown` para importar/exportar Markdown y representarlo visualmente.
- Soporta encabezados, negrita, cursiva, listas, código inline, bloques de código, citas.
- El contenido se almacena como Markdown (string) en la escena, no como HTML ni JSON de ProseMirror.
- Activamente mantenido y usado en producción.

Alternativa si Tiptap resulta excesiva en bundle o en complejidad de integración: implementación propia con `textarea` controlada + parser Markdown liviano para preview en tiempo real en dos paneles (editar / previsualizar). Esta opción es más simple pero no ofrece renderización inline verdadera, solo preview lateral.

La decisión final entre Tiptap y la implementación propia se toma en el plan técnico, evaluando tamaño de bundle y complejidad de integración con el stack actual.

## Visibilidad en la ventana de jugador

- El DM controla con un toggle individual si cada monstruo o NPC se muestra en la ventana de jugador.
- Un monstruo con visibilidad activada en jugador muestra únicamente su imagen (sin nombre).
- Un NPC con visibilidad activada en jugador muestra **nombre arriba a la izquierda** e imagen debajo.
- Si un monstruo o NPC no tiene imagen, no se muestra nada en la ventana de jugador aunque esté marcado como visible.
- Las notas nunca se muestran en la ventana de jugador.
- La visibilidad de jugador es estado de escena, no preferencia de UI local.
- **Al cerrar el modal de detalle** del DM, el ítem se oculta automáticamente de la ventana de jugador. La presentación está ligada al ciclo de vida del modal de detalle.

### Overlay de jugador

- Cuando hay uno o más ítems visibles, se muestra un overlay de presentación que **cubre toda la ventana de jugador** con un fondo oscuro semitransparente (y blur sutil).
- Las entidades visibles se presentan centradas en la pantalla dentro de un contenedor decorativo.
- Cada imagen se muestra a 440×440 px por defecto.
- **Zoom**: hacer clic sobre la imagen la amplía a `min(72vw, 72vh)` (y vuelve a 440 px al hacer clic de nuevo). Un icono 🔍 en la esquina inferior derecha indica la acción disponible.
- Si hay múltiples entidades visibles simultáneamente, aparecen en fila horizontal con scroll si supera el ancho disponible.

## Modelo de interacción

### Panel lateral izquierdo

- El panel se muestra por defecto al abrir o cargar una escena.
- El panel puede ocultarse con un control visible (botón o flecha). Al ocultarse, el viewport del mapa se expande para ocupar el espacio liberado.
- Al mostrarse de nuevo, el viewport se contrae de vuelta.
- Las tres secciones (Monstruos, NPCs, Notas) coexisten en el panel; pueden estar siempre visibles en scroll o ser acordeones colapsables (a definir en plan).
- El panel no interfiere con herramientas de edición sobre el canvas.

### Agregar / editar

- Clic en `+` abre el modal de captura correspondiente vacío.
- Clic en editar abre el modal de captura correspondiente con los datos actuales.
- Guardar escribe el ítem en el estado de escena y cierra el modal.
- Cancelar descarta cambios y cierra el modal.

### Eliminar

- Eliminar muestra una confirmación mínima antes de borrar.
- Eliminar un monstruo o NPC lo quita de la escena; si estaba visible en jugador, deja de aparecer.
- Eliminar una nota raíz elimina también sus notas hijas (con confirmación explícita si tiene hijos).

### Notas anidadas

- Solo existen dos niveles: nota raíz y nota hija.
- Una nota hija no puede tener hijos.
- El botón de agregar nota hija solo aparece en notas raíz.
- Al agregar una nota hija, el modal de captura muestra la ruta del padre en el breadcrumb.
- Al editar una nota hija, el breadcrumb refleja su padre.

## Layout y estilo

- El panel lateral izquierdo vive a la izquierda del canvas, debajo de la toolbar principal si existe.
- Ancho fijo suficiente para thumbnails de imagen, nombre y controles de ítem sin truncar.
- El panel es scrollable verticalmente si el contenido supera la altura disponible.
- Los thumbnails de imagen son cuadrados pequeños (aprox. 40×40 px) para Monstruos y NPCs en la lista.
- Los modales son overlays centrados con backdrop, sin bloquear la ventana del DM si se mueve.
- El estilo debe seguir el tema oscuro actual de la app.
- Los controles del panel no deben confundirse visualmente con controles de edición del canvas.

## Persistencia

- Los monstruos, NPCs y notas se guardan dentro del archivo `.ttrpgscene` de la escena activa.
- Se agrega un campo opcional `sceneAside` (o similar) al schema de escena.
- Si el campo no existe en un archivo de escena antiguo, se inicializa vacío (no rompe compatibilidad).
- Las imágenes se persisten como rutas absolutas locales (`imagePath`), siguiendo el patrón ya establecido para tokens y mapas. En el renderer se resuelven al protocolo `map-asset:` mediante IPC antes de renderizarlas.
- El slug de la nota se calcula al capturar y se persiste como identificador; el nombre legible se persiste por separado.
- La visibilidad de cada monstruo/NPC en jugador se persiste como campo del ítem en la escena.

## IPC / Electron

- Los cambios en el panel del DM se sincronizan a la ventana de jugador mediante los canales IPC existentes de actualización de escena (ver Spec 25).
- No se requieren canales IPC nuevos si los existentes ya transfieren el estado completo de escena.
- Si la imagen se persiste como ruta absoluta, la ventana de jugador debe poder resolverla con el mismo protocolo seguro usado para mapas/tokens.
- No se exponen APIs de Node.js o Electron directamente al renderer.

## Fuera de alcance

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

## Criterios de aceptación

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

## Riesgos

- **Tamaño de bundle con Tiptap:** ProseMirror es pesado; si afecta el tiempo de carga de la app, evaluar la alternativa de implementación propia con preview separado.
  **Mitigación:** lazy loading del editor; el modal solo carga Tiptap cuando se abre por primera vez.

- **Portabilidad de imágenes entre máquinas:** las rutas absolutas son frágiles si la escena se mueve a otra máquina, igual que ocurre con mapas y tokens hoy.
  **Mitigación:** mismo comportamiento que el patrón existente de tokens/mapas; la portabilidad cross-máquina está fuera de alcance de esta spec.

- **Sincronización a jugador del nuevo campo de escena:** si el IPC de Spec 25 serializa solo campos conocidos, el nuevo campo `sceneAside` podría perderse en tránsito.
  **Mitigación:** verificar que el canal IPC usa serialización completa del objeto de escena o añadir el nuevo campo al schema de transferencia.

- **Colisión de slugs en notas:** dos notas con el mismo nombre raíz tendrían el mismo slug.
  **Mitigación:** al guardar, verificar unicidad en el nivel correspondiente y agregar sufijo numérico si es necesario (`mi-nota`, `mi-nota-2`).

## Notas de implementación futura

- `sceneAside` es un campo opcional de primer nivel en el schema de escena Zod; si no existe, se inicializa como `{ monsters: [], npcs: [], notes: [] }`.
- Las notas hija guardan referencia al slug del padre, no a un id autogenerado; esto simplifica la edición manual del `.ttrpgscene`.
- La visibilidad de monstruos/NPCs en jugador (`visibleToPlayer: boolean`) se incluye en el estado de escena para que la sincronización IPC la transmita automáticamente.
- El panel lateral izquierdo es un componente React independiente del sidebar derecho existente (Spec 11). Ambos paneles coexisten.
- Si en el futuro se quieren relacionar monstruos/NPCs con tokens del mapa, el slug puede servir como clave de relación sin requerir UUIDs nuevos.

---

## Fuente: 28-dm-map-labels.md

# Spec 28 - Labels de Mapa Solo DM

## Objetivo

Permitir que el DM agregue textos tipo label sobre el mapa para identificar zonas, notas tacticas o referencias de preparacion, visibles solamente en el render del DM.

## Contexto

El DM necesita marcar areas del mapa con nombres o pistas operativas sin mostrarlas a los jugadores. Hoy existen herramientas visuales compartidas entre DM y ventana de jugador, pero no una herramienta de texto privada para preparacion o control durante la sesion.

## Alcance

- Agregar labels de texto sobre el mapa desde la UI del DM.
- Los labels se muestran solo en la vista del DM.
- Los labels no se muestran en la ventana de jugador ni se publican como contenido visible para jugadores.
- Los labels se pueden seleccionar y arrastrar sobre el mapa.
- Al seleccionar un label, sus propiedades se muestran en el aside derecho como el resto de propiedades de objeto seleccionado.
- Persistir los labels dentro de la escena `.ttrpgscene`.
- Cargar labels guardados cuando se abre una escena.

## Fuera de alcance

- Texto visible para jugadores.
- Texto enriquecido multilinea avanzado.
- Fuentes externas o embebidas.
- Rotacion de texto.
- Markdown, HTML o links clicables.
- Colisiones automaticas con tokens, efectos o figuras.

## Comportamiento

### Crear label

- El usuario puede crear un label desde una accion de DM en la interfaz existente.
- El label se crea en el centro aproximado del viewport visible o en la celda/punto donde se haya invocado la accion si el flujo contextual lo permite.
- El texto inicial puede ser `Label` o un valor editable inmediatamente despues de crear.
- El label queda seleccionado despues de crearse para que el DM pueda editarlo desde el aside.

### Mostrar label

- En el render del DM, el label se dibuja en coordenadas de mundo y se mueve con el mapa.
- En la ventana de jugador, el label no se renderiza.
- El label debe mantenerse por encima del mapa y de overlays tacticos que puedan ocultar informacion de preparacion del DM, sin modificar el orden publico de capas para el jugador.
- El label debe seguir siendo legible sobre mapas oscuros o claros mediante color, sombra y opacidad configurables.

### Seleccionar y mover

- El label es seleccionable con click igual que otros objetos.
- Al estar seleccionado, puede arrastrarse libremente sobre el mapa.
- El movimiento guarda la nueva posicion en coordenadas de mundo.
- Delete y Backspace eliminan el label seleccionado, siguiendo el comportamiento actual de objetos seleccionables.
- Escape deselecciona o cancela segun el comportamiento global actual.

### Propiedades en aside derecho

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

## Modelo de datos

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

## Arquitectura

- La definicion del tipo vive en dominio o tipos compartidos de escena.
- La serializacion y carga de `.ttrpgscene` debe aceptar escenas antiguas sin `labels`.
- PixiJS renderiza labels en una capa privada del DM.
- La ventana de jugador recibe la escena sin renderizar labels, o filtra labels en su adaptador de render.
- El renderer no accede directamente a filesystem ni Electron internals.

## Criterios de aceptacion

- El DM puede crear un label de texto sobre el mapa.
- El label se ve en la vista del DM.
- El label no se ve en la ventana de jugador.
- El label se puede seleccionar y arrastrar.
- Al seleccionar un label, el aside derecho muestra sus propiedades.
- Se puede cambiar texto, font, color, sombra y opacidad.
- Delete/Backspace elimina el label seleccionado.
- Los labels se guardan y cargan dentro de `.ttrpgscene`.
- Escenas antiguas sin labels siguen cargando correctamente.
