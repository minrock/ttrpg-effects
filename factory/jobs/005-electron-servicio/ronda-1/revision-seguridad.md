VEREDICTO: APROBADO

## Alcance y criterio

Revisión independiente de seguridad, trabajo 005, ciclo 1, ronda 1, 2026-10-29. Se leyeron AGENTS.md, perfil seguridad, solicitud, spec, build y revisión de ronda. Se inspeccionaron fuentes nuevas, diff de archivos rastreados, configuración, documentación operativa y artefactos main compilados. Se contrastaron las 529 entradas de huellas.json con SHA-256 del contenido actual: ninguna diferencia.

La aprobación corresponde al cambio de modo Electron, su frontera con contenido remoto y la entrega operativa. No es permiso de merge, despliegue o empaquetado ni una auditoría completa de las dependencias.

## Hallazgos priorizados

No se identificaron hallazgos bloqueantes demostrables introducidos por este trabajo. No se requieren correcciones de seguridad para esta ronda.

## Controles comprobados en código

- **Configuración y composición.** `src/main/electron-config.ts:8` valida mediante URL, rechaza protocolos no HTTP(S), credenciales, rutas no raíz, query y fragmentos; exige HTTPS salvo loopback normalizado. El origen incluye esquema y puerto. `src/main/index.ts:8` decide el modo antes del import dinámico de infraestructura local; servicio no registra protocolo map-asset, repositorios, menús locales o IPC. El entry compilado conserva esa bifurcación. Una configuración inválida termina sin fallback privilegiado.
- **Aislamiento remoto.** `src/main/service-app.ts:14` crea una partición efímera nueva; las preferencias de las líneas 18–19 habilitan contextIsolation y sandbox, deshabilitan Node también en subframes/workers y webviewTag, y omiten preload. El grafo del módulo servicio no incorpora el módulo local. No hay inyección de claves, cookies o APIs privilegiadas desde main.
- **Navegación.** `src/main/window-policy.ts:25` instala restricciones antes de cargar la URL: will-navigate, will-redirect, will-frame-navigate y onBeforeRequest para navegación inicial/subframes. La comparación usa origen completo; popups y webviews se deniegan. El despacho por WebContents evita que la segunda ventana reemplace la política de la primera. Se retira la entrada al destruir la ventana. No aparece shell.openExternal ni una excepción TLS en el código nuevo.
- **Ventanas locales.** `src/main/local-app.ts:52` y `src/main/ipc/player-window-ipc.ts:206` instalan la misma protección en DM/Player. La política de producción admite únicamente el archivo renderer esperado y sus query/fragmentos; desarrollo exige origen loopback y ruta aprobada. Se conserva el preload local exclusivamente en esta composición. No se introduce un canal IPC remoto ni un nuevo payload privilegiado que requiera validación de sender.
- **Permisos y recuperación.** Se deniegan consultas y solicitudes de permisos mediante ambos handlers de sesión. La recuperación (`src/main/service-app.ts:8`) usa HTML escapado, sin scripts ni preload y con CSP restrictiva; solo su URL exacta se añade a la política. Reintentar conserva el origen validado y Salir exige estar en esa recuperación exacta. El menú no expone recientes ni envía operaciones locales a contenido remoto.
- **Servicio y sesión.** Electron reutiliza directamente el frontend y API existentes. La autenticación continúa determinada por el servidor, con cookie HttpOnly/SameSite=Strict, Secure para HTTPS, caducidad y revocación en memoria. La sesión efímera Electron no comparte partición con modo local y el enlace jugador se documenta para un contexto independiente. Se inspeccionaron auth/http y sus pruebas; una query de vista no concede ni retira el rol efectivo.
- **Archivos y entrega.** `src/server/static-files.ts` exige raíz física y un index legible antes de abrir el store; mantiene validación de rutas, extensiones y CSP. El cambio no altera SQL, esquemas de escena ni acceso a assets privados. `package.json` limita los archivos de aplicación a las salidas Electron y conserva salidas API/web separadas. La guía describe claves fuera del frontend/repositorio, TLS validado, backend privado, origen exacto, límites del proxy, SSE, respaldo integral detenido y restauración en un directorio diferente. No promete persistencia de sesiones ni portabilidad de imágenes inexistentes.

## Evidencia propia ejecutada

Comando:

```sh
pnpm exec vitest run src/main/electron-config.test.ts src/main/electron-entry.test.ts src/main/service-app.test.ts src/server/static-files.test.ts src/server/auth.test.ts src/server/http.test.ts
```

Resultado: **6 archivos, 82 pruebas aprobadas**, ejecución 10:11:12, duración 1,02 s. Incluye validación de URL/modos, composición, flags/permisos, recuperación, index físico, autenticación y rutas HTTP. La parte Electron usa mocks; no se presenta como evidencia de un navegador real. También se verificaron las 529 huellas y se inspeccionaron `out/main/index.js` y sus módulos servicio/local/política sin reconstruirlos ni modificarlos.

## Evidencia heredada y límites

- `build.md` atribuye al constructor pruebas CUA sobre Electron 39.8.10 compilado: ausencia de ttrpg/require/ipcRenderer/process, redirección HTTP externa inicial y posterior, file, popups, geolocalización denegada, rechazo de certificado autofirmado, recuperación y sesiones de rol independientes con respuesta 403 para escenas privadas desde jugador. Se acepta esa evidencia documentada; este revisor no repitió CUA ni observó personalmente esas ventanas.
- Se leyó también `/tmp/ttrpg-005-operacion.md`, evidencia del orquestador contra Node real compilado: reinicio invalida cookie/proyección/dados, conserva datos y restauración integral recupera recursos. No se atribuye su ejecución a este revisor.
- No se reejecutaron los seis checks completos ni backup/restore, TLS remoto válido, todos los flujos de privacidad o herramientas de 001–004. La solicitud permite reutilizar evidencia para módulos no modificados. La CSP local con unsafe-eval y validaciones IPC históricas no reciben una certificación nueva: no se modifican sus contratos ni se exponen al servicio en esta entrega.
- No se probó explotación de Chromium ni se realizó análisis de vulnerabilidades de dependencias. Las interacciones UI y su exhaustividad quedan expresamente fuera de la evidencia propia.

No se modificó implementación, Git, tablero, informes ajenos ni biblioteca personal. Las pruebas terminaron; no se dejaron procesos propios de servidor/Electron. El informe se publicó completo mediante temporal y renombrado.
