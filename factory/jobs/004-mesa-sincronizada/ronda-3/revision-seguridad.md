VEREDICTO: APROBADO

# Revisión independiente de seguridad — 004, ciclo 2, ronda 3

Fecha: 2026-10-29. Revisor: seguridad_004. Rama `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Código congelado. No se modificaron implementación, Git, tablero ni informes ajenos.

## Alcance e identidad

Aplicado el perfil `.codex/agents/seguridad.toml` y las reglas AGENTS.md ya leídas. Contrastados solicitud/spec vigentes, `retrabajo-ciclo-2.md`, build actualizado, identidad/diff de revisión y huellas de rondas 2 y 3.

Las **520 huellas de ronda 3 coinciden** con los archivos actuales. Frente a la ronda 2 aprobada solo cambian:

- `docs/synchronized-table.md`.
- `src/web/ServiceApp.tsx`.
- `src/web/service.css`.
- `src/web/ServiceApp.test.tsx`.

Se inspeccionaron completos los tres archivos web y la actualización documental. No se repitió la auditoría del código idéntico de servidor, transporte, proyección, assets o persistencia.

## Hallazgos y conclusión

**Sin hallazgos de seguridad nuevos ni pendientes en este cambio.** Se mantiene la aprobación anterior de SEG-004-01 y SEG-004-02: los ACK compactos, presupuestos independientes por rol, retención idempotente y revalidación de sesión después de leer cuerpos HTTP tienen exactamente las mismas huellas que en ronda 2. Sus pruebas HTTP y reproducciones independientes constan en el informe de esa ronda; no se presentan como recién ejecutadas aquí.

El nuevo contenedor `service-player-workspace` y las reglas CSS delimitan la disposición Player del servicio. No alteran permisos, selección de rol, payloads o aislamiento Electron. La alerta de error de logout se mueve al flujo de Mesa y permanece fuera de `details`; el contenido se renderiza como texto React, sin HTML interpretado ni URLs nuevas.

La operación de logout sigue esperando confirmación HTTP antes de limpiar la sesión local y desmontar Player. Si el servidor responde 503 o la red falla, no anuncia una revocación exitosa; conserva la vista con un error visible. Si la revocación se confirma, ejecuta `browser.clear()`, cancela diálogos y limpia el rol. Los guards existentes de caducidad y acceso continúan separando el VTT DM y el cliente jugador. El cambio no introduce claves en URLs, almacenamiento web o logs.

Las superficies de seguridad no afectadas —cookie HttpOnly/SameSite, Host/Origin, autorización de assets vigentes, proyección por campos permitidos, validación de datos externos, CSP, preload limitado, aislamiento Electron, SQL y filesystem— conservan la implementación revisada y aprobada en ronda 2.

## Verificación ejecutada

`pnpm test src/web/ServiceApp.test.tsx src/infrastructure/browser/browser-client.test.ts src/infrastructure/browser/table-client.test.ts`

Resultado: **3 archivos, 30 tests aprobados**, 871 ms. Se verifican, entre otros casos:

- Logout correcto elimina la vista DM y vuelve al acceso.
- Rol jugador devuelto por servidor no monta App DM ni consulta recursos privados.
- Caducidad oculta e inhabilita el contenido privado y exige recuperar el mismo rol.
- La nueva regresión con logout 503 conserva Player y muestra una alerta hija directa de Mesa, fuera de `details` y visible semánticamente con Mesa cerrada.
- Regresiones del cliente y transporte, incluida gestión de sesión, reconexión y descarte de trabajo obsoleto.

`git diff --check`: aprobado, operación de solo lectura.

## Límites

Las pruebas web usan jsdom y dobles de red/UI; no se atribuyen como humo HTTP ni verificación visual real. No se operó navegador en esta revisión: la matriz visual CUA y las capturas descritas en build.md corresponden a construcción y a la revisión UI. No se repitieron los 73 tests ni los reproducer HTTP de ronda 2 porque sus fuentes no cambiaron. No se hizo auditoría de dependencias, despliegue TLS/proxy o infraestructura externa.

El cambio cumple el alcance de seguridad de esta corrección. La aprobación técnica no autoriza merge, despliegue ni generación de DMG.
