# Retirada de la fábrica — 2026-11-13

La petición del usuario retira la fábrica para replantear la organización de agentes. SDD queda como única entrada de planificación. Este cambio documental no altera el producto, la versión 3.27.2, las bases de datos ni la configuración privada.

## Resultado de la revisión

- Los doce trabajos 001–012 están integrados y la cola histórica no contiene tareas abiertas. Sus funcionalidades se corresponden con SDD 41–52 y las guías de clientes, API, identidad, datos propios, invitaciones, moderación y operación.
- Faltaba dentro de SDD el detalle de las matrices iniciales de aceptación: aislamiento entre raíces/clientes, carreras y rollback, revocación en vuelo, límites de HTTP/SSE, pruebas multi-DB/TLS y matriz de clientes. Se conserva en `aceptacion-historica.md` junto a cada spec; no se convierte el estado antiguo en requisitos vigentes.
- Se conserva la correspondencia de integración y el acceso a informes de construcción/decisión completos mediante enlaces al commit inmutable `b431edf35310b0a265a1d896a0ea6c77793faa04`. El historial de Git permite consultar también rondas fallidas y correcciones; no se copian sus instrucciones de orquestación al nuevo flujo.
- Los planes generales de migración/autenticación ya están cubiertos por las guías y SDD 41–51. Las huellas JSON y prerrequisitos describen checkouts pasados; no son requisitos de producto nuevos. Se retiran tablero, demo, prueba del dashboard y expedientes operativos (274 archivos bajo la antigua carpeta).
- Se retiran la skill y los siete perfiles exclusivos de esa fábrica. Se actualizan AGENTS, README, flujo, plantillas y referencias SDD para no prescribir agentes, rondas, comandos ni tableros anteriores. SDD 40 queda como alcance retirado, sin renumerar las demás specs.

## Correspondencia de entregas

| Trabajo anterior | Criterios conservados | Integración registrada |
| --- | --- | --- |
| 001 | [SDD 41](specs/41-contrato-clientes/aceptacion-historica.md) | `e1fd3ee` |
| 002 | [SDD 42](specs/42-api-privada/aceptacion-historica.md) | `e1fd3ee` |
| 003 | [SDD 43](specs/43-cliente-navegador/aceptacion-historica.md) | `e1fd3ee` |
| 004 | [SDD 44](specs/44-mesa-sincronizada/aceptacion-historica.md) | `e1fd3ee` |
| 005 | [SDD 45](specs/45-electron-servicio/aceptacion-historica.md) | `e1fd3ee` |
| 006 | [SDD 46](specs/46-persistencia-multidb/aceptacion-historica.md) | `a64b5e9` |
| 007 | [SDD 47](specs/47-identidad-dm/aceptacion-historica.md) | `a64b5e9` |
| 008 | [SDD 48](specs/48-partidas-sistemas/aceptacion-historica.md) | `a64b5e9` |
| 009 | [SDD 49](specs/49-invitaciones/aceptacion-historica.md) | `a64b5e9` |
| 010 | [SDD 50](specs/50-moderacion/aceptacion-historica.md) | `ae5c654` |
| 011 | [SDD 51](specs/51-experiencia-servicio/aceptacion-historica.md) | `5a074b5` |
| 012 | [SDD 52](specs/52-build-reproducible/aceptacion-historica.md) | `a64b5e9` |

## Límites históricos que no deben perderse

Los ensayos de escritorio fueron principalmente macOS arm64; no acreditan otros sistemas, proyector físico, carga prolongada ni distribución firmada. Los mocks/JSDOM no certifican render GPU. La niebla no impide obtener píxeles del mapa ya publicado y expulsar no recupera bytes descargados ni identifica permanentemente a una persona sin cuenta. PostgreSQL/TLS tiene gates propios; una suite general verde no los reemplaza. Un proceso API por base y publicación efímera son límites de arquitectura documentados en las guías.

El cierre operativo antiguo conservó respaldo y exportación de datos legados, sin importarlos porque faltaba propietario DM explícito. Esto es evidencia de 2026-10-31, no una afirmación sobre la base actual ni una orden pendiente nueva. No se inspeccionaron credenciales/datos personales ni se ejecutaron migraciones durante esta retirada.

## Consulta del historial

- [Tablero de cierre](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/board.json).
- [Cola completa](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/backlog.md).
- [Cierre operativo del servicio](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/011-experiencia-autenticacion/operacion-local.md).
- [Integración multi-DB/identidad](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/integracion-006-009.md).

También se puede consultar localmente con `git show b431edf35310b0a265a1d896a0ea6c77793faa04:factory/jobs/<id>/spec.md`. No hay que restaurar ni ejecutar la fábrica para leer su historia. Los criterios originales que mencionan rondas, roles de agentes o prohibiciones de integración solo describen esa entrega; el flujo nuevo es [SDD](flujo.md).

## Validación de esta retirada

Se comprobaron 439 enlaces locales en los documentos afectados, sin enlaces rotos ni dependencias locales de la carpeta eliminada. Las referencias históricas se verificaron contra objetos existentes de Git. `git diff --check` no detectó errores. No se modificó código de la aplicación ni se ejecutaron pruebas de producto, migraciones o empaquetado para esta limpieza documental. Preparado en `feature/retirar-factory`. El usuario autorizó después commit, integración en main y push, expresamente sin nueva versión. Se conserva 3.27.2, sin etiqueta nueva ni cambios de producto.
