# Tareas — Corrección de recuperación con heartbeat 409

Fuente: [spec.md](spec.md), criterios **FIX-01-CA-01–04**; [plan técnico](plan.md#fix-01--recuperación-con-apertura-rechazada-2026-11-15). Rama `fix/recuperacion-borrador-409`. Base 3.31.1; entrega correctiva **3.31.2**. No incluye integración Git.

## FIX-01 — Conservar borrador y resolver apertura rechazada explícitamente

**Estado:** implementada y validada localmente; [evidencia](validacion-fix-01.md). Producto con propietario frontend único; un segundo builder aportó exclusivamente el nuevo archivo `GameEditor.opening-recovery.test.tsx`. PM conserva spec y evidencia. Cambios previos/ajenos preservados, sin cambios de backend ni integración Git.

**Objetivo:** eliminar el ciclo Recuperar→heartbeat409 con openingId/generation obsoletos, mostrando la causa y permitiendo continuar/iniciar con autoridad vigente, sin pérdida de contenido ni publicación automática.

**Ownership de escritura:** `src/web/GameEditor.tsx`, `src/web/DraftRecovery.tsx`, `src/web/GameEditor.test.tsx`, `src/web/GameEditor.authority.test.tsx`, `src/web/DraftRecovery.test.tsx`; `package.json` y `CHANGELOG.md` para patch. Lectura/reutilización: `src/web/service-model.ts`, `src/application/services/draft-coordinator.ts`, `src/infrastructure/browser/browser-client.ts`, cliente/contratos de invitaciones y selección SDD59. No cambiar esos contratos, persistencia, DB, IPC o API para resolver este bug.

### Implementación delimitada

1. Preservar fase/código/mensaje del error; distinguir apertura de documento/configuración y errores transitorios. Entregar el diagnóstico a un único diálogo sin ocultarlo detrás de `conflict=true`.
2. Tras heartbeat rechazado, consultar apertura una sola vez automáticamente; ofrecer Continuar o Iniciar nueva apertura explícitos según resultado. Mostrar consecuencias de la nueva invitación en ese mismo diálogo. GET fallido exige reintento manual. Sin reapertura forzada ni heartbeat/start automáticos desde Recuperar.
3. Mantener recuperación del contenido separada de la autorización. Antes del remount, garantizar conservación y traspaso tipado del checkpoint exacto; esperar una recuperación ya iniciada. Conservar dirty/confirmado, selección y copia independiente sin sceneId. Restaurar una vez antes de la carga automática de escena; no sustituirla silenciosamente por la URL, ni añadir un nuevo modal.
4. No avanzar si la copia solo reside en memoria y no se garantiza el traspaso; mostrar fallo/exportación. No asumir que flushLocal no-op con respaldo deshabilitado es ACK. No descartar ni reenviar peticiones inciertas como efecto de esta corrección.
5. Reutilizar operaciones existentes y sus CAS; revalidar antes de adoptar respuesta, descartar callbacks tardíos y conservar aislamiento de cuenta/partida/generación. El editor/cliente remoto permanece suspendido hasta recuperar contenido y autoridad. Publicación sigue explícita.
6. Añadir regresiones semánticas de la matriz del plan, ejecutar gates dirigidos y entregar evidencia al PM. Patch 3.31.2 si la base sigue en 3.31.1; verificar antes de editar y documentar fecha/tipo/resumen en changelog.

### Dependencias y cierre

Autorización de rama y acuerdo UX resueltos; delta de spec escrito por PM. No hubo tarea backend ni escritura concurrente sobre el mismo archivo. La cobertura del nuevo archivo de autoridad se ejecutó en paralelo con la implementación.

Cierre local: FIX-01-CA-01–04 comprobados mediante 70 pruebas, typecheck/lint/builds y recuperación con API real en navegador Chromium integrado y Electron servicio. La inspección complementaria de Chrome/390 px quedó pendiente por bloqueo del Mac, sin cambios de CSS. Si falla una restauración o lectura, el original permanece disponible; ningún éxito ficticio o If-Match actualizado automáticamente. La evidencia distingue pruebas simuladas de plataforma real. Sin mutaciones sobre datos operativos, migraciones ni integración Git.
