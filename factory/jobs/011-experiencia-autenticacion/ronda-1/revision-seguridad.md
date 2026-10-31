VEREDICTO: CAMBIOS

# Revisión de seguridad — 011, ciclo 1 / ronda 1

Revisor independiente, 2026-10-31. Base efectiva main `73b8e6de21af74912d23399f1b99f3c1112ade91`; checkout canónico de construcción. Se leyeron perfil seguridad, AGENTS, solicitud, spec, build, coordinación y diff efectivo de la ronda; se contrastaron fuentes reales, incluidos archivos nuevos. Las **651 huellas congeladas coinciden**. No se modificó producto, Git, tablero ni informes ajenos.

## Hallazgos que bloquean aceptación

### S1 — P1: el borrador y sus operaciones no quedan ligados al principal original cuando cambia la cookie en otra pestaña

**Ubicación:** `src/web/ServiceApp.tsx:24` y `:28`, `src/infrastructure/browser/http.ts:28`, `src/infrastructure/browser/browser-client.ts:81–89`; composición del transporte de recursos en `src/web/GameEditor.tsx:34–38`.

La comparación de IDs de `authenticated` solo protege una reautenticación recibida por esa instancia de React después de retener el borrador. No protege cambios de cookie realizados por otra pestaña: la consulta de sesión inicial no se repite por cambio de principal, no hay comunicación entre pestañas, y cada petición usa la cookie ambiente mediante `credentials: same-origin`. El transporte y las mutaciones no llevan una precondición de identidad que el servidor pueda contrastar con el principal autenticado. Un POST nuevo de escena/biblioteca se atribuye correctamente a la cookie recibida, aunque su contenido proceda de la memoria de otra cuenta.

**Reproducción independiente confirmada:** arnés temporal con `createBrowserClient`, `HttpTransport` y `openServiceApi` reales, base SQLite nueva y dos DMs sintéticos. Se cargó una escena A con nota centinela privada; se cambió únicamente la cookie ambiente del fetcher a una sesión B válida, simulando la sustitución compartida del navegador. La misma instancia del cliente ejecutó `saveScene` sin ruta existente: obtuvo éxito, no llamó `expired`, creó una escena propiedad de B y B pudo leer la centinela A mediante la API real. La prueba comprueba esos cuatro resultados, no solo el payload emitido. Los recursos existentes de A continúan protegidos por ownership; la fuga ocurre al crear un recurso nuevo con el borrador retenido.

**Recorrido UI derivado del código, pendiente de reproducción visual:** abrir dos pestañas en acceso anónimo; iniciar A en la primera y editar una escena nueva; iniciar B en el formulario todavía abierto de la segunda. Este login sustituye la cookie sin revocar la sesión A ya establecida. La primera pestaña conserva su cuenta/editor; su stream puede seguir usando la sesión A capturada. El heartbeat con cookie B falla para la partida A pero únicamente escribe feedback. El primer guardado del borrador nuevo utiliza B. No se necesita que el backend permita leer directamente un recurso ajeno ni que se eluda CSRF.

**Impacto:** divulgación y persistencia accidental de notas/contenido privado de A en la biblioteca de B, además de acciones atribuidas a una cuenta distinta de la mostrada. Incumple el aislamiento por ID de borradores y las aceptaciones A4/A9. El alcance demostrado es integración del adaptador con API real; no se presenta como observación CUA completa.

**Corrección requerida:** ligar todo contexto privado y sus operaciones al ID de cuenta original, invalidar/ocultar clientes al cambiar la identidad compartida y exigir descarte explícito antes de mostrar otro principal. La defensa de mutación debe rechazar un principal autenticado distinto del esperado de forma atómica; una consulta previa aislada o solo notificación entre pestañas deja una carrera. Conservar recuperación únicamente del mismo ID y cubrir dos pestañas preabiertas, respuesta tardía y cambio de cookie entre validación y POST. No aceptar ni transferir silenciosamente el borrador a B.

### S2 — P2: los 401 de administración de cuentas no cierran el guard de identidad

**Ubicación:** `src/infrastructure/browser/http.ts:30` (también excepción de bloqueo en `:22`); consumidores `src/web/AdminAccounts.tsx:11–13` y guard `src/web/ServiceApp.tsx:19,32–33`.

El transporte excluye **todos** los paths `/identity/*` del manejo de 401, cuando esa familia también contiene lecturas y mutaciones privilegiadas `/identity/admin/dms`. Si la sesión del administrador caduca o se revoca, esas respuestas solo llegan al `catch` del formulario como texto. No se invalida el transporte, no se invoca `expired`, y React mantiene la lista previa de nombres/correos y controles activos. La excepción necesaria para credenciales incorrectas en login no justifica excluir la administración completa.

**Reproducción independiente confirmada:** prueba de transporte: devolver 401 a `/identity/admin/dms`, comprobar que `expired` no se llama y que una petición privada posterior todavía se envía. Prueba DOM con `ServiceApp` y `AdminAccounts` reales: sesión admin válida y primera página de 20 DMs, pulsar Siguiente y responder 401. Permanecen el nombre/correo de la primera página, `.account-guard` no tiene `hidden` y no aparece recuperación. El backend sí rechaza la acción: no se afirma bypass de autorización remota.

**Impacto:** datos administrativos continúan visibles e interactivos después de comprobar pérdida de autoridad; incumple la retirada de interfaz privada en 401. El mismo patrón alcanza errores de autenticación en operaciones de contraseña que deberían transicionar de estado.

**Corrección requerida:** distinguir rutas públicas/de recuperación concretas de las operaciones autenticadas. Todo 401 de administración debe invalidar solicitudes y mostrar acceso, desmontando contenido administrativo y limpiando contraseñas temporales. Añadir regresiones para listado y mutación administrativa, sin convertir el 401 de login fallido en un bucle de expiración.

## Alcance y garantías verificadas

- Composición final `http/index/moderation-backend`: identidad obligatoria, exclusión antes de servir, namespaces separados, ausencia de autorización por claves globales y rutas antiguas sin shell HTML. Host/Origin y límites presentes; respuestas seguras sin detalles SQL.
- Endpoint nuevo de definiciones: consulta recurso bajo transacción del propietario, no expone definiciones ajenas por ID. CAS/bindings de recursos y links conservan validación del servidor; SQL continúa parametrizado.
- Invitación capturada/eliminada del fragmento antes del montaje y limitada a memoria; URLs privadas/invitadas confinadas a namespaces esperados. Contraseñas de formularios transitorias; no se encontraron escrituras de secretos a localStorage/sessionStorage ni logs en las vistas nuevas.
- Estáticos confinados a build físico, CSP restrictiva, no-store/no-referrer; setup conserva configuración, crea permisos privados, rechaza symlink de configuración y excluye `.local`/env de Git. Empaquetado permite salidas desktop concretas, no el árbol privado.
- Electron servicio no cambió su frontera: sesión efímera, sandbox, contextIsolation, sin Node ni preload; no se añadieron IPC o APIs privilegiadas al renderer. No hay cambios del formato de escena ni de sanitización que requieran una reimplementación. Estas fronteras se revisaron en fuentes, sin atribuir humo visual propio.

## Pruebas ejecutadas por este revisor

1. `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/service-final.contract.ts`: **6/6 PASS, 23.32 s**. SQLite y PostgreSQL real production/TLS; A1/A2/B1, acceso/HEAD/resolve por propietario, definiciones, invitados/SSE/expulsión/sobrevivientes, rutas globales retiradas, restore integral/invalidación y arranque compilado. El arnés crea y retira sus propias bases y pools.
2. `pnpm test src/server/environment-setup.test.ts src/server/static-files.test.ts src/web/ServiceApp.test.tsx src/web/invitation-fragment.test.ts src/infrastructure/browser/owned-client.test.ts --maxWorkers=2`: **23/23 PASS en 5 archivos, 2.02 s**. Los tests existentes no cubren los dos defectos anteriores.
3. Arnés propio temporal `security.test.tsx`: **2/2 PASS, 908 ms** al afirmar las condiciones defectuosas de S2; no significa que la seguridad cumpla.
4. Arnés propio temporal `principal.test.ts`: **1/1 PASS, 5.27 s**, reproducción de S1 contra API final y SQLite real. Solo requiere el entorno del wrapper para importar fixtures compartidas; no abre bases ni conexiones PostgreSQL.

Los arneses propios y sus configuraciones quedan para reproducción en `/private/var/folders/j2/t8vngw011bj2lr2vkwgpnhtr0000gn/T/ttrpg-review-011-security-tcikt3f2/`. Ejecutar con `pnpm exec vitest run --config <directorio>/vitest.config.mts` y `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config <directorio>/principal.config.mts`. Usan cuentas sintéticas, sin secretos reales. El primer intento del arnés DOM no recolectó pruebas por la diferencia `/var` frente a `/private/var`; se corrigió exclusivamente el root temporal y se ejecutó completo. No fue fallo del producto ni se omitió una aserción.

## Límites y liberación

No se repitió la suite completa ni los builds ya informados por el constructor. No se certificó visualmente la navegación completa: el intento inicial CUA a8891 encontró conexión rechazada; el orquestador restauró después ese fixture. No se usó ni modificó API8787, provisión personal, datos reales o perfil Electron. Una sospecha de diálogos nativos en top-layer frente al guard oculto queda fuera de los hallazgos por falta de reproducción visual propia; no añade un bloqueo independiente.

**PostgreSQL liberado** tras los seis contratos; no quedan tests, conexiones ni fixtures de DB propios activos. No se detuvo ni reconfiguró PostgreSQL ni el servicio QA. La aprobación requiere corregir S1/S2 y revisar nueva evidencia sobre una congelación posterior.
