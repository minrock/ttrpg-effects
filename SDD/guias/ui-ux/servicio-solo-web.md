# UX-62 — Retirada de Electron en la interfaz

**Consulta:** SDD 62 revisión 0.1; PM `/root`, TL `/root/tl_web_only`, 2026-11-17. **Estado de decisión:** acordada para la implementación de la petición del usuario. **Estado de implementación:** referencia previa; validación de la entrega pendiente. Esta ficha concreta el alcance de [SDD 62](../../specs/62-servicio-solo-web/spec.md) y el patrón [UI-002](catalogo.md) sin crear un diseño nuevo.

## Resultado observable

El editor DM conserva la cabecera web vigente: el nombre de la escena aparece como texto, sin flecha, desplegable ni nombre del mapa. Guardar y «Jugador» siguen como acciones explícitas de la barra; «Jugador» publica la escena al servicio para los jugadores. El menú de campaña conserva navegación entre escenas y acceso a campañas. En ancho estrecho, «Herramientas del editor» agrupa las acciones actuales y mantiene el retorno del foco a su disparador. No se incorpora una ubicación nueva para acciones que antes sólo ofrecía Electron.

La vista de jugador conserva su panel de mesa, pestaña Dados, controles de tirada pública y cierre autorizado. El hecho de retirar el modo autónomo no justifica sustituir esos componentes por otra ventana o control flotante.

## Fronteras de composición

| Elemento | Decisión para frontend | Verificación |
| --- | --- | --- |
| `WorkspaceHeader` | Renderizar una sola variante web; retirar detección de `navigator.userAgent`, `<details>` de escena y etiquetas «Abrir ventana de jugador». Mantener texto de escena, barra Guardar/Batalla/Contadores/Dados/Explorador/Inspector y «Jugador» como publicación. | Nombre largo con elipsis y `title`; ninguna flecha o botón de escena; publicación solo tras clic explícito. |
| Cabecera compartida y portal | Conservar acciones en la fila amplia y su agrupación responsive, estados `busy`/`enabled` e interacción de foco de los diálogos. | 1440/390 px y zoom 200 %, Tab, Escape, apertura/cierre de Herramientas, guardado y suspensión de acceso. |
| `ClientProvider` | Cliente web inyectado explícitamente; `null` expresa ausencia real y usa el estado recuperable existente. Eliminar búsqueda de `window.ttrpg` y fallback implícito. | Sin proveedor no aparece una sesión ficticia; cambio/desmontaje de cliente cancela suscripciones; Storybook usa `null` o doble explícito. |
| Lab de jugador | Mantener fixture sintética de `PlayerApp` en navegador con `ClientProvider` explícito; no escribir en `window.ttrpg`. | Montaje y desmontaje de la vista, sin puente global ni datos del servicio real. |
| Storybook | `Composiciones/WorkspaceHeader` muestra el comportamiento web único y callbacks sintéticos de acciones visibles. Retirar descripción «Electron conserva el menú de escena» y escenarios que dependan de user agent. | Story y autodocs sin menú nativo; guard de imports y build Storybook aprobados. |

## Ubicación, estados y accesibilidad

El nombre de escena no recibe foco ni comunica acción. Su texto completo queda disponible mediante `title`; el truncamiento visual no oculta la identidad al puntero. «Guardar escena» conserva nombre accesible, deshabilitación durante una operación y retorno de foco cuando abre un diálogo. «Jugador» usa nombre y tooltip **«Publicar escena para jugadores»**, se deshabilita cuando la edición no puede publicar y no se ejecuta por montaje, apertura de menús o presencia de invitados. El estado ocupado y errores siguen el flujo actual de servicio; no se anuncia éxito si la publicación falla.

En Herramientas, Escape cierra el grupo y devuelve foco al botón que lo abrió; seleccionar una acción lo cierra sin activar herramientas del mapa por propagación accidental. La suspensión del editor oculta e inhabilita el portal completo. El menú de campaña mantiene su propio foco y selección contextual; no se fusiona con el texto de escena.

Las acciones Nueva/Cargar/Importar/Exportar que aparecían en el desplegable exclusivo de Electron no se trasladan a la cabecera web. La creación y selección de escenas siguen en administración y menú de campaña. Los métodos internos del cliente web que tengan nombres legados pueden permanecer por contrato, pero no originan un control visible nuevo por esta retirada.

## Evidencia y límites

Se contrastaron [WorkspaceHeader](../../../src/renderer/src/components/workspace/WorkspaceHeader.tsx), [ClientProvider](../../../src/renderer/src/client/ClientProvider.tsx), [GameEditor](../../../src/web/GameEditor.tsx), [App](../../../src/renderer/src/App.tsx), [lab de jugador](../../../src/renderer/src/ui-lab/player-main.tsx) y [story de cabecera](../../../src/stories/compositions/workspace/WorkspaceHeader.stories.tsx). La variante web y el botón «Jugador» ya existen; esta ficha define cómo retirar el camino nativo. No se ejecutó navegador, Storybook ni pruebas para esta consulta. Frontend debe registrar validación del producto y actualizar las historias/pruebas afectadas antes de cerrar CA-02/03/04.
