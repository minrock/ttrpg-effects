# Spec 01 - Motor Visual y Capas de Render

## Objetivo

Definir e implementar la base visual donde se renderizaran el mapa, grilla, oscuridad, luces, efectos animados, formas tacticas y UI contextual.

## Alcance

- Crear el lienzo principal de la aplicacion.
- Definir el sistema de coordenadas del mundo.
- Definir orden de capas.
- Integrar el motor visual elegido.
- Preparar soporte para pan, zoom y render de alta fluidez.

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

1. Fondo del mundo.
2. Imagen del mapa.
3. Grilla.
4. Capa global de oscuridad.
5. Luces y mascaras de iluminacion.
6. Efectos animados como fuego.
7. Formas tacticas y mediciones.
8. Indicadores de seleccion.
9. UI contextual no renderizada en el mapa, si aplica.

## Sistema de coordenadas

- Debe existir coordenada de pantalla.
- Debe existir coordenada de mundo/mapa.
- La conversion pantalla <-> mundo debe ser centralizada.
- Las herramientas tacticas deben almacenar posiciones en coordenadas de mundo.
- La camara debe controlar pan y zoom.

## Criterios de aceptacion

- Existe un lienzo principal renderizado dentro de la ventana Electron.
- El motor visual inicializa sin errores.
- Hay una camara basica con pan y zoom.
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

