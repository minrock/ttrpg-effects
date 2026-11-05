# Validación — SDD 57

Fecha: 2026-11-04. Producto 3.21.0. Rama `feature/sdd-areas-contextuales`, base `0c8d245`. Implementación autorizada por la orden «implementa», sin commit, merge ni push. No se inició fábrica ni se simularon rondas de revisión.

## Evidencia ejecutada

- `pnpm typecheck` y `pnpm lint`: sin errores.
- Suite completa: **148 archivos / 1317 pruebas aprobadas**, con `pnpm test --exclude '.local/**' --exclude 'tmp/**' --maxWorkers=2`.
- Builds de API, web y Electron correctos. No se genera DMG porque no se ha autorizado integrar a main.
- Dominio: bloqueo de movimiento/edición/borrado/copia; desbloqueo explícito; copia independiente, desplazamiento, límites y validación de color. Round-trip de escena y sanitización de snapshot conservan los campos; las figuras heredadas conservan sus emojis y ausencia de estilo nuevo.
- Runtime: bloqueo cancela preview de otra pestaña; revisiones obsoletas fallan; limpiar propios conserva bloqueados; DM puede retirarlos; revocación limpia. Cliente antiguo no elimina el estilo canónico al actualizar geometría, ni puede borrar un bloqueado.
- HTTP/SSE real sobre SQLite temporal: dos jugadores y conexión DM antigua; negociación, propagación de estilo, bloqueo, rechazo de comandos antiguos/modificados, copia reintentada con mismo requestId sin duplicación y reconexión. Los dibujos no contaminan la escena pública persistible.
- React: paleta coincide con los 29 emojis del catálogo más Sin patrón, selección y retorno de foco con Escape; controles bloqueados no ejecutan copia/borrado. Hook de jugador prueba crear, aplicar estilo, bloquear, limpiar conservando bloqueados, desbloquear y copiar seleccionando el nuevo ID.
- Pixi: presupuesto de layout antes de recorrer áreas enormes, coordenadas regulares en mundo, máscara y destrucción de recursos. Regresiones existentes de transformación local, cámara, etiquetas y herramientas aprobadas.

La primera suite concurrente coincidió con compilación y preview: fallaron límites temporales de pruebas anteriores (KDF, navegación, saturación y latencia SSE) y una regresión real de selección en el origen de un cono. Se corrigió la selección conservando el ancla y ampliándola al interior. La suite final se ejecutó con dos workers, sin ampliar timeouts, quitar assertions ni relajar umbrales.

## Recorrido visual ejecutado

Se usó App y Pixi reales en un Vite aislado en `127.0.0.1:18773`, con una escena sintética de cono naranja/hielo y círculo violeta/veneno. Sin API, cuentas, archivos de escena ni base del usuario.

- Se observaron damero, contorno, glifos recortados y medidas en ambas figuras.
- Seleccionar el interior del cono abrió la barra; Patrón mostró el catálogo y permitió cambiar a relámpago.
- Bloquear dejó solo Desbloquear disponible; color, patrón, eliminar y copiar quedaron deshabilitados. Desbloquear y copiar incrementó de dos a tres figuras y seleccionó un ID nuevo.
- A 390 × 844 se inspeccionó la paleta completa. Se corrigió su posición para reservar espacio inferior; la comprobación final dejó libres los controles de cámara y foco.
- La instancia de preview, su pestaña y directorio temporal se cerraron/eliminaron; se restableció el tamaño del navegador. No se tocó `.env` ni la DB local.

Este recorrido verifica UI/render local. No equivale a una sesión de navegador autenticada ni a un recorrido del binario Electron; la autoridad HTTP se comprobó por separado mediante la integración SQLite.

## Cobertura y límites

| Criterio | Evidencia ejecutada | Pendiente de aceptación manual/entorno |
| --- | --- | --- |
| CA-01 | Selección por interior real, barra compartida, regresiones de herramientas y prueba visual DM | Clic derecho y selección en todos los clientes nativos |
| CA-02 | Validación de color, round-trip, bloqueo y selector implementado | Recorrido visual completo de entrada inválida/cancelación sobre mapa claro |
| CA-03 | Catálogo exacto, selección única, Escape y foco; paleta real escritorio/390 px | Recorrido lector de pantalla |
| CA-04/05 | Máscara real en círculo/cono, patrón regular en mundo y presupuestos; cámara/reglas existentes pasan | Matriz visual de hexagonal, grilla oculta, cuatro orientaciones y áreas mínimas |
| CA-06 | Política pura, borrado por árbol/atajo, runtime y controles deshabilitados; hook de jugador | Humo nativo de todas las entradas de UI |
| CA-07 | Limpiar conserva bloqueados; moderación y revocación; confirmación específica implementada | Recorrido autenticado de confirmación y cierre de apertura |
| CA-08/09 | Copia, límites, autoría, idempotencia HTTP, revisiones, bloqueo durante preview y edición desde pestañas | Carrera bajo carga con PostgreSQL real |
| CA-10/12 | HTTP/SSE SQLite y proyección v1 compatible, reconexión, fallback progresivo en cliente | Recorrido visual autenticado DM + dos jugadores/Electron servicio |
| CA-11 | Escenas previas y nuevos campos en serialización/snapshot; separación efímera verificada | Contratos completos de repositorios SQLite/PostgreSQL y exportación operativa |
| CA-13 | Paleta a 390 px y teclado/foco en React; espacio inferior reservado | Dispositivos táctiles y movimiento reducido del sistema |
| CA-14 | Presupuesto/cache/máscara y liberación; builds API/web/Electron | Perfil de GPU con muchas áreas y humo de Electron autónomo/servicio |

No se ejecutaron `pnpm test:owned` ni `pnpm test:moderation`: faltan `TTRPG_TEST_DATABASE_URL` y `TTRPG_TEST_DB_CA_FILE`, y no se encontraron binarios PostgreSQL locales en PATH ni en las rutas habituales inspeccionadas. No se sustituyó PostgreSQL por SQLite ni se relajó TLS. No se añadieron tablas, migraciones, dependencias ni configuración privada nueva.

Advertencias conocidas: algunos tests jsdom no implementan canvas (el render se inspeccionó en navegador); Vite informa chunks grandes y directivas `use client` de dependencias ignoradas. No se atribuye firma/notarización ni empaquetado a esta compilación.

## Reproducción

```bash
pnpm typecheck
pnpm lint
pnpm test --exclude '.local/**' --exclude 'tmp/**' --maxWorkers=2
pnpm build:api
pnpm build:web
pnpm build
```

En una mesa de pruebas: crear círculo y cono, cambiar color/patrón, bloquear, intentar mover/borrar/copiar, limpiar propios, desbloquear/copiar y comprobar independencia. Repetir como jugador con DM y otro jugador observando; retirar un bloqueado como DM con confirmación, reconectar y cambiar de mapa. Abrir una escena anterior y guardar/cargar una nueva. Mantener separada esta aceptación pendiente de la evidencia automática ya ejecutada.
