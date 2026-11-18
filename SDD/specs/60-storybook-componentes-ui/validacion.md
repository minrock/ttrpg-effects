# Validación local — SDD 60

Fecha: 2026-11-14. Versión: **3.29.0**. Rama autorizada: `feature/spec-60-storybook-componentes-ui`, base `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`. Se conservan los cambios locales anteriores de SDD59. La validación corresponde al checkout local, sin commit, push, merge, publicación ni DMG.

## Resultado y cobertura

[Storybook local](http://127.0.0.1:6006/) funciona con **54 historias, 29 páginas autodocs, 12 familias de controles y 17 composiciones**. La introducción cuenta como una de las 54 historias. El [inventario](inventario.md) distingue lo publicado, las superficies acopladas y las exclusiones. [Índice de familias, fuentes e IDs](evidencia/catalogo.json).

El montaje de las 54 historias se recorrió en navegador mediante el panel Interactions: estado `Pass` en todas, [registro](evidencia/montaje-navegador.json). Ese dato prueba montaje, no 54 tests de comportamiento: **seis historias contienen assertions `play`**, ejecutadas en el navegador y verificadas como `Pass` (Button, Checkbox, Radio, SharedSwitch, Slider, SidebarAccordion). El resto se verifica mediante montaje y recorridos representativos descritos abajo.

## Criterio → evidencia

| Criterio | Evidencia y alcance |
| --- | --- |
| CA-01 | `pnpm storybook` en loopback 6006 y `pnpm build-storybook` con salida independiente `storybook-static/`; índice y 54 montajes verificados. |
| CA-02 | Inventario reconciliado: 29 familias con rutas productivas, consumidores, estados y enlaces; superficies sin historia con razón concreta; JSON generado a partir del índice final. |
| CA-03 | Las doce familias básicas importan componentes reales. Diez primitivas nativas y SidebarAccordion extraídos con adopción productiva mínima; SharedSwitch y PasswordInput reutilizados. Teclado, valores, callbacks, Controls y reset comprobados. |
| CA-04 | Composiciones reales: pestañas, menú, diálogo, feedback, herramientas, mapas, árboles, formularios y campañas; datos sintéticos y navegación local. Estados vacío/error/solo consulta/deshabilitado publicados donde corresponden. |
| CA-05 | CSS productivo y contexto de portales; viewports 390/1440, ampliación de preview 200 %, teclado/foco y addon a11y. Hallazgos y límites explícitos; no se certifica accesibilidad completa. |
| CA-06 | Proveedor `client={null}`, transporte Campaign cerrado en memoria, revisión de 83 módulos fuente y manifiesto de 2140 módulos de build sin motores ni entradas prohibidas. Código de producto sin imports de stories/Storybook. [Aislamiento](evidencia/aislamiento.json). |
| CA-07 | README y UI-004 explican comandos/autoría; versión/changelog actualizados; typecheck, lint, builds y 64 regresiones dirigidas pasan. |

## Comandos ejecutados

| Comando | Resultado | Registro |
| --- | --- | --- |
| `pnpm typecheck` | PASS | [Log](evidencia/typecheck-final.log) |
| `pnpm lint` | PASS | [Log](evidencia/lint-final.log) |
| `pnpm build-storybook` | PASS; incluye `pnpm check:storybook-imports` y guarda del grafo Vite | [Log](evidencia/build-storybook-final.log) |
| `pnpm build:web` | PASS; incluye typecheck | [Log](evidencia/build-web.log) |
| `pnpm build` | PASS; main, preload y renderer Electron compilados | [Log](evidencia/build-electron.log) |
| Regresiones dirigidas | **5 archivos, 64 tests PASS** | [Log](evidencia/regression-scoped.log) |

Comando exacto de regresión:

```sh
pnpm test src/renderer/src/App.workspace.test.tsx src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx src/renderer/src/components/workspace/WorkspaceChrome.test.tsx src/renderer/src/components/annotations/MapAnnotationsSection.test.tsx src/web/campaigns/CampaignPanel.test.tsx --maxWorkers 4 --exclude '.local/**'
```

La primera invocación sin exclusión encontró dos copias históricas de pruebas bajo `.local/`, sin su asset de logo; no eran suites del código vigente. Se repitió excluyendo esa carpeta privada y pasaron los cinco archivos objetivo. Se conservó el log original privado. Los builds emiten avisos de tamaño de chunks y directivas `use client` de dependencias; no hay fallo de compilación. Los logs adjuntos sustituyen la ruta absoluta del checkout por `<repo>`.

## Recorridos reales en navegador

- **Controles:** Button activado con Tab/Enter y callback; Checkbox y SharedSwitch con Espacio; Radio cambia selección exclusiva; SidebarAccordion con Enter. Slider pasa de 0,5 a 0,55 con ArrowRight, cambia a 0,8 desde Controls y vuelve a 0,5 con reset. Su `play` usa cambio sintético y espera la actualización de args; el teclado se comprobó por separado.
- **Formulario:** PasswordInput permite editar y mostrar/ocultar; MonsterTemplateFields permite editar Nombre y cambiar entre contenido y previsualización real sanitizada. Los campos conservan `valueAsNumber`, `checked`, validación y refs del consumidor.
- **Pestañas:** ArrowRight mueve Propiedades → Dados; End selecciona Mesa y mantiene foco. Los paneles de la fixture tienen IDs y `aria-labelledby` coherentes.
- **Menú:** HeaderDropdown abre, Configuración muestra la acción local, Escape cierra y devuelve foco al `summary`.
- **Diálogo:** ServiceDialog se abre desde disparador; Cancelar recibe foco; Escape cierra, muestra Cancelado y devuelve foco a Abrir confirmación. No abre diálogos nativos del sistema.
- **Herramientas:** FireProperties actualiza radio 10 → 15, selección de cono con `aria-pressed`, y Reiniciar devuelve 10. WorkspaceHeader y herramientas mantienen estado local, sin canvas.
- **Listas y árboles:** SceneMapsSection selecciona Cripta inundada, agrega Mapa 3 y anuncia importación sintética. MapAnnotationsTree filtra Agua y selecciona Agua profunda; Bloquear cambia a Desbloquear y deshabilita Eliminar; tras desbloquear, Eliminar deja la búsqueda sin anotaciones y anuncia el borrado local. Se corrigieron callbacks de la demo que inicialmente solo seleccionaban. Las acciones que exigirían mapa, archivos o editores externos se señalan como sintéticas.
- **Campañas:** Activas muestra una tarjeta, Todas muestra dos, Inactivas muestra Archivo; navegación campaña → arco → escena. Crear campaña con sistema Genérico incorpora una tarjeta y Reload descarta el cambio. Estados Empty, Failure con alerta/reintento y Readonly con Solo consulta inspeccionados. El cliente real habla únicamente con su fetcher de ejemplo.
- **Navegación del catálogo:** enlace Button de la introducción abre autodocs conservando el manager; los títulos y la búsqueda permiten localizar la familia por su símbolo.

## Responsive, accesibilidad y límites

CampaignPanel medido con sus estilos reales y fixture de dos tarjetas:

| Viewport Storybook | Ancho útil / scroll del body | Columnas de la lista |
| --- | --- | --- |
| 390 px | 375 / 375 px | Una de 304 px |
| 1440 px | 1425 / 1425 px | Dos de 501,5 px |

Sin desbordamiento horizontal. [Captura 390](evidencia/campaign-390.png), [captura 1440](evidencia/campaign-1440.png), [inspector 390](evidencia/inspector-390.png). El inspector conserva una columna legible de controles. SharedSwitch se inspeccionó y operó con preview ampliado al 200 % ([captura](evidencia/switch-zoom-200.png)); se restablecieron zoom 100 % y viewport normal. Esta ampliación del iframe no equivale a una prueba de zoom nativo de todo el navegador.

Addon a11y, escenarios concretos (no auditoría exhaustiva): RightSidebarTabs 0 violaciones/19 passes/0 inconclusos; PasswordInput 0/20/0; Introducción 0/17/0; Slider y ServiceDialog sin violaciones; FireProperties sin violaciones y un resultado inconcluso de contraste. La revisión inicial detectó paneles ARIA ausentes y un `main` anidado en fixtures; se corrigieron y se repitió el análisis.

Hallazgos actuales para iteraciones UX, conservados sin silenciar reglas:

1. **CampaignPanel:** el filtro seleccionado usa blanco `#fff` sobre `#4f8872`, contraste **4,11:1**, inferior a 4,5:1 para su texto de 16 px. Addon: una violación de contraste y un resultado inconcluso. Es comportamiento visual productivo existente, documentado en UI-004 para una mejora posterior.
2. **PasswordInput:** el nombre accesible del campo incorpora Mostrar/Ocultar contraseña al estar el botón dentro de su label. El escaneo automatizado no lo marca; queda documentado para mejorar el contrato accesible.
3. **Preparación de arco:** la fixture expone solo la colección vacía; Guardar NPC devuelve error sintético por mutación no implementada. No representa cobertura del CRUD de preparación.

No se iniciaron ni detuvieron los servicios de datos del usuario para probar Storybook. La independencia de API/DB se verifica mediante el transporte cerrado, proveedor nulo y revisión del grafo, no mediante desconectar servicios compartidos. No se abrió SQLite, IndexedDB ni archivos de partidas.

Las extracciones productivas preservan DOM, clases y eventos; las regresiones y ambos builds pasan. No se repitió el flujo nativo completo de Electron conectado/autónomo: el catálogo no demuestra paridad nativa. Tampoco se ejecutaron contratos DB, empaquetado DMG ni pruebas de Pixi/Three, ajenos a este cambio.

## Referencias de implementación

[UI-004](../../guias/ui-ux/storybook.md), [README](../../../README.md), [spec](spec.md), [plan](plan.md), [inventario](inventario.md). Documentación primaria consultada: [React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite), [args](https://storybook.js.org/docs/writing-stories/args), [interacciones](https://storybook.js.org/docs/writing-tests/interaction-testing), [accesibilidad](https://storybook.js.org/docs/writing-tests/accessibility-testing), [telemetría](https://storybook.js.org/docs/configure/telemetry).
