# Spec 33 - Contadores flotantes de escena

## Estado

Implementada para revision.

## Objetivo

Dar al DM una herramienta ligera y general para llevar cuentas visibles durante una sesion: turnos, progreso de un ritual, fases de un acertijo, acciones restantes, tiempo de una amenaza u otros recursos discretos.

Los contadores no pertenecen al sistema de combate. Viven en la escena y pueden utilizarse exista o no una batalla activa. Cada contador se representa como una barra segmentada que el DM incrementa o decrementa rapidamente, y puede publicarse de manera opcional en Player View.

## Contexto

El turnero de combate resuelve el orden de participantes, pero no cubre cuentas paralelas ni situaciones fuera de combate. El DM necesita poder crear y modificar marcadores sin abrir un panel grande ni perder visibilidad sobre el mapa.

La propuesta introduce una coleccion de barras flotantes en la esquina superior izquierda del canvas. En DM son discretas cuando no se usan; en Player View, las que el DM haya publicado son siempre completamente legibles.

## Definiciones

- **Contador:** entidad de escena identificada de forma estable, con etiqueta, tipo, valor actual y configuracion de visualizacion.
- **Capacidad:** cantidad maxima de segmentos de un contador de capacidad fija.
- **Contador dinamico:** contador sin capacidad maxima; su valor puede crecer o decrecer sin limitarse a un numero de segmentos configurado.
- **Progreso:** contador que aumenta desde `0` hacia su capacidad o valor objetivo.
- **Countdown:** contador que comienza lleno y disminuye hacia `0`; su valor visible representa los turnos, acciones o unidades restantes.
- **Segmento:** porcion visual discreta de una barra de capacidad fija.
- **Publicado:** contador visible en Player View. Un contador no publicado es privado del DM.
- **Etiqueta compartida:** opcion que decide si la etiqueta del contador publicado tambien aparece en Player View.

## Alcance

### Incluido

- Crear, editar, eliminar y administrar varios contadores simultaneos en la escena activa.
- Elegir entre contador de progreso y countdown.
- Elegir contador de capacidad fija o dinamico.
- Para capacidad fija, configurar una cantidad positiva de segmentos.
- Incrementar y decrementar rapidamente el valor de cada contador desde su barra flotante de DM.
- Visualizar el progreso con una barra segmentada y el numero actual de unidades.
- Mantener las barras de DM en la esquina superior izquierda del mapa.
- Reducir la opacidad de las barras de DM cuando no se interactua con ellas y llevarla al 100% al pasar el puntero.
- Mostrar las barras publicadas en la esquina superior izquierda de Player View con opacidad completa.
- Permitir al DM publicar u ocultar cada contador para Player View.
- Permitir al DM decidir por contador publicado si su etiqueta se muestra a jugadores.
- Guardar los contadores dentro de la escena `.ttrpgscene` y restaurarlos al cargarla.
- Sincronizar cambios de contador hacia Player View si esta abierta.

### Fuera de alcance

- Atar un contador a iniciativa, rondas, participantes de combate, tokens, monstruos o NPCs.
- Avance automatico por reloj, turno, evento de combate o automatizacion.
- Formulas, expresiones, condiciones o disparadores al llegar a un valor.
- Colores, iconos, reordenamiento o posiciones personalizables por contador en esta primera version.
- Mostrar controles editables a jugadores.
- Historial de cambios, deshacer o auditoria de quien cambio un contador.
- Compartir contadores entre escenas, capitulos o campanas.

## Modelo funcional

Los contadores pertenecen a la escena, no al mapa activo. Por tanto, al cambiar entre mapas de una misma escena se conservan y siguen visibles, y Player View recibe la misma coleccion mientras permanezca en esa escena.

Cada contador debe modelar, como minimo:

```ts
type SceneCounterMode = "progress" | "countdown";
type SceneCounterKind = "fixed" | "dynamic";

type SceneCounter = {
  id: string;
  label: string;
  mode: SceneCounterMode;
  kind: SceneCounterKind;
  value: number;
  capacity?: number;
  isVisibleToPlayers: boolean;
  isLabelVisibleToPlayers: boolean;
};
```

Reglas de integridad:

- `label` es obligatorio y se recorta a una longitud razonable para no romper la barra.
- `value` siempre es un entero mayor o igual que `0`.
- Un contador `fixed` requiere `capacity` entero mayor que `0`.
- Un contador `fixed` limita `value` al rango `0..capacity`.
- Un contador `dynamic` no guarda capacidad y no tiene limite superior funcional.
- `isLabelVisibleToPlayers` solo tiene efecto cuando `isVisibleToPlayers` es `true`; se conserva como preferencia al ocultar temporalmente el contador de jugadores.
- Las escenas antiguas que no tengan `counters` cargan una coleccion vacia sin requerir migracion manual.

## Reglas funcionales

### Crear un contador

1. El DM dispone de una accion clara para abrir la administracion de contadores de escena.
2. La accion `Crear contador` abre un formulario compacto con:
   - etiqueta;
   - modo: `Progreso` o `Countdown`;
   - tipo: `Con espacios` o `Dinamico`;
   - cantidad de espacios cuando el tipo es `Con espacios`;
   - no incluye opciones de visibilidad para jugadores: todo contador nuevo inicia privado.
3. Al crear un contador de progreso, su valor inicial es `0`.
4. Al crear un countdown de capacidad fija, su valor inicial es igual a su capacidad: representa que todos los turnos o unidades siguen restantes.
5. Al crear un countdown dinamico, el formulario solicita un valor inicial positivo o cero, pues no existe una capacidad que permita inferirlo.
6. Al crear un contador dinamico de progreso, el valor inicial es `0`.
7. El contador nuevo aparece de inmediato en la pila flotante del DM y, si fue publicado, en Player View.

### Actualizar valor

1. Cada barra del DM ofrece controles compactos para aumentar y disminuir una unidad.
2. La accion de disminuir nunca permite valores negativos.
3. En un contador fijo de progreso, aumentar no supera la capacidad.
4. En un countdown fijo, disminuir reduce los restantes hasta `0`; aumentar permite recuperar unidades hasta la capacidad.
5. En un contador dinamico, aumentar y disminuir cambian el valor por una unidad sin limite superior.
6. El numero visible se actualiza inmediatamente y expresa siempre el valor actual:
   - progreso: unidades acumuladas;
   - countdown: unidades restantes.
7. Llegar a `0` o a capacidad no elimina, bloquea ni publica automaticamente el contador. El DM conserva el control de la situacion.

### Barra segmentada

1. Un contador fijo se dibuja como una barra con exactamente tantos segmentos como su capacidad.
2. En modo progreso, se rellenan desde el inicio tantos segmentos como indique `value`; los restantes se muestran vacios.
3. En modo countdown, la barra empieza llena y se vacia conforme baja `value`; los segmentos llenos representan unidades restantes.
4. La direccion visual de llenado es consistente de izquierda a derecha para ambos modos. La semantica queda clara por el numero y la configuracion del DM, no invirtiendo la geometria de la barra.
5. Un contador dinamico se representa como barra de progreso proporcional y estable para lectura rapida, sin sugerir una capacidad maxima inexistente. Debe mostrar su valor numerico con claridad; la barra no debe afirmar un porcentaje real.
6. Si el valor dinamico aumenta, la representacion visual debe seguir siendo legible sin provocar layouts rotos ni crecimiento indefinido de la barra.

### Gestion y edicion

1. El DM puede abrir una vista de gestion para editar cualquier contador existente.
2. La edicion permite cambiar etiqueta, modo, tipo, capacidad si aplica, valor y preferencias de publicacion.
3. Cambiar de fijo a dinamico conserva el valor actual y elimina la capacidad.
4. Cambiar de dinamico a fijo requiere una capacidad valida. Si el valor actual es mayor, se ajusta a la nueva capacidad con una confirmacion explicita antes de guardar.
5. Reducir la capacidad de un fijo por debajo de su valor actual requiere la misma confirmacion y ajusta el valor a la nueva capacidad.
6. El DM puede eliminar un contador desde esta vista con confirmacion, porque la accion descarta su estado de escena.
7. Eliminar un contador lo retira inmediatamente de DM y Player View y se persiste con el siguiente guardado de escena.

### Publicacion para jugadores

1. Todo contador se crea privado. La publicacion solo se inicia desde el control de ojo de su barra flotante en DM.
2. Al intentar publicar un contador privado, el DM elige entre `Solo barra` y `Con etiqueta`; la primera opcion oculta el label y la segunda lo muestra en Player View.
3. Al publicar un contador, aparece en la esquina superior izquierda de Player View.
4. Player View muestra solamente una representacion de lectura: sin botones, menus ni tooltips de gestion.
5. Cuando `isLabelVisibleToPlayers` es `true`, Player View muestra la etiqueta y el numero junto a la barra.
6. Cuando `isLabelVisibleToPlayers` es `false`, Player View omite la etiqueta pero conserva la barra y el numero para que el estado siga siendo interpretable.
7. Al ocultarlo, desaparece de Player View sin eliminarlo ni reiniciar su valor.
8. Cambiar valor, etiqueta visible o configuracion de publicacion se refleja en Player View de forma inmediata si la ventana esta abierta.
9. Los contadores nunca permiten interaccion desde Player View.
10. Cada barra flotante del DM incluye un control de visibilidad para publicar u ocultar ese contador en Player View sin abrir el formulario de administracion. Al ocultar, la opcion de etiqueta compartida se conserva para una futura publicacion.

### Persistencia y sincronizacion

1. Los contadores forman parte del estado portable de la escena y se guardan con ella.
2. Las operaciones de crear, editar, incrementar, decrementar, publicar y eliminar deben marcar la escena como modificada y participar en el flujo de guardado/autoguardado vigente.
3. Al cargar una escena, las barras se reconstruyen a partir de sus contadores guardados.
4. Al cambiar de mapa dentro de la escena, los contadores no cambian ni se reinician.
5. Al crear una escena nueva, la coleccion comienza vacia.
6. Al abrir archivos o escenas anteriores sin esta propiedad, la aplicacion usa una coleccion vacia de forma retrocompatible.
7. Al abrir, cerrar o reabrir Player View, la ventana recibe el snapshot vigente de contadores publicados.

## Interfaz esperada

### DM

- Las barras flotantes se apilan verticalmente bajo la etiqueta de oscuridad/vision en oscuridad del canvas del DM, por encima de capas de mapa y gameplay, pero por debajo de modales y menus React.
- La pila debe permanecer dentro del viewport del mapa y no superponerse al panel izquierdo ni a sus hit targets.
- Fuera de hover, las barras se muestran con opacidad reducida para preservar lectura del mapa.
- Al pasar el puntero por una barra o su grupo, la pila relevante alcanza opacidad completa de manera breve y suave.
- Las barras conservan hit targets utilizables incluso con opacidad reducida.
- Cada barra presenta etiqueta, valor, barra visual, control iconografico de publicar/ocultar en Player View y botones de aumentar/disminuir. Los botones tienen tooltip accesible.
- La accion para crear o administrar contadores vive en una zona de controles de escena, no en controles propios de mapa ni dentro del turnero de combate.
- La UI debe funcionar tanto con cero contadores como con varios, sin tapar innecesariamente la vista del mapa.

### Player View

- Las barras publicadas se apilan en la esquina superior izquierda del mapa de jugadores.
- Se muestran al 100% de opacidad y no dependen de hover.
- Mantienen la misma semantica visual de lleno/vacio y el numero actual que ve el DM.
- La etiqueta se ve solo cuando el DM la habilito para jugadores.
- No se muestran barras privadas, controles de ajuste, acciones de edicion ni indicadores de que existen otros contadores privados.

## Casos de uso

### Cuenta regresiva de un ritual

1. El DM crea `Ritual` como countdown fijo de 6 espacios y decide mostrarlo a jugadores con etiqueta.
2. La barra inicia llena con valor `6`.
3. Al terminar cada ronda narrativa, el DM presiona disminuir.
4. La barra pierde un segmento y los jugadores ven `5`, `4`, y asi sucesivamente.
5. En `0`, la barra permanece visible para que el DM resuelva la consecuencia manualmente.

### Progreso privado de acertijo

1. El DM crea `Runas activadas` como progreso fijo de 4 espacios y lo deja privado.
2. La barra inicia vacia en el canvas del DM, con opacidad discreta.
3. Cada solucion correcta aumenta un segmento.
4. Player View no ve ningun indicador del conteo.

### Recurso sin maximo conocido

1. El DM crea `Alertas` como contador dinamico de progreso.
2. Cada error de los jugadores incrementa el valor sin capacidad maxima.
3. El numero expresa el total acumulado y la barra conserva una representacion compacta que no pretende ser porcentaje.
4. El DM puede publicarlo mas tarde sin reiniciar su estado.

### Escena con varios mapas

1. El DM crea contadores mientras esta en un mapa de una escena.
2. Cambia a otro mapa de la misma escena.
3. Los mismos contadores y valores permanecen disponibles, pues pertenecen a la escena.
4. Player View recibe los contadores publicados del mapa activo sin duplicarlos por mapa.

## Criterios de aceptacion

- El DM puede crear varios contadores de progreso o countdown sin iniciar una batalla.
- Un contador fijo muestra segmentos y no permite salir del rango `0..capacity`.
- Un contador dinamico permite aumentar sin definir capacidad y muestra el valor claramente.
- Los controles del DM actualizan el contador de inmediato y no bloquean la navegacion del mapa.
- Las barras de DM quedan en la esquina superior izquierda, atenuadas fuera de hover y opacas al interactuar.
- Un contador privado nunca se muestra en Player View.
- El DM puede publicar u ocultar un contador existente directamente desde su barra flotante.
- Un contador publicado aparece en Player View con opacidad completa y sin controles editables.
- El DM puede decidir independientemente si Player View muestra la etiqueta de cada contador publicado.
- Cambios en el DM se reflejan en Player View abierta sin necesidad de recargarla.
- Los contadores persisten al guardar/cargar una escena y sobreviven al cambio de mapa dentro de ella.
- Una escena antigua sin contadores carga correctamente con una coleccion vacia.
- El turnero de combate puede coexistir con los contadores sin controlar ni reiniciar sus valores.

## Riesgos y decisiones abiertas

- Para los contadores dinamicos, la barra es un indicador cualitativo, no un porcentaje. La implementacion debe evitar que sugiera falsamente un maximo o que se vuelva ilegible con valores altos.
- Si hay muchos contadores, la pila debe seguir siendo operable sin ocultar gran parte del mapa. Esta primera version no define scroll, colapso ni reordenamiento; se validara con la UI real antes de ampliar esos comportamientos.
- La spec asume multiples contadores simultaneos y persistencia a nivel de escena. Ambas decisiones se pueden ajustar antes del plan tecnico sin afectar la idea central.

## Dependencias

- `specs/18-scene-management/spec.md` y `specs/29-multi-map-scenes/spec.md`: propiedad y persistencia de estado a nivel de escena.
- `specs/15-player-window/spec.md`: sincronizacion de snapshots hacia Player View.
- `specs/20-combat-turn-tracker/spec.md`: coexistencia visual y funcional con el turnero, sin dependencia de reglas de combate.
