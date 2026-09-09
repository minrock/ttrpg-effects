# Plan de implementacion tecnica - 33 Contadores flotantes de escena

## 1. Resumen

- **Spec fuente:** `./specs/33-floating-dm-counters/spec.md`
- **Objetivo:** incorporar contadores de escena independientes del combate, persistidos en `.ttrpgscene`, administrables por el DM y publicables selectivamente a Player View mediante barras flotantes.
- **Estado:** Implementada para revision.
- **Prioridad:** Media.
- **Dependencias:** `specs/15-player-window/spec.md`, `specs/18-scene-management/spec.md`, `specs/20-combat-turn-tracker/spec.md`, `specs/29-multi-map-scenes/spec.md`.

## 2. Alcance

### Incluido

- Modelo de dominio de coleccion de contadores a nivel de escena.
- Validacion, serializacion y lectura retrocompatible de escenas sin contadores.
- Operaciones puras de crear, editar, incrementar, decrementar y eliminar.
- Formulario/modal de administracion en DM y barras flotantes de accion rapida.
- Publicacion selectiva de contadores en Player View usando el snapshot de escena existente.
- Estilos para barras de DM atenuadas por defecto y de Player View completamente opacas.
- Tests de dominio, schema y componentes principales.

### Fuera de alcance

- Modificar la mecanica del turnero de combate o conectarla a contadores.
- Cronometros, automatizaciones por turno o triggers al alcanzar valores.
- Persistencia externa, SQLite, historial, undo o sincronizacion en red.
- Reordenar, colorear, iconificar o mover libremente contadores.
- Nuevos canales IPC o permisos Electron.

## 3. Decisiones tecnicas

- **Arquitectura:** las invariantes y transformaciones de contadores viven en `domain/counters`; `renderer` orquesta acciones y presenta UI. La escena sigue siendo la fuente de verdad.
- **Persistencia:** se agrega `counters` a `SceneDocumentV1` y `SceneDocumentV2`, con un valor por defecto vacio al parsear documentos anteriores. No cambia `SCENE_DOCUMENT_VERSION`: es una adicion retrocompatible ya que el parser acepta el campo ausente y el serializador lo incorpora en el siguiente guardado.
- **Sincronizacion Player View:** no se agrega IPC. `createPlayerSceneSnapshot` filtra contadores privados y el `playerWindowSnapshot` ya se republica ante cambios de escena.
- **Render:** las barras son overlays React dentro de las shells DM/Player, no objetos Pixi. No necesitan coordenadas de mundo, ni capas Pixi, ni interrumpir herramientas del canvas.
- **Autoguardado:** mutar `scene.counters` mediante `setScene` participa en la deteccion de cambios y el flujo de autoguardado existente; no se implementa un guardado paralelo desde el componente.
- **Identificadores:** el renderer crea IDs estables con el mecanismo de IDs ya usado para entidades de escena; el dominio valida que no esten vacios ni duplicados. No se introducen IDs indexados o dependientes del orden.
- **Dependencias nuevas:** ninguna. Se reutilizan React, Zod, estilos y libreria de iconos existentes.

## 4. Diseno de dominio

### Tipos y modulo nuevos

Crear `src/domain/counters/scene-counters.ts` con:

```ts
export type SceneCounterMode = "progress" | "countdown";
export type SceneCounterKind = "fixed" | "dynamic";

export interface SceneCounter {
  readonly id: string;
  readonly label: string;
  readonly mode: SceneCounterMode;
  readonly kind: SceneCounterKind;
  readonly value: number;
  readonly capacity?: number;
  readonly isVisibleToPlayers: boolean;
  readonly isLabelVisibleToPlayers: boolean;
}

export interface CreateSceneCounterInput { /* datos editables sin id */ }
export interface UpdateSceneCounterInput { /* campos editables normalizados */ }
```

El modulo tambien exportara:

- `createDefaultSceneCounters(): readonly SceneCounter[]`.
- `createSceneCounter(input)` para normalizar el valor inicial segun modo y tipo.
- `updateSceneCounter(counters, id, input)`.
- `adjustSceneCounter(counters, id, delta)` para aplicar `+1` o `-1` con clamps correctos.
- `removeSceneCounter(counters, id)`.
- `getPlayerVisibleSceneCounters(counters)` para seleccionar el subset compartible.
- `SceneCounterError` con mensajes recuperables para formularios invalidos.

### Reglas puras

- La etiqueta se recorta y valida como texto no vacio, con un limite coherente con la UI, por ejemplo `120` caracteres.
- `value` es entero finito no negativo.
- `capacity` existe solo en `fixed`, es entero finito mayor que `0`, y limita `value`.
- `dynamic` no serializa `capacity`; su valor no tiene limite superior de dominio.
- `progress` inicia en `0`, excepto al editar un contador existente.
- `countdown` fijo inicia en `capacity`; `countdown` dinamico usa el valor inicial validado entregado por el DM.
- Las operaciones no dependen de combate, mapa activo, DOM, React ni Electron.
- La representacion visual dinamica se calcula en UI mediante una funcion pura acotada, por ejemplo una escala de hitos, para evitar una falsa capacidad maxima. Esta funcion debe retornar un ratio visual seguro en `0..1` sin cambiar el valor real.

### Integracion al documento de escena

- Modificar `src/domain/sessions/scene-document.ts`:
  - importar `SceneCounter`;
  - declarar `readonly counters: readonly SceneCounter[]` tanto en V1 como V2.
- Modificar `src/domain/sessions/scene-maps.ts`:
  - inicializar `counters: createDefaultSceneCounters()` en `createEmptyScene()`;
  - al migrar V1 a V2, conservar `scene.counters` o usar vacio si el documento legacy no lo posee en runtime.
- Modificar `src/domain/sessions/scene-schema.ts`:
  - agregar schemas Zod discriminados para contador fijo/dinamico;
  - agregar `counters` con `default(() => [])` al schema V1 y reutilizarlo en V2;
  - validar IDs unicos al nivel del arreglo con `superRefine`;
  - normalizar que los dinamicos no contengan `capacity` y que valores de fijos queden dentro de rango solamente para documentos confiables; input invalido externo debe rechazarse con mensaje claro en vez de ser corregido silenciosamente.

### Snapshot de Player View

- Modificar `src/domain/player/player-window.ts` para que `createPlayerSceneSnapshot` reemplace `scene.counters` con `getPlayerVisibleSceneCounters(scene.counters)`.
- Se conserva en los objetos publicados `isLabelVisibleToPlayers`, para que Player View decida si renderiza la etiqueta; no se filtra el valor ni capacidad de los contadores publicados.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/counters/scene-counters.ts` y `scene-counters.test.ts`.
- Extender `scene-document.ts`, `scene-maps.ts` y `scene-schema.ts`.
- Actualizar `scene-schema.test.ts`, `scene-content.test.ts` y pruebas de migracion/serializacion que comparan documentos completos.
- Agregar pruebas de `createPlayerSceneSnapshot` para comprobar que los privados no salen del proceso DM y que los publicados preservan valor y preferencia de etiqueta.

### `application`

- No se requieren nuevos use cases. Los contadores son parte del agregado `SceneDocument`; guardar, abrir e importar reutilizan los use cases actuales.
- Revisar `linked-legacy-scenes.ts` e `import-scene-map.ts` para asegurar que al reconstruir una escena conservan los contadores del documento raiz, como ya sucede con `combatTracker` y `sceneAside`.

### `infrastructure`, `main` y `preload`

- Sin cambios de filesystem, SQLite, Electron main, preload ni canales IPC.
- Las APIs existentes `saveScene`, `publishPlayerScene` y `onPlayerScene` transportan el documento tipado actualizado.

### `renderer`

Crear componentes bajo `src/renderer/src/components/counters/`:

- `SceneCounterManagerModal.tsx`:
  - lista los contadores existentes;
  - permite crear, editar y solicitar eliminacion;
  - usa controles apropiados: input de texto, segmented control/select para modo y tipo e input numerico para valor/capacidad; los contadores nuevos se crean privados;
  - muestra errores de dominio sin cerrar el modal ni alterar el contador existente.
- `SceneCounterBar.tsx`:
  - renderiza una sola barra con etiqueta, valor, segmentos/progreso y botones iconograficos para sumar/restar;
  - no contiene reglas de clamping: invoca callbacks del padre;
  - incluye tooltips y etiquetas `aria` para acciones compactas.
- `SceneCountersOverlay.tsx`:
  - recibe la coleccion y `viewRole`;
  - ordena por el orden persistido en el arreglo;
  - en DM entrega acciones de ajustar, abrir administracion y publicar; al publicar presenta una eleccion compacta de barra con o sin etiqueta. En Player es estrictamente read-only;
  - aplica la representacion de barra dinamica segura y el estado vacio no renderiza superficie alguna.

Modificar `src/renderer/src/App.tsx`:

- importar funciones/tipos de `domain/counters`;
- agregar estado local `isSceneCounterManagerOpen`;
- definir callbacks `handleCreateSceneCounter`, `handleUpdateSceneCounter`, `handleAdjustSceneCounter` y `handleRemoveSceneCounter`, todos actualizando solo `scene.counters`;
- añadir una accion de administracion dentro de los controles de **Escena** existentes, con icono y tooltip, no en controles de mapa ni en el turnero;
- montar `SceneCountersOverlay` como hermano de `MapViewport` y `CombatTurnBar`, dentro de `main`, para quedar sobre canvas y bajo modales;
- montar `SceneCounterManagerModal` junto a los modales existentes;
- no publicar manualmente: la dependencia existente `playerWindowSnapshot` detectara `scene.counters` y enviara el snapshot con debounce normal.

Modificar `src/renderer/src/PlayerApp.tsx`:

- montar `SceneCountersOverlay` con `viewRole="player"`, usando los contadores ya filtrados de `scene.counters`;
- no pasar callbacks mutables;
- ubicarlo antes/despues del `CombatTurnBar` segun el stack CSS para compartir la esquina superior izquierda sin superposicion.

### `styles`

Modificar `src/renderer/src/styles.css`:

- crear un contenedor fijo/absoluto dentro de cada shell de viewport para el stack de contadores;
- reservar el bloque vertical que comparten el turnero y los controles existentes en la esquina superior izquierda para que no se solapen;
- DM: opacidad reducida en reposo y transicion corta a opacidad completa con `:hover` y `:focus-within`;
- Player: opacidad `1`, `pointer-events: none` en el overlay o controles ausentes;
- usar alturas, anchos maximos y overflow contenido para que textos largos no desplacen el mapa;
- mantener contraste y legibilidad de segmentos llenos/vacios en el tema actual;
- respetar `prefers-reduced-motion` para no requerir animacion de opacidad.

### `render`

- Sin cambios a PixiJS, `MapViewport` o `PixiViewport`.
- Los overlays React no deben capturar eventos del canvas fuera de botones DM concretos; el contenedor no interactivo debe tener `pointer-events: none` y cada control interactivo reactivarlo localmente.

## 6. Plan de trabajo

1. Crear el modulo de dominio de contadores con invariantes, operaciones y pruebas unitarias.
2. Extender el contrato de escena, factories y schemas Zod, incluyendo defaults retrocompatibles para V1/V2.
3. Actualizar migraciones, importacion de mapas/escenas y snapshot de Player View para conservar y filtrar contadores correctamente.
4. Agregar pruebas de serializacion, carga de archivos antiguos, IDs duplicados y snapshot publico/privado.
5. Crear los componentes visuales reutilizables de barra, overlay y modal de administracion.
6. Integrar acciones y modal en el control de escena de `App.tsx`, actualizando `scene.counters` mediante funciones de dominio.
7. Montar el overlay DM sobre el canvas con layout que conviva con turnero y controles existentes.
8. Montar el overlay read-only de Player View y verificar la republicacion del snapshot al modificar un contador.
9. Completar estilos de opacidad, foco, responsive y accesibilidad.
10. Ejecutar pruebas automatizadas y smoke manual de guardar/cargar, multi-mapa y ventana de jugador.

## 7. Testing y verificacion

- **Unit tests de dominio:** inicializacion por modo/tipo; clamps fijos; dinamicos sin limite superior; decremento a cero; cambios fijo/dinamico; IDs y etiquetas invalidas; filtro para jugadores.
- **Schema y migracion:** una escena V1/V2 sin `counters` carga con arreglo vacio; una escena con contadores hace round-trip estable; contador invalido o IDs duplicados se rechazan; migracion V1 conserva contadores cuando existen.
- **Application:** importacion de mapa y carga de escenas enlazadas conservan los contadores de la escena principal.
- **Componentes:** barra DM dispara `+1/-1`; barra Player no expone botones; etiqueta de Player aparece solo con `isLabelVisibleToPlayers`; privado no se renderiza tras filtrar snapshot.
- **Regresion:** batalla activa y contadores coexistentes no se resetean entre si; cambiar `activeMapId` no cambia `scene.counters`; publicar/ocultar se refleja al Player View sin reabrirla.
- **Typecheck:** `pnpm typecheck`.
- **Lint:** `pnpm lint`.
- **Tests:** `pnpm test`.
- **Build:** `pnpm build`.
- **Manual / smoke:** crear progreso de 4, countdown de 6 y dinamico; verificar hover y focus en DM; abrir Player View; alternar publicacion/etiqueta; cambiar de mapa; guardar, cerrar y cargar escena; probar una escena anterior sin campo `counters`.

## 8. Riesgos y mitigaciones

- **Riesgo:** una pila larga cubre controles o mapa.
  **Mitigacion:** anclarla al bloque de overlay existente, limitar ancho/altura de barras y probar con suficientes contadores. Scroll, colapso y reordenamiento quedan fuera de alcance hasta validar necesidad real.
- **Riesgo:** un contador dinamico parece expresar un porcentaje real.
  **Mitigacion:** separar valor real y ratio decorativo acotado, y mantener el valor numérico como fuente primaria de lectura.
- **Riesgo:** el filtro privado se aplica solo en UI de Player y datos privados llegan igualmente a su ventana.
  **Mitigacion:** filtrar en `createPlayerSceneSnapshot`, antes de IPC, con prueba de dominio dedicada.
- **Riesgo:** agregar una propiedad a escenas antiguas rompe igualdad de snapshots o importadores.
  **Mitigacion:** centralizar default en schema/factories y actualizar pruebas de serializacion/migracion afectadas.
- **Riesgo:** el overlay captura drags de mapa aunque sea visualmente transparente.
  **Mitigacion:** `pointer-events: none` en el contenedor y reactivacion exclusiva en botones interactivos de DM; smoke manual de pan/zoom y herramientas.

## 9. Criterios de aceptacion

- El DM crea varios contadores fijos o dinamicos sin iniciar combate.
- Progreso fijo inicia vacio; countdown fijo inicia lleno; los valores nunca salen de sus rangos validos.
- Los contadores dinamicos ajustan valor sin capacidad maxima ni layout roto.
- Las barras de DM se muestran arriba a la izquierda, atenuadas en reposo y opacas en hover/foco.
- Player View solo recibe contadores publicados, los presenta al 100% de opacidad y no ofrece controles de cambio.
- La etiqueta de un contador publicado solo aparece en Player View cuando el DM lo selecciona.
- Cambiar, publicar u ocultar un contador se sincroniza con Player View abierta mediante el flujo existente.
- Guardar/cargar y cambiar entre mapas de una escena preserva los contadores.
- Escenas anteriores sin la propiedad siguen cargando correctamente.
- Combate y contadores permanecen independientes.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/33-floating-dm-counters/spec.md`: marcar como aprobada/implementada cuando corresponda y ajustar decisiones descubiertas durante UI real.
- `specs/18-scene-management/spec.md` y `specs/29-multi-map-scenes/spec.md`: documentar que `counters` es estado de escena si sus modelos de datos listan propiedades globales.
- `specs/15-player-window/spec.md`: documentar filtrado de contadores privados dentro del snapshot de Player View si su contrato enumera contenido publicado.
- `CHANGELOG.md` y `package.json` al cerrar la feature con version minor.

## 11. Checklist de cierre

- [ ] Implementacion completada dentro del alcance.
- [ ] Modulo de dominio y pruebas unitarias agregados.
- [ ] Schema y migracion retrocompatibles verificados.
- [ ] Snapshot de Player View filtra contadores privados.
- [ ] UI DM y Player implementadas sin bloquear el canvas.
- [ ] Tests de componente relevantes agregados o actualizados.
- [ ] `pnpm test` ejecutado.
- [ ] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] `pnpm build` ejecutado.
- [ ] Smoke manual realizado en Electron, incluyendo multi-mapa y Player View.
- [ ] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [ ] Sin dependencias nuevas no justificadas.
