VEREDICTO: CAMBIOS

Revisión independiente de código008, ciclo1, ronda2, 2026-10-30. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Se leyeron perfil, solicitud/spec/build vigentes, identidad y huellas de ronda2 y el informe propio de ronda1; no se consultaron informes ajenos. La comparación de huellas entre rondas identificó los cambios examinados; SHA256 final sin diferencias contra ronda2.

## Alcance y cierres comprobados

Se revisaron los cambios de propiedad/rol/sesión de los puertos, efectos posteriores al commit, unidad DB y descarte de conexión, política de plantillas, transferencia/exportación, CLI/diagnósticos, errores HTTP/DTO y pruebas asociadas. Se conserva el alcance008: no se exige UI011 ni invitaciones009/moderación010. Versión3.10.0 sin segundo bump; sin dependencias nuevas ni alteración del documento portablev2.

El caso secuencial del hallazgo anterior está corregido: el borrado busca monstruos del propietario y rechaza con `TEMPLATE_REFERENCED`; la revisión se comprueba previamente. El contrato nuevo prueba edición posterior, aislamiento respecto de otro DM con igual ID y transferencia completa. Ambos exportadores inspeccionan relaciones antes de devolver éxito y retiran el manifiesto si falla esa inspección. El legado con referencia ausente recibe `TEMPLATE_MISSING` y una reparación explícita documentada.

Los puertos capturan owner, rol y sesión al construirse, por lo que no confían en cambios posteriores del DTO. El catálogo autorizado comprueba owner y los recursos funcionales requieren rol DM. La publicación clona el snapshot, difiere la mutación observable hasta COMMIT y revalida el contexto después de drenar SQL pendiente; lock de sesión PostgreSQL/cola SQLite cubren la aplicación síncrona. Un resultado de commit incierto descarta el runtime afectado. Las pruebas nuevas incluyen fallo tardío, revalidación, publicación/archivo y pérdida de respuesta de commit.

La CLI distingue categorías sanitizadas y no asegura rollback cuando COMMIT pudo alcanzar la base; se conservaron el reintento por huella y la cancelación cooperativa. `REVISION_CONFLICT`, presupuesto, contenido distinto y resultado demasiado grande se separan con códigos/estados apropiados; `retryAt` es opcional en el DTO compartido. No encontré otro bloqueo concreto en estos cambios durante esta inspección.

## Hallazgo pendiente

### P2 — La comprobación de plantilla todavía permite referencias inválidas con operaciones paralelas dentro de la unidad autorizada

**Archivo/líneas:** `src/infrastructure/server/owned/repository.ts:95–103`; interacción con la consulta previa de plantilla en `repository.ts:73` y la inserción en `repository.ts:78`.

El bloqueo global impide que otra transacción interfiera, pero no serializa métodos asíncronos iniciados simultáneamente sobre el mismo `OwnedTransaction`. La comprobación de dependencias y el DELETE son operaciones separadas. Si el callback inicia primero `remove(T)` y luego `put(M→T)` mediante Promise.all, el guard del monstruo ve la plantilla y el guard del borrado todavía no ve el monstruo; después se inserta M y se borra T. Ambas promesas y la transacción terminan con éxito. El drenaje de escrituras pendientes solo espera su finalización: no vuelve a comprobar esta relación antes de COMMIT.

**Reproducción propia ejecutada, determinista, sin sleeps:** SQLite físico temporal con migraciones reales, BetterAuth real, administrador y DM provisionados/cambiados de contraseña mediante `openIdentity`. Tras crear T con revisión1 y sin monstruos:

```ts
await identity.authorized(cookieDm, "dm", (_, tx) => Promise.all([
  tx.resources.remove("templates", template.id, 1),
  tx.resources.put("monsters", monsterConTemplateId, 0)
]));
```

Una nueva transacción autorizada confirma que T ya no existe y M sí existe, manteniendo `templateId=T.id`. `exportOwned` sobre esa misma base falla con `TEMPLATE_MISSING`.

Salida observada:

```text
authorized parallel commit accepted
state { template: false, monster: true }
export rejected TEMPLATE_MISSING
```

También se reprodujo primero con `identityDatabase` y `ownedRepositories` reales, antes de corroborarlo con la frontera autenticada completa. No se escribió SQL corrupto sobre recursos, no se manipularon documentos persistidos ni se omitió la espera de las promesas. Son métodos públicos del puerto asíncrono; otros contratos de008 ya usan operaciones paralelas en callbacks autorizados. No se afirma que dos peticiones HTTP separadas eludan la exclusión: el caso residual está dentro de una misma unidad de aplicación.

**Consecuencia:** la corrección aún permite confirmar el mismo estado inconsistente de ronda1, que bloquea posteriores escrituras del monstruo con esa referencia y la transferencia del catálogo. El exportador ahora rechaza correctamente el paquete, pero eso no restaura la integridad de los datos ya confirmados.

**Corrección esperada:** garantizar la invariante en el estado final de la transacción, también cuando el callback inicia métodos en paralelo. Puede hacerse mediante una comprobación final de las referencias afectadas antes de COMMIT o una serialización adecuada de esas operaciones; no basta el lock entre transacciones. Añadir regresión en ambos motores con el orden de Promise.all anterior y exigir rechazo/rollback completo o un estado final válido y exportable. Conservar la comprobación por owner y el CAS. Afecta A6/A9 y constituye cierre parcial del hallazgo de código anterior, sin ampliar alcance a009–011.

## Verificación y límites

- `pnpm typecheck`: **PASS**, evidencia propia `/tmp/008-r2-review-codigo-typecheck.log`.
- `pnpm lint`: **PASS**, evidencia propia `/tmp/008-r2-review-codigo-lint.log`.
- Dos reproducciones dirigidas con SQLite real y módulos actuales cargados mediante Vite SSR: una sobre repositorios/unidad, otra con `IdentityService.authorized` y DM real. Ambas confirman el defecto. Unidades de identidad, servidores Vite y directorios temporales propios cerrados/eliminados al terminar.
- Huellas de código/documentación: **sin diferencias** contra `ronda-2/huellas.json` tras las comprobaciones.
- Se inspeccionaron `corrections.contract.ts` y los ajustes de contratos de identidad, propiedad y transferencia. La regresión de plantilla añadida prueba el rechazo cuando el monstruo ya existía al comenzar; no prueba el alta paralela descrita.
- No se cargó PostgreSQL ni se repitió `test:owned`: el orquestador reservó esa ventana al revisor de seguridad. Los resultados actuales del constructor (32 propiedad,32 DB,25 identidad y1.201 generales, builds) se contrastaron con build.md y se atribuyen a su evidencia, no a una ejecución propia de esta ronda. La reproducción propia del defecto es SQLite; no se atribuye una reproducción PostgreSQL no realizada.
- No se hizo CUA ni se repitieron builds: no cambiaron UI/renderer/preload y el bloqueo se reproduce en el puerto servidor. Las pruebas DB/identidad ejecutadas por este revisor en ronda1 siguen siendo evidencia histórica, no certificación de las modificaciones posteriores.

No hubo modificaciones de código, Git, tablero, spec, informes ajenos, env/datos originales ni PostgreSQL compartido. Única publicación de esta ronda: este informe mediante temporal y renombrado atómico. La fixture PostgreSQL residual de la ronda anterior fue retirada específicamente por el orquestador tras identificarla; se atribuye esa limpieza al orquestador.
