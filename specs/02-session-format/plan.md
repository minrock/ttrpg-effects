# Plan de implementacion tecnica - 02 - Formato de Sesion

## 1. Resumen

- **Spec fuente:** `./specs/02-session-format/02-session-format.md`
- **Objetivo:** Definir e implementar el formato JSON versionado `.ttrpgscene`, con guardado/carga desde disco mediante IPC seguro y una UI minima para probar el flujo completo.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Spec 00 implementada, Spec 01 implementada, preload seguro, IPC Electron, dialogos nativos de archivo, validacion de esquema.

## 2. Alcance

### Incluido

- Definir el modelo versionado `SceneDocument` version `1`.
- Serializar y validar escenas `.ttrpgscene` como JSON.
- Guardar camara, mapa, grilla, oscuridad, settings, luces, efectos y formas.
- Mantener coordenadas y posiciones en espacio de mundo.
- Implementar IPC seguro para guardar y cargar escenas.
- Exponer funciones especificas en preload: `saveScene` y `loadScene`.
- Crear UI minima para probar guardar/cargar desde la app.
- Mostrar estado visible de escena cargada/guardada y errores recuperables.
- Detectar ruta local de imagen rota si existe `map.imagePath`.

### Fuera de alcance

- Copiar o empaquetar imagenes dentro del `.ttrpgscene`.
- Sincronizacion en nube.
- Campanas multiusuario.
- SQLite, biblioteca local, historial o autosaves.
- Carga real/render de imagen de mapa en PixiJS, salvo mostrar metadata o placeholder.
- Migraciones entre multiples versiones mas alla de rechazar versiones incompatibles con mensaje claro.

## 3. Decisiones tecnicas

- **Arquitectura:** El formato y validacion viven en `domain/sessions`; los casos de uso en `application/use-cases`; lectura/escritura de disco en `infrastructure/file-system`; IPC en `main/ipc`; React solo invoca preload y muestra resultado.
- **Persistencia:** Usar archivos JSON `.ttrpgscene` en disco. SQLite queda fuera. Las rutas de imagen se guardan como rutas locales sin copiar assets.
- **IPC / Electron:** Crear canales especificos `scene:save` y `scene:load` con `ipcMain.handle` + `ipcRenderer.invoke`. No exponer `ipcRenderer`, `fs`, `path` ni canales genericos.
- **Render / PixiJS:** No acoplar el formato a PixiJS. La camara del viewport debe poder convertirse desde/hacia el `SceneDocument`, pero esta spec puede guardar una escena default si todavia no existe estado editable completo.
- **Validacion:** Usar un esquema compartido para validar datos externos cargados desde disco e inputs enviados por IPC. Devolver errores serializables y amigables.
- **Dependencias nuevas:** Agregar `zod` para validacion de esquema, salvo que se prefiera una validacion manual equivalente antes de implementar.

## 4. Diseno de dominio

- **Entidades / tipos:** Crear `SceneDocumentV1`, `SceneMap`, `SceneCamera`, `SceneGrid`, `SceneDarkness`, `SceneSettings`, `SceneLight`, `SceneEffect`, `SceneShape` y `SceneValidationResult`.
- **Reglas puras:** Validar version, estructura JSON, rangos numericos, opacity `0..1`, zoom positivo, colores hex y arrays de entidades.
- **Coordenadas / unidades:** Guardar `map.position`, `camera.x`, `camera.y`, luces, efectos y formas en coordenadas de mundo. No guardar coordenadas dependientes de pantalla.
- **Errores de dominio:** Version incompatible, JSON invalido, schema invalido, ruta de imagen rota, operacion cancelada por usuario y error de filesystem.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/sessions/scene-document.ts` con tipos centrales del formato.
- Crear `src/domain/sessions/scene-schema.ts` con schema Zod o validacion equivalente.
- Crear `src/domain/sessions/default-scene.ts` para una escena inicial versionada.
- Agregar tests unitarios para escena valida, JSON invalido/schema invalido, rangos y versiones incompatibles.

### `application`

- Crear `saveSceneUseCase` que reciba una escena, valide y llame a un puerto de filesystem.
- Crear `loadSceneUseCase` que lea JSON, valide, revise rutas locales de imagen cuando aplique y devuelva resultado serializable.
- Definir puertos/interfaces para `SceneFileRepository` o `SceneFileStorage`.

### `infrastructure`

- Crear implementacion de filesystem para `.ttrpgscene` usando APIs Node solo en main/infrastructure.
- Usar dialogos nativos para elegir destino/origen.
- Leer/escribir UTF-8.
- Validar extension `.ttrpgscene` y agregarla si el usuario guarda sin extension.
- Verificar existencia de `map.imagePath` cuando no este vacio y reportar warning recuperable.

### `main`

- Crear registro de IPC para `scene:save` y `scene:load`.
- Usar `dialog.showSaveDialog` y `dialog.showOpenDialog`.
- Validar payloads entrantes antes de escribir.
- Devolver resultados serializables: `{ ok: true, scene, filePath, warnings }` o `{ ok: false, error }`.

### `preload`

- Exponer `window.ttrpg.saveScene(scene)` y `window.ttrpg.loadScene()`.
- Actualizar tipos compartidos de `TtrpgApi`.
- Mantener API pequena y por accion.

### `renderer`

- Agregar controles discretos para `Guardar escena` y `Cargar escena`.
- Mostrar nombre/ruta del archivo actual si existe.
- Mostrar estado de guardado/carga y warnings de ruta rota.
- Mantener una escena default en estado visual local hasta que specs futuras conecten mapa/grilla/luces reales.
- Evitar acceso directo a filesystem o Electron internals.

### `render`

- No modificar PixiJS salvo que haga falta exponer/leer estado de camara.
- Si se conecta camara, hacerlo mediante API del viewport y tipos de dominio, no leyendo objetos PixiJS directamente desde React.

## 6. Plan de trabajo

1. Agregar `zod` y crear tipos/schema de `SceneDocumentV1`.
2. Crear escena default y funciones puras de parseo/serializacion.
3. Agregar tests unitarios de validacion y serializacion del formato.
4. Crear puertos y casos de uso `saveScene`/`loadScene`.
5. Implementar filesystem/dialogs en main/infrastructure.
6. Registrar IPC `scene:save` y `scene:load`.
7. Actualizar preload y tipos globales `window.ttrpg`.
8. Agregar UI minima en renderer para guardar/cargar y mostrar resultado.
9. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y smoke manual con `pnpm dev`.

## 7. Testing y verificacion

- **Unit tests:** Schema de escena, default scene valida, rechazo de version incompatible, rangos invalidos, serializacion JSON.
- **Integration tests:** Casos de uso con storage fake para guardar/cargar sin tocar filesystem real.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, guardar una escena `.ttrpgscene`, cargarla de vuelta, confirmar estado visible, cancelar dialogos sin romper la app y probar una escena con `map.imagePath` roto para ver warning recuperable.

## 8. Riesgos y mitigaciones

- **Riesgo:** Guardar estado dependiente de pantalla en lugar de mundo.
  **Mitigacion:** Tipar camara/mapa con coordenadas de mundo y revisar campos del schema.
- **Riesgo:** Confiar en archivos locales y romper la app ante JSON invalido.
  **Mitigacion:** Validar todo archivo cargado con schema y devolver error recuperable.
- **Riesgo:** Exponer APIs genericas de IPC/filesystem al renderer.
  **Mitigacion:** Preload solo expone `saveScene` y `loadScene`; main controla dialogos y filesystem.
- **Riesgo:** Introducir SQLite demasiado pronto.
  **Mitigacion:** Limitar persistencia a archivos `.ttrpgscene` y puertos reemplazables.
- **Riesgo:** Rutas de imagen rotas bloquean el render.
  **Mitigacion:** Reportar warning recuperable y cargar el resto de la escena.

## 9. Criterios de aceptacion

- Se puede guardar una escena en disco con extension `.ttrpgscene`.
- Se puede cargar una escena `.ttrpgscene` desde disco.
- El archivo guardado es JSON versionado con `version: 1`.
- Una escena cargada invalida muestra un error recuperable.
- Una ruta local de imagen rota muestra warning recuperable sin bloquear la app.
- El renderer no accede directamente a Node.js, filesystem, SQLite ni Electron internals.
- Los casos de uso y validacion tienen tests.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- Actualizar README con instrucciones para probar guardar/cargar `.ttrpgscene`.
- Actualizar este plan si cambia el schema final.
- Registrar decision de usar `zod` o documentar validacion alternativa.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Schema versionado `SceneDocumentV1` creado.
- [x] Escena default versionada creada.
- [x] Tests de validacion/serializacion agregados.
- [x] Casos de uso `saveScene` y `loadScene` creados.
- [x] IPC especifico `scene:save` y `scene:load` registrado.
- [x] Preload expone solo funciones especificas de escena.
- [x] UI permite guardar y cargar una escena.
- [x] Warnings recuperables para rutas de imagen rotas.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke de arranque con `pnpm dev` realizado.
- [ ] Smoke manual completo de dialogos guardar/cargar realizado.
- [x] Documentacion actualizada.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
