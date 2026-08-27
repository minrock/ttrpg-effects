# Changelog

Todas las notas de version de TTRPG Effects se documentan en este archivo.

El proyecto sigue versionado semantico:

- **Patch**: bugfixes y correcciones compatibles.
- **Minor**: features/specs completadas o cambios funcionales compatibles.
- **Major**: cambios incompatibles con `.ttrpgscene` o migraciones obligatorias del formato de escena.

La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.

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
