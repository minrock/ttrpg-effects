# Validación del selector de plantillas — ajuste 0.9

**Fecha:** 2026-11-17. **Versión:** 3.32.1. **Estado:** implementado y validado localmente; sin commit, push ni merge. Solicitud y decisión funcional del 2026-11-16; CA-32–34 de [spec](spec.md#selector-de-plantillas-con-autocompletado--ajuste-09-2026-11-16), tarea T-16 y [UI-007](../../guias/ui-ux/selector-plantilla.md).

## Resultado por criterio

| Criterio | Evidencia y resultado |
| --- | --- |
| CA-32 | `SearchableSelect` sustituye búsqueda y radios en `PreparationForm`. QA real en navegador integrado: filtro por nombre, elección por Enter, cancelación conserva valor y lista de 18 opciones completa; alcanzada opción 17 y regreso a 1 por flechas. Sin truncado a diez. |
| CA-33 | 12 pruebas dirigidas de componente y preparación aprobadas por frontend: creación con binding, edición retenida con templateId null, teclado/IME y regresiones de lista/CRUD existentes. QA PM en diálogo nativo: Enter con lista abierta elige y con lista cerrada no guarda; Escape abierto conserva diálogo/valor, Escape cerrado cancela y retorna foco a Agregar; Tab enfoca Elegir imagen. Estados sin coincidencias y retenida observados. |
| CA-34 | Control productivo `Controles/SearchableSelect` con cinco historias y dos nuevas variantes de `ArcPreparationPanel`; build compilado con 91 historias y 35 autodocs. QA 1440×900 y 390×844: flecha con espacio, nombres largos legibles y sin overflow; a390, diálogo clientWidth/scrollWidth350 y selector302. Lista desplaza internamente manteniendo scroll de documento0. Patch/changelog registrados. |

## Validación ejecutada

- Frontend: `pnpm vitest run --exclude '**/.local/**' src/renderer/src/components/ui/SearchableSelect.test.tsx src/web/campaigns/ArcPreparationPanel.test.tsx` — **12/12 PASS**; ESLint focal, `pnpm typecheck` y `git diff --check` PASS. Resultados comunicados al PM por el ejecutor; no se atribuyen a ejecución propia del PM.
- PM: `pnpm lint`, `pnpm build:web` final, `pnpm build`, `pnpm build-storybook` (incluye guarda de imports) y `git diff --check` — **PASS**. Typecheck vuelve a formar parte de los builds. Permanecen avisos de tamaño de chunks y directivas `use client` de dependencias, sin errores de compilación.
- Revisión TL de lectura y correcciones: Enter/IME, disabled, placeholder real, blur, listbox vacío con destino ARIA válido y activo reconciliado. Último ajuste CSS `position:relative` en listbox verificado por PM con flechas en ambos sentidos; evita mezclar offsets de raíz/lista.
- QA manual mediante herramientas de navegador, Storybook6006 y componentes reales con fixtures sintéticas. Ningún guardado de ficha operativa, cambio de API, migración, modificación de configuración o del watcher. `package.json` se actualizó al final del cambio; su versión es consumida por el supervisor existente.

## Evidencia local y límites

Capturas y logs privados en `.local/validation/template-selector/`: `selector-final.png`, `selector-390.png`, `lista-larga-390.png`, `lint.log`, `build-web-final.log`, `build-electron.log` y `build-storybook.log`; baseline de los archivos previos preservada. [Vista interactiva](http://127.0.0.1:6006/?path=/story/composiciones-arcpreparationpanel--selector-de-lista-larga).

Electron compila y comparte el componente web, pero no se realizó smoke nativo de Electron ni recorrido autenticado adicional contra datos operativos. No se verificó zoom200%, dispositivo táctil ni lector de pantalla; la semántica/teclado observados no equivalen a una auditoría de accesibilidad completa. Se conservó el servidor Storybook existente y se cerró la pestaña temporal de QA, restaurando el viewport. El defecto de navegación del catálogo desde `/` diagnosticado previamente no pertenece a este ajuste y sigue pendiente de corrección.
