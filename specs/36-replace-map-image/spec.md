# Spec 36 - Actualizar la imagen de un mapa existente

## Estado

Implementado y aceptado por el usuario para cierre 2.7.0, merge a main, publicacion y DMG el 2026-10-22. Extiende las specs 04 (mapa y grilla) y 29 (escenas con multiples mapas).

Politica aceptada: conservar el tamano mundial cuando sea posible, sin transformar marcadores ni deformar la imagen.

## Objetivo

Permitir que el DM sustituya la imagen de un mapa ya preparado dentro de una escena, sin crear otro mapa ni perder el trabajo realizado sobre el original. Actualizar el arte de fondo debe ser una operacion distinta de `Agregar mapa` e `Importar a escena`.

## Alcance

- Actualizar cualquier mapa de la escena, activo o inactivo, desde su fila en el navegador izquierdo.
- Elegir otra imagen local o volver a seleccionar el mismo archivo despues de editarlo externamente.
- Mantener identidad, orden, contenido y configuracion del mapa.
- Validar la imagen y confirmar el reemplazo antes de modificar la escena.
- Reflejar la nueva imagen en DM y Player View si corresponde al mapa activo.
- Guardar la referencia nueva con el flujo habitual de guardado de escena.
- Permitir reparar una ruta de imagen perdida, sin borrar el mapa que la referencia.

Fuera de alcance: editar el archivo original, observar cambios automaticamente en el filesystem, importar contenido de otra escena mediante esta accion, registrar versiones historicas de imagen, trasladar anotaciones mediante reconocimiento visual, corregir perspectiva, recortar o deformar imagenes y transformar automaticamente toda la geometria tactica.

## Acceso y flujo

1. Cada fila de `Escena > Mapas` ofrece un boton discreto con icono Lucide y tooltip `Actualizar imagen`, separado de eliminar y de arrastrar para ordenar. Su nombre accesible identifica el mapa.
2. La accion captura el mapa objetivo por ID. No lo activa ni cambia lo proyectado al jugador si era inactivo.
3. Se abre un selector de imagen local con los mismos formatos de carga: PNG, JPG/JPEG, WEBP y HEIC cuando el runtime pueda decodificarlo. No acepta `.ttrpgscene`.
4. Tras seleccionar, se muestra un modal de confirmacion con nombre del mapa, miniaturas anterior/nueva cuando esten disponibles, nombres de archivo, dimensiones conocidas y politica de tamano. Esta previsualizacion es privada del DM.
5. El DM elige `Actualizar imagen` o `Cancelar`. Ninguna imagen se aplica con solo seleccionarla. Cancelar el selector o el modal no cambia la escena ni muestra un error de carga.
6. Durante la preparacion se conserva el mapa anterior. No se permite confirmar dos operaciones simultaneas sobre el mismo mapa. Cambiar/cerrar la escena, eliminar el mapa o invalidar su revision cancela el resultado pendiente.
7. Si la preparacion y validacion terminan correctamente, se cambia la imagen del mismo mapa y se comunica el resultado. Si falla, se conserva el contenido anterior y se muestra un error recuperable.
8. El reemplazo cuenta como cambio de la escena y participa en la recuperacion local existente. El archivo `.ttrpgscene` solo se escribe mediante el flujo habitual de guardar; esta accion no fuerza un guardado automatico ni sobrescribe el archivo de imagen.

Abrir este flujo no confirma trazos a medio dibujar. Al aplicar sobre el mapa activo se cancelan borradores de herramientas y se vuelve a seleccion; las figuras ya confirmadas permanecen intactas.

## Informacion que se conserva

| Grupo | Garantia |
| --- | --- |
| Identidad | Mismo ID de mapa, nombre, posicion en la lista y mapa activo. No aumenta ni disminuye el numero de mapas. |
| Anotaciones | Mismos pines de habitacion, areas, textos, IDs, estados y coordenadas. |
| Conexiones | Mismos puntos y destinos, incluidas las referencias desde otros mapas. |
| Objetos | Mismos tokens, entidades referenciadas, etiquetas, formas, mediciones, luces y efectos. |
| Vision | Misma niebla revelada, obstaculos, oscuridad, darkvision y oscuridad magica. |
| Ambiente | Mismos filtros horarios y zonas pintadas; no borrar, desplazar ni volver a pintar sus mascaras. |
| Configuracion | Misma grilla, calibracion, unidades, snap, fondo y orientacion de brujula. |
| Camaras | Mismos centros y zoom DM/Player, bloqueo y estado sincronizado o auxiliar. No ejecutar ajuste automatico al mapa. |
| Escena | Otros mapas, notas, monstruos, NPCs, personajes, combate y contadores sin cambios. |

Solo cambian la referencia de imagen, sus metadatos de dimensiones y, si corresponde a la politica elegida, la escala de la imagen. Las coordenadas de los objetos siempre permanecen en espacio de mundo.

## Tamano, resolucion y alineacion

### Misma resolucion

Conservar posicion y escala exactas. Si la imagen nueva mantiene el encuadre de la anterior, los marcadores siguen alineados. Reemplazar el contenido en el mismo path debe mostrar los pixeles nuevos, no una textura cacheada.

### Otra resolucion con la misma proporcion

Opcion por defecto: `Conservar tamano actual`. Mantener el centro y el rectangulo mundial ocupado por la imagen, compensando su escala uniformemente. Por ejemplo, cambiar una imagen de 2000 x 1000 a 4000 x 2000 reduce a la mitad la escala visual, sin tocar la grilla ni mover un pin.

La escala calculada debe sobrevivir exactamente al guardado y recarga, sin redondeos acumulativos. Si excede los limites admitidos, no recortarla silenciosamente: explicar que no puede conservarse ese tamano y ofrecer cancelar o aplicar explicitamente `Mantener escala actual`.

### Otra proporcion, otro encuadre o dimensiones anteriores desconocidas

- No estirar la imagen para encajar ni mover los marcadores de forma automatica.
- Cuando cambia la proporcion, deshabilitar `Conservar tamano actual`: una escala uniforme no puede mantener ambos lados. Permitir continuar solo con confirmacion de `Mantener escala actual`, indicando que el fondo tendra otras dimensiones y puede requerir ajuste manual.
- Si falta la imagen anterior y no hay dimensiones fiables, aplicar la misma advertencia y alternativa. No deducir el tamano original de la camara o de la grilla.
- Un cambio de encuadre puede desalinear contenido incluso si las dimensiones coinciden. La comparacion visual permite revisarlo, pero el sistema no detecta ni corrige cambios semanticos en habitaciones o terreno.
- Mantener escala conserva `map.scale` y el centro; no significa poner la escala a 100%. Los controles existentes de posicion/escala siguen disponibles para ajustar el fondo despues.

## Player View y errores

- Solo se publica un reemplazo confirmado. Si se actualiza un mapa inactivo, Player View no navega a el; vera su imagen nueva cuando se active normalmente.
- En el mapa activo se mantiene la imagen anterior hasta tener preparada la nueva en cada ventana. No mostrar un fotograma sin oscuridad/niebla ni revelar areas ocultas durante la sustitucion.
- Conservar la rotacion del mapa y la alineacion de mascaras en todas las orientaciones de brujula.
- Un fallo de carga previo a aplicar en DM no cambia el documento. Si Player falla despues de la confirmacion, conserva su ultima representacion valida, permite seguir usando la ventana y comunica al DM el fallo para reintentar la carga, sin regenerar marcadores ni forzar sincronizacion de camara.
- Si no habia imagen disponible, conservar el estado recuperable del mapa y su contenido hasta elegir una imagen valida.
- Las rutas siguen siendo referencias locales. Si se sobrescribe externamente el archivo anterior, cancelar no puede restaurar sus bytes en disco; la operacion solo conserva el estado y los recursos que ya estuvieran cargados.
- Si varios mapas referencian el mismo archivo y este se edita externamente, todos leeran esos bytes al volver a cargarlo. El reemplazo no copia archivos para aislarlos; para actualizar un unico fondo de forma independiente se debe seleccionar una ruta nueva.

## Persistencia y compatibilidad

- Guardar la nueva ruta dentro del mismo mapa del `.ttrpgscene` y conservar el resto de su contenido.
- Dimensiones originales opcionales por imagen para mantener el tamano incluso cuando se vuelve a elegir un archivo sobrescrito externamente. Escenas existentes sin esos metadatos siguen abriendo y pueden completarlos cuando la imagen se decodifique con exito.
- No incluir imagenes binarias, texturas, miniaturas ni URLs temporales en el documento. No exigir migracion incompatible del formato 2.
- Si nunca se conocieron las dimensiones anteriores, no prometer recuperarlas despues de una sobrescritura externa. Se usa el flujo de advertencia anterior.

## Criterios de aceptacion

1. Actualizar una imagen con igual resolucion conserva exactamente marcadores, conexiones y ajustes; navegar fuera y volver no los pierde.
2. Una actualizacion de mayor resolucion y misma proporcion conserva el rectangulo mundial segun la politica aceptada, tambien tras guardar/reabrir.
3. Cambios de proporcion, limites de escala y dimensiones desconocidas requieren la confirmacion indicada, sin conversion silenciosa.
4. Reemplazar un archivo en la misma ruta refresca DM y Player sin recargar toda la escena.
5. Actualizar un mapa inactivo no cambia el activo ni la camara del jugador. Seleccionarlo despues muestra la imagen nueva.
6. Cancelacion, imagen corrupta/no soportada, permisos insuficientes y resultados asincronos obsoletos no eliminan ni modifican contenido.
7. Con fog, darkvision, filtro pintado, efectos y norte rotado, el reemplazo conserva la cobertura y no provoca pantalla negra, destellos de zonas ocultas ni saltos de camara.
8. Guardar/reabrir mantiene la nueva referencia bajo el mismo ID; conexiones de ida y vuelta siguen funcionando.
9. Agregar/importar mapas, ordenar por drag/drop, renombrar y eliminar conservan sus comportamientos actuales.

## Cierre 2.7.0

- Implementacion revisada y aceptada por el usuario.
- Commit, publicacion, merge a main y construccion de instalador autorizados el 2026-10-22. Ver resultados de verificacion en el plan.
