# Plan — 58 Borradores recuperables y autoguardado

**Spec fuente:** [spec.md](spec.md). **Estado:** Implementado en rama; ver [validación](validacion.md). **Fecha:** 2026-11-05.
**Base:** HEAD `32bda9f`, main integrado 3.21.0. La rama `feature/sdd-recuperacion-borradores` se creó desde `fix/recuperacion-sesion-memoria` y conserva sus cambios sin commit de 3.21.1. No atribuir esos cambios a SDD 58 ni descartarlos. Integrar o portar explícitamente esa corrección antes de construir sobre otra base.

## Inspección y reutilización

| Fuente existente | Uso y diferencia respecto al objetivo |
| --- | --- |
| `src/renderer/src/App.tsx` | Escena y sceneAside separados, createSceneSavePayload, detección dirty y guardado manual. Autosave sessionStorage solo fuera del servicio. Extraer proveedor de snapshot completo sin duplicar documentos por render |
| `src/web/GameEditor.tsx`, `ServiceApp.tsx`, `workspace.ts` | Retención por identidad, revalidación y descarte. Integrar coordinador de recuperación sin cambiar garantías de cuenta/lease |
| `src/renderer/src/components/MapViewport.tsx` | Suspensión/liberación gráfica de 3.21.1; restaurar cámara después de elegir documento |
| `src/infrastructure/browser/browser-client.ts` | Revisiones, bindings, carga/guardado y revalidate global. Separar dependencias efectivas del editor de la caché de biblioteca |
| `src/infrastructure/browser/http.ts`, `mutations.ts` | Cancelación por generación, cuenta esperada, errores, Retry-After e idempotencia. Añadir transporte de borrador sin volver durable la cola general |
| `src/server/owned-scene-service.ts`, `owned-scene-links.ts` | Validación/normalización de escena, assets y enlaces. Confirmar o copiar usando estos servicios y controles existentes |
| `src/application/services/owned-store.ts`, `src/infrastructure/server/owned/repository.ts` | Puertos transaccionales, CAS y aislamiento. Nuevo repositorio de borradores; no añadirlos como un ResourceKind de biblioteca |
| `src/infrastructure/server/database/{driver,migrations}.ts` | SQL portable, exclusión, checksums y migración explícita. Inspección actual: versiones 1–7; reservar la siguiente libre al implementar |
| `src/main/service-app.ts`, `service-app.test.ts` | Partición `service-${UUID}` efímera. Nueva partición persistente por origen y limpieza de credenciales antes de navegar |
| `src/infrastructure/server/owned/transfer.ts`, `SDD/guias/owned-data.md` | Transferencia funcional excluye borradores. Mantener exclusión explícita y mostrar conteos/aviso; backup físico sí los incluye |

El criterio de reutilización es conservar dominio/puertos y las restricciones de seguridad. No convertir la API de proyección pública ni heartbeat en almacenamiento de borradores. No introducir dependencias de React/Pixi/SQL en el dominio.

## Diseño por capa

| Capa | Módulos previstos | Responsabilidad |
| --- | --- | --- |
| Dominio | `src/domain/drafts/{draft,recovery,save-status}.ts` | Sobre versionado, comparación por rama/secuencia/hash, dirty, dependencias, límites y acciones de recuperación |
| Aplicación | `src/application/services/{draft-store,draft-coordinator}.ts` | Puertos local/remoto, temporización 1/5 y 5/30, máximo un envío + una candidata, cancelación y ACK por generación |
| Infraestructura cliente | `src/infrastructure/browser/drafts/{indexeddb-store,http-store,checkpoint-worker}.ts` | IDB transaccional, normalización/hash fuera del render, HTTP, journal de envío incierto y capacidades |
| Infraestructura servidor | `src/infrastructure/server/owned/draft-repository.ts` | Revisión CAS, cuotas por cuenta, historial acotado y recibo de último envío en una transacción |
| HTTP/casos de uso | `src/server/owned-drafts.ts`, integración con `owned-http.ts` | Endpoints privados, auth al commit, confirmación de escena, exportación/descartes y errores seguros |
| Contratos | `src/shared/contracts/drafts.ts` | Schemas estrictos, DTOs y versiones; nunca aceptar objeto React, caché HTTP o privilegios del cliente |
| Vista | `src/web/DraftRecovery.tsx`, componentes de estado de guardado | Resumen/elección sin canvas adicional, estado de tres destinos, cuotas y acciones explícitas |
| Electron | `src/main/service-app.ts` | Aislamiento de persistencia por origen, limpieza de credenciales y pruebas de arranque/cierre |

Son rutas previstas, no archivos ya implementados. Mantener un adaptador IndexedDB pequeño; añadir dependencia solo si se justifica frente a usar la API nativa. El worker y su cola deben tener presupuesto: no clonar/enviar documento entero en cada evento de movimiento ni retener múltiples snapshots grandes durante debounce.

## Identidad de borradores y almacenamiento

### Local

Base IndexedDB versionada del origen; stores separados para índice, checkpoints y operación pendiente. Claves incluyen cuenta, partida, escena nullable y `localDraftId`/escritor. `draftId` remoto es nullable hasta completar la creación; guardar el mapeo antes del primer PUT. Cookies y contraseñas no entran en estos stores. Un wrapper de aplicación comprueba cuenta/ámbito antes de leer cuerpos; IDB no se presenta como cifrado.

Usar una transacción para insertar checkpoint, actualizar índice y rotar generaciones viejas. Medir tamaño real codificado del sobre antes de escribir, contando todos los registros propios para cuota. Si no cabe, conservar la generación anterior y el nuevo documento en memoria; no borrar primero. Cambios de esquema incompatibles se conservan/exportan, sin abrirlos en Pixi ni hacer reset de IDB.

Identidad del escritorio: partición persistente derivada del origen validado, no de URLs con ruta/query/secretos. Limpiar cookies al inicio y al cierre limpio, y cualquier almacenamiento auxiliar de autenticación, sin eliminar los stores de recuperación. Esperar la limpieza antes de loadURL; después de un crash se repite. Mantener navegación/recurso allowlist, sandbox, ausencia de preload remoto y permisos actuales. No hacer persistente toda la sesión accidentalmente. Probar el comportamiento real de Electron en la etapa 1.

### Servidor

Migración aditiva con dos tablas conceptuales:

- `owned_drafts`: id generado en servidor, owner, game, writer, parent nullable, scene de origen nullable, revisión base, sistema/hash, estado activo/confirmado, head revision/sequence/hash, último recibo y fechas. PK/FK compuestas preservan propietario; origen de escena puede quedar inexistente sin destruir el borrador.
- `owned_draft_versions`: owner/draft/revision, secuencia, cuerpo validado, bindings, hash, bytes y fecha; máximo tres filas por rama. Borrado explícito de borrador retira sus versiones en la misma transacción.

Los campos del sobre se validan igual en ambos drivers. La secuencia y revisión del servidor solo crecen; JSON/texto y fechas UTC portables, queries parametrizadas. El tamaño de peticiones/respuestas respeta 10 MiB incluyendo sobre; errores 413/422 sin truncado. Lecturas de índice paginadas, sin cuerpos embebidos. Cuotas se comprueban y aplican bajo exclusión de cuenta/transacción para evitar exceso por dos ramas concurrentes.

No eliminar por TTL borradores activos ni por cerrar una apertura. Archivar mantiene lectura propia; impedir nuevas escrituras vinculadas a partida archivada. Partida borrada: conservar como recuperación huérfana privada y permitir exportación o confirmación como copia en partida compatible elegida por el propietario; mantener índices de recuperación por cuenta además de por partida. Borrar una cuenta sigue la política de eliminación de sus datos, sin transferir borradores a admin.

## Contrato HTTP propuesto

Todas las rutas bajo `/api/v1/dm`, mismo origen y cuenta esperada. Usan autorización DM y transacción del dueño; acceso a ID ajeno devuelve 404. El servidor deriva owner de identidad. Los nombres definitivos pueden ajustarse juntos en contratos/tests sin cambiar la semántica.

| Método/ruta | Contrato |
| --- | --- |
| GET `/draft-capabilities` | Versión de sobre/protocolo y límites, sin contenido privado; 404 antiguo desactiva sincronización remota en esta sesión |
| GET `/drafts` | Índice por dueño, filtros de partida/escena, paginación; incluye huérfanos sin revelar datos de otras cuentas |
| POST `/games/:gameId/drafts` | Crear rama vacía con writer, parent y revisión base; id generado por servidor, idempotencia general, respuesta compacta |
| GET `/drafts/:id` | Cabeza, historial de metadatos y cuerpo de versión solicitada; no devolver tres documentos si solo se pidió uno |
| PUT `/drafts/:id` | Sobre, secuencia/hash y revisión esperada del borrador; recibo propio por rama, sin fila nueva en owned_operations por autosave |
| POST `/drafts/:id/confirm` | Generación exacta, modo actualizar/copia, escena/revisión esperada o nombre/partida destino para copia; idempotencia general y confirmación atómica |
| DELETE `/drafts/:id` | Descarte explícito con revisión esperada/idempotencia; requests antiguos de PUT reciben ausente/conflicto y no recrean rama |

No abrir el borrador por una URL compartible ni usar rutas de invitados. La apertura no forma parte de la clave de persistencia; revocarla no cambia propiedad. Los guardados de borrador pueden conservar una base ya superada: eso protege el trabajo, pero obliga a resolver el conflicto antes de confirmar la escena.

PUT verifica último recibo antes de exigir la revisión avanzada: mismo envío devuelve mismo ACK; secuencia/clave reutilizada con otro hash produce conflicto. Secuencia anterior a head no se aplica. GET permite conciliar respuesta perdida. Crear y confirmar devuelven metadatos compactos para no copiar 10 MiB por cada recibo de owned_operations. Reiniciar API no pierde cabeza, versión ni deduplicación.

El envío del cliente fija payload/revisión/clave hasta conocer su resultado. Si el usuario continúa editando, conservar solo la última candidata; no cambiar el contenido del envío incierto. Tras expiración, resolver ese resultado con la misma identidad antes de enviar algo nuevo. No reenviar operaciones genéricas de biblioteca desde el journal de borradores.

## Confirmar, copiar y resolver dependencias

Extraer un puerto para capturar documento + sceneAside + estado de trabajo usando la normalización actual. Mantener por separado documento original/base, revisiones realmente necesarias y caché de consultas. La confirmación toma la generación exacta respaldada y realiza en una transacción: autoridad, escena/revisión base, sistema/bindings/recursos necesarios, persistencia de escena y referencia al checkpoint. No marcar una versión posterior como guardada por recibir ese ACK.

No usar revalidate global para bloquear el editor por recursos de búsquedas. Comparar la escena base y los bindings efectivos; bibliotecas incorporadas como copia no son dependencias vivas. Enlaces recíprocos continúan por su caso de uso transaccional. Crear una copia exige IDs/referencias correctas y no roba conexiones de la escena fuente; presentar enlaces que requieran reconexión antes de confirmar.

Si no existe una escena confirmable (p. ej., borrador nuevo sin mapa), el respaldo sigue disponible, pero Guardar explica el requisito. Sistema deshabilitado permite recuperar instancia existente con su referencia retenida; crear copia o trasladarla mantiene validaciones de usos nuevos. No actualizar bindings a latest.

## Secuencia de implementación

1. **Fijar base y prototipos acotados.** Preservar 3.21.1; congelar fixtures de escena completa/nueva/conflicto. Verificar persistencia de IDB en Chrome/Electron, limpieza de credenciales después de crash y coste de copiar/hash de sobres cercanos al límite. Registrar baseline JS/GPU y tiempos. No probar con la DB operativa.
2. **Dominio y coordinador.** Schemas versionados, clasificación de diferencias, temporizadores con máximo de espera, dirty por generación, cola de una candidata, cancelación por cuenta y límites. Relojes/puertos falsos para tests deterministas.
3. **Respaldo local y recuperación mínima.** Adapter IDB, journal, rotación transaccional y errores de cuota/corrupción. Integrar memoria + sceneAside en App y recuperación inicial sin esperar capacidades remotas. Mantener UI de 3.21.1 sin canvas durante conflicto.
4. **Persistencia y API remotas.** Migración portable, repositorio, CAS/recibos, índices, permisos y capacidades. Contratos SQLite/PostgreSQL TLS con ACK perdido/reinicio/contención. Solo entonces activar sincronización por defecto contra servidor compatible.
5. **Confirmación y conflictos.** Transacción confirmar/copiar, dependencias efectivas, referencias/enlaces, conciliación de envío incierto. Mantener guardar manual antiguo como fallback sin prometer su atomicidad con un borrador remoto inexistente. No cambiar rutas existentes para clientes viejos de forma incompatible.
6. **UI y clientes.** Indicador compacto, selector de ramas, recuperación, exportación, cuotas/logout y estado parcial. Partición Electron persistente selectiva; conservar local autónomo. Abrir escena guardada no borra respaldo; descartar sí requiere alcance explícito.
7. **Carga, regresión y documentación.** Ejecutar matriz de aceptación y rendimiento, actualizar guías afectadas con comportamiento real, registrar pendientes. Incremento minor al completar producto; commit/merge y DMG solo al recibir orden.

Las etapas son dependencias de una entrega, no trabajos factory iniciados. Si se solicita fábrica más adelante, crear expedientes que referencien estos criterios sin simular revisiones previas.

## Validación prevista

| Criterios | Prueba | Entorno / evidencia |
| --- | --- | --- |
| CA-01/02/07 | Reloj: ráfagas, edición continua, idle, cámara, ACK viejo y una petición pendiente | Unitarias de coordinador; contadores y traza de generaciones, pendiente |
| CA-03/08 | IDB real: recarga, cierre, cuota denegada, versión corrupta, escritura interrumpida, hasta 10 MiB | Chrome aislado; prueba de integración y captura de estados, pendiente |
| CA-04/09 | Expiración/reautenticación, cuenta distinta, revocación durante commit, roles, payload malicioso | HTTP con identidades sintéticas, SQLite y PostgreSQL TLS; pendiente |
| CA-05/06/07 | Dos ramas, cambios de biblioteca relevante/no usada, escena borrada, copia con enlaces, respuesta perdida | Contratos de aplicación/DB y dos pestañas, pendiente |
| CA-10 | 2000 autosaves, concurrencia, cuotas en bytes, rollback, recibos compactos | Ambos motores; filas y bytes antes/después, pendiente |
| CA-11 | Reinicio limpio/forzado, cookies ausentes al arranque, IDB conservado, otra URL/origen, limpieza fallida | Electron servicio real y regresión autónoma, pendiente |
| CA-12 | Compatibilidad de capacidades y fallback sin polling de 404 | Matriz de clientes/servidores, pendiente |
| CA-13 | Migración desde esquema anterior, repetir, rollback, backup/restore, exclusión de paquete funcional | Bases temporales SQLite/PostgreSQL TLS, pendiente |
| CA-14/15 | Teclado, 390 px, logout sin sincronizar, 20 ciclos, edición grande continua | Chrome/Electron y perfil JS/GPU; pendientes |

Reutilizar fixtures `src/infrastructure/server/owned/` y sus contratos comunes. Agregar pruebas a sus configuraciones de Vitest para que `test:owned` ejecute ambos motores, no crear una suite SQLite que simule PostgreSQL. La medición de memoria registra baseline, después de GC cuando esté disponible y recursos vivos; tras suspender debe haber cero canvas Pixi activos para el editor retenido y sin cola/listeners crecientes. Diferenciar memoria reservada por el navegador de objetos retenidos; un fallo de estabilidad bloquea aceptar CA-15.

Comandos al implementar:

```bash
pnpm typecheck
pnpm lint
pnpm test --exclude '.local/**' --exclude 'tmp/**' --maxWorkers=2
pnpm test:db
pnpm test:owned
pnpm test:identity
pnpm test:moderation
pnpm build:api
pnpm build:web
pnpm build
```

Los contratos de DB requieren entornos aislados y PostgreSQL/TLS reales según [guía de datos](../../guias/database.md). Si no están disponibles, registrar gate pendiente. Migrar las bases de prueba, no ejecutar db:migrate ni restauración sobre datos del usuario para validar esta documentación.

## Operación y compatibilidad

- Publicar migración/API antes del frontend; el frontend nuevo contra API vieja mantiene respaldo local y Guardar habitual. No activar endpoints con esquema pendiente.
- Backup integral previo a migrar; tablas nuevas no cambian `.ttrpgscene` v2 ni paquete funcional. Avisar que transferencias funcionales excluyen borradores; mantener respaldo de base para conservarlos.
- Un retorno de código puede rechazar un esquema más nuevo: no prometer rollback automático. Recuperar con respaldo previo y comunicar que se pierden cambios posteriores, o usar una versión compatible; no borrar tablas a mano.
- Métricas sin contenido privado: duración, bytes, fallos de cuota, cantidad de ramas y estados de sincronización. No registrar notas, cuerpos, credenciales ni URLs de invitación.
- Actualizar al implementar SDD 03/43/45/46/48/51, guías navegador/operación/datos y estado actual. Conservar evidencia de 3.21.1 y no reescribirla como validación de autoguardado.

## Decisiones de implementación y estado

Implementación 3.22.0 sobre la corrección 3.21.1, sin integrar ni modificar la base operativa. Se reutilizan los puertos/transacciones de propiedad, `OwnedSceneService`, transporte autenticado y callbacks del editor. La migración asignada es la **8**; tablas `owned_drafts` y `owned_draft_versions`.

El esquema compartido queda en `src/domain/drafts/draft.ts`, sin duplicarlo en contratos. IndexedDB nativo usa stores `index`, `versions` y `preferences`; el journal exacto vive dentro del checkpoint, en la misma transacción que índice/generaciones. `fake-indexeddb` es una dependencia solo de pruebas. Los índices no cargan cuerpos. El coordinador conserva una candidata y un envío pendiente, deduplica hashes, espera antes de serializar y usa SHA-256 de Web Crypto; **no hay worker de serialización en esta entrega**. El coste en el límite de 10 MiB debe medirse antes de dar por aceptado CA-15; si hace falta, mover normalización/hash a worker sin cambiar contratos.

Se añade POST `/draft-definitions`, lectura privada de presentaciones retenidas por binding. No publica fichas ni cambia usos permitidos. Confirmar un borrador sigue siendo una acción explícita: CAS de escena, creación/actualización, asociación a partida y marca de confirmación en una transacción. PUT de autoguardado usa su recibo propio; la transferencia funcional informa cuántos borradores excluye sin cambiar el formato del manifiesto.

La interfaz incorpora `DraftRecovery` en el editor y `DraftArchive` en partidas. El archivo permite exportar/copiar respaldos de partidas archivadas/eliminadas a un destino compatible. El selector de generaciones anterior está en el editor. Los respaldos no incluyen imágenes inline ni objetos Pixi; los fallos de cuota conservan la generación anterior. Un contador de época por cuenta impide que un escritor previo al logout recree copias.

Las etapas de código están construidas. La matriz de validación anterior describe el objetivo; los resultados efectivamente ejecutados y las comprobaciones todavía pendientes se encuentran únicamente en [validacion.md](validacion.md). No registrar como ejecutados el perfil JS/GPU o la prueba nativa de reinicio de Electron sin evidencia.

## Corrección 3.22.1 — recuperación local de figuras (2026-11-06)

Rama `fix/recuperacion-local-figuras`, conserva el trabajo anterior sin commits. Se reprodujo que App omitía respaldos si no había mapas/notas/fichas aunque hubiera figuras. Además, `draftContent` reutilizaba `serializeSceneDocument`, que rechaza escenas sin mapas. Se retira ese filtro y se normaliza el documento completo con `syncActiveMapFromRuntimeFields` + `parseSceneDocument`, conservando el contrato de escena confirmada por separado.

El cambio de número de figuras dispara flush local inmediato; el resto conserva 1/5 s. El proveedor de snapshot lee referencias actuales. `browser.clear` usa el cierre del coordinador que termina el respaldo pendiente. Las figuras también activan la advertencia de salida. La UI elige una copia local por defecto y ofrece recuperar/cargar mapa, con detalles avanzados contraídos; no depende del listado remoto. Cargar el mapa restaura como versión confirmada, sin borrar la copia. Conflictos se recuperan como copia con enlaces desconectados; no se reenvían operaciones inciertas al restaurar el estado local.

Regresiones: App real → figuras con/sin mapa → IndexedDB → desmontaje → App nuevo → restauración; cierre antes del debounce; diálogo con servidor remoto sin respuesta, copia por conflicto, carga confirmada, respaldo dañado y escena eliminada. El render se sustituye en pruebas por un adaptador para comprobar estado sin GPU.
