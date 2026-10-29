# Spec 38 - Laboratorio de interfaz VTT

## Continuacion aprobada

El usuario aprobo la propuesta el 2026-10-28. Laboratorio cerrado como referencia de la integracion real, tambien aceptada para 3.0.0 y especificada en `specs/39-vtt-interface/spec.md` y su plan. Las restricciones de aislamiento descritas abajo corresponden al laboratorio original, no a la integracion posterior. El lab reutiliza ahora la brujula compartida corregida: norte arriba a cero, aguja norte diferenciada y N legible. Su entrada y fixtures no se empaquetan en produccion.

## Estado y objetivo

Laboratorio de UI independiente, con base en la version 2.8.1 y la rama `feature/vtt-interface-lab`. Fecha: 2026-10-28. Implementado, revisado y aceptado. Su diseño se integra en produccion mediante spec 39, sin importar sus fixtures ni adaptadores simulados. El plan conserva las pruebas y limites de esta propuesta.

Explorar una interfaz compacta para preparar y dirigir sesiones sobre el mapa: barra superior de contexto, herramientas verticales, explorador e inspector colapsables y controles de camara persistentes. Evaluar jerarquia, descubrimiento de acciones, espacio de mapa y accesibilidad mediante datos locales de demostracion.

La entrada es `src/renderer/ui-lab.html`, con codigo propio en `src/renderer/src/ui-lab/`. URL local elegida: [Interface Lab](http://127.0.0.1:5182/ui-lab.html). La ruta sigue siendo `/ui-lab.html`. La aplicacion de produccion conserva su interfaz y sus flujos actuales.

## Referencias observadas

Referencias inspeccionadas por Codex mediante computer-use en las sesiones abiertas de Chrome del usuario. Son observaciones de organizacion, no una especificacion completa de esos productos.

| Referencia | Hallazgo observado | Aplicacion al lab |
| --- | --- | --- |
| D&D Beyond Maps, sesion Mushroom Cave | Rail de iconos agrupados en el extremo izquierdo. | Rail compacto con botones individuales y opciones contextuales. |
| D&D Beyond Maps | Selector de mapa compacto arriba a la izquierda, con opciones radio. | Escena y mapa activos visibles; seleccion de mapa con estado unico. |
| D&D Beyond Maps | Drawer de tokens con titulo, tabs Monsters/Players/Companions y busqueda. | Explorador con contexto, categorias y busqueda local. |
| D&D Beyond Maps | Display Map, zoom 100%, +/- y accesos DM prep/dados/log en la zona inferior derecha. | Controles de camara persistentes y acceso discreto a dados; no implica agregar un log o modo prep completo. |
| Foundry, sesion pausada | Rail izquierdo de dos columnas para herramientas y subherramientas; navegacion de escenas arriba a la izquierda. | Herramienta activa con opciones contextuales y contexto de escena/mapa estable; el lab usa una barra horizontal dentro del canvas. |
| Foundry | Tabs de iconos colapsables a la derecha; lista de escenas con busqueda/acciones; macros abajo. | Inspector colapsable y listas orientadas a acciones. La barra de macros no forma parte del alcance. |
| Foundry | Seleccionar iluminacion cambia las subherramientas sin mostrar siempre todas las opciones. | Revelar opciones de la herramienta activa y propiedades de la seleccion. |

Codex restauro las interfaces de referencia sin editar las escenas. No copiar branding, logos, textos propios, capturas ni assets de esas interfaces. El lab mantiene la identidad de TTRPG Effects.

## Alcance y aislamiento

- Crear una entrada React independiente; no agregar una ruta al `App` existente ni reemplazar su montaje.
- Mantener estado de fixture solo en memoria: mapa activo, seleccion, herramientas, paneles, busqueda, propiedades de ejemplo y camara local.
- Reutilizar las APIs existentes de Pixi para el preview, mediante un adaptador local al lab. No crear algoritmos de efectos, fisica, medicion o dados.
- Conectar herramientas actualmente existentes mediante esos adaptadores; registrar la conexion y verificacion de cada una sin afirmar paridad completa.
- Usar el mapa original generado en `assets/lab/cloister-map.png`, con fuente/prompt documentados en el README generado por Codex junto al asset.
- No usar storage, autosave, SQLite, filesystem privilegiado, preload, IPC, `window.ttrpg` ni APIs remotas. Recargar el lab restablece los fixtures.
- No importar el arranque de produccion ni hooks que activen guardado, bibliotecas persistentes o comunicacion con Player View. Se permite reutilizar componentes y servicios existentes con una instancia local en memoria, como `DiceRollSession`, sin transporte Electron.
- No modificar `App.tsx`, `PlayerApp.tsx`, `main.tsx`, estilos globales de produccion, componentes compartidos, `src/render/`, `src/domain/`, efectos, application, main, preload, infraestructura o almacenamiento.
- No cambiar formatos `.ttrpgscene`, migraciones, dependencias, configuracion de empaquetado, version ni changelog.
- Base 2.8.1 sin release, bump, DMG, commit, push o merge. No cambiar de rama.

### Compatibilidad Pixi y CSP

`src/renderer/src/ui-lab/main.tsx` importa `pixi.js/unsafe-eval`, el modulo de compatibilidad distribuido por Pixi. Pese a su nombre, instala el fallback de funciones precompiladas de la biblioteca para evitar la generacion mediante eval; no autoriza eval en la pagina. `src/renderer/ui-lab.html` mantiene `script-src 'self'`, sin `'unsafe-eval'`. Este import pertenece a la entrada del lab y no modifica el core de Pixi, archivos compartidos ni la entrada de produccion. La carga real del canvas bajo esa CSP requiere verificacion en navegador.

## Composicion de interfaz

### Barra superior

Barra compacta de carbon neutro, con identidad de la app, escena y mapa activos y acciones de escena. El mapa ocupa la superficie principal; no hay hero ni pagina introductoria. Usar iconos Lucide, separadores y menus de overflow para acciones secundarias. Los nombres largos deben truncarse de forma accesible o ajustarse sin desplazar los controles esenciales.

Guardar/cargar/importar y abrir Player View conservan un destino conceptual, pero no ejecutan integracion nativa en el lab. Las acciones no implementadas deben estar deshabilitadas con motivo accesible; no mostrar confirmaciones falsas de guardado, proyeccion o persistencia.

### Rail de herramientas

Rail vertical izquierdo con botones individuales de seleccion, pan, medicion, areas, luz, niebla, fuego, relampago, agua, anotaciones y apuntador. La herramienta activa muestra sus opciones en una barra contextual horizontal dentro del canvas; no hay una segunda columna de familias/subherramientas. Cambiar de herramienta actualiza el estado seleccionado y cancela borradores locales incompatibles.

El lab puede demostrar seleccion de herramientas sin implementar cada gesto de dibujo. Las herramientas que solo muestran opciones deben distinguirse de las que producen cambios en el preview mediante estado deshabilitado o tooltip; no aparentar una operacion completa.

### Explorador izquierdo

Panel colapsable junto al rail, con tabs horizontales `Escena` y `Mapa`.

- `Escena`: mapas, notas y entidades. El lab muestra Entidades vacio; las bibliotecas de monstruos, NPCs y personajes conservan su destino para una futura integracion. Listas compactas, busqueda local y seleccion de filas.
- `Mapa`: anotaciones y objetos del mapa activo, agrupados por tipo, con busqueda, seleccion y localizacion de los fixtures implementados.
- Mantener seleccion compartida con el inspector. Colapsar el panel no borra filtros ni seleccion durante la sesion local.
- Cambiar de mapa fixture limpia selecciones incompatibles y mantiene coherentes titulo, lista y preview.

### Inspector derecho

Panel colapsable con tabs horizontales `Propiedades` y `Dados`. Propiedades refleja la seleccion actual; sin seleccion, presenta ajustes del mapa o ambiente. Mostrar solo campos aplicables al tipo seleccionado.

Dados es exclusivamente local al DM. El adaptador `LabDice` reutiliza `DicePanel`, `DiceRollSession` y la simulacion/overlay/audio existentes para tiradas locales, sin crear un algoritmo ni usar `useDiceSession` o preload. El historial y las opciones viven en memoria; no se persisten.

El panel compartido puede mostrar `Abierta`, `Mostrar resultado a jugadores`, controles de publicacion y tamano de Player. En el lab esos valores solo cambian el estado de la sesion local: no publican fuera del demo, no entregan dados a la previsualizacion de jugador y no abren ni comunican con otra ventana. Solo el envelope de DM llega al overlay local. El historial contiene tiradas locales reales. La integracion Electron permanece fuera de alcance.

### Camara inferior

Controles persistentes de camara/zoom: porcentaje actual, acercar, alejar y encuadrar/recentrar. Mantenerlos accesibles con ambos paneles abiertos o cerrados. Separar zoom de navegacion de escala del mapa y calibracion de grilla.

El preview representa una camara local. Vista del jugador alterna el mismo canvas a presentacion Player, a pantalla completa, ocultando controles DM, anotaciones privadas y dados locales. Conserva la orientacion cardinal existente. Es una previsualizacion modal de solo lectura, no una segunda ventana ni una sincronizacion remota. Cerrar o pulsar Escape vuelve al DM sin recrear Pixi.

## Subconjunto demostrable

El lab incluye render del mapa generado, pan/zoom/encuadre locales, tabs y colapso de paneles, busqueda, seleccion coordinada entre lista/preview/inspector y edicion de propiedades. Permite agregar imagenes PNG/JPEG/WebP elegidas por el usuario, cambiar de mapa, ordenar con drag/drop y actualizar su imagen sin quitar los objetos locales. Las imagenes y notas quedan en memoria, sin abrir ni modificar archivos `.ttrpgscene`.

Fuego y relampago reutilizan sus herramientas de dibujo e inspectores existentes; medicion, circulo/cono de medida y luz se colocan con los valores iniciales del dominio y se ajustan con sus manivelas. Anotaciones permite crear pins y pintar areas informativas; la niebla usa el pincel y revelado existentes. La barra contextual distingue estas acciones de las propiedades del mapa. Agua, bibliotecas de entidades y conexiones entre mapas quedan deshabilitadas en este lab. No se implementan combate, contadores, edicion completa de anotaciones ni persistencia nativa.

El rail selecciona herramientas individuales y la barra horizontal del canvas ofrece sus opciones contextuales mediante el adaptador local. El panel Dados dispone de un adaptador de sesion DM en memoria, cuya verificacion se registra aparte. Los controles adicionales se documentan como demostrados, simulados o pendientes en el plan. La existencia de codigo o pruebas no acredita que hayan pasado: este subconjunto no equivale a conectar todas las capacidades actuales de Electron.

## Inventario y destino de capacidades

Referencias de lineas al momento del inventario, sobre la base 2.8.1. Esta matriz preserva requisitos para una futura integracion; no es una lista de funciones ya conectadas en el lab.

| Capacidad actual y fuente | Destino propuesto / detalles que conservar |
| --- | --- |
| Barra superior, `src/renderer/src/App.tsx:3272` | Contexto app/escena/mapa y acciones nueva/guardar/cargar, apuntador, batalla y contadores. |
| Camara de jugador, `src/renderer/src/App.tsx:3298` | Grupo de proyeccion/camara: abrir ventana, estado de sincronizacion, zoom +/-, recentrar e indicador de escala; separado de la camara local. |
| Estado de escena, `src/renderer/src/App.tsx:3408` | Estado compacto y feedback recuperable: mapa/archivo activos, seleccion, avisos y errores; no perder acceso al detalle al compactar. |
| Escena, `src/renderer/src/components/aside/DmAsidePanel.tsx:191` | Explorador Escena: agregar/importar/seleccionar/renombrar/ordenar/reemplazar imagen/eliminar mapas; bibliotecas y detalle/edicion/eliminacion de entidades; visibilidad de monstruos/NPCs; notas con jerarquia. |
| Mapa, `src/renderer/src/components/aside/DmAsidePanel.tsx:262` | Explorador Mapa: busqueda y select/locate/delete de objetos; anotaciones con creacion, edicion, bloqueo, navegacion, resaltado de areas y estado de conexiones. Fondo/reset pasa a ajustes del inspector. |
| Seleccion, `src/renderer/src/App.tsx:3615` | Inspector contextual: anotaciones editar/bloquear/resaltar/desligar; luz puntual/conica visible/color/radio o largo/intensidad/opacidad/direccion; luz dinamica agrega apertura, radios fuerte/tenue, variacion y velocidad. |
| Seleccion, `src/renderer/src/App.tsx:3896` | Oscuridad magica visible/radio/opacidad; agua visible/ancho de rio/orientaciones/hue/saturacion/opacidad; color de seleccion del token; texto/fuente/color/opacidad/sombra; medidas/emoji/radio/angulo/direccion/dimensiones de formas. |
| Fuego y relampago, `src/renderer/src/components/FireProperties.tsx:23` y `src/renderer/src/components/LightningProperties.tsx:21` | Inspector por tipo: geometria, direccion, fuego abierto/pincel/escala/luz emitida/color/alcance; relampago intensidad/velocidad/chispas/guia; visibilidad/opacidad. Reutilizar comportamiento existente al integrar. |
| Grilla y figuras, `src/renderer/src/App.tsx:4177` | Ajustes del mapa: activar/ajustar grilla, posicion/escala/reset del mapa, norte, opacidad, cuadrada/hexagonal, grosor/celda/unidad/preset; snap, regla diagonal y distancia por casilla. |
| Herramientas y tokens, `src/renderer/src/App.tsx:4427` | Rail y explorador: apuntador/tamano, fuego linea/cono/circulo/pintura, agua, relampago; tokens con imagen/nombre/tamano, seleccion y visibilidad; visibilidad de anotaciones. No confundir visibilidad de token con publicacion de entidad. |
| Ambiente, `src/renderer/src/App.tsx:4541` | Inspector de ambiente y subherramientas: dia/atardecer/noche, cobertura total/pintada, topologia/accion/tamano/reset del pincel; oscuridad/opacidad/darkvision; niebla, preview DM, revelado/radio, opacidad/color/reset. |
| Menu contextual, `src/renderer/src/App.tsx:4905` | Para futura integracion: bloqueo de zoom (no implementado en el lab), clonar luz dinamica, texto DM, pins/areas/links, linea/path/circulo/cono/rectangulo, tokens, luz puntual/conica/dinamica y oscuridad magica. Conservar acceso contextual y evaluar su acceso desde el rail. |
| Dados, `src/renderer/src/components/dice/DicePanel.tsx:40` | Tab Dados: oculta/abierta, publicar resultado, color/material/fuerza, tamanos DM/jugador, sonido; d20/modificador/ventaja/desventaja, pools manuales/formula, tipos de dano/grupos/modificadores, lanzar/limpiar/historial/paginacion. |
| Overlays, `src/renderer/src/App.tsx:3578` | Espacio reservado para dados, oscuridad y brujula; combate con siguiente turno/editar/finalizar/derrotado; contadores con +/- y publicacion/gestion. No ocultarlos por abrir un panel. |
| Teclado, `src/renderer/src/App.tsx:1756` | Preservar en futura integracion Space/pan, Delete/Backspace, Escape, Enter y deshacer ultimo punto de path/agua, Cmd/Ctrl+F/G, respetando foco en inputs. |

## Responsive y accesibilidad

- Normal, ancho >=1100 px: rail, explorador, canvas flexible e inspector en el layout; ambos paneles pueden coexistir. Hasta 1270 px se reduce la densidad de paneles y barra superior sin pasar a overlays.
- Overlay, ancho <1100 px: explorador e inspector se superponen al canvas y se alternan para conservar espacio. Mantener controles de apertura/cierre y scroll interno accesibles.
- Compacto, ancho <=700 px: conserva los paneles overlay y reduce barra superior, controles contextuales y textos secundarios; un solo drawer a la vez y camara inferior dentro del viewport. No exigir hover para descubrir acciones.
- Probar nombres largos, altura reducida y resize con paneles abiertos. No permitir overflow horizontal de pagina, texto superpuesto ni controles fuera de pantalla. Dar scroll interno a listas y propiedades.
- Iconos con nombres accesibles y tooltips en hover/foco; estados activo, seleccionado, expandido y deshabilitado programaticos, no solo por color.
- Tabs con roles y navegacion por flechas/Home/End; foco visible y orden consistente. Un control oculto o panel colapsado no participa en tabulacion.
- Escape cierra menus/dialogos o cancela la herramienta local. Los dialogs nativos contienen el foco y lo devuelven al disparador; los paneles se cierran con su boton y no atrapan el foco. Los drawers dejan libre una franja inferior de 58 px para la camara.
- Atajos y Delete no interfieren con inputs, edicion de texto ni composicion. Ofrecer alternativa por boton para acciones demostradas que dependan del mapa.
- Respetar contraste y movimiento reducido. Mantener dimensiones estables de rail, botones y barra inferior.

## Aceptacion y limites

1. `/ui-lab.html` monta su propia raiz React sin cargar `App`, `PlayerApp` ni efectos de arranque de produccion.
2. El mapa original se ve completo con encuadre inicial util y responde a controles locales sin nuevos algoritmos de efectos.
3. El subconjunto declarado funciona y mantiene seleccion, listas y propiedades coherentes en los tres rangos de pantalla.
4. No hay escrituras de storage, llamadas preload/IPC, acceso a datos reales ni solicitudes a APIs remotas; solo recursos locales del lab y del servidor de desarrollo.
5. El inventario conserva el destino de las capacidades existentes, aunque el demo no las conecte todas. Acciones pendientes no reportan exito ficticio.
6. Las entradas y archivos de produccion permanecen intactos; smoke y pruebas de aislamiento se registran sin afirmar cobertura nativa que no se haya ejecutado.
7. No se publica ni empaqueta una nueva version. Cualquier integracion futura requiere una tarea separada y validacion funcional completa de los flujos Electron.
8. Las opciones publicas de dados permanecen dentro del demo DM y el preview Pixi funciona con la CSP del lab sin habilitar eval. Registrar evidencia antes de considerar estos criterios verificados.
