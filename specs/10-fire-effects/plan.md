# Plan - Efectos de Fuego

Estado: implementado y aceptado, version 1.8.0.

## Arquitectura

- Dominio: `FireZone` circle/cells, validacion, pintado y movimiento en coordenadas de mundo. Sin cambios de formato.
- Assets: preparar offline `fiya2-preview.png` y metadata con `scripts/prepare-fiya2-preview.mjs`. Conservar originales y anteriores sin referencias ejecutables.
- `fire-pattern-layout.ts`: colocacion estable por id, variaciones de tamano/orientacion/fase, limites de sprites y agrupacion espacial acotada.
- `fire-pattern-animation.ts`: vistas de textura compartidas, fases individuales y reloj unico a 25 fps; destruir suscripciones sin destruir el atlas de otros viewports.
- `PixiViewport`: sprites completos sin mascara del area; brillo vectorial sobre geometria exacta. Cache por firma, grilla y tramo del presupuesto, sin invalidar todos los fuegos por cada alta.
- Capas: mantener iluminacion de oscuridad/darkvision; respetar oscuridad magica y fog. El fuego no revela niebla.
- UI: conservar propiedades y handles del fuego circular; pintado por celdas sin handles circulares ni marcos por casilla.

## Checklist

- [x] Pintado circular de celdas y persistencia compatible.
- [x] Circulo cerrado/abierto, seleccion, movimiento y propiedades.
- [x] Atlas optimizado con frames transparentes completos.
- [x] Variaciones estables y fases desincronizadas.
- [x] Mayor opacidad, cero libera sprites.
- [x] Presupuesto de sprites por efecto y viewport, sin decodificacion por llama.
- [x] Cache y destruccion seguros durante carga de mapas del jugador.
- [x] Brillo en huecos e iluminacion por coronas, sin perforar fog.
- [x] GIF anterior conservado sin cargarlo desde el render.
- [x] Procedencia y restriccion de redistribucion documentadas.
- [x] Pruebas de layout, reloj, cache, limites, arrastre y liberacion.
- [x] Typecheck, lint, 298 tests y build.
- [x] Revision visual de circulo/anillo, pintado y arrastre; aceptacion del usuario.

## Verificacion de futuras reproducciones

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`. Revisar mapas grandes en ambas ventanas: sprites completos, distribucion estable, zoom/pan, opacidad cero y borrado repetido. Las pruebas de asignaciones no sustituyen medir FPS/VRAM en la maquina de proyeccion.
