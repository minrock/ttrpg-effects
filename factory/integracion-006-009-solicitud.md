# Integración autorizada de 006 a 009

Fecha: 2026-10-30. Petición literal del usuario: «Levanta un sub agente de integración que vaya integrando todas las que necesitan personas y sige con la tarea 10 después».

La orden autoriza preparar commits e integrar localmente en main los trabajos006,007,008,009 que ya tienen cuatro revisiones APROBADO y decisión APROBAR. No incluye push ni integrar010 aún en construcción, ni011. Las restricciones anteriores de no commit/merge quedan reemplazadas solo para este alcance. Tras integrar ejecutar scripts/build-dmg.sh según AGENTS.md. Conservar servicios/configuración/datos privados originales.

## Rol y entradas

Subagente de integración, sin delegación. Lee AGENTS.md, .agents/skills/factory/SKILL.md, factory/README.md, solicitudes/specs/builds/decisiones y última ronda de006–009, huellas congeladas009, prerrequisitos-autenticacion.json y solicitud/coordinación010. La raíz fuente es /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects, con cambios acumulados sin commits y cambios010 posteriores. Original /Users/minrock/Projects/ttrpg-effects está en feature/configuracion-env con prerequisitos.env sin commit; no modificar ni limpiar ese checkout ni sus servicios. Orquestador único escribe board/backlog/solicitudes. Tu salida es factory/integracion-006-009.md y, si procede, integracion.md en esos cuatro expedientes; temporal+renombrado.

## Plan de trabajo seguro

Primero localizar evidencia y una copia íntegra recuperable del producto exactamente aprobado009, incluyendo archivos no rastreados. Huellas son verificadores, no contenido. Hay huellas en ronda-1/huellas.json009 y base-archivos.json010; no mezclar código010 nuevo ni eliminar/revertirlo. Constructor010 recibió orden de llegar a punto estable y pausar; no manipular su checkout. Puedes inspeccionar snapshots temporales (sin secretos/env personales), git y expedientes. No reconstruir contenido aprobado por suposición. Comunica al orquestador qué evidencia recuperable existe y si exige cooperación del constructor.

Si recuperas el conjunto exacto aprobado, verifica hashes y trabaja en checkout separado. Puedes crear rama feature/integracion-006-009 y worktree aislado desde base main verificada. Copia únicamente fuentes/docs/artefactos autorizados, sin .env privado, node_modules, datos o buildoutputs. Reutiliza contenido de repositorio y compara nombres concretos. No git add . ni reset/force ni checkout del original. Selecciona rutas concretas, conserva aprobaciones/prerrequisito3.7, y excluye010/011 del commit de producto. Como006–009 fueron aprobadas acumulativamente sin commits, se admite integración conjunta3.11.0 documentada si los estados intermedios no están recuperables; no inventar commits de etapas parciales. Revisa main actual y árbol aprobado; si main avanzó, informa y sigue el ciclo de reconciliación de la skill antes de merge. No mover main con update-ref como atajo de validación.

Verifica producto exacto, checks/evidencia y construcción en destino aislado. Integra localmente a main cuando cumpla aprobación y alcance; genera DMG y registra SHA/version/ruta/checks reales. No usar PostgreSQL temporal de010 sin coordinar exclusividad; no tocar API8787/dashboard8765. Mantén cambios010 fuera de Git/history y sin perderlos. Si no hay copia verificable previa, registra el impedimento concreto y opciones sin revertir ni inventar aprobación. No marcar integrado hasta commit/main+DMG correctos. Enviar hitos al orquestador.

## Recuperación confirmada

Constructor010 recuperó19/19archivos previos conSHA256exacto contra base010 (idéntica a huellas009), en /var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-pre010-recovered-w5czz__w; verification.json registra comparación. No modificó checkout para recuperar. Integrador valida de nuevo las616huellas antes de commit. El cierre documental005 heredado puede conservarse sin cambios según prerequisitos. Orquestador prepara board/backlog del destino; commit de registros de cierre es parte de esta integración autorizada.
