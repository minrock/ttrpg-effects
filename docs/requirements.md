# TTRPG Effects - Requerimientos iniciales

## Vision

Crear una herramienta portable para mesas fisicas de juegos de rol que permita proyectar un mapa mediante videobeam y controlar, en vivo, efectos visuales, iluminacion, mediciones y ayudas tacticas sobre el mapa.

La herramienta debe permitir cargar una imagen de mapa, calibrarla contra una escala fisica real, bloquearla como base de juego y luego agregar efectos interactivos con el mouse, como fuego, luces, linternas, areas de efecto, mediciones, lineas, conos, cubos y esferas.

El caso principal de uso contempla minis fisicas sobre la proyeccion. A futuro puede existir un modulo opcional de minis virtuales, marcadores o tokens, pero no debe ser una dependencia del flujo principal.

## Contexto de uso

- El usuario principal es un jugador o director de juego en una mesa fisica.
- El mapa se proyecta sobre una superficie real mediante videobeam.
- Los jugadores interactuan fisicamente sobre la mesa con minis reales, mientras la herramienta sirve como capa visual, tactica y de iluminacion.
- La herramienta debe funcionar durante una sesion sin interrumpir el ritmo de juego.
- Es importante poder preparar un mapa antes de la sesion y volver a cargar su estado posteriormente.
- La primera orientacion de reglas sera D&D 5e, manteniendo una base flexible para otros sistemas.

## Objetivos principales

- Cargar una imagen de mapa.
- Generar una grilla configurable sobre el mapa.
- Ajustar la grilla hasta que una celda proyectada mida 1 pulgada, 2.5 cm u otra escala fisica deseada.
- Ajustar la opacidad de la grilla.
- Bloquear el zoom/escala del mapa para evitar estropear la calibracion fisica de la grilla durante el juego.
- Navegar por el mapa usando pan y zoom.
- Permitir espacio externo alrededor de la imagen para centrar esquinas, bordes o areas fuera del mapa.
- Crear efectos visuales sobre el mapa con el mouse.
- Crear luces y efectos que iluminen u oscurezcan visualmente el mapa.
- Crear herramientas de medicion y formas tacticas.
- Agregar elementos mediante un menu contextual con click derecho.
- Guardar y recargar el estado completo de un mapa.

## Plataforma propuesta

La idea inicial es construir una aplicacion de escritorio tipo Electron por portabilidad.

Alternativas a evaluar:

- Electron: buena portabilidad, ecosistema web amplio, empaquetado familiar.
- Tauri: mas liviano que Electron, pero con mas consideraciones nativas.
- Aplicacion web local: facil de desarrollar y probar, pero puede requerir flujo adicional para abrir archivos y guardar estado.

Decision tentativa: Electron, salvo que aparezca una razon fuerte para preferir otra opcion.

La plataforma primaria de desarrollo y uso inicial sera macOS, pero la herramienta debe mantenerse portable para Windows y Linux en la medida en que la tecnologia elegida lo permita.

## Requerimientos funcionales

### Gestion de mapas

- Cargar una imagen desde disco.
- Soportar formatos de imagen comunes: PNG, JPG/JPEG, WEBP y HEIC.
- Mostrar la imagen como mapa base.
- Permitir mover el mapa en el lienzo.
- Permitir hacer zoom sobre el mapa.
- Permitir bloquear y desbloquear el zoom/escala del mapa.
- Al bloquear el mapa, se debe proteger la relacion entre imagen, grilla y medida fisica proyectada.
- El bloqueo del mapa debe permitir seguir navegando o usando herramientas sin cambiar accidentalmente el tamano real de las casillas.
- Permitir guardar el estado del mapa.
- Permitir recargar un estado guardado.

El estado guardado deberia incluir, como minimo:

- Ruta local de la imagen del mapa.
- Posicion del mapa.
- Escala o nivel de zoom del mapa.
- Configuracion de grilla.
- Capas o efectos activos.
- Mediciones o formas tacticas existentes, si aplica.

### Grilla

- Generar una grilla sobre el mapa.
- Usar grilla cuadrada en el MVP.
- Ajustar el tamano de celda visualmente arrastrando la grilla o un control de calibracion.
- Permitir ingresar valores numericos para calibracion fina.
- Priorizar el flujo de arrastrar hasta que la grilla coincida con la medida fisica real proyectada, y luego bloquearla.
- Evitar que el uso normal del mouse para navegar el mapa cambie accidentalmente el tamano de la grilla.
- El bloqueo debe impedir cambios accidentales de zoom que alteren el tamano fisico de la grilla proyectada.
- Configurar opacidad.
- Activar o desactivar visibilidad.
- Bloquear configuracion de grilla para evitar cambios accidentales.

Preguntas abiertas:

- Se necesita rotar la grilla para alinear mapas escaneados o fotos?
- Se necesita desplazar la grilla independientemente del mapa?
- La escala preferida sera 1 pulgada, 2.5 cm o 1.5 metros por casilla como presets?

### Navegacion y lienzo

- Permitir pan con mouse.
- Permitir zoom con rueda o controles.
- Permitir moverse fuera de los bordes de la imagen.
- Mantener un margen o espacio externo alrededor del mapa.
- Permitir centrar esquinas, bordes o zonas especificas del mapa en la proyeccion.
- Permitir que la interfaz de control y la proyeccion convivan en la misma ventana.
- Usar click derecho sobre el lienzo como mecanismo principal para abrir un menu contextual de acciones.

Preguntas abiertas:

- Se necesita modo pantalla completa exclusivo para el videobeam?
- Se necesitara en el futuro una pantalla de control separada de la pantalla proyectada?
- Hay controles que eventualmente deban ocultarse de los jugadores?

### Efectos visuales

Efectos iniciales deseados:

- Fuego animado.
- Luces.
- Linternas o conos de vision usados por jugadores.
- Posibles efectos ambientales.

Los efectos deberian poder colocarse con el mouse sobre el mapa.

Los efectos de iluminacion no deben ser solamente iconos u overlays planos: deben modificar visualmente la iluminacion del mapa. Por ejemplo, una antorcha, linterna o fuego deberia aclarar una zona, aplicar color/intensidad y mezclarse con una capa de sombra/oscuridad.

Requerimientos iniciales de iluminacion:

- Crear una capa global de oscuridad sobre el mapa.
- Permitir que las fuentes de luz revelen o aclaren zonas dentro de esa oscuridad.
- Crear fuentes de luz puntuales.
- Crear luces conicas tipo linterna o vision dirigida.
- Crear fuego animado que pueda sobreponerse en el mapa.
- Configurar radio, angulo, color, intensidad y opacidad.
- Permitir que luces y efectos se muevan despues de creados.
- Permitir eliminar, ocultar o editar luces existentes.
- Mantener los efectos activos como parte del estado guardado.

Preguntas abiertas:

- Se necesita una lista de efectos activos para ocultarlos, editarlos o eliminarlos?
- Deben existir presets por sistema de juego o por tipo de magia/habilidad?
- Las luces deben interactuar con paredes/obstaculos en una fase futura?

Notas sobre assets de fuego:

- Preferir un sprite sheet o secuencia de imagenes con fondo transparente.
- Preferir assets CC0 o generados especificamente para el proyecto.
- Candidatos iniciales encontrados:
  - OpenGameArt: "Animated flame / Fire sprite Sheet", marcado como CC0.
  - CodeManu VFX Free Pack, Creative Commons Attribution 4.0.
  - Brullov Fire Animation, utilizable en proyectos gratis y comerciales segun la pagina del asset.
- Si se incorpora un asset externo, guardar la fuente y la licencia junto al asset.

### Niebla de guerra y vision

La niebla de guerra puede esperar para una fase posterior, pero debe considerarse en el diseno para no bloquearla despues.

Capacidades futuras deseadas:

- Ocultar zonas no reveladas del mapa.
- Revelar areas manualmente durante la sesion.
- Asociar revelado o vision a luces, linternas o personajes.
- Dibujar paredes, puertas u obstaculos para limitar vision e iluminacion.
- Soportar vision basada en reglas de D&D 5e si el proyecto evoluciona hacia automatizacion tactica.

Fuera del MVP inicial:

- Linea de vision completa.
- Interaccion de luz con paredes.
- Vision automatica por token o mini virtual.

### Herramientas tacticas y medicion

Herramientas mencionadas:

- Medicion de distancia.
- Lineas.
- Conos.
- Cubos.
- Esferas o circulos.

Comportamiento esperado:

- Las formas tacticas deben poder persistir en el mapa hasta que el usuario las borre.
- Las formas deben poder seleccionarse despues de creadas.
- Debe existir una accion visible para borrar el elemento seleccionado.
- Debe existir un atajo de teclado para borrar el elemento seleccionado, por ejemplo Delete o Backspace.
- Debe existir snap-to-grid opcional para formas, mediciones y luces.
- El snap-to-grid debe ayudar a calcular correctamente que casillas o zonas reciben luz.
- La medicion debe soportar pies y sistema metrico.
- En D&D 5e, la diagonal debe medir 5 ft por defecto.
- El comportamiento de diagonales debe ser configurable.
- El sistema metrico debe permitir 1.5 m por casilla como equivalencia comun.

Preguntas abiertas:

- Los conos deben seguir reglas especificas de D&D 5e desde el MVP?
- Las esferas se representan como circulos 2D sobre el mapa o como volumen/diametro tactico?
- Los cubos se representan alineados a grilla o libres?
- Las formas deben encajar automaticamente en la grilla?

### Minis virtuales y marcadores

El uso principal sera con minis fisicas sobre la proyeccion. Sin embargo, el sistema podria incluir posteriormente un modulo opcional de minis virtuales, tokens o marcadores.

Capacidades futuras posibles:

- Crear tokens para personajes, enemigos u objetos.
- Mover tokens sobre la grilla.
- Asociar luces o vision a tokens.
- Ocultar tokens al jugador si existe una vista separada de control.
- Guardar tokens como parte de una escena.

Este modulo no es requerido para el MVP si complica el flujo de mesa fisica.

### Guardado y sesiones

- Guardar el estado de preparacion del mapa.
- Cargar una sesion guardada posteriormente.
- Idealmente evitar perder trabajo si la aplicacion se cierra.
- Guardar referencias locales a las imagenes, no empaquetar la imagen dentro del archivo de sesion en el MVP.

Preguntas abiertas:

- Se necesita historial de autosaves?
- Se necesitan multiples escenas/mapas dentro de una misma campana?

## Requerimientos no funcionales

- Debe ser fluida durante una sesion presencial.
- Debe ser facil de operar con mouse.
- Debe poder usarse en pantalla completa.
- Debe tolerar imagenes grandes de mapas.
- Debe funcionar primero en macOS.
- Debe mantenerse portable hacia Windows y Linux.
- Debe evitar controles intrusivos sobre la proyeccion.
- Debe permitir preparar y usar sin conexion a internet.

## MVP propuesto

El primer MVP podria incluir:

1. Aplicacion de escritorio o web local con lienzo.
2. Carga de imagen de mapa.
3. Pan y zoom.
4. Grilla cuadrada configurable en tamano y opacidad.
5. Bloqueo/desbloqueo del zoom/escala del mapa para proteger la calibracion fisica de la grilla.
6. Margenes externos navegables alrededor del mapa.
7. Menu contextual con click derecho para agregar herramientas y efectos.
8. Herramienta de medicion lineal.
9. Herramientas basicas de areas compatibles con D&D 5e: circulo/esfera 2D, cono, rectangulo/cubo.
10. Snap-to-grid opcional para herramientas tacticas y luces.
11. Medicion en pies y metros, con diagonal D&D 5e de 5 ft por defecto y configurable.
12. Luces basicas que modifiquen visualmente el mapa: punto de luz y cono de luz.
13. Capa global de oscuridad configurable.
14. Fuego animado superpuesto al mapa.
15. Seleccion y borrado de elementos tacticos o efectos.
16. Guardar y cargar estado de una escena usando rutas locales a imagenes.

Niebla de guerra, paredes, linea de vision y minis virtuales pueden entrar en hitos posteriores.

## Decisiones pendientes

- Plataforma final: Electron, Tauri o web local.
- Modelo de pantalla futuro: mantener una sola ventana o agregar control/proyeccion separados.
- Nivel de adaptacion a D&D 5e versus sistema generico.
- Nivel de fidelidad visual del fuego animado y otros efectos.
- Formato de guardado.
- Estrategia tecnica para iluminacion: canvas 2D, WebGL, PixiJS, Three.js u otra libreria.
- Estrategia para assets: CC0/externos con licencia o generados para el proyecto.

## Preguntas para refinar

1. Que tan estricta debe ser la compatibilidad con reglas de D&D 5e?
2. Necesitas que la grilla pueda rotarse o desplazarse independientemente del mapa?
3. Los conos deben seguir una plantilla exacta de D&D 5e o basta con un cono geometrico medido en casillas?
4. Las esferas se representan como circulos 2D sobre el mapa o necesitas ayuda visual de volumen/diametro?
5. Los cubos se representan alineados a grilla o libres?
6. Que tan importante es poder usarlo sin teclado, casi todo con mouse?
7. Debe haber atajos de teclado para uso rapido durante combate?
8. Quieres una biblioteca de efectos reutilizables?
9. Como imaginas el flujo ideal antes de una sesion y durante una sesion?
10. Se necesita historial de autosaves?
11. Necesitas multiples escenas/mapas dentro de una misma campana?
