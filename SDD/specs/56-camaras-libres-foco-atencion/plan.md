# Plan — 56 Cámaras libres y foco de atención

**Spec fuente:** [spec.md](spec.md). **Estado:** Implementada en rama; evidencia y límites en [validacion.md](validacion.md). **Base:** `fc57cda`, versión 3.19.1, checkout limpio al iniciar.

## Inspección y reutilización

- [PlayerApp.tsx](../../../src/renderer/src/PlayerApp.tsx): `applyPlayerCameraCommand` sustituye centro y zoom; `applySnapshot` adopta `snapshot.camera` al iniciar/cambiar `cameraSyncKey`; el candado empieza activado. El contenedor propio del mapa permite calcular su área útil sin el lateral.
- [App.tsx](../../../src/renderer/src/App.tsx): cámara principal, efectiva, revisiones, zoom remoto, recentrado y `movePlayerCameraToMap`; snapshot e inicialización dependen de esa cámara. Eliminar los emisores, no solo ocultar botones.
- [player-camera-control.ts](../../../src/domain/player/player-camera-control.ts): razones open/move/zoom/recenter/scene-change, comparación y previews. Reutilizar validación geométrica y límites de zoom propios; retirar autoridad remota y compensación de escala al cambiar mapa.
- [TableSession](../../../src/application/services/table-session.ts): conserva cámara/comando en state, elige principal y promociona conexiones. Mantener presencia/ready/imagen sin que promoción o bootstrap ordenen navegación; eventos de foco no se almacenan como último comando.
- [player-window-ipc.ts](../../../src/main/ipc/player-window-ipc.ts), [preload](../../../src/preload/index.ts): canales específicos y reenvío de cámara/comando al abrir. Sustituir esos caminos por operaciones tipadas de foco sin replay.
- [Mesa HTTP](../../../src/server/moderation-http.ts), [contratos](../../../src/shared/contracts/table.ts), [table-client](../../../src/infrastructure/browser/table-client.ts), [contextual-table-client](../../../src/infrastructure/browser/contextual-table-client.ts): negociación, sobre contextual, deduplicación, revalidación y SSE ya existentes. Mantener intactos dados y anotaciones negociadas.
- [Marco publicado](../../../src/domain/player/shared-drawing-frame.ts): reutilizar la comprobación de escena/mapa y geometría para impedir un foco en coordenadas del borrador privado.
- [PixiViewport](../../../src/render/pixi/PixiViewport.ts) y [MapViewport](../../../src/renderer/src/components/MapViewport.tsx): conversión pantalla/mundo, navegación, controles y previews antiguos. Reutilizar render y conversión para selección de punto y aro; no introducir otro motor de coordenadas.

## Decisiones por capa

| Capa | Trabajo previsto |
| --- | --- |
| Dominio | DTO de foco sin zoom; aplicación pura sobre cámara local, validación de posición y contexto; política de inicialización/transición de mapa sin cámara DM |
| Aplicación | Emitir foco efímero a todas las conexiones elegibles; idempotencia, secuencia, caducidad y limpieza; retirar estado/comparación de cámara principal como autoridad |
| Servidor | Endpoint específico DM y evento negociado; límites; rechazar control dirigido antiguo; autorización actualizada al entregar y aislamiento de mapas/aperturas |
| IPC/preload/contratos comunes | Función de envío y suscripción de foco tipadas, validación de sender, sin canal genérico y sin reenvío histórico al abrir |
| Adaptadores | Capacidad de foco separada de dibujos; sin fallback a zoom; caducidad/deduplicación por contexto y revisión; errores recuperables |
| PlayerApp | Zoom desbloqueado por defecto; cámara por cliente; foco cambia solo centro; cancelación segura de gesto y respeto del área útil del canvas |
| App/menús | Retirar control principal/virtual/zoom/recentrado; acción de foco por punto, contextual y centro de vista accesible por teclado; aviso de destinatarios no listos/compatibles |
| Render | Retirar iconos/previews antiguos y dependencias de sincronización; aro efímero, centro exacto con brújula; no tocar geometría confirmada |

No eliminar reportes/campos que se utilicen para readiness o diagnósticos antes de separar esos usos; tampoco conservarlos como cámara común escondida. Las pruebas deben detectar órdenes provenientes de rutas antiguas y snapshots, además del botón visible.

## Secuencia de implementación

1. Fijar contrato de foco y la negociación compatible con `annotationsVersion=1`; pruebas de centro/zoom, coordenadas y descarte por identidad/tiempo.
2. Separar inicialización local y cambio de contenido de órdenes de cámara en PlayerApp/App. Retirar herencia DM y compensación de zoom por grilla, preservando centro de entrada público en navegación entre mapas.
3. Implementar transporte HTTP/SSE y local IPC con entrega a todos los destinatarios listos; borrar reproducción de cámara/comando persistido. Conservar controles de autoridad, presencia y assets.
4. Conectar foco a la cámara local con lectura del zoom más reciente. Resolver drag/preview en curso, secuencias y caducidad sin repetir efectos al reintentar.
5. Reemplazar UI y overlays de SDD 24/32 por selección de foco, menú contextual, acción de teclado y marcador temporal; conservar controles de cámara propios y laterales.
6. Ejecutar matriz real de DM + dos jugadores y Electron local/servicio; comprobar diferencias de zoom, tamaño, brújula, reconexión, reemplazo de stream y expulsión concurrente.
7. Actualizar specs/guías vigentes al contrato implementado y registrar evidencia por criterio. Bump minor según AGENTS al completar la funcionalidad; no cambia versión de formato de escena.

## Matriz de validación

| Cobertura | Criterios | Pruebas |
| --- | --- | --- |
| Dominio/render | CA-02/03/09/11 | Aplicación exacta de centro, zoom actual sin mutación, transformación inversa a cuatro nortes, límites/bordes, región útil tras panel y resize |
| UI/PlayerApp | CA-01/04/05/06/10 | Adaptar tests de cámaras existentes; publicación no mueve; zoom desbloqueado; Escape cancela; herramientas y foco DOM preservados |
| Transporte | CA-07/08/12/14 | Idempotencia, caducidad/reloj desfasado, estado antiguo, focus+annotations negociados, cuotas y bootstrap sin replay |
| Autoridad | CA-08/13 | HTTP/SSE con SQLite y PostgreSQL real/TLS; DM ajeno, jugador emisor, expulsión/cierre/cambio de publicación durante entrega |
| Recorrido real | CA-01–14 | Navegador DM + dos jugadores a 0.5/1.5; cambio de zoom en vuelo, mapa 390 px, lateral abierto; Electron servicio y Player View nativo |

Reutilizar [player-camera-control.test.ts](../../../src/domain/player/player-camera-control.test.ts), [PlayerApp.tools.test.tsx](../../../src/renderer/src/PlayerApp.tools.test.tsx), [PlayerApp.map-image.test.tsx](../../../src/renderer/src/PlayerApp.map-image.test.tsx), [App.workspace.test.tsx](../../../src/renderer/src/App.workspace.test.tsx) y [contextual-table-client.test.ts](../../../src/infrastructure/browser/contextual-table-client.test.ts). Sustituir expectativas de cámara dirigida por pruebas de que ya no existe; no borrar regresiones de navegación, privacidad o carga.

Comandos durante construcción: `pnpm typecheck`, `pnpm lint`, `pnpm test --exclude '.local/**' --exclude 'tmp/**'`, `pnpm build:api`, `pnpm build:web`, `pnpm build` y `pnpm test:moderation` con entorno aislado preparado según [database.md](../../guias/database.md). No ejecutar contratos contra datos personales. Un fixture visual no sustituye sesiones autenticadas ni humo nativo. Registrar límites de entorno, sin reutilizar como aprobación la validación de SDD 55.

## Datos, compatibilidad y cierre

No hay migración SQL ni cambios a `.ttrpgscene`; no borrar datos ni sobrescribir configuraciones locales. Planificar actualización coordinada de clientes y API, conservando la experiencia base y mensajes de incompatibilidad durante mezcla de versiones. El transporte antiguo no queda como puerta trasera de zoom remoto.

Implementación autorizada por el usuario después de la propuesta. Trabajo en `feature/sdd-foco-atencion`, sin commit, merge ni push en esta fase. El cierre registrará pruebas ejecutadas y límites de validación; la autorización de implementar no equivale a autorización de integrar.

## Contrato técnico concretado

- `attention-focus.ts` define request estricto `{requestId, sceneId, frame, position}` y evento `{id, frame, position, issuedAt, expiresAt}`. `frame` serializa únicamente identidad de mapa/época y geometría pública; el sobre HTTP mantiene apertura, generación, contexto, revisión y secuencia. No contiene zoom ni destinatarios elegibles por el emisor.
- `POST .../table/focus` usa la autorización de mesa vigente, deduplicación de cinco minutos y body de 4 KiB. El runtime concede ráfaga de cuatro, reposición de dos por segundo y entrega solo a conexiones `focusVersion=1` listas. Revalida autoridad, revisión y caducidad al drenar SSE. Devuelve cantidades de ventanas destinatarias, incompatibles y todavía cargando.
- `focusVersion=1` se negocia independientemente de `annotationsVersion=1`. Ante un servidor anterior se retira primero la extensión de foco y luego, solo si es necesario, la de anotaciones. Ningún cliente nuevo ejecuta órdenes antiguas de cámara.
- `focusPlayers`/`onAttentionFocus` son capacidades opcionales en `TtrpgApi` para reconocer clientes anteriores. Preload expone canales específicos, sin replay; readiness nativo confirma el marco publicado. Las rutas antiguas permanecen solo para responder con un error recuperable.
- El foco cancela captura de puntero, actualizaciones pendientes y previews antes de centrar. Las formas confirmadas permanecen. Un aro estático de 1,5 segundos marca el punto; no depende de animación ni se persiste.
- La cámara se inicializa con dimensiones del mapa y área útil local. `playerEntryPoint` es un dato opcional de publicación para enlaces entre mapas; `mapNavigationKey` distingue una nueva navegación incluso cuando dos escenas reutilizan el mismo ID de mapa; no forma parte del JSON de escena guardado. En navegación se conserva el zoom numérico, y una recreación del canvas en el mismo mapa conserva también el centro efectivo.


## Resultado

Código preparado en 3.20.0. La barra conserva zoom/centrado propios del DM y ofrece **Foco** y **Centro**, accesibles con teclado. Los controles principal/virtual dejan de conectarse al renderer; los helpers históricos de cálculo de preview permanecen internos sin emisores de UI. La inicialización local utiliza las dimensiones reales de la textura cuando una escena antigua no incluye `imageSize`, siempre que el jugador todavía no haya navegado.

Consulta [validacion.md](validacion.md) para distinguir ensayos automáticos, prueba visual aislada y matriz de aceptación todavía pendiente. No se generó DMG porque no se ha solicitado integrar esta rama.
