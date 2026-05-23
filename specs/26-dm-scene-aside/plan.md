# Plan de implementación técnica - 26 - Panel lateral izquierdo del DM: Monstruos, NPCs y Notas

## 1. Resumen

- **Spec fuente:** `./specs/26-dm-scene-aside/26-dm-scene-aside.md`
- **Objetivo:** Agregar un panel lateral izquierdo a la ventana del DM para gestionar Monstruos, NPCs y Notas de escena. El panel persiste en `.ttrpgscene`, sincroniza a la ventana de jugador el subconjunto visible (imágenes de monstruos, nombre/imagen de NPCs), y ofrece un editor WYSIWYG con renderización Markdown directa para las notas.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:**
  - Spec 25 (ventana de jugador / IPC de escena): el snapshot `PlayerWindowSnapshot` ya contiene la escena completa; el nuevo campo `sceneAside` viajará automáticamente por el mismo canal `player-window:publish-scene`.
  - Patrón IPC de imágenes: `token:open-image`, `token:resolve-url`, protocolo `map-asset:` — todo ya registrado y funcional.
  - Schema Zod de escena: `sceneDocumentV1Schema` en `scene-schema.ts` — se extiende con campo opcional.

---

## 2. Alcance

### Incluido

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

### Fuera de alcance

- Sistema de iniciativa o combate.
- Relaciones entre aside y tokens del canvas.
- Búsqueda, filtrado o reordenamiento.
- Más de dos niveles de notas.
- Portabilidad cross-máquina de imágenes.
- Tablas, imágenes inline en contenido de notas, exportación MD a archivo.

---

## 3. Decisiones técnicas

- **Arquitectura:** Se respetan las fronteras existentes: dominio sin imports de React/Electron/PixiJS; application sin UI; infrastructure solo en `main`; renderer solo consume preload API. El panel aside es un componente React del renderer, igual que el sidebar derecho (Spec 11).

- **Persistencia:** Se agrega `sceneAside` como campo opcional en el schema Zod con `.optional()` y `.default(() => createDefaultSceneAside())`. Los archivos de escena existentes sin ese campo parsean sin error. Las imágenes se guardan como `imagePath` (ruta absoluta), igual que tokens y mapas.

- **IPC / Electron:** Se añaden dos handlers nuevos (`aside:open-image`, `aside:resolve-url`) en un archivo `aside-ipc.ts` nuevo, que delegan en el `ElectronMapImageStorage` existente (ya que las extensiones de imagen soportadas y el protocolo `map-asset:` son los mismos). No se modifican los canales de jugador: `player-window:publish-scene` ya serializa la escena completa incluyendo `sceneAside`.

- **Render / PixiJS:** No se toca el motor Pixi. La vista de aside en jugador es HTML/React puro, colocada sobre el canvas con `position: absolute`, igual que otros overlays ya existentes.

- **Editor WYSIWYG:** Se usa **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-markdown`). El componente editor se importa con `React.lazy` para que ProseMirror solo se cargue al abrir `NoteEditModal` por primera vez. El contenido se almacena como string Markdown. Para la vista de solo lectura se usa `marked` (ligero, ~10 KB minificado) para convertir el string MD a HTML sanitizado renderizado en el modal de vista.

- **Validación:** Todos los campos nuevos se validan con Zod al parsear y serializar la escena. El slug se recalcula y valida en dominio antes de persistir. El contenido MD se almacena tal cual (string); no se valida su contenido semántico.

- **Dependencias nuevas:**
  - `@tiptap/react` + `@tiptap/starter-kit` + `tiptap-markdown` — editor WYSIWYG (MIT). Nota: el paquete correcto es `tiptap-markdown`, no `@tiptap/extension-markdown` (que no existe en npm).
  - `marked` — rendering MD a HTML en `NoteViewModal`, `MonsterDetailModal`, `NpcDetailModal` (MIT, ~10 KB).
  - Ninguna dependencia para la slugificación (función pura local de ~10 líneas).

---

## 4. Diseño de dominio

### Entidades / tipos

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

### Reglas puras (`scene-aside.ts`)

- `slugify(name: string): string` — minúsculas, reemplaza espacios/caracteres especiales por `-`, colapsa guiones múltiples, elimina guiones al inicio/fin.
- `ensureUniqueSlug(base: string, existing: readonly string[]): string` — agrega sufijo `-2`, `-3`, … si hay colisión.
- `createDefaultSceneAside(): SceneAside` — devuelve `{ monsters: [], npcs: [], notes: [] }`.
- `addMonster(aside, monster) / updateMonster / removeMonster` — operaciones inmutables.
- `addNpc / updateNpc / removeNpc` — ídem.
- `addNote(aside, note) / updateNote / removeNote` — valida que `parentId` exista como nota raíz si no es null; que el padre no sea él mismo; que los hijos no tengan hijos.
- `getNotePath(notes, noteId): string` — devuelve `"/"` o `"/ padre / hijo"`.
- `getPlayerVisibleMonsters(aside): readonly SceneMonster[]` — filtra `visibleToPlayer && imagePath !== null`.
- `getPlayerVisibleNpcs(aside): readonly SceneNpc[]` — filtra `visibleToPlayer`.

### Coordenadas / unidades

No aplica; el aside es metadata de escena sin coordenadas de mundo.

### Errores de dominio

- Intentar agregar nota hija a una nota que ya tiene padre → error: `"Las notas solo admiten dos niveles."`.
- Slug vacío después de slugificar → error: `"El nombre debe contener al menos un carácter válido."`.

---

## 5. Cambios por capa

### `domain`

**Archivos nuevos:**
- `src/domain/sessions/scene-aside.ts` — tipos `SceneMonster`, `SceneNpc`, `SceneNote`, `SceneAside`; funciones puras `slugify`, `ensureUniqueSlug`, `createDefaultSceneAside`, operaciones CRUD, `getNotePath`, `getPlayerVisibleMonsters`, `getPlayerVisibleNpcs`.

**Archivos modificados:**
- `src/domain/sessions/scene-document.ts` — agregar campo `readonly sceneAside?: SceneAside` a `SceneDocumentV1`.
- `src/domain/sessions/default-scene.ts` — incluir `sceneAside: createDefaultSceneAside()` en `createDefaultScene()`.

**Tests:**
- `src/domain/sessions/scene-aside.test.ts` — cubre `slugify`, `ensureUniqueSlug`, invariante de dos niveles, `getNotePath`, filtros de visibilidad.

### `application`

No se agregan casos de uso propios: las operaciones de aside se realizan directamente en el reducer/estado del renderer (igual que tokens, luces y shapes). Si en el futuro se necesita lógica transaccional, se puede extraer a un caso de uso.

### `infrastructure`

No se agrega infraestructura nueva. El aside se serializa junto con el resto de la escena en `ElectronSceneFileStorage` (ya existente). Las imágenes del aside usan `ElectronMapImageStorage` existente a través de los nuevos handlers IPC.

### `main`

**Archivos nuevos:**
- `src/main/ipc/aside-ipc.ts` — registra:
  - `ipcMain.handle("aside:open-image", async () => storage.openTokenImage())` — reutiliza el mismo diálogo y extensiones que tokens.
  - `ipcMain.handle("aside:resolve-url", async (_event, imagePath: string) => storage.resolveTokenUrl(imagePath))` — reutiliza `resolveTokenUrl`.

**Archivos modificados:**
- `src/main/index.ts` — importar y llamar `registerAsideIpc(storage)` junto a los demás `register*Ipc`.

### `preload`

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

### `renderer`

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

### `render`

No hay cambios en PixiJS. El aside es completamente HTML/React.

---

## 6. Plan de trabajo

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
   - Seguir el tema oscuro existente: mismo fondo y colores que el sidebar derecho (Spec 11).
   - Thumbnails 40×40 px con `object-fit: cover`, borde redondeado.
   - Breadcrumb de ruta en tono apagado (gris).
   - Acordeones con la misma tipografía y separadores que el sidebar derecho.

10. **Verificación final**
    - `pnpm typecheck`
    - `pnpm lint`
    - `pnpm test` (dominio)
    - Smoke en `pnpm dev`: agregar monstruo/NPC/nota, editar, eliminar, toggle jugador, guardar escena, reabrir y verificar persistencia, abrir ventana de jugador y verificar overlay.

---

## 7. Testing y verificación

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

---

## 8. Riesgos y mitigaciones

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

---

## 9. Criterios de aceptación

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

---

## 10. Documentación afectada

- `specs/26-dm-scene-aside/26-dm-scene-aside.md` — actualizar estado a "En progreso" / "Implementada" al completar.
- `src/domain/sessions/scene-document.ts` — el tipo `SceneDocumentV1` documenta el nuevo campo opcional.
- No se requiere actualizar otras specs, ya que el IPC de jugador y el protocolo `map-asset:` no se modifican.

---

## 11. Checklist de cierre

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
