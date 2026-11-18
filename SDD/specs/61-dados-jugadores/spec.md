# 61 — Dados de jugadores e historial público

**Estado:** implementada y validada localmente en 3.32.0 el 2026-11-15; sin merge. Decisiones de historial, espera y resultados incorporadas. **Revisión:** 0.1. **Fecha:** 2026-11-15. **Tipo:** funcionalidad compatible, con ajuste visual del selector compartido.
**Dependencias:** [37 — Dados DM](../37-dm-dice-rolls/spec.md), [41 — Clientes](../41-contrato-clientes/spec.md), [44 — Mesa sincronizada](../44-mesa-sincronizada/spec.md), [45 — Electron servicio](../45-electron-servicio/spec.md), [49 — Invitaciones](../49-invitaciones/spec.md), [50 — Moderación](../50-moderacion/spec.md), [55 — Herramientas compartidas](../55-mediciones-compartidas/spec.md), [60 — Storybook](../60-storybook-componentes-ui/spec.md).
**Evidencia:** [Validación y límites](validacion.md), [plan C-61](plan.md), [tareas](tareas.md) y [descubrimiento](descubrimiento.md). Revisión 0.1 aceptada para construcción; base 3.31.2, entrega 3.32.0.

## Problema y objetivo

Actualmente el DM puede preparar y lanzar dados; el jugador recibe únicamente la presentación pública. El usuario solicita que cada jugador lance desde su pantalla con los controles de composición del DM, que todas sus tiradas sean públicas y que se identifique quién puede cerrarlas. Solicita también un historial público y corregir el espacio entre el texto «Resina», la flecha y el borde del selector Material.

Resultado esperado: Ana prepara `2d6 + 3` en su lateral y lanza. Ana, Bruno y el DM ven la misma tirada y sus valores. Mientras siga en pantalla nadie puede iniciar otra pública. Ana o el DM la cierra; Bruno puede lanzar entonces. La primera tirada sigue disponible en el historial público.

Esta entrega amplía deliberadamente SDD 37: en servicio deja de ser exclusivo del DM el lanzamiento y deja de ser privado todo el historial. Conserva las tiradas ocultas del DM y no confunde cerrar una presentación con ocultar su contenido.

## Decisiones confirmadas y vocabulario

Petición original y aclaraciones humanas del 2026-11-15:

| Concepto | Regla |
| --- | --- |
| Pública / oculta | Define quién recibe la tirada. Jugadores: siempre pública. DM: conserva ambas opciones. |
| En pantalla / cerrada | Define si ocupa la presentación pública. Cerrar retira dados y resumen, sin borrar el historial. |
| Historial del jugador | Todas las tiradas públicas conservadas durante la sesión, incluidas las ya cerradas. |
| Historial del DM | Tiradas públicas y ocultas conservadas durante la sesión. |
| Valores públicos | El log público muestra valores y totales. «Mostrar resultado a jugadores» del DM afecta solo al resumen sobre el mapa, nunca al log. |
| Espera | Se bloquea Lanzar mientras haya una pública reservada, rodando o en pantalla. Al cerrarse se habilita el lanzamiento manual; no hay cola automática. |
| Cierre | Cada jugador solo cierra sus propias tiradas. El DM puede cerrar cualquiera. |

En nuevos textos de UI usar «pública/oculta» para privacidad y «en pantalla/cerrada» para presentación. Los nombres históricos `open` y «Abierta» de los contratos existentes no deben provocar ambigüedad funcional.

## Alcance y exclusiones

- Jugadores admitidos por invitación en el servicio, tanto en navegador como en Electron conectado; DM de la misma campaña/apertura en ambos clientes.
- Compositor, preferencias propias, presentación compartida, cierre autorizado e historial por rol.
- Ajuste del componente `Select` existente y adopción en los selectores del panel de dados; documentación y ejemplos reales en Storybook.
- El modo Electron autónomo mantiene su DM y su ventana local de proyección, sin introducir una identidad ficticia de jugador ni ampliar IPC para lanzar desde ella. Recibe el ajuste visual compartido del selector. Esta delimitación reutiliza la frontera de SDD 55.
- Sin nuevas reglas de combate, tipos de dado, macros, aplicación automática de daño, ficha de personaje vinculada a la tirada, chat ni iniciativa. El autor es el participante admitido, no una entidad NPC/personaje elegida por el cliente.
- Sin persistir/exportar tiradas, migraciones de base de datos, cambios de `.ttrpgscene`, recuperación durable ni múltiples procesos API. No se añade una cola offline o de turnos.
- Sin rediseñar el motor 3D ni certificar azar contra clientes manipulados. Se conserva el modelo actual de mesa de confianza: el servidor valida estructura, rangos y cálculo del resultado; no demuestra imparcialidad de la simulación ejecutada por el iniciador.

## Experiencia y controles

### Lateral del jugador

Añadir «Mesa» y «Dados» dentro del lateral retráctil existente, con su mismo disparador de borde. «Mesa» conserva sesión, conexión, salida y dibujos. «Dados» contiene propiedades, composición, Lanzar e historial; no añade otra ventana flotante sobre el mapa.

Cambiar de pestaña o contraer el lateral conserva la composición y no cierra una tirada. La llegada de resultados no cambia la pestaña ni mueve el foco. En ancho estrecho se conserva el comportamiento adaptable del lateral y su desplazamiento interior. Formulario, diálogo d20, paginación y controles de cierre capturan sus eventos sin activar herramientas o borrados del mapa.

### Paridad de composición, con permisos explícitos

Reutilizar reglas, validaciones y componentes del DM para:

- Modo Por dados / Fórmula; d4, d6, d8, d10, d12 y percentil; grupos y modificadores de daño, sin cambiar aritmética ni límites.
- Chequeo d20 independiente, modificador y confirmación Normal / Ventaja / Desventaja. Cancelar no lanza ni ocupa el turno público.
- Color, material y fuerza de la propia tirada. La configuración queda fijada al confirmar y no cambia registros anteriores.
- Preferencias de visualización locales: sonido de la propia simulación y tamaño de la propia vista, sin cambiar la configuración global del DM ni la de otros participantes. Los receptores no reproducen audio duplicado por recibir el replay.

El jugador no recibe selector de privacidad, control para ocultar resultados, tamaño de la vista DM ni acciones de limpieza global. El servidor impone pública y resultados visibles para toda tirada de jugador, incluso ante un cliente modificado.

Preparar o editar la siguiente composición mientras otra persona tiene la mesa ocupada está permitido; Lanzar permanece deshabilitado con «Espera a que se cierre la tirada de {autor}». La animación propia conserva los bloqueos de edición del panel actual. Un conflicto por lanzamiento simultáneo preserva lo preparado y no lanza más tarde por sorpresa.

### Autor, resultado y cierre

Mostrar autor en presentación e historial: alias y discriminador del jugador, o «DM». Derivar la autoría de la sesión autorizada; aliases duplicados no conceden propiedad. Usar texto plano y nombres accesibles completos cuando se abrevien visualmente. No publicar correo, ID de cuenta, credenciales, direcciones de red ni el roster privado.

La X indica «Cerrar mi tirada» al autor y «Cerrar tirada de {autor}» al DM. Los demás jugadores no tienen esa acción. El DM conserva acceso a cerrar la pública vigente aunque esté consultando una tirada oculta, otro panel o un borrador diferente. No hace falta cerrar la campaña, expulsar al participante ni cambiar la invitación para retirar una tirada.

Cerrar retira la presentación de todos los clientes correspondientes, conserva el resultado registrado y libera la mesa pública. Mientras se confirma, el control muestra estado pendiente y evita duplicados. Un fallo recuperable conserva el estado autorizado y permite reintentar. El cierre apunta a un ID concreto: nunca retira una tirada posterior por una respuesta atrasada.

Para el DM, el control actual de resultado pasa a describir expresamente el «Resumen sobre el mapa para jugadores». El historial público sigue mostrando los valores aunque ese resumen esté oculto. Cambiar esa preferencia no reabre una presentación cerrada ni reproduce dados históricos.

## Reglas y contratos

### Identidad y permisos

| Acción | Jugador autor | Otro jugador | DM propietario |
| --- | --- | --- | --- |
| Preparar composición y preferencias propias | Sí | Sí, las propias | Sí |
| Iniciar una pública con la mesa libre | Sí | Sí | Sí |
| Iniciar una oculta | No | No | Sí |
| Completar/fallar una reserva | Solo su reserva vigente | No | Solo su propia reserva; puede cerrar/cancelar las demás |
| Cerrar presentación pública | Solo la propia | No | Cualquiera |
| Leer historial público | Sí, completo dentro de la retención | Sí | Sí |
| Leer tiradas ocultas | No | No | Sí |
| Cambiar contexto DM, preferencias globales o limpiar historial | No | No | Conserva las acciones DM autorizadas |

Propiedad estable por participante y apertura, independiente de la pestaña o cookie concreta; reconectar con la misma admisión conserva autoría. Una admisión nueva con el mismo alias no recupera derechos sobre una tirada anterior. La autoridad del DM procede de la propiedad de la campaña.

Cada comando se autoriza al confirmar y cada respuesta/evento se filtra antes de entregarse. No basta ocultar botones. No devolver el estado privado del DM como respuesta al lanzamiento o cierre de un jugador.

Toda tirada pública del servicio, incluida la del DM, pertenece al contexto publicado vigente. Lanzar no publica un borrador, cambia la escena ni navega por cuenta propia. El jugador no puede establecer el contexto del editor DM ni enviar un nombre privado de escena/mapa. Sin publicación utilizable se pueden preparar controles y consultar el log autorizado, pero no iniciar una pública sobre un contexto inexistente. Un cambio de publicación durante una operación invalida las respuestas del contexto anterior. El DM conserva sus posibilidades de preparación y tirada privada sin abrir una vista de jugador; su navegación privada no cambia el contexto de las públicas. Si está consultando otro borrador, la UI identifica el destino publicado y conserva acceso a su presentación/cierre sin mezclar dados con el mapa privado.

### Ocupación y concurrencia

Una apertura tiene como máximo una tirada pública reservada o en pantalla. La reserva se adquiere antes de simular; la comprobación y adquisición son una única transición de autoridad. Dos pulsaciones simultáneas producen un ganador y un rechazo recuperable para el otro, sin sobrescribir, cerrar ni sustituir la tirada existente.

Estados funcionales: libre → preparando → rodando → resultado en pantalla → libre al cerrar. Preparación fallida o interrumpida libera la reserva sin inventar valores. La política de espera se aplica también al DM cuando quiere iniciar otra pública. Las tiradas ocultas DM conservan su independencia: no reemplazan, cierran ni anuncian cambios en la presentación pública, ni revelan actividad privada mediante eventos o contadores públicos. Tampoco bloquean o cambian la disponibilidad y los errores del lanzamiento público de los jugadores: una reserva privada no ocupa el turno público.

La configuración de Ana no cambia al preparar Bruno una tirada. Tampoco se modifica el borrador global DM. Una operación repetida con el mismo identificador recupera el mismo efecto; otra persona no puede apropiarse de ese identificador para completar, fallar o cerrar una tirada ajena.

Se simula una sola vez por el iniciador y los demás reproducen el resultado aceptado. No se necesita una pestaña DM para ejecutar la física de un lanzamiento del jugador, siempre que la apertura y su acceso sigan vigentes. El resultado, los percentiles, la selección d20 y sus modificadores coinciden en todos los clientes.

### Historial y privacidad

El historial público muestra únicamente tiradas públicas, recientes primero, con autor, hora, composición/fórmula, desglose de dados, modificadores, grupos/subtotales, chequeo d20 y total correspondiente; también distingue fallida/interrumpida sin fabricar resultado. No incluye borradores aún no enviados ni detalles internos de errores.

El contexto visible usa solo datos autorizados para jugadores. No copiar nombres internos, notas u objetos privados de la escena desde el registro DM. Una tirada oculta no aparece en HTTP, SSE, bootstrap, cachés del jugador, paginación, recuentos ni mensajes indirectos sobre actividad privada.

El cierre no elimina entradas. Navegar entre mapas/escenas y recargar o reconectar en la misma apertura recupera el historial retenido del servidor, sin volver a animarlo ni reproducir sonido. El log no reactiva una presentación cerrada.

Se conserva almacenamiento efímero. Como límite de esta ampliación, retener hasta 500 entradas públicas y hasta 500 ocultas por apertura. Los jugadores consultan las públicas; el DM consulta la mezcla cronológica de ambos conjuntos, paginada, con hasta 1000 entradas y sin perder acceso a públicas que aún vean los jugadores. Comunicar los límites y no montar toda la colección en el DOM. No guardar el log en SQLite/PostgreSQL, archivos de escena, autosaves ni diagnóstico de producción. La retención pública se limita por actividad pública, de modo que lanzamientos ocultos no desalojen entradas ni cambien sus contadores. El plan técnico debe acotar por separado memoria de registros y trayectorias, sin conservar los replays completos de todo el historial.

Cerrar/reabrir la apertura, descartar su runtime o reiniciar la API elimina ese estado; continuar la misma apertura solo lo conserva mientras exista su runtime. No prometer historial recuperable tras reinicio. Limpiar historial sigue siendo exclusivo del DM y requiere confirmación que indique el alcance público y privado; no cierra una presentación vigente ni cambia datos de escena. Los jugadores no reciben un botón de borrado de registros compartidos.

### Fallos y ciclo de vida

| Situación | Comportamiento esperado |
| --- | --- |
| Caída transitoria de red | Deshabilitar mutaciones; conservar composición propia. No encolar nuevos lanzamientos. Reconciliar un resultado incierto por ID al reconectar. |
| Reserva sin resultado | Conservar el plazo existente de 20 s; expirarla en el servidor y notificar que la mesa queda libre aunque nadie haga otra petición. Un completado tardío no revive la reserva. |
| Fallo de simulación | Liberar la reserva, informar fallo seguro y permitir un nuevo intento explícito. Nunca relanzar automáticamente. |
| Autor desconectado después de resultado válido | Mantener presentación y log. El autor al reconectar o el DM pueden cerrarla; no introducir cierre automático por desconexión. |
| Salida/revocación efectiva del autor | Cancelar su preparación pendiente y rechazar escrituras tardías. Un resultado ya aceptado sigue en el log y su presentación puede cerrarla el DM. |
| Cambio de mapa/escena publicada o retirada de publicación | Retirar presentación e interrumpir preparación del contexto anterior, conservando resultados históricos de la apertura. No trasladar dados a otro mapa ni restaurarlos al volver. |
| Cierre/expiración/reapertura | Limpiar estado y autoridad de la apertura anterior; ninguna respuesta o bootstrap viejo la repuebla. |
| Fallo de render/WebGL | Mantener el resultado aceptado y su representación textual autorizada; no repetir el azar para solucionar un fallo visual. |

Una cancelación por fin de contexto o pérdida de autorización es limpieza del servicio, no un permiso nuevo para que otro jugador cierre tiradas. Cambiar solo la escena privada en el editor DM no debe cancelar la tirada del mapa publicado de los jugadores.

### Transporte y compatibilidad

Reutilizar los clientes inyectados y el transporte HTTP/SSE contextual por campaña/apertura/generación. La instantánea de reconexión incluye ocupación, presentación e historial públicos coherentes; no precisa un segundo socket. Eventos repetidos, atrasados o de otra apertura se descartan.

El protocolo actual usa esquemas estrictos: negociar o versionar explícitamente la nueva capacidad antes de enviar campos/eventos nuevos. Un cliente antiguo conserva la mesa compatible o recibe una indicación de actualización según el contrato definido por TL; no obtener un falso éxito al intentar una función no admitida. Un cliente antiguo tampoco puede saltarse la exclusividad de la mesa pública.

Conservar límites actuales de composición, simulación, deduplicación y transporte; añadir presupuestos por participante cuando la concurrencia lo exija. El abuso de un invitado no consume la reserva de moderación del DM. Las decisiones exactas de DTO, endpoints y cuotas se fijan en el plan, con pruebas de aislamiento y memoria acotada.

## Ajuste del selector compartido

La captura del usuario muestra «Resina» demasiado cerca de la flecha. Mejorar `Select`, no crear un control alternativo solo para la demo. Reservar una zona derecha que evite superponer texto y chevron, preservando los estilos de borde, fondo y ancho de cada contexto.

Adoptar el componente en Material, grupo activo y tipo de grupo del panel de dados. Conservar selección nativa, nombre accesible, foco, teclado y deshabilitado; una sola flecha. En el lateral de 282 px, viewport de 390 px y zoom 200 %, «Resina», «Mate» y «Metal» deben leerse sin tocar el chevron ni desbordar el contenedor. Objetivo visual: al menos 8 px entre texto y flecha; permitir truncado legible de opciones largas sin invadir la zona de la flecha.

Extender `Controles/Select` con Material, opción larga y ancho estrecho. Catalogar compositor/historial por rol mediante componentes reales y fixtures tipadas, sin importar Pixi, Three, entradas de aplicación, clientes reales ni bases de datos. Consultar [UI-004](../../guias/ui-ux/storybook.md). No se autoriza una migración general de todos los formularios ni un framework de estilos nuevo.

## Criterios de aceptación

| ID | Condición observable | Forma de verificar durante Build |
| --- | --- | --- |
| CA-01 | Jugador del servicio dispone de Mesa/Dados en el lateral y conserva composición al alternar/contraer | Recorrido navegador y Electron conectado, escritorio y 390 px |
| CA-02 | Composición manual/fórmula, grupos, percentil, d20 y modificadores coinciden con reglas DM; cancelar no reserva | Unitarias de dominio y UI con casos válidos/inválidos y límites |
| CA-03 | Preferencias de dos jugadores y DM son independientes; el jugador no altera configuración global ni crea ocultas | Dos participantes, dos pestañas del mismo autor y pruebas HTTP adversariales |
| CA-04 | Una tirada de jugador es pública con resultado visible, autor auténtico y los mismos valores en DM/jugadores | API real con DM + dos invitados; aliases iguales y payload de autor falsificado |
| CA-05 | Desde reserva hasta cierre solo se admite una pública; el perdedor conserva composición y no se ejecuta después | Carrera de begin, doble click y reintento idempotente; ausencia de cola |
| CA-06 | Solo autor o DM cierran; cierre repetido/tardío no afecta otra tirada; DM puede cerrar aunque consulte una oculta | Matriz autor/otro invitado/DM propio/DM ajeno y UI con ID obsoleto |
| CA-07 | Log jugador incluye todas las públicas retenidas, incluso cerradas; log DM incluye públicas y ocultas | Historial mixto, cierre, paginación, recarga y navegación entre mapas |
| CA-08 | Log público muestra totales aunque el DM oculte el resumen del mapa; cerrada no vuelve a presentarse | Alternar resumen antes/después de cerrar y contrastar UI/payloads |
| CA-09 | Nunca llegan tiradas ocultas, datos privados o metadatos de actividad oculta al jugador; una reserva privada no ocupa el turno público | Inspección de HTTP/SSE/bootstrap/errores/recuentos, lanzamiento simultáneo oculto/público y proyección pública |
| CA-10 | Simulación única, resultados/replay estables y compatibilidad con preferencias locales de tamaño/sonido | Tres clientes con tamaños distintos; reconexión no repite azar ni audio |
| CA-11 | Fallo/timeout libera reserva; resultado válido no se borra ni relanza por desconexión | Reloj controlado, corte de conexión, autor reconecta y cierre por DM |
| CA-12 | Revocación, publicación nueva y fin de apertura invalidan comandos tardíos; otra campaña no ve datos | Contratos reales de moderación, carreras de confirmación/entrega y contextos cruzados |
| CA-13 | Historial efímero y memoria acotados; retención pública independiente de actividad oculta | Más de 500 públicas/ocultas, límites de trayectorias, limpieza, reinicio y no persistencia |
| CA-14 | Select reserva espacio para flecha con controles reales, sin doble icono ni desbordes | Storybook y producto a 282/390/1440 px, zoom 200 %, foco/teclado/disabled |
| CA-15 | Lateral, tabs, d20, espera y cierre funcionan con teclado y no activan herramientas del mapa | Tab/flechas/Escape, retorno de foco, lector de estados y texto largo |
| CA-16 | Cliente incompatible no muta ni presenta éxito ficticio; extensiones no rompen lectura de mesa base | Matriz servidor/cliente viejo-nuevo y schemas estrictos |
| CA-17 | Modo autónomo conserva comportamiento, y dados no modifican escenas, dirty state, undo ni archivos | Regresiones Electron/IPC, humo autónomo y serialización antes/después |
| CA-18 | Compositor/historial por rol y selector pueden revisarse en Storybook sin motores ni API | Grafo/build del catálogo, fixtures y recorridos interactivos |

La aceptación y sus límites se registran en [validacion.md](validacion.md). Se comprobó autoridad con servicio real y datos sintéticos en SQLite y PostgreSQL TLS, sin migrar datos del usuario.

## Reutilización, riesgos y entrega

Reutilizar dominio y simulación de SDD 37, `DicePanel`/`DiceResultSummary`, lateral `PlayerApp`, `Select`, clientes inyectados y autoridad de invitación/mesa. Separar compositor y registro público de capacidades DM; no copiar el panel entero con privilegios ocultos por CSS.

Riesgos principales: estado de dados global sin autor, respuestas actuales con historial privado, lectura de un contexto DM distinto del publicado, carreras de cierre/expiración y CSS contextual que anule el espaciado. [Descubrimiento](descubrimiento.md) identifica las fuentes. La confianza en la simulación cliente es un límite conocido; no presentar validación de estructura como garantía contra trampas.

Las decisiones funcionales están resueltas y el contrato C-61 del plan se implementó. La matriz de validación distingue pruebas automatizadas, recorridos reales y límites de medición; la simulación continúa confiando en el cliente.

La rama `feature/spec-61-dados-jugadores` fue autorizada y creada desde el HEAD existente, conservando los cambios locales. La orden posterior del usuario autoriza construir esta revisión y volver a esa rama conservando los cambios locales. No autoriza commit, push, merge ni migraciones operativas. El cambio anterior «Volver a los arcos» queda pendiente y fuera de esta spec.

El [plan](plan.md) y las [tareas](tareas.md) están aceptados para construcción; tras la implementación se completará la matriz criterio → evidencia en `validacion.md`, con versión minor compatible en `package.json`, changelog y límites reales de verificación. No se reserva una versión por adelantado ni se certifican pruebas históricas como nuevas.
