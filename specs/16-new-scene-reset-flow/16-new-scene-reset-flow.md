# Spec 16 - Nueva Escena y Reinicio de Estado

## Objetivo

Agregar una accion de `Nueva escena` que limpie todo lo cargado en memoria y deje la aplicacion en el mismo estado funcional que al abrirla desde cero. Si existe contenido cargado o cambios en la escena actual, la app debe preguntar si el usuario quiere guardar antes de descartar.

## Contexto

La app ya permite cargar mapas, crear luces, fuego, formas, mediciones, niebla, oscuridad y guardar/cargar escenas `.ttrpgscene`. Actualmente no existe un flujo explicito para empezar una escena nueva sin cerrar y volver a abrir el software.

Esto genera friccion cuando el usuario quiere cambiar de mapa o mesa rapidamente, porque debe borrar elementos manualmente o reiniciar la app.

## Alcance

- Agregar una accion visible `Nueva escena` solo cuando la escena tenga contenido o cambios.
- Limpiar todo el estado en memoria de la escena actual.
- Restaurar la escena al estado inicial equivalente a abrir el software de cero.
- Detectar si hay contenido cargado o cambios que podrian perderse.
- Mostrar un modal de confirmacion antes de descartar una escena con contenido.
- Permitir guardar la escena actual desde el modal antes de limpiar.
- Si el usuario decide guardar, abrir el dialogo existente de guardado `.ttrpgscene`.
- Si el guardado se completa correctamente, limpiar la escena.
- Si el usuario decide no guardar, limpiar la escena inmediatamente.
- Si el usuario cancela el modal o cancela el dialogo de guardado, conservar la escena actual sin cambios.

## Fuera de alcance

- Autosave.
- Historial de escenas recientes.
- Multiples escenas abiertas al mismo tiempo.
- Cambiar el formato `.ttrpgscene`.
- Cambiar la logica interna de guardado/carga salvo lo necesario para reutilizarla.
- Crear persistencia en SQLite.
- Confirmar cierre de aplicacion o cierre de ventana.

## Modelo de interaccion

### Escena vacia

Si la escena esta vacia:

- No se muestra el boton `Nueva escena`.
- No se muestra modal.
- El canvas queda limpio y listo para cargar mapa o crear elementos nuevos.

### Escena con contenido o cambios

Si el usuario hace click en `Nueva escena` y hay contenido cargado:

- Se muestra un modal de confirmacion.
- El modal indica que los cambios actuales se descartaran si no se guardan.
- El usuario puede elegir:
  - `Guardar y crear nueva`,
  - `Descartar cambios`,
  - `Cancelar`.

### Guardar y crear nueva

Si el usuario elige `Guardar y crear nueva`:

1. Se abre el dialogo nativo de guardado `.ttrpgscene` usando el flujo existente.
2. Si el usuario confirma y el guardado termina correctamente:
   - se limpia la escena actual;
   - se cierra el modal;
   - la app queda como recien abierta.
3. Si el usuario cancela el dialogo o el guardado falla:
   - no se limpia la escena;
   - se conserva todo como estaba;
   - se muestra el error recuperable si aplica.

### Descartar cambios

Si el usuario elige `Descartar cambios`:

- Se cierra el modal.
- Se limpia inmediatamente la escena actual.
- No se abre dialogo de guardado.

### Cancelar

Si el usuario elige `Cancelar`, presiona `Escape` o cierra el modal:

- Se cierra el modal.
- No se guarda.
- No se borra nada.
- La escena actual queda intacta.

## Estado inicial esperado

Al crear una escena nueva, deben volver a valores iniciales:

- mapa cargado;
- ruta de mapa;
- camara;
- grilla;
- oscuridad;
- darkvision;
- niebla de guerra;
- luces;
- efectos;
- formas;
- mediciones;
- seleccion actual;
- herramienta activa si aplica;
- modos temporales como ajuste de mapa, ajuste de grilla, niebla activa o drag;
- estado de archivo actual, nombre visible o ruta guardada.

La UI puede conservar preferencias puramente visuales de la aplicacion si no pertenecen a la escena, por ejemplo el sidebar abierto/cerrado, siempre que no provoque confusion ni preserve controles contextuales de objetos ya borrados.

## Deteccion de contenido o cambios

Para esta spec, una escena se considera no vacia o con riesgo de perdida si existe al menos una de estas condiciones:

- hay un mapa cargado;
- hay una ruta de mapa asociada;
- hay luces;
- hay efectos;
- hay formas o mediciones;
- hay niebla revelada;
- hay oscuridad o darkvision configurada distinto al default;
- hay ajustes de grilla distintos al default;
- hay cambios no guardados detectables por el estado de escena.

Si ya existe una bandera de cambios sin guardar, debe reutilizarse. Si no existe, se puede iniciar con una funcion derivada del estado actual y dejar la bandera explicita para una mejora posterior.

## UI

- La accion `Nueva escena` debe estar disponible junto a las acciones principales de escena solo cuando haya contenido o cambios que limpiar.
- El modal debe ser claro, compacto y consistente con el look and feel oscuro/dorado de la app.
- Los botones deben diferenciar acciones:
  - accion primaria: `Guardar y crear nueva`;
  - accion destructiva o secundaria: `Descartar cambios`;
  - accion neutral: `Cancelar`.
- El modal debe bloquear interacciones con el canvas mientras esta abierto.
- `Escape` debe cancelar el modal.
- El foco inicial debe estar en la accion segura o primaria, evitando descartes accidentales.

## Persistencia

- No cambia el schema `.ttrpgscene`.
- Se reutiliza el flujo actual de guardado.
- El renderer no debe acceder directamente a filesystem.
- El guardado debe pasar por la API de preload/IPC existente.
- La nueva escena no debe escribir automaticamente en disco.

## IPC / Electron

- Reutilizar el canal de guardado existente si cumple la necesidad.
- No exponer APIs genericas de Electron, filesystem o IPC al renderer.
- Si se necesita una nueva accion en preload, debe ser especifica y tipada.
- Los errores de guardado deben ser serializables y recuperables.

## Render / PixiJS

- Al crear nueva escena, el render debe limpiar mapa, texturas, sprites, luces, efectos, formas, seleccion, overlays y fog.
- No deben quedar listeners duplicados ni recursos visuales antiguos.
- El canvas debe quedar en un estado valido aunque no haya mapa.
- La camara debe volver al estado inicial definido por la app.

## Criterios de aceptacion

- Existe una accion visible `Nueva escena` cuando la escena tiene contenido o cambios.
- Si la escena esta vacia, no se muestra la accion `Nueva escena`.
- Si hay mapa cargado, se muestra modal antes de borrar.
- Si hay luces, efectos, formas, mediciones o fog, se muestra modal antes de borrar.
- `Guardar y crear nueva` abre el dialogo de guardado `.ttrpgscene`.
- Si el guardado se completa, la escena queda limpia.
- Si el usuario cancela el guardado, la escena actual queda intacta.
- `Descartar cambios` limpia la escena sin guardar.
- `Cancelar` conserva la escena sin cambios.
- Despues de crear nueva escena, no queda seleccion ni panel contextual de objeto.
- Despues de crear nueva escena, el canvas no muestra mapa, luces, efectos, formas, fog ni overlays heredados.
- No cambia el formato `.ttrpgscene`.
- No se agregan accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.

## Riesgos

- Borrar parcialmente el estado y dejar recursos visuales antiguos en PixiJS.
- Considerar vacia una escena que tiene cambios importantes no guardados.
- Abrir el dialogo de guardado y limpiar la escena aunque el usuario haya cancelado.
- Duplicar logica de guardado en vez de reutilizar el flujo existente.
- Resetear preferencias de UI que no pertenecen a la escena y generar una experiencia molesta.

## Notas de implementacion

- Buscar una funcion factory o constante de escena inicial y reutilizarla para evitar defaults duplicados.
- Si no existe una forma centralizada de crear escena inicial, introducir una helper local o de dominio para esta spec.
- Separar el estado persistible de la escena del estado UI temporal antes de resetear.
- Reutilizar callbacks actuales de `Guardar escena` cuando sea posible.
- Considerar una funcion `hasSceneContent` o `hasUnsavedSceneChanges` testeable.
- El modal puede vivir en renderer como estado visual local, pero no debe guardar reglas de persistencia complejas.
