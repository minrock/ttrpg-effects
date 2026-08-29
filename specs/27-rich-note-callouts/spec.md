# Spec 27 - Callouts para informacion de habitaciones

## Estado

- Spec funcional aceptado en `feature/rich-note-callouts`.
- Implementacion completada segun `./plan.md`.
- Implementacion aceptada para la version `1.7.4`.

## Objetivo

Permitir que el DM destaque advertencias, pistas, reglas locales y datos importantes dentro de la informacion de un pin de habitacion mediante bloques visuales llamados `callouts`, sin abandonar el editor WYSIWYG ni exponer sintaxis tecnica durante la escritura.

## Alcance

- Esta primera version aplica al editor WYSIWYG y a la vista previa de los pines de habitacion.
- La extension se denomina `callout` y debe mantenerse reusable; su habilitacion inicial en habitaciones no forma parte de su identidad tecnica.
- Las notas generales no incorporan callouts en esta iteracion.
- Los callouts son contenido exclusivo del DM, igual que los pines de habitacion, y no se muestran en Player View.

## Requerimientos funcionales

1. El toolbar del editor de habitaciones debe ofrecer una accion reconocible para insertar un callout en la posicion actual del cursor.
2. Un callout debe comportarse como un bloque de contenido dentro del documento, permitiendo escribir y editar su texto sin salir del flujo WYSIWYG.
3. Cada callout puede tener un emoji personalizado.
4. El emoji debe poder agregarse, reemplazarse o retirarse despues de crear el callout.
5. Cada callout debe tener un color principal configurable mediante un selector de color.
6. El color principal debe aplicarse sin alteraciones a una linea vertical ubicada en el borde izquierdo del callout.
7. El fondo del cuerpo debe derivarse del color principal como un tono pastel, suavizado aproximadamente un 80% hacia un tono claro y manteniendo contraste suficiente con el texto.
8. El emoji debe mostrarse dentro del callout como identificador visual, separado del contenido pero alineado con su inicio.
9. Al seleccionar o colocar el cursor dentro de un callout, el editor debe permitir modificar su emoji y color sin recrear el bloque.
10. Debe existir una accion para retirar el formato de callout conservando su contenido como texto normal.
11. Los callouts no se pueden anidar dentro de otros callouts en esta primera version.
12. Cancelar la edicion de la habitacion no debe persistir inserciones ni modificaciones de callouts.
13. Guardar debe persistir el callout completo dentro del contenido de la habitacion, incluyendo texto, emoji y color.
14. Al cerrar y volver a abrir una habitacion, cada callout debe recuperar exactamente su contenido y personalizacion.
15. La vista previa de la habitacion debe renderizar el mismo orden, emoji, color distintivo y fondo pastel que se observan en el editor.

## Experiencia de edicion

- La accion de callout se integra en el toolbar existente y usa icono con tooltip y nombre accesible.
- Al insertar un callout se crea un bloque vacio listo para escribir, con un color principal predeterminado coherente con el acento dorado del producto.
- La configuracion de emoji y color debe ser contextual y compacta, sin abrir un modal adicional sobre el editor documental.
- El selector de emoji debe aceptar un unico emoji visible; no es una seleccion multiple.
- El selector de color debe mostrar tanto el color actual como el control nativo o equivalente para cambiarlo.
- El foco debe regresar al contenido despues de insertar o personalizar el bloque.
- Teclado, seleccion de texto, deshacer y rehacer deben continuar funcionando dentro y alrededor del callout.

## Look and feel

- El bloque mantiene la estetica oscura y editorial de TTRPG Effects.
- La linea izquierda es el distintivo mas saturado y claramente visible.
- El cuerpo usa una version pastel del color, evitando fondos saturados que compitan con el contenido.
- El emoji tiene presencia suficiente para identificar el bloque, sin superar visualmente al texto.
- El callout usa esquinas discretas, espaciado interno consistente y no se presenta como una tarjeta dentro de otra tarjeta.
- Texto, enlaces, listas y enfasis dentro del callout deben conservar la tipografia y estilos del editor enriquecido.

## Persistencia y compatibilidad

- El contenido de la habitacion continua persistiendo en el campo Markdown existente de `.ttrpgscene`.
- El callout debe representarse mediante una extension Markdown controlada por la aplicacion; no debe guardar HTML de presentacion dentro de las notas.
- Emoji y color deben formar parte de esa representacion persistida y sobrevivir al ciclo editar, guardar, cargar y previsualizar.
- Habitaciones existentes sin callouts deben abrirse y guardarse sin cambios inesperados.
- Si un callout guardado contiene un color invalido o metadata incompleta, debe usar valores seguros por defecto y conservar su texto.
- El formato es aditivo y no requiere romper la compatibilidad de las escenas actuales.

## Accesibilidad y seguridad

- El color no debe ser el unico medio para identificar el callout; el bloque, la linea y el emoji aportan estructura visual adicional.
- Los controles de insertar, editar personalizacion y retirar callout deben ser accesibles por teclado.
- El emoji y el color se validan antes de persistirse.
- El render debe continuar usando el pipeline sanitizado y no habilitar HTML arbitrario, estilos CSS inyectados ni URLs no seguras.

## Fuera de alcance

- Callouts anidados.
- Plantillas o bibliotecas predefinidas de callouts.
- Imagenes, iconos externos o archivos adjuntos como identificador.
- Callouts visibles o interactivos en Player View.
- Personalizacion individual de tipografia, bordes adicionales o fondos independientes del color principal.

## Criterios de aceptacion

- El DM puede insertar un callout desde el toolbar de una habitacion y escribir dentro de el inmediatamente.
- El DM puede asignar, cambiar o retirar un emoji y elegir el color principal.
- La linea izquierda usa el color principal y el cuerpo muestra una variante pastel suavizada aproximadamente un 80%.
- El callout puede editarse o convertirse nuevamente en texto normal sin perder contenido.
- Guardar, cerrar y reabrir conserva texto, emoji y color.
- La vista previa coincide visualmente con el editor y nunca muestra la sintaxis Markdown del callout.
- Las habitaciones antiguas siguen funcionando y el archivo `.ttrpgscene` no requiere una migracion incompatible.
- Los callouts no aparecen en Player View.
