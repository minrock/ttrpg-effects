# Spec 21 - D&D 5e Alternating Diagonals

## Objetivo

Agregar un nuevo modo de medición de diagonales llamado **"D&D 5e Alternating"** en el que la primera diagonal de un movimiento cuesta 5 ft (1 casilla) y la segunda cuesta 10 ft (2 casillas), alternando de forma continua a lo largo de todo el recorrido.

## Contexto

El modo actual `"dnd5e-default"` trata cada diagonal como 1 casilla (distancia Chebyshev). Esto refleja la regla básica de D&D 5e donde moverse en diagonal equivale exactamente a moverse en cardinal. Sin embargo, el DMG de D&D 5e incluye una regla variante más realista: la primera diagonal del turno cuesta 5 ft, la segunda 10 ft, la tercera 5 ft, y así sucesivamente. Esta regla es también la estándar en Pathfinder 1e y 2e.

La app ya tiene la estructura para soportar múltiples modos (`DiagonalMode` union, `measureCells`, selector en UI). Solo hay que añadir un caso nuevo.

## Alcance

- Nuevo valor `"dnd5e-alternating"` en el tipo `DiagonalMode`.
- Nueva función pura `measureCellsAlternating(dxCells, dyCells, diagonalsBefore)` que aplica la regla alternante dado un offset de diagonales ya contadas.
- Modificar `measurePathDistance` para que, cuando el modo es `"dnd5e-alternating"`, el contador de diagonales se acumule entre segmentos (no reinicie por tramo).
- Añadir `<option value="dnd5e-alternating">D&D 5e Alt.</option>` en el selector de la UI.
- Actualizar tests de `measurement.ts`.

## Fuera de alcance

- Cambiar los modos existentes (`dnd5e-default`, `manhattan`, `euclidean`).
- Persistir el contador de diagonales entre turnos o entre mediciones distintas (el contador es por trazo/recorrido continuo, no por combate).
- Soporte para movimiento diagonal en terreno difícil (eso es una regla separada).
- Cambios en cómo se dibuja o presenta la medición en el canvas.

## Regla matemática

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

## Implementación

### 1. `DiagonalMode` en `scene-document.ts`

```ts
export type DiagonalMode = "dnd5e-default" | "dnd5e-alternating" | "manhattan" | "euclidean";
```

### 2. `measureCells` / nueva función en `measurement.ts`

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

### 3. `measurePathDistance` en `measurement.ts`

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

### 4. UI en `App.tsx`

```tsx
<option value="dnd5e-alternating">D&D 5e Alt.</option>
```

Añadir después de la opción existente `"dnd5e-default"`.

## Criterios de aceptación

- Seleccionar "D&D 5e Alt." aplica la regla alternante a la medición de regla y de path.
- Un movimiento de 1 casilla diagonal mide 5 ft.
- Un movimiento de 2 casillas diagonales mide 15 ft (5 + 10).
- Un path con dos segmentos diagonales consecutivos de 1 casilla cada uno mide 15 ft (el contador no se reinicia entre segmentos).
- Los demás modos (`dnd5e-default`, `manhattan`, `euclidean`) no se ven afectados.
- `pnpm typecheck` sin errores.
- `pnpm test` pasa con nuevos casos de test para `"dnd5e-alternating"`.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/domain/sessions/scene-document.ts` | Añadir `"dnd5e-alternating"` al tipo `DiagonalMode` |
| `src/domain/measurement/measurement.ts` | Añadir `measureCellsAlternating`, caso en `measureCells`, lógica en `measurePathDistance` |
| `src/domain/measurement/measurement.test.ts` | Añadir tests para el nuevo modo |
| `src/renderer/src/App.tsx` | Añadir `<option>` en el selector de diagonal |
