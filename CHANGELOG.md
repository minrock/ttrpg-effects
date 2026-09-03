# Changelog

Todas las notas de version de TTRPG Effects se documentan en este archivo.

El proyecto sigue versionado semantico:

- **Patch**: bugfixes y correcciones compatibles.
- **Minor**: features/specs completadas o cambios funcionales compatibles.
- **Major**: cambios incompatibles con `.ttrpgscene` o migraciones obligatorias del formato de escena.

La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.

## [1.9.0] - 2026-09-02

### Added

- Arbol lateral de efectos y areas con busqueda, seleccion, centrado y borrado individual.
- Grilla siempre extendida al viewport en DM y jugador, sin opcion para limitarla al mapa y sin alterar calibracion o escala de imagen.
- Selector de lineas delgadas (default) o gruesas (triple grosor), persistido en la escena y compartido con jugador; cambiarlo solo reconstruye la grilla.

### Fixed

- Controles e hit testing de efectos legibles durante zoom-out, como las herramientas de area.
- Manivelas separadas para radio de fuego y luz, incluso con radios coincidentes.

### Performance

- Grilla visible con overscan reutilizable, presupuesto de lineas y sin ampliar las texturas de niebla/oscuridad.

### Notes

- Funcionalidad aceptada para cierre en main. Compatibilidad con escenas V1 conservada; archivos sin grosor de grilla cargan con lineas delgadas.
- Verificacion: 326 tests, typecheck y lint correctos; revision visual del arbol, controles y grosores en navegador. No se repitio un smoke nativo completo de dialogos y dos ventanas Electron en este cierre.
- Se conservan los GIF de fuego antiguos sin referencias desde el render; sigue vigente la nota de uso personal/licencia del asset Fiya2 de 1.8.0.

## [1.8.0] - 2026-09-02

### Changed

- Fuego animado con llamas completas, bordes irregulares, mayor opacidad y variacion estable de posicion, tamano y fotograma.
- Atlas compartido, reloj unico y presupuesto de sprites para limitar memoria y reconstrucciones de efectos.
- Los GIF anteriores permanecen conservados sin referencias desde el renderer.

### Fixed

- El cache de efectos no reutiliza contenedores destruidos al cargar un mapa del jugador.

### Notes

- GIF Fiya2 solicitado para uso personal; su licencia de redistribucion no esta confirmada. Ver `assets/effects/fiya2-preview.md` antes de distribuir builds publicos.

## [1.7.6] - 2026-09-01

### Fixed

- Los labels de distancia y tamano de las herramientas de area mantienen una escala legible durante el zoom-out.
- Las manivelas de mediciones, caminos, circulos, conos y rectangulos conservan un tamano visible y areas de interaccion proporcionales al zoom.
- El overlay editorial solo se reconstruye al cambiar la escala de la camara, evitando trabajo adicional durante el paneo.

## [1.7.5] - 2026-08-29

### Added

- Editor enriquecido unificado para notas generales, habitaciones, areas informativas, NPCs y personajes jugadores.
- Tablas editables y listas de verificacion persistidas en Markdown, incluidos checkboxes dentro de celdas.
- Vista previa compartida con checkboxes interactivos y accion para reiniciar su estado.

### Changed

- Los callouts reutilizables quedan disponibles en todos los espacios con contenido enriquecido.
- La barra de herramientas adapta la insercion de checkboxes al contexto de listas o tablas.

### Fixed

- Los checkboxes y sus etiquetas permanecen alineados en una misma fila.
- Las tablas reparan contenido legado con checkboxes que habia quedado fragmentado en multiples lineas.

## [1.7.4] - 2026-08-29

### Added

- Bloques `callout` reutilizables en el editor enriquecido de habitaciones, con contenido Markdown, emoji opcional y color principal configurable.
- Fondo pastel derivado al 80% del color principal y linea lateral con el color original, visibles de forma equivalente durante edicion y vista previa.
- Persistencia segura mediante la directiva Markdown `:::callout`, sin cambiar el formato estructural de `.ttrpgscene`.

### Fixed

- Los controles contextuales del callout permanecen visibles cuando el cursor esta dentro de su contenido.
- El campo de emoji conserva el foco al hacer clic y permite agregar, reemplazar o retirar su valor sin devolver el foco al documento.

## [1.7.3] - 2026-08-29

### Added

- Accion contextual `Clonar luz` para duplicar una luz dinamica con todas sus propiedades y ubicar el clon cerca, visible y seleccionado.

### Changed

- Player View conserva el nucleo blanco y el circulo interior intenso de las luces dinamicas, mientras el disco naranja de ubicacion permanece exclusivo del DM.
- El menu contextual identifica el elemento bajo el puntero para ofrecer acciones especificas sin confundirlo con una seleccion anterior.

## [1.7.1] - 2026-08-28

### Fixed

- Los circulos concentricos que identifican la fuente de una luz dinamica ahora se renderizan exclusivamente en la vista del DM.
- Player View conserva los halos, la animacion y la iluminacion sin mostrar controles ni indicadores editoriales de la fuente.

## [1.7.0] - 2026-08-28

### Added

- Editor enriquecido para notas e informacion de habitaciones con encabezados, listas, enfasis, subrayado, tachado y enlaces.
- Vista previa del documento antes de guardar o volver a editar.

### Changed

- Los editores de notas y habitaciones ahora usan una experiencia documental amplia alineada con el lenguaje visual de la aplicacion.
- El modal de habitaciones enlazadas adopta la misma jerarquia visual y conserva los colores principales de TTRPG Effects.
- El render Markdown admite subrayado controlado sin habilitar HTML arbitrario.

## [1.6.0] - 2026-08-28

### Added

- Cobertura configurable para luces dinamicas: circulo completo de `360°`, semicirculo de `180°` o angulo personalizado.
- Manivela visual y campo numerico para orientar luces con apertura menor a `360°`.

### Changed

- Los halos fuerte y tenue, la perforacion de oscuridad y la recuperacion de color en darkvision comparten la misma geometria radial.
- Las escenas anteriores siguen cargando sus luces dinamicas como circulos completos mediante valores compatibles por defecto.

## [1.5.4] - 2026-08-28

### Added

- Nuevo efecto `Luz dinamica` con fuente circular animada, luz fuerte y tenue configurables en cuadros, movimiento libre y propiedades editables desde el aside.
- Persistencia compatible de luces dinamicas en `.ttrpgscene`, incluyendo color, radios, intensidad, opacidad, variacion y velocidad.

### Changed

- El render de luces dinamicas reutiliza su jerarquia PixiJS, actualiza el parpadeo sin estado React por frame y evita invalidar capas no relacionadas.
- La luz dinamica participa en oscuridad normal y vision en la oscuridad, respetando la prioridad de oscuridad magica y niebla.

### Fixed

- Guardar escenas con luces dinamicas vuelve a abrir correctamente el dialogo y todos los caminos de guardado comparten la misma normalizacion compatible.
- El menu contextual se abre hacia arriba cuando no cabe debajo del puntero, se mantiene dentro del viewport y conserva submenus accesibles junto a los bordes.

## [1.5.3] - 2026-08-27

### Added

- Control de camara de jugador desde la vista DM mediante marcador principal, zoom remoto y accion de recentrado.
- Camara virtual privada para mostrar al DM la posicion efectiva de Player View cuando el jugador navega de forma independiente.

### Changed

- Sincronizacion bidireccional de camara mediante mensajes IPC ligeros, revisiones monotonicamente crecientes y reportes coalescidos para evitar loops y colas sin limite.
- Las conexiones entre escenas guardan directamente por la ruta `.ttrpgscene` conocida; solo se muestra el selector del archivo destino y las escrituras se realizan en segundo plano.
- Los puntos conectados ofrecen la accion `Desligar` desde el modal y las propiedades del sidebar.

### Fixed

- Desligar una conexion solo libera el extremo remoto si todavia apunta al archivo y marcador actuales, evitando borrar conexiones reasignadas.
- Renombrar un punto conectado persiste inmediatamente el archivo local sin alterar `connectionId`, rol, origen, destino o `peer`.
- Los fallos IPC del guardado de enlaces se muestran en la interfaz sin producir promesas rechazadas sin manejar.

## [1.5.1] - 2026-08-27

### Changed

- Refactor visual del frontend inspirado en el editor VTT de referencia, conservando el logo y el viewport PixiJS existentes.
- Toolbar principal compacta con iconos, agrupacion de acciones y estados activos coherentes.
- Paneles laterales y acordeones reorganizados con una jerarquia visual mas clara y controles de menor densidad.
- Buscador del arbol de anotaciones integrado al nuevo look and feel con icono y estados de foco.
- Boton de bloqueo de zoom del Player View actualizado con iconos y estados visuales consistentes con la vista del DM.

## [1.5.0] - 2026-08-27

### Added

- Marcadores privados del DM para conectar puntos entre dos archivos `.ttrpgscene`.
- Seleccion segura de una escena externa y de uno de sus puntos de conexion sin reemplazar la escena activa ni cargar sus assets.
- Persistencia reciproca recuperable, validacion asincrona y estados visuales neutral, validando, valido y roto.
- Navegacion por doble click con revalidacion previa, registro en escenas recientes y centrado de Player View en el punto de entrada.
- Controles de conexiones en el sidebar, arbol de anotaciones y propiedades del objeto seleccionado.
- Acceso `Link a otro mapa` en el submenu contextual de anotaciones del canvas.

### Changed

- `mapAnnotations` incorpora `sceneLinks` con compatibilidad automatica para escenas anteriores.
- Los snapshots de Player View eliminan puntos, nombres, rutas y diagnosticos de conexiones.

## [1.4.0] - 2026-08-26

### Added

- Pines privados de habitacion y areas informativas de terreno/trampa persistidas en escenas.
- Pintado por celdas con feedback, seleccion, movimiento, bloqueo, edicion Markdown y borrado.
- Arbol izquierdo `Anotaciones` agrupado en habitaciones, terrenos y trampas, con busqueda, navegacion, bloqueo y accion explicita para mostrar areas al jugador.
- Highlights temporales de 5 segundos para Player View sin exponer contenido privado del DM.

### Changed

- Los snapshots de Player View eliminan por construccion etiquetas y anotaciones privadas.
- El renderer Markdown compartido conserva GFM/tablas y sanitiza HTML con DOMPurify.
- Los pines de habitacion usan un icono y area de seleccion mayores, muestran un label legible de tamano constante durante el zoom y abren primero la vista previa al hacer doble click; los controles de creacion/visibilidad permanecen en el sidebar derecho.

## [1.3.0] - 2026-07-29

### Added

- Control `Escala mapa` en la seccion Grilla para agrandar o reducir la imagen del mapa sin modificar el zoom de camara.
- Persistencia y normalizacion de `map.scale` en escenas `.ttrpgscene`.
- Tests de dominio/schema para escala visual del mapa.
- Specs y planes actualizados para reproducir el ajuste fisico del mapa en futuras implementaciones.

## [1.2.0] - 2026-05-25

### Added

- Turnero de combate persistido en `.ttrpgscene`, con configuracion desde monstruos, NPCs y personajes jugadores de la escena.
- Modal para armar el orden de combate con iniciativas manuales, reordenamiento, participantes tardios y rondas.
- Barra de turnos sincronizada entre DM y ventana de jugador, con retratos verticales, badge de iniciativa, tooltip de nombre, turno actual destacado y siguiente turno con halo.
- Controles de DM para avanzar turno, editar batalla, eliminar/reincorporar participantes y finalizar batalla con reset completo del estado de combate.

## [1.1.0] - 2026-05-25

### Added

- Persistencia de NPCs en SQLite y flujo para agregarlos a escenas desde una biblioteca con buscador.
- Personajes Jugadores como nuevo tipo de entidad persistente con imagen, especie y clase(s) separadas, caracteristicas de texto libre, notas Markdown renderizadas, preview editable antes de agregar a escena y detalle visual inspirado en ficha/carta.
- Plan tecnico y specs actualizados para extender el sistema de entidades sin romper la portabilidad de `.ttrpgscene`.

## [1.0.0] - 2026-05-25

### Added

- Bootstrap de Electron, Vite, React y TypeScript para la app desktop.
- Motor visual con PixiJS, capas de render, mapa, grilla, camara, pan y zoom.
- Carga de mapas locales mediante protocolo seguro de assets.
- Persistencia portable de escenas `.ttrpgscene` con guardado, carga y escenas recientes.
- Sidebar derecho con controles por secciones, propiedades de objeto seleccionado y controles de grilla, oscuridad, niebla, figuras, efectos y tokens.
- Herramientas de medicion y areas: linea, path/camino, circulo, cono, rectangulo y reglas D&D 5e de diagonales.
- Luces puntuales, luces conicas, oscuridad ambiental, vision en la oscuridad y oscuridad magica.
- Fog of war con modo de revelado, modo grab, feedback de pincel y optimizaciones de strokes.
- Efectos animados de fuego y agua, incluyendo rios, cuerpos de agua, controles de orientacion y ajustes visuales.
- Tokens/minis virtuales con imagen circular, tamanos por categoria de criatura, visibilidad, listado lateral y persistencia en escenas.
- Ventana de jugador en Electron, read-only, con render diferenciado para niebla, oscuridad, tokens ocultos y apuntador.
- Apuntador arcano animado configurable por tamano de criatura.
- Panel de entidades del DM para monstruos, NPCs y notas.
- Templates Markdown/CSS de monstruos con primer template D&D 5.5e.
- Biblioteca persistente local de monstruos respaldada por SQLite.
- Labels de mapa visibles solo para DM.
- Menu nativo de aplicacion con escenas recientes.
- Reorganizacion documental de specs por funcionalidad, cada una con `spec.md` y `plan.md`.

### Changed

- El build de DMG toma la version desde `package.json`.
- Se establece `1.0.0` como baseline funcional inicial del proyecto.

### Notes

- Esta version es la base estable inicial antes de continuar con nuevas specs.
- A partir de esta version, cada feature/spec completada debe incrementar minor, cada bugfix debe incrementar patch y solo cambios incompatibles de `.ttrpgscene` deben incrementar major.
