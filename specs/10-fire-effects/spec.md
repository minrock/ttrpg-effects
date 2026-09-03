# Spec - Efectos de Fuego

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- Pintar fuego con grid.layout hexagonal agrega hexagonos completos; la variante cuadrada sigue disponible. Si ningun centro entra en el pincel, incluir la celda bajo el cursor.
- Guardar layout por celda junto a x/y/size; ausente significa cuadrada. Mover o recargar conserva la forma, incluso al cambiar la grilla global.
- Luz brillante en celdas pintadas y primera corona de vecinos (cuatro en cuadrada, seis en hexagonal); tenue en segunda corona, sin repetir celdas del fuego o de la primera corona.
- Rellenos, mascaras de iluminacion/darkvision y seleccion usan los seis vertices. El area seleccionable no incluye las esquinas vacias del bounding box.
- No recortar llamas decorativas: siguen completas, aleatorias y con el atlas/presupuestos existentes. Solo brillo de suelo y area fisica siguen el poligono. No agregar marcos naranjas.


Estado: implementado y aceptado, controles actualizados en version 1.9.0.

## Objetivo

Representar fuego circular, anillos y celdas pintadas mediante llamas animadas completas, con transparencia y distribucion irregular, manteniendo interaccion, persistencia y rendimiento.

## Render y assets

- Usar los 32 frames del GIF Fiya2 mediante `effects/fiya2-preview.png` y metadata de atlas; assets locales empaquetados, sin acceso remoto ni ampliacion de CSP.
- Conservar `area-fire.gif` y su backup, pero sin cargarlos ni referenciarlos desde codigo ejecutable.
- Respetar la transparencia original. Cada llama conserva el frame completo y puede sobresalir del borde sin recortes.
- Variar posicion, tamano, reflejo, rotacion leve y fase usando una semilla estable por id. Seleccionar, arrastrar o redibujar no cambia esa distribucion.
- Usar opacidad del efecto multiplicada por 0.92 a 1 por llama; cero no deja un minimo visible ni sprites animados.
- El brillo del suelo sigue la geometria exacta. Las llamas que sobresalen no amplian el area afectada ni la iluminacion.
- No dibujar emojis ni marcos naranjas por celda. Conservar el contorno circular y los controles editoriales.
- Compartir atlas y reloj por viewport, sin estado React por frame ni un decodificador por llama. Limite de 256 sprites por efecto y presupuesto objetivo de 2048 por viewport, minimo uno por efecto.
- La procedencia, preparacion y limitaciones de licencia viven en `assets/effects/fiya2-preview.md`; verificar permiso antes de distribuir publicamente.

## Interaccion

- Crear fuego circular desde Efectos en el menu contextual. Cambiar circulo cerrado/abierto, radio, escala, color, opacidad y emision de luz desde propiedades.
- Arrastrar el contorno/handle naranja ajusta el radio del fuego circular. El control de luz ajusta su alcance cuando emite luz.
- Pintar fuego agrega celdas cuyo centro queda dentro del pincel circular; radio inicial 25 unidades de mundo, origen mundial (0,0).
- Si existe un fuego por celdas seleccionado, el trazo lo extiende; en otro caso crea un efecto.
- Conservar seleccion, movimiento libre, borrado y visibilidad. Mover celdas no cambia su forma ni distribucion relativa de llamas.
- Las zonas pintadas no muestran los handles circulares de radio de fuego/luz. Su iluminacion se calcula desde las celdas.
- La seleccion no se amplia por el sobresaliente decorativo de las llamas.

## Iluminacion y persistencia

- El fuego y las celdas vecinas por lado (cuatro en cuadrada, seis en hexagonal) reciben luz brillante; la siguiente corona recibe luz tenue, excluyendo fuego y luz brillante de otros fuegos.
- La luz revela oscuridad normal y recupera color en darkvision. No perfora niebla ni oscuridad magica.
- Conservar el orden de capas canonico; los efectos permanecen debajo de niebla y herramientas de area.
- Guardar id, kind fire, posicion mundial, zona circle/cells, celdas y radio de pincel, escala, opacidad, color, visibilidad, emision y radio de luz.
- No modificar el formato `.ttrpgscene`; las fases y colocacion decorativas se regeneran desde el id sin serializar sprites.

## Criterios de aceptacion

- Circulos, anillos y areas pintadas muestran llamas completas en sus bordes, sin patron coordinado ni perdida de transparencia.
- Movimiento y seleccion no reinician animacion ni alteran la forma pintada.
- Controles, iluminacion y guardado/carga existentes siguen funcionando.
- Regiones grandes agrupan espacialmente la decoracion y aumentan el tamano de llamas en vez de crear sprites ilimitados.
- Destruir efectos elimina sus suscripciones; cargar un mapa no reutiliza contenedores destruidos.
- Los assets antiguos permanecen disponibles como respaldo, sin llamadas desde el render.

## Controles de fuego a cualquier zoom

- Aplicar escala minima visual compartida a trazos, manivelas e hit testing sin cambiar zona, escala fisica ni radio de luz.
- Para fuego circular: manivela naranja del fuego a la derecha; manivela amarilla de luz arriba. Priorizar la manivela mas cercana antes del aro mas cercano para distinguir radios iguales.
- No introducir aros de resize para fuego pintado ni marcos naranjas en sus celdas.
- Los controles siguen privados de DM y el fuego figura en el arbol lateral de Efectos (spec 06).
- Zoom/pan no reinicia fases ni reconstruye el atlas de animacion.

## Cierre 1.9.0

Los cambios de controles de efectos, arbol de objetos y/o grilla descritos en las extensiones de esta especificacion fueron aceptados por el usuario el 2026-09-02 para cierre en main. El plan registra la verificacion realizada; los pendientes historicos ajenos a estas extensiones no se consideran ejecutados por este cierre.
