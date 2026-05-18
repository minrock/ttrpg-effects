# Spec 04 - Carga de Mapa y Calibracion de Grilla

## Objetivo

Permitir cargar una imagen de mapa, mostrarla en el lienzo, superponer una grilla cuadrada y calibrar el tamano fisico de las casillas para usar minis reales sobre la proyeccion.

## Alcance

- Cargar PNG, JPG/JPEG, WEBP y HEIC.
- Mostrar mapa en el lienzo.
- Crear grilla cuadrada.
- Ajustar opacidad de grilla.
- Calibrar por arrastre.
- Calibrar por valor numerico.
- Bloquear zoom/escala para proteger la calibracion.

## Flujo esperado

1. El usuario carga una imagen.
2. La app muestra el mapa centrado.
3. El usuario activa o ajusta la grilla.
4. El usuario arrastra un control de calibracion hasta que una casilla mida correctamente en la superficie proyectada.
5. Opcionalmente ajusta valores numericos.
6. El usuario bloquea la escala.
7. La sesion entra en modo de uso normal.

## Formatos de imagen

Formatos requeridos:

- PNG.
- JPG/JPEG.
- WEBP.
- HEIC.

HEIC puede requerir soporte adicional segun Electron/Chromium y sistema operativo. Si no es viable de forma nativa en todas las plataformas, debe documentarse una conversion interna o un mensaje claro.

## Presets de escala

Presets iniciales:

- 1 inch por casilla.
- 2.5 cm por casilla.
- 5 ft por casilla.
- 1.5 m por casilla.

## Criterios de aceptacion

- El usuario puede cargar una imagen valida.
- La grilla aparece sobre el mapa.
- El usuario puede cambiar opacidad de grilla.
- El usuario puede calibrar por arrastre.
- El usuario puede calibrar numericamente.
- Al bloquear escala, la rueda del mouse no rompe el tamano fisico de la grilla.
- La configuracion de mapa y grilla se puede guardar en el formato de sesion.

## Riesgos

- HEIC puede no estar soportado igual en todos los sistemas.
- Confundir zoom visual de camara con escala fisica calibrada.
- No dejar margen externo suficiente alrededor del mapa.

## Notas de implementacion

- Modelar por separado escala del mapa, escala de camara y tamano de celda.
- El margen externo debe permitir centrar esquinas o zonas fuera de la imagen.
- La grilla del MVP es cuadrada, sin hexagonos.

