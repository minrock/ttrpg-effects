# Plan de implementacion tecnica - 08 - Niebla de Guerra y Vision Futuras

## 1. Resumen

- **Spec fuente:** `./specs/08-fog-of-war-and-vision-future/08-fog-of-war-and-vision-future.md`
- **Objetivo:** Implementar una experiencia completa inicial de niebla de guerra y vision: ocultar mapa no revelado, revelar areas manualmente, conectar vision a luces existentes y preparar obstaculos/paredes para una linea de vision futura.
- **Estado:** Implementado
- **Prioridad:** Alta
- **Dependencias:** Specs 00-07, escena versionada, luces persistentes, oscuridad global, PixiJS viewport, capas de render, bug abierto `./bugs/bug-mask-lights-to-see-through-darkness-overlay/`.
- **Nota documental:** El spec fuente fue corregido a `Spec 08` durante esta implementacion.

## 2. Alcance

### Incluido

- Implementar separacion entre oscuridad ambiental, vision actual y zonas reveladas.
- Agregar tipos de dominio future-ready para niebla de guerra, zonas reveladas y obstaculos/paredes.
- Ampliar el formato de escena de forma compatible para reservar datos de vision futura.
- Agregar validacion/schema para esos datos con defaults vacios.
- Reservar y usar capas de render para `fogOfWar` y `walls`.
- Permitir activar/desactivar fog of war y configurar opacidad/color.
- Permitir revelar areas manuales desde el mapa con radio default `50`.
- Separar `Modo niebla` de `Grab` para que navegar el mapa no revele fog accidentalmente.
- Agregar un toggle en el menu contextual de click derecho para alternar entre `Grab` y `Modo niebla`.
- Mostrar un cursor tipo pincel/crosshair cuando `Modo niebla` este activo.
- Permitir borrar/resetear areas reveladas.
- Permitir que luces visibles aporten vision actual.
- Renderizar zonas no reveladas oscuras y zonas reveladas/visibles claras.
- Agregar tests de serializacion/validacion para escenas con y sin datos de vision.
- Actualizar documentacion con decisiones y limites del MVP.
- Corregir encabezado del spec fuente a `Spec 08` si se acepta la limpieza documental.

### Fuera de alcance

- Linea de vision automatica con recorte por paredes.
- Calculo real de visibilidad con paredes.
- Editor completo de paredes/puertas.
- Puertas con estado abierto/cerrado.
- Vision por token/minis virtuales.
- Reglas avanzadas de vision D&D 5e.
- Resolver el bug de mascaras de luz; debe quedar referenciado como dependencia/riesgo separado.

## 3. Decisiones tecnicas

- **Arquitectura:** Crear modelos puros en `domain/vision` para niebla, zonas reveladas, vision por luces y obstaculos. El dominio no depende de React/Electron/PixiJS.
- **Persistencia:** Ampliar `SceneDocumentV1` de forma compatible agregando propiedades nuevas con defaults vacios en `createDefaultScene`. Si se considera ruptura para escenas existentes, mantener parse tolerante mediante defaults en schema.
- **IPC / Electron:** No agregar IPC nuevo. Todo se guarda dentro del JSON `.ttrpgscene`.
- **Render / PixiJS:** Usar capas claras para niebla/vision/paredes. Implementar fog of war visual con shapes de revelado manual y vision derivada de luces; mantener LoS por paredes fuera de alcance. Cambiar el cursor del viewport cuando la herramienta activa sea `Modo niebla`.
- **Validacion:** Validar ids, coordenadas finitas, poligonos/segmentos con cantidad minima de puntos, estados enumerados y opacidades `0..1`.
- **Dependencias nuevas:** Ninguna prevista.

## 4. Diseno de dominio

- **Entidades / tipos:** `SceneFogOfWar`, `SceneFogRevealArea`, `SceneFogObstacle` y helpers de `domain/vision`.
- **Reglas puras:** Crear areas reveladas, validar segmentos de pared, activar/desactivar niebla, calcular areas visibles desde luces, unir vision persistente/manual y vision temporal.
- **Coordenadas / unidades:** Todas las zonas y obstaculos se guardan en coordenadas de mundo. No guardar datos en pantalla.
- **Errores de dominio:** Coordenadas invalidas, ids vacios, poligonos insuficientes, segmentos de pared sin dos puntos, opacidades fuera de rango.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/vision/vision.ts` con tipos y helpers puros.
- Definir `revealRadius: 50` como default de `SceneFogOfWar`.
- Agregar tests para defaults, validacion de areas reveladas y obstaculos.
- Mantener separacion conceptual entre:
  - oscuridad ambiental,
  - vision actual,
  - zonas reveladas persistentes,
  - obstaculos/paredes.

### `application`

- No agregar casos de uso nuevos si guardar/cargar escena sigue bastando.
- Si hace falta, agregar helpers puros para migrar/defaultar escenas sin vision.

### `infrastructure`

- Sin cambios esperados.
- La lectura/escritura sigue usando `.ttrpgscene`.

### `main`

- Sin cambios esperados.
- No agregar IPC ni dialogs.

### `preload`

- Sin cambios esperados.
- No exponer APIs nuevas.

### `renderer`

- Agregar controles discretos para activar fog of war, ajustar opacidad, revelar area circular y resetear revelado.
- Exponer `Grab` y `Modo niebla` como modos mutuamente excluyentes.
- Agregar una accion al menu contextual para alternar rapidamente entre `Grab` y `Modo niebla`.
- La UI debe permitir crear revelados manuales sin tapar el mapa.
- Evitar paneles que cubran el mapa.

### `render`

- Actualizar `renderLayerNames` para reservar capas futuras, por ejemplo:
  - `fogOfWar`
  - `walls`
- Documentar orden esperado respecto a `darkness`, `lights`, `effects` y `shapesAndMeasurements`.
- Renderizar fog of war encima del mapa y debajo de herramientas tacticas/seleccion.
- Renderizar areas reveladas manuales y vision por luces como huecos/zonas claras.
- Aplicar cursor tipo pincel/crosshair al viewport cuando `Modo niebla` este activo.
- Evitar shaders complejos si Pixi Graphics alcanza.

## 6. Plan de trabajo

1. Corregir encabezado del spec fuente de `Spec 07` a `Spec 08` si se decide incluir limpieza documental.
2. Revisar estado actual de `SceneDocumentV1`, `scene-schema.ts`, `createDefaultScene` y `renderLayerNames`.
3. Diseñar tipos de dominio en `domain/vision` para niebla, zonas reveladas, vision por luces y obstaculos.
4. Agregar propiedades de fog/vision al documento de escena con defaults funcionales.
5. Actualizar schema para aceptar escenas antiguas sin datos de vision o definir migracion/defaults si corresponde.
6. Agregar tests de dominio y schema para escenas con vision vacia y con datos validos.
7. Reservar y usar capas de render en `renderLayerNames` y ajustar cualquier uso de capas que dependa del orden.
8. Implementar controles de renderer para fog, revelado manual y reset.
9. Separar modos `Grab` y `Modo niebla` para evitar revelado accidental durante navegacion.
10. Agregar toggle de `Grab`/`Modo niebla` al menu contextual de click derecho.
11. Agregar cursor tipo pincel/crosshair en `Modo niebla`.
12. Implementar render Pixi de fog y areas visibles.
13. Actualizar README/docs con la decision: hay fog/vision manual y por luces, pero no LoS automatica por paredes.
14. Referenciar el bug de mascaras de luces como riesgo tecnico conocido para futuras capas de vision.
15. Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## 7. Testing y verificacion

- **Unit tests:** Validacion de `domain/vision`, defaults, ids, coordenadas, segmentos y areas reveladas.
- **Integration tests:** Parse/serialize de escenas sin vision y con vision futura.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** Ejecutar `pnpm dev`, cargar mapa, activar fog of war, revelar areas manuales, crear luces, verificar que luz/revelados muestran el area esperada, resetear revelado, guardar/cargar escena.

## 8. Riesgos y mitigaciones

- **Riesgo:** Agregar campos al schema rompa escenas existentes.
  **Mitigacion:** Usar defaults compatibles o parse tolerante, y cubrirlo con tests.
- **Riesgo:** Mezclar oscuridad, luz y vision en un solo concepto dificil de evolucionar.
  **Mitigacion:** Modelar explicitamente `darkness`, `vision`, `revealedAreas` y `obstacles`.
- **Riesgo:** Reservar capas en orden incorrecto complique el bug futuro de mascaras.
  **Mitigacion:** Documentar orden de capas y mantener el bug de masking como trabajo separado.
- **Riesgo:** Scope creep hacia linea de vision real.
  **Mitigacion:** Implementar fog/vision manual y por luces; LoS automatica por paredes queda fuera de alcance.

## 9. Criterios de aceptacion

- El spec fuente queda identificado como 08 o el plan documenta explicitamente la discrepancia.
- Existen tipos de dominio para niebla/revelado/obstaculos.
- Las escenas default incluyen estructura funcional de fog/vision.
- Escenas existentes sin datos de vision siguen parseando/cargando.
- Escenas con datos validos de vision futura serializan y parsean.
- Las capas de render de fog/vision/paredes quedan implementadas o reservadas.
- El usuario puede activar fog of war y revelar areas manualmente.
- El radio default de revelado manual es `50`.
- `Grab` y `Modo niebla` son modos separados.
- El menu contextual permite alternar entre `Grab` y `Modo niebla`.
- `Modo niebla` muestra un puntero tipo pincel/crosshair.
- Las luces visibles aportan vision actual en fog of war.
- No hay LoS automatica por paredes.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## 10. Documentacion afectada

- `specs/08-fog-of-war-and-vision-future/08-fog-of-war-and-vision-future.md`
- `README.md` si se agrega una seccion de arquitectura futura.
- Posible nota en el bug `bug-mask-lights-to-see-through-darkness-overlay` si las nuevas capas influyen en la estrategia futura.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Encabezado del spec fuente revisado/corregido si aplica.
- [x] Tipos de dominio de vision creados.
- [x] Defaults de escena actualizados o schema tolerante implementado.
- [x] Radio default de revelado definido en `50`.
- [x] Schema de escena actualizado.
- [x] Tests de dominio agregados.
- [x] Tests de parse/serialize agregados.
- [x] Capas futuras reservadas/documentadas.
- [x] README/docs actualizados.
- [x] `Grab` y `Modo niebla` documentados como modos separados.
- [x] Toggle contextual `Grab`/`Modo niebla` documentado.
- [x] Cursor de `Modo niebla` documentado.
- [x] Bug de masking referenciado como riesgo/dependencia.
- [x] `pnpm test` ejecutado.
- [x] `pnpm typecheck` ejecutado.
- [x] `pnpm lint` ejecutado.
- [x] `pnpm build` ejecutado.
- [ ] Smoke/manual test realizado si aplica.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
