# Spec 39 - Interfaz VTT integrada

> **Sustitución implementada — SDD 56 / 3.20.0 (pendiente de integrar):** [Cámaras libres y foco de atención](../56-camaras-libres-foco-atencion/spec.md) sustituye la cámara dirigida por DM, el zoom remoto y la sincronización principal/virtual por navegación propia y un foco puntual que cambia solo el centro. Las referencias a cámara dirigida de este documento son históricas de 3.19.1 y quedan sustituidas por SDD 56. [Plan de sustitución](../56-camaras-libres-foco-atencion/plan.md).

> **Evolución integrada en 3.19.1 (main, 90dc50e):** [SDD 55 — Mediciones y áreas compartidas](../55-mediciones-compartidas/spec.md) extiende las herramientas del jugador en el servicio: difusión entre DM/jugadores y etiqueta de autor. En servicio se aplica la capa compartida descrita en esa spec; Electron autónomo mantiene las herramientas locales. Consultar su registro de validación para gates pendientes.

## Estado

2026-10-28. Implementacion DM y extension Player aceptadas por el usuario. Spec cerrada para la version 3.0.0, con commit, integracion en `main` y DMG autorizados. El plan registra la verificacion y el resultado del empaquetado; no se ha solicitado push en este cierre.

El salto mayor responde a la solicitud expresa del usuario. No cambia el formato `.ttrpgscene` ni se requiere una nueva migracion; las escenas existentes siguen siendo compatibles.

## Objetivo y alcance

Llevar la composicion aprobada de `SDD/specs/38-interface-lab/spec.md` a la aplicacion real: mapa protagonista, herramientas compactas, explorador e inspector discretos. El laboratorio sigue disponible como referencia independiente. No se trasladan sus fixtures ni sus servicios simulados a la aplicacion.

Es un cambio de interfaz, no de motores. Se preservan efectos, luces, medidas, niebla, oscuridad, mascaras, coordenadas, dados, persistencia y comunicacion con Player View. No cambia el formato `.ttrpgscene` ni su version.

## Distribucion

1. Cabecera compacta con identidad de TTRPG Effects, nombre de escena/mapa y menu de nueva/cargar/guardar. Accesos con iconos a batalla, contadores, dados y ventana real del jugador.
2. Rail izquierdo de seleccion, desplazamiento, medicion, areas, luces, niebla, fuego, relampago, agua, anotaciones, tokens y apuntador. Las familias muestran una barra contextual de subherramientas. Los iconos tienen nombres accesibles, tooltip y estado activo distinguible.
3. Explorador izquierdo con pestañas Escena y Mapa. Conserva todas las bibliotecas, mapas, notas, objetos y anotaciones existentes. No sustituirlas por listas demostrativas del lab.
4. Inspector derecho con Propiedades y Dados. Mantiene todos los controles de seleccion, grilla, escala, orientacion, ambiente y herramientas existentes. Las secciones son compactas y sin contenedores decorativos anidados.
5. Camara DM y camara de jugador claramente separadas, accesibles junto al mapa. Zoom DM no modifica el zoom de jugador. La sincronizacion, indicador de escala y recentrado del jugador mantienen sus reglas actuales.
6. Estado de escena en una franja inferior compacta. Nombres y rutas largos no desplazan controles; advertencias y errores siguen disponibles.

## Interaccion y paridad

- La matriz de capacidades de la spec 38 es obligatoria para la integracion. No retirar controles nativos por no existir en el lab.
- Los accesos nuevos llaman a las acciones existentes. Figuras/luces de creacion inmediata se crean en el centro visible del DM desde el rail; el menu contextual mantiene la posicion del click. Conservan despues sus manivelas y propiedades.
- Fuego, relampago, agua, caminos, pines y areas informativas conservan sus gestos actuales; no implementar motores de dibujo alternativos.
- Cambiar de familia cancela borradores incompatibles. Escape sale de desplazamiento/herramientas y cierra opciones. No interceptar escritura en inputs, editores o formularios.
- Cambiar pestañas o colapsar paneles no reinicia dados, historial, seleccion, busquedas ni editores. El canvas conserva su instancia y sus coordenadas.
- En ancho inferior a 1100 px los paneles funcionan como drawers, uno a la vez, inicialmente cerrados. El rail y la camara siguen accesibles. No hay overflow horizontal de pagina ni texto superpuesto.
- En pantallas estrechas, crear una figura no abre automaticamente el inspector sobre el resultado. Sus propiedades siguen accesibles desde el control del panel. Los contadores se desplazan debajo de la barra contextual cuando esta se muestra.
- Player View no recibe controles privados. Abrir jugador utiliza la ventana Electron existente, no un preview que simule publicacion.

## Brujula

- La aguja norte apunta exactamente arriba a 0 grados, derecha a 90, abajo a 180 e izquierda a 270. No usar la diagonal de un icono de brujula como base angular.
- El norte se diferencia por una aguja solida de acento, mas prominente que el extremo sur, y una `N` junto a su punta. La letra acompaña la posicion del norte pero permanece legible. No depender solo del color.
- En DM rota la indicacion, no el mapa. En Player View el mapa conserva su transformacion actual y la brujula permanece siempre norte arriba, incluso si recibe una orientacion distinta.
- La brujula no intercepta puntero ni tapa controles de camara; mantiene contraste sobre mapas claros y oscuros y transparencia moderada.
- El lab y la aplicacion comparten la misma representacion para evitar discrepancias.

## Player View: interfaz y herramientas locales

Extension solicitada antes del cierre de la interfaz. Player View adopta el mismo lenguaje neutro con acento menta, controles compactos e iconos accesibles, manteniendo el mapa a pantalla completa. El rail flota a la izquierda; camara/bloqueo y brujula permanecen discretos y separados de dados, contadores y combate.

- Medicion de linea mediante dos puntos y camino mediante puntos sucesivos, con preview y distancias calculadas por la grilla/unidad/regla diagonal del mapa. El camino se confirma con al menos dos puntos distintos; puede deshacerse el ultimo punto o cancelarse.
- Areas: circulo, cuadrado, rectangulo y cono. Se crean en el centro visible, quedan seleccionadas y se ajustan con las manivelas existentes o propiedades compactas. El cuadrado comienza con lados iguales; puede redimensionarse como rectangulo. El cono conserva su apertura habitual y permite cambiar direccion y longitud.
- Seleccion, movimiento, redimensionado y borrado solo de las figuras creadas localmente por el jugador. Limpiar retira exclusivamente esas figuras. Escape cancela el borrador/deselecciona; Delete/Backspace borra la seleccion local, sin interceptar escritura en controles.
- Estas herramientas no escriben en la escena, no se envian al DM ni se guardan en `.ttrpgscene`. Se mantienen al recibir actualizaciones del mismo mapa y se limpian al navegar/cargar otra escena o mapa y al cerrar la ventana. Se usa la identidad de viewport existente, no la URL de imagen: reemplazar imagen no borra las herramientas locales.
- Los objetos del DM siguen siendo de solo lectura. No se exponen edicion de tokens, luces, efectos, niebla, oscuridad, anotaciones privadas ni grilla. La lista de figuras editables es explicita; no se desbloquea globalmente el canvas del jugador.
- Las figuras usan coordenadas de mundo y las mismas transformaciones del mapa. Norte rotado, zoom, desplazamiento y comandos de camara del DM deben mantenerlas alineadas. Navegacion con mano/espacio y bloqueo de zoom local conservan sus reglas.
- Las etiquetas de distancia permanecen derechas en pantalla aunque el mapa rote; la geometria sigue la orientacion del mapa.
- El feedback del puntero se actualiza mediante el scheduler del viewport, sin re-render de React por cada movimiento. Se reutilizan geometria, mediciones, handles y renderer de figuras existentes.
- Los controles de herramientas pueden ocultarse para proyeccion y volver a mostrarse. Ocultarlos cancela el borrador y limpia la seleccion, no las figuras terminadas. Los controles privados y dados ocultos siguen excluidos del Player.

## Criterios de aceptacion

- Cabecera, rail, explorador, inspector y camaras siguen el lenguaje visual del lab aprobado.
- Todas las acciones de escena y herramientas anteriores permanecen accesibles y conectadas a los mismos servicios.
- Las cuatro orientaciones coinciden con la aguja y la N en DM; Player siempre muestra norte arriba.
- Colapsar paneles, navegar pestañas y abrir opciones no recrea el canvas ni reinicia dados.
- Verificacion de escritorio y viewport estrecho, teclado/foco, nombres largos y menus.
- Tests, typecheck, lint y build sin errores. No publicar version ni generar DMG hasta cerrar esta etapa con el usuario.

## Referencias

- `SDD/specs/38-interface-lab/spec.md`: propuesta y matriz de capacidades.
- `SDD/specs/06-sidebar-and-properties/spec.md`: inspector y navegacion.
- `SDD/specs/30-map-compass/spec.md`: orientacion y transformacion de Player View.
- `SDD/specs/37-dm-dice-rolls/spec.md`: dados y privacidad, sin cambio de reglas.

## Mesa en los laterales — 3.19.1

El inspector DM dispone de Propiedades, Dados y Mesa. Mesa reúne invitaciones, participantes y dibujos de jugadores en menús desplegables dentro de su flujo y desplazamiento. Cambiar de pestaña conserva estado y comprobaciones de acceso. El jugador dispone de un lateral derecho con chevrón de borde para datos de su mesa y dibujos; se eliminan los flotantes independientes de estado, salida y dibujos. El chevrón permanece disponible al contraer, y no se duplica como botón inferior.

Contrato y criterios CA-15–18 en [SDD 55](../55-mediciones-compartidas/spec.md); evidencia y límites en su [validación](../55-mediciones-compartidas/validacion.md).

## Cambio planificado de controles de cámara — SDD 56

Sustituir el grupo de cámara dirigida de jugador por **Foco de atención** (selección de punto), con tooltip y alternativa de teclado; retirar zoom remoto, recentrado con zoom y estados sincronizado/desincronizado. Conservar cámara del DM, candado local opcional del jugador y laterales. El foco no toca el zoom de ningún jugador ni mueve el foco de teclado al recibirse. [Contrato, interacción y accesibilidad](../56-camaras-libres-foco-atencion/spec.md).
