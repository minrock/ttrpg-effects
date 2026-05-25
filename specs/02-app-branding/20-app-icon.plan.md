# Plan de implementacion tecnica - 20 Icono de la aplicacion

## Archivo a modificar

`src/main/index.ts`

## Cambios

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

## Verificacion

- `pnpm typecheck` sin errores.
- En macOS: `pnpm dev` muestra el logo en el dock.

## Checklist

- [x] `app.setName("TTRPG Effects")` agregado en `main/index.ts`.
- [x] `app.dock?.setIcon` agregado en `main/index.ts`.
- [x] `pnpm typecheck` ejecutado.
- [ ] Smoke test en macOS.
