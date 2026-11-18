# Validación — SDD62, servicio exclusivamente web

**Revisión:** 0.1. **Versión:** 3.35.0. **Fecha:** 2026-11-17.
**Estado:** implementada, validada e integrada en `main`; sin despliegue.
**Rama:** `feature/spec-62-solo-web`, base `4dc2786` (3.34.0).

La autorización inicial cubre implementación y validación con datos sintéticos; la orden posterior «Haz comit, push y merge» autoriza también el cierre Git. No incluye despliegue ni migraciones sobre datos reales. Los logs y fixtures operativos quedan privados bajo `.local/validation/web-only/`; no se incorporan credenciales ni contenido de partidas a la documentación.

## Resultado por criterio

| Criterio | Resultado y evidencia |
| --- | --- |
| CA-01 | PASS. Retirados `src/main`, `src/preload`, adaptadores exclusivamente Electron, entradas nativas del renderer, configuración y script DMG, dependencias directas y permisos de instalación nativos. Manifiesto/lock/imports revisados; builds API/web completos. |
| CA-02 | PASS. `ClientProvider` explícito/null; sin `window.ttrpg`, detección UA ni fallback autónomo activos. Pruebas compartidas de aislamiento, reemplazo/limpieza y capacidades pasan. Storybook construido y WorkspaceHeader montado en Chrome. |
| CA-03 | PASS. Recorrido autenticado campaña→arco→escena; edición, guardado y recarga; cambio pendiente recuperado desde IndexedDB al cerrar/reabrir el editor. Suite de cliente, recuperación, administración y edición verde. |
| CA-04 | PASS. Publicación explícita Jugador; invitado por enlace/alias recibe escena y lanza dados. Cierre por autor y por DM comprobado; al cerrar se habilita Lanzar y permanecen ambas tiradas en el historial. |
| CA-05 | PASS. `pnpm dev` y `pnpm start` ejecutan la API 3.35.0 y sirven HTML 200 con configuración sintética; apagado ordenado verificado. `pnpm build` genera API/web, Storybook conserva su guard de imports. CLIs y builds independientes permanecen. |
| CA-06 | PASS. Dominio/aplicación/persistencia/autoridad sin cambios ejecutables; se conservan repositorios usados por el servicio. Esquema 12, `.ttrpgscene` v2/lector1 y transferencia v5/lectores1–5 intactos. Datos reales sin intervención. |
| CA-07 | PASS. AGENTS/README, SDD/guías y contextos de agentes describen navegador + Node HTTP/SSE, nuevos comandos, conservación de perfiles históricos y límites de instalaciones independientes. Enlaces y TOML válidos. |
| CA-08 | PASS. Minor 3.35.0/changelog registrados, gates finales verdes y cierre de todos los servidores/pestañas QA. Puertos y lock sintético comprobados al terminar. |

## Gates finales

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS, exit 0 |
| `pnpm test --exclude '**/.local/**' --maxWorkers 4` | PASS:166 archivos,1417 pruebas;27.06 s |
| `pnpm build` | PASS: TypeScript, API y frontend web |
| `pnpm build-storybook` | PASS: guard de imports y build estático |
| Preparación SQLite sintética | PASS: esquema 12, cuentas/campaña/arco/escena/mapa de prueba; sin listener durante seed |
| `pnpm start` y `pnpm dev` | PASS: health 200 versión3.35.0, HTML 200 y apagado ordenado |

La suite general incluye las regresiones dirigidas; el builder también comprobó nueve suites renderer/104 pruebas después de adaptar fixtures. Se restauraron también cuatro casos de conexión entre escenas, reparación tras fallo y cambio de tipo que exige Desligar; su setup usa el cliente web, sin menú nativo. La suite completa final incluye estos casos. Se conservan aserciones de borrado de áreas con Delete/Backspace/botón, bloqueo, foco DM sin cambiar zoom remoto, errores recuperables, cámaras, publicación y recuperación. Se retiran casos exclusivamente de IPC/ventanas/menús/recientes/autosave autónomos y hooks/paneles de dados locales con ese producto.

Las primeras invocaciones dirigidas incluyeron copias antiguas bajo `.local`; la corrida final las excluye expresamente. El primer gate general detectó fixtures pendientes de composición explícita e imports/props retirados; se corrigieron y se repitió la suite completa, TypeScript y lint hasta exit 0. No se rebajan aserciones de lógica compartida para ocultar fallos.

Avisos no bloqueantes: jsdom informa falta de `HTMLCanvasElement.getContext` en algunos dobles; las pruebas pasan y hubo render real en navegador. Vite/Storybook advierten chunks mayores de500 kB. Esta entrega no certifica rendimiento sostenido de GPU/memoria ni auditoría completa de accesibilidad.

## Recorrido real de navegador

Sobre API Node compilada3.35.0 en `127.0.0.1:8877`, SQLite privada y cuentas sintéticas:

1. DM inicia sesión; navega campaña→arco→escena y entra directamente al editor. La cabecera muestra texto de escena y acciones Guardar/Jugador, sin dropdown nativo.
2. Añade círculo, guarda y recarga: permanece un elemento. Cambia radio 100→150 sin confirmar; el footer registra respaldo local y remoto.
3. Cierra la pestaña y reabre la misma escena: aparece recuperación contextual. Recuperar devuelve radio 150 y distingue borrador recuperado de escena guardada. Confirma Guardar.
4. Pulsa Jugador: se anuncia proyección publicada. Invitado por enlace/alias ve escena, herramientas y pestaña Dados. Lanza 1d6 público; ambos lados ven el mismo resultado. Lanzar queda bloqueado mientras está abierta.
5. El autor cierra la primera tirada y DM la segunda. Ambas quedan como Cerrada en el historial del jugador y Lanzar vuelve a habilitarse. La consola no registró errores en los dos clientes durante el recorrido.
6. Editor a 1440 px y 390 px: nombre estático, menú Herramientas accesible; Enter abre, Escape cierra y retorna foco. A 390 px `scrollWidth` coincide con `innerWidth`390, sin overflow horizontal. Las capturas de la sesión CUA muestran canvas, footer y controles.
7. Chrome con Storybook WorkspaceHeader: zoom nativo 200% confirmado por su control, DPR 4 y viewport/scrollWidth 840. La cabecera mantiene las acciones y Jugador dispara el callback esperado. Se restaura 100% (DPR 2, ancho 1680) y se cierra la pestaña QA. El zoom 200% se comprueba sobre la composición aislada; el recorrido autenticado se realiza en el navegador integrado.

El intento de recarga del trabajo pendiente fue retenido por la protección de salida del navegador integrado; se probó la recuperación cerrando/reabriendo la pestaña. No se usa este comportamiento del navegador como evidencia de un fallo de producto.

## Assets y compatibilidad

Cuatro archivos de atribución de geometría/audio se copiaron byte a byte a `src/renderer/public/licenses`. SHA-256 coincidente entre fuente, copia pública y `out/web/licenses` para LICENSE/README de dice-box-threejs y License.txt/README de Kenney. Los recursos acompañan ahora al build web. `electron-to-chromium` permanece únicamente como dependencia transitiva de compatibilidad de navegadores; no es runtime Electron.

El diff en `src/domain`, `src/application`, `src/infrastructure/server` y `src/infrastructure/database` está vacío. En `src/server` cambia únicamente `environment-setup.test.ts`. Los 219 contratos backend del cierre 3.34.0 mantienen su evidencia histórica; no se atribuye nueva ejecución PostgreSQL/TLS a esta retirada. No se migró ninguna base operativa.

La retirada no incorpora Django, Redis ni runtime distribuido. Sigue existiendo una API por base y estado de mesa en memoria. Instalaciones independientes necesitan hosts, bases/almacenamiento y secretos separados; distintos puertos del mismo host no aíslan cookies. Perfiles, instaladores y configuraciones privados anteriores permanecen intactos.

## Operación y cierre

Los smokes usan variables de proceso de la fixture, sin modificar `.env` real. `start`: API PID 42451; `dev`: watcher 42531/API 42553; ambos health/HTML correctos y cierre SIGTERM verificado. En un primer ensayo del pipeline con `tee`, Ctrl+C dejó un lock huérfano exclusivamente sintético; se comprobó ausencia de proceso/puerto, se retiró ese lock privado y se repitió el apagado ordenado correctamente.

La API CUA se detuvo mediante el harness privado con verificación de PID/comando. El servidor estático Storybook PID 43367 se cerró con SIGTERM. Al finalizar: puertos 8787/8877/6006/8766 sin listeners, sin watcher/API/Storybook propios activos, `control.lock` y `run.json` sintéticos ausentes. Viewport y zoom restaurados; pestañas QA cerradas. PostgreSQL preexistente del usuario no se detuvo.

El resultado está integrado en `main` y construido en `out/api`/`out/web`. El cierre Git posterior se detalla a continuación; no constituye despliegue.

## Integración Git

El 2026-11-17 el usuario ordenó «Haz comit, push y merge». Se registró la retirada en `e2e5b69356e7679e0cf36aedb2b7042d2a3e209f` y se publicó `feature/spec-62-solo-web`. El merge sin conflictos `9521af9ade456bf93e7c4716688048d495744157` incorpora en `main` tanto SDD62 como la consolidación 3.34.0 (`4dc2786`), que todavía no estaba integrada. `git ls-remote` confirmó ambos destinos publicados. La versión se mantiene en 3.35.0; el cierre documental posterior no cambia producto ni versión.

Controles posteriores al merge, sobre el mismo árbol de producto de la rama:

| Comando | Resultado |
| --- | --- |
| `pnpm lint` | PASS, exit 0 |
| `pnpm test --exclude '**/.local/**' --maxWorkers 4` | PASS: 166 archivos, 1417 pruebas, 38.40 s |
| `pnpm build` | PASS, exit 0; incluye TypeScript y genera API/frontend web |
| `git diff --check` | PASS |

Logs privados: `.local/validation/web-only/integration-{lint,test,build}.log`. Storybook y los recorridos de navegador conservan la evidencia anterior del mismo código; no se repitieron ni se atribuyen nuevas pruebas PostgreSQL/TLS. Persisten los avisos no bloqueantes de canvas en jsdom y tamaño de chunks.

La revisión de staging no incorporó `.env`, `.env.electron`, datos de `.local`, bases, secretos ni salidas de build. No se inició ningún servidor durante este cierre. Comprobación final: puertos 8787/8877/6006/8766 sin listeners, sin procesos propios API/watcher/Storybook y sin `control.lock`/`run.json` sintéticos. No hubo despliegue ni migraciones sobre datos reales.
