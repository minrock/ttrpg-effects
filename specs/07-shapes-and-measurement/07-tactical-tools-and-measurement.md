# Spec 07 - Herramientas Tacticas y Medicion

## Objetivo

Implementar herramientas para medir distancias y dibujar areas tacticas utiles en D&D 5e y juegos similares.

## Alcance

- Medicion lineal.
- Lineas.
- Circulo/esfera 2D.
- Cono.
- Rectangulo/cubo.
- Snap-to-grid opcional.
- Seleccion y borrado.
- Medidas en pies y metros.
- Diagonales configurables.

## Reglas iniciales

- Sistema principal: D&D 5e.
- Distancia por defecto: 5 ft por casilla.
- Metrico comun: 1.5 m por casilla.
- Diagonal por defecto: 5 ft.
- Diagonal configurable para soportar variantes.

## Comportamiento de formas

- Las formas se crean desde el menu contextual o herramienta activa.
- Las formas persisten hasta que el usuario las borre.
- Las formas pueden seleccionarse.
- Las formas pueden moverse o ajustarse si la herramienta lo permite.
- Las formas pueden encajar en la grilla si snap-to-grid esta activo.

## Preguntas pendientes

- Los conos deben seguir plantilla exacta de D&D 5e o geometria libre medida?
- Los cubos se alinean siempre a grilla o pueden rotarse/liberarse?
- Las esferas se representan solo como circulo 2D o con ayudas de diametro/radio?

## Criterios de aceptacion

- El usuario puede crear una medicion lineal.
- La medicion muestra distancia en la unidad activa.
- El usuario puede alternar pies/metrico.
- El usuario puede crear circulo, cono y rectangulo.
- El usuario puede activar/desactivar snap-to-grid.
- El usuario puede seleccionar y borrar formas.
- Las mediciones respetan la configuracion de diagonales.

## Riesgos

- Sobrecargar el MVP con demasiada exactitud de reglas.
- Hacer formas visualmente bonitas pero poco legibles en proyeccion.
- No distinguir entre forma temporal y forma persistente.

## Notas de implementacion

- Guardar formas en coordenadas de mundo.
- Guardar unidad y modo de diagonal en configuracion global de escena.
- Diseñar estilos de alto contraste pero no invasivos.
