VEREDICTO: APROBADO

# Revisión UX — 003, ciclo 1, ronda 2

Revisión independiente sobre el alcance de solicitud/spec, las convenciones AGENTS y el perfil UX. Se leyeron build actualizado, identidad/diff de ronda 2 y código real; se contrastaron huellas SHA-256 de App, ServiceApp, dialogs, dialog-focus, SceneLinkModal y browser-client: coinciden con `ronda-2/huellas.json`. No se encontraron hallazgos UX bloqueantes nuevos. La aprobación es técnica, no autoriza Git ni integración.

## Cierre de hallazgos de ronda 1

**UX-003-01, flujo entre escenas: corregido.** App incorpora `selectRemoteSceneLinkTarget` y `handleConnectRemoteSceneLink`, consumidos por SceneLinkModal. El selector ofrece escenas guardadas por nombre, muestra el destino elegido y permite escoger un marcador remoto; conserva la alternativa entre mapas internos. Se informa que se guardará la fuente antes de conectar. Ante fallo no se aplica la respuesta como conexión válida y el error permanece en el modal con posibilidad de repetir la selección. La reparación de destino ausente usa ese mismo flujo y no exige introducir rutas/IDs.

**UX-003-02, foco: corregido.** La cabecera recuerda un resumen visible del menú o el botón superior; la restauración espera a que termine el estado ocupado. El selector anidado de conexiones recuerda su propio disparador. Pruebas con App/WorkspaceHeader reales cubren el caso anteriormente ausente, incluido nombre nuevo y guardado directo.

## Comprobación CUA propia contra API real

Chrome mediante CUA, producción local `127.0.0.1:8873`, build 3.4.0, directorio nuevo `/private/tmp/ttrpg-ux003-r2.*` y claves de prueba. IAB no estaba disponible para este subagente y se usó Chrome sin modificar permisos. Se sembraron mediante HTTP dos escenas temporales “UX A” y “UX B”, un PNG900×600 y un marcador por escena. El documento base procedía de datos temporales de esta revisión anterior, nunca del perfil personal. La siembra no se presenta como recorrido UI.

Recorridos efectuados desde el producto:

1. Login DM → menú → Cargar → Escape: `document.activeElement` es SUMMARY, `aria-label="Menu de escena"`.
2. Cargar UX A → pestaña Mapa → Editar Puerta A: abre modal con foco en Nombre del punto y sección Otra escena guardada.
3. Elegir escena del servicio → Escape: vuelve a Puerta A y deja foco en BUTTON “Elegir escena del servicio”.
4. Elegir UX B → seleccionar marcador disponible → Conectar: muestra “Conexión entre escenas guardada”. Reabrir Puerta A muestra “Conexion valida”; Ir al mapa abre UX B. El flujo ya no requiere invocar endpoints fuera de la interfaz.
5. Guardar escena existente desde botón superior: vuelve a BUTTON `aria-label="Guardar escena"`.
6. Editar Puerta B y elegir la propia UX B como destino: alerta accionable “Para esta misma escena usa Mapa destino”; conserva conexión y escena. Escape cierra el modal y retorna a BUTTON `aria-label="Editar Puerta B"`.
7. Cerrar sesión devuelve la pantalla de acceso. Pestaña cerrada, API propia detenida y turno UI liberado. No se modificó viewport ni perfil personal.

## Pruebas y recuperación

Comando propio: `pnpm exec vitest run src/web/ServiceApp.test.tsx src/renderer/src/App.workspace.test.tsx src/infrastructure/browser/browser-client.test.ts src/renderer/src/components/aside/ReplaceMapImageModal.test.tsx` — **4 archivos y 54 tests PASS**, 3,32 s. Se conserva el aviso conocido de jsdom canvas sin soporte de getContext; el render real se comprobó por separado con navegador.

La cobertura inspeccionada incluye selección/conexión/reparación desde App, error sin aplicar cambios, guardado fallido y cancelación, foco con busy, roles/401, conservación del borrador del portal, reemplazo de imagen y suspensión de atajos del preview oculto. El adaptador incorpora la señal del ciclo de sesión al selector/nombre/lectura local para rechazar resultados anteriores al 401 incluso después de reautenticar. ServiceApp confina portales al árbol hidden/inert del VTT y no monta la interfaz privada para jugador. No se detectó regresión en esos caminos.

## Evidencia complementaria y límites

Se contrastó el humo documentado por constructor y raíz, incluido `/tmp/ttrpg-003-root-correccion.md`: reparación del legado, reconexión y liberación del extremo anterior, recuperación de formulario NPC tras401, nombres largos, logout jugador y nombre nuevo cancelar/confirmar con foco restaurado. Es evidencia atribuida a sus autores; no se afirma que esta revisión haya repetido esos recorridos CUA.

No se repitieron toda la suite, Electron/labs, los tres tamaños, todos los formularios de biblioteca, importación/exportación ni cada herramienta del canvas. Se conservan las comprobaciones y límites explícitos de build y de la ronda anterior. La proyección sincronizada continúa fuera de alcance y se presenta como pendiente. Los dos hallazgos UX previos quedan cerrados con código, regresiones y comprobación real complementaria suficientes.
