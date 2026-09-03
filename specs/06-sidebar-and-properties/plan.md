# Plan - Sidebar y Propiedades

## Borrado en arbol de anotaciones

- [x] Propagar `onDeleteInformationArea` desde App por DmAsidePanel y conectar `onDeleteArea` en MapAnnotationsTree.
- [x] Agregar icono Trash2, tooltip y estado disabled para bloqueo; mantener nombre legible separando acciones.
- [x] Manejar ambas teclas por fila y probar que la accion no borra otra seleccion ni interfiere con el buscador.
- [x] Aceptacion del usuario para 1.10.0, junto con el ajuste descrito en plan 22.

## Integracion con grilla hexagonal

Extension implementada y aceptada para cierre 1.10.0 el 2026-09-02, desde `feature/hexagonal-grid` hacia main. Ver contrato geometrico y validacion en spec/plan 04. El cierre no declara ejecutados los smokes nativos ni los pendientes historicos ajenos a esta extension.

- [x] Agregar botones accesibles con aria-pressed e iconos Grid3X3/Hexagon, usando estilos del selector de grosor.
- [x] Conectar `scene.grid.layout`, conservar presets y deshabilitar solo el selector de diagonales cuando no aplica.
- [x] Verificar visualmente el selector en navegador y reutilizacion del cache al cambiar estilo.


Este documento describe de forma unificada el plan tecnico para implementar y mantener sidebar y propiedades, consolidando los pasos y criterios vigentes en el proyecto.

## Menú Lateral Derecho de Controles

### 1. Resumen

- **Objetivo:** Reemplazar la barra horizontal de controles por un panel lateral derecho colapsable con accordions para Grilla, Figuras, Oscuridad y Niebla, preservando los handlers y el estado actual.
- **Estado:** Cerrado / Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 04, 06, 07, 08, 09 y 10; layout actual en `src/renderer/src/App.tsx`; estilos globales en `src/renderer/src/styles.css`.

### 2. Alcance

#### Incluido

- Crear un panel lateral derecho fijo dentro del layout principal.
- Mover los controles actuales de `.grid-controls` al panel lateral.
- Agrupar controles en accordions:
  - Grilla.
  - Figuras.
  - Oscuridad.
  - Niebla.
- Usar header con icono, título grande e indicador de abierto/cerrado.
- Mantener varias secciones abiertas simultáneamente.
- Mantener el panel visible por defecto y permitir ocultarlo/mostrarlo para ampliar el viewport del mapa.
- Exponer `Valor por casilla` dentro de Figuras.
- Exponer `Ajustar grilla` como switch dentro de Grilla y mostrar `Celda` solo cuando ese modo este activo.
- Exponer `Ajustar mapa` dentro de Grilla.
- Exponer `Escala mapa` dentro de Grilla cuando hay mapa cargado, con slider, input porcentual y reset a 100%.
- Exponer `Modo niebla` dentro de Niebla.
- Retirar acciones redundantes de la toolbar superior: `Pintar fuego`, `Borrar seleccionado`, `Ajustar mapa` y `Modo niebla`.
- Ajustar el canvas para ocupar el espacio restante sin quedar cubierto.
- Mantener intactas las reglas de dominio y render.
- Mantener accesibilidad básica con botones, labels y `aria-expanded`.

#### Fuera de alcance

- Persistir estado abierto/cerrado de accordions.
- Cambiar reglas de medición, grilla, oscuridad, niebla, fuego o visión.
- Cambiar toolbar principal de carga/guardado excepto ajustes mínimos de layout.
- Introducir dependencias nuevas de iconos.
- Rediseñar paneles de propiedades de luces, fuego o formas.

### 3. Decisiones tecnicas

- **Arquitectura:** El cambio vive en `renderer`; no se tocan `domain`, `application`, `main`, `preload`, `infrastructure` ni `render`.
- **Persistencia:** El sidebar no agrega persistencia propia. Los controles siguen modificando `grid`, `settings`, `darkness`, `fogOfWar` y el `map.scale` existente en la escena. La visibilidad del sidebar es estado local de UI.
- **IPC / Electron:** Sin cambios. No se agregan canales IPC ni preload API.
- **Render / PixiJS:** Sin cambios en adapters Pixi; solo cambia el layout React/CSS alrededor del canvas.
- **Validacion:** Mantener los mismos límites actuales de inputs. Para `Valor por casilla`, editar `distancePerCell` cuando la unidad sea `ft` y `metricDistancePerCell` cuando la unidad sea `m`.
- **Dependencias nuevas:** `@radix-ui/react-switch` para el switch accesible de `Ajustar grilla`. Los iconos se resuelven con caracteres/símbolos simples o CSS.

### 4. Diseno de dominio

- **Entidades / tipos:** No se crean ni modifican tipos de dominio.
- **Reglas puras:** No hay reglas puras nuevas.
- **Coordenadas / unidades:** `Valor por casilla` mantiene la unidad activa:
  - `ft`: actualiza `grid.distancePerCell`.
  - `m`: actualiza `grid.metricDistancePerCell`.
- **Errores de dominio:** No se agregan errores nuevos.

### 5. Cambios por capa

#### `domain`

- Sin cambios esperados.
- Sin tests unitarios nuevos de dominio.

#### `application`

- Sin cambios esperados.

#### `infrastructure`

- Sin cambios esperados.

#### `main`

- Sin cambios esperados.

#### `preload`

- Sin cambios esperados.

#### `renderer`

- En `src/renderer/src/App.tsx`:
  - Extraer o reestructurar los controles actuales de grilla/oscuridad/niebla a un panel lateral.
  - Agregar estado local para accordions abiertos, por ejemplo `Set` o record booleans.
  - Agregar estado local para visibilidad global del sidebar.
  - Crear una estructura de secciones clara para Grilla, Figuras, Oscuridad y Niebla.
  - Agregar switch `Ajustar grilla` dentro de Grilla.
  - Mover `Ajustar mapa` a Grilla.
  - Agregar `Escala mapa` a Grilla, visible solo con mapa cargado.
  - Mostrar/ocultar el input `Celda` segun `Ajustar grilla`.
  - Agregar handler para `Valor por casilla`.
  - Mover `Modo niebla` a Niebla.
  - Mantener todos los handlers existentes conectados.
- En `src/renderer/src/styles.css`:
  - Cambiar layout de `app-shell` para incluir área principal con canvas + sidebar.
  - Definir ancho estable del sidebar.
  - Definir modo colapsado para que el canvas use todo el ancho disponible.
  - Estilizar headers de accordion con `font-size` entre `1.5rem` y `2rem`.
  - Estilizar contenido interno con tamaño menor y buena legibilidad.
  - Asegurar scroll vertical del panel si hace falta.
  - Evitar solapes y truncamientos de inputs/selects.

#### `render`

- Sin cambios esperados.

### 6. Plan de trabajo

1. Revisar el layout actual de `App.tsx` y `.grid-controls` en `styles.css`.
2. Definir el estado local de accordions abiertos en `App.tsx`.
3. Definir el estado local de visibilidad global del sidebar.
4. Crear helpers/render blocks para `SidebarAccordion` o una estructura equivalente dentro de `App.tsx`.
5. Mover controles de Grilla al accordion Grilla.
6. Agregar switch `Ajustar grilla` y dejar `Celda` visible solo cuando el switch este activo.
7. Mover `Ajustar mapa` al accordion Grilla.
8. Agregar `Escala mapa` al accordion Grilla con slider, input porcentual y reset 100%, conectado a `scene.map.scale`.
9. Mover Snap, Diagonal y `Valor por casilla` al accordion Figuras.
10. Mover controles de Oscuridad al accordion Oscuridad.
11. Mover controles de Niebla al accordion Niebla.
12. Mover `Modo niebla` al accordion Niebla.
13. Implementar handler de `Valor por casilla` respetando unidad activa.
14. Agregar botón visible para ocultar/mostrar el sidebar.
15. Ajustar CSS para layout lateral derecho, modo colapsado y canvas con espacio restante.
16. Ajustar estilos de headers, iconos, indicadores, controles internos y scroll.
17. Verificar que toolbar principal, status, propiedades y canvas no se solapen.
18. Ejecutar validaciones automáticas.
19. Realizar smoke manual en `pnpm dev`.

### 7. Testing y verificacion

- **Unit tests:** No se esperan tests de dominio nuevos.
- **Integration tests:** No se esperan tests de integración nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, abrir/cerrar cada accordion, ocultar/mostrar sidebar, modificar grilla, snap, diagonal, valor por casilla, oscuridad y niebla; confirmar que el canvas queda visible y usable.
- **Validación ejecutada:** `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.

### 8. Riesgos y mitigaciones

- **Riesgo:** El panel lateral reduce demasiado el área útil del canvas.
  **Mitigacion:** Usar ancho estable pero contenido compacto, y verificar con viewport de Electron.
- **Riesgo:** Inputs/selects se truncen o se solapen dentro del sidebar.
  **Mitigacion:** Usar filas flex/grid con min-width controlado y scroll vertical.
- **Riesgo:** El valor por casilla modifique el campo incorrecto según unidad.
  **Mitigacion:** Centralizar handler y probar cambiando entre `ft` y `m`.
- **Riesgo:** El refactor visual desconecte handlers existentes.
  **Mitigacion:** Mover JSX sin cambiar lógica y verificar manualmente cada control.

### 9. Criterios de aceptacion

- La antigua barra horizontal de controles ya no aparece como una sola línea sobre el mapa.
- Hay un panel lateral derecho visible.
- El panel contiene accordions de Grilla, Figuras, Oscuridad y Niebla.
- Cada accordion tiene icono, título grande e indicador de estado.
- Los headers usan tamaño de fuente aproximado entre `1.5rem` y `2rem`.
- Los controles internos se ven más pequeños que los headers.
- Grilla contiene toggle, opacidad, `Ajustar mapa`, switch `Ajustar grilla`, celda condicional, unidad y preset.
- Grilla contiene `Escala mapa` con slider, input porcentual y reset a 100% cuando hay mapa cargado.
- Figuras contiene Snap, Diagonal y Valor por casilla.
- Oscuridad contiene toggle y overlay.
- Niebla contiene toggle, `Modo niebla`, fog/opacity, color, reveal y reset.
- Los controles conservan comportamiento actual.
- El canvas no queda cubierto por el panel.
- El sidebar puede ocultarse para ampliar el viewport del mapa.
- El sidebar puede volver a mostrarse desde un control visible.
- `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/06-sidebar-and-properties/spec.md`
- `specs/06-sidebar-and-properties/plan.md`
- `README.md` solo si el flujo de uso documentado menciona la barra horizontal anterior.

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Control `Escala mapa` agregado a Grilla con slider, input porcentual y reset.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Dependencia `@radix-ui/react-switch` justificada para switch accesible.

### 12. Cierre

- Spec implementada en `src/renderer/src/App.tsx` y `src/renderer/src/styles.css`.
- Sidebar derecho agrupado por Grilla, Figuras, Oscuridad y Niebla.
- Sidebar ocultable/mostrable para ampliar el viewport del mapa.
- README actualizado para reemplazar referencias a la barra horizontal.

## Propiedades del Objeto Seleccionado en Sidebar

### 1. Resumen

- **Objetivo:** Mover las propiedades contextuales del objeto seleccionado desde la franja superior hacia un accordion contextual dentro del sidebar derecho, recuperando espacio vertical para el mapa.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** sidebar derecho para sidebar derecho y accordions; controles existentes de propiedades por tipo; seleccion actual de elementos en canvas.

### 2. Alcance

#### Incluido

- Crear un accordion contextual de propiedades arriba de los accordions existentes del sidebar.
- Reutilizar los controles actuales de propiedades para luces, fuego, mediciones y formas.
- Abrir automaticamente el sidebar cuando se seleccione un objeto y el sidebar este oculto.
- Ocultar el accordion contextual cuando no haya objeto seleccionado.
- Eliminar la franja horizontal superior de propiedades seleccionadas.
- Mantener los callbacks actuales de edicion sin cambiar el modelo de datos.
- Ajustar estilos para que los controles sean legibles en columna y no generen overflow horizontal.

#### Fuera de alcance

- Cambiar la logica de seleccion o deseleccion en PixiJS.
- Cambiar schemas de escena o persistencia `.ttrpgscene`.
- Agregar soporte de multiples selecciones.
- Redisenar todos los accordions del sidebar.
- Crear paneles flotantes, tabs o atajos nuevos.
- Cambiar el menu contextual de click derecho.

### 3. Decisiones tecnicas

- **Arquitectura:** El cambio vive en `renderer`; se mantiene la separacion actual porque la UI seguira leyendo el objeto seleccionado y llamando a los handlers existentes sin mover reglas al render ni al dominio.
- **Persistencia:** Sin cambios. Las propiedades editadas siguen usando los modelos actuales de luces, efectos y formas.
- **IPC / Electron:** Sin canales nuevos y sin cambios en preload.
- **Render / PixiJS:** Sin cambios esperados. La seleccion y el render del objeto siguen funcionando igual.
- **Validacion:** Mantener las validaciones actuales de inputs numericos, selects, sliders y color pickers.
- **Dependencias nuevas:** Ninguna.

### 4. Diseno de dominio

- **Entidades / tipos:** Sin tipos nuevos de dominio.
- **Reglas puras:** Sin reglas nuevas.
- **Coordenadas / unidades:** Se conservan las unidades actuales de cada control, incluyendo pies/metros y valores por celda.
- **Errores de dominio:** Sin errores nuevos. Los controles deben mantener el comportamiento existente ante valores invalidos o incompletos.

### 5. Cambios por capa

#### `domain`

- Sin cambios esperados.

#### `application`

- Sin cambios esperados.

#### `infrastructure`

- Sin cambios esperados.

#### `main`

- Sin cambios esperados.

#### `preload`

- Sin cambios esperados.

#### `renderer`

- Identificar el bloque actual que renderiza propiedades contextuales en la franja superior.
- Extraer ese bloque a un componente reutilizable si hoy esta embebido en `App.tsx`.
- Crear o reutilizar un helper para resolver:
  - objeto seleccionado,
  - tipo visible en el titulo,
  - icono del accordion,
  - contenido de propiedades por tipo.
- Insertar el accordion contextual como primer item del sidebar derecho.
- Hacer que el accordion se muestre abierto al seleccionar un objeto.
- Abrir el sidebar automaticamente cuando `selectedElementId` pase de vacio a un objeto valido.
- Ocultar el accordion contextual cuando no haya seleccion.
- Eliminar el render de la franja superior de propiedades.
- Ajustar CSS de propiedades para layout vertical dentro del sidebar.
- Verificar que ocultar manualmente el sidebar siga funcionando y que una nueva seleccion lo vuelva a abrir.

#### `render`

- Sin cambios esperados.

### 6. Plan de trabajo

1. [x] Revisar en `App.tsx` y componentes cercanos donde vive la franja actual de propiedades seleccionadas.
2. [x] Extraer el contenido de propiedades a un bloque contextual dentro del sidebar sin duplicar estado.
3. [x] Crear la resolucion de metadatos del accordion contextual: titulo e icono por tipo de objeto.
4. [x] Renderizar el accordion contextual al inicio del sidebar derecho solo cuando exista seleccion.
5. [x] Agregar efecto de UI para abrir el sidebar al seleccionar un objeto si estaba cerrado.
6. [x] Mover callbacks y props existentes al nuevo bloque sin cambiar comportamiento.
7. [x] Retirar la franja superior de propiedades del layout principal.
8. [x] Ajustar estilos para controles en columna dentro del sidebar.
9. [x] Ejecutar typecheck/lint/build.
10. [x] Hacer smoke manual en `pnpm dev` seleccionando objetos y editando propiedades.

### 7. Testing y verificacion

- **Unit tests:** No se esperan nuevos tests de dominio. Si se extrae logica pura de metadatos, cubrirla con test liviano si el proyecto ya tiene patron cercano.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck` ejecutado correctamente.
- **Lint:** `pnpm lint` ejecutado correctamente.
- **Build:** `pnpm build` ejecutado correctamente.
- **Manual / smoke:** Validado en `pnpm dev`; el accordion contextual aparece en el sidebar y el flujo funciona segun pruebas manuales del usuario.

### 8. Riesgos y mitigaciones

- **Riesgo:** Al mover JSX se rompen callbacks de actualizacion por tipo.
  **Mitigacion:** Extraer el componente preservando props/handlers actuales y verificar cada tipo en smoke manual.
- **Riesgo:** El accordion contextual queda demasiado alto en el sidebar.
  **Mitigacion:** Usar layout vertical compacto, wrapping controlado y scroll del sidebar si ya existe.
- **Riesgo:** El sidebar se abre en momentos no deseados.
  **Mitigacion:** Abrirlo solo cuando exista un cambio hacia una seleccion valida; no cerrarlo automaticamente al deseleccionar.
- **Riesgo:** Quedan estilos de la franja superior afectando otros controles.
  **Mitigacion:** Revisar clases compartidas antes de borrar o renombrar estilos.

### 9. Criterios de aceptacion

- Al seleccionar una luz puntual, sus propiedades aparecen en el accordion contextual del sidebar.
- Al seleccionar una luz conica, sus propiedades aparecen en el accordion contextual del sidebar.
- Al seleccionar fuego, sus propiedades aparecen en el accordion contextual del sidebar.
- Al seleccionar linea, circulo, cono o rectangulo, sus propiedades aparecen en el accordion contextual del sidebar.
- El accordion contextual aparece arriba de los accordions normales.
- Si el sidebar estaba oculto, seleccionar un objeto lo abre automaticamente.
- Al deseleccionar, el accordion contextual desaparece.
- La franja superior antigua de propiedades deja de renderizarse.
- El mapa recupera el espacio vertical de esa franja.
- Todas las propiedades editables siguen modificando el objeto seleccionado correctamente.
- No hay cambios de schema ni persistencia.
- `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

### 10. Documentacion afectada

- `specs/06-sidebar-and-properties/spec.md`
- `specs/06-sidebar-and-properties/plan.md`

### 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
## Extension: indice de anotaciones

- Crear un accordion de herramientas a la derecha y un arbol jerarquico de anotaciones dentro del panel izquierdo.
- Mantener busqueda y visibilidad como estado UI; persistir solo datos y bloqueo por anotacion.
- Reutilizar el switch Radix y el patron vigente de propiedades seleccionadas.
- Agrupar el arbol en habitaciones, terrenos y trampas; exponer highlight de 5 segundos en las hojas de area.

## Arbol de efectos y areas

Estado: implementado y aceptado para cierre 1.9.0.

- [x] Derivar entradas desde lights/effects/shapes con helpers puros `scene-objects.ts`.
- [x] Implementar borrado por coleccion/id conservando las referencias de colecciones no modificadas.
- [x] Crear SceneObjectsTree memoizado con busqueda, grupos, seleccion, centrar y borrar.
- [x] Integrarlo en DmAsidePanel; reutilizar seleccion, apertura de propiedades y `centerOnWorldPoint` existentes.
- [x] Dar dimensiones estables a acciones, truncamiento con tooltip y colores del tema.
- [x] Cubrir seleccion de ocultos, busqueda/colapso, centrar y borrado de una fila distinta a la seleccionada; evitar propagacion de Delete/Backspace.
- [x] Retirar el switch de extension: grilla siempre extendida conforme a spec/plan 04.
- [x] Aceptacion y merge autorizados por el usuario para 1.9.0.

No crear sprites para el listado ni usar un ticker. La lista se deriva al cambiar referencias de sus colecciones; pan/zoom no recalcula las entradas. Validar visualmente busqueda, ocultar/mostrar panel, seleccion y borrado sin afectar otro objeto.

Validacion de rama (2026-09-02): typecheck, lint, 322 tests y build correctos. Smoke en navegador con dos fuegos: seleccionar el primero y borrar el segundo conserva la seleccion y deja una sola hoja. Contraste y disposicion del arbol revisados por captura. Aceptacion final y cierre autorizados por el usuario para 1.9.0.

## Selector de grosor

- [x] Integrar botones 1/3 junto a opacidad en el accordion Grilla de App.
- [x] Mostrar icono Minus Lucide con strokeWidth correspondiente, estado activo y foco visible.
- [x] Dar a ambos botones columnas iguales y dimensiones estables; no introducir dependencias.
- [x] Conectar a estado de escena evitando cambios redundantes al pulsar la opcion ya activa.
- [x] Aceptacion del usuario para 1.9.0; ambos grosores revisados por captura en navegador.
