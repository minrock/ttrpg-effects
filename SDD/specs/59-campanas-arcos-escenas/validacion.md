# Validación — SDD 59, revisión funcional 0.2

Fecha: 2026-11-13. Versión local: **3.28.0**. Estado: **implementada y validada localmente, sin integrar**. Rama: `feature/spec-59-campanas-arcos-escenas`, base `6d1f195`. Alcance aceptado mediante `$build spec 59`; la autorización de rama no incluye commit, push ni merge.

## Entorno y alcance de la evidencia

La validación de construcción se ejecutó exclusivamente con cuentas y datos sintéticos, SQLite aislada y PostgreSQL 18 temporal con TLS 1.3, verificación de certificado y SCRAM. API/web de QA en loopback, perfiles Electron temporales y fixtures fuera de datos operativos. En esa validación no se migraron datos reales; el seguimiento operativo posterior se registra al final. El directorio de evidencias local de esta ejecución es `/private/tmp/ttrpg-sdd59-validation-avgyi1z3/logs/`; no contiene evidencia de despliegue.

La matriz combina contratos reales de ambos motores, pruebas de dominio/React y recorridos auténticos en navegador DM, invitado, Electron conectado y autónomo. Las pruebas jsdom no certifican render GPU. Todos los gates requeridos terminaron en verde. El resumen durable y la huella de las fuentes comprobadas están en [evidencia.json](evidencia.json).

## Gates

| Comprobación | Resultado y evidencia |
| --- | --- |
| Contratos iniciales de campañas/snapshots | 12/12 al congelar T-01; preservan `templateId: null`, longitudes históricas, identidad por clase e ID, revisión cero y consistencia de binding/procedencia. |
| Recientes dominio/IndexedDB | 11/11: reloj a 14 días, límite exacto 15, futuro, aislamiento origen/cuenta/campaña, recarga, fallo IDB y cancelación con rollback. |
| Campañas SQLite/PostgreSQL | 8/8: jerarquía, inactividad/apertura, escena compartida y migración repetida; regresión soft-delete 2/2. |
| Preparación SQLite/PostgreSQL | **14/14**, `preparation-final.json`: snapshots/idempotencia, alias/rollback, concurrencia, bindings retenidos/deshabilitados/privados/null, aislamiento DM/admin, PATCH inactiva y reserva desde arco incorrecto. |
| Transferencia v4 SQLite/PostgreSQL | **8/8**, `transfer-v4-final.json`: exportar/importar/verificar, procedencia null, copia histórica a otra escena, aliases válidos/negativos e `initialGameId` conservado. Revisión técnica final sin bloqueos. |
| Compatibilidad v3 y lector v1 | **8/8** `revision-3-final.json`; lector genuino v1 **2/2** por ambos motores, también extraído del gate completo en `transfer-v1-reader-final.json`. `export-owned` escribe v4, `export-legacy` conserva v3 y los lectores aceptan v1–v4; `.ttrpgscene` no cambia de formato. |
| Identidad | **27/27**, `identity-final-rebuilt.json`, salida 0. |
| Invitaciones | **36/36**, `invitations-final.json`, salida 0. Expectativas adaptadas a migraciones 5–10 y cierre explícito antes de desactivar/eliminar; se conservan negativos de no resurrección. |
| Base de datos | **32/32**, `db-final.json`, salida 0. |
| Moderación | **51/51**, `moderation-final.json`, salida 0. Restauración dirigida **8/8**, `moderation-restore-final.json`, con `pg_dump`/`pg_restore` 18.7 y manifiesto temporal explícito. El fallo inicial de arnés (ENOENT) se conserva en `moderation-before-pg-tools.json`; no se omitieron ni debilitaron contratos. |
| Propiedad integrada (`test:owned`) | **80/80**, `owned-full-final.json`, salida 0, 470,8 s. Incluye campañas, preparación, transferencia y lectores legados en ambos motores. El dirigido final de propiedad/sistemas pasó 4/4 seleccionados. |
| General | **1451/1451**, 328 suites, `general-final-3.28.0.json`, dos workers y salida 0. La primera ejecución de 3.28.0 tuvo cuatro fallos bajo carga; los 26 casos de sus archivos pasaron aislados y la repetición completa pasó sin cambiar sus aserciones. |
| Frontend final dirigido | Portadas/panel **9/9**; invitado/proyección **3/3**. Correcciones anteriores incluyen selección exacta, dirty/recovery, montaje contextual y privacidad. |
| Estática y compilación | `pnpm typecheck`, `pnpm lint`, `pnpm build:web`, `pnpm build` y `pnpm build:service` pasan en 3.28.0; este último incluye API y web. La huella de 78 archivos de producto/pruebas se conserva en `evidencia.json`; comprobación final de fuentes y documentación sin diferencias de formato. |

Los comandos Vitest usan sus configuraciones `src/infrastructure/server/{database,identity,owned,invitations,moderation}/vitest.config.ts`; el general excluye `**/.local/**`. Los gates de API compilada se ejecutan en copias sin `.env` operativo, mediante `start:api:built`. Los avisos de directivas Radix/Lucide, chunks y canvas no implementado de jsdom no equivalen a fallos ni sustituyen los recorridos reales. El gate de propiedad emitió además el aviso de pg sobre consultas concurrentes en el mismo cliente; terminó con 80/80 y salida 0.

## Evidencia por criterio

| Criterio | Evidencia observable | Estado |
| --- | --- | --- |
| CA-01 | Crear campaña D&D v1 con portada/descripción, arcos y escenas; conserva sistema exacto. Dos DMs solo ven contenido propio; admin conserva gestión de cuentas y no recibe panel DM. Contratos de API/assets prueban acceso cruzado. | Verificado. |
| CA-02 | Desactivar con apertura vigente exige cerrarla explícitamente. Cerrar revoca al invitado; desactivar deja campaña/hijos/preparación en solo consulta. Reactivar restituye acciones y datos. Escena compartida remite a la campaña bloqueante; API impide escrituras por rutas alternativas. | Verificado. |
| CA-03 | Crear campaña, dos arcos y escenas, recargar, comprobar conteos y ruta de regreso; detalle textual muestra los nombres de los mapas sin montar canvas. Navegador y Electron conectado. | Verificado. |
| CA-04 | Imagen propia prevalece sobre mapa 0; quitarla recupera mapa 0. Cambiar mapa activo no altera portada; reemplazar/reordenar mapa 0 sí. Fixture de bytes inválidos muestra error recuperable; restaurar mismos bytes/asset y reintentar carga la imagen de 1254 px, sin borrar referencia. | Verificado; `cover-recovery-final.json`, `cover-recovered-final.jpg`. |
| CA-05 | Selección incompleta bloquea Iniciar; selección válida carga exactamente su escena. Cancelar salida conserva cambio; Guardar y continuar persiste y regresa al arco. Restauración contextual en navegador/Electron sin capturar escena provisional; foco retorna a tarjeta y desmonta canvas. | Verificado. |
| CA-06 | Crear NPC/monstruo con plantilla permitida, selección por nombre/búsqueda/página e imagen. Catálogo completo en ambas escenas; reservar dos veces no duplica ni guarda antes de confirmar. Editar ficha y usar segunda escena conserva snapshot/ID original en primera. Editor de servicio no ofrece edición permanente; inactiva solo consulta. Invitado ve imagen pública del monstruo y no NPC oculto ni notas privadas. | Verificado; `prepared-two-scene-snapshots.json`, `guest-public-monster-final.jpg`. |
| CA-07 | Once pruebas de reloj/IDB e integración React; resaltado real tras recarga y separación al cambiar cuenta. Fallar almacenamiento no impide navegar. | Verificado. |
| CA-08 | Navegar/crear antes de jugar deja cero aperturas/invitaciones. Con invitado conectado, Foco→Santuario→Foco conserva exactamente ID/generación/estado de apertura, versión de invitación y participante; mantiene proyección anterior hasta publicación explícita. Cerrar revoca acceso. | Verificado; `live-guest-before-switch.json`, `live-guest-after-switch.json`, gates de invitación. |
| CA-09 | Fixture v8→v9 conserva 3 partidas, 7 recursos, 8 enlaces e IDs/bindings. Fixture v9→v10 conserva 11 recursos, 12 enlaces, 5 arcos, 8 asociaciones y un borrador. Contratos adicionales con entidades homónimas/shared prueban backfill, reejecución y rollback en ambos motores; no se fusionan por nombre. | Verificado. |
| CA-10 | Teclado/Escape, drawer a 390 px, foco al crear y regresar; Chrome con zoom real de 200 % conserva controles, diálogo y foco tras cancelar. Errores, bloqueo compartido e identidad perdida son recuperables. Navegador/Electron comparten panel. | Verificado; capturas `chrome-zoom200-real.jpg`, `chrome-zoom200-dialog-real.jpg`. |
| CA-11 | Electron autónomo carga/guarda v1/null-template como v2 con `sceneAside` idéntico. Roundtrip v2 conserva exactamente fichas, mapas y mapa activo, incluso referencia de plantilla local ausente. Edición local conservada; mapa local y Player View renderizan. Transferencia operativa v4 no cambia `.ttrpgscene` v2/lector v1. | Verificado; `standalone-v2-roundtrip.json`, `standalone-player-real.jpg`. |
| CA-12 | Contratos de revisiones, idempotencia, concurrencia, propietario, inactividad y respuestas tardías; React conserva contexto/portadas ante cancelación/fallo. Bases sintéticas aisladas. | Verificado. |

## Ciclos de navegación y memoria

En Chromium IAB se completaron 20 ciclos panel→escena→Continuar→editor→Partidas. Cada ciclo tuvo un canvas en editor y cero al volver, panel de 192 nodos estable y foco en `ARTICLE`. Evidencia: `browser-20-cycles-final.json`.

En Chrome se completaron al menos 20 ciclos adicionales, con recolección de basura desde la UI de DevTools en cada muestra. El conteo es conservador: un tramo parcial adicional no se contó. Evidencia: `chrome-20-cycle-metrics-final.json`.

| Ciclo | Heap JS | Nodos DOM | Listeners |
| --- | --- | --- | --- |
| 0, tras calentamiento | 19,9 MB | 295 | 487 |
| 5 | 20,5 MB | 295 | 485 |
| 10 | 21,0 MB | 295 | 486 |
| 15 | 21,3 MB | 295 | 485 |
| 20 | 21,3 MB | 295 | 485 |

No se observa acumulación de nodos/listeners; el heap alcanza una meseta en las últimas dos muestras. Es un smoke medido de navegación, no una garantía para sesiones ilimitadas o mapas de cualquier tamaño. El recorrido previo interrumpido de 13 ciclos queda superado por esta repetición completa.

## Defectos encontrados y corregidos durante validación

- Montaje de App y DraftCoordinator: se conserva el montaje oculto/inert hasta restaurar, evitando bloqueo circular y captura de escena provisional.
- Publicación tras seleccionar/restaurar: el cliente establece `sceneResourceId`, requerido para autorizar entidades de esa escena.
- Assets de invitado: el resolvedor usa campaña, apertura y generación autorizadas; ya muestra la imagen pública sin exponer preparación privada.
- Reintento de portada: se elimina el parámetro de consulta rechazado por la API; remontar la imagen con URL estable y respuesta `no-store` permite recuperación real.
- Expectativas de contratos legados: fixtures de exportación distinguen v3/v4; PATCH con revisión obsoleta conserva REVISION_CONFLICT y PATCH/DELETE con revisión actual de campaña inactiva exigen CAMPAIGN_INACTIVE. Se corrigieron los tests, sin alterar esa precedencia del producto.
- Transferencia: normalización de metadatos de partida, procedencia null/nuevas reservas individuales, alias históricos estrictos e identidad del arco inicial. Negativos impiden fusionar reservas con origen distinto.

## Integración y límites

No hay commit, push, merge ni DMG de esta spec. La versión 3.28.0 y CHANGELOG están preparados localmente; construir un DMG corresponde al merge autorizado. CA-01–12 están comprobados dentro del alcance 0.2 y la entrega local queda validada. Queda pendiente únicamente la integración que ordene el usuario; esta validación no autoriza por sí misma commit, push, merge, DMG ni operaciones sobre datos reales.


## Seguimiento operativo local — 2026-11-13

Tras el reporte de arranque «No se pudo abrir el almacenamiento exclusivo del servicio», la inspección encontró SQLite íntegra, permisos privados, ningún lock ni escritor activo y esquema 8. El fallo correspondía a migraciones pendientes 9/10; el mensaje genérico de arranque ocultaba `MIGRATION_REQUIRED`.

Se creó un respaldo integral privado en `.local/service/backups/sdd59-before-v10-20261114T015000Z/` y se ensayó `pnpm db:migrate` sobre una copia separada. Después se aplicaron las migraciones 9 y 10 al servicio local. La comparación de conteos y huellas por fila verificó que las 24 tablas preexistentes, salvo el registro de migraciones, conservaron sus datos; `PRAGMA integrity_check` devolvió `ok`. Inventarios y resultados permanecen privados junto al respaldo. No se alteró el contenido de `.env`.

Se inició `pnpm start:api`: API 3.28.0 disponible en `http://127.0.0.1:8787`, con respuesta HTTP 200 de `/api/v1/health` y `status: ok`. Esta fue una actualización operativa del esquema local; no cambió código, versión ni historial Git y no equivale a integrar la spec en main.

## Ajuste de experiencia 0.3 — 2026-11-13

Petición humana con tres capturas: retirar recuperación global, entrar al editor sin paso intermedio y mover guardado al footer. Entrega local **3.28.1**, CA-13–15 comprobados. El corte anterior 0.2 y `evidencia.json` son históricos; no se convierten sus resultados en ejecuciones nuevas. Huellas y referencias del ajuste en [evidencia-ui-0.3.json](evidencia-ui-0.3.json).

### Pruebas y revisión

| Comprobación | Resultado del ajuste |
| --- | --- |
| Regresión final | **90/90**, cuatro archivos: `ServiceApp.test.tsx`, `GameEditor.authority.test.tsx`, `DraftRecovery.test.tsx`, `App.workspace.test.tsx`. Incluye salida ya autorizada sin segundo guard, entrada automática, recuperación contextual y footer. |
| Integración adicional | **58/58**, `App.workspace.test.tsx`, `ServiceApp.test.tsx`, `scene-save-recovery.test.ts`, `owned-client.test.ts`. Se solapa con el gate final; no sumar como pruebas únicas. |
| Estática y compilación | `pnpm lint`, `pnpm build:web` (incluye `pnpm typecheck`) y `pnpm build` Electron correctos. `git diff --check` correcto. |
| Revisión TL | Sin bloqueos en el ámbito revisado. Selección y respuestas tardías ligadas al contexto; cierre/descarte ya autorizado evita la segunda consulta del guard, salida ordinaria conserva protección. |

Comandos Vitest: `pnpm exec vitest run <archivos de la fila> --exclude '.local/**' --reporter=dot`. Logs finales en `/private/tmp/ttrpg-sdd59-validation-avgyi1z3/logs/ui59-final-{regression,tests,lint,build-web,build-electron}.log`. Persisten avisos React `act` y de bundle/directivas, sin fallos. Una ejecución concurrente anterior produjo seis fallos de temporización de workspace; el archivo pasó aislado (32/32) y la regresión final completa de cuatro archivos pasó con 90/90. No se alteraron aserciones para ocultar esos fallos.

### Recorridos reales por criterio

| Criterio | Evidencia observada |
| --- | --- |
| CA-13 | Panel de campañas sin botón global. Un cambio de grilla pendiente en `Encuentro D&D` produce únicamente «Cambios sin guardar de Encuentro D&D» al entrar, con foco en Recuperar. Escape regresa al arco y enfoca su `ARTICLE`, sin canvas; volver a entrar conserva la copia. Recuperar restituye la grilla desactivada. `Foco final SDD59` entra sin modal aun existiendo aquel borrador de otra campaña. |
| CA-14 | Selección de escena abre directamente su editor en IAB, Chrome y Electron conectado. Foco→Santuario conserva ID/generación/estado de apertura, versiones de invitaciones y conteos de auditoría exactamente. Cerrar con cambios pendientes → Confirmar → Descartar regresa al arco tras una sola consulta: generación 7 cerrada, siete inicios, ninguna reapertura automática. Una elección explícita posterior vuelve a abrir correctamente. |
| CA-15 | Guardado y hora dentro del footer, sin banda sobre Propiedades; summary de 10 px y detalle que distingue dispositivo/servidor/confirmación. Capturas de escritorio, 390×844 y zoom real Chrome 200 %: detalle completo, sin truncamiento de explicación, accesible mediante disclosure. Zoom y viewport restablecidos al terminar. Electron conectado muestra el mismo footer; autónomo arranca con su footer local, sin estado del servicio. |

Capturas privadas en `.local/validation/ui59/`: `editor-footer.png`, `footer-390.png`, `recovery-context.png`, `electron-campaigns.png`, `electron-editor-footer.png`, `chrome-footer-200.png` y `electron-standalone.png`. La comparación sintética de apertura/invitación está en `logs/ui59-entry-before-switch.json` y `ui59-entry-after-switch.json` (idénticas); cierre en `ui59-after-close.json`.

### Entorno y límites del corte

API sintética en 8877, SQLite de QA y perfil Electron separado bajo `/private/tmp/ttrpg-sdd59-validation-avgyi1z3/`. Web y Electron compilados desde producto 3.28.1. El bundle de API reutilizado conserva metadato 3.27.2 y contiene el backend/schema 10 de la validación previa; este delta no cambia API. No se arrancó/paró el servicio operativo 8787 ni se migraron datos reales durante el ajuste.

El primer smoke autónomo falló por ruta del icono en el arnés: `app.getAppPath()` apuntaba a `harness/`. Se corrigió solo el launcher privado con `app.setAppPath(checkout)` y se repitió desde el bundle final sin instrumentación; la ventana autónoma 3.28.1, canvas, controles y footer cargaron correctamente. No es un cambio de producto. Este smoke comprueba composición/arranque; los roundtrips de archivos y contratos de backend siguen documentados como evidencia histórica 0.2, sin repetición en este ajuste.

Patch y changelog preparados. T-08 validada localmente, sin commit, push, merge ni DMG. La integración sigue pendiente de orden del usuario.

## Ajuste visual 0.4 — 2026-11-14

Petición humana con cuatro capturas: listados de una/dos columnas, botones con iconos centrados y reutilización del switch del editor. Entrega local **3.28.2**, T-09 y CA-16–18 comprobados. Los resultados 0.2/0.3 permanecen históricos. Huellas del corte en [evidencia-ui-0.4.json](evidencia-ui-0.4.json).

### Pruebas y revisión del ajuste visual

- **47/47 pruebas, cuatro archivos:** `CampaignPanel.test.tsx`, `CampaignCatalog.test.tsx`, `MapAnnotationsSection.test.tsx` y `App.workspace.test.tsx`. Comando: `pnpm exec vitest run src/web/campaigns/CampaignPanel.test.tsx src/web/campaigns/CampaignCatalog.test.tsx src/renderer/src/components/annotations/MapAnnotationsSection.test.tsx src/renderer/src/App.workspace.test.tsx --exclude '.local/**' --reporter=dot`.
- `pnpm lint`, `pnpm build:web` y `pnpm build` correctos; ambas compilaciones incluyen `pnpm typecheck`. `git diff --check` correcto. Logs en `.local/validation/ui59-04/logs/`; compilaciones finales con prefijo `ui59-04-palette-build-`. Las compilaciones anteriores de esta carpeta preceden la corrección de cascada/paleta y no son el bundle final de QA.
- Revisión TL sin bloqueos al cierre. Se corrigió la colisión de los botones genéricos del servicio y del accordion con el switch, excluyéndolo de esas reglas. La inspección visual adicional detectó el color dorado heredado fuera del VTT; la paleta efectiva del editor pasó al componente compartido y se retiró la sobrescritura redundante.
- Los tests preceden los últimos ajustes exclusivamente CSS; las compilaciones y el QA visual final incluyen esos ajustes. Persisten avisos React `act` y de tamaño de bundle/directivas, sin fallos. No se repitieron suites generales ni contratos backend ajenos al delta.

### Recorridos y medidas reales

| Criterio | Resultado observado |
| --- | --- |
| CA-16 | Campañas: 390 px → columna de 351 px; 959 px → una de 629,109 px; 960 px → dos de 307 px; 1440 px → dos de 515 px. El arco único conserva 515 px dentro de una grilla de 1046 px a 1440, dejando la segunda columna libre. Cinco escenas usan una columna a 390 y dos a 1440. En todos esos casos `scrollWidth` coincide con el viewport. |
| CA-17 | Nueva campaña: icono y botón comparten centro vertical (diferencia 0 px), espacio de 8 px y conjunto centrado. Crear arco/Asociar escena inspeccionados durante navegación; opciones de solo icono conservan etiqueta y centro vertical (0 px). Acciones de tarjeta centradas y navegación conservada. |
| CA-18 | Campaña activa y Ajustar grilla usan `SharedSwitch`; raíz 40×22 px, thumb 16×16 contenido, radio 999 y padding 0 en ambos estados. Colores finales iguales dentro/fuera: apagado #0f141a, borde #50565d, thumb #a0a7af; encendido #8ed5b6. Tab/Shift+Tab muestran foco de 2 px; Space abre confirmación. Cancelar conserva tanto campaña activa como inactiva, sin guardar transición. El toggle del editor activa/desactiva el modo de ajuste; se restableció apagado. |

La comprobación móvil final del switch a 390×844 conserva el thumb dentro del track y no desborda. Chrome con zoom real **200 %** muestra catálogo en una columna, botón alineado y formulario con switch completo; el diálogo permite desplazamiento vertical. Se restableció el zoom y se cerró únicamente la pestaña sintética. Electron conectado mostró el formulario final contra el servicio sintético; Electron autónomo cargó 3.28.2 y permitió activar/desactivar Ajustar grilla. Ambos procesos de prueba fueron cerrados.

Capturas y medidas privadas: `.local/validation/ui59-04/`, incluyendo `campaigns-1440.png`, `arc-single-1440.png`, `scenes-390.png`, `campaign-switch.png`, `campaign-switch-off-focus.png`, `editor-switch.png`, `electron-switch.png`, `electron-standalone.png`, `chrome-campaigns-200.png`, `chrome-switch-200.png` y los JSON de geometría. Las medidas de grilla preceden solo las correcciones del switch; la captura final de campañas se renovó con el bundle definitivo.

### Entorno e integración del ajuste visual

QA con API y SQLite sintéticas en 8877, perfil Electron separado y checkout temporal bajo `/private/tmp/ttrpg-sdd59-validation-avgyi1z3/`. Se copiaron los bundles web/Electron finales desde 3.28.2; el backend reutilizado conserva metadato histórico 3.27.2 y schema 10, sin cambios de API en este ajuste. Se detuvo exclusivamente la API sintética al acabar. No se arrancó/paró ni modificó el servicio operativo 8787. Viewport de prueba restablecido y pestañas temporales cerradas.

Patch/changelog y documentación preparados, validación local completa. No hay commit, push, merge ni DMG; la integración sigue pendiente de orden del usuario.


## Corrección de navegación 0.5 — 2026-11-14

Petición humana: sustituir navegación flotante por sidebar estructural controlado por la hamburguesa, exclusivamente en administración exterior al editor. **T-10 y CA-19–23 validados localmente en 3.29.1.** [Huellas y resultados 0.5](evidencia-ui-0.5.json). Se conservan como históricos los cortes anteriores; no se repitió su validación completa.

### Gates y revisión del sidebar

- **69/69 pruebas en siete archivos:** AdminShell, ServiceApp, CampaignCatalog, CampaignPanel, HeaderDropdown, GameEditor y GameEditor.authority. Comando: `pnpm exec vitest run src/web/AdminShell.test.tsx src/web/ServiceApp.test.tsx src/web/campaigns/CampaignCatalog.test.tsx src/web/campaigns/CampaignPanel.test.tsx src/web/HeaderDropdown.test.tsx src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx --exclude '**/.local/**' --maxWorkers 4 --reporter=dot`.
- `pnpm typecheck`, `pnpm lint`, `pnpm build:web`, `pnpm build`, `pnpm build-storybook` y `git diff --check` correctos. Build Storybook incluye comprobación de imports y grafo sin motores ni código privilegiado. Builds web/Electron serializados; no se pisaron outputs concurrentemente.
- Logs finales en `.local/validation/sidebar59-05/logs/`: `t10-final-regression.log`, `t10-final-lint.log`, `t10-typecheck.log`, `t10-final-build-web.log`, `t10-final-build-electron.log`, `t10-final-build-storybook.log`. Persisten avisos React `act` y de tamaño de bundle/directivas, sin fallos finales. La ejecución anterior de 67 pruebas queda superada por las 69 finales; no se suman sus resultados.
- TL cerró hallazgos dirigidos de guardia de rol, foco después de navegación asíncrona, cambio de breakpoint y altura interna del drawer. UX concilió UI-003/004/005 y el catálogo. No quedan bloqueos de la revisión acotada.

### Recorridos y medidas por criterio

| Criterio | Evidencia real del corte |
| --- | --- |
| CA-19 | Sidebar estructural de 240 px y 900 px de alto en viewport 1440×900, cabecera de 44 px en región principal. Un solo nav, sin aside flotante ni dropdown exterior. Marca única y contenido aprovecha el espacio al ocultarlo. |
| CA-20 | Drawer 390×844: altura total 844, cierre 52 y sidebar 792 sin exceder viewport. Tab/Shift+Tab quedan contenidos; Escape restaura hamburguesa. 959→960 con drawer abierto lo cierra y enfoca Ocultar navegación; escritorio→959 con foco interior lo devuelve a Mostrar navegación. Tests cubren scrim, navegación, limpieza y 401 con drawer abierto. |
| CA-21 | DM Campañas→Arcos→Escenas→Monstruos y NPCs conserva jerarquía, migas y un único activo. Admin real a 390 px: Cuentas→Sistemas→Cuentas y mismo destino cierran drawer, enfocan h2 correcto y retiran inert. Cambio de cuenta limpia contexto. Tests comprueban fallback heredado, guardias y ausencia de recarga por togglear shell. |
| CA-22 | 390×900: columna336; 959×900: columna848,125; 960×900: dos de304; 1440×900: dos de522 px. En todos los casos scrollWidth coincide con viewport. Chrome nativo con zoom real200% confirmado por su control muestra contenido/acciones completos con scroll vertical; se restableció100%. Electron servicio3.29.1 recorrió Campañas→Arcos→Escenas→editor sin sidebar administrativo; menú existente Partidas retorna a Campañas y enfoca h1. |
| CA-23 | AdminShell (DM/Administrador), AdminSidebar (DM con arco/Administrador/Partidas heredadas) y CampaignPanel dentro del shell real. Contexto administration fullscreen elimina padding artificial de preview. Índice final: 31 familias (12 controles/19 composiciones), 59 stories y31 docs. Variantes nuevas y CampaignPanel renderizadas; sin errores de consola observados. |

La comparación SHA-256 de **182 archivos** (GameEditor/HeaderDropdown productivos, renderer, main y preload) contra el inicio de este delta no detecta cambios. Este resultado y la regresión dirigida respaldan el aislamiento; no constituyen un nuevo smoke de Electron autónomo ni de GPU/proyección. Las suites generales de backend, persistencia y transferencia conservan su evidencia histórica.

Capturas privadas en `.local/validation/sidebar59-05/`: `campaigns-1440.png`, `drawer-390.png`, `electron-sidebar.png`, `electron-editor.png`, `chrome-200.png` y `chrome-200-controls.png`; medidas en `responsive.json`, foco en `admin-focus.json`, comparación en `editor-comparison.json` e índice actual en `storybook-index.json`. Las huellas de estos archivos y fuentes de producto están en evidencia-ui-0.5.json. El índice histórico de SDD60 permanece intacto.

### Entorno y cierre local

API/SQLite sintéticas en8877 y perfil Electron separado bajo `/private/tmp/ttrpg-sdd59-validation-avgyi1z3/`; bundles web/Electron del corte3.29.1. Backend reutilizado con metadato3.27.2 y esquema10, sin cambio API en este delta. Se cerraron exclusivamente Electron/API de QA, se restablecieron viewport y zoom y se cerraron pestañas sintéticas. Storybook permanece disponible localmente en `http://127.0.0.1:6006/`.

No se modificó ni reinició el servicio operativo8787 ni se migraron datos reales. Patch/changelog, guías y seguimiento preparados. **Sin commit, push, merge ni DMG**; integración pendiente de orden expresa del usuario. La validación de esta corrección no es una certificación general de accesibilidad ni una repetición de todas las plataformas de SDD59/60.


## Catálogos de preparación 0.6 — 2026-11-15

Petición humana: destinos separados NPCs/Monstruos, listados de filas, agregar arriba a la derecha y acciones Editar/Borrar con formulario precargado. **Implementación 3.30.0 en copia aislada**, T-11 backend y T-12 frontend; **CA-24–27 verificados**; [huellas y evidencia0.6](evidencia-ui-0.6.json). Los resultados de cortes anteriores son históricos. La incorporación al checkout vigilado y a la base real todavía no está autorizada.

### Pruebas del corte 0.6

| Comprobación | Resultado |
| --- | --- |
| Persistencia dirigida SQLite/PostgreSQL TLS | 40/40 dirigidas y conjunto completo `pnpm test:owned` **82/82 en ocho archivos**,467.88s. No sumar ambas ejecuciones como casos únicos. |
| Migraciones y base de datos | `pnpm test:db`: 32/32, ambos motores. Migración sintética 10→11 conserva conteos de las 31 tablas previas, valores preparados y reservas; añade `deleted_at` nullable. |
| Contrato compartido y cliente HTTP | 14/14 en campaigns.test.ts y campaign-client.test.ts. |
| UI dirigida | 19/19 en ArcPreparationPanel.test.tsx y CampaignPanel.test.tsx. |
| Regresión relacionada | 69/69 en App.workspace, ArcPreparationUseSection, AdminShell, HeaderDropdown, ServiceApp, main/service-app y main/electron-entry. |
| Estática y compilación | typecheck, lint, build:api, build:web, build Electron y build-storybook correctos. El build Storybook comprueba el grafo sin Pixi/Three ni código privilegiado. |

Todos los comandos se ejecutaron en la copia aislada con `pnpm_config_verify_deps_before_run=warn`, porque el enlace a las dependencias del checkout original provoca una advertencia de estructura de workspace. No se reinstalaron dependencias ni se modificó el lockfile. Los builds que comparten `out/` se secuenciaron. Logs finales bajo `.local/validation/preparation59-06/logs/`; las primeras ejecuciones fallidas se conservan en la copia temporal y quedan superadas por los resultados finales correspondientes.

El conjunto completo conserva un aviso deprecado de pg sobre query concurrente, sin fallos. La revisión TL cerró dos P2: un paquete v4 no puede introducir `deletedAt` que luego se descarte, y `verifyTransfer` compara las marcas de borrado persistidas. Las pruebas detectaron además un problema del adaptador SQLite con placeholders numerados repetidos; el DELETE usa marcadores únicos y duplica explícitamente el valor del timestamp. No se cambió el driver global. QA UI corrigió retorno de foco después de editar y la combinación errónea de aviso de carga fallida con estado vacío. La revisión fue dirigida, no una auditoría general.

### Recorridos por criterio

| Criterio | Resultado observado |
| --- | --- |
| CA-24 | Sidebar con hojas hermanas y una sola activa; migas y h1 correctos. API filtra antes de contar/paginar y conserva llamada sin filtro. Navegador y Electron separan NPCs/Monstruos; catálogo del editor mantiene ambos tipos. Pruebas de respuestas tardías y cambios de contexto. |
| CA-25 | Filas con miniatura/placeholder, nombre, notas, procedencia cuando existe y plantilla legible o retenida. CTA y dropdown por fila. A390px no hay desbordamiento; 959px usa fila compacta y960px tres columnas. Chrome nativo confirma zoom200%, listado con reflujo y formulario con scroll vertical; se restaura100%. |
| CA-26 | API sintética crea NPC y persiste edición; monstruo precarga nombre/notas/imagen/plantilla. Cancelar/Escape conserva registro y devuelve foco; guardar devuelve foco a Acciones. Confirmación de borrado nombra registro y enfoca Cancelar. Borrado confirmado de UI probado en memoria reiniciable de Storybook; borrado persistente y preservación de reservas/copias comprobados por contratos reales temporales. Tests cubren ACK, doble envío,409 y última página. Campaña inactiva sin mutaciones. |
| CA-27 | Borrado lógico no resucita por backfill; transferenciav5 conserva marcas y reservas, lectores anteriores siguen cubiertos por contratos. Migración sintética preserva contenido. Electron entra/sale del editor y mantiene NPCs/Monstruos y copia de escena existente. Historias usan componentes reales y fixtures sin API real. |

Storybook del corte tiene **67 historias, 32 páginas de documentación y 32 familias**:12 controles y20 composiciones. ArcPreparationPanel añade NPCs, Monstruos, Vacío, Solo lectura con una fila sin acciones, Sin plantillas y Error de carga sin falso vacío. CampaignPanel añade ambas rutas dentro del shell real. Se observaron esas variantes y no hubo errores de consola en los recorridos finales. Catálogo aislado: `http://127.0.0.1:6007/?path=/story/composiciones-campaignpanel--np-cs`.

Capturas y datos privados en `.local/validation/preparation59-06/`: `ui-checks.json`, `migration11-result.json`, `review-tl.json`, `delivery-manifest.json`, y `screenshots/storybook-npcs.png`, `electron-npcs.png`, `electron-solo-consulta.png`, `electron-editor-catalogo-completo.png`, `chrome-200.png` y `chrome-form-200.png`.

### Aislamiento e incorporación

Rama autorizada `feature/preparacion-npcs-monstruos`, base `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`. Implementación en `/private/tmp/ttrpg-preparation59-06-rnp3g6p8`, con API8877, SQLite sintética esquema11, PostgreSQL TLS temporal y perfil Electron separado. Comparación de650 archivos de producto de root contra el inicio: ninguno cambió durante construcción. Manifiesto de entrega:26 modificados y2 nuevos, sin eliminaciones. Editor/render/main/preload no cambiaron en este delta. Versionado y changelog3.30.0 pertenecen a esa copia hasta incorporarla.

La API operativa8787 continúa con su base real esquema10. El watcher reinicia ante escrituras de API pero no migra: la API nueva se detendría con MIGRATION_REQUIRED sobre esquema10. Por ello incorporar el corte exige ejecutar la migración11 explícitamente. La autorización Q-0010 excluyó expresamente ese paso. La entrega técnica y su vista previa no equivalen a haber actualizado el servicio. Incorporar exige autorización operativa final, copia de seguridad coherente, detención/reinicio controlado y verificación posterior. No hay commit, push, merge ni DMG. No se certifica accesibilidad completa ni se repite QA autónoma/GPU del editor.


### Incorporación operativa completada — 2026-11-15

Tras autorización humana explícita, T-13 incorporó la versión **3.30.0 al checkout y servicio local8787**. El permiso cubrió respaldo, incorporación, migración y reinicio; no operaciones de historial Git. Los párrafos anteriores describen la separación durante construcción y no son el estado operativo final.

- Supervisor detenido ordenadamente antes del respaldo. Copia íntegra privada en `.local/service/backups/preparation59-06.vgSLUI3h` (0700), incluyendo data/configuración y fuentes/outputs previos. SQLite de respaldo esquema10,31 tablas; `quick_check` y claves foráneas correctos.
- Las28 huellas de base y resultado coinciden; se conservaron todos los cambios previos. `pnpm build:service` y `pnpm build` pasaron en el checkout real después de incorporar.
- `pnpm db:migrate` aplicó únicamente la migración11. `quick_check`, `integrity_check` y claves foráneas correctos. Las30 proyecciones de tablas de contenido son idénticas al respaldo; únicamente la tabla de migraciones pasó de10 a11. Todos los preparados anteriores conservan `deleted_at=NULL`.
- `pnpm start:api` reiniciado: tres health200 con versión3.30.0, HTML y bundle200. PM comprobó adicionalmente health y la pantalla de acceso protegida en una pestaña Chrome separada. Esa pestaña no tenía sesión autenticada; no se introdujeron credenciales ni se modificaron entidades reales. La QA funcional autenticada sigue siendo la prueba sintética documentada arriba.
- Se cerraron API/PostgreSQL sintéticos y pestañas de QA; zoom restaurado. Storybook6007 queda como vista previa; el código de las historias también está incorporado al checkout habitual.

Reporte operativo y métricas privados: `.local/validation/preparation59-06/operational-apply.json` y `post-migration-metrics.json`; logs `t13-build-service.log`, `t13-build-electron.log` y `t13-db-migrate.log`. Huellas en [evidencia0.6](evidencia-ui-0.6.json). No hubo restauración automática, commit, push, merge ni DMG. **T-11, T-12 y T-13 completadas; incorporación local terminada, integración a main pendiente de orden expresa.**

## Breadcrumbs de administración 0.7 — 2026-11-15

T-14 / CA-28 completada en **3.30.1**. Los ancestros se ven como texto subrayado; la hoja actual es un `span aria-current="page"`, sin subrayado ni acción. El reset scoped vence la regla genérica de botones y conserva foco visible. Cinco archivos de producto modificados, sin historias nuevas.

- 17 pruebas en Panel/Catalog; typecheck, lint final y build web final aprobados. Avisos existentes del build sobre dependencias `use client` y tamaño de chunks.
- Navegador real en Storybook6006: raíz, arcos, escenas, NPCs, Monstruos y detalle; un actual por ruta, navegación mediante click/Enter, Tab omite hoja y foco visible2px. Estilos computados transparentes, borde/padding0, sombra none y appearance none. Nombres largos sin overflow a390/1440px.
- Evidencia y logs: [evidencia0.7](evidencia-ui-0.7.json); capturas y medidas privadas en `.local/validation/breadcrumbs59-07/`. Ningún error observado de aplicación; aviso previo del manager Storybook sobre PopoverProvider. No se repiten ni atribuyen a este corte las pruebas backend/Electron/zoom de versiones anteriores.
- La autorización humana permitió preparar `fix/breadcrumbs-administracion` preservando cambios locales. La API8787 no escuchaba tras recibir la autorización; esta tarea no arrancó/detuvo el servicio ni tocó datos reales. Resultado disponible en fuentes, build web y Storybook local. Sin add/commit/push/merge ni DMG.


## Etiqueta del menú del editor — 2026-11-15

Ajuste de texto solicitado tras la corrección de navegación: en **3.30.2**, la opción del menú hamburguesa del editor cambia de «Partidas» a «Campañas». Conserva la ruta `/partidas`, la confirmación de salida y el historial; no modifica el menú de opciones de partida.

- `pnpm exec vitest run src/web/ServiceApp.test.tsx src/web/HeaderDropdown.test.tsx --exclude '.local/**'`: **16/16** pruebas existentes aprobadas. La primera ejecución sin exclusión recogió además copias de respaldo en `.local/` y falló al resolver un import de esas copias; la ejecución dirigida excluye únicamente esos respaldos.
- `pnpm build:web`: typecheck y compilación aprobados; avisos existentes de `use client` y tamaño de chunks.
- Continuación local sobre la rama actual, sin operaciones de escritura Git ni migraciones.

## Cabecera de escena en navegador — 2026-11-15

Solicitud humana posterior: retirar el desplegable de escena en Chrome y dejar solo el nombre de la escena cargada. **3.30.3** muestra `sceneName` como texto sin interacción ni segunda línea con el nombre del mapa. Conserva el guardado de la barra y el menú de escena en Electron. Los estilos mantienen límites de ancho y elipsis; la historia WorkspaceHeader documenta la diferencia por plataforma.

- `pnpm exec vitest run src/renderer/src/components/workspace/WorkspaceChrome.test.tsx src/renderer/src/App.workspace.test.tsx --exclude '.local/**'`: **40/40** pruebas existentes aprobadas. Los casos del selector por menú declaran Electron explícitamente, sin cambiar globalmente el entorno navegador de las demás pruebas.
- `pnpm build:web`: typecheck y compilación aprobados; avisos existentes sobre directivas `use client` y tamaño de chunks. Lint dirigido de la cabecera y su historia aprobado.
- Storybook en navegador: nombre visible en una línea, sin nombre de mapa, flecha ni menú; Guardar y demás herramientas presentes. Captura privada: `.local/validation/scene-header-browser/header.png`. La preservación del menú Electron se verifica en tests; no se atribuye a este ajuste una nueva prueba nativa de Electron.
- Continuación local de los ajustes de cabecera, sin operaciones de escritura Git ni migraciones.


## Escenas del menú de campaña 0.8 — cierre T-15, 2026-11-15

**Versión 3.31.0 validada localmente, CA-29–31 cumplidos.** Q-0013 registrada y aplicada a `feature/escenas-menu-campana` conservando los cambios previos. [Evidencia estructurada](evidencia-ui-0.8.json). No implica commit, merge ni nueva incorporación operativa.

El selector enumera metadatos paginados de todos los arcos de la campaña, conserva asociaciones distintas de una escena compartida y marca una sola «Actual». Cambia de escena mediante la guarda existente; el remonte contextual renueva la preparación del arco conservando apertura e invitación. Mantiene Campañas/Reabrir/Cerrar y sus confirmaciones, restricciones, reintento, foco y scroll.

**Verificación automatizada:** 59 pruebas dirigidas en cinco archivos, typecheck/lint y builds web/Electron/Storybook superados. Incluye páginas posteriores al límite100, cierre durante carga, respuesta tardía sin robo de foco, expiración durante guarda y regreso catálogo→misma selección. La revisión TL cerró regresiones detectadas de navegación, compatibilidad `beforeCommit`, cancelación y operaciones pendientes. Registro privado: `.local/validation/campaign-scene-menu08/t15-builder.log.md`. No se repitieron contratos de backend ni suites generales para este cambio de UI.

**Recorrido conectado PM:** copia sintética en8877 con backend compatible3.30.0 y frontend3.31.0; dos arcos/seis asociaciones. El mismo recurso bajo otro arco cambió su URL/contexto y preparación; «Actual» no navegó. Una edición de mapa seguida de cambio de escena mostró la guarda: Cancelar conservó URL/documento/foco y Descartar abrió Santuario. Campañas→misma escena volvió a abrir editor. Fila compartida con campaña inactiva deshabilitada. Los snapshots SQLite de apertura e invitación son idénticos antes/después del navegador y de Electron (generación12); no se publicó ni rotó la mesa.

**UI y plataforma:** navegador a390/1440px sin desbordamiento del menú, Tab/Escape y foco comprobados; sin errores de aplicación observados en consola. Electron conectado con perfil nuevo aislado: acceso, selección contextual, cambio Foco→Santuario, Actual y Escape correctos, versión3.31.0 visible. La salida nativa registró tres mensajes GPU Skia de mailbox sin fallo de navegación observado. No se repitieron zoom nativo200% ni modo autónomo.

**Storybook:** cinco historias de `Composiciones/CampaignSceneMenu`; carga/vacío/error/Reintentar y lista extensa probados. A390px, veinte filas tienen scroll propio (388/781px), panel x8..374 y acciones fuera del scroll; Tab desde la última alcanza Reabrir. Se corrigió el marco de la historia para usar cabecera sin padding de página. Índice final:72 historias y33 autodocs; sin montar App/Pixi ni API real. Paginación extensa cubierta por tests, no por un catálogo real de más100 elementos.

**Limpieza:** API sintética8877 y Electron aislado detenidos ordenadamente, puerto y `control.lock` libres; pestañas QA cerradas y viewport restablecido. No se detuvo ni modificó la API del usuario8787, Storybook6006 o Kanban8766. Sin migraciones, datos reales, historial Git ni DMG. Evidencias privadas y capturas conservadas bajo `.local/validation/campaign-scene-menu08/`.


## Escenas propias de cada arco0.10 — cierre local3.33.0

[Validación0.10](validacion-ui-0.10.md): CA35–40 y T17–T20 completos. Creación contextual, retirada de asociación/import-as-map, exclusividadAPI/DB, borradores/transferencia compatibles, QA web/ambosElectron y checks aprobados. Corridas y límites documentados sin atribuir unfullfinal inexistente. Incorporación operativa autorizada, respaldo íntegro, SQLite11→12,30tablas conservadas, API3.33.0 activa. Sinmerge.
