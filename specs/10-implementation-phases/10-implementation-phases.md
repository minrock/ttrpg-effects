# Spec 09 - Fases de Implementacion

## Objetivo

Ordenar la implementacion en entregables revisables, reduciendo riesgo tecnico y permitiendo validar cada avance antes de construir encima.

## Fase 0 - Bootstrap

Referencia: Spec 00.

Resultado esperado:

- Electron abre una ventana.
- Logo inicial visible.
- Scripts basicos funcionando.

## Fase 1 - Motor visual

Referencia: Spec 01.

Resultado esperado:

- Lienzo PixiJS o motor elegido.
- Capas iniciales.
- Pan/zoom tecnico.

## Fase 2 - Mapa y grilla

Referencia: Spec 04.

Resultado esperado:

- Carga de imagen.
- Grilla cuadrada.
- Calibracion por arrastre y numerica.
- Bloqueo de escala.

## Fase 3 - Sesiones

Referencia: Spec 02.

Resultado esperado:

- Guardar y cargar `.ttrpgscene`.
- Rutas locales de imagen.
- Camara, mapa y grilla persistentes.

## Fase 4 - Interaccion y herramientas tacticas

Referencias: Spec 03 y Spec 05.

Resultado esperado:

- Menu contextual.
- Medicion.
- Areas tacticas.
- Seleccion y borrado.
- Snap-to-grid.

## Fase 5 - Iluminacion y efectos

Referencia: Spec 06.

Resultado esperado:

- Oscuridad global.
- Luz puntual.
- Luz conica.
- Fuego animado.
- Guardado de luces y efectos.

## Fase 6 - Mejoras posteriores

Referencias: Spec 07 y Spec 08.

Resultado esperado:

- Niebla de guerra.
- Paredes y vision.
- Minis virtuales opcionales.

## Criterio de avance

Cada fase debe:

- Tener demo visible.
- Cumplir criterios de aceptacion de sus specs.
- No romper specs previas.
- Actualizar documentacion si cambian decisiones.

