# Plan de implementacion tecnica - 30 - Brujula de mapa y orientacion de Player View

## 1. Resumen

- **Spec fuente:** `./specs/30-map-compass/spec.md`
- **Objetivo:** implementar orientacion cardinal por mapa, brujula visible en DM, brujula opcional en Player View y rotacion visual de Player View para mantener el norte elegido hacia arriba.
- **Estado:** Implementado.
- **Prioridad:** Media.
- **Dependencias:** Spec 24 de control de camara de jugador, spec 29 de escenas multi-mapa, asset `assets/compass/compass.png`.

## 2. Alcance

### Incluido

- Agregar orientacion cardinal persistente por `SceneMapDocument`.
- Migrar/cargar escenas antiguas sin orientacion usando `0` como default.
- Mostrar brujula en esquina superior derecha del canvas DM.
- Agregar control cardinal en el panel derecho del DM.
- Sincronizar orientacion con Player View dentro del snapshot ya existente.
- Rotar la presentacion completa de Player View en pasos de 90 grados.
- Agregar toggle discreto en Player View para mostrar u ocultar la brujula local.
- Agregar tests de dominio/schema para defaults, validacion y persistencia.

### Fuera de alcance

- Rotacion libre o input manual de grados.
- Edicion de orientacion desde Player View.
- Persistir la preferencia local de mostrar brujula en Player View.
- Rotar o reescribir la imagen del mapa en disco.
- Cambios de servidor, red o colaboracion remota.

## 3. Decisiones tecnicas

- **Arquitectura:** la orientacion vive en dominio como propiedad de mapa; renderer solo invoca setters puros y muestra controles. PixiJS aplica transformaciones visuales sin cambiar datos persistidos.
- **Persistencia:** extender `SceneMapDocument` con `compassOrientation` o nombre equivalente, restringido a `0 | 90 | 180 | 270`. El schema Zod asume `0` cuando el campo no existe.
- **IPC / Electron:** no se requieren canales nuevos; `publishPlayerScene` ya transporta el snapshot completo de escena al Player View.
- **Render / PixiJS:** DM mantiene viewport normal y agrega overlay HTML/React para la brujula. Player View aplica una rotacion visual al mundo renderizado o al contenedor raiz renderizable, manteniendo coordenadas de dominio intactas.
- **Validacion:** valores externos se normalizan a una de las cuatro orientaciones validas o fallan con error recuperable segun el patron actual del schema.
- **Dependencias nuevas:** ninguna.

## 4. Diseno de dominio

- **Entidades / tipos:**
  - Crear `CompassOrientation = 0 | 90 | 180 | 270`.
  - Agregar orientacion al documento persistente de cada mapa.
  - Opcionalmente crear helpers como `normalizeCompassOrientation`, `rotateCompassOrientation`, `getPlayerViewRotationForCompass`.
- **Reglas puras:**
  - Solo cuatro orientaciones validas.
  - Default `0` para mapas nuevos, importados o migrados.
  - Cambio de orientacion afecta solo al mapa activo.
  - La rotacion de Player View se deriva de la orientacion y no se persiste como dato separado.
- **Coordenadas / unidades:**
  - Las coordenadas de mundo no cambian.
  - La transformacion visual de Player View debe preservar el centro de camara esperado.
  - Pan, zoom, recentrado y links internos deben seguir expresandose en coordenadas de mundo.
- **Errores de dominio:**
  - Orientacion invalida en datos externos.
  - Intento de modificar orientacion sin mapa activo debe no-op controlado o error de UI recuperable.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/map/compass-orientation.ts` con tipo, constantes y helpers puros.
- Modificar `src/domain/sessions/scene-document.ts` para incluir la orientacion por mapa.
- Modificar `src/domain/sessions/scene-maps.ts` para inicializar mapas nuevos y migrados con orientacion default.
- Modificar `src/domain/sessions/scene-schema.ts` para parsear, validar y serializar el nuevo campo.
- Agregar tests en `src/domain/map/compass-orientation.test.ts`, `src/domain/sessions/scene-maps.test.ts` y `src/domain/sessions/scene-schema.test.ts`.

### `application`

- No se anticipan casos de uso nuevos.
- Reutilizar actualizaciones de escena existentes desde `App.tsx`.

### `infrastructure`

- Incluir `assets/compass/compass.png` dentro de los recursos empaquetados si el build actual no lo copia automaticamente.
- Verificar que Vite pueda importar el PNG desde renderer o que el asset se sirva desde la ruta existente.

### `main`

- Sin IPC nuevo.
- Si el asset requiere empaquetado adicional, actualizar configuracion `build.extraResources` o importarlo desde renderer para que quede dentro del bundle.

### `preload`

- Sin cambios esperados.
- Confirmar que los tipos compartidos de snapshot de Player View no requieran API nueva.

### `renderer`

- Agregar componente reutilizable `CompassOverlay` para DM y Player View.
- Pasar la orientacion del mapa activo a `MapViewport`.
- Agregar control cardinal compacto en el panel derecho del DM.
- Implementar handler en `App.tsx` para actualizar la orientacion del mapa activo y marcar escena modificada.
- En `PlayerApp.tsx`, agregar estado local `showCompass` default `false` y un toggle discreto.
- Mostrar `CompassOverlay` en Player View solo si el toggle esta activo, siempre con norte hacia arriba.

### `render`

- Extender `PixiViewport` para recibir orientacion/rotacion de Player View.
- Aplicar rotacion visual solo cuando `viewRole === "player"`.
- Mantener DM sin rotacion de mundo; DM solo rota el overlay de brujula.
- Asegurar que grid, fog, oscuridad, luces, efectos, formas, tokens, labels y anotaciones roten juntos.
- Revisar conversiones pantalla/mundo para que pan, zoom y reportes de camara sigan siendo consistentes bajo rotacion.

## 6. Plan de trabajo

1. Definir tipo y helpers de orientacion cardinal en dominio con tests unitarios.
2. Extender modelo de escena/mapa, defaults y schema con retrocompatibilidad para escenas sin orientacion.
3. Agregar setter puro o helper de actualizacion para cambiar la orientacion del mapa activo.
4. Crear `CompassOverlay` usando `assets/compass/compass.png`, con opacidad y posicion fija.
5. Integrar la brujula en el canvas DM mediante overlay de `MapViewport`.
6. Agregar el control cardinal en el panel derecho y conectar el cambio al estado de escena.
7. Sincronizar orientacion hacia Player View mediante el snapshot actual.
8. Implementar la rotacion visual de Player View en `PixiViewport`, preservando camara y coordenadas de mundo.
9. Agregar toggle discreto de brujula en `PlayerApp.tsx` y render condicional del overlay sin rotar la brujula del jugador.
10. Ejecutar validaciones y smoke manual de DM/Player View con al menos dos orientaciones.

## 7. Testing y verificacion

- **Unit tests:** helpers de orientacion, defaults en mapas nuevos/migrados, parseo de schema para escenas antiguas y rechazo/default de valores invalidos segun decision final.
- **Integration tests:** serializacion/carga de escena v2 con varios mapas y orientaciones distintas.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  - Abrir app con `pnpm dev`.
  - Crear/cargar escena con mapa.
  - Confirmar brujula DM arriba a la derecha.
  - Cambiar N/E/S/O desde panel derecho.
  - Abrir Player View y confirmar que el mapa rota para mantener norte hacia arriba.
  - Activar/desactivar toggle de brujula en Player View.
  - Cambiar entre dos mapas con orientaciones distintas y confirmar restauracion.

## 8. Riesgos y mitigaciones

- **Riesgo:** rotar Player View puede romper pan/zoom/camara si las conversiones pantalla-mundo no consideran la transformacion.
  **Mitigacion:** centralizar la rotacion en `PixiViewport`, agregar tests donde sea posible y hacer smoke manual con recentrado y navegacion entre mapas.
- **Riesgo:** el asset de brujula puede no quedar empaquetado en el DMG.
  **Mitigacion:** importarlo desde renderer o declarar el recurso en build, y validar `pnpm build`.
- **Riesgo:** una escena antigua sin campo nuevo podria fallar schema.
  **Mitigacion:** usar default `0` en Zod y cubrirlo con test de carga legacy/v2.
- **Riesgo:** la brujula puede tapar UI o capturar clicks del mapa.
  **Mitigacion:** overlay con tamano fijo, margen probado, opacidad ligera y `pointer-events: none` salvo en el toggle de Player View.

## 9. Criterios de aceptacion

- Cada mapa guarda y restaura su orientacion cardinal.
- Escenas antiguas cargan con orientacion default `0`.
- DM ve brujula en la esquina superior derecha del canvas cuando hay mapa activo.
- DM puede cambiar orientacion solo entre `N`, `E`, `S`, `O`.
- Player View rota la presentacion completa del mapa y contenido tactico segun la orientacion.
- Player View tiene toggle discreto para mostrar u ocultar la brujula.
- La brujula visible en Player View siempre apunta al norte de pantalla.
- Player View no permite editar la orientacion.
- Tests relevantes, typecheck, lint y build pasan.

## 10. Documentacion afectada

- `specs/30-map-compass/spec.md`
- `specs/30-map-compass/plan.md`
- `CHANGELOG.md` y `package.json` solo al cerrar la feature para release.

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
