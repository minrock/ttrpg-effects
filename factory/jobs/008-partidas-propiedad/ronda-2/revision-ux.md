VEREDICTO: APROBADO

Revisión UX independiente de 008, ciclo 1, ronda 2. Fecha: 2026-10-30. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Alcance: cierre de UX-008-01/02/03, contratos operativos para 011 y recuperación de errores de adopción/migración. No hay hallazgos bloqueantes de UX en el alcance revisado.

## Cierre de los hallazgos anteriores

### UX-008-01 — Cerrado: revisión obsoleta distinguible y recuperable

`src/application/services/game-catalog.ts:3–6` incorpora `REVISION_CONFLICT` con el mensaje «La partida cambió. Conserva tus cambios pendientes y vuelve a leerla antes de reintentar». `src/infrastructure/server/database/catalog-repository.ts:59,67,77,79` lo usa tanto en la comprobación previa como ante el fallo CAS. La colisión de ID al crear conserva `CONFLICT`; ya no se confunden sus causas.

`src/server/owned-http.ts:124–126` conserva código/mensaje y responde 409. El contrato real `src/infrastructure/server/owned/owned.contract.ts:43–46` realiza PATCH y DELETE obsoletos por HTTP, exige ese código y la instrucción de conservar cambios, y después elimina usando revisión 2. La instrucción de recuperación y la distinción quedan documentadas en `docs/owned-data.md`. No se necesita inventar una pantalla de 011 para consumir esta señal.

### UX-008-02 — Cerrado: agotamiento temporal con condición de reintento

`src/application/services/owned-store.ts` distingue `OPERATION_BUDGET`, `OPERATION_CONTENT_CONFLICT` y `RESULT_TOO_LARGE`. El presupuesto responde 429 e indica que la operación no se confirmó, que debe esperarse y que recargar no libera espacio. El HTTP añade `error.retryAt`, declarado también en `src/shared/contracts/http-api.ts`.

`src/infrastructure/server/owned/repository.ts:136–152` limpia registros vencidos, permite replay confirmado antes de exigir presupuesto, calcula el vencimiento máximo de los registros actuales y revierte la operación si sus resultados exceden el presupuesto. Un resultado que por sí solo supera 64 MiB usa 413 y pide reducir contenido; no invita a esperar inútilmente. La documentación especifica conservar la clave y advierte que nuevas operaciones de la misma cuenta pueden extender la espera.

El contrato `src/infrastructure/server/owned/corrections.contract.ts:94–111` llena 1000 registros, comprueba por HTTP 429/código/mensaje/retryAt y ausencia de partida creada; avanza el reloj hasta el vencimiento, confirma una sola creación y su replay, distingue contenido diferente y repite recuperación al agotar bytes. El flujo de recuperación está probado en el contrato compartido de ambos motores.

### UX-008-03 — Cerrado: diagnóstico CLI útil sin revelar detalles privados

`src/server/data-command.ts` valida comandos, pares de argumentos, opciones desconocidas/repetidas y combinaciones incompatibles. `src/infrastructure/server/owned/transfer-errors.ts` define categorías y acciones para sintaxis, rutas, lock de escritor, propietario, destino ocupado, corrupción y cancelación, manteniendo un fallback sanitizado. `src/server/data-cli.ts` imprime uso ante `USAGE`, sale con 1 en error y con 130 en cancelación.

Se ejecutaron directamente ocho casos de la CLI compilada mediante `pnpm exec node out/api/data-cli.mjs`, sin cargar `.env`: comando inválido; argumento faltante; opción repetida; ruta inexistente; ruta que no cumple el requisito físico; paquete corrupto con URL/credencial ficticia; lock de escritor propio; y destino existente propio. Todos dieron exit 1 y stdout vacío. Los códigos fueron respectivamente `USAGE`, `USAGE`, `USAGE`, `PATH_MISSING`, `PATH_UNSAFE`, `CORRUPT`, `WRITER_ACTIVE` y `TARGET_OCCUPIED`. Los mensajes identificaron la acción siguiente y no mostraron rutas privadas ni la URL ficticia. Se usaron directorios temporales propios, eliminados al terminar; el lock fue una fixture, no un proceso ajeno.

La recuperación transaccional también está diferenciada en código: `src/infrastructure/server/identity/database.ts:58–90` solo informa `rolled_back` si ROLLBACK respondió y no se intentó COMMIT; los otros desenlaces son `uncertain`. `importTransfer` propaga ese estado al diagnóstico. El mensaje incierto no promete destino vacío ni éxito: conserva el respaldo y dirige a verify/import con idéntico paquete/asignación para consultar la huella idempotente.

Evidencia de contrato adicional: `transfer.contract.ts` ejecuta CLI compilada para propietario inválido y destino funcional ocupado en ambos motores, exige rollback confirmado sin éxito/fugas, verifica el paquete y repite una importación ya confirmada; prueba cancelación durante filas, destino vacío y reintento. `corrections.contract.ts` prueba SIGINT real esperando exclusión PostgreSQL (exit 130, rollback confirmado y destino vacío), además de pérdida de respuesta de COMMIT en ambos motores, diagnóstico incierto sin secretos y recuperación por huella. Las categorías y sus límites están explicados en la guía operativa.

## Evidencia y límites

Leídos AGENTS.md, perfil `.codex/agents/ux.toml`, solicitud/spec/build 008, identidad de ronda, huellas/base y únicamente el informe UX propio anterior. Inspeccionados los recorridos de catálogo, HTTP, presupuesto, CLI, transferencia y resultado transaccional, junto con sus contratos y documentación. Comparación base/ronda 2: 21 archivos modificados y 21 nuevos, ninguno eliminado. SHA256 de los 42 coincide con la instantánea de ronda 2. No hay cambios en renderer, web, main, preload ni render; no corresponden nuevas exigencias de foco, teclado, Escape/Delete, cámara o escala.

La ejecución CLI descrita arriba es propia. Para HTTP/DB, presupuesto con reloj, cancelación y recuperación completa se revisaron las aserciones reales y el log del constructor `/tmp/008-r2-owned-role.log`: 3 archivos / 32 pruebas PASS, 136,58 s, SQLite y PostgreSQL. Esa ejecución se atribuye al constructor; esta revisión no afirma haberla repetido. El build explica la captura final posterior de autoridad y su comprobación dirigida. No se usó el gate PostgreSQL compartido mientras seguridad lo ocupaba, ni se leyó su informe u otro informe ajeno.

No se realizó CUA ni humo visual nuevo porque 008 entrega backend/operación y no cambia UI; no se exige anticipar 011. No se certifica pg_dump/pg_restore productivo, carga prolongada o migración de datos reales. No se modificaron producto, Git, tablero, especificación, servicios, PostgreSQL compartido ni datos/env originales. La única publicación es este informe, mediante temporal y renombrado.
