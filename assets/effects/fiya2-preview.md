# Fiya2 - prueba experimental de fuego

- Aprobado por el usuario e integrado en main como 1.8.0. Se conserva la procedencia y la restriccion de redistribucion indicada abajo.
- Fuente solicitada por el usuario: https://jadziadoesthings.wordpress.com/wp-content/uploads/2017/03/fiya2.gif
- Publicacion de autoria: https://jadziadoesthings.wordpress.com/2017/03/28/looping-and-straight-ahead-animation/
- Autor mostrado por el blog: `missjiav` / `jadziadoesthings`.
- Consultado: 2026-09-02.
- Licencia: no se encontro una licencia explicita. Este archivo se usa unicamente para la prueba local solicitada; verificar permiso antes de distribuirlo o incluirlo en un release.

## Assets

- Original preservado: `assets/effects/fiya2-original.gif`.
- Atlas de prueba: `src/renderer/public/effects/fiya2-preview.png`.
- Metadata de frames: `src/render/pixi/fire-preview-atlas.json`.
- Fuego anterior sin reemplazar: `src/renderer/public/effects/area-fire.gif` y `area-fire.backup.gif`.

El GIF contiene 32 frames RGBA de 1100 x 800, 40 ms por frame (1.28 s por ciclo), con transparencia. Decodificado completo consume aproximadamente 107.4 MiB por copia. Se conservan los 32 frames y su duracion, recortando el margen transparente con un encuadre comun y reduciendo cada frame a 128 x 160. El atlas ocupa 1056 x 656, aproximadamente 2.65 MiB sin comprimir por textura, con margen de seguridad entre frames.

## Render experimental

- Cada llama es un `Sprite` con el frame completo del atlas, sin mascara ni corte en los bordes del area. Puede sobresalir del circulo o de las esquinas pintadas para dar un contorno irregular. Esto no amplia la zona afectada, la seleccion ni la iluminacion; la niebla sigue cubriendo las llamas cuando corresponda.
- Colocacion, tamano, leve rotacion, reflejo horizontal y fase de animacion varian usando una semilla estable por id del efecto. Circulos/anillos usan distribucion radial irregular y las zonas pintadas usan sus celdas ocupadas. No se sortean posiciones durante los frames, el paneo, la seleccion o el arrastre.
- Un relleno aditivo tenue sigue la geometria exacta del suelo y sube el brillo entre las llamas. No se agregan bordes naranjas por celda ni filtros/render textures adicionales. El hueco de un anillo no recibe brillo; las llamas del borde pueden sobresalir hacia el hueco.
- Mayor opacidad: se elimina el multiplicador 0.65 anterior; cada llama usa entre 0.92 y 1 multiplicado por la opacidad elegida del efecto (antes 0.65 por 0.7/0.85). El control de opacidad sigue funcionando, incluido cero. La iluminacion fuerte/tenue y el orden de capas no cambian.
- Un reloj por viewport cambia las vistas de textura solamente al avanzar de frame (25 fps), sin actualizar React ni reconstruir geometria. Cada llama tiene un offset propio entre los 32 frames, sin crear relojes, GIF decoders ni texturas GPU adicionales.
- Maximo 256 llamas por efecto y presupuesto objetivo de 2048 por viewport, con un minimo de una llama por efecto. El presupuesto baja por tramos de potencias de dos cuando hay muchos fuegos. Solo cruzar un tramo invalida los demas efectos, no cada alta individual. En areas grandes se agrupan celdas espacialmente y se aumenta el tamano de las llamas en lugar de crear miles de sprites. El coste ya no es dos objetos por efecto como en el primer prototipo.
- Cada sprite se desuscribe al destruirse. Destruir el viewport libera las vistas de frame sin destruir la textura compartida administrada por `Assets`.
- Se reutiliza el cache de efectos durante seleccion y paneo; cambiar la escala de la grilla invalida el patron para mantener su densidad relativa.
- El original remoto nunca se carga en ejecucion: el atlas se sirve como asset local empaquetado, con el mismo mecanismo de los efectos existentes y sin ampliar CSP.
- Al diferir efectos mientras carga un mapa del jugador, un contenedor destruido no se reutiliza desde el cache. La limpieza repetida es segura.

## Verificacion automatizada y visual

- Pruebas del reloj: 32 frames compartidos, fases diferentes con el mismo reloj, reflejos preservados, avance solo a 25 fps, bucle tras pausas, suscripcion/desuscripcion y aislamiento entre viewports.
- Pruebas del layout: variacion determinista, estabilidad al mover, llamas ancladas en circulos/anillos/celdas y sobresaliendo del contorno, celdas desconectadas y presupuesto en areas grandes/dispersas.
- Pruebas del renderer real sin GPU: 120 redraws reutilizan geometria; 100 cambios de posicion no acumulan sprites; 2000 celdas quedan dentro del limite; escenas densas respetan el presupuesto; cambiar grilla reconstruye la densidad; cargar mapa y borrar durante la carga no reutiliza ni destruye dos veces objetos liberados. Se verifica ausencia de mascaras sobre las llamas y aumento de opacidad.
- Preview en navegador: anillo y pintado irregular muestran contornos desiguales sin cortar las llamas, con fases variadas y mayor opacidad; consola sin errores durante la prueba.
- Estas pruebas comprueban asignaciones y reutilizacion, no equivalen a un benchmark de FPS/VRAM en una mesa real. El coste de pixeles dibujados sigue aumentando con la superficie visible y la superposicion de efectos. Falta aceptar visualmente la prueba con mapas grandes y ambas ventanas Electron.

## Regeneracion

`scripts/prepare-fiya2-preview.mjs` requiere `sharp` solo como herramienta de preparacion offline. Usar `SHARP_MODULE_PATH` con la ruta a una instalacion existente y ejecutar `pnpm exec node scripts/prepare-fiya2-preview.mjs`. No se agrega ninguna dependencia a la aplicacion.

## Pruebas visuales a aceptar

- Circulo grande y pequeno, circulo abierto, una casilla, area irregular y celdas desconectadas.
- Arrastrar, seleccionar, cambiar radio, opacidad y zoom sin reiniciar la animacion.
- Oscuridad, niebla y Player View conservan sus mascaras y prioridad.
- Crear/eliminar repetidamente efectos sin acumular suscriptores al reloj.
