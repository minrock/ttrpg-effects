# 55 — Mediciones y áreas compartidas con autor visible

**Estado:** Integrada en `main` mediante `90dc50e` (2026-11-04), versión 3.19.1. Sigue pendiente completar la validación PostgreSQL/visual indicada en [validacion.md](validacion.md).
**Fecha:** 2026-11-04. **Tipo:** funcionalidad compatible.
**Dependencias:** [07 Formas](../07-shapes-and-measurement/spec.md), [15 Player View](../15-player-window/spec.md), [39 Interfaz](../39-vtt-interface/spec.md), [41 Clientes](../41-contrato-clientes/spec.md), [44 Mesa](../44-mesa-sincronizada/spec.md), [49 Invitaciones](../49-invitaciones/spec.md), [50 Moderación](../50-moderacion/spec.md), [51 Servicio](../51-experiencia-servicio/spec.md).
**Trabajo factory:** sin asignar; implementación directa autorizada por el usuario. **Versión de entrega:** 3.19.1 (base funcional 3.19.0 más correcciones de interfaz). Cierre de rama autorizado por el usuario; evidencia de integración en [validacion.md](validacion.md).

## Problema y objetivo

En el servicio, un jugador puede medir y dibujar áreas, pero únicamente su ventana muestra esas herramientas. El DM y los demás jugadores no pueden seguir lo que está señalando. Se necesita compartir tanto el dibujo en curso como su resultado y mostrar quién lo está haciendo.

Ejemplo: Ana traza un camino de 30 ft; el DM y Bruno ven avanzar el recorrido y leen «Ana · 30 ft». Ana ajusta un punto o borra la figura y las otras ventanas reflejan el cambio. Bruno no puede modificarla. Otro jugador llamado Ana se distingue por el discriminador de su admisión.

## Base inspeccionada antes de implementar

En `3760968` / producto 3.18.1:

- `usePlayerTools` guarda figuras y borradores en estado React, con IDs `player-local-*` y operaciones puras de geometría.
- `PlayerApp` concatena `scene.shapes` y `tools.shapes`; `localEditableShapeIds` limita edición al conjunto propio. El preview del puntero se envía directamente al viewport.
- `moderation-http` permite al invitado solo `camera-report`, `ready` y `map-image-status` como acciones de mesa; no hay mutación de figuras invitadas.
- El transporte contextual HTTP/SSE ya aísla partida/apertura/generación/audiencia, revalida autoridad y limpia estado terminal.
- La spec 39 ordenó explícitamente no enviar las figuras locales al DM. Esta propuesta cambia esa regla **solo para los clientes del servicio**; no es un fallo de propagación de un evento ya existente.

Rutas concretas y verificación prevista en [plan.md](plan.md).

## Alcance

- Mediciones de línea y camino; áreas círculo, cuadrado, rectángulo y cono existentes en Player View.
- Crear, previsualizar mientras se dibuja o ajusta, confirmar, mover, editar propiedades geométricas, borrar y limpiar las figuras propias.
- Difusión automática al DM y a todos los jugadores autorizados de la misma apertura y mapa publicado, incluido el autor sin duplicar su preview.
- Identificación visible del autor dentro de las áreas o junto al centro de la línea/recorrido, sin reemplazar el valor de medición.
- Recepción en el editor DM, incluso con cámara independiente o controles ocultos. Retirada de dibujos por el DM sin alterar la escena.
- Navegador y Electron en modo servicio comparten el comportamiento.

No incluye dibujo libre nuevo, edición colaborativa de la misma figura entre autores, permisos para editar objetos DM, persistencia en DB/.ttrpgscene, historial de dibujos, chat, nuevos plugins o replicación entre servidores. Tampoco añade un modo temporal de dibujo del DM: sus figuras publicadas de escena ya se propagan y conservan su flujo actual. Las figuras importadas o preparadas por el DM no reciben una atribución histórica inventada.

Electron autónomo y su PlayerIPC mantienen herramientas locales según la spec 39. Extender este protocolo al modo sin servicio requeriría otro alcance.

## Comportamiento de usuario

### Dibujo visible en tiempo real

La herramienta del jugador muestra «Visible para la mesa» en servicio antes de crear. No hace falta un botón adicional de publicar. Una medición desde el primer punto muestra su tramo provisional siguiendo el puntero; un camino comparte los puntos fijados y el segmento provisional. Las áreas comparten creación y ajustes con las manivelas existentes.

El autor ve respuesta local inmediata, diferenciada como pendiente hasta la confirmación del servidor. Los demás ven preview atenuado o discontinuo con el mismo tag del autor. Al finalizar, desaparece la distinción provisional en todas las ventanas. No emitir un aviso accesible por cada movimiento.

Escape cancela el borrador compartido; al cancelar una edición recupera la última geometría confirmada. No elimina figuras confirmadas por una simple deselección. Ocultar herramientas cancela el borrador y selección, pero mantiene las figuras terminadas y su visibilidad para todos.

### Etiqueta del autor

El servidor obtiene el alias y discriminador del participante autenticado; no acepta un alias, rol o autor enviado por el cliente. Etiqueta sugerida: «Ana #2 · 30 ft». El discriminador se muestra siempre para evitar que una nueva admisión con el mismo alias vuelva ambiguas las figuras anteriores.

- Línea: etiqueta centrada junto al tramo; camino: junto a su medida total, conservando las medidas parciales existentes.
- Círculo/cuadrado/rectángulo: interior próximo al centro; cono: interior sobre su eje, sin tapar origen ni manivela.
- En una figura demasiado pequeña se permite una etiqueta contigua anclada a ella; no superponer ni volver ilegibles autor y medida para cumplir literalmente «dentro».
- Texto derecho en pantalla, tamaño legible independiente del zoom y fondo de contraste sobre mapas claros/oscuros. El color ayuda, pero nunca es el único identificador.
- Alias largo se trunca visualmente; la selección o foco de un control de la figura permite consultar el nombre completo. Renderizar texto plano, sin HTML/Markdown/CSS del alias.
- La etiqueta forma parte de la capa visual, no de los controles que se ocultan al proyectar.

Solo se publica el nombre elegido para jugar, su discriminador y una referencia pública opaca del autor por apertura. No divulgar correo, ID de cuenta DM, cookie, credencial, IP, patrocinador ni el roster completo. Este es un cambio deliberado respecto a la privacidad previa del alias: dibujar hace visible el alias asociado al dibujo, no la lista de participantes inactivos.

### Autoría y permisos

| Acción | Jugador autor | Otro jugador | DM propietario |
| --- | --- | --- | --- |
| Ver geometría y autor | Sí | Sí | Sí |
| Crear figura propia | Sí | Sí, con su autoría | Conserva creación de escena existente |
| Mover/redimensionar/editar figura compartida | Solo las suyas | No | No en esta entrega |
| Borrar una figura compartida | Solo las suyas | No | Sí, cualquiera |
| Limpiar | Solo sus figuras y su borrador | Solo los propios | Todas las figuras compartidas, con confirmación |
| Editar escena, tokens, niebla o figuras DM | No | No | Capacidades actuales |

La fila del dibujo en el panel del DM ofrece «Retirar dibujo de Ana #2» y no abre un inspector que permita guardarla o mutarla como figura de escena. Su borrado no afecta selección/objetos persistentes. «Limpiar dibujos de jugadores» indica expresamente ese alcance y requiere confirmación; no borra figuras de la escena.

Un jugador no obtiene permiso por conocer el ID de una figura. La propiedad se comprueba al aplicar y confirmar cada comando. Retirar un dibujo desde el DM no expulsa al jugador ni rota la invitación. Un update tardío no puede resucitar una figura borrada.

## Estado, contexto y duración

La capa compartida vive en el runtime autorizado de la apertura y se dibuja **aparte** de `scene.shapes`. No se añade a snapshots persistibles del editor, guardados, exportaciones, bibliotecas, historial de deshacer DM ni indicador de escena modificada. Puede viajar en el estado de transporte/bootstrap como sección separada y pública.

En el DM, los controles «Dibujos de jugadores» y «Mesa · jugadores» se integran como menús desplegables en la pestaña Mesa del lateral derecho, junto a Propiedades y Dados. Usan el desplazamiento del lateral y su control de visibilidad adaptable, sin paneles flotantes independientes encima de las herramientas. Cambiar de pestaña no desmonta la mesa ni pierde su estado.

El jugador reúne alias/discriminador, sistema, conexión, salida y dibujos compartidos en un lateral derecho retráctil. Una pestaña con chevrón en el borde, como la del DM, permite abrir/cerrar y permanece disponible incluso mientras espera la publicación; Escape desde el lateral lo cierra y devuelve el foco a la pestaña. En escritorio reserva espacio al mapa, y en pantallas estrechas comienza cerrado. Ocultarlo conserva dibujos, conexión y cámara. No expone el panel privado de participantes del DM.

El DM recibe siempre los eventos autorizados, pero solo dibuja la capa si su editor muestra la misma escena/mapa y marco geométrico de la publicación. Si está preparando otro mapa o tiene cambios privados de alineación/calibración incompatibles, muestra «Dibujos en el mapa publicado» y ofrece una vista de solo lectura de ese contexto, conservando el borrador abierto; no mezcla coordenadas ni fuerza navegación o publicación. Los clientes calculan medidas compartidas con las reglas publicadas, nunca con un borrador privado del DM.

Cada figura confirmada tiene ID estable en un espacio separado de las figuras de escena, autor público derivado, geometría tipada, revisión y contexto. La propiedad real se mantiene solo en servidor. El servidor calcula las medidas usando la configuración publicada de grilla/unidades/reglas; no confía en distancias o etiquetas recibidas. Se reutiliza el dominio geométrico existente, con las mismas diagonales, hexágonos y transformaciones en todas las vistas.

| Evento | Resultado |
| --- | --- |
| Publicación ordinaria del mismo contexto | Conserva figuras; no duplica ni pisa cambios concurrentes de otros autores |
| Cambio de reglas/grilla del mismo mapa | Recalcula medidas confirmadas con reglas vigentes; cancela previews basados en reglas anteriores, sin mover geometría histórica |
| Cambio de imagen del mismo contexto | Conserva figuras, igual que las herramientas locales actuales |
| Cambio de escena/mapa o identidad de viewport/contexto | Vacía capa y borradores; volver al mapa anterior no los restaura |
| Retirar publicación / cerrar / expirar / reabrir | Elimina la capa; una nueva generación no hereda figuras |
| Rotar invitación | Conserva figuras y autores admitidos |
| Pérdida transitoria de red / recarga | Conserva figuras confirmadas en servidor; al volver recibe bootstrap vigente y continúa con la misma admisión |
| Cerrar una pestaña sin salir de la partida | Es desconexión, no salida confirmada; conserva figuras hasta limpieza o final de contexto |
| Salir explícitamente / expulsión / vencimiento de credencial que termina la admisión autorizada | Retira dibujos y previews del participante, sin afectar los demás |
| Sustitución de stream/pestaña | Cancela preview de la conexión sustituida; conserva confirmados del participante |
| Reinicio del proceso API | Capa vacía, coherente con mesa efímera; no reconstruir desde DB ni reemitir figuras almacenadas en cliente |

La expiración de una sola credencial no elimina dibujos si el participante conserva otra credencial vigente; la política se aplica a la autoridad efectiva del participante en esa apertura. Antes de confirmar una expulsión se descartan también sus comandos de dibujo pendientes. El borrado público no expone el motivo privado de retirada.

## Transporte, orden y recuperación

Se reutiliza HTTP para comandos y el SSE contextual de mesa para eventos, sin un nuevo socket por dibujo. Los mensajes incluyen partida, apertura, generación y contexto de mapa; rechazar mutaciones sin publicación vigente. Los nombres exactos de DTO/endpoints se fijan en el plan, manteniendo namespaces DM/invitado y las mismas comprobaciones de Host/Origin/cookie.

- Comandos explícitos de crear/confirmar, editar, borrar y limpiar; no aceptar reemplazo indiscriminado de toda la colección por un jugador.
- `requestId` permite reintentar el mismo comando con resultado idéntico; una respuesta perdida no duplica figura ni borrado. Conflicto de revisión devuelve estado vigente y feedback recuperable, no éxito ficticio.
- Revisión por figura y secuencia de colección separadas de revisión de publicación/roster. Autores diferentes dibujan simultáneamente sin reemplazar las figuras del otro.
- Previews coalescidos, máximo 10 actualizaciones/s por autor; el último estado de un gesto siempre se confirma por un comando final. Un preview no altera la revisión confirmada. Expira tras 3 s sin renovación; mientras el usuario sostiene un gesto se renueva como máximo una vez/s si no hay movimiento.
- Un borrador activo por participante/contexto. Dos pestañas de la misma admisión no se consideran dos autores: la segunda no roba un gesto activo; recibe conflicto recuperable. La revisión impide que una edición atrasada pise otra confirmada.
- Al reconectar se usa un bootstrap de colección y secuencia capturado coherentemente con la mesa; eventos anteriores se descartan. Una creación/borrado durante el bootstrap no puede perderse por una carrera.
- Durante desconexión se deshabilitan nuevas mutaciones compartidas y se muestra «Reconectando; dibujo compartido no disponible». No acumular una cola offline que publique más tarde por sorpresa. Un comando cuyo resultado es incierto se reconcilia por ID/estado, no se recrea con otro ID.
- 401/403/404 terminal, revocación o cambio de contexto cancelan requests, previews, selección y respuestas tardías. Un 409 recuperable de revisión no cierra toda la sesión.

### Compatibilidad del protocolo

El sobre actual es estricto (`protocolVersion: 2`) y enumera los tipos SSE. No enviar campos/eventos nuevos incondicionalmente a un cliente antiguo. La propuesta usa extensión negociada `annotationsVersion=1` en estado y conexión SSE, validada explícitamente en query; solo esas conexiones reciben la sección/eventos nuevos. Se conserva el protocolo base 2 y la versión interna del motor.

Clientes anteriores siguen viendo la mesa base sin errores por la extensión; no se promete que muestren dibujos sin actualizar. El cliente nuevo debe comprobar confirmación de la extensión en bootstrap. Si el servidor no la admite, informa «Este servicio requiere actualizarse para compartir dibujos» y deshabilita esas herramientas compartidas, sin simular éxito ni volver silenciosamente a dibujos locales. El API debe mantener idéntica autorización para conexiones con o sin negociación.

### Límites de la implementación

32 figuras confirmadas por participante, 256 por apertura; máximo 256 vértices por camino, un preview por participante y 16 KiB por comando de esta extensión. Además de 10 updates/s de preview, limitar comandos confirmados a 10/s por participante con ráfaga máxima de 20; reutilizar las cuotas globales existentes sin consumir reservas DM. Límites independientes de cuántas cookies/pestañas use el autor.

Se limita además el presupuesto serializado de la capa a 512 KiB y el registro a 1000 autores. El presupuesto acumulado de figuras y tombstones es 20 000 por contexto; borrar libera cupo de figuras activas, pero no ese presupuesto histórico, que se reinicia al cambiar el contexto. Las coordenadas admiten ±10⁷ y las longitudes positivas hasta 10⁶.

Validar geometría finita, dimensiones/rangos compatibles con el dominio, propiedades permitidas y tamaños de alias. Rechazar campos arbitrarios, rutas, HTML o referencias a assets en dibujos. La deduplicación, previews y tombstones de borrado tienen memoria acotada; no crear un registro ilimitado por `requestId` o autor revocado. Al alcanzar límite, conservar figuras confirmadas y ofrecer borrar/limpiar; no silenciar el error ni desalojar dibujos de otros.

Estos límites y las decisiones de duración/moderación son propuestas de esta spec; pueden ajustarse antes de autorizar construcción.

## Criterios de aceptación

| ID | Condición observable | Verificación |
| --- | --- | --- |
| CA-01 | Un jugador traza línea/camino y crea cada tipo de área; DM y otro jugador ven preview y resultado sin recargar | API real + tres contextos independientes, incluido Electron servicio |
| CA-02 | Mover, redimensionar, cambiar propiedades, borrar y limpiar propios converge sin duplicados; edición/cancelación restaura el último confirmado | Casos de uso, adaptador y recorrido real |
| CA-03 | Figuras de dos jugadores simultáneos no se pisan; dos pestañas del mismo autor resuelven conflictos sin last-write-wins silencioso | Pruebas de concurrencia, orden e idempotencia |
| CA-04 | Cada figura compartida muestra alias/discriminador reales; suplantar autor en payload falla; texto hostil se muestra como texto | HTTP/SSE y render, aliases repetidos/largos/HTML |
| CA-05 | Otro jugador no edita ni borra figuras ajenas, ni modifica escena/DM, aunque adivine IDs; otra partida/apertura no recibe eventos | Matriz anónimo/invitado A/B/DM propio/DM ajeno y contexto obsoleto |
| CA-06 | DM retira un dibujo o limpia la capa con confirmación; no modifica escena, dirty state, deshacer, guardados ni exportación, ni superpone dibujos sobre otro mapa/borrador incompatible | Editor y serialización antes/después |
| CA-07 | Cambio de mapa, cierre, reapertura y expulsión limpian lo indicado; rotación de enlace mantiene figuras de supervivientes | Moderación con comandos/streams pendientes y carrera de revocación |
| CA-08 | Recarga y reconexión reciben estado vigente; ACK perdido y evento repetido/desordenado no duplican ni resucitan objetos | HTTP/SSE real, bootstrap concurrente y pruebas de adaptador |
| CA-09 | Caída de red deshabilita dibujo compartido; no se reenvían drafts offline, previews vencen y respuestas tardías no repueblan | Reloj controlado, corte/reanudación y estado terminal |
| CA-10 | Distancias y posición coinciden con grilla cuadrada/hexagonal, pies/metros, diagonal, zoom/pan y brújula; etiquetas siguen legibles | Unitarias geométricas y visual DM/jugador con cámaras distintas |
| CA-11 | Alias/medida no tapan manivelas; nombres largos y áreas pequeñas tienen salida legible; Escape/Delete no afectan escritura en formularios | Teclado/foco, escritorio y 390 px, mapas claros/oscuros |
| CA-12 | Payload excesivo/inválido, autor que inunda y consumidor lento quedan acotados sin perder servicio DM ni otras mesas | Límites de memoria, tasa, HTTP/SSE y limpieza de recursos |
| CA-13 | Clientes sin extensión mantienen mesa base; nuevos contra servidor sin extensión informan incompatibilidad sin éxito ficticio | Matriz de versiones y schemas estrictos |
| CA-14 | Electron local conserva comportamiento local; escenas v1/v2, figuras DM, notas privadas y dados no regresan | Regresiones existentes, humo local y comprobación de bytes públicos |

Para CA-01/02, en loopback sin carga y con tres clientes, comprobar que preview y operaciones se observan en menos de 500 ms tras el evento de entrada en diez interacciones consecutivas, registrando condiciones; no es una garantía de latencia para internet. Los tests de reloj comprueban throttle/confirmación independientemente de la velocidad de CI.

## Riesgos y decisiones

La identidad pública del autor es una ampliación deliberada y limitada de datos visibles, por lo que requiere pruebas de la proyección, no reenviar el roster. Mantener una capa separada evita contaminar guardados y volver a introducir dibujos borrados cada vez que el DM publica. La negociación evita romper clientes con esquemas estrictos. Las carreras de expulsión/bootstrap son requisitos de construcción, no trabajo opcional posterior.

No hay una duda que impida redactar el plan. Antes de construir, la aceptación de esta propuesta debe confirmar el alcance temporal, los permisos de retirada DM y la exposición del alias aquí descritos. La petición actual autoriza documentación; no abre un ciclo factory ni modifica el producto.

## Ajustes de interfaz incorporados al cierre 3.19.1

Estos ajustes fueron solicitados después de la implementación inicial y forman parte del contrato de entrega:

- **DM:** pestaña Mesa en el inspector derecho, con menús desplegables para participantes/invitaciones y dibujos. Flechas, Inicio y Fin recorren las tres pestañas. Cambiar de pestaña u ocultar el inspector conserva los componentes montados; no reinicia la mesa ni descarta formularios. Las operaciones siguen sometidas a la suspensión/revalidación de LiveEditor.
- **Jugador:** lateral de 282 px en escritorio, dentro de la distribución del mapa. Por debajo de 1100 px se contrae al entrar en ese tamaño; al abrirse ocupa como máximo 282 px, deja 68 px libres al lado y 64 px inferiores para los controles. El lateral tiene desplazamiento propio. La pestaña de chevrón de 25 × 28 px sigue el borde del panel; contraído permanece en el borde derecho, con dirección invertida. Sustituye los botones inferior e interno redundantes.
- **Datos del jugador:** alias y discriminador, identificador/versión del sistema, conexión/publicación, errores, salida y lista de dibujos. No se añade acceso al roster privado, rotación de invitaciones ni expulsiones. La lista permite retirar únicamente dibujos propios confirmados.
- **Teclado y cámara:** Escape dentro del lateral cierra y devuelve el foco al chevrón; Delete allí no borra figuras. El cambio de anchura usa el rectángulo efectivo del mapa para informar al servidor, sin reinicializar cámara, herramientas ni dibujos. En Electron autónomo no aparece un lateral de servicio vacío.
- **Mapa publicado:** el DM con otro borrador puede abrir un diálogo de solo lectura de la publicación. Conserva borrador y foco, permite cerrar con Escape, ajusta el canvas al ancho disponible y resuelve imágenes en lotes de cuatro. El overlay no se mezcla con la escena persistible.
- **Etiquetas:** autor y medida se presentan en dos líneas; nombres largos se abrevian y el panel conserva el nombre completo como texto accesible. Las áreas pequeñas pueden usar etiqueta contigua. Los previews vencen también en el cliente durante cortes de red, usando el tiempo relativo recibido del servidor.

| Criterio adicional | Resultado observable | Evidencia |
| --- | --- | --- |
| CA-15 | Menús DM contenidos en Mesa, sin flotantes independientes ni reinicio al alternar pestañas | Pruebas workspace, pestañas y autoridad; inspección a 390 px |
| CA-16 | Jugador abre/cierra con chevrón de borde; conserva cámara/dibujos y acceso a controles inferiores | PlayerApp.tools y fixture visual escritorio/móvil |
| CA-17 | Escape restituye foco; Delete en el lateral no elimina geometría; datos privados DM ausentes | Prueba de teclado y composición del panel invitado |
| CA-18 | Publicación ajena al borrador se consulta sin sustituirlo; etiquetas y canvas legibles en ancho estrecho | Helper de marco publicado, pruebas Pixi e inspección del diálogo |

Los criterios adicionales no sustituyen CA-01–14. Las pruebas pendientes del servicio y los recorridos autenticados se conservan explícitamente en validacion.md; integración no equivale a aceptación completa de esos criterios.
