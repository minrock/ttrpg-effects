# Tareas técnicas — 60 Storybook de componentes UI

**Fuente:** [spec.md](spec.md) rev0.1. **Plan:** [plan.md](plan.md). **Estado:** definición completa para despacho por PM; estados de ejecución en Kanban, no inferidos de este documento. **Base:** 2026-11-14, `feature/spec-60-storybook-componentes-ui`, HEAD `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`, dirty SDD59 preservado. Hash fuente en el plan. Sin decisión de producto pendiente.

## Mapa

| ID | Resultado | Criterios | Perfil propuesto | Predecesora/condición | Definición |
| --- | --- | --- | --- | --- | --- |
| T-01 | Runtime Storybook aislado, decoradores y comandos | CA-01, CA-05–07 | frontend_builder configuración | Contrato uiContext de plan y rama preparada | Lista para proponer |
| T-02 | Controles reales, extracciones adoptadas y stories | CA-02, CA-03, CA-05, CA-07 | frontend_builder controles | Contrato uiContext; paquetes T-01 para comprobar | Lista para proponer |
| T-03 | Composiciones con fixtures sin API/motores | CA-02, CA-04–07 | frontend_builder composiciones | Contrato uiContext; paquetes T-01 para comprobar | Lista para proponer |
| T-04 | Integración, inventario reconciliado y evidencia | CA-01–07 | PM con soporte frontend/UI-UX | T-01, T-02, T-03 entregadas | Depende de tareas |

## T-01 — Configuración, aislamiento y guía de entrada

- **Objetivo y contexto:** agregar Storybook 10.6.7 React/Vite independiente; hoy no existe. Reutilizar CSS/proveedores productivos sin arrancar App. Contrato exacto `parameters.uiContext` y proveedores en plan.
- **Lectura:** package.json, tsconfig.json, eslint.config.js, electron.vite.config.ts, ClientProvider.tsx, client/PortalTarget.tsx y CSS del editor/servicio.
- **Escritura exclusiva:** nuevos `.storybook/**`, `src/stories/introduction/**`; package.json, pnpm-lock.yaml, tsconfig.json, eslint.config.js, .gitignore, README.md, CHANGELOG.md. Script nuevo de verificación del catálogo bajo `scripts/` si resulta necesario. Ningún archivo de producto React ni CSS productivo.
- **Pasos:** instalar mediante pnpm dependencias dev Storybook/framework/docs/a11y con versión coincidente; implementar scripts `storybook` loopback 6006 y `build-storybook`; desactivar telemetry en core y entorno del proceso. Configurar CSF en `src/stories/**/*.stories.tsx` y MDX si se usa; evitar importar configuración Electron/web. Incluir config/stories en comprobación TS/ESLint e ignorar salida. Decorador con los cuatro contextos y target de portal propio. Guardas del grafo excluyen motores/entradas/privilegios; documentar controles de args, estados, fuentes y autoría. Preparar minor 3.29.0/changelog de entrega.
- **Exclusiones:** componentes, consumidores, stories de controles/composiciones, SDD administrado por PM. Sin Chromatic/publicación ni conexión API.
- **Dependencias:** inicio independiente con contrato del plan; barrera integración T-02/T-03 para catálogo completo. Único instalador de dependencias; comunicar disponibilidad al PM.
- **Seguridad/ciclo:** client null, fixtures sin privilegios, portal desmontable, loopback, devDependencies fuera del bundle de producto. Guardas fallan explícitamente sin alias que oculten motores.
- **Entregables/cierre:** comandos funcionando, guía, decorador contractual, salida estática e informe de módulos/aislamiento. Comprobar configuración y typecheck/lint cuando paquetes disponibles; builds globales finales coordinados con PM. No declarar éxito de toda la spec por compilar configuración.

## T-02 — Familias básicas y acordeón con consumidores reales

- **Objetivo:** cumplir CA-03 con Button/IconButton/SharedSwitch/Slider/NumberInput/TextInput/PasswordInput/Textarea/Select/Checkbox/Radio/ColorInput; acordeón extraído para navegación. Conservar interacción y DOM actuales.
- **Entradas:** SharedSwitch real y PasswordInput de AccountAccess, inventario PM, UX-60/UI-001/UI-004, contrato decorador. No crear estilos de biblioteca paralela.
- **Lectura:** componentes actuales y CSS; App; FireProperties, LightningProperties, MonsterTemplateFields y ReplaceMapImageModal.
- **Escritura exclusiva:** nuevos `src/renderer/src/components/ui/**`, `src/renderer/src/components/SidebarAccordion.tsx`, `src/stories/controls/**`; modificaciones mínimas a `src/renderer/src/App.tsx`, `components/FireProperties.tsx`, `components/LightningProperties.tsx`, `components/aside/MonsterTemplateFields.tsx`, `components/aside/ReplaceMapImageModal.tsx`. Tests existentes asociados si se demuestra necesidad; no CSS global ni config. SharedSwitch/AccountAccess se reutilizan sin cambio de contrato.
- **Pasos:** extraer primitivas tipadas que transmitan atributos/eventos/clases/ref necesarios; adoptar cada una en al menos un consumidor indicado en plan. Extraer SidebarAccordion de App preservando props. Crear CSF tipadas con documentación fuente, estados, args y actualización controlada/reset; etiquetas accesibles y etiqueta larga. PasswordInput historia importa componente ya real; SharedSwitch conserva diseño acordado. SidebarAccordion story reside en controls aunque su título sea Composiciones/SidebarAccordion.
- **Exclusiones:** no migración masiva, redesign, API/estado de escena ni variantes sin uso real; no modificar stories de composiciones o su fixture. No sustituir checkbox por switch como parte de esta extracción.
- **Dependencias/barrera:** puede escribir con contrato uiContext estable; T-01 proporciona paquetes antes de ejecutar comprobaciones. T-03 lee componentes en paralelo y no los edita. Integración posterior a ambas entregas.
- **Seguridad/asincronía:** eventos conservan valueAsNumber/checked y validación de consumidor; no cambiar submit por button o viceversa; story cambia solo estado local. Preservar foco/ref/Escape de modal; no importar App desde stories.
- **Clientes:** los consumidores compartidos afectan navegador y ambos Electron, DM; no se añaden roles ni capacidades.
- **Validación/cierre:** tabla símbolo → consumidor → story por todas familias, typecheck, tests de App.workspace/ReplaceMapImageModal y regresiones afectadas. Teclado de switch/range/radio/acordeón, estados disabled y valores del formulario en navegador; el PM aplica la matriz y límites de Electron del plan. No cerrar si una familia solo tiene HTML duplicado en demo.

## T-03 — Composiciones auténticas con fixtures tipadas

- **Objetivo:** CA-04 y cobertura del inventario sin cargar motores. Navegación/feedback/herramientas/contenido deben poder manipularse y reiniciarse.
- **Lectura:** `components/dice/RightSidebarTabs.tsx`, web/HeaderDropdown.tsx, web/dialogs.tsx, components/aside/FeedbackAlert.tsx, workspace/WorkspaceHeader.tsx y WorkspaceTools.tsx, FireProperties.tsx, LightningProperties.tsx, counters/SceneCountersOverlay.tsx (SceneCounterBar), dice/DiceResultSummary.tsx, aside/SceneMapsSection.tsx, SceneObjectsTree.tsx, annotations/MapAnnotationsTree.tsx, aside/RichTextPreview.tsx, MonsterTemplateFields.tsx, web/campaigns/CampaignPanel.tsx y infrastructure/browser/campaign-client.ts/http.ts.
- **Escritura exclusiva:** nuevos `src/stories/compositions/**` y `src/stories/fixtures/**`. No modificar componentes productivos ni dependencias/config; informar al PM si un acoplamiento exige extracción adicional. No story duplicada de SidebarAccordion, propiedad T-02.
- **Pasos:** historias representativas de las composiciones citadas, datos sintéticos de DTO reales y callbacks con estado. CampaignPanel recibe CampaignClient/HttpTransport con fetcher cerrado en memoria; documentar métodos soportados y fallar los desconocidos sin red. Mantener revisión/selección del ejemplo coherente; vacío/error/carga/listado y formulario cuando existen. Herramientas usan escenas mínimas de dominio sin canvas. Listas/árboles muestran selección/expandir; formularios editan datos; abrir/cerrar diálogos desde disparador; markdown con sanitizador productivo. Usar imports de tipos para evitar hooks/motores transitivos.
- **Exclusiones:** MapViewport, App, PlayerApp, ServiceApp, GameEditor, GuestEntry, DiceOverlay, PublishedDrawingPreview y laboratorios que monten motores. React DicePanel es opcional si fixture de controller permanece tipada y el grafo es limpio. No clonar el markup de CampaignPanel.
- **Dependencias/barrera:** escritura paralela al contrato uiContext; paquetes de T-01 para comprobación; versión final T-02 de componentes antes de validar todas composiciones.
- **Seguridad/asincronía:** fixture por story/montaje, sin DB/IndexedDB/Electron/credenciales; handlers sintéticos no hacen fetch real, limpian timers y no aceptan respuestas tardías tras desmontaje. Portales dentro del target temático, listeners limpios y foco restaurado.
- **Entregables/cierre:** listado de story IDs/fuentes/estados y exclusiones; todas composiciones montan sin red ni errores; play o recorrido real de menú/diálogo/pestañas/formulario. Typecheck/lint y build Storybook coordinados por PM; a11y con límites documentados, no silenciar violaciones globalmente.

## T-04 — Integración, comprobación y cierre documental

- **Responsable propuesto:** PM coordina comprobación; cada builder corrige únicamente su ownership. UX concilia UI-004 con evidencia. El TL no ejecuta esta tarea.
- **Escritura PM:** inventario.md, validacion.md y evidencia de esta spec, estado/índice SDD. No duplicar tablero ni usar plan como estado de ejecución.
- **Dependencias:** T-01–03 con instalación terminada y archivos estables; el PM serializa builds/suites y puerto 6006.
- **Pasos:** reconciliar código/índice JSON/story IDs; verificar familias básicas y composiciones, apertura sin API y módulos resueltos; ejecutar comandos y matriz del plan; inspección responsive/teclado/a11y; revisión de compatibilidad en los tres modos, con smoke adicional si el delta lo requiere; revisar que producto no importa stories. Registrar fallos/preexistencias y regresar a owner exacto. Confirmar versión/changelog y guía de añadir componente. Mantener servidor local disponible si entrega URL al usuario.
- **Cierre observable:** CA-01–07 tienen evidencia o limitación explícita que impida cierre; no aceptar mocks como prueba Electron ni compilación como interacción ejecutada. Sin cambios Git no autorizados.

## Propiedad y paralelismo

| Recurso | Owner propuesto | Consumidores/condición |
| --- | --- | --- |
| .storybook, dependencias, config, puerto y salida | T-01 hasta integración; PM coordina luego | T-02/T-03 esperan instalación para checks; no instalaciones simultáneas |
| Primitivas/Accordion/App/Fire/Lightning/MonsterTemplateFields/ReplaceMapImageModal | T-02 | T-03 solo importa, preserva contrato actual |
| stories/controls y SidebarAccordion story | T-02 | Sin editar composiciones |
| stories/compositions y fixtures | T-03 | Fixtures no se usan desde producto |
| stories/introduction y README/changelog | T-01 | PM concilia al cierre |
| Spec/inventario/evidencia/índice | PM T-04 | TL solo plan/tareas; UX ficha/catálogo |

Tanda P-01: T-01/T-02/T-03 simultáneas tras aceptar contrato del plan; ownership disjunto, dependencias nuevas gestionadas por un solo owner, sin DB/servicios. P-02: T-04 tras entrega de las tres; orden instalación → typecheck/lint → pruebas dirigidas → builds → QA navegador/Electron → cierre. Camino crítico: T-01 habilita checks, T-02/03 habilitan cobertura, T-04 integra. El PM ajusta número de agentes a capacidad; estas tareas no son órdenes de despacho.

## Cobertura y devolución

CA-01 → T-01/T-04; CA-02 → T-02/T-03/T-04; CA-03 → T-02/T-04; CA-04 → T-03/T-04; CA-05 → todas; CA-06 → T-01/T-03/T-04; CA-07 → todas. Matriz de recorridos y comandos en plan.md.

T-01/02/03 están suficientemente definidas para asignación; T-04 espera sus entregables. UX-60 resuelta, sin prototipo pendiente. Verificado documentalmente: fuentes existentes, rutas nuevas marcadas, IDs únicos, dependencias sin ciclos, cobertura CA-01–07, ownership disjunto y conservación de cambios previos. No se ejecutaron tests/builds/servicios para planificar ni se modifica la spec fuente.
