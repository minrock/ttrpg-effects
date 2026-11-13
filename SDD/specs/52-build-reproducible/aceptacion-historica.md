# Criterios de la entrega inicial — SDD 52

Rescatados el 2026-11-13 del expediente `012-build-reproducible` al retirar la fábrica. Documento histórico de consulta, **no instrucciones de ejecución**.

Para planificar cambios nuevos, prevalecen la spec y las guías vigentes; esta matriz describe la entrega inicial y no vuelve a imponer su organización de agentes ni sus restricciones temporales de Git. Las versiones de dependencias aquí citadas son las del ensayo original; las actuales se leen en package.json y pnpm-lock.yaml.

## Criterios conservados

1. **Manifiesto coherente:** dependencia directa fijada en 7.3.3, importer concordante y misma resolución de Vite previamente aprobada; diff de producto limitado a manifiesto, lockfile, changelog y documentación necesaria justificada.
2. **Instalación realmente nueva:** con Node 24.15.0 y pnpm 11.1.2, desde una carpeta sin `node_modules` heredado, `pnpm install --frozen-lockfile` termina con código 0 y no modifica el lockfile. Registrar ubicación y cómo se garantizó el aislamiento; se admite reutilizar la caché de paquetes, no los enlaces/shims instalados anteriormente.
3. **Ejecutable local:** esa instalación genera `node_modules/.bin/vite`; comprobar su destino local y que `pnpm exec vite --version` devuelve 7.3.3 sin ejecutable global ni reparación manual.
4. **Gates nuevos:** en la misma instalación limpia terminan con código 0 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api` y `pnpm build:web`. API y web dejan sus artefactos compilados sin `vite: command not found`; registrar logs, resultados y avisos relevantes en `build.md`.
5. **Producto preservado:** comparar las [huellas 009](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/009-invitaciones-jugadores/ronda-1/huellas.json) tras el cambio y justificar exclusivamente las diferencias permitidas. Todas las fuentes de aplicación, pruebas, assets y configuraciones funcionales deben conservar su SHA-256. Conservar las entradas previas del changelog y la versión del formato de escena.
6. **Trazabilidad honesta:** `build.md` distingue los checks propios de 012 de los contratos multi-DB heredados de [build 009](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/009-invitaciones-jugadores/build.md) y su decisión. No presentar DB32/identidad25/propiedad46/invitaciones36 como ejecuciones nuevas, ni iniciar PostgreSQL reservado a 010. La entrega registra versión 3.11.1 y estado sin escrituras Git del constructor.

## Evidencia y límites

El registro de cierre original marca la entrega **integrada**, commit `a64b5e9dcf7ba60be28047f890ab7edfecbb82df`. La decisión técnica final es APROBAR; no representa pruebas nuevas ejecutadas al retirar la fábrica. Los informes completos conservan comandos, resultados, incidencias corregidas y límites de los ensayos. Las capturas y logs temporales citados pueden no estar disponibles; no equivalen a artefactos adjuntos actuales.

- [Contrato completo original](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/012-build-reproducible/spec.md).
- [Informe de construcción](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/012-build-reproducible/build.md).
- [Decisión y límites de validación](https://github.com/minrock/ttrpg-effects/blob/b431edf35310b0a265a1d896a0ea6c77793faa04/factory/jobs/012-build-reproducible/decision.md).
- [Contrato vigente](spec.md) y [plan actual](plan.md).
