# Plan 26 - Editor enriquecido de notas y habitaciones

## Estado

- [x] Revisar la implementacion actual de Tiptap, Markdown y modales.
- [x] Implementar toolbar reutilizable y estilos editoriales.
- [x] Migrar notas al modal documental.
- [x] Migrar informacion de habitaciones al editor enriquecido.
- [x] Redisenar el modal de conexiones entre escenas sin alterar su dominio.
- [x] Agregar o ajustar pruebas automatizadas.
- [x] Completar lint, typecheck, tests, build y smoke visual.
- [x] Obtener aceptacion antes del merge.

## Implementacion tecnica

1. Extender `NoteEditor` con StarterKit, Link, Underline y Placeholder, manteniendo `tiptap-markdown` como adaptador de persistencia.
2. Encapsular acciones del toolbar en botones tipados y accesibles, sin guardar estado duplicado en React.
3. Publicar Markdown mediante `onUpdate`; sincronizar contenido externo solo cuando difiera del documento activo.
4. Agregar una variante documental a `ModalBackdrop` con dimensiones responsivas, overflow interno y superficies reutilizables.
5. Reestructurar `NoteEditModal` y `NoteViewModal` con header, lienzo y footer, manteniendo slug, jerarquia y callbacks actuales.
6. Reutilizar `NoteEditor` en `MapAnnotationModal` para informacion Markdown de habitaciones y areas.
7. Reorganizar `SceneLinkModal` en secciones visuales para identidad, estado, destino y acciones, preservando sus operaciones asincronas.
8. Mantener Tiptap cargado de forma diferida en los flujos que no lo necesitan al iniciar la aplicacion.
9. Validar teclado, foco, formato activo, scroll, guardado, vista previa y conexiones en Electron.

## Rendimiento

- No introducir estado por pulsacion fuera del editor; Tiptap administra su documento local.
- Mantener carga diferida del bundle del editor.
- No modificar PixiJS ni invalidar el viewport al editar contenido.
- Memorizar el HTML de vista previa a partir del Markdown persistido.
