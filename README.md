# TTRPG Effects

Herramienta web para preparar y proyectar mesas TTRPG: interfaz React/Pixi en navegador y servicio privado Node.js con API HTTP/SSE. La retirada de Electron está definida en [SDD62](SDD/specs/62-servicio-solo-web/spec.md).

## Especificaciones SDD

La planificación y documentación vigente se reúnen en [SDD](SDD/README.md): [estado actual](SDD/estado-actual.md), [arquitectura y datos](SDD/arquitectura.md), specs del servicio y antecedentes históricos y [flujo para nuevas especificaciones](SDD/flujo.md). Los criterios y la evidencia histórica de cada entrega están enlazados desde SDD.

## Interfaz de mesa

La version 3.0.0 incorpora una cabecera compacta, una barra vertical de herramientas y paneles plegables: explorador `Escena`/`Mapa` e inspector `Propiedades`/`Dados`. Los controles de camara DM y jugador permanecen separados.

Player View mantiene la escena del DM protegida y agrega mediciones de linea/camino y areas locales (circulo, cuadrado, rectangulo y cono). Estas figuras solo viven en esa ventana, se pueden editar o borrar y se limpian al cambiar de mapa o escena. El boton de herramientas oculta los controles sin borrar las figuras.

El salto mayor es una decision de lanzamiento; las escenas `.ttrpgscene` existentes siguen siendo compatibles. Alcance y verificaciones en [spec 39](SDD/specs/39-vtt-interface/spec.md) y su [plan](SDD/specs/39-vtt-interface/plan.md).

## Planificación por especificaciones

Usa [el flujo SDD](SDD/flujo.md) para definir alcance, plan y validación. La organización anterior de agentes fue retirada; [criterios conservados y trazabilidad](SDD/retirada-factory.md).

## Arquitectura de clientes

El [contrato de cliente web](SDD/guias/client-architecture.md) documenta la composición por raíz React y sus capacidades. Administradores, DMs y jugadores usan el navegador y los clientes HTTP/SSE correspondientes. La [guía operativa](SDD/guias/service-operations.md) explica configuración, arranque, respaldo e instalaciones independientes.

## Requisitos

- Node.js 24 para construir y operar el servicio; los jugadores solo necesitan un navegador compatible.
- `pnpm`.

## Desarrollo local

Instalar dependencias:

```bash
pnpm install
```

Después de [preparar el servicio](#preparar-el-servicio), iniciar API y frontend en modo desarrollo:

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

## Catálogo de componentes

Storybook documenta controles y composiciones de interfaz sin arrancar la API ni el renderer del mapa. Inícialo de forma local en `http://127.0.0.1:6006`:

```bash
pnpm storybook
```

Para construir el catálogo estático y verificar que las historias no incorporen motores, entradas de aplicación ni código privilegiado:

```bash
pnpm build-storybook
```

Las historias viven en `src/stories/`; el inventario y los límites de cada componente están en [SDD 60](SDD/specs/60-storybook-componentes-ui/).

Para añadir una historia, usa un título estable bajo `Controles/` o `Composiciones/`, indica la ruta y el consumidor de producción en la documentación CSF y conserva estado local reiniciable. Elige `parameters.uiContext` entre `neutral`, `editor`, `service` y `workspace` según el árbol CSS que requiera el componente. No importes entradas de aplicación, módulos privilegiados, API, Pixi, Three ni datos locales: el chequeo previo y el build rechazan esos grafos. Revisa teclado, foco, etiqueta accesible y texto largo en los viewports de 390 y 1440 px; el addon a11y ayuda a detectar problemas, pero no sustituye esa revisión.

## Entradas del producto

`src/server/index.ts` compone la API y sirve el frontend. `src/web/main.tsx` monta acceso, administración y mesa. El editor y PlayerApp se conservan en `src/renderer/src` como componentes web; no existe bridge nativo ni acceso directo a Node desde React.

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
- Guardar y cargar escena conserva luces y fuego en el documento de escena; el formato portable `.ttrpgscene` también los representa.

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

## Escenas y recuperación

Las campañas contienen arcos y cada arco sus propias escenas. El editor gestiona los mapas de la escena; Guardar confirma la versión en el servicio. Los borradores IndexedDB y remotos protegen trabajo pendiente con recuperación contextual al entrar en la escena.

El formato portable `.ttrpgscene` mantiene v2 y lectura/migración de v1. Los recursos del servidor se identifican por IDs autorizados; conservar un lector de referencias antiguas no concede acceso a rutas arbitrarias del servidor. Las bases, perfiles e instaladores de versiones desktop anteriores no se eliminan ni migran automáticamente.

## Dados del DM y de jugadores

La pestana `Dados` del panel derecho permite preparar tiradas 3D sobre el mapa, públicas para la mesa u ocultas solo para el DM. Los jugadores disponen del mismo compositor con tiradas siempre públicas.

- Composicion por cantidades o formulas por tipo de dano, con colores representativos, modificadores y subtotales independientes.
- Chequeo d20 exclusivo: normal, ventaja o desventaja, con su propio modificador. Un 20 natural conservado muestra rayos y un aviso de critico segun la privacidad de la tirada.
- Resina, mate o metal, paleta ampliada y fuerza configurable. d% usa dos d10 emparejados.
- Una tirada pública bloquea Lanzar hasta que su autor o el DM la cierre. El DM puede ocultar el resumen numérico sobre el mapa, pero el historial público conserva valores y totales.
- El jugador ve el historial público y el DM las tiradas públicas y privadas. El historial es efímero y acotado; no entra en `.ttrpgscene` y se pierde al reiniciar el runtime.

Detalle funcional vigente en [SDD61](SDD/specs/61-dados-jugadores/spec.md), con antecedentes en [SDD37](SDD/specs/37-dm-dice-rolls/spec.md). Motor y texturas se sirven con la aplicación, sin CDN. Las licencias de geometría y audio permanecen en `src/render/three/dice/vendor` y `assets/dice/audio`; sus copias se incluyen en `src/renderer/public/licenses` y en el build web bajo `out/web/licenses`.

## Laboratorios de interfaz

Durante desarrollo, `/ui-lab.html` ofrece la propuesta de interfaz con datos en memoria y `/player-lab.html` monta Player View con un cliente sintético explícito. En este ultimo, `?north=90`, `180` o `270` permite comprobar herramientas con el mapa rotado. Son entradas de desarrollo, sin persistencia ni inclusión en el build productivo.

## Servicio privado API

`pnpm start:api` vigila API y frontend web durante el desarrollo y ejecuta la API independiente en Node.js24 con cuentas administrador/DM, recursos privados y partidas con sistema/version explícitos. DM y jugadores comparten la interfaz web con clientes y permisos propios. Consulta [API](SDD/guias/private-api.md), [interfaz](SDD/guias/browser-client.md) y [operación/respaldo](SDD/guias/service-operations.md).

## Preparar el servicio

```bash
pnpm setup:env
pnpm build:api
pnpm build:web
pnpm db:migrate
pnpm createsuperuser
pnpm identity:password # Solo si generaste una contraseña temporal
pnpm identity:provision-dm
pnpm start:api
```

Para desarrollar basta `pnpm dev` (alias de `pnpm start:api`; también disponible como `pnpm dev:api`): compila una vez y mantiene dos compiladores incrementales de Vite. Cambiar código de API reinicia el servidor después de cerrar la instancia anterior; cambiar frontend actualiza los archivos y solo requiere recargar Chrome. Los cambios de `.env` reinician la API y vuelven a cargar la configuración; el entorno explícito prevalece. Los artefactos temporales están en `out/dev-service/`, separados del build normal. No ejecuta typecheck en cada cambio: usa `pnpm typecheck` antes de cerrar el trabajo.

Para ejecutar un build estable sin vigilancia: `pnpm build && pnpm start`. Se conservan `build:service`, `build:api`, `build:web` y `start:api:built` para operaciones independientes. Detén la instancia anterior antes de iniciar cualquiera de los modos. Si cambias la configuración de Vite o dependencias, reinicia el supervisor. Ctrl+C cierra los compiladores y libera las conexiones del servidor.

Los comandos de identidad son TTY y nunca aceptan contraseñas en argumentos. No se crean cuentas al arrancar. Setup conserva configuración existente y genera configuración nueva privada en `.env` y `.local/service/{data,backups,logs}`; los datos quedan ignorados porGit. Un entorno legado incompleto exige actualización explícita. No hay claves DM/jugador globales ni autorregistro.

`pnpm createsuperuser` solicita correo, nombre y contraseña desde una terminal local. Puedes elegir y confirmar una contraseña definitiva o pulsar Enter para generar una temporal que se muestra una vez y requiere cambio posterior. Ejecútalo con la API detenida si usas SQLite. También puedes usar `node scripts/createsuperuser.mjs`; `--help` muestra la preparación necesaria. Permite crear varios administradores con correos distintos. Ejecuta `pnpm db:migrate` antes del primer uso de esta versión. Si una cuenta ya existe y necesitas recuperar su acceso, usa `pnpm identity:recover-admin` con el servicio detenido. El script no abre un puerto ni se sirve al navegador; usa la provisión transaccional de identidad.

PostgreSQL con TLS verificado es obligatorio en producción; SQLite sigue disponible para el servicio local. Electron y sus comandos de empaquetado ya no forman parte del producto. [Persistencia y migraciones](SDD/guias/database.md).

La cabecera del servicio reúne navegación (☰), partida, escena, herramientas del editor y perfil en una sola fila compacta. En pantallas estrechas, las herramientas se agrupan bajo el botón de tres puntos. Abre el nombre de la partida para volver al catálogo, cerrar o reabrir; abre el perfil para cambiar contraseña o cerrar sesión. Los desplegables admiten Tab y Escape, y las acciones conservan sus confirmaciones.

## Cuentas, sistemas, partidas e invitaciones (3.13.0)

[Identidad](SDD/guias/identity.md): múltiples administradores locales, provisiónDM, cambio de contraseñas temporales, disable/reset/revocación. [Datos privados y catálogo](SDD/guias/owned-data.md): dos propietarios aislados, versiones publicadas retenidas, CAS/bindings y transferencia explícita sin adoptar automáticamente perfiles desktop históricos. [Invitaciones](SDD/guias/invitations.md): alias, cookie por partida, continuidad/reapertura deliberada. [Moderación](SDD/guias/moderation.md): participantes identificados por alias+discriminador, expulsión atómica con nuevo enlace y supervivientes estables.

Los gates de DB/identidad/datos/invitaciones/moderación requieren PostgreSQL temporal real conTLS. El gate de moderación incluye composición final compilada y respaldo/restauración integral de ambos motores. Las pantallas se verifican en navegador; las pruebas históricas de Electron se conservan como antecedentes en [SDD51](SDD/specs/51-experiencia-servicio/aceptacion-historica.md). `.ttrpgscene` conserva v2 y lectura/migraciónv1.

## Operar diferentes instalaciones

Los mismos builds `out/api` y `out/web` pueden desplegarse en instalaciones independientes con base/directorio de datos, secreto y host/origen propios. Configura HTTPS, Host/Origin exactos y streaming SSE sin buffering en el proxy. Las cookies no se aíslan por puerto: usa hosts distintos para instalaciones independientes.

Se conserva un único proceso API por base. Las mesas y conexiones viven en memoria; no se soportan réplicas concurrentes sobre la misma base ni se incorpora Django/Redis en esta retirada. Los detalles y límites están en la [guía operativa](SDD/guias/service-operations.md).
