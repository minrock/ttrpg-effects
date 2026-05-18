# Bug - Mask lights to see through darkness overlay

## Resumen

Las luces puntuales y conicas se dibujan visualmente sobre el mapa, pero no revelan el mapa de forma clara cuando la capa global de oscuridad tiene opacidad alta o total.

El comportamiento esperado es que la oscuridad oculte todo el mapa y que cada luz actue como una ventana/mascara: dentro del circulo o cono debe verse el mapa real y claro; fuera de la luz debe permanecer oscuro o negro.

## Estado

- **Estado:** Cerrado — resuelto en rama `fix/light-mask-reveal`.
- **Prioridad:** Alta para la experiencia visual de luces.
- **Area:** PixiJS render, capas `map`, `darkness`, `lights`, mascaras.
- **Detectado durante:** Spec 06 - Iluminacion, Oscuridad y Fuego Animado.

## Solucion implementada

El enfoque de stencil mask (`setMask` / `container.mask`) fue descartado porque en PixiJS v8 `StencilMaskPipe.pop` llama a `batcher.break`, que itera todos los batches acumulados incluyendo Graphics de capas previas con `texture = null` (rellenos solidos sin textura), causando crash en `getAdjustedBlendModeBlend`.

**Solucion final:** `RenderTexture` + `blendMode = "erase"` en dos pasadas:
1. Se renderiza el rectangulo de oscuridad en una `RenderTexture` (`clear: true`).
2. Se renderizan las formas de luz (circulos/conos) con `blendMode = "erase"` sobre la misma textura (`clear: false`), perforando el canal alpha donde hay luz.
3. El resultado se muestra como un `Sprite` normal en world space.

Esto elimina todo uso de stencil/mask, el mapa base queda en `alpha = 1` siempre, y la oscuridad compuesta revela el mapa solo en las zonas iluminadas.

## Comportamiento esperado

Con `Oscuridad` activa y `Overlay` al maximo:

- El mapa base debe desaparecer fuera de las luces.
- La luz puntual debe revelar el mapa dentro de un circulo.
- La luz conica debe revelar el mapa dentro de un cono de 60 grados.
- Los bordes/halos de luz pueden dibujarse encima, pero no deben reemplazar ni tapar el mapa revelado.
- El resultado visual esperado es similar a una mascara de vision: negro afuera, mapa visible adentro.

Referencia visual entregada por el usuario:

- Afuera de la luz: pantalla negra.
- Dentro de la luz circular: mapa claro, con grilla y detalles visibles.
- Un aro de seleccion puede estar encima, pero el contenido principal dentro de la luz es el mapa.

## Comportamiento actual

Con `Oscuridad` activa y `Overlay` alto:

- El mapa se oscurece correctamente.
- Las geometrias de luz se dibujan como circulos/conos semitransparentes.
- No aparece una region clara donde se vea el mapa real dentro del circulo/cono.
- En algunos intentos el mapa base volvio a verse, pero no como mascara clara dentro de la luz.
- En el estado final observado, la pantalla queda casi negra y solo se ve una mancha circular gris; el mapa no se ve dentro de la luz.

## Evidencia observada

### Captura 1

El usuario cargo un mapa y creo luces. Al subir `Overlay`, el mapa se oscurece completo. Se ven las figuras de luz, pero dentro del circulo/cono el mapa no se revela claramente. La luz parece una capa translucida encima de la oscuridad, no una ventana hacia el mapa.

Detalles visibles:

- UI muestra `Mapa renderizado (1690 x 2049)`.
- Hay luces creadas y seleccionadas.
- El mapa sigue oscuro aun dentro de las luces.

### Captura 2

El usuario dibujo una referencia esperada: afuera todo negro, adentro de una luz circular se ve el mapa claramente. Esta imagen aclara que la luz debe funcionar como mascara/reveal real, no como overlay de color.

### Captura 3

Despues de permitir `data:` en `connect-src`, el mapa volvio a renderizar, pero al poner oscuridad alta la mascara sigue sin revelar el mapa. Se ve una forma circular gris sobre fondo negro, sin textura del mapa dentro.

## Contexto tecnico actual

Capas actuales declaradas en `src/domain/map/render-layers.ts`:

```text
background
map
grid
darkness
lights
effects
shapesAndMeasurements
selection
```

Archivos relevantes:

- `src/render/pixi/PixiViewport.ts`
- `src/domain/map/render-layers.ts`
- `src/renderer/index.html`
- `src/infrastructure/file-system/electron-map-image-storage.ts`
- `src/infrastructure/file-system/electron-scene-file-storage.ts`

El mapa se carga como textura Pixi en `PixiViewport.drawMapImage()` con:

```ts
const texture = await Assets.load(this.map.imageUrl);
const sprite = new Sprite(texture);
```

El protocolo de imagen local esperado es `map-asset://`, registrado en main y usado para evitar `file://` y payloads `data:`.

## Intentos realizados

### 1. Borrar/perforar la oscuridad con `blendMode = "erase"`

Se intento dibujar geometrias de luz en la capa `darkness` usando:

```ts
graphic.blendMode = "erase";
```

Resultado:

- La geometria de la luz se dibuja o modifica visualmente algo del overlay.
- No produce el resultado esperado de mapa claro dentro de la luz.
- Puede depender de renderer, orden de capas, soporte WebGL/WebGPU o de como Pixi v8 aplica blend modes en `Graphics`.

### 2. Copiar el mapa encima de la oscuridad y enmascararlo por luz

Se intento crear un segundo `Sprite` con la misma textura del mapa, ponerlo en la capa `lights` y aplicarle una mascara circular/conica:

```ts
const revealedMap = new Sprite(sourceMap.texture);
revealedMap.anchor.copyFrom(sourceMap.anchor);
revealedMap.position.copyFrom(sourceMap.position);
revealedMap.scale.copyFrom(sourceMap.scale);
revealedMap.rotation = sourceMap.rotation;
revealedMap.alpha = 1;
layer.addChild(revealedMap);
layer.addChild(mask);
revealedMap.setMask({ mask, inverse: false });
```

Resultado:

- La geometria de luz sigue visible.
- El mapa no se ve claramente dentro de la mascara.
- Es posible que la mascara no este aplicandose como se espera, que el orden de display tree no sea el correcto para Pixi v8, o que la mascara `Graphics` no sea compatible con ese uso en la configuracion actual.

### 3. Atenuar el mapa base segun opacidad de oscuridad

Se ajusto el mapa base para que su alpha sea:

```ts
mapSprite.alpha = 1 - darkness.opacity;
```

Objetivo:

- Con `Overlay = 1`, el mapa base queda oculto.
- Las luces deberian reinyectar el mapa mediante sprites enmascarados.

Resultado:

- La oscuridad total funciona.
- El mapa no se reinyecta dentro del circulo/cono.

### 4. Corregir CSP para PixiJS

PixiJS v8 ejecuta un check interno `checkImageBitmap` con un `data:image/png` de 1x1. El CSP bloqueaba ese fetch:

```text
Fetch API cannot load data:image/png;base64,...
Refused to connect because it violates connect-src
```

Se actualizo CSP:

```html
connect-src 'self' data: map-asset: blob:
```

Resultado:

- El error CSP desaparece.
- El bug de mascara/reveal persiste.

## Hipotesis

1. `Graphics` como mascara no esta funcionando de forma confiable con el renderer actual de Pixi v8.
2. La mascara necesita estar en una capa/grupo distinto o mantener una relacion de display tree especifica que todavia no se cumple.
3. La mezcla de `darkness`, `lights`, `map` y sprites duplicados esta produciendo un orden visual incorrecto.
4. `blendMode = "erase"` no es suficiente porque borra la oscuridad, pero no garantiza que el mapa base quede visible si su alpha fue reducido por overlay.
5. Se necesita una arquitectura de render dedicada para visibilidad, posiblemente con `RenderTexture` o una mascara global de vision.

## Direccion recomendada para el spec futuro

Crear una spec enfocada solo en el sistema de visibilidad/luz:

- Separar luz visual de mascara de vision.
- Crear una capa `visibilityMask` o `vision`.
- Renderizar una mascara acumulada con todas las luces visibles.
- Renderizar mapa base normal a una textura/capa.
- Renderizar oscuridad total encima.
- Componer una copia del mapa usando la mascara de vision para revelar solo areas iluminadas.
- Mantener overlays esteticos de luz en una capa aparte y con baja opacidad.
- Agregar un modo debug para mostrar:
  - mapa base,
  - darkness,
  - mascara de vision,
  - mapa revelado,
  - halos esteticos.

## Criterios de aceptacion propuestos

- Con `Overlay = 1`, fuera de las luces no se ve el mapa.
- Con `Overlay = 1`, dentro de una luz puntual se ve el mapa claro.
- Con `Overlay = 1`, dentro de una luz conica se ve el mapa claro.
- La luz conica conserva 60 grados de angulo.
- La orientacion del cono sigue funcionando desde el aro/manija.
- El halo visual de luz no tapa el mapa revelado.
- Funciona despues de cargar mapa con `Cargar mapa`.
- Funciona despues de cargar escena `.ttrpgscene` con mapa referenciado por `map-asset://`.

## Notas para reproduccion

1. Ejecutar `pnpm dev`.
2. Cargar un mapa.
3. Crear una luz puntual desde click derecho.
4. Activar `Oscuridad`.
5. Subir `Overlay` al maximo o casi maximo.
6. Observar que el area circular de la luz muestra una forma gris/oscura, pero no el mapa claro.
7. Repetir con luz conica.

## Comandos de validacion actuales

Los cambios relacionados han pasado:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Estos comandos no cubren visualmente el bug; se requiere prueba visual/manual o test de render/screenshot.
