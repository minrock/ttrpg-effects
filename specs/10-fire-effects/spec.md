# Spec - Efectos de Fuego

Estado: implementado y aceptado, version 1.8.0.

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

- El fuego y las celdas cardinalmente adyacentes reciben luz brillante; la siguiente corona recibe luz tenue, excluyendo fuego y luz brillante de otros fuegos.
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
