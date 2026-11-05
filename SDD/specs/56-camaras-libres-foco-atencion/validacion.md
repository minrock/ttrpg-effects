# Validación — SDD 56

Fecha: 2026-11-04. Rama: `feature/sdd-foco-atencion`. Producto: 3.20.0. Implementación preparada; pendiente de integración. Este registro no simula una revisión factory ni declara un despliegue.

## Evidencia ejecutada

- TypeScript estricto y ESLint sin errores.
- Suite general de Vitest: **145 archivos, 1307 pruebas aprobadas**. Pruebas nuevas de dominio, runtime, HTTP/SSE, adaptador web, IPC, React y Pixi. Incluye ausencia de zoom en el contrato; posiciones finitas/acotadas; cuatro orientaciones; captura de puntero y callbacks pendientes; dibujos confirmados conservados; navegación explícita con IDs de mapa reutilizados; error de transporte comunicado en el DM.
- HTTP/SSE **real con SQLite temporal**, DM y dos invitados: negociación independiente de foco/anotaciones, entrega múltiple, permiso DM, idempotencia, rechazo de cuerpo >4 KiB y de órdenes antiguas; expulsión deja de recibir eventos; reconexión sin replay. Cada fixture crea y elimina su base temporal, sin utilizar `.env` ni la base local del usuario.
- IPC con dobles de Electron: emisor jugador/subframe rechazado, readiness del marco vigente, payload sin zoom, deduplicación y ausencia de replay al abrir. Esto verifica el módulo IPC, no sustituye un recorrido del binario Electron.
- Compilación de API, frontend web y Electron. Sin DMG: esta rama no está integrada.
- Revisión visual con **App, PlayerApp y Pixi reales**, en tres pestañas y un transporte sintético BroadcastChannel aislado: Ana al 49 %, Bruno al 151 %, DM al 100 %. Foco elegido en el mapa produjo centro `(229.50, -139.50)` en ambos jugadores, manteniendo sus zooms. El centro se situó en el área útil excluyendo el lateral derecho; el panel y el foco de teclado del jugador permanecieron abiertos/intactos. Se vio el aro temporal y se corrigió un solapamiento de los textos «Foco»/«Centro» en la barra DM.

La revisión visual anterior no prueba cookies ni autorización HTTP; estas se comprobaron por separado en la prueba SQLite. El servidor de preview y sus tres pestañas se cerraron, y su directorio temporal se eliminó. No se tocó la base local, sus credenciales ni el servicio del usuario.

## Matriz y límites de aceptación

| Criterios | Evidencia | Pendiente |
| --- | --- | --- |
| CA-01/02/03/04 | React, Pixi a cuatro nortes, render visual DM + dos jugadores con zooms distintos | Recorrido autenticado completo en navegador y Electron servicio |
| CA-05/06/07 | Inicialización local, cambio de mapa/entrada, reemplazo de imagen, promoción, bootstrap sin comandos ni foco | Recorrido nativo de abrir/cerrar/reabrir ventana |
| CA-08/12/14 | Runtime y HTTP/SSE SQLite, expulsión, cuotas, deduplicación, negociación y errores | PostgreSQL real con SCRAM/TLS; carrera de expulsión/foco en ese motor |
| CA-09/10/11 | Gesto activo cancelado sin commit, zoom al aplicar, Escape/clic derecho, sin mover foco DOM ni cerrar lateral; regresiones generales | Matriz manual a 390 px y con ajustes del sistema de movimiento reducido |
| CA-13 | Preload/IPC tipado, pruebas de frontera con dobles, tres builds | Humo nativo Electron autónomo y Electron conectado a API |

No se ejecutó `pnpm test:moderation`: el entorno carece de `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE`; la referencia temporal conservada a herramientas PostgreSQL apunta a binarios que ya no existen. No se usó SQLite como sustituto de PostgreSQL ni se relajó TLS. Preparar el entorno aislado de [database.md](../../guias/database.md) antes de ese gate. No hay cambios SQL ni migraciones en esta entrega.

Warnings de herramientas: JSdom informa que no implementa canvas en algunos tests; el render visual se comprobó en navegador. Vite conserva advertencias de tamaño de chunks y directivas `use client` de dependencias ignoradas. No son errores de compilación.

## Reproducción

```bash
pnpm typecheck
pnpm lint
pnpm test --exclude '.local/**' --exclude 'tmp/**'
pnpm build:api
pnpm build:web
pnpm build
```

Para aceptación manual: publicar el mismo mapa a dos jugadores, ajustar zooms distintos, usar **Foco** y **Centro**, navegar después, repetir con un dibujo incompleto, cambiar de mapa mediante enlace, reconectar un jugador y expulsar al otro. Ningún foco anterior debe reproducirse ni cambiar zoom. Repetir en Electron local y servicio, y con el entorno PostgreSQL de pruebas preparado.
