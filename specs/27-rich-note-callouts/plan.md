# Plan de implementacion tecnica - 27 Callouts para informacion de habitaciones

## 1. Resumen

- **Spec fuente:** `./specs/27-rich-note-callouts/spec.md`
- **Objetivo:** incorporar un bloque `callout` al editor WYSIWYG de pines de habitacion, con emoji y color principal configurables, persistido como Markdown controlado y renderizado de forma equivalente en edicion y vista previa.
- **Estado:** Implementado y aceptado para `1.7.4`.
- **Prioridad:** Media.
- **Dependencias:** Spec 26 de editor enriquecido, Tiptap 3, `tiptap-markdown`, `marked`, DOMPurify y el campo Markdown existente de `MapInformationPin`.

## 2. Alcance

### Incluido

- Extension Tiptap de bloque para insertar, editar y retirar callouts.
- Accion accesible en el toolbar, disponible solo al editar pines de habitacion.
- Configuracion contextual de un emoji y un color principal por callout.
- Calculo determinista del fondo pastel al mezclar el color principal un 80% hacia blanco.
- Serializacion y parseo bidireccional mediante una directiva Markdown propia.
- Render seguro y visualmente equivalente en la vista previa de habitaciones.
- Validacion, recuperacion ante metadata invalida y pruebas del ciclo completo.

### Fuera de alcance

- Callouts en notas generales, NPCs, monstruos, personajes o areas informativas.
- Callouts visibles en Player View.
- Callouts anidados, plantillas predefinidas, imagenes o iconos externos.
- Cambios al formato estructural de `.ttrpgscene`, IPC, SQLite o PixiJS.

## 3. Decisiones tecnicas

- **Extension Tiptap:** crear un nodo de bloque reusable `callout` con contenido enriquecido y atributos `emoji` y `color`. La extension expondra comandos tipados para insertar, actualizar y retirar el bloque conservando sus hijos. Su nombre no queda acoplado a habitaciones para permitir habilitarla en otros editores en futuras specs.
- **Activacion por contexto:** ampliar `NoteEditor` con una capacidad explicita como `enableCallouts`; `MapAnnotationModal` la activara solamente cuando `draft.kind === "room-pin"`. Los demas consumidores mantendran el editor actual.
- **Representacion Markdown:** persistir cada bloque con una directiva delimitada y legible, sin HTML:

  ```markdown
  :::callout emoji="⚠️" color="#D5AB5D"
  Contenido **enriquecido** del callout.
  :::
  ```

- **Parseo y serializacion:** integrar la directiva con el adaptador de `tiptap-markdown`; el parser convertira solo directivas `callout` validas al nodo Tiptap y el serializer reconstruira una sintaxis canonica. Una directiva invalida conservara su contenido y usara atributos seguros por defecto.
- **UI contextual:** implementar un NodeView React para mostrar emoji, contenido editable y controles compactos de emoji/color cuando el foco o la seleccion esten dentro del bloque. Los controles actualizaran atributos del nodo, no estado documental duplicado en React.
- **Color:** centralizar validacion y normalizacion hexadecimal en una funcion pura. El fondo se calculara mezclando 20% del color principal con 80% de blanco; el color de texto se elegira por contraste. Solo valores derivados de un HEX validado podran llegar a propiedades visuales generadas por la app.
- **Vista previa segura:** extender `renderMarkdown` mediante una opcion explicita para callouts de habitacion. El pipeline reconocera la directiva antes de `marked`, sanitizara el Markdown interior con DOMPurify y agregara un contenedor semantico generado por la aplicacion. No se habilitara HTML, CSS ni URLs arbitrarias desde el contenido del usuario.
- **Compatibilidad:** el campo `content` de `MapInformationPin` continuara siendo un `string`; no hay migracion ni cambio de version de `.ttrpgscene`.
- **Dependencias nuevas:** ninguna libreria externa. Se declarara `@tiptap/core` como dependencia directa porque la extension importa su API publica; esa version ya forma parte del arbol de Tiptap instalado.

## 4. Diseno del componente

### Modelo del nodo

- Nombre Tiptap: `callout`.
- Grupo: bloque de documento.
- Atributos persistidos:
  - `emoji: string | null`, validado como un unico grapheme emoji permitido para presentacion.
  - `color: string`, normalizado a `#RRGGBB` y con el dorado del producto como fallback.
- Contenido: bloques enriquecidos compatibles con parrafos, listas, enlaces y enfasis.
- Invariantes:
  - no insertar un callout dentro de otro;
  - no persistir metadata desconocida;
  - retirar el callout conserva sus nodos hijos y su orden;
  - el documento debe seguir siendo editable aunque la metadata guardada sea incompleta.

### Utilidades puras

- `normalizeCalloutColor(value)` para aceptar un HEX valido o retornar el color predeterminado.
- `normalizeCalloutEmoji(value)` para admitir cero o un emoji y limitar longitud de entrada.
- `mixCalloutPastel(color, 0.8)` para producir el fondo pastel.
- `getContrastingTextColor(background)` para garantizar legibilidad.
- `parseCalloutMetadata` y `serializeCalloutMetadata` para una representacion canonica, escapada y testeable.

### Comandos del editor

- `insertCallout(attributes?)`: insertar un bloque en la seleccion y colocar el cursor en su contenido.
- `updateCallout(attributes)`: modificar emoji o color del callout activo.
- `unsetCallout()`: reemplazar el nodo por sus bloques hijos sin perder texto ni formato soportado.
- Los comandos deben devolver `false` si no aplican, especialmente ante un intento de anidacion.

## 5. Cambios por capa

### `domain`

- Sin cambios al modelo de anotaciones ni al schema de escena.
- La sintaxis del callout vive dentro del Markdown de la habitacion y no se convierte en una entidad de dominio independiente.

### `application`, `infrastructure`, `main` y `preload`

- Sin cambios. Guardar y cargar escenas continuara transportando el mismo contenido Markdown.

### `renderer`

- Crear un modulo de utilidades de callout junto al editor para validacion, colores y metadata.
- Crear la extension Tiptap `RoomCallout` y su NodeView React.
- Extender `NoteEditor` con la capacidad opcional, el boton Lucide con tooltip y estado activo, y los comandos correspondientes.
- Anadir el selector compacto de emoji, el input de color y la accion de retirar formato dentro del contexto del callout.
- Activar la capacidad desde `MapAnnotationModal` solo para `room-pin`.
- Extender `renderMarkdown` con una opcion de callouts, manteniendo el comportamiento actual por defecto para todos los demas consumidores.
- Agregar estilos compartidos entre `.note-editor__content` y `.document-preview` para conservar linea, fondo pastel, espaciado, emoji, foco y estados responsivos.

### `render`

- Sin cambios en PixiJS. Abrir, editar o previsualizar callouts no debe invalidar capas ni reconstruir el viewport.

## 6. Plan de trabajo

1. Implementar y probar las utilidades puras de color, emoji y metadata, incluyendo fallbacks para valores invalidos.
2. Crear la extension `RoomCallout` con schema, parser Markdown, serializer y comandos de insercion, actualizacion y retirada.
3. Crear el NodeView del callout con contenido editable, emoji visible y controles contextuales accesibles.
4. Integrar la accion de toolbar y la opcion `enableCallouts` en `NoteEditor`, preservando foco, seleccion, undo y redo.
5. Activar callouts solo para pines de habitacion en `MapAnnotationModal` y habilitar su interpretacion en la vista previa correspondiente.
6. Extender el pipeline seguro de Markdown para producir el HTML semantico del callout sin aceptar HTML ni estilos arbitrarios del usuario.
7. Incorporar los estilos editoriales y responsivos para editor y preview.
8. Completar pruebas automatizadas y smoke manual del ciclo crear, editar, guardar, cancelar, reabrir, previsualizar y retirar formato.

## 7. Testing y verificacion

- **Unit tests de utilidades:** normalizacion HEX, mezcla pastel al 80%, contraste, emoji vacio/valido/invalido y metadata canonica.
- **Tests de Markdown:** directiva valida, varios callouts, contenido enriquecido, round trip, fallback de metadata, preservacion de contenido y rechazo de HTML/event handlers/URLs inseguras.
- **Tests del editor:** insercion en cursor, foco dentro del bloque, actualizacion de atributos, prevencion de anidado, retirada sin perdida de contenido y disponibilidad exclusiva con `enableCallouts`.
- **Tests de compatibilidad:** Markdown antiguo sin callouts conserva el HTML actual y las areas informativas/notas generales no interpretan la directiva como componente visual.
- **Typecheck:** `pnpm typecheck`.
- **Lint:** `pnpm lint`.
- **Tests:** `pnpm test`.
- **Build:** `pnpm build`.
- **Smoke manual:** en Electron, crear una habitacion, insertar varios callouts, cambiar emoji/color, usar formato interno, alternar vista previa, cancelar, guardar, cerrar y reabrir la escena. Confirmar que Player View no recibe contenido visual adicional.

## 8. Rendimiento

- Mantener la extension dentro del bundle diferido de `NoteEditor`; no cargar Tiptap al iniciar la app.
- Calcular colores solo al crear o cambiar atributos, no por pulsacion del contenido.
- Memorizar la vista previa a partir de `content` como ocurre actualmente.
- Evitar listeners globales y limpiar cualquier estado contextual al destruir el editor.
- No agregar efectos, filtros, texturas ni invalidaciones al viewport PixiJS.

## 9. Riesgos y mitigaciones

- **Riesgo:** perdida de metadata durante el round trip Tiptap-Markdown.
  **Mitigacion:** definir una sintaxis canonica, centralizar parser/serializer y cubrir multiples ciclos con pruebas.
- **Riesgo:** una directiva mal formada rompa el resto de la habitacion.
  **Mitigacion:** parser tolerante que preserve el contenido y aplique atributos predeterminados.
- **Riesgo:** controles del NodeView interfieran con foco, seleccion o historial.
  **Mitigacion:** usar APIs de NodeView y comandos Tiptap, marcar controles como no editables y verificar teclado, undo y redo.
- **Riesgo:** permitir estilos inyectados a traves del color.
  **Mitigacion:** aceptar exclusivamente HEX normalizado y generar internamente las propiedades visuales despues de sanitizar el contenido.
- **Riesgo:** activar la extension en otros editores cambie notas existentes.
  **Mitigacion:** capacidad opt-in y opcion de render desactivada por defecto.

## 10. Criterios de aceptacion

- El toolbar de una habitacion permite insertar un callout listo para escribir, pero los demas editores no muestran esa accion.
- Emoji y color se pueden agregar, cambiar o retirar desde el callout activo.
- La linea usa el color principal y el fondo usa su mezcla pastel al 80%, con texto legible.
- Texto, listas, enlaces y enfasis se mantienen dentro del bloque.
- Retirar el callout conserva el contenido y su formato compatible.
- Guardar y reabrir conserva contenido, emoji y color; cancelar no guarda cambios.
- La vista previa coincide con el editor y no expone la directiva Markdown.
- Metadata invalida no rompe el documento ni habilita HTML/CSS arbitrario.
- Escenas y notas existentes siguen funcionando sin migracion.
- Typecheck, lint, tests y build finalizan correctamente.

## 11. Documentacion afectada

- Actualizar `specs/27-rich-note-callouts/spec.md` y este checklist al implementar y aceptar el resultado.
- Actualizar `CHANGELOG.md` y la version solicitada al cerrar y mergear la feature, segun las reglas del proyecto.

## 12. Checklist de cierre

- [x] Utilidades de validacion, color pastel y metadata implementadas.
- [x] Extension Tiptap y comandos implementados.
- [x] NodeView y controles contextuales implementados.
- [x] Toolbar habilitado exclusivamente para habitaciones.
- [x] Parser, serializer y preview Markdown seguros implementados.
- [x] Estilos de editor y preview completados.
- [x] Round trip `.ttrpgscene` verificado sin migracion.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke manual realizado.
- [x] Plan aceptado por el usuario antes de implementar.
- [x] Aceptacion final del usuario obtenida antes de commit y merge.
