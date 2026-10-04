# Plan - Efectos de Fuego

Estado: fuego procedural aprobado e implementado el 2026-10-03. Version 2.5.3 por indicacion explicita del usuario, con orden de integrar `codex/realistic-fire` en main, construir instalador y subir los cambios.

## Arquitectura

- Dominio/persistencia: conservar `SceneFireEffect`, zonas circle/cells, validaciones, pintado, movimiento y serializacion. Sin nuevos campos ni migracion.
- `procedural-fire.ts`: ruido RGBA 256x256 de 256 KiB por viewport, semilla por ID y cuatro fases del reloj de pared. Envolver fases sobre el periodo del volumen con continuidad entre slices, sin un ciclo corto de GIF.
- Inicializar el primer mesh con el tiempo actual antes de dibujarlo. Los siguientes comparten reloj; reabrir un mapa retoma la hora actual. Inyectar una fuente de tiempo para probar igualdad entre viewports.
- `procedural-fire-shader.ts`: vertex shader usa matrices de Pixi; fragment shader integra cinco muestras de volumen caliente con turbulencia 3D, transparencia y color termico. Render directo, sin Filter, RenderTexture ni alpha-mask de Pixi.
- Huella: circulos/anillos analiticos; celdas con textura Canvas2D estatica, vertices reales cuadrados/hexagonales y dimensiones positivas de hasta 1024x1024. No actualizarla durante la animacion.
- `PixiViewport`: cache por ID, geometria, posicion, escala, calibracion y estado de opacidad cero. Aplicar opacidad positiva al contenedor; color, emision y radio de luz no invalidan el fuego visual. La iluminacion conserva su cache y reglas independientes.
- Recursos: destruir mesh, geometria, shader local y textura propia al sustituir/borrar. Ruido y reloj son compartidos por viewport, hasta destruir el renderer. Mantener el programa GLSL compartido de Pixi.
- Compatibilidad: seleccionar procedural en WebGL y no cargar alli el GIF; usar `fire-pattern-animation.ts` y `fire-pattern-layout.ts` existentes para fallback no-WebGL.
- UI: conservar controles y herramientas. Redibujar seleccion al cambiar rol para no mantener guias de DM en Player.

## Implementacion

- [x] Renderer procedural, shader, limites de textura y liberacion de recursos.
- [x] Integracion real en DM/Player y cache existente, independiente del laboratorio.
- [x] Reloj inicial comun y variacion determinista por ID.
- [x] Reutilizar mesh con cambios de opacidad positiva/iluminacion; liberar con opacidad cero/oculto.
- [x] Conservar geometria, iluminacion, serializacion y transformacion de mundo.
- [x] Guias editoriales privadas para DM, actualizadas al cambiar rol.
- [x] `fire-lab.html` con `PixiViewport` real: fuentes pequenas, hoguera, anillo, area pintada, incendio extenso y 24 fuentes. Entrada de desarrollo, no un nuevo flujo de la app empaquetada.
- [x] Actualizar spec, version 2.5.3 en `package.json` y `CHANGELOG.md` segun la numeracion solicitada.
- [x] Completar regresiones del camino procedural, validacion final y build.

## Pruebas

- Huella: dimensiones positivas/acotadas, regiones grandes/delgadas, hexagonos y traslacion sin modificar coordenadas relativas ni semilla.
- Ruido/reloj: datos deterministas y continuidad entre slices; mismo ID/tiempo en dos viewports, primera carga y reapertura tras inactividad.
- Render: una geometria por efecto, ruido/reloj compartidos, sin filtros ni render targets; opacidad cero no anima.
- Cache: redibujos, transformaciones de mundo, opacidad/luz, invalidacion por grilla/geometria, ocultar/borrar y navegacion durante carga del mapa.
- Mascara: una rasterizacion por geometria, no por fotograma; cuadrados y hexagonos. Destruir recursos propios sin afectar al segundo viewport.
- Rol: guias visibles al DM, ausentes al jugador, sin residuos tras cambiar rol.
- Mantener regresiones del atlas para fallback y las de capas, niebla, calibracion y serializacion existentes.

## Verificacion

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y el empaquetado con `./scripts/build-dmg.sh`, autorizado para 2.5.3. Verificar version del bundle y DMG antes del push.

El prototipo previo paso 403 tests, typecheck y lint. En navegador local se observaron aproximadamente 60 FPS con 24 fuentes, incendio extenso a zoom 2, alternancia visible/oculto y ventana estrecha, sin errores WebGL. El indicador mide intervalos de requestAnimationFrame, no tiempo GPU aislado.

Validacion de la implementacion: typecheck y lint correctos, 409 tests en 59 archivos y build de main/preload/renderer exitoso. El bundler avisa que ignora directivas `use client` de Radix/Lucide; no impiden el build. Se reviso nuevamente el laboratorio con el renderer integrado, animacion visible y sin errores WebGL. El empaquetado y push de 2.5.3 se verifican al completar esta orden.

Pendientes del entorno, no declarados como ejecutados:

- [ ] Sesion Electron prolongada con DM y Player simultaneos sobre un mapa real.
- [ ] Medicion en la pantalla de proyeccion objetivo. El coste GPU aumenta con area visible, solapamiento y resolucion; las pruebas de cache no sustituyen esta medicion.

## Historial

- 1.9.0: atlas, fase/disposicion por ID, presupuestos de sprites, cache y controles aceptados. Se conservan como fallback y regresiones.
- 1.10.0: hexagonos, seis/doce vecinos de iluminacion y persistencia de layout. Sigue vigente.
- No se reutilizan assets comerciales ni la hoja generada descartada. Sin nuevas dependencias, descargas en runtime ni ampliacion de CSP.
