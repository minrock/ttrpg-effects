# Plan de implementacion tecnica - 24 Apuntador arcano

## 1. Resumen

- **Spec fuente:** `./specs/17-arcane-pointer/spec.md`
- **Objetivo:** Implementar un modo temporal de apuntador que renderiza un circulo arcano pixel-art con fade in/out sobre una celda, configurable por tamano de criatura desde el aside derecho.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Spec 01 para capas Pixi, spec 03 para modelo de interaccion, spec 11 para sidebar derecho, spec 22 para categorias de tamano de criaturas y asset interno `src/renderer/public/effects/arcane-pointer.gif`.

## 2. Alcance

### Incluido

- Agregar modo `Apuntador` como toggle visible en la barra superior.
- Mostrar configuracion del apuntador en el aside derecho cuando el modo este activo.
- Permitir elegir tamano de criatura:
  - `tiny`, `small`, `medium`: 1 x 1 cuadricula.
  - `large`: 2 x 2 cuadriculas.
  - `huge`: 3 x 3 cuadriculas.
  - `gargantuan`: 4 x 4 cuadriculas.
- Disparar una animacion temporal al hacer click en el canvas con el modo activo.
- Ajustar el punto del click al centro de celda cuando hay grilla.
- Renderizar el GIF `arcane-pointer.gif` con fade in/out de aproximadamente 4 segundos.
- Permitir multiples apuntadores temporales simultaneos.
- Cancelar/desactivar el modo con `Escape`.
- Limpiar sprites/animaciones al terminar o destruir el viewport.

### Fuera de alcance

- Persistir apuntadores en `.ttrpgscene`.
- Guardar historial de apuntadores.
- Configurar color, duracion o estilo visual desde UI.
- Sincronizacion remota o multiplayer.
- Audio, texto, particulas extra o reglas de medicion.

## 3. Decisiones tecnicas

- **Arquitectura:** El modo vive en estado de interaccion/renderer. La configuracion visual del modo vive en React y se pasa al adapter Pixi mediante props/callbacks especificos.
- **Persistencia:** No se modifica el schema `.ttrpgscene`; los apuntadores activos y su configuracion no se guardan.
- **IPC / Electron:** No se requieren canales nuevos. El asset se sirve desde rutas internas del renderer.
- **Render / PixiJS:** Crear una capa o usar la capa superior existente de seleccion/UI Pixi para sprites temporales. Cargar `arcane-pointer.gif` con `Assets.load` desde `/effects/arcane-pointer.gif`. Usar ticker o elapsed time para calcular alpha y destruir sprites al finalizar.
- **Validacion:** Validar que el tamano elegido pertenezca al set permitido. Si no hay grilla, usar un tamano default seguro.
- **Dependencias nuevas:** Ninguna prevista.

## 4. Diseno de dominio

- **Entidades / tipos:**
  - `ArcanePointerCreatureSize = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan"`.
  - `ArcanePointerSizeConfig` o helper equivalente con `footprintCells`.
  - `ActiveArcanePointer` temporal en renderer: `id`, `position`, `startedAt`, `durationMs`, `diameterWorld`.
- **Reglas puras:**
  - Mapear categoria de criatura a footprint en cuadriculas.
  - Calcular diametro visual: footprint en mundo multiplicado por un factor mayor a 1.
  - Calcular curva de opacidad por progreso 0..1.
- **Coordenadas / unidades:** El click se convierte de pantalla a mundo. Con grilla se hace snap al centro de celda. El diametro se calcula desde `grid.cellSizeWorld`.
- **Errores de dominio:** Tamano desconocido cae a `medium` o se rechaza en helper controlado.

## 5. Cambios por capa

### `domain`

- Crear helper testeable para tamanos del apuntador, por ejemplo `src/domain/pointer/arcane-pointer.ts`.
- Agregar tests unitarios para:
  - mapeo de categoria a footprint;
  - diametro visual por grilla;
  - curva de alpha/fade.

### `application`

- No se requieren casos de uso persistentes.
- El flujo queda como estado visual local y callbacks de renderer.

### `infrastructure`

- Registrar el asset generado en `src/renderer/public/effects/arcane-pointer.gif`.
- No se requieren repositorios, SQLite ni filesystem.

### `main`

- Sin cambios esperados.
- Mantener CSP compatible con assets internos desde `'self'`.

### `preload`

- Sin API nueva.

### `renderer`

- Agregar estado de modo `Apuntador` en `App`.
- Agregar estado de configuracion `pointerCreatureSize`, default `medium`.
- Agregar boton toggle `Apuntador` en la barra superior, con estado visual activo/inactivo.
- Mostrar seccion de apuntador en el aside derecho cuando el modo esta activo.
- Al activar `Apuntador`, desactivar otros modos exclusivos si aplica.
- Al activar otros modos exclusivos, desactivar `Apuntador`.
- Manejar `Escape` para desactivar `Apuntador`.
- Pasar al `MapViewport`:
  - si el modo apuntador esta activo;
  - tamano seleccionado;
  - llave de limpieza para nueva escena, carga de escena o cambio de mapa.

### `render`

- Cargar el GIF `arcane-pointer.gif` en `PixiViewport`.
- Agregar `setArcanePointerMode`.
- Agregar click handling para disparar apuntador sin seleccionar/mover elementos.
- Crear sprites temporales centrados en mundo, escalados segun `diameterWorld`.
- Actualizar alpha por frame usando una curva 0 -> 1 -> 0.
- Remover y destruir sprites al terminar.
- Limpiar apuntadores activos al destruir viewport, al cargar nueva escena o cuando se indique desde React.

## 6. Plan de trabajo

1. Crear helper de dominio para tamanos de apuntador y curva de alpha.
2. Agregar tests unitarios del helper.
3. Extender `App` con modo `Apuntador`, selector de tamano y boton toggle superior.
4. Extender aside derecho para mostrar configuracion del apuntador cuando el modo este activo.
5. Extender `MapViewport` para pasar modo/configuracion/callbacks a Pixi.
6. Extender `PixiViewport` con carga del asset, modo apuntador, click handling y sprites temporales.
7. Asegurar que `Escape`, cambio de modos y nueva/carga de escena cancelen el modo o limpien apuntadores activos segun corresponda.
8. Ejecutar verificacion automatica y smoke manual.

## 7. Testing y verificacion

- **Unit tests:** Mapeo de tamano a footprint, diametro por grilla y curva de alpha.
- **Integration tests:** No previstos para IPC/persistencia porque no hay cambios de escena.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, activar `Apuntador`, cambiar tamano en aside, clickear varias celdas, confirmar fade in/out, confirmar que no selecciona elementos, probar `Escape`, probar pan con barra espaciadora.

## 8. Riesgos y mitigaciones

- **Riesgo:** Acumular sprites temporales si se disparan muchos apuntadores.
  **Mitigacion:** Destruir cada sprite al terminar y limpiar todos al destruir/cambiar escena.
- **Riesgo:** El apuntador tapa demasiado mapa en tamanos 3x3 o 4x4.
  **Mitigacion:** Usar alpha animado y factor de escala moderado sobre el footprint.
- **Riesgo:** Conflicto con seleccion, drag o modos de dibujo.
  **Mitigacion:** Hacer que el modo apuntador capture click normal antes del hit testing de elementos y se desactive al entrar a modos exclusivos.
- **Riesgo:** El GIF no carga.
  **Mitigacion:** Fallback vectorial simple de circulo arcano o anillo visible.

## 9. Criterios de aceptacion

- El boton `Apuntador` aparece en la barra superior y alterna el modo.
- El aside derecho muestra selector de tamano de criatura cuando el modo esta activo.
- El click en canvas con modo activo dispara el circulo arcano centrado en celda.
- El tamano respeta 1x1, 2x2, 3x3 y 4x4 segun categoria.
- La animacion dura aproximadamente 4 segundos y hace fade in/out.
- Se pueden ver varias animaciones temporales al mismo tiempo.
- El apuntador no selecciona, mueve ni modifica elementos.
- `Escape` desactiva el modo.
- No se guarda ningun apuntador en `.ttrpgscene`.
- `pnpm typecheck`, `pnpm test` y `pnpm lint` pasan.

## 10. Documentacion afectada

- `./specs/17-arcane-pointer/spec.md`
- Este plan.
- Si durante implementacion cambia la ubicacion del asset o el comportamiento del modo, actualizar ambos.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
