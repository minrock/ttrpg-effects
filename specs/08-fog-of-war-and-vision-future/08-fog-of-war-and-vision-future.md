# Spec 08 - Niebla de Guerra y Vision

## Objetivo

Implementar una primera experiencia completa de niebla de guerra para sesiones presenciales: ocultar zonas no reveladas del mapa, revelar areas manualmente durante la partida y permitir que las luces existentes aporten vision actual.

## Alcance

- Ocultar el mapa con una capa de fog of war configurable.
- Activar/desactivar la niebla sin afectar la oscuridad ambiental existente.
- Configurar opacidad, color y radio de revelado manual.
- Usar `50` como radio default de revelado para empezar con un pincel controlado.
- Revelar areas circulares con click o arrastre sobre el mapa.
- Separar `Modo niebla` de `Grab` para evitar revelar zonas mientras se navega el mapa.
- Permitir alternar entre `Modo niebla` y `Grab` desde el menu contextual de click derecho.
- Mostrar un cursor tipo pincel/crosshair cuando `Modo niebla` este activo.
- Resetear las zonas reveladas de la escena.
- Guardar y cargar las zonas reveladas dentro del archivo `.ttrpgscene`.
- Usar luces visibles y fuego con emision de luz como areas de vision actual.
- Reservar datos y capa visual para paredes/obstaculos de vision futuros.

## Fuera de alcance

- Linea de vision automatica recortada por paredes.
- Editor completo de paredes, puertas u obstaculos.
- Puertas con estado abierto/cerrado.
- Vision por tokens virtuales.
- Reglas avanzadas de vision D&D 5e.
- Resolver el bug independiente de mascaras de luces contra la oscuridad ambiental.

## Consideraciones de arquitectura

- Separar oscuridad ambiental, zonas reveladas persistentes, vision actual y obstaculos.
- Guardar coordenadas de revelado y obstaculos en espacio de mundo.
- Mantener la logica de vision en modulos de dominio testeables, sin depender de React, Electron ni PixiJS.
- La niebla se renderiza en su propia capa, por encima del mapa y debajo de herramientas tacticas/seleccion.
- El renderer no debe acceder directamente al filesystem ni a APIs privilegiadas.

## Criterios de aceptacion

- El usuario puede activar fog of war desde la barra de controles.
- La niebla cubre el mapa no revelado con opacidad configurable.
- El radio default de revelado manual es `50`.
- `Modo niebla` permite descubrir areas circulares con click o arrastre.
- `Modo niebla` cambia el puntero del canvas para indicar que se va a revelar niebla.
- `Grab` permite mover la vista sin revelar fog accidentalmente.
- El menu contextual permite cambiar rapidamente de `Grab` a `Modo niebla` y viceversa.
- El boton `Reset niebla` borra las areas reveladas manuales.
- Las luces y fuegos visibles aportan vision actual mientras existan.
- Las escenas antiguas sin datos de fog siguen cargando con defaults.
- Las escenas guardadas conservan `fogOfWar`, zonas reveladas y obstaculos.
- Existen tests de dominio y schema para la nueva estructura.

## Riesgos

- Las mascaras de render en Pixi pueden comportarse distinto entre render textures, blend modes y overlays.
- Si se mezclan oscuridad y niebla en un solo concepto, futuras reglas de vision seran dificiles de implementar.
- El calculo real de linea de vision puede requerir geometria adicional o shaders en una spec posterior.

## Referencia

El bug `./bugs/bug-mask-lights-to-see-through-darkness-overlay/` sigue documentando el problema independiente donde las luces no revelan claramente el mapa a traves de la oscuridad ambiental.
