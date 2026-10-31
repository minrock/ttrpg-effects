# TTRPG Effects

Aplicacion desktop para proyectar mapas y efectos visuales en sesiones TTRPG presenciales.

## Interfaz de mesa

La version 3.0.0 incorpora una cabecera compacta, una barra vertical de herramientas y paneles plegables: explorador `Escena`/`Mapa` e inspector `Propiedades`/`Dados`. Los controles de camara DM y jugador permanecen separados.

Player View mantiene la escena del DM protegida y agrega mediciones de linea/camino y areas locales (circulo, cuadrado, rectangulo y cono). Estas figuras solo viven en esa ventana, se pueden editar o borrar y se limpian al cambiar de mapa o escena. El boton de herramientas oculta los controles sin borrar las figuras.

El salto mayor es una decision de lanzamiento; las escenas `.ttrpgscene` existentes siguen siendo compatibles. Alcance y verificaciones en [spec 39](specs/39-vtt-interface/spec.md) y su [plan](specs/39-vtt-interface/plan.md).

## Fábrica de software con Codex

Usa `$factory <funcionalidad>` para especificar, construir y revisar un cambio con subagentes. `$factory siguiente` toma un elemento de la cola; `$factory aprobar <id>` autoriza integrar un trabajo preparado y `$factory rehacer <id> <nota>` abre otro ciclo de correcciones. Commits y merge respetan la autorización explícita indicada en `AGENTS.md`.

Para ver el tablero, ejecuta `python3 -m http.server 8765 --bind 127.0.0.1 --directory factory` y abre [el visor local](http://127.0.0.1:8765/dashboard.html). El botón «Ver ejemplo» permite explorar el flujo con datos ficticios. Instrucciones y estructura en [factory/README.md](factory/README.md); alcance en [spec 40](specs/40-fabrica-software/spec.md).

## Arquitectura de clientes

El [contrato común y mapa de paridad](docs/client-architecture.md) documenta la composición por raíz React y las capacidades de cada cliente. Electron conserva el modo local y puede conectarse al mismo servicio privado HTTP/SSE que el navegador, con roles DM y jugador. La [guía operativa](docs/service-operations.md) explica cómo ejecutar ambos modos y el servicio.

## Requisitos

- Node.js compatible con el toolchain actual.
- `pnpm`.

## Desarrollo local

Instalar dependencias:

```bash
pnpm install
```

Abrir la app en modo desarrollo:

```bash
pnpm dev
```

Validaciones disponibles:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Bootstrap actual

El bootstrap inicial crea una ventana Electron segura con `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` y un preload pequeno expuesto mediante `contextBridge`.

## Motor visual

La app muestra el mapa y sus capas visuales en un viewport PixiJS. Puedes arrastrar el canvas para hacer pan y usar la rueda del mouse para hacer zoom centrado en el cursor.

## Interaccion

Puedes probar interacciones sin cargar un mapa:

- Click derecho sobre el canvas abre el menu contextual.
- El menu crea elementos visibles: medicion, linea, circulo, cono, rectangulo, luz puntual, luz conica y fuego.
- Click izquierdo sobre un elemento lo selecciona.
- Arrastrar una forma, luz o fuego seleccionado cambia su posicion en coordenadas de mundo.
- `Borrar seleccionado`, `Delete` o `Backspace` eliminan la seleccion.
- `Escape` cierra el menu contextual.
- `Bloquear zoom` impide que la rueda del mouse cambie el zoom.

## Mapa y grilla

Puedes agregar un mapa desde el explorador `Escena`, en la seccion `Mapas`, y actualizar su imagen desde las acciones de su fila sin perder los elementos preparados.

- Formatos esperados: PNG, JPG/JPEG, WEBP y HEIC.
- La grilla se puede activar/desactivar, ajustar por opacidad y cambiar por tamano numerico de celda.
- El selector de presets aplica escalas iniciales comunes.
- El handle dorado de calibracion sobre la grilla se puede arrastrar para cambiar el tamano de celda.
- Si una imagen HEIC no decodifica en Chromium/macOS, la app muestra un error recuperable.

## Herramientas tacticas y medicion

Las herramientas tacticas se crean con click derecho y se guardan en la escena.

- `Medicion` muestra una etiqueta de distancia.
- Las mediciones se colocan libres, aunque `Snap` este activo.
- Al seleccionar una medicion, arrastra el aro alrededor del origen para cambiar inclinacion y arrastra el punto final para cambiar longitud.
- `Linea`, `Circulo`, `Cono` y `Rectangulo` permanecen visibles hasta borrarse.
- Las formas tacticas pueden tener un emoji decorativo; las areas lo reparten como mosaico y la linea lo distribuye por su longitud.
- El panel lateral derecho permite cambiar unidad entre `ft` y `m`, valor por casilla, snap y diagonal.
- `Snap` encaja nuevas formas y movimientos a intersecciones de grilla.
- `Diagonal` cambia el calculo entre D&D 5e, Manhattan y Euclidean.
- Al seleccionar circulos, conos o rectangulos aparece un panel compacto para ajustar dimensiones.

## Iluminacion y fuego

La oscuridad global y la niebla se pueden activar/desactivar y ajustar desde el panel lateral derecho. Las luces y el fuego se crean con click derecho sobre el canvas.

- La luz puntual ilumina un area circular configurable.
- La luz conica ilumina un sector configurable por radio, angulo y direccion.
- Al seleccionar una luz puntual o conica, puedes arrastrar su handle dorado para agrandar o reducir el radio/longitud desde el canvas.
- El fuego se renderiza como areas rojas opacas y puede emitir una luz calida.
- Las areas de fuego muestran emojis de fuego dentro del circulo o de las celdas pintadas.
- `Pintar fuego` permite pintar cuadrados de grilla con un pincel circular.
- Al seleccionar una luz o fuego aparece un panel compacto para ajustar visibilidad, color, opacidad, intensidad, radio o escala segun corresponda.
- Al seleccionar fuego circular se puede alternar entre circulo cerrado y circulo abierto tipo aro.
- Guardar y cargar escena conserva luces y fuego en el archivo `.ttrpgscene`.

## Niebla de guerra y vision

La niebla de guerra es independiente de la oscuridad ambiental.

- `Visión en la oscuridad` vive en el panel de `Oscuridad`: muestra el mapa base en blanco y negro, ignora visualmente el overlay negro y recupera color dentro de luces visibles y fuego emisor de luz.
- `Niebla` activa una capa que oculta las zonas no reveladas.
- `Fog` ajusta la opacidad de esa capa.
- `Reveal` define el radio circular de revelado manual en coordenadas de mundo.
- `Modo niebla` permite descubrir areas con click o arrastre sobre el mapa.
- `Grab` vuelve al modo de navegacion para mover la vista sin revelar accidentalmente.
- El menu de click derecho permite alternar rapido entre `Grab` y `Modo niebla`.
- `Reset niebla` borra las areas reveladas manuales.
- Las luces visibles y el fuego que emite luz aportan vision actual mientras existan.
- Las paredes/obstaculos quedan guardables en el modelo para una futura linea de vision automatica, pero todavia no recortan la vision.

## Escenas locales

La UI incluye acciones para guardar y cargar escenas locales con extension `.ttrpgscene`.

- `Guardar escena` abre un dialogo nativo y escribe un JSON versionado.
- `Cargar escena` abre un dialogo nativo, valida el JSON y muestra errores recuperables.
- Si la escena referencia una imagen local que no existe, la app muestra un warning y conserva el resto de la escena.

## Dados del DM

La pestana `Dados` del panel derecho permite preparar tiradas 3D sobre el mapa, abiertas para ambas ventanas u ocultas solo para el DM.

- Composicion por cantidades o formulas por tipo de dano, con colores representativos, modificadores y subtotales independientes.
- Chequeo d20 exclusivo: normal, ventaja o desventaja, con su propio modificador. Un 20 natural conservado muestra rayos y un aviso de critico segun la privacidad de la tirada.
- Resina, mate o metal, paleta ampliada y fuerza configurable. d% usa dos d10 emparejados.
- Dados y resumen permanecen hasta cerrar con la X del DM; el resumen numerico publico es opcional. Las caras siguen visibles en una tirada abierta aunque se oculte el resumen.
- Historial privado durante la sesion, sin guardar dados ni logs en `.ttrpgscene`. Cerrar la aplicacion borra el historial.

Detalle funcional y tecnico en [spec 37](specs/37-dm-dice-rolls/spec.md) y su [plan](specs/37-dm-dice-rolls/plan.md). El motor y las texturas se empaquetan localmente, sin CDN. La atribucion de la geometria adaptada se incluye en `Resources/licenses/dice-box-threejs` del instalador.

## Laboratorios de interfaz

Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en memoria y `/player-lab.html` monta Player View con un adaptador local. En este ultimo, `?north=90`, `180` o `270` permite comprobar herramientas con el mapa rotado. Son entradas de desarrollo, sin persistencia ni inclusion en el instalador.

## Servicio privado API

`pnpm build:api` y `pnpm start:api` ejecutan la API independiente en Node.js 24. Requiere configurar claves DM/jugador, origen y directorio exclusivo. Consulta [configuración, rutas, límites y respaldo](docs/private-api.md). La versión 3.6.0 conserva el formato de escena 2 y Electron local, e incluye [cliente navegador](docs/browser-client.md) y [mesa sincronizada HTTP/SSE](docs/synchronized-table.md) con roles DM/jugador.

Para ejecutar Electron contra el servicio y operar la instancia, consulta [Electron servicio, HTTPS, claves y backup/restore](docs/service-operations.md).

### Configuración local del servicio

Ejecuta `pnpm setup:env` una vez para crear `.env`, `.env.electron` y el directorio privado de datos. Después usa `pnpm start:api` y, en otra terminal, `pnpm start:service`. Las claves DM/jugador permanecen en `.env`; el modo y la URL del cliente están en `.env.electron`. Consulta la [guía operativa](docs/service-operations.md) para builds y detalles.

### Persistencia multi-DB

La versión 3.8.0 incorpora infraestructura y catálogo de partidas para SQLite local/PostgreSQL producción, con migraciones explícitas y contratos reales. **La API global todavía solo arranca con local + sqlite**; la migración funcional y autenticación por cuentas siguen pendientes. Consulta [drivers, migraciones y gate test:db](docs/database.md).

## Identidad de cuentas optativa (007)

La versión 3.9.0 incorpora cuentas administrador/DM separadas del acceso legado, activadas explícitamente y sin nueva UI. Consulta [operación de identidad](docs/identity.md) para migraciones, comandos TTY, contraseñas temporales, cookies y límites de transición. No habilita el servicio VTT completo sobre PostgreSQL ni concede acceso a la mesa global.

## Partidas y datos privados (008)

La versión 3.10.0 entrega partidas y recursos privados por DM, catálogo de sistemas administrado por admin y publicaciones retenidas sin borrado. Incluye referencias exactas, transacciones SQLite/PostgreSQL, revisiones/idempotencia, migración 4 y transferencia operativa v3 con lectores v1/v2. [API y operación de datos privados](docs/owned-data.md). El servicio global histórico continúa limitado a local+SQLite; las nuevas cuentas y datos están separados, el arnés PostgreSQL se prueba sin ServiceStore y el corte de producto/UI está pendiente de011.

## Invitaciones backend009 (3.11.0)

La [guía de invitaciones](docs/invitations.md) describe apertura/presencia, enlaces efímeros, alias/cookies, replay, cuotas, migración5 y restauración segura. `pnpm test:invitations` verifica contratos reales SQLite/PostgreSQL y humo API compilada. Proyección/moderación010 y pantallas/corte011 siguen pendientes; no se retira el guard de transición.

## Moderación y transporte contextual010 (3.12.0)

[Moderación por participante y mesas independientes](docs/moderation.md): expulsión atómica con rotación única, roster privado, HTTP/SSE/assets/dados por partida y adaptador con terminación segura. `pnpm test:moderation` verifica ambos motores reales y el backend compilado. La composición optativa no activa el frontend legado; pantallas y corte integrado permanecen en011.
