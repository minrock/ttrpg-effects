# Migración a servicio privado: API + clientes web y Electron

## Petición y autorización

2026-10-28. El usuario solicita generar los prompts necesarios, cargar y ejecutar cada spec con `/fabric`, sin cambiar de rama ni integrar a main/master. Confirma: «Servicio privado para tus mesas, con acceso DM/jugador».

Rama autorizada para toda esta serie: `feature/fabrica-software`. Se conservan los cambios sin commit de la fábrica (spec 40, versión 3.1.0). La autorización inicial cubrió implementación, pruebas y ejecución local, sin operaciones de Git ni DMG. El 2026-10-29 el usuario aprobó los trabajos pendientes e invocó explícitamente `$factory aprobar`: autoriza commits locales e integración en `main`, seguida del DMG. La integración conjunta espera el cierre técnico de 005, pues las cinco specs comparten cambios acumulados. No autoriza push ni despliegue público. Los expedientes conservan la autorización original y su actualización en `aprobacion-usuario.md`.

## Resultado esperado

El mismo frontend React/PixiJS funciona desde un navegador y desde Electron. Un servicio privado administra escenas, imágenes y bibliotecas y sincroniza una mesa activa entre el DM y sus jugadores. Electron conserva su modo local actual y puede actuar también como cliente del servicio. No se sustituyen la interfaz VTT, los motores de efectos ni las reglas de dominio.

La primera entrega es autohospedable: una instancia privada con una proyección activa, escenas guardadas y roles DM/jugador. No incluye cuentas públicas, pagos, organizaciones, infraestructura cloud ni varias mesas concurrentes por instancia. Los jugadores solo reciben información publicada; el DM mantiene escenas completas y bibliotecas privadas.

## Decisiones base

- Reutilizar `TtrpgApi`, `DiceApi`, los casos de uso, esquemas Zod y repositorios SQLite; mover contratos fuera de preload sin romper imports anteriores.
- HTTP JSON bajo `/api/v1`, errores serializables y límites de carga. Servicio Node.js 24, sin dependencia runtime de Electron. Frontend y API del mismo origen; proxy local de desarrollo.
- Acceso privado con claves DM/jugador configuradas por el operador y sesiones mediante cookies HttpOnly/SameSite, expiración y cierre de sesión. Las claves no van en URLs, logs ni localStorage. Sin CORS comodín ni acceso no autenticado a archivos de la mesa. En producción remota exigir HTTPS mediante proxy confiable; loopback HTTP para desarrollo.
- Recursos del servicio con identificadores opacos, no rutas libres. Escenas e imágenes persistentes bajo un directorio configurable. Reutilizar `.ttrpgscene`; importación/exportación explícita y recuperación de imágenes locales ausentes sin conceder lectura del filesystem del servidor.
- SSE para eventos del servicio y HTTP para comandos. Validar y filtrar del lado servidor: rol jugador no publica escenas, no lee bibliotecas privadas y no recibe notas o dados ocultos.
- Interfaz de conexión, selección de escenas e importación accesible y en español, integrada con la UI existente. Desconexiones visibles y recuperables.
- Electron remoto con aislamiento completo y navegación restringida al origen configurado; no exponer preload/IPC local a contenido del servicio. Modo local conservado por defecto.

## Secuencia de prompts

1. [001 — Contrato común de cliente](jobs/001-contrato-clientes/solicitud.md): separar contrato y composición del transporte sin cambiar comportamiento.
2. [002 — API privada y persistencia](jobs/002-api-privada/solicitud.md): servidor autenticado, escenas, imágenes, bibliotecas y contrato HTTP.
3. [003 — Cliente navegador](jobs/003-cliente-navegador/solicitud.md): adaptador HTTP, entrada web, acceso, carga/guardado/importación y reutilización del VTT.
4. [004 — Mesa sincronizada](jobs/004-mesa-sincronizada/solicitud.md): proyección pública, cámaras, puntero, áreas y dados en tiempo real.
5. [005 — Electron y entrega](jobs/005-electron-servicio/solicitud.md): cliente Electron del mismo servicio, modo local intacto, ejecución empaquetable y guía operativa.

Cada trabajo tiene su spec, constructor, cuatro revisiones y decisión. Las dependencias avanzan tras aprobación técnica sin exigir merge. No modificar código mientras una ronda esté abierta. El tablero refleja resultados reales; «necesita persona» por merge prohibido no significa fallo funcional.

## Evidencia de partida

- `src/preload/ttrpg-api.d.ts`: API ya consumida por App, PlayerApp y hooks.
- `src/renderer/src/main.tsx`: selecciona DM/jugador con `?view=player`.
- `src/main/ipc/`: transporte actual para escenas, bibliotecas, proyección y dados.
- `src/application/services/dice-roll-session.ts`: sesión de dados independiente de Electron.
- `src/infrastructure/database/`: repositorios basados en `node:sqlite`.
- `src/domain/player/player-window-snapshot.ts`: validación estructural existente; no asumir que elimina por sí sola todos los datos privados.
- `specs/39-vtt-interface/`, `specs/37-dm-dice-rolls/`, `specs/29-multi-map-scenes/`, `specs/23-scene-navigation-links/`: comportamientos que preservar.

Comprobaciones base: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. Añadir comandos web/API claros y pruebas HTTP reales, aislamiento DM/jugador, persistencia, reconexión y humo web/Electron. Cada constructor registra limitaciones concretas en build.md; no declara funciones simuladas como terminadas.
