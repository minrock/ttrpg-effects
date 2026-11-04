# Spec - Turnero de Combate

## Objetivo

Agregar un turnero de combate para que el DM pueda iniciar una batalla desde la escena actual, armar el orden de participantes con drag and drop y mostrar una barra de turnos compartida en la ventana del DM y en la ventana de jugador.

El turnero debe partir de las entidades ya presentes en escena: monstruos, NPCs y personajes jugadores. El DM decide quienes entran a la batalla y en que orden. Durante el combate, el DM puede avanzar al siguiente participante, eliminar temporalmente participantes de la rotacion y reincorporarlos sin perder su posicion en la lista.

## Contexto

La app ya tiene un sistema de entidades para monstruos, NPCs y personajes jugadores, ademas de una ventana de jugador sincronizada con el estado del DM. Falta una herramienta de sesion para representar el orden de combate de forma visible para todos, sin convertir la app en un sistema completo de iniciativa o combate automatizado.

El turnero debe ser visual, claro en proyeccion y no interferir con el mapa. Su posicion principal sera una lista horizontal centrada en la parte superior del viewport del mapa, similar a la referencia provista.

## Alcance

- Agregar una accion visible para `Iniciar batalla`.
- Al iniciar batalla, abrir un modal de configuracion.
- El modal muestra, a la izquierda, todos los candidatos presentes en la escena:
  - monstruos;
  - NPCs;
  - personajes jugadores.
- El modal permite armar el turnero con drag and drop desde candidatos hacia la lista de batalla.
- El modal permite reordenar el turnero con drag and drop.
- El modal pide al DM capturar la iniciativa lanzada para cada participante agregado, etiquetada como `Iniciativa`.
- El valor de iniciativa se muestra en el listado del turnero y en la barra de turnos.
- Para crear la batalla deben existir por lo menos dos plazas ocupadas en el turnero.
- Una vez iniciada la batalla, se muestra una barra de turnos:
  - en la ventana del DM;
  - en la ventana del jugador.
- En la ventana del DM, la barra incluye un control `Siguiente`.
- En la ventana del jugador, la barra es solo informativa y no muestra controles de gestion.
- `Siguiente` avanza al proximo participante activo.
- Si el participante actual es el ultimo activo, `Siguiente` vuelve al primer participante activo.
- El DM puede marcar un participante como eliminado temporalmente.
- El DM puede reincorporar un participante eliminado.
- El combate tiene control de rondas. Una ronda es una vuelta completa por todos los participantes activos del combate.
- El combate inicia en `Ronda 0`.
- La ronda avanza al completar una vuelta y regresar al primer participante activo de la lista.
- El DM puede editar la batalla durante el combate para agregar nuevos participantes que llegan tarde.
- Los participantes agregados durante una batalla entran como pendientes y solo pasan a activos a partir de la ronda siguiente a la ronda en la que fueron agregados.
- Cada participante guarda en que ronda entro al combate.
- Los participantes eliminados permanecen visibles en la lista, pero:
  - se muestran en blanco y negro;
  - se saltan al avanzar turno;
  - conservan su posicion original.
- La entidad en turno se muestra un poco mas grande que las demas.
- La siguiente entidad activa se muestra con un halo plateado titilante en su recuadro para indicar proximidad de turno.
- La barra de turnos debe quedar sobre el mapa sin bloquear la navegacion general mas de lo necesario.
- El estado del turnero se guarda en `.ttrpgscene` para poder guardar/cargar una escena en mitad de combate.
- La ventana de jugador recibe el estado del turnero por el flujo de sincronizacion de escena existente.

## Fuera de alcance

- Tiradas automaticas de iniciativa.
- Calculo de iniciativa desde stats de D&D u otros sistemas.
- Tracking de HP, condiciones, concentracion, duracion de efectos o rondas.
- Vincular automaticamente participantes con tokens del mapa.
- Edicion desde la ventana de jugador.
- Historial de turnos.
- Temporizadores por turno.
- Soporte para multiples combates simultaneos.
- Integracion con una DB de encuentros o encuentros guardados fuera de `.ttrpgscene`.

## Comportamiento

### Abrir configuracion de batalla

- El DM puede iniciar una batalla desde un boton o componente visible en la UI principal.
- Si no hay monstruos, NPCs ni personajes jugadores en la escena, la accion debe mostrar un estado vacio o quedar deshabilitada.
- Al activar `Iniciar batalla`, se abre un modal amplio.
- El modal tiene dos zonas principales:
  - `Disponibles`: lista de entidades de escena que pueden participar.
  - `Turnero`: lista ordenada de plazas de combate.
- Las entidades disponibles deben mostrar:
  - imagen/avatar si existe;
  - nombre;
  - tipo (`Monstruo`, `NPC`, `Personaje`);
  - indicador visual si ya esta en el turnero.
- El usuario puede arrastrar elementos desde `Disponibles` hacia `Turnero`.
- El usuario puede reordenar elementos dentro de `Turnero`.
- Al agregar un participante al `Turnero`, el modal muestra un campo `Iniciativa`.
- La iniciativa es un numero capturado manualmente por el DM segun la tirada del usuario o criatura.
- El listado del `Turnero` muestra nombre, tipo e iniciativa.
- Si dos participantes tienen la misma iniciativa, el orden manual definido por drag and drop decide el desempate.
- El sistema no reordena automaticamente por iniciativa; el DM conserva control manual del orden final.
- El usuario puede quitar elementos del `Turnero` antes de iniciar.
- El boton `Iniciar batalla` queda deshabilitado hasta que haya al menos dos participantes.

### Participantes duplicados

- Cada entidad de escena puede aparecer una sola vez en el turnero inicial.
- Si el DM necesita varias criaturas iguales, deben existir como entidades separadas en la escena antes de abrir el turnero.
- El turnero referencia el `id` de la entidad de escena y guarda un snapshot minimo para renderizar aunque la entidad original cambie o se elimine despues.

### Barra de turnos

- La barra de turnos se posiciona centrada en la parte superior del viewport del mapa.
- Debe mostrarse encima de mapa, tokens, efectos, oscuridad, niebla y overlays de juego.
- No debe abrir paneles grandes ni cubrir de forma permanente la zona central del mapa.
- Cada participante se muestra como una celda/avatar compacto.
- Cada participante se muestra por defecto solo como su imagen/avatar en formato retrato vertical y un badge circular con su iniciativa.
- El retrato debe ser aproximadamente 16:9 vertical y lo bastante grande para verse en proyeccion; la referencia actual usa un tamano cercano a `90 x 131px`.
- El badge de iniciativa debe quedar arriba a la derecha y verse completo, sin recortes por overflow del contenedor.
- El nombre no se muestra fijo en la barra para mantenerla compacta.
- Al pasar el mouse sobre un participante, tanto en DM como en jugador, aparece un tooltip con el nombre de la criatura/personaje. El tooltip no debe depender de un contenedor recortado para que tambien funcione en la ventana de jugador.
- En DM, hacer click sobre un participante expande temporalmente su control hacia el lado derecho del retrato y muestra la accion para eliminarlo o reincorporarlo.
- La accion de eliminar debe usar un icono/emoji de basura para lectura rapida, por ejemplo `🗑 Eliminar`.
- En jugador, hacer click sobre participantes no tiene acciones; la barra sigue siendo solo lectura.
- La entidad actual:
  - se renderiza un poco mas grande;
  - tiene enfasis visual claro.
- La siguiente entidad activa:
  - conserva su tamano normal;
  - tiene halo plateado titilante alrededor del recuadro.
- Participantes eliminados:
  - se muestran en blanco y negro;
  - pueden tener opacidad reducida;
  - no reciben halo de siguiente turno;
  - se saltan cuando se presiona `Siguiente`.

### Avanzar turno

- Solo el DM puede avanzar turno.
- El boton `Siguiente` avanza al proximo participante activo.
- Los participantes eliminados se saltan.
- Los participantes pendientes por entrada tardia tambien se saltan hasta que su `activeFromRound` sea menor o igual a la ronda actual.
- Si todos salvo uno estan eliminados, `Siguiente` conserva ese unico participante activo como turno actual.
- Si todos estan eliminados, no se avanza y se muestra feedback recuperable al DM.
- Al llegar al final de la lista, el avance vuelve al inicio.
- Cuando el avance vuelve al inicio despues de completar una vuelta por los activos, se incrementa el contador de ronda.
- La barra muestra la ronda actual.
- La ventana de jugador se actualiza cuando cambia el turno.

### Rondas y participantes tardios

- Una ronda representa una vuelta completa por todos los participantes activos disponibles para esa ronda.
- La batalla inicia en `Ronda 0`.
- Si el DM agrega un participante durante la ronda `N`, ese participante se guarda con:
  - `enteredRound = N`;
  - `activeFromRound = N + 1`.
- Un participante pendiente:
  - aparece en el turnero;
  - muestra su iniciativa;
  - puede tener un indicador visual `Entra ronda X`;
  - no toma turno ni cuenta como siguiente activo hasta `activeFromRound`.
- Al iniciar una nueva ronda, todos los participantes pendientes cuyo `activeFromRound` sea igual a la nueva ronda pasan a activos automaticamente.
- Si se agrega un participante durante `Ronda 0`, toma turno desde `Ronda 1`.
- El DM puede editar y reordenar la batalla durante el combate para insertar participantes tardios en la posicion de iniciativa correcta.

### Eliminar y reincorporar

- En la ventana del DM, cada participante puede marcarse como eliminado o reincorporado.
- Eliminar no borra el participante del turnero.
- Reincorporar devuelve al participante a la rotacion en su posicion original.
- Si se elimina el participante actual, el sistema debe avanzar automaticamente al siguiente activo o pedir confirmacion segun lo que resulte mas claro en implementacion. La opcion preferida es avanzar automaticamente al siguiente activo.
- Si se reincorpora un participante, no se vuelve automaticamente su turno salvo que no haya otros activos o que su posicion corresponda en avances futuros.

### Cerrar o terminar batalla

- El DM debe tener una accion para terminar la batalla.
- La accion debe ser un boton/componente visible en los controles del turnero del DM, por ejemplo `Finalizar batalla`.
- Terminar batalla limpia completamente el turnero activo de la escena:
  - `active = false`;
  - `participants = []`;
  - `currentParticipantId = null`;
  - `round = 0`.
- Al finalizar, la barra de turnos desaparece del mapa del DM y de la ventana de jugador.
- Los controles de combate se ocultan y el modal/editor queda cerrado.
- El siguiente inicio de batalla debe comenzar desde un estado en blanco, sin participantes ni ronda previa.
- Si hay batalla activa y el DM usa la accion de batalla, la UI debe abrir el editor de la batalla actual para agregar/reordenar participantes o terminarla.
- Guardar/cargar escena debe preservar una batalla activa.

## Modelo de datos

El estado de combate vive dentro de la escena para que sea portable en `.ttrpgscene`.

```ts
type CombatParticipantType = "monster" | "npc" | "playerCharacter";

type CombatParticipant = {
  id: string;
  entityType: CombatParticipantType;
  entityId: string;
  name: string;
  imagePath: string | null;
  initiative: number;
  defeated: boolean;
  enteredRound: number;
  activeFromRound: number;
};

type CombatTracker = {
  active: boolean;
  participants: readonly CombatParticipant[];
  currentParticipantId: string | null;
  round: number;
};
```

Reglas:

- `CombatTracker.active === false` representa que no hay batalla activa.
- `participants` conserva el orden del turnero.
- `currentParticipantId` debe apuntar a un participante existente cuando la batalla esta activa y hay participantes activos.
- `round` inicia en `0`.
- `initiative` guarda el numero capturado por el DM.
- `defeated` controla si el participante se salta en la rotacion.
- `enteredRound` registra en que ronda fue agregado el participante.
- `activeFromRound` define desde que ronda puede tomar turno.
- `id` es un id estable del participante dentro del turnero, distinto del `entityId`.
- `entityId` referencia la entidad original de escena.
- `name` e `imagePath` son snapshot de presentacion para evitar que el turnero quede inutilizable si se elimina o cambia una entidad de escena.

## Persistencia

- Agregar `combatTracker` al schema de escena versionado.
- Las escenas antiguas sin `combatTracker` deben cargar con un default inactivo:

```ts
{
  active: false,
  participants: [],
  currentParticipantId: null,
  round: 0
}
```

- Guardar escena debe incluir el turnero activo si existe.
- Cargar escena debe restaurar el turnero y mostrar la barra si `active === true`.
- No se requiere SQLite para esta funcionalidad.

## Sincronizacion con ventana de jugador

- El turnero debe viajar dentro del snapshot de escena existente hacia la ventana de jugador.
- El DM es la fuente de verdad.
- La ventana de jugador:
  - muestra la barra si hay batalla activa;
  - no puede iniciar, editar, avanzar, eliminar ni reincorporar participantes;
  - actualiza su barra al recibir cambios desde el DM.
- La ventana de jugador usa las mismas imagenes resueltas via protocolo seguro ya existente para assets del aside.

## UI / UX

### Boton de entrada

- El boton `Iniciar batalla` debe estar en una zona principal de UI del DM, idealmente cerca de controles de escena o entidades.
- Si hay batalla activa, el boton puede cambiar a `Batalla activa` o `Editar batalla`.

### Modal de configuracion

- Modal amplio y usable con mouse.
- Dos columnas:
  - izquierda: disponibles;
  - derecha: turnero.
- Drag and drop con feedback visual claro.
- Cada participante del turnero tiene campo `Iniciativa`.
- El listado del turnero muestra iniciativa visible junto al nombre.
- Debe ser posible usar botones alternativos para agregar/quitar si drag and drop falla o para accesibilidad basica.
- Mostrar contador de participantes en turnero.
- Mostrar error si se intenta iniciar con menos de dos participantes.
- Si la batalla ya esta activa, el mismo modal funciona como editor de combate en curso.
- En combate activo, agregar participantes nuevos los marca como pendientes para la siguiente ronda.

### Barra de turnos

- Horizontal, compacta y centrada arriba del mapa.
- Los avatares deben ser cuadrados o circulares con borde, consistentes con el look de tokens/personajes.
- Para el MVP se prefiere retrato vertical compacto con iniciativa arriba a la derecha como badge.
- Debe tener buen contraste sobre mapas oscuros o claros.
- La entidad actual debe ser mas grande sin desplazar demasiado el resto de la barra.
- El halo de la siguiente entidad activa debe ser plateado y titilante.
- El valor de iniciativa debe verse en cada participante.
- El nombre debe aparecer por tooltip al hover, no como texto permanente.
- La ronda actual debe verse en la barra.
- Participantes eliminados deben verse en blanco y negro de forma clara.
- Participantes pendientes deben diferenciarse de activos, por ejemplo con texto `Ronda X` u opacidad distinta.
- En DM, `Siguiente`, `Editar` y `Terminar batalla` son controles discretos pero visibles.
- En DM, `Eliminar/Reincorporar` se muestra solo al expandir un participante con click, hacia el lado derecho del retrato.
- En DM, debe existir accion `Editar batalla` mientras el combate esta activo.
- En jugador, ocultar todos los controles y mostrar solo el estado.

## Arquitectura

- `domain` define tipos y reglas puras del turnero.
- `application` no requiere casos de uso complejos inicialmente, pero puede alojar helpers si el estado crece.
- `renderer` maneja el modal, drag and drop, barra de turnos y estado UI.
- `main` y `preload` no requieren nuevos canales si el turnero viaja dentro de la escena y usa sincronizacion ya existente.
- `render`/PixiJS no debe encargarse de la barra; la barra debe ser UI React sobre el viewport.

## Reglas de dominio

- No se puede iniciar batalla con menos de dos participantes.
- No se puede agregar dos veces la misma entidad de escena al turnero.
- `nextTurn(tracker)` salta participantes eliminados.
- `nextTurn(tracker)` salta participantes pendientes cuyo `activeFromRound` es mayor a la ronda actual.
- `nextTurn(tracker)` hace wrap al inicio.
- `nextTurn(tracker)` incrementa `round` cuando completa una vuelta y vuelve al inicio.
- `nextTurn(tracker)` conserva turno si solo hay un participante activo.
- `markDefeated(tracker, participantId, defeated)` conserva orden.
- `addParticipantDuringCombat(tracker, participant)` define `enteredRound = tracker.round` y `activeFromRound = tracker.round + 1`.
- `isParticipantActiveInRound(participant, round)` devuelve falso si esta eliminado o pendiente.
- Si el participante actual pasa a eliminado, se avanza al siguiente activo.
- Si no quedan activos, `currentParticipantId` puede quedar `null` o conservarse con estado bloqueado; la implementacion debe elegir una unica regla y cubrirla con tests.
- `getNextActiveParticipant(tracker)` devuelve el proximo no eliminado distinto al actual cuando exista.

## Validacion

- `participants` debe ser array.
- Cada participante requiere `id`, `entityType`, `entityId`, `name`, `imagePath` y `defeated`.
- Cada participante requiere `initiative`, `enteredRound` y `activeFromRound`.
- `entityType` debe ser uno de `monster`, `npc`, `playerCharacter`.
- `initiative` debe ser numero.
- `round`, `enteredRound` y `activeFromRound` deben ser enteros mayores o iguales a `0`.
- `currentParticipantId` debe ser `null` o un id existente dentro de `participants`.
- Al parsear escenas antiguas, default inactivo.
- Al parsear escenas con datos invalidos, usar schema para rechazar o normalizar de forma segura.

## Criterios de aceptacion

- El DM puede abrir el modal de `Iniciar batalla`.
- El modal lista monstruos, NPCs y personajes jugadores presentes en escena.
- El DM puede armar el turnero con drag and drop.
- El DM puede capturar iniciativa para cada participante.
- El listado del turnero muestra el valor de iniciativa.
- El DM puede iniciar batalla solo con al menos dos participantes.
- Al iniciar, la barra de turnos aparece en DM y jugador.
- La barra muestra la ronda actual.
- El DM ve boton `Siguiente`; el jugador no.
- `Siguiente` avanza circularmente y salta participantes eliminados.
- `Siguiente` incrementa ronda al completar una vuelta.
- El DM puede eliminar y reincorporar participantes sin quitarlos de la lista.
- El DM puede editar la batalla activa y agregar participantes durante el combate.
- Participantes agregados durante ronda `N` quedan pendientes y entran activos desde ronda `N + 1`.
- Cada participante conserva el dato de ronda en que entro.
- Participantes eliminados se ven en blanco y negro.
- La entidad actual se ve mas grande.
- La siguiente entidad activa tiene halo plateado titilante.
- Guardar/cargar escena preserva batalla activa.
- La ventana de jugador se actualiza con cambios de turno.
- No hay acceso directo del renderer a Node, SQLite ni Electron internals.
