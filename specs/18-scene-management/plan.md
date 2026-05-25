# Plan - Gestion de Escena

Este documento describe de forma unificada el plan tecnico para implementar y mantener gestion de escena, consolidando los pasos y criterios vigentes en el proyecto.

## Nueva Escena y Reinicio de Estado

### 1. Resumen

- **Objetivo:** Agregar una accion `Nueva escena` que aparezca solo cuando haya contenido o cambios, pregunte si se desea guardar antes de descartar y luego reinicie la app al estado inicial sin cerrar Electron.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** persistencia de escena (`.ttrpgscene`, `saveScene`, `loadScene`), estado inicial `createDefaultScene`, flujo actual de acciones de escena en `App.tsx`.

### 2. Alcance

#### Incluido

- Mostrar `Nueva escena` junto a las acciones principales solo cuando la escena no este vacia o tenga cambios.
- Detectar contenido descartable desde el estado actual de escena e interaccion.
- Modal de confirmacion con:
  - `Guardar y crear nueva`,
  - `Descartar cambios`,
  - `Cancelar`.
- Reutilizar el flujo existente de `Guardar escena`.
- Reiniciar escena, mapa, fog, luces, efectos, formas, seleccion y modos temporales.
- Mantener la escena intacta si el usuario cancela el modal o cancela/falla el guardado.
- Estilos del modal consistentes con la UI actual.

#### Fuera de alcance

- Autosave.
- Historial de escenas recientes.
- Cambios en el schema `.ttrpgscene`.
- Persistencia SQLite.
- Confirmacion al cerrar ventana.
- Nuevo canal IPC para crear escena.

### 3. Decisiones tecnicas

- **Arquitectura:** El reset de escena se orquesta desde `renderer` porque es una accion de UI sobre estado ya cargado. La creacion del documento inicial reutiliza `domain/sessions/default-scene.ts`.
- **Persistencia:** No hay cambios de formato. `Guardar y crear nueva` llama la API existente `window.ttrpg.saveScene(scene, options?)` antes de resetear y reusa `currentFilePath` como sugerencia del dialogo si la escena ya tenia archivo cargado/guardado.
- **IPC / Electron:** No se agregan canales nuevos. Se reutiliza `scene:save` via preload. El renderer no accede a filesystem ni Electron internals.
- **Render / PixiJS:** Al cambiar `scene` a `createDefaultScene()` y limpiar estados derivados, `MapViewport`/`PixiViewport` recibe arrays vacios y mapa nulo, por lo que debe limpiar capas existentes.
- **Validacion:** El guardado mantiene la validacion existente de `parseSceneDocument`/`serializeSceneDocument`.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:** No se agregan tipos persistentes.
- **Reglas puras:** Agregar una funcion testeable para determinar si la escena tiene contenido descartable, por ejemplo `hasSceneContent(scene, interactionElements?)`.
- **Coordenadas / unidades:** Sin cambios.
- **Errores de dominio:** Sin errores nuevos. Errores de guardado siguen viniendo del flujo existente.

### 5. Cambios por capa

#### `domain`

- Crear o extender modulo de sesiones con helper puro:
  - `hasSceneContent(scene: SceneDocument, tacticalElementsCount?: number): boolean`.
- Cubrir con tests:
  - default scene vacia devuelve `false`;
  - mapa cargado devuelve `true`;
  - luces/efectos/formas/fog revelado/devices de oscuridad o grilla modificada devuelven `true`.

#### `application`

- Sin cambios esperados.

#### `infrastructure`

- Sin cambios esperados.

#### `main`

- Sin cambios esperados.

#### `preload`

- Sin cambios esperados.

#### `renderer`

- En `App.tsx`:
  - derivar `canCreateNewScene` usando helper de dominio y elementos tacticos en `interaction`.
  - renderizar boton `Nueva escena` solo si `canCreateNewScene` es `true`.
  - agregar estado local para modal de confirmacion.
  - reutilizar `handleSaveScene` para `Guardar y crear nueva`.
  - agregar helper local `resetToNewScene()` para limpiar:
    - `scene`,
    - `mapImageUrl`,
    - seleccion,
    - herramienta activa,
    - modos temporales de mapa/grilla/niebla/drag,
    - errores o warnings transitorios relacionados con la escena si existen.
  - cerrar panel contextual de propiedades al resetear.
  - cancelar sin modificar estado cuando el usuario cierra el modal.
- En `styles.css`:
  - estilos de backdrop/modal, botones primario/secundario/destructivo y layout accesible.

#### `render`

- No se esperan cambios directos. Verificar que el reset por props limpia capas visuales.

### 6. Plan de trabajo

1. Revisar estado inicial y defaults actuales (`createDefaultScene`, estados locales de `App.tsx`).
2. Implementar helper puro `hasSceneContent`.
3. Agregar tests unitarios del helper.
4. Extraer o ajustar `resetToNewScene` en `App.tsx`.
5. Renderizar `Nueva escena` solo cuando `hasSceneContent` lo indique.
6. Implementar modal de confirmacion y cierre por cancelar.
7. Conectar `Guardar y crear nueva` al flujo existente de guardado.
8. Conectar `Descartar cambios` al reset inmediato.
9. Estilizar modal y botones.
10. Verificar que el canvas queda limpio y sin seleccion despues del reset.
11. Ejecutar validaciones automaticas.
12. Realizar smoke manual en Electron.

### 7. Testing y verificacion

- **Unit tests:** Helper `hasSceneContent` con default, mapa, luces, efectos, formas, fog, oscuridad/darkvision y grilla modificada.
- **Integration tests:** No se esperan nuevos; el guardado existente ya esta cubierto por casos de uso.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, verificar:
  - con escena vacia no aparece `Nueva escena`;
  - cargar mapa y confirmar que aparece;
  - cancelar modal conserva todo;
  - descartar limpia mapa/elementos/seleccion;
  - guardar y crear nueva abre dialogo `.ttrpgscene`;
  - cancelar dialogo de guardado conserva todo;
  - guardar exitoso limpia la escena.

### 8. Riesgos y mitigaciones

- **Riesgo:** Reset parcial que deja seleccion, modos o capas visuales antiguas.
  **Mitigacion:** Centralizar `resetToNewScene` y verificar manualmente canvas, status y sidebar.
- **Riesgo:** El boton no aparece para una escena con contenido no contemplado.
  **Mitigacion:** Helper puro con tests para cada tipo de contenido persistible actual.
- **Riesgo:** El flujo `Guardar y crear nueva` borra la escena aunque el usuario cancele el dialogo.
  **Mitigacion:** Resetear solo si `saveScene` devuelve `ok: true`.
- **Riesgo:** Modal destructivo demasiado facil de confirmar accidentalmente.
  **Mitigacion:** Separar visualmente `Cancelar`, `Guardar y crear nueva` y `Descartar cambios`.

### 9. Criterios de aceptacion

- `Nueva escena` no aparece cuando la escena esta vacia.
- `Nueva escena` aparece cuando hay mapa, luces, efectos, formas, mediciones, fog o configuracion relevante.
- Click en `Nueva escena` con contenido abre modal.
- `Cancelar` no cambia la escena.
- `Descartar cambios` reinicia la escena sin guardar.
- `Guardar y crear nueva` abre el dialogo de guardado `.ttrpgscene`.
- Si existe archivo actual, `Guardar y crear nueva` sugiere esa misma ruta/nombre en el dialogo.
- Si se cancela el dialogo de guardado, la escena queda intacta.
- Si el guardado termina correctamente, la escena queda limpia.
- No quedan mapa, luces, efectos, formas, fog, seleccion ni panel contextual despues del reset.
- No cambia el schema `.ttrpgscene`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/18-scene-management/spec.md`
- `specs/18-scene-management/plan.md`

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
