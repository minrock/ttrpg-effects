# Cola de migración a servicio privado

Planificación vigente y correspondencia de estos trabajos: [SDD](../SDD/README.md). Las siguientes entradas son la cola histórica ejecutada; los alcances nuevos se especifican en SDD antes de agregarse aquí.

Serie construida en `feature/fabrica-software` sin commits intermedios; el usuario autorizó después su integración mediante `$factory aprobar`. El detalle y decisiones comunes están en [migracion-servicio.md](migracion-servicio.md). Las cinco specs quedaron integradas en `main` con DMG 3.6.0 generado y verificado; el tablero conserva las rondas y decisiones.

- [x] Contrato común para clientes web y Electron — `001-contrato-clientes`
- [x] API privada, escenas, imágenes y bibliotecas — `002-api-privada`
- [x] Cliente web con el frontend VTT existente — `003-cliente-navegador`
- [x] Sincronización privada entre DM y jugadores — `004-mesa-sincronizada`
- [x] Electron como cliente del servicio y entrega operativa — `005-electron-servicio`

## Serie: cuentas DM y partidas privadas multi-DB

- [x] Persistencia común SQLite y PostgreSQL — `006-persistencia-multidb`
- [x] Cuentas DM administradas y autenticación segura — `007-cuentas-dm`
- [x] Partidas de cada DM y datos aislados en ambos motores — `008-partidas-propiedad`
- [x] Enlaces renovables y entrada de jugadores con alias — `009-invitaciones-jugadores`
- [x] Expulsión inmediata y mesas sincronizadas independientes — `010-moderacion-tiempo-real`
- [x] Acceso DM, invitaciones y panel de jugadores en web y Electron — `011-experiencia-autenticacion`

## Correcciones de integración

- [x] Construcción reproducible desde instalación limpia — `012-build-reproducible`
