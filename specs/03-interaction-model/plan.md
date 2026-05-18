# Plan de implementacion tecnica - 03 - Modelo de Interaccion

## 1. Resumen

- **Spec fuente:** `./specs/03-interaction-model/03-interaction-model.md`
- **Objetivo:** Implementar un modelo base de interaccion sobre el viewport: menu contextual, herramientas activas, creacion de elementos visibles, seleccion, borrado, pan, zoom bloqueable y atajos de teclado.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Spec 00, Spec 01, Spec 02, PixiJS viewport, conversion pantalla <-> mundo, estado de escena en renderer.

## 2. Alcance

### Incluido

- Click derecho sobre el canvas para abrir menu contextual en posicion de pantalla y mundo.
- Crear elementos visibles de prueba desde el menu contextual: medicion, circulo, cono, rectangulo, luz puntual, luz conica y fuego animado placeholder.
- Seleccionar elementos creados con click izquierdo.
- Mostrar seleccion visual clara en el canvas.
- Borrar elemento seleccionado con boton visible.
- Borrar elemento seleccionado con `Delete` o `Backspace`.
- Cerrar menu o cancelar herramienta con `Escape`.
- Mantener estados de herramienta activa, seleccion y menu contextual separados.
- Implementar bloqueo de zoom con indicador visible.
- Evitar que la rueda cambie zoom cuando el bloqueo esta activo.
- Permitir alternar bloqueo/desbloqueo de zoom desde el menu contextual de click derecho.
- Mantener pan disponible como navegacion basica.

### Fuera de alcance

- Geometria tactica definitiva con reglas completas.
- Mediciones exactas en pies/metros.
- Calibracion real de grilla.
- Persistencia completa de los elementos creados en `.ttrpgscene`, salvo preparar tipos compatibles.
- Luces reales, mascaras de iluminacion o fuego animado final.
- Atajos numericos avanzados.
- Menus complejos o paneles grandes de edicion.

## 3. Decisiones tecnicas

- **Arquitectura:** La maquina de interaccion vive en modulos testeables de `domain` o `application`, mientras React controla UI y PixiJS dibuja/recibe eventos mediante APIs explicitas. El renderer no debe mezclar reglas de seleccion con detalles internos de PixiJS.
- **Persistencia:** La interaccion puede mantener elementos en memoria. Se preparara el modelo para mapearlo al formato de escena, pero persistir cada elemento queda para una integracion posterior si aumenta demasiado el alcance.
- **IPC / Electron:** No se agregan canales IPC nuevos. Guardar/cargar escenas sigue usando lo implementado en Spec 02.
- **Render / PixiJS:** El viewport debe exponer callbacks/eventos de alto nivel (`contextmenu`, `select`, `createElementAt`, `deleteElement`) o metodos equivalentes. PixiJS queda encapsulado en `src/render/pixi`.
- **Validacion:** Validar que las acciones destructivas solo corran cuando exista seleccion. Validar que los elementos creados tengan ids estables y posiciones en mundo.
- **Dependencias nuevas:** Ninguna prevista. Usar React, PixiJS y utilidades propias.

## 4. Diseno de dominio

- **Entidades / tipos:** Crear tipos para `InteractionTool`, `InteractionMode`, `SelectableElement`, `ContextMenuState`, `SelectionState`, `ScaleLockState` y `TacticalElement`.
- **Reglas puras:** Seleccionar elemento por id, borrar seleccion, crear elemento por tipo en coordenada de mundo, cambiar herramienta activa, cerrar menu, aplicar bloqueo de zoom.
- **Coordenadas / unidades:** El menu contextual guarda posicion de pantalla para UI y posicion de mundo para crear elementos. Los elementos creados almacenan coordenadas de mundo.
- **Errores de dominio:** Intentar borrar sin seleccion no hace nada. Crear elemento sin posicion de mundo valida debe rechazarse. Zoom bloqueado ignora cambios de rueda sin alterar camara.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/interaction/interaction-state.ts` con tipos y reducers/funciones puras.
- Crear `src/domain/tools/tactical-elements.ts` o modulo equivalente con tipos de elementos visibles.
- Agregar tests para crear elementos, seleccionar, borrar, cancelar con Escape y bloquear zoom.

### `application`

- Crear un servicio/use-case liviano para orquestar acciones de interaccion si ayuda a separar React de reglas.
- Mantener el estado serializable para que futuras specs lo puedan persistir.

### `infrastructure`

- No agregar filesystem, DB ni repositorios.
- No tocar SQLite.

### `main`

- No modificar ventanas ni IPC.
- Mantener seguridad Electron existente.

### `preload`

- No exponer nuevas APIs.
- Mantener preload limitado a app info y escenas.

### `renderer`

- Agregar menu contextual React posicionado sobre el canvas.
- Agregar accion compacta de bloqueo/desbloqueo de zoom dentro del menu contextual.
- Agregar toolbar compacta para herramienta activa, bloqueo de zoom y borrar seleccionado.
- Escuchar `Delete`, `Backspace` y `Escape` a nivel de app con cleanup correcto.
- Mantener estado visual de seleccion, menu y lock sin acceso directo a filesystem/Electron.
- Mostrar contador o nombre del elemento seleccionado para que el usuario vea claramente que la interaccion funciona.

### `render`

- Extender `PixiViewport` para:
  - Emitir coordenada de mundo en click derecho.
  - Soportar click izquierdo para seleccion.
  - Renderizar elementos tacticos de prueba.
  - Renderizar indicador de seleccion.
  - Permitir activar/desactivar zoom por rueda.
  - Mantener pan sin confundirlo con creacion/seleccion.
- Implementar hit testing simple por bounds/radio para elementos placeholder.
- Limpiar listeners nuevos al destruir.

## 6. Plan de trabajo

1. Crear tipos y funciones puras de interaccion y elementos tacticos.
2. Agregar tests unitarios para crear, seleccionar, borrar, cancelar y bloqueo de zoom.
3. Extender `PixiViewport` con API para recibir elementos, seleccion y bloqueo de zoom.
4. Implementar render placeholder de medicion, circulo, cono, rectangulo, luz puntual, luz conica y fuego.
5. Implementar hit testing simple en coordenadas de mundo.
6. Agregar menu contextual React con acciones de creacion en posicion de mundo.
7. Agregar toggle de bloqueo/desbloqueo de zoom dentro del menu contextual.
8. Agregar toolbar compacta con herramienta activa, bloqueo de zoom y borrar seleccionado.
9. Agregar atajos `Delete`, `Backspace` y `Escape`.
10. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y smoke manual con `pnpm dev`.

## 7. Testing y verificacion

- **Unit tests:** Reducer/funciones de interaccion, creacion de elementos, seleccion, borrado, Escape, bloqueo de zoom.
- **Integration tests:** No requeridos inicialmente salvo que se cree un servicio de aplicacion.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, click derecho sobre el canvas, crear varios elementos, seleccionar uno, borrarlo con boton, crear otro, borrarlo con `Delete`, abrir menu y cerrarlo con `Escape`, activar bloqueo de zoom y confirmar que la rueda no cambia el zoom.
- **Manual / smoke contextual:** Abrir menu con click derecho, alternar bloqueo de zoom desde el menu y confirmar que el boton de toolbar refleja el mismo estado.

## 8. Riesgos y mitigaciones

- **Riesgo:** Mezclar zoom de navegacion con escala calibrada del mapa.
  **Mitigacion:** Nombrar explicitamente el estado de bloqueo y documentar que en esta spec bloquea cambios de rueda; calibracion real queda para Spec 04.
- **Riesgo:** Acoplar seleccion a objetos PixiJS concretos.
  **Mitigacion:** Usar ids estables y estado serializable; Pixi solo renderiza y reporta ids.
- **Riesgo:** Menu contextual tapa demasiado el mapa.
  **Mitigacion:** Menu compacto, cerca del cursor, con cierre por Escape/click fuera.
- **Riesgo:** Pan, click y seleccion compiten entre si.
  **Mitigacion:** Separar drag de click por umbral minimo y mantener herramienta de pan explicita o comportamiento claro.
- **Riesgo:** Crear demasiada logica final de herramientas prematuramente.
  **Mitigacion:** Usar placeholders visibles y tipos preparados, sin implementar reglas tacticas completas.

## 9. Criterios de aceptacion

- Click derecho abre un menu contextual en la posicion correcta del canvas.
- El menu contextual permite crear elementos visibles sin cargar imagen de mapa.
- El usuario puede seleccionar un elemento creado.
- El elemento seleccionado tiene indicador visual claro.
- El usuario puede borrar el elemento seleccionado con boton visible.
- El usuario puede borrar el elemento seleccionado con `Delete` o `Backspace`.
- `Escape` cierra menu contextual o cancela herramienta activa.
- El zoom no cambia cuando el bloqueo esta activo.
- El menu contextual permite bloquear/desbloquear zoom.
- Pan sigue funcionando para navegar.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- Actualizar README con instrucciones para probar interaccion sin mapa cargado.
- Actualizar este plan si se decide persistir elementos en `.ttrpgscene` dentro de esta spec.
- Registrar cualquier cambio en controles base.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tipos de interaccion y elementos tacticos creados.
- [x] Tests de interaccion agregados.
- [x] Menu contextual implementado.
- [x] Toggle de bloqueo/desbloqueo de zoom en menu contextual implementado/documentado.
- [x] Creacion de elementos visibles desde menu implementada.
- [x] Seleccion visual implementada.
- [x] Borrado con boton implementado.
- [x] Borrado con `Delete`/`Backspace` implementado.
- [x] `Escape` cierra menu/cancela herramienta.
- [x] Bloqueo de zoom implementado e indicado en UI.
- [x] Pan sigue funcionando.
- [x] Cleanup de listeners implementado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke de arranque con `pnpm dev` realizado.
- [ ] Smoke manual interactivo completo realizado.
- [x] Documentacion actualizada.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
