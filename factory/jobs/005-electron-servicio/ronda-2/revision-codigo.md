VEREDICTO: APROBADO

# Revisión de código — 005, ciclo 1, ronda 2

Fecha: 2026-10-29. Revisor independiente conforme a `.codex/agents/codigo.toml`. Rama comprobada: `feature/fabrica-software`. Sin modificaciones de código, Git, tablero o informes ajenos; sin subagentes ni CUA en esta revisión.

## Alcance e identidad

Se contrastaron AGENTS.md, package.json, solicitud/spec/build, identidad/huellas de ronda 2 y revisión propia de ronda 1. Se leyó el hallazgo UX-005-01 y la observación UX-005-02 como entradas de corrección, además de la actualización de autorización del expediente.

Las **529 huellas SHA-256 coinciden** con los archivos actuales, comprobadas antes de la revisión y antes de publicar. Frente a ronda 1 solo cambian seis archivos congelados: `src/main/service-app.ts`, `src/main/service-app.test.ts`, `README.md`, `docs/service-operations.md`, `factory/README.md` y `factory/migracion-servicio.md`. Se inspeccionaron los seis. Los dos últimos registran la autorización posterior del usuario y el cierre conjunto de la serie; no alteran comportamiento del producto.

Se conserva la inspección de los otros archivos y artefactos realizada en `ronda-1/revision-codigo.md`, cuya evidencia sigue siendo aplicable a las fuentes inalteradas. No se atribuyen sus verificaciones a nuevas ejecuciones.

## Hallazgos y cierre de correcciones

No se identificaron defectos demostrables que requieran cambios en esta ronda. No hay reproducción de fallo ni corrección obligatoria pendiente desde el área de código.

**UX-005-01, cierre con cambios pendientes:** `src/main/service-app.ts:24` instala el listener en el WebContents de la ventana de servicio. El diálogo síncrono está asociado a esa ventana y ofrece instrucciones de guardado antes de salir. `defaultId: 0` y `cancelId: 0` conservan el borrador. Únicamente la respuesta exacta `1` llama `event.preventDefault()` y levanta el veto de descarga. Se contrastó esta semántica con la documentación incluida en `node_modules/electron/electron.d.ts`: en `will-prevent-unload`, preventDefault ignora el veto del beforeunload y permite descargar la página.

La corrección se conecta al beforeunload existente de `src/renderer/src/App.tsx:1988`; no agrega una segunda representación de cambios pendientes, no guarda automáticamente y no llama a quit, destroy o loadURL desde la confirmación. Cada intento vuelve a pedir consentimiento. El listener pertenece al ciclo de vida del WebContents y no añade listeners globales ni recursos externos. El arranque, recuperación, restricciones de navegación y sesión conservan su comportamiento anterior. No hay nuevo preload, IPC ni privilegio del renderer.

Los nuevos tests verifican ausencia de diálogo durante composición, cancelación sin recarga/salida, una segunda solicitud de consentimiento y descarte únicamente con respuesta 1. Las respuestas -1, 0, 2 e indefinida conservan el veto. Es una regresión del comportamiento del host; se complementa con el humo nativo del constructor, descrito abajo.

**UX-005-02, README:** la sección Arquitectura de clientes ya describe Electron local y el servicio HTTP/SSE compartido con navegador y roles DM/jugador. La guía operativa explica ambas elecciones del diálogo y Escape. La documentación no promete guardado implícito.

## Verificaciones propias

```sh
pnpm exec vitest run src/main/service-app.test.ts src/main/electron-entry.test.ts src/main/electron-config.test.ts
```

Resultado: **3 archivos / 38 pruebas PASS**, código 0. Incluye corrección del cierre y regresión de configuración/composición/fronteras/recuperación.

Se inspeccionó el chunk compilado actual `out/main/service-app-6Xjkb_UI.js`: contiene el listener, diálogo y condición de consentimiento correctos. El log de build muestra los chunks local y de política con los mismos nombres que la ronda anterior; sus fuentes también conservan huellas. API/web, esquema de escena, dominio, coordenadas, mediciones, persistencia, dependencias y configuración de build permanecen inalterados. package.json continúa en **3.6.0**, sin repetir bump ni entrada de changelog por esta corrección.

## Evidencia atribuida

Se leyeron los logs finales del constructor posteriores a la corrección:

- `/tmp/005-r1-tests.log`: **125 archivos / 1176 pruebas PASS**.
- `/tmp/005-r1-lint.log` y `/tmp/005-r1-typecheck.log`: checks completados sin errores.
- `/tmp/005-r1-build.log`: build Electron terminado; incluye typecheck y el chunk inspeccionado.

La sección «Corrección de ronda 1» de build.md documenta humo CUA real contra el artefacto compilado y API temporal: cierre nativo y Cmd+Q muestran confirmación; Escape y Seguir editando conservan mapa/nombre; Descartar y salir termina el proceso con código 0 tanto al cerrar ventana como con Cmd+Q; un nuevo acceso recupera solo la escena guardada, no la edición descartada; login sin borrador cierra sin confirmación. Esa evidencia pertenece al constructor, no a este revisor.

Las fronteras, roles cruzados, compatibilidad, operación y backup/restore se reutilizan de la evidencia atribuida en ronda 1 y build.md porque no cambiaron sus módulos. No se vuelve a ejecutar la matriz inalterada ni se presenta como una nueva comprobación propia.

## Limitaciones y autorización

No se realizó CUA, lector de pantalla, despliegue HTTPS remoto ni una nueva suite completa/build. El constructor declara que Return/KP_Enter mediante CUA no activó una opción y no lo presenta como éxito; Escape nativo y los valores seguros del host sí están acreditados. La salida sin cambios se ensayó desde login, no desde una escena guardada; el cambio responde únicamente al veto existente y la suite completa y humo cubren los caminos corregidos. No se encuentra una carencia necesaria para aceptar este ajuste de código.

Persisten las limitaciones históricas y avisos conocidos descritos en ronda 1; no se convierten en verificaciones nuevas. La aprobación del usuario registrada en `aprobacion-usuario.md` habilita al orquestador a integrar localmente tras el cierre técnico conjunto y generar el DMG, sin push. Este informe solo resuelve la revisión de código y no ejecuta ni amplía esa autorización.

Única salida escrita: este informe, publicado mediante temporal y renombrado.
