# Changelog

## 3.19.1 — 2026-11-04 — Corrección

- Jugador con lateral derecho retráctil mediante chevrón en el borde (como el DM) para alias, sistema, conexión, salida y dibujos compartidos; mapa y cámara conservados al abrir/cerrar.
- Gestión de mesa, invitaciones, participantes y dibujos de jugadores integrada en la pestaña Mesa del lateral derecho, sin flotantes sobre los menús del DM.
- Corrige solapamientos de menús y etiquetas; preserva foco, estado y cámara al contraer los laterales. SDD recoge los criterios del ajuste y los límites de validación.

## 3.19.0 — 2026-11-04 — Funcionalidad

- Mediciones, caminos y áreas de jugadores compartidos en tiempo real con el DM y otros jugadores del servicio, con alias y discriminador del autor.
- Capa efímera separada de la escena: edición propia, previews acotados, reconexión, retirada al salir/ser expulsado y limpieza por contexto. El DM puede retirar figuras o limpiar con confirmación.
- Extensión HTTP/SSE negociada, validación y permisos en servidor, revisiones e idempotencia; conserva Electron autónomo y clientes sin extensión. Vista del mapa publicado sin sustituir el borrador DM.

## 3.18.1 — 2026-11-04 — Corrección

- Fusiona los controles del editor con la cabecera del servicio: una sola fila para partida, escena, guardar, herramientas, jugador y perfil, sin logo duplicado ni fila vacía.
- En pantallas estrechas agrupa las herramientas en un desplegable; conserva la cabecera de Electron local y oculta los controles compartidos al suspender el acceso.

## 3.18.0 — 2026-11-04 — Funcionalidad

- Cabecera del servicio de 44 px: navegación, contexto de partida y perfil en una fila; menús desplegables para cuenta y partida, manteniendo confirmaciones y protección de borradores.
- Distribución adaptable a pantallas estrechas y desplegables con teclado, Escape y cierre al salir; compartida por navegador y Electron en modo servicio.

## 3.17.0 — 2026-11-04 — Funcionalidad

- `createsuperuser` acepta contraseña definitiva elegida y confirmada por el operador, o Enter para generar una temporal aleatoria. Solo la generada exige cambio posterior y se muestra una vez en la terminal tras confirmar el alta.
- Se mantienen hash, auditoría, unicidad del correo y acceso exclusivo por CLI; no cambia la política temporal de provisión DM ni recuperación.

## 3.16.0 — 2026-11-03 — Funcionalidad

- Contraseñas de 10–128 caracteres Unicode en la provisión local, autenticación y cambio de contraseña; mensajes de CLI y cliente actualizados. Se conserva el hash existente y no se requiere migración de datos.

## 3.15.0 — 2026-11-03 — Funcionalidad

- `pnpm createsuperuser` permite crear varios administradores desde la terminal local, con correo único, contraseña oculta y cambio obligatorio. No se expone ningún endpoint nuevo.
- Migración 7 para SQLite/PostgreSQL: retira el índice de administrador único y conserva cuentas, credenciales y sesiones. `identity:bootstrap` mantiene su uso exclusivo para el alta inicial.

## 3.14.1 — 2026-10-31 — Corrección

- El alta local identifica errores de correo, nombre y contraseña y permite corregirlos sin reiniciar el comando ni mostrar secretos.
- Comprueba antes de pedir datos si el alta inicial ya se completó e indica los comandos de recuperación y cambio de contraseña; conserva la validación transaccional final.

## 3.14.0 — 2026-10-31 — Funcionalidad

- Comando local interactivo `pnpm createsuperuser` para crear el primer administrador, sin endpoint HTTP ni credenciales en argumentos.
- Reutiliza la provisión transaccional existente, carga el `.env` del proyecto y conserva contraseña oculta, confirmación y cambio obligatorio; incluye ayuda y diagnóstico de preparación.

## 3.13.0 — 2026-10-31 — Funcionalidad

- Acceso por cuentas administrador/DM, cambio obligatorio, administración de cuentas y catálogo de sistemas con versiones retenidas; selección explícita de sistema por partida.
- Catálogo de partidas, apertura/continuidad/reapertura, invitaciones por alias y panel de participantes con expulsión y enlace renovado sin desconectar sobrevivientes.
- Cliente compartido navegador/Electron servicio con recursos propios, revisiones, bindings, idempotencia, guard de cuenta/borradores y transporte contextual; Electron local conserva operación autónoma.
- Servicio final SQLite local/PostgreSQL productivo conTLS, retiro de claves/rutas globales y setup privado bajo `.local/service`; respaldo/restauración con invalidación de accesos y guías de retorno.
- Recuperación de sesión operable con confirmaciones privadas abiertas: cancelación de decisiones pendientes, foco en acceso y borrador conservado para la misma cuenta.
- Cierre y reapertura propios reconciliados con terminales de la mesa: estado vigente y acción de inicio operable, sin congelar una apertura nueva por avisos anteriores.
- Conserva formato `.ttrpgscene`v2 y compatibilidad de lectura/migraciónv1.

## 3.12.0 — 2026-10-31

### Feature

- Moderación por participante y apertura: roster privado, expulsión transaccional/idempotente, revocación de todas sus credenciales y rotación única del enlace; los demás participantes conservan acceso.
- Mesas, proyección, assets, cámaras y dados independientes por partida; HTTP/SSE contextual con autorización vigente en la entrega y limpieza terminal del adaptador cliente.
- Migración6 y contratos reales SQLite/PostgreSQL; exclusión de proceso API con bloqueo dedicado en PostgreSQL, cuotas globales y por mesa, reinicio vacío y cierre de transportes en revocación.
- Composición backend optativa para007–010 sin ServiceStore legado. Panel visual y corte integrado del producto continúan en011; escena v2 y Electron local compatibles.

## 3.11.1 — 2026-10-30

### Corregido — bugfix

- Vite 7.3.3 declarado como dependencia directa de desarrollo para que una instalación limpia con pnpm genere su ejecutable local y permita compilar Electron, API y web de forma reproducible.

## 3.11.0 — 2026-10-30

### Feature

- Invitaciones renovables por apertura, lease del propietario y admisión con alias/discriminador y cookie invitada independiente; rotación conserva participantes admitidos.
- Migración5 SQLite/PostgreSQL, hashes de secretos, CAS e idempotencia sin recuperar secretos, cuotas, auditoría y capacidad transaccional invitada para010.
- Contratos HTTP, módulo de fragmento para011, invalidación explícita del acceso restaurado y pruebas reales de ambos motores; se conserva el guard productivo y el formato de escena.

Todas las notas de version de TTRPG Effects se documentan en este archivo.

El proyecto sigue versionado semantico:

- **Patch**: bugfixes y correcciones compatibles.
- **Minor**: features/specs completadas o cambios funcionales compatibles.
- **Major**: cambios incompatibles con `.ttrpgscene` o migraciones obligatorias del formato de escena.

La version oficial vive en `package.json`. Cada cierre de spec, feature o bug debe actualizar `package.json` y agregar una entrada en este changelog antes de generar el DMG.

## [3.10.0] - 2026-10-30

- Catálogo de sistemas compartido administrado por admin: borradores, publicaciones inmutables, disponibilidad separada de versiones y plantillas, sin borrado. Referencias exactas de partida/recursos y configuración tipada de módulos incorporados; conserva edición de instancias deshabilitadas y plantillas históricas privadas.
- Migración 4 y transferencia operativa v3 con lectores v1/v2, hashes, bindings y enlaces persistidos; validación final transaccional para operaciones concurrentes y rechazos capturados. Sin cambios del formato portable ni del editor local autónomo.

### Agregado — feature

- Catálogo privado de partidas por DM, revisiones optimistas e idempotencia persistida, con archivo/borrado y cierre de apertura atómicos.
- Escenas, assets y bibliotecas reutilizables por propietario en SQLite/PostgreSQL reales, rutas DM separadas de la API global y apertura/lease preparados para invitaciones posteriores.
- Herramientas privadas de respaldo, exportación, adopción, verificación y restauración de datos legados, con selección explícita de dueño, hashes y rollback transaccional.
- Contratos reales de aislamiento, concurrencia, migración y restauración; sin nuevas pantallas ni cambios del formato portable v2. El corte productivo completo continúa reservado a011.

### Corregido en revisión de 008

- Propietario cerrado en los puertos autorizados y publicación visible solo después del commit.
- Errores recuperables de revisión, presupuesto y plantilla referenciada; diagnósticos sanitizados de migración y estado incierto.
- Exportación validada por referencias exactas, catálogo segmentado fuera del manifiesto y rollback ante rechazos sin motivo; regresiones de tamaño, cancelación y fallo tardío en ambos motores.

## [3.9.0] - 2026-10-29

### Agregado — feature

- Identidad de administrador/DM con Better Auth 1.7.14, credenciales scrypt de coste explícito y sesiones revocables persistentes en SQLite/PostgreSQL.
- Alta DM exclusivamente administrativa, contraseñas temporales, cambio obligatorio, recuperación local y comandos interactivos sin eco.
- Rutas de identidad optativas, cuotas y migración versionada; las cuentas nuevas siguen separadas de la mesa legada. Sin cambios en UI ni formato de escena v2.

## [3.8.0] - 2026-10-29

### Agregado — feature

- Catálogo de partidas con propietario, puertos asíncronos y adaptadores SQLite/PostgreSQL, transacciones con rollback y cierre explícito de recursos.
- Migraciones versionadas e idempotentes mediante `pnpm db:migrate`, configuración local/producción y TLS PostgreSQL verificado; contratos reales de ambos motores mediante `pnpm test:db`.
- Guía de drivers y transición: la API legada conserva SQLite local y rechaza producción/PostgreSQL hasta migrar todo el almacenamiento funcional. Sin cambios de autenticación ni del formato de escena v2.

## [3.7.0] - 2026-10-29

### Agregado

- Configuración de API desde `.env` y de Electron desde `.env.electron`, cargada al arrancar sin exports manuales ni dependencias nuevas. Las variables del proceso tienen precedencia.
- Preparación Bash idempotente con claves privadas persistentes, archivos con permisos 600 y directorio de datos 700; conserva configuraciones existentes y mantiene secretos fuera de Git y del cliente.
- El arranque de la API muestra el host, el puerto efectivo y el enlace del origen público configurado para abrir la aplicación.

## [3.6.0] - 2026-10-29

### Agregado — feature

- Electron puede conectarse explícitamente al mismo frontend/API privado mediante un modo servicio aislado, sin preload ni IPC local, con sesión efímera y recuperación de conexión.
- Validación de origen/HTTPS, bloqueo de navegación externa, ventanas, webviews y permisos; protección de las ventanas locales DM/jugador.
- Comandos de arranque, guía operativa de HTTPS, claves, persistencia y respaldo/restauración; artefactos de Electron separados de API/web. Formato de escena v2 conservado.

## [3.5.0] - 2026-10-29

### Agregado — feature

- Mesa privada sincronizada con HTTP/SSE real, bootstrap y reconexión, presencia principal determinista, cámara independiente y órdenes explícitas, puntero y áreas temporales.
- Proyección pública construida por campos permitidos y acceso a imágenes limitado al conjunto publicado vigente; revocación de futuras lecturas y exclusión de notas, fichas, mapas y objetos privados.
- Dados compartidos mediante DiceRollSession y replay existente: tiradas públicas/ocultas, resumen, tamaños e historial privado, idempotencia y recuperación temporal.
- Enlace de jugador sin credenciales, estados de conexión/carga y errores accesibles. Electron local y formato de escena v2 conservados.

## [3.4.0] - 2026-10-28

### Agregado — feature

- Cliente navegador con el VTT existente, acceso DM/jugador, recuperación de sesión, protección de cambios y adaptador HTTP validado del mismo origen.
- Guardar/cargar con selector, importar/exportar escenas, múltiples mapas, imágenes de mapas/tokens/notas, reemplazo de fondos, bibliotecas y plantillas persistentes.
- Enlaces de escenas mediante referencias opacas y transacciones recíprocas; recuperación de imágenes y destinos locales no resolubles.
- Desarrollo/build web independiente, estáticos confinados y CSP sin evaluación dinámica; pruebas HTTP/UI y humo navegador, Electron aislado y lab.
- Frontera de sesión incluye portales y selectores pendientes; conexión/reparación de escenas accesible desde el VTT, foco restaurado y nombres largos identificables. Los cambios entre enlaces internos/remotos exigen desligar antes y el modal queda sobre la cabecera a 1024 px.
- Proyección y dados compartidos se anuncian como pendientes; Electron local conserva su funcionamiento y el formato de escena continúa en versión 2.

## [3.3.0] - 2026-10-28

### Agregado

- Servicio privado Node.js 24 con sesiones DM/jugador, validación de origen/host, límites y contratos HTTP documentados.
- Escenas CRUD e importación/exportación v1/v2; assets privados con referencias opacas, recuperación de imágenes y almacenamiento SQLite consistente.
- Bibliotecas y plantillas remotas, comandos de API y pruebas HTTP reales de autorización, persistencia y errores. Electron local conserva su funcionamiento.
- Validación de escenas/plantillas al leer SQLite y decodificación acotada de imágenes antes de publicar assets; variantes no admitidas explican su conversión.

## [3.2.0] - 2026-10-28

### Agregado

- Contratos compartidos de clientes y composición por raíz React con capacidades explícitas; DM, Player, bibliotecas, imágenes y dados aceptan clientes inyectados.
- Mapa de paridad documentado para la futura migración al servicio privado, sin implementar transporte HTTP ni cambiar el formato de escenas.

### Corregido

- La información de versión del preload se deriva de `package.json`, también en el bundle sandboxed.

## [3.1.0] - 2026-10-28

### Agregado

- Fábrica de software local para Codex: skill `factory`, siete roles en español, cola y expedientes Markdown; cuatro revisiones completas por ronda, correcciones con el mismo constructor y aprobación técnica separada de la autorización de Git.
- Tablero HTML autónomo con sondeo del estado, tarjetas por etapa, historial de rondas y lector seguro de informes. Incluye una demostración explícita sin modificar el estado real.
- Flujo integrado con las specs, pruebas pnpm, versionado y empaquetado DMG existentes. Sin cambios en el formato `.ttrpgscene` ni dependencias adicionales.

## [3.0.0] - 2026-10-28

### Changed

- Nueva interfaz de mesa para DM: cabecera compacta, barra vertical de herramientas con opciones contextuales, explorador Escena/Mapa e inspector Propiedades/Dados. Conserva las acciones de escena, anotaciones, entidades, efectos, combate y contadores.
- Paneles adaptables a ventanas estrechas, navegacion accesible entre pestanas y controles separados para camara DM y jugador. Ocultar paneles no reinicia el canvas ni la tirada de dados activa.
- Player View adopta el mismo lenguaje visual con controles discretos de navegacion, zoom, brujula y herramientas locales.

### Added

- Mediciones de linea y caminos, circulos, cuadrados, rectangulos y conos locales en Player View, con propiedades, seleccion, arrastre, borrado y limpieza. Se pueden ocultar los controles sin perder las figuras.
- Las herramientas del jugador son efimeras y privadas de esa ventana: no modifican objetos del DM, no publican ni guardan cambios en la escena y se limpian al cambiar de mapa o escena.
- Laboratorios de interfaz DM y Player para desarrollo, con mapa original generado y pruebas de aislamiento. No se incluyen como entradas del instalador.

### Fixed

- Brujula con norte diferenciado y N legible; en Player siempre apunta hacia arriba, independientemente de la orientacion del mapa.
- Coordenadas de puntero, arrastre y manivelas alineadas con el norte rotado en Player; etiquetas de medida siempre derechas.
- Callbacks y capas estables para evitar recreaciones del viewport durante la edicion local de figuras.

### Compatibility

- Version mayor por solicitud expresa del usuario para este cierre de interfaz. No hay ruptura ni migracion nueva de `.ttrpgscene`; se conserva el formato y la compatibilidad de escenas existentes.
- La integracion en `main` incluye las versiones de dados 2.8.0 y 2.8.1 documentadas abajo. No se modifican los algoritmos de fuego, relampagos, luces o filtros horarios en este rediseño.
- Cierre de specs 38 y 39; actualizacion de specs/planes de paneles, brujula y Player View.

## [2.8.1] - 2026-10-28

### Fixed

- Legibilidad de dados pequenos: tamano independiente de 100% a 250% para DM y Player View, con controles en el panel de Dados y restablecimiento a 100%.
- Encuadre automatico de la trayectoria y las poses finales, con limite visible cuando no cabe toda la ampliacion; conserva caras, resultados, distancias relativas y cierre manual sin recortar dados ni alterar el zoom del mapa.

### Added

- Sonidos locales CC0 de Kenney para uno o varios dados, incluyendo percentiles y ventaja/desventaja, sincronizados con rebotes y con control de silencio en DM.

### Changed

- Preferencias de tamano conservadas durante la sesion y recuperadas al reabrir Player; IPC compacto separado de las tiradas, sin repetir simulacion, audio ni celebracion al cambiar tamano.
- Spec y plan de dados/Player actualizados. Protocolo de dados 4; sin cambios de formato `.ttrpgscene`. Version patch por solicitud expresa del usuario.

## [2.8.0] - 2026-10-24

### Added

- Pestana Dados en el panel derecho del DM para lanzar d4, d6, d8, d10, d12, d20 y percentiles 3D sobre el mapa, con colores, materiales Resina/Mate/Metal y fuerza ajustable.
- Tiradas abiertas compartidas con Player View y ocultas exclusivamente para el DM; resumen numerico publico opcional e historial privado durante la sesion.
- Composicion por dados o formulas como `2d6 + 3d4 + 2`, agrupacion y colores por tipo de dano, modificadores independientes y subtotales por grupo.
- Chequeos d20 exclusivos, normales, con ventaja o desventaja, con modificador propio y cara conservada separada del dano preparado.
- Celebracion de 20 natural conservado con rayos sobre el dado, abertura pequena para leer el numero y texto Critico; respeta tiradas privadas/abiertas y movimiento reducido.

### Changed

- Dados y resultados permanecen sobre el tablero hasta cerrar el resumen con la X del DM; el cierre se sincroniza con Player View sin borrar el historial.
- Simulacion fisica unica en worker y reproduccion compartida entre ventanas, independiente de zoom, norte y camara; render 3D bajo demanda y recursos locales sin CDN.
- Cierre del spec 37 y actualizacion de specs/planes de paneles, render, Player View y persistencia. Sin cambios en el formato `.ttrpgscene`; dados e historial no se guardan en escenas.

### Fixed

- Los modificadores finales se incluyen una sola vez en cada subtotal y en el resultado d20. La comprobacion de protocolo impide lanzar con un proceso Electron antiguo que descarte campos del formulario actualizado.

## [2.7.0] - 2026-10-22

### Added

- Actualizar la imagen de cualquier mapa de la escena desde su fila, sin perder marcadores, conexiones, objetos, mascaras, configuracion ni identidad. Actualizar un mapa inactivo no cambia el mapa proyectado.
- Modal de comparacion y confirmacion con dimensiones y politicas de escala. Las imagenes de distinta resolucion y misma proporcion conservan por defecto el tamano mundial; los cambios de proporcion o limites requieren confirmacion explicita.

### Changed

- Carga preparada y sustitucion coordinada del fondo en DM y Player View, conservando camara auxiliar, zoom, darkvision, niebla y filtros. Las revisiones de recursos permiten refrescar archivos sobrescritos en la misma ruta.
- Dimensiones opcionales por mapa y escala persistente de precision completa, compatibles con escenas existentes y formato 2. Las miniaturas y URLs temporales no se guardan en el archivo de escena.
- Cierre del spec 36 con cobertura de dominio, persistencia, IPC, render, cancelaciones, resultados asincronos y Player View.

## [2.6.1] - 2026-10-05

### Fixed

- Player View conserva la mascara de vision en la oscuridad al recibir actualizaciones de figuras o efectos que no cambian la iluminacion. La mascara y la visibilidad del mapa a color se actualizan juntas, evitando que queden desconectadas de su cache o se dibujen sobre el mapa.
- Regresiones para figuras tacticas, relampagos, fuego, luces dinamicas, cambios de rol y activacion/desactivacion de vision en la oscuridad.

## [2.6.0] - 2026-10-03

### Added

- Lineas y conos de fuego procedural, con dibujo en dos puntos, medidas de grilla y manivelas para editar extremos, alcance y direccion.
- Menu de fuego unificado en el panel lateral y contextual: linea, cono, circulo y lapiz para pintar; pincel con tamano en cuadros y preview bajo el puntero.

### Changed

- Propiedades de fuego adaptadas a cada forma, con ancho de linea y direccion del cono; se conservan circulos, anillos, zonas pintadas y controles de luz.
- La iluminacion de lineas y conos sigue toda su huella. Las nuevas formas reutilizan el renderer procedural y mascaras de combustible cacheadas, sin framebuffers intermedios.
- Persistencia y sincronizacion de las nuevas zonas por mapa, manteniendo lectura de escenas existentes y formato 2. Lectores antiguos pueden rechazar las variantes nuevas.
- Cierre de la ampliacion del spec 10, con documentacion de persistencia, propiedades e iluminacion actualizada.

### Fixed

- Crear un circulo, linea o cono de fuego o relampago restaura inmediatamente el cursor normal; cancelar un borrador tambien elimina su preview pendiente.
- Los halos amplios de lineas y conos usan contornos expandidos sin triangulos cruzados ni solapamientos del propio halo.

## [2.5.4] - 2026-10-03

### Added

- Relampagos procedurales en linea, cono y circulo para DM y Player View, con ramificaciones, chispas y movimiento compartido.
- Dibujo en dos puntos, medidas segun la grilla, edicion de extremos, alcance y direccion del cono; guias semitransparentes de area en ambas vistas.
- Controles de intensidad, velocidad, opacidad, visibilidad y chispas desde propiedades; accesos desde Efectos y el menu contextual.

### Changed

- Persistencia y validacion de relampagos por mapa, sincronizacion de Player View y presupuesto agregado de geometria sin framebuffers intermedios.
- Cierre del spec 35; version 2.5.4 solicitada explicitamente para esta entrega.

## [2.5.3] - 2026-10-03

### Changed

- Fuego procedural en GPU para DM y Player View: turbulencia continua y siluetas variables por efecto, sin repetir una animacion GIF en WebGL.
- El fuego se adapta a circulos, anillos y zonas pintadas cuadradas o hexagonales; conserva controles, iluminacion y compatibilidad con escenas existentes.
- Reloj de pared compartido y semilla estable por ID para mantener el movimiento al navegar, seleccionar, cambiar zoom o reorientar el mapa.
- Render directo con geometria y mascaras de combustible cacheadas, sin filtros ni framebuffers intermedios de fuego; cambiar opacidad o iluminacion no reconstruye la mascara.

### Fixed

- Las guias de edicion del fuego no se muestran en Player View.

## [2.5.1] - 2026-10-03

### Fixed

- Las zonas pintadas de los filtros Dia, Atardecer y Noche ya no crean framebuffers WebGL incompletos ni pierden cobertura al alejar la camara.
- La mascara de ambiente se compone como bitmap Canvas con alpha incorporado, evitando la composicion de alpha-mask de Pixi durante el zoom y mejorando su estabilidad en mapas grandes.

## [2.5.0] - 2026-10-03

### Added

- Filtros de ambiente a nivel de escena: Dia, Atardecer y Noche, aplicables a todos los mapas o a zonas pintadas por mapa.
- Mascaras de ambiente persistidas en `.ttrpgscene`, con pinceles topologico y circular, borrado, guia de tamano en cuadros y feedback rojo privado para el DM.
- Rasterizacion de mascara por mapa para mantener una cobertura uniforme, soportar borrado y evitar acumulacion visual en trazos superpuestos.

### Changed

- Player View reorienta mapa, filtro y mascara juntos al cambiar el norte de la escena.
- El zoom minimo compartido de DM y Player View ahora permite alejar hasta 10%.
- Escenas existentes cargan los nuevos campos de ambiente con defaults compatibles; el formato sigue siendo retrocompatible.

## [2.4.2] - 2026-09-08

### Fixed

- Player View conserva el tamano visual de los cuadros de grilla al navegar entre mapas con calibraciones distintas, compensando el zoom automaticamente.
- El cambio funciona tanto desde el navegador de mapas como al atravesar conexiones internas.

### Changed

- El diagnostico de zoom y pixeles por cuadro en Player View inicia oculto y se activa de forma opcional desde la barra de camara del DM.

## [2.4.1] - 2026-09-08

### Fixed

- El pincel de revelado de niebla muestra siempre bajo el puntero el circulo que delimita el area a descubrir.
- Las escenas nuevas y los datos de niebla sin radio explicito inician el revelado con un cuadro de la grilla inicial.

## [2.4.0] - 2026-09-08

### Added

- Contadores flotantes a nivel de escena para progreso, countdown y valores dinamicos, independientes del turnero de combate.
- Barras persistentes en `.ttrpgscene` con acciones rapidas para aumentar, disminuir y administrar cada contador.
- Publicacion selectiva en Player View, con eleccion al mostrar entre barra sin etiqueta o barra con etiqueta.

### Changed

- Los contadores del DM se muestran bajo el indicador de oscuridad dentro del canvas y se atenúan fuera de hover para no interferir con el mapa.
- Escenas antiguas cargan una coleccion vacia de contadores de forma retrocompatible.

## [2.3.0] - 2026-09-05

### Added

- Preview del viewport real de Player View sobre el canvas del DM al mover la camara principal del jugador.
- Marco auxiliar azul permanente cuando Player View esta desincronizada, representando el area real que ven los jugadores.
- Reporte efimero del tamano, orientacion y mapa activo de Player View para calcular el encuadre visible.

### Changed

- El preview de camara considera zoom, aspect ratio y orientacion de brujula para coincidir con la vista proyectada.

## [2.2.3] - 2026-09-05

### Changed

- Los botones para crear pin de habitacion, area de informacion y conexion de escena pasan al arbol de anotaciones del panel izquierdo, debajo del buscador y en disposicion vertical de ancho completo.
- El panel derecho de anotaciones queda enfocado en la visibilidad, evitando duplicar acciones de creacion.

## [2.2.2] - 2026-09-05

### Changed

- Los controles de orientacion de brujula reemplazan las letras `N`, `E`, `S`, `O` por flechas direccionales mas visuales.

## [2.2.1] - 2026-09-05

### Added

- Color de fondo infinito configurable por mapa desde el panel izquierdo, con swatch estilizado y reset al color default.

### Fixed

- Escenas antiguas y mapas sin color de fondo cargan con el default `#15181a`, manteniendo compatibilidad hacia adelante.
- Player View recibe el color del mapa activo y renderiza el mismo fondo infinito que el DM.

## [2.2.0] - 2026-09-05

### Added

- Brujula por mapa con orientacion cardinal en pasos de 90 grados y control dedicado en el panel derecho del DM.
- Overlay de brujula en el canvas del DM usando `assets/compass/compass.png`.
- Toggle discreto en Player View para mostrar u ocultar la brujula, manteniendola siempre con el norte hacia arriba.

### Changed

- Player View rota la presentacion completa del mapa y sus capas tacticas para mantener el norte configurado hacia arriba.
- Las mascaras de niebla de guerra y oscuridad cubren correctamente la vista al rotar el mapa proyectado.

## [2.1.1] - 2026-09-04

### Fixed

- El modal para crear conexiones ahora enlaza contra mapas ya cargados dentro de la escena, sin abrir archivos externos.
- Las conexiones internas entre mapas se guardan en background y se pueden desligar de ambos lados manteniendo la escena consistente.
- Specs y plan de escenas multi-mapa actualizados para reflejar el flujo interno de conexiones.

## [2.1.0] - 2026-09-04

### Added

- Escenas `.ttrpgscene` v2 con soporte para multiples mapas, navegador de mapas en el panel izquierdo y acciones para agregar mapas desde imagen o importar otro archivo de escena como mapa.
- Panel izquierdo con tabs horizontales para separar contenido de escena y contenido del mapa activo.
- Migracion automatica de escenas v1 de un solo mapa hacia escenas v2 al cargar o importar, incluyendo carga dinamica de archivos legacy conectados y conversion de sus conexiones en links internos entre mapas.

### Changed

- Notas, monstruos, NPCs, personajes y combat tracker quedan a nivel de escena; grilla, fog, oscuridad, luces, efectos, formas, tokens, labels y anotaciones quedan aislados por mapa.
- Al abrir una escena multi-mapa, la app activa el primer mapa del orden guardado.
- El navegador de mapas usa drag/drop para reorganizar mapas en lugar de controles de subir/bajar.
- El zoom/bloqueo de grilla inicia desbloqueado por defecto en nuevos mapas.
- El guardado bloquea escenas en borrador sin mapas y serializa siempre el formato v2 hacia adelante.

## [2.0.1] - 2026-09-03

### Fixed

- El editor enriquecido ya no roba el foco del titulo al volver a editarlo en notas, pines de habitacion y areas informativas.

## [2.0.0] - 2026-09-03

### Changed

- Nueva identidad visual con logo completo y simbolo vectorizado sin letras. La UI, ventana, Dock e instalador usan el mismo simbolo sin letras; su fuente editable `.ai` y el logo anterior se conservan como respaldo.
- Build de esta version exclusivamente para Apple Silicon (ARM64), con arquitectura explicita en `./scripts/build-dmg.sh arm64`.

### Notes

- Version 2.0.0 solicitada expresamente por el usuario como excepcion visual al versionado habitual. No hay ruptura de compatibilidad, migracion ni cambio del formato `.ttrpgscene`.
- No se modifica PixiJS, el mapa, las capas ni el comportamiento de la aplicacion.

## [1.10.0] - 2026-09-02

### Fixed

- Borrado de areas de informacion por ID actual desde Backspace/Delete y nueva papelera en el arbol, sin eliminar otra seleccion. Conservar bloqueo y edicion de texto.

### Added

- Grilla hexagonal seleccionable, con snap al vertice superior izquierdo, mediciones/caminos entre centros y pintado de fuego y anotaciones por hexagono.
- Persistencia de layout y geometria por celda, compartida con Player View; escenas antiguas conservan grilla y celdas cuadradas.

### Performance

- Geometria hexagonal compartida, aristas sin duplicados, cache de viewport y presupuesto de dibujo; alternar layout no reconstruye mascaras ni recarga assets.

### Notes

- Feature y ajuste de borrado aceptados para cierre en main como version minor 1.10.0. Compatibilidad de lectura con escenas V1 conservada; pinturas existentes mantienen su geometria.
- Specs y planes de grilla, render, persistencia, mediciones, fuego, anotaciones e integraciones actualizados. Verificacion: 350 tests, typecheck, lint y build correctos; smoke visual en navegador, sin repetir un smoke nativo completo de dos ventanas.

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
