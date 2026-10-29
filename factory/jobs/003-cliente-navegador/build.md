# Construcción 003 — Cliente navegador

Ciclo 1, 2026-10-28/29. Versión 3.4.0, formato `.ttrpgscene` 2 compatible con migración 1. Construcción realizada sobre `feature/fabrica-software`, después de la autorización de avance y aprobación técnica de 002. Sin staging, commits, push, merge, despliegue ni DMG. Se preservan los cambios anteriores de 001/002 y spec40. Pendiente de cuatro revisiones independientes; este archivo no constituye aprobación.

## Resultado y decisiones

El DM entra al VTT React/Pixi existente, persiste escenas, mapas y recursos mediante el servicio privado real y puede recargar/abrir desde selector. El jugador autenticado utiliza PlayerApp con estado explícito de proyección pendiente, sin montar App ni consultar datos privados. El contrato completo existe en el adaptador, pero las capacidades ausentes retornan fallos explícitos y no simulan eventos ni publicación.

Se reconciliaron las specs/build/decisiones 001/002 y contratos efectivos antes de implementar. `/api/v1`, cookie HttpOnly de mismo origen, esquemas y límites proceden de 002. Se añadieron exclusivamente endpoints indispensables de enlaces y estáticos. Referencias `scene:UUID` y `asset:UUID` sustituyen semánticamente rutas locales dentro del adaptador, sin cambiar el formato del documento. La composición pura de importar mapas se extrajo del caso de uso local para evitar dependencias Node en web. La validación original de reemplazo Electron permanece estricta; existe un esquema separado para referencias HTTP emparejadas.

La CSP conserva `script-src 'self'` sin `unsafe-eval`. El humo descubrió que Pixi necesitaba su módulo `pixi.js/unsafe-eval`: se inspeccionó el paquete y se incorporaron sus generadores sin evaluación dinámica. Tras rebuild el canvas real renderizó bajo la CSP. No se relajó la política para resolverlo.

## Archivos del alcance

- Nuevos: `src/infrastructure/browser/{http,browser-client,files}.ts` y tests; `src/shared/contracts/service-references.ts`; `src/web/{main,ServiceApp,dialogs,workspace}.tsx/ts`, HTML/CSS/Vite y pruebas; `src/server/{scene-links,static-files}.ts`; `compose-imported-scene-map.ts`; `ServiceImageExtension.ts`; `docs/browser-client.md`.
- Ajustes API: `src/server/{http,config,scene-service}.ts` y `src/infrastructure/server/service-store.ts`: estáticos opcionales confinados, imágenes de notas detectadas, enlaces recíprocos y transacciones.
- Ajustes aplicación/render: `import-scene-map`, `prepare-map-image-replacement`, `map-image-storage`, `map-image-resource`, App, PlayerApp, WorkspaceHeader, NoteEditor/ImagePicker, Markdown/extensiones y prueba App.workspace. Se reutilizan herramientas, bibliotecas, hooks, modales de mapas y motores.
- Contrato composición: metadato opcional `TtrpgClient.assetReferences: "service"` habilita inserción de imágenes persistentes en notas web, sin habilitarla falsamente en Electron; no concede autorización.
- `package.json` versión3.4.0 y scripts dev:web/build:web; CHANGELOG entrada feature; docs de API y arquitectura actualizadas. No dependencia nueva ni cambio propio de lockfile.

## Correspondencia de aceptación

| Criterio | Implementación y evidencia |
| --- | --- |
| Adaptador y seguridad | HTTP con cookies same-origin, validación JSON/esquema, distinción401/403/404/413/500/red; rechazo HTML/JSON inválido. Generación verificada después del cuerpo; selectores/archivos obsoletos se descartan incluso después de reautenticar. Pruebas browser-client +files. Rutas host/file/externas no resuelven. |
| Roles/sesión | Consulta inicial sin App; servidor decide rol; jugador no solicita recursos DM.401 oculta/inertiza App, conserva memoria y exige DM; logout confirma revocación antes de limpiar. UI ServiceApp y CUA con contextos IAB/Chrome separados. |
| Cambios pendientes | Guardar/descartar/cancelar en carga/import/logout; escritura fallida impide continuar, aviso beforeunload, sin autosave privado web. Test App real con viewport aislado: fallo/cancelar/descartar y sin Storage.setItem; test diálogo/foco/Escape. |
| Escenas | Selector con nombres/páginas/vacío/error/reintento; POST nuevo/PUT misma identidad; import/export compatibles; importación como mapa reutiliza composición. Integración real guarda/actualiza/importa/combina/recarga tras reinicio; CUA guardar/recargar/cargar/importar/exportar. |
| Imágenes | Subida binaria real, referencias validadas, PNG/JPEG/WebP20MiB, rechazoHEIC; resolución auténtica. Reemplazo reutiliza garantías existentes. CUA mapa/luz/medición/nota con imagen y reemplazo de fondo inactivo; importación con ruta ausente identificada. Tests HTTP y regresión de reemplazo. |
| Bibliotecas/plantillas | Adaptadores reales search/get/save para las tres bibliotecas; lista/guardar/eliminar plantillas. Integración con SQLite y reinicio conserva datos/imágenes; UI existente y pruebas de ciclo de vida. No se afirma humo manual exhaustivo de estas bibliotecas. |
| Enlaces | Selectores de escenas/marcadores, UUID seguro; conectar/desconectar/navegar/validar reales. Transacción recíproca y revalidación. Integración demuestra navegación/desconexión y rollback de ambos extremos ante fallo del segundo guardado. Referencias locales quedan reparables sin adivinar basename. |
| Paridad y capacidades | [Matriz efectiva](../../../docs/browser-client.md#matriz-de-paridad-y-evidencia). Misma App/PlayerApp/MapViewport; capacidades player/dice/nativeMenus desactivadas web. Estados recuperables y sin eventos simulados. Electron local mantiene IPC. |
| Estáticos/build | build web separado; rutas confinadas por realpath y extensión, sin ocultos/traversal/symlink externo; API/imagenes404 nunca reciben fallback HTML. Pruebas HTTP de fallback/métodos/CSP. Arranque producción y desarrollo verificados. |
| Regresión local/labs | Suite completa más humo Electron con perfil temporal y lab existente, detallados abajo. |

## Humo CUA contra servicio real

Servicio Node24 local127.0.0.1:8787 con directorio temporal físico independiente y claves de prueba DM/jugador. No datos del perfil personal. Archivo PNG900×600 generado para prueba. Navegadores Chrome por extensión CUA e IAB Chromium; todas las interacciones UI por CUA, sin CDP/Playwright externos.

1. Acceso DM real; subida de mapa desde selector IAB. Chrome rechazó `setFiles` por permiso de extensión; no se cambió ese permiso, se continuó con IAB. Canvas de mapa real900×600 bajo CSP.
2. Creación de luz puntual y medición15ft; nota privada con imagen subida desde editor. Guardar como “Humo VTT privado”; recargar sesión, abrir selector y recuperar mapas/elementos/nota.
3. Segundo mapa; actualizar fondo de Mapa1 mientras Mapa2 permanece activo. Diálogo con previews/dimensiones y política conservar tamaño; confirmación mantiene activo Mapa2; guardar ambos.
4. Exportar mediante menú en IAB y Chrome. CUA `waitForEvent(download)` expiró, pero ambos archivos existían en Downloads: `Humo VTT privado.ttrpgscene` y copia(1), JSON válido versión2,2mapas,1nota. Se movieron exclusivamente esos artefactos propios a `/tmp/ttrpg-003-export-*`.
5. Importar mediante selector `.ttrpgscene` derivado de export con referencia `/missing-private-map.png`: se crea nueva escena, mantiene2mapas y nota; aviso identifica `maps/map-1/map` y referencia original. No lectura del host.
6. Detener API y guardar: mensaje de conexión recuperable y escena intacta. Reiniciar mismo directorio y guardar:401 muestra “Recuperar sesión”, rol DM fijo y sin datos privados visibles. Reautenticar recupera misma escena/identidad; guardar vuelve a funcionar.
7. Chrome independiente inicia jugador mientras IAB mantiene DM: captura1920×1080 muestra únicamente estado de proyección pendiente y controles locales deshabilitados, sin nombres/paneles privados. Logout jugador y DM regresan a acceso.
8.1440×900: canvas/editor/reemplazo inspeccionados.1024×768: drawers colapsados y DOM width/scrollWidth1024, sin scroll horizontal.1920×1080: jugador. Capturas en historial de herramientas CUA, no se persistieron PNG.
9. Consola: error inicial Pixi/CSP corregido y comprobado por render posterior. Lectura final de logs solo conservaba ese error histórico previo a corrección; no nuevos errores de runtime. Fallo de conexión fue intencional. Desarrollo tuvo un intento inicial API no levantado por error de tipo del nuevo test, corregido antes del arranque final.
10. `pnpm dev:api` con origen5175 +`pnpm dev:web`: acceso DM real por proxy de Vite, VTT y logout correctos. Se cerraron tabs, restauraron viewports y detuvieron procesos temporales.

## Humo Electron/lab aportado por el orquestador

Evidencia comunicada por raíz en `/tmp/ttrpg-003-root-smoke.md`, incorporada sin atribuirla al constructor. `pnpm build` PASS. Electron39.8.10 con bootstrap temporal que fija userData/sessionData fuera del perfil personal: agregar PNG900×600, guardar mediante diálogo nativo en `/tmp/ttrpg-003-local-smoke.ttrpgscene`, cargar mismo JSON2 y recuperar mapa. Player View1920×1080 muestra mapa/grilla/oscuridad sin paneles DM. Archivo verificado en filesystem.

Lab servido con Vite6174, Chrome CUA `ui-lab.html`: monasterio, canvas/5objetos/mesa preparada; consola sin warn/error. Root cerró tab/servidor/Electron. Dos intentos iniciales del arnés Electron necesitaron ajustes de require/icono; el humo posterior fue exitoso. No se ejecutó DMG ni una prueba manual exhaustiva de cada herramienta/cámara compartida.

## Verificaciones de la entrega inicial

| Comando | Resultado real |
| --- | --- |
| `pnpm typecheck` | PASS; repetido también por los builds |
| `pnpm lint` | PASS final |
| `pnpm test` | PASS117archivos/1091tests,12.39s, ejecutado sin builds concurrentes |
| `pnpm exec vitest run src/infrastructure/browser/browser-client.test.ts` | PASS15tests; última prueba añadida cubre cuerpo de error500 que llega tras invalidar, además del caso200 ya presente en suite completa |
| `pnpm build` | PASS Electron |
| `pnpm build:api` | PASS,42módulos,out/api/index.mjs |
| `pnpm build:web` | PASS final, sin imports externos Node/Electron ni marcadores browser-external encontrados en assets |
| `pnpm dev:api` + `pnpm dev:web` | PASS API/Vite5175 y acceso DM/logout CUA por proxy real |
| `pnpm start:api` con `TTRPG_WEB_DIR` | PASS producción: todos los flujos CUA descritos |
| `git diff --check` | PASS |

El primer pase final de tests corrió junto con tres builds y tuvo2timeouts de5s en tests existentes de App.workspace (1089otros PASS). La misma suite aislada pasó sin cambios ni ampliación de timeouts. Se reporta como saturación observada, no se oculta la ejecución fallida. Después de ese pase se añadió una comprobación simétrica al cuerpo de errores tardíos en HttpTransport; se ejecutaron los15tests de transporte, typecheck/build:web y lint sobre ese cambio. La suite contiene1092casos tras esa última adición, pero no se declara un pase completo de1092 porque solo se repitió el archivo afectado.

Logs de ejecución locales `/tmp/ttrpg-003-final-*.log`, dev-api/dev-web y root-electron-build. Advertencias conocidas de jsdom canvas sin paquete canvas y bundler por tamaño de chunks/directivas use-client; no se añaden dependencias para ocultarlas. No se interpreta un warning como prueba de funcionalidad.

## Límites y estado

Proyección, SSE, cámaras/puntero/áreas/dados compartidos y Electron remoto permanecen fuera de alcance. El jugador solo autentica y muestra ausencia veraz. Exportar JSON no incorpora bytes de assets. La cobertura inicial de bibliotecas/enlaces era automatizada contra HTTP/SQLite; la corrección posterior añade los recorridos UI de enlaces descritos abajo. No se afirma una inspección manual exhaustiva de cada formulario. No se probó empaquetado/DMG ni despliegue remoto.

Entrega inicial anterior a ronda 1: entonces no existían hallazgos revisados. Las afirmaciones iniciales sobre el flujo de selección de enlaces y la invalidación completa ante 401 eran incompletas; la revisión detectó los huecos que se corrigen y verifican a continuación. Se resolvieron durante construcción fallos reales de binding fetch, Pixi/CSP, sobreescritura de mapa activo al actualizar enlace, lectura JSON obsoleta, selector obsoleto tras reautenticación y tipado del test. Construcción lista para las cuatro revisiones; todos los comandos requeridos completados.


## Corrección tras ronda 1 — 2026-10-29

Se leyeron completos los cuatro informes `ronda-1/revision-{seguridad,ux,ui,codigo}.md` antes de editar. Se mantiene versión3.4.0 y la misma rama, sin operaciones de escritura Git. Esta entrega solicita la segunda revisión; no reemplaza los veredictos de los revisores.

| Hallazgo | Corrección y regresión |
| --- | --- |
| SeguridadP1, portales privados visibles tras401 | Nuevo `PortalTargetProvider` confina ModalBackdrop, ReplaceMapImageModal y portal de dados al DOM protegido del VTT. App y borradores siguen montados, pero todo el árbol tiene ancestor hidden/inert. Atajo global del preview se suspende mientras esté oculto. ServiceApp.test utiliza ModalBackdrop real; ReplaceMapImageModal.test comprueba contenedor/atajos. CUA real detallado abajo. |
| SeguridadP2 / C-003-03, selector/lectura anterior al401 | HttpTransport expone una señal de ciclo de sesión, abortada y sustituida en toda invalidación, incluido401. El adaptador usa esa misma señal después de selector/nombre/lectura local. Pruebas401→resume→resolución tardía de selector y file.text sin POST ni resultado exitoso; no dependen de llamar browser.clear manualmente. |
| UX-003-01 / C-003-01, UI de enlaces ausente | SceneLinkModal ofrece Elegir escena del servicio y marcador remoto, carga/error/reintento mediante el selector real y conexión desde App. Guarda fuente antes de conectar, conserva trabajo ante fallo, aplica anotaciones solo ante éxito y mantiene alternativa interna. Destino heredado ausente puede repararse con aviso. App.workspace atraviesa selección, fallo sin aplicar, conexión y reparación. CUA recorre A/B y legado con HTTP real. |
| C-003-02, reconexión deja extremo anterior | Las actualizaciones se acumulan sobre el documento ya modificado por identidad. La misma escritura libera el marcador anterior y conecta el siguiente cuando ambos pertenecen a B. Test SQLite/HTTP verifica B:b→B:c y luego otra escena, extremos y disponibilidad; permanece prueba rollback. |
| UX-003-02, foco tras diálogo | Cabecera recuerda summary al ocultar acciones de menú y botón superior al guardar. Restauración espera el fin de busy mediante observación acotada, también al guardar directamente sin diálogo. App/WorkspaceHeader reales prueban selector cancelar y nombre nuevo cancelar/confirmar; el mismo test verifica guardado directo. CUA confirma SUMMARY y BUTTON según origen. |
| UI-003-01, nombres indistinguibles | Selector muestra bloque visible con nombre seleccionado completo y ajuste de líneas. CUA compara sufijos oriental/occidental a1024×768/1440×900, acciones accesibles y sin overflow horizontal. |
| UI-003-02, logout jugador menor | Botón alineado con controles oscuros, tipografía heredada, altura mínima44px y foco visible. Root verificó visualmente y ejecutó logout. |

Adicional al corregir reparación, el aviso `external-link-unresolved` se traduce a `scene-link-unresolved` en el contrato de resultado para no mostrar falsamente un banner de formato antiguo a un documento2. No cambia formato persistido. El panel remoto ocupa ambas columnas del modal para mejorar su lectura. Archivos nuevos de esta corrección: `src/renderer/src/client/PortalTarget.tsx` y `dialog-focus.ts`; resto son ajustes de los archivos de003, sus tests y documentación. No dependencias nuevas.

### Evidencia CUA de la corrección

Servicio producción real Node24,127.0.0.1:8787, datos exclusivos `/private/tmp/ttrpg-003-r1-smoke`, claves ficticias. Fixtures sembrados por HTTP: mapa PNG900×600, A con marcador a, B con b/c, dos nombres largos de revisión. El archivo legado se importó mediante `/scenes/import` para preparar la condición rota; **su reparación y navegación se hicieron desde UI**, no se simula un importador de navegador nuevo. IAB no estuvo disponible para el subagente esta vez y se utilizó Chrome CUA; no se alteraron permisos del selector Chrome ni datos personales.

- App → pestañaMapa → Editar PuertaA → Elegir escena del servicio → B → marcadorB → Conectar: mensaje Conexión entre escenas guardada y estado válido.
- Reabrir PuertaA y seleccionar B:marcadorC; conectar y navegar mediante Ir al mapa: abreB. Editar PuertaB muestra Sin enlazar, comprobando que se liberó el anterior en el producto.
- Cargar fixture legado: modal muestra Conexión rota y `/host/anterior.ttrpgscene`. ElegirB:marcadorB, conectar: aviso explícito de referencia anterior ausente. Ir al mapa abreB. La captura de este paso todavía mostraba el banner incorrecto de formato antiguo; se corrigió después con el código de aviso separado descrito arriba.
- Abrir BibliotecaNPC → NuevoNPC e introducir “Borrador privado que debe ocultarse”. Reiniciar API para invalidar sesión y pulsar Guardar y agregar. Snapshot/captura muestran Recuperar sesión, sin nombre ni formulario privado; lectura DOM confirmó `.modal-panel` bajo hidden+inert y0rectángulos. ReautenticaciónDM restaura el mismo formulario y valor. La prueba no se limita a un wrapper sin portales.
- Guardar escena existente desde botón superior después de navegación: activeElement BUTTON, aria-label Guardar escena. Cancelar selector desde menú: SUMMARY, aria-label Menu de escena.
- Seleccionar nombre con sufijo occidental a1024 y oriental a1440: ambos sufijos visibles en bloque completo, botones dentro del modal; scrollWidth1024 en viewport1024. Capturas en historial CUA.
- Consola Chrome al finalizar sin warn/error capturados. LogoutDM correcto, tab cerrado y viewport restaurado. Servicio temporal detenido después del humo complementario del orquestador.

Evidencia independiente root en `/tmp/ttrpg-003-root-correccion.md`: Escape selector→summaryPASS; nombre oriental completo a1024PASS; logout jugador estilo/funciónPASS. Root detectó además pérdida de foco al guardar existente antes de la corrección final; se corrigió posteriormente y el constructor lo verificó por CUA como se detalla arriba.

Humo adicional independiente de raíz en IAB sobre el último build: nueva escena con PNG subido por filechooser CUA → botón superior Guardar escena → Cancelar devuelve foco BUTTON Guardar escena; repetir, nombrar y confirmar crea el recurso nuevo y devuelve el mismo foco BUTTON. Ambos PASS. Logout y cierre de tab completados. El primer intento de clave con typeText fue inválido; fill exacto con la clave ficticia permitió acceder. Evidencia atribuida a raíz, no al constructor.

### Comandos posteriores a corrección

- `pnpm typecheck`: PASS; repetido por los tres builds finales.
- `pnpm lint`: PASS.
- `pnpm test`: PASS117archivos/1100tests,14.01s, sin builds concurrentes.
- `pnpm build`, `pnpm build:api`, `pnpm build:web`: PASS. Logs `/tmp/ttrpg-003-r1-final-{build,build-api,build-web,lint}.log`; suite `/tmp/ttrpg-003-r1-test-final.log`.
- Tests focalizados previos:4archivos52PASS; App16PASS; privacidad/preview2archivos20PASS. La suite final incluye todos ellos, no se suman duplicados.
- `git diff --check`: PASS. Continúan únicamente los avisos conocidos de jsdom canvas, directivas use-client y tamaño de chunks.

No se repitió el humo Electron/lab completo de la entrega inicial; el build local y la suite de regresión sí se repitieron. La validación de borradores de portal en CUA usa un formulario de NPC real; notas/fichas/preview comparten la frontera y tienen comprobación automatizada, no se afirma un recorrido manual individual de cada modal.


## Ciclo 2 — corrección de ronda 2 (2026-10-29)

Se leyó `retrabajo-ciclo-2.md` y los cuatro informes completos de ronda 2 antes de modificar código. Seguridad y UX estaban aprobadas; C-003-04 y UI-003-03 requerían cambios. Se mantiene la rama `feature/fabrica-software`, versión3.4.0 y formato2, sin escrituras Git, merge, DMG ni dependencias nuevas. Esta entrega queda lista para los cuatro revisores de la ronda global3; no sustituye su decisión.

### Cambios y correspondencia

- **C-003-04:** App rechaza explícitamente cambiar un enlace remoto a interno o interno a remoto hasta usar **Desligar**. El rechazo ocurre antes de guardar o cambiar el estado y aparece dentro del modal. El dominio también rechaza sobrescribir un enlace remoto al conectar mapas internos; el servicio rechaza conectar entre escenas si origen o destino conservan un enlace interno. La reconexión entre destinos remotos sigue disponible. No se introduce una transición automática con varias escrituras parciales.
- La desconexión interna y la conexión interna aplican su nuevo estado en memoria únicamente después de guardar con éxito. El modal informa un fallo de desconexión y permite reintentar; conserva la conexión previa. Los fallos remotos conservan la transacción del servidor.
- **UI-003-03:** `.scene-link-backdrop` usa posición fija y z-index40, superior a la cabecera30. El diálogo permanece dentro del mismo árbol `.service-workspace` protegido por hidden/inert. No se trasladan portales ni se modifica la frontera de sesión. El cuerpo conserva su scroll y el pie/cierre siguen visibles.
- Archivos de implementación de esta corrección: `src/domain/annotations/internal-scene-links.ts`, `src/server/scene-links.ts`, `src/renderer/src/App.tsx`, `src/renderer/src/components/annotations/SceneLinkModal.tsx`, `src/renderer/src/styles.css`. Regresiones en `App.workspace.test.tsx` y `browser-client.test.ts`; guía del navegador, API y entrada existente3.4.0 del changelog actualizadas.

### Pruebas de transición

App/WorkspaceHeader/modal reales con viewport aislado: para ambas modalidades se pulsa el control de conexión contrario, aparece **Usa Desligar**, no se invoca guardado/conexión/desconexión y el marcador permanece intacto. Se inyecta fallo al desligar, se comprueba conservación y rechazo de otro intento de transición; al reintentar con éxito se liberan los extremos y la nueva conexión funciona. El caso interno inspecciona ambos marcadores en el payload persistido.

Integración contra HTTP/SQLite real: A con dos mapas y B independiente; conectar A:a→B:b y solicitar conexión interna mediante el dominio produce rechazo. Releer A/B confirma igualdad íntegra de los documentos. Un trigger SQLite falla el segundo guardado de la desconexión: ambas escenas permanecen iguales. Después de desligar correctamente se conecta A:a→A:c, el servicio rechaza ambos sentidos de una petición externa sobre ese enlace interno y B permanece libre. Desligar el interno permite conectar de nuevo A→B; A:c queda libre y la navegación funciona. Se mantienen las pruebas previas de reconexión remota y rollback.

El primer pase focalizado tuvo un fallo del arnés nuevo: usaba el gesto de vista previa sobre un enlace interno, que correctamente navegaba al mapa en vez de abrir el editor. Se corrigió para recorrer **Mapa → Editar Puerta A**, el control real de edición. La ejecución focalizada posterior pasó2archivos/37tests y la suite final incluye estas pruebas.

### Humo CUA propio

Chrome CUA con servicio producción real127.0.0.1:8787, datos nuevos `/private/tmp/ttrpg-003-c2-smoke`, claves ficticias y fixtures sembrados por HTTP mediante `/tmp/ttrpg-003-c2-seed.py`. No se presenta la preparación de fixtures como creación por UI y no se usan datos personales. Todas las interacciones de producto se realizaron por CUA.

1. Login DM → Cargar EscenaA → Explorador/Mapa → Editar PuertaA → Elegir escena del servicio → nombre largo terminado en oriental → Abrir escena.
2. **1024×768:** captura muestra encabezado completo **Habitación enlazada / Puerta A**, cierre y pie sin barra del VTT por encima. Modal y20..748, encabezado y21..103, scrollWidth1024. Inspección DOM de solo lectura: `elementFromPoint(400,35)` pertenece al modal, el centro del cierre recibe hit y el modal conserva ancestro `.service-workspace`; backdrop40. La selección anidada vuelve correctamente al modal. El cuerpo mantiene scroll y la conexión remota se puede alcanzar y pulsar.
3. **1440×900:** captura con destino largo, encabezado completo, cierre accesible y pie; modal y40..860, scrollWidth1440. Se pulsó Cerrar y desapareció el diálogo. Al volver a1024 se reabrió el explorador que el cambio de breakpoint había plegado.
4. En UI, conectar A:a→B:b devuelve **Conexión entre escenas guardada**. Editar A:a → Conectar habitaciones muestra **Usa Desligar para liberar la conexión con otra escena antes de conectar mapas internos**, manteniendo **Conexión válida** y referenciaB. Desligar → editar → Conectar habitaciones guarda el enlace interno. Reabrir, seleccionarB y pulsar Conectar con esta escena muestra **Usa Desligar para liberar la conexión interna antes de conectar otra escena**, conservando **Mapa interno conectado**.
5. Cancelar → menú → Cerrar sesión vuelve a Acceso. Consola Chrome sin warn/error capturados. Viewport restaurado, tab cerrado y servicio temporal detenido con salida0.

Las capturas están en el historial de herramientas CUA; no se persistieron PNG. Este ciclo no repite el humo manual de401, Electron/labs ni el catálogo de herramientas: no cambió la frontera de portales, las regresiones automatizadas de sesión/portales vuelven a pasar y el build Electron se repite. El fallo de desconexión se inyectó en pruebas automatizadas; no se afirma haberlo provocado manualmente en CUA.

### Verificación final del ciclo 2

- `pnpm typecheck`: PASS, también ejecutado por los builds.
- `pnpm exec vitest run src/renderer/src/App.workspace.test.tsx src/infrastructure/browser/browser-client.test.ts`: PASS2archivos/37tests.
- `pnpm test`: PASS117archivos/1103tests,15.02s, sin builds concurrentes.
- `pnpm build:web` y `pnpm build:api`: PASS; son los artefactos usados en el humo CUA de este ciclo.
- `pnpm build` (Electron) y `pnpm lint`: PASS.
- `git diff --check`: PASS.

Logs locales `/tmp/ttrpg-003-c2-{typecheck,focused,test-final,build,build-web,build-api,lint}.log`. Continúan únicamente los avisos conocidos de canvas jsdom, directivas use-client y tamaño de chunks. No se modificaron solicitud/spec/tablero/revisiones ni se generó un commit.
