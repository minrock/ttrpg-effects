# Plan de implementacion tecnica - 15 - Propiedades del Objeto Seleccionado en Sidebar

## 1. Resumen

- **Spec fuente:** `./specs/06-sidebar-and-properties/15-selected-object-properties-sidebar.md`
- **Objetivo:** Mover las propiedades contextuales del objeto seleccionado desde la franja superior hacia un accordion contextual dentro del sidebar derecho, recuperando espacio vertical para el mapa.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Spec 11 para sidebar derecho y accordions; controles existentes de propiedades por tipo; seleccion actual de elementos en canvas.

## 2. Alcance

### Incluido

- Crear un accordion contextual de propiedades arriba de los accordions existentes del sidebar.
- Reutilizar los controles actuales de propiedades para luces, fuego, mediciones y formas.
- Abrir automaticamente el sidebar cuando se seleccione un objeto y el sidebar este oculto.
- Ocultar el accordion contextual cuando no haya objeto seleccionado.
- Eliminar la franja horizontal superior de propiedades seleccionadas.
- Mantener los callbacks actuales de edicion sin cambiar el modelo de datos.
- Ajustar estilos para que los controles sean legibles en columna y no generen overflow horizontal.

### Fuera de alcance

- Cambiar la logica de seleccion o deseleccion en PixiJS.
- Cambiar schemas de escena o persistencia `.ttrpgscene`.
- Agregar soporte de multiples selecciones.
- Redisenar todos los accordions del sidebar.
- Crear paneles flotantes, tabs o atajos nuevos.
- Cambiar el menu contextual de click derecho.

## 3. Decisiones tecnicas

- **Arquitectura:** El cambio vive en `renderer`; se mantiene la separacion actual porque la UI seguira leyendo el objeto seleccionado y llamando a los handlers existentes sin mover reglas al render ni al dominio.
- **Persistencia:** Sin cambios. Las propiedades editadas siguen usando los modelos actuales de luces, efectos y formas.
- **IPC / Electron:** Sin canales nuevos y sin cambios en preload.
- **Render / PixiJS:** Sin cambios esperados. La seleccion y el render del objeto siguen funcionando igual.
- **Validacion:** Mantener las validaciones actuales de inputs numericos, selects, sliders y color pickers.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:** Sin tipos nuevos de dominio.
- **Reglas puras:** Sin reglas nuevas.
- **Coordenadas / unidades:** Se conservan las unidades actuales de cada control, incluyendo pies/metros y valores por celda.
- **Errores de dominio:** Sin errores nuevos. Los controles deben mantener el comportamiento existente ante valores invalidos o incompletos.

## 5. Cambios por capa

### `domain`

- Sin cambios esperados.

### `application`

- Sin cambios esperados.

### `infrastructure`

- Sin cambios esperados.

### `main`

- Sin cambios esperados.

### `preload`

- Sin cambios esperados.

### `renderer`

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

### `render`

- Sin cambios esperados.

## 6. Plan de trabajo

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

## 7. Testing y verificacion

- **Unit tests:** No se esperan nuevos tests de dominio. Si se extrae logica pura de metadatos, cubrirla con test liviano si el proyecto ya tiene patron cercano.
- **Integration tests:** No se esperan nuevos.
- **Typecheck:** `pnpm typecheck` ejecutado correctamente.
- **Lint:** `pnpm lint` ejecutado correctamente.
- **Build:** `pnpm build` ejecutado correctamente.
- **Manual / smoke:** Validado en `pnpm dev`; el accordion contextual aparece en el sidebar y el flujo funciona segun pruebas manuales del usuario.

## 8. Riesgos y mitigaciones

- **Riesgo:** Al mover JSX se rompen callbacks de actualizacion por tipo.
  **Mitigacion:** Extraer el componente preservando props/handlers actuales y verificar cada tipo en smoke manual.
- **Riesgo:** El accordion contextual queda demasiado alto en el sidebar.
  **Mitigacion:** Usar layout vertical compacto, wrapping controlado y scroll del sidebar si ya existe.
- **Riesgo:** El sidebar se abre en momentos no deseados.
  **Mitigacion:** Abrirlo solo cuando exista un cambio hacia una seleccion valida; no cerrarlo automaticamente al deseleccionar.
- **Riesgo:** Quedan estilos de la franja superior afectando otros controles.
  **Mitigacion:** Revisar clases compartidas antes de borrar o renombrar estilos.

## 9. Criterios de aceptacion

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

## 10. Documentacion afectada

- `specs/06-sidebar-and-properties/15-selected-object-properties-sidebar.md`
- `specs/06-sidebar-and-properties/15-selected-object-properties-sidebar.plan.md`

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado si aplica.
- [x] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
