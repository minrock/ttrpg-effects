# Plan de implementacion tecnica - 11 - Menú Lateral Derecho de Controles

## 1. Resumen

- **Spec fuente:** `./specs/11-right-sidebar-controls/11-right-sidebar-controls.md`
- **Objetivo:** Reemplazar la barra horizontal de controles por un panel lateral derecho colapsable con accordions para Grilla, Figuras, Oscuridad y Niebla, preservando los handlers y el estado actual.
- **Estado:** Cerrado / Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 03, 04, 06, 07, 08, 09 y 10; layout actual en `src/renderer/src/App.tsx`; estilos globales en `src/renderer/src/styles.css`.

## 2. Alcance

### Incluido

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
- Exponer `Modo niebla` dentro de Niebla.
- Retirar acciones redundantes de la toolbar superior: `Pintar fuego`, `Borrar seleccionado`, `Ajustar mapa` y `Modo niebla`.
- Ajustar el canvas para ocupar el espacio restante sin quedar cubierto.
- Mantener intactas las reglas de dominio y render.
- Mantener accesibilidad básica con botones, labels y `aria-expanded`.

### Fuera de alcance

- Persistir estado abierto/cerrado de accordions.
- Cambiar reglas de medición, grilla, oscuridad, niebla, fuego o visión.
- Cambiar toolbar principal de carga/guardado excepto ajustes mínimos de layout.
- Introducir dependencias nuevas de iconos.
- Rediseñar paneles de propiedades de luces, fuego o formas.

## 3. Decisiones tecnicas

- **Arquitectura:** El cambio vive en `renderer`; no se tocan `domain`, `application`, `main`, `preload`, `infrastructure` ni `render`.
- **Persistencia:** No se agregan campos a `.ttrpgscene`; los controles siguen modificando `grid`, `settings`, `darkness` y `fogOfWar`. La visibilidad del sidebar es estado local de UI.
- **IPC / Electron:** Sin cambios. No se agregan canales IPC ni preload API.
- **Render / PixiJS:** Sin cambios en adapters Pixi; solo cambia el layout React/CSS alrededor del canvas.
- **Validacion:** Mantener los mismos límites actuales de inputs. Para `Valor por casilla`, editar `distancePerCell` cuando la unidad sea `ft` y `metricDistancePerCell` cuando la unidad sea `m`.
- **Dependencias nuevas:** `@radix-ui/react-switch` para el switch accesible de `Ajustar grilla`. Los iconos se resuelven con caracteres/símbolos simples o CSS.

## 4. Diseno de dominio

- **Entidades / tipos:** No se crean ni modifican tipos de dominio.
- **Reglas puras:** No hay reglas puras nuevas.
- **Coordenadas / unidades:** `Valor por casilla` mantiene la unidad activa:
  - `ft`: actualiza `grid.distancePerCell`.
  - `m`: actualiza `grid.metricDistancePerCell`.
- **Errores de dominio:** No se agregan errores nuevos.

## 5. Cambios por capa

### `domain`

- Sin cambios esperados.
- Sin tests unitarios nuevos de dominio.

### `application`

- Sin cambios esperados.

### `infrastructure`

- Sin cambios esperados.

### `main`

- Sin cambios esperados.

### `preload`

- Sin cambios esperados.

### `renderer`

- En `src/renderer/src/App.tsx`:
  - Extraer o reestructurar los controles actuales de grilla/oscuridad/niebla a un panel lateral.
  - Agregar estado local para accordions abiertos, por ejemplo `Set` o record booleans.
  - Agregar estado local para visibilidad global del sidebar.
  - Crear una estructura de secciones clara para Grilla, Figuras, Oscuridad y Niebla.
  - Agregar switch `Ajustar grilla` dentro de Grilla.
  - Mover `Ajustar mapa` a Grilla.
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

### `render`

- Sin cambios esperados.

## 6. Plan de trabajo

1. Revisar el layout actual de `App.tsx` y `.grid-controls` en `styles.css`.
2. Definir el estado local de accordions abiertos en `App.tsx`.
3. Definir el estado local de visibilidad global del sidebar.
4. Crear helpers/render blocks para `SidebarAccordion` o una estructura equivalente dentro de `App.tsx`.
5. Mover controles de Grilla al accordion Grilla.
6. Agregar switch `Ajustar grilla` y dejar `Celda` visible solo cuando el switch este activo.
7. Mover `Ajustar mapa` al accordion Grilla.
8. Mover Snap, Diagonal y `Valor por casilla` al accordion Figuras.
9. Mover controles de Oscuridad al accordion Oscuridad.
10. Mover controles de Niebla al accordion Niebla.
11. Mover `Modo niebla` al accordion Niebla.
12. Implementar handler de `Valor por casilla` respetando unidad activa.
13. Agregar botón visible para ocultar/mostrar el sidebar.
14. Ajustar CSS para layout lateral derecho, modo colapsado y canvas con espacio restante.
15. Ajustar estilos de headers, iconos, indicadores, controles internos y scroll.
16. Verificar que toolbar principal, status, propiedades y canvas no se solapen.
17. Ejecutar validaciones automáticas.
18. Realizar smoke manual en `pnpm dev`.

## 7. Testing y verificacion

- **Unit tests:** No se esperan tests de dominio nuevos.
- **Integration tests:** No se esperan tests de integración nuevos.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** `pnpm dev`, abrir/cerrar cada accordion, ocultar/mostrar sidebar, modificar grilla, snap, diagonal, valor por casilla, oscuridad y niebla; confirmar que el canvas queda visible y usable.
- **Validación ejecutada:** `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build`.

## 8. Riesgos y mitigaciones

- **Riesgo:** El panel lateral reduce demasiado el área útil del canvas.
  **Mitigacion:** Usar ancho estable pero contenido compacto, y verificar con viewport de Electron.
- **Riesgo:** Inputs/selects se truncen o se solapen dentro del sidebar.
  **Mitigacion:** Usar filas flex/grid con min-width controlado y scroll vertical.
- **Riesgo:** El valor por casilla modifique el campo incorrecto según unidad.
  **Mitigacion:** Centralizar handler y probar cambiando entre `ft` y `m`.
- **Riesgo:** El refactor visual desconecte handlers existentes.
  **Mitigacion:** Mover JSX sin cambiar lógica y verificar manualmente cada control.

## 9. Criterios de aceptacion

- La antigua barra horizontal de controles ya no aparece como una sola línea sobre el mapa.
- Hay un panel lateral derecho visible.
- El panel contiene accordions de Grilla, Figuras, Oscuridad y Niebla.
- Cada accordion tiene icono, título grande e indicador de estado.
- Los headers usan tamaño de fuente aproximado entre `1.5rem` y `2rem`.
- Los controles internos se ven más pequeños que los headers.
- Grilla contiene toggle, opacidad, `Ajustar mapa`, switch `Ajustar grilla`, celda condicional, unidad y preset.
- Figuras contiene Snap, Diagonal y Valor por casilla.
- Oscuridad contiene toggle y overlay.
- Niebla contiene toggle, `Modo niebla`, fog/opacity, color, reveal y reset.
- Los controles conservan comportamiento actual.
- El canvas no queda cubierto por el panel.
- El sidebar puede ocultarse para ampliar el viewport del mapa.
- El sidebar puede volver a mostrarse desde un control visible.
- `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/11-right-sidebar-controls/11-right-sidebar-controls.md`
- `specs/11-right-sidebar-controls/plan.md`
- `README.md` solo si el flujo de uso documentado menciona la barra horizontal anterior.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Dependencia `@radix-ui/react-switch` justificada para switch accesible.

## 12. Cierre

- Spec implementada en `src/renderer/src/App.tsx` y `src/renderer/src/styles.css`.
- Sidebar derecho agrupado por Grilla, Figuras, Oscuridad y Niebla.
- Sidebar ocultable/mostrable para ampliar el viewport del mapa.
- README actualizado para reemplazar referencias a la barra horizontal.
