# AGENT.md - Practicas del Proyecto

Este archivo define convenciones de arquitectura, desarrollo y seguridad para TTRPG Effects. Debe leerse antes de implementar nuevas specs o modificar estructura del proyecto.

## Stack base

- Gestor de paquetes: `pnpm`.
- Aplicacion desktop: Electron.
- Frontend: React + TypeScript, salvo decision explicita distinta.
- Bundler/dev server: Vite.
- Motor visual recomendado: PixiJS para mapa, capas, luces, sprites y efectos.
- Base de datos local: SQLite.
- Formato de escena portable dentro de la app: JSON versionado con extension `.ttrpgscene`.

## Comandos esperados

Usar `pnpm` para todas las operaciones de Node:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

No introducir `npm`, `yarn` o lockfiles alternativos sin una decision explicita.

## Way of Working
- Siempre que vayas a comenzar con un spec/feature nueva inicia creando una rama feature/.*
- Siempre que vayas a comenzar a trabajar con un bug inicia creando una rama fix/.*
- Siempre espera a la orden de mergear para llevar los cambios a main.
- **Nunca ejecutes `git add`, `git commit`, `git push` ni ninguna operacion de escritura en el repositorio sin permiso explicito del usuario en esa sesion. Espera siempre la orden antes de escribir en el historial de git.**
- Cada vez que se mergee un nuevo spec a main, ejecutar `./scripts/build-dmg.sh` para generar un nuevo DMG instalable. El DMG queda en `dist/`.

## Versionado y changelog

La version de la aplicacion vive en `package.json` y debe ser la unica fuente de verdad para builds, empaquetado y nombre/version del DMG.

Usar versionado semantico:

- **Patch (`x.y.z+1`)**: cada bugfix o correccion que no agregue funcionalidad nueva ni rompa compatibilidad.
- **Minor (`x.y+1.0`)**: cada feature/spec completada o cambio funcional compatible hacia atras.
- **Major (`x+1.0.0`)**: solo cuando se rompa compatibilidad con archivos `.ttrpgscene` existentes o se requiera migracion incompatible del formato de escena.

Reglas operativas:

- Al finalizar una feature/spec, actualizar `package.json` con bump minor y registrar la entrada en `CHANGELOG.md`.
- Al finalizar un bugfix, actualizar `package.json` con bump patch y registrar la entrada en `CHANGELOG.md`.
- Al introducir un cambio incompatible del formato `.ttrpgscene`, actualizar `package.json` con bump major, documentar la incompatibilidad/migracion en `CHANGELOG.md` y actualizar los specs/planes afectados.
- Cada entrada de `CHANGELOG.md` debe indicar fecha, tipo de cambio y resumen de cambios principales.
- El script `./scripts/build-dmg.sh` debe leer la version desde `package.json`; no hardcodear versiones en scripts de build.

## Principios de arquitectura

- Separar logica de dominio, persistencia, infraestructura y vista.
- El renderer no debe contener reglas de negocio complejas.
- La vista debe invocar casos de uso o servicios, no manipular directamente almacenamiento, sistema de archivos o APIs privilegiadas.
- La logica de mapa, grilla, mediciones, luces y sesiones debe vivir en modulos testeables sin depender de React.
- PixiJS debe quedar encapsulado detras de componentes/adapters de render, no mezclado con reglas de dominio.
- Las coordenadas de mundo, pantalla, mapa y grilla deben modelarse explicitamente.
- Evitar singletons globales mutables salvo para infraestructura controlada y documentada.

## Estructura sugerida

La estructura puede evolucionar, pero debe preservar estas fronteras:

```text
src/
  main/
    app/
    ipc/
    windows/
  preload/
    index.ts
  renderer/
    app/
    components/
    hooks/
    styles/
  domain/
    grid/
    lighting/
    map/
    measurement/
    sessions/
    shared/
  application/
    use-cases/
    services/
  infrastructure/
    database/
    file-system/
    repositories/
    assets/
  render/
    pixi/
    layers/
    tools/
```

### `main`

Responsable de:

- Crear ventanas.
- Registrar IPC.
- Acceder a APIs nativas.
- Dialogos de abrir/guardar archivos.
- Crear y configurar servicios de infraestructura.

No debe contener logica visual ni reglas de medicion.

### `preload`

Responsable de:

- Exponer una API pequena y tipada al renderer.
- Usar `contextBridge`.
- Envolver `ipcRenderer.invoke` o `ipcRenderer.send` en funciones especificas.

No debe exponer `ipcRenderer`, `fs`, `path`, objetos Electron completos ni APIs genericas al renderer.

### `renderer`

Responsable de:

- UI React.
- Estado visual local.
- Controles, menus, paneles y formularios.
- Integracion con el render canvas mediante APIs bien definidas.

No debe acceder directamente a Node.js, SQLite, filesystem o Electron internals.

### `domain`

Responsable de:

- Reglas puras de mapa, grilla, medicion, luces, formas y sesiones.
- Tipos centrales.
- Calculos de coordenadas.
- Validaciones puras.

Debe ser testeable sin Electron, DOM ni PixiJS.

### `application`

Responsable de:

- Casos de uso.
- Orquestacion entre dominio e infraestructura.
- Operaciones como guardar escena, cargar escena, importar mapa, crear luz o cambiar unidad.

### `infrastructure`

Responsable de:

- SQLite.
- Repositorios.
- File system.
- Adaptadores a Electron.
- Carga/decodificacion de assets.

## Seguridad Electron

Electron combina navegador, Node.js y APIs nativas. Tratar el renderer como superficie no confiable.

Configuracion recomendada para ventanas:

```ts
webPreferences: {
  preload: preloadPath,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

Reglas:

- Mantener `contextIsolation: true`.
- Mantener `nodeIntegration: false`.
- Preferir `sandbox: true` si no bloquea una necesidad concreta.
- Usar `preload` + `contextBridge` para exponer APIs.
- Exponer una funcion por accion, no un canal IPC generico.
- Validar todos los inputs recibidos por IPC.
- Validar el `sender` de mensajes IPC cuando aplique.
- No cargar contenido remoto en la app salvo decision explicita y controles de seguridad.
- Definir una Content Security Policy para el renderer.
- No usar `eval`, `new Function` ni contenido HTML no sanitizado.
- No abrir URLs externas sin pasar por `shell.openExternal` desde main y con allowlist si aplica.
- No guardar secretos en el renderer.

Ejemplo de API preload aceptable:

```ts
contextBridge.exposeInMainWorld("ttrpg", {
  openMapImage: () => ipcRenderer.invoke("map:open-image"),
  saveScene: (scene) => ipcRenderer.invoke("scene:save", scene),
  loadScene: () => ipcRenderer.invoke("scene:load")
});
```

Ejemplo no aceptable:

```ts
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer,
  fs,
  send: (channel, payload) => ipcRenderer.send(channel, payload)
});
```

## IPC

- Nombrar canales por dominio y accion: `scene:save`, `scene:load`, `map:open-image`.
- Preferir `ipcMain.handle` + `ipcRenderer.invoke` para operaciones request/response.
- Usar `webContents.send` solo para eventos push desde main al renderer.
- No usar IPC sincrono.
- Validar payloads con esquemas compartidos.
- Devolver errores serializables y amigables.
- No enviar objetos grandes por IPC si puede enviarse una ruta, id o referencia.
- No pasar objetos DOM, `File`, `ImageBitmap` u objetos no serializables hacia main.

## SQLite y persistencia

SQLite sera la DB local inicial, pero debe quedar detras de puertos/interfaces para permitir otros motores en el futuro.

Reglas:

- El dominio no conoce SQLite.
- El renderer no conoce SQLite.
- Los casos de uso hablan con interfaces de repositorio.
- La implementacion SQLite vive en `infrastructure/database` o `infrastructure/repositories`.
- Las migraciones deben ser versionadas.
- Las queries deben ser parametrizadas.
- No construir SQL con concatenacion de strings de usuario.
- Manejar transacciones para cambios multi-tabla.
- Separar conexion, migraciones y repositorios.

Interfaces sugeridas:

```ts
export interface DatabaseConnection {
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

export interface SceneRepository {
  save(scene: Scene): Promise<void>;
  findById(id: SceneId): Promise<Scene | null>;
  list(): Promise<SceneSummary[]>;
  delete(id: SceneId): Promise<void>;
}
```

Implementaciones futuras posibles:

- `SqliteSceneRepository`.
- `PostgresSceneRepository`.
- `IndexedDbSceneRepository`.
- `FileSceneRepository`.

El archivo `.ttrpgscene` sigue siendo JSON de intercambio/guardado de escena. SQLite puede usarse para biblioteca local, historial, caches, autosaves o metadata.

## Estado y modelo de datos

- Las escenas deben tener version de formato.
- Guardar coordenadas en espacio de mundo, no en pantalla.
- Separar camara de mapa.
- Separar escala calibrada de zoom de navegacion si la implementacion lo permite.
- Guardar rutas locales de imagen en el MVP, no copiar imagenes dentro del archivo de escena.
- Manejar rutas rotas con errores recuperables.
- Usar ids estables para formas, luces, efectos y futuros tokens.

## Render y PixiJS

- Mantener PixiJS fuera del dominio.
- Crear adapters para convertir entidades de dominio a objetos renderizables.
- Centralizar conversion pantalla <-> mundo.
- Orden de capas recomendado:
  1. Fondo.
  2. Mapa.
  3. Grilla.
  4. Oscuridad.
  5. Luces.
  6. Efectos animados.
  7. Formas y mediciones.
  8. Seleccion.
  9. UI React.
- Evitar que cada herramienta cree su propio sistema de coordenadas.
- Limpiar texturas, sprites y listeners al destruir escenas.
- Medir rendimiento con mapas grandes antes de agregar efectos costosos.

## UI y UX

- La app es una herramienta de mesa fisica, no una landing page.
- Priorizar controles discretos y legibles en proyeccion.
- Click derecho abre menu contextual.
- `Delete`/`Backspace` borra el elemento seleccionado.
- `Escape` cancela herramienta activa o cierra menus.
- El bloqueo de escala debe ser visible y dificil de romper accidentalmente.
- El usuario debe poder seguir navegando y usando herramientas con la escala bloqueada.
- Preferir iconos y tooltips para controles frecuentes.
- Evitar paneles grandes que cubran el mapa durante una sesion.

## TypeScript

- Usar `strict: true`.
- Evitar `any`; si es inevitable, encapsularlo y justificarlo.
- Modelar unidades con tipos explicitos cuando sea util.
- Preferir tipos de dominio sobre objetos sueltos.
- Compartir tipos seguros entre main, preload y renderer mediante modulos comunes, no mediante imports circulares.

## Validacion

- Validar datos externos: archivos de escena, payloads IPC, inputs de usuario, rutas y configuraciones.
- Usar esquemas versionados para `.ttrpgscene`.
- Rechazar o migrar versiones incompatibles con mensajes claros.
- No confiar en datos guardados aunque sean locales.

## Testing

Prioridad de tests:

- Calculos de grilla y coordenadas.
- Mediciones en pies/metros.
- Diagonales configurables.
- Serializacion y migracion de escenas.
- Repositorios SQLite.
- Casos de uso de guardar/cargar.

Tipos de test:

- Unit tests para dominio.
- Integration tests para repositorios y casos de uso.
- Tests visuales/manuales para render y Electron.
- Smoke test para `pnpm dev` cuando sea viable.

## Assets

- Guardar assets bajo una carpeta clara, por ejemplo `assets/`.
- Preferir assets CC0 o generados para el proyecto.
- Si se usa un asset con atribucion, guardar licencia y fuente junto al asset.
- No incorporar assets con licencia dudosa.
- Optimizar sprites y texturas para no penalizar la proyeccion.

## Formato y calidad

- Usar formatter y linter desde el inicio.
- No mezclar refactors grandes con implementaciones de specs.
- Mantener PRs/cambios pequeños por spec.
- Cada spec implementada debe actualizar documentacion si cambia una decision.
- No introducir dependencias pesadas sin justificar su rol.
- Revisar warnings de Electron en consola durante desarrollo.

## Empaquetado macOS

El proyecto incluye un pipeline de empaquetado para macOS con `electron-builder`.

Para generar un DMG instalable:

```bash
./scripts/build-dmg.sh
```

El DMG resultante queda en `dist/`. No incluye firma de codigo (uso personal/interno). Si macOS bloquea la app al abrirla, hacer clic derecho → Abrir la primera vez.

Pendiente si se decide distribuir ampliamente:
- Code signing con certificado Developer ID Application.
- Notarizacion en macOS.
- Builds para otras plataformas (Windows, Linux).

## Referencias

- Electron Security: https://www.electronjs.org/docs/tutorial/security/
- Electron Process Model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Electron Context Isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron contextBridge: https://www.electronjs.org/docs/latest/api/context-bridge
- Electron IPC: https://www.electronjs.org/docs/latest/tutorial/ipc
- Electron ipcMain: https://www.electronjs.org/docs/latest/api/ipc-main
- Electron ipcRenderer: https://www.electronjs.org/docs/latest/api/ipc-renderer
- Electron Code Signing: https://www.electronjs.org/docs/latest/tutorial/code-signing
