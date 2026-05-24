# Plan de implementacion tecnica - 29 - Sistema de Templates de Monstruos

## 1. Resumen

- **Spec fuente:** `./specs/29-monster-template-system/29-monster-template-system.md`
- **Objetivo:** Agregar templates persistentes de Markdown/CSS para notas de monstruos, con administrador desde menu de aplicacion, selector en el modal de monstruo y template semilla D&D 5.5e.
- **Estado:** Implementado
- **Prioridad:** Media
- **Dependencias:** Spec 26 para aside DM, Spec 27 para menu de aplicacion, fix de Markdown GFM para tablas, modelo actual de `SceneMonster`.

## 2. Alcance

### Incluido

- Modelo `MonsterTemplate`.
- Store local versionado para templates.
- IPC y preload tipados para listar/guardar/eliminar templates.
- Menu de aplicacion `Administrar templates de monstruos`.
- Modal administrador con listado, edicion, preview y guardado.
- Template built-in D&D 5.5e en espanol con estilo claro blanco/gris y acentos rojos.
- Selector de template en crear/editar monstruo.
- Persistencia de `templateId` en monstruos.
- Render del detalle de monstruo con CSS scoped del template.

### Fuera de alcance

- Marketplace o importacion remota.
- Plantillas para NPCs/notas generales.
- Editor visual por campos.
- Sanitizacion avanzada de HTML/CSS mas alla del scoping definido.
- Migracion compleja de templates existentes, porque no existen en versiones previas.

## 3. Decisiones tecnicas

- **Arquitectura:** Los templates son configuracion local de la app, no parte del dominio tactico del mapa, pero sus tipos viven en dominio/shared para compartir entre main, preload y renderer.
- **Persistencia:** Archivo JSON versionado en `app.getPath("userData")`, por ejemplo `monster-templates.json`. Los built-ins se mezclan al listar y no se duplican hasta que el usuario los edite.
- **IPC / Electron:** Nuevos canales especificos:
  - `monster-template:list`
  - `monster-template:save`
  - `monster-template:delete`
  - `monster-template:open-manager`
- **Render / PixiJS:** No aplica. El render es React/Markdown dentro de modales de aside.
- **Validacion:** Validar id, name, system, markdown y css como strings limitados. Rechazar payloads no serializables.
- **Dependencias nuevas:** Ninguna en primera implementacion. Usar textareas simples y el render Markdown existente.

## 4. Diseno de dominio

- **Entidades / tipos:** `MonsterTemplate`, `MonsterTemplateStore`, `SceneMonster.templateId`.
- **Reglas puras:**
  - normalizar templates guardados;
  - mezclar built-ins con templates del usuario;
  - generar CSS scoped por template;
  - fallback seguro si falta un template.
- **Coordenadas / unidades:** No aplica.
- **Errores de dominio:** Template invalido, template duplicado, template built-in protegido contra delete directo.

## 5. Cambios por capa

### `domain`

- Crear `src/domain/monster-templates/monster-template.ts`.
- Definir `MonsterTemplate`, defaults y built-in D&D 5.5e.
- Agregar `templateId?: string | null` a `SceneMonster`.
- Agregar helpers para normalizar templates y generar ids si aplica.

### `application`

- Crear interfaz `MonsterTemplateRepository`.
- Crear casos de uso:
  - listar templates;
  - guardar template;
  - eliminar template.
- Asegurar mezcla de built-ins y templates del usuario.

### `infrastructure`

- Implementar repositorio filesystem Electron para templates.
- Leer/escribir JSON versionado en `userData`.
- Manejar archivo ausente como lista vacia.
- Proteger contra JSON corrupto con error recuperable y fallback a built-ins.

### `main`

- Registrar IPC de templates.
- Extender menu de aplicacion con `Administrar templates de monstruos`.
- Enviar evento al renderer principal para abrir el modal manager.
- Validar payloads antes de guardar.

### `preload`

- Exponer funciones:
  - `listMonsterTemplates()`
  - `saveMonsterTemplate(template)`
  - `deleteMonsterTemplate(id)`
  - `onOpenMonsterTemplateManager(callback)`
- No exponer canales IPC genericos.

### `renderer`

- Agregar estado/listado de templates en `App`.
- Agregar modal `MonsterTemplateManagerModal`.
- Agregar selector de template en `MonsterModal`.
- Usar textarea Markdown plano para notas de monstruos, preservando tablas GFM y placeholders del template.
- Mantener las notas sin HTML estructural visible; el render del template envuelve el Markdown con el HTML/clases requeridas por el card.
- Si notas vacias, insertar Markdown del template.
- Si notas con contenido, pedir confirmacion antes de reemplazar.
- Guardar `templateId` junto al monstruo.
- En `MonsterDetailModal`, resolver template por id y aplicar CSS scoped al contenedor del Markdown.
- Mantener `Sin template` como opcion default.

### `render`

- Sin cambios esperados.

## 6. Plan de trabajo

1. Crear tipos de dominio, built-in D&D 5.5e y normalizadores.
2. Extender `SceneMonster` con `templateId` compatible hacia atras.
3. Implementar repositorio filesystem y casos de uso de templates.
4. Registrar IPC y preload API de templates.
5. Agregar item de menu para abrir el manager desde la app.
6. Implementar modal administrador con lista, edicion, preview y guardar.
7. Integrar selector de template en `MonsterModal`.
8. Aplicar render Markdown + CSS scoped en `MonsterDetailModal`.
9. Verificar guardado/carga de escenas con `templateId`.
10. Ejecutar validaciones y actualizar checklist.

## 7. Testing y verificacion

- **Unit tests:** normalizacion de templates, mezcla built-in/user, CSS scoping.
- **Integration tests:** repositorio filesystem con archivo ausente, archivo valido y JSON corrupto si el proyecto tiene harness.
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Build:** `pnpm build`
- **Manual / smoke:** abrir manager desde menu, editar template, previsualizar, guardar, crear monstruo con template, ver detalle con tabla y estilos, guardar/cargar escena y confirmar `templateId`.

## 8. Riesgos y mitigaciones

- **Riesgo:** CSS del template afecta otras partes de la app.
  **Mitigacion:** Envolver preview/detalle en contenedor con scope unico y prefijar reglas o inyectarlas dentro de un scope controlado.
- **Riesgo:** El usuario pierde notas al cambiar template.
  **Mitigacion:** Confirmacion obligatoria si las notas no estan vacias.
- **Riesgo:** Built-ins editables generan confusion entre base y copia del usuario.
  **Mitigacion:** Si se edita un built-in, guardar override local manteniendo el mismo id o crear copia claramente nombrada, segun implementacion elegida.
- **Riesgo:** Archivo de templates corrupto rompe el menu.
  **Mitigacion:** Fallback a built-ins y error serializable.
- **Riesgo:** CSS/HTML inseguro.
  **Mitigacion:** No permitir acceso a Electron/Node desde renderer, scoping de CSS y mantener el Markdown dentro del contenedor.

## 9. Criterios de aceptacion

- [x] El menu de aplicacion abre el administrador de templates.
- [x] El administrador lista el template D&D 5.5e por defecto con card claro y tabla de caracteristicas compacta.
- [x] Se puede editar Markdown y CSS de un template.
- [x] Se puede previsualizar el template.
- [x] Se puede guardar un template y verlo tras reiniciar la app.
- [x] El modal de monstruo permite elegir `Sin template` o un template.
- [x] El template rellena notas vacias sin romper tablas GFM.
- [x] Cambiar template con notas existentes pide confirmacion.
- [x] El detalle del monstruo usa Markdown GFM y CSS scoped.
- [x] `templateId` se persiste en `.ttrpgscene`.
- [x] Templates faltantes no rompen la visualizacion.
- [x] Validaciones pasan.

## 10. Documentacion afectada

- `./specs/29-monster-template-system/29-monster-template-system.md`
- `./specs/29-monster-template-system/plan.md`
- Si se implementa, actualizar specs relacionadas con aside DM y menu de aplicacion si cambia una decision global.

## 11. Checklist de cierre

- [x] Implementacion completada dentro del alcance.
- [x] Tests relevantes agregados o actualizados.
- [x] `pnpm typecheck` ejecutado.
- [x] ESLint focalizado sobre archivos modificados ejecutado. `pnpm lint` completo sigue fallando por `index.js` raiz preexistente.
- [x] `pnpm build` ejecutado si aplica.
- [ ] Smoke/manual test realizado si aplica.
- [x] Documentacion actualizada si cambio una decision.
- [x] Sin accesos directos del renderer a Node.js, Electron internals, filesystem o SQLite.
- [x] Sin dependencias nuevas no justificadas.
