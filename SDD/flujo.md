# Flujo de planificación y entrega SDD

## Planificar

1. Leer [estado actual](estado-actual.md), el índice y las specs afectadas. Inspeccionar el código y registrar diferencias; no tomar un informe antiguo como contrato vigente sin contrastarlo.
2. Reservar el siguiente número SDD y crear `SDD/specs/NN-nombre/spec.md` y `plan.md` usando las plantillas. Una petición de planificación produce propuesta, no autoriza implementación ni Git.
3. Definir objetivo, alcance, exclusiones, roles afectados, invariantes y criterios observables identificados como CA-01, CA-02… En cada criterio indicar cómo se verificará.
4. Separar decisiones aceptadas, propuestas y dudas que bloquean. Enumerar dependencias por spec, migraciones/compatibilidad, operación y efecto en Electron local, Electron servicio y navegador.
5. Actualizar el índice con estado **Propuesta**. Solo marcar **Lista para construir** cuando el alcance esté decidido; registrar la orden de implementación cuando llegue.

## Ejecutar con la fábrica

Una spec SDD y un trabajo factory tienen identificadores independientes. El orquestador registra la ruta SDD en `solicitud.md`, junto al alcance autorizado y base real. La petición `$factory implementar SDD/specs/NN-nombre/spec.md` reutiliza ese contrato; no inicia otro diseño incompatible.

El especificador mantiene la spec/plan SDD asignados y escribe `factory/jobs/<id>/spec.md` como contrato de ejecución fechado: referencia de SDD, criterios aplicables completos y delta autorizado. Se conserva una copia de los criterios de esa entrega para que futuras ediciones de SDD no cambien retroactivamente lo que revisaron los agentes. El dashboard sigue mostrando este archivo local del expediente.

Tras especificar, el constructor implementa y registra criterio → evidencia en `build.md`. Seguridad, UX, UI y código revisan la misma entrega congelada. Se esperan las cuatro antes de corregir. La [skill factory](../.agents/skills/factory/SKILL.md) conserva el ciclo, reutilización de constructor, máximo dos rondas por ciclo y aprobación técnica independiente de permisos de Git.

Si cambia el alcance, se actualizan spec/plan SDD y contrato de ejecución antes de otra ronda; el orquestador coordina al especificador. No editar criterios durante una revisión activa ni sobrescribir rondas/decisiones archivadas. Solo el orquestador escribe el tablero.

## Cerrar y mantener

El cierre registra resultado de cada criterio, pruebas realmente ejecutadas, límites, versión, referencia al expediente y estado de integración. Actualizar guías y estado actual cuando cambia el contrato, sin convertir evidencia histórica en documentación normativa.

Estados sugeridos para nuevas specs: **Propuesta → Lista para construir → En construcción → En revisión → Implementada sin integrar → Integrada**. **Bloqueada** incluye motivo y siguiente acción. No equivalen automáticamente a etapas del tablero: una tarea puede necesitar persona solo por falta de permiso para integrar.

Commits, push y merge requieren autorización explícita conforme a `AGENTS.md`. Una spec integrada requiere evidencia de Git y, cuando corresponde a una entrega de producto, DMG generado según el flujo existente. Esta reorganización documental no aumenta la versión de aplicación ni simula una entrega de producto.

## Validación proporcional

- Dominio/contratos: unitarias y regresiones afectadas; TypeScript: typecheck/lint.
- Persistencia/autoridad: contratos con SQLite aislado y PostgreSQL real/TLS; la suite general no los selecciona automáticamente.
- UI: teclado/foco y ancho estrecho; validar recorridos reales cuando afecta acceso, red o sincronización.
- Documentación: cobertura del índice, enlaces relativos, rutas fuente, coherencia de decisiones y conservación de evidencia histórica. No ejecutar migraciones ni resetear DB para verificar Markdown.

Las specs retrospectivas 41–54 usan una lista numerada de criterios; sus planes señalan dónde está la evidencia. No se añadieron casillas de éxito nuevas ni se cambiaron permisos por documentar trabajo existente.
