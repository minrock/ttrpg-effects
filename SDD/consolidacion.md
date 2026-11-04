# Registro de consolidación documental

Fecha: 2026-11-04. Rama de trabajo: `feature/sdd-consolidado`. Base de producto observada: 3.18.1. La consolidación inicial se hizo sin commit/merge ni cambio de versión; el cierre posterior fue autorizado explícitamente por el usuario.

## Material revisado y organización

- 40 specs de escritorio/fábrica (00–40, sin 21), sus 40 planes y la plantilla técnica anterior: trasladados desde `specs/` a `SDD/specs/`. Se preserva su contenido histórico y se ajustan rutas; la plantilla se actualiza para clientes/servidor/multi-DB.
- 11 guías de `docs/`: trasladadas a `SDD/guias/`, conservando también los cambios locales previos de identidad/operación. Se aclara qué requisitos son históricos y se corrigen referencias a funcionalidades que ya dejaron de estar pendientes.
- 12 expedientes factory: especificaciones, resultados/decisiones, tablero y planes transversales como procedencia; consolidados en SDD 41–52. Los commits de integración indicados por el tablero son ancestros de HEAD en este checkout.
- Cambios posteriores recogidos del changelog, fuentes y pruebas: administración local/contraseñas (53) y cabecera unificada (54). Se distinguen de entregas con revisión factory.
- README, instrucciones del proyecto, skill y perfiles especificador/constructor apuntan al flujo SDD; se mantiene la separación entre contrato vigente, contrato de ejecución y evidencia congelada.

Las 92 rutas originales se conservan como documentos breves de enlace, sin duplicar el contenido normativo. Los archivos de `factory/jobs/`, sus huellas y `factory/board.json` no se editaron. No se cambió la configuración, permisos, secretos, datos o procesos del servicio.

## Contradicciones resueltas

Se identifica la sustitución de claves globales por cuentas/invitados, el catálogo exclusivo de admin sin borrado, versiones retenidas, múltiples administradores, mínimo de contraseña 10 y elección manual/generación temporal. Se retira `/table/open` de la tabla contextual, se documenta la transferencia multi-DB ya implementada y se elimina la afirmación de que propiedad de recursos sigue pendiente. El roadmap de plugins queda explícitamente futuro.

## Verificación

- Enlaces relativos y rutas de módulos de SDD, redirects, README e instrucciones: comprobación de existencia de destinos.
- Cobertura: cada una de las 54 specs tiene plan e índice; los 12 trabajos tienen una spec SDD de correspondencia. No se crea ni se da por implementada una spec 21.
- Perfiles `.codex/agents/*.toml`: parseo válido; skill factory: `quick_validate.py` satisfactorio.
- Historial: `git merge-base --is-ancestor` confirma los 12 SHA declarados por el tablero; no se modifica su estado.
- `git diff --check` satisfactorio; archivos históricos de trabajos/tablero sin diff.

Durante la consolidación inicial no se ejecutaron suites de producto, builds, contratos PostgreSQL ni recorridos visuales; las comprobaciones posteriores al autorizar la integración se registran abajo. Los resultados mencionados en expedientes pertenecen a sus entregas originales. La verificación de existencia de enlaces no certifica semántica de API ni contenido remoto.

## Cierre autorizado de producto y documentación

El usuario pidió «comitea y mergea». Para conservar un checkout autocontenido se incluye el producto previamente trabajado, del que dependen las guías y enlaces de SDD, en un commit separado: `c4e8831` (versión 3.18.1). Documentación e instrucciones se registran después. No se hace push ni se modifica la base operativa.

Validaciones nuevas antes de integrar:

- `pnpm typecheck` y `pnpm lint`: correctos.
- `pnpm build:api` y `pnpm build:web`: correctos. Avisos no fatales de directivas de dependencias y tamaño de chunks web.
- `pnpm test` inicial: recogió también copias antiguas dentro de `.local/service/backups`; 3767 pruebas pasaron y dos pruebas antiguas fallaron por esperar claves globales retiradas. Se conserva el fallo; no se declara ese comando verde.
- `pnpm test --exclude '.local/**' --exclude 'tmp/**'`: **1263 pruebas, 137 archivos, todos correctos**, sin modificar pruebas para ignorar fallos de producto. Solo se excluyen respaldos privados y temporales del descubrimiento.
- Enlaces y perfiles revalidados; `quick_validate.py` de factory y `git diff --check` correctos.
- Contratos PostgreSQL/TLS no ejecutados: faltan `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE`. La suite anterior no sustituye esos contratos. No se afirma una nueva validación visual.

El cierre de integración y el resultado del DMG se registran después de ejecutar ambas operaciones.
