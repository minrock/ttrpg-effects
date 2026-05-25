# Spec 01 - Motor Visual y Capas de Render

## Objetivo

Definir e implementar la base visual donde se renderizaran el mapa, grilla, oscuridad, luces, efectos animados, formas tacticas y UI contextual.

## Alcance

- Crear el lienzo principal de la aplicacion.
- Definir el sistema de coordenadas del mundo.
- Definir orden de capas.
- Integrar el motor visual elegido.
- Preparar soporte para pan, zoom y render de alta fluidez.
- El pan/drag del mapa se activa solo mientras la barra espaciadora esta oprimida.

## Tecnologia propuesta

Recomendacion inicial: PixiJS dentro de Electron.

Motivos:

- Buen rendimiento para mapas, sprites, mascaras y efectos.
- Encaja bien con luces, blend modes y fuego animado.
- Evita trabajar directamente con WebGL desde cero.
- Puede convivir con React para UI externa.

Alternativas:

- Canvas 2D: mas simple, pero puede quedarse corto para iluminacion y efectos.
- Three.js: potente, pero mas orientado a 3D de lo necesario.
- WebGL directo: flexible, pero demasiado costoso para el MVP.

## Orden de capas

Orden recomendado de abajo hacia arriba:

1. Imagen del mapa como primera capa visual y base mas baja.
2. Grilla/base de referencia, debajo de ocultamiento visual.
3. Tokens/minis.
4. Capa global de oscuridad.
5. Luces y mascaras de iluminacion.
6. Efectos animados como fuego/agua, debajo de niebla.
7. Oscuridad magica.
8. Fog of war / niebla de guerra.
9. Obstaculos/guia tactica si aplican.
10. Herramientas de area: formas tacticas, mediciones, paths y handles.
11. Indicadores de seleccion y apuntador.
12. UI contextual no renderizada en el mapa, si aplica.

El fondo tecnico del canvas puede existir como fallback visual, pero no debe considerarse una capa de gameplay por encima del mapa.
La secuencia de gameplay que no debe romperse es: mapa -> tokens -> oscuridad -> luces -> oscuridad magica -> fog -> herramientas de area; la grilla queda como referencia base bajo oscuridad/fog.

## Sistema de coordenadas

- Debe existir coordenada de pantalla.
- Debe existir coordenada de mundo/mapa.
- La conversion pantalla <-> mundo debe ser centralizada.
- Las herramientas tacticas deben almacenar posiciones en coordenadas de mundo.
- La camara debe controlar pan y zoom.
- El pan de camara no debe ser un modo persistente ni un boton de UI.
- Al mantener `Space`, el cursor cambia a mano y el viewport entra temporalmente en modo drag.
- Mientras `Space` esta oprimido no se pueden seleccionar ni editar elementos del mapa.
- Al soltar `Space`, el cursor vuelve al puntero normal y la herramienta activa vuelve a seleccion, incluso si antes estaba en otro modo como pintar fuego o niebla.

## Criterios de aceptacion

- Existe un lienzo principal renderizado dentro de la ventana Electron.
- El motor visual inicializa sin errores.
- Hay una camara basica con pan y zoom.
- El pan funciona solo con `Space` presionado y arrastre del puntero.
- El cursor cambia a mano mientras `Space` esta presionado.
- Al soltar `Space`, la interaccion vuelve a seleccion.
- El orden de capas esta implementado o preparado de forma explicita.
- Es posible dibujar elementos de prueba en capas distintas.
- La base permite agregar mapa, grilla y luces sin reescritura mayor.

## Riesgos

- Acoplar demasiado el motor visual a React.
- No separar coordenadas de mundo y pantalla.
- No preparar correctamente el orden de capas para iluminacion.

## Notas de implementacion

- React debe controlar paneles, menus e inputs.
- PixiJS debe controlar render interactivo del mapa.
- Evitar que cada herramienta implemente su propia conversion de coordenadas.
