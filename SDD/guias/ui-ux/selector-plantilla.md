# UI-007 — Selector de plantilla con autocompletado

- **Fecha y consulta:** 2026-11-16, UX-SDD59-09, solicitud de mejorar «Plantilla» en alta/edición de monstruos.
- **Spec relacionada:** [SDD 59, ajuste 0.9, CA-32–34](../../specs/59-campanas-arcos-escenas/spec.md#selector-de-plantillas-con-autocompletado--ajuste-09-2026-11-16). Continúa [UI-006](catalogos-preparacion-arco.md) sin cambiar la preparación del arco.
- **Solicitante y acuerdo:** PM `/root` y TL `/root/tl_template_combobox` acordaron esta interacción con UI/UX `/root/ux_template_combobox`. PM asignó a UI/UX la edición única de esta ficha y del índice del catálogo.
- **Decisión:** acordada para este control. **Implementación:** `SearchableSelect` adoptado en el formulario real y Storybook en 3.32.1. **Validación:** QA real IAB de componente y `ServiceDialog` a 390/1440 px; pruebas y checks dirigidos superados. Electron nativo, zoom 200 % y lector de pantalla no probados.

## Objetivo, contexto y semántica

El DM elige **una** plantilla habilitada al preparar un monstruo de un arco. Es una elección de catálogo que se confirma explícitamente; escribir solo busca y no crea una plantilla. Se usa en agregar/editar monstruo dentro de `ServiceDialog`, en navegador y Electron conectado. NPCs, editor, jugador, Electron autónomo y catálogo global de plantillas quedan fuera del ajuste.

El valor de negocio es el **ID confirmado**, separado de la consulta visible. Filtrar, recorrer, cerrar o perder foco nunca cambia ese ID. El formulario envía la elección nueva solo al guardar; crear exige una plantilla vigente, mientras editar sin sustituir conserva el binding retenido. El servicio sigue siendo la autoridad de disponibilidad y permisos.

No usar el patrón para activación binaria, aceptación o ejecución de una acción: [UI-001](catalogo.md#ui-001--encendido-y-apagado) reserva el switch para encendido/apagado. El `Select` nativo de [Controls](../../../src/renderer/src/components/ui/Controls.tsx) sirve para elecciones sin búsqueda, pero no ofrece el filtrado requerido.

## Componente y ubicación

El componente React reutilizable [SearchableSelect](../../../src/renderer/src/components/ui/SearchableSelect.tsx) usa opciones `{id, name}`, ID confirmado, cambio explícito, etiqueta/ayuda, estado `disabled` y etiqueta alternativa para valor retenido. El consumidor es el campo **Plantilla** de [PreparationForm](../../../src/web/campaigns/ArcPreparationPanel.tsx). [Storybook](../../../src/stories/controls/SearchableSelect.stories.tsx) importa el mismo símbolo productivo, sin copia de markup para la historia.

Anatomía: etiqueta visible «Plantilla»; un campo de texto de ancho completo que muestra la plantilla confirmada o «Buscar y elegir plantilla»; chevron Lucide decorativo dentro del extremo derecho, con espacio reservado para que no se solape con el nombre; lista `listbox` anclada inmediatamente bajo el campo; contador de resultados y mensaje textual para cero coincidencias. El clic en el campo, incluida la zona del chevron, abre la lista. El chevron no agrega otra parada Tab. El desplegable permanece dentro de `<dialog>`; si un popup absoluto se recorta, usar flujo bajo el campo con altura acotada, sin portal al `body`.

Usar colores y bordes del servicio (`#232528`/`#191b1e`, texto claro y foco `#8ed5b6`) y reglas CSS acotadas al componente. Ancho `100%`, `min-width:0`, nombres largos legibles con salto de línea en opciones, zonas de puntero de al menos 40–44 px y lista vertical desplazable de aproximadamente 240 px como máximo, reducida cuando la altura útil sea menor. El diálogo puede desplazar su contenido; no debe aparecer scroll horizontal a 390 px ni al 200 % de zoom. La opción activa y la confirmada se distinguen con borde/indicador y texto, además de color.

**Inventario de acceso:** antes «Plantilla» aparecía como búsqueda + lista de radios en este formulario; la fila del monstruo solo muestra el nombre de su plantilla, y el catálogo global admin tiene otro alcance. Se sustituyó únicamente el control del formulario. No se añadió acceso en cabecera, barra, fila, menú contextual o editor.

## Interacción y estados

| Estado | Presentación y respuesta |
| --- | --- |
| Sin elección en alta | Invitación «Buscar y elegir plantilla»; Guardar inhabilitado y explicación visible cuando no hay plantillas habilitadas. Si el usuario intenta guardar sin valor, error junto al campo y foco en él. |
| Selección confirmada | Nombre visible al cerrar; el ID sigue estable hasta elegir otra opción. Al abrir, lista completa y texto seleccionado para que escribir lo sustituya; la opción confirmada conserva su marca. |
| Consulta abierta | Escribir filtra por nombre, sin autoelección ni cambio de ID. Se muestran todos los candidatos, incluidos los posteriores al décimo, dentro de un scroll acotado; contador «N resultados». |
| Sin coincidencias | «No hay plantillas coincidentes» y cero resultados; el ID previo sigue confirmado. Borrar o modificar la búsqueda recupera la lista. No hay una opción falsa «sin resultados». |
| Plantilla retenida ausente | Mostrar «Plantilla retenida (no disponible)» y aviso de que puede conservar la ficha sin cambiarla; el estado también cubre `templateId:null` con binding retenido privado. No mostrar ID crudo ni añadir opción fantasma seleccionable. Solo una elección vigente explícita sustituye el binding. |
| Guardado pendiente | Selector deshabilitado y valor confirmado visible; el formulario indica «Guardando…». Ante error o conflicto se conserva la elección local y se muestra error/reintento del formulario; «Recargar ficha» aplica la fuente vigente según el flujo actual. |

Al entrar por Tab, el campo recibe foco sin desplegar por sí solo. Clic, `ArrowDown` o `Alt+ArrowDown` abren todas las opciones; escribir abre y filtra. El foco DOM permanece en el input. `ArrowDown`/`ArrowUp` recorren opciones visibles y desplazan la activa dentro del listbox, sin desplazar la página. `Home`/`End` y demás teclas de edición siguen moviendo el cursor del texto; no se secuestran para navegar la lista. `Enter` con opción activa confirma, cierra y **no envía el formulario**. `Enter` durante composición IME no confirma ni envía. Clic en opción confirma, cierra y devuelve foco al campo; clic fuera del control cierra sin elegir.

`Escape` con lista abierta cancela la consulta, repone el nombre confirmado y cierra solo la lista. Debe consumirse para que el evento `cancel` del `<dialog>` nativo no cierre también el formulario. Con lista cerrada, `Escape` conserva la cancelación normal de `ServiceDialog`. `Tab` con lista abierta cierra sin cambiar ID, repone el texto confirmado y continúa al siguiente control; debe propagarse al trap de foco del diálogo. La lista no añade tab stops. Al abrir el diálogo, «Nombre» conserva el foco inicial actual; al cerrar el diálogo, `ServiceDialog` devuelve el foco al disparador. Ninguna de estas operaciones confirma o guarda el formulario por sí sola.

La implementación debe usar input con nombre accesible «Plantilla», `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` hacia el listbox abierto y `aria-activedescendant` solo cuando hay opción activa. Las opciones usan `role="option"`, ID estable y `aria-selected` para la confirmada; la opción activa tiene señal visual diferenciada. Ayuda, estado retenido, contador y errores se asocian con `aria-describedby`; el número de resultados se anuncia de forma breve al cambiar. El estado deshabilitado debe ser programático, no solo apariencia. Verificar lectura sin color, contraste, foco visible, puntero, teclado, zoom y lector de pantalla en el diálogo real.

## Referencias, ejemplo y código

- [Formulario](../../../src/web/campaigns/ArcPreparationPanel.tsx): en la base anterior observada el 2026-11-16 filtraba por nombre y mostraba hasta diez radios (`slice(0, 10)`). La versión 3.32.1 usa `SearchableSelect`; el guardado distingue alta de edición y omite `templateId`/binding si no cambia la plantilla.
- [ServiceDialog](../../../src/web/dialogs.tsx) y [estilos del servicio](../../../src/web/service.css): observación directa. Usa `<dialog>` nativo, foco inicial de «Nombre», devolución al disparador y trap de Tab; el CSS actual da tema oscuro y ancho máximo al diálogo. El evento `cancel` nativo exige comprobar Escape en integración.
- [UI-004 Storybook](storybook.md), [historia del selector](../../../src/stories/controls/SearchableSelect.stories.tsx) y [laboratorio existente](../../../src/renderer/src/ui-lab/): referencias del proyecto. La historia importa el componente productivo y usa nombres/IDs sintéticos, sin montar la app, transporte ni Pixi.
- [WAI-ARIA APG: patrón Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) y [ejemplo de autocompletado con lista](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/), consultados el 2026-11-16. Se adapta el input con lista, `aria-activedescendant`, foco en input, cierre con Escape y scroll de opción activa. El ejemplo admite texto libre; aquí solo es válido elegir una opción existente. APG advierte que su ejemplo ilustra el patrón y requiere pruebas con tecnologías de asistencia antes de usarlo en producción.
- [Select2, uso básico](https://select2.org/getting-started/basic-usage/), consultado el 2026-11-16: sirve como referencia del selector compacto con búsqueda. Su distribución se inicializa como función jQuery; no se incorpora jQuery ni su CSS/markup en la app React.

No se creó prototipo HTML: el componente React real y sus historias interactivas son la evidencia visual pertinente. El QA visual IAB de PM tiene capturas locales en `.local/validation/template-selector/` para el control final, el diálogo a 390 px y la lista larga a 390 px; [validación SDD 59 del ajuste 0.9](../../specs/59-campanas-arcos-escenas/validacion-ui-0.9.md) conserva el detalle y los límites. Esta ficha no equivale a una auditoría completa de accesibilidad.

## Decisión y alternativas

**Acordado:** selector editable con filtrado local y selección manual, dentro del formulario existente, con valor confirmado separado del texto. Se descartan el radio listado persistente, el límite oculto de diez resultados, un `<select>` nativo sin búsqueda, la selección automática al filtrar y Select2/jQuery. Añadir una dependencia de combobox o un portal fuera del diálogo ampliaría el alcance sin necesidad demostrada.

La ficha concreta la presentación de UI-006 para Plantilla; no sustituye sus reglas de preparación ni modifica la spec. PM comprobó en IAB que el primer Escape cierra la lista y deja abierto el `<dialog>`; la comprobación nativa en Electron sigue sin ejecutarse. No hay decisión de negocio pendiente.

## Criterios verificables y entrega

1. En alta y edición, solo hay un selector compacto «Plantilla»; un nombre posterior al décimo se encuentra y confirma con teclado y puntero. Filtrar, Tab, Escape, clic exterior y composición IME no guardan ni sustituyen el ID sin elección explícita.
2. `Enter` confirma una opción sin enviar; primer Escape abierto cierra lista y conserva el diálogo; segundo Escape cierra diálogo y retorna foco. Tab/Shift+Tab, opción activa visible, contador y sin coincidencias se comprueban en `ServiceDialog` real.
3. Edición con plantilla ausente, incluso `templateId:null` y binding retenido, permite guardar otros campos sin enviar reemplazo; elegir una vigente envía el nuevo ID/binding. Pendiente/error/conflicto conservan el estado correcto y no aparentan éxito.
4. El mismo componente productivo tiene historias interactivas de vacío, seleccionado, búsqueda, lista larga, cero resultados, retenida y deshabilitado. Comprobar la cascada de servicio y ausencia de desbordamiento a 390/1440 px; el zoom 200 % y Electron nativo son límites de validación pendientes, sin gate adicional para este ajuste.

**Cierre documental 2026-11-17:** frontend implementó el componente, su uso en el formulario y las historias en 3.32.1. PM comunicó 12 pruebas dirigidas, `pnpm typecheck`, `pnpm lint`, `pnpm build:web` y `pnpm build-storybook` superados; el índice construido tiene 91 stories y 35 autodocs. En IAB verificó control y `ServiceDialog` a 1440/390 px: filtro, Enter abierto/cerrado, Tab, Escape nativo, cero resultados, retenida, 18 opciones con flechas arriba/abajo y texto extenso sin overflow, todos PASS. PM confirmó también `pnpm build` de Electron superado; esto verifica compilación, sin smoke nativo. No hubo smoke Electron nativo, prueba de zoom al 200 % ni auditoría con lector de pantalla. PM conserva la evidencia de QA e integración en SDD 59; esta ficha registra implementación y validación local acotada, sin declarar integración Git o producción.
