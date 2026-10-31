VEREDICTO: CAMBIOS

Revisión independiente de seguridad de 008, ciclo 2, ronda global 3, 2026-10-30. Checkout `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama declarada `feature/factory-006-persistencia-multidb`. Se leyeron AGENTS.md, perfil seguridad, solicitud, retrabajo de ciclo 2, spec/build finales, identidad de ronda, fuentes/diff pertinentes y documentación operativa. No se consultaron informes de otros roles.

## Alcance e integridad

Se verificaron las **591 huellas congeladas**, al iniciar y antes de publicar, con **cero discrepancias**. Contra la base de 565 archivos hay 50 archivos nuevos/modificados propios del trabajo. Se inspeccionaron los nuevos contratos de sistemas, repositorios de catálogo/bindings/enlaces, captura de autoridad, unidad autorizada, HTTP admin/DM, migración 4, retención privada, transferencia v1/v2, runtime y regresiones relevantes. Las áreas ya revisadas de identidad/driver/efectos se cotejaron con las huellas anteriores y sus consumidores actuales. No hay cambios de UI, preload, main o Pixi en este retrabajo.

## Hallazgos que requieren corrección

### P2 — Una plantilla válida nueva del catálogo impide exportar el dataset completo

**Ubicación:** `src/infrastructure/server/owned/transfer.ts:255–256`; validación previa de binding correcto en el mismo archivo, líneas 219–226; llamada desde `exportOwned`, líneas 173–174.

`inspectTransfer` ya resuelve cada binding de catálogo por sistema/version/templateId contra las publicaciones del manifiesto. Sin embargo, al final conserva otra comprobación heredada que exige que todo `templateId` de un monstruo aparezca en recursos privados `templates` o en `builtInMonsterTemplates`. Una presentación publicada por admin con un ID nuevo no pertenece a ninguno de esos conjuntos. El exportador produce el paquete y luego lo rechaza con `TEMPLATE_MISSING`, retirando su manifiesto de terminación, aunque la publicación y el binding estén presentes y sean válidos.

**Reproducción independiente real, repetida en SQLite y PostgreSQL:** crear `review-custom@1` mediante un principal admin; tomar la definición D&D válida y cambiar su presentación a `id: "review-custom-template"`, `builtIn: false`; guardar borrador y publicar. Con principal DM crear un monstruo de biblioteca cuyo `templateId` sea ese ID y binding `{root:{scope:"catalog",systemId:"review-custom",version:1,templateId:"review-custom-template"},monsters:{}}`. La escritura autorizada confirma. Ejecutar `exportOwned(config, destinoNuevo)`.

Resultado observado en ambos motores:

```json
{"saved":true,"exported":false,"code":"TEMPLATE_MISSING","completionManifest":false}
```

**Impacto:** una utilización válida del catálogo nuevo bloquea la exportación operativa de toda la base y, por tanto, su transferencia/restauración funcional mediante este formato. Es un defecto de disponibilidad y recuperabilidad de datos del alcance A10; no se afirma exfiltración, corrupción del origen ni pérdida de datos ya guardados. No depende de deshabilitar la definición. Las pruebas de sistemas actuales reutilizan IDs incorporados y no detectan esta variante.

**Corrección esperada:** validar la relación según el binding y su ámbito/version exactos. La regla histórica debe limitarse al lector de datos sin binding o reconciliarse con las publicaciones ya validadas; no ampliar una allowlist global por nombre. Añadir export→inspect→import→verify con una presentación cuyo ID no exista en built-ins ni plantillas privadas, incluyendo versión deshabilitada y conservación del contenido.

### P2 — Un rechazo sin motivo permite confirmar escrituras de una operación fallida

**Ubicación:** `src/infrastructure/server/identity/index.ts:190–207`, especialmente la asignación de `failure` en 194 y los controles `if (failure)` en 204/207.

La unidad registra el valor rechazado como indicador de fallo. JavaScript permite `Promise.reject()` sin argumento y rechazos con `null`, `false`, `0` o cadena vacía; esos valores son falsy. Si el callback captura ese rechazo, el drenaje termina correctamente y las comprobaciones de `failure` no abortan. Además, el registro se sobrescribe en cada rechazo en lugar de conservar un estado de fallo independiente.

**Reproducción independiente real, repetida en ambos motores:** dentro de `identity.authorized(cookieDM,"dm",...)` ejecutar:

```ts
await tx.operation(randomUUID(), "review-rejected-undefined", {}, async () => {
  await tx.games.create(ownerId, "Debe revertir", GENERIC_SYSTEM);
  return Promise.reject();
}).catch(() => undefined);
```

El callback autorizado termina; la unidad retorna éxito y un listado posterior muestra la partida. Resultado observado tanto en SQLite como PostgreSQL:

```json
{"outcome":"committed","totalAfterRejectedOperation":1}
```

**Impacto y límite:** la operación fallida deja su mutación confirmada sin resultado idempotente, incumpliendo la política explícita de abortar toda la unidad ante rechazos capturados. Un reintento puede duplicar efectos. El hallazgo está en la frontera de aplicación/transacción; no se afirma una escalada de rol ni una ruta HTTP actual que genere por sí misma este rechazo sin motivo.

**Corrección esperada:** mantener una marca booleana irrevocable de rechazo, independiente de su valor, y conservar el primer motivo o normalizarlo a un error seguro. No permitir que rechazos posteriores falsy borren el estado previo. Añadir regresiones para `Promise.reject()` capturado, motivo null/falsy, mezcla con un error previo y variantes allSettled/no-awaited; comprobar rollback de filas y ausencia de resultado idempotente en ambos motores.

## Evidencia ejecutada por este revisor

- `python3 /tmp/ttrpg-auth-pg-run.py test:owned`: **4 archivos, 40/40 PASS, 203,14 s, exit 0, sin skips**. Ejecutado contra el código final congelado, SQLite físico y PostgreSQL real con TLS, identidades reales, HTTP temporal y CLI compilada. El resultado verde no cubre los dos casos adicionales anteriores.
- Dos probes adicionales mediante `python3 /tmp/ttrpg-auth-pg-run.py exec node --input-type=module`, enviados por stdin, cargando fuentes reales con `vite.ssrLoadModule` y fixtures oficiales. Cada probe recorrió SQLite y PostgreSQL, creó cuentas/bases/directorios propios y cerró fixtures y Vite en finally. Ambos terminaron con exit 0; los resultados JSON anteriores fueron su salida. No se modificaron fuentes ni pruebas del checkout para ejecutarlos.
- La configuración privada del runner no se imprimió. El gate emitió únicamente el aviso conocido de consultas concurrentes en pg 8 y futura incompatibilidad pg 9, sin fallo.

## Controles conservados y verificados

La autoridad owner/rol/sesión sigue capturada antes del callback. El catálogo admin no entrega puertos DM; el DM no escribe catálogo ni lee borradores. No existen métodos de borrado de definiciones y la fachada privada rechaza escritura/borrado. Las definiciones personales permanecen por propietario y no se publican automáticamente.

HTTP conserva Host/Origin, validación estricta, revalidación de sesión antes del body y dentro de la transacción, límites, CSP/no-store/nosniff y respuestas ajenas indistinguibles. Referencias de sistema son exactas; el registro de módulos solo resuelve implementaciones compiladas y no admite rutas o JS externos. SQL permanece parametrizado y la retención no ejecuta Markdown/CSS/HTML ni descarga contenido.

Las regresiones reales acreditan deshabilitación frente a altas/ediciones, CAS, revocación admin durante body, referencias privadas, migración 3→4 y rollback de upgrade, integridad final de enlaces, presupuesto concurrente y captura de argumentos. El registro del método completo mejora el manejo de errores normales; permanece el caso falsy descrito.

La publicación runtime mantiene preparación invisible, revalidación de contexto/sistema, efectos síncronos después de COMMIT bajo exclusión y descarte ante incertidumbre. La transferencia conserva validación física de rutas, hashes/límites, asignación explícita de propietario, destino vacío, rollback/cancelación y diagnósticos sanitizados; queda bloqueada para el caso de catálogo nuevo señalado.

## Límites y estado final

No repetí gates DB/identidad completos, suite general, builds, carga prolongada ni humo visual; los resultados de build se atribuyen al constructor. No se verificó pg_dump/pg_restore productivo. No se exigieron UI011, invitados/SSE009–010 ni plugins externos.

No se modificaron código, Git, tablero, specs, datos ni configuración originales. Las pruebas y probes terminaron con limpieza de sus fixtures; la ventana PostgreSQL se liberó y el servidor compartido permanece activo. Única escritura del revisor en el checkout: este informe, publicado mediante temporal y renombrado atómico.
