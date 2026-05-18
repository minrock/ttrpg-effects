# Spec 05-adjust-map - Ajuste de Posicion del Mapa

## Objetivo

Permitir mover la imagen del mapa sobre los ejes X e Y dentro del lienzo cuando el modo de ajuste esta activo, para alinear manualmente el mapa con la grilla de casillas en caso de que la imagen tenga una grilla interna desplazada. Al desactivar el modo, la posicion queda bloqueada. La posicion del mapa se guarda en el archivo de sesion y se restaura al recargar.

## Alcance

- Boton de toggle "Ajustar mapa" en la barra de controles.
- Cuando el modo esta activo: arrastrar sobre la imagen mueve el mapa en X/Y.
- Cuando el modo esta inactivo: arrastrar funciona como paneo de camara normal.
- La posicion del mapa (offset X/Y en coordenadas mundo) se guarda en el archivo `.ttrpgscene`.
- Al cargar una sesion, el mapa se renderiza en la posicion guardada.
- La grilla y el overlay de oscuridad se actualizan en tiempo real al mover el mapa.

## Flujo esperado

1. El usuario carga un mapa con grilla interna.
2. Activa el modo "Ajustar mapa".
3. Arrastra la imagen hasta que su grilla interna coincide con la grilla del lienzo.
4. Desactiva el modo — la imagen queda fija en esa posicion.
5. Guarda la sesion.
6. Al recargar la sesion, el mapa aparece en la misma posicion ajustada.

## Comportamiento del modo activo

- El cursor cambia a indicador de movimiento sobre el lienzo.
- Cualquier arrastre con boton izquierdo mueve la imagen (no la camara).
- La grilla y el overlay se recalculan en tiempo real siguiendo al mapa.
- El boton muestra estado visual diferenciado (activo / inactivo).

## Comportamiento del modo inactivo

- El arrastre con boton izquierdo vuelve a panear la camara.
- La posicion del mapa queda congelada.
- No hay forma de mover el mapa accidentalmente.

## Persistencia

La posicion del mapa se almacena en `scene.map.position` como coordenadas mundo (`x`, `y`). Este campo ya existe en `SceneMap` y se serializa en el archivo `.ttrpgscene`. No se requiere migracion de version de schema.

Al cargar una imagen nueva, la posicion se resetea a `{ x: 0, y: 0 }`.

## Criterios de aceptacion

- El boton "Ajustar mapa" aparece en los controles y tiene estado visual distinguible.
- Con el modo activo, arrastrar mueve la imagen del mapa.
- Con el modo inactivo, arrastrar panea la camara (comportamiento previo intacto).
- La grilla y el overlay se siguen visualmente mientras se arrastra.
- Al guardar y recargar la sesion, el mapa aparece en la misma posicion.
- Cargar un nuevo mapa resetea la posicion a cero.

## Riesgos

- Confusion entre mover el mapa y panear la camara si el indicador visual no es claro.
- Al mover el mapa, la grilla se recalcula desde `getGridBounds()` — depende de que `mapSprite` este actualizado antes de redibujar. Requiere actualizar `sprite.position` antes de llamar a `drawGrid` y `drawDarknessLayer`.
- El modo de ajuste y el modo de calibracion de grilla (arrastre del handle) deben ser mutuamente excluyentes o compatibles de forma explicita.

## Notas de implementacion

- El modo de ajuste es un flag de estado en `PixiViewport` (`isMapAdjustMode: boolean`).
- El drag handler existente ya distingue entre `"pan"` y `"calibrate"`. Se agrega `"map-move"` como tercer modo.
- La actualizacion de posicion se reporta al renderer via callback `onMapPositionChange(x, y)` en cada frame de arrastre.
- En `App.tsx`, el callback actualiza `scene.map.position` via `setScene`.
- `MapViewport` recibe `isMapAdjustMode` como prop y llama `viewport.setMapAdjustMode(flag)`.
- No se requieren cambios en IPC, preload, ni infraestructura de archivos.
