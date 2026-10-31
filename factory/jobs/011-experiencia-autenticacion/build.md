# Construcción 011 — ciclo 2, preparación de ronda 4

Estado: corrección C4/UI-011-3 finalizada tras los cuatro informes de ronda 3, con gates y retest real del orquestador. Disponible para congelación y ronda 4, segunda del ciclo 2 autorizado. UX-3 cerrado por UX con Electron real en ronda 3. Espera cuatro revisiones y decisión; no constituye aceptación global ni cierre operativo.

La construcción inicial pertenece al constructor anterior. Esta corrección fue continuada por `/root/constructor_011_recuperado`, leyendo los cuatro informes completos y conservando la entrega anterior; no se afirma reanudación del agente perdido.

## Base, alcance y versión

Trabajo sobre `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama autorizada `feature/factory-006-persistencia-multidb`, sin cambio de rama ni operaciones Git de escritura. Base de archivos: `base-archivos.json`, 638 huellas correspondientes a main `73b8e6de21af74912d23399f1b99f3c1112ade91`, confirmadas por coordinación. Se conservó el trabajo acumulado 006–010/fix012. Único constructor; sin delegación.

Versión única de producto: **3.13.0**, bump minor desde 3.12.0, entrada española de CHANGELOG fechada 2026-10-31. No cambio de formato: `.ttrpgscene` v2 y migración/lectura v1 conservados. Sin commit de construcción; integración/main habitual/servicio personal/DMG corresponden al orquestador después de revisiones.

## Resultado implementado

- Acceso por email/contraseña sin selector de rol, cambio obligatorio, separación admin/DM y administración de cuentas. Contraseñas en estado transitorio, campos de pegado/mostrar, errores asociados y espera de Retry-After. La cuenta se identifica por ID; otra cuenta exige descarte del borrador, la misma recupera después de verificar contexto y revisiones. El reset obligatorio conserva un editor ya retenido oculto e inerte hasta completar cambio y nueva autenticación; el acceso obligatorio inicial nunca carga editor.
- Catálogo administrativo de sistemas con versiones/borradores/publicación/disponibilidad y campos de plantilla compartidos con el editor local. No acciones de borrado ni administración de plantillas para DM servicio. Selección explícita e inmutable de sistema/versión de partida; módulos compilados cerrados y valores por defecto solo para escenas nuevas.
- Catálogo privado de partidas con estado de apertura separado de archivada/lista, acciones CAS/idempotentes, inicio/continuidad/reapertura/cierre explícitos, heartbeat y una instancia contextual por apertura. Viewport React/Pixi y bibliotecas existentes, sin segundo renderer. Guardar y asociar son requisitos explícitos de publicación de escenas vinculadas.
- Recursos DM con revisiones/bindings fuera del documento portable. Definiciones retenidas por instancia, separadas de las opciones habilitadas; coincidencia de ID privado/compartido no sustituye contenido. Nuevos vínculos de fichas privadas/deshabilitadas/incompatibles se rechazan. Copias mantienen bindings para que el backend vuelva a validar nuevos usos. Reintentos inciertos conservan clave/contenido/CAS, también las imágenes mediante hash/MIME.
- Entrada de invitado con secreto capturado/eliminado del fragmento antes de peticiones, pegado interno del mismo origen y comprobación de cookie por partida antes de canjear. Alias/discriminador, roster paginado y confirmación del participante exacto. Expulsión utiliza revisión/contexto/Idempotency-Key, muestra enlace solo si el servidor lo entregó y no remonta sobrevivientes.
- Terminales desmontan proyección invitada y detienen transporte. DM conserva el borrador inaccesible y exige descarte explícito antes de abandonar una apertura terminada. 401 oculta/inertiza canvas y portales, aborta peticiones y suspende contactos. Respuestas tardías no reintroducen estado. Modales contienen foco, cancelan con Escape y lo devuelven al invocador real.
- `src/server/http.ts` es el listener final sobre `openModerationBackend`: identidad, propiedad, invitaciones, moderación, salud y estáticos. Claves/cookie/rutas globales retiradas. El servidor histórico queda únicamente en `legacy-http.fixture.ts`, importado por sus pruebas de regresión y fuera del grafo del entry productivo. `IDENTITY_ENABLED=false` falla; no cuentas/migración/adopción automáticas.
- Setup conservador con `.local/service/{data,backups,logs}`0700, env0600, secreto aleatorio nuevo solo cuando no existe configuración, rutas físicas y rechazo de symlinks. `/.local/` versionado en ignore. Electron servicio conserva partición efímera sin preload/Node; local mantiene almacenamiento y PlayerIPC propios.

Dos extensiones pequeñas del contrato de lectura/resultado están documentadas en `docs/owned-data.md`: GET privado `definitions/{scenes|monsters}/:id` devuelve `templates` deduplicadas por referencia completa y `monsters` como índices por instancia; conectar/desconectar enlaces devuelve las revisiones confirmadas de sus extremos. Evitan colisiones de presentación y la carrera de releer una revisión posterior después de modificar enlaces. Autoridad y transacciones siguen en008.

## Correspondencia con aceptación

| Criterio | Evidencia y límite |
| --- | --- |
| A1 cuentas | `ServiceApp.test.tsx`, contratos identidad reales y recorrido admin/DM del orquestador. Cambio/creación/reset/deshabilitación/revocación verificados por contratos; no se atribuye cambio de contraseña por CUA. |
| A2 catálogo | `test:owned` retención/hash/disponibilidad/CAS y QA admin: crear borrador, guardar/publicarv2 y deshabilitar; DM ofrecev1; borradorv3 conserva edición. Campos/preview compartidos y sin borrar sistemas. |
| A3 sistema/viewport | Cliente `owned-client.test.ts`, contratos systems/revision3 y composición final: referencias explícitas, privada coincidente exacta por instancia, nuevas opciones separadas, preservación CAS/bindings/portable. Configuración sobre viewport común, no regla reinterpretada al cargar. |
| A4 propiedad | `test:owned` y `service-final.contract.ts`: dos DMs, A1/A2/B1, GET/HEAD/resolve/export/definitions, centinelas privados, bytea/BLOB, enlaces y principal de sesión. Admin sin capacidades DM. |
| A5 aperturas | Gates invitaciones/moderación: continuidad, generación, lease/gracia, restart, exclusión y pérdida de lock; UI inicio/continuar/reabrir/cerrar explícitos. QA navegador/Electron carga y publicación reales. |
| A6 invitación | Captura de fragmento y transporte probados; QA tres clientes, alias Unicode/repetidos y recarga con mismo ID, pegado Electron del mismo origen y rechazo de enlace antiguo con campo recuperable. |
| A7 moderación | Contratos HTTP/SSE reales en ambos motores y QA IAB/Chrome/Electron: expulsar#2 deja#1/#3, limpia la proyección revocada, cambia enlace y conserva IDs de sobrevivientes. Roster solo DM. |
| A8 incertidumbre | `owned-client.test.ts` y contratos009/010 de replay/terminal/retardo: misma clave y CAS, rechazo de respuesta tardía, Retry-After sin enviar antes del plazo, upload incierto con misma clave. No URL inventada en replay. |
| A9 borrador/teclado | Pruebas de estado/foco, regresión de reset obligatorio del mismo ID que conserva el nodo y contenido del borrador oculto durante cambio de contraseña y nueva autenticación, y QA real: guardar/descartar/cancelar,401por revocación, cambioA→B con descarte y recuperaciónA, Escape/Tab/ShiftTab/foco y cierre nativo/Cmd+Q con trabajo modificado. Matriz visual detallada abajo. |
| A10 corte/setup | Script real en rutas con espacios, permisos/ignore/conservación/symlinks; listener compilado carga.env y no autoriza cookie/claves globales. API desconocida nunca retorna shell; inspección de bundles sin secretos/DB web. |
| A11 motores/operación | Todos los gates con PostgreSQL real/TLS, sin skip. `service-final.contract.ts` usa pg_dump/pg_restore oficiales y copia SQLite cerrada; inventario de todas las tablas, contenidos/relaciones/cuentas, datos de dos propietarios y cookies antiguas rechazadas tras invalidación+rotación antes de servir. Fuentes/restaurados aislados. |
| A12 clientes | QA navegador/Electron servicio real y Electron local aislado: mapa/biblioteca/Player, más gates generales y builds independientes. `.ttrpgscene`compatible. No perfil personal leído ni adoptado. |
| A13 entrega | Versión/changelog/docs actualizados. Revisiones/decisión/integración/DMG/corte real aún corresponden a etapas siguientes; no se declaran terminados en construcción. |

## Verificación automática inicial (histórica, conservada)

Entorno: Node 24.15.0, pnpm 11.1.2, Vite 7.3.3 local; PG temporal real 17.10 con TLS verificado; clientes oficiales 17.11 facilitados por el orquestador. Comandos de PostgreSQL ejecutados mediante wrapper privado que inyecta únicamente entorno de fixture; no se imprimieron credenciales. Pruebas intensivas y compilaciones secuenciales.

| Comando | Resultado real |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS, lockfile conservado, 478ms. |
| `pnpm typecheck` | PASS independiente y repetido por los tres builds. |
| `pnpm lint` | PASS final sin errores ni warnings. |
| `pnpm test --maxWorkers=2` | PASS final: **132 archivos / 1217 pruebas**, 31.55s. Incluye guards, definición por instancia, CAS, respuestas tardías, espera429 y upload incierto. |
| `pnpm build` | PASS, incluye typecheck y compilación main/preload/renderer; Vite renderer 5.68s. |
| `pnpm build:api` | PASS, incluye typecheck y artefactos API/CLI; Vite 417ms. |
| `pnpm build:web` | PASS final, incluye typecheck y frontend de servicio con la regresión de reset; Vite 5.71s. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:db` | PASS:32 contratos/1archivo,21.33s. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:identity` | PASS:25 contratos/1archivo,70.98s. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:owned` | PASS:46 contratos/5archivos,307.70s. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:invitations` | PASS:36 contratos/5archivos,179.11s. |
| `python3 /tmp/ttrpg-auth-pg-run.py test:moderation` | PASS:47 contratos/7archivos,207.79s; incluye6contratos nuevos de servicio final/restauración/artefacto. |

Logs completos sanitizados en `/tmp/ttrpg-011-{install,typecheck,test-final,lint-final,build-final,build-api-final,build-web-final,test-db,test-identity,test-owned,test-invitations,test-moderation}.log`. Tras los últimos cambios de contratos se repitió el archivo final con `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/service-final.contract.ts`: **6/6 PASS**, 22.67s, registro `/tmp/ttrpg-011-service-final.log`. Incluye resolución deduplicada con dos instancias, restauración integral y arranque compilado en ambos motores. El último ajuste posterior solo afecta ServiceApp: se volvió a ejecutar la suite general completa, lint y build web; no se repitieron suites de motores sin cambios de backend.

Incidencias durante construcción, resueltas sin esconder resultados: primer gate general detectó expectativas de acceso/setup anteriores al corte, que se actualizaron al contrato vigente. Un pase posterior con workers predeterminados falló por timeout en la prueba de saturación de UUID y la KDF de contraseña; el timeout dejó ocupados cupos para la siguiente aserción KDF. Repetir la suite completa con dos workers pasó sin aumentar timeouts ni relajar aserciones. Primer lint incluyó el arnés privado `.local`; se añadió exclusión al linter. La directiva eslint obsoleta de moderación se retiró sin cambio funcional.

Warnings conocidos: chunks de frontend grandes (Vite), falta de canvas nativo en jsdom y deprecación de consultas pg concurrentes en contratos existentes de adversidad. No se presentan como errores de producto ni se ocultan. `git diff --check` sin incidencias al cierre.

## QA real y atribución

Evidencia visual realizada por **el orquestador mediante CUA**, coordinada con este constructor y registrada en `coordinacion.md`; no la declaro observación personal del constructor. Fixture SQLite 8891 con cuentas/datos sintéticos, Chrome/IAB y Electron 39 con perfil aislado. Capturas inspeccionadas en herramientas; no se versionaron imágenes que pudieran contener enlaces. La primera matriz IAB tenía tamaños solicitados no confirmados y se descartó como certificación dimensional.

- Chrome 1024×768 y zoom200%(DOM512×384,DPR2): formularios de cuenta y borrador de catálogo legibles, sin overflow horizontal, scroll aGuardar y foco contenido.
- Chrome 1440×900: catálogo, Continuar partida, carga y editorDM; dimensiones contrastadas con DOM y captura completa, sin superposición.
- Chrome 1920×1080: proyección/mapa y controles discretos, dimensiones DOM y captura completa, sin datos de cuenta.
- Electron servicio 3.13: loginDM, iniciar tras lease caducada, cargar/editar/publicar hacia invitado Chrome; cerrar ventana/Cmd+Q muestran guard nativo, Escape/Seguir editando conservan cambios y Descartar y salir termina proceso.
- Electron local 820×520: sin servicio ni perfil personal, mapa, creación/guardado de monstruo en biblioteca y Player correctos. Retest final del editor de plantillas: Nombre/Sistema/Previsualizar únicos, disposición vertical, Markdown/CSS accesibles mediante foco y scroll, sin superposición. Persiste una barra horizontal mínima del contenedor; no hay controles ni texto inaccesibles.

Hallazgos de QA corregidos antes de congelar: etiquetas técnicas de diagonales, ausencia de feedback al guardar borrador, invitación inválida que ocultaba campo, foco que volvía siempre aGuardar en vez del invocador y Shift+Tab fuera del modal; además duplicación/layout de campos al compartir editor local. No certifica proyector físico, otros SO ni distribución firmada.

## Corrección tras ronda 1 — 2026-10-31

Leídos completos los cuatro informes de seguridad, UX, UI y código. Solo producto/pruebas/documentación y este build fueron escritos por el constructor de reemplazo; sin Git, tablero, revisiones ni delegación. Se conserva 3.13.0.

| Hallazgo consolidado | Corrección y evidencia nueva |
| --- | --- |
| S1: principal original | `HttpTransport.bindAccount` conserva ID, añade `X-TTRPG-Account` y descarta generaciones tardías. Recursos y mesa contextual DM heredan ese ID. El backend mantiene contexto de petición aislado mediante AsyncLocalStorage por instancia; `principal()` compara el ID dentro de la autorización transaccional, antes de operar. No consulta previa como única defensa. BroadcastChannel comunica únicamente ID/logout; mismo ID no invalida otra pestaña. Foco/visibilidad revalida. Contratos API reales con adaptador y ambos motores demuestran A válido, cookie B antes del POST, rechazo401, cero datos en B y recuperación A. Cubren también catálogo, administración y apertura/mesa. |
| S2/C3: 401 administrativo | Excepciones concretas de acceso/sesión/salida; listado y mutación admin bloquean transporte e invocan expiración. El componente real desmonta lista y contraseña temporal. Login fallido sigue recuperable. Pruebas de transporte y DOM. |
| UX1/C1: invitación desde recuperación | Validación de origen/ruta canónica/fragmento antes de transición; Cancelar y recuperar sesión o Descartar borrador y continuar. Captura en memoria antes de montar invitado; nunca fragmento en historial. Prueba del nodo y contenido retenidos, URL inválida, sin/con fragmento, descarte y Atrás posterior. CUA del orquestador confirmó cancelación y reautenticación del mismo DM con el nombre sin guardar. |
| UX2: revalidación temporal | Errores de transporte/429/5xx ofrecen Reintentar comprobación, conservan instancia y respetan Retry-After; conflictos de revisión confirmados usan estado distinto. Contactos no se inician hasta revalidar. Pruebas503/429 preservan nodo y contenido, impiden reintento temprano y reanudan sin reload. |
| C2: historial | Hook con posición por entrada: popstate aceptado no inserta ni reescribe entradas. Cancelar restaura cursor; pulsaciones adicionales durante decisión también restauran. Regresiones Atrás/Adelante, aceptación/cancelación y dos Atrás mientras el guard espera. CUA del orquestador confirmó recorrido real sin ciclo. |
| UI1: acceso al 200% | Superficie `.service-access` limitada al viewport y desplazable, centrado seguro. Abarca acceso, recuperación, contraseña e invitado. Evidencia visual del retest se registra abajo, separada de pruebas DOM. |
| UI2: nombres largos | Título flexible con ancho mínimo0 y división de palabras; cuenta y título previo también envuelven. No truncado silencioso del nombre. Evidencia visual del retest se registra abajo. |

### Gates de la corrección

- `pnpm typecheck`: PASS independiente y por los tres builds.
- `pnpm lint`: PASS, sin errores ni warnings finales.
- `pnpm test --maxWorkers=2`: **133 archivos / 1226 pruebas PASS**, 29.69 s. Incluye 9 regresiones nuevas de transporte, montaje, navegación y revalidación.
- `pnpm build`: PASS; compilación desktop 5.13 s del renderer.
- `pnpm build:api`: PASS; compilación 339 ms.
- `pnpm build:web`: PASS; compilación 5.01 s.
- `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/service-final.contract.ts`: **8/8 PASS**, 30.73 s, SQLite y PostgreSQL reales. Incluye los seis contratos finales anteriores y dos nuevos de principal.
- Repetición focal del mismo comando con `-t 'principal esperado'`, después de explicitar el contexto del adaptador en su fixture: **2/2 seleccionados PASS**, 11.07 s. Seis casos no seleccionados por filtro (ya ejecutados en 8/8 anterior); ningún motor omitido.

Logs sanitizados en `/tmp/ttrpg-011-r1-{typecheck,lint,test,build,build-api,build-web,service-final,principal-final}.log`. No se repitieron gates DB/owned/invitations sin modificaciones correspondientes; su evidencia completa inicial permanece arriba. El nuevo backend sí fue comprobado en ambos motores.

Incidencias de corrección: la primera selección detectó dos expectativas de pruebas que trataban Headers como objeto plano; se actualizaron a `Headers.get`, manteniendo aserciones CAS. Primer lint señaló dos argumentos sin uso del mock; se corrigió su tipado. Se corrigieron tipos de fixture y una expectativa de longitud histórica que ignoraba entradas Forward del test precedente, antes del gate general. Ningún defecto se ocultó reduciendo aserciones. Warnings conocidos de jsdom canvas, directivas `use client` y tamaño de chunks permanecen; compilaciones y suites terminaron correctamente.

### Retest visual atribuido

CUA/IAB realizado por el orquestador contra QA8891, API corregida proceso 16506. Dos pestañas anónimas, A edita borrador y B accede en otra pestaña: A oculta inmediatamente. Invitación sin fragmento pide descarte con foco en Cancelar; cancelar y reautenticar A conserva el nombre modificado. Atrás Cancelar conserva editor; Atrás Descartar vuelve al catálogo y Adelante vuelve a la apertura sin ciclo. No se guardó el borrador ni se creó recurso bajo B. Ver coordinación para detalle. Esta evidencia pertenece al orquestador, no al constructor; no sustituye revisiones independientes.

CUA/Chrome del orquestador: viewport 1024×768 con zoom nativo 200% (DOM 512×384). Acceso con main de 384 px y scrollHeight 601 px; rueda hasta scrollTop 217 permite ver las acciones. Cambio de contraseña con main 384 px, scrollHeight 760 px y scrollTop 375.5: botones accesibles sin introducir credenciales nuevas. Entrada de invitado y terminal de cancelación accesibles con rueda. Body 512 px, sin desbordamiento horizontal. Nombre sintético de 182 caracteres comprobado antes y durante apertura a 1440×900 y 1024×768: capturas fullPage sin recorte ni overflow; cuenta, sistema y acciones legibles. No se probó específicamente recuperación al 200% ni variante de nombre con espacios en este retest; quedan para inspección UI independiente. No se atribuyen esas variantes a las observaciones realizadas. No hubo hallazgos nuevos; fuentes sin cambios tras este retest.

### Historial breve y cierre de construcción

Construcción inicial: 62 archivos, huella 6162c1df4f1da4d507def5b6ee579accc7deab60133527310aa0c22f646e442d, seguida de cuatro CAMBIOS en ronda 1. Corrección actual: siete hallazgos consolidados,15 rutas modificadas frente a ronda 1 y 67 frente a la base; versión 3.13.0 conservada. Sin commit. PostgreSQL liberado tras los gates, sin pools/fixtures/procesos propios activos. QA8891 pertenece al orquestador; 8787 y datos personales intactos. Espera nueva congelación/revisiones, no integración desde construcción.

## Corrección UX-3 — ciclo 2, preparación de ronda 3

El usuario autorizó «inicia ronda 3», documentado en `retrabajo-ciclo-2.md`. El constructor de reemplazo `/root/constructor_011_ciclo2` leyó AGENTS, su perfil, solicitud/spec/build/coordinación, retrabajo y los cuatro informes completos de ronda 2. Seguridad/UI/código aprobaron esa ronda; UX requirió corregir UX-3. Se conservan los cierres anteriores y versión **3.13.0**. No cambios de backend, dependencias, DB, formato, ni Git.

Cambian seis rutas existentes frente a ronda 2: `CHANGELOG.md`, `docs/browser-client.md`, `src/web/AccountAccess.tsx`, `src/web/GameEditor.tsx`, `src/web/Participants.tsx` y `src/web/dialogs.tsx`. Se añaden `src/web/use-active-operation.ts` y `src/web/GameEditor.authority.test.tsx`. El conjunto final conserva 69 rutas frente a la base de 011; huella agregada en Archivos afectados.

### Corrección y aceptación A8/A9/A12

- Las confirmaciones Cerrar/Reabrir/Crear enlace nuevo y la retención terminal se desmontan cuando la cuenta pierde autoridad. `ServiceDialog` cierra el `HTMLDialogElement` en cleanup de layout, liberando la capa modal antes del efecto que enfoca el correo de recuperación. No intenta devolver foco a un disparador oculto/inerte.
- `useActiveOperation` invalida trabajo anterior al suspender o desmontar, incluso si la misma cuenta ya se recuperó cuando llega una respuesta. Consultas de confirmación, guard de salida, inicio/continuidad y resultados de cierre/rotación no pueden reaplicar decisiones o enlaces de esa etapa anterior. Una decisión nueva consulta de nuevo la apertura vigente.
- El panel de participantes se desmonta al suspender, congelar o revalidar. Se cancela su selección de expulsión y sus resultados tardíos no devuelven enlaces al editor recuperado. El viewport/borrador permanece montado.
- El broker cancela las decisiones pendientes con `null` y rechaza abrir otras mientras el editor está suspendido/congelado/revalidando. Esto incluye el guard de guardar/descartar anidado bajo Cerrar/Reabrir. El diálogo de error/conflicto de revalidación se desmonta y borra al suspender; recuperar realiza una comprobación nueva antes de habilitar la mesa.
- Regresiones con GameEditor, Participants, DialogHost y AccountAccess reales, transportes controlados y App reducido a un borrador: las cuatro confirmaciones abiertas; cuatro respuestas de selección tardías; cancelación del guard anidado; resolución tardía del guard; revalidación 503/409; resultados tardíos de expulsión/rotación. Verifican `close`, ausencia de diálogos, foco de recuperación, ausencia de mutación no confirmada y misma identidad/contenido del nodo del borrador. Las pruebas de DOM **no acreditan** por sí solas liberación de modalidad nativa; eso requiere el recorrido CUA atribuido abajo.

### Gates de ciclo 2

- `pnpm typecheck`: PASS final, también ejecutado por los tres builds.
- `pnpm lint`: PASS final, sin errores ni warnings.
- `pnpm test --maxWorkers=2`: **134 archivos / 1240 pruebas PASS**, 30.76 s. Incluye las **14 regresiones nuevas** del ciclo modal/suspensión.
- `pnpm build`: PASS, compilación renderer 4.80 s.
- `pnpm build:api`: PASS, compilación 362 ms.
- `pnpm build:web`: PASS, compilación 5.07 s. Orquestador avisado para reinicio exclusivo de QA8891.
- `git diff --check`: PASS.

Logs sanitizados `/tmp/ttrpg-011-c2-{typecheck,lint,test-final,build,build-api,build-web}.log`. Primer pase focal:27/27; primer general:134 archivos/1239 pruebas. Luego se corrigió el punto de interceptación de la regresión de expulsión tardía y se añadió la variante de respuesta tardía de rotación; se repitieron typecheck/lint y la suite completa con el resultado final1240 indicado arriba. El primer typecheck detectó un tipo demasiado genérico del spy de `dialog.close` en la prueba nueva; se tipó como función sin argumentos, sin cambiar producto ni relajar aserciones. Avisos conocidos de canvas jsdom, directivas `use client` ignoradas y tamaño de chunks permanecen.

No hay cambio de backend ni contratos que requiera repetir gates de motores. La evidencia real de SQLite/PostgreSQL de las rondas anteriores permanece atribuida, sin presentarla como ejecución nueva. PG no fue usado y queda libre. Todos los comandos propios terminaron; no quedan procesos ni recursos de prueba del constructor. No se tocó8787, provisión personal, Git ni tablero.

### Modalidad nativa y cierre del ciclo

Evidencia **del orquestador mediante CUA/IAB**, registrada en `coordinacion.md`, después de reiniciar únicamente QA8891 con el bundle corregido (sesión raíz18384). Se cargó la escena Aurora, se renombró el mapa a «Borrador recuperado ronda 3» sin guardar y se abrió Cerrar partida. El helper privado de fixture revocó únicamente las sesiones Aurora y cerró la sesión administrativa en `finally`.

La recuperación quedó visible y operable: foco automático en correo y Tab hacia contraseña. La lectura del DOM confirmó cero `dialog[open]`. Reautenticar al mismo Aurora restauró exactamente el nombre sin guardar y no reapareció el modal anterior. Después, Partidas abrió el guard de cambios y Descartar mediante locator semántico volvió a Tus partidas sin guardar la escena. Un primer clic AX no produjo navegación; el orquestador verificó el estado antes de usar el control semántico. No se atribuye este recorrido al constructor ni se interpreta ese primer clic como una navegación exitosa.

**Electron queda pendiente de comprobación independiente por UX en ronda3**, según coordinación explícita. Los mocks de `showModal/close` prueban ciclo de vida e interacción DOM; la observación IAB acredita modalidad nativa en ese cliente, sin extrapolarla a Electron ni a todas las variantes. Los gates cubren las variantes de cierre/reapertura/enlace/expulsión/revalidación y respuestas tardías, con los límites ya indicados.

Construcción finalizada con fuentes estables, versión3.13.0 y huella final conservadas. No quedan procesos propios; PostgreSQL libre/no usado en este ciclo y servicio personal8787 intacto. Sin Git, integración ni provisión real. Publicación atómica de este build; espera congelación, cuatro informes independientes y decisión técnica del orquestador.

## Corrección C4/UI-011-3 — ciclo 2, preparación de ronda 4

Los cuatro informes de ronda3 están completos: seguridad/UX APROBADO; UI/código CAMBIOS por carrera del cierre propio. Leídos perfil, AGENTS, solicitud/spec/build/coordinación/retrabajo y los cuatro informes antes de editar. Se conserva el mismo constructor, rama autorizada, versión3.13.0 y backend intacto. El delta de esta corrección comprende cuatro rutas: `src/web/GameEditor.tsx`, `src/web/GameEditor.authority.test.tsx`, `docs/browser-client.md` y `CHANGELOG.md`.

### A5/A8/A9: cierre, reapertura y autoridad

Se separa la vigencia de cuenta del contexto de apertura que origina el terminal. Al comenzar el POST confirmado de cierre/reapertura, el editor registra la apertura que está retirando. Sus terminales continúan consultando la identidad, pero difieren su efecto visual mientras se resuelve la operación. El éxito se reconcilia con un GET actual de apertura: cerrar retira el editor y presenta el estado devuelto; reabrir acepta el ID/generación devueltos y cambia de contexto. No se habilita Continuar sobre metadatos anteriores ni se presenta una revocación por un cierre propio exitoso.

Los callbacks están ligados al ID/generación de origen. Un terminal viejo o la consulta de sesión que termine después de cerrar/desmontar/reabrir no congela la siguiente apertura. Una respuesta tardía transitoria de esa consulta también se descarta por contexto. Un401 real conserva la invalidación propia de HttpTransport; la operación autorizada no puede actualizar tras suspender o reautenticar la cuenta. Si el cierre falla o queda incierto y ya se recibió un terminal, se conserva el borrador congelado en lugar de reanudar el acceso automáticamente.

Diez regresiones nuevas deterministas: cierre/reapertura con terminal antes del POST, POST antes de terminal y consulta de sesión resuelta después de la siguiente apertura (seis); cierre incierto con terminal;401 durante cierre;503/401 tardíos de la sesión de apertura anterior. Usan GameEditor/HttpTransport reales y mesa/fetch controlados. Comprueban estado caducado, ausencia de Continuar obsoleto, inicio efectivo, nueva generación operable, rechazo de callbacks anteriores y respuesta al terminal propio nuevo, además de borrador retenido/autoridad. No sustituyen el retest real de SSE/cliente.

La comprobación de UX-3 en **Electron real** ya quedó APROBADA por UX en `ronda-3/revision-ux.md`: cierre simple y guard anidado, dos revocaciones/recuperaciones de Aurora, nombre de mapa sin guardar conservado, foco en correo/Tab y Escape de una nueva decisión; proceso aislado cerrado mediante guard nativo. Es evidencia independiente atribuida a UX, no una observación del constructor. Permanece vigente junto al CUA/IAB anterior.

### Gates y cierre de la corrección

- `pnpm typecheck`: PASS independiente y en los tres builds finales.
- `pnpm lint`: PASS, repetido al finalizar las variantes de prueba; sin errores ni warnings.
- `pnpm test --maxWorkers=2`: **134 archivos / 1250 pruebas PASS**,36.17s. Incluye las diez regresiones nuevas de esta corrección y las14 del arreglo UX-3 previo.
- `pnpm build`: PASS, renderer6.28s.
- `pnpm build:api`: PASS,620ms.
- `pnpm build:web`: PASS,5.04s. Bundle final comunicado al orquestador para reiniciar exclusivamente QA8891 y retest.
- `git diff --check`: PASS.

Logs sanitizados en `/tmp/ttrpg-011-r3-{typecheck,lint-final,test-final,build,build-api,build-web}.log`. Pase focal inicial36/36; primer general134/1248. Se añadieron los dos casos de503/401 tardíos al comprobar que un error de una consulta de sesión anterior también debe respetar el contexto, conservando la invalidación401 del transporte. Los tres builds con typecheck consumen el producto final; se repitieron lint y toda la suite con1250pruebas. La primera ejecución focal de la nueva carrera falló en seis aserciones sobre el terminal nuevo por reutilizar en el fixture el mismo `Response` ya consumido; se devolvieron respuestas nuevas para consultas posteriores. No se relajaron las aserciones de terminal nuevo ni las de cierre/reapertura. Avisos conocidos de canvas jsdom, directivas `use client` y tamaño de chunks.

Sin cambios ni ejecución nueva de motores; la evidencia SQLite/PostgreSQL previa conserva atribución. Todos los comandos del constructor terminaron, sin procesos/pools/fixtures propios pendientes. PG no usado y libre. Servicio personal8787, provisión y Git intactos. Fuentes estables y versión3.13.0 conservada; build final publicado atómicamente y espera cuatro revisiones de ronda4.

### Retest real atribuido al orquestador

`coordinacion.md` registra CUA/IAB con Boreal y la partida sintética «QA UI ronda tres», después de reiniciar limpiamente solo API8891 con el bundle final (sesión raíz82256). Iniciar y Cerrar partida/Confirmar mostró **Acceso caducado** e **Iniciar partida** operable, sin aviso de pérdida de acceso. Iniciar otra vez devolvió el editor; Reabrir/Confirmar dejó el editor operativo sin modal antiguo ni terminal. Un segundo cierre volvió a Acceso caducado/Iniciar. Interfaz y DOM observados por el orquestador, no por el constructor.

No se atribuye a CUA el control del orden HTTP/terminal: lo cubren las regresiones deterministas descritas. No hubo cambios de escenas ni publicación. Boreal cerró sesión, pestaña propia cerrada y aperturas de prueba cerradas;8787 intacto. No se encontraron hallazgos nuevos en este recorrido. El cierre independiente de C4/UI-011-3 corresponde a UI/código y la decisión técnica de ronda4.

## Archivos afectados

69 archivos distintos respecto de la base acordada. Huella agregada SHA-256 del conjunto final: `2fd869408ca0d697252bbb6935487192946533b665d1b3de07ceb6222f0dfed0`. Se calcula ordenando las rutas enumeradas y concatenando líneas `SHA256(contenido)  ruta\n`, codificadas UTF-8. No incluye expediente ni fixtures/artefactos ignorados.

Rutas:

- `.env.example`
- `.gitignore`
- `CHANGELOG.md`
- `README.md`
- `docs/browser-client.md`
- `docs/client-architecture.md`
- `docs/database.md`
- `docs/identity.md`
- `docs/invitations.md`
- `docs/moderation.md`
- `docs/owned-data.md`
- `docs/private-api.md`
- `docs/service-operations.md`
- `docs/synchronized-table.md`
- `eslint.config.js`
- `package.json`
- `scripts/setup-env.sh`
- `src/infrastructure/browser/browser-client.test.ts`
- `src/infrastructure/browser/browser-client.ts`
- `src/infrastructure/browser/contextual-table-client.ts`
- `src/infrastructure/browser/http.ts`
- `src/infrastructure/browser/mutations.ts`
- `src/infrastructure/browser/owned-client.test.ts`
- `src/infrastructure/browser/table-client.ts`
- `src/infrastructure/server/database/catalog.contract.ts`
- `src/infrastructure/server/database/config.test.ts`
- `src/infrastructure/server/identity/config.ts`
- `src/infrastructure/server/identity/identity.contract.ts`
- `src/infrastructure/server/identity/index.ts`
- `src/infrastructure/server/identity/password.test.ts`
- `src/infrastructure/server/moderation/service-final.contract.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/components/aside/MonsterLibraryModal.tsx`
- `src/renderer/src/components/aside/MonsterSection.tsx`
- `src/renderer/src/components/aside/MonsterTemplateFields.tsx`
- `src/renderer/src/components/aside/MonsterTemplateManagerModal.tsx`
- `src/renderer/src/components/workspace/WorkspaceHeader.tsx`
- `src/renderer/src/styles.css`
- `src/server/config.ts`
- `src/server/environment-setup.test.ts`
- `src/server/http.test.ts`
- `src/server/http.ts`
- `src/server/index.ts`
- `src/server/legacy-http.fixture.ts`
- `src/server/moderation-backend.ts`
- `src/server/moderation-http.ts`
- `src/server/owned-http.ts`
- `src/server/owned-scene-links.ts`
- `src/server/table-http.test.ts`
- `src/shared/api/client.ts`
- `src/shared/contracts/service-references.ts`
- `src/web/AccountAccess.tsx`
- `src/web/AdminAccounts.tsx`
- `src/web/AdminSystems.tsx`
- `src/web/GameCatalog.tsx`
- `src/web/GameEditor.authority.test.tsx`
- `src/web/GameEditor.test.tsx`
- `src/web/GameEditor.tsx`
- `src/web/GuestEntry.tsx`
- `src/web/Participants.tsx`
- `src/web/ServiceApp.test.tsx`
- `src/web/ServiceApp.tsx`
- `src/web/dialogs.tsx`
- `src/web/main.tsx`
- `src/web/service-model.ts`
- `src/web/service.css`
- `src/web/use-active-operation.ts`
- `src/web/use-service-navigation.ts`
- `src/web/workspace.ts`

## Operación, limpieza y pendientes de cierre

Solo fixtures propias. El servicio real 8787 y sus datos/configuración permanecieron intactos. No se leyó provisión personal ni se asignó legado al admin. PostgreSQL queda explícitamente liberado para las revisiones; no quedan gates del constructor ejecutándose. PG y herramientas temporales siguen administrados por el orquestador; cada gate limpia sus bases/pools/directorios de fixture. Servicio QA 8891 queda disponible para revisión y su retirada será coordinada. Datos privados dentro de `.local` ignorada, permisos restrictivos; ningún secreto en Git/logs/este expediente.

El propietarioDM del legado personal sigue siendo un requisito del corte, no de construcción: preservar fuente si aún falta. El orquestador conserva autorización y responsabilidad de commit/merge local, main habitual, configuración/provisión real, respaldo consistente, arranque y DMG postmerge. Este build no afirma que esas acciones hayan ocurrido.
