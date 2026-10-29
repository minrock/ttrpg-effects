VEREDICTO: CAMBIOS

# Revisión UX — 005 Electron cliente del servicio

Fecha: 2026-10-29. Ciclo 1, ronda 1. Revisión independiente conforme a `.codex/agents/ux.toml`. Se leyeron AGENTS.md, solicitud, spec, build, identidad/huellas de ronda y fuentes reales de composición Electron, recuperación, navegación, cliente web y guía operativa. No se modificaron implementación, Git ni tablero. La revisión no depende de los veredictos de los otros revisores de esta ronda.

## Hallazgo bloqueante

### UX-005-01 · P2 · Cerrar la ventana o salir con cambios pendientes queda bloqueado sin explicación

**Evidencia de código:** `src/renderer/src/App.tsx:1988` cancela `beforeunload` cuando existe un mapa/borrador modificado. `src/main/service-app.ts:23–49` instala navegación, recuperación y acciones nativas de cierre/salida, pero no gestiona `will-prevent-unload` ni ofrece una respuesta visible al veto de cierre. El aviso nativo previsto para el navegador no se materializa en el nuevo cliente Electron.

**Reproducción real propia, CUA:** ejecutar API compilada en 127.0.0.1:8895 con datos descartables y Electron mediante `TTRPG_SERVICE_URL=http://127.0.0.1:8895 pnpm start:service --user-data-dir=/private/tmp/ttrpg-ux005-review-service`; acceder como DM con clave sintética; agregar `/tmp/ttrpg-003-map.png` mediante selector web/nativo (mapa 900×600) y cambiar su nombre. Con la escena sin guardar, pulsar el botón nativo de cerrar ventana y después Cmd+Q. En ambos casos la ventana permanece intacta, sin diálogo, alerta, confirmación ni explicación. Árbol accesible y captura CUA verifican la ausencia de respuesta; el proceso permanece vivo.

**Impacto:** el usuario interpreta que cerrar/salir está roto y puede terminar forzando la aplicación. Aunque el veto conserva el trabajo, no le permite decidir de forma visible si continuar o descartarlo. La alternativa descubierta durante la prueba es abrir el menú de escena → Cerrar sesión → Descartar, y después salir; ese recorrido sí presenta «Cambios sin guardar» y finalizó correctamente. No es una respuesta adecuada al intento nativo de cierre.

**Corrección esperada:** responder al veto de cierre del cliente servicio con una confirmación accesible en español, con foco seguro y opciones para seguir editando o descartar y salir; indicar cómo guardar antes si no se ofrece guardado en ese diálogo. Mantener el frontend sin preload/IPC local y no saltarse automáticamente `beforeunload`. Cubrir cerrar ventana y salir de la aplicación; comprobar que cancelar conserva mapa/borrador, que descartar cierra tras consentimiento y que una escena guardada o login sale normalmente. La regresión requiere prueba del host y humo Electron, porque jsdom no reproduce esta integración nativa.

## Observación editorial no bloqueante

**UX-005-02 · P3:** `README.md:21` todavía afirma «la futura adaptación al servicio privado» y «El transporte implementado sigue siendo Electron local», aunque la sección final describe API/web/mesa y enlaza la nueva guía. Puede confundir a quien empieza por arquitectura. Actualizar esa frase a la situación actual. La guía operativa principal sí explica correctamente los dos modos y los comandos.

## Aspectos verificados sin hallazgos

- **Modos y destino:** selección explícita local/service, local por defecto y rechazo de configuración inválida sin fallback. El título observado identifica «Servicio» y el origen. No hay servidor embebido, cambio silencioso de modo ni panel adicional sobre el mapa.
- **Recuperación:** HTML propio en español, destino escapado, enlaces Reintentar/Salir, foco visible y orden natural. Reintentar únicamente usa el origen validado; el menú no recarga una escena activa. Los tests propios verifican rechazo inicial, reintento y salida limitada a la página exacta de recuperación. Evidencia real de Tab/Shift+Tab/Enter y conexión recuperada atribuida abajo.
- **Rol y privacidad:** se reutiliza ServiceApp/PlayerApp; el rol efectivo viene de `/auth/session`, no del query del enlace. El formulario limpia la clave al enviarla; errores de acceso y recuperación se anuncian. La sesión expirada oculta/inertiza el DM y sus portales conservando borradores, y recuperar requiere el mismo rol. No se inyectan claves desde main. La guía explica perfil independiente para jugador y sesión Electron efímera.
- **Copiar enlace, prueba propia:** abrir Mesa, enfocar «Enlace jugador», Cmd+C y Escape. El foco volvió al summary Mesa. Pegar con Cmd+V en el campo de nombre del mapa temporal produjo exactamente `http://127.0.0.1:8895/?view=player`, sin credenciales. Así queda verificada la alternativa manual al permiso de portapapeles denegado. El mensaje del botón y popup bloqueado están documentados; no se exige ventana Electron adicional.
- **Teclado y VTT:** ServiceApp detiene propagación de teclas en login y Mesa; Escape cierra Mesa y restaura foco. App conserva exclusión de INPUT/TEXTAREA/SELECT/contenteditable antes de los atajos destructivos. No cambian lógica de cámara, bloqueo de escala, herramientas ni Player en esta spec. El nuevo contenedor no introduce reglas VTT duplicadas.
- **Guía operativa:** requisitos Node24/pnpm, comandos existentes y salidas separadas, variables obligatorias y sin secretos por defecto, dos claves distintas, rotación por reinicio, HTTPS y origen exacto, proxy SSE sin buffering, directorio persistente completo y perfil Electron separado. Backup exige detener y copiar el directorio entero, incluye sidecars, restaura en destino nuevo y no promete conservar sesiones/publicación. Describe formato v2/migración v1, JSON sin assets y reparación de imágenes/enlaces. Los límites de despliegue están expresos.

## Pruebas propias y evidencia atribuida

**Ejecutado por esta revisión:** `pnpm exec vitest run src/main/electron-config.test.ts src/main/electron-entry.test.ts src/main/service-app.test.ts src/web/ServiceApp.test.tsx` → **4 archivos / 41 pruebas PASS**, 888 ms. Incluye modos/URL, composición, recuperación/salida, login/roles, expiración, borradores/portales, cancelación/foco y fallo recuperable de logout. Las pruebas de host usan mocks: no acreditan por sí mismas comportamiento nativo del cierre; por eso se hizo el recorrido CUA que encontró UX-005-01.

**Congelación propia:** SHA-256 actual coincide con ronda1 para `src/web/ServiceApp.tsx`, `src/web/service.css`, `src/renderer/src/App.tsx`, `src/renderer/src/PlayerApp.tsx`, `src/infrastructure/browser/table-client.ts`, `src/main/service-app.ts` y `docs/service-operations.md`. Los primeros cinco también coinciden con las huellas finales de 004/ronda3. Se reutiliza la evidencia VTT aprobada de esa dependencia, sin atribuirla a una nueva ejecución.

**CUA propio:** login DM, selector de escenas vacío/cancelación, copia manual y Escape/foco de Mesa, upload de PNG sintético, edición de nombre, cierre nativo/Cmd+Q bloqueados, logout con diálogo de cambios y descarte, salida posterior con código0. Se reutilizó, coordinadamente con UI, el directorio descartable `/private/tmp/ttrpg-ui005-review-data`; el perfil Electron fue propio y temporal. No se tocó biblioteca personal. No hubo control por CDP/Playwright ni scripts UI.

**Atribución a UI005, comunicada durante coordinación de CUA:** recuperación real a 1440×900 y 1024×768; foco azul en Reintentar/Salir, Shift+Tab/Enter reintentó después de levantar API real y llegó a login; botón Copiar mostró «Selecciona el enlace y cópialo manualmente». No se presenta como observación propia ni se usa su veredicto para decidir este informe.

**Atribución a build005:** humo de Electron local a 820×520, servicio DM/jugador y tamaños1024×768/1440×900, proyección1920×1080, TLS rechazado, caída/reanudación de API con borrador conservado y roles cruzados navegador/Electron. Operación backup/restore atribuida allí al orquestador. No se repitió toda la matriz porque el VTT/transportes conservan huellas y el objetivo propio fue la nueva frontera de host.

**Atribución a build004 y cierre UX004:** cámara independiente y recentrado explícito, escala/puntero/áreas/dados, proyección filtrada, reconexión y anuncios accesibles, además de la matriz visual Player. Las limitaciones registradas (proyector real, crítico natural, herramientas manuales no completadas) continúan; no se convierten en pruebas nuevas.

## Límites y cierre

No se ejecutó lector de pantalla físico, un proxy HTTPS desplegado, equipos remotos ni toda la matriz histórica. La revisión de documentación es estática; no se repitió backup/restore. El problema de cierre se reprodujo en macOS con Electron compilado del expediente; falta corregirlo y comprobar los caminos indicados para aceptar UX.

La limpieza se hizo por el flujo visible: Cerrar sesión → Descartar → Cmd+Q. El proceso Electron terminó con código0; API temporal terminó por Ctrl+C con código0. No se crearon pestañas ni quedaron procesos propios. Captura y árbol accesible se inspeccionaron en CUA, sin archivo PNG adicional. Única salida del repositorio escrita: este informe, mediante temporal y renombrado. No autoriza integración.
