# AGENT.md - Practicas del Proyecto

Este archivo define convenciones de arquitectura, desarrollo y seguridad para TTRPG Effects. Debe leerse antes de implementar nuevas specs o modificar estructura del proyecto.

## Stack base

- Gestor de paquetes: `pnpm`.
- Aplicación exclusivamente web: navegador React + servicio Node.js HTTP/SSE (SDD 62).
- Frontend: React + TypeScript, salvo decision explicita distinta.
- Bundler/dev server: Vite.
- Motor visual recomendado: PixiJS para mapa, capas, luces, sprites y efectos.
- Persistencia del servicio: SQLite local y PostgreSQL con TLS en producción.
- Formato de escena portable dentro de la app: JSON versionado con extension `.ttrpgscene`.

## Comandos esperados

Usar `pnpm` para todas las operaciones de Node:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

No introducir `npm`, `yarn` o lockfiles alternativos sin una decision explicita.

## Way of Working
- Al finalizar cada tarea, cerrar todos los servidores iniciados o reiniciados por el agente, incluidos API, watchers, Vite, Storybook, Kanban y bases de datos de prueba. Registrar sus procesos, detenerlos ordenadamente junto con sus hijos y comprobar que liberaron sus puertos. No detener servicios ajenos que ya estaban ejecutándose.
- Siempre que vayas a comenzar con un spec/feature nueva inicia creando una rama feature/.*
- Siempre que vayas a comenzar a trabajar con un bug inicia creando una rama fix/.*
- Siempre espera a la orden de mergear para llevar los cambios a main.
- **Nunca ejecutes `git add`, `git commit`, `git push` ni ninguna operacion de escritura en el repositorio sin permiso explicito del usuario en esa sesion. Espera siempre la orden antes de escribir en el historial de git.**
- Cada vez que se integre una spec en main, ejecutar los checks y `pnpm build` para generar API y frontend web en `out/api` y `out/web`. No existe empaquetado DMG desde SDD 62; despliegue requiere autorización aplicable.

## Especificaciones SDD

El punto de entrada de planificación es `SDD/README.md`. Lee `SDD/estado-actual.md` y las specs/planes relacionados antes de proponer un cambio. Las especificaciones y guías vigentes viven en `SDD/specs/` y `SDD/guias/`; las rutas antiguas `specs/` y `docs/` solo redirigen. Usa `SDD/flujo.md` y las plantillas para nuevos alcances. Conserva la evidencia de aceptación y validación junto a cada spec SDD; no confundas implementación local, revisión e integración.

## Organización del trabajo

La planificación y la evidencia se mantienen en SDD. La fábrica anterior fue retirada. Las entradas son `$factory` en `.agents/skills/factory/SKILL.md` para especificar y `$build` en `.agents/skills/build/SKILL.md` para aceptar una spec existente, planificarla, implementarla y validarla dentro del alcance solicitado. En ambos casos el hilo principal asume el rol `pm` de `.codex/agents/pm.toml`; no se crea ni reanuda un subagente PM. Ese hilo coordina TL, UI/UX y builders y es el único despachador de builders y escritor operativo del Kanban mediante `kanban-local`. Toda pregunta del PM usa User Ask; mantiene el turno abierto hasta recibir todas las respuestas, salvo cancelación/pausa explícita del usuario. No sustituye la herramienta por preguntas en texto. Consulta `.codex/README.md`. No se recuperan los roles ni las rondas obligatorias de la fábrica anterior. Las tareas ordinarias conservan su flujo habitual. Reutiliza el contrato SDD y respeta las autorizaciones de Git de este archivo.

## Versionado y changelog

La versión de la aplicación vive en `package.json` y debe ser la única fuente de verdad para los builds de API y frontend web.

Usar versionado semantico:

- **Patch (`x.y.z+1`)**: cada bugfix o correccion que no agregue funcionalidad nueva ni rompa compatibilidad.
- **Minor (`x.y+1.0`)**: cada feature/spec completada o cambio funcional compatible hacia atras.
- **Major (`x+1.0.0`)**: solo cuando se rompa compatibilidad con archivos `.ttrpgscene` existentes o se requiera migracion incompatible del formato de escena.

Reglas operativas:

- Al finalizar una feature/spec, actualizar `package.json` con bump minor y registrar la entrada en `CHANGELOG.md`.
- Al finalizar un bugfix, actualizar `package.json` con bump patch y registrar la entrada en `CHANGELOG.md`.
- Al introducir un cambio incompatible del formato `.ttrpgscene`, actualizar `package.json` con bump major, documentar la incompatibilidad/migracion en `CHANGELOG.md` y actualizar los specs/planes afectados.
- Cada entrada de `CHANGELOG.md` debe indicar fecha, tipo de cambio y resumen de cambios principales.
- Los builds de API y frontend deben leer la versión desde `package.json`; no hardcodear versiones en scripts.

## Principios de arquitectura

- Separar logica de dominio, persistencia, infraestructura y vista.
- El renderer no debe contener reglas de negocio complejas.
- La vista debe invocar casos de uso o servicios, no manipular directamente almacenamiento, sistema de archivos o APIs privilegiadas.
- La logica de mapa, grilla, mediciones, luces y sesiones debe vivir en modulos testeables sin depender de React.
- PixiJS debe quedar encapsulado detras de componentes/adapters de render, no mezclado con reglas de dominio.
- Las coordenadas de mundo, pantalla, mapa y grilla deben modelarse explicitamente.
- Evitar singletons globales mutables salvo para infraestructura controlada y documentada.

## Estructura sugerida

La estructura puede evolucionar, pero debe preservar estas fronteras:

```text
src/
  server/
  web/
  shared/
    api/
    contracts/
  renderer/
    app/
    components/
    hooks/
    styles/
  domain/
    grid/
    lighting/
    map/
    measurement/
    sessions/
    shared/
  application/
    use-cases/
    services/
  infrastructure/
    database/
    file-system/
    repositories/
    assets/
  render/
    pixi/
    layers/
    tools/
```

### `server`

Responsable de componer API HTTP/SSE, identidad, autorización, repositorios y ciclo de vida del servicio. Valida entradas y revalida autoridad al confirmar escrituras y entregar eventos. No contiene lógica visual.

### `web`

Responsable de acceso, administración, invitaciones y composición del editor/jugador con clientes HTTP explícitos. No accede al sistema de archivos del servidor ni recibe capacidades nativas.

### `renderer`

Responsable de:

- UI React.
- Estado visual local.
- Controles, menus, paneles y formularios.
- Integracion con el render canvas mediante APIs bien definidas.

No debe acceder directamente a Node.js, SQLite, filesystem ni secretos del servidor; usa clientes explícitos y APIs web.

### `domain`

Responsable de:

- Reglas puras de mapa, grilla, medicion, luces, formas y sesiones.
- Tipos centrales.
- Calculos de coordenadas.
- Validaciones puras.

Debe ser testeable sin servidor HTTP, DOM ni PixiJS.

### `application`

Responsable de:

- Casos de uso.
- Orquestacion entre dominio e infraestructura.
- Operaciones como guardar escena, cargar escena, importar mapa, crear luz o cambiar unidad.

### `infrastructure`

Responsable de:

- SQLite.
- Repositorios.
- File system.
- Adaptadores HTTP/SSE y puertos de almacenamiento.
- Carga/decodificacion de assets.

## Seguridad del navegador y HTTP/SSE

- Tratar al navegador como superficie no confiable. Roles, propiedad, apertura y permisos se verifican en el servidor.
- Mantener CSP, sanitización y controles Host/Origin; no añadir CORS comodín ni `unsafe-eval` para resolver errores de UI.
- No guardar secretos del servidor en el frontend ni en variables VITE.
- Los componentes reciben un cliente explícito mediante ClientProvider; no hay `window.ttrpg`, preload ni fallback privilegiado.
- Validar payloads con esquemas compartidos y devolver errores serializables y amigables.
- Mantener revisión optimista, idempotencia, revocación y separación de datos privados/públicos.
- Acotar mensajes, buffers y conexiones; cerrar SSE, listeners, timers y recursos al perder autoridad o desmontar.
- Selección y descarga de archivos usan APIs del navegador; los recursos del servidor se referencian por IDs autorizados, nunca rutas arbitrarias.

## SQLite y persistencia

SQLite local y PostgreSQL productivo deben permanecer detrás de puertos/interfaces compartidos. No cambiar de motor ni migrar datos reales sin el alcance y autorización correspondientes.

Reglas:

- El dominio no conoce SQLite.
- El renderer no conoce SQLite.
- Los casos de uso hablan con interfaces de repositorio.
- La implementacion SQLite vive en `infrastructure/database` o `infrastructure/repositories`.
- Las migraciones deben ser versionadas.
- Las queries deben ser parametrizadas.
- No construir SQL con concatenacion de strings de usuario.
- Manejar transacciones para cambios multi-tabla.
- Separar conexion, migraciones y repositorios.

Interfaces sugeridas:

```ts
export interface DatabaseConnection {
  transaction<T>(work: () => Promise<T>): Promise<T>;
}

export interface SceneRepository {
  save(scene: Scene): Promise<void>;
  findById(id: SceneId): Promise<Scene | null>;
  list(): Promise<SceneSummary[]>;
  delete(id: SceneId): Promise<void>;
}
```

Implementaciones futuras posibles:

- `SqliteSceneRepository`.
- `PostgresSceneRepository`.
- `IndexedDbSceneRepository`.
- `FileSceneRepository`.

El archivo `.ttrpgscene` sigue siendo JSON de intercambio/guardado de escena. SQLite puede usarse para biblioteca local, historial, caches, autosaves o metadata.

## Estado y modelo de datos

- Las escenas deben tener version de formato.
- Guardar coordenadas en espacio de mundo, no en pantalla.
- Separar camara de mapa.
- Separar escala calibrada de zoom de navegacion si la implementacion lo permite.
- En servicio, referenciar imágenes por IDs opacos autorizados; conservar lectura de referencias históricas del formato sin permitir acceso arbitrario al servidor.
- Manejar rutas rotas con errores recuperables.
- Usar ids estables para formas, luces, efectos y futuros tokens.

## Render y PixiJS

- Mantener PixiJS fuera del dominio.
- Crear adapters para convertir entidades de dominio a objetos renderizables.
- Centralizar conversion pantalla <-> mundo.
- Orden de capas recomendado:
  1. Fondo.
  2. Mapa.
  3. Grilla.
  4. Oscuridad.
  5. Luces.
  6. Efectos animados.
  7. Formas y mediciones.
  8. Seleccion.
  9. UI React.
- Evitar que cada herramienta cree su propio sistema de coordenadas.
- Limpiar texturas, sprites y listeners al destruir escenas.
- Medir rendimiento con mapas grandes antes de agregar efectos costosos.

## UI y UX

- La app es una herramienta de mesa fisica, no una landing page.
- Priorizar controles discretos y legibles en proyeccion.
- Click derecho abre menu contextual.
- `Delete`/`Backspace` borra el elemento seleccionado.
- `Escape` cancela herramienta activa o cierra menus.
- El bloqueo de escala debe ser visible y dificil de romper accidentalmente.
- El usuario debe poder seguir navegando y usando herramientas con la escala bloqueada.
- Preferir iconos y tooltips para controles frecuentes.
- Evitar paneles grandes que cubran el mapa durante una sesion.

## TypeScript

- Usar `strict: true`.
- Evitar `any`; si es inevitable, encapsularlo y justificarlo.
- Modelar unidades con tipos explicitos cuando sea util.
- Preferir tipos de dominio sobre objetos sueltos.
- Compartir tipos seguros entre cliente y servidor mediante `src/shared`, sin imports circulares ni infraestructura privilegiada en el navegador.

## Validacion

- Validar datos externos: archivos de escena, payloads HTTP/SSE, inputs de usuario, rutas y configuraciones.
- Usar esquemas versionados para `.ttrpgscene`.
- Rechazar o migrar versiones incompatibles con mensajes claros.
- No confiar en datos guardados aunque sean locales.

## Testing

Prioridad de tests:

- Calculos de grilla y coordenadas.
- Mediciones en pies/metros.
- Diagonales configurables.
- Serializacion y migracion de escenas.
- Repositorios SQLite.
- Casos de uso de guardar/cargar.

Tipos de test:

- Unit tests para dominio.
- Integration tests para repositorios y casos de uso.
- Tests visuales/manuales en navegador para editor, jugador, render y controles.
- Smoke test para `pnpm dev` cuando sea viable.

## Assets

- Guardar assets bajo una carpeta clara, por ejemplo `assets/`.
- Preferir assets CC0 o generados para el proyecto.
- Si se usa un asset con atribucion, guardar licencia y fuente junto al asset.
- No incorporar assets con licencia dudosa.
- Optimizar sprites y texturas para no penalizar la proyeccion.

## Formato y calidad

- Usar formatter y linter desde el inicio.
- No mezclar refactors grandes con implementaciones de specs.
- Mantener PRs/cambios pequeños por spec.
- Cada spec implementada debe actualizar documentacion si cambia una decision.
- No introducir dependencias pesadas sin justificar su rol.
- Revisar errores de consola/red del navegador y del servicio durante desarrollo.

## Construcción y operación web

- `pnpm dev` inicia el supervisor de desarrollo de API y frontend; requiere configuración y esquema preparados explícitamente.
- `pnpm build` construye API y web. `pnpm start` ejecuta el build estable.
- `pnpm build:api`, `pnpm build:web` y Storybook permiten trabajar sobre salidas independientes.
- Un único proceso API conserva la autoridad por base de datos; no quitar los locks para admitir réplicas sin una nueva arquitectura de sesión compartida.
- Instalaciones independientes requieren bases/directorios, secretos y hosts/orígenes propios. Cambiar solo el puerto del mismo host no aísla las cookies.
- La proyección de juego y conexiones siguen en memoria. Retirar Electron no añade Django, Redis ni recuperación distribuida.
- Conservar `.env`, bases, respaldos, perfiles e instaladores antiguos del usuario; no borrarlos al retirar fuentes desktop.
- Las reglas vigentes sustituyen el empaquetado nativo de las specs históricas, que conservan su evidencia.

## Referencias

- Arquitectura vigente: `SDD/arquitectura.md`.
- Operación: `SDD/guias/service-operations.md`.
- Cliente: `SDD/guias/client-architecture.md`.
- Retirada de Electron: `SDD/specs/62-servicio-solo-web/spec.md`.
