# Plan de implementacion tecnica - 28 Editor enriquecido unificado con tablas y checklists

## 1. Resumen

- **Spec fuente:** `./specs/28-unified-rich-editor/spec.md`
- **Objetivo:** consolidar la edicion y previsualizacion de contenido enriquecido en componentes compartidos, habilitar callouts en todos los editores existentes e incorporar tablas y checklists con persistencia Markdown y reinicio controlado desde preview.
- **Estado:** Implementado, aceptado y cerrado en la version `1.7.5`.
- **Prioridad:** Media.
- **Dependencias:** specs 26 y 27, React 19, Tiptap 3, `tiptap-markdown`, `marked`, DOMPurify y los flujos actuales de persistencia de escenas y entidades.

## 2. Alcance

### Incluido

- Configuracion unica de extensiones y toolbar para todos los usos de `NoteEditor`.
- Callouts disponibles en notas generales, habitaciones, areas informativas, NPCs y personajes jugadores.
- Tablas GFM editables con acciones contextuales de filas, columnas y eliminacion.
- Task lists editables y serializadas como `- [ ]` / `- [x]`.
- Componente comun de preview para Markdown, callouts, tablas y checklists.
- Checkboxes interactivos en preview del DM y accion para reiniciar el documento visible.
- Integracion con el ciclo Guardar/Cancelar o con la actualizacion persistente de cada entidad.
- Estilos responsivos y accesibles para variantes compacta y documental.
- Pruebas de round trip, sanitizacion, interaccion y compatibilidad.

### Fuera de alcance

- Migrar el editor Markdown/CSS de templates de monstruos.
- Migrar el `textarea` de contenido de monstruos sin template.
- Tablas anidadas, celdas combinadas, formulas o redimension manual.
- Metadata adicional para tareas, colaboracion simultanea o checkboxes editables por jugadores.
- Cambios a PixiJS, IPC, SQLite o al schema de `.ttrpgscene`.

## 3. Decisiones tecnicas

- **Configuracion central:** extraer una factoria o lista estable `createRichTextExtensions()` junto al editor. `NoteEditor` no recibira banderas como `enableCallouts`; todos sus consumidores cargaran el mismo schema documental.
- **Tablas Tiptap:** agregar `@tiptap/extension-table` y registrar `TableKit`, que contiene los nodos `table`, `tableRow`, `tableHeader` y `tableCell`. La tabla se configurara sin resize y con acciones explicitas en toolbar contextual.
- **Checklists Tiptap:** agregar `@tiptap/extension-list` y registrar `TaskList` y `TaskItem.configure({ nested: true })`. La extension debe exponer `toggleTaskList()` y checkboxes accesibles.
- **Checkbox de tabla:** implementar un nodo atomico inline `tableTaskCheckbox`. El toolbar insertara este nodo cuando la seleccion este dentro de una tabla y mantendra `TaskList` para el resto del documento, evitando serializar nodos de bloque dentro de celdas GFM.
- **Persistencia Markdown:** conservar `tiptap-markdown` como adaptador vigente. Antes de integrar UI se validara que tablas y task lists realizan round trip con los nodos oficiales. Si existe una incompatibilidad, se extendera el storage Markdown de esos nodos con adaptadores locales pequenos; no se persistira HTML ni se migrara el documento a JSON Tiptap.
- **Preview comun:** crear un componente `RichTextPreview` que reciba Markdown, modo `dm-editable | readonly`, metadata visual opcional y callbacks de cambio. Este componente encapsulara `renderMarkdown`, delegacion de eventos de checkbox, reinicio y estados accesibles.
- **Render Markdown unico:** eliminar la opcion `callouts` de `renderMarkdown`; las directivas validas se interpretaran siempre. El contenido solo se muestra donde el flujo anfitrion ya tenga visibilidad.
- **Mutacion de checklists:** crear utilidades puras que detecten, cuenten, alternen y reinicien task items en Markdown GFM. La interaccion se resolvera por identidad posicional estable dentro del documento parseado, evitando reemplazos globales ambiguos sobre texto normal o bloques de codigo.
- **Ciclo de guardado:** los previews dentro de un formulario actualizaran el borrador mediante `onChange`. Los previews de detalle del DM recibiran un callback de persistencia desde su contenedor. Player View usara `readonly` y no expondra mutaciones.
- **Seguridad:** `marked` y DOMPurify seguiran siendo el unico pipeline de HTML de preview. La interactividad se agregara despues de sanitizar mediante atributos seguros generados por la aplicacion y event delegation; no se habilitara HTML del usuario.
- **Arquitectura:** todo el cambio vive en `renderer` y utilidades puras testeables. No se agregan reglas de negocio a React ni dependencias del editor al dominio.
- **Dependencias nuevas:** `@tiptap/extension-table` y `@tiptap/extension-list`, alineadas con la version `3.23.x` del stack Tiptap instalado.

## 4. Diseno de componentes y utilidades

### Configuracion del editor

- `richTextExtensions.ts` centralizara StarterKit, Link, Placeholder, Underline, Markdown, Callout, TableKit, TaskList y TaskItem.
- La configuracion no dependera del consumidor; solo el placeholder seguira siendo configurable.
- Las extensiones estaticas se construiran una vez por instancia de editor y no por render de React.
- `ToolbarState` se ampliara con `table`, `taskList` y capacidades contextuales de tabla.

### Toolbar

- Mantener el toolbar principal en `NoteEditor` con botones Lucide tipados y accesibles.
- Agregar `Insertar tabla` con `insertTable({ rows: 3, cols: 3, withHeaderRow: true })`.
- Mostrar un grupo contextual cuando `editor.isActive("table")` con:
  - agregar/eliminar fila;
  - agregar/eliminar columna;
  - eliminar tabla.
- Agregar `Lista de verificacion` mediante `toggleTaskList()`.
- Dentro de una tabla, reemplazar esa accion por `Insertar checkbox en celda`; el nodo se serializara en la misma linea de la fila y se rehidratara como control interactivo al reabrir.
- Mantener callout siempre disponible y retirar `enableCallouts` de props y consumidores.
- Permitir overflow horizontal controlado o wrap por grupos en la variante compacta.

### Utilidades de checklist

- `getChecklistState(markdown)` retornara total de items y total marcado.
- `setChecklistItemChecked(markdown, itemIndex, checked)` actualizara un task item concreto conservando indentacion, marcador y texto.
- `resetChecklist(markdown)` convertira todo `[x]` o `[X]` valido a `[ ]` sin tocar bloques de codigo ni texto inline.
- Las utilidades reconoceran tambien marcadores inline al inicio de una celda y conservaran el orden documental comun entre listas y tablas.
- Las funciones seran puras, deterministas y cubiertas con casos anidados, listas mixtas y contenido que contiene corchetes sin ser checklist.

### Preview compartido

- `RichTextPreview` recibira:
  - `markdown`;
  - `mode: "dm-editable" | "readonly"`;
  - `onChange?` para borradores;
  - `onPersist?` para vistas de detalle sin borrador;
  - slots opcionales de titulo y metadata si el consumidor los necesita.
- El HTML sanitizado incluira atributos de indice solo para task items reconocidos por el parser.
- Un listener delegado manejara el click sobre checkboxes sin crear un handler por item.
- `Reiniciar checklist` se mostrara cuando exista por lo menos un item, quedara deshabilitado si ninguno esta marcado y actualizara la fuente Markdown.
- En modo `readonly`, los inputs se renderizaran deshabilitados y no se mostrara el reinicio.
- El HTML GFM de task items se normalizara despues de sanitizar para envolver checkbox y contenido en un `label` comun; las listas hijas permaneceran fuera del label y se indentaran en una fila posterior.

## 5. Cambios por capa

### `domain`

- Sin cambios a entidades, schemas ni reglas de escena.
- El contenido enriquecido permanece como `string` Markdown en los modelos actuales.

### `application`, `infrastructure`, `main` y `preload`

- Sin cambios estructurales.
- Se reutilizaran los casos de guardado actuales para escenas, NPCs y personajes.
- Si una vista de detalle carece de callback de actualizacion, se propagara desde su contenedor usando los servicios existentes; no se crearan canales IPC genericos.

### `renderer`

- Refactorizar `NoteEditor.tsx` para usar la configuracion comun y los nuevos grupos de toolbar.
- Crear `richTextExtensions.ts` y utilidades de checklist junto al modulo de notas.
- Crear `RichTextPreview.tsx` y sustituir previews manuales basados directamente en `dangerouslySetInnerHTML` dentro de los contextos incluidos.
- Actualizar `MapAnnotationModal`, `NoteEditModal`, `NoteViewModal`, `NpcModal`, `NpcDetailModal`, `PlayerCharacterLibraryModal` y `PlayerCharacterDetailModal`.
- Retirar `enableCallouts` de `MapAnnotationModal` y hacer que `renderMarkdown` interprete callouts de forma uniforme.
- Mantener lazy loading de `NoteEditor`; el preview no debe cargar el bundle completo de Tiptap.
- Ampliar `styles.css` con tablas del editor, toolbar contextual, task lists, checkbox readonly/editable, accion de reinicio y overflow responsivo.
- Usar los atributos DOM reales de Tiptap (`data-checked`) para mantener checkbox y texto en la misma fila tanto en editor como en preview.

### `render`

- Sin cambios en PixiJS.
- Ninguna interaccion del editor o preview debe llamar setters del viewport ni invalidar sus layers.

## 6. Plan de trabajo

1. Instalar las extensiones Tiptap oficiales con `pnpm` y agregar una prueba de caracterizacion del round trip Markdown para tabla y task list.
2. Centralizar la configuracion actual del editor, habilitar callout sin flags y confirmar que documentos existentes conservan su Markdown.
3. Integrar TableKit, comandos de insercion/edicion y controles contextuales de tabla.
4. Integrar TaskList/TaskItem, toolbar, teclado y serializacion GFM.
5. Implementar y probar las utilidades puras para detectar, alternar y reiniciar checklists sin modificar codigo ni texto ordinario.
6. Crear `RichTextPreview` con sanitizacion, callouts uniformes, delegacion de checkboxes, modo readonly y reinicio.
7. Migrar uno por uno los consumidores incluidos al editor y preview compartidos, conectando el ciclo de persistencia correspondiente.
8. Completar estilos compactos/documentales y verificar overflow de tablas y toolbar en viewports pequenos.
9. Ejecutar pruebas automatizadas, validaciones estaticas, build y smoke manual en DM/Player View.
10. Actualizar specs 26, 27 y 28, version y changelog solamente al aceptar y cerrar la implementacion.

## 7. Testing y verificacion

- **Caracterizacion Markdown:** tabla GFM con encabezado y varias filas; task lists marcadas, desmarcadas y anidadas; ciclos repetidos parsear/serializar sin degradacion.
- **Unit tests de checklist:** deteccion, alternancia por indice, reinicio total, mayuscula `[X]`, indentacion, listas mixtas, bloques de codigo y texto similar que no debe cambiar.
- **Tests de callout:** todos los previews interpretan la directiva; metadata invalida conserva fallbacks y sanitizacion.
- **Tests del editor:** mismo toolbar en variantes compacta/documental, insercion 3x3, comandos de fila/columna, eliminacion de tabla, toggle de task list y ausencia de `enableCallouts`.
- **Tests del preview:** checkbox editable del DM, readonly del jugador, boton visible/deshabilitado, reinicio y callback de persistencia.
- **Tests de integracion de consumidores:** nota, habitacion, area, NPC y personaje conservan contenido al guardar/reabrir y descartan cambios al cancelar.
- **Seguridad:** HTML, atributos de evento, URLs y directivas malformadas siguen sanitizados.
- **Typecheck:** `pnpm typecheck`.
- **Lint:** `pnpm lint`.
- **Tests:** `pnpm test`.
- **Build:** `pnpm build`.
- **Smoke manual:** probar cada consumidor en Electron, tablas anchas, checklists anidadas, reset, cancelacion, persistencia SQLite/escena y Player View readonly.

## 8. Rendimiento

- Mantener carga diferida de Tiptap y sus nuevas extensiones; abrir un preview no debe importar el editor.
- Memorizar el HTML y estado derivado de checklist por valor Markdown.
- Usar un solo listener delegado por preview, no uno por checkbox.
- No reconstruir la instancia Tiptap al cambiar contenido ni recrear el arreglo de extensiones por pulsacion.
- Evitar persistencia por cada render: solo responder a una accion real sobre checkbox o reinicio.
- Confirmar con React Profiler que alternar un checkbox no rerenderiza el viewport PixiJS.

## 9. Riesgos y mitigaciones

- **Riesgo:** `tiptap-markdown` no sea completamente compatible con los nodos actuales de TableKit o TaskList.
  **Mitigacion:** prueba de caracterizacion en el primer paso y adaptadores Markdown locales por nombre de nodo antes de construir la UI.
- **Riesgo:** una tabla no representable en GFM se degrade a HTML.
  **Mitigacion:** limitar la UI a encabezado simple, sin spans, tablas anidadas ni contenido de multiples bloques por celda.
- **Riesgo:** una task list de bloque dentro de una celda agregue saltos de linea y termine prematuramente la tabla.
  **Mitigacion:** usar el nodo inline de tabla y normalizar al cargar las filas legadas que terminaban su cierre `|` en una linea separada.
- **Riesgo:** editar checkboxes en HTML sanitizado cambie solo la vista.
  **Mitigacion:** todas las acciones operan sobre el Markdown fuente y el preview se deriva nuevamente de ese valor.
- **Riesgo:** reemplazos por regex modifiquen ejemplos dentro de codigo.
  **Mitigacion:** recorrer tokens/lineas con estado de fenced code y cubrir casos adversos en pruebas.
- **Riesgo:** actualizaciones inmediatas desde vistas de detalle causen escrituras excesivas en SQLite o escena.
  **Mitigacion:** persistir solo por click del usuario, no por render, y reutilizar los callbacks existentes.
- **Riesgo:** el toolbar completo no quepa en modales compactos.
  **Mitigacion:** agrupar acciones, dimensiones estables y overflow horizontal accesible sin ocultar herramientas.
- **Riesgo:** habilitar callouts globalmente cambie documentos que contienen la directiva como texto literal.
  **Mitigacion:** reconocer solo bloques delimitados validos y agregar pruebas de texto parcial o malformado.

## 10. Criterios de aceptacion

- Todos los consumidores incluidos usan el mismo schema, toolbar y preview compartido.
- Callout, tabla y checklist pueden crearse en cualquier editor incluido y sobreviven al ciclo guardar/reabrir.
- Las tablas mantienen estructura GFM y ofrecen todas las acciones definidas sin romper el layout.
- Los checkboxes del DM actualizan Markdown; el reinicio desmarca todos y respeta Guardar/Cancelar.
- Player View muestra checkboxes sin permitir cambios ni reinicio.
- Los previews interpretan callouts sin opciones por consumidor y conservan sanitizacion.
- No cambia el schema de escena ni de SQLite y el contenido existente sigue siendo compatible.
- Interacciones del editor no invalidan PixiJS.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` finalizan correctamente.

## 11. Documentacion afectada

- Actualizar `specs/26-rich-note-editor/spec.md` y `plan.md` para referenciar la configuracion unificada.
- Actualizar `specs/27-rich-note-callouts/spec.md` y `plan.md` para retirar la restriccion exclusiva de habitaciones.
- Cerrar `specs/28-unified-rich-editor/spec.md` y este plan al aceptar la implementacion.
- Actualizar `CHANGELOG.md` y `package.json` con bump minor al cerrar y mergear la feature, segun las reglas del proyecto.

## 12. Checklist de cierre

- [x] Plan aceptado antes de iniciar implementacion.
- [x] Dependencias Tiptap agregadas con `pnpm` y lockfile actualizado.
- [x] Round trip Markdown de tablas y checklists verificado.
- [x] Configuracion y toolbar unificados.
- [x] Callouts habilitados en todos los consumidores incluidos.
- [x] Tablas y controles contextuales implementados.
- [x] Checklists, interaccion y reinicio implementados.
- [x] Preview comun migrado en todos los contextos incluidos.
- [x] Player View verificado como solo lectura.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke manual realizado.
- [x] Specs 26, 27 y 28 actualizados.
- [x] Version y changelog actualizados al cerrar la feature.
- [x] Aceptacion final obtenida antes de commit y merge.
