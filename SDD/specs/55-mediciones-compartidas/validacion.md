# Validación — SDD 55

Fecha: 2026-11-04. Rama de construcción: `feature/sdd-mediciones-compartidas`. Base funcional: **3.19.0**; cierre solicitado: **3.19.1**. Implementación e integración directas autorizadas por el usuario; no se simula aprobación de factory. La evidencia inicial se conserva debajo.

## Resultado

La capa compartida está implementada para clientes del servicio. Mantiene las formas del DM y el estado local Electron separados. El servidor valida autoría, geometría, contexto y revisión; conserva confirmados durante reconexión y retira dibujos al salir/ser expulsado. El cliente negocia la extensión, coalesce previews, invalida la cola al desconectar y recupera el estado después de conflictos.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| `pnpm typecheck` | Pasa |
| `pnpm lint` | Pasa |
| `git diff --check` | Pasa |
| `pnpm test --exclude '.local/**' --exclude 'tmp/**'` | **142 archivos / 1278 pruebas pasan** |
| Dominio/HTTP/adaptador/hook tras añadir vencimiento local offline | **4 archivos / 14 pruebas pasan** |
| HTTP/SSE y carrera de expulsión adicionales | **1 archivo / 2 pruebas pasan** |
| Pruebas de render/hook tras el ajuste visual final | **2 archivos / 36 pruebas pasan** |
| `pnpm build:api` | Pasa |
| `pnpm build:web` | Pasa; aviso de chunks grandes existente |
| `pnpm build` | Pasa; compilación Electron, no DMG ni ejecución nativa |
| `pnpm test:moderation` | **Bloqueado por entorno**: sus 8 suites no inician al faltar PostgreSQL temporal real con TLS; no equivale a 8 fallos funcionales ni a un gate aprobado |

La suite general excluye copias de pruebas en respaldos locales, no suites fuente. Los contratos `.contract.ts` requieren sus comandos específicos. JSDOM avisa que no implementa Canvas; la comprobación visual siguiente sí utiliza Pixi en navegador.

### Dominio, autoridad y red

- [Registro efímero](../../../src/application/services/shared-annotations.test.ts): autoría pública, dos autores, propiedad, permisos DM, revisiones, tombstones, colisiones, preview/edición, TTL, desconexión, credenciales supervivientes, cuotas, limpieza y separación de escena. Cambio de reglas cancela previews y el cambio de contexto vacía la capa.
- [HTTP/SSE real con SQLite temporal](../../../src/server/shared-annotations.test.ts): API escuchando en loopback, DM y dos invitados con cookies independientes; difusión, ACK repetido, suplantación denegada, autor público distinto de participantId, edición ajena 403, revisión vieja 409, bootstrap/reconexión, expulsión y limpieza DM. Una segunda prueba pausa la autorización de un comando en vuelo, expulsa antes de reanudar y verifica que no haya confirmación ni difusión posterior al ACK. Diez ediciones consecutivas se observan en las tres conexiones en menos de 500 ms cada una. Esta medición no certifica latencia de internet ni carga de producción.
- [Adaptador](../../../src/infrastructure/browser/shared-annotations.test.ts): negociación, servidor antiguo que rechaza la query, reintento con mismo requestId tras ACK perdido, secuencias antiguas, desconexión/limpieza y rechazo de propiedad sin expulsar al cliente.
- [Contrato para ambos motores](../../../src/infrastructure/server/moderation/shared-annotations.contract.ts): incluido en `test:moderation`, pendiente de ejecución con entorno PostgreSQL/TLS. Verifica también una credencial superviviente no observada por SSE; la autoridad interna obtiene el vencimiento máximo válido desde el repositorio.

### Interfaz y render

- [Hook y herramientas](../../../src/renderer/src/hooks/useSharedAnnotations.test.tsx): creación/movimiento/limpieza propia, escena intacta, alias hostil como texto, coalescing y keepalive, desconexión sin replay, vencimiento visual sin recibir retirada del servidor (usando tiempo relativo de servidor para evitar desfase del reloj cliente), Escape, Delete durante escritura y confirmación DM.
- [Pixi](../../../src/render/pixi/local-shape-interaction.test.ts): etiquetas de todas las geometrías, texto abreviado y medida, contrarrotación, transparencia de preview, retirada de capa y regresiones de edición local.
- [Marco publicado](../../../src/domain/player/shared-drawing-frame.test.ts): no depende del ID de escena de la proyección pública; bloquea otra escena/calibración y permite cámaras, imagen y aspecto de grilla diferentes.
- Navegador integrado real: visor con los componentes de producto, cinco geometrías y nombres largos, usando una fixture visual aislada. Se verificaron etiquetas de dos líneas, visor de solo lectura, Escape, nombre completo accesible en panel y ancho de **390 px** (lienzo efectivo de 356 px dentro del diálogo). Sin errores de consola. Se corrigieron el solapamiento de etiquetas y el ancho intrínseco del canvas encontrados en esa inspección. La fixture no sustituye un recorrido autenticado completo.

## Límites pendientes antes de aceptación completa

1. Ejecutar `test:moderation` con PostgreSQL temporal real, SCRAM/TLS y checkout de pruebas sin `.env` operativo. La configuración/binarios temporales de sesiones anteriores ya no están disponibles; no se modificó el servicio ni la DB del usuario para sustituirlos. Seguir [database.md](../../guias/database.md).
2. Completar el recorrido visual autenticado DM + dos jugadores, incluyendo Electron servicio, y un humo nativo Electron autónomo. Esta sesión comprobó red real con tres clientes HTTP/SSE, render en navegador con fixture y regresiones automatizadas; no afirma haber ejecutado tres ventanas autenticadas ni Electron nativo.
3. Extender el gate de carreras a publicación/bootstrap y buffers lentos específicos de anotaciones en ambos motores. Se reutiliza la frontera de entrega autorizada existente, pero no se certifican aquí todas las carreras de CA-07/08/12/13.

Estos límites impiden declarar los 14 criterios completamente aceptados. El código y los builds quedan preparados para revisión; no se alteró `factory/board.json`, no se tocó la DB/env del usuario y no se reinició su API en ejecución.

## Ajuste posterior — controles de mesa en el lateral

Los menús del DM «Mesa · jugadores» y «Dibujos de jugadores» pasan a la pestaña Mesa del inspector derecho, junto a Propiedades y Dados. Se conservan montados al alternar pestañas; las autorizaciones, suspensión de acceso y confirmaciones siguen en LiveEditor. El ajuste siguiente extiende la disposición lateral a la vista del jugador.

- 5 suites fuente / 69 pruebas pasan: workspace, pestañas/dados, autoridad de GameEditor, GameEditor y anotaciones. Incluyen navegación por teclado con la tercera pestaña y conservación del estado al alternar paneles.
- Typecheck, lint y builds web/Electron pasan. Continúa el aviso existente de tamaño del bundle web.
- Inspección en navegador con App y SharedDrawingPanel reales y datos de mesa de prueba: escritorio y 390 × 844 px. Ambos menús expandidos quedan contenidos en el inspector; cabecera y herramientas permanecen accesibles. La fixture temporal se eliminó al terminar. Esta comprobación de disposición no sustituye los recorridos autenticados pendientes descritos arriba.

### Lateral retráctil del jugador

Alias/discriminador, sistema, conexión, salida y dibujos se reúnen en el lateral derecho del jugador. Conserva el árbol del mapa al contraerlo; los informes de cámara miden el espacio real del mapa, descontando el lateral en escritorio. En móvil comienza cerrado y deja accesibles los controles inferiores. Escape desde el lateral devuelve el foco al botón Mesa; Delete dentro del panel no borra figuras.

Validación: 4 suites fuente / 54 pruebas pasan (PlayerApp herramientas e imágenes, workspace y anotaciones), typecheck y lint pasan, builds web y Electron preparados. Inspección con PlayerApp/Pixi reales y datos de mesa de prueba en escritorio y 390 × 844 px; apertura, contracción, Escape y foco comprobados. Se retiró la fixture temporal. Se mantienen los límites de validación autenticada/PostgreSQL anteriores.

Ajuste del control de apertura: pestaña con chevrón en el borde superior derecho, igual al inspector DM, reemplazando el botón inferior y el cierre interno duplicado. Verificado abierto/cerrado en escritorio y 390 px; 12 pruebas de PlayerApp pasan, junto con lint, typecheck y builds web/Electron.

## Preparación del cierre 3.19.1

Autorización: «Escribe todo lo extra que no esté dentro de los specs y cierra esta rama a master y genera una nueva patch». Se resuelve la rama principal como `main`: no existe `master` local/remota. La versión sube de 3.19.0 a 3.19.1 para los ajustes de interfaz; no cambia el formato de escena ni el esquema de DB.

Validación previa a la integración: suite fuente completa **142 archivos / 1282 pruebas**, lint, typecheck y builds API/web correctos. Se conserva el aviso de tamaño de bundles. Los límites PostgreSQL/TLS y de recorridos autenticados antes descritos permanecen abiertos: no se convierten en aprobados por la orden de cierre. No se modifica el tablero histórico ni se ejecutan migraciones sobre datos del usuario.
