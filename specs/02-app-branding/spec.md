# Spec - Branding de la Aplicacion

Este documento describe de forma unificada la funcionalidad de branding de la aplicacion, consolidando el alcance funcional vigente en el proyecto.

## Icono de la aplicacion

### Objetivo

Usar `assets/logo/ttrpg-effects-icon.png` como icono de la aplicacion en todas las superficies posibles: UI, ventana, dock de macOS, instalador y taskbar de Windows/Linux. Asegurar tambien que el nombre visible del proceso sea "TTRPG Effects" y no "Electron".

### Contexto

La identidad 2.0.0 conserva tres recursos: el logo con letras en `assets/logo/ttrpg-effects-wordmark.png`, el simbolo sin letras en `assets/logo/ttrpg-effects-icon.png` y su fuente editable en `assets/logo/ttrpg-effects-icon.ai`. El logo historico `ttrpg-effects-logo.png` permanece como respaldo sin referencias activas.

El proceso principal ya lo referencia como icono de `BrowserWindow` (`src/main/index.ts`, opcion `icon`), lo que cubre la barra de titulo en Windows/Linux y el icono de ventana en macOS. Sin embargo, el dock de macOS en modo desarrollo no lo toma del `BrowserWindow`; requiere una llamada explicita a `app.dock.setIcon()`.

Electron-builder usa el mismo PNG sin letras como fuente del icono nativo y lo incluye en los recursos de produccion. La UI lo importa mediante Vite, sin duplicar el asset ni cargarlo mediante protocolos destinados a imagenes de escena.

### Alcance

- Llamar a `app.setName("TTRPG Effects")` antes de `app.whenReady()` para que el dock, la barra de menu y el proceso muestren el nombre correcto en lugar de "Electron".
- Llamar a `app.dock?.setIcon(appIconPath)` dentro de `app.whenReady()` para que el dock de macOS muestre el logo.
- El asset `assets/logo/ttrpg-effects-icon.png` es la fuente de verdad activa. El wordmark y el `.ai` son recursos de diseno; el logo anterior es respaldo.
- La entrega 2.0.0 se construye solo para Apple Silicon con `./scripts/build-dmg.sh arm64` y no cambia el formato `.ttrpgscene`.

### Fuera de alcance

- Rediseno del mapa, PixiJS o las capas de render.
- Instalador Intel para la entrega 2.0.0.
- Icono de bandeja del sistema (tray icon).
- Soporte para tema claro/oscuro del icono.

### Implementacion

- En `src/main/index.ts`, dentro del callback `app.whenReady()`, mantener:

```ts
if (process.platform === "darwin") {
  app.dock.setIcon(appIconPath);
}
```

- `appIconPath` resuelve `ttrpg-effects-icon.png` desde el proyecto en desarrollo y desde Resources en produccion.
- `src/renderer/src/App.tsx` importa ese mismo PNG para la cabecera.
- `package.json` y `scripts/build-dmg.sh` toman la version 2.0.0 y arquitectura ARM64 de forma explicita.

### Criterios de aceptacion

- El dock, la barra de menu y el proceso muestran "TTRPG Effects" en lugar de "Electron".
- En macOS, el dock y el instalador muestran el simbolo sin letras.
- La cabecera de la UI muestra el simbolo sin letras junto al nombre textual de la aplicacion.
- En Windows/Linux, la barra de titulo y la taskbar muestran el logo (ya implementado via `BrowserWindow.icon`).
- El DMG generado es ARM64, version 2.0.0, e incluye el PNG canonico.
- No se rompe el build, el typecheck ni la compatibilidad de escenas.
