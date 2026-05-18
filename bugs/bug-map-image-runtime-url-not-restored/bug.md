# Bug - Scene disappears after machine lock or sleep

## Resumen

Despues de cargar un mapa o una escena y trabajar sobre ella, si el computador se bloquea, entra en reposo o permanece bloqueado durante un tiempo, al volver a desbloquear la maquina la app puede aparecer como si acabara de abrirse desde cero.

El usuario pierde el contexto visual de trabajo: el mapa no aparece, la escena visible queda vacia o vuelve al estado inicial, y el canvas muestra el estado default/placeholder en lugar del contenido que estaba activo antes del bloqueo.

Este bug debe investigarse como un problema de recuperacion de estado del renderer despues de bloqueo/suspension del sistema, no como un bug general de `Cargar escena`.

## Estado

- **Estado:** Abierto — documentado para investigacion futura.
- **Prioridad:** Alta — puede simular perdida total de trabajo durante una sesion.
- **Area:** Electron renderer lifecycle, React state, PixiJS canvas/context recovery, mapa runtime, autosave/recovery.
- **Detectado durante:** Prueba manual dejando la app abierta, bloqueando la maquina y regresando despues de un tiempo.

## Comportamiento esperado

Al desbloquear el computador y volver a la app:

- La escena debe seguir visible.
- El mapa que estaba cargado debe seguir renderizado.
- Las figuras, luces, efectos, niebla, grilla y seleccion deben permanecer.
- La app no debe volver a la escena default.
- Si el renderer se recarga por Electron/Chromium, debe recuperar la escena activa de forma transparente.

## Comportamiento observado

Flujo reportado:

1. El usuario carga un mapa o una escena.
2. El usuario trabaja sobre el mapa y crea el contenido necesario.
3. El computador se bloquea o queda suspendido un tiempo.
4. El usuario desbloquea la maquina y vuelve a la app.
5. La app aparece vacia, como recien abierta.

Sintomas observados:

- El mapa no aparece.
- El canvas puede mostrar solo grilla/default/placeholder.
- El contexto visual de trabajo ya no esta presente.
- La experiencia se siente como si React/Electron hubiera reiniciado el renderer y reconstruido la escena desde `createDefaultScene()`.

## Impacto

Este bug es critico para una herramienta de mesa porque una sesion puede durar varias horas y es normal que la maquina se bloquee o duerma entre pausas.

Si al volver la app aparece limpia:

- el usuario puede creer que perdio el trabajo;
- puede tener que recargar mapa/escena manualmente;
- si habia cambios no guardados, pueden perderse;
- se rompe la confianza en usar la app durante una partida.

## Hipotesis iniciales

### Hipotesis 1 — El renderer se recarga/remonta despues del bloqueo

`App.tsx` inicializa el estado con:

```ts
useState<SceneDocument>(() => createDefaultScene())
```

Si Electron/Chromium recarga el renderer, React reconstruye la app desde cero. Sin un mecanismo de recuperacion de sesion, el estado en memoria se pierde.

### Hipotesis 2 — El contexto grafico de PixiJS se pierde

Durante bloqueo/suspension, el contexto WebGL/WebGPU o los recursos internos de PixiJS pueden invalidarse. Aunque React conserve parte del estado, las texturas del mapa pueden desaparecer o no volver a dibujarse.

En ese caso el documento de escena podria seguir existiendo, pero el canvas aparece vacio porque las texturas/runtime resources no se reconstruyen.

### Hipotesis 3 — El mapa tiene dos estados: documento y runtime URL

El documento guarda:

```ts
scene.map.imagePath
```

Pero el renderer necesita un estado runtime:

```ts
mapImageUrl
```

Si despues del bloqueo solo sobrevive o se recupera `scene.map.imagePath`, pero no `mapImageUrl`, `mapState` puede quedar incompleto y `MapViewport` recibe `map = null`.

### Hipotesis 4 — El recovery debe distinguir cierre voluntario vs recuperacion interna

No basta con guardar todo indefinidamente en `localStorage`, porque entonces al cerrar voluntariamente la app y abrirla de nuevo se carga el ultimo contexto sin que el usuario lo haya pedido.

La solucion futura debe recuperar despues de bloqueo/remount del renderer, pero no dejar persistida la ultima escena al abrir una nueva sesion desde cero.

## Intentos previos descartados

Se intento una correccion que agregaba:

- autosave en storage del renderer;
- recuperacion de `mapImageUrl`;
- API IPC para reconstruir URL `map-asset:`;
- refresh de PixiJS al volver de foco/visibilidad;
- cache-busting de texturas.

Ese enfoque fue revertido porque no resolvio completamente el problema y ademas introdujo regresiones en otros flujos, especialmente alrededor de carga de escena y estado persistido entre aperturas.

El bug debe retomarse desde una base limpia, con diagnostico incremental antes de implementar una solucion definitiva.

## Archivos relevantes

- `src/renderer/src/App.tsx`
  - Estado principal de escena.
  - Inicializacion con `createDefaultScene()`.
  - Estado runtime `mapImageUrl`.
  - Construccion de `mapState`.

- `src/renderer/src/components/MapViewport.tsx`
  - Ciclo de vida del viewport Pixi.
  - Creacion/destruccion de `PixiViewport`.

- `src/render/pixi/PixiViewport.ts`
  - Carga de mapa con `Assets.load`.
  - Sprites del mapa.
  - Contexto canvas/PixiJS.
  - Dibujo de placeholder.

- `src/main/index.ts`
  - Ventana Electron.
  - Registro del protocolo `map-asset:`.
  - Lifecycle de Electron.

- `src/infrastructure/file-system/electron-map-image-storage.ts`
  - Construccion de URL `map-asset:` al cargar mapa.

- `src/application/use-cases/load-scene.ts`
  - Carga de escenas guardadas y reconstruccion de mapa cuando aplica.

## Diagnostico recomendado antes de solucionar

Agregar trazas temporales o un modo debug para saber exactamente que se pierde al volver del bloqueo:

1. Si `App` se monto de nuevo.
2. Si `scene` volvio a `createDefaultScene()`.
3. Si `scene.map.imagePath` existe despues de desbloquear.
4. Si `mapImageUrl` existe despues de desbloquear.
5. Si `MapViewport` recibe `map` o `null`.
6. Si `PixiViewport.drawMapImage()`:
   - no se llama;
   - recibe `map = null`;
   - recibe URL invalida;
   - falla en `Assets.load`;
   - carga textura pero no dibuja sprite.
7. Si Electron emitio eventos de reload, crash, context lost/restored, focus o visibilitychange.

## Direccion recomendada para solucion futura

La solucion probablemente debe separar dos niveles de recuperacion:

### Recuperacion de documento

Mantener una copia temporal de la escena activa que sobreviva al remount del renderer durante la misma ventana/sesion.

Debe evitar cargar automaticamente el ultimo contexto despues de un cierre voluntario y nueva apertura de app.

Opciones a evaluar:

- `sessionStorage` si realmente sobrevive al tipo de remount observado.
- Storage controlado desde main asociado a la ventana.
- Autosave temporal en archivo/cache con limpieza explicita al cerrar ventana voluntariamente.

### Recuperacion de recursos Pixi

Reconstruir recursos runtime cuando el contexto grafico vuelve:

- recrear textura del mapa desde `scene.map.imagePath`;
- recrear sprites;
- redibujar grilla, oscuridad, fog, luces, efectos, figuras y seleccion;
- evitar depender de texturas cacheadas invalidas.

## Criterios de aceptacion futuros

- Cargar un mapa y bloquear/desbloquear la maquina mantiene el mapa visible.
- Cargar una escena y bloquear/desbloquear mantiene el mapa visible.
- Elementos creados antes del bloqueo siguen presentes.
- Si el renderer se recarga internamente, la escena activa se recupera.
- Si la app se cierra voluntariamente y se abre de nuevo, no debe cargar automaticamente el ultimo contexto salvo que exista una decision explicita de producto.
- La solucion no debe romper `Cargar mapa`.
- La solucion no debe romper `Cargar escena`.
- La solucion no debe introducir estado persistente inesperado entre sesiones.

## Pasos de reproduccion

1. Ejecutar:

```bash
pnpm dev
```

2. Cargar un mapa o una escena.
3. Crear algunos elementos sobre el mapa.
4. Bloquear la maquina o dejarla entrar en reposo.
5. Esperar un tiempo.
6. Desbloquear y volver a la app.
7. Observar si la app vuelve vacia/default o si conserva el contexto.

## Validacion esperada para un fix

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Ademas, la validacion principal debe ser manual:

- prueba con mapa cargado manualmente;
- prueba con escena cargada desde archivo;
- prueba tras bloqueo corto;
- prueba tras bloqueo/suspension mas largo;
- prueba cerrando voluntariamente y abriendo de nuevo para asegurar que no queda contexto viejo cargado por accidente.
