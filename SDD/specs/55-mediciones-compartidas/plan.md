# Plan — Mediciones y áreas compartidas

**Spec fuente:** [spec.md](spec.md). **Estado:** Integrada en main (`90dc50e`), versión 3.19.1; evidencia y pendientes en [validacion.md](validacion.md).
**Base inspeccionada:** `3760968` en main, versión 3.18.1; rama documental `feature/sdd-mediciones-compartidas`, inicialmente limpia.

## Reutilización y archivos afectados al implementar

| Capa | Base existente | Cambio previsto |
| --- | --- | --- |
| Geometría | [shapes.ts](../../../src/domain/shapes/shapes.ts), tipos de escena y medición | Reutilizar transformaciones/cálculos; no añadir autor al documento portable |
| Casos de uso | [table-session.ts](../../../src/application/services/table-session.ts), [game-runtime.ts](../../../src/application/services/game-runtime.ts) | Registro efímero separado de figuras confirmadas/previews, ownership, revisiones y lifecycle |
| Autoridad | [moderation.ts](../../../src/application/services/moderation.ts), [invitations.ts](../../../src/application/services/invitations.ts) | Resolver alias/autor desde admisión; retirada al salir/expulsar/expirar sin romper supervivientes |
| Contratos | [table.ts](../../../src/shared/contracts/table.ts), [moderation.ts](../../../src/shared/contracts/moderation.ts) | DTO específico y schemas estrictos de extensión negociada, eventos/estado/errores |
| Servidor | [moderation-http.ts](../../../src/server/moderation-http.ts), [moderation-backend.ts](../../../src/server/moderation-backend.ts) | Comandos por audiencia; mismas cuotas, revalidación, cancelación y SSE existentes |
| Cliente | [contextual-table-client.ts](../../../src/infrastructure/browser/contextual-table-client.ts) y contrato común de clientes | Capacidad explícita, estado separado, coalescing, reconciliación y limpieza terminal |
| Jugador | [usePlayerTools.ts](../../../src/renderer/src/hooks/usePlayerTools.ts), [PlayerApp.tsx](../../../src/renderer/src/PlayerApp.tsx), PlayerTools | Separar gesto local de modelo compartido; conservar adapter local en Electron autónomo |
| DM | [App.tsx](../../../src/renderer/src/App.tsx), [GameEditor.tsx](../../../src/web/GameEditor.tsx) | Componer overlay sin mutar scene.shapes; selección y retirada independientes de deshacer/inspector |
| Render | [MapViewport.tsx](../../../src/renderer/src/components/MapViewport.tsx), Pixi | Reutilizar figuras/manivelas; permitir IDs editables propios y metadatos visuales de autor separados |

Los nombres de archivos nuevos pueden seguir la estructura actual; no agregar un segundo motor geométrico. `usePlayerTools` mezcla hoy estado y operaciones de UI: extraer un adaptador común local/compartido, no duplicar todos sus callbacks. El render debe recibir la etiqueta validada y permisos de interacción, sin resolver identidad ni autorizar red.

## Diseño del contrato propuesto

Crear DTO `SharedAnnotation` independiente de `SceneShape`: ID opaco, revisión, contexto, geometría permitida y `author: {publicId, alias, discriminator}`. Registro interno conserva participante propietario; nunca enviarlo como roster ni aceptar `author` en la entrada. Reducir la geometría a campos del tipo elegido y reutilizar sus validadores. Distancia/etiqueta de autor son derivadas; no aceptar texto libre de una figura.

Bajo `/api/v1/games/:gameId/table/annotations`, comandos de jugador para `create`, `update`, `delete`, `clear-own`, `preview` y `cancel-preview`. Bajo `/api/v1/dm/games/:gameId/table/annotations`, únicamente `delete` y `clear-all` de esta capa. Reutilizar envoltura contextual, `requestId` y validación de cuerpo; las actualizaciones/borrados incluyen revisión esperada. El cliente propone un UUID; el servidor valida colisiones, propiedad, tombstones y requestId. Confirmar retira el preview activo del autor. No implementar un PUT de colección arbitraria.

La negociación `annotationsVersion=1` se valida en las queries de `table/state` y `table/events` de ambas audiencias. Estado/bootstrap devuelve confirmación de versión, secuencia y colección separada; eventos de extensión solo a conexiones que la negociaron. El cliente verifica la confirmación antes de habilitar escritura. No elevar el protocolo externo de todos los consumidores ni emitir eventos desconocidos al cliente antiguo.

Capturar bootstrap y enlazar eventos usando la frontera de serialización existente: incluir lo que se confirmó antes del corte y transmitir lo posterior exactamente una vez lógicamente. Separar revisión por figura, secuencia de capa y secuencia SSE. No hacer depender cada movimiento de la revisión global del roster ni publicar snapshots completos de escena por movimiento.

Confirmar geometría después de revalidar apertura/participante y antes de difundir. Los callbacks posteriores al commit/autorización no deben crear una ventana que permita a una expulsión devolver éxito mientras todavía se emiten dibujos del expulsado. Retirada, limpieza, cambio de contexto y cierre cancelan previews y operaciones en curso; IDs borrados no aceptan updates tardíos. Deduplicación y tombstones reutilizan presupuestos acotados del runtime.

## Persistencia y compatibilidad

No se prevén tablas ni migraciones nuevas: el overlay es efímero. Alias y autoridad se leen de la identidad invitada existente en el motor configurado. Por eso se verifican las carreras con SQLite y PostgreSQL, aunque no cambie el esquema.

No cambia `.ttrpgscene` v2 ni su lectura/migración v1, ni el paquete operativo v3. El snapshot persistible/privado y su proyección base conservan sus contratos; la extensión viaja fuera de la escena. Electron local conserva PlayerIPC y shapes locales. No agregar dependencia externa, acceso privilegiado renderer ni nuevo socket de eventos.

## Secuencia de trabajo propuesta

1. **Dominio y contrato:** fijar DTO, geometría admitida, límites y operaciones, con casos de propiedad, concurrencia, cancelación e idempotencia (CA-02/03/05/12).
2. **Runtime y HTTP/SSE:** registrar overlay por contexto, negociación de extensión, bootstrap consistente y autorización por participante; integrar terminales y retirada en moderación (CA-04/07/08/09/13).
3. **Adaptador:** exponer capacidad y estado compartido tipados; throttle de previews, comando final fiable, respuestas obsoletas y recuperación. Pruebas de compatibilidad con cliente/servidor sin extensión.
4. **Jugador y DM:** conectar operaciones existentes al adapter, componer capa separada, limitar edición y añadir acciones de retirada DM. Probar que publicar/guardar/cambiar selección no borra ni persiste overlay (CA-01/02/06).
5. **Autor visual:** etiquetas ancladas, legibilidad y accesibilidad, medidas calculadas con el mismo sistema. Probar hexágonos, brújula, cámaras distintas y pantallas pequeñas (CA-10/11).
6. **Regresión y entrega:** recorridos reales con DM y dos invitados, pruebas de expulsión concurrente/reconexión y humo Electron local/servicio. Actualizar guías y registrar evidencia por criterio antes de revisión factory.

Estas son fases de una spec, no trabajos factory iniciados ni autorizaciones de integración. Si se divide su construcción, conservar los 14 criterios y dependencias explícitas antes de abrir expedientes.

## Validación prevista

| Grupo | Cobertura y evidencia |
| --- | --- |
| Unitarias de dominio/runtime | Tipos de figuras, grilla/unidades, ownership, dos autores, revisiones, idempotencia, límites, preview TTL y cancelación; reloj controlado |
| HTTP/SSE real | Cookie invitada/DM, host/origin, admisión expirada, mutaciones ajenas, IDs cruzados, bootstrap concurrente, ACK perdido, buffers lentos y negociación |
| Contratos SQLite/PostgreSQL | Expulsión/salida/cierre/cambio de generación durante requests en vuelo; alias obtenido desde identidad vigente; ninguna entrega posterior al ACK de revocación |
| Adaptador/UI | Estado remoto separado, no duplicación local/eco, borrado, offline, recuperación, etiquetas, foco/teclado y confirmación de limpiar DM |
| Navegador/Electron servicio | Tres sesiones independientes; línea, camino y cuatro áreas; cámaras distintas; autor repetido/largo; grabación/evidencia del preview y resultado |
| Electron autónomo | Herramientas continúan locales; selección/limpiar no cambia escena, guardar/cargar y Player View sin regresión |

Comandos base a ejecutar **durante implementación**, ajustando la selección a los archivos nuevos:

```bash
pnpm typecheck
pnpm lint
pnpm test --exclude '.local/**' --exclude 'tmp/**'
pnpm build:api
pnpm build:web
pnpm build
pnpm test:moderation
```

`test:moderation` requiere API compilada y PostgreSQL real con TLS además de SQLite aislado; seguir las restricciones de [database.md](../../guias/database.md), incluido el checkout de pruebas sin `.env` operativo. No ejecutar pruebas contra datos personales. Los excludes del test general evitan descubrir copias de pruebas antiguas en respaldos/temporales, no omiten suites fuente. Seleccionar también `test:invitations` si se cambia su lifecycle.

Regresiones concretas existentes: [PlayerApp.tools.test.tsx](../../../src/renderer/src/PlayerApp.tools.test.tsx), [MapViewport.local-tools.test.tsx](../../../src/renderer/src/components/MapViewport.local-tools.test.tsx), [local-shape-interaction.test.ts](../../../src/render/pixi/local-shape-interaction.test.ts), [contextual-table-client.test.ts](../../../src/infrastructure/browser/contextual-table-client.test.ts) y contratos de [moderación](../../../src/infrastructure/server/moderation).

## Documentación y cierre

Actualizar specs 07, 15, 39, 41, 44 y 50, las guías de clientes/mesa/moderación y el estado actual **al implementar**, sustituyendo únicamente las restricciones del servicio. Mantener la regla local Electron. Registrar versión minor una vez por entrega según AGENTS; la negociación de red no cambia versión del formato de escena.

El usuario autorizó implementar. Se completaron contrato, registro efímero, HTTP/SSE, adaptador, herramientas de jugador, controles DM y etiquetas Pixi. El estado incluye `sceneId` del origen porque la proyección pública usa el ID del mapa; las medidas se derivan en servidor con las reglas publicadas. Los IDs públicos del autor son distintos de los IDs de participantes.

Decisión de implementación: «Ver mapa publicado» abre un visor de solo lectura en un diálogo. Conserva el borrador del DM y no requiere navegar, publicar ni sustituir su escena. El gesto local no se reemplaza con el eco de su preview; para ediciones remotas se conserva también la geometría confirmada. La cota agregada del overlay es 512 KiB, además de los límites de figuras/vertices y comandos del contrato.

La construcción inicial preparó 3.19.0 sin integración; el usuario autorizó cerrar la rama y generar el patch 3.19.1, que incluye los ajustes de laterales, chevrón y etiquetas. No se añadió un trabajo ficticio a `factory/board.json`. Los gates y sus límites se registran en [validacion.md](validacion.md); no confundir compilación con recorrido visual ni el test SQLite con certificación PostgreSQL.

El cierre incorpora CA-15–18 en la spec y las extensiones de 15/39. Secuencia de entrega: suite fuente completa, lint/typecheck, compilaciones API/web, commit autorizado, integración en main (no existe master), ejecución de `scripts/build-dmg.sh` y registro de evidencia final. No requiere cambios de DB, migraciones ni reinicio de la API operativa.
