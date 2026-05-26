# Plan de implementacion tecnica - 20 Combat Turn Tracker

## 1. Resumen

- **Spec fuente:** `./specs/20-combat-turn-tracker/spec.md`
- **Objetivo:** Implementar un turnero de combate persistido en escena, configurable desde un modal con participantes de escena y visible tanto en DM como en ventana de jugador.
- **Estado:** Draft
- **Prioridad:** Alta
- **Dependencias:** `15-player-window`, `16-entities`, `03-scene-persistence`, arquitectura de overlays React sobre viewport y protocolo de imagenes del aside.

## 2. Alcance

### Incluido

- Tipos de dominio para `CombatTracker` y participantes.
- Reglas puras para iniciar batalla, avanzar turno, eliminar/reincorporar y calcular siguiente activo.
- Extension del schema `.ttrpgscene` con `combatTracker` default inactivo.
- UI en DM para abrir modal `Iniciar batalla`.
- Modal de configuracion con candidatos de monstruos, NPCs y personajes jugadores.
- Drag and drop para armar y reordenar turnero.
- Captura manual de iniciativa por participante y visualizacion de iniciativa en listados/barra.
- Control de rondas, iniciando en ronda `0`.
- Edicion de batalla activa para agregar participantes tardios que entran desde la siguiente ronda.
- Botones alternativos para agregar/quitar/reordenar si se decide cubrir accesibilidad basica desde el MVP.
- Barra de turnos sobre el mapa en DM y player.
- Controles de DM: `Siguiente`, eliminar/reincorporar, terminar batalla.
- Boton/componente explicito `Finalizar batalla` que limpia el estado de combate, oculta la barra y deja el turnero en blanco para la siguiente batalla.
- Vista de jugador solo lectura del turnero.
- Sincronizacion con player window mediante snapshot de escena existente.
- Guardado/carga de batalla activa en `.ttrpgscene`.

### Fuera de alcance

- Tiradas automaticas de iniciativa.
- Tracking de HP, condiciones, rondas o temporizadores.
- Integracion automatica con tokens o posiciones del mapa.
- Multiples combates simultaneos.
- Persistencia SQLite de encuentros.
- Edicion desde player window.

## 3. Decisiones tecnicas

- **Arquitectura:** La logica del turnero vive en `domain/combat` como reglas puras. El renderer solo orquesta UI y aplica cambios al documento de escena. La ventana de jugador renderiza el mismo estado en modo read-only.
- **Persistencia:** Agregar `combatTracker` a `SceneDocumentV1` y al schema Zod con default inactivo. No usar SQLite.
- **IPC / Electron:** No se requieren nuevos canales si el turnero viaja en el snapshot de escena existente. La player window ya recibe cambios por `publishPlayerScene`.
- **Render / PixiJS:** No tocar PixiJS. La barra de turnos es React/HTML overlay sobre el viewport.
- **Validacion:** Zod valida `combatTracker`, participantes y `currentParticipantId`. Dominio valida reglas de inicio y avance.
- **Dependencias nuevas:** Evaluar `@dnd-kit/core` + `@dnd-kit/sortable` para drag and drop. Es una libreria conocida, ligera y mantenible para sortable lists en React. Si se prefiere evitar dependencia, implementar drag and drop nativo HTML5 como fallback.

## 4. Diseno de dominio

### Entidades / tipos

- `CombatParticipantType = "monster" | "npc" | "playerCharacter"`
- `CombatParticipant`
- `CombatTracker`
- `CombatCandidate` para candidatos derivados del aside de escena.
- `initiative`, `round`, `enteredRound` y `activeFromRound` como parte del modelo de combate.

### Reglas puras

- `createDefaultCombatTracker()`.
- `createCombatCandidates(sceneAside)`.
- `createCombatParticipant(candidate)`.
- `startCombat(participants)`.
- `endCombat(tracker)`.
- `advanceTurn(tracker)`.
- `markParticipantDefeated(tracker, participantId, defeated)`.
- `addParticipantDuringCombat(tracker, participant)`.
- `isParticipantActiveInRound(participant, round)`.
- `activatePendingParticipants(tracker)` si se decide materializar el cambio de estado al iniciar ronda.
- `getCurrentParticipant(tracker)`.
- `getNextActiveParticipant(tracker)`.
- `reorderParticipants(tracker, fromId, toIndex)` o helper equivalente.
- `validateStartCombatParticipants(participants)`.

### Coordenadas / unidades

No aplica. El turnero es UI overlay y no usa coordenadas de mundo ni medidas de mapa.

### Errores de dominio

- Menos de dos participantes al iniciar.
- Participante duplicado por `entityType + entityId`.
- `currentParticipantId` inexistente.
- Intentar avanzar sin participantes activos.
- Iniciativa invalida o vacia.
- Ronda de entrada invalida.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/combat/combat-tracker.ts`.
- Definir tipos y helpers puros.
- Agregar tests unitarios:
  - no inicia con menos de dos participantes;
  - no permite duplicados;
  - avanza circularmente;
  - salta eliminados;
  - conserva/elimina turno actual segun reglas al marcar derrotado;
  - calcula siguiente activo.

### `application`

- No se requieren casos de uso nuevos para MVP.
- Si la actualizacion de escena ya tiene helpers centralizados, agregar funciones de escena para aplicar `combatTracker` sin duplicar logica en componentes.

### `infrastructure`

- Sin cambios de DB.
- Sin filesystem nuevo.

### `main`

- Sin nuevos handlers esperados.
- Confirmar que el snapshot publicado a player incluye `combatTracker` tras extender el tipo de escena.

### `preload`

- Sin API nueva esperada.
- Actualizar tipos compartidos si `SceneDocument` cambia y afecta imports.

### `renderer`

- Agregar boton/componente `Iniciar batalla` o `Batalla activa` en la UI del DM.
- Crear `CombatSetupModal`:
  - lista de disponibles;
  - lista de turnero;
  - campo `Iniciativa` por participante;
  - drag and drop;
  - modo edicion de batalla activa;
  - participantes tardios con `enteredRound` y `activeFromRound`;
  - validacion de minimo dos plazas;
  - inicio/cancelacion.
- Crear `CombatTurnBar`:
  - props `tracker`, `viewRole`, callbacks opcionales de DM;
  - render horizontal centrado arriba;
  - indicador de ronda actual;
  - participante compacto con solo retrato vertical, aproximadamente 16:9 vertical, y badge de iniciativa visible;
  - tamano de retrato cercano a `90 x 131px` para que se lea bien en proyeccion;
  - badge arriba a la derecha, sin recorte por overflow;
  - tooltip de nombre al hover en DM y player;
  - tooltip fuera de contenedores con clipping para funcionar tambien en player window;
  - nombre oculto por defecto para no ensuciar la barra;
  - estado actual mas grande;
  - siguiente activo con halo plateado titilante;
  - eliminados en escala de grises.
  - participantes pendientes diferenciados visualmente.
  - en DM, expansion lateral derecha por click sobre participante para mostrar `🗑 Eliminar`/`↩ Reincorporar`;
  - accion `Finalizar batalla` solo en DM, conectada a reset total del `CombatTracker`.
- Integrar `CombatTurnBar` en vista DM y player.
- En DM, conectar callbacks:
  - `onNextTurn`;
  - `onToggleDefeated`;
  - `onEndCombat`, que debe setear `createDefaultCombatTracker()`, cerrar el editor si esta abierto y ocultar la barra en DM/player.
  - `onEditCombat`.
- En player, render solo lectura.
- Resolver imagenes de participantes con `resolveAsideUrl` y cache local similar a entidades.

### `render`

- Sin cambios PixiJS.
- Asegurar z-index del overlay por encima del mapa/canvas pero por debajo de modales.

## 6. Plan de trabajo

1. Crear dominio `combat-tracker` con tipos, factory default y reglas puras.
2. Agregar tests unitarios de avance, eliminados, duplicados, minimo de participantes, rondas y participantes tardios.
3. Extender `SceneDocumentV1`, default scene y schema Zod con `combatTracker`.
4. Ajustar tests de escena para defaults y compatibilidad con escenas antiguas.
5. Crear derivacion de candidatos desde `sceneAside.monsters`, `sceneAside.npcs` y `sceneAside.playerCharacters`.
6. Implementar `CombatSetupModal` con lista de disponibles, lista ordenada de turnero y captura de iniciativa.
7. Agregar drag and drop o, si no se introduce dependencia, DnD nativo con botones auxiliares.
8. Agregar boton `Iniciar batalla`/`Batalla activa` en DM.
9. Implementar `CombatTurnBar` como overlay React.
10. Conectar acciones DM para siguiente, eliminar/reincorporar, editar batalla y finalizar batalla con reset completo.
11. Renderizar `CombatTurnBar` en player window sin controles.
12. Verificar que cambios de turno se publiquen al player mediante snapshot de escena.
13. Ejecutar tests, typecheck, build y smoke manual.

## 7. Testing y verificacion

- **Unit tests:** dominio de turnero: inicio, duplicados, avance circular, salto de eliminados, siguiente activo.
- **Unit tests adicionales:** incremento de ronda, participantes agregados en ronda `N` activos desde `N + 1`, iniciativa requerida y visible en modelo.
- **Integration tests:** schema de escena parsea escenas antiguas con default inactivo y preserva turnero activo al guardar/cargar.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:**
  - crear escena con monstruos, NPCs y personajes;
  - abrir modal de batalla;
  - armar turnero con al menos dos participantes;
  - capturar iniciativa;
  - iniciar batalla;
  - avanzar turnos en DM;
  - verificar incremento de ronda;
  - agregar un participante durante combate y confirmar que entra en la siguiente ronda;
  - eliminar y reincorporar participantes;
  - abrir player window y confirmar barra sincronizada sin controles;
  - guardar/cargar escena y confirmar batalla activa.

## 8. Riesgos y mitigaciones

- **Riesgo:** Drag and drop complejo o fragil dentro de modal.
  **Mitigacion:** Usar `@dnd-kit` o agregar botones auxiliares para agregar/quitar/reordenar, de forma que el flujo no dependa exclusivamente de DnD.

- **Riesgo:** Overlay tapa zonas importantes del mapa.
  **Mitigacion:** Mantener barra compacta, centrada arriba, con ancho maximo y scroll horizontal si hay muchos participantes.

- **Riesgo:** La player window no recibe cambios de turno si el estado no viaja en escena.
  **Mitigacion:** Persistir `combatTracker` dentro de `SceneDocument` y verificar publicacion existente de snapshots.

- **Riesgo:** Imagenes locales no se resuelven correctamente en player.
  **Mitigacion:** Reutilizar `resolveAsideUrl`/protocolo seguro y fallback visual por tipo de participante.

- **Riesgo:** Escenas viejas fallan al cargar.
  **Mitigacion:** Schema con default inactivo y tests de compatibilidad.

## 9. Criterios de aceptacion

- [ ] Existe boton/componente para iniciar batalla en DM.
- [ ] El modal lista monstruos, NPCs y personajes jugadores presentes en escena.
- [ ] El DM puede armar y reordenar turnero con drag and drop.
- [ ] El DM puede capturar iniciativa por participante.
- [ ] La iniciativa aparece en el modal y en la barra.
- [ ] La barra muestra cada participante como retrato vertical compacto, 16:9 vertical, con badge de iniciativa.
- [ ] Los retratos usan un tamano legible en proyeccion, cercano a `90 x 131px`.
- [ ] El badge aparece arriba a la derecha y no se recorta.
- [ ] El nombre aparece como tooltip al hover en DM y player.
- [ ] En DM, click sobre participante expande hacia la derecha su accion de `🗑 Eliminar`/`↩ Reincorporar`.
- [ ] No se puede iniciar batalla con menos de dos participantes.
- [ ] La barra de turnos aparece en DM y player tras iniciar.
- [ ] La barra muestra la ronda actual.
- [ ] Solo DM ve controles de `Siguiente`, eliminar/reincorporar y terminar batalla.
- [ ] `Finalizar batalla` limpia participantes, ronda y turno actual, oculta barra/controles y deja el siguiente inicio en blanco.
- [ ] `Siguiente` avanza circularmente y salta eliminados.
- [ ] `Siguiente` incrementa ronda al completar una vuelta.
- [ ] El DM puede editar una batalla activa.
- [ ] Participantes agregados durante ronda `N` quedan pendientes y entran desde ronda `N + 1`.
- [ ] Cada participante registra la ronda en que entro.
- [ ] Eliminados permanecen visibles en blanco y negro.
- [ ] Participante actual se ve mas grande.
- [ ] Siguiente activo tiene halo plateado titilante.
- [ ] Guardar/cargar `.ttrpgscene` preserva batalla activa.
- [ ] Player window se actualiza con cambios de turno.
- [ ] Tests relevantes pasan.
- [ ] `pnpm typecheck` y `pnpm build` pasan.

## 10. Documentacion afectada

- `./specs/20-combat-turn-tracker/spec.md`
- `./specs/20-combat-turn-tracker/plan.md`
- `CHANGELOG.md` al implementar/cerrar el feature.
- Specs de player window o scene persistence solo si durante implementacion cambia una decision transversal.

## 11. Checklist de cierre

- [ ] Implementacion completada dentro del alcance.
- [ ] Tests relevantes agregados o actualizados.
- [ ] `pnpm typecheck` ejecutado.
- [ ] `pnpm lint` ejecutado.
- [ ] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [ ] Documentacion actualizada si cambio una decision.
- [ ] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [ ] Sin dependencias nuevas no justificadas.
