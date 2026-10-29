VEREDICTO: CAMBIOS

## Alcance

Revisión independiente de las correcciones UI de 004, ciclo 1, ronda 2, el 2026-10-29. Leídos perfil UI, solicitud/spec/build actualizados, identidad y diff de ronda; inspeccionados directamente ServiceApp, service.css y estilos del jugador. Los SHA-256 de `src/web/ServiceApp.tsx`, `src/web/service.css`, `src/renderer/src/PlayerApp.tsx` y `src/renderer/src/components/workspace/PlayerTools.css` coinciden con las huellas de ronda 2. Sin cambios en implementación, Git o tablero; sin lectura de revisiones ajenas ni delegación.

## Verificación real y cierre de hallazgos anteriores

Se arrancó el build API/web entregado, versión 3.5.0, mediante `pnpm start:api`, puerto temporal 8797, datos sintéticos del ensayo anterior en `/private/tmp/ttrpg-ui-review-004-8797`. Se utilizó Chrome exclusivamente mediante CUA. IAB no estaba disponible; DM y jugador se verificaron secuencialmente en la misma pestaña, con logout/login de roles. Esto no se presenta como humo simultáneo de dos navegadores. No se accedió a biblioteca personal.

- **UI-004-01 cerrado:** captura DM 1440×900 muestra «Copiar enlace» claramente legible. Estilos computados: texto rgb(235,237,239), fondo rgb(48,52,56), foco de teclado rgb(140,199,255) solid 2px. Se alcanzó el botón con Tab desde Mesa; la captura confirma el contorno. Escape permite cerrar el desplegable.
- **UI-004-02 cerrado respecto de la escala:** Player con escala activada muestra completo «Zoom 100% Cuadro 100 px» a 1440×900, 1024×768 y 1920×1080. Mesa se encuentra arriba a la derecha; la escala permanece abajo a la izquierda. La inspección y capturas confirman que ya no se cruzan, tanto con Mesa cerrada (1440 y 1920) como abierta (1024).
- Regresión inmediata revisada: mostrar brújula desde el control Player. Se encontró la colisión nueva descrita abajo.
- Mapa, contador, turnero inferior y herramientas locales siguen presentes durante la comprobación. A 1024×768, `scrollWidth=innerWidth=1024`, sin desplazamiento horizontal.

Las capturas se inspeccionaron en CUA y están en la conversación de herramientas. No se guardaron PNG; las medidas siguientes se obtuvieron del DOM renderizado real, como complemento de las capturas.

## Hallazgo pendiente

### UI-004-03 — P2: la nueva posición de Mesa cubre la brújula del jugador

Archivos: `src/web/service.css:39` y `src/renderer/src/components/workspace/PlayerTools.css:98`; composición en `src/web/ServiceApp.tsx`.

Pasos reproducidos:

1. Publicar un mapa desde DM y entrar como jugador.
2. Activar «Mostrar brujula» en los controles inferiores Player.
3. Observar la esquina superior derecha con Mesa cerrada; abrir Mesa para comprobar el estado expandido.

La corrección mueve Mesa a `top:70px; right:16px`. La brújula ya ocupa `top:16px; right:16px`, con tamaño 84×84. El distintivo de Mesa, incluso cerrado, tapa los 30 píxeles inferiores de la brújula. La parte superior ya coincide con Cerrar sesión; al añadir Mesa en el espacio inferior la brújula queda casi totalmente escondida, aunque el control indique «Ocultar brujula» y el árbol accesible contenga «Brujula: norte 0 grados». No es una ausencia de datos: las capturas muestran fragmentos de la flecha entre los controles superpuestos.

| Viewport | Brújula (x, y, ancho, alto) | Mesa (x, y, ancho, alto) | Estado |
| --- | --- | --- | --- |
| 1440×900 | 1340, 16, 84, 84 | 1298.02, 70, 125.98, 32.5 | Cerrada |
| 1024×768 | 924, 16, 84, 84 | 648, 70, 360, 97.5 | Abierta |
| 1920×1080 | 1820, 16, 84, 84 | 1778.02, 70, 125.98, 32.5 | Cerrada |

Las tres combinaciones tienen intersección. En 1440×900 Cerrar sesión ocupa x1293.45–1424, y16–60. Se distingue el solapamiento previo de Cerrar sesión del añadido por esta corrección: Mesa invade ahora la zona inferior restante. La corrección de la escala no puede considerarse libre de regresiones inmediatas mientras se ubique sobre otro overlay de navegación.

Corrección esperada: reservar espacios no superpuestos para brújula, Cerrar sesión y Mesa en el cliente servicio, conservando además escala, herramientas y mapa. Validar brújula visible con Mesa abierta/cerrada en los tres tamaños, incluyendo texto de desconexión más largo. No basta mover el problema a otra esquina ni subir el z-index, porque eso escondería el estado de conexión.

## Límites y limpieza

Revisión dirigida; no se repitieron pruebas completas, dados, dispositivos físicos, error de imagen ni corte/restauración de red. La evidencia de esos casos en build permanece atribuida al constructor. No se ensayó lector de pantalla; esta revisión es visual y las regiones anunciables corresponden a la revisión UX.

Se cerró la única pestaña propia, se restauró el viewport y se terminó la API temporal. Se notificó al orquestador que CUA está libre. Este informe se publica íntegro mediante temporal y renombrado. No se corrigió código durante la ronda.
