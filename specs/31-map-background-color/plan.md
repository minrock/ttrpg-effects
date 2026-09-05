# Plan de implementacion tecnica - 31 - Color de fondo infinito por mapa

## 1. Resumen

- **Spec fuente:** `./specs/31-map-background-color/spec.md`
- **Objetivo:** agregar color configurable por mapa para el fondo infinito renderizado detras del mapa, persistido en `.ttrpgscene` y sincronizado con Player View.
- **Estado:** Implementado.
- **Prioridad:** Baja/Media.
- **Dependencias:** Spec 29 de escenas multi-mapa, render Pixi de `PixiViewport`, schema actual de escenas v2.

## 2. Alcance

### Incluido

- Campo persistente de color de fondo por `SceneMapDocument`.
- Default retrocompatible `#15181a`.
- Control de color en el panel izquierdo, zona/tab de mapa.
- Render inmediato del color en DM y Player View.
- Tests de dominio/schema para default, persistencia y mapas independientes.

### Fuera de alcance

- Gradientes, patrones, texturas o fondos por imagen.
- Control del color desde Player View.
- Cambios en colores de otras capas.
- Bump/changelog/DMG hasta que se apruebe e implemente la feature.

## 3. Decisiones tecnicas

- **Arquitectura:** el color pertenece al dominio de mapa y viaja dentro del documento de escena. Renderer solo muestra el control y actualiza el estado mediante helper puro.
- **Persistencia:** agregar `backgroundColor: string` o nombre equivalente al mapa persistido, validado como `#RRGGBB`.
- **IPC / Electron:** no se requieren canales nuevos; Player View recibe el valor por el snapshot existente de escena.
- **Render / PixiJS:** `PixiViewport` recibira el color desde `MapViewport` y redibujara la capa `background`.
- **Validacion:** Zod aplicara default para campos faltantes y validara hex para campos presentes.
- **Dependencias nuevas:** ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:**
  - Crear `MapBackgroundColor` como alias/documentacion de string hex o reutilizar string validado por schema.
  - Constante `DEFAULT_MAP_BACKGROUND_COLOR = "#15181a"`.
  - Helper `setActiveMapBackgroundColor(scene, color)`.
- **Reglas puras:**
  - Solo se aceptan colores hex `#RRGGBB`.
  - El cambio aplica al mapa activo.
  - Mapas inactivos conservan su color.
  - Escenas sin mapa activo no cambian.
- **Coordenadas / unidades:** no aplica.
- **Errores de dominio:** color invalido se rechaza en helper o queda validado por schema antes de guardar/cargar.

## 5. Cambios por capa

### `domain`

- Modificar `src/domain/sessions/scene-document.ts` para agregar el campo por mapa.
- Modificar `src/domain/sessions/scene-maps.ts` para defaults, migracion legacy y helper de actualizacion.
- Modificar `src/domain/sessions/scene-schema.ts` para validar/default del campo.
- Agregar o ampliar tests en `scene-maps.test.ts` y `scene-schema.test.ts`.

### `application`

- Sin casos de uso nuevos.
- Reutilizar guardado/carga de escena vigente.

### `infrastructure`

- Sin cambios esperados.

### `main`

- Sin cambios esperados.

### `preload`

- Sin cambios esperados.

### `renderer`

- Pasar el color de fondo del mapa activo desde `App.tsx` a `MapViewport`.
- Agregar control de color en `DmAsidePanel` o el componente correspondiente del panel izquierdo en la zona/tab de mapa.
- Conectar el control al helper de dominio para actualizar el mapa activo.
- Mantener el control deshabilitado/oculto cuando no hay mapa activo.
- Player View no tendra control nuevo, solo recibira/renderizara el color.

### `render`

- Agregar `backgroundColor` a `PixiViewport`.
- Redibujar `drawBackgroundLayer()` al cambiar el color.
- Convertir hex `#RRGGBB` a numero Pixi de forma controlada.
- Mantener la marca/borde visual existente si sigue aportando orientacion espacial.

## 6. Plan de trabajo

1. Agregar constante/default y campo de color por mapa en dominio.
2. Extender defaults y migracion de mapas legacy.
3. Extender schema Zod con default retrocompatible y validacion hex.
4. Agregar helper para cambiar color del mapa activo.
5. Agregar tests de defaults, persistencia y mapas independientes.
6. Pasar `backgroundColor` a `MapViewport` y `PixiViewport`.
7. Redibujar capa `background` con el color configurado.
8. Agregar el control de color en el panel izquierdo/zona mapa.
9. Validar con `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
10. Smoke manual: cambiar color, guardar/recargar, cambiar entre mapas y abrir Player View.

## 7. Testing y verificacion

- **Unit tests:** defaults en mapa nuevo, migracion legacy, helper de actualizacion por mapa activo.
- **Schema tests:** carga de escenas sin color, serializacion con color, rechazo de hex invalido.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  - Cambiar color desde panel izquierdo.
  - Confirmar DM renderiza el fondo inmediatamente.
  - Confirmar Player View recibe el color.
  - Confirmar colores distintos por mapa.
  - Guardar y recargar escena.

## 8. Riesgos y mitigaciones

- **Riesgo:** el control puede quedar en el panel equivocado respecto a la nueva estructura de tabs.
  **Mitigacion:** ubicarlo en la zona/tab de mapa y ajustar si la revision funcional pide otro punto exacto.
- **Riesgo:** colores invalidos en escenas editadas manualmente.
  **Mitigacion:** validar con schema y cubrir con test.
- **Riesgo:** el fondo Pixi actual puede estar dibujado como capa estatica y no redibujarse al cambiar el color.
  **Mitigacion:** agregar setter dedicado que limpie/redibuje `background`.

## 9. Criterios de aceptacion

- Control de color visible en la zona de mapa del panel izquierdo cuando hay mapa activo.
- El fondo infinito cambia inmediatamente en DM.
- Player View usa el mismo color del mapa activo.
- El color se persiste por mapa y se restaura al recargar.
- Escenas antiguas cargan con `#15181a`.
- Tests relevantes, typecheck, lint y build pasan.

## 10. Documentacion afectada

- `specs/31-map-background-color/spec.md`
- `specs/31-map-background-color/plan.md`
- Al cerrar: `CHANGELOG.md` y `package.json` para `2.2.1`.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado en DM y Player View.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
