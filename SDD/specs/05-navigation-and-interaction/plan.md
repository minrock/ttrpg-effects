# Plan - Navegacion e Interaccion

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- [x] Pasar GridGeometry completo en creacion y arrastres, no solo cellSizeWorld.
- [x] Ajustar preview hexagonal en PixiViewport y confirmacion en App con helpers puros compartidos.
- [x] Probar idempotencia de vertices, coordenadas negativas, movimiento de formas/path y tokens.


Este documento describe de forma unificada el plan tecnico para implementar y mantener navegacion e interaccion, consolidando los pasos y criterios vigentes en el proyecto.

## Modelo de Interaccion

### 1. Resumen

- **Objetivo:** Implementar un modelo base de interaccion sobre el viewport: menu contextual, herramientas activas, creacion de elementos visibles, seleccion, borrado, pan, zoom bloqueable y atajos de teclado.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** bootstrap de la app, motor visual, persistencia de escena, PixiJS viewport, conversion pantalla <-> mundo, estado de escena en renderer.

### 2. Alcance

#### Incluido

- Click derecho sobre el canvas para abrir menu contextual en posicion de pantalla y mundo.
- Crear elementos visibles de prueba desde el menu contextual: medicion, circulo, cono, rectangulo, luz puntual, luz conica y fuego animado placeholder.
- Seleccionar elementos creados con click izquierdo.
- Mostrar seleccion visual clara en el canvas.
- Borrar elemento seleccionado con `Delete` o `Backspace`.
- Cerrar menu o cancelar herramienta con `Escape`.
- Mantener estados de herramienta activa, seleccion y menu contextual separados.
- Implementar bloqueo de zoom con indicador visible.
- Evitar que la rueda cambie zoom cuando el bloqueo esta activo.
- Permitir alternar bloqueo/desbloqueo de zoom desde el menu contextual de click derecho.
- Mantener pan disponible como navegacion basica.

#### Fuera de alcance

- Geometria tactica definitiva con reglas completas.
- Mediciones exactas en pies/metros.
- Calibracion real de grilla.
- Persistencia completa de los elementos creados en `.ttrpgscene`, salvo preparar tipos compatibles.
- Luces reales, mascaras de iluminacion o fuego animado final.
- Atajos numericos avanzados.
- Menus complejos o paneles grandes de edicion.

### 3. Decisiones tecnicas

- **Arquitectura:** La maquina de interaccion vive en modulos testeables de `domain` o `application`, mientras React controla UI y PixiJS dibuja/recibe eventos mediante APIs explicitas. El renderer no debe mezclar reglas de seleccion con detalles internos de PixiJS.
- **Persistencia:** La interaccion puede mantener elementos en memoria. Se preparara el modelo para mapearlo al formato de escena, pero persistir cada elemento queda para una integracion posterior si aumenta demasiado el alcance.
- **IPC / Electron:** No se agregan canales IPC nuevos. Guardar/cargar escenas sigue usando lo implementado en persistencia de escena.
- **Render / PixiJS:** El viewport debe exponer callbacks/eventos de alto nivel (`contextmenu`, `select`, `createElementAt`, `deleteElement`) o metodos equivalentes. PixiJS queda encapsulado en `src/render/pixi`.
- **Validacion:** Validar que las acciones destructivas solo corran cuando exista seleccion. Validar que los elementos creados tengan ids estables y posiciones en mundo.
- **Dependencias nuevas:** Ninguna prevista. Usar React, PixiJS y utilidades propias.

### 4. Diseno de dominio

- **Entidades / tipos:** Crear tipos para `InteractionTool`, `InteractionMode`, `SelectableElement`, `ContextMenuState`, `SelectionState`, `ScaleLockState` y `TacticalElement`.
- **Reglas puras:** Seleccionar elemento por id, borrar seleccion, crear elemento por tipo en coordenada de mundo, cambiar herramienta activa, cerrar menu, aplicar bloqueo de zoom.
- **Coordenadas / unidades:** El menu contextual guarda posicion de pantalla para UI y posicion de mundo para crear elementos. Los elementos creados almacenan coordenadas de mundo.
- **Errores de dominio:** Intentar borrar sin seleccion no hace nada. Crear elemento sin posicion de mundo valida debe rechazarse. Zoom bloqueado ignora cambios de rueda sin alterar camara.

### 5. Cambios por capa

#### `domain`

- Crear `src/domain/interaction/interaction-state.ts` con tipos y reducers/funciones puras.
- Crear `src/domain/tools/tactical-elements.ts` o modulo equivalente con tipos de elementos visibles.
- Agregar tests para crear elementos, seleccionar, borrar, cancelar con Escape y bloquear zoom.

#### `application`

- Crear un servicio/use-case liviano para orquestar acciones de interaccion si ayuda a separar React de reglas.
- Mantener el estado serializable para que futuras specs lo puedan persistir.

#### `infrastructure`

- No agregar filesystem, DB ni repositorios.
- No tocar SQLite.

#### `main`

- No modificar ventanas ni IPC.
- Mantener seguridad Electron existente.

#### `preload`

- No exponer nuevas APIs.
- Mantener preload limitado a app info y escenas.

#### `renderer`

- Agregar menu contextual React posicionado sobre el canvas.
- Medir el menu contextual al montarlo y resolver su direccion vertical y horizontal contra el espacio real disponible del viewport.
- Mantener el menu dentro del viewport usable y orientar los submenus hacia el lado disponible sin recortarlos desde el contenedor raiz.
- Agregar accion compacta de bloqueo/desbloqueo de zoom dentro del menu contextual.
- Agregar toolbar compacta para herramienta activa y bloqueo de zoom.
- Escuchar `Delete`, `Backspace` y `Escape` a nivel de app con cleanup correcto.
- Mantener estado visual de seleccion, menu y lock sin acceso directo a filesystem/Electron.
- Mostrar contador o nombre del elemento seleccionado para que el usuario vea claramente que la interaccion funciona.

#### `render`

- Extender `PixiViewport` para:
  - Emitir coordenada de mundo en click derecho.
  - Soportar click izquierdo para seleccion.
  - Renderizar elementos tacticos de prueba.
  - Renderizar indicador de seleccion.
  - Permitir activar/desactivar zoom por rueda.
  - Mantener pan sin confundirlo con creacion/seleccion.
- Implementar hit testing simple por bounds/radio para elementos placeholder.
- Limpiar listeners nuevos al destruir.

### 6. Plan de trabajo

1. Crear tipos y funciones puras de interaccion y elementos tacticos.
2. Agregar tests unitarios para crear, seleccionar, borrar, cancelar y bloqueo de zoom.
3. Extender `PixiViewport` con API para recibir elementos, seleccion y bloqueo de zoom.
4. Implementar render placeholder de medicion, circulo, cono, rectangulo, luz puntual, luz conica y fuego.
5. Implementar hit testing simple en coordenadas de mundo.
6. Agregar menu contextual React con acciones de creacion en posicion de mundo.
7. Agregar toggle de bloqueo/desbloqueo de zoom dentro del menu contextual.
8. Agregar toolbar compacta con herramienta activa y bloqueo de zoom.
9. Agregar atajos `Delete`, `Backspace` y `Escape`.
10. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y smoke manual con `pnpm dev`.

### 7. Testing y verificacion

- **Unit tests:** Reducer/funciones de interaccion, creacion de elementos, seleccion, borrado, Escape, bloqueo de zoom.
- **Integration tests:** No requeridos inicialmente salvo que se cree un servicio de aplicacion.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, click derecho sobre el canvas, crear varios elementos, seleccionar uno, borrarlo con `Delete`, crear otro, borrarlo con `Backspace`, abrir menu y cerrarlo con `Escape`, activar bloqueo de zoom y confirmar que la rueda no cambia el zoom.
- **Manual / smoke contextual:** Abrir menu con click derecho, alternar bloqueo de zoom desde el menu y confirmar que el boton de toolbar refleja el mismo estado.

### 8. Riesgos y mitigaciones

- **Riesgo:** Mezclar zoom de navegacion con escala calibrada del mapa.
  **Mitigacion:** Nombrar explicitamente el estado de bloqueo y documentar que en esta spec bloquea cambios de rueda; calibracion real queda para mapa y grilla.
- **Riesgo:** Acoplar seleccion a objetos PixiJS concretos.
  **Mitigacion:** Usar ids estables y estado serializable; Pixi solo renderiza y reporta ids.
- **Riesgo:** Menu contextual tapa demasiado el mapa.
  **Mitigacion:** Menu compacto, cerca del cursor, con cierre por Escape/click fuera.
- **Riesgo:** Pan, click y seleccion compiten entre si.
  **Mitigacion:** Separar drag de click por umbral minimo y mantener herramienta de pan explicita o comportamiento claro.
- **Riesgo:** Crear demasiada logica final de herramientas prematuramente.
  **Mitigacion:** Usar placeholders visibles y tipos preparados, sin implementar reglas tacticas completas.

### 9. Criterios de aceptacion

- Click derecho abre un menu contextual en la posicion correcta del canvas.
- El menu contextual permite crear elementos visibles sin cargar imagen de mapa.
- El usuario puede seleccionar un elemento creado.
- El elemento seleccionado tiene indicador visual claro.
- El usuario puede borrar el elemento seleccionado con `Delete` o `Backspace`.
- `Escape` cierra menu contextual o cancela herramienta activa.
- El zoom no cambia cuando el bloqueo esta activo.
- El menu contextual permite bloquear/desbloquear zoom.
- Pan sigue funcionando para navegar.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- Actualizar README con instrucciones para probar interaccion sin mapa cargado.
- Actualizar este plan si se decide persistir elementos en `.ttrpgscene` dentro de esta spec.
- Registrar cualquier cambio en controles base.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tipos de interaccion y elementos tacticos creados.
- [x] Tests de interaccion agregados.
- [x] Menu contextual implementado.
- [x] Toggle de bloqueo/desbloqueo de zoom en menu contextual implementado/documentado.
- [x] Creacion de elementos visibles desde menu implementada.
- [x] Seleccion visual implementada.
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

## Leyenda de Navegacion

### 1. Resumen

- **Objetivo:** Agregar un pill informativo fijo en la parte inferior central del viewport del mapa con los atajos de navegacion: panning (boton central o Space + click izquierdo) y zoom (rueda).
- **Estado:** Pendiente
- **Prioridad:** Baja
- **Dependencias:** Ninguna nueva. Solo afecta renderer.

### 2. Alcance

#### Incluido

- Nuevo componente React `NavigationLegend` puramente presentacional.
- Tres variantes de icono SVG de mouse: boton izquierdo, boton central y rueda de scroll resaltados.
- Badge de tecla `Space` estilo keycap.
- Pill posicionado absolutamente en la parte inferior central de `.map-viewport`.
- Estilos en `styles.css`.

#### Fuera de alcance

- Toggle de visibilidad.
- Animaciones.
- Atajos adicionales.
- Cambios en Pixi, dominio, IPC, preload, main o filesystem.

### 3. Decisiones tecnicas

- **Ubicacion:** El componente se renderiza como hijo del div `.map-viewport` en `MapViewport.tsx`. Este div ya tiene `position: relative` y `overflow: hidden`, por lo que sirve como contexto de posicionamiento para el pill absoluto.
- **No se necesita wrapper extra:** El host div de Pixi (`.map-viewport`) puede tener hijos React. Pixi agrega el canvas via `appendChild` imperativo; el pill queda como sibling del canvas en el DOM, por encima visualmente via `z-index`.
- **Iconos SVG inline:** Tres variantes de un mismo icono de mouse via un componente `MouseIcon` con prop `highlight: "left" | "middle" | "scroll"`. Sin dependencias externas.
- **Sin estado ni props:** `NavigationLegend` es un componente estatico sin props.
- **CSS en `styles.css`:** Sin archivo CSS nuevo; se agregan clases al archivo monolitico existente siguiendo las convenciones actuales.

### 4. Estructura de archivos

| Archivo | Accion |
|---|---|
| `src/renderer/src/components/NavigationLegend.tsx` | Crear |
| `src/renderer/src/components/MapViewport.tsx` | Modificar — agregar `<NavigationLegend />` como hijo |
| `src/renderer/src/styles.css` | Modificar — agregar estilos del pill |

### 5. Diseno del componente

#### `NavigationLegend.tsx`

```
NavigationLegend
  └── div.navigation-legend
        ├── span.nav-legend-label  "Menu"
        ├── MouseIcon highlight="right"
        ├── div.nav-legend-divider
        ├── kbd.nav-legend-key  "Space"
        ├── span.nav-legend-plus  "+"
        ├── MouseIcon highlight="left"
        ├── div.nav-legend-divider
        ├── span.nav-legend-label  "Zoom"
        └── MouseIcon highlight="scroll"
```

#### `MouseIcon` SVG

SVG de 16x22px (proporciones de mouse). Muestra:
- Contorno del cuerpo del mouse.
- Division entre boton izquierdo y derecho.
- Rueda de scroll en el centro.

Segun `highlight`:
- `"left"`: rellena el boton izquierdo.
- `"right"`: rellena el boton derecho.
- `"middle"`: rellena la rueda/boton central.
- `"scroll"`: resalta la rueda con color de acento.

Colores del SVG:
- Contorno: `rgba(255,255,255,0.5)`.
- Zona no resaltada: `rgba(255,255,255,0.1)`.
- Zona resaltada: `rgba(255, 240, 168, 0.9)` (dorado de la app, `#fff0a8`).

### 6. Estilos CSS

```css
.navigation-legend {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;

  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;

  background: rgba(16, 19, 21, 0.82);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;

  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.nav-legend-label {
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nav-legend-key {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 11px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
}

.nav-legend-or,
.nav-legend-plus {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
}

.nav-legend-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}
```

### 7. Cambio en MapViewport.tsx

El div host actualmente es self-closing:
```tsx
<div ref={hostRef} className={className} aria-label="Lienzo del mapa" />
```

Cambiar a:
```tsx
<div ref={hostRef} className={className} aria-label="Lienzo del mapa">
  <NavigationLegend />
</div>
```

### 8. Plan de trabajo

1. Crear `NavigationLegend.tsx` con el componente y el SVG `MouseIcon`.
2. Agregar estilos en `styles.css`.
3. Importar y agregar `<NavigationLegend />` en `MapViewport.tsx`.
4. Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.
5. Verificar visualmente en `pnpm dev`.

### 9. Verificacion

- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test` (no se esperan cambios de tests; el componente es presentacional)
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual:**
  1. Abrir `pnpm dev`.
  2. Verificar que el pill aparece centrado en la parte inferior del mapa.
  3. Verificar que el pill muestra correctamente Panning y Zoom con sus iconos.
  4. Verificar que el pill no bloquea ni reacciona a clicks/drag.
  5. Hacer pan y zoom; confirmar que el pill no se mueve.
  6. Abrir/cerrar sidebar; confirmar que el pill sigue centrado respecto al viewport.
  7. Abrir menu contextual; confirmar que el pill queda por debajo del menu.

### 10. Checklist de cierre

- [x] `NavigationLegend.tsx` creado.
- [x] `MouseIcon` SVG implementado con cuatro variantes (left, right, middle, scroll).
- [x] Estilos del pill agregados en `styles.css`.
- [x] `NavigationLegend` montado en `MapViewport.tsx`.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [x] Smoke/manual test realizado.

### Cierre del posicionamiento contextual

- [x] El menu se mide al abrirse y cambia hacia arriba cuando no cabe debajo del puntero.
- [x] La posicion se limita a los bordes laterales del viewport usable.
- [x] Los submenus se orientan hacia el espacio disponible sin quedar recortados.
- [x] Casos inferior, inferior derecho y submenu abierto verificados visualmente.
- [x] Calculo cubierto por pruebas unitarias.
## Extension: herramientas de anotacion

- Integrar `room-pin` e `information-area` como herramientas exclusivas en la maquina de interaccion.
- Resolver hit testing, drag y doble click en Pixi usando coordenadas de mundo.
- Exponer `centerOnWorldPoint` desde el viewport para navegacion del indice lateral.
