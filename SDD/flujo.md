# Flujo de planificación y entrega SDD

## Planificar

1. Leer [estado actual](estado-actual.md), el índice y las specs afectadas. Inspeccionar el código y registrar diferencias; no tomar un informe antiguo como contrato vigente sin contrastarlo.
2. Para una función nueva, reservar el siguiente número SDD y crear `SDD/specs/NN-nombre/spec.md` usando la plantilla; para una corrección, actualizar la spec vigente conservando historia. La especificación puede entregarse antes del plan técnico. Una petición de especificar/planificar produce propuesta, no autoriza implementación ni Git.
3. Definir objetivo, alcance, exclusiones, roles afectados, invariantes y criterios observables identificados como CA-01, CA-02… En cada criterio indicar cómo se verificará.
4. Separar decisiones aceptadas, propuestas y dudas que bloquean. Enumerar dependencias por spec, migraciones/compatibilidad, operación y efecto en navegador DM/jugador/admin y API. Los modos Electron solo pertenecen a antecedentes históricos desde SDD62.
5. Actualizar el índice con estado **Propuesta**. Solo marcar **Lista para construir** cuando el alcance esté decidido; registrar la orden de implementación cuando llegue.

## Implementar y revisar

Con orden de implementación sobre una spec identificada, crear o actualizar `plan.md` y `tareas.md` con la revisión aceptada, dependencias y validación; comprobar cualquier plan previo antes de despachar. Trabajar desde la spec y el plan acordes al alcance autorizado. Registrar los cambios de alcance antes de implementarlos y mantener junto a la spec la relación criterio → evidencia en `validacion.md`. Separar pruebas ejecutadas, pruebas heredadas por identidad de código y comprobaciones pendientes.

En el flujo de agentes del proyecto, [Factory](../.agents/skills/factory/SKILL.md) activa el hilo principal como PM para especificar y [Build](../.agents/skills/build/SKILL.md) para aceptar una spec existente, planificarla, implementarla y validarla. Todas sus preguntas usan User Ask con espera hasta recibir las respuestas. Las órdenes y límites expresos del usuario prevalecen; Build no concede permisos Git. La distribución de trabajo entre personas o agentes se decide para cada entrega; SDD no exige una skill, un tablero, un constructor persistente ni una cantidad de revisiones. La revisión técnica no concede permisos de Git. El [registro de retirada](retirada-factory.md) conserva la trazabilidad del mecanismo anterior sin activarlo.

## Cerrar y mantener

El cierre registra resultado de cada criterio, pruebas realmente ejecutadas, límites, versión, referencia a la evidencia y estado de integración. Actualizar guías y estado actual cuando cambia el contrato, sin convertir evidencia histórica en documentación normativa.

Estados sugeridos para nuevas specs: **Propuesta → Lista para construir → En construcción → En revisión → Implementada sin integrar → Integrada**. **Bloqueada** incluye motivo y siguiente acción. Un impedimento técnico se distingue de una autorización de Git todavía no concedida.

Commits, push y merge requieren autorización explícita conforme a `AGENTS.md`. Una spec integrada requiere evidencia de Git y, cuando corresponde a una entrega de producto, builds API/frontend aprobados. Desde SDD62 no se genera DMG; un despliegue sigue necesitando autorización aplicable. Esta reorganización documental no aumenta la versión de aplicación ni simula una entrega de producto.

## Validación proporcional

- Dominio/contratos: unitarias y regresiones afectadas; TypeScript: typecheck/lint.
- Persistencia/autoridad: contratos con SQLite aislado y PostgreSQL real/TLS; la suite general no los selecciona automáticamente.
- UI: teclado/foco y ancho estrecho; validar recorridos reales cuando afecta acceso, red o sincronización.
- Documentación: cobertura del índice, enlaces relativos, rutas fuente, coherencia de decisiones y conservación de evidencia histórica. No ejecutar migraciones ni resetear DB para verificar Markdown.

Las specs retrospectivas 41–54 usan una lista numerada de criterios; sus planes señalan dónde está la evidencia. No se añadieron casillas de éxito nuevas ni se cambiaron permisos por documentar trabajo existente.
