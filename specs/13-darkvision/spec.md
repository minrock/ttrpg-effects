# Spec - Vision en la Oscuridad

Este documento describe de forma unificada la funcionalidad de vision en la oscuridad, consolidando el alcance funcional vigente en el proyecto.

## Visión en la Oscuridad

### Objetivo

Implementar un modo de **Visión en la oscuridad** inspirado en DnD: cuando esté activo, el mapa base se muestra en blanco y negro, la oscuridad ambiental deja de cubrir el mapa con overlay, y las áreas iluminadas por luces visibles recuperan color.

### Contexto

La app ya tiene:

- Oscuridad ambiental con overlay configurable.
- Luces puntuales y cónicas que revelan el mapa bajo oscuridad.
- Fuego que puede emitir luz.
- Fog of war separado de oscuridad.
- Un menú lateral derecho con sección `Oscuridad`.

La visión en la oscuridad es una experiencia visual distinta al overlay de oscuridad: no oculta el mapa con una capa negra, sino que convierte el mapa a escala de grises y reserva el color para las zonas con iluminación.

### Alcance

- Agregar un toggle `Visión en la oscuridad` dentro del submenú lateral `Oscuridad`.
- Al activar `Visión en la oscuridad`, desactivar visualmente el overlay de oscuridad.
- Mostrar la imagen del mapa base en blanco y negro cuando el modo esté activo.
- Si hay luces visibles sobre el mapa, las zonas cubiertas por esas luces deben verse a color.
- Las zonas fuera de cualquier luz visible deben seguir en blanco y negro.
- Mantener funcionando selección, pan, zoom, herramientas tácticas, fuego, niebla y click derecho.
- Mantener las luces existentes como fuente de la geometría que recupera color:
  - luz puntual,
  - luz cónica,
  - fuego con emisión de luz,
  - zonas de luz derivadas del fuego por celdas si ya existen en el render actual.
- El modo debe vivir como una configuración de oscuridad/visión en escena, no como estado efímero del canvas.
- Guardar y cargar el estado de `Visión en la oscuridad` dentro de `.ttrpgscene`.
- **El modo darkvision solo se aplica en la ventana del jugador.**  En la ventana del DM el mapa siempre se ve a color (sin filtro de grises) independientemente de si `darkvisionEnabled` está activo en la escena.  Esta regla es coherente con que la oscuridad ambiental tampoco afecta la vista del DM.

### Fuera de alcance

- Reglas completas de visión de DnD por criatura/token.
- Diferenciar darkvision por distancia individual de personajes.
- Colores especiales de darkvision por raza, clase o efecto mágico.
- Penumbra con reglas mecánicas de desventaja.
- Línea de visión bloqueada por paredes.
- Cambiar el sistema de fog of war.
- Simular visión en oscuridad por token virtual.

### Modelo de interacción

- En el accordion `Oscuridad`, aparece un control `Visión en la oscuridad`.
- Al activarlo:
  - el overlay de oscuridad queda visualmente desactivado,
  - el mapa se ve en blanco y negro,
  - las áreas iluminadas se ven a color.
- Al desactivarlo:
  - el mapa vuelve al render normal,
  - el overlay de oscuridad vuelve a comportarse según la configuración normal de oscuridad.
- El toggle debe dejar claro que es un modo distinto a `Oscuridad`.
- Si el overlay de oscuridad estaba activo antes de activar visión en la oscuridad, esa configuración debe poder recuperarse al desactivar el modo.
- El usuario debe poder tener luces visibles encima del mapa y moverlas mientras el color se actualiza en tiempo real.

### Reglas visuales

#### Mapa sin luces

- Con `Visión en la oscuridad` activa y sin luces visibles, todo el mapa base se renderiza en blanco y negro.
- La grilla, formas, mediciones, selección y UI React no deben forzarse a blanco y negro salvo decisión técnica posterior.

#### Mapa con luces

- Las luces visibles definen máscaras donde el mapa vuelve a color.
- Una luz puntual recupera color dentro de su radio circular.
- Una luz cónica recupera color dentro de su sector cónico.
- El fuego con luz recupera color en su área de iluminación actual.
- Si varias luces se solapan, el área resultante se mantiene a color.

#### Relación con oscuridad ambiental

- La visión en la oscuridad no debe dibujar el overlay negro de oscuridad encima del mapa.
- El control de opacidad/overlay de oscuridad puede seguir visible, pero no debe afectar visualmente mientras `Visión en la oscuridad` esté activa.
- Al apagar `Visión en la oscuridad`, el overlay debe volver a usar su configuración normal.

#### Relación con niebla

- La niebla de guerra sigue siendo independiente.
- Si `Niebla` está activa, las zonas no reveladas siguen ocultas aunque `Visión en la oscuridad` esté activa.
- La visión en la oscuridad afecta solo lo que ya es visible bajo fog of war.

### Persistencia

La escena debe conservar si `Visión en la oscuridad` está activa.

Opciones aceptables:

- Extender `SceneDarkness` con `darkvisionEnabled: boolean`.
- O crear una estructura de visión futura si encaja mejor con el modelo actual.

Requisitos:

- Escenas antiguas sin el campo nuevo deben cargar con `darkvisionEnabled: false`.
- Guardar escena debe preservar el estado del toggle.
- No se deben introducir datos dependientes de pantalla o viewport.

### Render / PixiJS

La implementación debe mantener PixiJS encapsulado en `src/render/pixi`.

Estrategia visual sugerida:

- Renderizar el mapa base normalmente.
- Cuando `darkvisionEnabled` esté activo:
  - aplicar filtro de blanco y negro al mapa base,
  - renderizar una versión a color del mapa sobre la versión gris,
  - enmascarar la versión a color con las geometrías de luces visibles.

La estrategia exacta puede variar, pero debe cumplir:

- El mapa fuera de luces se ve claramente en blanco y negro.
- El mapa dentro de luces se ve claramente a color.
- Las herramientas, grilla, shapes, luces, fuego, selección y UI siguen renderizándose legibles.
- El comportamiento funciona con zoom, pan y movimiento de luces.
- Se limpian filtros, sprites, máscaras y render textures al actualizar/destruir escena.

### UI / UX

- El toggle vive en el accordion `Oscuridad` del sidebar derecho.
- El texto sugerido es `Visión en la oscuridad`.
- Puede incluir un texto o estado corto si ayuda, por ejemplo `Mapa en blanco y negro`.
- No debe ocupar mucho espacio ni desplazar controles críticos.
- Al activarse, debe ser evidente visualmente que el modo cambió.

### Criterios de aceptación

- Existe un toggle `Visión en la oscuridad` en el menú lateral `Oscuridad`.
- Activar el toggle desactiva visualmente el overlay negro de oscuridad.
- Activar el toggle muestra el mapa base en blanco y negro.
- Con luces visibles, las zonas iluminadas del mapa se ven a color.
- Fuera de luces visibles, el mapa sigue en blanco y negro.
- Mover una luz actualiza la zona a color.
- Cambiar radio/dirección de una luz actualiza la zona a color.
- Apagar el toggle restaura el render normal del mapa.
- Si la oscuridad ambiental estaba activa, vuelve a aplicarse al apagar visión en la oscuridad.
- La niebla de guerra sigue ocultando áreas no reveladas.
- Guardar y cargar escena conserva el estado del toggle.
- Escenas antiguas cargan con visión en la oscuridad desactivada.
- No se agregan accesos directos del renderer a Node.js, Electron internals o filesystem.

### Riesgos

- Aplicar filtros y máscaras sobre mapas grandes puede afectar rendimiento.
- Duplicar el sprite del mapa para versión gris/color puede complicar sincronización de posición, escala y textura.
- Mezclar oscuridad, fog of war y darkvision puede producir orden de capas incorrecto si no se mantiene una separación clara.
- Algunos filtros de Pixi pueden comportarse distinto según renderer WebGL/WebGPU.

### Preguntas abiertas antes del plan

- Confirmar si `Visión en la oscuridad` debe afectar **solo el mapa base** o también assets futuros como tokens/minis.
- Confirmar si las formas, mediciones, grilla, fuego y overlays deben conservar color normal aunque el mapa esté en blanco y negro.
- Confirmar si al activar el modo debe apagar `darkness.enabled` en estado, o solo ignorar visualmente el overlay mientras el modo esté activo.
- Confirmar si la zona a color por luces debe usar exactamente la geometría actual de luz o si debe distinguir luz brillante/tenue en el futuro.
