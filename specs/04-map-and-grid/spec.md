# Spec - Mapa y Grilla

Este documento describe de forma unificada la funcionalidad de mapa y grilla, consolidando el alcance funcional vigente en el proyecto.

## Carga de Mapa y Calibracion de Grilla

### Objetivo

Permitir cargar una imagen de mapa, mostrarla en el lienzo, superponer una grilla cuadrada y calibrar el tamano fisico de las casillas para usar minis reales sobre la proyeccion.

### Alcance

- Cargar PNG, JPG/JPEG, WEBP y HEIC.
- Mostrar mapa en el lienzo.
- Crear grilla cuadrada.
- Ajustar opacidad de grilla.
- Activar un modo `Ajustar grilla` desde el sidebar derecho o con shortcut `Cmd+G` en macOS / `Ctrl+G` en Windows/Linux.
- Calibrar por arrastre solo cuando `Ajustar grilla` esta activo.
- Calibrar por valor numerico solo cuando `Ajustar grilla` esta activo.
- Bloquear zoom/escala para proteger la calibracion.

### Flujo esperado

1. El usuario carga una imagen.
2. La app muestra el mapa centrado.
3. El usuario activa la grilla.
4. El usuario activa `Ajustar grilla` desde el sidebar o con `Cmd/Ctrl+G`.
5. El usuario arrastra un control de calibracion hasta que una casilla mida correctamente en la superficie proyectada.
6. Opcionalmente ajusta valores numericos mientras el modo esta activo.
7. El usuario desactiva `Ajustar grilla`.
8. El usuario bloquea la escala.
9. La sesion entra en modo de uso normal.

### Formatos de imagen

Formatos requeridos:

- PNG.
- JPG/JPEG.
- WEBP.
- HEIC.

HEIC puede requerir soporte adicional segun Electron/Chromium y sistema operativo. Si no es viable de forma nativa en todas las plataformas, debe documentarse una conversion interna o un mensaje claro.

### Presets de escala

Presets iniciales:

- 1 inch por casilla.
- 2.5 cm por casilla.
- 5 ft por casilla.
- 1.5 m por casilla.

### Criterios de aceptacion

- El usuario puede cargar una imagen valida.
- La grilla aparece sobre el mapa.
- El usuario puede cambiar opacidad de grilla.
- El usuario puede activar/desactivar `Ajustar grilla` desde el sidebar con un switch.
- El usuario puede activar/desactivar `Ajustar grilla` con `Cmd+G` en macOS y `Ctrl+G` en Windows/Linux.
- El usuario puede calibrar por arrastre solo cuando `Ajustar grilla` esta activo.
- El usuario puede calibrar numericamente solo cuando `Ajustar grilla` esta activo.
- El control visual de calibracion queda por encima de niebla/oscuridad y herramientas para poder usarse durante la sesion.
- Al bloquear escala, la rueda del mouse no rompe el tamano fisico de la grilla.
- La configuracion de mapa y grilla se puede guardar en el formato de sesion.

### Riesgos

- HEIC puede no estar soportado igual en todos los sistemas.
- Confundir zoom visual de camara con escala fisica calibrada.
- No dejar margen externo suficiente alrededor del mapa.

### Notas de implementacion

- Modelar por separado escala del mapa, escala de camara y tamano de celda.
- El margen externo debe permitir centrar esquinas o zonas fuera de la imagen.
- La grilla del MVP es cuadrada, sin hexagonos.

## Ajuste de Posicion del Mapa

### Objetivo

Permitir mover la imagen del mapa sobre los ejes X e Y dentro del lienzo cuando el modo de ajuste esta activo, para alinear manualmente el mapa con la grilla de casillas en caso de que la imagen tenga una grilla interna desplazada. Al desactivar el modo, la posicion queda bloqueada. La posicion del mapa se guarda en el archivo de sesion y se restaura al recargar.

### Alcance

- Boton de toggle "Ajustar mapa" dentro de la seccion Grilla del sidebar derecho.
- Cuando el modo esta activo: arrastrar sobre la imagen mueve el mapa en X/Y.
- Cuando el modo esta inactivo: arrastrar funciona como paneo de camara normal.
- La posicion del mapa (offset X/Y en coordenadas mundo) se guarda en el archivo `.ttrpgscene`.
- Al cargar una sesion, el mapa se renderiza en la posicion guardada.
- La grilla y el overlay de oscuridad se actualizan en tiempo real al mover el mapa.

### Flujo esperado

1. El usuario carga un mapa con grilla interna.
2. Activa el modo "Ajustar mapa".
3. Arrastra la imagen hasta que su grilla interna coincide con la grilla del lienzo.
4. Desactiva el modo — la imagen queda fija en esa posicion.
5. Guarda la sesion.
6. Al recargar la sesion, el mapa aparece en la misma posicion ajustada.

### Comportamiento del modo activo

- El cursor cambia a indicador de movimiento sobre el lienzo.
- Cualquier arrastre con boton izquierdo mueve la imagen (no la camara).
- La grilla y el overlay se recalculan en tiempo real siguiendo al mapa.
- El boton en la seccion Grilla muestra estado visual diferenciado (activo / inactivo).

### Comportamiento del modo inactivo

- El arrastre con boton izquierdo vuelve a panear la camara.
- La posicion del mapa queda congelada.
- No hay forma de mover el mapa accidentalmente.

### Persistencia

La posicion del mapa se almacena en `scene.map.position` como coordenadas mundo (`x`, `y`). Este campo ya existe en `SceneMap` y se serializa en el archivo `.ttrpgscene`. No se requiere migracion de version de schema.

Al cargar una imagen nueva, la posicion se resetea a `{ x: 0, y: 0 }`.

### Criterios de aceptacion

- El boton "Ajustar mapa" aparece en la seccion Grilla del sidebar derecho y tiene estado visual distinguible.
- Con el modo activo, arrastrar mueve la imagen del mapa.
- Con el modo inactivo, arrastrar panea la camara (comportamiento previo intacto).
- La grilla y el overlay se siguen visualmente mientras se arrastra.
- Al guardar y recargar la sesion, el mapa aparece en la misma posicion.
- Cargar un nuevo mapa resetea la posicion a cero.

### Riesgos

- Confusion entre mover el mapa y panear la camara si el indicador visual no es claro.
- Al mover el mapa, la grilla se recalcula desde `getGridBounds()` — depende de que `mapSprite` este actualizado antes de redibujar. Requiere actualizar `sprite.position` antes de llamar a `drawGrid` y `drawDarknessLayer`.
- El modo de ajuste y el modo de calibracion de grilla (arrastre del handle) deben ser mutuamente excluyentes o compatibles de forma explicita.

### Notas de implementacion

- El modo de ajuste es un flag de estado en `PixiViewport` (`isMapAdjustMode: boolean`).
- El drag handler existente ya distingue entre `"pan"` y `"calibrate"`. Se agrega `"map-move"` como tercer modo.
- La actualizacion de posicion se reporta al renderer via callback `onMapPositionChange(x, y)` en cada frame de arrastre.
- En `App.tsx`, el callback actualiza `scene.map.position` via `setScene`.
- `MapViewport` recibe `isMapAdjustMode` como prop y llama `viewport.setMapAdjustMode(flag)`.
- No se requieren cambios en IPC, preload, ni infraestructura de archivos.

## D&D 5e Alternating Diagonals

### Objetivo

Agregar un nuevo modo de medición de diagonales llamado **"D&D 5e Alternating"** en el que la primera diagonal de un movimiento cuesta 5 ft (1 casilla) y la segunda cuesta 10 ft (2 casillas), alternando de forma continua a lo largo de todo el recorrido.

### Contexto

El modo actual `"dnd5e-default"` trata cada diagonal como 1 casilla (distancia Chebyshev). Esto refleja la regla básica de D&D 5e donde moverse en diagonal equivale exactamente a moverse en cardinal. Sin embargo, el DMG de D&D 5e incluye una regla variante más realista: la primera diagonal del turno cuesta 5 ft, la segunda 10 ft, la tercera 5 ft, y así sucesivamente. Esta regla es también la estándar en Pathfinder 1e y 2e.

La app ya tiene la estructura para soportar múltiples modos (`DiagonalMode` union, `measureCells`, selector en UI). Solo hay que añadir un caso nuevo.

### Alcance

- Nuevo valor `"dnd5e-alternating"` en el tipo `DiagonalMode`.
- Nueva función pura `measureCellsAlternating(dxCells, dyCells, diagonalsBefore)` que aplica la regla alternante dado un offset de diagonales ya contadas.
- Modificar `measurePathDistance` para que, cuando el modo es `"dnd5e-alternating"`, el contador de diagonales se acumule entre segmentos (no reinicie por tramo).
- Añadir `<option value="dnd5e-alternating">D&D 5e Alt.</option>` en el selector de la UI.
- Actualizar tests de `measurement.ts`.

### Fuera de alcance

- Cambiar los modos existentes (`dnd5e-default`, `manhattan`, `euclidean`).
- Persistir el contador de diagonales entre turnos o entre mediciones distintas (el contador es por trazo/recorrido continuo, no por combate).
- Soporte para movimiento diagonal en terreno difícil (eso es una regla separada).
- Cambios en cómo se dibuja o presenta la medición en el canvas.

### Regla matemática

Para un segmento punto A → punto B:
- `D = min(|dxCells|, |dyCells|)` — número de pasos diagonales del segmento.
- `S = max(|dxCells|, |dyCells|) - D` — pasos cardinales del segmento.
- El coste de los pasos cardinales es siempre `S` casillas.
- El coste de los `D` pasos diagonales depende de cuántas diagonales ya se hayan contado antes (`diagonalsBefore`):
  - Las diagonales de índice impar (1ª, 3ª, 5ª...) cuestan 1 casilla.
  - Las diagonales de índice par (2ª, 4ª, 6ª...) cuestan 2 casillas.
  - Fórmula: `diagonalCost = D + floor((D + diagonalsBefore) / 2) - floor(diagonalsBefore / 2)`

**Verificación de la fórmula** (sin diagonales previas, `diagonalsBefore = 0`):

| D | Coste diagonales | Total (S=0) |
|---|---|---|
| 1 | 1 + floor(1/2) − 0 = 1 | 1 casilla (5 ft) |
| 2 | 2 + floor(2/2) − 0 = 3 | 3 casillas (15 ft) |
| 3 | 3 + floor(3/2) − 0 = 4 | 4 casillas (20 ft) |
| 4 | 4 + floor(4/2) − 0 = 6 | 6 casillas (30 ft) |

**Verificación en path multi-segmento** (dos segmentos, cada uno con 1 diagonal):

- Segmento 1: `D=1, diagonalsBefore=0` → coste = 1 casilla (5 ft), diagonales acumuladas = 1
- Segmento 2: `D=1, diagonalsBefore=1` → coste = 1 + floor(2/2) − floor(1/2) = 1 + 1 − 0 = 2 casillas (10 ft)
- Total path: 3 casillas (15 ft) ✓

### Implementación

#### 1. `DiagonalMode` en `scene-document.ts`

```ts
export type DiagonalMode = "dnd5e-default" | "dnd5e-alternating" | "manhattan" | "euclidean";
```

#### 2. `measureCells` / nueva función en `measurement.ts`

Añadir función pura:

```ts
export function measureCellsAlternating(
  dxCells: number,
  dyCells: number,
  diagonalsBefore: number
): { cells: number; diagonals: number } {
  const D = Math.min(dxCells, dyCells);
  const S = Math.max(dxCells, dyCells) - D;
  const diagonalCost = D + Math.floor((D + diagonalsBefore) / 2) - Math.floor(diagonalsBefore / 2);
  return { cells: S + diagonalCost, diagonals: D };
}
```

Añadir caso en `measureCells`:

```ts
case "dnd5e-alternating":
  return measureCellsAlternating(dxCells, dyCells, 0).cells;
```

(El caso de path multi-segmento se maneja en `measurePathDistance`.)

#### 3. `measurePathDistance` en `measurement.ts`

Cuando `diagonalMode === "dnd5e-alternating"`, acumular el contador:

```ts
if (settings.diagonalMode === "dnd5e-alternating") {
  let diagonalsBefore = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = Math.abs(points[i].x - points[i-1].x) / cellSizeWorld;
    const dy = Math.abs(points[i].y - points[i-1].y) / cellSizeWorld;
    const result = measureCellsAlternating(dx, dy, diagonalsBefore);
    cells += result.cells;
    diagonalsBefore += result.diagonals;
  }
} else {
  // existing loop
}
```

#### 4. UI en `App.tsx`

```tsx
<option value="dnd5e-alternating">D&D 5e Alt.</option>
```

Añadir después de la opción existente `"dnd5e-default"`.

### Criterios de aceptación

- Seleccionar "D&D 5e Alt." aplica la regla alternante a la medición de regla y de path.
- Un movimiento de 1 casilla diagonal mide 5 ft.
- Un movimiento de 2 casillas diagonales mide 15 ft (5 + 10).
- Un path con dos segmentos diagonales consecutivos de 1 casilla cada uno mide 15 ft (el contador no se reinicia entre segmentos).
- Los demás modos (`dnd5e-default`, `manhattan`, `euclidean`) no se ven afectados.
- `pnpm typecheck` sin errores.
- `pnpm test` pasa con nuevos casos de test para `"dnd5e-alternating"`.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/domain/sessions/scene-document.ts` | Añadir `"dnd5e-alternating"` al tipo `DiagonalMode` |
| `src/domain/measurement/measurement.ts` | Añadir `measureCellsAlternating`, caso en `measureCells`, lógica en `measurePathDistance` |
| `src/domain/measurement/measurement.test.ts` | Añadir tests para el nuevo modo |
| `src/renderer/src/App.tsx` | Añadir `<option>` en el selector de diagonal |
