# Operar el servicio y conectar Electron — 3.8.0

Electron arranca **local** por defecto. El modo **service** carga exactamente el cliente web y guarda en el servicio indicado por el título de ventana; no abre la biblioteca ni los archivos del perfil local. No inicia un servidor. El formato `.ttrpgscene` continúa en v2, con migración de v1.

La [infraestructura multi-DB y catálogo](database.md) añade `control.sqlite` local y PostgreSQL para migraciones/pruebas. La API descrita aquí sigue usando almacenamiento legado: solo admite `TTRPG_DEPLOYMENT=local` y `TTRPG_DB_DRIVER=sqlite` (defaults). Declarar production/postgres falla antes de arrancar; no hay aún servicio completo PostgreSQL.

## Instalar, construir y ejecutar

Requiere Node.js **24**, pnpm y, para Electron, un escritorio compatible. Desde la raíz del proyecto:

```sh
pnpm install --frozen-lockfile
pnpm build:api
pnpm build:web
pnpm build
```

Las salidas independientes son `out/api` (entry `index.mjs`, comando `db-migrate.mjs` y chunks compartidos), `out/web`, y `out/main` + `out/preload` + `out/renderer`. Ningún build borra los otros. El empaquetado Electron solo incluye sus tres directorios; no incorpora el build API/web, datos ni configuración. No hace falta empaquetar para ejecutar el main compilado. En un servidor sin escritorio bastan los dos primeros builds, package.json y dependencias de producción instaladas en la arquitectura destino; sharp contiene binarios nativos. No trasladar node_modules entre arquitecturas.

Prepara una vez la configuración privada con el script Bash:

```sh
pnpm setup:env
```

Crea `.env` para la API y `.env.electron` para el cliente, ambos con permisos **0600**, y un directorio de datos **0700** bajo `~/.local/share/ttrpg-effects-service`. Guarda rutas absolutas reales y genera dos claves aleatorias diferentes, que permanecen entre arranques. No imprime claves ni sobrescribe archivos existentes; rechaza enlaces simbólicos. Puedes seleccionar otro directorio al prepararlo por primera vez con `TTRPG_DATA_DIR=/ruta/privada/mesa pnpm setup:env`.

Los archivos privados están ignorados por Git y excluidos del empaquetado. Las plantillas `.env.example` y `.env.electron.example` documentan las variables sin secretos. Consulta las claves DM/jugador en tu `.env` privado para iniciar sesión; no las copies a `.env.electron`, `VITE_*` ni URLs.

Después basta arrancar la API desde la raíz del proyecto:

```sh
pnpm start:api
```

Abre `http://127.0.0.1:8787`. En otra terminal, conecta Electron:

```sh
pnpm start:service
```

Node carga `.env` para la API y únicamente `.env.electron` para el comando Electron. El entorno explícito del proceso tiene precedencia sobre el archivo. Los archivos son opcionales si ya proporcionas variables desde el entorno; no se ejecutan como Bash ni expanden `$HOME`/`$PWD`. Cambiar la configuración requiere reiniciar el proceso.

En `.env.electron`, `TTRPG_ELECTRON_MODE=service` selecciona servicio y `TTRPG_SERVICE_URL=http://127.0.0.1:8787` define el destino. Cambia el modo a `local` para usar almacenamiento local mediante el mismo comando. Sin archivo ni variables, Electron conserva su valor predeterminado local. `pnpm dev` sigue siendo el desarrollo local tradicional y no carga `.env.electron`; `pnpm dev:service` sí lo carga. El DMG instalado no busca estos archivos del repositorio: esta carga pertenece a los comandos pnpm.

En modo servicio, `start:service` ejecuta Electron y carga el build web de la API, no `out/renderer`. La sesión Electron es efímera: recargar conserva la cookie y cerrar la aplicación exige un nuevo acceso. No comparte cookies con Electron local, navegador ni otro proceso Electron servicio. Para proyectar, publica y copia el **Enlace jugador** de Mesa a un navegador/perfil independiente; allí accede con clave Jugador. `Abrir enlace` se bloquea en Electron por la política de ventanas; el campo Enlace jugador permanece visible y seleccionable. La política de permisos puede impedir el botón Copiar: en ese caso aparece «Selecciona el enlace y cópialo manualmente»; selecciona el campo y usa Cmd/Ctrl+C o Editar → Copiar. La URL por sí sola no cambia el rol de una cookie DM.

Si cierras la ventana o sales de Electron con cambios pendientes, aparece una confirmación nativa: **Seguir editando** conserva el borrador para que puedas guardarlo; **Descartar y salir** cierra perdiendo esos cambios. Escape cancela la salida. Sin cambios pendientes, la aplicación cierra normalmente.

Desarrollo API/web: `TTRPG_PUBLIC_ORIGIN=http://127.0.0.1:5175 pnpm dev:api` con el resto de variables en `.env`; en otra terminal `pnpm dev:web`. Este Vite usa puerto 5175 y proxy hacia API 8787. Para probar Electron sobre ese frontend: `TTRPG_SERVICE_URL=http://127.0.0.1:5175 pnpm dev:service`. Modo servicio tiene precedencia sobre `ELECTRON_RENDERER_URL`. Para desarrollo Electron local, usa `pnpm dev` sin `TTRPG_ELECTRON_MODE`; no necesita servicio ni claves.

## Variables

| Variable | Obligatoria / valor por defecto |
| --- | --- |
| `TTRPG_HOST` | API: `127.0.0.1`; conservar bind privado tras proxy. |
| `TTRPG_PORT` | API: `8787`; entero 0–65535, 0 para pruebas. |
| `TTRPG_DATA_DIR` | API: obligatoria, absoluta, física y exclusiva, sin enlaces simbólicos. |
| `TTRPG_WEB_DIR` | API: opcional, absoluta al build web. Para esta entrega full stack, establecerla; si falta index.html el arranque falla. Sin variable la API sirve solo HTTP/API. |
| `TTRPG_PUBLIC_ORIGIN` | API: obligatoria, origen exacto sin barra final, ruta, query ni credenciales. HTTPS fuera de localhost/127.0.0.1/::1. |
| `TTRPG_DM_KEY`, `TTRPG_PLAYER_KEY` | API: obligatorias, distintas, aleatorias, 32–1024 caracteres; sin defaults. |
| `TTRPG_ELECTRON_MODE` | Electron: `local` por defecto o `service` explícito; un valor desconocido falla sin fallback. |
| `TTRPG_SERVICE_URL` | Electron service: obligatoria; origen raíz HTTP(S), sin credenciales/query/fragmento. HTTPS excepto localhost exacto e IP loopback (127/8, ::1). Se normaliza esquema/host/puerto. |
| `ELECTRON_RENDERER_URL` | Interna de electron-vite en desarrollo local; solo renderer loopback aprobado. No selecciona modo servicio. |

No se desactiva validación TLS. Los permisos de cámara, micrófono, geolocalización y notificaciones, popups y webviews están bloqueados. Las ventanas de servicio no tienen preload, Node ni IPC; importar archivos requiere el selector web explícito y exportar utiliza descargas normales. El menú servicio conserva edición/ventana/salida y reintento de conexión únicamente en recuperación; no hay recientes ni gestores locales.

## HTTPS y proxy

Para LAN/remoto necesitas un nombre y certificado HTTPS confiable por los clientes. Ejemplo Nginx orientativo (no desplegado aquí), origen `https://mesa.example`, API enlazada a 127.0.0.1:8787 y `TTRPG_PUBLIC_ORIGIN=https://mesa.example`:

```nginx
server {
    listen 443 ssl;
    server_name mesa.example;
    ssl_certificate /ruta/privada/fullchain.pem;
    ssl_certificate_key /ruta/privada/privkey.pem;
    client_max_body_size 21m;
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host mesa.example;
        proxy_set_header Origin $http_origin;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 60s;
    }
}
```

Con puerto público no estándar conserva también ese puerto en Host y origen. El backend no confía en Forwarded/X-Forwarded-*; no deriva HTTPS de esas cabeceras. Las cuotas usan la IP del par inmediato y los clientes detrás del proxy comparten cuota. No se necesita CORS: API/web comparten origen. No habilitar CORS comodín, omitir TLS ni poner claves en URL. SSE requiere buffering desactivado y timeout largo. Las cookies Secure derivan del origen configurado.

## Sesiones, claves y almacenamiento

Los párrafos de claves/globales de esta sección describen el acceso legado. Las sesiones de cuentas007 sí persisten tras reinicio y se revocan al rotar TTRPG_AUTH_SECRET; su provisión, recuperación y respaldo completo están en [identidad](identity.md). No aplicar a esas cuentas la afirmación de sesiones exclusivamente en memoria.

Login establece cookie HttpOnly/SameSite=Strict limitada a `/api/v1`, Secure con HTTPS. La sesión vence absolutamente a ocho horas. Logout la revoca; un fallo de red conserva el estado con error, sin afirmar que la revocación ocurrió. Reautenticar DM recupera cambios en memoria tras expiración; cambiar de rol exige descartarlos. Una recarga no recupera trabajo sin guardar.

Para rotar claves, detener limpiamente la API, cambiar ambas en la configuración privada y arrancar. El reinicio invalida **todas** las sesiones, publicación, presencia y dados, que viven en memoria. No existe recarga dinámica de variables ni revocación retroactiva de bytes descargados. Los jugadores deben acceder otra vez y el DM volver a publicar.

`TTRPG_DATA_DIR` contiene `service.sqlite` (escenas, imágenes BLOB, plantillas y metadatos), `monsters.sqlite`, `entities.sqlite` y sus sidecars SQLite mientras existan. No hay carpeta separada de assets: están en service.sqlite. `service.lock` evita otra instancia. Si se ejecutó `db:migrate` local, el directorio también contiene `control.sqlite` y sus sidecars, con exclusión independiente `control.lock`; incluirlos en el respaldo completo. Directorio 0700 y configuración 0600; no compartir escritura con otros procesos. El perfil Electron local es independiente y no se migra. Reiniciar conserva recursos guardados, no estado de mesa ni borradores clientes.

## Backup y restauración

1. Detén limpiamente el proceso API con SIGTERM o Ctrl+C y espera su salida; debe retirar `service.lock`. No copies solo SQLite mientras está ejecutándose.
2. Respalda **todo** el directorio, incluidas las tres bases y cualquier WAL/SHM presente, como unidad. Guarda separadamente y con permisos privados la configuración, versión de aplicación y claves. Un respaldo de claves es secreto.
3. Extrae a un directorio nuevo físico y privado, sin sobrescribir la biblioteca personal. Con el servicio detenido, configura ese directorio absoluto y el origen/puerto correcto. Inicia la misma versión antes de cualquier actualización.
4. Accede de nuevo como DM y comprueba escena, imágenes y biblioteca. No esperes recuperar sesiones o proyección; publica otra vez.

Ejemplo con API ya detenida y variables del operador:

```sh
umask 077
tar -C "$TTRPG_DATA_DIR" -czf /ruta/privada/respaldo-mesa.tar.gz .
mkdir -m 700 /ruta/fisica/privada/mesa-restaurada
tar -C /ruta/fisica/privada/mesa-restaurada -xzf /ruta/privada/respaldo-mesa.tar.gz
TTRPG_DATA_DIR=/ruta/fisica/privada/mesa-restaurada pnpm start:api
```

Si hubo muerte forzada y queda lock, confirma primero que no existe proceso vivo; retira únicamente `service.lock`, conserva bases y sidecars para recuperación SQLite. Ante corrupción recupera un respaldo válido. No borres sidecars para forzar apertura.

## Escenas y errores recuperables

Importar `.ttrpgscene` v1 migra en memoria a v2 y conserva mapas, IDs y geometría. Exportar descarga JSON explícitamente; no incluye bytes de imagen. Las rutas de archivos locales ausentes se informan y pueden reemplazarse mediante upload; nunca se leen implícitamente en el servidor. `asset:UUID` y `scene:UUID` pertenecen a esta instancia: trasladar solo JSON no traslada imágenes ni destinos de enlaces. Para mover la instancia entera usa backup/restore; para intercambio parcial reemplaza imágenes y repara enlaces explícitamente.

- Conexión inicial rechazada, DNS o certificado: Electron muestra destino y Reintentar/Salir, utilizables con Tab/Enter; arregla servicio/certificado antes de reintentar. No hay fallback con privilegios.
- Caída de API/SSE durante edición: conserva cambios y muestra reconexión; evita recargar. Vuelve a guardar cuando el servicio responda. Si reinició, accede de nuevo y publica.
- 403 origen/cookies: comprueba coincidencia exacta de Host, Origin, esquema y puerto y contexto de navegador independiente por rol. No abrir index.html directamente como file.
- Almacenamiento: comprueba directorio absoluto/físico, permisos privados y exclusividad del lock. Los errores de arranque se muestran en stdout/stderr sin claves, SQL ni rutas privadas.
- Imagen ausente: reemplaza la referencia desde el mapa/ficha/nota; un JSON importado no concede acceso al disco. Una imagen de jugador requiere estar en la publicación vigente.
- Diagnóstico frontend: consola/red de herramientas de desarrollo. No compartas cabeceras Cookie, claves ni cuerpos de escena privados en reportes.

## Matriz final

| Cliente | Roles y persistencia | Evidencia y límites |
| --- | --- | --- |
| Electron local | DM + Player IPC; escenas/recientes/bibliotecas locales | Flujos previos 001–004 conservados; protección de navegación y humo de esta entrega en build 005. |
| Navegador | DM privado + jugador filtrado, HTTP/SSE; almacenamiento API | Suites y humo real 003/004: mapa, guardar/cargar/importar/exportar, cámaras, puntero/áreas y dados públicos/ocultos, sesiones/reconexión. No se repite exhaustivamente cada herramienta. |
| Electron servicio | Mismo frontend/API con rol servidor, sin bridge; publicación a jugador de otro contexto | Configuración, aislamiento y fronteras reales, recuperación y roles documentados en build 005. |
| Producción API/web | Node 24 sin Electron/dev server; recursos persistentes y mesa efímera | Reinicio y backup/restore temporal con escena/imagen/biblioteca; ver atribución y comandos en build 005. |

El detalle reproducible y los límites concretos están en [build 005](../factory/jobs/005-electron-servicio/build.md). No se certifican distribución firmada, despliegue remoto, proyector físico ni una prueba manual de todas las combinaciones de herramientas.

## Identidad de cuentas optativa (007)

La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.

## Backend privado008

Consulta [partidas, recursos por DM y transferencia operativa](owned-data.md) para migración3, rutas `/api/v1/dm`, revisiones, idempotencia y pruebas reales de ambos motores. Esta superficie no convierte las rutas globales históricas en multiusuario ni retira su guard productivo;011 completa el corte.
