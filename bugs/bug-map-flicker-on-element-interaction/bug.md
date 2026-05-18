# Bug - Map flicker on element interaction

## Resumen

El mapa parpadea visualmente al realizar interacciones comunes: abrir menu contextual con click derecho, agregar un elemento, mover un elemento, o girar una luz. El parpadeo es un destello negro (el mapa desaparece uno o varios frames y vuelve a aparecer).

## Estado

- **Estado:** Cerrado — resuelto en `main` (commit `697c7f5`).
- **Prioridad:** Alta — afecta toda interaccion con la escena.
- **Area:** React state, `PixiViewport.setMap()`, `drawMapImage()`, `getGridBounds()`.
- **Detectado durante:** Sesion de prueba manual posterior a la correccion del bug de mascara de oscuridad.

## Comportamiento esperado

El mapa debe permanecer visible y estable en todo momento. Solo debe recargarse la textura cuando se carga una imagen de mapa nueva o diferente.

## Comportamiento actual

El mapa parpadea (destello negro de varios frames) cada vez que:

- Se hace click derecho (abre menu contextual).
- Se selecciona un elemento.
- Se agrega un elemento desde el menu contextual.
- Se mueve un elemento o una luz.
- Se gira una luz conica.
- Se cambia cualquier propiedad en el panel lateral (color, opacidad, intensidad, etc.).

## Causa raiz

### Causa 1 — `mapState` sin memoizar (PRIMARY)

En `src/renderer/src/App.tsx`, `mapState` se construia como un objeto literal inline en el cuerpo del componente:

```tsx
const mapState: MapImageState | null =
    scene.map.imagePath !== null && mapImageUrl !== null
      ? {
          imagePath: scene.map.imagePath,
          imageUrl: mapImageUrl,
          position: scene.map.position,
          scale: scene.map.scale
        }
      : null;
```

Este patron crea una **nueva referencia de objeto en cada render de `App`**. Como `App` se re-renderiza ante cualquier cambio de estado (seleccion, interaccion, escena), `mapState` siempre era un objeto nuevo aunque los datos no hubieran cambiado.

El `useEffect` en `MapViewport.tsx` detecta el cambio de referencia y llama `setMap()`:

```tsx
useEffect(() => {
    viewportRef.current?.setMap(map);
}, [map]);
```

Y `setMap()` llamaba `drawMapImage()` incondicionalmente:

```ts
setMap(map: MapImageState | null): void {
    this.map = map;
    void this.drawMapImage();  // siempre
    this.drawGrid();
}
```

### Causa 2 — `drawMapImage()` hace unload+reload aunque la URL no cambie

`drawMapImage()` siempre ejecutaba la secuencia completa:

```ts
layer.removeChildren();       // mapa desaparece inmediatamente
this.mapSprite = null;
await Assets.unload(url);     // async — mapa sigue ausente
const texture = await Assets.load(url);  // recarga desde disco/cache
layer.addChild(sprite);       // mapa vuelve a aparecer
```

Entre `removeChildren()` y el `addChild()` del sprite recargado pasaban varios frames, produciendo el parpadeo.

### Causa 3 — `getGridBounds()` usaba la posicion del modelo de dominio

Durante el arrastre del mapa (`map-move`), `handlePointerMove` mueve `this.mapSprite.position` directamente y luego emite `onMapPositionChange`. React procesa esa actualizacion de forma asincrona, por lo que `this.map?.position` (el modelo de dominio) quedaba desactualizado hasta el proximo ciclo de estado.

`drawDarknessLayer()` llamada desde el mismo `handlePointerMove` usaba `getGridBounds()`, que leia la posicion del dominio:

```ts
const x = this.map?.position.x ?? 0;  // posicion vieja
const y = this.map?.position.y ?? 0;
```

La textura de oscuridad se posicionaba con coordenadas incorrectas durante el arrastre, desalineandose visualmente respecto al mapa.

## Solucion implementada

### Fix 1 — Memoizar `mapState` con `useMemo` (`App.tsx`)

```tsx
const mapState = useMemo<MapImageState | null>(
    () =>
      scene.map.imagePath !== null && mapImageUrl !== null
        ? {
            imagePath: scene.map.imagePath,
            imageUrl: mapImageUrl,
            position: scene.map.position,
            scale: scene.map.scale
          }
        : null,
    [scene.map.imagePath, scene.map.position, scene.map.scale, mapImageUrl]
);
```

`mapState` solo genera una nueva referencia cuando alguna de sus dependencias cambia realmente. Los re-renders por seleccion, interaccion o propiedades de otros elementos ya no propagan un nuevo `mapState` al viewport.

### Fix 2 — `setMap()` solo llama `drawMapImage()` si la URL cambio (`PixiViewport.ts`)

```ts
setMap(map: MapImageState | null): void {
    const prevUrl = this.map?.imageUrl ?? null;
    this.map = map;

    if (map?.imageUrl !== prevUrl) {
        void this.drawMapImage();  // carga real solo cuando cambia la imagen
    } else {
        if (this.mapSprite !== null && map !== null) {
            this.mapSprite.position.set(map.position.x, map.position.y);
            this.mapSprite.scale.set(map.scale);
        }
        this.drawDarknessLayer();
    }

    this.drawGrid();
}
```

Cuando solo cambia posicion o escala, el sprite se actualiza directamente en memoria sin destruir ni recargar la textura.

### Fix 3 — `getGridBounds()` lee la posicion del sprite (`PixiViewport.ts`)

```ts
// Antes
const x = this.map?.position.x ?? 0;
const y = this.map?.position.y ?? 0;

// Despues
const x = this.mapSprite.position.x;
const y = this.mapSprite.position.y;
```

La oscuridad ahora siempre usa la posicion visual actual del sprite, que es la fuente de verdad durante el arrastre.

## Archivos modificados

- `src/renderer/src/App.tsx` — `useMemo` para `mapState`.
- `src/render/pixi/PixiViewport.ts` — `setMap()` condicional y `getGridBounds()` con posicion del sprite.

## Comandos de validacion

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

La verificacion visual requiere prueba manual: cargar mapa, crear elementos, moverlos, girar luces y confirmar que el mapa no parpadea en ninguna de esas interacciones.
