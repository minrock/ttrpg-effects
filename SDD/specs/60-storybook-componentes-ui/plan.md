# Plan — 60 Storybook de componentes UI

**Spec fuente:** [spec.md](spec.md), revisión 0.1 aceptada. **Estado:** completo para revisión y despacho del PM; no certifica ejecución. **Fecha:** 2026-11-14. **Dependencias:** SDD 59 revisión 0.4 y catálogo UI/UX existentes en el checkout.

## Base inspeccionada

Rama `feature/spec-60-storybook-componentes-ui`, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`. SHA256 de la spec inspeccionada: `4af67cb3d7a9e6f93527e0c18475a217d6b60037b34018b83f2e161a65fcfc4e`. El PM comunica rama autorizada mediante Q-0008. Hay cambios locales extensos de SDD59, documentación y componentes; no se revierten ni se confunden con cambios de SDD60. Producto inspeccionado 3.28.2; entrega prevista 3.29.0.

Se contrastaron `AGENTS.md`, índice/estado/arquitectura/flujo SDD, contextos backend/frontend, plantillas y archivos citados abajo. El [inventario del PM](inventario.md), basado en las exploraciones del editor y servicio, complementa la inspección. No existe Storybook previo. React 19/Vite 7.3.3/TypeScript estricto; Electron tiene configuración y entradas distintas. `SharedSwitch` ya es reusable; muchas familias básicas son HTML inline con CSS contextual. `SidebarAccordion` es privado de `App.tsx`. No se importará App para documentarlo.

## Decisiones por capa

| Capa | Cambio previsto | Archivos y contratos |
| --- | --- | --- |
| Herramienta de desarrollo | Storybook 10.6.7 y React/Vite, docs y a11y en devDependencies; scripts local/estático; telemetry deshabilitada | Nuevos `.storybook/main.ts`, `preview.tsx`, soporte de decoradores; `package.json`, lockfile, tsconfig, ESLint, gitignore |
| Controles React compartidos | Extracciones pequeñas, adoptadas en consumidores reales; conservar nodos, clases y eventos | Nuevos `components/ui/*`, `components/SidebarAccordion.tsx`; `App.tsx`, Fire/LightningProperties, MonsterTemplateFields, ReplaceMapImageModal |
| Catálogo | CSF tipado, args/estado local, documentación y escenarios | Nuevos `src/stories/controls/`, `compositions/`, `fixtures/`, `introduction/` |
| Documentación | Inventario fuente → nombre → historia y exclusiones, guía de autoría y evidencia | PM: spec/inventario/validación/índice; UX: ficha y catálogo; configuración: guía README/changelog |

No cambian dominio, casos de uso, API, DB, IPC, render, formato de escena ni autorizaciones. Storybook es una entrada adicional de desarrollo, no una opción de arranque de la aplicación.

## Reutilización y contratos entre tareas

Las historias importan componentes productivos directamente. `SharedSwitch` conserva su API. `PasswordInput` se importa de `src/web/AccountAccess.tsx`; no hace falta extraer otra contraseña. Las nuevas primitivas se llaman `Button`, `IconButton`, `Slider`, `NumberInput`, `TextInput`, `Textarea`, `Select`, `Checkbox`, `Radio` y `ColorInput`. Sus props preservan atributos/eventos nativos tipados y refs cuando el consumidor los requiera; no introducen validación de dominio ni convierten los eventos en otro contrato innecesariamente. `IconButton` exige nombre accesible. El builder conserva valores por defecto y tipo submit/button del consumidor; no cambia la conducta de formularios al envolver botones.

Cada primitiva nueva debe tener consumidor productivo registrado. Fire/LightningProperties ofrecen botones de herramientas, rango, número, checkbox y color. App ofrece texto y select; MonsterTemplateFields ofrece textarea; ReplaceMapImageModal ofrece radio. SidebarAccordion se extrae de App sin cambiar su contrato `id/icon/title/isOpen/onToggle/children`. No se migra todo el repositorio. Las stories de composiciones no modifican estos archivos, evitando conflictos con las extracciones.

**Contrato del decorador global (propietario T-01, consumidores T-02/T-03):**

- `parameters.uiContext` admite `neutral | editor | service | workspace`; predeterminado `neutral`. Las stories no importan archivos de `.storybook` ni necesitan un wrapper compartido para compilar.
- Importar CSS en orden `src/renderer/src/styles.css` → `components/workspace/workspace.css` → `src/web/service.css`. Conservar CSS propio de componentes.
- `editor`: estructura `.vtt-interface > .control-sidebar > .sidebar-accordion-content`; `workspace`: `.vtt-interface` para cabecera/herramientas sin sidebar artificial; `service`: contenedor `.service-app` y contexto correspondiente a la story; `neutral`: superficie temática sin reglas de panel. Usar CSS exclusivamente del catálogo para neutralizar alturas/layout globales del shell, sin rediseñar controles.
- Todos los contextos envuelven `ClientProvider client={null}`. Un story que requiera cliente sintético lo provee dentro, explícitamente tipado. El decorador crea un target DOM propio, espera su montaje y lo entrega a `PortalTargetProvider`; el target vive dentro del mismo contexto de estilo.
- No fijar un ancho universal. Las stories de paneles pueden limitarlo localmente; las de listas conservan responsive real. Viewports de QA: 390 y 1440 px; zoom 200 % para fundamentos/navegación.
- La taxonomía final se sincroniza con UX-60: `Fundamentos/Introducción`, `Controles/<nombre>`, `Composiciones/<nombre>`; subgrupos Navegación/Feedback/Herramientas/Contenido si la cantidad lo requiere. Nombres estables en metadatos CSF, no derivados de textos circunstanciales.

T-02 publica las stories de todos los controles y SidebarAccordion. T-03 publica las composiciones restantes. T-01 publica introducción/decorador/configuración. Ningún builder modifica el directorio de stories de otro.

## Núcleo compartido, aislamiento y ciclo de vida

Navegador y Electron servicio siguen consumiendo componentes React mediante cliente HTTP; Electron autónomo usa los mismos controles y su cliente preload tipado. Storybook usa estado local o un transporte sintético: no necesita adaptador Electron ni repositorio SQL. Compartir una vista no simula autoridad de DM/admin/jugador.

`CampaignPanel` puede usar `CampaignClient(new HttpTransport(fetcherSintético))` con respuestas tipadas, datos inventados y revisión en memoria. Cada montaje obtiene fixture nueva; rutas desconocidas fallan explícitamente y nunca delegan al fetch global. No se sustituye globalmente fetch del manager de Storybook. Carga/error se simulan sin timers interminables; limpiar timers/listeners y respetar AbortSignal cuando corresponda. Reset y remontaje descartan cambios del ejemplo. No usar credenciales, cookies, IndexedDB, archivos reales ni `.local` como fixtures.

Guardas de construcción y resolución del catálogo deben rechazar `pixi.js`, `three`, `cannon-es`, módulos de `src/render/`, entradas App/PlayerApp/ServiceApp/GameEditor y main/preload/server. Registrar módulos realmente resueltos; buscar solamente nombres en JS minificado no demuestra aislamiento. Se permiten importaciones de tipos y reglas puras que no añadan motores al runtime. Una composición cuyo grafo incluya motor queda excluida con razón concreta hasta desacoplarla, sin crear stubs de Pixi para esconderlo.

Portales/diálogos deben cerrar al desmontar, devolver foco y no filtrar listeners entre historias. Markdown se procesa con sanitización existente. El usuario del catálogo es desarrollador; ningún rol demo autoriza acciones de servicio. Se conserva CSP/aislamiento del producto. Servidor de desarrollo en `127.0.0.1:6006`, sin publicación externa ni assets remotos. Storybook queda fuera de builds de producto y empaquetado; `storybook-static/` ignorado. No hay migraciones ni contratos DB a ejecutar en esta entrega.

## Acuerdo UI/UX

Consulta **UX-60**, respuesta de `/root/ux_spec59` al TL y PM el 2026-11-14. Reutilizar [catálogo](../../guias/ui-ux/catalogo.md), en particular UI-001 para SharedSwitch y UI-002 para menús. UX documentará UI-004 para Storybook. Cada página identifica «Componente reutilizable», «Patrón nativo vigente» o «Composición», fuente y limitaciones. CA-03 requiere todas las familias básicas con componente real o extracción adoptada; los patrones aún inline pueden constar adicionalmente en inventario sin fingir cobertura de esa condición.

Estados normal/seleccionado/deshabilitado y vacío/error/pendiente solo donde el control o composición los tenga. Etiqueta extensa, foco visible, Tab/Shift+Tab, Espacio/Enter, flechas para range/radio/pestañas según semántica, Escape y retorno del diálogo. Args y controles de Storybook deben afectar al ejemplo; las callbacks observables no sustituyen actualizar el estado. No se necesita prototipo paralelo ni rediseño para este catálogo.

## Secuencia, decisiones y riesgos

[Tareas](tareas.md): T-01 configuración, T-02 controles/extracciones, T-03 composiciones, T-04 integración/validación/documentación. Con contrato anterior estable, T-01–03 pueden iniciar simultáneamente en archivos distintos. Instalación de paquetes solo T-01; los otros esperan a su finalización para ejecutar comprobaciones. PM coordina builds/tests finales de forma serial para evitar colisiones en salidas compartidas.

No quedan decisiones de negocio pendientes. Ubicación exacta de primitivas y escenarios adicionales son decisiones internas reversibles dentro del ownership; cambios de alcance regresan al PM. Riesgos: CSS contextual, transitive imports de motores, mezcla de args y estado controlado, focus trap entre Docs stories y colisión de fixtures. Mitigaciones: contrato de contextos, grafo verificado, fixtures por montaje y abrir diálogos desde un disparador por historia. Si una story no puede ser fiel, documentar limitación concreta; no afirmar cobertura completa por existir un archivo.

## Validación prevista

| Criterio | Tareas | Recorrido y entorno | Evidencia esperada |
| --- | --- | --- | --- |
| CA-01 | T-01, T-04 | `pnpm storybook`, `pnpm build-storybook` nuevos; URL loopback | Arranque, salida estática e índice accesibles |
| CA-02 | T-02, T-03, T-04 | Reconciliar inventario/código/index.json | Nombre, ruta, story ID y exclusión por componente |
| CA-03 | T-02, T-04 | Todas las familias; modificar switch/slider/formulario y reiniciar | Consumidor real por extracción y callbacks/valores observados |
| CA-04 | T-03, T-04 | Pestañas, menú, diálogo, feedback, árboles, formulario, campañas sintéticas | Escenarios y estados con captura/recorrido |
| CA-05 | Todas | Navegador 390/1440/zoom; teclado/foco y addon a11y | Resultados manuales y automáticos separados, límites explícitos |
| CA-06 | T-01, T-03, T-04 | Guardas del grafo, fixtures, red del iframe sin API; API detenida/no requerida | Lista de módulos y revisión de recursos sin motores |
| CA-07 | Todas | Typecheck/lint/builds y suites afectadas; guía de autoría | Comandos, versión/changelog y documentación consistente |

Comandos de integración: `pnpm typecheck`, `pnpm lint`, `pnpm build-storybook`, `pnpm build:web`, `pnpm build`. Regresiones existentes seleccionadas con `pnpm test src/renderer/src/App.workspace.test.tsx src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx src/renderer/src/components/workspace/WorkspaceChrome.test.tsx src/renderer/src/components/annotations/MapAnnotationsSection.test.tsx src/web/campaigns/CampaignPanel.test.tsx --maxWorkers 4`; añadir tests dirigidos si una extracción altera una semántica observable. No crear tests que solo repitan markup. `storybook/test` puede comprobar interacción significativa en play; un play compilado no cuenta como ejecutado hasta abrir la story y registrar su resultado.

Matriz: navegador valida catálogo e integración en consumidor; Por decisión del PM, no se repite QA nativo completo si las extracciones conservan DOM/eventos y pasan regresiones y builds: Electron servicio y autónomo comparten esos controles y se registra ese límite, sin equiparar el iframe a una prueba nativa. Si cambia interacción, foco o DOM de manera sustancial, proponer smoke del consumidor afectado en ambos shells. No se requieren contratos SQLite/PostgreSQL porque no se modifica persistencia/identidad/propiedad; sus gates no se presentan como ejecutados. El TL solo comprobó rutas, contratos y cobertura documental; no inició servicios, builds ni pruebas de producto.

## Cierre

PM concilia el inventario real, registra criterio → evidencia en validacion.md y actualiza estado/índice. T-01 deja la versión/changelog preparados para 3.29.0 y el PM los confirma al cierre. No commit/push/merge/DMG sin permiso correspondiente. Catálogo implementado y validado localmente no equivale a integración Git.
