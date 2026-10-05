# Plan - Efectos de Fuego

Estado: base procedural cerrada en 2.5.3. Ampliacion de formas aceptada por el usuario el 2026-10-03 para 2.6.0, rama `codex/fire-shape-tools`, sobre main 2.5.4. Integracion a main autorizada el 2026-10-05 junto con el fix de darkvision 2.6.1 (spec 08).

## Ampliacion de herramientas (2026-10-03)

1. Extender `SceneFireZone`, helpers puros y esquema compartido con linea (end/width en mundo) y cono (radius/direction, apertura fija 60). Validar medidas finitas y no degeneradas, normalizar direccion y conservar circle/cells sin migracion. Traslacion mueve ambos extremos; escala se aplica respecto al origen.
2. Agregar dominio `fire-shapes.ts` para dibujo en dos puntos, medida, extremos/manivelas, huella poligonal y hit testing. Reutilizar mediciones y snap existentes; no depender de React/Pixi.
3. Integrar borradores y edicion en el ciclo de interaccion de efectos del viewport: preview local por frame, confirmacion unica, Escape/blur/lost capture/cambio de mapa y pan con Espacio. Conservar manivelas historicas de circulo/luz y pintado agrupado por frame.
4. Extender raster de combustible y fallback con las nuevas huellas. Mantener un mesh por fuego, ruido/reloj compartidos, textura <=1024 por lado y cache por geometria; sin filtros/FBO nuevos ni IPC por frame. Luz y darkvision deben seguir toda la huella de lineas/conos.
5. Extraer `FireTools` y propiedades geometricas; cuatro iconos Lucide con tooltip/aria en ambos menus. Medidas en unidad de grilla, direccion (no apertura), ancho de linea, controles existentes y arbol con nombres por variante. Agregar preview del pincel libre.
6. Probar geometria/escala/movimiento/snap, schema V1/V2 y Player, caches/recursos/luces, interaccion/cancelacion y regresiones de relampago. Ejecutar suite, typecheck, lint y build; revisar UI/animacion en navegador y Electron.
7. Dejar laboratorio y app disponibles para revision. Registrar resultados reales al final; no confundir las validaciones historicas de 2.5.3 con esta ampliacion. Tras la aprobacion, preparar 2.6.0 con changelog, commit, push de la rama y DMG; no integrar a main sin orden explicita.

### Implementacion de la ampliacion

- [x] Dominio `fire-shapes.ts`, validacion de dimensiones/overflow, medidas, escala, traslado y seleccion por huella real.
- [x] Zonas line/cone en esquema compartido y snapshot Player; circulos/celdas existentes conservados.
- [x] `EffectDraft` y edicion local comunes a fuego/relampago, con callbacks separados al confirmar. Se mantiene `setLightningTool` como adaptador compatible.
- [x] Mascara de combustible estatica unica para nuevas formas, cache y fallback acotado. Detalle adaptado al ancho de bandas finas y al radio de conos pequenos.
- [x] Halo de luz calculado como expansion convexa del contorno, con esquinas redondeadas; no usar strokes mas gruesos que la figura, que producen triangulos cruzados. Mismo contorno para luz, borrado de oscuridad y recuperacion de color en darkvision.
- [x] `FireTools` de cuatro iconos en ambos menus, propiedades extraidas, medidas en unidades de grilla, ancho, direccion y pincel en cuadros. El largo de linea se lee segun reglas tacticas y se edita con extremos, evitando un segundo valor euclidiano contradictorio.
- [x] Preview del pincel y extension de una zona pintada existente. Laboratorio actualizado con linea, cono, circulo, anillo y pintado.
- [x] Revision del usuario y autorizacion de nueva version, commit, push y DMG. Version minor 2.6.0 por las nuevas herramientas; integracion a main autorizada posteriormente para el cierre 2.6.1.

Las secciones siguientes documentan la base de 2.5.3; las decisiones de esta ampliacion sustituyen unicamente las restricciones a circle/cells y a sus herramientas antiguas.

### Verificacion de la ampliacion

- Regresion del cursor al finalizar: el viewport limpiaba `effectDraft` antes del callback a React, y la posterior sincronizacion de seleccion era un no-op. Ahora actualiza el cursor en la misma transicion que confirma la geometria. Pruebas para linea/cono/circulo de fuego y relampago comprueban restauracion inmediata, Escape posterior y ausencia de una segunda creacion; cancelar un circulo pendiente limpia tambien el preview encolado.
- Verificacion del fix de cursor: los seis casos de confirmacion fallaron antes del cambio (`crosshair` en lugar de `default`) y pasan con la correccion. Suite completa de 492 tests, typecheck, lint y diff check correctos. En la app del navegador se verificaron cursor normal, boton de circulo desactivado y conteo estable de efectos despues de Escape y otro clic.

- 2026-10-03: 484 tests en 68 archivos, `pnpm typecheck` (tambien ejecutado por build), `pnpm lint`, `pnpm build` y `git diff --check` correctos. Permanecen avisos preexistentes `use client` en Radix/Lucide.
- Navegador, app real: menus lateral/contextual, linea medida, cono con direccion 270 grados, pintado ampliado de 4 a 6 celdas conservando un solo objeto y pincel visible. Sin errores de consola durante el smoke.
- Laboratorio `fire-lab.html`, renderer real en rol Player: linea, cono, circulo, anillo y pintado animados, sin controles DM; revisado tras el ultimo cambio de detalle. La lectura puntual de FPS de laboratorio no es un benchmark de proyeccion.
- Regresiones nuevas: geometria/escala/snap, contorno de luz convexo con halos anchos, guardado entre mapas, validacion IPC, transitorios/cancelacion y cache de mascara durante 300 updates, recursos y privacidad de guias; siguen pasando las regresiones de relampago.
- Pendiente: smoke nativo DM/Player de esta ampliacion. Electron de desarrollo arranco, pero Computer Use agoto el tiempo de respuesta al acceder a su ventana, incluso tras reiniciar la instancia propia. El log registro un aviso GPU `SharedImageManager::ProduceSkia` por mailbox inexistente; no se determina aqui su causa ni se declara resuelto. No se declara verificado visualmente en Electron ni medido rendimiento prolongado. La prueba visual y consola limpia descritas arriba corresponden al navegador.
- Revision de desarrollo realizada en `http://localhost:5173/fire-lab.html` y la app en `http://localhost:5173/`. El instalador 2.5.4 construido antes corresponde exclusivamente al cierre de relampagos; esta ampliacion se entrega en 2.6.0.

### Cierre 2.6.0 (2026-10-03)

- Validacion final: 492 tests en 68 archivos, `pnpm lint`, `pnpm typecheck` y `git diff --check` correctos.
- `./scripts/build-dmg.sh` completo correctamente la compilacion y el empaquetado arm64. Se mantienen avisos de `use client` en Radix/Lucide, metadata de autor ausente y dependencias opcionales de otras plataformas; no impidieron construir el instalador.
- Generado `dist/TTRPG Effects-2.6.0-arm64.dmg`. `hdiutil verify` confirma integridad y `CFBundleShortVersionString` del bundle confirma 2.6.0. Build personal/interno sin firma de distribucion ni notarizacion; `dist/` permanece fuera de git.
- Entrega en `codex/fire-shape-tools`, con commit y push autorizados. No se integra a main en esta entrega. Sigue pendiente el smoke nativo y la medicion prolongada descritos arriba; verificar el DMG no sustituye esas pruebas.

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

Validacion de la implementacion: typecheck y lint correctos, 409 tests en 59 archivos y build de main/preload/renderer exitoso. El bundler avisa que ignora directivas `use client` de Radix/Lucide; no impiden el build. Se reviso nuevamente el laboratorio con el renderer integrado, animacion visible y sin errores WebGL.

Cierre 2.5.3: `./scripts/build-dmg.sh` ejecutado exitosamente despues del merge. Generado `dist/TTRPG Effects-2.5.3-arm64.dmg`; `CFBundleShortVersionString` de la app confirma 2.5.3 y `hdiutil verify` confirma integridad del DMG. Build personal/interno sin firma de distribucion ni notarizacion. Los instaladores permanecen fuera de git; publicar main y la rama de implementacion sin incluir `dist/`.

Pendientes del entorno, no declarados como ejecutados:

- [ ] Sesion Electron prolongada con DM y Player simultaneos sobre un mapa real.
- [ ] Medicion en la pantalla de proyeccion objetivo. El coste GPU aumenta con area visible, solapamiento y resolucion; las pruebas de cache no sustituyen esta medicion.

## Historial

- 1.9.0: atlas, fase/disposicion por ID, presupuestos de sprites, cache y controles aceptados. Se conservan como fallback y regresiones.
- 1.10.0: hexagonos, seis/doce vecinos de iluminacion y persistencia de layout. Sigue vigente.
- No se reutilizan assets comerciales ni la hoja generada descartada. Sin nuevas dependencias, descargas en runtime ni ampliacion de CSP.
