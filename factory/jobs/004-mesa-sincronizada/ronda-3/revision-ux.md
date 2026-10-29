VEREDICTO: APROBADO

# Revisión UX — 004 Mesa sincronizada privada

Fecha: 2026-10-29. Ciclo 2, ronda global 3. Revisión independiente según `.codex/agents/ux.toml`, acotada a los cambios posteriores a la aprobación UX de ronda 2: composición y distribución Player web, y alerta de cierre de sesión fallido. Se revisaron solicitud, requisitos UI de spec, build actualizado, retrabajo autorizado, identidad/huellas de ronda y fuentes pertinentes. AGENTS.md y las condiciones del perfil se conservan. No se leyeron informes de otros revisores ni se modificó código, Git o tablero.

## Resultado

No se encontraron hallazgos UX pendientes en el cambio revisado. Se preservan los cierres UX-1 y UX-2 de ronda 2: no hay cambios posteriores en la lógica de cámara/presencia, y las regiones de anuncio continúan fuera del detalle colapsable.

### Error de cierre de sesión visible y recuperable

En `src/web/ServiceApp.tsx:42–47`, el error del jugador se renderiza como párrafo `role="alert"`, hijo directo de Mesa y anterior a `details`. No depende de que Mesa esté abierta ni se oculta con ella. El botón Cerrar sesión sigue disponible para reintentar. El flujo espera confirmación del servicio antes de limpiar la sesión; ante un rechazo conserva Player y presenta el error, sin afirmar que se ha cerrado correctamente.

`src/web/service.css:21` mantiene ese párrafo en flujo normal, con ajuste de palabras, altura acotada y overflow. Se eliminó la posición fija anterior que podía colocarlo sobre la brújula. El usuario puede leer el fallo sin tener que descubrir y abrir un panel; la semántica de alerta permite anunciarlo.

Se inspeccionó y ejecutó la nueva regresión de `ServiceApp.test.tsx`: respuesta 503 al logout, Player conservado, texto del fallo presente, `role="alert"`, Mesa cerrada y ausencia de un ancestro `details`. jsdom verifica la estructura y transición, no la geometría del render.

### Accesibilidad y controles preservados

Las regiones persistentes `status` y `alert` del transporte siguen siendo hermanos de `details` (`ServiceApp.tsx:44–45`). No llevan `hidden` o `aria-hidden`; la clase para ocultarlas visualmente sigue usando recorte, sin retirarlas del árbol accesible. El error visible de logout es una región distinta y no hereda esa clase.

Se conserva el handler de Escape que cierra Mesa y devuelve foco al summary, junto con la detención de atajos canvas dentro de Mesa. El nuevo contenedor `service-player-workspace` no añade `inert`, oculta controles ni sustituye nombres accesibles. El botón Cerrar sesión mantiene texto y estilo de foco.

La distribución separa logout, brújula y Mesa mediante posiciones verticales, con regla de brújula acotada al contenedor del servicio. No cambia z-index ni elimina controles para resolver el conflicto. La documentación describe las filas separadas y conserva las instrucciones de conexión y estado.

## Evidencia propia y evidencia atribuida

- **Ejecutado en esta revisión:** `pnpm test src/web/ServiceApp.test.tsx` → **1 archivo / 8 pruebas PASS**, 868 ms, sin warnings en la salida. Incluye acceso, sesión caducada, recuperación, foco de diálogo, estados live con Mesa cerrada y el nuevo caso de logout fallido.
- **Congelación comprobada:** comparación SHA-256 entre huellas de rondas 2 y 3. Solo cambiaron `docs/synchronized-table.md`, `src/web/ServiceApp.tsx`, su test y `src/web/service.css`; el contenido actual de los cuatro coincide con las huellas de ronda 3. Los módulos de cámara, Player y transporte aprobados antes permanecen iguales.
- **Evidencia del constructor en build.md, no repetida aquí:** matriz CUA de tres resoluciones (1024×768, 1440×900, 1920×1080), Mesa abierta/cerrada y conexión activa/caída, con brújula explícitamente visible. Registra filas separadas, ausencia de intersecciones, Escape/foco y cero scroll horizontal. El caso adicional de logout con API apagada a 1024×768 registra error visible con Mesa abierta y cerrada, sin cubrir brújula, escala o controles.
- La suite completa de 1135 pruebas y builds generales de ese documento preceden al último ajuste del error; el constructor distingue correctamente la regresión nueva de 8 pruebas y el build web final. No se atribuye una segunda suite completa no ejecutada.

## Límites y cierre

Esta ronda no abrió CUA ni inició API: se evitó repetir la matriz visual ya documentada y se verificó independientemente la estructura accesible y el comportamiento de fallo mediante código/pruebas. No se ejecutó lector de pantalla real ni se escucharon anuncios. Las afirmaciones geométricas anteriores están expresamente atribuidas al constructor, no a observación propia.

No se repitieron reconexión/promoción, dados, privacidad, bibliotecas o Electron, porque las huellas muestran que sus fuentes no cambiaron desde la aprobación previa. Se mantienen las verificaciones y límites de la revisión UX de ronda 2. No quedan procesos o pestañas propios que cerrar.

La aprobación se limita a UX en esta ronda y no sustituye los restantes veredictos ni autoriza merge. Única salida escrita: este informe, publicado mediante temporal y renombrado.
