# Plan de implementacion tecnica - 29 Escenas con multiples mapas

## 1. Resumen

- **Spec fuente:** `./specs/29-multi-map-scenes/spec.md`
- **Objetivo:** Evolucionar `.ttrpgscene` de una escena plana con un solo mapa a una escena versionada con multiples mapas, manteniendo migracion automatica desde el formato actual y reorganizando el panel izquierdo con tabs de contenido de escena/mapa.
- **Estado:** Draft para revision.
- **Prioridad:** Alta.
- **Dependencias:** Specs 03, 15, 18, 20, 22, 23, 24, 26, 28. Requiere preservar seguridad Electron, schema Zod, Player View y editor enriquecido.

## 2. Alcance

### Incluido

- Nuevo modelo persistente de escena multi-mapa.
- Migracion forward-only desde `SceneDocument` V1 plano al nuevo documento.
- Escena en memoria sin mapas, no guardable hasta agregar minimo un mapa.
- `Agregar mapa` desde imagen nueva.
- `Agregar a escena` desde `.ttrpgscene` viejo/compatible, con importacion de mapa y merge seguro de contenido de nivel escena.
- Navegador de mapas en panel izquierdo.
- Tabs horizontales en panel izquierdo: contenido de `Escena` y contenido de `Mapa`.
- Estado tactico por mapa activo: mapa, camara, grilla, darkness, fog, luces, efectos, formas, tokens, labels, objetos y anotaciones.
- Notas, monstruos, NPCs, personajes y combat tracker a nivel escena.
- Player View sincronizado con mapa activo.
- Zoom desbloqueado por defecto en nuevos mapas/escenas.
- Base tecnica para links internos entre mapas y migracion de conexiones antiguas sin ciclos infinitos.

### Fuera de alcance

- Backend, cuentas, sincronizacion remota o campañas.
- Editor completo de campañas/capitulos.
- Duplicado visual avanzado de mapas.
- Relocalizar imagenes rotas.
- Resolver relaciones profundas entre instancias de monstruos y encuentros mas alla de preservar ids actuales.
- Builder/DMG.
- Refactors cosmeticos no requeridos por el cambio.

## 3. Decisiones tecnicas

- **Arquitectura:** El dominio define tipos, factories, validadores, migracion e invariantes. `application` orquesta load/save/import. `main` e `infrastructure` leen/escriben archivos. `preload` expone funciones especificas. `renderer` selecciona mapa activo y presenta tabs/paneles.
- **Persistencia:** Subir `SCENE_DOCUMENT_VERSION` a `2`. Mantener parser compatible que acepte V1 y V2, migrando V1 en memoria. Serializar siempre V2. Guardar falla si `maps.length === 0`.
- **Modelo:** Crear `SceneMapDocument` para encapsular el contenido actualmente plano de mapa. Crear `SceneDocumentV2` con `maps`, `activeMapId`, `sceneAside` y `combatTracker` en nivel escena.
- **Compatibilidad:** `parseSceneJson` debe aceptar V1 y V2. `serializeSceneDocument` debe validar/emitir V2. El formato V2 no necesita abrirse en versiones antiguas.
- **IPC / Electron:** Reutilizar `scene:load`, `scene:save`, `scene:save-to-path`; agregar una accion especifica para importar `.ttrpgscene` a la escena actual si el renderer necesita dialogo nativo separado. No exponer `fs` ni IPC generico.
- **Render / PixiJS:** `MapViewport` sigue recibiendo solo el mapa activo. No renderiza mapas inactivos. Cambiar de mapa alimenta props nuevas sin duplicar listeners ni crear viewports paralelos.
- **Links:** Introducir destino interno opcional por `mapId`; conservar conexiones legacy por ruta durante migracion/importacion. La migracion recursiva tendra limite de profundidad/cantidad y un set de rutas normalizadas visitadas.
- **Dependencias nuevas:** Ninguna esperada.

## 4. Diseno de dominio

### Entidades / tipos

- `SceneDocumentV1`: alias/tipo legado del documento plano actual.
- `SceneDocumentV2`: nuevo tipo principal.
- `SceneMapDocument`:
  - `id`;
  - `name`;
  - `map`;
  - `camera`;
  - `grid`;
  - `darkness`;
  - `fogOfWar`;
  - `settings`;
  - `lights`;
  - `effects`;
  - `shapes`;
  - `tokens`;
  - `labels`;
  - `mapAnnotations`.
- `SceneDocument` pasa a apuntar al V2 para codigo nuevo.
- `SceneDraftState` o helper equivalente para permitir escena en memoria sin mapas, pero impedir guardado.
- `MapSceneLinkMarker` se extiende para soportar destino interno a `targetMapId` sin perder compatibilidad con `connection` legacy.

### Reglas puras

- `createDefaultScene()` devuelve V2 sin mapas o con estrategia acordada para borrador.
- `createDefaultSceneMap(input)` crea un mapa nuevo con defaults y zoom desbloqueado.
- `createSceneMapFromLegacyScene(v1, options)` migra un V1 plano a `SceneMapDocument`.
- `migrateSceneDocument(input)` acepta V1/V2 validado y retorna V2.
- `getActiveSceneMap(scene)` retorna el mapa activo o `null`.
- `setActiveSceneMap(scene, mapId)` cambia activo validando existencia.
- `upsertSceneMap(scene, map)` conserva orden y reemplaza solo el mapa objetivo.
- `removeSceneMap(scene, mapId)` valida minimo/estado borrador y devuelve siguiente activo.
- `hasSceneMapContent(map)` decide confirmacion de borrado.
- `canSaveScene(scene)` exige al menos un mapa.
- `mergeSceneLevelContent(base, imported)` incorpora notas/entidades evitando ids duplicados.
- `remapImportedMapIds/importIds` genera ids estables y no colisionantes.

### Coordenadas / unidades

- Todas las coordenadas de objetos, tokens, formas, fog, luces, pines y areas permanecen en espacio de mundo del mapa que las contiene.
- No se transforman coordenadas al mover contenido V1 dentro de `SceneMapDocument`.
- Cada mapa conserva su propia grilla, escala, camera y zoom.
- Player View recibe snapshot del mapa activo y no interpreta coordenadas de mapas inactivos.

### Errores de dominio

- Escena sin mapas no guardable.
- `activeMapId` inexistente.
- Importacion sin mapa valido.
- Id duplicado no remapeable.
- Link interno con destino inexistente.
- Profundidad/cantidad maxima de importacion recursiva excedida.

## 5. Cambios por capa

### `domain`

- Modificar [scene-document.ts](/Users/minrock/Projects/ttrpg-effects/src/domain/sessions/scene-document.ts) para separar V1/V2 y `SceneMapDocument`.
- Modificar [default-scene.ts](/Users/minrock/Projects/ttrpg-effects/src/domain/sessions/default-scene.ts) para defaults V2 y defaults de mapa con `grid.locked: false`.
- Modificar [scene-schema.ts](/Users/minrock/Projects/ttrpg-effects/src/domain/sessions/scene-schema.ts) para schemas V1/V2, parser compatible y serializador V2.
- Agregar modulo `scene-maps.ts` o similar para operaciones puras de mapas activos, merge/importacion y validaciones.
- Actualizar [scene-content.ts](/Users/minrock/Projects/ttrpg-effects/src/domain/sessions/scene-content.ts) para detectar contenido en V2.
- Actualizar [scene-objects.ts](/Users/minrock/Projects/ttrpg-effects/src/domain/sessions/scene-objects.ts) para operar sobre el mapa activo.
- Actualizar `scene-navigation-links` para representar links internos y validar destinos por mapa.
- Tests:
  - migracion V1 -> V2;
  - defaults con zoom desbloqueado;
  - no guardar escena sin mapas;
  - cambio/remocion de mapa activo;
  - aislamiento de contenido por mapa;
  - merge de contenido de escena e ids duplicados;
  - links circulares/visitados.

### `application`

- Actualizar [load-scene.ts](/Users/minrock/Projects/ttrpg-effects/src/application/use-cases/load-scene.ts) para retornar siempre V2 y resolver URLs de imagen del mapa activo.
- Actualizar [save-scene.ts](/Users/minrock/Projects/ttrpg-effects/src/application/use-cases/save-scene.ts) para bloquear `maps.length === 0` y serializar V2.
- Crear use case `importSceneIntoCurrentScene` o `addSceneFileAsMap`.
- El use case de importacion:
  - carga JSON desde path/dialogo;
  - parsea/migra a V2;
  - toma el mapa activo/primer mapa del documento importado si es viejo;
  - mergea contenido escena;
  - remapea ids;
  - opcionalmente sigue conexiones legacy con limite.
- Actualizar use cases de scene navigation links para soportar carga interna por `mapId` y legacy por archivo.

### `infrastructure`

- Extender `SceneFileStorage` si hace falta con:
  - seleccionar archivo `.ttrpgscene` para importacion;
  - leer JSON desde path ya elegido;
  - normalizar/resolver rutas para detectar ciclos.
- Reutilizar [electron-scene-file-storage.ts](/Users/minrock/Projects/ttrpg-effects/src/infrastructure/file-system/electron-scene-file-storage.ts) para dialogos nativos y lectura segura.
- Mantener `fileExists`, `getMapImageUrl`, `getTokenImageUrl`.
- Resolver URLs solo para assets del mapa activo de entrada; otros mapas pueden resolverse bajo demanda al activarse.

### `main`

- Actualizar [scene-ipc.ts](/Users/minrock/Projects/ttrpg-effects/src/main/ipc/scene-ipc.ts):
  - `scene:load` retorna V2;
  - `scene:save` valida V2;
  - nuevo handler especifico `scene:import-as-map` o equivalente.
- Actualizar [scene-navigation-links-ipc.ts](/Users/minrock/Projects/ttrpg-effects/src/main/ipc/scene-navigation-links-ipc.ts) para aceptar requests internos si se implementa en esta iteracion.
- Validar sender DM para importaciones y links, siguiendo el patron actual.
- Mantener reciente de escenas solo para carga/guardado de archivo principal, no necesariamente para cada archivo importado como mapa.

### `preload`

- Actualizar [index.ts](/Users/minrock/Projects/ttrpg-effects/src/preload/index.ts) y [ttrpg-api.d.ts](/Users/minrock/Projects/ttrpg-effects/src/preload/ttrpg-api.d.ts):
  - tipos V2;
  - `importSceneAsMap` o nombre final especifico;
  - resolver URL de imagen/token por path para mapas activados bajo demanda.
- No exponer canales genericos.

### `renderer`

- Reestructurar [App.tsx](/Users/minrock/Projects/ttrpg-effects/src/renderer/src/App.tsx) para:
  - mantener `scene` V2;
  - derivar `activeMap`;
  - pasar a `MapViewport` solo props del mapa activo;
  - actualizar helpers `setSceneMap`, `updateActiveMap`, `setSceneAside`;
  - limpiar seleccion/herramientas al cambiar mapa;
  - publicar Player View con snapshot del mapa activo;
  - bloquear guardado si no hay mapas.
- Crear/actualizar componentes:
  - `SceneMapsSection` para listar, seleccionar, renombrar, ordenar, eliminar y agregar mapas;
  - `DmAsideTabs` o evolucion de `DmAsidePanel` con tabs horizontales;
  - separar secciones `SceneAsideTab` y `MapAsideTab`.
- `DmAsidePanel`:
  - tab `Escena`: mapas, notas, monstruos, NPCs, personajes;
  - tab `Mapa`: objetos y anotaciones del mapa activo.
- Actualizar estado vacio:
  - canvas sin mapa;
  - herramientas de mapa deshabilitadas;
  - CTA para agregar primer mapa.
- Actualizar status bar para mostrar nombre/ruta del mapa activo y numero total de mapas.
- Revisar todos los callbacks que hoy mutan `scene.grid`, `scene.mapAnnotations`, `scene.tokens`, etc. para que muten `activeMap`.
- `interaction.isZoomLocked` debe iniciar `false` y sincronizarse con el mapa activo o preferencia definida en plan final.

### `render`

- Mantener [MapViewport.tsx](/Users/minrock/Projects/ttrpg-effects/src/renderer/src/components/MapViewport.tsx) y [PixiViewport.ts](/Users/minrock/Projects/ttrpg-effects/src/render/pixi/PixiViewport.ts) centrados en un solo mapa activo.
- Verificar que cambiar props del mapa activo limpia recursos visuales anteriores.
- Evitar recrear el viewport completo por cambio de tabs del aside.
- Resolver mapa sin imagen/`null` como estado valido.

## 6. Plan de trabajo

1. Crear tipos V2 y helpers puros de `SceneMapDocument`, manteniendo V1 como legacy.
2. Implementar schema V1/V2, migracion V1 -> V2 y serializacion siempre V2.
3. Actualizar defaults: escena nueva en borrador, factory de primer mapa y zoom desbloqueado.
4. Ajustar tests de dominio existentes al nuevo modelo y agregar tests de migracion/mapas.
5. Actualizar load/save use cases e IPC para V2 y bloqueo de guardado sin mapas.
6. Introducir helpers de renderer para leer/mutar `activeMap` sin duplicar logica.
7. Migrar `App.tsx` por grupos: map/camera/grid, darkness/fog, elementos visuales, annotations, tokens/labels, combat/player.
8. Crear tabs horizontales del panel izquierdo y mover secciones a `Escena`/`Mapa`.
9. Implementar navegador de mapas: seleccionar, renombrar, ordenar, eliminar con confirmacion.
10. Implementar `Agregar mapa` desde imagen nueva.
11. Implementar `Agregar a escena` desde `.ttrpgscene` antiguo/compatible, sin recursion inicialmente si conviene partirlo internamente.
12. Implementar o completar migracion de conexiones legacy a links internos con proteccion de ciclos.
13. Actualizar Player View para publicar mapa activo en cambios.
14. Actualizar status, estados vacios y mensajes de errores recuperables.
15. Ejecutar tests, typecheck, lint, build y smoke manual.

## 7. Testing y verificacion

- **Unit tests dominio:**
  - `parseSceneJson` acepta V1 y produce V2;
  - `serializeSceneDocument` rechaza escena sin mapas;
  - defaults de mapa con `grid.locked === false`;
  - `setActiveSceneMap` y `removeSceneMap`;
  - aislamiento de contenido por mapa;
  - merge de `sceneAside`;
  - remapeo de ids duplicados;
  - deteccion de links internos rotos.
- **Integration tests:**
  - `loadSceneUseCase` carga V1 y retorna V2 con warnings correctos;
  - `saveSceneUseCase` bloquea borrador sin mapas;
  - importacion de V1 como mapa dentro de escena abierta;
  - importacion con path circular no duplica mapas.
- **Renderer/component tests:**
  - tabs del aside muestran contenido correcto;
  - seleccionar mapa cambia arbol de objetos/anotaciones;
  - borrar ultimo mapa muestra bloqueo/estado borrador;
  - guardado sin mapas no llama preload de save.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  - abrir escena V1 existente;
  - guardar como V2;
  - crear escena nueva, agregar primer mapa, agregar segundo mapa;
  - alternar mapas y confirmar fog/grilla/anotaciones aisladas;
  - abrir Player View y cambiar mapa activo;
  - importar dos escenas antiguas conectadas;
  - validar que zoom inicia desbloqueado.

## 8. Riesgos y mitigaciones

- **Riesgo:** `App.tsx` concentra muchas mutaciones del documento plano.
  **Mitigacion:** introducir helpers `updateActiveMap` y migrar por grupos verificables, con tests de dominio antes de UI.

- **Riesgo:** romper compatibilidad con archivos V1.
  **Mitigacion:** conservar schema V1 explicitamente, fixtures de escenas antiguas y parser union V1/V2.

- **Riesgo:** mezclar contenido de escena con contenido de mapa durante importacion.
  **Mitigacion:** factories separadas y tests de migracion que comprueben campos uno por uno.

- **Riesgo:** Player View recibe datos de mapa anterior.
  **Mitigacion:** snapshot derivado siempre desde `activeMap`; limpiar seleccion y publicar al cambiar `activeMapId`.

- **Riesgo:** memoria alta por multiples mapas grandes.
  **Mitigacion:** resolver URLs bajo demanda, renderizar solo activo y documentar cache/liberacion posterior.

- **Riesgo:** ciclos infinitos en conexiones legacy.
  **Mitigacion:** set de rutas visitadas normalizadas, limite de profundidad y limite total de mapas importados.

- **Riesgo:** ids duplicados entre archivos importados.
  **Mitigacion:** remapeo centralizado por namespace (`map`, `note`, `monster`, `npc`, `token`, `annotation`, `shape`, `effect`, `label`) y tests.

## 9. Criterios de aceptacion tecnica

- `SceneDocument` nuevo persiste `maps` y `activeMapId`.
- V1 plano se abre sin error y se transforma a V2 en memoria.
- Guardar una escena migrada escribe V2.
- Guardar escena sin mapas falla de forma recuperable y no escribe archivo.
- `createDefaultSceneMap` inicia con zoom desbloqueado.
- El renderer muestra tabs horizontales en panel izquierdo.
- El tab `Escena` muestra mapas, notas, monstruos, NPCs y personajes.
- El tab `Mapa` muestra objetos/anotaciones del mapa activo.
- Cambiar de mapa no mezcla contenido visual ni seleccion.
- Player View sigue el mapa activo.
- `Agregar a escena` importa `.ttrpgscene` antiguo sin reemplazar escena abierta.
- Tests relevantes, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/29-multi-map-scenes/spec.md` al ser aceptado.
- `CHANGELOG.md` al finalizar implementacion.
- `package.json` con bump minor si no hay ruptura incompatible con escenas existentes gracias a migracion V1 -> V2.
- Specs 03, 18, 22, 23 y 24 pueden requerir notas de actualizacion si el comportamiento queda redefinido por mapa activo.

## 11. Checklist de cierre

- [ ] Implementacion completada dentro del alcance.
- [ ] Tests de migracion V1 -> V2 agregados.
- [ ] Tests de operaciones de mapas agregados.
- [ ] Tests de importacion de escena antigua agregados.
- [ ] Tabs del panel izquierdo implementados.
- [ ] Player View verificado con cambio de mapa activo.
- [ ] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] `pnpm build` ejecutado.
- [ ] Smoke manual realizado en `pnpm dev`.
- [ ] `package.json` actualizado.
- [ ] `CHANGELOG.md` actualizado.
- [ ] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [ ] Sin dependencias nuevas no justificadas.
