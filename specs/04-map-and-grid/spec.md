# Spec - Mapa y Grilla

## Grilla hexagonal - version 1.10.0

Estado: implementada y aceptada por el usuario el 2026-09-02 para cierre 1.10.0 y merge de `feature/hexagonal-grid` a main. Incluye borrado de areas por teclado y arbol (spec 22).

### Geometria y controles

- Selector segmentado `Cuadrada` / `Hexagonal` en Grilla, sin necesidad de activar calibracion. No quitar la opcion cuadrada ni cambiar el default de escenas nuevas/antiguas.
- Hexagonos regulares con vertice arriba, filas alternas desplazadas media celda y centro de referencia en (0,0) mundo.
- `cellSizeWorld` mide el ancho entre los lados verticales opuestos y la distancia entre centros vecinos. Radio = ancho / sqrt(3); alto = 2 * radio; paso entre filas = ancho * sqrt(3) / 2.
- Conservar grilla siempre extendida, opacidad, grosores 1/3, unidad, presets y calibracion. Cambiar layout no mueve mapa, camaras ni objetos existentes; los presets conservan layout.
- DM y Player View comparten layout/calibracion, aunque mantengan camaras independientes.

### Snap, medicion y pintado

- Cuando una herramienta usa snap general, ajustar su ancla al vertice superior izquierdo real del hexagono bajo el cursor, no a la esquina de su bounding box. Rectangulos ajustan su esquina superior izquierda; las herramientas de movimiento libre siguen libres.
- Lineas de medicion y puntos de Path/Camino se crean y editan en centros de hexagonos. Distancia = numero minimo de pasos entre celdas vecinas, multiplicado por ft/m por celda. Los seis vecinos cuestan un paso.
- Las reglas de diagonales cuadradas no aplican en hexagonal: deshabilitar ese selector y conservar su valor para volver a cuadrada.
- Cambiar grilla recalcula etiquetas sin reubicar puntos historicos; al editar cada punto se ajusta al centro vigente, igual que al recalibrar una escena cuadrada.
- Fuego pintado y areas de informacion ocupan hexagonos completos. Relleno, contorno, seleccion y mascaras deben coincidir con los seis lados. La niebla sigue siendo un pincel libre, no se discretiza.
- Cada celda pintada guarda su propia geometria. No convertir automaticamente cuadrados existentes al cambiar layout ni convertir hexagonos guardados al volver a cuadrada.

### Persistencia y rendimiento

- Persistir `grid.layout: square | hexagonal`, default `square`. Guardar `layout: hexagonal` en cada celda hexagonal junto a x/y/size; una celda sin layout significa cuadrada, independientemente de la grilla actual.
- x/y siguen siendo el origen del bounding box en mundo. Trasladar un area conserva layout y vertices relativos. Sin cambio incompatible de formato V1 ni guardado de objetos Pixi.
- Usar geometria pura compartida y `honeycomb-grid` para conversion punto/cubo y distancia. Referencia: [Honeycomb](https://abbekeultjes.nl/honeycomb/guide/point-to-hex.html).
- Dibujar una sola Graphics para la grilla, sin un objeto por hexagono y sin duplicar aristas compartidas. Cache de ventana visible con overscan.
- Limitar a 8192 celdas de dibujo (tres aristas propias por celda). Solo si se excede, duplicar el paso de la malla visual hasta entrar en presupuesto; es una guia hexagonal mas gruesa, no nuevas celdas logicas. Snap, pintura y medidas conservan la resolucion real.
- Cambiar solo layout invalida grilla y etiquetas/seleccion; no reconstruye texturas de niebla/oscuridad ni recarga tokens/atlas de efectos.

### Aceptacion

- Probar los seis vecinos, coordenadas negativas y el vertice superior izquierdo con snap repetido sin desplazamientos acumulados.
- Crear, mover y editar lineas/caminos; verificar ft/m y volver a cuadrada recuperando reglas anteriores.
- Pintar y mover fuego y terrenos/trampas; comprobar luz brillante en primera corona de seis vecinos, tenue en segunda y contornos sin aristas internas.
- Guardar/cargar y abrir Player View conserva grilla y geometria; escenas antiguas conservan cuadrados y la escena vacia sigue detectandose vacia.
- Pan/zoom amplio no acumula Graphics ni amplia mascaras. El cierre fue autorizado por el usuario; ver alcance de pruebas realizadas en el plan.

Este documento describe de forma unificada la funcionalidad de mapa y grilla, consolidando el alcance funcional vigente en el proyecto.

## Carga de Mapa y Calibracion de Grilla

### Objetivo

Permitir cargar una imagen de mapa, mostrarla en el lienzo, superponer una grilla cuadrada o hexagonal y calibrar el tamano fisico de las casillas para usar minis reales sobre la proyeccion.

### Alcance

- Cargar PNG, JPG/JPEG, WEBP y HEIC.
- Mostrar mapa en el lienzo.
- Elegir grilla cuadrada o hexagonal desde el sidebar.
- Ajustar opacidad de grilla.
- Activar un modo `Ajustar grilla` desde el sidebar derecho o con shortcut `Cmd+G` en macOS / `Ctrl+G` en Windows/Linux.
- Calibrar por arrastre solo cuando `Ajustar grilla` esta activo.
- Calibrar por valor numerico solo cuando `Ajustar grilla` esta activo.
- Ajustar la escala visual de la imagen del mapa con un control porcentual independiente de `camera.zoom`.
- Bloquear zoom/escala para proteger la calibracion.

### Flujo esperado

1. El usuario carga una imagen.
2. La app muestra el mapa centrado.
3. El usuario activa la grilla.
4. El usuario activa `Ajustar grilla` desde el sidebar o con `Cmd/Ctrl+G`.
5. Si el mapa no ocupa suficiente superficie proyectada, ajusta `Escala mapa` para agrandar/reducir la imagen sin usar zoom de camara.
6. El usuario arrastra un control de calibracion hasta que una casilla mida correctamente en la superficie proyectada.
7. Opcionalmente ajusta valores numericos mientras el modo esta activo.
8. El usuario desactiva `Ajustar grilla`.
9. El usuario bloquea la escala.
10. La sesion entra en modo de uso normal.

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
- El usuario puede cambiar `Escala mapa` en porcentaje cuando hay un mapa cargado.
- `Escala mapa` modifica `scene.map.scale`, no `camera.zoom`.
- `Escala mapa` permite resetear la imagen a 100%.
- El control visual de calibracion queda por encima de niebla/oscuridad y herramientas para poder usarse durante la sesion.
- Al bloquear escala, la rueda del mouse no rompe el tamano fisico de la grilla.
- La configuracion de mapa y grilla se puede guardar en el formato de sesion.

### Riesgos

- HEIC puede no estar soportado igual en todos los sistemas.
- Confundir zoom visual de camara con escala fisica calibrada.
- No dejar margen externo suficiente alrededor del mapa.

### Notas de implementacion

- Modelar por separado escala del mapa, escala de camara y tamano de celda.
- Normalizar `map.scale` a un rango seguro para evitar mapas invisibles o gigantes.
- El margen externo debe permitir centrar esquinas o zonas fuera de la imagen.
- La grilla cuadrada sigue siendo el valor inicial; la variante hexagonal se define en la extension anterior.

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

La escala visual de la imagen se almacena en `scene.map.scale` como factor decimal (`1` = 100%). Se normaliza a un rango seguro y se conserva al guardar/cargar.

Al cargar una imagen nueva, la posicion se resetea a `{ x: 0, y: 0 }` y la escala a `1`.

### Criterios de aceptacion

- El boton "Ajustar mapa" aparece en la seccion Grilla del sidebar derecho y tiene estado visual distinguible.
- Con el modo activo, arrastrar mueve la imagen del mapa.
- Con el modo inactivo, arrastrar panea la camara (comportamiento previo intacto).
- La grilla y el overlay se siguen visualmente mientras se arrastra.
- Al guardar y recargar la sesion, el mapa aparece en la misma posicion.
- Cargar un nuevo mapa resetea la posicion a cero.
- Cargar un nuevo mapa resetea la escala a 100%.

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

## Ajuste de Escala Visual del Mapa

### Objetivo

Permitir agrandar o reducir la imagen cargada en coordenadas de mundo sin cambiar el zoom de camara, para que el DM pueda ajustar la ocupacion del mapa sobre el canvas/proyeccion y lograr que las casillas lleguen a 2.5 cm / 1 pulgada en la mesa fisica.

### Alcance

- Control `Escala mapa` dentro de la seccion Grilla del sidebar derecho.
- Visible solo cuando hay un mapa cargado.
- Slider porcentual, input numerico y accion de reset a 100%.
- Rango inicial seguro de 25% a 400%.
- El cambio actualiza `scene.map.scale`.
- El cambio recalcula grilla, oscuridad, fog, darkvision y bounds dependientes del mapa.
- Player View recibe la misma escala mediante el snapshot de escena.

### Fuera de alcance

- Cambiar `camera.zoom`.
- Escalado no uniforme por eje.
- Correccion de perspectiva.
- Calibracion automatica por deteccion de grilla impresa en la imagen.

### Criterios de aceptacion

- El usuario puede agrandar/reducir el mapa cargado desde Grilla.
- El control no aparece sin mapa cargado.
- El mapa escala desde un ancla estable sin desplazar accidentalmente la camara.
- El zoom bloqueado no impide cambiar la escala visual del mapa.
- Guardar/cargar conserva la escala.
- La grilla sigue alineable luego de cambiar escala.

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

## Extension de la grilla al viewport

### Objetivo y comportamiento

- La grilla siempre cubre el viewport navegable, incluso fuera del mapa, siguiendo la camara de cada ventana.
- No ofrecer switch ni modo para limitarla al mapa. `Ajustar grilla` sigue controlando solo la calibracion; `Activar grilla` conserva la visibilidad global.
- No modificar `cellSizeWorld`, unidades, distancia por casilla, escala de imagen, posicion del mapa ni zoom. La alineacion permanece anclada al mismo origen mundial.
- No persistir una opcion de extension. Escenas antiguas, incluso con `grid.extendToViewport: false` de la prueba anterior, usan siempre grilla extendida e ignoran ese campo obsoleto.
- Compartir la calibracion con Player View, manteniendo sus camaras independientes y el mismo comportamiento extendido.

### Rendimiento y aceptacion

- Generar lineas solo para la region visible mas margen de cache (doble ancho/alto del viewport).
- Reutilizar geometria durante paneos dentro de ese margen y reemplazarla al salir, cambiar escala de dibujo o estilo.
- Presupuesto de 2048 lineas para grilla cuadrada; la variante hexagonal usa su presupuesto de celdas descrito arriba. En zoom-out extremo se reduce el detalle visual sin modificar la celda logica.
- No extender los bounds ni las RenderTextures de niebla/oscuridad. Solo la grilla cubre el viewport.
- Navegar o recibir configuracion identica no debe reconstruir efectos, tokens ni mascaras.
- Guardar/cargar y abrir Player View conservan el estado y tamano de celda. Una escena vacia antigua debe seguir detectandose como vacia.

## Grosor de lineas

- Agregar en Grilla un selector segmentado con `Delgadas` y `Gruesas (3x)`, junto al control de opacidad y siempre disponible sin activar calibracion.
- `Delgadas` mantiene el trazo actual: ancho base 1. `Gruesas (3x)` usa ancho 3, exactamente triple a igualdad de zoom/opacidad.
- El grosor sigue la misma transformacion de camara del trazo actual; no implementar compensacion de zoom independiente ni alterar la separacion entre lineas.
- Nuevas escenas y archivos antiguos sin el campo usan `Delgadas` por defecto. Persistir `grid.lineWidth` con valores permitidos 1 o 3.
- El cambio se refleja en DM y Player View mediante el estado compartido. Conservar controles de mostrar/ocultar, opacidad y calibracion, y la cobertura siempre extendida.
- No cambiar tamano de casillas, unidades, snap, mediciones, escala de imagen ni camara. Aplicar un preset tampoco debe resetear el grosor.
- Incluir grosor en la clave del cache visual. Cambiarlo invalida solo la geometria de grilla, libera el trazo anterior y no reconstruye luces, efectos, tokens o mascaras.
- Criterios: alternar entre ambos estilos, comprobar relacion 3:1, guardar/cargar con gruesas, abrir jugador y volver a delgadas sin alterar la escena ni acumular Graphics.

## Cierre 1.9.0

Los cambios de controles de efectos, arbol de objetos y/o grilla descritos en las extensiones de esta especificacion fueron aceptados por el usuario el 2026-09-02 para cierre en main. El plan registra la verificacion realizada; los pendientes historicos ajenos a estas extensiones no se consideran ejecutados por este cierre.
