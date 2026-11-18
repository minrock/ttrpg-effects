# Catálogo de componentes e interacción

Inicio: 2026-11-13. Responsable de diseño: `ui_ux`; implementación de producto: `frontend_builder`. Este catálogo acompaña las specs SDD y registra patrones reutilizables. No certifica que todas las pantallas ya los cumplan.

## Autoridad y mantenimiento

- La spec define la función; la ficha precisa su interacción y apariencia. Si hay contradicción, resolverla con el principal antes de implementar.
- **Decisión:** propuesta, acordada o sustituida. Registrar interlocutores, fecha y referencia de la consulta/spec.
- **Implementación:** referencia existente, prototipo o implementada. **Validación:** registrar pruebas y plataformas por separado. Acordado no significa implementado.
- Reutilizar un ID por patrón. Nuevos patrones usan la [plantilla](plantilla-componente.md); las excepciones deben explicar su motivo y alcance.
- El agente UI/UX puede mantener fichas y prototipos documentales. El agente frontend modifica los componentes de producción. Coordinar edición del catálogo para evitar decisiones concurrentes incompatibles.

## Índice inicial

| ID | Patrón | Estado de decisión | Evidencia actual |
| --- | --- | --- | --- |
| UI-001 | Switch para encendido/apagado | Acordada: instrucción del usuario, 2026-11-13 | Radix Switch existente; adopción global y accesibilidad no auditadas |
| UI-002 | Ubicación de acciones y menús | Acordado evitar duplicación innecesaria; ubicaciones nuevas por resolver | Cabecera, desplegable y contextual existentes |
| [UI-003](campanas-arcos-escenas.md) | Campañas, arcos y escenas | Revisión SDD59 0.10 acordada con PM/TL el 2026-11-17: escenas propias del arco y creación directa; sustituye asociación compartida del diseño anterior | UI 0.10 validada en Storybook, navegador y Electron e incorporada al servicio local 3.33.0; SQLite12 respaldada/verificada, sin merge Git ([evidencia](../../specs/59-campanas-arcos-escenas/validacion-ui-0.10.md)) |
| [UI-004](storybook.md) | Catálogo Storybook de UI vigente | Acordada para SDD 60 revisión 0.1 y ampliada por SDD 59 ajuste 0.5 | Índice vigente: 12 controles, 19 composiciones, 59 stories y 31 autodocs; corte SDD 60 original 12/17/54/29 conservado |
| [UI-005](sidebar-administracion.md) | Shell y sidebar de administración | Acordada para SDD 59 corrección 0.5, 2026-11-14 | Implementación local 3.29.1; QA de navegador responsive/zoom y Electron conectado completada para esta corrección, sin integración |
| [UI-006](catalogos-preparacion-arco.md) | Catálogos de NPCs y monstruos del arco | Acordada para SDD 59 revisión 0.6, 2026-11-15 | Decisión documental; implementación, Storybook y QA de esta revisión pendientes |
| [UI-007](selector-plantilla.md) | Selector de plantilla con autocompletado | Acordada con PM y TL para SDD 59 ajuste 0.9, 2026-11-16 | Implementado en 3.32.1; QA IAB de Storybook y `ServiceDialog` a 390/1440 px y checks dirigidos superados; Electron nativo, zoom 200 % y lector de pantalla sin probar |

## UI-001 — Encendido y apagado

**Propósito:** representar si una funcionalidad está encendida o apagada mediante el mismo tipo de control en todo el producto.

**Cuándo usar:** activación/desactivación binaria de una funcionalidad, por ejemplo visibilidad de anotaciones o encendido de niebla cuando la spec defina esa función. Un slider de radio de niebla regula una cantidad y no sustituye al switch de activación.

**Cuándo no usar:** selección de varios elementos, aceptación de condiciones, elección entre varios modos o ejecución de una acción puntual. No convertir «Guardar», «Revelar zona» o «Eliminar» en switches.

**Reutilización:** [SharedSwitch](../../../src/renderer/src/components/SharedSwitch.tsx) y su [CSS compartido](../../../src/renderer/src/components/SharedSwitch.css), utilizados por el editor, anotaciones y campañas tras SDD 59 ajuste 0.4. El ejemplo orienta apariencia y API; no certifica todos los estados remotos o estilos fuera de sus contenedores.

**Contrato:** etiqueta estable que nombre la funcionalidad; estado checked representa su valor real. Definir en la spec si la aplicación es inmediata o al guardar; no cambiar ese comportamiento silenciosamente. Mantener estado pendiente, deshabilitado y error cuando corresponda a la operación real. Si falla la persistencia, no presentar un éxito inexistente: conservar o restaurar el valor confirmado y comunicar el error según el contrato acordado.

**Accesibilidad:** nombre accesible asociado a etiqueta visible, estado programático, foco visible, activación por teclado y puntero; no depender solo del color. Verificar que la interacción no active herramientas del canvas. El mensaje de error no debe quedar oculto en un tooltip.

**Código orientativo para frontend (no implementado por esta ficha):**

```tsx
import { useId } from "react";
import { SharedSwitch } from "./components/SharedSwitch";

function Activacion({ etiqueta, activo, pendiente, onChange }: {
  etiqueta: string;
  activo: boolean;
  pendiente: boolean;
  onChange: (activo: boolean) => void;
}) {
  const id = useId();
  return <div className="sidebar-switch-row" aria-busy={pendiente}>
    <label htmlFor={id}>{etiqueta}</label>
    <SharedSwitch id={id} ariaLabel={etiqueta}
      checked={activo} disabled={pendiente} onCheckedChange={onChange} />
  </div>;
}
```

La función consumidora gestiona asincronía y errores. El snippet ilustra el uso del componente real, no es otro componente de producto. Revisar CSS contextual del consumidor.

**Aceptación de futuras implementaciones:** misma semántica y aspecto en ubicaciones equivalentes; nombre y estado accesibles; teclado sin conflicto; carga/error correctos; ausencia de un segundo control contradictorio. Comprobar en clientes/roles afectados.

**Trazabilidad:** petición del usuario de consistencia UI/UX del 2026-11-13. Este registro no autoriza migrar todas las pantallas ni afirma validación visual ejecutada. Specs concretas se enlazan con cada encargo.

## UI-002 — Acciones y menús sin duplicación accidental

**Propósito:** dar a cada acción una ubicación comprensible conservando acceso contextual y de teclado.

**Referencias existentes:** [WorkspaceHeader](../../../src/renderer/src/components/workspace/WorkspaceHeader.tsx), [HeaderDropdown](../../../src/web/HeaderDropdown.tsx), [AreaContextToolbar](../../../src/renderer/src/components/workspace/AreaContextToolbar.tsx). Relacionado con [SDD 54: cabecera unificada](../../specs/54-cabecera-unificada/spec.md) y [SDD 57: contextual de áreas](../../specs/57-areas-contextuales/spec.md).

**Antes de diseñar:** listar acción, rol, alcance (cuenta/partida/escena/objeto), ubicación actual, frecuencia y alternativa de teclado. Comparar duplicados por significado, no solo por texto o icono.

**Decisión por consulta:** proponer un acceso principal acorde al alcance y explicar accesos secundarios justificados. Un contextual o atajo puede complementar al principal. No eliminar rutas accesibles o útiles por una deduplicación mecánica.

**Estados y ubicación:** abierto/cerrado, seleccionado, deshabilitado y ocupado según las acciones. Verificar foco y retorno al disparador, Escape, cierre exterior cuando proceda, bordes de viewport, zoom y paneles laterales. No usar roles ARIA de menú sin implementar su patrón de teclado; la semántica concreta depende del componente elegido.

**Aceptación:** no hay dos cabeceras o accesos redundantes sin justificación; el menú guarda relación con el objeto/ámbito; no tapa herramientas esenciales; funciona con teclado y ancho estrecho. Cada ubicación propuesta debe acordarse antes de modificar producción.

**Estado:** principio solicitado por el usuario; no se ha realizado auditoría global. [UI-005](sidebar-administracion.md) eliminó localmente la navegación duplicada fuera del editor; los menús del editor permanecen en su ámbito.

## Laboratorio y referencias

El [laboratorio existente](../../../src/renderer/src/ui-lab/) es referencia de componentes del proyecto. El [catálogo Storybook](storybook.md) organiza historias con símbolos reales y datos sintéticos; su [índice estático vigente](../../../storybook-static/index.json) registra 59 stories y 31 páginas autodocs tras UI-005. El corte original de SDD 60 fue de 54/29. Storybook no sustituye validar el producto real ni demuestra accesibilidad completa. El filtro activo de campañas conserva un hallazgo de contraste pendiente en UI-004.

Cuando una consulta necesite un prototipo aislado, crearlo en `prototipos/<id>.html`: HTML/CSS/JS local, fixtures sintéticas, sin CDNs, dependencias nuevas ni conexión a datos reales. Enlazarlo desde su ficha, marcar estados simulados y registrar qué se verificó. SDD 60 usa Storybook y componentes React reales; un HTML paralelo no cuenta como historia ni como cobertura de CA-03.

Las referencias externas se incorporarán por consulta con enlace directo, fecha, observaciones y adaptación al stack existente. No hay referencias externas inspeccionadas ni aprobaciones visuales inventadas en este catálogo inicial.
