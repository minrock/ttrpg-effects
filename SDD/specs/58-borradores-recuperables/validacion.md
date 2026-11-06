# Validación — SDD 58

## Empaquetado 3.22.1 — 2026-11-06

Por solicitud del usuario se consolida el trabajo en un commit de `fix/recuperacion-local-figuras`. `./scripts/build-dmg.sh` terminó correctamente y generó `dist/TTRPG Effects-3.22.1-arm64.dmg` para Apple Silicon. No hubo merge, push, despliegue ni cambios en la DB operativa. Los apartados siguientes conservan la evidencia histórica y sus limitaciones.

## Corrección de recuperación local — 2026-11-06

Rama `fix/recuperacion-local-figuras`, versión 3.22.1. Conserva el trabajo anterior sin commit ni merge.

- Se reprodujo el fallo con el editor real, cliente y coordinador, un adaptador visual simulado e IndexedDB de pruebas: dibujar sin mapa no generaba ningún registro. El filtro de autosave ignoraba las figuras y el serializador de archivo exigía un mapa.
- El respaldo ahora acepta el lienzo sin mapa. Crear/eliminar figuras inicia la escritura inmediatamente; salir del editor vacía la captura pendiente. El indicador distingue escritura en curso de guardado local completado.
- La recuperación presenta «Recuperar estado local» y «Cargar mapa nuevamente» sin esperar al listado remoto. Los conflictos recuperan una copia; cargar la escena confirmada conserva el respaldo y abre el selector si falta la escena. Las generaciones y la exportación quedan en opciones adicionales.
- `pnpm typecheck`, `pnpm lint` y `git diff --check`: correctos. Suite general: **152 archivos y 1351 pruebas correctas**. Incluye reapertura de figuras con/sin mapa, salida antes del debounce y seis casos de recuperación simplificada (servidor sin responder, conflicto, copia dañada y escena ausente).
- `pnpm build:api`, `pnpm build:web` y `pnpm build`: correctos; permanecen avisos de dependencias y tamaño de chunks. Artefactos locales actualizados; no se generó DMG ni se realizó despliegue.
- Esta corrección no modifica el esquema ni ejecuta migraciones sobre los datos del usuario. Mantiene el borrado local al cerrar sesión explícitamente.

Las nuevas pruebas de interfaz usan JSDOM y `fake-indexeddb`; no sustituyen un cierre forzado de Chrome/Electron. Antes de cerrar, esperar «Guardado en este dispositivo»: una terminación del proceso puede interrumpir una transacción todavía pendiente. Los límites de aceptación de la entrega original siguen documentados abajo.

Fecha: 2026-11-05. Rama `feature/sdd-recuperacion-borradores`, versión 3.22.0. Implementación sin commit, merge ni despliegue. Incluye, sin atribuírsela a esta spec, la corrección previa 3.21.1. La DB y los archivos de configuración operativos no se modificaron.

## Evidencia ejecutada

- `pnpm typecheck` y `pnpm lint`: correctos. El artefacto temporal del humo se retiró del árbol antes del linter final.
- Suite general: **151 archivos, 1342 pruebas**, correctos en la última ejecución, incluyendo cuota agregada, integridad del respaldo y 20 ciclos del componente.
- `pnpm build:api`, `pnpm build:web`, `pnpm build`: correctos. Permanecen avisos de tamaño de chunks y directivas de dependencias; no impidieron construir. No se generó DMG: no hubo integración a main.
- `test:db`: **32/32**, usando bases SQLite y PostgreSQL 18.6 temporales con TLS. Migración 8 y repetición sin cambios. Fixtures antiguos que fijaban la última migración en 6 se actualizaron a la lista real de migraciones.
- `test:identity`: **27/27** con identidades sintéticas en ambos motores.
- Coordinador: 9 pruebas de temporización 1/5 y 5/30, edición continua, deduplicación, cámara sin autosave remoto, servidor antiguo sin sondeo 404, pérdida de ACK, creación concurrente con cambios, fallo local, suspensión y confirmación anterior a nuevos cambios.
- IndexedDB: 8 pruebas con `fake-indexeddb`, incluyendo reapertura, tres generaciones, aislamiento de cuentas/orígenes, orden de secuencia, tamaño individual, cuota agregada 50 MiB sin pérdida, opt-out, datos incompatibles o alterados exportables y cierre de cuenta que invalida escritores de otras ventanas.
- MapViewport: regresión que repite 20 veces montaje/suspensión y exige una destrucción por instancia; junto a la prueba de inicialización tardía. Usa un adaptador de render simulado: **no es un perfil de memoria/GPU nativo**.
- Contratos de borradores sobre SQLite/PostgreSQL: propietario/roles, CAS, tres generaciones, recibos exactos incluso después de confirmar, confirmación explícita/idempotente, rollback con revisión base atrasada, huérfanos de partidas eliminadas y rechazo de hash alterado. Carga de **2000 autosaves por motor**: tres generaciones retenidas y menos de diez operaciones generales, sin una operación general por PUT.
- Humo visual en navegador integrado, API SQLite temporal en loopback e identidades sintéticas: abrir escena, dibujar círculo, comprobar indicadores local/remoto, abrir segunda ventana, recuperar desde IndexedDB, restaurar selección/panel y guardar la escena; recargar y volver a recuperar. No se utilizó la cuenta real ni su base. La automatización de Chrome falló antes de poder usar una pestaña; se usó el navegador integrado.

## Resultados ampliados

La suite de datos privados y la suite de moderación se ejecutan además de la suite general. Los contratos históricos de cámara remota se ajustaron a SDD 56 (409 y ausencia de orden de cámara), y el contrato de cambio de cuenta activa explícitamente el coordinador contra una partida real. La exportación funcional conserva el manifiesto estricto: el aviso/conteo de borradores excluidos sale por el comando, no se inserta en el archivo de transferencia.

- `test:owned`: 52/54 correctos en la ejecución completa; los dos casos nuevos de revisión atrasada fallaban porque su fixture cambiaba campos de escena que el normalizador ajusta antes de verificar el hash. Se corrigió el fixture a contenido normalizado y los dos casos pasaron en la ejecución focalizada de SQLite y PostgreSQL. No quedó un fallo de producto en esta suite; no se repitieron los otros 52 sin cambios.
- Contratos de borradores: seis casos (incluidos 2000 autosaves por motor) pasaron en la ejecución completa; los dos casos de rollback pasaron tras la corrección anterior. Ocho casos cubiertos entre ambas ejecuciones.
- `test:moderation`: **50 correctos, 1 fallido por entorno**, restauración PostgreSQL sin configuración de pg_dump/pg_restore. No se oculta este gate ni se etiqueta la suite completa como verde.
- Regresión focalizada de cliente/editor: **12 archivos, 200 pruebas**, correctos después de ajustar la hidratación para no cambiar el recurso activo antes de resolver sus imágenes/definiciones.
- `git diff --check` y enlaces locales de spec/plan/validación: correctos. Los servidores y ventanas sintéticos se cerraron.

## Límites pendientes de aceptación

- CA-03/14/15: perfil JS/GPU en Chrome y Electron, 20 ciclos reales de caducidad/conflicto/recuperación y escena cercana a 10 MiB. Los relojes, cola acotada y destrucción del adaptador están probados; no sustituyen medir heap/texturas/listeners en el proceso real. La normalización/canonicalización se hace al vencer el temporizador, sin worker en esta entrega.
- CA-11: reinicio limpio y crash de Electron nativo con comprobación de cookie ausente e IndexedDB retenido. Las pruebas de `service-app` validan partición persistente por origen, limpieza antes de navegar y fallo cerrado si esa limpieza falla; no se ha ejecutado el ciclo nativo completo.
- CA-14: revisión visual exhaustiva a 390 px y recorrido completo por teclado. El humo usa el tamaño habitual del navegador integrado.
- Restauración física PostgreSQL: el entorno de pruebas no dispone de `pg_dump`/`pg_restore` configurados (`TTRPG_TEST_PG_TOOLS`). El contrato no se simula ni se presenta como aprobado. El driver PostgreSQL/TLS y los contratos SQL sí son reales.

No se declara aceptación completa de la matriz CA-01…15 hasta resolver estas comprobaciones. La feature está implementada; la integración y esas evidencias quedan diferenciadas de la construcción.

## Operación

Los artefactos API/web/Electron quedaron construidos. Para usar esta versión con datos reales: detener API, realizar respaldo integral de la base y ejecutar `pnpm db:migrate`, seguido de `pnpm start:api`. El migrador no se ejecutó sobre la base del usuario. La migración 8 es aditiva; un binario antiguo puede rechazar un esquema posterior, por lo que no se promete downgrade automático.

Los respaldos IndexedDB contienen datos privados sin cifrado adicional; el editor avisa y permite desactivarlos. Logout explícito elimina las copias locales de esa cuenta; caducidad conserva las copias. Borrar datos del sitio o el perfil Electron elimina el respaldo local. Los respaldos remotos, su propiedad y sus cuotas son independientes de la escena confirmada.
