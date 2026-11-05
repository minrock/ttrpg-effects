# Plan — 57 Áreas contextuales

**Spec fuente:** [spec.md](spec.md). **Estado:** Integrada en main (`62c351a`), versión 3.21.0, por orden del usuario. **Base:** `0c8d245`, main 3.20.0 limpio al iniciar; rama `feature/sdd-areas-contextuales`.

## Base inspeccionada

| Módulo existente | Hallazgo y reutilización |
| --- | --- |
| `src/domain/sessions/scene-document.ts`, `scene-schema.ts` | SceneShape tiene geometría y emoji, sin color/bloqueo/patrón. Schemas distintos por tipo; extender solo círculo/cono y sus validadores |
| `src/domain/shapes/shapes.ts`, `shape-emojis.ts` | Operaciones puras y catálogo compartido de 29 emojis; reutilizar geometría y selección. No reemplazarlo por el catálogo ilustrativo de la captura |
| `src/render/pixi/PixiViewport.ts` | Colores fijos; helpers de mosaico con jitter y límite de emojis. Reutilizar capas, máscaras, selección y conversión de coordenadas; extraer layout regular acotado en vez de duplicar geometría |
| `src/renderer/src/App.tsx`, `PlayerApp.tsx`, `hooks/usePlayerTools.ts` | Menú general, inspector con selector de emoji y herramientas locales/compartidas; compartir una barra y adaptar acciones según propiedad/contexto |
| `src/shared/contracts/shared-annotations.ts` | Schemas estrictos v1, comandos de geometría/revisión, adaptador que selecciona campos. No transportar campos nuevos sin negociación |
| `src/application/services/shared-annotations.ts` | Runtime con propiedad, cuotas, revisiones, previews y tombstones. Incorporar bloqueo y copia autoritativa, conservar moderación y duración |
| `src/application/services/public-table-projection.ts` y sanitizadores de snapshot | Reconstruyen la escena pública mediante schemas; comprobar que no descarten estilo y bloqueo de áreas DM |

SDD 07 contiene el contrato histórico de emojis con jitter y exclusión de color. SDD 55 conserva edición propia y retirada DM. SDD 56 ya desacopló cámaras: la decoración y la barra deben respetar el rectángulo útil y la cámara local de cada cliente. La propuesta no extiende efectos de fuego/agua ni rectángulos.

## Decisiones por capa

1. **Dominio:** tipos opcionales y normalización de estilo heredado; políticas puras de editar, eliminar, copiar y desbloquear. La copia crea ID y puntos independientes, conserva geometría/estilo y valida límites. Un único guard por operación, reutilizado por casos de uso y UI; no confiar solo en botones deshabilitados.
2. **Aplicación:** casos de uso explícitos de estilo, bloqueo/desbloqueo y copia; integrar historial local sin que un borrado por deshacer evada bloqueo. Anotaciones compartidas mantienen revisión y autoría del servidor. Separar retirada moderadora de eliminación ordinaria y comunicar cuántos bloqueados conserva limpiar propios.
3. **Transporte:** concretar schemas negociados con `areaToolsVersion=1`, conservando v1 y foco independiente. Añadir comandos dedicados para bloqueo y copia; incluir origen/revisión/idempotencia y no aceptar autor arbitrario. Adaptar bootstrap, SSE, HTTP, proyección y clientes; preservar campos canónicos ante mensajes antiguos. Validar carreras con expulsión y contexto.
4. **Render:** módulo de patrón regular en mundo con celdas de damero, glifos y clipping. Presupuestar antes de generar candidatos; cachear por geometría/grilla/estilo, descargar recursos al cambiar mapa. Etiquetas y selección arriba; no crear texturas o Text por cada frame. Mantener render histórico cuando falta el nuevo marcador de patrón.
5. **React:** componente compartido de barra contextual y paletas; callbacks a casos de uso, sin acceso privilegiado. Coordinar selección, menú general, inspector y paneles. Aplicar la política a drag, handles, Delete/Backspace, borrado lateral y limpiar; gestionar foco y errores de transporte.

## Datos y operación

Probar extensión opcional de `.ttrpgscene` v2 y lector v1 con nuevos defaults. Auditar schemas, serializadores, importación/exportación, autosave, almacenamiento y proyección pública para evitar pérdida silenciosa de campos. No convertir los dibujos efímeros del servicio en persistentes. No se prevén dependencias nuevas ni migración de tablas; si el esquema físico obliga a una, documentarla antes de ejecutarla en SQLite/PostgreSQL. No tocar `.env` ni datos locales para validar.

Los lectores antiguos no pueden garantizar conservar estilo/bloqueo nuevo al volver a guardar. Documentar esta limitación y probar compatibilidad de lectura de archivos anteriores; si la construcción requiere una migración incompatible, revisar el contrato y versionado antes de aplicarla. La entrega compatible corresponderá a minor según AGENTS.md, no a esta fase documental.

## Secuencia de construcción

1. Fijar contratos/defaults y fixtures de escenas heredadas; implementar políticas puras y copia, con pruebas de bloqueo y referencias independientes.
2. Construir layout/render acotado y validar círculo/cono, clipping, grillas y cámaras con fixtures visuales. Conservar líneas, caminos y rectángulos.
3. Integrar barra y paletas en DM y jugador local, historial y todas las vías de edición/borrado.
4. Extender runtime y protocolo negociado; integrar cliente del servicio con errores, revisiones, reconexión e idempotencia. Comprobar lectura y publicación de formas DM.
5. Recorrer DM + dos invitados, versiones mixtas y Electron; registrar evidencia por criterio y límites. Actualizar encabezados propuestos de SDD 03/07/39/55 solo cuando se implemente.

## Validación prevista

| Criterios | Verificación | Estado |
| --- | --- | --- |
| CA-02/06/08/11 | Dominio, schemas, serialización e historial; defaults, copia profunda y bloqueo por todas las entradas | Pendiente de implementación |
| CA-03/04/05/14 | Layout regular/clipping/presupuestos, render real y liberación de recursos | Pendiente de implementación |
| CA-01/02/06/13 | React, foco, Escape/Delete, bordes y laterales a 390 px y escritorio | Pendiente de implementación |
| CA-07/08/09/10/12 | Runtime, HTTP/SSE real, dos autores y dos pestañas del mismo autor, carreras y negociación antigua/nueva | Pendiente de implementación |
| CA-10/11/14 | Servicio autenticado con SQLite y PostgreSQL/TLS aislados; Electron autónomo y servicio | Pendiente de implementación |

Comandos según cambios: `pnpm typecheck`, `pnpm lint`, `pnpm test --exclude '.local/**' --exclude 'tmp/**'`, `pnpm build:api`, `pnpm build:web`, `pnpm build`. Para persistencia/moderación afectadas: `pnpm test:owned` y `pnpm test:moderation` con sus entornos reales preparados; ausencia de PostgreSQL no cuenta como éxito.

La planificación se autorizó después para implementación. Se conserva la tabla anterior como estrategia prevista; resultados y limitaciones por criterio en [validacion.md](validacion.md). La orden «ok, cierra a main y construye» autorizó el cierre de 3.21.0: implementación `a09ea69`, integración `62c351a` y construcción mediante `scripts/build-dmg.sh`. El registro de validación conserva la evidencia final y los recorridos pendientes.


## Contrato concretado y decisiones de implementación

- `color`, `locked` y `areaPattern` son opcionales en círculos/conos; `ShapePatch` no admite cambiar bloqueo. `setAreaLocked` y `copyArea` son operaciones separadas; el borrado desde el árbol también consulta la política. No existe deshacer general de escena en la base inspeccionada: no se añadió un historial nuevo.
- La capacidad se negocia en GET con `areaToolsVersion=1` junto a las versiones de dibujos/foco; POST a anotaciones usa `X-TTRPG-Area-Tools: 1`. La respuesta incluye `annotations.areaToolsVersion`. Se añadieron comandos `lock` (`id`, `revision`, `locked`) y `copy` (`id`, `revision`, `newId`), usando la idempotencia contextual HTTP vigente.
- Proyección v1 elimina metadatos nuevos, incluido `committedGeometry`; las actualizaciones antiguas preservan color, patrón y su emoji canónicos. El servidor rechaza borrado/edición de bloqueados incluso desde clientes antiguos.
- El patrón se genera en `src/render/pixi/area-pattern.ts`, recortado con máscara Pixi. El presupuesto se aplica antes del recorrido (máximo 256 celdas por área y reparto de 2048 por viewport; no más glifos que celdas). Al superar el presupuesto se agrupan celdas en múltiplos enteros de la grilla; el mapa mantiene coordenadas y medida. Caché por firma y descarte visual fuera de vista.
- `AreaContextToolbar` se comparte entre App y PlayerApp. Reserva 112 px inferiores para controles de cámara, limita panel/scroll al lienzo y oculta la barra durante gestos. El selector de color muestra una muestra local; confirma al elegir muestra o Aplicar. Las áreas pequeñas usan glifo central enmascarado.
- Se amplió hit-testing de círculos/conos al interior real, conservando su ancla seleccionable. Los bloqueados siguen seleccionables, con candado y sin manivelas.
