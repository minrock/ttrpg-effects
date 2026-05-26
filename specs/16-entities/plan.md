# Plan - Sistema de Entidades

Este documento describe de forma unificada el plan tecnico para implementar y mantener sistema de entidades, consolidando los pasos y criterios vigentes en el proyecto.

## Biblioteca Persistente de Monstruos

### 1. Resumen

- **Objetivo:** Agregar una biblioteca local persistente de monstruos en SQLite para buscar, reutilizar y crear monstruos desde el flujo `+ Agregar monstruo`, manteniendo las escenas `.ttrpgscene` portables.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** panel de entidades del DM, templates Markdown/CSS de monstruos, decisiones de seguridad Electron del proyecto y SQLite local sin servicios externos.

### 2. Alcance

#### Incluido

- Modelo de dominio `MonsterLibraryEntry`.
- Conversion pura de entrada de biblioteca a instancia `SceneMonster`.
- Repositorio SQLite local con migracion inicial versionada.
- Casos de uso para buscar, obtener y guardar monstruos.
- IPC/preload tipados para la biblioteca.
- Modal de biblioteca tipo grilla/listado con buscador.
- Flujo para agregar un monstruo existente a la escena.
- Flujo para crear un monstruo nuevo, guardarlo en DB y agregarlo inmediatamente a la escena.
- Persistencia portable de la instancia dentro de `.ttrpgscene`.

#### Fuera de alcance

- Edicion global de biblioteca desde una pantalla dedicada.
- Actualizar entradas de biblioteca desde instancias ya agregadas a escena.
- Sincronizacion cloud, multiusuario o servicios externos.
- Importacion/exportacion masiva.
- Busqueda full-text avanzada.
- Versionado de monstruos o tracking de cambios entre DB y escenas.
- Dependencia obligatoria de imagen.

### 3. Decisiones tecnicas

- **Arquitectura:** La biblioteca queda modelada por dominio + casos de uso + repositorio. El renderer solo consume acciones tipadas via preload; no toca SQLite ni filesystem.
- **Persistencia:** Usar SQLite local en `app.getPath("userData")/ttrpg-effects.sqlite`. Mantener `.ttrpgscene` como snapshot portable de la escena.
- **IPC / Electron:** Crear canales especificos `monster-library:search`, `monster-library:get` y `monster-library:save`. Validar payloads en `main` antes de invocar casos de uso.
- **Render / PixiJS:** Sin cambios. La biblioteca alimenta el aside DM; los monstruos no son entidades PixiJS.
- **Validacion:** Validar nombre, sistema, template, Markdown, imagen opcional, fechas e ids en dominio/main. Usar queries parametrizadas.
- **Dependencias nuevas:** Se usa `node:sqlite` (built-in de Node.js 22+) en lugar de `better-sqlite3`. Elimina dependencias nativas y el problema de ABI mismatch entre el Node.js del sistema y el bundleado por Electron. En desarrollo y build se agrega `NODE_OPTIONS=--experimental-sqlite` porque Electron 39 bundlea Node.js 22 donde el modulo es experimental; en la app empaquetada macOS se inyecta via `LSEnvironment` en el `Info.plist` (configurado en `electron-builder`).

### 4. Diseno de dominio

- **Entidades / tipos:** `MonsterLibraryEntry`, `MonsterLibrarySearchQuery`, `MonsterLibrarySaveInput`.
- **Reglas puras:**
  - normalizar entradas desde payloads externos;
  - generar ids estables para biblioteca;
  - convertir una entrada de biblioteca a `SceneMonster` con id unico en escena;
  - extraer preview breve del Markdown para el listado.
- **Coordenadas / unidades:** No aplica.
- **Errores de dominio:** Nombre vacio, sistema vacio, contenido invalido si se decide requerir contenido, id invalido, templateId vacio.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/monster-library/monster-library.ts`.
- Definir tipos de entrada persistente y payloads.
- Agregar helper `createSceneMonsterFromLibraryEntry(entry, existingIds)`.
- Agregar helper de preview Markdown.
- Tests unitarios para validacion y conversion a `SceneMonster`.

#### `application`

- Crear `src/application/services/monster-library-repository.ts`.
- Crear casos de uso en `src/application/use-cases/monster-library.ts`:
  - `searchMonsterLibraryUseCase`;
  - `getMonsterLibraryEntryUseCase`;
  - `saveMonsterLibraryEntryUseCase`.
- Mantener las interfaces sin dependencia de SQLite.

#### `infrastructure`

- Agregar repositorio SQLite en `src/infrastructure/database` o `src/infrastructure/repositories`.
- Crear inicializacion de DB y migracion inicial.
- Usar `PRAGMA user_version` o tabla `schema_migrations`.
- Crear tabla `monster_library_entries`.
- Implementar queries parametrizadas para search/get/save.
- Asegurar creacion del directorio `userData` si hace falta.

#### `main`

- Inicializar DB al arrancar la app.
- Registrar IPC `monster-library:*`.
- Validar payloads recibidos antes de tocar la DB.
- Devolver errores serializables y amigables.

#### `preload`

- Exponer funciones especificas:
  - `searchMonsterLibrary(query)`;
  - `getMonsterLibraryEntry(id)`;
  - `saveMonsterLibraryEntry(input)`.
- Actualizar `src/preload/ttrpg-api.d.ts`.
- No exponer canales genericos ni objetos Electron.

#### `renderer`

- Modificar `MonsterSection` para que `+ Agregar monstruo` abra el modal de biblioteca.
- Crear `MonsterLibraryModal`.
- Reutilizar o adaptar `MonsterModal` para crear una entrada nueva desde el flujo de biblioteca.
- Cargar templates existentes del templates de monstruos para el formulario nuevo.
- Al seleccionar entrada existente, convertirla a `SceneMonster` y llamar `onAdd`.
- Al guardar entrada nueva, invocar preload para persistirla y luego agregarla a escena.
- Mostrar estado de carga, errores y lista vacia.
- Las cards de la grilla muestran la imagen del monstruo (100% del ancho de la card, aspect-ratio 16:9, `object-fit: cover`) con un placeholder cuando no hay imagen. Debajo: nombre, sistema y boton `Agregar a escena`. Las URLs de imagen se resuelven en paralelo via `resolveAsideUrl` al cargar las entries.
- Los onChange del formulario de nuevo monstruo leen `event.currentTarget.value` fuera del updater funcional para evitar el error de `currentTarget null` en React 18 StrictMode.

#### `render`

- Sin cambios esperados.

### 6. Plan de trabajo

1. Agregar dependencia SQLite elegida y confirmar que `pnpm build`/empaquetado siguen funcionando.
2. Crear dominio de biblioteca y tests de conversion/validacion.
3. Crear interfaces de repositorio y casos de uso.
4. Implementar repositorio SQLite con migracion inicial.
5. Registrar IPC en `main` y API en `preload`.
6. Implementar modal de biblioteca con buscador y cards/listado.
7. Conectar `+ Agregar monstruo` al modal de biblioteca.
8. Implementar seleccion de entrada existente -> instancia `SceneMonster`.
9. Implementar crear nuevo -> guardar en SQLite -> agregar a escena.
10. Verificar portabilidad de `.ttrpgscene` y que la escena no dependa de la DB.
11. Ejecutar tests, typecheck, lint focalizado y build.

### 7. Testing y verificacion

- **Unit tests:** validacion de `MonsterLibraryEntry`, preview Markdown, conversion a `SceneMonster` con id unico.
- **Integration tests:** repositorio SQLite con DB temporal, migracion inicial, save/get/search.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint` o ESLint focalizado si el lint completo sigue fallando por archivos preexistentes.
- **Build:** `pnpm build`
- **Manual / smoke:** En `pnpm dev`, crear monstruo nuevo desde biblioteca, confirmar que aparece en DB/listado, agregar existente a escena, guardar/cargar escena y confirmar que el monstruo queda portable.

### 8. Riesgos y mitigaciones

- **Riesgo:** ~~Dependencia nativa SQLite complica build o DMG.~~
  **Resuelto:** Se migro a `node:sqlite` (built-in), eliminando dependencias nativas por completo. El flag `--experimental-sqlite` se inyecta en `package.json` scripts y en `LSEnvironment` para la app empaquetada.
- **Riesgo:** La escena queda acoplada a ids de biblioteca local.
  **Mitigacion:** Guardar copia completa del monstruo en `SceneMonster`; usar la DB solo como fuente para crear instancias.
- **Riesgo:** Busqueda lenta con muchas entradas.
  **Mitigacion:** Indices por `name` y `system`; limitar resultados; dejar FTS para spec futuro.
- **Riesgo:** SQL injection.
  **Mitigacion:** Todas las queries parametrizadas, sin concatenar input.
- **Riesgo:** Duplicados confusos.
  **Mitigacion:** Permitir duplicados inicialmente, pero mostrar sistema/template y fecha; un spec futuro puede agregar deduplicacion o update.

### 9. Criterios de aceptacion

- [x] `+ Agregar monstruo` abre modal de biblioteca.
- [x] El modal muestra buscador y grilla/listado de monstruos.
- [x] Se puede buscar por nombre.
- [x] Se puede agregar un monstruo existente a la escena.
- [x] Se puede crear un monstruo nuevo desde el modal.
- [x] Crear nuevo guarda en SQLite y agrega inmediatamente a escena.
- [x] Al reabrir el modal, el monstruo nuevo aparece en la biblioteca.
- [x] La instancia de escena conserva nombre, Markdown, template e imagen opcional.
- [x] Guardar/cargar `.ttrpgscene` preserva el monstruo aunque la DB no se consulte.
- [x] SQLite se usa solo desde `main`/infraestructura (via `node:sqlite` built-in).
- [x] Hay migracion inicial versionada.
- [x] Tests y validaciones pasan.
- [x] Las cards de la grilla muestran imagen a ancho completo (16:9) con placeholder si no hay imagen.

### 10. Documentacion afectada

- `./specs/16-entities/spec.md`
- `./specs/16-entities/plan.md`
- Specs relacionados con aside DM y templates de monstruos si la implementacion cambia flujos existentes.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] ESLint focalizado ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] `node:sqlite` (built-in) usado como alternativa sin dependencias nativas a `better-sqlite3`.

## Bibliotecas de NPCs y Personajes Jugadores

### 1. Resumen

- **Objetivo:** Extender el sistema de entidades para que NPCs y Personajes Jugadores se puedan persistir en SQLite, buscar desde modales tipo biblioteca y agregar a escenas como copias portables.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** biblioteca persistente de monstruos, panel de entidades del DM, preload/IPC de imagenes del aside y schema `.ttrpgscene`.

### 2. Alcance

#### Incluido

- Biblioteca persistente de NPCs.
- Biblioteca persistente de Personajes Jugadores.
- Modal tipo grilla/listado con buscador para `+ Agregar NPC`.
- Modal tipo grilla/listado con buscador para Personajes Jugadores.
- Accion `Nuevo NPC` que guarda en DB y agrega automaticamente a escena.
- Accion `Nuevo Personaje Jugador` que guarda en DB y agrega automaticamente a escena.
- Nueva seccion de Personajes Jugadores en el panel de entidades del DM.
- Vista de detalle de Personaje Jugador inspirada en ficha/carta fisica con imagen grande y bloques compactos de estadisticas.
- Persistencia portable de NPCs y Personajes Jugadores dentro de `.ttrpgscene`.

#### Fuera de alcance

- Reglas completas de hoja de personaje.
- Automatizacion de combate, iniciativa o modificadores derivados.
- Sincronizacion cloud o multiusuario.
- Importacion masiva de NPCs/personajes.
- Relacion directa entre Personajes Jugadores y tokens del canvas.

### 3. Decisiones tecnicas

- **Arquitectura:** Reutilizar el patron de monstruos: dominio + casos de uso + repositorios SQLite + IPC/preload tipado + UI React.
- **Persistencia:** Mantener DB local en `app.getPath("userData")/ttrpg-effects.sqlite`. Las escenas siguen guardando copia completa de cada entidad insertada.
- **IPC / Electron:** Crear canales especificos por tipo de entidad; no exponer APIs genericas.
- **Imagenes:** Usar el mismo flujo `aside:open-image` / `aside:resolve-url` y protocolo seguro ya existente.
- **Versionado de escena:** Agregar campos opcionales/default para preservar compatibilidad con escenas anteriores.
- **UI:** Reutilizar estilos de biblioteca de monstruos para listados; crear una card de detalle dedicada para Personajes Jugadores.

### 4. Diseno de dominio

#### NPCs

- Agregar tipos:
  - `NpcLibraryEntry`
  - `NpcLibrarySearchQuery`
  - `NpcLibrarySaveInput`
- Agregar helpers:
  - normalizacion/validacion;
  - conversion de biblioteca a `SceneNpc`;
  - generacion de id unico dentro de escena.

#### Personajes Jugadores

- Agregar tipos:
  - `PlayerCharacterLibraryEntry`
  - `PlayerCharacterLibrarySearchQuery`
  - `PlayerCharacterSaveInput`
  - `ScenePlayerCharacter`
- Agregar helpers:
  - normalizacion de campos tacticos string;
  - validacion de `armorClass` con formato `d` o `d/d`;
  - captura separada de `species` y `classes`;
  - normalizacion de caracteristicas como texto libre;
  - conversion de biblioteca a instancia de escena;
  - labels abreviados para detalle (`Fue`, `Con`, `Des`, `Int`, `Sab`, `Car`, `CD`).

### 5. Cambios por capa

#### `domain`

- Extender o crear modulo de entidades para NPCs y Personajes Jugadores.
- Agregar tests unitarios de validacion y conversion a instancia de escena.
- Mantener funciones puras sin React/Electron/PixiJS.

#### `application`

- Crear interfaces de repositorio para NPCs y Personajes Jugadores.
- Crear casos de uso:
  - buscar/listar;
  - obtener por id;
  - guardar;
  - convertir a instancia de escena.

#### `infrastructure`

- Agregar migraciones SQLite versionadas:
  - `npc_library_entries`;
  - `player_character_library_entries`.
- Usar queries parametrizadas.
- Mantener compatibilidad con la migracion existente de monstruos.

#### `main`

- Registrar IPC para NPCs:
  - `npc-library:search`
  - `npc-library:get`
  - `npc-library:save`
- Registrar IPC para Personajes Jugadores:
  - `player-character-library:search`
  - `player-character-library:get`
  - `player-character-library:save`
- Validar payloads en `main`.

#### `preload`

- Exponer funciones especificas para las nuevas bibliotecas.
- Actualizar `src/preload/ttrpg-api.d.ts`.
- No exponer SQLite, filesystem ni canales genericos.

#### `renderer`

- Cambiar `+ Agregar NPC` para abrir biblioteca de NPCs.
- Crear modal de biblioteca de NPCs con buscador, cards y `Nuevo NPC`.
- Crear formulario/modal de nuevo NPC conectado a DB.
- Agregar seccion de Personajes Jugadores al panel del DM.
- Crear modal de biblioteca de Personajes Jugadores con buscador y `Nuevo Personaje`.
- Crear formulario de captura con nombres completos de caracteristicas.
- Crear vista de detalle con labels abreviados e imagen destacada.
- Ajustar el preview de biblioteca para ocupar aproximadamente la mitad del viewport, permitir edicion previa y agregar a escena desde alli.
- Reutilizar el editor/render Markdown de monstruos/NPCs para las notas de Personajes Jugadores.
- Inspirar el detalle en las referencias visuales: carta/ficha con marco, imagen dominante, nombre destacado y bloques compactos.
- Agregar estados de carga, vacio y error.

#### `render`

- Sin cambios esperados en PixiJS, salvo que futuros tokens/personajes se vinculen al canvas en otra spec.

### 6. Plan de trabajo

1. Revisar tipos actuales de `SceneNpc` y `sceneAside`.
2. Agregar tipos de dominio para bibliotecas de NPCs y Personajes Jugadores.
3. Extender schema de escena con `playerCharacters` opcional/default.
4. Crear migraciones SQLite nuevas.
5. Implementar repositorios SQLite y tests de integracion.
6. Implementar casos de uso y tests unitarios.
7. Registrar IPC/preload tipado.
8. Implementar biblioteca de NPCs y conectar `+ Agregar NPC`.
9. Implementar biblioteca y formulario de Personajes Jugadores.
10. Implementar detalle visual de Personaje Jugador.
11. Verificar guardado/carga `.ttrpgscene`.
12. Ejecutar `pnpm typecheck`, tests relevantes y smoke manual.

### 7. Testing y verificacion

- Tests unitarios de validacion:
  - nombre requerido;
  - `armorClass` valido;
  - caracteristicas como texto libre (`+2`, `-1`, `10` o vacio);
  - conversion a instancia de escena con id unico.
- Tests de repositorio SQLite:
  - migracion;
  - save/get/search de NPC;
  - save/get/search de Personaje Jugador.
- Typecheck: `pnpm typecheck`.
- Smoke manual:
  - crear NPC nuevo y confirmar que aparece en biblioteca;
  - agregar NPC existente a escena;
  - crear Personaje Jugador con imagen y verlo en detalle;
  - guardar/cargar escena y validar persistencia portable.

### 8. Riesgos y mitigaciones

- **Riesgo:** Duplicar demasiado codigo de bibliotecas.
  **Mitigacion:** Extraer componentes/helpers compartidos solo si reduce duplicacion real sin oscurecer el flujo.
- **Riesgo:** El detalle de Personaje Jugador se vuelve demasiado decorativo y poco legible.
  **Mitigacion:** Usar la referencia como guia de estructura, mantener contraste y densidad acorde al tema oscuro.
- **Riesgo:** Migraciones SQLite rompen datos existentes.
  **Mitigacion:** Migraciones aditivas, tablas nuevas y campos de escena opcionales/default.
- **Riesgo:** Escenas quedan acopladas a DB.
  **Mitigacion:** Guardar copias completas en `.ttrpgscene`.

### 9. Criterios de aceptacion

- [x] `+ Agregar NPC` abre una biblioteca persistente con buscador.
- [x] El usuario puede crear un NPC nuevo y este se guarda en DB y escena.
- [x] El usuario puede agregar NPCs existentes desde DB a escena.
- [x] Existe seccion de Personajes Jugadores en el panel DM.
- [x] El usuario puede crear y guardar Personajes Jugadores en DB.
- [x] El usuario puede previsualizar y editar Personajes Jugadores existentes antes de agregarlos a escena.
- [x] El usuario puede agregar Personajes Jugadores existentes a escena desde la card o desde el preview.
- [x] La captura muestra nombres completos de caracteristicas.
- [x] Las caracteristicas se capturan como texto libre, no como campos numericos.
- [x] Especie y Clase(s) son campos separados.
- [x] El preview de biblioteca queda centrado, ocupa cerca de media pantalla y permite editar el personaje antes de agregarlo.
- [x] Las notas de Personajes Jugadores se capturan como Markdown y se renderizan en el detalle.
- [x] El detalle muestra abreviaturas `Fue`, `Con`, `Des`, `Int`, `Sab`, `Car` y `CD`.
- [x] La imagen del personaje se muestra como foco visual en el detalle.
- [x] Guardar/cargar `.ttrpgscene` preserva NPCs y Personajes Jugadores.
- [x] El renderer consume solo preload/IPC tipado.

### 10. Documentacion afectada

- `./specs/16-entities/spec.md`
- `./specs/16-entities/plan.md`
- `CHANGELOG.md`

## Panel lateral izquierdo del DM: Monstruos, NPCs y Notas

### 1. Resumen

- **Objetivo:** Agregar un panel lateral izquierdo a la ventana del DM para gestionar Monstruos, NPCs y Notas de escena. El panel persiste en `.ttrpgscene`, sincroniza a la ventana de jugador el subconjunto visible (imágenes de monstruos, nombre/imagen de NPCs), y ofrece un editor WYSIWYG con renderización Markdown directa para las notas.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:**
  - ventana de jugador (ventana de jugador / IPC de escena): el snapshot `PlayerWindowSnapshot` ya contiene la escena completa; el nuevo campo `sceneAside` viajará automáticamente por el mismo canal `player-window:publish-scene`.
  - Patrón IPC de imágenes: `token:open-image`, `token:resolve-url`, protocolo `map-asset:` — todo ya registrado y funcional.
  - Schema Zod de escena: `sceneDocumentV1Schema` en `scene-schema.ts` — se extiende con campo opcional.

### 2. Alcance

#### Incluido

- Tipos de dominio: `SceneMonster`, `SceneNpc`, `SceneNote` (raíz y hija), `SceneAside`.
- Extensión del schema Zod `sceneDocumentV1Schema` con campo opcional `sceneAside`.
- Extensión de `SceneDocumentV1` con `sceneAside` opcional.
- Extensión de `createDefaultScene()` para incluir `sceneAside` vacío.
- Funciones puras de dominio: slugificación, unicidad de slug, operaciones CRUD de cada entidad.
- IPC nuevo para imágenes del aside: `aside:open-image` y `aside:resolve-url` (reutiliza `ElectronMapImageStorage`).
- Tipos en preload y exposición en `contextBridge`.
- Componente `DmAsidePanel` con tres secciones (acordeones).
- Modales: `MonsterModal`, `NpcModal`, `NoteEditModal`, `NoteViewModal`.
- Editor WYSIWYG: **Tiptap** con lazy loading (`React.lazy` + `Suspense`) cargado solo al abrir `NoteEditModal`.
- Vista de jugador: renderizado de aside visible (imagen de monstruo, nombre/imagen de NPC) como overlay o panel flotante fuera del canvas.
- Sincronización del nuevo campo `sceneAside` a jugador a través del canal existente.
- Tests unitarios de dominio: slug, unicidad, CRUD, invariantes de dos niveles.

#### Fuera de alcance

- Sistema de iniciativa o combate.
- Relaciones entre aside y tokens del canvas.
- Búsqueda, filtrado o reordenamiento.
- Más de dos niveles de notas.
- Portabilidad cross-máquina de imágenes.
- Tablas, imágenes inline en contenido de notas, exportación MD a archivo.

### 3. Decisiones técnicas

- **Arquitectura:** Se respetan las fronteras existentes: dominio sin imports de React/Electron/PixiJS; application sin UI; infrastructure solo en `main`; renderer solo consume preload API. El panel aside es un componente React del renderer, igual que el sidebar derecho (sidebar derecho).

- **Persistencia:** Se agrega `sceneAside` como campo opcional en el schema Zod con `.optional()` y `.default(() => createDefaultSceneAside())`. Los archivos de escena existentes sin ese campo parsean sin error. Las imágenes se guardan como `imagePath` (ruta absoluta), igual que tokens y mapas.

- **IPC / Electron:** Se añaden dos handlers nuevos (`aside:open-image`, `aside:resolve-url`) en un archivo `aside-ipc.ts` nuevo, que delegan en el `ElectronMapImageStorage` existente (ya que las extensiones de imagen soportadas y el protocolo `map-asset:` son los mismos). No se modifican los canales de jugador: `player-window:publish-scene` ya serializa la escena completa incluyendo `sceneAside`.

- **Render / PixiJS:** No se toca el motor Pixi. La vista de aside en jugador es HTML/React puro, colocada sobre el canvas con `position: absolute`, igual que otros overlays ya existentes.

- **Editor WYSIWYG:** Se usa **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`). El componente editor se importa con `React.lazy` para que ProseMirror solo se cargue al abrir `NoteEditModal` por primera vez. El contenido se almacena como string Markdown. Para la vista de solo lectura se usa `marked` (ligero, ~10 KB minificado) para convertir el string MD a HTML sanitizado renderizado en el modal de vista.

- **Validación:** Todos los campos nuevos se validan con Zod al parsear y serializar la escena. El slug se recalcula y valida en dominio antes de persistir. El contenido MD se almacena tal cual (string); no se valida su contenido semántico.

- **Dependencias nuevas:**
  - `@tiptap/react` + `@tiptap/starter-kit` + `tiptap-markdown` — editor WYSIWYG (MIT). Nota: el paquete correcto es `tiptap-markdown`, no `@tiptap/extension-markdown` (que no existe en npm).
  - `marked` — rendering MD a HTML en `NoteViewModal`, `MonsterDetailModal`, `NpcDetailModal` (MIT, ~10 KB).
  - Ninguna dependencia para la slugificación (función pura local de ~10 líneas).

### 4. Diseño de dominio

#### Entidades / tipos

```ts
// src/domain/sessions/scene-aside.ts

export interface SceneMonster {
  readonly id: string;           // slug único en la lista de monstruos
  readonly name: string;         // nombre legible
  readonly imagePath: string | null;
  readonly visibleToPlayer: boolean;
}

export interface SceneNpc {
  readonly id: string;           // slug único en la lista de NPCs
  readonly name: string;
  readonly imagePath: string | null;
  readonly visibleToPlayer: boolean;
}

export interface SceneNote {
  readonly id: string;           // slug único en su nivel
  readonly parentId: string | null;  // null = raíz; string = slug del padre raíz
  readonly name: string;         // nombre legible
  readonly content: string;      // Markdown
}

export interface SceneAside {
  readonly monsters: readonly SceneMonster[];
  readonly npcs: readonly SceneNpc[];
  readonly notes: readonly SceneNote[];
}
```

#### Reglas puras (`scene-aside.ts`)

- `slugify(name: string): string` — minúsculas, reemplaza espacios/caracteres especiales por `-`, colapsa guiones múltiples, elimina guiones al inicio/fin.
- `ensureUniqueSlug(base: string, existing: readonly string[]): string` — agrega sufijo `-2`, `-3`, … si hay colisión.
- `createDefaultSceneAside(): SceneAside` — devuelve `{ monsters: [], npcs: [], notes: [] }`.
- `addMonster(aside, monster) / updateMonster / removeMonster` — operaciones inmutables.
- `addNpc / updateNpc / removeNpc` — ídem.
- `addNote(aside, note) / updateNote / removeNote` — valida que `parentId` exista como nota raíz si no es null; que el padre no sea él mismo; que los hijos no tengan hijos.
- `getNotePath(notes, noteId): string` — devuelve `"/"` o `"/ padre / hijo"`.
- `getPlayerVisibleMonsters(aside): readonly SceneMonster[]` — filtra `visibleToPlayer && imagePath !== null`.
- `getPlayerVisibleNpcs(aside): readonly SceneNpc[]` — filtra `visibleToPlayer`.

#### Coordenadas / unidades

No aplica; el aside es metadata de escena sin coordenadas de mundo.

#### Errores de dominio

- Intentar agregar nota hija a una nota que ya tiene padre → error: `"Las notas solo admiten dos niveles."`.
- Slug vacío después de slugificar → error: `"El nombre debe contener al menos un carácter válido."`.

### 5. Cambios por capa

#### `domain`

**Archivos nuevos:**
- `src/domain/sessions/scene-aside.ts` — tipos `SceneMonster`, `SceneNpc`, `SceneNote`, `SceneAside`; funciones puras `slugify`, `ensureUniqueSlug`, `createDefaultSceneAside`, operaciones CRUD, `getNotePath`, `getPlayerVisibleMonsters`, `getPlayerVisibleNpcs`.

**Archivos modificados:**
- `src/domain/sessions/scene-document.ts` — agregar campo `readonly sceneAside?: SceneAside` a `SceneDocumentV1`.
- `src/domain/sessions/default-scene.ts` — incluir `sceneAside: createDefaultSceneAside()` en `createDefaultScene()`.

**Tests:**
- `src/domain/sessions/scene-aside.test.ts` — cubre `slugify`, `ensureUniqueSlug`, invariante de dos niveles, `getNotePath`, filtros de visibilidad.

#### `application`

No se agregan casos de uso propios: las operaciones de aside se realizan directamente en el reducer/estado del renderer (igual que tokens, luces y shapes). Si en el futuro se necesita lógica transaccional, se puede extraer a un caso de uso.

#### `infrastructure`

No se agrega infraestructura nueva. El aside se serializa junto con el resto de la escena en `ElectronSceneFileStorage` (ya existente). Las imágenes del aside usan `ElectronMapImageStorage` existente a través de los nuevos handlers IPC.

#### `main`

**Archivos nuevos:**
- `src/main/ipc/aside-ipc.ts` — registra:
  - `ipcMain.handle("aside:open-image", async () => storage.openTokenImage())` — reutiliza el mismo diálogo y extensiones que tokens.
  - `ipcMain.handle("aside:resolve-url", async (_event, imagePath: string) => storage.resolveTokenUrl(imagePath))` — reutiliza `resolveTokenUrl`.

**Archivos modificados:**
- `src/main/index.ts` — importar y llamar `registerAsideIpc(storage)` junto a los demás `register*Ipc`.

#### `preload`

**Archivos modificados:**
- `src/preload/index.ts` — exponer en `contextBridge`:
  ```ts
  openAsideImage: () => ipcRenderer.invoke("aside:open-image"),
  resolveAsideUrl: (imagePath: string) => ipcRenderer.invoke("aside:resolve-url", imagePath),
  ```
- `src/preload/ttrpg-api.d.ts` — agregar al tipo `TtrpgApi`:
  ```ts
  openAsideImage: () => Promise<TokenOpenResult>;
  resolveAsideUrl: (imagePath: string) => Promise<string | null>;
  ```

#### `renderer`

**Archivos nuevos:**

```
src/renderer/src/components/aside/
  DmAsidePanel.tsx          — panel lateral izquierdo con tres secciones acordeón
  MonsterSection.tsx        — lista de monstruos + botón agregar; clic en fila → detalle
  NpcSection.tsx            — lista de NPCs + botón agregar; clic en fila → detalle
  NotesSection.tsx          — lista de notas anidadas + botón agregar
  MonsterModal.tsx          — modal captura/edición de monstruo (imagen + nombre + notas WYSIWYG)
  NpcModal.tsx              — modal captura/edición de NPC (imagen + nombre + notas WYSIWYG)
  MonsterDetailModal.tsx    — modal de detalle de monstruo; contiene "Mostrar/Ocultar a jugadores"
  NpcDetailModal.tsx        — modal de detalle de NPC; contiene "Mostrar/Ocultar a jugadores"
  NoteEditModal.tsx         — modal captura/edición de nota (WYSIWYG Tiptap)
  NoteViewModal.tsx         — modal solo lectura (MD renderizado con marked)
  ImagePicker.tsx           — componente de carga de imagen (click/drag-drop, preview)
  NoteEditor.tsx            — editor Tiptap, importado con React.lazy
  ModalBackdrop.tsx         — backdrop compartido; props: wide (600px), large (80vw × 60vh)
  PlayerAsideOverlay.tsx    — overlay presentación jugador (cubre mapa, centrado, zoom en imagen)
```

**Archivos modificados:**
- `src/renderer/src/App.tsx` — incluir `<DmAsidePanel>` a la izquierda del canvas; gestionar estado de `sceneAside` junto al resto de la escena; pasar handlers de CRUD al panel; incluir `sceneAside` en el snapshot publicado a jugador.
- `src/renderer/src/PlayerApp.tsx` — incluir `<PlayerAsideOverlay>` con los monstruos/NPCs visibles del snapshot.

**Estado del aside en App.tsx:**

El estado `sceneAside` vive en `useState` de `App` al mismo nivel que `scene`. Cuando el usuario carga/guarda/resetea la escena, el aside va incluido en `SceneDocument`. Los handlers de CRUD del aside llaman a las funciones puras de dominio y actualizan el estado, seguido de `publishPlayerScene` con el snapshot actualizado (igual que cualquier otro cambio de escena).

#### `render`

No hay cambios en PixiJS. El aside es completamente HTML/React.

### 6. Plan de trabajo

1. **Dominio — tipos y funciones puras**
   - Crear `src/domain/sessions/scene-aside.ts` con todos los tipos e interfaces.
   - Implementar `slugify`, `ensureUniqueSlug`, `createDefaultSceneAside`.
   - Implementar CRUD inmutable para monstruos, NPCs y notas (con validación de dos niveles).
   - Implementar `getNotePath`, `getPlayerVisibleMonsters`, `getPlayerVisibleNpcs`.
   - Escribir `src/domain/sessions/scene-aside.test.ts`.

2. **Dominio — extensión del schema de escena**
   - Agregar `SceneAside` a `SceneDocumentV1` en `scene-document.ts` (campo opcional).
   - Agregar `sceneAsideSchema` (Zod) en `scene-schema.ts` e incluirlo en `sceneDocumentV1Schema` con `.optional().default(createDefaultSceneAside)`.
   - Actualizar `createDefaultScene()` para incluir `sceneAside`.
   - Verificar `pnpm typecheck` y `pnpm test`.

3. **IPC — aside:open-image y aside:resolve-url**
   - Crear `src/main/ipc/aside-ipc.ts` delegando en `ElectronMapImageStorage`.
   - Registrar en `src/main/index.ts`.
   - Exponer en `src/preload/index.ts` y tipar en `src/preload/ttrpg-api.d.ts`.

4. **Renderer — ImagePicker y NoteEditor**
   - Instalar `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`, `marked`.
   - Crear `ImagePicker.tsx`: zona de carga de imagen con click o drag & drop, preview, llamada a `window.ttrpg?.openAsideImage()` y `resolveAsideUrl()`.
   - Crear `NoteEditor.tsx`: wrapper de Tiptap configurado con `StarterKit` y `Markdown`; importa/exporta Markdown string; estilos mínimos inline en modo oscuro.
   - El componente `NoteEditor` se exporta como componente lazy en un módulo separado para que el bundle de ProseMirror se cargue solo cuando se usa.

5. **Renderer — modales**
   - `MonsterModal.tsx`: formulario con `ImagePicker` + campo nombre. Recibe `initial?: SceneMonster` para edición.
   - `NpcModal.tsx`: igual que `MonsterModal`.
   - `NoteEditModal.tsx`: breadcrumb de ruta + campo nombre con slug en tiempo real + `<Suspense fallback="Cargando editor…"><NoteEditor /></Suspense>`.
   - `NoteViewModal.tsx`: breadcrumb + nombre + contenido renderizado con `marked` + botón Editar.
   - Cada modal maneja su propio estado local; al Guardar llama al handler que recibe como prop.

6. **Renderer — secciones, panel y modales de detalle**
   - `MonsterSection.tsx`: lista con thumbnail, nombre, toggle rápido `visibleToPlayer`, botón eliminar. Clic en thumbnail+nombre abre `MonsterDetailModal`. Abre `MonsterModal` para agregar/editar (también accesible desde el detalle). Al cerrar el detalle, si el monstruo estaba visible, se oculta automáticamente (`closeDetail` lo gestiona).
   - `NpcSection.tsx`: ídem para NPCs.
   - `MonsterDetailModal.tsx`: modal `large` (80 vw × 60 vh mínimo) con imagen 100×100, nombre, badge de visibilidad, notas (Markdown renderizado con `marked`), botón "Mostrar/Ocultar a jugadores", botón "Editar", botón "Cerrar".
   - `NpcDetailModal.tsx`: ídem para NPCs.
   - `NotesSection.tsx`: lista anidada (raíz + hijos) con botones ver, editar, agregar hijo (solo raíz), eliminar. Abre modales de nota.
   - `DmAsidePanel.tsx`: tres secciones acordeón (estado local de abiertas/cerradas), `hidden` prop para colapso gestionado en `App.tsx`.

7. **Renderer — integración en App.tsx**
   - Agregar estado `sceneAside: SceneAside` inicializado desde `scene.sceneAside ?? createDefaultSceneAside()` al cargar escena.
   - Handlers: `handleAddMonster`, `handleUpdateMonster`, `handleRemoveMonster` (y equivalentes para NPC y nota) que llaman a funciones puras de dominio y setean estado + publican a jugador.
   - Incluir `<DmAsidePanel>` en el layout a la izquierda del canvas; el aside es solo DM (`view !== "player"`).
   - Al llamar a `publishPlayerScene`, incluir `sceneAside` en el snapshot (ya viaja dentro de `scene`).
   - Al guardar la escena, el `sceneAside` ya está en el estado y se serializa junto al resto.

8. **Renderer — PlayerAsideOverlay y PlayerApp.tsx**
   - `PlayerAsideOverlay.tsx`: recibe `aside: SceneAside`; filtra con `getPlayerVisibleMonsters` y `getPlayerVisibleNpcs`; cuando hay entidades visibles, muestra un overlay `position:absolute; inset:0` que cubre todo el mapa con fondo oscuro + `backdropFilter:blur(3px)`. Las entidades se presentan centradas en un contenedor decorativo.
   - **Imágenes**: 440×440 px por defecto. Clic en la imagen → zoom a `min(72vw, 72vh)` con transición CSS; clic de nuevo → vuelta a 440 px. Icono 🔍 en esquina inferior derecha indica la acción.
   - **NPCs**: nombre del NPC en tipografía grande arriba a la izquierda del card (`text-align: left`), imagen debajo.
   - **Monstruos**: solo imagen, sin nombre.
   - Las URLs ya llegan como `map-asset:` paths resolubles en ambas ventanas sin cambios adicionales.

9. **Estilos**
   - Seguir el tema oscuro existente: mismo fondo y colores que el sidebar derecho (sidebar derecho).
   - Thumbnails 40×40 px con `object-fit: cover`, borde redondeado.
   - Breadcrumb de ruta en tono apagado (gris).
   - Acordeones con la misma tipografía y separadores que el sidebar derecho.

10. **Verificación final**
    - `pnpm typecheck`
    - `pnpm lint`
    - `pnpm test` (dominio)
    - Smoke en `pnpm dev`: agregar monstruo/NPC/nota, editar, eliminar, toggle jugador, guardar escena, reabrir y verificar persistencia, abrir ventana de jugador y verificar overlay.

### 7. Testing y verificación

- **Unit tests:**
  - `scene-aside.test.ts`: `slugify` (casos límite: vacío, caracteres especiales, mayúsculas, espacios, guiones múltiples), `ensureUniqueSlug` (sin colisión, colisión simple, colisión múltiple), invariante de dos niveles (rechazar nota hija de hija), `getNotePath` (raíz, hijo con padre), filtros de visibilidad.
  - `scene-schema.test.ts`: parseo de documento con `sceneAside` presente; parseo sin `sceneAside` (retrocompatibilidad); rechazo de estructura inválida.

- **Integration tests:** no se necesitan nuevos; la integración de save/load de escena ya está cubierta por los tests existentes de `scene-use-cases`.

- **Typecheck:** `pnpm typecheck` — debe pasar sin errores en tipos nuevos y modificados.

- **Lint:** `pnpm lint`.

- **Build:** `pnpm build` para verificar que el código Tiptap se importa correctamente y el bundle no rompe.

- **Manual / smoke:**
  - Abrir app en `pnpm dev`.
  - Agregar un monstruo con imagen → verificar thumbnail y nombre en lista.
  - Editar el monstruo → verificar cambio persistido.
  - Activar toggle de visibilidad de jugador → abrir ventana de jugador → verificar imagen en overlay.
  - Desactivar toggle → verificar que desaparece en jugador.
  - Agregar un NPC → verificar que jugador muestra nombre + imagen al activar toggle.
  - Agregar nota raíz → escribir MD en editor → guardar → verificar modal de vista renderiza MD.
  - Agregar nota hija → verificar breadcrumb muestra ruta del padre.
  - Eliminar nota raíz con hijos → verificar confirmación y borrado en cascada.
  - Guardar escena → cerrar app → reabrir escena → verificar que monstruos, NPCs y notas se restauran.
  - Abrir escena antigua (sin `sceneAside`) → verificar que carga sin error y el panel está vacío.
  - Verificar que el panel no aparece en la ventana de jugador.

### 8. Riesgos y mitigaciones

- **Riesgo:** Bundle de Tiptap/ProseMirror puede ser grande (~150-200 KB gzip) e impactar el tiempo de arranque.
  **Mitigación:** `React.lazy` + `Suspense` en `NoteEditModal`; el bundle de Tiptap se descarga solo al abrir el modal por primera vez. Verificar con `pnpm build` y revisar el análisis de chunks.

- **Riesgo:** El campo `sceneAside` en el snapshot de jugador puede perderse si `PlayerWindowSnapshot` tipifica `scene` como `SceneDocument` y el tipo no incluye `sceneAside`.
  **Mitigación:** Al extender `SceneDocumentV1` con `sceneAside?` el tipo se propaga automáticamente al snapshot. Verificar con `pnpm typecheck` que `scene.sceneAside` es accesible en `PlayerApp`.

- **Riesgo:** Colisión de slugs si el DM agrega dos monstruos con el mismo nombre.
  **Mitigación:** `ensureUniqueSlug` en dominio garantiza unicidad antes de insertar. Cubierto por unit tests.

- **Riesgo:** Imágenes del aside en ventana de jugador: el protocolo `map-asset:` ya está registrado globalmente en `main`, así que las URLs `map-asset://…` en `imagePath` funcionan en ambas ventanas sin cambios adicionales.
  **Mitigación:** verificar en smoke test que la imagen del monstruo aparece en la ventana de jugador con la ruta absoluta original.

- **Riesgo:** Colapsado/expansión del panel izquierdo puede requerir ajustar el cálculo de ancho del canvas, que hoy asume sidebar derecho únicamente.
  **Mitigación:** usar `flex` en el layout principal de `App.tsx`; el canvas ya crece/encoge con `flex-1`. Agregar el aside como hermano izquierdo en el mismo contenedor flex no requiere cálculos manuales.

### 9. Criterios de aceptación

- `pnpm typecheck` pasa sin errores.
- `pnpm lint` pasa sin errores.
- `pnpm test` pasa, incluyendo los nuevos tests de `scene-aside.test.ts` y los tests de schema actualizados.
- Panel lateral izquierdo visible en ventana DM; no visible en ventana de jugador.
- Panel colapsable; el canvas ajusta su ancho al colapsar/expandir.
- Se puede agregar, editar y eliminar monstruos y NPCs con imagen opcional.
- Toggle de visibilidad de monstruos/NPCs en jugador funcional.
- Ventana de jugador muestra imagen de monstruos visibles y nombre+imagen de NPCs visibles.
- Se puede agregar nota raíz con editor WYSIWYG que renderiza MD visualmente.
- Se puede agregar nota hija; el breadcrumb muestra la ruta del padre.
- Slug se genera en tiempo real bajo el campo de nombre.
- Modal de vista renderiza el contenido MD como HTML.
- Eliminar nota raíz con hijos pide confirmación y borra en cascada.
- Guardar y reabrir escena restaura todo el aside completo.
- Escenas existentes sin `sceneAside` cargan sin errores con el panel vacío.
- No hay accesos directos del renderer a Node.js, Electron internals o filesystem.

### 10. Documentación afectada

- `specs/16-entities/spec.md` — actualizar estado a "En progreso" / "Implementada" al completar.
- `src/domain/sessions/scene-document.ts` — el tipo `SceneDocumentV1` documenta el nuevo campo opcional.
- No se requiere actualizar otras specs, ya que el IPC de jugador y el protocolo `map-asset:` no se modifican.

### 11. Checklist de cierre

- [x] `src/domain/sessions/scene-aside.ts` creado con todos los tipos y funciones puras.
- [x] `src/domain/sessions/scene-aside.test.ts` con cobertura de slug, unicidad, niveles, paths y filtros.
- [x] `SceneDocumentV1` extendido con `sceneAside?`.
- [x] `sceneDocumentV1Schema` extendido con `sceneAsideSchema` opcional.
- [x] `createDefaultScene()` incluye `sceneAside`.
- [x] `aside-ipc.ts` creado y registrado en `main/index.ts`.
- [x] Preload expone `openAsideImage` y `resolveAsideUrl`.
- [x] `ImagePicker.tsx` implementado y funcional.
- [x] `NoteEditor.tsx` (Tiptap con `tiptap-markdown`) implementado con lazy loading.
- [x] `MonsterModal.tsx`, `NpcModal.tsx` con campo de notas WYSIWYG.
- [x] `NoteEditModal.tsx`, `NoteViewModal.tsx` implementados.
- [x] `MonsterDetailModal.tsx` y `NpcDetailModal.tsx` implementados (modal `large`, auto-ocultar al cerrar).
- [x] `ModalBackdrop.tsx` con prop `large` (80 vw × 60 vh mínimo).
- [x] `DmAsidePanel.tsx` con tres secciones acordeón; colapso gestionado por `App.tsx` vía prop `hidden`.
- [x] `PlayerAsideOverlay.tsx` — overlay cinematográfico centrado, imágenes 440 px, zoom en clic, NPC nombre top-left.
- [x] `App.tsx` integra panel aside y publica `sceneAside` en snapshot a jugador.
- [x] `PlayerApp.tsx` muestra overlay del aside.
- [x] Keyboard handler en `App.tsx` no intercepta Backspace/Delete en áreas editables.
- [x] Grid layout de `app-workspace` corregido para 4 combinaciones de paneles visibles/ocultos.
- [x] `pnpm typecheck` ejecutado sin errores.
- [x] `pnpm build` ejecutado sin errores.
- [ ] Smoke test completo realizado en `pnpm dev`.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas (solo Tiptap, tiptap-markdown y marked, todas MIT).

## Labels de Mapa Solo DM

### 1. Resumen

- **Objetivo:** Agregar labels de texto privados del DM, editables desde el aside derecho, persistidos en escena y excluidos del render de jugador.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** persistencia de escena para formato `.ttrpgscene`, sidebar derecho para aside derecho, propiedades del objeto seleccionado para propiedades de objeto seleccionado, ventana de jugador para ventana de jugador.

### 2. Alcance

#### Incluido

- Tipo persistente `SceneLabel`.
- Estado de labels en escena.
- Creacion de labels desde UI DM.
- Render PixiJS de labels en vista DM.
- Seleccion, drag y borrado con Delete/Backspace.
- Panel de propiedades en aside derecho.
- Controles para texto, font, color, sombra y opacidad.
- Guardado/carga de labels en `.ttrpgscene`.
- Filtro para que labels no aparezcan en ventana de jugador.

#### Fuera de alcance

- Labels visibles para jugadores.
- Markdown/HTML/rich text.
- Fuentes externas.
- Rotacion.
- Edicion multilinea avanzada.
- Sincronizacion colaborativa.

### 3. Decisiones tecnicas

- **Arquitectura:** Los labels son entidad de escena y deben vivir en tipos de dominio/escena, no como estado suelto del componente visual.
- **Persistencia:** Agregar `labels?: SceneLabel[]` o `labels: SceneLabel[]` con fallback vacio al cargar escenas antiguas.
- **IPC / Electron:** Sin nuevos canales IPC. Guardado y carga reutilizan los flujos existentes de escena.
- **Render / PixiJS:** Crear o reutilizar una capa de labels DM-only. El player viewport debe ignorar esa capa.
- **Validacion:** Sanitizar como texto plano; validar opacidad y colores; restringir font a lista cerrada.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:** `SceneLabel` con `id`, `text`, `position`, `fontFamily`, `color`, `opacity` y `shadow`.
- **Reglas puras:** Normalizar labels cargados desde escena, aplicando defaults cuando falten campos.
- **Coordenadas / unidades:** Posicion en coordenadas de mundo, independiente de zoom y pantalla.
- **Errores de dominio:** Escenas con labels invalidos deben degradar a defaults seguros o excluir labels corruptos con warning recuperable si existe infraestructura para warnings.

### 5. Cambios por capa

#### `domain`

- Agregar tipo de label en el modelo de escena.
- Agregar helper de normalizacion/defaults si el formato actual ya tiene capa de migracion o parseo.

#### `application`

- Asegurar que guardado/carga preserve `labels`.
- Si existe constructor o migrador de escena, inicializar `labels` como arreglo vacio.

#### `infrastructure`

- Sin cambios esperados fuera de serializacion existente de `.ttrpgscene`.

#### `main`

- Sin cambios esperados.

#### `preload`

- Sin cambios esperados.

#### `renderer`

- Agregar accion para crear label desde UI DM, idealmente dentro de un grupo de herramientas DM o escena.
- Agregar estado y reducers/handlers para crear, actualizar, mover y borrar labels.
- Extender seleccion para aceptar labels.
- Agregar acordeon de propiedades del label en aside derecho cuando el label esta seleccionado.
- Agregar controles:
  - input de texto;
  - select de font de sistema;
  - input color de texto;
  - switch/checkbox de sombra;
  - input color de sombra;
  - slider/input de blur de sombra;
  - slider de opacidad.

#### `render`

- Renderizar labels con `Text` o `BitmapText` si el sistema actual lo recomienda para rendimiento.
- Ubicar labels en capa visible solo para DM.
- Hit testing de labels para seleccion.
- Drag de labels actualizando coordenadas de mundo.
- Limpiar objetos PixiJS al redibujar/destruir viewport.
- Asegurar que el player viewport no dibuje labels.

### 6. Plan de trabajo

1. Actualizar tipos de escena y defaults para soportar `labels`.
2. Conectar labels al estado principal de escena y persistencia existente.
3. Agregar accion UI para crear label.
4. Implementar render DM-only de labels en PixiJS.
5. Integrar hit testing, seleccion, drag y borrado.
6. Agregar propiedades del label en aside derecho.
7. Verificar que player window no renderiza labels.
8. Ejecutar typecheck, tests relevantes, lint y build.

### 7. Testing y verificacion

- **Unit tests:** normalizacion/defaults de labels si existe capa testeable de escena.
- **Integration tests:** guardado/carga preserva labels si ya hay tests de serializacion.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint` o ESLint focalizado.
- **Build:** `pnpm build`
- **Manual / smoke:** Crear label, editar propiedades, arrastrar, borrar, guardar escena, cargar escena y abrir player window confirmando que no aparece.

### 8. Riesgos y mitigaciones

- **Riesgo:** El label se renderiza accidentalmente en ventana de jugador.
  **Mitigacion:** Mantener capa DM-only o filtro explicito en player viewport y probar manualmente.
- **Riesgo:** Texto de usuario se interpreta como HTML.
  **Mitigacion:** Renderizar siempre como texto plano Pixi/React, nunca usar `dangerouslySetInnerHTML`.
- **Riesgo:** Fuentes inconsistentes entre sistemas.
  **Mitigacion:** Usar una lista corta de fonts del sistema con fallback generico.
- **Riesgo:** Labels quedan ilegibles sobre algunos mapas.
  **Mitigacion:** Permitir color, sombra y opacidad configurables.

### 9. Criterios de aceptacion

- [x] Se puede crear un label en el mapa.
- [x] El label se muestra en DM.
- [x] El label no se muestra en player window.
- [x] El label se puede seleccionar y arrastrar.
- [x] El aside derecho permite editar texto, font, color, sombra y opacidad.
- [x] Delete/Backspace borra el label seleccionado.
- [x] Guardar y cargar escena preserva labels.
- [x] Escenas antiguas sin labels cargan sin error.
- [x] Validaciones pasan.

### 10. Documentacion afectada

- `./specs/16-entities/spec.md`
- `./specs/16-entities/plan.md`
- Specs de ventana de jugador o propiedades seleccionadas solo si la implementacion cambia decisiones globales.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.

## Sistema de Templates de Monstruos

### 1. Resumen

- **Objetivo:** Agregar templates persistentes de Markdown/CSS para notas de monstruos, con administrador desde menu de aplicacion, selector en el modal de monstruo y template semilla D&D 5.5e.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** panel de entidades del DM para aside DM, menu de aplicacion para menu de aplicacion, fix de Markdown GFM para tablas, modelo actual de `SceneMonster`.

### 2. Alcance

#### Incluido

- Modelo `MonsterTemplate`.
- Store local versionado para templates.
- IPC y preload tipados para listar/guardar/eliminar templates.
- Menu de aplicacion `Administrar templates de monstruos`.
- Modal administrador con listado, edicion, preview y guardado.
- Template built-in D&D 5.5e en espanol con estilo claro blanco/gris y acentos rojos.
- Selector de template en crear/editar monstruo.
- Persistencia de `templateId` en monstruos.
- Render del detalle de monstruo con CSS scoped del template.

#### Fuera de alcance

- Marketplace o importacion remota.
- Plantillas para NPCs/notas generales.
- Editor visual por campos.
- Sanitizacion avanzada de HTML/CSS mas alla del scoping definido.
- Migracion compleja de templates existentes, porque no existen en versiones previas.

### 3. Decisiones tecnicas

- **Arquitectura:** Los templates son configuracion local de la app, no parte del dominio tactico del mapa, pero sus tipos viven en dominio/shared para compartir entre main, preload y renderer.
- **Persistencia:** Archivo JSON versionado en `app.getPath("userData")`, por ejemplo `monster-templates.json`. Los built-ins se mezclan al listar y no se duplican hasta que el usuario los edite.
- **IPC / Electron:** Nuevos canales especificos:
  - `monster-template:list`
  - `monster-template:save`
  - `monster-template:delete`
  - `monster-template:open-manager`
- **Render / PixiJS:** No aplica. El render es React/Markdown dentro de modales de aside.
- **Validacion:** Validar id, name, system, markdown y css como strings limitados. Rechazar payloads no serializables.
- **Dependencias nuevas:** Ninguna en primera implementacion. Usar textareas simples y el render Markdown existente.

### 4. Diseno de dominio

- **Entidades / tipos:** `MonsterTemplate`, `MonsterTemplateStore`, `SceneMonster.templateId`.
- **Reglas puras:**
  - normalizar templates guardados;
  - mezclar built-ins con templates del usuario;
  - generar CSS scoped por template;
  - fallback seguro si falta un template.
- **Coordenadas / unidades:** No aplica.
- **Errores de dominio:** Template invalido, template duplicado, template built-in protegido contra delete directo.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/monster-templates/monster-template.ts`.
- Definir `MonsterTemplate`, defaults y built-in D&D 5.5e.
- Agregar `templateId?: string | null` a `SceneMonster`.
- Agregar helpers para normalizar templates y generar ids si aplica.

#### `application`

- Crear interfaz `MonsterTemplateRepository`.
- Crear casos de uso:
  - listar templates;
  - guardar template;
  - eliminar template.
- Asegurar mezcla de built-ins y templates del usuario.

#### `infrastructure`

- Implementar repositorio filesystem Electron para templates.
- Leer/escribir JSON versionado en `userData`.
- Manejar archivo ausente como lista vacia.
- Proteger contra JSON corrupto con error recuperable y fallback a built-ins.

#### `main`

- Registrar IPC de templates.
- Extender menu de aplicacion con `Administrar templates de monstruos`.
- Enviar evento al renderer principal para abrir el modal manager.
- Validar payloads antes de guardar.

#### `preload`

- Exponer funciones:
  - `listMonsterTemplates()`
  - `saveMonsterTemplate(template)`
  - `deleteMonsterTemplate(id)`
  - `onOpenMonsterTemplateManager(callback)`
- No exponer canales IPC genericos.

#### `renderer`

- Agregar estado/listado de templates en `App`.
- Agregar modal `MonsterTemplateManagerModal`.
- Agregar selector de template en `MonsterModal`.
- Usar textarea Markdown plano para notas de monstruos, preservando tablas GFM y placeholders del template.
- Mantener las notas sin HTML estructural visible; el render del template envuelve el Markdown con el HTML/clases requeridas por el card.
- Si notas vacias, insertar Markdown del template.
- Si notas con contenido, pedir confirmacion antes de reemplazar.
- Guardar `templateId` junto al monstruo.
- En `MonsterDetailModal`, resolver template por id y aplicar CSS scoped al contenedor del Markdown.
- Mantener `Sin template` como opcion default.

#### `render`

- Sin cambios esperados.

### 6. Plan de trabajo

1. Crear tipos de dominio, built-in D&D 5.5e y normalizadores.
2. Extender `SceneMonster` con `templateId` compatible hacia atras.
3. Implementar repositorio filesystem y casos de uso de templates.
4. Registrar IPC y preload API de templates.
5. Agregar item de menu para abrir el manager desde la app.
6. Implementar modal administrador con lista, edicion, preview y guardar.
7. Integrar selector de template en `MonsterModal`.
8. Aplicar render Markdown + CSS scoped en `MonsterDetailModal`.
9. Verificar guardado/carga de escenas con `templateId`.
10. Ejecutar validaciones y actualizar checklist.

### 7. Testing y verificacion

- **Unit tests:** normalizacion de templates, mezcla built-in/user, CSS scoping.
- **Integration tests:** repositorio filesystem con archivo ausente, archivo valido y JSON corrupto si el proyecto tiene harness.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** abrir manager desde menu, editar template, previsualizar, guardar, crear monstruo con template, ver detalle con tabla y estilos, guardar/cargar escena y confirmar `templateId`.

### 8. Riesgos y mitigaciones

- **Riesgo:** CSS del template afecta otras partes de la app.
  **Mitigacion:** Envolver preview/detalle en contenedor con scope unico y prefijar reglas o inyectarlas dentro de un scope controlado.
- **Riesgo:** El usuario pierde notas al cambiar template.
  **Mitigacion:** Confirmacion obligatoria si las notas no estan vacias.
- **Riesgo:** Built-ins editables generan confusion entre base y copia del usuario.
  **Mitigacion:** Si se edita un built-in, guardar override local manteniendo el mismo id o crear copia claramente nombrada, segun implementacion elegida.
- **Riesgo:** Archivo de templates corrupto rompe el menu.
  **Mitigacion:** Fallback a built-ins y error serializable.
- **Riesgo:** CSS/HTML inseguro.
  **Mitigacion:** No permitir acceso a Electron/Node desde renderer, scoping de CSS y mantener el Markdown dentro del contenedor.

### 9. Criterios de aceptacion

- [x] El menu de aplicacion abre el administrador de templates.
- [x] El administrador lista el template D&D 5.5e por defecto con card claro y tabla de caracteristicas compacta.
- [x] Se puede editar Markdown y CSS de un template.
- [x] Se puede previsualizar el template.
- [x] Se puede guardar un template y verlo tras reiniciar la app.
- [x] El modal de monstruo permite elegir `Sin template` o un template.
- [x] El template rellena notas vacias sin romper tablas GFM.
- [x] Cambiar template con notas existentes pide confirmacion.
- [x] El detalle del monstruo usa Markdown GFM y CSS scoped.
- [x] `templateId` se persiste en `.ttrpgscene`.
- [x] Templates faltantes no rompen la visualizacion.
- [x] Validaciones pasan.

### 10. Documentacion afectada

- `./specs/16-entities/spec.md`
- `./specs/16-entities/plan.md`
- Si se implementa, actualizar specs relacionadas con aside DM y menu de aplicacion si cambia una decision global.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] ESLint focalizado sobre archivos modificados ejecutado. `pnpm lint` completo sigue fallando por `index.js` raiz preexistente.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
