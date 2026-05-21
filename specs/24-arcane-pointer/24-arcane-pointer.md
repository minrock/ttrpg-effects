# Spec 24 - Apuntador arcano

## Estado

Aceptado para implementacion.

## Objetivo

Agregar un modo `Apuntador` para llamar la atencion sobre una celda del mapa durante la sesion, renderizando una animacion temporal de un circulo arcano pixel-art que aparece y desaparece alrededor de la celda seleccionada.

## Contexto

La app se usa como herramienta visual de mesa. Ya existen modos y toggles superiores para acciones globales como bloqueo de zoom, carga de mapa y controles de escena. Tambien existen assets animados internos para fuego y agua con estetica pixel-art.

El apuntador debe servir para senalar una posicion sin crear una figura tactica persistente ni alterar mapa, niebla, oscuridad, luces, tokens o efectos.

## Alcance

- Crear un modo `Apuntador`.
- Exponer el modo como un boton toggle visible en la barra superior, con comportamiento similar al toggle de zoom.
- Exponer configuracion de tamano en el aside derecho mientras el modo `Apuntador` esta activo.
- Al activar `Apuntador`, el cursor debe comunicar que el siguiente click colocara una senal visual.
- Al hacer click normal sobre una celda/cuadricula, se dispara una animacion de circulo arcano centrada en esa celda.
- La animacion dura aproximadamente 4 segundos.
- La animacion hace fade in y fade out:
  - opacidad 0 -> 100;
  - luego opacidad 100 -> 0.
- El circulo arcano debe ser mas grande que una celda de grilla.
- El tamano visual se calcula desde la categoria de criatura elegida en el aside.
- La animacion es temporal y no se guarda como parte de `.ttrpgscene`.
- Se pueden disparar varios apuntadores de forma consecutiva sin bloquear la interaccion.
- Usar un asset interno generado para el proyecto con estetica pixel-art coherente con agua y fuego.

## Fuera de alcance

- Persistir apuntadores en escena.
- Historial de apuntadores.
- Editar color, duracion o estilo desde UI.
- Sincronizacion multiplayer/remota.
- Sonido, vibracion, particulas adicionales o texto.
- Medicion de distancia o seleccion de objetos mediante el apuntador.

## Asset visual

Se debe generar un asset de circulo arcano pixel-art:

- Estetica compatible con los GIFs de agua y fuego: pixel-art, contraste legible, sin apariencia vectorial lisa.
- Fondo transparente.
- Forma circular o anillo arcano.
- Debe incluir detalles magicos legibles: runas, marcas radiales, pequenos segmentos, brillo interno o trazos ornamentales.
- Debe funcionar bien sobre mapas oscuros y claros.
- Debe tener borde/contraste suficiente para verse sobre grilla y mapa.
- Debe poder escalarse a un diametro mayor que la celda sin perder lectura.
- Si el asset es animado, la animacion interna debe ser sutil y loopable; si es estatico, Pixi controla el fade in/out.
- Guardar el asset como recurso interno del renderer, por ejemplo:
  - `src/renderer/public/effects/arcane-pointer.gif`, si es animado;
  - o `src/renderer/public/effects/arcane-pointer.png`, si es estatico.

## Modelo de interaccion

### Activar modo

- La barra superior muestra un boton toggle `Apuntador`.
- Si el modo esta apagado, click en el boton lo activa.
- Si el modo esta activo, click en el boton lo desactiva.
- Al activarse, no debe romper el bloqueo de zoom ni cambiar el estado de mapa/grilla/niebla.

### Click en mapa

- Con `Apuntador` activo, el usuario hace click normal sobre el canvas.
- El punto del click se ajusta al centro de la celda de grilla mas cercana.
- Se crea una animacion visual centrada en ese punto.
- El modo puede permanecer activo despues del click para permitir senalar varias celdas seguidas.
- `Escape` desactiva el modo apuntador.

### Configuracion en aside

- Cuando `Apuntador` esta activo, el aside derecho muestra una seccion de configuracion del apuntador.
- La configuracion incluye un selector de tamano de criatura.
- Opciones:
  - `Diminuto`: 1 x 1 cuadricula.
  - `Pequeno`: 1 x 1 cuadricula.
  - `Mediano`: 1 x 1 cuadricula.
  - `Grande`: 2 x 2 cuadriculas.
  - `Enorme`: 3 x 3 cuadriculas.
  - `Gargantuesca`: 4 x 4 cuadriculas.
- El apuntador se centra sobre la celda clickeada.
- Para tamanos de varias cuadriculas, el circulo cubre el footprint cuadrado completo de la criatura y queda ligeramente mas grande que ese footprint.
- La opcion por defecto es `Mediano`.
- El selector solo afecta nuevos apuntadores disparados despues del cambio; no modifica animaciones temporales ya activas.

### Conflictos con otros modos

- Si `Apuntador` esta activo, el click normal debe disparar el apuntador y no seleccionar ni mover elementos.
- Si el usuario activa otro modo exclusivo, como niebla, fuego, path o agua, `Apuntador` debe desactivarse.
- El pan con barra espaciadora debe seguir funcionando como modo temporal de navegacion. Al soltar la barra, si `Apuntador` estaba activo antes del pan, puede volver a estar activo.

## Render

- El apuntador se renderiza en una capa visual superior al mapa, grilla, niebla, oscuridad, luces, efectos, tokens y figuras.
- Debe quedar por debajo de UI React, menus contextuales y modales.
- No debe interferir con hit testing de objetos.
- La animacion debe eliminarse/destrozarse al terminar para no acumular objetos Pixi.
- La duracion total aproximada es 4 segundos.
- La curva de opacidad recomendada:
  - 0% a 20% del tiempo: fade in 0 -> 1;
  - 20% a 65% del tiempo: mantener visible;
  - 65% a 100% del tiempo: fade out 1 -> 0.
- El tamano recomendado es entre 1.4x y 1.8x el tamano de celda.
- Para tamanos de criatura de 2x2, 3x3 y 4x4, el diametro visual se calcula sobre el lado del footprint cuadrado y se escala levemente por encima de ese lado.
- Si no hay grilla cargada, usar un tamano default razonable y centrar en coordenada de mundo del click.

## Estado y persistencia

- El modo `Apuntador` vive en estado de interaccion/renderer.
- Cada animacion activa debe tener:
  - `id` temporal;
  - posicion de mundo;
  - `startedAt`;
  - duracion;
  - tamano en mundo.
- La configuracion del modo apuntador incluye `creatureSize`, con default `medium`.
- Los apuntadores activos no se guardan en `.ttrpgscene`.
- Al cargar o crear nueva escena, se cancelan apuntadores activos.

## Seguridad y arquitectura

- El asset se carga desde rutas internas del renderer (`/effects/...`).
- No requiere IPC nuevo.
- No requiere acceso a filesystem desde renderer.
- La logica de tiempo/animacion debe quedar encapsulada en el adapter Pixi o en un helper testeable si se modela como dominio puro.

## Criterios de aceptacion

- Existe el spec y el asset interno del circulo arcano.
- La barra superior permite activar/desactivar `Apuntador`.
- Al activar `Apuntador`, el aside derecho permite elegir tamano de criatura.
- Con `Apuntador` activo, un click sobre el mapa dispara el circulo arcano centrado en la celda.
- El tamano del circulo respeta la categoria elegida: 1x1, 2x2, 3x3 o 4x4 cuadriculas.
- El circulo aparece con fade in, permanece brevemente visible y desaparece con fade out en aproximadamente 4 segundos.
- El circulo es mas grande que la celda y mantiene estetica pixel-art coherente con agua/fuego.
- La animacion no selecciona ni mueve elementos del mapa.
- Varias animaciones pueden coexistir temporalmente.
- Al terminar, la animacion se elimina y no queda acumulacion de objetos Pixi.
- `Escape` desactiva el modo apuntador.
- El apuntador no se guarda ni se carga en `.ttrpgscene`.
