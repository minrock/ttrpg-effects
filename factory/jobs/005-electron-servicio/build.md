# Build — 005 Electron cliente del servicio

Construcción ciclo 1, ronda 0 y corrección de ronda 1, 2026-10-29. Rama comprobada: `feature/fabrica-software`. Versión **3.6.0**, bump minor único; formato `.ttrpgscene` **v2** conservado con migración v1. Se leyeron solicitud/spec/perfil constructor, convenciones, contratos/fuentes y entregas/decisiones 001–004 antes de implementar. La orden de avance llegó tras APROBAR de 004.

## Resultado y composición

Electron tiene selección explícita `TTRPG_ELECTRON_MODE=local|service` (local por defecto) y `TTRPG_SERVICE_URL` obligatorio para servicio. La URL se normaliza y exige raíz HTTP(S), sin credenciales/query/fragmento; HTTP solo en localhost exacto o IP loopback. HTTPS mantiene validación normal de certificados. La URL de electron-vite nunca selecciona el modo.

`src/main/index.ts` decide antes de importar infraestructura. La composición local se trasladó a `local-app.ts`, conservando protocolo, IPC, repositorios, recientes y precarga Player. La rama servicio importa solo `service-app.ts`, configura una partición efímera única, flags sandbox/contextIsolation/Node deshabilitado y **ningún preload**. No registra IPC/protocolo local ni abre bibliotecas del perfil. El mismo frontend web/API/HTTP/SSE se carga directamente; no hay adaptador remoto ni reglas duplicadas en main.

`window-policy.ts` limita navegación/redirecciones principales y subframes, incluidas peticiones iniciales, mediante origen HTTP(S) completo. Bloquea popups, webviews y permisos. La política por sesión despacha por WebContents: protege cada ventana y permite que DevTools use su propio WebContents. Las ventanas locales DM/Player aceptan únicamente su renderer file exacto o el renderer de desarrollo loopback aprobado; query Player no amplía el destino. Los recursos, selectores y descargas ordinarias permanecen operativos.

La recuperación es HTML propio sin scripts/preload, con CSP restrictiva, origen visible y Reintentar/Salir por teclado. Solo la página exacta de recuperación puede interpretar su enlace de salida; una página del servicio no puede activar esa acción. No se recarga el frontend durante una pérdida HTTP/SSE. Título y menú distinguen el modo servicio y no incluyen recientes/acciones IPC locales.

La proyección usa el flujo web existente: URL visible para otro navegador/perfil autenticado como jugador. Los popups quedan bloqueados. El botón Copiar recibe denegación de permisos y muestra correctamente «Selecciona el enlace y cópialo manualmente»; el campo seleccionable y Editar → Copiar son la alternativa documentada. No se concedieron permisos adicionales de portapapeles.

## Archivos del alcance

- `src/main/index.ts`, nuevos `local-app.ts`, `electron-config.ts`, `window-policy.ts`, `service-app.ts`; `src/main/ipc/player-window-ipc.ts` instala también la protección local.
- Nuevos tests `src/main/{electron-config,electron-entry,service-app}.test.ts`: URL, modos/composición, flags, navegación, permisos, recuperación y salida.
- `electron.vite.config.ts`: chunks main junto al entry para preservar `__dirname` y rutas históricas a preload/renderer.
- `src/server/static-files.ts` y nuevo test: arranque falla con error `TTRPG_WEB_DIR` si falta un index físico/legible, antes de componer el store. No cambian rutas ni persistencia de la API.
- `package.json`: versión y scripts `dev:service`/`start:service`; empaquetado restringido a `out/main`, `out/preload`, `out/renderer`, sin API/web ni datos privados. `CHANGELOG.md`: entrada fechada feature.
- `docs/service-operations.md`, `docs/private-api.md`, `README.md`: guía enlazada, requisitos/comandos, variables, claves/rotación, HTTPS/SSE, directorios/backup/restore, escenas y matriz; se corrige tabla obsoleta de permisos jugador sobre assets.

No se editaron solicitud, spec, tablero, backlog, revisiones o decisiones. Se conservan los cambios anteriores. No se añadieron dependencias.

## Criterio → evidencia

| Criterio | Evidencia real y resultado |
| --- | --- |
| Configuración | Pruebas de protocolos, credenciales, query/fragmentos, hosts engañosos, puertos, IPv4 normalizado/127/8 e IPv6 ::1; HTTPS remoto y origen exacto. Modo inválido no compone local. `pnpm dev` real abrió renderer local5173; `pnpm dev:service` con ese Vite activo abrió URL servicio8799 y recuperación. |
| Composición Electron | Tests de entrada confirman que servicio no evalúa módulo local ni registra su protocolo; ventana sin preload y partición no persistente. Inspección real frontend y servidor de ensayo: `window.ttrpg`, `require`, `ipcRenderer` y `process` son `undefined`. El directorio temporal servicio no contiene bases ni recientes; el local sí contiene `ttrpg-effects.sqlite` y `recent-scenes.json`. |
| Navegación/permisos | Servidor HTTP real devolvió302 externo durante carga inicial: recuperación visible. Desde página:302 externo, enlace file y popups mismo/otro origen no cambiaron la ventana. Geolocalización: estado denied y callback error1. Repetido sobre artefacto final después de corregir dispatcher/rutas. DM/Player locales conservaron file URL tras intento remoto; popup Player devolvió null. |
| Electron local | Artefacto compilado sin variables de servicio ni claves, perfil temporal: cargó mapa900×600 desde fixture, editó Local005, guardó otro archivo, lo reabrió desde recientes y abrió Player con el mismo mapa. Bridge local es objeto en DM/Player, require undefined. API estaba apagada durante comprobaciones finales. Cámara, puntero, bibliotecas y dados locales conservan suites y humo atribuido001–004; no se repitió exhaustivamente cada herramienta ni tirada oculta nativa en005. |
| Web DM/jugador | Nueva integración cruzada: Electron DM subió PNG, guardó, publicó; Chrome jugador con cookie independiente mostró mapa y DM indicó Jugador listo. Después logout de ambos y roles invertidos: web DM cargó guardado y publicó a Electron jugador. Privacidad detallada de notas/mapas/assets/dados/reconexión se reutiliza de004, cuyos módulos no cambian, y suite final completa. |
| Electron servicio | CUA: upload por selector nativo web, guardar, exportar JSON mediante diálogo de descarga a /tmp, importar ese archivo con identidad nueva y cargar original desde catálogo. Cambio de rol dejó login y Player sin controles DM. Consulta real desde renderer jugador: `/auth/session`200 y `/scenes`403. Tras cambio de ubicación de chunks se repitió arranque/login contra frontend compilado real. |
| Fallos/recuperación | Puerto cerrado: mensaje visible y Tab/Enter reintenta con éxito al levantar servidor. TLS local autofirmado: ERR_CERT_AUTHORITY_INVALID, recuperación visible, sin excepción de certificado. Redirección externa inicial bloqueada. SIGSTOP/SIGCONT del único proceso API de prueba produjo Mesa desconectada y recuperación sin recarga; nombre editado conservado, guardado posterior y lectura desde web confirmados. Logout real en ambos roles; expiración/401 y limpieza profunda mantienen suites003/004. Salir de recuperación verificado con cierre del proceso/código0. |
| Operación | Orquestador ejecutó de nuevo su arnés sobre API final3.6: producción sirve frontend sin Electron/dev server; reinicio conserva escena/PNG byte a byte/NPC/monstruo, invalida cookie y vacía mesa/dados; respaldo detenido y restauración en otro directorio recuperan todo y hashes coinciden. Prueba negativa adicional del constructor: directorio web vacío devuelve exit1, mensaje TTRPG_WEB_DIR y `dataCreated=false`. |
| Compatibilidad | No cambia esquema de escenas. Suite completa incluye fixtures v1/v2, mapas/enlaces y recuperación de imágenes; import/export real005 conservó referencia asset e imagen en la misma instancia. El JSON exportado no empaqueta assets, tal como guía y UI explican. |
| Entrega | Checks comunes y builds independientes PASS; versión/changelog3.6.0; guía enlazada. Sin staging, commit, push, merge, despliegue ni DMG. |

## Humo real del constructor

Entorno: macOS arm64, Node **24.15.0**, Electron **39.8.10** (Chromium142.0.7444.265, Node embebido22.22.1), Chrome **156.0.8078.48**. Todas las interacciones de aplicaciones/navegador y consola DevTools se hicieron mediante CUA. No se usó CDP/Playwright externo ni scripts de automatización UI. El servidor HTTP de ensayo y los comandos de procesos/filesystem son auxiliares de prueba, no controladores UI.

Directorio principal: `/private/tmp/ttrpg-005-cua-fb7euje9`, con perfiles separados `electron-service`, `electron-local`, `electron-final`, `electron-tls`, `electron-exit`, `electron-dev-service` y `electron-dev-local`; datos API en `data`. Claves sintéticas temporales, sin credenciales personales. Puertos8795 API/ensayo inicial,8797 ensayo final,8798 TLS y8799 destino cerrado. Vite local5173 durante humo de desarrollo. No se tocó la biblioteca personal.

Comandos ejecutados:

```sh
TTRPG_SERVICE_URL=http://127.0.0.1:8795 pnpm start:service --user-data-dir=/private/tmp/ttrpg-005-cua-fb7euje9/electron-service
NODE_OPTIONS=--experimental-sqlite pnpm exec electron . --user-data-dir=/private/tmp/ttrpg-005-cua-fb7euje9/electron-local
ELECTRON_CLI_ARGS='["--user-data-dir=/private/tmp/ttrpg-005-cua-fb7euje9/electron-dev-service"]' TTRPG_SERVICE_URL=http://127.0.0.1:8799 pnpm dev:service
ELECTRON_CLI_ARGS='["--user-data-dir=/private/tmp/ttrpg-005-cua-fb7euje9/electron-dev-local"]' pnpm dev
python3 /tmp/005-boundary-server.py
```

API propia: wrapper Python lanzó `pnpm exec node out/api/index.mjs` con variables privadas, `TTRPG_WEB_DIR` absoluto al build y puerto8795. TLS usó certificado autofirmado temporal generado con openssl y HTTPServer Python/SSL en8798; no se instaló confianza ni se aceptó advertencia. El servidor de fronteras mostró en su DOM los resultados de ausencia de bridge/Node y permisos. La navegación de prueba no leyó el archivo file intentado.

Secuencia de integración: mapa sintético `/tmp/ttrpg-003-map.png`; escena remota «Mesa Electron 005» guardada ID `b0417f6f-79c3-4d39-a650-63e5f46784d7`; importación del JSON exportado creó `87f476ee-f66d-4e0e-80f3-208934311a70`. Exportación quedó en `Mesa Electron 005.ttrpgscene` del directorio temporal. Durante SIGSTOP se editó nombre `Cambioconservado005`; SIGCONT recuperó sesión/mesa y Guardar confirmó éxito. Chrome DM leyó después ese nombre. Cookies nunca se trasladaron entre clientes.

Local usó copia descartable de la fixture003: `local.ttrpgscene`; edición `Local005` y guardado nativo `local-guardada.ttrpgscene.ttrpgscene` (el diálogo añadió extensión al nombre introducido). Se verificó recarga desde el menú Recientes. Player cargó `out/renderer/index.html?view=player`, renderizó el mapa y conservó preload. No se presenta esta copia de prueba como migración de datos personales.

### Tamaños, accesibilidad y consola

- Servicio1440×900: recuperación inicial y login/VTT; `outerWidth/outerHeight` confirmados mediante consola CUA. Área cliente1440×872 por título nativo.
- Servicio1024×768: ventana redimensionada por API web ordinaria desde consola CUA, medida outer1024×768; cliente1024×740. Capturas de DM, Player con brújula y recuperación: sin scroll horizontal ni controles de recuperación cortados; VTT adapta drawers. Recuperación tiene foco visible en Reintentar y operación Tab/Enter. Brújula, logout y Mesa de jugador permanecen separados.
- Local820×520: consola confirmó dimensiones y URL file después del intento remoto; captura con mapa/controles visibles, paneles adaptados. Se conserva el rail desplazable existente.
- Proyección web1920×1080: viewport CUA explícito y captura durante desconexión, mapa y controles legibles. Restablecido al finalizar. Se reutiliza la matriz detallada de004 para Mesa abierta/cerrada/escala/brújula y sus tres resoluciones.

Se inspeccionaron capturas reales en CUA; no se guardaron PNG fuera del historial de herramientas. No se atribuye un lector de pantalla físico, proyector o varios equipos remotos.

Consola servicio mostró401 inicial esperado al consultar sesión y mensajes CSP por un probe data:image de Pixi; el mapa renderizó correctamente. El intento privado jugador produjo403 esperado. Rechazo de conexión/TLS y caída deliberada produjeron errores de red previstos. Local compilado mostró el aviso previo Electron sobre CSP/unsafe-eval y SQLite experimental; no se cambió la CSP local en este trabajo. No se afirma consola completamente vacía. Suites mantienen avisos conocidos canvas/jsdom y builds avisos de chunks/directivas de dependencias.

## Evidencia operativa atribuida al orquestador

Fuente leída: `/tmp/ttrpg-005-operacion.md`, regenerada tras build API definitivo. Comando `python3 /tmp/ttrpg-005-operacion.py`; arranques reales `pnpm exec node out/api/index.mjs`. Directorio final `/private/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-005-operacion-tep2x1cy`.

Producción respondió HTML al navegador y404 sin HTML para API desconocida/asset ausente. Reinicio limpio preservó escena, PNG idéntico y bibliotecas NPC/monstruos; sesión antigua401, publicación/dados vacíos. Se copiaron todos los archivos presentes con servicio detenido (`entities.sqlite`, `monsters.sqlite`, `service.sqlite`; sin sidecars pendientes), y se restauraron en otro directorio. Hashes coincidieron antes del arranque y recursos/exportación/imagen se releyeron. Configuración se recreó con ruta/origen correctos y claves fuera del backup. Procesos cerrados por SIGTERM y lock retirado. Esta es evidencia del orquestador, no un recorrido CUA del constructor.

El ensayo negativo del constructor quedó en `/tmp/005-missing-web.json`: web vacío en `/private/tmp/ttrpg-005-missing-web-jx18gpqh`, salida1, error TTRPG_WEB_DIR y ningún directorio de datos creado.

## Checks finales

| Comando | Resultado y log |
| --- | --- |
| `pnpm typecheck` | PASS, `/tmp/005-typecheck-final.log`; repetido por los tres builds. |
| `pnpm lint` | PASS, `/tmp/005-lint-final.log`. |
| `pnpm test` | **125 archivos / 1171 pruebas PASS**, `/tmp/005-tests-final.log`. Incluye todos los cambios finales. |
| `pnpm build` | PASS, `/tmp/005-build-electron-final.log`. Reejecutado después del humo dev para dejar artefactos de producción. |
| `pnpm build:api` | PASS, `/tmp/005-build-api-final.log`; sobre este artefacto se repitió operación. |
| `pnpm build:web` | PASS, `/tmp/005-build-web-final.log`. |
| Dirigidos Electron | 33 PASS, `/tmp/005-final-directed.log`. |
| Dirigidos estáticos/adaptador | 21 PASS, `/tmp/005-static-tests.log`. |
| `git diff --check` | PASS. |

No se suman suites dirigidas a la cifra completa. Hubo un error transitorio de typecheck al tratar webContentsId opcional; se corrigió antes del build final. Las salidas finales coexisten y no contienen datos SQLite/configuración privada.

## Correcciones descubiertas durante construcción

1. Política global de navegación de sesión impedía el propio frontend DevTools. Se acotó por WebContents, con protección conservada para DM/Player/servicio; DevTools real y bloqueos se volvieron a probar.
2. Import dinámico local generaba `out/main/chunks`, desplazando `__dirname`: renderer/preload buscaban ruta equivocada. `chunkFileNames` ubica chunks junto al entry. Humo final verificó ambas ventanas locales y el servicio, sin relajar ninguna allowlist.
3. El esquema especial de Salir era bloqueado antes de llegar a la acción. Se reemplazó por enlace HTTP(S) del origen con fragmento reservado, interpretado solo desde la recuperación exacta. Test y click real cerraron proceso con código0.
4. Directorio web existente sin index arrancaba ambiguamente. Ahora valida index físico/legible antes de abrir store; prueba negativa real y arnés operativo final positivos.

No hay ronda de revisión previa para005; estas correcciones pertenecen a la construcción inicial y no duplicaron versión/changelog.

## Límites y cierre

No se desplegó proxy HTTPS remoto ni se ensayó un certificado público válido: se probó el rechazo TLS local y se documenta la configuración operativa. No se repitieron manualmente todas las herramientas, bibliotecas, enlaces, cámara/puntero/áreas/dados abiertos/ocultos ni todas las variantes de expiración de001–004; su evidencia previa queda atribuida a sus build/decisiones y las suites completas se ejecutaron nuevamente. La matriz nueva se centró en fronteras/composición, archivo local, ambos roles Electron, recuperación e integración cruzada. Las limitaciones previas de crítico natural, dibujos manuales y dados ocultos nativos no se convierten aquí en pruebas realizadas.

Todos los procesos/ventanas/pestañas propios se cerraron y los viewports se restablecieron. No hay procesos propios en8795/8797/8798/8799 ni electron-vite activo. Permanecen únicamente archivos temporales de evidencia, fuera del repositorio. Sin staging, commits, push, merge, despliegue ni DMG. Implementación disponible para las cuatro revisiones independientes; este informe no es aprobación técnica ni permiso de integración.


## Corrección de ronda 1 — UX-005-01 y UX-005-02

Se leyeron completos los cuatro informes de `ronda-1`: seguridad, UI y código APROBADO; UX CAMBIOS por cierre silenciosamente vetado y observación editorial README. Esta sección actualiza el estado final; las pruebas y límites anteriores se conservan como evidencia histórica de la construcción inicial.

### Cambio y correspondencia con hallazgos

- **UX-005-01 resuelto:** `src/main/service-app.ts` atiende `will-prevent-unload` del WebContents con `dialog.showMessageBoxSync` asociado a su ventana. Mensaje «Hay cambios sin guardar», explicación de cómo guardar antes de salir y botones «Seguir editando»/«Descartar y salir». La opción por defecto y de cancelación es seguir editando. Solo respuesta explícita 1 llama `event.preventDefault()` para levantar el veto; las demás conservan la página. No se fuerza cierre ni se recarga, no se añade preload/IPC/bridge ni se cambian permisos. Este evento cubre cerrar ventana y salir de la aplicación. Se siguió el contrato oficial de [will-prevent-unload](https://www.electronjs.org/docs/latest/api/web-contents#event-will-prevent-unload); la decisión es síncrona porque el evento resuelve el veto en ese momento.
- `src/main/service-app.test.ts` añade regresión del host: no abre diálogo al componer, cancelación no levanta veto ni carga de nuevo, segunda solicitud exige nuevo consentimiento y solo descarte lo levanta. Respuestas -1, 0, 2 e indefinida no descartan. Conserva tests de sandbox/partición/ausencia de preload/permisos y recuperación.
- **UX-005-02 resuelto:** README, Arquitectura de clientes, explica los transportes implementados Electron local y servicio privado HTTP/SSE compartido con navegador y roles. Enlaza la guía operativa. `docs/service-operations.md` explica el nuevo diálogo, cómo guardar antes, Escape y salida sin cambios.

Únicos archivos de esta corrección: esos cuatro archivos y este build. Versión permanece **3.6.0**; no se repite bump ni entrada changelog.

### Regresión real Electron por CUA

Entorno igual al humo inicial: macOS arm64/Electron39.8.10. Artefacto `pnpm build` de esta corrección y frontend/API compilados previamente, cuyos módulos no cambian. API real con `pnpm exec node out/api/index.mjs`, directorio `/private/tmp/ttrpg-005-r1-kqkool6o/data`, origen/puerto efímero `http://127.0.0.1:50112`, claves de prueba fuera del repositorio. Cliente:

```sh
TTRPG_SERVICE_URL=http://127.0.0.1:50112 pnpm start:service --user-data-dir=/private/tmp/ttrpg-005-r1-kqkool6o/electron-service
```

Todas las interacciones UI se hicieron por CUA. Login DM, upload mediante selector de `/tmp/ttrpg-003-map.png` y edición de nombre a `Borrador-cierre-005`:

1. Botón nativo de cerrar: aparece diálogo español, legible completo, inspeccionado en captura y árbol accesible. **Escape cancela**; mapa900×600 y nombre exacto siguen visibles.
2. **Cmd+Q:** mismo diálogo. Click «Seguir editando» conserva mapa y borrador. Intentos de Return/KP_Enter mediante CUA no activaron una opción; no se atribuye esa activación como probada. La selección segura por defecto/cancelación se comprueba en opciones del host y Escape real; no se usó lector de pantalla.
3. Se guardó «Cierre ronda 1», ID `48a0e1e5-2b50-470c-8fa2-02b3add8fd95`. Nueva edición `Descarte-cierre-005`, botón nativo cerrar y **click explícito Descartar y salir**: proceso terminó código0.
4. Nuevo proceso, login de nuevo por sesión efímera, carga del guardado: aparece `Borrador-cierre-005`, acreditando que el descarte no guardó el nombre posterior. Edición `Descarte-salir-005`, **Cmd+Q → Descartar y salir**: proceso terminó código0.
5. Tercer proceso mostró login sin borrador. **Cmd+Q cerró directamente con código0**, sin confirmación ni bloqueo.

La salida limpia sin cambios se verificó en login; no se repitió esa salida con una escena guardada. No se repitieron roles cruzados, TLS, operación/backup ni toda la matriz VTT porque no cambian sus módulos. Su evidencia previa y límites siguen atribuidos arriba. No se afirma que los tests unitarios sustituyan estos cierres nativos.

Tras el primer cierre, una consulta de estado CUA volvió a abrir la pantalla estándar de Electron; se cerró por Cmd+Q. Se evitó consultar el objeto de app cerrado en los siguientes casos. Los tres procesos de producto terminaron código0; API temporal cerrada limpiamente por interrupción, código0. Inspección final de procesos no encontró Electron/API propios. No se accedió al perfil personal ni se dejaron pestañas o procesos de prueba. Capturas inspeccionadas en historial CUA, sin PNG adicional.

### Checks posteriores a la corrección

| Comando | Resultado |
| --- | --- |
| `pnpm exec vitest run src/main/service-app.test.ts src/main/electron-entry.test.ts` | 2 archivos / 11 pruebas PASS, `/tmp/005-r1-directed.log`. |
| `pnpm test` | **125 archivos / 1176 pruebas PASS**, `/tmp/005-r1-tests.log`. |
| `pnpm lint` | PASS, `/tmp/005-r1-lint.log`. |
| `pnpm typecheck` | PASS, `/tmp/005-r1-typecheck.log`; también ejecutado por build. |
| `pnpm build` | PASS, `/tmp/005-r1-build.log`; este artefacto se usó en el humo CUA. |
| `git diff --check` | PASS. |

Se reutilizan build API/web y operación final acreditados arriba: ninguna fuente o configuración API/web cambió en esta corrección. Los avisos conocidos canvas/jsdom y tamaño/directivas de dependencias persisten; no se detectó fallo nuevo en estos checks. No hay ensayos adicionales necesarios para estos dos hallazgos.

### Autorización y entrega actual

Se leyó [aprobacion-usuario.md](aprobacion-usuario.md): la invocación explícita `$factory aprobar` del usuario autoriza al orquestador a preparar commits locales e integrar la serie tras cierre técnico, seguida de DMG, sin push. Esa orden posterior reemplaza la prohibición histórica de integración para el orquestador; **el encargo de este constructor sigue sin Git write, merge ni DMG**. No se realizó ninguna de esas operaciones en esta corrección y no se afirma integración. Se conservaron los documentos de orquestación actualizados por el padre. Corrección publicada para nueva ronda completa de las cuatro revisiones.
