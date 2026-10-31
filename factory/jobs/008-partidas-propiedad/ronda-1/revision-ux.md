VEREDICTO: CAMBIOS

Revisión UX independiente de 008, ciclo 1, ronda 1. Fecha: 2026-10-30. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Alcance: flujo operativo de adopción/migración, claridad de propiedad y contratos de errores para 011. Sin nueva UI en 008; no se exige anticipar pantallas, invitaciones o moderación.

## Hallazgos que requieren corrección

### UX-008-01 — P2: una revisión obsoleta se explica como ID duplicado

Evidencia: `src/infrastructure/server/database/catalog-repository.ts:59,67,77,79` lanza `CatalogError("CONFLICT")` al renombrar, archivar o borrar una partida con revisión obsoleta. `src/application/services/game-catalog.ts:6` fija para ese código el mensaje «El identificador de partida ya existe». `src/server/owned-http.ts` transmite ese mensaje en el 409 sin transformarlo.

Impacto: dos clientes que editan la misma partida reciben una causa falsa. El usuario no elige el UUID y cambiar el nombre no resuelve la obsolescencia; 011 tampoco puede distinguir este caso de una colisión de creación por el contrato actual. Afecta el flujo de recuperación de cambios concurrentes previsto en A6 y la entrega de errores a 011.

Corrección esperada: distinguir el conflicto de revisión mediante código/submotivo o un error específico con mensaje que indique que la partida cambió y que deben releerse sus datos antes de reintentar, conservando los cambios locales pendientes. Añadir comprobación HTTP del código/mensaje para PATCH y DELETE con revisión antigua; no basta verificar únicamente status 409.

### UX-008-02 — P2: el presupuesto agotado recomienda una recuperación que no funciona

Evidencia: `src/infrastructure/server/owned/repository.ts:120–123` devuelve el mismo `OwnedError("CONFLICT")` al alcanzar 1000 resultados o 64 MiB de idempotencia. `src/application/services/owned-store.ts:9` lo traduce como «El recurso cambió o la operación ya tiene otro contenido. Recarga antes de reintentar». `docs/owned-data.md` describe correctamente que hay que esperar la expiración de los registros, cuya retención es 24 horas.

Impacto: al agotarse el presupuesto, toda mutación nueva queda bloqueada aunque las revisiones sean actuales. Recargar o generar otra clave no libera el presupuesto y el cliente de 011 recibe la misma señal que un conflicto editable. El DM puede entrar en un ciclo de recarga y reintento sin saber por qué no guarda.

Corrección esperada: exponer un motivo estable y sanitizado de presupuesto agotado, distinto de revisión obsoleta y reutilización de clave con otro contenido; indicar que la operación no se confirmó y cuándo o bajo qué condición puede reintentarse. No hace falta cambiar el límite ni añadir UI en 008. Verificar con reloj inyectado que el error permite distinguir el caso y que el reintento procede al expirar suficientes registros.

### UX-008-03 — P2: la CLI elimina el diagnóstico necesario para recuperar una migración

Evidencia: `src/server/data-cli.ts:23` captura todas las causas y las convierte en una sola lista genérica de siete comprobaciones. Se ejecutaron desde este checkout, sin cargar `.env` ni abrir una base:

- `pnpm exec node out/api/data-cli.mjs inspect --bundle /ruta-inexistente-ux008`
- `pnpm exec node out/api/data-cli.mjs comando-invalido`

Ambas devolvieron exit 1, stdout vacío y exactamente: «No se pudo completar la operación. Comprueba comando, rutas privadas, respaldo, formato, propietario activo y destino vacío; consulta docs/owned-data.md. No se imprimen datos ni credenciales.» La inspección de `transfer.ts` confirma que también colapsan ahí lock existente, corrupción, propietario inválido, destino ocupado y cancelación. Los contratos actuales comprueban rechazo y éxito, pero no la utilidad del diagnóstico de CLI.

Impacto: el operador no sabe si debe corregir la sintaxis, detener un escritor, elegir un destino nuevo, revisar la asignación o reemplazar un paquete corrupto. En un fallo de adopción tampoco se informa si fue cancelación y si terminó el rollback. Esto afecta el procedimiento recuperable A9/A10 y los comandos reproducibles A12; remitir a toda la guía no identifica el paso fallido.

Corrección esperada: añadir categorías y mensajes operativos sanitizados con acción siguiente para errores previsibles, más uso breve ante comando/argumentos inválidos. Mantener un fallback genérico para fallos inesperados y no volcar excepciones, SQL, URLs, cookies ni rutas privadas completas. Para cancelación/error transaccional, informar rollback confirmado solo cuando se conozca ese resultado; contemplar estado incierto sin anunciar éxito. Probar al menos sintaxis, ruta inexistente, lock existente, propietario inválido, destino ocupado, corrupción y cancelación.

## Comprobaciones favorables

- La documentación y las fuentes distinguen biblioteca del DM, partida persistida y apertura; archivar/borrar no borra los recursos reutilizables y restaurar ready no abre una sesión. No atribuyen al administrador acceso a la biblioteca privada.
- La adopción exige un DM explícito y una partida nominada; no se asigna al primer login. El traslado privado exige mapa completo e inyectivo cuando cambian IDs. La receta separa configuración de fuente y destino, respaldo íntegro legado, importación atómica, verificación y retorno a directorio nuevo.
- La guía avisa de que no se transfieren credenciales, sesiones, aperturas ni estado efímero y explica los límites del retorno después de nuevas escrituras. Las referencias ausentes se conservan con avisos; la corrupción no se presenta como catálogo vacío.
- Los contratos documentan paginación, nombres repetidos, revisiones, cuerpos DELETE, idempotencia y aislamiento de errores 404 sin revelar recursos ajenos. La transición local y el guard productivo se explican sin anunciar 011 como entregado.

## Evidencia y límites

Leídos AGENTS.md, perfil `.codex/agents/ux.toml`, solicitud/spec/build 008, contexto común, identidad de ronda, base de archivos y huellas; inspeccionadas fuentes de CLI, transferencia, contratos de migración, catálogo, recursos, HTTP y documentación operativa. La comparación base/huellas identifica 38 archivos de producto modificados/nuevos. Se verificó coincidencia SHA256 de las siete fuentes/documentos principales usados para estos hallazgos con `ronda-1/huellas.json`.

Las dos invocaciones CLI anteriores son ejecución propia. Los resultados SQLite/PostgreSQL y gates consignados en build se consideran evidencia atribuida al constructor; no se volvieron a ejecutar los gates costosos ni se utilizó la ventana PostgreSQL compartida. Los hallazgos de contrato HTTP están demostrados por lectura del recorrido exacto del error; no se afirma una nueva ejecución HTTP concurrente. No se leyeron informes de otros revisores. No se usó CUA ni se afirma humo visual, dado que no hay cambios de UI, foco, teclado, cámara o escala en este alcance. No se modificaron producto, Git, tablero, especificación, servicios ni datos/env originales.
