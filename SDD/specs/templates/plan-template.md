# Plan — NN Nombre

**Spec fuente:** `spec.md` del mismo directorio. **Estado:** Propuesta. **Dependencias:** por definir.

## Base inspeccionada

Rama/SHA y cambios locales relevantes; módulos y contratos existentes que se reutilizan. No sobrescribir trabajo previo.

## Decisiones por capa

| Capa | Cambio previsto | Archivos / puertos |
| --- | --- | --- |
| Dominio y aplicación | Reglas puras y casos de uso | Por concretar |
| Infraestructura y servidor | Repositorios, transacciones, HTTP/SSE | Por concretar |
| Clientes y render | UI compartida, adaptadores, IPC o Pixi | Por concretar |

Incluir solo capas afectadas. Justificar dependencias nuevas. No permitir acceso privilegiado desde renderer.

## Núcleo compartido y adaptadores

Detallar reglas/tipos/casos de uso reutilizables, puertos y composición por entorno. Distinguir Electron autónomo con IPC/adaptadores locales, navegador y Electron servicio con cliente HTTP, y API con repositorios. No introducir privilegios en renderer para compartir código. Identificar duplicación real que se elimina y diferencias intencionales de permisos/ciclo de vida; evitar abstracciones sin necesidad concreta.

## Seguridad, concurrencia y ciclo de vida

Actores y fronteras de confianza, autorización/propiedad, validación, proyección pública y secretos. Según el cambio: transacciones, revisión/idempotencia, cancelación, respuestas tardías, límites de colas/SSE, limpieza de recursos y resultado incierto. Para Electron: IPC específico, sender y aislamiento. Definir casos negativos y pruebas correspondientes.

## Decisiones UI/UX y prototipos

Fichas del catálogo reutilizadas, consulta/acuerdo con ui_ux y criterios de accesibilidad/ubicación. Si hace falta un lab: pregunta a resolver, alcance, responsable UI/UX, estados, evidencia y condición previa a implementación real. Un prototipo no equivale a validación del producto. Indicar no aplicabilidad cuando no hay cambio de interacción.

## Datos y operación

Migraciones incrementales SQLite/PostgreSQL, compatibilidad, backup/retorno y configuración privada si aplica. Distinguir migración DB, intercambio .ttrpgscene y paquete funcional operativo.

## Secuencia de implementación

Pasos pequeños verificables, con dependencias y alcance de archivos. Separar una investigación necesaria de la implementación ya decidida.

Desglosar en `tareas.md` del mismo directorio usando [la plantilla de tareas](tareas-template.md) (al copiar este plan a una spec, ajustar el enlace a `../templates/tareas-template.md`). El plan explica decisiones; tareas.md contiene encargos y dependencias, sin duplicar estados contradictorios. Proponer tandas paralelas con contratos estables, propiedad de archivos y recursos aislados, camino crítico y barreras de integración. El PM asigna y despacha; el TL no ejecuta builders.

## Decisiones pendientes para PM

| ID | Pregunta / ambigüedad | Opciones y recomendación | Impacto y tareas dependientes | Resolución y procedencia |
| --- | --- | --- | --- | --- |
| D-01 | Solo si existe una decisión real | Alternativas concretas | Bloquear solo lo afectado | Pendiente |

El TL no cambia la spec fuente. El PM resuelve alcance; el TL incorpora la decisión al plan una vez registrada. Distinguir supuestos internos reversibles de decisiones funcionales pendientes.

## Validación

| Criterio | Prueba / recorrido | Entorno | Resultado y evidencia |
| --- | --- | --- | --- |
| CA-01 | Comando o pasos concretos | Aislado / navegador / Electron | Pendiente |

Seleccionar comandos reales de package.json: pnpm typecheck, lint, test y builds afectados. Contratos de DB/identidad/propiedad/invitación/moderación requieren motores reales y TLS; registrar entorno ausente como limitación, no como éxito. Evitar datos operativos.

## Cierre

Registrar documentación actualizada, criterios satisfechos o pendientes, versión de producto si aplica, evidencia por criterio, resultado de revisión y permisos Git vigentes. Implementado, revisado e integrado son estados distintos. No marcar completado un check que no se ejecutó.
