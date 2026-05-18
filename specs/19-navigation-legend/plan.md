# Plan de implementacion tecnica - 19 Leyenda de Navegacion

## 1. Resumen

- **Spec fuente:** `./specs/19-navigation-legend/19-navigation-legend.md`
- **Objetivo:** Agregar un pill informativo fijo en la parte inferior central del viewport del mapa con los atajos de navegacion: panning (boton central o Space + click izquierdo) y zoom (rueda).
- **Estado:** Pendiente
- **Prioridad:** Baja
- **Dependencias:** Ninguna nueva. Solo afecta renderer.

## 2. Alcance

### Incluido

- Nuevo componente React `NavigationLegend` puramente presentacional.
- Tres variantes de icono SVG de mouse: boton izquierdo, boton central y rueda de scroll resaltados.
- Badge de tecla `Space` estilo keycap.
- Pill posicionado absolutamente en la parte inferior central de `.map-viewport`.
- Estilos en `styles.css`.

### Fuera de alcance

- Toggle de visibilidad.
- Animaciones.
- Atajos adicionales.
- Cambios en Pixi, dominio, IPC, preload, main o filesystem.

## 3. Decisiones tecnicas

- **Ubicacion:** El componente se renderiza como hijo del div `.map-viewport` en `MapViewport.tsx`. Este div ya tiene `position: relative` y `overflow: hidden`, por lo que sirve como contexto de posicionamiento para el pill absoluto.
- **No se necesita wrapper extra:** El host div de Pixi (`.map-viewport`) puede tener hijos React. Pixi agrega el canvas via `appendChild` imperativo; el pill queda como sibling del canvas en el DOM, por encima visualmente via `z-index`.
- **Iconos SVG inline:** Tres variantes de un mismo icono de mouse via un componente `MouseIcon` con prop `highlight: "left" | "middle" | "scroll"`. Sin dependencias externas.
- **Sin estado ni props:** `NavigationLegend` es un componente estatico sin props.
- **CSS en `styles.css`:** Sin archivo CSS nuevo; se agregan clases al archivo monolitico existente siguiendo las convenciones actuales.

## 4. Estructura de archivos

| Archivo | Accion |
|---|---|
| `src/renderer/src/components/NavigationLegend.tsx` | Crear |
| `src/renderer/src/components/MapViewport.tsx` | Modificar — agregar `<NavigationLegend />` como hijo |
| `src/renderer/src/styles.css` | Modificar — agregar estilos del pill |

## 5. Diseno del componente

### `NavigationLegend.tsx`

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

### `MouseIcon` SVG

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

## 6. Estilos CSS

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

## 7. Cambio en MapViewport.tsx

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

## 8. Plan de trabajo

1. Crear `NavigationLegend.tsx` con el componente y el SVG `MouseIcon`.
2. Agregar estilos en `styles.css`.
3. Importar y agregar `<NavigationLegend />` en `MapViewport.tsx`.
4. Ejecutar `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.
5. Verificar visualmente en `pnpm dev`.

## 9. Verificacion

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

## 10. Checklist de cierre

- [x] `NavigationLegend.tsx` creado.
- [x] `MouseIcon` SVG implementado con cuatro variantes (left, right, middle, scroll).
- [x] Estilos del pill agregados en `styles.css`.
- [x] `NavigationLegend` montado en `MapViewport.tsx`.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm test` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] `pnpm build` ejecutado.
- [ ] Smoke/manual test realizado.
