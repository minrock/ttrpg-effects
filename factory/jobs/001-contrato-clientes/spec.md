# Spec 001 — Contrato común de clientes

Fecha: 2026-10-28. Ciclo: 1. Estado: especificado, pendiente de construcción y verificación.

## Objetivo y autorización

Separar el contrato consumido por React del transporte Electron y permitir inyectar otro cliente sin volver a modificar las pantallas DM/Player ni sus consumidores. Conservar el funcionamiento local mientras se prepara [la migración](../../migracion-servicio.md).

Rige [solicitud.md](solicitud.md): trabajar en `feature/fabrica-software`, conservar cambios previos, sin cambiar de rama, staging, commits, push, merge, despliegue ni DMG. Entrega `3.2.0`, bump minor único y changelog fechado en español.

## Base implementada que se reutiliza

- `src/preload/ttrpg-api.d.ts` y `src/preload/dice-api.ts`: APIs, resultados y declaración opcional `Window.ttrpg`. `getAppInfo` está tipado y fijado incorrectamente en `0.0.0`.
- `src/renderer/src/main.tsx`: selecciona `App`/`PlayerApp` mediante `?view=player`. Ambas pantallas y múltiples hooks/componentes leen directamente `window.ttrpg`.
- `src/preload/index.ts` y `src/main/ipc/`: acciones específicas y suscripciones con desuscripción. Se conserva su comportamiento y seguridad.
- Tipos/validación de `src/domain/`, casos de uso de escenas/enlaces y `src/application/services/dice-roll-session.ts`. No duplicar reglas ni modelos.
- Labs y pruebas existentes, incluido `ui-lab/player-main.tsx`, que usa un fixture parcial. No son un cliente web real.

Preservar los comportamientos descritos en [interfaz VTT](../../../specs/39-vtt-interface/spec.md), [dados DM](../../../specs/37-dm-dice-rolls/spec.md), [múltiples mapas](../../../specs/29-multi-map-scenes/spec.md) y [enlaces](../../../specs/23-scene-navigation-links/spec.md); no reimplementarlos.

## Alcance

### Contrato común

Crear una fuente única compartida (por ejemplo `src/shared/api/`) para `TtrpgApi`, `DiceApi`, `TtrpgAppInfo` y los resultados declarados actualmente en los archivos API del preload. Debe poder importarse sin ejecutar Electron, Node, React, DOM, PixiJS o infraestructura local. Reutilizar por tipo los modelos/resultados puros ya definidos en dominio/aplicación; no trasladar implementaciones de casos de uso al contrato.

Mantener las rutas históricas `src/preload/ttrpg-api` y `src/preload/dice-api` como reexports compatibles y conservar la ampliación opcional de `Window` donde corresponda. Preservar firmas, resultados discriminados, cancelaciones y desuscripción; `TtrpgAppInfo.version` pasa del literal `0.0.0` a una cadena que admite la versión real.

### Composición de cliente/capacidades

Introducir una composición tipada por raíz de aplicación (proveedor React o inyección equivalente), con API y capacidades efectivas. La raíz local obtiene el bridge y lo entrega a DM y Player. Concentrar su lectura en esa frontera y migrar todos los consumidores reales, incluidos hooks de dados/reemplazo de imagen y componentes anidados de bibliotecas, imágenes, combate y Player.

La composición acepta otro cliente sin escribir `window.ttrpg`; dos raíces con clientes distintos permanecen aisladas. No usar un registro mutable global. Una instancia explícita tiene precedencia sobre el bridge y se puede representar ausencia explícita sin fallback accidental.

Las capacidades describen operaciones disponibles (incluidas funciones nativas de archivos/diálogos y ventana Player), no permisos de seguridad. Elegir una estructura pequeña basada en operaciones existentes y documentarla. Cliente ausente o capacidad no disponible no anuncian éxito ni ejecutan métodos ficticios. Mantener los estados recuperables actuales de UI/labs sin bridge.

Se permite un adaptador centralizado de compatibilidad para montajes/tests sin proveedor. Los fixtures parciales quedan limitados a tests/labs; no convertir toda la API de producción en métodos opcionales. Las suscripciones deben liberarse al desmontar/cambiar cliente, sin duplicados en StrictMode ni reinicios innecesarios de escena/canvas/dados.

### Versión y paridad documentada

`getAppInfo()` sigue siendo síncrono y conserva nombre/status, pero obtiene versión de `package.json` mediante build u otra solución compatible con preload sandboxed. Sin filesystem en renderer, API privilegiada adicional ni segunda constante manual. Verificar también el preload construido.

Publicar documentación de arquitectura enlazada desde README/documentación existente con una matriz que enumere todos los métodos de ambas APIs (agrupación permitida): comportamiento/capacidad local, equivalencia futura HTTP/SSE o propia del navegador, rol previsto y diferencias pendientes. Debe cubrir escenas/importación/guardado directo, enlaces, recientes/menús, plantillas, tres bibliotecas, imágenes y reemplazo, ventana/estado/eventos Player, cámaras, puntero, áreas informativas y todo el ciclo de dados/tamaños.

Distinguir lo implementado de lo propuesto. Rutas locales, diálogos, `map-asset:` y `SceneOperationResult.filePath` requieren adaptación a recursos opacos/importación; no pueden convertirse en lectura libre del servidor. Apertura/cierre/ready de Player necesitan equivalencia de conexión/vista. El servidor futuro debe autorizar roles y filtrar datos; las capacidades y snapshots actuales no garantizan esa frontera. No es necesario fijar endpoints detallados del trabajo 002.

## Exclusiones y compatibilidad

No implementar servidor, autenticación, HTTP/SSE, subida de assets, cliente web de producción ni Electron remoto. No simular estos servicios. No rediseñar UI ni motores, cambiar canales IPC, SQLite, política de privacidad, protocolos de assets o dependencias pesadas.

No cambia `.ttrpgscene`: mantener formato 2, carga/migración de legado 1, rutas locales, mapas, enlaces y recuperación de imágenes ausentes. Si aparece una ruptura necesaria, comunicarla antes de modificar el formato.

## Criterios de aceptación

1. Las APIs/resultados tienen una fuente común segura y las importaciones históricas siguen compilando, sin duplicar modelos de dominio.
2. App, PlayerApp, hooks y consumidores anidados operan con un cliente inyectado sin bridge. Si existe otro bridge, no recibe llamadas de esa raíz. Dos raíces no comparten llamadas/eventos.
3. Desmontar o cambiar cliente libera suscripciones anteriores; StrictMode no deja listeners extra. Renders ordinarios no reinician escena/canvas/dados.
4. En producción, la búsqueda de `window.ttrpg` solo encuentra la frontera de composición/compatibilidad; tests/labs pueden conservar sus accesos justificados.
5. Cliente/capacidades locales conservan operaciones existentes; ausencia de bridge mantiene UI/labs utilizables e indisponibilidad recuperable, sin operaciones simuladas o fallo al importar módulos.
6. `getAppInfo().version` coincide con `package.json` (`3.2.0` al cierre), incluido bundle preload; no queda `0.0.0` hardcodeado para esa información.
7. Cargar/guardar, selección/cancelación de imagen, bibliotecas, Player y dados siguen usando los canales reales; errores/cancelaciones y privacidad conservan su semántica.
8. Escenas existentes mantienen carga/guardado, mapas/enlaces y avisos de imágenes ausentes. No cambia la versión de formato.
9. Diseño, teclado (Escape, Delete/Backspace y escritura), drawers bajo 1100 px y proyección permanecen iguales. Player no recibe controles privados ni tiradas ocultas.
10. Labs siguen disponibles sin fixtures en producción. Matriz de paridad completa, versión/changelog y `build.md` registran resultados reales y limitaciones, sin operaciones Git ni DMG.

## Verificación

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`. No añadir comandos API/web antes de que existan.

Pruebas enfocadas en la frontera nueva: precedencia de inyección sobre bridge, ausencia, aislamiento entre raíces, invocaciones/eventos DM/Player/dados y al menos un componente anidado, limpieza de listeners al desmontar/cambiar cliente y versión derivada de package. Los dobles verifican composición, no una API HTTP.

Reutilizar suites `App.workspace`, `PlayerApp.tools`, `PlayerApp.map-image`, hooks de dados/reemplazo y labs; mantener serialización/migración, escenas/enlaces y privacidad. Evitar tests redundantes de reglas sin modificar.

Humo con `pnpm dev` cuando Electron esté disponible: DM y ventana Player, importar/cancelar imagen, guardar/cargar escena temporal, biblioteca y tirada abierta/oculta. Comprobar transporte real y consola/preload sin errores nuevos. Revisar teclado y tamaños amplio (p. ej. 1440×900), menor de 1100 px (1000×700) y proyección Player (1920×1080 o equivalente). Registrar tamaños y límites reales; el lab no sustituye humo Electron sin declarar esa limitación.

## Riesgos e impedimentos

Los accesos indirectos al bridge y fixtures parciales pueden ocultar acoplamiento restante; las pruebas con bridge ausente/distinto y búsqueda global lo detectan. La identidad del cliente puede dejar eventos obsoletos: estabilizar instancia y verificar desuscripción. Las referencias de archivos locales se conservan ahora y se traducen en trabajos posteriores, sin alterar persistencia prematuramente.

No hay impedimentos que requieran decisión adicional para construir este alcance. Las dudas sobre autorización remota o traducción HTTP pertenecen a las siguientes specs y deben quedar documentadas, no resolverse ampliando esta entrega.
