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
