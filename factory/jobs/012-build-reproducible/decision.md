APROBAR

# Decisión técnica de 012 — ciclo 1, ronda 1

Fecha: 2026-10-31. Versión 3.11.1. Se aprueba el bugfix de construcción reproducible: los seis criterios de la spec están satisfechos, las cuatro revisiones finalizadas comienzan con `VEREDICTO: APROBADO` y no presentan hallazgos pendientes. La aprobación corresponde al delta 012; el producto acumulado 006–009 conserva sus decisiones anteriores.

## Identidad y contraste propio

Leídos perfil aprobador, AGENTS, skill factory, solicitud, spec, build, coordinación, identidad de ronda, las cuatro revisiones completas, autorización de integración y decisión de 009. El orquestador confirmó la finalización de los cuatro revisores antes de encargar esta decisión.

Rama real `feature/integracion-006-009`; HEAD y base `e1fd3eed0a12a2cf2fc7ab8fa2d2c95acc82dba3`, coincidentes con la ronda. Se recalcularon las 618 huellas SHA-256: todas coinciden con el código revisado, también inmediatamente antes de publicar. Frente a base-archivos.json solo difieren package.json, pnpm-lock.yaml y CHANGELOG.md; frente a 009 se conservan 613/616 huellas y las mismas tres excepciones autorizadas.

Se verificaron las copias anteriores de esos tres archivos contra las huellas de base y se calculó su diff directamente contra archivos actuales. El manifiesto contiene únicamente el patch 3.11.0 → 3.11.1 y Vite 7.3.3 como devDependency directa. El lockfile añade exactamente tres líneas del importer, reutilizando la resolución existente sin alterar paquetes, snapshots, integridades ni otras dependencias. El changelog añade seis líneas con fecha, tipo bugfix y alcance, conservando el historial anterior. Los scripts API/web ya invocan Vite; no cambian fuentes, pruebas, configuración funcional ni formato de escenas. El script de DMG sigue leyendo la versión de package.json.

## Evidencia y criterios satisfechos

1. **Manifiesto y alcance:** el diff mínimo comprobado satisface la dependencia fijada y el versionado, sin ampliación funcional.
2. **Instalación nueva:** se inspeccionaron isolation.json, install-result.json e install.log originales en `/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-012-wqflzqsu`. Registran traslado completo de node_modules/out anteriores, ausencia de ambas rutas antes de instalar y `pnpm install --frozen-lockfile` exit 0 con pnpm 11.1.2/Node 24.15.0; solo se reutilizó caché de paquetes. El lockfile actual conserva el hash registrado antes/después de instalar: `2b65a1d86a7bcb43844a9ecd9465d1e13615ad80821999a25ed22a2eaf06c3fc`.
3. **Ejecutable local:** se inspeccionó vite-local.log y el destino local generado por pnpm. Este aprobador ejecutó `pnpm exec vite --version`: exit 0, `vite/7.3.3 darwin-arm64 node-v24.15.0`.
4. **Gates completos:** se contrastaron gates.json, gates-retry.json y logs originales de typecheck, lint, test, build, build:api y build:web. Los seis comandos terminan satisfactoriamente en la entrega. La repetición completa de test registra 129 archivos y 1206/1206 pruebas. Se recalcularon tamaño y SHA-256 de los nueve artefactos declarados: 9/9 coinciden, incluidos Electron/API/web.
5. **Producto preservado:** las comparaciones propias con base y 009 corroboran identidad de fuentes, pruebas, assets y configuraciones; no hay cambios ocultos de selección de tests o de comportamiento de producto dentro del delta.
6. **Trazabilidad:** la instalación y gates son ejecuciones del constructor inspeccionadas, no nuevas ejecuciones de este aprobador. DB32/identidad25/propiedad46/invitaciones36 son evidencia heredada de 009 por identidad de fuentes, sin nueva ejecución multi-DB ni uso de PostgreSQL de 010. No hubo escrituras Git de este aprobador.

El primer intento de test falló con cuatro timeouts y dos workers; se conserva y no se contabiliza como éxito. power-context.log registra suspensión durante esa ejecución y despertar al concluir el salto temporal. El reintento íntegro, sin cambios de código ni configuración, pasó y satisface el gate. La evidencia permite atribuir razonablemente la incidencia al entorno; no queda un fallo de producto demostrado pendiente.

## Riesgos residuales y siguiente acción

Persisten avisos conocidos de canvas/jsdom, directivas use client y tamaño de chunks. Esta decisión no certifica una nueva inspección visual, proyección física, smoke interactivo de Electron, contratos multi-DB ni DMG; el delta es declarativo y estos límites están expresamente documentados. El instalable debe generarse y verificarse durante el cierre de integración previsto, después del merge.

Siguiente acción: el orquestador puede entregar esta aprobación al integrador para continuar el cierre local autorizado en solicitud.md y factory/integracion-006-009-solicitud.md, verificando que la base de main y el producto no hayan cambiado. La decisión técnica no concede por sí misma permiso de staging, commit, merge ni push; el integrador debe actuar dentro de la autorización vigente y registrar el DMG antes de marcar integrado. No se editó producto, Git, tablero ni otros informes. Única salida: esta decisión publicada mediante temporal y renombrado atómico.
