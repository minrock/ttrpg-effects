# Plan de implementacion tecnica - 27 - Menu de Escenas Recientes

## 1. Resumen

- **Spec fuente:** `./specs/19-recent-scenes-menu/spec.md`
- **Objetivo:** Agregar un submenu nativo `File > Abrir recientes` con las ultimas 5 escenas `.ttrpgscene`, persistido entre ejecuciones y conectado al renderer por IPC seguro.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Spec 02 para formato `.ttrpgscene`, flujo actual `scene:load`, preload tipado.

## 2. Alcance

### Incluido

- Servicio en main para persistir recientes en `userData`.
- Menu nativo Electron con `File > Abrir recientes`.
- IPC/evento push seguro desde main hacia renderer cuando se elige un reciente.
- Registro automatico de recientes tras carga o guardado exitoso de escena.
- Eliminacion de entradas rotas cuando no se pueden resolver.
- Renderer reutiliza el mismo flujo de aplicacion de resultado que `Cargar escena`.
- Tests unitarios para la logica de lista de recientes.

### Fuera de alcance

- Recientes de mapas.
- UI React adicional.
- Miniaturas.
- Sincronizacion remota.

## 3. Decisiones tecnicas

- **Arquitectura:** La lista de recientes es infraestructura de app desktop y vive en `main`. El renderer solo escucha eventos `SceneOperationResult` y actualiza su estado visual.
- **Persistencia:** Archivo JSON en `app.getPath("userData")`, por ejemplo `recent-scenes.json`, con lista de rutas absolutas.
- **IPC / Electron:** Agregar un listener preload `onRecentSceneOpen`. Main emite `scene:recent-opened` solo a ventanas DM. No exponer canales genericos.
- **Render / PixiJS:** Sin cambios directos.
- **Validacion:** Main valida acceso a archivo y usa `loadSceneUseCase` para parsear/validar.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno

### Dominio/infra liviana

- Crear un helper puro para recientes:
  - `addRecentPath(paths, path, max = 5)`;
  - `removeRecentPath(paths, path)`;
  - deduplicacion estable.

### Main

- Crear `src/main/recent-scenes.ts`:
  - lee/escribe JSON;
  - valida forma del archivo;
  - agrega/elimina recientes;
  - abre una escena reciente usando `loadSceneUseCase`.
- Crear `src/main/app-menu.ts`:
  - construye menu nativo;
  - incluye `File > Abrir recientes`;
  - reconstruye el menu cuando cambia la lista;
  - cada item llama al servicio de recientes y emite al renderer.
- Extender `ElectronSceneFileStorage` para:
  - registrar recientes al guardar/cargar;
  - cargar una escena por ruta explicita.

### Preload

- Agregar `onRecentSceneOpen(handler)` a `window.ttrpg`.
- Mantener tipos en `ttrpg-api.d.ts`.

### Renderer

- Reutilizar `runSceneOperation("cargada", ...)`.
- Suscribirse a `onRecentSceneOpen` y aplicar el resultado como carga de escena.

## 5. Plan de trabajo

1. Crear/corregir spec 27.
2. Crear/corregir este plan.
3. Agregar helper/test de lista de recientes.
4. Implementar persistencia de recientes en main.
5. Implementar menu nativo con submenu `Abrir recientes`.
6. Registrar escenas recientes desde guardar/cargar.
7. Emitir evento seguro al renderer al abrir reciente.
8. Agregar API preload tipada.
9. Reutilizar flujo de carga de escena en `App.tsx`.
10. Ejecutar typecheck, tests, lint y build.

## 6. Testing y verificacion

- **Unit tests:** deduplicacion, limite de 5, reordenamiento, eliminacion.
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test`
- **Lint:** `pnpm lint` o ESLint focalizado.
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, cargar/guardar escena, verificar menu `File > Abrir recientes`, abrir reciente, probar ruta rota si es viable.

## 7. Riesgos y mitigaciones

- **Riesgo:** Main intenta mutar escena visual.
  **Mitigacion:** Main solo emite `SceneOperationResult`; renderer decide como aplicarlo.
- **Riesgo:** Menu queda desactualizado.
  **Mitigacion:** Reconstruir menu despues de cada cambio de recientes.
- **Riesgo:** Ruta rota en recientes.
  **Mitigacion:** Validar con `loadSceneUseCase`, retirar entrada y notificar error.
- **Riesgo:** Exponer IPC generico.
  **Mitigacion:** Agregar solo funciones/eventos especificos.

## 8. Criterios de aceptacion

- [x] `File > Abrir recientes` existe.
- [x] Lista ultimas 5 escenas.
- [x] No hay duplicados.
- [x] Abrir reciente carga escena.
- [x] Rutas rotas se eliminan y reportan error.
- [x] Recientes persisten entre ejecuciones.
- [x] Preload sigue exponiendo API especifica.
- [x] Validaciones pasan.
