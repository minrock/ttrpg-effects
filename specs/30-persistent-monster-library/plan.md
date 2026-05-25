# Plan de implementacion tecnica - 30 - Biblioteca Persistente de Monstruos

## 1. Resumen

- **Spec fuente:** `./specs/30-persistent-monster-library/30-persistent-monster-library.md`
- **Objetivo:** Agregar una biblioteca local persistente de monstruos en SQLite para buscar, reutilizar y crear monstruos desde el flujo `+ Agregar monstruo`, manteniendo las escenas `.ttrpgscene` portables.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Spec 26 para aside DM, Spec 29 para templates Markdown/CSS de monstruos, decisiones de seguridad Electron del proyecto, SQLite local sin servicios externos.

## 2. Alcance

### Incluido

- Modelo de dominio `MonsterLibraryEntry`.
- Conversion pura de entrada de biblioteca a instancia `SceneMonster`.
- Repositorio SQLite local con migracion inicial versionada.
- Casos de uso para buscar, obtener y guardar monstruos.
- IPC/preload tipados para la biblioteca.
- Modal de biblioteca tipo grilla/listado con buscador.
- Flujo para agregar un monstruo existente a la escena.
- Flujo para crear un monstruo nuevo, guardarlo en DB y agregarlo inmediatamente a la escena.
- Persistencia portable de la instancia dentro de `.ttrpgscene`.

### Fuera de alcance

- Edicion global de biblioteca desde una pantalla dedicada.
- Actualizar entradas de biblioteca desde instancias ya agregadas a escena.
- Sincronizacion cloud, multiusuario o servicios externos.
- Importacion/exportacion masiva.
- Busqueda full-text avanzada.
- Versionado de monstruos o tracking de cambios entre DB y escenas.
- Dependencia obligatoria de imagen.

## 3. Decisiones tecnicas

- **Arquitectura:** La biblioteca queda modelada por dominio + casos de uso + repositorio. El renderer solo consume acciones tipadas via preload; no toca SQLite ni filesystem.
- **Persistencia:** Usar SQLite local en `app.getPath("userData")/ttrpg-effects.sqlite`. Mantener `.ttrpgscene` como snapshot portable de la escena.
- **IPC / Electron:** Crear canales especificos `monster-library:search`, `monster-library:get` y `monster-library:save`. Validar payloads en `main` antes de invocar casos de uso.
- **Render / PixiJS:** Sin cambios. La biblioteca alimenta el aside DM; los monstruos no son entidades PixiJS.
- **Validacion:** Validar nombre, sistema, template, Markdown, imagen opcional, fechas e ids en dominio/main. Usar queries parametrizadas.
- **Dependencias nuevas:** Se usa `node:sqlite` (built-in de Node.js 22+) en lugar de `better-sqlite3`. Elimina dependencias nativas y el problema de ABI mismatch entre el Node.js del sistema y el bundleado por Electron. En desarrollo y build se agrega `NODE_OPTIONS=--experimental-sqlite` porque Electron 39 bundlea Node.js 22 donde el modulo es experimental; en la app empaquetada macOS se inyecta via `LSEnvironment` en el `Info.plist` (configurado en `electron-builder`).

## 4. Diseno de dominio

- **Entidades / tipos:** `MonsterLibraryEntry`, `MonsterLibrarySearchQuery`, `MonsterLibrarySaveInput`.
- **Reglas puras:**
  - normalizar entradas desde payloads externos;
  - generar ids estables para biblioteca;
  - convertir una entrada de biblioteca a `SceneMonster` con id unico en escena;
  - extraer preview breve del Markdown para el listado.
- **Coordenadas / unidades:** No aplica.
- **Errores de dominio:** Nombre vacio, sistema vacio, contenido invalido si se decide requerir contenido, id invalido, templateId vacio.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/monster-library/monster-library.ts`.
- Definir tipos de entrada persistente y payloads.
- Agregar helper `createSceneMonsterFromLibraryEntry(entry, existingIds)`.
- Agregar helper de preview Markdown.
- Tests unitarios para validacion y conversion a `SceneMonster`.

### `application`

- Crear `src/application/services/monster-library-repository.ts`.
- Crear casos de uso en `src/application/use-cases/monster-library.ts`:
  - `searchMonsterLibraryUseCase`;
  - `getMonsterLibraryEntryUseCase`;
  - `saveMonsterLibraryEntryUseCase`.
- Mantener las interfaces sin dependencia de SQLite.

### `infrastructure`

- Agregar repositorio SQLite en `src/infrastructure/database` o `src/infrastructure/repositories`.
- Crear inicializacion de DB y migracion inicial.
- Usar `PRAGMA user_version` o tabla `schema_migrations`.
- Crear tabla `monster_library_entries`.
- Implementar queries parametrizadas para search/get/save.
- Asegurar creacion del directorio `userData` si hace falta.

### `main`

- Inicializar DB al arrancar la app.
- Registrar IPC `monster-library:*`.
- Validar payloads recibidos antes de tocar la DB.
- Devolver errores serializables y amigables.

### `preload`

- Exponer funciones especificas:
  - `searchMonsterLibrary(query)`;
  - `getMonsterLibraryEntry(id)`;
  - `saveMonsterLibraryEntry(input)`.
- Actualizar `src/preload/ttrpg-api.d.ts`.
- No exponer canales genericos ni objetos Electron.

### `renderer`

- Modificar `MonsterSection` para que `+ Agregar monstruo` abra el modal de biblioteca.
- Crear `MonsterLibraryModal`.
- Reutilizar o adaptar `MonsterModal` para crear una entrada nueva desde el flujo de biblioteca.
- Cargar templates existentes del spec 29 para el formulario nuevo.
- Al seleccionar entrada existente, convertirla a `SceneMonster` y llamar `onAdd`.
- Al guardar entrada nueva, invocar preload para persistirla y luego agregarla a escena.
- Mostrar estado de carga, errores y lista vacia.
- Las cards de la grilla muestran la imagen del monstruo (100% del ancho de la card, aspect-ratio 16:9, `object-fit: cover`) con un placeholder cuando no hay imagen. Debajo: nombre, sistema y boton `Agregar a escena`. Las URLs de imagen se resuelven en paralelo via `resolveAsideUrl` al cargar las entries.
- Los onChange del formulario de nuevo monstruo leen `event.currentTarget.value` fuera del updater funcional para evitar el error de `currentTarget null` en React 18 StrictMode.

### `render`

- Sin cambios esperados.

## 6. Plan de trabajo

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

## 7. Testing y verificacion

- **Unit tests:** validacion de `MonsterLibraryEntry`, preview Markdown, conversion a `SceneMonster` con id unico.
- **Integration tests:** repositorio SQLite con DB temporal, migracion inicial, save/get/search.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint` o ESLint focalizado si el lint completo sigue fallando por archivos preexistentes.
- **Build:** `pnpm build`
- **Manual / smoke:** En `pnpm dev`, crear monstruo nuevo desde biblioteca, confirmar que aparece en DB/listado, agregar existente a escena, guardar/cargar escena y confirmar que el monstruo queda portable.

## 8. Riesgos y mitigaciones

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

## 9. Criterios de aceptacion

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

## 10. Documentacion afectada

- `./specs/30-persistent-monster-library/30-persistent-monster-library.md`
- `./specs/30-persistent-monster-library/plan.md`
- Specs relacionados con aside DM y templates de monstruos si la implementacion cambia flujos existentes.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] ESLint focalizado ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] `node:sqlite` (built-in) usado como alternativa sin dependencias nativas a `better-sqlite3`.
