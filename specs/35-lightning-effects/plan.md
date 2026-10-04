# Plan de implementacion tecnica - 35 Relampagos

## 1. Resumen

- Spec fuente: [spec.md](./spec.md).
- Estado: implementado y aceptado por el usuario para cierre en main como 2.5.4 el 2026-10-03. Benchmark prolongado Electron diferido, sin promesa de FPS de produccion.
- Rama: `codex/lightning-lab`. Mantener version 2.5.3 mientras se revisa.
- Objetivo: convertir el laboratorio en un efecto persistente medible y editable, sin alterar efectos existentes ni introducir trabajo por fotograma en React/IPC.
- Dependencias nuevas: ninguna; usar PixiJS, React, Zod y helpers existentes.

## 2. Punto de partida y diferencias

El prototipo disponible contiene:

- `src/render/pixi/lightning-discharge.ts`: generacion determinista por semilla y epoca, ramas y chispas, buffers acotados.
- `src/render/pixi/procedural-lightning.ts`: dos meshes por efecto que alternan descargas; halo en shader directo, sin filtros/FBO propios.
- `src/renderer/lightning-lab.html` y `src/renderer/src/lightning-lab.ts`: comparacion de variantes, controles, pausa y carga de 24 fuentes.
- Tests de geometria, repetibilidad, limites, reutilizacion y destruccion.

La prueba NO implementa todavia el contrato de escena: usa un `size` generico, semilla local y tiempo acumulado por ventana. Tampoco tiene dibujo interactivo, direccion editable, mediciones, guia compartida, persistencia o sincronizacion DM/Player. La apertura del cono seguira siendo fija, normalizada a 60 grados. No marcar las tareas de integracion como completadas por reutilizar el prototipo.

En la prueba previa se ejecutaron typecheck, lint y 418 tests; se observaron alrededor de 120 FPS en el navegador local con 24 efectos. El indicador CPU mide actualizacion JS, no coste GPU total. No hay un benchmark Electron de esta integracion aun.

## 3. Dominio y modelo

Agregar `SceneLightningEffect` a `SceneEffect` en `src/domain/sessions/scene-document.ts`:

```ts
interface SceneLightningEffect {
  readonly id: string;
  readonly kind: "lightning";
  readonly position: WorldPoint;
  readonly zone:
    | { readonly kind: "line"; readonly end: WorldPoint }
    | { readonly kind: "cone"; readonly radius: number; readonly direction: number }
    | { readonly kind: "circle"; readonly radius: number };
  readonly intensity: number;
  readonly speed: number;
  readonly opacity: number;
  readonly sparks: boolean;
  readonly visible: boolean;
  readonly showGuide: boolean;
  readonly seed: number;
  readonly clockOriginMs: number;
  readonly clockOffsetSeconds: number;
}
```

- `position` es inicio, vertice o centro segun variante. En linea, `end` es el segundo extremo mundial; no persistir longitud/direccion redundantes. Trasladar una linea desplaza ambos puntos.
- `showGuide` aplica a cono/circulo; normalizarlo a false para linea. No es un permiso para mostrar controles al Player.
- Crear `src/domain/effects/lightning.ts` con factories, patches por variante, traslado, edicion de extremos/radio/direccion, bounds y pertenencia al area. No importar PixiJS ni reloj global desde dominio.
- Definir una unica constante de dominio `LIGHTNING_CONE_APERTURE_DEGREES = 60`, compartida por generacion, guia y hit testing. No persistir `angle` ni exponer un patch/control de apertura. El unico angulo editable del cono es `direction`.
- Usar minimo de 10 unidades de mundo para radios y longitud geometrica, consistente con handles de area; puntos finitos, direccion normalizada a [0, 360), rangos visuales del spec y semilla uint32.
- Validar documentos externos con Zod; los clamps de UI no deben ocultar archivos corruptos. Incluir validacion cruzada de extremos y controles temporales finitos/no negativos.
- Derivar medida lineal con `measureDistance` de `src/domain/measurement/measurement.ts`, con la regla diagonal y layout actuales. No medir la polilinea decorativa.
- Extraer/reutilizar la conversion de `worldLengthLabel` como helper puro acotado para radios y entradas ft/m; no cambiar sus resultados actuales. Evitar conversion inversa de distancia hexagonal para un campo de longitud de linea: sera solo lectura y se editara por extremos.
- Semilla inicial estable derivada del ID; no modificarla al mover, editar o rehidratar el efecto.

## 4. Reloj compartido

El dominio calcula fase con tiempo inyectado:

```text
phaseSeconds = clockOffsetSeconds
             + max(0, nowMs - clockOriginMs) / 1000 * speed
```

- Al crear: offset 0 y origen igual al instante de confirmacion. El borrador usa un reloj local no persistido.
- Al cambiar velocidad: calcular primero fase con la velocidad anterior, guardar esa fase como offset, fijar nuevo origen y nueva velocidad en una sola actualizacion.
- DM y Player reciben esos campos mediante el snapshot existente y usan el reloj de pared del mismo equipo. No acumular `deltaMS` por ventana en produccion.
- Resolver directamente las dos epocas visibles desde la fase actual. Volver de una ventana suspendida no reproduce una cola de descargas atrasadas.
- Inyectar `nowMs` para pruebas; acotar uniforms de GPU a edades cortas, no pasar timestamps absolutos como float del shader.
- Al cargar desde archivo, conservar la identidad y retomar la fase vigente. No serializar chispas ni el fotograma exacto.

## 5. Dibujo y edicion

- Extender `src/domain/interaction/interaction-state.ts` con estado transitorio explicito: variante, ancla y puntero provisional. Mantenerlo fuera del documento persistible.
- Reutilizar conversiones pantalla/mundo de `PixiViewport`; el dominio aplica snap y validacion antes de producir el preview/commit para que ambos coincidan.
- Mantener `LightningDraft` tipado localmente en `PixiViewport`, sin renders React por muestra. Exponer callbacks de confirmacion/edicion y props de herramienta/clave de reset en `MapViewport`; ancla, preview y cancelacion se resuelven dentro del viewport.
- Seleccionar herramienta no crea un objeto; primer clic fija ancla, segundo confirma solo geometria valida. `Escape`, cambio de herramienta/mapa/escena descartan el borrador.
- Espacio + arrastre conserva el borrador; no disparar puntos al finalizar pan. Ignorar atajos de mapa cuando el foco esta en un input/editor. Resolver perdida de captura y salida del canvas sin commits accidentales.
- Prioridad de hit testing: handles seleccionados, geometria de objetos, fondo. Linea con tolerancia de pantalla sobre el eje; cono con punto-en-sector y circulo con punto-en-disco. No seleccionar por chispas aleatorias.
- Reutilizar `area-tool-screen-scale.ts` y `effect-control-geometry.ts` para manivelas y zonas de hit constantes a zoom bajo, incluida separacion entre giro/resize de conos pequenos.
- Para cono, vincular la manivela de giro y el campo numerico `Direccion` en grados a la misma operacion pura. El handle de alcance modifica solo radio; no agregar handles, inputs ni etiquetas de apertura.
- Preview de geometria/medida durante drag a traves de caches de viewport. Consolidar cambios al terminar siguiendo la ruta existente de edicion; no recrear toda la escena por cada muestra del puntero.

## 6. Renderer y guias

### Geometria exacta

- Adaptar el generador para recibir geometria real: extremos de linea, radio del cono con apertura constante de 60 grados y radio circular. Aplicar la direccion del cono en su contenedor. Eliminar la interpretacion ambigua de `size` y su clamp a 2000 como tamano real del objeto.
- Generar en coordenadas locales y aplicar origen/direccion en el contenedor. Trasladar o girar no reconstruye la topologia.
- Para cono/circulo, contener las ramas principales dentro del sector de 60 grados/disco mediante geometria analitica, no un alpha-mask de Pixi. Verificar tambien segmentos entre vertices; permitir solo halo y chispas decorativas con margen acotado.
- El margen decorativo y bounds de culling deben cubrir su desplazamiento durante toda su vida. No usar ese margen como area tactica.
- Detalle en coordenadas de mundo y ancho de canales acotado segun tamano, nunca segun zoom. La calibracion cambia medidas, no la topologia ni el alcance visual. Reducir detalle mediante el presupuesto para objetos enormes sin encoger su area.

### Animacion y presupuesto

- Conservar dos bancos/meshes por efecto, con uniforms de edad por fotograma y renovacion de topologia a intervalos de fase de 0.17 s. Velocidad modifica ese ritmo; entre renovaciones no subir buffers.
- Mantener buffers reutilizables y maximo 8192 vertices por banco. No asignar meshes, shaders, texturas o listeners por descarga.
- Introducir presupuesto agregado inicial de 131072 vertices dibujados para ambos bancos de los relampagos visibles del mapa. Repartirlo por cantidad de efectos visibles con opacidad positiva: `min(8192, floor(131072 / (2 * cantidad)))` por banco, identico en DM/Player e independiente de camara/orden. Priorizar troncos principales, ramas secundarias y finalmente chispas; reducir puntos antes de omitir un tronco por falta de espacio.
- El presupuesto/culling local de pantalla no debe cambiar la semilla ni la fase. No regenerar todas las descargas por zoom o seleccion.
- Opacidad/intensidad se aplican por contenedor/uniforms. Cambiar guia solo actualiza su cache. Cambiar geometria, semilla, chispas o presupuesto invalida el contenido necesario conservando recursos reutilizables.
- Sin `Filter`, `RenderTexture`, alpha-mask ni framebuffer intermedio para relampago o guia. Usar el ticker existente, no un RAF adicional por efecto.
- Efectos ocultos, opacidad cero y mapas descargados no mantienen animacion activa. Liberar buffers/shaders locales al retirar; preservar programas compartidos de Pixi.
- En backend no-WebGL, usar una representacion vectorial estatica de descarga y su guia, sin repetir intentos de compilacion fallidos ni perder datos. La animacion aprobada tiene WebGL como camino principal.

### Guias y roles

- Crear un adapter/cache `lightning-guides.ts` con sector/disco y estilo fijo del spec, separado del renderer animado. Cache por geometria, visibilidad, `showGuide` y rol/seleccion, no por tiempo.
- Montar guia compartida y relampago en la capa de efectos existente; la guia por debajo de las descargas y ambos por debajo de niebla/ocultamiento conforme al contrato de capas. No introducir una capa global que exponga zonas ocultas.
- Etiquetas, eje de medida, anillos y handles van a la capa editorial solo en rol DM. Retirarlos inmediatamente al cambiar rol.
- Etiquetas calculadas desde dominio: `Largo` para linea/cono y `Radio` para circulo; recalcular por geometria, unidad/calibracion y regla diagonal aplicable, no por animacion. La direccion se muestra en grados en propiedades, no como medida de apertura sobre el canvas. Mantener texto legible sin escalar la geometria tactica.
- Aplicar la misma transformacion de mundo/brujula que al mapa. Cubrir 0, 90, 180 y 270 grados y camara de Player independiente.

## 7. Integracion por capa

| Capa / archivo | Cambio acotado |
| --- | --- |
| `src/domain/sessions/scene-document.ts`, `scene-schema.ts` | Union `lightning`, defaults visuales y validacion completa de geometria/reloj. Mantener formato 2. |
| `src/domain/effects/lightning.ts` | Reglas puras, coordenadas, patches, medidas y reloj inyectado. |
| `src/domain/sessions/scene-objects.ts` | Nombre por variante y centro derivado apropiado para centrar linea/cono/circulo. |
| `src/domain/sessions/scene-maps.ts` | Verificar sincronizacion de efectos con mapa activo e importacion/remapeo de IDs sin perder semilla. |
| `src/domain/player/player-window.ts`, `player-window-snapshot.ts`, `src/renderer/src/PlayerApp.tsx` | Reutilizar snapshot y renderer de Player; validacion Zod del snapshot antes de publicar desde IPC. Ninguna herramienta ni etiqueta editorial. |
| `src/renderer/src/App.tsx` | Accesos a creacion y orquestacion de operaciones puras. Auditar ramas de efectos que hoy asumen fuego/agua como caso final. |
| `src/renderer/src/components/MapViewport.tsx` | Puente de herramienta/preview/eventos; no logica geometrica ni IO. |
| Componente de propiedades de relampago | Controles compactos del spec; integrarlo al aside derecho sin ampliar innecesariamente App. |
| `src/render/pixi/PixiViewport.ts` | Adapter, caches, ticker, hit testing, previews, seleccion y lifecycle. |
| `src/application/use-cases/save-scene.ts`, `load-scene.ts` | Reutilizar flujos; tests de round-trip con efectos nuevos. Sin almacen separado. |
| `src/main/ipc/player-window-ipc.ts`, preload | Reutilizar canales tipados existentes; asegurar validacion del payload nuevo en sus fronteras. Sin IPC por fotograma, APIs genericas ni permisos nuevos. |
| Infraestructura / SQLite / assets | Sin migracion SQL, descargas, GIFs nuevos o acceso privilegiado desde renderer. |

Extender todas las uniones exhaustivas y firmas/caches de efectos. Los snapshots no deben enviar vertices, chispas o recursos GPU. No reordenar capas ajenas ni refactorizar el resto de herramientas.

## 8. Persistencia y compatibilidad

- Agregar el schema de relampago a la union reutilizada por mapas y documentos heredados; conservar migracion de escena antigua a mapa sin crear este efecto.
- Incluir geometria, semilla, origen/offset de reloj y parametros del spec. Defaults solo para campos aditivos conocidos, no para geometria invalida.
- Validar guardar/cargar, importar mapas y navegar conservando efectos por mapa. No agregar un top-level obligatorio por una coleccion que ya existe.
- Mantener `SCENE_DOCUMENT_VERSION = 2`: ampliacion aditiva aceptada por la nueva app. Documentar que lectores antiguos que desconozcan `kind: lightning` pueden rechazar estos archivos; no ofrecer exportacion degradada silenciosa.
- No tocar `package.json` ni changelog de release ahora. Al cierre autorizado, definir la version de app con el usuario y aplicar las reglas del proyecto sin confundirla con la version del formato.

## 9. Secuencia de implementacion

1. Aprobar spec/plan, conservando el laboratorio como referencia visual.
2. Agregar dominio, modelo y schema, con tests antes de integrar UI.
3. Adaptar generador/render a geometria real, presupuesto y reloj compartido; comparar visualmente contra el prototipo.
4. Implementar dibujo de dos puntos, previews y cancelacion; validar reglas de medicion y snap.
5. Agregar guias compartidas, etiquetas DM y handles; conectar propiedades y arbol de objetos.
6. Integrar snapshots, visibilidad, guardado/carga y navegacion de mapas; auditar las ramas de efectos existentes.
7. Completar regresiones, medicion Electron con ambas ventanas y revision visual del usuario.
8. Actualizar docs relacionadas. Commit, merge, versionado e instalador solamente cuando sean solicitados.

## 10. Verificacion

### Automatizada

- Dominio: creacion de variantes, rangos, puntos degenerados/no finitos, trasladar linea sin cambiar extremos relativos, radio y direccion normalizada. Probar giros 0/90/180/270/360 y valores negativos; conservar alcance y apertura fija de 60 grados en todos ellos, sin campo persistido de apertura.
- Medicion: ft/m, calibracion, diagonales, hexagonos, grilla invisible; demostrar que zigzags/chispas no cambian longitud y que el radio no se mide como desplazamiento tactico.
- Interaccion: dos clics, preview incremental, cancelar, segundo punto coincidente, pan con Espacio, foco en formularios, cambio de mapa y borrado; no persistir drafts.
- Geometria visual: ramas dentro de cono/disco, circulo con interior activo, extremos lineales, tolerancia de seleccion y margen de chispas sin modificar area.
- Render: cache estable al pan/zoom/rotacion/intensidad/opacidad positiva; guia no actualizada por tick; release al ocultar, borrar o descargar; opacidad cero y contexto pequeno sin attachments invalidos.
- Presupuesto: multiples tamanos y cantidades de efectos no exceden limites individuales/agregados; distribucion reproducible en ambos viewports, sin reducir alcance real.
- Reloj: mismo ID/semilla/instante en dos ventanas, carga inicial, reabrir y saltos largos; cambiar velocidad conserva fase y no reproduce epocas atrasadas.
- Roles/UI: guia en DM y Player, medidas/handles solo DM; campo `Direccion` y manivela de giro sincronizados; ausencia de controles o etiquetas de apertura. `showGuide`, visibilidad, opacidad cero y cambios de rol no dejan residuos.
- Persistencia: los tres tipos en varios mapas, round-trip de todos los campos y carga de escenas anteriores sin cambios.
- Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`.

### Visual y rendimiento

- Revisar en Electron con DM y Player simultaneos sobre mapa real, no solo el laboratorio.
- Comparar linea, cono y circulo con guia encendida/apagada, chispas y parametros extremos. Verificar que se distingue exactamente el area durante los valles de brillo.
- Probar zoom minimo/maximo, norte cardinal, redimensionar ventana, grilla cuadrada/hexagonal, niebla y oscuridad. Ninguna ayuda del DM debe filtrarse al Player.
- Comparar 0, 1, 3 y 24 efectos con la misma escena/resolucion; registrar frame time medio/p95, coste JS de generacion, memoria estable y errores WebGL.
- Objetivo inicial: sostener 60 FPS en el equipo de referencia con 24 efectos moderados y navegacion util en ambas ventanas. Registrar hardware/resolucion y cualquier degradacion; no afirmar ese resultado con la medida de 120 FPS del laboratorio.
- Revisar sesion de varios minutos y ciclos de crear/borrar/cambiar mapas. Medir peor caso de areas grandes solapadas; ajustar detalle antes de aceptar una degradacion sostenida.

## 11. Documentacion y cierre

- Specs 06 y 07: acceso/propiedades y referencia al contrato de medidas de relampago, sin cambiar las figuras actuales.
- Specs 15, 29 y 30: guia compartida, efecto por mapa y transformaciones cardinales.
- Specs 01 y 03: documentar incorporacion al render/persistencia si sus contratos necesitan explicitar el nuevo efecto.
- Mantener spec 35 y este plan sincronizados con decisiones aceptadas durante implementacion.

- [x] Prototipo visual aprobado por el usuario.
- [x] Guia de cono/circulo compartida con jugadores confirmada.
- [x] Revision de este spec/plan completada.
- [x] Dominio, dibujo, propiedades, guia y renderer integrados.
- [x] Persistencia y sincronizacion DM/Player verificadas.
- [x] Pruebas automatizadas y build de la integracion ejecutados.
- [x] Smoke Electron de ambas ventanas registrado.
- [ ] Benchmark prolongado de rendimiento en ambas ventanas registrado.
- [ ] Aceptacion visual y orden explicita de cierre recibidas.

## 12. Resultado de implementacion (2026-10-03)

- Sin dependencias nuevas ni cambios a version 2.5.3. Formato de escena 2, union aditiva `lightning` validada por Zod.
- Nuevos modulos `domain/effects/lightning.ts`, `lightning-visual.ts`, `lightning-guides.ts` y `LightningProperties.tsx`. Integracion con el ticker y capas existentes; sin canales IPC adicionales ni framebuffer propio.
- Cancelacion de drag por Escape, pointercancel, perdida de captura/ventana y cambio de mapa/herramienta. Eventos de movimiento agrupados por frame; cambios persistidos solo al confirmar/soltar.
- Geometria local contenida analiticamente en disco/sector. Traslacion y direccion usan el contenedor; no regeneran las descargas. Intensidad/opacidad usan uniform/alpha; cache separado para guia.
- 457 tests en 66 archivos pasan; `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check` correctos. Build conserva los avisos preexistentes de directivas `use client` en dependencias.
- Smoke Electron en ventanas de 3840 x 1055: imagen de mapa de 1080 x 1084 aportada por el usuario, creacion de linea/cone/circulo, Player con guias sin controles editoriales, norte a 90 grados y niebla bloqueante. Capturas en distintos instantes muestran cambio de descargas y chispas.
- Smoke de navegador a 1280 x 720: dibujo de cono con preview, largo y sector; confirmacion y controles laterales. Pruebas automatizadas cubren ft/m, hexagonos, giros cardinales, guardado multi-mapa, invalidacion de caches y presupuestos de 1/3/24/100 efectos.
- Verificada tambien edicion numerica de direccion a 90 grados con largo invariable y guardado/reapertura nativos de una escena temporal con las tres variantes; el JSON mantiene geometria y semilla/reloj sin recursos de render. La escena de prueba queda abierta en Electron, sin modificar archivos de campana existentes.
- Pendiente: frame time medio/p95, memoria y sesion prolongada con 24 efectos simultaneos en DM/Player. El presupuesto de vertices probado no sustituye esa medicion ni permite prometer 60 FPS.
