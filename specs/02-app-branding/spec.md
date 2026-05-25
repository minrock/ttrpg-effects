# Spec - Branding de la Aplicacion

Este documento describe de forma unificada la funcionalidad de branding de la aplicacion, consolidando el alcance funcional vigente en el proyecto.

## Icono de la aplicacion

### Objetivo

Usar `assets/logo/ttrpg-effects-logo.png` como icono de la aplicacion en todas las superficies posibles: ventana, dock de macOS y taskbar de Windows/Linux. Asegurar tambien que el nombre visible del proceso sea "TTRPG Effects" y no "Electron".

### Contexto

El asset ya existe en `assets/logo/ttrpg-effects-logo.png` (512x512 px, PNG con transparencia).

El proceso principal ya lo referencia como icono de `BrowserWindow` (`src/main/index.ts`, opcion `icon`), lo que cubre la barra de titulo en Windows/Linux y el icono de ventana en macOS. Sin embargo, el dock de macOS en modo desarrollo no lo toma del `BrowserWindow`; requiere una llamada explicita a `app.dock.setIcon()`.

No existe configuracion de empaquetado (electron-builder u otro) en el proyecto, por lo que los formatos derivados para distribucion (`.icns`, `.ico`) quedan fuera de alcance hasta que se agregue esa configuracion.

### Alcance

- Llamar a `app.setName("TTRPG Effects")` antes de `app.whenReady()` para que el dock, la barra de menu y el proceso muestren el nombre correcto en lugar de "Electron".
- Llamar a `app.dock?.setIcon(appIconPath)` dentro de `app.whenReady()` para que el dock de macOS muestre el logo.
- El asset `assets/logo/ttrpg-effects-logo.png` es la fuente de verdad; no se generan formatos adicionales en esta spec.

### Fuera de alcance

- Generacion de `.icns` o `.ico` para builds de distribucion.
- Configuracion de electron-builder o cualquier empaquetador.
- Icono de bandeja del sistema (tray icon).
- Soporte para tema claro/oscuro del icono.

### Implementacion

- En `src/main/index.ts`, dentro del callback `app.whenReady()`, agregar:

```ts
if (process.platform === "darwin") {
  app.dock.setIcon(appIconPath);
}
```

- `appIconPath` ya esta definido en el mismo archivo con resolucion correcta para dev y produccion.

### Criterios de aceptacion

- El dock, la barra de menu y el proceso muestran "TTRPG Effects" en lugar de "Electron".
- En macOS, el dock muestra el logo de la app al ejecutar `pnpm dev`.
- En Windows/Linux, la barra de titulo y la taskbar muestran el logo (ya implementado via `BrowserWindow.icon`).
- No se rompe el build ni el typecheck al agregar los cambios.
