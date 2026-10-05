# Spec - Efectos de Fuego

Estado: base procedural cerrada en 2.5.3. Ampliacion de herramientas aceptada por el usuario el 2026-10-03 para 2.6.0 en `codex/fire-shape-tools`, sobre main 2.5.4. Integracion a main autorizada el 2026-10-05 junto con el fix de darkvision 2.6.1 (spec 08). Las limitaciones de verificacion nativa estan registradas en el plan.

## Objetivo

Representar fuego visto desde arriba con siluetas cambiantes, volumen caliente, turbulencia, filamentos y bordes transparentes. Cada fuente evoluciona de manera diferente y se adapta a su zona, sin una estrella fija ni un GIF repetido por toda el area.

Es una aproximacion visual procedural, no una simulacion fisica de propagacion, humo, combustible o colisiones. No agrega controles de viento, clima ni consumo de objetos.

## Comportamiento visual

- Mostrar el mismo efecto en DM y Player View usando una semilla estable derivada del ID y el reloj de pared comun del equipo. Abrir una ventana o volver a un mapa incorpora el fuego al instante actual, no reinicia una animacion.
- Soportar lineas, conos, circulos, anillos y zonas pintadas cuadradas o hexagonales. El interior de los anillos permanece libre de fuego.
- Medir el detalle en coordenadas del mapa/grilla, no en pixeles de pantalla. Una zona grande contiene mas actividad, no una sola llama ampliada. Las fuentes pequenas adaptan su detalle a su radio.
- Mover, seleccionar, cambiar zoom o reorientar el mapa no modifica la semilla. Mapa y fuego comparten la transformacion del mundo.
- Usar una paleta calida con nucleos luminosos y bordes semitransparentes. El campo `color` existente se conserva para la iluminacion; no sustituye la paleta termica del shader.
- Respetar opacidad y visibilidad. Opacidad cero o visibilidad desactivada no deja un brillo minimo ni recursos de fuego activos.
- Las guias y manivelas de edicion pertenecen al DM; no se muestran al jugador.

## Interaccion

- Efectos ofrece la misma fila compacta de cuatro iconos en panel lateral y menu contextual: linea, cono, circulo y lapiz (pintar fuego). Cada icono tiene tooltip, nombre accesible y estado activo. Seleccionar una herramienta cierra el menu contextual.
- Linea, cono y circulo se dibujan con dos clics: origen y destino/radio. Antes del segundo clic se muestra una huella provisional con medida. Escape cancela; Espacio permite navegar sin confirmar; cambiar mapa descarta el borrador. No guardar ni enviar borradores al Player.
- Al confirmar el segundo clic, volver a seleccion y restaurar inmediatamente el cursor normal, sin necesitar mover el raton ni pulsar Escape. Cancelar un borrador elimina tambien su preview pendiente; un clic posterior no crea otro fuego hasta reactivar la herramienta.
- Linea: banda recta de fuego, ancho inicial de un cuadro de la grilla al crear (persistido en mundo, editable en propiedades), longitud medida con las reglas de distancia actuales. Sus extremos se pueden editar. Grilla hexagonal ajusta extremos a centros como relampago.
- Cono: sector de 60 grados fijos. Se modifica la direccion hacia donde mira, en grados, no la apertura. Alcance y direccion tienen controles independientes y manivelas como relampago.
- Circulo: conservar cerrado/abierto, radio, escala, color, opacidad, visibilidad, emision y alcance de luz. Medir radio en la unidad de la grilla. Las nuevas formas tambien conservan escala y propiedades visuales/de luz.
- Guias de dibujo, medidas y manivelas solo en DM; el Player ve fuego y luz, no controles editoriales. La huella del fuego identifica el area real, sin agregar la guia cian persistente propia de relampago.
- Para fuego circular, manivela naranja de radio a la derecha y amarilla de luz arriba. Priorizar la mas cercana si coinciden radios. Escalar trazos e hit testing con el helper de areas sin cambiar dimensiones fisicas.
- Pintar agrega celdas cuyos centros quedan dentro del pincel circular; radio inicial 25 unidades de mundo. Si no entra ningun centro, incluir la celda bajo el puntero.
- Extender el fuego pintado seleccionado; si no hay uno seleccionado, crear una zona nueva. Mantener seleccion, movimiento libre, borrado, visibilidad y arbol de Efectos.
- El lapiz activa el pintado libre existente sobre la topologia del mapa, no un GIF por punto ni una nueva simulacion. Mantener la seleccion si es una zona pintada para extenderla; mostrar pincel y radio bajo el puntero.
- Las zonas pintadas no muestran manivelas circulares ni marcos por casilla. La decoracion no amplia la zona seleccionable ni el area afectada por las reglas.
- Guardar `layout` por celda junto a `x/y/size`; ausente significa cuadrada. Mover o recargar conserva la forma aunque cambie la grilla global.

## Render y rendimiento

- WebGL usa un mesh directo por efecto, ruido determinista compartido y un unico reloj por viewport. No requiere un GIF ni sprites individuales por llama.
- Resolver circulos/anillos analiticamente. Para lineas, conos y celdas, crear una mascara estatica de combustible con Canvas2D, uniendo poligonos completos y suavizando bordes. Esta textura es una entrada del shader, no una alpha-mask de Pixi.
- Acotar cada textura de combustible a 1024 px por lado, con dimensiones siempre positivas. No crear render textures ni framebuffers intermedios de fuego: el zoom no puede producir attachments de tamano cero.
- Reutilizar geometria, shader y mascara durante animacion, pan, zoom y rotacion. Solo actualizar fases temporales por frame, sin estado React ni transferencias IPC por fotograma.
- Cambiar opacidad positiva o propiedades de iluminacion no reconstruye el mesh ni la mascara. Cambiar geometria, posicion o calibracion puede reconstruirlos, conservando semilla y reloj. Pasar a opacidad cero libera los recursos.
- Descartar fragmentos vacios antes de evaluar turbulencia. El coste GPU depende del area visible y la resolucion, no solo del numero de efectos.
- Destruir recursos propios al borrar, ocultar, sustituir o descargar efectos. No reutilizar contenedores destruidos tras cargar un mapa del jugador ni destruir recursos compartidos mientras otro efecto los usa.

## Iluminacion y persistencia

- Mantener el orden de capas: fuego debajo de niebla y herramientas de area; no revela niebla ni perfora oscuridad magica.
- Fuego y celdas vecinas por lado reciben luz brillante; la siguiente corona recibe luz tenue, excluyendo fuego y luz brillante de otros fuegos. Usar cuatro vecinos para cuadrados y seis para hexagonos.
- En lineas y conos, la luz sigue toda la huella, no un disco en el origen; `lightRadius` controla el halo alrededor del contorno. Conservar las reglas historicas de luz para circulos y celdas.
- Calcular el halo como una expansion del contorno, tambien con radios grandes; no permitir triangulos cruzados ni bandas mas oscuras por solapamiento del propio halo.
- La luz revela oscuridad normal y recupera color en darkvision. La mascara visual procedural no cambia estas reglas.
- Conservar los campos existentes: ID, `kind: fire`, posicion mundial, zona, celdas, radio de pincel, escala, opacidad, color, visibilidad, emision y radio de luz.
- Ampliar la union de zonas con `line` (extremo mundial y ancho) y `cone` (radio y direccion). No serializar ruido, fases, meshes o mascaras derivadas. Los documentos existentes circle/cells conservan sus campos y comportamiento; la version de formato sigue siendo 2. Las versiones antiguas de la app no tienen por que entender las variantes nuevas.

## Compatibilidad y assets

- Conservar Fiya2 de 32 fotogramas como fallback no-WebGL; no cargarlo en el camino procedural. Su disposicion, reloj y limites de 256 sprites por efecto y 2048 por viewport permanecen en los modulos existentes.
- Conservar originales y backups historicos. La procedencia y limitaciones de redistribucion del fallback estan en `assets/effects/fiya2-preview.md`.
- No integrar assets de pago ni la hoja de sprites generada y descartada durante la exploracion. El nuevo renderer no necesita descargas, dependencias adicionales ni ampliar CSP.
- Referencias visuales inspeccionadas, no copiadas: [Matt.M](https://www.foundryvtt.store/products/animated-fire-by-mattm) y [The Animancer](https://i.redd.it/kqnvby7txxzd1.gif).

## Criterios de aceptacion

- Fuentes pequenas, hogueras, anillos y areas pintadas muestran contornos cambiantes sin repeticion coordinada ni silueta fija.
- DM y Player comparten geometria, semilla y tiempo; abrir/reabrir una vista no reinicia el fuego.
- Zoom, pan y orientaciones cardinales mantienen el fuego unido al mapa sin framebuffers invalidos.
- Cambiar opacidad o iluminacion reutiliza recursos; borrar, ocultar y cambiar de mapa los libera sin fugas ni doble destruccion.
- Controles, grillas cuadradas/hexagonales, guardado/carga, oscuridad y niebla conservan su comportamiento.
- Ambos menus crean las cuatro variantes; linea/conos son medibles, editables, seleccionables por su huella y trasladables sin deformarse. Guardar/reabrir preserva geometria, escala, direccion y luz por mapa. El lapiz extiende una sola zona pintada.
- Ejecutar typecheck, lint, tests y build. Comprobar incendio extenso, zoom alto y multiples fuentes. Los FPS de laboratorio no garantizan el rendimiento en todas las escenas ni sustituyen la prueba en el equipo de proyeccion.

## Historial

- 1.9.0: atlas de fuego, controles de radio/luz a cualquier zoom y arbol lateral aceptados el 2026-09-02.
- 1.10.0: pintado, iluminacion y persistencia hexagonal aceptados el 2026-09-02; contrato geometrico compartido con spec/plan 04.
- 2.5.3: reemplazo procedural aprobado el 2026-10-03; numeracion fijada por indicacion explicita del usuario. Los cierres anteriores no se reinterpretan como pruebas de esta implementacion.
