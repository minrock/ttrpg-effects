# Plan tecnico 38 - Laboratorio de interfaz VTT

Continuacion y cierre 2026-10-28: propuesta aceptada y laboratorio cerrado como referencia de la version 3.0.0. Ver `SDD/specs/39-vtt-interface/plan.md` para la integracion real y el empaquetado autorizados posteriormente por el usuario. El lab importa `CompassOverlay` compartido corregido en esa fase; no cambia su fixture ni su aislamiento de persistencia. Las restricciones y resultados siguientes corresponden a la fase original del lab, no al cierre posterior de la spec 39.

## 1. Base y estado

- Spec fuente: [spec.md](spec.md).
- Base de producto: 2.8.1. Rama existente: `feature/vtt-interface-lab`; no cambiar de rama.
- Entrada exacta: `src/renderer/ui-lab.html`, URL `/ui-lab.html`.
- URL local elegida: [http://127.0.0.1:5182/ui-lab.html](http://127.0.0.1:5182/ui-lab.html).
- Codigo y estilos aislados: `src/renderer/src/ui-lab/`.
- Mapa generado disponible: `assets/lab/cloister-map.png`. Fuente/prompt documentados en el README generado por Codex junto al asset.
- Estado: implementado como lab independiente, con QA registrado en la seccion 9. No integrado en produccion.
- La inspeccion de codigo no certifica resultados de tests ni smoke. Los resultados efectivos se registran en la seccion final.

## 2. Fronteras de archivos

| Ruta | Uso permitido en la implementacion del lab |
| --- | --- |
| `SDD/specs/38-interface-lab/spec.md`, `plan.md` | Alcance, mapeo, decisiones y resultados reales. |
| `src/renderer/ui-lab.html` | HTML independiente con root, titulo del lab y script de entrada propio. |
| `src/renderer/src/ui-lab/` | React, fixtures, CSS, adaptador del preview y pruebas focalizadas. |
| `assets/lab/cloister-map.png` | Consumir el asset original generado, con su fuente/prompt en el README adyacente. |

No modificar `App.tsx`, `PlayerApp.tsx`, `main.tsx`, `src/renderer/index.html`, estilos/componentes de produccion, `src/render/`, `src/domain/`, efectos, main, preload, application, infraestructura, storage, configuracion de build, dependencias o lockfile. No actualizar `package.json` ni `CHANGELOG.md`.

No ejecutar operaciones de historial, release, merge ni DMG como parte del lab. La version 2.8.1 permanece igual; este experimento no es un cierre de feature de produccion.

## 3. Entrada y arquitectura local

`electron.vite.config.ts:27` ya fija `src/renderer` como raiz del renderer. Las paginas `fire-lab.html` y `lightning-lab.html` demuestran el patron de entrada HTML hermana. No importar sus modulos de arranque: inicializan renderers inmediatamente.

Estructura del lab; la existencia de estos archivos no implica aceptacion ni tests aprobados:

```text
src/renderer/ui-lab.html
src/renderer/src/ui-lab/
  main.tsx
  InterfaceLab.tsx
  InterfaceLab.test.tsx
  fixture.ts
  LabCanvas.tsx
  LabCanvas.test.tsx
  LabDice.tsx
  LabDice.test.tsx
  canvas-verification.ts
  ui-lab.css
```

- `main.tsx` monta una raiz React propia; no deriva de `App` ni usa el selector `?view=player`.
- `InterfaceLab` coordina solamente estado visual y datos fixture. Separar componentes internos si el tamano lo justifica, manteniendolos en esta carpeta.
- `fixture.ts` crea una escena en memoria con IDs estables y tipos de dominio existentes. Crear una copia fresca por montaje; no mutar constantes compartidas ni singletons.
- `LabCanvas` encapsula el ciclo de vida del Pixi existente y recibe datos/callbacks locales. Utilizar su API publica y constructores existentes de dominio; no editar su implementacion ni introducir algoritmos de efectos.
- `LabDice` monta el panel existente sobre un controlador local, con una instancia de `DiceRollSession` en memoria. Reutiliza simulacion de navegador, overlay y audio existentes. No importa `useDiceSession` ni usa transporte Electron; solo los envelopes DM llegan al viewport.
- `ui-lab.css` usa una raiz y nombres propios del lab y reutiliza `components/dice/dice.css` para el panel compartido. No importar `styles.css` ni modificar las hojas de produccion; revisar el alcance de los estilos compartidos dentro de la pagina del lab.
- Resolver `cloister-map.png` como asset local con Vite. No introducir protocolo `map-asset:`, selector nativo, rutas absolutas del equipo ni descarga remota.
- Sin lectura/escritura de localStorage, sessionStorage, IndexedDB o SQLite ni acceso arbitrario al filesystem. Solo se leen imagenes elegidas explicitamente mediante el selector de archivos del navegador, con FileReader. Sin hooks de autosave, bibliotecas remotas ni servicios de dados/Player View conectados a Electron.
- Usar React, TypeScript, Pixi y Lucide ya disponibles. No agregar dependencias ni algoritmos de efectos o reglas de juego.
- El lab solo necesita servirse en desarrollo; no agregarlo al empaquetado ni a la navegacion de produccion.

### Compatibilidad Pixi sin habilitar eval

La entrada local `main.tsx` incluye `import "pixi.js/unsafe-eval"`. La implementacion distribuida por Pixi instala polyfills de sincronizacion de uniforms/shaders/UBO y particulas con funciones precompiladas, evitando la generacion dinamica que exige eval. Es el mecanismo propio de la biblioteca, no un parche nuevo al core del proyecto ni una relajacion de CSP.

El HTML del lab conserva `script-src 'self'`, sin `'unsafe-eval'`. Los cambios de runtime del modulo de compatibilidad se aplican al contexto de esta pagina; no importar el lab desde produccion. Verificar la inicializacion real del canvas bajo esta politica en el navegador. La lectura del modulo local de Pixi confirma la finalidad del import, pero no sustituye ese smoke.

### Decisiones comprobadas en navegador

- Imagenes locales: convertir el File seleccionado a data URL con MIME y decodificarlo antes de modificar el estado. El parser actual de Pixi reconoce MIME o extension; un blob URL sin extension fallo en la primera prueba. No modificar el loader compartido para resolver una necesidad del lab.
- Preview Player: mantener un solo `LabCanvas`. Alternar `player`, snapshot filtrado y fullscreen por CSS; un dialog nativo transparente contiene los controles de salida y el foco. Dos instancias simultaneas dentro de la misma pagina produjeron un error de geometria al liberar recursos; la solucion evita duplicarlas. No representa dos ventanas Electron ni modifica su arquitectura.
- La sesion de dados permanece montada al plegar paneles/cambiar tabs. Su overlay se porta al canvas del DM y se oculta en preview Player.
- Diagnostico opcional: `?verify=1` habilita `canvas-verification.ts`. Lee muestras acotadas del framebuffer y publica resultados en atributos `data-verify-*`; no modifica GL, shaders o render. En dados observa el atributo `data-motion` que el renderer ya actualiza despues de dibujar, antes del descarte del buffer transparente. Desconecta observer/RAF al completar, desmontar o vencer el limite de tres segundos. La URL normal no hace readback.

## 4. Estado e interacciones

Estado minimo: mapa fixture activo, consulta por tab, tabs Escena/Mapa y Propiedades/Dados, paneles abiertos, herramienta y opciones contextuales, objeto seleccionado, propiedades de ejemplo y camara local. Conservar filtros y paneles al cambiar seleccion; limpiar IDs invalidos al cambiar de mapa.

Coordinar seleccion por ID entre explorador, canvas e inspector. Los campos demostrados deben reflejar cambios reales en el fixture y, cuando corresponda, en el preview. Evitar reencuadrar al escribir en una propiedad o abrir un panel; encuadrar inicialmente y ante una accion explicita.

Separar camara local, escala del mapa y calibracion de grilla. Limitar zoom a valores finitos mediante las APIs existentes.

El rail tiene botones individuales; las opciones de la herramienta activa aparecen en una barra contextual horizontal dentro del canvas. No usar una columna de familias/subherramientas. Cerrar menus/dialogos con Escape; los paneles tienen un boton de cierre. Ignorar atajos de canvas durante edicion de inputs. Cancelar borradores al cambiar a una herramienta incompatible. Mantener navegacion de tabs por flechas, Home y End.

Breakpoints de `ui-lab.css`: layout normal desde 1100 px; paneles overlay por debajo de 1100 px (`max-width: 1099px`); modo compacto hasta 700 px inclusive. El ajuste de densidad a 1270 px no activa overlays. En modo overlay, alternar los paneles para mantener accesible el canvas y la camara inferior.

## 5. Matriz de demostracion

| Area | Subconjunto a conectar localmente | Fuera del demo o condicionado |
| --- | --- | --- |
| Contexto de escena | App/escena/mapa, agregar/actualizar imagenes locales en memoria, seleccionar, renombrar y ordenar mapas. | Guardar/cargar `.ttrpgscene`, recientes y recuperacion. |
| Rail | Seleccionar herramientas individuales y sus opciones en la barra horizontal del canvas; conectar comportamiento existente mediante `LabCanvas`. | No agregar algoritmos ni asumir que todas las herramientas estan conectadas o verificadas. |
| Explorador | Tabs, busqueda, grupos, seleccion/localizacion, notas simples editables en memoria. | Bibliotecas persistentes y editores completos de entidades/anotaciones. |
| Inspector | Campos de ejemplos seleccionados, como nombre, color y visibilidad, sincronizados con el fixture. | Todos los campos de todas las entidades; mantener su destino en el inventario de la spec. |
| Dados | Composicion, tiradas/simulacion, overlay persistente, historial en memoria y sonido locales de DM, con los componentes existentes. | Ninguna publicacion a jugadores, al preview Player o fuera del demo. Toggles publica/resultado y tamano Player solo afectan estado local. Sin persistencia, parser nuevo ni `useDiceSession`. |
| Camara | Pan, zoom +/-, porcentaje y encuadre/recentrado locales. | Ventana de jugador, calibracion fisica y sincronizacion real; cualquier indicador fixture debe ser identificable. |
| Ambiente/efectos | Hora del dia total, oscuridad/darkvision, grilla, norte, revelado de niebla; dibujo/propiedades de fuego y relampago; medida, areas, luces y pins. | Agua deshabilitada, edicion completa de mascaras de horas, efectos avanzados y paridad completa con Electron. |
| Combate/contadores | Ubicacion conceptual reservada; fixtures solo si ayudan a revisar densidad. | Turnero y gestion/publicacion completos. No declarar estas funciones operativas por mostrar sus controles. |

Al terminar, actualizar la seccion de resultados con la lista efectiva de interacciones demostradas, simuladas y pendientes. No marcar toda la matriz de capacidades de produccion como implementada.

`LabCanvas` reutiliza callbacks y constructores existentes para manipulacion de objetos y herramientas, ademas de combinaciones que siguen como preview. La lista de capacidades verificadas debe corresponder a los gestos probados durante QA; la presencia de un callback no acredita por si sola un flujo funcional completo.

## 6. Inventario aplicado al diseno

El inventario completo y sus referencias estan en la spec. Puntos a conservar durante el armado:

- El layout actual reserva 296 px a la izquierda y 324 px a la derecha (`src/renderer/src/styles.css:4995`). Usarlo como referencia de densidad, no como dependencia CSS.
- `DmAsidePanel` distingue escena (mapas, entidades, notas) de mapa (fondo, objetos, anotaciones). Mantener esa frontera mediante tabs horizontales y mover ajustes visuales al inspector.
- La sidebar derecha de `App` mezcla propiedades de seleccion, ajustes globales y creacion. Separar rail de creacion, explorador de contenido e inspector contextual sin perder el destino futuro de cada accion.
- Inventario para futura integracion: el menu contextual (`src/renderer/src/App.tsx:4905`) contiene texto DM, mediciones/formas, luces, oscuridad magica, clonacion de luz y bloqueo de zoom. El bloqueo de zoom no esta implementado en el lab y no forma parte de su alcance verificado.
- No fusionar visibilidad de token, visibilidad de entidad para jugadores, publicacion de dados y preview DM de niebla: representan controles diferentes.
- La camara de jugador tiene estado y comandos propios; el zoom inferior del demo no debe sugerir que esta controlando una ventana Electron.
- Dados es un panel completo (`src/renderer/src/components/dice/DicePanel.tsx:40`); reutilizarlo mediante `LabDice` con sesion en memoria. Sus controles publicos no significan conectividad de jugador: el adaptador descarta esa salida y solo presenta DM.
- Conservar un destino para combate, contadores, estado/errores y anotaciones bloqueadas. El inventario es un requisito de futura integracion, no una promesa de paridad en este experimento.

## 7. Secuencia de implementacion

1. Mantener los limites de archivos y la entrada independiente del lab sobre la base 2.8.1.
2. Crear el HTML y montaje React aislados, CSS local y fixtures; cargar el mapa generado mediante Vite.
3. Construir la barra superior de carbon neutro, rail izquierdo, explorador Escena/Mapa, inspector Propiedades/Dados y barra inferior persistente.
4. Conectar tabs, colapso, busqueda, mapa activo, botones individuales de herramientas, opciones horizontales contextuales y seleccion compartida.
5. Montar Pixi existente con un adaptador local; conectar camara y propiedades del subconjunto acordado. Destruir instancia, listeners, observers y recursos propios al desmontar, sin destruir recursos compartidos ajenos.
6. Resolver estados vacios, acciones pendientes, nombres largos, errores de carga local, accesibilidad y responsive. No agregar funcionalidades de referencia como macros o log por mera semejanza visual.
7. Agregar pruebas focalizadas de aislamiento e interacciones; verificar preview y controles en navegador servido por Vite.
8. Registrar resultados reales y limitaciones en la seccion de verificacion, con URL y evidencia. No integrar, publicar ni versionar produccion.

## 8. Verificacion prevista

### Aislamiento

- Montar sin `window.ttrpg`; comprobar que el lab no requiere preload ni APIs Electron.
- En prueba de montaje/interaccion, instalar trampas o spies para preload y storage; recorrer tabs, busqueda, seleccion y edicion. Cualquier acceso privilegiado o persistente falla la prueba.
- Revisar el grafo de imports de la entrada: no debe alcanzar `App`, `PlayerApp`, `main.tsx` de produccion ni hooks/servicios de persistencia o transporte Electron. `DiceRollSession`, simulacion de navegador, audio y render existentes pueden reutilizarse localmente sin modificar esos archivos.
- Comprobar que HTML/arranque de produccion no importan el lab. Revisar el diff contra la base para confirmar fronteras, version y configuracion intactas.
- Inspeccionar solicitudes del navegador: permitir assets locales y trafico del servidor de desarrollo/HMR; ninguna API o recurso remoto de terceros.
- Recargar despues de editar fixtures y comprobar que vuelven a su estado inicial. Recargar no prueba por si solo ausencia de storage; complementar con las trampas anteriores.
- Verificar dados con visibilidad abierta y alternar publicacion/resultado: solo puede existir la presentacion local DM, sin overlay de dados en Player, IPC, nuevas ventanas ni solicitudes externas. Comprobar el reset del historial al recargar. La limitacion se explica en la spec; no agregar un parrafo explicativo a la UI.
- Comprobar que la CSP sigue sin `'unsafe-eval'` y que el import `pixi.js/unsafe-eval` se limita al arranque del lab. Validar canvas real y ausencia de errores CSP; no resolver un fallo relajando la politica.

### Comportamiento y accesibilidad

- Pruebas React focalizadas para busqueda sin resultados, cambio de mapa, seleccion coordinada, campos locales y colapso/reapertura sin perder estado valido.
- Verificar tabulacion, tabs con flechas/Home/End, nombres accesibles, tooltips en foco, Escape y retorno de foco. Confirmar que paneles ocultos no reciben foco y que inputs no disparan comandos del mapa.
- Probar acciones no implementadas: no producen errores ni mensajes de exito ficticio, no guardan ni abren ventanas.
- Usar un mock del preview en pruebas de estado React si hace falta; ese mock no reemplaza la comprobacion visual del Pixi real.

### Preview y responsive

- Capturas en 1440x900 y 1280x800 (normal), 1024x768 y 768x1024 (overlay), 390x844 y 360x740 (compacto). Probar tambien los limites de ancho 1100/1099 px y 701/700 px.
- Comprobar pixeles no vacios del canvas, carga del mapa, encuadre inicial, pan/zoom, resize y ausencia de overlays que intercepten el canvas indebidamente.
- Abrir/cerrar paneles y menus; probar nombres largos, propiedades extensas y orientacion. En overlay/compacto, un solo drawer abierto y controles inferiores siempre alcanzables.
- Verificar consola, fallo recuperable del asset y desmontaje/remontaje sin canvas duplicado, listeners extra o recursos propios abandonados.

### No regresion y comandos

- URL de desarrollo: `http://127.0.0.1:5182/ui-lab.html`. Registrar el comando de servidor efectivo junto con la evidencia de QA. La entrada original se verifica por separado.
- Smoke de produccion: la entrada original mantiene layout/controles y no importa CSS o fixtures del lab. El navegador no acredita flujos nativos Electron.
- Ejecutar las pruebas focalizadas del lab con `pnpm test src/renderer/src/ui-lab`, y los checks existentes `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` segun el cierre de implementacion.
- Revisar whitespace y diff de los archivos autorizados. No ejecutar `dist:mac` ni `scripts/build-dmg.sh`.
- Registrar fallos previos o limitaciones concretas; no modificar areas excluidas para resolverlos dentro de este lab ni marcar checks no ejecutados como aprobados.

## 9. Resultados de verificacion

QA realizado el 2026-10-28 en macOS, navegador integrado Chromium y pnpm/Node. Lab listo para revision y no integrado en produccion.

| Comprobacion | Resultado / evidencia |
| --- | --- |
| Servidor y URL | `pnpm exec vite src/renderer --host 127.0.0.1 --port 5182 --strictPort`. Proceso Node separado, limitado a loopback. URL normal sin diagnostico: `http://127.0.0.1:5182/ui-lab.html`. |
| Interacciones en navegador | Tabs/paneles, zoom, noche/dia, dibujo de linea de relampago con regreso a Seleccionar, inspector contextual, orientacion de norte y preview Player; agregar imagen, renombrar, cambiar mapa, actualizar imagen conservando 5 objetos y drag/drop de orden. |
| Alcance excluido | Agua, agregar entidades y conexiones deshabilitados. Sin persistencia, librerias reales, combate/contadores, intercambio `.ttrpgscene` ni comunicacion entre ventanas. |
| Aislamiento | Tests con trampas para storage y preload; codigo nuevo sin transporte Electron, persistencia ni peticiones a APIs externas. Recursos visuales propios/locales. No se hizo captura completa de trafico de red. |
| Dados DM | Lanzamientos reales 2d6 y d6+d8, resultados e historial correctos; dados permanecen al cambiar tab y se retiran con X. Sesion local, sin publicar a Player; test verifica ocultacion de overlay privado al alternar preview. |
| CSP/Pixi | Render real bajo `script-src 'self'`, sin habilitar eval. Consola final sin warnings/errores nuevos durante agregar/cambiar mapas, zoom y abrir/cerrar preview repetidamente. |
| Pruebas automatizadas | `pnpm test`: 902 tests aprobados en 100 archivos, incluyendo 43 del lab. `pnpm typecheck` y `pnpm lint` correctos. Pruebas React/Pixi con mocks complementadas por las comprobaciones de navegador de esta tabla. |
| Build | `pnpm build` correcto; bundle original no contiene `ui-lab`, `lab-app` ni `cloister-map`. Build separado del HTML del lab con Vite correcto en `/tmp/ttrpg-interface-lab-build`. Warnings de `use client` en dependencias y tamano de chunk del lab; sin fallos de compilacion. |
| Responsive | Capturas inspeccionadas a 1280x720, 1440x900, 1024x768 y 390x844; layout final tambien visible a 1612x955. Sin overflow horizontal de pagina en movil. Paneles alternos y franja inferior de camara visible. Otras medidas de la matriz prevista no se probaron individualmente. |
| Pixeles Pixi | `?verify=1`: mapas no vacios a 1440x900, 1024x768 y 390x844. Buffers 859x818, 973x686 y 339x770; 704/704/576 pixeles muestreados RGB no negros, respectivamente. |
| Pixeles y movimiento Three | Dados en escritorio: buffer 811x523, seis muestras, 27 pixeles RGB no negros y checksums cambiantes. Movil: 291x475, seis muestras, 9 pixeles RGB no negros y checksums cambiantes. Capturas muestran piezas y resultados sin superponer controles. |
| Ciclo de vida | Preview Player usa exactamente un canvas y vuelve al DM por boton/Escape; tests de callbacks frescos y capas estables durante cambios de camara. Instancia y recursos se liberan al desmontar el lab. |
| Produccion | Ningun archivo existente modificado; entradas/domain/render/main/preload y version 2.8.1 intactos. Build y suite existentes pasan. No se ejecuto smoke nativo Electron ni DMG; tampoco commit, push o merge. |

La aceptacion del demo no autoriza sustituir la UI de produccion, cambiar version, hacer commit/push/merge ni generar release. La integracion futura necesitara conservar el inventario funcional y verificar los flujos nativos que este lab no conecta.
