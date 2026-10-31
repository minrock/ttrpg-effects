# 012 — Construcción reproducible desde instalación limpia

Fecha: 2026-10-30. Ciclo 1. Tipo: bugfix de herramientas; versión final 3.11.1.

## Objetivo y evidencia existente

Restablecer los builds API/web desde una instalación nueva de dependencias. El [informe de integración](../../integracion-006-009.md) reproduce `vite: command not found` con Node 24.15.0 y pnpm 11.1.2: los scripts invocan Vite, pero `package.json` no lo declara directamente. `pnpm-lock.yaml` ya contiene Vite 7.3.3; la instalación antigua conservaba su ejecutable y no demuestra reproducibilidad.

El producto acumulado 009 está materializado con 616/616 huellas coincidentes y [aprobación técnica](../009-invitaciones-jugadores/decision.md). La corrección aquí descrita está propuesta, pendiente de construcción y revisión; los checks previos no certifican esta entrega.

## Alcance y reutilización

- Declarar `vite: "7.3.3"` como dependencia de desarrollo directa y sincronizar únicamente su entrada necesaria en el importer del lockfile, reutilizando la resolución existente y conservando versiones, integridades y restantes dependencias.
- Cambiar una sola vez `package.json` de 3.11.0 a 3.11.1 y añadir entrada fechada 2026-10-30 de tipo bugfix en `CHANGELOG.md` que describa la construcción reproducible.
- Reutilizar los scripts y configuraciones actuales de Electron, API y web, sin modificar su comportamiento. Documentación adicional únicamente si resulta imprescindible para ejecutar la corrección.
- Aplicar la [solicitud](solicitud.md), [coordinación](coordinacion.md) y [autorización de integración](../../integracion-006-009-solicitud.md): checkout exclusivo de integración y rama existente `feature/integracion-006-009`, excepción expresa a crear otra rama de bug.

Se excluyen producto 010/011, funciones nuevas, fuentes de aplicación, formato `.ttrpgscene`, migraciones, UI, atajos, proyección, servicios privados y cambios de configuración global/hoisting. No actualizar otras dependencias, reescribir masivamente el lockfile, añadir shims manuales ni depender de Vite global. La compatibilidad de escenas y la experiencia visual permanecen idénticas porque no cambia código de producto.

## Criterios de aceptación

1. **Manifiesto coherente:** dependencia directa fijada en 7.3.3, importer concordante y misma resolución de Vite previamente aprobada; diff de producto limitado a manifiesto, lockfile, changelog y documentación necesaria justificada.
2. **Instalación realmente nueva:** con Node 24.15.0 y pnpm 11.1.2, desde una carpeta sin `node_modules` heredado, `pnpm install --frozen-lockfile` termina con código 0 y no modifica el lockfile. Registrar ubicación y cómo se garantizó el aislamiento; se admite reutilizar la caché de paquetes, no los enlaces/shims instalados anteriormente.
3. **Ejecutable local:** esa instalación genera `node_modules/.bin/vite`; comprobar su destino local y que `pnpm exec vite --version` devuelve 7.3.3 sin ejecutable global ni reparación manual.
4. **Gates nuevos:** en la misma instalación limpia terminan con código 0 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api` y `pnpm build:web`. API y web dejan sus artefactos compilados sin `vite: command not found`; registrar logs, resultados y avisos relevantes en `build.md`.
5. **Producto preservado:** comparar las [huellas 009](../009-invitaciones-jugadores/ronda-1/huellas.json) tras el cambio y justificar exclusivamente las diferencias permitidas. Todas las fuentes de aplicación, pruebas, assets y configuraciones funcionales deben conservar su SHA-256. Conservar las entradas previas del changelog y la versión del formato de escena.
6. **Trazabilidad honesta:** `build.md` distingue los checks propios de 012 de los contratos multi-DB heredados de [build 009](../009-invitaciones-jugadores/build.md) y su decisión. No presentar DB32/identidad25/propiedad46/invitaciones36 como ejecuciones nuevas, ni iniciar PostgreSQL reservado a 010. La entrega registra versión 3.11.1 y estado sin escrituras Git del constructor.

## Verificación y cierre

Ejecutar instalación, comprobación del ejecutable y gates del criterio 4 con `pnpm`; no hacen falta pruebas unitarias nuevas que repliquen el manifiesto. Registrar el diff mínimo del lockfile y la comparación de huellas como evidencia adicional. Si una instalación limpia o cualquier gate falla, conservar el error y corregir dentro del alcance antes de entregar; no sustituirla por la instalación antigua.

El constructor escribe únicamente producto autorizado y su `build.md`; no hace staging, commit, merge, push ni DMG. Tras las cuatro revisiones y decisión de 012, el integrador ejecutará el cierre autorizado y `./scripts/build-dmg.sh` después del merge, leyendo la versión de `package.json`.

## Riesgos e impedimentos

No hay duda funcional que impida construir. El riesgo principal es validar accidentalmente contra enlaces heredados o introducir cambios de resolución ajenos al bug; la instalación limpia y el diff acotado son condiciones obligatorias. Los contratos de persistencia se heredan por identidad de fuentes, sin certificar una nueva ejecución multi-DB. Cualquier diferencia funcional inesperada exige detener la entrega y comunicarla al orquestador.
