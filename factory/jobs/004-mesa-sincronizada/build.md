# Construcción 004 — Mesa sincronizada privada

Fecha: 2026-10-29. Ciclo 2, corrección para ronda global 3. Constructor: `constructor_004`. Rama comprobada: `feature/fabrica-software`. Versión 3.5.0; bump minor y changelog únicos. Sin staging, commits, push, merge, cambio de rama ni DMG. Conserva los cambios acumulados de 001–003.

## Resultado y arquitectura

HTTP y SSE reales conectan DM y Player usando el mismo frontend y motor de dados. `publicTableProjection` reconstruye el documento público y deriva el conjunto de assets autorizados; `TableSession` concentra las transiciones efímeras, presencia, revisión, contexto y deduplicación. El adaptador HTTP valida sesión/rol/DTO y sirve streams por audiencia. `BrowserTableClient` comparte un stream, serializa comandos y descarta respuestas de sesiones anteriores. El frontend conserva las vistas, herramientas locales, modales y transporte Electron existentes.

Archivos principales de 004:

- `src/shared/contracts/table.ts`: DTO HTTP/SSE tipados.
- `src/application/services/public-table-projection.ts`, fixture y pruebas: lista explícita de campos públicos y referencias autorizadas.
- `src/application/services/table-session.ts`: proyección, contexto, presencia y DiceRollSession reutilizada.
- `src/server/table-http.ts`, `http.ts`, `table-http.test.ts`: rutas, SSE, revocación y autorización de assets.
- `src/infrastructure/browser/table-client.ts`, `http.ts`, `browser-client.ts` y pruebas: transporte real, ciclo de sesión, recuperación y capacidades.
- `src/web/ServiceApp.tsx`, `service.css`: conexión jugador, enlace seleccionable sin credenciales, estado compacto y feedback de copia.
- `App.tsx`, `App.workspace.test.tsx`, `PlayerApp.tsx`, `PlayerApp.map-image.test.tsx`, `WorkspaceHeader.tsx`, `PlayerTools.css`, `PlayerAsideOverlay.tsx`, `CombatTurnBar.tsx`: publicación explícita, readiness, imágenes autorizadas y disposición de Player.
- `README.md`, `docs/{client-architecture,private-api,browser-client,synchronized-table}.md`, `package.json`, `CHANGELOG.md`.

El contrato final de rutas, payloads, eventos, presencia y límites está en [synchronized-table.md](../../../docs/synchronized-table.md). Los métodos de player/dice ya no contienen implementaciones de capacidad pendiente. La publicación inicial requiere acción explícita del DM; la mera presencia o recarga de un DM no publica su escena vacía.

## Correspondencia aceptación → evidencia

| Criterio | Evidencia ejecutada y alcance |
| --- | --- |
| 1. Proyección pura | `public-table-projection.test.ts`: fixture de dos mapas con secretos únicos, fichas de personaje completas, notas HTML/Markdown, entidades ocultas, cámara privada y diccionarios URL. Ausencia de SECRET en salida, entrada inmutable, mapa activo coherente, caso sin mapa/combate inactivo. |
| 2. HTTP/SSE y roles | `table-http.test.ts`: servicio temporal real con puerto asignado, cookies separadas, streams DM/jugador, bootstrap y actualización. Inspección de bytes SSE; query role=dm no eleva permisos. Mutaciones privadas y lectura de sesión dados rechazadas al jugador; anónimo 401. Pruebas base HTTP cubren bibliotecas/sesiones/origen. |
| 3. Assets | Nueve tests HTTP incluyen ocho PNG diferentes generados y subidos: mapas activo/inactivo, token visible/oculto, retrato compartido NPC/monstruo, retrato privado, turno y nota. Matriz GET/HEAD con cabecera condicional y resolve antes/después de publicar, ocultar, terminar combate, cambiar mapa y retirar publicación. Compartidos sobreviven mientras existe otro uso público. Rutas/URL externas resuelven null. |
| 4. Orden/recuperación | HTTP real duplica identificadores, conflicto de contenido, ack futuro, conexión ajena, contexto anterior, cursor viejo y nueva época tras reiniciar. Reconexión obtiene la última publicación. Adaptador rechaza un chunk cuyo reader resuelve después de logout/relogin y StrictMode stop/start. Bootstrap repite el estado actual sin restablecer la cámara local. |
| 5. Tiempo/dados | HTTP begin/complete repetidos conserva una única resolución/historial; abierta seguida de oculta conserva última pública y no emite evento jugador. Reloj servidor controlado verifica puntero restante/vencido. Adaptador compensa reloj desplazado y descarta punteros/highlights duplicados/vencidos; conserva edad de replay/crítico con reloj cliente desplazado, sin reiniciar sus tiempos. Pruebas existentes de DiceRollSession/DiceOverlay cubren resumen, cierre, contexto, replay/pose, crítico y audio; no se realizó un ensayo visual de crítico entre equipos con relojes desplazados. Humo abierto = 5, oculto = 6, jugador mantiene 5. |
| 6. Presencia/límites | Dos sesiones jugador, promoción determinista, logout/expiración cierra stream sin comando posterior. Una conexión por sesión y máximo 64 por instancia, sustitución/liberación, 413 por cuerpo excesivo, throttle cámara intermedia y final aceptado. Consumidor TCP pausado recibe publicaciones grandes hasta desconexión acotada. Ventana dedup comprobada a 299999 ms. |
| 7. UI/adaptador | Regresión para acción explícita de publicación y apertura de dados. Cleanup, sesión antigua y StrictMode probados. Nueva prueba Player servicio reconfirma imagen antes de ready tras bootstrap manteniendo cámara/viewport; regresión Player Electron de sustitución de imagen intacta. Escape cierra Mesa y devuelve foco; enlace sin secretos. CUA inspeccionó1440 × 900,1024 × 768 y Player 1920 × 1080. |
| 8. Humo real | IAB DM + Chrome jugador con cookies independientes, API 8794 y assets/escena temporales; detalle del recorrido abajo. |
| 9. Regresión/entrega | Suite general y compilaciones; humo Electron local del orquestador, detallado abajo. Sin cambio de formato de escena ni dependencias nuevas. |

## Comandos y resultados

Runtime del ensayo: Node 24.15.0, pnpm 11.1.2, macOS. Se ejecutaron con pnpm:

- `pnpm test`: 120 archivos, 1118 tests PASS antes del último ajuste de reconfirmación de textura. Log `/tmp/table-tests-final.log`.
- Tras ese ajuste: `pnpm test src/renderer/src/PlayerApp.map-image.test.tsx src/renderer/src/PlayerApp.tools.test.tsx src/infrastructure/browser/table-client.test.ts`: 3 archivos, 29 tests PASS; incluye la nueva regresión servicio y las pruebas locales sin modificar sus expectativas. Log `/tmp/table-reconnect-tests.log`.
- `pnpm typecheck`: PASS, también ejecutado por las tres compilaciones.
- `pnpm lint`: PASS (`/tmp/table-lint-final.log`).
- `pnpm build`: PASS (`/tmp/table-build-electron-final.log`).
- `pnpm build:api`: PASS (`/tmp/table-build-api-final.log`).
- `pnpm build:web`: PASS (`/tmp/table-build-web-final.log`).
- Arranque producción local con configuración de 002 y `pnpm start:api`; la API sirvió `out/web` en 8794 durante todo el recorrido. API/datos/keys exclusivamente temporales, fuera de biblioteca personal.

Warnings conocidos: Vitest/jsdom informa falta de canvas nativo en tests que no renderizan GPU; Vite informa chunks mayores de 500KiB. No impidieron los comandos. Un primer ensayo del límite JSON usó un cuerpo enorme y recibió ECONNRESET del cliente; se reemplazó por Content-Length sobre límite para verificar413 de modo determinista. El test TCP lento conserva cuerpos grandes reales.

## Humo navegador y evidencia visual

Recorrido CUA con build de producción servido por API real; no Playwright/CDP externos, ni evaluaciones para operar la aplicación. La fixture adversa tenía cámara privada lejos del mapa; para comprobar puntero/área visual se usó el segundo mapa centrado. Las capturas fueron inspeccionadas en CUA, no se guardaron PNG en el repositorio; esta descripción conserva los resultados observados para los revisores.

1. DM IAB y jugador Chrome en orígenes8794, sesiones independientes. Jugador antes de publicación: «Esperando al DM». Publicar produce confirmación DM y proyección. El query player no modifica rol DM.
2. Carga de escena de prueba, dos mapas, tarjeta pública Ogro/Guía, retrato Guerrero/iniciativa12 y contador privado mostrado como Contador. Player no muestra secretos ni controles privados. Ocultar tarjetas las retira; aumentar contador3→4 se refleja.
3. Dado abierto 1d6 con resultado5 visible en Player; siguiente oculto 1d6=6 sólo DM y último público5 permanece. Durante primera tirada apareció mensaje seguro de fallo visual con fallback numérico autorizado; la siguiente tirada DM dibujó d6=6. No se exige éxito WebGL para conservar resultado.
4. Zoom DM separado; desbloqueo/zoom local Player cambia estado DM a Vista libre; recentrado explícito devuelve Sincronizada. Cambio al segundo mapa se observa como nueva imagen/cuadrícula y limpia presentación de dados del contexto anterior.
5. Puntero: captura Player muestra círculo arcano azul en coordenada del segundo mapa. Área informativa creada en editor real y botón Resaltar para jugadores: captura Player muestra únicamente las celdas amarillas en L, sin contenido privado, durante el intervalo temporal.
6. Player recargado recupera publicación, mapa/turnero/contador. El segundo mapa y controles permanecen funcionales. La reconexión por interrupción real del proceso se detalla en el cierre de verificación.
7. Capturas1440 × 900 y1024 × 768 DM: controles compactos; los paneles adaptativos se ocultan al ancho menor; `documentElement.scrollWidth=innerWidth=1024`. Player 1920 × 1080: mapa, controles locales y turnero compacto inferior. Se corrigió una colisión de orden CSS que aplicaba top y bottom al turnero a la vez.
8. Consola consultada mediante CUA: sin errores/warnings Player en el recorrido normal. En DM hubo un error de lazy import al reconstruir `out/web` mientras estaba abierta una página del build anterior: el hash NoteEditor antiguo ya no existía. Recarga al build nuevo resolvió el editor y permitió crear/resaltar área. No se presenta como prueba de despliegue atómico; sustituir builds en caliente no está dentro de 004.

Humo Electron atribuido al orquestador, fuente `/tmp/ttrpg-004-root-smoke.md`: perfil temporal, mapa 900 × 600 mediante diálogo nativo, dos tiradas abiertas d6=1 y5 y Player 1920 × 1080 con d6=5/total5. Realizado antes del bump final (UI 3.4.0), sobre implementación 004. Proceso cerrado. No acreditó ocultas nativas; sí preservó camino local IPC. Los cambios posteriores en Player tienen regresión automatizada local y compilación final.

## Límites y decisiones

Una mesa/instancia y una audiencia pública; estado efímero, sin log durable ni colaboración multi-DM. Primer jugador conectado representa preview, promoción por antigüedad.64 streams, uno/sesión; heartbeat 1 s, watchdog 15 s, backoff hasta 30 s; cola socket 2 MiB/5 s; dedup 5 min, 20000 resultados por rol, reservas independientes de 64 MiB DM y 8 MiB jugador. Detalle y casos de error en documentación técnica.

La niebla no protege píxeles ya descargados y revocar un asset no elimina copias previas. No hubo ensayo de despliegue TLS/proxy remoto ni múltiples equipos físicos. La conservación de dibujos locales en bootstrap está cubierta por regresión de herramientas; el intento manual de medición no produjo una forma final persistida, por lo que no se acredita esa fila visual. Las pruebas de dominio de crítico/replay se conservaron; no se afirma haber observado un crítico natural 20 en navegador.

## Correcciones de ciclo 1

Durante construcción: eliminación de guards UI heredados de 003, proyección explícita de campos, asset set vigente, generación tras read tardío, contexto/revisión de reportes capturados al encolar, respuesta incierta con mismo UUID dentro de 5 min, aislamiento de secuencias privadas, CSS turnero y reconfirmación de textura tras reconexión. La corrección de los cuatro informes de ronda 1 se documenta abajo; este constructor no realizó las revisiones independientes.

## Cierre de verificación

Después de corregir la reconfirmación de textura se repitió exclusivamente la interrupción real del proceso temporal (`SIGSTOP`, después `SIGCONT`). Player pasó a Mesa desconectada conservando mapa/turnero/contador; al recuperar, DM volvió a «Jugador listo», principal nuevo `d66cba02` y una sola conexión. La captura inicial conservaba el encuadre anterior, pero no tenía cámara local divergente; no demostraba por sí sola que la presencia no emitiese una orden implícita. UX-1/COD-004-01 detectaron ese hueco, corregido y verificado abajo. La prueba nueva de Player confirma que no se remonta viewport ni cambia la cámara y que reportar imagen precede a ready. La conservación de herramientas/dibujos se acredita con tests, no con el intento manual incompleto.

Copia de enlace mostró «Enlace copiado»; Escape dejó foco en el summary Mesa. Logout Player volvió a Acceso a tu mesa; DM cambió a Mesa · 0 jugadores y cámara Cerrada. Consulta final de consola Player: sin errores/warnings. Se cerraron las dos pestañas propias, se restauraron overrides de viewport y se terminó la API temporal PID 52456. El perfil Electron del orquestador ya estaba cerrado. Datos de prueba y logs permanecen en `/tmp` para consulta; no se incorporaron credenciales al repositorio.

Validación final adicional: pruebas de reloj del adaptador (3 tests PASS, `/tmp/table-clock-tests.log`), `pnpm typecheck` PASS (`/tmp/table-typecheck-final.log`), `git diff --check` PASS. Las compilaciones Electron/web se repitieron tras la corrección; la API no cambió después de su compilación final. No se repitió la suite completa al finalizar porque el cambio quedó cubierto por la regresión dirigida y no hubo fallos pendientes.

Estado de entrega: implementación y evidencia disponibles para las cuatro revisiones independientes. Esta construcción no constituye aprobación técnica ni autorización de integración.


## Corrección de ronda 1 — cuatro informes atendidos

Leídos completos `ronda-1/revision-{seguridad,ux,ui,codigo}.md`. Versión permanece 3.5.0 y no se duplica changelog. No se editaron los informes ni la spec.

| Hallazgo | Cambio y evidencia |
| --- | --- |
| SEG-004-01 | ACK compacto para acciones de mesa salvo open/scene, que requieren bootstrap. Los reportes ya no almacenan una copia completa de escena. Deduplicación con presupuestos separados DM/jugador: 64/8 MiB y 20000 resultados por rol, misma retención mínima de cinco minutos. HTTP real publica escena grande y acepta 500 reportes a 10 Hz, cada respuesta menor de 100 caracteres; la siguiente orden DM sigue funcionando. Test de TableSession satura 20000 UUID jugador, conserva la operación DM y prueba conflicto a 299999 ms/expiración a 300000 ms. |
| SEG-004-02 | `protectedJson` revalida la identidad de sesión tras leer el cuerpo; se aplica también a escenas, enlaces, plantillas y bibliotecas. Upload revalida después del cuerpo y después de decodificar; lecturas asíncronas de bibliotecas comprueban sesión antes de entregar resultados. HTTP real mantiene una petición de dados con cuerpo parcial y revoca mediante logout, rotación y expiración: siempre 401 y contexto sin mutación. Matriz adicional con cuerpos pendientes en siete rutas de mesa/assets/escenas/enlaces/plantillas/bibliotecas: todas 401. |
| UX-1 / COD-004-01 | App servicio no convierte presencia/ready/getState en comando open. Electron conserva su apertura local existente. Promoción envía bootstrap al nuevo principal para recoger su cámara actual. Test conjunto de App + BrowserTableClient + TableSession + PlayerApp, con viewport aislado, usa una cámara divergente: reconectar, promover y remontar DM no emiten órdenes ni reinician navegación; recentrar explícitamente sí actúa incluso con zoom bloqueado. Humo real de interrupción descrito abajo. |
| COD-004-02 | Player espera 100 ms desde la finalización del reporte previo, incluyendo el caso de cola con petición en vuelo. El final no se pierde y puede saltar la espera, respetando serialización. Pruebas de gesto de 800 ms con actualizaciones cada 20 ms y latencias 0/160 ms contra TableSession: todos los intermedios separados al menos 100 ms, ningún rechazo de cadencia y reporte final presente. |
| UX-2 | Regiones status/alert persistentes fuera de details, con texto de conexión/publicación/carga/error. Los eventos render-error actualizan también el estado anunciable. Test de ServiceApp con SSE de TableSession confirma detalles cerrados, carga/error/listo/desconexión y texto estable tras reporte de cámara. CUA muestra la región de conexión en el árbol accesible con Mesa cerrada. No se afirma ensayo de voz con lector de pantalla. |
| UI-004-01 | Botón Copiar con fondo #303438, texto #ebedef, borde #758397 y foco visible 2px #8cc7ff. CUA inspeccionó captura y estilos computados coincidentes, con foco de teclado sobre el botón; Escape vuelve al summary. |
| UI-004-02 | En ronda 1 Mesa jugador se ubicó arriba a la derecha, debajo de Cerrar sesión. La colisión con brújula descubierta posteriormente se corrige en ciclo 2, abajo. CUA verificó las 12 combinaciones de tres resoluciones, abierto/cerrado y conectado/desconectado: ningún rectángulo se cruza con el indicador de escala. |

### Verificación final de correcciones

- `pnpm test`: **121 archivos, 1135 tests PASS**, `/tmp/004-r1-tests.log`.
- `pnpm typecheck`: PASS, `/tmp/004-r1-typecheck.log`; repetido por las compilaciones.
- `pnpm lint`: PASS, `/tmp/004-r1-lint.log`.
- `pnpm build`, `pnpm build:api`, `pnpm build:web`: PASS, `/tmp/004-r1-build-{electron,api,web}.log`.
- Pruebas dirigidas previas: seguridad 14 tests (`/tmp/004-r1-security.log`), App/Player 37 (`/tmp/004-r1-camera.log`), ServiceApp/HTTP 20 (`/tmp/004-r1-live.log`). Los resultados finales completos incluyen los siete casos adicionales de revocación de cuerpos privados.
- `git diff --check`: PASS. Puerto 8794 sin proceso escuchando tras el cierre.
- Warnings conocidos de canvas jsdom y tamaño de chunks Vite, sin errores de compilación. No hubo cambios de implementación después de estas compilaciones.

### Humo dirigido de ronda 1

API de producción 3.5.0, PID propio 64689, puerto 8794, directorio temporal `/private/tmp/ttrpg-004-r1.*`. Chrome se operó solo mediante CUA. IAB no estaba disponible en esta sesión; se verificaron DM y jugador secuencialmente, y se conservó una sesión HTTP DM independiente para inspeccionar la presencia del jugador. La evidencia anterior de dos navegadores sigue atribuida a ronda 0; no se presenta este recorrido como una repetición simultánea de dos UI.

DM cargó la fixture temporal centrada, activó indicador de escala y publicó. Se verificaron contraste y foco del botón Copiar. Después del logout DM se accedió como jugador; una actualización HTTP autorizada retiró únicamente las tarjetas de la fixture para dejar el mapa visible durante la prueba de cámara. No se modificaron datos personales.

Player navegó de 100 % a **132 %**. HTTP DM confirmó `ready=true`, zoom `1.3224999999999998`, centro `{x:0,y:0}` y ausencia de comando nuevo. Se pausó únicamente el proceso temporal con SIGSTOP hasta observar «Mesa desconectada», se midieron los layouts y se reanudó con SIGCONT. El árbol accesible y la captura conservaron **132 % / cuadro 132 px**. HTTP DM confirmó nuevamente `ready=true`, un nuevo connectionId principal y exactamente el mismo zoom/centro, sin comando implícito. Consola Player: cero errores/warnings en el recorrido. Promoción y remonte DM se verificaron automatizadamente, no con una tercera UI real.

Rectángulos medidos por lectura DOM en CUA (x/y/ancho/alto): escala a 1440×900 = 70/854/212.89/30; a 1024×768 = 70/722/212.89/30; a 1920×1080 = 70/1034/212.89/30. Mesa cerrada siempre y=70, alto=32.5; abierta, ancho=360, alto=97.5 conectada o 122 desconectada. En las doce combinaciones la intersección fue falsa. Las capturas se inspeccionaron en CUA y esta descripción persiste su resultado; no se guardaron PNG.

Se cerró sesión jugador, se restableció el viewport, se cerró la única pestaña propia y se terminó el proceso API 64689. No se repitió el humo Electron de ronda 0: la nueva prueba conserva explícitamente la rama local y la suite completa y build Electron pasan. Permanecen los límites visuales de dibujos/crítico/TLS descritos arriba; no se amplió el alcance. Implementación lista para nueva revisión independiente, sin aprobación ni integración implícitas.


## Ciclo 2 — corrección UI-004-03 para ronda global 3

Se leyeron solicitud, spec, retrabajo autorizado y los cuatro informes completos de ronda 2. Seguridad, UX y código no dejaron hallazgos pendientes; esta corrección se limita al solapamiento señalado por UI. Versión **3.5.0**, sin bump adicional, Git write, merge ni DMG.

**Cambio:** `src/web/ServiceApp.tsx` delimita la composición Player del servicio con `service-player-workspace`. `src/web/service.css` reserva filas verticales distintas: Cerrar sesión en y=16, brújula en y=70 con tamaño 84×84 y Mesa desde y=166. Hay 10 px entre sesión y brújula y 12 px entre brújula y Mesa. No se oculta ningún control ni se modifica z-index. La regla de brújula está acotada al contenedor web; Electron conserva su disposición. `docs/synchronized-table.md` describe esta distribución. No cambian dominio, HTTP/SSE, proyección, assets, persistencia, dados ni formato de escena.

### Evidencia visual dirigida

Chrome mediante CUA, build web de producción servido por API real en 8794. Instancia y fixture propias en `/private/tmp/ttrpg-004-c2.*`, mapa sintético de 900×600, escala activa, contador y turnero. La publicación se preparó mediante HTTP autenticado; el acceso jugador y todas las acciones UI se hicieron por CUA. Se activó explícitamente **Mostrar brujula**, omisión que había permitido la regresión anterior.

Se inspeccionaron las doce capturas de la esquina superior derecha y los rectángulos reales del DOM: tres resoluciones × Mesa abierta/cerrada × conexión activa/caída. La caída se produjo con SIGSTOP del proceso propio 67441 y se observó el texto real de desconexión, incluida su explicación más larga; después SIGCONT recuperó «Mesa conectada». En todas las combinaciones: brújula completa y legible, botones/textos visibles y **cero intersecciones** entre brújula, Cerrar sesión, Mesa, escala, controles inferiores y rail de herramientas. `scrollWidth` coincidió con el ancho de viewport.

| Viewport | Brújula x/y/ancho/alto | Cerrar sesión x/y/ancho/alto | Mesa abierta x/y/ancho/alto, conectado → desconectado | Escala x/y/ancho/alto |
| --- | --- | --- | --- | --- |
| 1024×768 | 924/70/84/84 | 877.45/16/130.55/44 | 648/166/360/97.5 → 648/166/360/122 | 70/722/212.89/30 |
| 1440×900 | 1340/70/84/84 | 1293.45/16/130.55/44 | 1064/166/360/97.5 → 1064/166/360/122 | 70/854/212.89/30 |
| 1920×1080 | 1820/70/84/84 | 1773.45/16/130.55/44 | 1544/166/360/97.5 → 1544/166/360/122 | 70/1034/212.89/30 |

Mesa cerrada conserva y=166/alto=32.5; ancho 125.98 conectada o 145.81 desconectada, alineada a 16 px del borde derecho. Las capturas completas de 1024×768 y 1920×1080 confirmaron además mapa protagonista, escala, rail, controles y turnero sin cambios invasivos. Abrir Medir mostró sus opciones utilizables. Escape cerró Mesa y devolvió foco al summary (`focusOnMesa=true`); la brújula permaneció en el árbol accesible como «Brujula: norte 0 grados». Consola consultada: cero errores/warnings. Logout devolvió el formulario de acceso. Las capturas se inspeccionaron en CUA; esta descripción y medidas persisten la evidencia, sin PNG guardados.

### Checks y cierre

- `pnpm test`: **121 archivos / 1135 pruebas PASS**, `/tmp/004-c2-tests.log`.
- `pnpm lint`: PASS, `/tmp/004-c2-lint.log`.
- `pnpm typecheck`: PASS, `/tmp/004-c2-typecheck.log`, también ejecutado por los builds.
- `pnpm build`: PASS, `/tmp/004-c2-build-electron.log`.
- `pnpm build:web`: PASS, `/tmp/004-c2-build-web.log`.
- `git diff --check`: PASS. Sin cambios de versión ni dependencias.

Se conservan los avisos conocidos de canvas jsdom y chunks/directivas de dependencias en Vite, sin fallos. No se recompiló la API: sus fuentes no cambiaron en esta corrección y el build previo aprobado sirvió el web nuevo durante la matriz real. No se añadieron tests que repitan constantes CSS; la evidencia relevante es la matriz del render real. No se repitieron dados, privacidad, cámaras, bibliotecas ni humo Electron no afectados; su cobertura y límites previos permanecen atribuidos arriba.

Se cerró la pestaña propia, se restableció el viewport y se terminó el proceso API 67441; puerto 8794 libre. Build publicado íntegro mediante temporal y renombrado. Corrección completa disponible para los cuatro revisores de ronda global 3; no equivale a aprobación ni integración.


### Estado adyacente de logout fallido, antes de congelar

El orquestador señaló que el mensaje `service-player-error` todavía tenía una posición fija que podía cubrir la brújula. Se incorporó la corrección dentro del mismo alcance: el error ahora es un párrafo de flujo normal (`position:static`) dentro de Mesa y fuera de details. Permanece visible y anunciado aun con Mesa cerrada; tiene altura acotada con scroll para mensajes largos. No ocupa otra esquina ni cambia z-index.

Se agregó una regresión semántica en `src/web/ServiceApp.test.tsx`: logout con respuesta 503 conserva Player, alerta y detalle cerrado; el mensaje es hijo directo de Mesa y no pertenece a details. `pnpm test src/web/ServiceApp.test.tsx`: **8 PASS**, `/tmp/004-c2-logout-tests.log`. Después del ajuste, `pnpm lint` PASS (`/tmp/004-c2-lint-final.log`) y `pnpm build:web` PASS, incluido typecheck (`/tmp/004-c2-build-web-final.log`). Los cambios finales son exclusivos de web; no afectan el build API/Electron. La suite completa de 1135 pruebas indicada arriba precede a esta regresión añadida; no se afirma una segunda ejecución completa de 1136.

CUA repitió solo el caso afectado a 1024×768: nueva instancia temporal propia, publicación sintética HTTP, jugador con brújula visible y apagado real de API antes de pulsar Cerrar sesión. Apareció «No se pudo conectar con el servicio. Comprueba la conexión y reintenta» con Mesa cerrada y abierta. Capturas verificadas: brújula completa en 924/70/84/84, logout en 877.45/16/130.55/44; error de flujo en 661/175/334/33; Mesa abierta en 648/166/360/187.5. Ninguna superposición con brújula, escala o controles. El apagado de red en este caso es intencionado; no se atribuye la ausencia de errores de red del recorrido anterior a esta ejecución.

Se cerró la segunda pestaña propia y se restableció viewport. La API temporal 67772 ya estaba terminada para provocar el error; no hay procesos propios escuchando en 8794. `git diff --check` final PASS. Informe republicado mediante temporal y renombrado; construcción cerrada para ronda global 3.
