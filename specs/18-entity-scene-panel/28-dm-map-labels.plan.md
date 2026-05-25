# Plan de implementacion tecnica - 28 - Labels de Mapa Solo DM

## 1. Resumen

- **Spec fuente:** `./specs/18-entity-scene-panel/28-dm-map-labels.md`
- **Objetivo:** Agregar labels de texto privados del DM, editables desde el aside derecho, persistidos en escena y excluidos del render de jugador.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Spec 02 para formato `.ttrpgscene`, Spec 11 para aside derecho, Spec 15 para propiedades de objeto seleccionado, Spec 25 para ventana de jugador.

## 2. Alcance

### Incluido

- Tipo persistente `SceneLabel`.
- Estado de labels en escena.
- Creacion de labels desde UI DM.
- Render PixiJS de labels en vista DM.
- Seleccion, drag y borrado con Delete/Backspace.
- Panel de propiedades en aside derecho.
- Controles para texto, font, color, sombra y opacidad.
- Guardado/carga de labels en `.ttrpgscene`.
- Filtro para que labels no aparezcan en ventana de jugador.

### Fuera de alcance

- Labels visibles para jugadores.
- Markdown/HTML/rich text.
- Fuentes externas.
- Rotacion.
- Edicion multilinea avanzada.
- Sincronizacion colaborativa.

## 3. Decisiones tecnicas

- **Arquitectura:** Los labels son entidad de escena y deben vivir en tipos de dominio/escena, no como estado suelto del componente visual.
- **Persistencia:** Agregar `labels?: SceneLabel[]` o `labels: SceneLabel[]` con fallback vacio al cargar escenas antiguas.
- **IPC / Electron:** Sin nuevos canales IPC. Guardado y carga reutilizan los flujos existentes de escena.
- **Render / PixiJS:** Crear o reutilizar una capa de labels DM-only. El player viewport debe ignorar esa capa.
- **Validacion:** Sanitizar como texto plano; validar opacidad y colores; restringir font a lista cerrada.
- **Dependencias nuevas:** Ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:** `SceneLabel` con `id`, `text`, `position`, `fontFamily`, `color`, `opacity` y `shadow`.
- **Reglas puras:** Normalizar labels cargados desde escena, aplicando defaults cuando falten campos.
- **Coordenadas / unidades:** Posicion en coordenadas de mundo, independiente de zoom y pantalla.
- **Errores de dominio:** Escenas con labels invalidos deben degradar a defaults seguros o excluir labels corruptos con warning recuperable si existe infraestructura para warnings.

## 5. Cambios por capa

### `domain`

- Agregar tipo de label en el modelo de escena.
- Agregar helper de normalizacion/defaults si el formato actual ya tiene capa de migracion o parseo.

### `application`

- Asegurar que guardado/carga preserve `labels`.
- Si existe constructor o migrador de escena, inicializar `labels` como arreglo vacio.

### `infrastructure`

- Sin cambios esperados fuera de serializacion existente de `.ttrpgscene`.

### `main`

- Sin cambios esperados.

### `preload`

- Sin cambios esperados.

### `renderer`

- Agregar accion para crear label desde UI DM, idealmente dentro de un grupo de herramientas DM o escena.
- Agregar estado y reducers/handlers para crear, actualizar, mover y borrar labels.
- Extender seleccion para aceptar labels.
- Agregar acordeon de propiedades del label en aside derecho cuando el label esta seleccionado.
- Agregar controles:
  - input de texto;
  - select de font de sistema;
  - input color de texto;
  - switch/checkbox de sombra;
  - input color de sombra;
  - slider/input de blur de sombra;
  - slider de opacidad.

### `render`

- Renderizar labels con `Text` o `BitmapText` si el sistema actual lo recomienda para rendimiento.
- Ubicar labels en capa visible solo para DM.
- Hit testing de labels para seleccion.
- Drag de labels actualizando coordenadas de mundo.
- Limpiar objetos PixiJS al redibujar/destruir viewport.
- Asegurar que el player viewport no dibuje labels.

## 6. Plan de trabajo

1. Actualizar tipos de escena y defaults para soportar `labels`.
2. Conectar labels al estado principal de escena y persistencia existente.
3. Agregar accion UI para crear label.
4. Implementar render DM-only de labels en PixiJS.
5. Integrar hit testing, seleccion, drag y borrado.
6. Agregar propiedades del label en aside derecho.
7. Verificar que player window no renderiza labels.
8. Ejecutar typecheck, tests relevantes, lint y build.

## 7. Testing y verificacion

- **Unit tests:** normalizacion/defaults de labels si existe capa testeable de escena.
- **Integration tests:** guardado/carga preserva labels si ya hay tests de serializacion.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint` o ESLint focalizado.
- **Build:** `pnpm build`
- **Manual / smoke:** Crear label, editar propiedades, arrastrar, borrar, guardar escena, cargar escena y abrir player window confirmando que no aparece.

## 8. Riesgos y mitigaciones

- **Riesgo:** El label se renderiza accidentalmente en ventana de jugador.
  **Mitigacion:** Mantener capa DM-only o filtro explicito en player viewport y probar manualmente.
- **Riesgo:** Texto de usuario se interpreta como HTML.
  **Mitigacion:** Renderizar siempre como texto plano Pixi/React, nunca usar `dangerouslySetInnerHTML`.
- **Riesgo:** Fuentes inconsistentes entre sistemas.
  **Mitigacion:** Usar una lista corta de fonts del sistema con fallback generico.
- **Riesgo:** Labels quedan ilegibles sobre algunos mapas.
  **Mitigacion:** Permitir color, sombra y opacidad configurables.

## 9. Criterios de aceptacion

- [x] Se puede crear un label en el mapa.
- [x] El label se muestra en DM.
- [x] El label no se muestra en player window.
- [x] El label se puede seleccionar y arrastrar.
- [x] El aside derecho permite editar texto, font, color, sombra y opacidad.
- [x] Delete/Backspace borra el label seleccionado.
- [x] Guardar y cargar escena preserva labels.
- [x] Escenas antiguas sin labels cargan sin error.
- [x] Validaciones pasan.

## 10. Documentacion afectada

- `./specs/18-entity-scene-panel/28-dm-map-labels.md`
- `./specs/18-entity-scene-panel/28-dm-map-labels.plan.md`
- Specs de ventana de jugador o propiedades seleccionadas solo si la implementacion cambia decisiones globales.

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
