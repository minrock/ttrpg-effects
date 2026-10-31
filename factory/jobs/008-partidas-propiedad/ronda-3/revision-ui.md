VEREDICTO: APROBADO

Revisión UI independiente — 008, ciclo 2, ronda global 3. Fecha: 2026-10-30.

## Alcance

Se revisó el alcance visual real del catálogo administrado, sistemas/versiones y definiciones retenidas en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Entradas: AGENTS.md y perfil UI, solicitud vigente, retrabajo-ciclo-2.md, spec final, build final y ronda-3/revision.md/huellas.json. AGENTS.md mantiene la huella ya leída. No se consultaron informes de otros roles.

La autorización y la spec final reservan las pantallas, el selector y la adaptación visual a 011. Esta aprobación de UI evalúa que el ciclo 2 conserve esas fronteras y no introduzca cambios visuales inadvertidos; no equivale a aprobar la implementación funcional del catálogo ni sus garantías de persistencia/seguridad.

## Evidencia observada

- Comparación SHA-256 de la base de 008 y los manifiestos de rondas 2/3, seguida de recálculo de todos los archivos actuales del manifiesto de ronda 3: 50 archivos distintos frente a la base, cero eliminaciones y cero discrepancias con las huellas congeladas.
- Sin cambios frente a la base en 132 archivos de renderer, cuatro de preload, ocho de web, 23 de main, 40 de render y siete de infraestructura browser. El catálogo nuevo no añade un viewport, componentes, estilos, botones, menús, estados de foco ni layouts.
- Inspección directa de `src/domain/systems/system-catalog.ts` y `src/application/services/system-catalog.ts`: contratos y registro compilado separan reglas, datos y presentaciones, reutilizando medición y plantillas existentes. La configuración declara valores por defecto; no hay código que aplique esos valores a una cámara, escala o diagonalMode existente en estas superficies. Las búsquedas de consumidores no encontraron importación del catálogo nuevo en renderer, preload, main, web, render o cliente browser.
- Se verificaron intactos `domain/measurement/measurement.ts`, `domain/monster-templates/monster-template.ts`, `domain/sessions/scene-schema.ts`, `scene-document.ts`, `application/services/table-session.ts` y `public-table-projection.ts`. La reutilización de estos módulos por el catálogo no modifica sus consumidores visuales previos.
- Inspección de `src/application/services/game-runtime.ts`: la nueva validación contextual prepara/publica snapshots mediante las primitivas existentes. No se encontró un consumidor de producto del registro que conecte esta entrega al viewport vigente; su integración sigue pendiente de trabajos posteriores.
- `src/server/http.ts` enruta las nuevas familias DM/admin al handler de datos. `src/server/owned-http.ts` entrega catálogo, configuración y conflictos como JSON; la fachada privada de plantillas queda de lectura. El cliente browser actual mantiene las rutas legadas y no está conectado a esas familias nuevas. No hay una pantalla de catálogo que evaluar todavía.
- Comprobación específica de la frontera local: `src/main/local-app.ts` conserva `ElectronMonsterTemplateRepository`; ese repositorio y `application/use-cases/monster-templates.ts` permanecen idénticos a la base. Se inspeccionaron sus métodos de lectura/guardado/borrado. La política de definiciones retenidas del servicio no se trasladó al editor local autónomo. También se conserva el manejo legado de plantillas en `src/server/http.ts`, separado del namespace privado.
- Los únicos cambios acumulados en shared siguen siendo los esquemas de entrada puros y el campo opcional `ApiFailure.error.retryAt`; no cambian respecto a la ronda 2 ni agregan comportamiento visual. La búsqueda de `TTRPG_AUTH_SECRET`, `identity_account`, `owned_resources`, `better-auth` y `TTRPG_DATABASE_URL` en los bundles disponibles de renderer/preload/main/web no produjo coincidencias. Es una comprobación acotada de frontera, no una auditoría completa.

## Hallazgos y corrección esperada

No se identifican hallazgos UI ni correcciones exigibles en el alcance actual. No hay apariencia nueva para evaluar en jerarquía, controles compactos, contraste, estados reconocibles sin color, nombres largos, viewport estrecho o superposiciones. La ausencia de CUA nuevo es coherente con el delta real, comprobado en fuentes y consumidores; no se fundamenta solamente en tests de DOM ni en la declaración del constructor.

## Límites

No se abrió la app ni se realizaron capturas, CUA, pruebas de proyección física o humo visual. Los resultados de builds y pruebas enumerados en build.md son evidencia atribuida al constructor; esta revisión no los reejecutó ni los presenta como certificación de apariencia. La futura UI de 011 necesitará su propia inspección visual para selección de versiones, disponibilidad, definiciones retenidas, nombres largos y errores recuperables. No se exige anticiparla para cerrar UI de 008.

No se usó PostgreSQL, no se ejecutaron gates pesados, no se instalaron plugins ni se delegó. No se modificaron código, Git, tablero, spec, informes ajenos, datos privados o servicios. Única salida: este informe, publicado mediante temporal y renombrado atómico.
