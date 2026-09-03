# Plan - Branding de la Aplicacion

Este documento describe de forma unificada el plan tecnico para implementar y mantener branding de la aplicacion, consolidando los pasos y criterios vigentes en el proyecto.

## Icono de la aplicacion

### Archivo a modificar

`src/main/index.ts`

### Cambios

**1. Nombre del proceso** — antes de `app.whenReady()`:

```ts
app.setName("TTRPG Effects");
```

Hace que el dock, la barra de menu de macOS y el administrador de tareas muestren "TTRPG Effects" en lugar de "Electron".

**2. Icono del dock** — dentro de `app.whenReady()`, antes de `createMainWindow()`:

```ts
app.dock?.setIcon(appIconPath);
```

`app.dock` es `undefined` en Windows/Linux; el optional chaining evita el guard de plataforma.

`appIconPath` ya esta definido en el mismo archivo.

### Verificacion

- `pnpm typecheck` sin errores.
- En macOS: `pnpm dev` muestra el logo en el dock.

### Checklist

- [x] `app.setName("TTRPG Effects")` agregado en `main/index.ts`.
- [x] `app.dock?.setIcon` agregado en `main/index.ts`.
- [x] `pnpm typecheck` ejecutado.
- [ ] Smoke test en macOS.

## Actualizacion 2.0.0

### Archivos y referencias

- Conservar `ttrpg-effects-wordmark.png`, `ttrpg-effects-icon.ai` y el logo historico como fuentes de diseno y respaldo.
- Usar exclusivamente `assets/logo/ttrpg-effects-icon.png` en `App.tsx`, `BrowserWindow`, Dock, `extraResources` y `build.mac.icon`.
- Mantener el tamano estable de 40x40 en la cabecera; la imagen no participa del ticker ni de los redraws de PixiJS.

### Empaquetado

- Actualizar `package.json` a 2.0.0 sin migrar el esquema de escena.
- Aceptar `arm64` o `x64` como argumento validado de `scripts/build-dmg.sh`, usando la arquitectura local por defecto.
- Para esta entrega ejecutar solo `./scripts/build-dmg.sh arm64`.

### Verificacion 2.0.0

- [x] Logo sin letras integrado en UI y superficies nativas.
- [x] Wordmark, fuente editable y logo anterior conservados.
- [x] 350 tests, lint, typecheck y build correctos.
- [x] DMG 2.0.0 generado y ejecutable verificado como Mach-O ARM64.
- [x] PNG canonico incluido en Resources.
- [ ] Smoke manual del Dock tras instalar.
