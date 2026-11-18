# Validación FIX-01 — conflicto de apertura al recuperar

Fecha: 2026-11-15. Base 3.31.1; corrección local **3.31.2**, rama `fix/recuperacion-borrador-409`, sin integración Git. Alcance: [FIX-01-CA-01–04](spec.md), [plan](plan.md) y [tarea](tareas.md).

## Reproducción anterior a la corrección

Se utilizó una copia de la fixture sintética de SDD59, SQLite aislada y API en `127.0.0.1:8877`, con frontend compilado 3.31.1. El servicio operativo del usuario en 8787 no participó.

1. Entrar como DM sintético y abrir una escena desde campaña/arco.
2. Cambiar el nombre del mapa a «Borrador 409 — conservar este mapa», sin confirmar la escena.
3. Inyectar caducidad de sesión y lease exclusivamente en la base de la fixture.
4. Reautenticarse con la misma cuenta. Aparece el diálogo de cambios sin guardar.
5. Pulsar Recuperar borrador: reaparece el mismo diálogo, con fecha de respaldo actualizada y sin el motivo del rechazo de apertura.

Resultado: fallo reproducido con el editor y API reales; la caducidad se aceleró mediante datos sintéticos, sin esperar el plazo natural. La revisión del código localiza el POST de heartbeat que conserva el ID/generación rechazados y la omisión del mensaje al delegar en DraftRecovery. Esto no demuestra cuál de las condiciones de apertura ocurrió en la instancia del usuario.

El POST real de la fixture devolvió HTTP409, código `REVISION_CONFLICT`, mensaje «La apertura cambió. Recarga su estado antes de reintentar.» La protección del backend se conserva. La primera inyección usó marcas temporales incompatibles con las invariantes de lectura de apertura; produjo además un GET503. Se corrigió exclusivamente la fixture antes de validar el arreglo, conservando `createdAt <= lastHeartbeatAt` y un lease de 150000 ms. Ese GET503 artificial no se atribuye al producto.

Evidencia privada: `.local/validation/draft409/before-loop.png`, `heartbeat-response.json`, `qa-context.json`, `qa-before.json` y `baseline.json`. No incluyen datos operativos del usuario.

## Implementación y pruebas automatizadas

El cliente conserva la fase del error y solo consulta la apertura tras un 409 de heartbeat. Recuperar contenido no repite ese heartbeat. Continuar/iniciar exige acción explícita; primero captura y conserva el checkpoint, y lo restaura en el editor autorizado antes de la carga automática de la escena. Un cambio de selección o suspensión invalida callbacks pendientes. No se modificaron backend, contratos de persistencia ni migraciones.

| Criterio | Evidencia |
| --- | --- |
| FIX-01-CA-01 | Pruebas con coordinador real: causa visible, una GET, Recuperar no repite heartbeat/GET. Recorrido real tras caducidad muestra «La apertura de la partida cambió». |
| FIX-01-CA-02 | Continue con mismo ID/generación y start con nueva apertura preservan checkpoint; copia independiente sin sceneId no se reemplaza por la URL. No hay publicación automática. |
| FIX-01-CA-03 | GET fallido exige reintento; CAS cambiado, suspensión y selección tardía no adoptan estado viejo. Captura tras flush, fallo de respaldo, respaldo deshabilitado y operaciones inciertas cubiertos junto a regresiones de documentos/coordinador. |
| FIX-01-CA-04 | 70 pruebas, lint/typecheck y builds aprobados; recuperación real en Chromium integrado y Electron servicio. Patch y changelog actualizados. Límites visuales adicionales abajo. |

Comandos aprobados:

```text
pnpm exec vitest run src/web/GameEditor.test.tsx src/web/GameEditor.authority.test.tsx src/web/GameEditor.opening-recovery.test.tsx src/web/DraftRecovery.test.tsx src/application/services/draft-coordinator.test.ts --exclude '.local/**' --maxWorkers 4
# 5 archivos, 70 pruebas
pnpm typecheck
pnpm lint
pnpm build:web
pnpm build
git diff --check
```

La revisión independiente del delta no encontró bloqueantes. Los tests usan jsdom/transportes sintéticos y no sustituyen el recorrido nativo. Persisten avisos de build preexistentes: `use client` ignorado en dependencias y chunks mayores de 500 kB.

## Recorrido con API real aislada

Se reutilizó el binario API sintético 3.30.0, compatible con los contratos sin cambios, y SQLite esquema 11. El frontend se compiló desde este checkout. El bundle `index-CmzE11ne.js` se verificó en navegador y Electron; la compilación final `index-CqYNhzHo.js` añade únicamente invalidación de handoff al cambiar selección, cubierta por las pruebas. No se atribuye la segunda compilación al recorrido anterior.

1. Chromium integrado: recuperar la copia existente, caducar sesión y apertura con marcas coherentes en la fixture, autenticarse de nuevo con la misma cuenta.
2. Aparece la causa de apertura y «Iniciar nueva apertura», con aviso de nueva invitación. Pulsarlo abre el editor sin repetir el modal y conserva «Borrador 409 — conservar este mapa».
3. Electron servicio con perfil y almacenamiento aislados: cargar la misma escena, renombrar el mapa a «Electron 409 — copia conservada», caducar sesión/apertura y reautenticarse.
4. El mismo diálogo funciona con Shift+Tab y Enter; vuelve al editor con ese nombre y estado de borrador pendiente de confirmar.
5. Comparación de la fila canónica completa de escena antes/después: SHA-256 `c42595f5feaf131d76e8375fc1cecd441d391f99ef600e07edf41356275e6dcc` idéntico. La recuperación no guardó ni sobrescribió la escena del servidor.

Capturas privadas: `after-opening-dialog.png`, `after-recovered-map.png`, `electron-opening-dialog.png`, `electron-recovered-map.png`, bajo `.local/validation/draft409/`. Resultados y trazas: `builder-results.md`, `authority-tests-results.md`, `postfix-expiry.json`, `qa-after.json`, `cleanup.json`.

## Límites y limpieza

- El recorrido adicional de Chrome a 390 px se interrumpió al bloquearse el Mac, antes de navegar desde una ventana privada vacía de QA. No se certifica Chrome nativo ni 390 px; sí Chromium integrado y Electron. No hubo cambios de CSS. La ventana privada vacía no pudo cerrarse mediante la interfaz bloqueada.
- La causa exacta de la apertura rechazada en la instancia del usuario no se inspeccionó. El arreglo cubre la familia de conflictos de apertura, conservando las validaciones del servidor.
- API de QA y Electron aislado detenidos; puerto 8877 libre y sin locks sintéticos. Pestañas de QA del navegador integrado cerradas. Servicio operativo 8787 responde health200; Storybook6006 y Kanban8766 siguen activos. No se detuvo manualmente el servicio operativo ni se alteraron su base/configuración. Su proceso puede renovarse con el watcher de desarrollo al guardar código.
- Sin commit, push, merge, migraciones reales ni nuevo DMG. La base histórica de SDD58 y sus límites de rendimiento permanecen separados de este arreglo.
