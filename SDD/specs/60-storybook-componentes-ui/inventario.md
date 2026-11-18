# Inventario de UI React vigente

Fecha: 2026-11-14. Inventario reconciliado con código e índice del build de Storybook 10.6.7. Catálogo vigente tras SDD59 revisión 0.5, versión 3.29.1: **12 familias de controles y 19 composiciones, 59 historias y 31 páginas autodocs**; la introducción está incluida en las 59 historias. El corte histórico SDD60 3.29.0 conserva 54 historias/29 autodocs en su evidencia original. No equivale a catalogar cada pantalla completa.

[Catálogo local](http://127.0.0.1:6006/) · [Índice reproducible de cobertura](evidencia/catalogo.json) · [Validación](validacion.md).

Los nombres enlazan a la documentación ejecutable. Las fuentes se expresan desde la raíz del repositorio. Las primitivas nativas conservan el CSS contextual y atributos/eventos/ref actuales; no constituyen todavía un sistema de variantes visuales homogéneo.

## Controles reales y consumidores

| Nombre estable | Fuente productiva | Consumidores actuales | Estados publicados |
| --- | --- | --- | --- |
| [Button](http://127.0.0.1:6006/?path=/docs/controles-button--docs) | `src/renderer/src/components/ui/Controls.tsx` | MonsterTemplateFields / ReplaceMapImageModal | Default, Disabled |
| [Checkbox](http://127.0.0.1:6006/?path=/docs/controles-checkbox--docs) | `src/renderer/src/components/ui/Controls.tsx` | FireProperties / LightningProperties / ReplaceMapImageModal | Default, Disabled |
| [ColorInput](http://127.0.0.1:6006/?path=/docs/controles-colorinput--docs) | `src/renderer/src/components/ui/Controls.tsx` | FireProperties | Default, Disabled |
| [IconButton](http://127.0.0.1:6006/?path=/docs/controles-iconbutton--docs) | `src/renderer/src/components/ui/Controls.tsx` | FireTools / LightningTools / ReplaceMapImageModal | Default, Disabled |
| [NumberInput](http://127.0.0.1:6006/?path=/docs/controles-numberinput--docs) | `src/renderer/src/components/ui/Controls.tsx` | FireProperties / LightningProperties | Default, Disabled |
| [PasswordInput](http://127.0.0.1:6006/?path=/docs/controles-passwordinput--docs) | `src/web/AccountAccess.tsx` | AccountAccess / ChangePassword | Default, Invalid |
| [Radio](http://127.0.0.1:6006/?path=/docs/controles-radio--docs) | `src/renderer/src/components/ui/Controls.tsx` | ReplaceMapImageModal | Default, Disabled |
| [Select](http://127.0.0.1:6006/?path=/docs/controles-select--docs) | `src/renderer/src/components/ui/Controls.tsx` | App | Default, Disabled |
| [SharedSwitch](http://127.0.0.1:6006/?path=/docs/controles-sharedswitch--docs) | `src/renderer/src/components/SharedSwitch.tsx` | CampaignPanel / MapAnnotationsSection / App | Default, Disabled |
| [Slider](http://127.0.0.1:6006/?path=/docs/controles-slider--docs) | `src/renderer/src/components/ui/Controls.tsx` | FireProperties / LightningProperties | Default, Disabled |
| [TextInput](http://127.0.0.1:6006/?path=/docs/controles-textinput--docs) | `src/renderer/src/components/ui/Controls.tsx` | App / MonsterTemplateFields | Default, Invalid |
| [Textarea](http://127.0.0.1:6006/?path=/docs/controles-textarea--docs) | `src/renderer/src/components/ui/Controls.tsx` | MonsterTemplateFields | Default, Disabled |

`SharedSwitch` y `PasswordInput` ya eran componentes compartidos. Los otros diez símbolos se extraen en `ui/Controls.tsx` y se adoptan en los consumidores indicados; las historias importan exactamente esos símbolos. `SidebarAccordion` también se extrae de App y mantiene su consumidor. No se importan App ni AccountAccess completo como pantallas.

## Composiciones publicadas

| Nombre estable | Fuente productiva | Estados publicados |
| --- | --- | --- |
| [AdminShell](http://127.0.0.1:6006/?path=/docs/composiciones-adminshell--docs) | `src/web/AdminShell.tsx` | DM, Administrador; colapso/drawer interactivos |
| [AdminSidebar](http://127.0.0.1:6006/?path=/docs/composiciones-adminsidebar--docs) | `src/web/AdminSidebar.tsx` | DM con arco, Administrador, Partidas heredadas |
| [CampaignPanel](http://127.0.0.1:6006/?path=/docs/composiciones-campaignpanel--docs) | `src/web/campaigns/CampaignPanel.tsx` | Normal, Empty, Failure, Readonly |
| [MapAnnotationsTree](http://127.0.0.1:6006/?path=/docs/composiciones-mapannotationstree--docs) | `src/renderer/src/components/annotations/MapAnnotationsTree.tsx` | Normal, Empty |
| [MonsterTemplateFields](http://127.0.0.1:6006/?path=/docs/composiciones-monstertemplatefields--docs) | `src/renderer/src/components/aside/MonsterTemplateFields.tsx` | Editable |
| [RichTextPreview](http://127.0.0.1:6006/?path=/docs/composiciones-richtextpreview--docs) | `src/renderer/src/components/aside/RichTextPreview.tsx` | Editable, Readonly, Empty |
| [SceneMapsSection](http://127.0.0.1:6006/?path=/docs/composiciones-scenemapssection--docs) | `src/renderer/src/components/aside/SceneMapsSection.tsx` | Normal, Empty, Replacing Image |
| [SceneObjectsTree](http://127.0.0.1:6006/?path=/docs/composiciones-sceneobjectstree--docs) | `src/renderer/src/components/aside/SceneObjectsTree.tsx` | Normal, Empty |
| [FeedbackAlert](http://127.0.0.1:6006/?path=/docs/composiciones-feedbackalert--docs) | `src/renderer/src/components/aside/FeedbackAlert.tsx` | Error, Exito |
| [HeaderDropdown](http://127.0.0.1:6006/?path=/docs/composiciones-headerdropdown--docs) | `src/web/HeaderDropdown.tsx` | Interactivo |
| [RightSidebarTabs](http://127.0.0.1:6006/?path=/docs/composiciones-rightsidebartabs--docs) | `src/renderer/src/components/dice/RightSidebarTabs.tsx` | Interactiva |
| [ServiceDialog](http://127.0.0.1:6006/?path=/docs/composiciones-servicedialog--docs) | `src/web/dialogs.tsx` | Confirmacion |
| [DiceResultSummary](http://127.0.0.1:6006/?path=/docs/composiciones-diceresultsummary--docs) | `src/renderer/src/components/dice/DiceResultSummary.tsx` | Resultado, Compacto |
| [FireProperties](http://127.0.0.1:6006/?path=/docs/composiciones-fireproperties--docs) | `src/renderer/src/components/FireProperties.tsx` | Editables |
| [LightningProperties](http://127.0.0.1:6006/?path=/docs/composiciones-lightningproperties--docs) | `src/renderer/src/components/LightningProperties.tsx` | Editables |
| [SceneCounterBar](http://127.0.0.1:6006/?path=/docs/composiciones-scenecounterbar--docs) | `src/renderer/src/components/counters/SceneCountersOverlay.tsx` | Gestion DM, Vista Jugador |
| [WorkspaceHeader](http://127.0.0.1:6006/?path=/docs/composiciones-workspaceheader--docs) | `src/renderer/src/components/workspace/WorkspaceHeader.tsx` | Acciones |
| [WorkspaceTools](http://127.0.0.1:6006/?path=/docs/composiciones-workspacetools--docs) | `src/renderer/src/components/workspace/WorkspaceTools.tsx` | Interactivas |
| [SidebarAccordion](http://127.0.0.1:6006/?path=/docs/composiciones-sidebaraccordion--docs) | `src/renderer/src/components/SidebarAccordion.tsx` | Default |

`FireProperties`/`LightningProperties` incluyen sus herramientas `FireTools`/`LightningTools`. `CampaignPanel` expone también las tarjetas, filtros, breadcrumbs y formularios privados reales. `SceneCounterBar` representa la barra React, sin montar el overlay del mapa. El índice JSON histórico conserva los 54 IDs de 3.29.0. La [evidencia SDD59 0.5](../59-campanas-arcos-escenas/evidencia-ui-0.5.json) registra el índice vigente de 59 historias y las cinco nuevas variantes. CampaignPanel se monta dentro de AdminShell; el contexto `administration` y layout fullscreen evitan wrappers y padding del editor.

Los controles simples sincronizan args con Controls; las composiciones usan estado local. Se oculta Controls cuando el ejemplo personalizado no consume args; Reload story reinicia la fixture. Las acciones externas se convierten en estado o mensajes sintéticos, no en llamadas a servicios.

## Componentes aislables sin historia propia en esta entrega

| Símbolo / fuente | Cobertura o razón concreta |
| --- | --- |
| `aside/ModalBackdrop.tsx` | Contenedor; no es por sí solo un diálogo accesible. ServiceDialog cubre la composición de diálogo completa. |
| `DmDarknessStatusBadge.tsx` | Badge posicionado y específico del mapa; sin historia directa. FeedbackAlert cubre mensajes, no este símbolo. |
| `workspace/PlayerTools.tsx` | Herramientas especializadas del jugador; catalogación posterior con fixture propia. No cubierto por WorkspaceTools. |
| `workspace/AreaContextToolbar.tsx` | Composición de selección/área y patrones; se aplaza su fixture específica. |
| `counters/SceneCountersOverlay.tsx` | Se publica SceneCounterBar; el overlay completo depende del posicionamiento del workspace. |
| `annotations/MapAnnotationsSection.tsx` | Se publican SharedSwitch y MapAnnotationsTree; la sección completa no tiene historia propia. |
| `src/web/campaigns/ArcPreparationPanel.tsx` | El corte inicial no tenía historia autónoma. SDD59 revisión0.6 añade `Composiciones/ArcPreparationPanel` con CRUD sintético; véase ampliación posterior al final. |
| `CompassOverlay.tsx` / `NavigationLegend.tsx` | Brújula SVG dependiente de orientación y leyenda histórica oculta en workspace; sin historia directa. |

## Composiciones acopladas y límites

Estas superficies siguen registradas aunque no tengan una historia individual. Los controles que contienen se cubren por sus componentes o familias; no se promete aislar cada pantalla completa en esta entrega.

| Superficie | Acoplamiento / decisión |
| --- | --- |
| DicePanel | UI React aislable con controlador tipado falso, import type del hook; nunca usar hook real que monta motor |
| NoteEditor / notas / MapAnnotationModal | Tiptap y portales; requieren proveedor explícito sin cliente real. Toolbar privada se puede observar en NoteEditor |
| ImagePicker | Capacidades images y rutas Electron: fixture explícito necesario; no abrir archivos reales |
| Npc*, Monster*, PlayerCharacter* | Bibliotecas/fichas con imágenes y cliente: ampliar fixtures en una iteración específica; no representar con datos del usuario |
| CombatSetupModal / CombatTurnBar | Estado de batalla e imágenes vía cliente; composición especializada para historia futura |
| SceneLinkModal / ReplaceMapImageModal / SceneCounterManagerModal | Modales especializados con draft/callbacks y validación; reutilizan familias ya catalogadas |
| MonsterTemplateManagerModal | Gestión con callbacks y window.confirm; requiere historia controlada específica |
| DmAsidePanel / ArcPreparationUseSection | Gran composición/capacidades de biblioteca y preparación; empezar por subcomponentes aislados |
| AccountAccess / ChangePassword / AdminAccounts / AdminSystems / Participants | Formularios de servicio; preferir PasswordInput y ServiceDialog para trabajo de controles, transporte sintético si se amplía a pantalla |
| GameCatalog | Compatibilidad anterior; no representa catálogo principal actual |
| ScenePicker | Interfaz BrowserClient amplia; separar vista antes de historia directa |
| DraftRecovery / DraftArchive | Repositorios y sesión, IndexedDB: no montar con almacenamiento real |
| Menú contextual, footer y confirmaciones inline App | No componentes independientes; futura extracción de vista controlada si se trabaja específicamente sobre ellos |
| Cover/Breadcrumbs/PageNav/Formularios privados CampaignPanel | Se observan en composición real; futura extracción si se pide edición individual |
| Tooltip / Card / Badge / Spinner genéricos | No existe primitiva compartida actual: title nativo y markup contextual. No inventar API genérica en documentación |

## Exclusiones de render y entradas completas

No importar `App`, `PlayerApp`, `ServiceApp`, `GameEditor`, `LiveEditor`, `GuestEntry`, `MapViewport`, `DiceOverlay` ni `PublishedDrawingPreview`. `SharedDrawingPanel` arrastra `PublishedDrawingPreview` y también queda fuera. `ui-lab/InterfaceLab`, `ui-lab/main` y entradas web montan Pixi o Three; no reutilizar sus componentes privados ni su IconButton por importación indirecta.

## Contextos fieles

Estilos: `styles.css` → `workspace/workspace.css` → `src/web/service.css`; además CSS propio de la familia. Inspector: `.vtt-interface .control-sidebar .sidebar-accordion-content`. Servicio: `.service-page`, `.service-access` o `.service-dialog` según el componente. El proveedor de cliente nulo evita fallback a Electron. Los portales permanecen dentro del tema. Las historias usan callbacks y fixtures tipados en memoria, sin red de aplicación ni persistencia.

La ficha [UI-004](../../guias/ui-ux/storybook.md) describe el uso y los hallazgos pendientes de las familias publicadas. [Spec](spec.md), [plan](plan.md), [validación](validacion.md).

## Ampliación SDD59 revisión0.6 — 2026-11-15

En la entrega **3.30.0**, validada primero en copia aislada e incorporada posteriormente al checkout local, `Composiciones/ArcPreparationPanel` usa el componente productivo y un cliente CRUD en memoria (`src/stories/fixtures/preparation-fixtures.ts`). Variantes: **NPCs**, **Monstruos**, **Vacio**, **SoloLectura**, **SinPlantillas** y **ErrorDeCarga**. La recarga reinicia los datos; no llama a la API, no abre archivos y no monta editor/Pixi. `CampaignPanel` añade historias NPCs/Monstruos dentro del shell real; AdminShell/AdminSidebar muestran destinos separados.

El índice compilado de este corte contiene **67 historias y 32 páginas de documentación** (32 familias: 12 controles y 20 composiciones). No sustituye el inventario/evidencia histórica de 3.29.0; implementación, QA e incorporación del delta se registran en [validación SDD59](../59-campanas-arcos-escenas/validacion.md). Preview aislada durante validación: `http://127.0.0.1:6007/`. Las historias también quedaron incorporadas al checkout habitual el2026-11-15.


## Ampliación SDD59 revisión0.8 — 2026-11-15

`Composiciones/CampaignSceneMenu` incorpora el selector productivo de escenas por arco con transporte sintético. Cinco historias: **ActualYTextoLargo**, **Cargando**, **Vacio**, **ListaLarga** y **ErrorRecuperable**. El marco reproduce la cabecera sin padding administrativo; no importa GameEditor/App/Pixi ni usa datos reales. Índice compilado de3.31.0: **72 historias y33 páginas de documentación** (33 familias). [Validación del delta](../59-campanas-arcos-escenas/evidencia-ui-0.8.json); el inventario inicial permanece como evidencia histórica.

## Ampliación SDD61 — 3.32.0

| Componente | Fuente y consumidores | Catálogo |
| --- | --- | --- |
| ServiceDicePanel / DiceComposer | `components/dice/ServiceDicePanel.tsx`, `DiceComposer.tsx`; App y PlayerApp de servicio, compositor reutilizado por DicePanel autónomo | [Composiciones/DicePanel](http://127.0.0.1:6006/?path=/docs/composiciones-dicepanel--docs), diez estados por rol y disponibilidad |
| DicePublicStatus | `components/dice/DicePublicStatus.tsx`; cierre textual en App y PlayerApp, independiente de canvas/resumen | Composición anterior, sin motor |
| Select | `components/ui/Controls.tsx`; Material, grupo y tipo de daño | [Material](http://127.0.0.1:6006/?path=/story/controles-select--material) y MaterialEstrecho |

Build aislado:84 stories,34 autodocs; [evidencia SDD61](../61-dados-jugadores/validacion.md).

## Ampliación SDD59 revisión 0.9 — selector de plantillas

`Controles/SearchableSelect` añade un selector editable reutilizable en `src/renderer/src/components/ui/SearchableSelect.tsx`, consumido por `PreparationForm` dentro de `src/web/campaigns/ArcPreparationPanel.tsx`. Sustituye búsqueda y radios en el formulario de monstruos; el control Select nativo conserva sus consumidores. Composición y control usan datos sintéticos. [Contrato UI-007](../../guias/ui-ux/selector-plantilla.md) y [criterios CA-32–34](../59-campanas-arcos-escenas/spec.md#selector-de-plantillas-con-autocompletado--ajuste-09-2026-11-16). Validado el 2026-11-17 en 3.32.1. Historias: Seleccionado, ListaLarga, SinOpciones, Retenida y Deshabilitado; la composición añade SelectorDeListaLarga y PlantillaRetenida. Índice compilado: **91 historias y 35 autodocs**. El inventario de cortes anteriores sigue siendo histórico.

### Contadores sin acceso flotante — 2026-11-17

SDD33 FIX-01 /3.32.2: SceneCounterBar conserva GestiónDM y VistaJugador, añade SinContadores y usa contexto workspace con superficie de mapa local para evitar recortes. Build final: 92 historias y 35 autodocs. [Evidencia](../33-floating-dm-counters/validacion-fix-01.md).
