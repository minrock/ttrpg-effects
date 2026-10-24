# Plan de implementacion tecnica - 37 Tiradas 3D del DM

## 1. Resumen

- **Spec fuente:** [spec.md](./spec.md).
- **Estado:** Implementado y aceptado para cierre minor 2.8.0 el 2026-10-24. Entrega registrada en la seccion 21.
- **Rama:** `feature/dm-dice-rolls`, autorizada por el usuario.
- **Objetivo:** integrar dados 3D sobre el mapa, privacidad por tirada, agrupacion de dano, chequeo d20 y log efimero, preservando el renderer Pixi existente.
- **Base:** app 2.7.0; laboratorio temporal `tmp/dice-lab.html` validado visualmente. El lab no se importa desde produccion.
- **Dependencias funcionales:** specs 06 (sidebar), 15 (Player), 24 (camara), 29 (multi-mapa), 30 (brujula), 33 (contadores), 34 (filtros) y regresiones de darkvision de spec 13.

## 2. Contexto real del codigo

- `src/renderer/src/App.tsx` contiene el sidebar derecho, su `SidebarAccordion` local y la apertura automatica de propiedades al seleccionar. La nueva pestana debe integrarse en esos puntos sin reescribir todo el componente.
- `src/renderer/src/components/MapViewport.tsx` ofrece un slot `overlay` dentro del viewport; ya aloja badge de oscuridad y contadores DM. `PlayerApp.tsx` compone la vista y sus overlays publicos.
- `src/main/ipc/player-window-ipc.ts` gestiona la ventana jugador, snapshots, eventos efimeros y validacion por sender. No es un bus de dados; el nuevo flujo debe estar aislado y usar referencias explicitas a la ventana DM autorizada.
- `src/preload/index.ts` y `ttrpg-api.d.ts` exponen funciones tipadas y suscripciones con cleanup.
- `PlayerWindowSnapshot` transporta `SceneDocument`. No incluir historial ni tiradas privadas en este contrato.
- Existen repositorios SQLite, pero no se necesitan: la retencion aceptada es solo de sesion.
- El lab usa `@3d-dice/dice-box-threejs@0.0.12`, Three.js y Cannon ES, importados desde CDN. La app debera empaquetar todos los recursos localmente y funcionar offline.

## 3. Decisiones de arquitectura

### Separacion de responsabilidades

- `domain/dice`: composicion, validacion, aritmetica, percentiles, d20, privacidad y tipos serializables. Sin React, DOM, Electron, Three ni Cannon.
- `application`: coordinador de sesion/tiradas e interfaces para simulacion, historial y presentacion. El main aloja su ciclo de vida; no contiene reglas aritmeticas duplicadas.
- `infrastructure`: simulacion fisica en worker con motor probado, almacen de sesion en memoria y adaptadores de IPC/temporizacion.
- `render/three`: geometria, materiales, luces, sombras, camara y reproduccion de trayectorias. No determina dano ni modifica escenas.
- `renderer`: formulario y overlays React; invoca casos de uso/preload, muestra estados y no muta objetos de la simulacion.

### Una simulacion, dos reproducciones

Usar una mesa fisica canonica independiente de las dimensiones de ventana. Preparar una unica trayectoria con paso fijo y leer las caras realmente asentadas. A partir de ella se construye el resultado del dominio. DM y Player reproducen esa misma trayectoria y poses finales con un inicio coordinado, adaptando solo camara/encuadre.

No basta compartir una semilla y dejar que dos motores simulen contra limites de ventana distintos: pueden divergir y terminar en caras diferentes. No cambiar etiquetas o rotar artificialmente dados al final para tapar una discrepancia. Redimensionar no cambia el mundo fisico ya resuelto.

La preparacion se ejecuta fuera del hilo UI. Publicar un paquete acotado por tirada, no transformaciones por IPC en cada frame ni snapshots del mapa. No persistir trayectorias en el log; liberarlas al vencer su uso visual.

### Motor y licencia

Punto de partida: [dice-box-threejs](https://github.com/3d-dice/dice-box-threejs), motor del lab basado en Three.js/Cannon ES y con licencia MIT. [Cannon ES](https://github.com/pmndrs/cannon-es) aporta fisica de cuerpos rigidos. El worker y el protocolo de replay descritos aqui son una adaptacion propuesta del proyecto, no una API que se asuma disponible en ese paquete.

Antes de integrar, hacer un spike acotado para verificar geometria/caras, hulls de colision y extraccion de trayectoria fuera del DOM. Preferir API publicada. Si hace falta adaptar codigo fuente, limitarlo al puente y definiciones de dados, fijar version/procedencia y conservar licencia; no reimplementar desde cero poliedros, colisiones o lectura de caras. No mantener monkey patches dispersos como los del lab ni dos copias de Three/Cannon.

Instalar dependencias mediante `pnpm` solo durante implementacion aprobada. Auditar exportaciones/versiones y decidir un unico conjunto de dependencias fijado en lockfile; carga diferida de motor, worker y assets. Documentar cualquier cambio de motor antes de integrar si el spike no satisface fidelidad/rendimiento.

## 4. Modelo de dominio

Crear modulos pequenos bajo `src/domain/dice/`, con tests adyacentes:

- `dice-types.ts`: tipos y limites compartidos.
- `dice-roll.ts`: normalizacion del borrador, expansion a piezas y calculo de resultados.
- `dice-roll-schema.ts`: schemas Zod de solicitudes, resultados y eventos.
- `dice-roll-visibility.ts`: proyeccion publica, vigencia y permisos.
- `dice-roll-history.ts`: entrada inmutable y retencion limitada.

Modelo conceptual, a concretar sin ampliar alcance:

```ts
type PoolDie = "d4" | "d6" | "d8" | "d10" | "d12" | "d%";
type D20Mode = "normal" | "advantage" | "disadvantage";
type RollVisibility = "open" | "hidden";
type DiceMaterial = "resin" | "matte" | "metal";

interface DiceGroup {
  readonly id: string;
  readonly damageType: DamageType;
  readonly dice: Readonly<Partial<Record<PoolDie, number>>>;
  readonly modifier?: number; // ausencia equivale a cero
}

interface DiceRollRequest {
  readonly requestId: string;
  readonly contextToken: string;
  readonly groups: readonly DiceGroup[];
  readonly d20: D20Mode | null;
  readonly visibility: RollVisibility;
  readonly showPlayerResult: boolean;
  readonly appearance: DiceAppearance;
  readonly force: number;
}
```

`DiceAppearance` incluye modo de color por tipo/uniforme para dados sin tipo y d20, ID validado de paleta y material. Los grupos tipados toman su color de `DAMAGE_COLORS`. `DamageType` es un enum del catalogo del spec; las formulas se convierten a composicion canonica antes del IPC, nunca se ejecuta texto.

Expandir a `PhysicalDieDescriptor` con `id`, caras, grupo y rol (`pool`, `percentile-tens`, `percentile-units`, `d20-check`). Cada percentil tiene un `pairId`; cada chequeo d20 identifica sus una/dos piezas. No emparejar por orden de llegada o indice de render.

`ResolvedDiceRoll` contiene valores por pieza/logical die, subtotales por grupo, `poolTotal` y `d20Result` con valores, elegido, descartado, modificador y total. En el contrato definitivo `DiceResult`, `d20.value` es la cara conservada y `d20.total` suma su modificador; un chequeo tiene grupos vacios y poolTotal cero. No existe una tirada que simule dano y d20 a la vez. `RollHistoryEntry` anade ID, fecha, contexto de origen, configuracion capturada y estado completada/interrumpida/fallida; no guarda mallas ni frames.

Invariantes:

- Enteros no negativos, grupos no duplicados, IDs unicos y enums validos; al menos una pieza y como maximo 24 tras expandir percentiles y ventaja.
- Fuerza finita 0.5..1.6. Validar limites en UI y en el receptor, sin corregir payloads invalidos silenciosamente.
- Normal usa exclusivamente un d20; ventaja/desventaja exclusivamente dos. Empate: conservar la pieza de menor indice estable. Aplicar `draft.d20Modifier` una vez despues de seleccionar la cara, sin alterar sus valores naturales ni sumar grupos de dano preparados.
- Derivar el critico visual de la cara natural conservada, no del total modificado. Compartir solamente el ID de esa pieza y el instante de reposo para la celebracion publica; ver revision 20.
- d10 de pool produce 1..10. Decenas de d% representan 00..90 y unidades 0..9; convertir al rango 1..100 sin sumar las piezas por separado.
- Verificar que cada pieza esperada tiene exactamente un resultado permitido. Rechazar piezas extra, ausentes o duplicadas.
- Calcular subtotales desde caras originales y modificador validado en la solicitud autorizada, nunca confiar en sumas/modificadores adicionales enviados al completar la simulacion.
- Proyeccion de tirada oculta devuelve ausencia de evento publico; `showPlayerResult` no puede convertirla en abierta.

## 5. Simulacion y presentacion

### Puerto de simulacion

Definir `DiceSimulationPort` en `application/services/`, con preparacion cancelable por `rollId/contextToken`. Entrada: descriptores fisicos, fuerza y estado inicial aleatorio; salida: poses finales, valores observados y referencia a replay acotado.

- Generar aleatoriedad con la fuente del runtime, inyectable en tests; no usar el reloj como unica semilla ni mutar `Math.random` globalmente.
- Worker sin acceso a filesystem ni datos del mapa; recibe solo descripcion de dados y parametros fisicos.
- Mundo canonico inicial propuesto 16:9, colisiones y suelo del motor; limites, escala de piezas y paso fijo versionados con el adaptador.
- Guardar muestras de posicion XYZ y quaternion por ID, interpolables. Propuesta: fisica a 60 Hz y muestras a 30 Hz mas pose final exacta, hasta 12 segundos simulados; presupuesto maximo de paquete 1 MiB validado antes de publicar.
- Si un dado queda ladeado/no asienta, aplicar deteccion del motor y reintento fisico acotado antes de publicar; nunca elegir un numero para sustituir una cara ambigua. Implementado: solver de 20 iteraciones, 15 muestras consecutivas de baja velocidad y alineacion >= 0.99 para reposo estable; impulso fisico para piezas ladeadas. Hasta tres preparaciones completas si alguna no resuelve en 12 segundos simulados. Solo se publica el primer replay completamente resuelto; ningun resultado se habia mostrado ni confirmado antes. Si no se resuelve, devolver error recuperable.
- La fuerza cambia condiciones iniciales, no selecciona ni modifica el numero obtenido.
- Las caras se leen de la pose final del mismo replay. Pruebas especiales de lectura d4 y etiqueta 00/0 de percentiles.

### Adaptador Three

Crear `src/render/three/dice/DiceOverlayRenderer.ts` y adaptadores de geometria/materiales; una instancia por viewport, recursos compartidos dentro de cada renderer cuando corresponda.

- Canvas alpha con fondo transparente y shadow catcher sin superficie opaca. No leer/copiar la textura del mapa ni compartir framebuffers entre Three y Pixi.
- Encajar la mesa canonica en el rectangulo disponible con escala uniforme y margen. Excluir franjas ocupadas por controles/resumen; mantener numero y cara legibles en DM y Player.
- ResizeObserver recalcula encuadre, no fisica. No crear targets de dimensiones cero cuando se oculte/minimice un panel/ventana; esperar un tamano positivo y conservar ultimo estado valido.
- Montar el overlay fuera de transformaciones de mundo/rotacion del mapa. `pointer-events: none`; controles DM del resumen se alojan en una capa React separada.
- Interpolar localmente el replay; aplicar pose final exacta al terminar. Animacion sin `setState` React por frame.
- Lazy init, cache acotada de geometria/texturas, pixel ratio limitado inicialmente a 2 y sombras con resolucion acotada. Ajustar calidad visual si las mediciones lo exigen, sin cambiar la tirada.
- Detener RAF en reposo, al ocultar la ventana y al destruir; al volver, avanzar al instante vigente, no reiniciar. Conservar la pose final sin render continuo hasta cierre manual, reemplazo o cambio de contexto.
- Disponer geometria/materiales/texturas propias, listeners, observers y workers al cerrar. No disponer un recurso prestado compartido mientras otra vista lo utiliza.
- En perdida de contexto o fallo de carga, mostrar el resultado autorizado sin 3D y notificar al DM; no relanzar ni tocar Pixi.

## 6. Sesion, IPC y privacidad

### Coordinador

Crear `application/services/dice-roll-session.ts`, con instanciacion en main y almacenamiento acotado en memoria. Mantener solicitudes activas, ultimo replay publico vigente, estado de presentacion y ultimas 500 entradas privadas. Una tirada activa por sesion DM.

Flujo:

1. UI captura composicion y, si corresponde, pide modo d20. Cancelar no invoca IPC.
2. Main valida sender, solicitud y contexto; asigna `rollId`, registra idempotencia por `requestId` y autoriza preparacion en el worker del DM mediante el adaptador de aplicacion.
3. El worker devuelve resultado/replay; el receptor valida estructura, IDs, limites y contexto vigente. El dominio deriva los totales.
4. Main fija el inicio compartido, confirma la entrada en memoria y entrega replay/resumen al DM. Solo para abierta construye y envia un DTO publico al jugador.
5. Cada vista reproduce por tiempo relativo al inicio. Registrar resultado calculado una vez; la UI lo expone al asentarse la animacion, no durante su preparacion.
6. Al cerrar manualmente, liberar replay/poses de esa tirada; el log conserva solo resultado compacto. Una presentacion posterior del resumen no necesita mallas ni replay. Sin expiracion temporal: main conserva como maximo un replay DM y uno publico, cada uno acotado a 1 MiB; se liberan tambien al reemplazarse o cambiar contexto.

El main coordina y valida, no simula por frame. El renderer DM es el host autorizado del worker; las respuestas tardias se ignoran usando token de sesion/contexto y revision. Si muere antes de confirmar, marcar interrumpida y permitir nueva solicitud, sin atascar el coordinador. El historial ya confirmado sobrevive a recarga del renderer mientras la app siga abierta.

### API especifica propuesta

Declarar tipos compartidos para estas operaciones en preload, sin exponer canales genericos:

| API / canal | Permiso y funcion |
| --- | --- |
| `beginDiceRoll` / `dice:begin` | Solo DM: reservar y validar solicitud, devolver ID/token. |
| `completeDiceRoll` / `dice:complete` | Solo DM host: entregar resultado de simulacion/replay de solicitud autorizada. |
| `failDiceRoll` / `dice:fail` | Solo DM host: informar fallo/interrupcion de preparacion. |
| `updateDiceContext` / `dice:context` | Solo DM: actualizar generacion al abrir/cerrar escena o navegar mapa; invalidar pendientes/overlay. |
| `getDmDiceSession` / `dice:dm-state` | Solo DM: borrador/preferencias, solicitudes e historial privado en memoria. |
| `updateDicePreferences` / `dice:preferences` | Solo DM: preferencias/borrador serializables validados de sesion. |
| `clearDiceHistory` / `dice:clear-history` | Solo DM: limpiar log tras confirmacion UI. |
| `dismissDiceRoll` / `dice:dismiss` | Solo DM: validar rollId y retirar esa presentacion en ambas vistas sin eliminar historial. Cierre idempotente; no afecta otra tirada. |
| `setDiceResultVisibility` / `dice:result-visibility` | Solo DM: modificar resumen de ultima abierta, contexto vigente y revision creciente. |
| `getPublicDiceState` / `dice:public-state` | Player autorizado: recuperar exclusivamente presentacion publica vigente. |
| `onDicePresentation` / `dice:presentation` | Push dirigido por rol: nunca difundir indiscriminadamente a todas las ventanas. |
| `reportDiceRenderStatus` / `dice:render-status` | Cada ventana autorizada reporta fallo visual por rollId; no modifica valores. |

Los nombres definitivos pueden ajustarse al estilo local conservando un contrato por accion. Cada suscripcion devuelve unsubscribe. Validar Zod, sender exacto por webContents, ventanas destruidas, rollId, generacion, secuencia, enums, tamanos y buffers finitos. Player no puede consultar estado DM ni enviar lanzamientos/completados, aunque comparta preload.

La visibilidad se lee de la solicitud ya autorizada en main, no de un booleano nuevo al completar. Resultado privado no entra en `PlayerWindowSnapshot`, `latestSnapshot`, logs de consola o eventos de readiness. Redactar errores publicos sin formulas o valores secretos.

Los dos procesos usan el reloj local compartido (`Date.now`); main fija un inicio comun 180 ms despues de confirmar. Reanudacion/evento tardio aplica el instante actual o la pose final; nunca reproduce desde cero si la animacion ya termino. Usar rollId/revision para descartar duplicados o mensajes fuera de orden. No hay sincronizacion entre maquinas ni garantia frente a un cambio manual del reloj del sistema durante la tirada.

### Ciclo de vida y contexto

- El contexto lleva identidad de sesion de apertura de escena y mapa activo, no solo `scene.id`; reabrir el mismo archivo invalida mensajes anteriores.
- Historial guarda nombres de origen solo para el DM. Publicar solamente datos requeridos para dibujar dados y resumen, sin rutas locales, notas o historial.
- La apertura tardia del jugador consulta estado publico aparte del snapshot de escena, cuando su contenido esta listo. Recupera la pose final si sigue abierta; no muestra nada tras cierre manual o cambio de contexto.
- `DicePresentation` no incluye `expiresAt`. `sweep` solo controla timeout de preparacion, no elimina presentaciones asentadas. `dismiss(rollId)` publica envelopes nulos con revision creciente solo en los roles donde coincide el ID; cerrar una oculta no emite al jugador. Desactiva `publicResultVisible` al retirar su presentacion.
- Cambiar mapa cancela presentacion, no elimina logs. Resultado confirmado queda registrado; pendiente sin resultado se marca interrumpido. La solicitud de cambio de contexto debe ordenar/invalidar completados en carrera.
- Oculta no sustituye `latestPublicRoll`. Su inicio/fin no genera ningun mensaje al jugador.
- Cerrar Player no destruye la sesion DM. Cerrar la app elimina memoria; ninguna operacion de dados ejecuta guardado de escena.

## 7. UI e integracion

Crear `components/dice/` con responsabilidades enfocadas:

- `DicePanel`: estructura y conexion con controlador, sin aritmetica en JSX.
- `DiceAppearanceControls`: privacidad, swatches/material, fuerza y resultado para jugadores.
- `DicePoolEditor`: grupo activo, cantidades, resumen/edicion de grupos y d20 binario.
- `D20RollModeDialog`: eleccion Normal/Ventaja/Desventaja con validacion de piezas y foco.
- `DiceRollHistory`: lista paginada/virtualizada, resultados inmutables y accion de resumen para ultima abierta vigente.
- `DiceOverlay`: lifecycle del renderer Three y presentacion textual de resultado; independiente de tabs. Solo un timer para exponer el resumen al asentarse, ninguno de expiracion. X Lucide arriba a la derecha del resumen DM, con callback `onDismiss(rollId)` conectado al controlador; Player solo recibe el cierre. Boton de 30 x 30 px, foco/tooltip, espacio reservado sin tapar valores y eventos aislados del mapa.
- `useDiceSession`: estado de formulario y eventos; delega validacion/calculos al dominio y control a application/preload.

Modificar puntualmente `App.tsx`:

- Agregar estado de tab derecha y roles ARIA tablist/tab/tabpanel, Propiedades por defecto.
- Envolver el contenido existente de sidebar en Propiedades y montar Dados como panel alternativo; conservar accordions, handlers y visibilidad global.
- Extender la seleccion explicita de objetos para activar Propiedades; no dispararlo por cada actualizacion de escena o llegada de resultados.
- Montar overlay dentro del viewport mediante su slot existente, sin desmontarlo al cambiar la tab ni recrear Pixi.
- Emitir cambios de contexto desde los flujos reales de carga/navegacion, no desde cada setScene ni cada frame de camara.

Modificar `PlayerApp.tsx` para suscribirse solo a presentacion publica, hidratarla tras readiness y montar overlay read-only. Los controles de zoom, brujula, contadores y turnero conservan prioridad y acceso.

Extender `styles.css` con dimensiones estables y estilos locales: fondo transparente, resumen sin tapar caras, contraste por swatch, estados disabled/busy/foco, colores existentes de la app. No introducir una segunda libreria de UI. No capturar espacio/Delete/Backspace en el mapa cuando el foco este en formulario o dialogo; cancelar el dialogo no cancela herramientas ajenas.

## 8. Plan de trabajo

1. Revisar/aprobar spec y plan; defaults aceptados por la orden de implementar.
2. Spike de motor offline y worker: todos los dados, lectura de caras, replay identico en dos proporciones y limites de memoria/latencia. Registrar decision de dependencias/licencias.
3. Implementar dominio, schemas, expansion/agrupacion, percentil y d20 con unit tests.
4. Implementar coordinador efimero, idempotencia, contextos, DTO publico y pruebas de privacidad antes de conectar ventanas.
5. Implementar puente IPC/preload con permisos por sender y recuperacion de sesion; tests de errores y mensajes fuera de orden.
6. Implementar renderer Three/replay y overlay con resize, cleanup, fallbacks y convivencia con Pixi.
7. Implementar tabs/formulario, dialogo d20, composicion y log; integrar App y Player sin alterar schemas de escena.
8. Completar pruebas automatizadas, smoke Electron, screenshots y mediciones sobre mapa grande; corregir regresiones antes de presentar al usuario.
9. Actualizar docs relacionadas con el comportamiento efectivamente implementado y registrar evidencia/limitaciones. Esperar revision del usuario antes de cerrar.
10. Solo con orden de cierre: bump minor desde version vigente, changelog, commit/merge/push y `./scripts/build-dmg.sh` conforme a AGENTS.md. Esta autorizacion documental no autoriza esas operaciones.

## 9. Pruebas y regresiones

### Dominio

- Todos los rangos de caras, cantidades invalidas y limites de piezas, incluidos percentiles y dos d20.
- Multiples grupos con mismo tipo de dado; cambio de grupo activo sin reasignacion; fusion y borrado de grupos.
- Percentiles `00+0=100`, `00+7=7`, `90+0=90`, parejas multiples e independientes de d10 normales.
- Normal/ventaja/desventaja, empate, conservado/descartado y d20 separado de todos los subtotales.
- Totales derivados, payload con sumas alteradas, dados faltantes/extra y snapshots historicos inmutables.

### Aplicacion e IPC

- Abierta y oculta con Player visible, precargado/oculto, cerrado y reabierto. Espiar todos los envios/getters publicos para demostrar ausencia de datos de tiradas ocultas, no solo ausencia de DOM.
- Player intentando begin/complete/dm-state/preferences/clear-history: rechazo sin filtracion.
- Resultados desactivados: sin resumen UI pero caras impresas visibles; control de visibilidad no permite publicar una oculta.
- Doble click, confirmacion repetida, reintento de requestId, revision obsoleta y completado tras navegacion o renderer destruido.
- Cierre de Player conserva log; recarga DM recupera log de memoria; reinicio app inicia vacio; nada nuevo se serializa ni marca dirty la escena.
- Oculta no limpia una abierta en Player; cierre manual por ID, ultimo resultado abierto y cambio de contexto correctamente aislados. Simular una hora sin cierre, cierre repetido/atrasado y cierre con resumen publico oculto. Player no puede invocar `dice:dismiss`.
- Replay demasiado grande, numeros no finitos, quaternions invalidos y IDs inconsistentes rechazados antes de render.

### UI

- Orden y tabs, teclado/foco, seleccion contextual, conservacion de borrador y accordion al alternar.
- d20 sin stepper, modal cancelable, limites segun modo y controles ocupados sin bloquear mapa.
- Cantidades por grupo, paleta completa, contraste de numeros en cada material y nombres largos sin overflow.
- Historial de 500 entradas sin cientos de nodos fuera de pantalla; limpiar con confirmacion; no sumar d20 al dano.

### Render, Electron y rendimiento

- Comparar poses/caras finales con resultado canonico para todos los dados; identicos en ambas ventanas, no solo mismo total.
- Capturas y checks de pixeles de canvas no vacio en ventana DM minima, escritorio, Player 16:9 y vertical; probar resize durante tirada, cambio de monitor/DPR, fullscreen y minimizar/restaurar.
- Norte 0/90/180/270, zoom extremo, camara auxiliar, pan, fog, darkvision, oscuridad magica, filtro horario raster, fuego/relampago, contadores y turnero. No introducir pantalla negra, exposicion de mapa oculto ni framebuffer de tamano cero.
- Abrir/cerrar Player y repetir 100 tiradas: sin crecimiento ilimitado de texturas, listeners, workers, buffers ni RAF en reposo.
- Medir en mapa grande con 1, 8 y 24 piezas y ambas ventanas. Objetivos iniciales: preparacion p95 <= 500 ms, animacion cercana a 60 fps en el equipo de referencia y sin tareas UI > 50 ms atribuibles al calculo fisico. Registrar hardware, resoluciones, DPR, p50/p95 y diferencias contra mapa sin dados; ajustar presupuesto explicitamente si no se alcanza.
- Medir mensajes/bytes por tirada, no por frame; replay <= 1 MiB, ninguna republicacion del mapa por animacion. Historial almacena resultados pequenos, no trayectorias.
- Offline real con app empaquetada, sin CDN. Sin WebGL/perdida de contexto/worker fallido: fallback o error sin relanzamiento oculto ni bloqueo del mapa.
- Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check`. Registrar resultados reales, sin marcar como hechos los tests descritos en este plan.

## 10. Riesgos y controles

| Riesgo | Control |
| --- | --- |
| Fisica distinta entre ventanas | Simulacion unica, mesa canonica y replay compartido; resize solo cambia encuadre. |
| Filtrar una tirada oculta | DTO por rol, canales separados, sender validado y tests de todos los envios/getters publicos. |
| Paquete del lab acoplado a DOM | Spike de worker/API antes de integrar; adaptador limitado con version/licencia y pruebas. |
| Render 3D compite con Pixi | Recursos independientes, carga diferida, calidad acotada, RAF bajo demanda y benchmark con escena real. |
| Resultado no coincide con cara | Lectura desde pose final, IDs estables, tests de d4/d10/percentiles, sin parches de numeros posteriores. |
| Cambio de mapa mezcla tiradas | Token de contexto por apertura y mapa, invalidacion ordenada y deduplicacion. |
| Historial o assets crecen sin limite | 500 entradas compactas, replay acotado/liberado y caches con ownership claro. |
| Tab nueva rompe propiedades | Integracion localizada y regresiones de seleccion/accordions, sin refactor general de App. |

## 11. Documentacion afectada al implementar

- Spec/plan 06: tabs derechas y seleccion contextual. Su exclusion historica de tabs deja de aplicar solo a esta extension.
- Spec/plan 15: overlay publico de dados, resumen opcional y protocolos nuevos, sin historial privado.
- Spec/plan 01: convivencia de overlay Three con mapa Pixi, recursos y rendimiento. Pixi sigue siendo motor del mapa.
- Spec/plan 03: dejar constancia de que dados/log no se persisten; no cambiar version de archivo ni migraciones.
- Esta spec/plan: decision efectiva de motor, pruebas, presupuesto y ajustes aprobados. El laboratorio sigue siendo descartable.
- `package.json`, `pnpm-lock.yaml`, licencias y `CHANGELOG.md` durante implementacion/cierre segun corresponda; version de release solo al cierre autorizado.

## 12. Checklist

- [x] Requerimiento y plan redactados en rama autorizada.
- [x] Confirmado d20 separado del dano e historial solo de sesion.
- [x] Revision y aprobacion para implementar del usuario.
- [x] Spike tecnico y dependencias/licencias validados.
- [x] Dominio, privacidad, IPC y ciclo de vida implementados/testeados.
- [x] UI y renderer integrados; ver alcance real de regresiones abajo.
- [x] Verificacion ejecutada y limitaciones registradas; matriz ampliada no certificada.
- [x] Docs relacionadas actualizadas con comportamiento real.
- [x] Aceptacion del usuario para cierre, versionado y entrega.

## 13. Implementacion efectiva

- `domain/dice/dice.ts`: contratos Zod, grupos, limites, expansion estable, percentiles, d20, resultados y validacion de replay. El request efectivo agrupa composicion/preferencias en `draft`; los tipos definitivos son `PhysicalDie`, `DiceSimulation`, `DicePresentation` y `DiceHistoryEntry`.
- `application/services/dice-roll-session.ts`: coordinador puro instanciado por main. Historial de 500 entradas, IDs de solicitud acotados, revisiones por rol, cierre manual y cancelacion por contexto. No se agrega repositorio ni singleton global.
- `infrastructure/dice/`: puerto de simulacion con Cannon ES en worker, aleatoriedad de `crypto`, timeout/abort y terminacion del worker. Fisica 60 Hz y replay 30 Hz; numeros redondeados a cinco decimales, validacion de cantidad/valores/rotaciones antes de publicar.
- `main/ipc/dice-ipc.ts` y `preload/dice-api.ts`: acciones especificas, sender y frame principal exactos. Player solo obtiene DTO publico; no recibe ninguna solicitud ni resultado oculto. El snapshot de mapa no transporta dados.
- `render/three/dice/DiceOverlayRenderer.ts`: Three 0.143.0 y Cannon ES 0.20.0 empaquetados localmente. Geometria/materiales proceden del subconjunto MIT de `@3d-dice/dice-box-threejs` 0.0.12, commit `6945e0068eae27f22acd26debdb70f6ef2fd6063`; licencia y modificaciones en `vendor/README.md`. Se conserva el generador probado sin su orquestador DOM ni importaciones CDN. No se agrega el paquete completo ni otro Three en paralelo.
- `components/dice/`: `DicePanel` mantiene controles/historial y un dialogo local, `DiceResultSummary` comparte representacion, `RightSidebarTabs` gestiona teclado, `DiceOverlay` administra el renderer diferido. Se mantienen estos limites sin extraer componentes triviales para cada campo. Estilos locales en `dice.css`, no cambios generales al tema.
- `useDiceSession` coordina datos de sesion. Solo el token de apertura/mapa invalida una tirada: pan, zoom y cambios de metadata no la reinician. Tests cubren tambien canvas inicial sin mapa y rechazo de revisiones antiguas.
- El renderer interpola sin render React por frame, detiene RAF al asentarse y cuando la ventana esta oculta. Shadow catcher transparente, DPR maximo 2, shadow map 1024. Recursos propios separados de Pixi; no hay framebuffer compartido ni targets de tamano cero.
- El resumen grande compacta los valores individuales cuando hay mas de tres grupos, sin quitar subtotales ni d20; el log conserva el detalle. La altura reservada depende del numero de grupos y del ancho real del viewport.
- No se modifica `SceneDocument`, SQLite, undo, guardado ni version de formato. Version de producto pendiente de cierre autorizado.

## 14. Verificacion de implementacion

Equipo de prueba: Apple M2. Las pruebas siguientes no sustituyen una certificacion de todos los monitores/escenas.

- Dominio: cantidades y composicion, rangos, d20/empate, percentiles, totales separados, replay invalido y limites.
- Fisica: todas las geometries, replay reproducible con fuente aleatoria inyectada, 24 piezas, 30 semillas mixtas y 20 composiciones de 24 piezas mixtas en los dos extremos de fuerza. La regresion detecto y corrigio jitter de contacto que impedia reposo.
- Aplicacion/IPC: privacidad por rol, sender/frame, replay tardio, idempotencia, cancelacion, limite de historial, reapertura y visibilidad posterior del ultimo resultado abierto. La regresion de expiracion inicial se sustituye por permanencia y cierre manual en la revision siguiente.
- UI: orden, 17 swatches, d20 sin cantidad, cancelar/confirmar dialogo, limites, grupos, tab con teclado e historial privado. Hooks cubren contexto estable, revisiones y canvas vacio.
- Smoke Electron: tiradas ocultas/abiertas, d20 normal/ventaja/desventaja y grupos de dano. Player nativo muestra caras, etiquetas y resumen publico sobre mapa sintetico 4096 x 3072 con darkvision y norte a 90 grados, sin pantalla negra ni errores de framebuffer observados.
- Harness temporal con renderer/worker reales, canvas 1264 x 607: nueve piezas (todos los tipos, dos d20) preparacion 112.5 ms, replay 53,769 bytes, frame p50/p95 16.6/18.4 ms, 28,525 pixeles opacos y 725,235 transparentes. 24d6: 106.5 ms, 128,944 bytes, p50/p95 16.6/18.5 ms. Son muestras visuales aisladas, no p95 de preparacion ni benchmark de Pixi y Three simultaneos.
- 100 reproducciones/reemplazos en el mismo renderer: 8 geometries y 78 texturas estables, sin crecimiento de esos contadores. No equivale a 100 aperturas de Player ni una medicion completa del heap/GPU.
- Capturas Playwright a 1280 x 720 y 390 x 844; todos los poliedros visibles, transparencia preservada y etiquetas acomodadas evitando otras caras/etiquetas. Comprobacion final vertical: 3,662 pixeles opacos, 267,768 transparentes y frame p50/p95 16.6/19.4 ms. El harness temporal se retiro despues de verificar.
- Smoke de salida compilada: Electron carga `out/renderer/index.html` desde disco, con siete piezas incluyendo percentil. Worker, geometria, texturas, animacion y resultado final correctos sin Vite. Un bootstrap temporal resolvio la ruta del icono externo a `assets/` (normalmente la provee el empaquetado); no se modificaron permisos ni codigo de produccion para esta prueba. No equivale a probar el DMG ni a desconectar la red del equipo.
- Comandos finales: `pnpm test` correcto, 697 tests en 87 archivos; `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check` correctos. Build incluye worker local y chunk Three diferido. Warnings de build existentes de directivas `use client` en Lucide/Radix.
- Durante recargas HMR hubo mensajes Electron/Chromium `SharedImageManager::ProduceSkia` y avisos nativos de menus; no se observaron errores de framebuffer de tamano cero durante tiradas. El smoke compilado no emitio errores de dados/WebGL; permanece el aviso de SQLite experimental existente.

Pendiente de validacion ampliada antes de distribucion amplia: benchmark p50/p95 de preparacion en escena compleja con ambas ventanas; monitores/DPR/fullscreen; matriz completa de fog, efectos, camara auxiliar y filtros horarios; 100 aperturas/cierres; prueba offline de DMG empaquetado y perdida real de GPU. No se construye instalador en esta entrega ni se declaran esos escenarios ejecutados.

## 15. Revision: permanencia y cierre manual

Solicitud posterior: mantener dados y resultados hasta cerrar explicitamente el resumen. Se elimina la expiracion de seis segundos y el fade de retiro. La X del DM retira la misma tirada en ambas vistas sin borrar el historial ni afectar una tirada publica diferente. Player conserva el overlay de solo lectura.

- Tests de coordinador: una hora simulada sin caducar, cierre con/sin resumen publico, cierre repetido, cierre de oculta sin mensajes al jugador, cierre atrasado sin afectar tirada nueva y republicacion estatica tras cierre.
- Tests IPC: `dice:dismiss` solo acepta DM/frame principal y rollId valido; el jugador recibe exclusivamente envelope nulo, no estado/historial privado.
- Tests React: resumen aparece al asentarse, sigue visible pasada una hora, X accesible con icono, click aislado del mapa, retiro del renderer mediante envelope nulo y resumen publico desactivado sin filtracion.
- Smoke nativo Electron: 2d6 abiertos con resultado 4 + 5 = 9. Dados/resumen presentes mas alla del timeout anterior; abrir Player despues recupera las caras finales y el total. X en la esquina superior derecha del DM retira dados y resumen en ambos tableros, conserva una entrada en historial y actualiza su accion a Mostrar resultado. Sin cambios de mapa ni guardados durante la prueba.
- Verificacion de esta revision: `pnpm test` correcto (704 tests, 88 archivos), `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check` correctos. Solo warnings de build preexistentes de directivas `use client`. No se cambia version ni se genera DMG; sin commit/merge/push.

## 16. Revision: colores por dano y formulas

Implementar ambos extras en la misma feature abierta, sin release ni cambios de formato de escena:

1. Extender `DiceGroup` y `DiceGroupResult` con `modifier` entero opcional (-9999..9999, ausencia = 0). Mantener limite de 24 piezas; el modificador no ocupa ninguna. Sumarlo una vez por grupo, nunca al d20; mostrarlo en formula, desglose, subtotal y log.
2. Centralizar composicion con `setGroupComposition`, `updateGroupModifier` y `withModifier`. Fusion de tipos suma dados y modificadores. Conservar IDs existentes y generar un ID libre al agregar un tipo cuyo nombre ya es ID de otro grupo renombrado.
3. Parser probado: `@3d-dice/dice-roller-parser` 0.2.6, MIT, [fuente y API parse](https://github.com/3d-dice/dice-roller-parser#just-parse-the-value). Dependencia pequena sin dependencias de runtime (aproximadamente 278 KB instalada); se usa exclusivamente `parse`, nunca su generador aleatorio. El worker Cannon sigue siendo la unica fuente de caras. Import nombrado `DiceRoller`: el export default del UMD no funciona bajo la interoperabilidad de Vite, aunque los tests Node lo aceptaban.
4. `domain/dice/formula.ts` limita entrada a 256 caracteres y al alfabeto de dados/sumas/restas antes de llamar al parser. Validar AST con Zod: enteros o dados soportados, suma y resta de constantes, sin label sobrante, funciones, grupos ni modificadores avanzados. Consolidar terminos y alias d100/d%; no usar eval, Function ni un parser propio. `composeFormulaDraft` valida todos los grupos y el presupuesto total.
5. `DicePanel` mantiene modo y textos incompletos en estado UI. Preferencias y solicitudes a main contienen solo grupos canonicos; un error activo/inactivo impide lanzar y cambiar al modo manual. Ambos modos comparten composicion; el campo de modificador tolera signo incompleto y bloquea lanzar hasta corregir/limpiar. Al lanzar por formula se pasa el snapshot validado al hook, incluso si quitar otro grupo acaba de liberar presupuesto. No ejecutar silenciosamente el ultimo borrador valido.
6. `domain/dice/appearance.ts` define paleta por `DamageType` y `physicalDieColor`. `expandDice` adjunta el tipo autorizado a cada pieza (ambas mitades del percentil, none para d20). Three aplica ese color con el material elegido y contraste de cara; paleta manual/multicolor solo para none/d20. Compartir descriptores en DTO publico, sin depender del resumen opcional. Cambiar color/tipo no altera tiradas previas.
7. Swatches discretos en selector de grupo, iconos del modo manual, grupos y resultados. Controles de formula/modificador con error accesible, labels, limites, foco y sin invadir el mapa. No introducir otra libreria UI ni cambiar el cierre manual.
8. Regresiones: sintaxis y AST invalidos, texto sobrante, d20 separado, percentiles, cantidades/modificadores fuera de limite, grupos fusionados e IDs, roundtrip entre modos, errores en grupo inactivo, presupuesto liberado tras borrar grupo, snapshot exacto al lanzar, color igual en todos los dados de un tipo y subtotal derivado en main desde solicitud autorizada (ignorar metadata falsa al completar).

Verificacion de esta revision:

- Pruebas automatizadas de dominio, colores, formulario, coordinador e IPC, incluida recuperacion tras liberar presupuesto y modificador con signo incompleto. Suite completa: 756 tests en 90 archivos.
- Harness temporal con componentes reales, coordinador de sesion y worker/renderer reales. Se verificaron formula `2d6 + 3d4 + 2` de Fuego y `2d8 - 1` de Frio, siete piezas y mismos resultados en vista DM/publica. El cierre manual conserva su cobertura automatizada. El harness se retiro; no queda una segunda implementacion ni una pagina de laboratorio en produccion.
- Capturas Playwright en escritorio 1280 x 720 y Player 390 x 844. Conteo de pixeles justo tras resize/render, antes de descartar el drawing buffer: escritorio 41,363 opacos (26,674 naranja, 13,136 cian); vertical 8,087 opacos (5,291 naranja, 2,607 cian). Dados transparentes sobre grilla, caras y subtotales legibles, sin solapamiento con el resumen. Resultado comprobado Fuego 19, Frio 4, total 23.
- No se reinicio ni modifico la escena que el usuario tenia abierta en Electron. Main requiere reiniciar la instancia de desarrollo despues de guardar ese trabajo para usar los contratos nuevos. La verificacion visual aislada no se presenta como smoke de dos ventanas Electron ni como benchmark de rendimiento nuevo.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check` correctos; solo warnings de build preexistentes sobre directivas `use client`. Regresiones del panel repetidas tras ajustar el resumen de una formula que recupera presupuesto.

Sin persistencia nueva, bump de version, commit, merge, push ni instalador.

## 17. Revision: modificadores explicitos en el toast

- `DiceResultSummary` muestra una linea `Modificador +N/-N` por grupo cuando no es cero, incluso en modo compacto (mas de tres grupos). Compartir presentacion con historial y Player autorizado. No recalcular totales en React: main ya incluye cada modificador una sola vez y mantiene el d20 separado.
- `DiceOverlay` reserva 20 px adicionales por fila cuando hay modificadores, antes de iniciar la animacion, para que el nuevo detalle no invada las caras.
- Regresiones del resumen: positivos, negativos, dano fijo, ausencia/valor cero, detalle y compacto, subtotal/total sin duplicacion y d20 independiente. Regresiones del overlay DM/Player: detalle visible con cuatro grupos y espacio reservado adicional; conservar privacidad y cierre manual.
- En desarrollo, reiniciar Electron tras guardar el trabajo abierto cuando cambian los contratos de main. HMR del renderer no actualiza el coordinador en memoria: un proceso anterior puede omitir modificadores y tipos de dano aunque el formulario ya sea nuevo. No reiniciar automaticamente la instancia del usuario.
- Paleta definitiva por tipo de dano pendiente de los colores que indique el usuario; esta revision no reasigna colores.
- Verificacion: 761 tests en 91 archivos, typecheck y lint correctos. Toast compacto revisado con cuatro grupos y d20 mediante capturas Playwright a 1280 x 720 y 390 x 844, con modificadores positivos/negativos legibles y sin solapamiento. Harness temporal solo de presentacion, retirado al terminar; no reemplaza ni reinicia la instancia Electron del usuario.

## 18. Revision: contrato del motor y suma efectiva

- Reproduccion en la instancia Electron abierta: seleccion Acido `3d6 + 5`, pero toast e historial devolvian formula `3d6`, caras 4/3/5 y total 12. El proceso main seguia abierto desde antes de introducir modificadores; su esquema antiguo descartaba el campo que el renderer actualizado enviaba. El calculo vigente en `resolveDiceRoll` suma correctamente el modificador validado.
- Anadir `DICE_PROTOCOL_VERSION` a `DiceSessionState`. Main lo anuncia y `useDiceSession` comprueba compatibilidad al hidratar y de nuevo antes de `beginDiceRoll`. Una version ausente/distinta impide lanzar con un aviso para guardar y reiniciar Electron. No inferir modificadores desde el borrador actual ni corregir resultados historicos en React.
- Regresion IPC de extremo a extremo del servicio: preferencias, solicitud, simulacion, respuesta, historial y eventos DM/Player; Acido 4+3+5+5=17, Frio 2+4-1=5 y total 22, d20 separado. Repetir con modificadores negativos y cero. Regresion del hook: motor antiguo/futuro incompatible no inicia una tirada.
- No cambiar el formato de escenas ni reiniciar/cerrar automaticamente trabajo abierto; el historial sigue siendo efimero y se pierde al reiniciar.
- Verificacion: 767 tests en 91 archivos, lint y build (incluye typecheck) correctos; warnings `use client` de dependencias sin cambios. La comprobacion de IPC cubre totales con +5, -3 y cero, e incluye reevaluar compatibilidad antes del lanzamiento aunque el panel se haya abierto con un motor compatible. En la instancia Electron antigua se verifico el aviso visible y el boton Lanzar deshabilitado. Reinicio y smoke nativo con el motor nuevo pendientes de confirmacion del usuario; no se altero su escena ni se cerro su proceso.

## 19. Revision: chequeo exclusivo y modificador d20

Esta revision sustituye la posibilidad original de combinar fisicamente chequeo y dano en una misma tirada.

1. `DiceDraft.d20Modifier`: entero validado -9999..9999, default cero para borradores anteriores. Los grupos y modificadores de dano se conservan independientemente; no cambiar formato `.ttrpgscene`.
2. `countPhysicalDice` y `expandDice`: si hay modo d20, devolver solo una/dos piezas check. Validar por separado el pool preparado (maximo 24), sin sumar su presupuesto al chequeo. `resolveDiceRoll` produce grupos vacios y poolTotal cero para checks; conserva caras, seleccion y `value` natural, y anade `modifier`/`total` desde el request autorizado. Los rolls de dano ignoran d20Modifier.
3. `DicePanel`: checkbox de d20 antes del editor de dano; input de modificador condicional, reutilizando validacion firmada con IDs accesibles independientes. Fieldset de dano deshabilitado mientras hay check, sin desmontar formulas ni perder borradores. Errores de dano no bloquean d20; error d20 no bloquea dano al apagarlo. El dialogo confirma modo y muestra modificador; limpiar reinicia ambos. `launch` usa el draft validado del chequeo, no una formula de dano pendiente.
4. Resumen DM/Player e historial muestran total d20 y modificador con signo, manteniendo caras elegida/descartada. Etiquetas 3D siguen mostrando caras naturales. Reservar espacio adicional tambien para el modificador del check. Sin subtotal de dano durante el check.
5. Subir `DICE_PROTOCOL_VERSION` a 2 para impedir que un main anterior lance tambien el pool o descarte el modificador d20. Requiere reiniciar Electron; no hacerlo automaticamente sobre trabajo del usuario.
6. Regresiones: normal/ventaja/desventaja con modificadores positivos/negativos/cero, limites, empate, pool de 24 intacto, dano fijo omitido en checks, vuelta a dano sin d20Modifier, privacidad y resultados iguales DM/Player/log, input condicional, formulas incompletas independientes y modificador capturado sin depender de preferencias cambiadas durante la simulacion.

Verificacion de esta revision:

- Suite completa: 784 tests en 91 archivos. Typecheck, lint y build correctos; solo warnings `use client` preexistentes. Pruebas fisicas actualizadas para cubrir todos los poliedros con tiradas de dano y chequeos separados, incluyendo 24 piezas de dano a ambas fuerzas limite y 30 semillas para dano/d20 normal/ventaja.
- Harness temporal con panel, hook, coordinador, worker y renderer reales; transporte local aislado, no sustitucion de main en la instancia del usuario. Ventaja con caras 15/20 y modificador +3: solo dos d20, total 23, grupos vacios y mismos datos privados/publicos. Volver a dano conserva Fuego 2d6+5 (4+3+5=12) y Frio 1d8-1 (4-1=3), total 15, sin d20 ni su modificador.
- Capturas Playwright a 1280 x 800 y Player 390 x 844, sin solapamientos; canvas no vacio con 8,780 y 1,363 pixeles visibles respectivamente. Caras naturales y descarte distinguibles del total 23. Sin errores/warnings de consola en el harness, retirado al terminar. No se cerro ni reinicio Electron; la activacion nativa requiere el protocolo 2 al reiniciar.

## 20. Revision: celebracion del 20 natural

1. `domain/dice/critical.ts`: `naturalTwenty` deriva el ID del d20 conservado solo si su cara es 20. Ignorar modificadores y dados descartados; empate conserva el ID estable. `criticalIsActive` exige replay y la ventana absoluta `[settledAt, settledAt + 3000)`. No modificar resultados, formulas ni reglas de dano.
2. `DicePresentation.critical`: metadata opcional `{ dieId } | null`, calculada por `DiceRollSession.complete` desde el resultado autorizado, nunca aceptada del request. La presentacion publica abierta la conserva aunque `result` sea null. Ocultas no publican eventos ni recuperacion de esa metadata. Republicar un resultado estatico sin replay no repite el efecto.
3. `DICE_PROTOCOL_VERSION = 3`: impedir lanzar con un proceso main antiguo que no soporte el contrato. No cambia version de producto ni de archivo; requiere guardar y reiniciar Electron para activarlo en la instancia de desarrollo, sin reiniciarla automaticamente.
4. `DiceOverlayRenderer` proyecta el bounding box del dado conservado usando la misma camara de su ventana. `CriticalDiceLightning` usa Canvas2D transparente local de 96..360 px CSS, DPR maximo 2; reutiliza `createLightningBuffers`/`writeLightningDischarge` sin importar Pixi ni duplicar el generador. Presupuesto de 2048 vertices, formas derivadas de rollId/epoca cada 120 ms y dibujo maximo a 30 fps durante tres segundos. Halo cian y centro blanco sobre el dado con una abertura pequena para el numero: clip evenodd centrado, radio `min(bounds.w, bounds.h) * 0.18` en px CSS antes de escalar las descargas. No usar la diagonal ni margen exterior como el recorte inicial. Orden de capas dentro del stage aislado: canvas Three, rayos (z-index 1), etiquetas (z-index 2). Menus y resumen permanecen fuera de este stacking context.
5. El efecto tiene RAF propio acotado: no reactiva fisica, render continuo Three ni mapa Pixi y no envia IPC por frame. Resize actualiza posicion/tamano sin reiniciar el reloj; ocultar pausa, restaurar usa el tiempo restante. Cierre, cambio de tirada/contexto, perdida de contexto y dispose limpian RAF/canvas/timers. El reposo del dado sigue siendo persistente.
6. `DiceOverlay` muestra `Crítico` independientemente de `result`, con texto accesible, entrada/salida suave y temporizadores de inicio/fin absolutos; sin React por frame ni sonidos. El inicio notifica una vez al renderer incluso sin RAF de fisica, para que movimiento reducido muestre rayos estaticos. Fin de celebracion no cierra el resumen; mantener X manual. Un fallo WebGL conserva el aviso textual.
7. Regresiones de dominio: normal/ventaja/desventaja/empate, 17+3 sin critico, 20-4 con critico, 20 descartado y total de dano 20 sin efecto. Servicio: DM privado, publico con resumen apagado, toggles sin reinicio, descarte manual y republicacion estatica. React: inicio, caducidad, retiro, ausencia de resumen numerico y aviso al renderer al asentarse. Canvas: abertura proporcional limitada al numero en animacion y movimiento reducido, limites, frames acotados, resize sin prolongacion y limpieza de recursos.

Verificacion de esta revision:

- Suite completa: 799 tests en 93 archivos; `pnpm typecheck`, `pnpm lint` y `pnpm build` correctos. Solo warnings preexistentes `use client` de Lucide/Radix.
- Harness temporal con coordinador y simulacion Cannon reales, render Three y overlay de produccion. Se busco una semilla de prueba cuya simulacion da ventaja 20/15; no se falsificaron caras/poses ni se altero la fuente aleatoria de produccion. Modificador -4, total 16: rayos solo alrededor del 20 conservado.
- Capturas Playwright a 1280 x 800 y Player 390 x 844: texto y rayos visibles, caras despejadas, resumen sin solapamiento. Canvas de rayos con 11,155 pixeles visibles en una muestra de escritorio y 2,330 en vertical; muestreo confirmo frames diferentes (9/12 y 8/11 muestras respectivamente), no imagen estatica. Al terminar desaparece solo la celebracion y permanecen los dados.
- Abierta sin resumen: Player ve rayos y `Crítico` con `result: null`; oculta: solo DM y presentacion publica nula. Sin warnings/errores de consola del harness, retirado al terminar. Transporte local aislado: no equivale a smoke nativo de dos ventanas ni a benchmark del mapa real junto con el efecto.
- Sin cambios a la escena del usuario, reinicio de Electron, persistencia nueva, versionado, commit, merge, push ni DMG. La matriz ampliada de rendimiento/monitores sigue pendiente como en revisiones anteriores.

### Ajuste visual posterior: rayos sobre el dado

La revision del usuario elimina el recorte que dejaba libre la cara: producia un hueco circular y descargas truncadas. Se retira el clip de Canvas2D y se explicita el orden Three/rayos/etiquetas dentro del stage aislado. Sin cambios en privacidad, contrato, duracion ni presupuesto de animacion.

Regresion automatizada: ninguna llamada a `arc`/`clip` para recortar el centro, tambien con movimiento reducido. Capturas Playwright del renderer real a 1280 x 800 y 390 x 844 muestran descargas continuas sobre el dado; medicion en la region central antes vacia: 3,882 y 784 pixeles visibles respectivamente. Etiquetas por encima y resumen sin solapamientos. Sin errores/warnings en el harness temporal, retirado al terminar; no se reinicio Electron ni se modifico la escena del usuario.

Validacion del ajuste: 799 tests en 93 archivos, typecheck, lint y `git diff --check` correctos. Sin build de instalador ni operaciones de historial git.

Revision posterior del usuario: conservar los rayos encima del dado, pero recuperar una abertura pequena para leer el 20. Se sustituye la ausencia total de recorte por un radio del 18% del lado menor proyectado, en lugar de la mitad de la diagonal mas margen del diseno inicial. La regresion comprueba radios de 9 y 18 px para bounds de 50x60 y 100x120, resize sin extender duracion y el mismo recorte en movimiento reducido.

Verificacion de la abertura pequena: 10 tests de canvas/overlay correctos. Capturas Playwright del renderer real a 1280x800 y 390x844 muestran el 20 dentro de la abertura y rayos sobre el resto del dado. Canvas con 27,394 y 4,635 pixeles visibles respectivamente, centro del numero transparente en ambas vistas; sin errores de consola. Harness temporal retirado.

## 21. Entrega 2.8.0 - 2026-10-24

- Usuario autoriza cierre minor, commit, push a GitHub y construccion del DMG. Integracion en main pendiente de confirmacion explicita.
- Version oficial 2.8.0 en `package.json`, changelog actualizado y spec aceptada con todos los ajustes de revision. Sin cambios de formato de escena ni migraciones.
- Instalador objetivo: macOS arm64, mediante `./scripts/build-dmg.sh`. Build personal sin firma Developer ID ni notarizacion; no se genera Intel en esta entrega.
- `extraResources` incluye LICENSE y README de la geometria adaptada en `Resources/licenses/dice-box-threejs`, tambien dentro de la app distribuida.
- Validacion final: 799 tests en 93 archivos, lint y diff check correctos. `./scripts/build-dmg.sh` completo con typecheck y compilacion de produccion correctos.
- Instalador: `dist/TTRPG Effects-2.8.0-arm64.dmg`, 150,726,698 bytes (aproximadamente 144 MiB), verificado con `hdiutil verify`. SHA-256: `bfa719cdbcff7f2afca7911be7cae9a5b1678cb87d8156c7a5e5cdf6542712cf`.
- Metadata de la app empaquetada: CFBundleShortVersionString 2.8.0, ejecutable Mach-O arm64 y archivos LICENSE/README presentes en Resources/licenses/dice-box-threejs. No se abrio ni instalo esta app sobre la instancia del usuario durante el cierre.
- Warnings de directivas `use client`, autor ausente, dependencias opcionales de otras plataformas, deprecacion de subprocess y firma deshabilitada no impidieron el build. No se declaran corregidos por esta entrega.
- Publicacion prevista en `origin/feature/dm-dice-rolls`; main permanece sin cambios a falta de confirmacion de merge. Se mantienen los limites de validacion ampliada documentados en las secciones anteriores.
