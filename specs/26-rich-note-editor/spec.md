# Spec 26 - Editor enriquecido de notas y habitaciones

## Estado

- Implementacion aceptada y cerrada en la version `1.7.0`.

## Objetivo

Unificar la escritura y lectura de notas, informacion de habitaciones y conexiones entre escenas mediante una experiencia editorial amplia, legible y consistente con el look and feel oscuro de TTRPG Effects.

## Requerimientos funcionales

1. Las notas y los pines de habitacion deben editarse en un modal amplio que aproveche el viewport sin cubrirlo con paneles anidados.
2. El nombre debe funcionar como titulo principal del documento y el contenido como un lienzo de escritura continuo.
3. El editor debe conservar Markdown como formato persistido y ofrecer controles WYSIWYG para:
   - encabezados H1, H2 y H3;
   - lista sin orden y lista numerada;
   - negrita, cursiva, subrayado y tachado;
   - crear, editar o retirar enlaces.
4. El pegado externo debe conservar caracteres especiales y transformar el contenido al Markdown soportado por el editor.
5. El toolbar debe indicar visualmente los formatos activos y exponer tooltips y nombres accesibles.
6. Cancelar no debe persistir cambios; Guardar debe conservar el flujo actual de notas y anotaciones dentro de `.ttrpgscene`.
7. La vista previa debe compartir la misma jerarquia tipografica y el mismo espacio editorial, renderizando Markdown sanitizado.
8. Las habitaciones enlazadas deben usar una composicion visual equivalente: titulo prominente, secciones claras, estado de conexion, destino y acciones persistentes.
9. Los estados de conexion valida, validando, rota o sin enlazar deben seguir siendo distinguibles sin reemplazar la paleta principal del producto.
10. La funcionalidad existente de renombrar, conectar, reconfigurar, navegar y desligar no debe cambiar.

## Look and feel

- Fondo negro carbon, superficies elevadas discretas y bordes finos.
- Acento dorado para acciones primarias, foco y formatos activos.
- Marfil para texto principal y grises frios para metadata y placeholders.
- Toolbar compacta en la parte superior y footer fijo con Cancelar/Guardar.
- Titulos editoriales grandes dentro del documento, sin apariencia de formulario administrativo.
- Controles responsivos sin solapamientos y con scroll interno en viewports pequenos.

## Persistencia y compatibilidad

- No cambia el formato de escena.
- Las notas continúan guardando `name` y `content` en Markdown.
- Los pines de habitacion continúan guardando `title` y `content` en Markdown.
- Las conexiones entre escenas mantienen su modelo, ids y escritura reciproca actuales.

## Criterios de aceptacion

- Todos los controles del toolbar modifican el documento y se reflejan al volver a abrirlo.
- Notas y habitaciones admiten texto pegado, caracteres especiales, listas, estilos y enlaces.
- La vista previa reproduce el Markdown sin mostrar su sintaxis.
- Los modales mantienen footer y toolbar disponibles mientras el contenido hace scroll.
- Las conexiones conservan todas sus acciones y muestran claramente su estado.
- Tests, lint, typecheck, build y smoke visual completan sin errores.
