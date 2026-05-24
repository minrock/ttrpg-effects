# Spec 17 - Submenu de Efectos y Oscuridad Magica

## Objetivo

Reorganizar luces y fuego dentro de un nuevo submenu `Efectos` en el menu contextual, y agregar un nuevo efecto persistible llamado `Oscuridad magica`: un circulo negro editable que se impone sobre mapa, luces y vision en la oscuridad, pero deja visibles las figuras tacticas, mediciones y seleccion por encima.

## Contexto

El menu contextual ya tiene un submenu `Herramientas de area` para linea, circulo, cono y rectangulo. Actualmente fuego, pintar fuego y luces viven como acciones sueltas en el menu contextual. La app tambien tiene:

- mapa base;
- oscuridad ambiental;
- luces puntuales y conicas;
- fuego circular o por celdas;
- vision en la oscuridad;
- fog of war;
- formas tacticas y mediciones;
- panel de propiedades para elementos seleccionados.

La nueva funcionalidad agrupa los efectos visuales y agrega una oscuridad magica que debe comportarse como un bloqueo visual especial, por encima de las fuentes de luz y darkvision.

## Alcance

- Crear un submenu `Efectos` en el menu contextual.
- Mover al submenu `Efectos`:
  - `Fuego`;
  - `Pintar fuego`;
  - `Luz puntual`;
  - `Luz conica`;
  - `Oscuridad magica`.
- Agregar el nuevo efecto `Oscuridad magica`.
- Crear oscuridad magica desde click derecho en coordenadas de mundo.
- Renderizar oscuridad magica como circulo negro.
- Permitir seleccionar, mover, borrar y editar oscuridad magica.
- Permitir modificar el radio de oscuridad magica desde el canvas, igual que otros circulos editables.
- Permitir modificar opacidad desde el panel de propiedades.
- Mantener color fijo negro.
- Renderizar un borde negro visible aun cuando la opacidad del relleno este baja.
- Guardar y cargar oscuridad magica dentro de `.ttrpgscene`.
- Mantener figuras, mediciones, emojis de formas, handles y seleccion visibles por encima de la oscuridad magica.

## Fuera de alcance

- Colores configurables para oscuridad magica.
- Formas no circulares de oscuridad magica.
- Interaccion con reglas de DnD por criatura, clase o item.
- Linea de vision, paredes o recortes por obstaculos.
- Efectos de animacion, ruido, particulas o shaders especiales.
- Permitir que una luz normal revele oscuridad magica.
- Integrar permisos por token o personaje para ver a traves de oscuridad magica.

## Modelo de interaccion

### Menu contextual

El menu contextual debe quedar organizado con submenus:

- `Herramientas de area ▶`
  - `Linea`
  - `Circulo`
  - `Cono`
  - `Rectangulo`
- `Efectos ▶`
  - `Fuego`
  - `Pintar fuego`
  - `Luz puntual`
  - `Luz conica`
  - `Oscuridad magica`

Las acciones de fuego y luces dejan de vivir como botones sueltos en la raiz del menu contextual.

### Crear oscuridad magica

- El usuario abre click derecho sobre el mapa/canvas.
- Entra a `Efectos`.
- Selecciona `Oscuridad magica`.
- Se crea un circulo centrado en la posicion de mundo del click.
- El nuevo efecto queda seleccionado.

### Editar oscuridad magica

- Al seleccionar oscuridad magica, aparece su panel de propiedades en el sidebar contextual.
- El panel muestra al menos:
  - radio medido en cuadros de grilla y mostrado con equivalencia en la unidad activa del mapa (`ft` o `m`);
  - opacidad;
  - visibilidad si el modelo actual de efectos lo permite.
- El radio puede editarse desde el canvas arrastrando el contorno/handle, igual que los circulos tacticos u otros efectos circulares.
- El radio editado desde el panel se introduce en cuadros de grilla; internamente se convierte a coordenadas de mundo usando `grid.cellSizeWorld`.
- El efecto puede moverse arrastrando su centro.
- `Delete` o `Backspace` lo borra cuando esta seleccionado.

## Reglas visuales

### Mapa iluminado

Si el mapa se ve normal o esta iluminado por luces:

- La oscuridad magica se renderiza como un circulo negro encima del mapa y de las luces.
- La zona cubierta no debe mostrar el mapa ni la iluminacion debajo, salvo que la opacidad del efecto haya sido reducida manualmente.

### Mapa oscuro con fuentes de luz

Si hay oscuridad ambiental activa y una luz revela una zona:

- La oscuridad magica permanece negra sobre esa luz.
- La luz no perfora ni aclara la oscuridad magica.

### Vision en la oscuridad

Si `Vision en la oscuridad` esta activa:

- La oscuridad magica permanece oscura.
- Darkvision no convierte la zona de oscuridad magica en blanco y negro visible.
- Las zonas iluminadas fuera de la oscuridad magica siguen recuperando color segun la spec 12.

### Opacidad baja

- La opacidad controla solo el relleno del circulo.
- Si la opacidad baja, el contenido debajo puede verse parcialmente.
- El borde negro del circulo permanece visible con opacidad alta para advertir que la zona sigue siendo oscuridad magica.
- El borde debe tener pocos pixeles de ancho y no debe confundirse con handles de seleccion.

### Orden de capas

La oscuridad magica se sobrepone a:

- mapa base;
- mapas en gris/color por vision en la oscuridad;
- tokens/minis;
- luces puntuales y conicas;
- luz emitida por fuego;
- oscuridad ambiental.

La oscuridad magica queda por debajo de:

- fog of war / niebla de guerra;
- grilla si se decide mantenerla visible para referencia;
- formas tacticas;
- mediciones;
- emojis de formas;
- handles de edicion;
- seleccion;
- UI React.

Requisito clave: el orden de gameplay debe mantenerse como mapa -> tokens -> oscuridad ambiental -> luces -> oscuridad magica -> fog -> herramientas de area. Las figuras y mediciones deben verse arriba de la oscuridad magica para que el usuario pueda identificar areas afectadas por otros efectos.

## Modelo de datos

La oscuridad magica debe ser persistible y tener id estable.

Opcion sugerida:

- Extender `SceneEffect` con `kind: "magical-darkness"`.

Campos requeridos:

- `id`;
- `kind: "magical-darkness"`;
- `position`;
- `radius`;
- `opacity`;
- `visible`;

Campos no requeridos:

- `color`, porque es negro fijo;
- `emitsLight`;
- `lightRadius`;
- `zone`;

Si por compatibilidad conviene mantener una union de efectos con campos compartidos, el plan puede definir la forma exacta, pero no debe mezclar la oscuridad magica con fuego si eso complica validacion o render.

## Persistencia

- Guardar oscuridad magica dentro de `.ttrpgscene`.
- Cargar escenas con oscuridad magica sin perder radio, opacidad, posicion, visibilidad e id.
- Escenas antiguas sin oscuridad magica deben seguir cargando.
- No se requiere cambio de version del documento si el schema v1 acepta la union nueva de forma retrocompatible.
- Si se requiere migracion interna, debe mantener defaults seguros:
  - radio inicial razonable;
  - opacidad inicial `1`;
  - visible `true`.

## Render / PixiJS

- La oscuridad magica debe renderizarse en una capa propia o en una subcapa de efectos con orden superior a mapa/luces/darkvision.
- Debe dibujarse despues de luces y overlays visuales que revelan el mapa.
- Debe dibujarse antes de formas, mediciones y seleccion.
- El circulo usa relleno negro con `opacity` configurable.
- El borde usa negro con opacidad alta aunque el relleno sea bajo.
- Los handles de seleccion/radio se renderizan encima, en la capa de seleccion.
- Debe funcionar con pan y zoom.
- Debe limpiarse al borrar el efecto o resetear/cargar escena.

## UI / UX

- El submenu se llama `Efectos`.
- La opcion se llama `Oscuridad magica`.
- En el panel de propiedades, el titulo debe ser `Oscuridad magica`.
- La opacidad puede exponerse como slider `Opacidad`.
- El radio debe exponerse como input numerico `Radio` en cuadros de grilla y mostrar al lado la distancia equivalente segun `grid.unit`, `distancePerCell` o `metricDistancePerCell`.
- El color no debe exponerse.
- Si existe control `Visible` para efectos, debe mantenerse.
- Debe conservar el look and feel oscuro/dorado actual.

## Criterios de aceptacion

- El menu contextual muestra un submenu `Efectos`.
- `Fuego`, `Pintar fuego`, `Luz puntual`, `Luz conica` y `Oscuridad magica` aparecen dentro de `Efectos`.
- Fuego y luces ya no aparecen como acciones sueltas en la raiz del menu contextual.
- Crear `Oscuridad magica` desde el submenu la coloca en la posicion del click derecho.
- La oscuridad magica se puede seleccionar.
- La oscuridad magica se puede mover.
- La oscuridad magica se puede borrar con `Delete` o `Backspace`.
- La oscuridad magica permite editar radio desde el canvas.
- La oscuridad magica permite editar radio desde el panel de propiedades usando cuadros de grilla y mostrando equivalencia en `ft` o `m`.
- La oscuridad magica permite editar opacidad desde el panel de propiedades.
- Con mapa iluminado, la oscuridad magica tapa el mapa y la luz debajo.
- Con oscuridad ambiental y luces, las luces no revelan la oscuridad magica.
- Con vision en la oscuridad, la oscuridad magica permanece oscura.
- Con opacidad baja, el relleno permite ver parcialmente debajo pero el borde negro sigue visible.
- Figuras, mediciones, emojis, handles y seleccion se ven por encima de la oscuridad magica.
- Guardar y cargar escena conserva oscuridad magica.
- Escenas antiguas siguen cargando.
- No se agregan accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.

## Riesgos

- El orden de capas puede hacer que la oscuridad magica tape handles o seleccion si se dibuja demasiado arriba.
- Integrarla con darkvision puede romper el enmascarado de mapa gris/color si se mezcla en la capa equivocada.
- Extender `SceneEffect` puede afectar validacion de fuego si no se modela como union clara.
- Si se reutiliza la capa de oscuridad ambiental, las luces podrian perforar accidentalmente la oscuridad magica.

## Notas de implementacion

- Preferir una capa de render especifica para oscuridad magica o dibujarla despues de los efectos de iluminacion y antes de shapes/selection.
- Reutilizar patrones de resize de circulos/luces para el radio.
- Reutilizar el panel contextual de propiedades del sidebar.
- Mantener negro fijo para evitar controles innecesarios.
- Si el sistema actual de efectos asume `kind: "fire"` unicamente, convertir `SceneEffect` en union discriminada antes de implementar.
