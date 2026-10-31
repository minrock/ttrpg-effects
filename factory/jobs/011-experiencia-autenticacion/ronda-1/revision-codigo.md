VEREDICTO: CAMBIOS

# Revisión independiente de código — 011, ciclo 1, ronda 1

Fecha: 2026-10-31. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Base efectiva: `73b8e6de21af74912d23399f1b99f3c1112ade91`; rama acumulativa `feature/factory-006-persistencia-multidb`, sin escrituras Git. Se comprobaron las **651 huellas** de `ronda-1/huellas.json`: ninguna discrepancia. No se consultaron informes de otros revisores.

## Alcance

Lectura de perfil de código, AGENTS, manifiesto, solicitud/spec/build/coordinación y revisión congelada. Inspección de fuentes nuevas/modificadas y diferencias físicas respecto de la base efectiva: composición de cuentas, catálogos, editor/invitados, diálogos, adaptadores HTTP/recursos/mesa, contratos de lectura, listener final, configuración/setup, cambios del renderer local, pruebas y documentación. La comparación física evita interpretar como eliminados los archivos no rastreados en esta rama acumulativa.

La separación entre identidad, propiedad y mesa reutiliza los servicios existentes; el listener final no monta las rutas globales. El fixture HTTP histórico conserva el servidor anterior más una cabecera explicativa y se consume desde pruebas. No hay nueva dependencia ni cambio de formato de escena; versión 3.13.0 y changelog corresponden al bump minor. Los valores por defecto se aplican a escenas nuevas y no se modifican los cálculos de coordenadas/mediciones. La revisión encontró los siguientes problemas de comportamiento en la composición nueva.

## Hallazgos que requieren corrección

### C1 — P1: abrir una invitación desde Recuperar sesión destruye el borrador retenido sin confirmación

**Archivo/línea:** `src/web/ServiceApp.tsx:33`, callback `AccountAccess.onInvitation`, y retorno de invitado en línea 29.

Con un editor DM con cambios, provocar expiración conserva el editor oculto e inerte. En esa misma pantalla está «Entrar con invitación de jugador». Su callback llama directamente a `history.pushState` y `setPath`, sin consultar el guard ni solicitar descarte. El siguiente render retorna exclusivamente `GuestEntry`, desmontando `GameEditor` y perdiendo su estado. No se necesita una invitación válida: basta una URL del mismo origen con forma `/jugar/:id`. `beforeunload` no protege este cambio interno.

**Corroboración ejecutada:** arnés en memoria con `ServiceApp` y `AccountAccess` reales, jsdom/React y editor doble que registra un guard que siempre rechaza salir. Tras expirar y enviar la invitación: `retainedBefore=true`, `draftAfter=false`, `guardCalls=0`, `guestShown=true`. No se escribió un test ni código al checkout. El doble prueba la decisión de montaje del componente raíz, no pretende certificar render Pixi ni una interacción visual real.

**Corrección esperada:** hacer pasar esta transición por una decisión explícita de conservación/descarte; mientras está expirada la cuenta, permitir cancelar y recuperar la cuenta original antes de guardar. No desmontar el editor ni consumir el cambio de ruta hasta resolver esa decisión. Añadir regresión que cubra borrador retenido → invitación, tanto cancelar como descartar, comprobando identidad del nodo/estado. Incumple A9 y la conservación anunciada por la pantalla de recuperación.

### C2 — P2: Atrás reescribe la entrada anterior y vuelve a insertar la ruta, formando un ciclo

**Archivo/línea:** `src/web/ServiceApp.tsx:25`, junto a `navigate` en línea 23.

`popstate` ya se ejecuta después de que el navegador cambió su posición en el historial. El handler sobrescribe esa entrada con la ruta de la que se venía (`replaceState(path)`) y después llama a `navigate(next)`, que hace un nuevo `pushState`. Esto elimina la navegación hacia delante y sustituye el historial previo por una alternancia entre catálogo y editor.

**Reproducción corroborada:** con `ServiceApp` real en jsdom, partir de `/partidas`, abrir un editor y usar dos veces `history.back()`, sin borrador ni cancelación. Resultado: antes `/partidas/<id>` (longitud 2), primer Atrás `/partidas` (2), segundo Atrás **`/partidas/<id>`** (2). El segundo Atrás devuelve al editor abandonado en lugar de avanzar hacia una entrada anterior; pulsarlo repetidamente alterna ambas pantallas.

**Corrección esperada:** separar una navegación nueva de aceptar un `popstate`. Un desplazamiento aceptado no debe generar otra entrada. Para cancelar con borrador, restaurar la posición mediante índices/estado del historial sin sobrescribir la ruta ajena. Añadir regresiones de Atrás/Adelante con aceptación y cancelación. Incumple el requisito explícito de navegación/Atrás de la spec.

### C3 — P2: un 401 administrativo no activa el guard de sesión porque se excluye todo el namespace identity

**Archivo/línea:** `src/infrastructure/browser/http.ts:30` (también exclusión de bloqueo en línea 22); consumidores `src/web/AdminAccounts.tsx:12-14`.

La excepción necesaria para un login fallido está aplicada a cualquier ruta que comienza por `/identity/`. Las rutas protegidas de administración también usan ese prefijo. Si la sesión administrativa expira o se revoca, paginar/crear/administrar un DM devuelve 401, pero nunca ejecuta `invalidate()`/`expired()`. `AdminAccounts` solo muestra el mensaje de error y conserva la lista/nombres/correos y controles montados como autorizados; el usuario no vuelve al acceso ni se suspenden las demás solicitudes de esa raíz.

**Corroboración ejecutada:** `HttpTransport` real con respuesta JSON 401 para `/identity/admin/dms`; el callback de expiración recibió **0 llamadas**. Esto se conecta directamente con el `catch` de AdminAccounts, que solo modifica `error`. El backend sigue rechazando la mutación; el hallazgo es del guard y la recuperación de interfaz, no una autorización administrativa concedida por el servidor.

**Corrección esperada:** delimitar las excepciones de credenciales/acceso a las operaciones que realmente las necesitan. Un 401 de administración debe invalidar el transporte y pasar al flujo de recuperación sin conservar interfaz privilegiada visible. Mantener el comportamiento de contraseña incorrecta en login y tratar el cambio de contraseña según su semántica. Añadir regresión del componente administrativo y del transporte. Afecta A1/A9.

## Verificaciones realizadas

- Huellas completas: 651/651 coinciden con la ronda congelada.
- `pnpm exec vitest run src/web/ServiceApp.test.tsx src/infrastructure/browser/owned-client.test.ts src/infrastructure/browser/browser-client.test.ts --maxWorkers=2`: **3 archivos / 31 pruebas PASS**, 1.20 s. Cubren flujo de cuenta básico, reset obligatorio, binding privado, CAS/reintento, respuesta tardía, Retry-After y subida incierta. No cubren los tres casos anteriores; pasar esta selección no los descarta.
- Tres comprobaciones puntuales adicionales en memoria mediante `pnpm exec node`, TypeScript transpileModule, React/jsdom y transporte real: pérdida de borrador al entrar como invitado, ciclo de historial y omisión de expiración administrativa. Resultados concretos registrados arriba; sin archivos de producto ni pruebas añadidos.
- Inspección del contrato de definiciones retenidas por instancia y revisiones confirmadas de enlaces; las ampliaciones mantienen la autoridad del servidor y evitan sustituir definiciones por mera coincidencia de ID.
- Se revisó la evidencia declarada por construcción de gates generales, tres builds, motores y restauración integral. Esa evidencia se atribuye al constructor/orquestador; no se presenta como ejecución propia.

## Limitaciones y recursos

No se repitieron compilaciones ni todos los gates de DB sin un cambio o sospecha que lo justificara. No se hizo CUA propio: la comprobación DOM es funcional, no una certificación visual, de teclado real ni de Electron. No se certifica cierre operativo/main/DMG por esta revisión. Los hallazgos de pérdida de estado, historial y guard bastan para solicitar cambios antes de aceptar.

No se utilizó PostgreSQL, no quedaron conexiones ni procesos propios y queda **liberado**. No se modificó ni detuvo QA8891, servicio8787, provisión personal, producto, Git, tablero o informes ajenos. Única publicación: este informe, mediante temporal y renombrado atómico.
