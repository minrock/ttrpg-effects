# Spec 37 - Tiradas 3D abiertas y ocultas del DM

## Estado

Implementado y aceptado por el usuario el 2026-10-24 para cierre en la version minor 2.8.0. Verificacion de entrega en el plan.

Rama autorizada: `feature/dm-dice-rolls`. Base de producto: 2.7.0; entrega 2.8.0. Commit, publicacion en GitHub y DMG autorizados. La integracion en main requiere confirmacion separada; registrar su resultado en el plan. Evidencia y limites de verificacion en el plan.

Extension del 2026-10-25: sonido de rodado implementado para revision, posterior al instalador 2.8.0 ya generado. No forma parte de ese binario ni implica nueva autorizacion de commit, push o release.

Extension del 2026-10-28: tamano visual configurable de dados, especialmente en Player View, aceptado para implementacion y entrega patch 2.8.1 por solicitud expresa del usuario. Incluye el sonido pendiente de la revision anterior. Plan tecnico y verificacion en la revision 23 del plan; integracion en main no autorizada en esta entrega.

Decisiones confirmadas por el usuario:

- El resultado del d20 se presenta separado del total de dano.
- El historial existe solamente durante la sesion de la aplicacion, y sobrevive a la navegacion entre mapas.

Referencia visual: laboratorio temporal `tmp/dice-lab.html` y [3d.dev](https://3d.dev/). El laboratorio no es una dependencia de produccion. Plan asociado: [plan.md](./plan.md).

## Objetivo

Permitir al DM preparar y lanzar dados 3D directamente sobre el mapa, decidir si la tirada es abierta u oculta, agrupar los dados por tipo de dano y consultar un historial privado. Conservar la calidad visual del laboratorio sin introducir una superficie que tape el mapa ni modificar reglas de combate.

## Alcance

- Dados d4, d6, d8, d10, d12, d20 y d% representado por dos d10, uno de decenas y otro de unidades.
- Pestanas `Propiedades` y `Dados` en el panel derecho del DM.
- Tiradas abiertas en DM y Player View; ocultas exclusivamente en DM.
- Cantidades por dado y grupo de dano; subtotales y total de dano.
- Dos modos equivalentes de composicion: dados con modificador final por grupo, o formula por tipo de dano. Color automatico representativo del dano en ambos tableros.
- Un chequeo d20 opcional y exclusivo por lanzamiento, normal, con ventaja o con desventaja, con modificador propio.
- Celebracion visual de 20 natural conservado: rayos alrededor de ese dado y texto `Crítico`, con privacidad por tirada.
- Color, material, fuerza, control del resumen en Player View e historial privado de sesion.
- Animacion y resultados consistentes entre ventanas con diferentes tamanos y camaras.
- Sonidos locales de uno o varios dados sincronizados con sus rebotes, con control para silenciar.
- Tamano visual independiente para DM y Player View, ajustable por el DM para mejorar la lectura de las caras en la mesa proyectada.

Fuera de alcance: tiradas iniciadas por jugadores, red/multijugador remoto, formulas con funciones/parentesis/multiplicacion/division/dados negativos, macros, dados explosivos, aplicar dano o resistencias a tokens, duplicar automaticamente el dano critico o determinar aciertos/fallos, iniciativas, multiples chequeos d20 en una tirada, guardar/exportar logs, volver a reproducir una tirada historica, hacer publica posteriormente una tirada oculta y arrastrar dados individuales con el mouse.

## 1. Panel derecho

### Pestanas

- `Propiedades` conserva los controles actuales, incluidos los accordions generales y las propiedades del objeto seleccionado. Es la pestana inicial.
- `Dados` muestra el nuevo panel. Alternar pestanas no pierde la seleccion de dados, sus grupos, preferencias ni historial.
- Ocultar el panel no cancela una tirada ni borra su resultado.
- Seleccionar explicitamente un objeto del mapa abre `Propiedades`, preservando el comportamiento contextual existente. La llegada de un resultado no cambia la pestana por cuenta propia.
- El contenido no se duplica en el pVaanel izquierdo ni en Player View.

### Orden vertical en Dados

1. Propiedades de la tirada y visualizacion: abierta/oculta, resultado para jugadores, acabado/color, material, fuerza, tamano DM/Player y sonido.
2. Seleccion de dados: modo Por dados/Formula, grupo de dano activo, cantidades y modificador o formula, resumen de grupos y selector independiente de d20.
3. Boton `Lanzar`, con resumen de lo que se va a lanzar y su visibilidad.
4. Historial de tiradas, recientes primero.

El panel tiene scroll propio, ancho estable y controles compactos del sistema visual actual. Usar iconos Lucide y tooltips para sumar, restar, quitar grupo y limpiar seleccion; swatches para colores, select para grupos/materiales y controles accesibles para opciones excluyentes. No trasladar el layout de pantalla completa del laboratorio al sidebar.

## 2. Propiedades de la tirada

| Propiedad | Comportamiento |
| --- | --- |
| Visibilidad | Opciones excluyentes `Abierta` y `Oculta`, con ojo/ojo cerrado e indicacion textual junto a Lanzar. Valor inicial propuesto: Oculta. |
| Mostrar resultado a jugadores | Disponible en tirada abierta. Controla etiquetas numericas, subtotal por grupo, resultado d20 y total de dano en Player View; no afecta al resumen privado del DM. Inicialmente desactivado. |
| Color | Automatico por tipo de dano para grupos tipados. `Por tipo de dado` o un swatch manual afectan solo a Sin tipo y al chequeo d20; el control se identifica como Color sin tipo / d20. |
| Material | `Resina`, `Mate` o `Metal`. Resina por defecto. |
| Fuerza | Slider con valor numerico, rango inicial 0.5 a 1.6 y default 1.0, como el laboratorio. Afecta al lanzamiento fisico, no suma un modificador. |
| Sonido de dados | Activado por defecto en la ventana DM, silenciable incluso durante una tirada. Preferencia local de sesion, independiente de la configuracion y resultados de la tirada. |
| Tamano en DM / Tamano en Player | Dos sliders independientes con porcentaje visible, en propiedades de Dados, despues de Fuerza. De 100% a 250%, pasos de 25%, inicial 100% en ambas vistas. Cada uno permite restablecer 100% mediante icono con tooltip y nombre accesible. |

Paleta inicial propuesta: rubi, carmesi, coral, naranja, ambar, oro, lima, jade, esmeralda, cian, azul, violeta, rosa, blanco, plata y grafito. Se conserva la opcion multicolor por tipo. Las caras deben tener contraste suficiente con todos los colores/materiales; el metal no puede volver ilegibles los numeros.

No existe selector de superficie: el fondo es el mapa actual. No se dibuja tapete, bandeja opaca ni imagen de mesa. Los dados conservan volumen, sombras discretas y rebotes.

Las preferencias afectan a futuras tiradas y se mantienen durante la sesion. Cambiarlas no altera los resultados historicos. Durante la preparacion/animacion se congela la configuracion de esa tirada; los controles de composicion quedan temporalmente deshabilitados, sin bloquear las herramientas del mapa. Excepciones de presentacion: el sonido puede silenciarse durante el rodado y el tamano puede actualizar los dados ya asentados segun la seccion 6.

## 3. Composicion y tipos de dano

- El panel comienza sin dados seleccionados. `Lanzar` esta deshabilitado si no hay dados ni chequeo d20.
- d4, d6, d8, d10, d12 y d% usan cantidad con botones menos/mas e input numerico entero no negativo.
- Antes de agregar dados, el DM elige el grupo de dano activo. Los controles editan exclusivamente las cantidades de ese grupo, no las de todos los grupos combinados.
- Se puede combinar, por ejemplo, Fuego `2d6 + 3d4 + 2`, Frio `1d8 - 1` y Sin tipo `1d4`.
- El mismo dado puede aparecer en varios grupos. Elegir otro grupo no reasigna los dados ya agregados.
- Catalogo inicial: Sin tipo, Acido, Contundente, Cortante, Perforante, Fuego, Frio, Fuerza, Necrotico, Psiquico, Radiante, Relampago, Trueno y Veneno. Son etiquetas de agrupacion, sin reglas de resistencias o vulnerabilidades.
- Cada tipo tiene un unico grupo agregado. Seleccionarlo de nuevo permite editarlo; no crea duplicados. Los grupos vacios no forman parte de la tirada.
- El resumen muestra tipo, color, formula y cantidades; permite seleccionar un grupo para editarlo, cambiar su tipo o eliminarlo. Si se cambia al tipo de otro grupo existente, sumar sus cantidades y modificadores sin perder dados ni IDs unicos.
- `Sin tipo` admite tiradas genericas. El resultado muestra `Total de dados` si no hay ningun grupo de dano tipado; si lo hay, muestra `Total de dano`, incluyendo el subtotal Sin tipo cuando exista.
- Se conserva la composicion al terminar, para repetirla con nuevos resultados. Limpiar seleccion no borra el historial.
- Limite inicial: 24 piezas fisicas por lanzamiento de dano, contando cada d% como dos. Un chequeo usa una o dos piezas d20 y no consume el presupuesto de dano preparado. Avisar antes de excederlo; no recortar cantidades silenciosamente.

### Modos de composicion

- Selector horizontal `Por dados` / `Formula`. Ambos representan los mismos grupos; alternar conserva cantidades y modificadores, sin lanzar ni cambiar resultados anteriores.
- Por dados: controles existentes y campo `Modificador final` debajo de las cantidades. Es un entero con signo entre -9999 y 9999 aplicado una sola vez al grupo activo, no a cada dado ni al d20. Cero por defecto.
- Formula: campo para el tipo activo, por ejemplo `2d6 + 3d4 + 2`. Cambiar de tipo conserva las otras formulas. Se aceptan d4, d6, d8, d10, d12, d% y d100 (alias de d%), D mayuscula, espacios, cantidad omitida como uno, suma de dados y suma/resta de constantes enteras. Terminos repetidos se consolidan; la representacion canonica ordena dados y deja un unico modificador al final.
- Maximo 256 caracteres por formula. Rechazar texto sobrante, expresiones incompletas, cantidades no positivas, dados no soportados y operadores fuera de alcance. `d20` indica usar el chequeo independiente, nunca se suma al dano por formula.
- Errores junto al campo y acceso al grupo invalido aunque no sea el activo. Mientras alguna formula o modificador de dano sea invalido, no lanzar dano ni cambiar a otro modo usando silenciosamente una composicion anterior. Esto no bloquea el chequeo d20 independiente ni borra el texto de dano pendiente. Limpiar seleccion tambien limpia textos invalidos.
- Una formula vacia retira el grupo. Un modificador sin dados puede conservarse como dano fijo si hay otra pieza fisica de dano en la tirada; no se puede lanzar una seleccion compuesta solamente de constantes. Los grupos de dano fijo tampoco se resuelven durante un chequeo d20.
- Subtotal = suma de caras del grupo + modificador. El total suma subtotales; el d20 permanece separado. No hay clamp a cero ni reglas automaticas de combate. Formula, modificador y desglose aparecen en historial/resumen autorizado.
- Ejemplo de aceptacion: Acido `3d6 + 5` con caras 4, 3 y 5 produce 17 de Acido, no 12. Frio `2d4 - 1` con caras 2 y 4 produce 5 de Frio. Juntos totalizan 22, sin sumar el chequeo d20. DM, Player autorizado e historial deben coincidir. Si el motor de Electron no soporta el contrato vigente, bloquear el lanzamiento y pedir guardar/reiniciar, nunca descartar el modificador silenciosamente.

### Identidad visual del dano

- Todos los poliedros del mismo tipo de dano comparten color, incluyendo ambas piezas de cada percentil. Cambiar el tipo actualiza el color de futuras tiradas, no una tirada ya lanzada.
- Paleta: Fuego naranja `#ec632b`, Frio cian hielo `#65c5e7`, Acido lima `#b4cb35`, Veneno verde `#359d64`, Relampago azul `#408cf0`, Trueno indigo `#6977c6`, Radiante oro `#efc851`, Necrotico verde oscuro `#40533f`, Psiquico rosa `#d967a5`, Fuerza violeta `#b26fdf`, Contundente gris azulado `#8594a3`, Cortante plata `#d3dce1`, Perforante cobre `#c79964`.
- Conservar material/fuerza y contraste de las caras. Mostrar swatches junto al grupo y su resultado; el texto del tipo siempre acompana al color. En una tirada abierta el color tambien se ve sin resumen numerico; una oculta no publica colores ni datos al jugador.

### Percentil

Un d% ocupa dos piezas identificadas como decenas y unidades, pero produce un solo valor de 1 a 100 dentro de su grupo. Mostrar el desglose en el log: `d% 64 (60 + 4)`. `00 + 0` es 100; `00 + 7` es 7; `90 + 0` es 90. Varios percentiles conservan parejas estables; un d10 independiente nunca se mezcla con sus unidades.

## 4. d20 normal, ventaja y desventaja

- d20 no tiene botones de incremento/decremento ni cantidad editable. Se activa o desactiva un unico chequeo independiente de los grupos de dano.
- Al activarlo se deshabilitan visualmente los controles de dano, sin borrar grupos, cantidades, formulas ni sus modificadores. `Lanzar` ejecuta solo el chequeo. Al desactivarlo se recupera la composicion de dano anterior, sin incluir d20 ni su modificador.
- Mostrar el input `Modificador d20` solamente cuando el chequeo esta activo. Entero con signo entre -9999 y 9999, cero por defecto e independiente del modificador de cada grupo de dano. Conservar su ultimo valor valido al alternar; `Limpiar seleccion` lo reinicia a cero. Una entrada incompleta/invalida bloquea solo el chequeo mientras este activo.
- Si esta activo, al pulsar `Lanzar` se abre un dialogo compacto para elegir `Normal`, `Con ventaja` o `Con desventaja`. Normal es la opcion inicial en cada nueva confirmacion; no heredar ventaja accidentalmente.
- El dialogo identifica la visibilidad elegida y el modificador no nulo, y ofrece confirmar o cancelar. Escape/cancelar no lanza dados, no publica eventos ni agrega una entrada al log.
- Normal lanza un d20. Ventaja y desventaja lanzan dos dados fisicos y conservan, respectivamente, el mayor o el menor.
- En un empate, se conserva uno con criterio estable y el resultado numerico no cambia. El segundo no se suma.
- Aplicar el modificador una sola vez despues de elegir la cara: resultado del chequeo = cara conservada + modificador d20. No limitar el total a 1..20 ni aplicar modificadores de dano. Las caras impresas y la seleccion de ventaja/desventaja mantienen sus valores naturales.
- El log y el resumen DM muestran las caras naturales, conservada/descartada, modificador con signo y total del chequeo destacado. Player View recibe ese desglose solo si se muestran resultados. No mostrar total de dano ni grupos durante un chequeo.
- Un pool de dano preparado de 24 piezas no impide lanzar un chequeo con ventaja/desventaja: solo se simulan los dos d20.
- Sacar 1 o 20 no determina automaticamente acierto/fallo ni multiplica dano. El 20 natural conservado activa solamente la celebracion visual siguiente; las reglas de juego siguen siendo del DM.

Ejemplo: con Fuego y Frio preparados, activar d20 con modificador +3 y elegir ventaja. Solo se lanzan dos d20, caras 5 y 17; se conserva 17 y se muestra total 20 (+3, 5 descartado). Fuego/Frio permanecen preparados y no se lanzan ni suman. Con desventaja se conserva 5 y el total es 8.

### Celebracion de 20 natural

- Solo la cara natural conservada igual a 20 activa la celebracion. Un total 20 obtenido con 17 + 3 no la activa; 20 - 4 si la activa. En desventaja, un 20 descartado no cuenta. Con dos 20 se celebra una sola vez alrededor del dado conservado por el criterio estable.
- Al asentarse, aparecen rayos animados por encima del dado conservado, extendiendose a su alrededor, y la palabra `Crítico` sobre el viewport del mapa. Una abertura circular pequena centrada en el dado permite leer el 20 impreso; su diametro equivale al 36% de la menor dimension proyectada del dado. No despejar toda la cara ni crear el anillo grande anterior: los rayos siguen cruzando el resto del dado. Las etiquetas numericas autorizadas quedan por encima de los rayos; el texto no cubre controles ni el resumen. Sin sonidos ni flashes de pantalla completa.
- Dura tres segundos desde el instante compartido de reposo, con entrada/salida suaves. Solo termina la celebracion: los dados y resultados siguen hasta cerrar con la X del DM, reemplazarlos o cambiar de contexto.
- Oculta: solamente DM. Abierta: DM y Player View, incluso si el resumen numerico esta desactivado. El aviso de critico es independiente del permiso para mostrar totales; no publica modificadores ni historial.
- Redimensionar, alternar el resumen o recibir el mismo evento no reinicia el efecto. Abrir/restaurar Player durante esos tres segundos muestra solamente el tiempo restante; despues muestra los dados finales sin repetir la celebracion. Republicar un resultado historico estatico tampoco la repite.
- Cerrar la tirada, reemplazarla o navegar retira texto y rayos siguiendo las mismas reglas de privacidad del overlay. Una oculta no modifica una celebracion publica distinta.
- Con movimiento reducido: halo de rayos estatico y texto, sin parpadeo ni movimiento, con la misma duracion. Un fallo WebGL no impide mostrar el aviso textual autorizado.

### Sonido del rodado

- Sonidos grabados de dados contra una superficie, con bancos diferentes para una pieza fisica y varias. Un d% y un chequeo con ventaja/desventaja usan el banco de varios; un chequeo normal usa el de uno aunque haya dano preparado.
- El sonido sigue los contactos de la trayectoria, no comienza un loop continuo al pulsar Lanzar. Variar suavemente muestra/velocidad y volumen segun el impacto, con volumen acotado independiente del numero de piezas. No sonar durante preparacion fallida/cancelada, vuelo inicial o reposo.
- Terminar al asentarse, cerrar, reemplazar la tirada, cambiar de mapa/escena o cerrar DM. Mantener los dados sobre el mapa no mantiene sonido. Pan, zoom, resize y alternar resumen no reinician audio; tampoco una tirada historica o una presentacion recuperada ya terminada.
- Desactivar `Sonido de dados` detiene el audio pendiente inmediatamente; reactivarlo afecta al siguiente lanzamiento y no repite contactos de la tirada anterior.
- Salida inicial elegida: solo DM para evitar audio duplicado de las dos ventanas en el mismo equipo. Player View no reproduce ni recibe instrucciones de audio, incluso en tiradas abiertas. Las ocultas conservan privacidad de payload. Esto no aisla acusticamente unos altavoces compartidos: silenciar o usar auriculares para que otros no oigan una tirada privada.
- Audio empaquetado y disponible sin red; usar recursos con licencia compatible incluida. Un fallo de carga, decodificacion o dispositivo no bloquea la animacion ni el resultado. No altera formato de escena, protocolo de dados ni historial.
- La celebracion de critico sigue sin sonido propio; este audio es exclusivamente el rodado previo al reposo.

## 5. Visibilidad y confidencialidad

| Tirada | DM | Player View |
| --- | --- | --- |
| Oculta | Animacion, caras, valores, subtotales y log. | Ningun dado, resultado, sonido, aviso ni evento de esa tirada. |
| Abierta sin resultado | Animacion, caras, valores, subtotales y log. | Animacion y caras impresas; celebracion de 20 natural cuando corresponde. Sin etiquetas numericas, resumen ni total superpuesto. |
| Abierta con resultado | Animacion, caras, valores, subtotales y log. | Misma tirada y resumen de valores, d20 y grupos de dano. Sin historial ni herramientas de edicion. |

**Ocultar el resumen de una tirada abierta no oculta los numeros impresos en sus caras.** Para impedir que los jugadores conozcan una tirada se usa Oculta. Esta distincion debe ser clara en el nombre/ayuda accesible del control, sin agregar instrucciones extensas sobre el mapa.

- La visibilidad queda fijada al confirmar el lanzamiento; no puede cambiarse mientras rueda.
- El DM puede activar/desactivar el resumen de la ultima tirada abierta desde su entrada en el log, sin volver a lanzar. Si los dados ya fueron retirados, mostrarlo de nuevo presenta un resumen estatico sin caducidad, no repite la animacion; se retira con el mismo control del log.
- Esa accion solo esta disponible para la ultima tirada abierta de la escena y mapa actualmente visibles; navegar no publica resultados viejos. Cambiar la preferencia del formulario solo afecta a la proxima tirada.
- Una tirada oculta nunca se publica con el control de resumen. Su entrada no tiene esa accion.
- El historial completo permanece privado. Nunca enviarlo a Player View para despues ocultarlo con CSS.
- Una tirada oculta no limpia ni reemplaza una tirada abierta que el jugador aun este viendo. Cerrar su resumen privado tampoco retira una tirada publica diferente.
- Si Player View esta cerrada, el DM puede lanzar normalmente. No se abre automaticamente ni se retrasa el resultado esperandola.

## 6. Dados sobre el mapa

- Overlay 3D transparente, restringido al viewport del mapa y por debajo de menus/modales y controles flotantes. No cubre los paneles laterales.
- Los dados no son objetos del mapa: no se guardan, no ocupan casillas, no colisionan con tokens y no cambian de escala u orientacion al hacer pan, zoom o rotar el norte.
- El mismo lanzamiento y caras finales se ven en ambas ventanas. El encuadre se adapta al espacio disponible sin deformar poliedros ni recortar piezas, aunque las ventanas tengan distinta proporcion o camaras desincronizadas.
- Sombras propias sutiles; no iluminan ni modifican el mapa. Niebla, oscuridad, darkvision y filtro de hora permanecen intactos debajo. Los dados se ven por encima de esas capas sin revelar terreno oculto.
- El overlay no intercepta click, rueda, drag o shortcuts del mapa, salvo el boton de cierre del resumen DM. El formulario, su dialogo y ese boton capturan sus eventos sin disparar herramientas/atajos de fondo.
- Una tirada ocupa la mesa virtual por vez. Una nueva tirada reemplaza la anterior en DM y, solo si es abierta, en Player View.
- Permanencia: sin cierre automatico. Los dados quedan en su pose final en los tableros mientras el resumen siga abierto. El DM lo cierra mediante una X Lucide, centrada en un boton discreto de la esquina superior derecha, con tooltip y nombre accesible.
- Cerrar el resumen DM retira los dados y el resumen de esa misma tirada en DM y Player View, incluso si el DM no habia mostrado el resumen al jugador. No borra el historial ni afecta tiradas distintas. Player View sigue siendo de solo lectura; no decide el cierre de la mesa.
- Una nueva tirada o cambiar de mapa/escena siguen reemplazando/retirando las presentaciones segun las reglas de privacidad. No es obligatorio cerrar el resumen para volver a lanzar.
- En composiciones de mas de tres grupos, el resumen sobre el mapa compacta los valores individuales: conserva formula, subtotal por tipo, d20 y total. Todo modificador distinto de cero conserva una linea explicita `Modificador +N` o `Modificador -N` por grupo, tanto en modo compacto como detallado, DM y resumen autorizado del Player. El subtotal ya lo incluye una sola vez; no volver a sumarlo al presentar. El desglose completo permanece en el historial. Se reserva espacio para el resumen, incluidas estas lineas, antes del lanzamiento para no tapar los dados al terminar.
- Tambien se permite lanzar sobre el canvas vacio antes de cargar el primer mapa; la privacidad y sincronizacion se mantienen.
- Cambiar de mapa/escena retira el overlay y cancela la publicacion pendiente del contexto anterior; no borra el historial. Si el resultado ya se resolvio, se conserva sin relanzar. Si se cancelo antes, se registra como interrumpida, sin inventar un resultado.
- Abrir/reabrir Player View muestra solo una tirada abierta aun vigente para ese contexto, en su instante actual o resultado final. No reproduce tiradas pasadas ni ocultas.
- Redimensionar, minimizar/restaurar o cambiar de pestana no recalcula resultados ni hace otra tirada.
- Un fallo de render no vuelve negra la mesa ni borra la escena. Conservar el resultado ya resuelto y mostrarlo como resumen textual a quien corresponda; avisar al DM del fallo visual.

### Tamano configurable por vista

- El DM controla por separado `Tamano en DM` y `Tamano en Player` desde el panel derecho, pestana Dados. Aumentar Player no agranda el tablero privado del DM ni agrega controles a la pantalla del jugador. Ambos ajustes estan disponibles aunque Player este cerrado o la siguiente tirada sea oculta.
- El porcentaje expresa escala visual lineal respecto del tamano base actual de cada viewport: 200% busca duplicar ancho y alto de cada dado, no solo su area ni el espacio total del overlay. Se aplica a todos los poliedros, incluidas ambas piezas de d%, conservando sus proporciones y la legibilidad de las caras. No es zoom del mapa ni depende de su grilla, norte o camara.
- La preferencia se mantiene durante la sesion al cambiar de mapa/escena, alternar paneles, redimensionar y cerrar/reabrir Player View. No se guarda por mapa, en `.ttrpgscene` ni como parte del resultado historico. Una reapertura usa el ultimo tamano elegido para Player, sin publicar tiradas ocultas.
- El cambio afecta a futuras tiradas y tambien, de inmediato, a los dados ya asentados y aun visibles en la vista correspondiente. No requiere relanzar, no cierra el resumen y no reproduce sonidos ni reinicia la celebracion de critico. Si no hay dados visibles, solo conserva la preferencia. Mientras haya una tirada preparandose o rodando en cualquiera de las vistas, ambos controles permanecen deshabilitados para evitar saltos de escala durante la animacion.
- Es un ajuste exclusivamente visual: no altera fuerza, caras, seleccion de ventaja/desventaja, modificadores, totales, duracion ni historial; no vuelve a ejecutar la simulacion fisica. Una tirada abierta conserva los mismos dados y resultados aunque DM y Player utilicen tamanos distintos.
- Mantener dados dentro del viewport util, fuera de paneles y del resumen, sin recortarlos ni provocar nuevas superposiciones al agrandarlos. En ventanas pequenas o tiradas numerosas, limitar la ampliacion al maximo que permita el encuadre y mostrar el porcentaje efectivo junto al solicitado si difieren, de forma discreta en la vista afectada. Conservar el valor solicitado para recuperarlo cuando haya espacio; no reducirlo silenciosamente ni anular una ampliacion que si cabe. Durante el rodado se encuadra la trayectoria completa sin variar por frame; al asentarse se aprovecha el espacio de las posiciones finales. Con una o dos piezas, aumentar a 200% debe producir una diferencia claramente visible cuando el viewport lo permita.
- Recalcular posicion de etiquetas, sombras y bounds de la celebracion sobre el dado agrandado, manteniendo la abertura proporcional que deja leer el 20. No ampliar el toast, los paneles, el texto `Crítico` ni otros controles junto con la geometria. El resumen sigue respetando el permiso del DM y su cierre manual.
- Aplicar el cambio sin iniciar un render continuo en reposo ni redibujar el mapa. Validar uno, dos, ocho y 24 dados, viewport horizontal/vertical y distintas resoluciones. Rango 100%..250% aceptado con la orden de implementar; valor inicial 100% en ambas vistas.

## 7. Historial del DM

- Debajo de Lanzar, listado reciente primero, con scroll/paginacion para no hacer crecer indefinidamente el DOM.
- Cada entrada incluye hora, escena/mapa de origen, abierta/oculta, formula por grupo, valores individuales, percentiles, modo d20, conservado/descartado, subtotales y total separado del d20.
- Guardar una instantanea del lanzamiento: editar grupos o preferencias despues no modifica entradas anteriores.
- Propuesta de retencion: ultimas 500 tiradas durante la ejecucion actual de la app; al superar el limite se descartan las mas antiguas y la UI indica ese limite.
- Cambiar mapa o escena no borra entradas. El historial no pertenece a un mapa ni a un archivo `.ttrpgscene`.
- Cerrar Player View no lo borra. Recargar accidentalmente el renderer DM durante la misma ejecucion debe poder recuperar el log de memoria; cerrar la aplicacion lo elimina.
- No se guarda en SQLite, archivos de escena, recuperacion automatica, localStorage ni logs de diagnostico de produccion.
- El DM puede limpiar el historial con confirmacion. Esto no lanza ni publica dados y no modifica la escena.

## 8. Rendimiento y accesibilidad

- Conservar el aspecto y movimiento del laboratorio usando un motor probado. No sustituirlo por un GIF ni por numeros aleatorios desconectados de las caras visibles.
- Calcular una tirada una sola vez y reproducirla en cada ventana. No simular resultados independientes ni enviar snapshots completos de escena por frame.
- Preparar recursos sin bloquear pan/zoom; reutilizar geometria y texturas; detener el bucle 3D cuando los dados quedan inmoviles. Mantenerlos visibles no ejecuta fisica ni render continuo; al cerrar se liberan las piezas y referencias a su replay.
- La celebracion usa una superficie 2D pequena, transparente y acotada alrededor del dado. No mantiene el mapa ni la escena 3D en render continuo, no agrega efectos persistentes al mapa ni mensajes por frame. Detener sus callbacks al caducar, cerrar o quedar oculta la ventana.
- Presupuesto inicial de validacion: 1, 8 y 24 piezas, mapa grande y DM/Player simultaneos. Medir tiempo de preparacion, frame time y memoria; no dar por aprobado el rendimiento por funcionar en el laboratorio vacio.
- Si falta WebGL o se pierde el contexto, el log y resumen autorizado siguen disponibles. Nunca alterar o repetir un resultado silenciosamente para resolver un problema visual.
- Tab/Shift+Tab, flechas en tabs y Escape funcionan; foco visible, tooltips, etiquetas accesibles y aviso de resultados al terminar, no por frame.
- Respetar movimiento reducido con presentacion final directa o transicion breve, conservando exactamente el mismo resultado y privacidad.

## 9. Persistencia y compatibilidad

Sin cambios en `.ttrpgscene`, sus migraciones, guardado, dirty state o undo del mapa. Dados y log son de sesion; las tiradas no fuerzan guardados.

La implementacion es compatible y se entrega como version minor 2.8.0, autorizada por el usuario. No cambia el formato de escena ni requiere migracion.

## 10. Criterios de aceptacion

1. Existen tabs Propiedades/Dados; las herramientas actuales y su seleccion contextual siguen funcionando.
2. El panel respeta el orden propiedades, seleccion, Lanzar, historial, sin selector de superficie.
3. Todos los tipos de dado funcionan; el percentil usa dos piezas correctamente emparejadas.
4. Los dados se asignan y suman por tipo de dano; cambiar el grupo activo no reasigna los anteriores.
5. El d20 no permite incrementos y pregunta Normal/Ventaja/Desventaja al lanzar; solo simula ese chequeo, conserva la cara correcta y suma una vez su modificador propio. El input solo aparece al activar d20; los grupos de dano se preservan sin lanzarse.
6. Una tirada oculta no deja payload, sonido, DOM, estado recuperable ni aviso en Player View.
7. Una tirada abierta tiene los mismos dados/resultados en DM y Player, con el resumen visible solo cuando el DM lo decide.
8. Ocultar el resumen no se confunde con ocultar la tirada; las caras abiertas siguen visibles.
9. Colores ampliados y materiales mantienen numeros legibles; fuerza cambia el movimiento, no la aritmetica.
10. El overlay respeta mapa, camaras, norte, oscuridad, fog, controles y diferentes proporciones de ventana.
11. El historial privado mantiene desglose y contexto durante la sesion, incluso al navegar, y no se persiste al cerrar la app.
12. Cancelar el dialogo no tira; doble click no duplica; una nueva tirada usa un nuevo ID y resultado, aunque repita composicion.
13. Redimensionar/reabrir Player o recibir un evento repetido no relanza ni altera la tirada.
14. Los fallos visuales no bloquean ni vuelven negro el mapa; se conserva el resultado valido.
15. Verificacion automatizada, smoke Electron y mediciones de rendimiento registrados en el plan antes de solicitar cierre.
16. Transcurrir tiempo no retira dados ni resultados. La X del DM los retira en ambas vistas para esa tirada, conserva el log y no cierra una tirada mas reciente por un evento atrasado.
17. Por dados y Formula producen la misma composicion y totales, con modificadores por dano y limite de 24 piezas de dano. Texto invalido nunca lanza una composicion de dano anterior ni bloquea el chequeo d20 exclusivo.
18. Los dados de un mismo dano comparten color en DM/Player; el resumen y log conservan formula, modificador y subtotal, sin alterar la privacidad.
19. Solo un 20 natural conservado activa rayos y `Crítico`: probar normal, ventaja, desventaja, empate, 17+3 y 20-4. Oculta solo DM; abierta ambas vistas aun sin resumen numerico.
20. La celebracion termina a los tres segundos sin retirar dados; cierre anticipado, resize, reapertura tardia, movimiento reducido y cambio de visibilidad del resumen no la prolongan ni la repiten.
21. El DM puede agrandar Player sin modificar su propia vista, y viceversa. Con espacio suficiente, 200% duplica aproximadamente las dimensiones proyectadas respecto de 100%; restablecer recupera el tamano base. Cubrir todos los poliedros y d%.
22. Cambiar el tamano con dados asentados actualiza su presentacion sin relanzar, alterar valores, cerrar resultados, reproducir audio ni reiniciar rayos. Durante preparacion/rodado los controles estan deshabilitados; zoom, norte y camara del mapa no cambian el ajuste.
23. En tiradas de hasta 24 piezas y ventanas horizontales/verticales no se recortan dados ni se invaden resumen/controles. Si se limita la ampliacion, se informa el porcentaje efectivo conservando el solicitado. Reabrir Player y navegar entre mapas conservan su preferencia durante la sesion, sin revelar tiradas ocultas.

## 11. Defaults aceptados

La orden de implementar acepta los defaults documentados: tirada oculta inicial, 16 colores mas multicolor, tres materiales, 24 piezas y 500 entradas de sesion. La revision posterior del usuario sustituye la permanencia temporal por cierre manual del resumen con X. El d20 queda separado del dano y no hay persistencia del historial. Experiencia aceptada para cierre 2.8.0, incluidos los ajustes posteriores de formulas, modificadores y celebracion del critico.
