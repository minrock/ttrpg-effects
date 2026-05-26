# Changelog

Todas las notas de version de TTRPG Effects se documentan en este archivo.

El proyecto sigue versionado semantico:

- **Patch**: bugfixes y correcciones compatibles.
- **Minor**: features/specs completadas o cambios funcionales compatibles.
- **Major**: cambios incompatibles con `.ttrpgscene` o migraciones obligatorias del formato de escena.

La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.

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
