# Plan de implementación técnica - 21 D&D 5e Alternating Diagonals

## 1. Resumen

- **Spec fuente:** `./specs/21-dnd5e-diagonals/21-dnd5e-diagonals.md`
- **Objetivo:** Añadir el modo `"dnd5e-alternating"` donde la 1ª diagonal cuesta 5 ft, la 2ª 10 ft, alternando a lo largo del recorrido completo.
- **Estado:** Pendiente

## 2. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/domain/sessions/scene-document.ts` | Añadir `"dnd5e-alternating"` al tipo `DiagonalMode` |
| `src/domain/sessions/scene-schema.ts` | Añadir `"dnd5e-alternating"` al `z.enum` del campo `diagonalMode` |
| `src/domain/measurement/measurement.ts` | Nueva función `measureCellsAlternating`; caso en `measureCells`; rama en `measurePathDistance` |
| `src/domain/measurement/measurement.test.ts` | Tests para `measureCells`, `measureDistance` y `measurePathDistance` con el nuevo modo |
| `src/renderer/src/App.tsx` | Añadir `<option>` en el `<select>` de diagonal |

## 3. Cambios detallados

### 3a. `scene-document.ts` — tipo DiagonalMode

**Línea 4**, añadir valor al union:

```ts
export type DiagonalMode = "dnd5e-default" | "dnd5e-alternating" | "manhattan" | "euclidean";
```

---

### 3b. `scene-schema.ts` — validación Zod

**Línea 176**, ampliar el enum:

```ts
diagonalMode: z.enum(["dnd5e-default", "dnd5e-alternating", "manhattan", "euclidean"]),
```

---

### 3c. `measurement.ts` — lógica de medición

**Paso 1 — nueva función pura `measureCellsAlternating`**

Añadir antes de `measureCells` (~línea 82):

```ts
export function measureCellsAlternating(
  dxCells: number,
  dyCells: number,
  diagonalsBefore: number
): { cells: number; diagonals: number } {
  const D = Math.min(dxCells, dyCells);
  const S = Math.max(dxCells, dyCells) - D;
  const diagonalCost =
    D + Math.floor((D + diagonalsBefore) / 2) - Math.floor(diagonalsBefore / 2);
  return { cells: S + diagonalCost, diagonals: D };
}
```

La función es pura y recibe cuántas diagonales ya se contaron antes (`diagonalsBefore`), lo que permite acumular el contador entre segmentos de un path.

**Paso 2 — caso en `measureCells`**

En el `switch` (~línea 87), añadir después del caso `"dnd5e-default"`:

```ts
case "dnd5e-alternating":
  return measureCellsAlternating(dxCells, dyCells, 0).cells;
```

Así `measureDistance` (regla simple) funciona correctamente: inicia el contador en 0.

**Paso 3 — rama en `measurePathDistance`**

Reemplazar el cuerpo del loop en `measurePathDistance` (~línea 56) para bifurcar según el modo:

```ts
let cells = 0;

if (settings.diagonalMode === "dnd5e-alternating") {
  let diagonalsBefore = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined) continue;
    const dxCells = Math.abs(to.x - from.x) / settings.grid.cellSizeWorld;
    const dyCells = Math.abs(to.y - from.y) / settings.grid.cellSizeWorld;
    const result = measureCellsAlternating(dxCells, dyCells, diagonalsBefore);
    cells += result.cells;
    diagonalsBefore += result.diagonals;
  }
} else {
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from === undefined || to === undefined) continue;
    cells += measureDistance(from, to, settings).cells;
  }
}
```

---

### 3d. `measurement.test.ts` — tests nuevos

Añadir en el bloque `describe("measurement")`:

```ts
describe("dnd5e-alternating diagonal mode", () => {
  it("1 diagonal sola cuesta 1 casilla", () => {
    expect(measureCells(0, 1, "dnd5e-alternating")).toBe(1);
  });

  it("2 diagonales cuestan 3 casillas (5+10 ft)", () => {
    expect(measureCells(0, 2, "dnd5e-alternating")).toBe(3);
  });

  it("3 diagonales cuestan 4 casillas (5+10+5 ft)", () => {
    expect(measureCells(0, 3, "dnd5e-alternating")).toBe(4);
  });

  it("4 diagonales cuestan 6 casillas (5+10+5+10 ft)", () => {
    expect(measureCells(0, 4, "dnd5e-alternating")).toBe(6);
  });

  it("measureDistance 1 diagonal → 5 ft", () => {
    expect(
      measureDistance({ x: 0, y: 0 }, { x: 100, y: 100 }, { grid, diagonalMode: "dnd5e-alternating" })
    ).toMatchObject({ cells: 1, value: 5, label: "5 ft" });
  });

  it("measureDistance 2 diagonales → 15 ft", () => {
    expect(
      measureDistance({ x: 0, y: 0 }, { x: 200, y: 200 }, { grid, diagonalMode: "dnd5e-alternating" })
    ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
  });

  it("path multi-segmento acumula el contador de diagonales entre tramos", () => {
    // Segmento 1: 1 diagonal → 1 casilla (diag #1 = 5 ft)
    // Segmento 2: 1 diagonal → 2 casillas (diag #2 = 10 ft)
    // Total: 3 casillas → 15 ft
    expect(
      measurePathDistance(
        [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 200 }],
        { grid, diagonalMode: "dnd5e-alternating" }
      )
    ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
  });

  it("path con cardinales no afecta el contador de diagonales", () => {
    // Segmento 1: 2 cardinales → 2 casillas
    // Segmento 2: 1 diagonal → 1 casilla (sigue siendo diag #1)
    // Total: 3 casillas → 15 ft
    expect(
      measurePathDistance(
        [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 100 }],
        { grid, diagonalMode: "dnd5e-alternating" }
      )
    ).toMatchObject({ cells: 3, value: 15, label: "15 ft" });
  });

  it("measureCellsAlternating devuelve el número de diagonales del segmento", () => {
    expect(measureCellsAlternating(2, 3, 0)).toEqual({ cells: 4, diagonals: 2 });
    expect(measureCellsAlternating(2, 3, 2)).toEqual({ cells: 5, diagonals: 2 });
  });
});
```

---

### 3e. `App.tsx` — selector UI

Línea ~1757, después de `<option value="dnd5e-default">D&D 5e</option>`:

```tsx
<option value="dnd5e-alternating">D&D 5e Alt.</option>
```

---

## 4. Orden de trabajo

1. `scene-document.ts` — ampliar `DiagonalMode`.
2. `scene-schema.ts` — ampliar `z.enum`.
3. `measurement.ts` — `measureCellsAlternating`, caso en `measureCells`, rama en `measurePathDistance`.
4. `measurement.test.ts` — añadir tests.
5. `App.tsx` — añadir `<option>`.
6. `pnpm typecheck && pnpm test`.

## 5. Verificación

- `pnpm typecheck` — sin errores.
- `pnpm test` — todos los tests pasan incluyendo los nuevos.
- Manual: crear un cone/circle/path; cambiar a "D&D 5e Alt."; verificar que el label de distancia cambia al trazar diagonales.

## 6. Checklist

- [x] `DiagonalMode` actualizado en `scene-document.ts`.
- [x] `z.enum` actualizado en `scene-schema.ts`.
- [x] `measureCellsAlternating` implementada y exportada.
- [x] Caso `"dnd5e-alternating"` en `measureCells`.
- [x] Rama de path multi-segmento en `measurePathDistance`.
- [x] Tests nuevos en `measurement.test.ts`.
- [x] `<option>` añadida en `App.tsx`.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [ ] Smoke test manual.
