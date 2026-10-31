# Cierre operativo local — 011

Fecha:2026-10-31. Estado: servicio3.13.0 operativo en el checkout habitual sobre main. Aceptación técnica ciclo2/ronda4, cuatro APROBADO y decision.md. Sin push ni despliegue externo.

## Código y conservación del checkout

Producto integrado en5a074b5209bc8a978f69ad7f5660643ec794ec6c; cierre documental iniciald475f95299dda374fda896bc2ba95d95bf817a56. El checkout de integración quedó detached limpio para liberar main. /Users/minrock/Projects/ttrpg-effects cambió a main con --no-overwrite-ignore tras dry-run satisfactorio. Se verificaron655huellas de producto y configuración privada original intacta.

Antes del cambio: respaldo privado checkout-final-20261031-130122 con172archivos y sus modos/huellas.166rutas locales visibles conservadas en stash acotado6025a9d14a4483076bba8a540defe12c8933fe28; cada objeto se comparó con respaldo antes de retirar originales. La plantilla ignorada .env.electron.example se apartó reversiblemente en ese respaldo. No se aplicó el stash sobre main ni se eliminaron cambios previos. .env/.env.electron/.local permanecieron en su sitio. Se conservan además pre-integracion-20261031-084641 y binario-previo-20261031-113409 (84archivos de binarios/manifiestos anteriores).

## Corte y datos

Se detuvo limpiamente solo la API3.7.0 propia. Comprobadas ausencia de service.lock y de archivos abiertos en la fuente antigua. El CLI aprobado ejecutó backup-legacy de las tres bases hacia .local/service/backups/legado-20261031-1302, export-legacy hacia paquete-legado-20261031-1302 e inspect: paquetev3 con una escena. Exportación sobre respaldo, fuente conservada íntegra. No se importó contenido: falta propietarioDM explícito; administrador y DM son roles distintos. No se leyó/adoptó perfilElectron.

Configuración anterior y preparada se verificaron contra sus huellas privadas antes de aplicar .env mediante reemplazo atómico0600. Nuevo destino SQLite: .local/service/data/control.sqlite. No se muestran secretos en este expediente. pnpm setup:env conservó configuración y confirmó directorios internos0700/archivos0600. pnpm db:migrate aplicó versiones1–6.

Bootstrap inicial por CLI con TTY sin eco, entradas exclusivamente en memoria; administrador solicitado creado con cambio obligatorio. Contraseña temporal solo en .local/service/acceso-administrador.txt0600, ignorado. No fue impresa ni guardada en Git/logs. El usuario debe cambiarla al entrar. No se creó una cuentaDM por inferencia.

## Verificación del servicio habitual

- pnpm install --frozen-lockfile:PASS, lockfile intacto.
- pnpm build:api, pnpm build:web y pnpm build:PASS; incluye typecheck en cada build. Avisos existentes de directivas use client/tamaño de chunks, sin fallo.
- pnpm start:api: arranque3.13.0, Host127.0.0.1, puerto8787, enlacehttp://127.0.0.1:8787. Proceso propio mantenido activo para uso local.
- SaludHTTP200, versión3.13.0; HTML200 con Accept:text/html. Primera sonda sin cabecera HTML recibió404 por negociación esperada; /index.html y navegación real sirven correctamente.
- Acceso administrativo por API comprobado con credencial privada en memoria; roladmin y mustChangePassword=true. Sesión de comprobación cerrada en finally. No se cambió contraseña ni se exploraron datos privados.
- CUA/IAB del origen real muestra Acceso a tu mesa, correo/contraseña e invitación. No se atribuye un cambio de contraseña ni recorrido autenticado del usuario a esta observación.
- .env.electron conserva TTRPG_ELECTRON_MODE=service y TTRPG_SERVICE_URL=http://127.0.0.1:8787; pnpm start:service usa el build desktop preparado. Electron real y local ya verificados con perfiles QA en el expediente técnico.
- .local y subdirectorios privados0700; env, provisión, credencial, control.sqlite y control.lock0600. Configuración/datos ignorados por Git.

## Artefactos y limpieza

DMG3.13.0arm64 generado después de merge por ./scripts/build-dmg.sh; hdiutilverifyVALID, Info.plist3.13.0/3.13.0 y Mach-Oarm64. Tamaño152633363bytes; SHA256616da698a36755e3228433bb13d1bf8e9e11423bf8995a72eacc92af92a6e19f. Copia idéntica disponible en /Users/minrock/Projects/ttrpg-effects/dist/TTRPG Effects-3.13.0-arm64.dmg. Artefactos ignorados. No se instaló DMG en perfilpersonal.

API sintética8891 y PostgreSQL temporal detenidos limpiamente después de liberar revisores. Todos los Electron/pestañas de QA propios cerrados; perfiles y fixtures privados conservados. Dashboard8765 y servicio habitual8787 permanecen disponibles.

Pendientes del usuario: cambiar contraseña temporal; crear/invitar DMs desde administración; indicar un DM explícito si desea adoptar la escena antigua preservada. Estas acciones no impiden arrancar con pnpm start:api en próximos usos.
