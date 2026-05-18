# Spec 07 - Niebla de Guerra y Vision Futuras

## Objetivo

Documentar el diseno futuro de niebla de guerra, revelado progresivo, paredes y linea de vision para no bloquear esas capacidades desde la arquitectura inicial.

## Alcance futuro

- Ocultar zonas no reveladas del mapa.
- Revelar zonas manualmente.
- Asociar vision o revelado a luces.
- Dibujar paredes, puertas u obstaculos.
- Limitar iluminacion y vision con obstaculos.
- Asociar vision a tokens o minis virtuales si se implementan.

## Fuera del MVP

- Linea de vision automatica.
- Paredes interactivas.
- Puertas con estado abierto/cerrado.
- Vision por token.
- Reglas avanzadas de vision D&D 5e.

## Consideraciones de arquitectura

- Las luces deben tener identificadores persistentes.
- Las zonas reveladas deben poder guardarse por escena.
- Las paredes deben almacenarse en coordenadas de mundo.
- La capa de oscuridad del MVP debe poder evolucionar a niebla de guerra.
- El motor visual debe permitir mascaras o shaders suficientes.

## Criterios de aceptacion de diseno

- El MVP no implementa niebla completa, pero no impide agregarla.
- El modelo de luces puede conectarse a vision futura.
- La arquitectura de capas reserva lugar para niebla y paredes.
- El formato de sesion puede versionarse para agregar datos de vision.

## Riesgos

- Implementar oscuridad como truco visual imposible de extender.
- No separar luz, vision y revelado.
- Mezclar tokens virtuales con minis fisicas antes de tener claro el flujo.

## Notas de implementacion futura

- Separar tres conceptos: oscuridad ambiental, vision actual y zonas reveladas.
- La linea de vision deberia ser una fase posterior, no una dependencia del MVP.

