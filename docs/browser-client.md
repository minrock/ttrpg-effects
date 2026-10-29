# Cliente navegador — 3.5.0

El navegador utiliza el mismo VTT React/PixiJS de Electron. Guarda en el servicio privado del mismo origen; Electron mantiene sus archivos y bibliotecas locales. El formato de intercambio sigue siendo `.ttrpgscene` versión 2 y acepta migración de versión 1.

## Arranque

Requiere Node.js 24 y pnpm. Configura las variables y claves privadas descritas en [API privada](private-api.md). Nunca uses el directorio del perfil Electron como `TTRPG_DATA_DIR`.

Producción local:

```sh
pnpm build:api
pnpm build:web
export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:8787
export TTRPG_WEB_DIR="$PWD/out/web"
pnpm start:api
```

Abre `http://127.0.0.1:8787`. `TTRPG_WEB_DIR` es opcional, absoluto y apunta exclusivamente al build. Para acceso remoto se conserva la exigencia HTTPS y proxy de la API; no hay despliegue incluido.

Desarrollo, con el mismo entorno de claves/directorio en la terminal de API:

```sh
export TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:5175
pnpm dev:api
```

En otra terminal: `pnpm dev:web`. Abre `http://127.0.0.1:5175`. Vite reenvía `/api/v1` a `127.0.0.1:8787`, conservando Host y Origin. La API necesita reinicio tras cambios; Vite actualiza el frontend. `pnpm dev` y `pnpm build` siguen siendo Electron; `out/web` y `out/api` son independientes de `out/main`, `out/preload` y `out/renderer`.

## Acceso y trabajo

Selecciona DM o Jugador e introduce la clave correspondiente. El servicio determina el rol y administra una cookie HttpOnly. Recargar restaura la sesión, no la escena abierta: usa **Cargar escena** para recuperar un guardado. No se almacena la clave ni una copia privada del trabajo web en localStorage/sessionStorage. El logout revoca la sesión y limpia cliente/solicitudes; si falla la red se informa y no se afirma un cierre exitoso.

El DM usa el menú del nombre de escena:

- **Guardar escena** crea una identidad o actualiza la actual. La primera vez pide nombre. **Cargar escena** abre el selector con nombres y páginas de 50 resultados; admite cancelar, error y reintento.
- **Importar archivo .ttrpgscene** valida y crea otra escena en el servicio. No reemplaza la abierta si el archivo es inválido. **Exportar archivo .ttrpgscene** descarga el estado abierto sin cambiar su identidad y sin bytes de imágenes.
- **Importar escena como mapa** en la lista de mapas selecciona otra escena guardada, conserva la escena actual y remapea identidades conforme al caso de uso existente.
- **Administrar plantillas** y las bibliotecas del explorador usan almacenamiento remoto real. Monstruos, NPCs y personajes se buscan, obtienen, guardan y reutilizan desde los mismos formularios.
- **Cerrar sesión** y cambiar de escena ofrecen guardar/descartar/cancelar si hay cambios. Un fallo al guardar impide continuar. Al abandonar la página hay aviso nativo para cambios pendientes.

Un 401 oculta e inhabilita el VTT, conservándolo en memoria para volver a acceder con rol DM. No recargues la página si quieres recuperar esos cambios. El jugador no puede recuperar ese estado ni consultar escenas, assets o bibliotecas privadas. El jugador espera publicación y recibe el PlayerApp real mediante SSE. Publicación, cámara, apuntador, áreas, dados, presencia y recuperación están descritos en [mesa sincronizada](synchronized-table.md).

## Imágenes y enlaces

El selector admite PNG, JPEG y WebP estáticos, hasta 20 MiB. El servidor valida además contenido/dimensiones; HEIC y formatos no admitidos deben convertirse. **Agregar mapa**, **Actualizar imagen**, el selector de fichas y **Imagen** del token suben un asset. En notas, **Agregar o reemplazar imagen** inserta la imagen o reemplaza la selección de imagen del editor. Para sustituir un marcador de imagen ausente, selecciónalo en el documento antes de elegir la nueva imagen.

Las escenas conservan `asset:UUID`; el DOM solo recibe `/api/v1/assets/UUID` validado. Una ruta local/importada o URL externa se identifica como ausente, conservando su referencia para diagnóstico. El aviso indica mapa/token/nota afectado. No se intenta leer esa ruta en el servidor ni descargar una URL arbitraria. Los assets exportados permanecen en esta instancia; transferir solamente el JSON no los hace portables. El reemplazo de fondo pide confirmación y política de tamaño, mantiene ID, geometría y estado inactivo, y conserva el original si se cancela o falla.

Los enlaces entre escenas usan `scene:UUID` en los campos heredados `scenePath`/`filePath`; nunca son rutas del sistema. El selector de destino muestra escenas y marcadores del servicio. Desde la pestaña **Mapa**, abre **Editar** en una conexión y usa **Elegir escena del servicio**, selecciona el marcador y confirma **Conectar con esta escena**. El mismo modal conserva la alternativa de mapa interno. Para cambiar entre un enlace interno y otro hacia una escena distinta, usa primero **Desligar**: intentar cambiar directamente muestra una indicación y conserva la conexión sin guardar cambios parciales. Si desligar falla, el enlace permanece y se puede reintentar. Un destino heredado ausente se puede reemplazar directamente; se avisa si no fue posible actualizar aquella referencia anterior. Conectar/desconectar actualiza ambos extremos en una transacción SQLite; navegar revalida reciprocidad y activa el mapa de destino. Los enlaces internos siguen usando IDs de mapa. Referencias locales importadas no se adivinan por nombre: quedan rotas y pueden desconectarse/repararse con el selector.

## Arquitectura y seguridad

`src/web/ServiceApp.tsx` compone sesión y roles, `DialogHost` gestiona diálogos nativos accesibles y `createBrowserClient` adapta el contrato completo. `HttpTransport` valida JSON/esquemas, mismo origen, errores y generación antes/después del cuerpo. Logout/401 abortan solicitudes y la señal compartida de sesión; selectores y lecturas de archivos de una sesión anterior se descartan incluso tras reautenticación. Los portales de notas, fichas, bibliotecas y reemplazo se montan dentro de la frontera hidden/inert del VTT, conservando borradores sin exponerlos durante recuperación. Los hooks existentes conservan guards por escena/mapa. Los enlaces reutilizan reglas de dominio; importar mapas comparte el caso puro extraído del adaptador de filesystem.

El cliente declara escenas/imágenes/bibliotecas/player/dice disponibles y nativeMenus ausente. `TtrpgClient.assetReferences = "service"` identifica la representación para habilitar inserción de imágenes de notas solo donde existe; no concede permisos. Todos los métodos Player/Dice usan HTTP/SSE reales; los eventos de menús nativos siguen inactivos.

El grafo web no importa main/preload/Electron/SQLite. Pixi usa su módulo `pixi.js/unsafe-eval`, cuyo nombre histórico designa los reemplazos de generadores que evitan evaluación dinámica. La CSP mantiene `script-src 'self'` sin `unsafe-eval`; assets remotos están bloqueados. El servidor limita estáticos a realpath del build, rechaza archivos ocultos/traversal/symlinks externos, métodos no GET/HEAD y assets inexistentes. Solo navegaciones HTML sin extensión tienen fallback; `/api/v1` conserva errores JSON y autorización.

## Matriz de paridad y evidencia

| Capacidad | Navegador | Electron local | Evidencia |
| --- | --- | --- | --- |
| Mapa, grilla, medidas, luz, efectos, niebla, anotaciones, selección | Mismos motores y herramientas | Conservado | Suite dominio/render/App; CUA mapa900×600, luz y medida15ft |
| Escenas y múltiples mapas | Guardar/selector/importar/exportar/como mapa | Diálogos locales | `browser-client.test.ts`, `App.workspace.test.tsx`; CUA dos mapas + reload + archivos JSON descargados |
| Imágenes y reemplazo | Upload y referencias seguras, fondos/tokens/fichas/notas | Protocolos locales | Integración HTTP, tests existentes reemplazo; CUA nota con imagen, ruta ausente y fondo inactivo |
| Bibliotecas y plantillas | Tres bibliotecas y plantillas persistentes | Repositorios locales | Integración real con reinicio y suite de bibliotecas/ciclo de vida |
| Enlaces | Operaciones recíprocas atómicas con IDs | Enlaces locales | Integración real navegación/desconexión/reconexión/rollback; App/modal de conexión y reparación; CUA conexión A/B, reconexión y reparación heredada |
| Sesión y roles | DM privado; jugador con proyección filtrada | Player View IPC | `ServiceApp.test.tsx`; CUA IAB/Chrome independientes,401/red/logout |
| Publicación/cámara/puntero/áreas/dados compartidos | HTTP/SSE real, recuperación y assets vigentes | Operación IPC existente | Integración real `table-http`, adaptador `table-client` y evidencia 004 |
| Labs | Entradas previas | Sin sustitución por cliente de prueba | Suite App/labs; CUA ui-lab monasterio |
| Layout |1440×900/1024×768/1920×1080 | VTT existente | CUA: drawers sin overflow1024, proyección jugador1920 |

Detalles de ejecución, límites del humo y resultados de comandos: [build 003](../factory/jobs/003-cliente-navegador/build.md). La matriz no afirma prueba manual exhaustiva de todas las herramientas: bibliotecas, enlaces y casos de fallos complejos tienen integración automatizada real más regresión de los componentes existentes.
