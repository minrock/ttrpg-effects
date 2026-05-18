# TTRPG Effects

Aplicacion desktop para proyectar mapas y efectos visuales en sesiones TTRPG presenciales.

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

La app muestra un viewport PixiJS con capas de prueba para validar el orden base de render. Puedes arrastrar el canvas para hacer pan y usar la rueda del mouse para hacer zoom centrado en el cursor.

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

Puedes cargar un mapa real desde `Cargar mapa`.

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
