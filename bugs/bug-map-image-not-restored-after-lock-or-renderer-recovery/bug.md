# Bug - Map image not restored after lock or renderer recovery

## Resumen

Despues de cargar un mapa o una escena y trabajar sobre ella, si el computador se bloquea/suspende durante un tiempo y luego se desbloquea, la app puede recuperar la escena en memoria pero no vuelve a mostrar la imagen del mapa. En su lugar se ve el placeholder rectangular de mapa vacio sobre la grilla.

El estado de escena no se pierde: rutas, grilla, zoom y elementos pueden seguir existiendo. El problema especifico es que la textura/runtime URL del mapa no se rehidrata correctamente para PixiJS despues del remount/recuperacion del renderer.

## Estado

- **Estado:** Cerrado — resuelto en cambios locales posteriores al bug de autosave/recovery.
- **Prioridad:** Alta — puede hacer creer que se perdio todo el mapa durante una sesion.
- **Area:** React state, autosave local, preload/main IPC, protocolo `map-asset:`, PixiJS texture loading.
- **Detectado durante:** Pruebas manuales de recuperacion despues de bloqueo/suspension del computador.

## Comportamiento esperado

Al desbloquear el computador o recuperar el renderer:

- La escena debe seguir cargada.
- La ruta del mapa debe seguir visible en la UI.
- La imagen real del mapa debe reaparecer automaticamente.
- Las capas de grilla, luces, figuras, niebla y seleccion deben quedar alineadas con el mapa.
- No debe mostrarse el placeholder rectangular salvo que no exista mapa o la ruta local ya no sea legible.

## Comportamiento observado

Despues de desbloquear:

- La UI muestra `Escena recuperada en memoria`.
- La UI muestra la ruta local del mapa, por ejemplo:

```text
/Users/minrock/Downloads/heart-of-havock-28x32-v0-kk27u54qb5ad1.webp
```

- El contador de elementos puede aparecer en `0 elementos` si solo se habia cargado mapa, o conservar otros datos si existian.
- El canvas muestra grilla y placeholder rectangular, no la imagen real.
- El boton `Cargar mapa` sigue disponible y la app no muestra crash.

Esto confirma que el documento de escena fue recuperado, pero el estado runtime necesario para renderizar la textura del mapa no.

## Causa raiz

La causa fue una combinacion de tres problemas relacionados:

### Causa 1 — La escena se recuperaba, pero `mapImageUrl` no era parte del documento

El `.ttrpgscene` y el modelo `SceneDocument` guardan `scene.map.imagePath`, pero no guardan `mapImageUrl`.

`mapImageUrl` es estado runtime del renderer. Es la URL que PixiJS necesita para cargar la textura usando el protocolo seguro local:

```text
map-asset:///Users/minrock/Downloads/map.webp
```

Cuando el renderer se reinicia/remonta despues del bloqueo, React puede recuperar `scene.map.imagePath`, pero si `mapImageUrl` queda `null`, `mapState` queda `null`:

```tsx
scene.map.imagePath !== null && mapImageUrl !== null ? mapState : null
```

Al recibir `map = null`, `PixiViewport` dibuja el placeholder.

### Causa 2 — El autosave inicial guardaba solo el documento de escena

La primera correccion agrego autosave en `localStorage`, pero guardaba solo:

```ts
serializeSceneDocument(scene)
```

Eso recuperaba rutas, grilla y elementos, pero no recuperaba el `mapImageUrl` runtime. Por eso la app podia decir `Escena recuperada en memoria` y aun asi no mostrar la imagen.

### Causa 3 — PixiJS podia reutilizar una textura cacheada perdida despues del lock

Aunque se reconstruyera la URL `map-asset:`, PixiJS `Assets.load(url)` puede reutilizar cache interna por URL. Despues de suspension, bloqueo o perdida/restauracion del contexto grafico, esa textura cacheada puede no ser valida aunque Pixi crea que ya la tiene.

En ese caso, recargar exactamente la misma URL no siempre fuerza una textura nueva.

## Solucion implementada

### Fix 1 — Autosave guarda `scene` + `mapImageUrl`

El autosave local ahora guarda un payload completo:

```ts
{
  scene,
  mapImageUrl
}
```

Archivo:

- `src/renderer/src/App.tsx`

Con esto, si el renderer remonta, React puede reconstruir `mapState` desde el primer render porque tiene tanto:

- `scene.map.imagePath`;
- `mapImageUrl`.

### Fix 2 — Compatibilidad con autosaves viejos

Para autosaves anteriores que solo tenian el documento de escena, se reconstruye una URL `map-asset:` desde `scene.map.imagePath`:

```ts
function createMapAssetUrlFromPath(imagePath: string): string {
  return `map-asset://${encodeURI(imagePath).replace(/#/g, "%23").replace(/\?/g, "%3F")}`;
}
```

Esto evita depender exclusivamente de un IPC async para tener URL de mapa durante el arranque del renderer.

### Fix 3 — API segura para reconstruir URL desde preload/main

Se agrego una funcion preload:

```ts
getMapImageUrl(imagePath)
```

que invoca:

```ts
ipcRenderer.invoke("map:get-image-url", imagePath)
```

Archivos:

- `src/preload/index.ts`
- `src/preload/ttrpg-api.d.ts`
- `src/main/ipc/map-ipc.ts`
- `src/infrastructure/file-system/electron-map-image-storage.ts`

Esta API valida que la ruta sea string, que exista y que tenga extension soportada antes de devolver la URL `map-asset:`.

### Fix 4 — Recarga de textura al volver de foco/visibilidad/contexto WebGL

`PixiViewport` ahora intenta recuperar texturas/capas cuando:

- la ventana vuelve a foco;
- `document.visibilityState` vuelve a `visible`;
- el canvas emite `webglcontextrestored`.

Tambien previene el comportamiento default en `webglcontextlost`.

Archivo:

- `src/render/pixi/PixiViewport.ts`

### Fix 5 — Cache-busting para PixiJS Assets

Cada carga real del mapa usa una URL unica para Pixi:

```ts
map-asset:///path/to/map.webp?pixiReload=...
```

Esto fuerza a `Assets.load()` a crear/cargar una textura nueva en vez de reutilizar una entrada de cache potencialmente invalida.

### Fix 6 — El protocolo `map-asset:` ignora query/hash

Como Pixi recibe una URL con query de cache-busting, el handler del protocolo en main limpia `search` y `hash` antes de convertir a `file:`:

```ts
protocol.handle("map-asset", (request) => {
  const url = new URL(request.url);
  url.protocol = "file:";
  url.search = "";
  url.hash = "";
  return net.fetch(url.toString());
});
```

Archivo:

- `src/main/index.ts`

## Archivos modificados

- `src/renderer/src/App.tsx`
  - Autosave local con `scene` + `mapImageUrl`.
  - Recuperacion de autosaves nuevos y legacy.
  - Reconstruccion directa de `map-asset:` desde path cuando hace falta.

- `src/renderer/src/components/MapViewport.tsx`
  - Llama `refreshMapImage()` al volver a foco o visibilidad.

- `src/render/pixi/PixiViewport.ts`
  - `refreshMapImage()`.
  - Recuperacion en `focus`, `visibilitychange`, `webglcontextlost`, `webglcontextrestored`.
  - Recarga de mapa si hay URL pero no hay sprite.
  - Cache-busting en `Assets.load()`.

- `src/main/index.ts`
  - Handler `map-asset:` limpia query/hash antes de `net.fetch(file:)`.

- `src/main/ipc/map-ipc.ts`
  - Canal `map:get-image-url`.

- `src/preload/index.ts`
  - API `getMapImageUrl`.

- `src/preload/ttrpg-api.d.ts`
  - Tipo de `getMapImageUrl`.

- `src/infrastructure/file-system/electron-map-image-storage.ts`
  - Helper `getMapImageUrl(imagePath)`.

## Como reproducir el bug original

1. Ejecutar:

```bash
pnpm dev
```

2. Cargar un mapa desde `Cargar mapa`.
3. Opcionalmente crear luces, figuras, niebla o cualquier elemento.
4. Bloquear/suspender el computador.
5. Esperar un tiempo suficiente para que Electron/Chromium/Pixi pueda perder contexto o remontar renderer.
6. Desbloquear.
7. Observar que:
   - la UI puede decir `Escena recuperada en memoria`;
   - la ruta local del mapa sigue visible;
   - pero el canvas muestra placeholder en vez de imagen real.

## Como validar la solucion

1. Reiniciar completamente `pnpm dev`, porque hay cambios en `main` y en el protocolo `map-asset:`.
2. Cargar un mapa.
3. Confirmar que el autosave nuevo se genera despues de cargar el mapa.
4. Bloquear/suspender el computador.
5. Desbloquear.
6. Confirmar que:
   - la escena se recupera;
   - la imagen del mapa reaparece;
   - la grilla queda encima y alineada;
   - no se muestra el placeholder rectangular.

## Comandos de validacion

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

## Notas importantes

- El cambio de protocolo `map-asset:` vive en el proceso `main`; hot reload del renderer no basta. Hay que cerrar y volver a levantar `pnpm dev`.
- El primer autosave antiguo puede no tener `mapImageUrl`; la solucion incluye fallback, pero para validar de forma limpia conviene cargar el mapa una vez despues de reiniciar.
- El autosave local es una proteccion contra remount/reload del renderer, no reemplaza `Guardar escena`.
