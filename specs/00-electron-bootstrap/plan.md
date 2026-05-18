# Plan de implementacion tecnica - 00 - Electron Bootstrap

## 1. Resumen

- **Spec fuente:** `./specs/00-electron-bootstrap/00-electron-bootstrap.md`
- **Objetivo:** Crear el bootstrap minimo de una app Electron + Vite + React + TypeScript que abra una ventana inicial, cargue un logo PNG y deje lista la base tecnica para las siguientes specs.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** `pnpm`, Electron, Vite, React, TypeScript, asset inicial de logo.

## 2. Alcance

### Incluido

- Inicializacion del proyecto Node con `pnpm`.
- Configuracion base de Electron con proceso `main`, `preload` seguro y renderer React.
- Ventana principal en macOS con compatibilidad estructural para Windows y Linux, abierta al 100% del area usable de la pantalla.
- Pantalla tecnica inicial con logo, nombre `TTRPG Effects`, estado `Bootstrap listo` y version inicial.
- Scripts basicos: `pnpm dev`, `pnpm build`, `pnpm lint` y `pnpm typecheck` si el scaffolding lo permite en esta fase.
- Documentacion minima para ejecutar la app localmente.

### Fuera de alcance

- Carga de mapas.
- Canvas principal, PixiJS o motor visual.
- Persistencia de sesiones, SQLite o archivos `.ttrpgscene`.
- Herramientas tacticas, medicion, iluminacion, niebla de guerra o tokens.
- Empaquetado final, code signing, notarizacion o auto-update.

## 3. Decisiones tecnicas

- **Arquitectura:** Crear la separacion inicial entre `src/main`, `src/preload` y `src/renderer`, dejando reservadas las fronteras futuras para `domain`, `application`, `infrastructure` y `render`.
- **Persistencia:** No se implementa persistencia en este spec. No se agrega SQLite ni repositorios.
- **IPC / Electron:** Usar `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true` si el preload funciona correctamente con esa configuracion. No exponer `ipcRenderer`, `fs`, `path` ni APIs genericas al renderer.
- **Ventana inicial:** Crear la `BrowserWindow` con el tamano de `screen.getPrimaryDisplay().workAreaSize` para ocupar el 100% del area disponible sin forzar modo fullscreen.
- **Render / PixiJS:** No incorporar PixiJS todavia. La pantalla inicial sera React/CSS y solo validara carga de assets.
- **Validacion:** No hay datos externos ni payloads IPC de producto. Se validara que la ventana cargue sin errores visibles y que el renderer no dependa de Node.js.
- **Dependencias nuevas:** Electron, Vite, React, React DOM, TypeScript y tooling minimo de lint/typecheck. No introducir librerias visuales pesadas.
- **Comandos:** Aunque el spec fuente menciona `npm`, este proyecto estandariza `pnpm`; todos los scripts y documentacion usaran `pnpm`.

## 4. Diseno de dominio

- **Entidades / tipos:** No se crean entidades de dominio en esta spec.
- **Reglas puras:** No hay reglas de mapa, grilla, medicion, luces ni sesiones.
- **Coordenadas / unidades:** No aplica en el bootstrap.
- **Errores de dominio:** No aplica. Los errores relevantes seran de arranque, carga de assets o configuracion Electron/Vite.

## 5. Cambios por capa

### `domain`

- No se crean modulos de dominio.
- Mantener la carpeta ausente o vacia hasta que una spec funcional la necesite.

### `application`

- No se crean casos de uso.
- Evitar introducir servicios prematuros para la pantalla tecnica inicial.

### `infrastructure`

- No se implementan repositorios, DB ni filesystem.
- Crear estructura de assets estatica para el logo, por ejemplo `assets/logo/logo.png` o el equivalente compatible con Vite/Electron.

### `main`

- Crear el entrypoint del proceso main de Electron.
- Crear una `BrowserWindow` principal con preload configurado.
- Abrir la ventana principal al 100% del area usable de la pantalla primaria.
- Cargar el dev server de Vite durante desarrollo y los archivos construidos en produccion.
- Manejar ciclo de vida basico de Electron: `ready`, cierre de ventanas y reactivacion en macOS.
- Aplicar configuracion segura de `webPreferences`.

### `preload`

- Crear un preload minimo con `contextBridge`.
- Exponer una API pequena solo si hace falta para mostrar version o metadata tecnica.
- No exponer canales IPC genericos ni objetos Electron completos.

### `renderer`

- Crear app React minima.
- Mostrar logo, nombre `TTRPG Effects`, estado `Bootstrap listo` y version inicial `0.0.0`.
- Mantener UI sobria y tecnica; no construir una landing page.
- Agregar estilos base legibles para una ventana inicial.

### `render`

- No se crea capa PixiJS ni canvas.
- Dejar el proyecto preparado para agregar `src/render/pixi` en la Spec 01 sin reestructurar el bootstrap.

## 6. Plan de trabajo

1. Inicializar `package.json`, `pnpm-lock.yaml`, configuracion TypeScript, Vite y Electron.
2. Crear estructura base `src/main`, `src/preload`, `src/renderer` y assets iniciales.
3. Implementar la ventana principal con configuracion segura de Electron.
4. Implementar renderer React con pantalla tecnica inicial y carga del logo PNG.
5. Agregar scripts `pnpm dev`, `pnpm build`, `pnpm lint` y `pnpm typecheck` segun el tooling instalado.
6. Documentar en README o doc equivalente como instalar dependencias y ejecutar la app.
7. Ejecutar verificacion de typecheck/build y smoke manual de `pnpm dev` cuando sea viable.

## 7. Testing y verificacion

- **Unit tests:** No requeridos para esta spec porque no hay logica de dominio.
- **Integration tests:** No requeridos inicialmente. Considerar smoke test futuro para arranque Electron si el tooling queda disponible.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, confirmar que Electron abre una ventana al 100% del area usable de la pantalla, muestra el logo, `TTRPG Effects`, `Bootstrap listo` y `0.0.0`, y cierra normalmente.

## 8. Riesgos y mitigaciones

- **Riesgo:** Elegir un scaffolding que mezcle main, preload y renderer demasiado pronto.
  **Mitigacion:** Crear entradas separadas y mantener el renderer sin acceso directo a Node/Electron.
- **Riesgo:** Configurar mal preload o seguridad Electron y necesitar refactor al implementar carga de archivos.
  **Mitigacion:** Usar desde el inicio `contextIsolation`, `nodeIntegration: false`, preload dedicado y APIs especificas.
- **Riesgo:** Introducir dependencias visuales o de producto antes de necesitarlas.
  **Mitigacion:** Limitar el bootstrap a React/CSS y asset PNG.
- **Riesgo:** Comandos inconsistentes entre spec y convenciones del repo.
  **Mitigacion:** Documentar y usar solo `pnpm`.

## 9. Criterios de aceptacion

- `pnpm dev` abre una ventana Electron.
- La ventana abre al 100% del area usable de la pantalla.
- La ventana carga sin errores visibles.
- El logo inicial PNG se ve correctamente.
- La pantalla muestra `TTRPG Effects`, `Bootstrap listo` y version inicial.
- La app puede cerrarse normalmente.
- El repo contiene instrucciones basicas para instalar dependencias y ejecutar el proyecto con `pnpm`.
- El renderer no accede directamente a Node.js, filesystem, SQLite ni Electron internals.
- La estructura queda lista para incorporar PixiJS y las capas de render en la Spec 01.

## 10. Documentacion afectada

- README o documentacion de ejecucion local.
- El propio plan puede actualizarse si el scaffolding elegido cambia nombres de archivos sin romper las fronteras de arquitectura.
- Registrar cualquier desviacion relevante frente al spec fuente, especialmente el uso de `pnpm` en lugar de `npm`.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Logo PNG inicial agregado y visible.
- [x] Scripts `pnpm` definidos.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test con `pnpm dev` realizado.
- [x] Ventana inicial configurada para abrir al 100% del area usable de pantalla.
- [x] Documentacion de ejecucion local actualizada.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias visuales pesadas introducidas antes de la Spec 01.
