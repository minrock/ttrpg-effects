# Spec 28 - Editor enriquecido unificado con tablas y checklists

## Estado

- Spec funcional aceptado en `feature/unified-rich-editor`.
- Plan tecnico aceptado e implementado.
- Implementacion aceptada y cerrada en la version `1.7.5`.

## Objetivo

Unificar todos los usos actuales del editor WYSIWYG de TTRPG Effects en un unico componente reutilizable, con las mismas capacidades de formato y previsualizacion en cada contexto. La ampliacion incorpora callouts para todos los editores, tablas editables y listas de verificacion con reinicio desde la vista previa.

## Alcance

La experiencia unificada aplica a todos los contenidos que actualmente usan el editor enriquecido compartido:

- notas generales de la escena;
- informacion de pines de habitacion;
- descripcion de areas de informacion, terrenos y trampas;
- notas de NPCs;
- notas de personajes jugadores.

El editor y su vista previa deben ser componentes compartidos. Los consumidores pueden conservar variantes de presentacion `compact` o `document`, pero no deben habilitar o retirar capacidades mediante configuraciones particulares.

Los editores tecnicos de templates de monstruos, que permiten modificar Markdown fuente y CSS, permanecen fuera de este alcance. Tampoco se cambia en esta iteracion el `textarea` especializado de contenido de monstruos sin template.

## Requerimientos funcionales

### Editor comun

1. Todos los contextos incluidos deben usar una unica configuracion de extensiones, toolbar, serializacion y estilos del editor.
2. Todos deben ofrecer el mismo conjunto de formatos:
   - encabezados H1, H2 y H3;
   - listas con vinietas y listas numeradas;
   - negrita, cursiva, subrayado y tachado;
   - crear, editar y retirar enlaces;
   - callouts con emoji y color;
   - tablas;
   - listas de verificacion.
3. Los callouts dejan de depender de una bandera exclusiva de habitaciones y quedan disponibles en todos los editores incluidos.
4. La variante visual compacta puede redistribuir o permitir scroll en el toolbar, pero no ocultar funcionalidades.
5. Los formatos activos deben conservar su feedback visual, tooltip, nombre accesible y operacion por teclado.
6. Deshacer, rehacer, copiar, pegar y seleccionar texto deben funcionar de manera consistente dentro y fuera de callouts, tablas y checklists.

### Tablas

7. El toolbar debe incluir una accion reconocible para insertar una tabla en la posicion actual del cursor.
8. Una tabla nueva debe iniciar con tres columnas, una fila de encabezado y dos filas de contenido editables.
9. Al ubicar el cursor dentro de una tabla deben estar disponibles acciones para:
   - agregar o eliminar filas;
   - agregar o eliminar columnas;
   - eliminar la tabla completa.
10. La navegacion con `Tab` y `Shift + Tab` debe avanzar o retroceder entre celdas sin sacar inesperadamente el foco del editor.
11. Las tablas deben permitir formatos de texto compatibles dentro de sus celdas, incluyendo un checkbox inline junto al contenido; no deben admitir tablas anidadas ni listas de bloque dentro de una celda en esta version.
12. En editor y vista previa, una tabla mas ancha que su contenedor debe usar desplazamiento horizontal interno y no romper el modal ni el sidebar.
13. Las tablas deben persistirse como Markdown GFM y volver a abrirse como tablas editables, sin guardar HTML de presentacion ni interrumpir una fila por serializar su checkbox.

### Checklists

14. El toolbar debe incluir una accion para crear o convertir contenido en una lista de verificacion; dentro de tablas la misma accion debe presentarse como `Insertar checkbox en celda`.
15. Cada item debe mostrar un checkbox que pueda marcarse o desmarcarse en el editor, alineado en la misma fila que su texto asociado.
16. Los checkboxes deben persistirse mediante `- [ ]` / `- [x]` en listas y `[ ]` / `[x]` dentro de celdas GFM.
17. La vista previa del DM debe renderizar checkboxes interactivos y reflejar sus cambios en el contenido Markdown, no solo en el DOM temporal.
18. La vista previa debe ofrecer una accion `Reiniciar checklist` cuando el documento contenga por lo menos un checkbox.
19. `Reiniciar checklist` debe desmarcar todos los items del documento actual, conservando texto, orden, anidacion y cualquier contenido que no sea parte de la checklist.
20. La accion debe permanecer deshabilitada cuando todos los items ya esten desmarcados.
21. En un flujo con borrador y botones Guardar/Cancelar, tanto los cambios individuales como el reinicio deben modificar el borrador: Guardar los persiste y Cancelar los descarta.
22. En una vista de detalle del DM sin borrador local, los cambios deben persistirse mediante el mecanismo de actualizacion de la entidad correspondiente.
23. Una vista expuesta al jugador debe renderizar los checkboxes como contenido de solo lectura y no debe mostrar la accion de reinicio.

### Vista previa comun

24. Notas, anotaciones, NPCs y personajes deben renderizar Markdown mediante una vista previa compartida, sanitizada y visualmente consistente.
25. La vista previa debe comprender siempre callouts, tablas y checklists; no debe requerir opciones distintas segun el consumidor.
26. La disponibilidad para jugadores depende del contenido anfitrion, no del formato: un callout dentro de una nota compartida se muestra, mientras un pin de habitacion continua siendo exclusivo del DM.
27. Editor y vista previa deben representar la misma estructura, orden y contenido despues de guardar y volver a abrir.

## Experiencia de uso

- El toolbar agrupa acciones relacionadas y usa iconos con tooltips, sin convertir el editor en una barra horizontal inmanejable.
- Los controles contextuales de tablas aparecen solo cuando el cursor se encuentra dentro de una tabla.
- Los checkboxes conservan un area de interaccion comoda y un estado visible en la paleta oscura del producto.
- Checkbox y texto forman una unidad visual horizontal; las listas anidadas se muestran debajo e indentadas, sin separar el texto de su control.
- `Reiniciar checklist` debe usar un icono reconocible y texto o tooltip explicito para evitar confundirlo con borrar contenido.
- Callouts, tablas y checklists deben respetar el look and feel carbon, marfil y dorado existente.
- El editor mantiene scroll interno y dimensiones estables en modal documental, modal compacto y sidebar.

## Persistencia y compatibilidad

- Los campos de contenido actuales continúan almacenando Markdown; no se agrega HTML persistido.
- Callouts conservan la directiva controlada existente `:::callout`.
- Tablas y checklists usan sintaxis GFM portable.
- No se cambia la version del formato `.ttrpgscene` ni se requiere una migracion incompatible.
- Documentos existentes sin estos formatos deben abrirse y guardarse sin cambios inesperados.
- Markdown existente con tablas o checklists debe reconocerse al abrirse por primera vez en el editor unificado.
- El contenido almacenado en SQLite para NPCs y personajes conserva sus campos actuales y adopta los nuevos formatos sin cambiar su esquema.

## Seguridad y accesibilidad

- La vista previa debe continuar sanitizando todo el HTML generado y bloquear HTML arbitrario, estilos inyectados y URLs no seguras.
- Ninguna celda, checkbox o callout puede ejecutar contenido proveniente del Markdown.
- Toolbar, controles de tabla, checkboxes y reinicio deben ser operables con teclado y tener nombres accesibles.
- El estado de un checkbox no debe comunicarse exclusivamente mediante color.
- El reinicio debe afectar solo el documento visible y nunca otras notas o entidades.

## Rendimiento

- Tiptap y sus extensiones deben conservar carga diferida y no aumentar el costo de inicio de la aplicacion cuando ningun editor esta abierto.
- La configuracion comun de extensiones no debe recrearse por cada pulsacion.
- La vista previa solo debe regenerar HTML cuando cambie su Markdown.
- Interactuar con checkboxes no debe invalidar PixiJS ni provocar un nuevo render del mapa completo.
- No deben conservarse instancias destruidas del editor, listeners o vistas de tabla al cerrar un modal.

## Fuera de alcance

- Tablas anidadas, combinacion de celdas, redimension manual de columnas o formulas.
- Asignacion de responsables, fechas, prioridades o estados adicionales a los checkboxes.
- Sincronizacion colaborativa o edicion simultanea entre DM y Player View.
- Reemplazar el editor tecnico Markdown/CSS del administrador de templates de monstruos.
- Migrar en esta iteracion el contenido de monstruos que todavia se edita como Markdown fuente.

## Criterios de aceptacion

- Todos los usos actuales del editor WYSIWYG muestran el mismo toolbar y permiten crear callouts, tablas y checklists.
- Un documento creado en cualquiera de los contextos incluidos conserva todos sus formatos despues de guardar, cerrar y volver a abrir.
- Una tabla puede insertarse, editar sus filas y columnas, eliminarse y verse correctamente en preview sin desbordar el modal.
- Una checklist puede editarse, marcarse, desmarcarse y persistirse como Markdown GFM.
- `Reiniciar checklist` deja todos los items en blanco sin alterar el resto del documento y respeta Guardar/Cancelar.
- Player View no puede modificar checkboxes ni reiniciarlos.
- Las vistas previas renderizan callouts, tablas y checklists sin mostrar sintaxis Markdown ni HTML inseguro.
- Los documentos y escenas existentes permanecen compatibles.
- Tests, lint, typecheck y build completan sin errores antes de cerrar la implementacion.
