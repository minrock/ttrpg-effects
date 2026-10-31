VEREDICTO: APROBADO

# Revisión de seguridad — 011, ciclo 1 / ronda 2

Revisión independiente del 2026-10-31 en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Base efectiva main `73b8e6de21af74912d23399f1b99f3c1112ade91`; se revisó el diff efectivo de 67 archivos contra esa base, incluidos archivos nuevos, y se contrastaron fuentes reales. Leídos AGENTS.md, perfil seguridad, solicitud, spec, build, coordinación, revisión de ronda y los hallazgos S1/S2 previos. Las **653 huellas congeladas coinciden**, comprobadas al comenzar y antes de publicar.

No se encontraron defectos de seguridad nuevos demostrables que bloqueen esta disciplina. S1 y S2 de ronda 1 quedan cerrados por las correcciones verificadas. Esto no aprueba otras disciplinas ni declara integración, DMG o corte operativo realizados.

## Cierre de hallazgos anteriores

### S1 — P1: cerrado; el borrador queda ligado al principal original

`src/infrastructure/browser/http.ts:17`–`19` liga el transporte al ID de cuenta y añade `X-TTRPG-Account`; cambiar el binding invalida generaciones, solicitudes y ciclo de sesión. La comprobación de generación antes y después de leer JSON impide aplicar respuestas anteriores aunque el fetch ignore abort. Los transportes separados de recursos y mesa DM heredan ese ID en `src/web/GameEditor.tsx:34`–`35` y `src/infrastructure/browser/contextual-table-client.ts`.

La defensa decisiva es servidor: `src/server/moderation-backend.ts:18` y `:33`–`:38` mantienen contexto por instancia/petición mediante AsyncLocalStorage, validan la cabecera y la propagan a los handlers de identidad, propiedad, invitaciones y moderación. `src/infrastructure/server/identity/index.ts:82`–`:88` compara el ID con la identidad obtenida de la cookie. La comprobación ocurre dentro de las transacciones de identidad, incluidas las autorizaciones que contienen las escrituras; se contrastó también `identity/database.ts` y la segunda autorización de `owned-http.ts` después de recibir/validar el cuerpo. No se depende de una consulta previa de sesión como única defensa ni de una variable global compartida entre solicitudes.

Se ejecutó el contrato real con `HttpTransport`, adaptador de escena y `openServiceApi` en **SQLite y PostgreSQL productivo/TLS**. En cada motor: A valida sesión, la cookie ambiente cambia a B justo antes del POST de una escena con nota privada, el guardado falla y expira el cliente, B conserva cero escenas, lecturas de catálogo y mutaciones administrativas/contextuales con principal discordante devuelven 401. Reautenticar A permite guardar y recuperar su centinela; B continúa sin ella. El contrato utiliza autoridad/cookies reales, no un mock de persistencia.

`ServiceApp.tsx:29`–`:30` añade aviso entre pestañas y revalidación por foco/visibilidad; `:37` exige descarte antes de mostrar otra cuenta. BroadcastChannel transmite solo ID/logout. Las pruebas DOM verifican ocultación, conservación del nodo/borrador y rechazo del cambio silencioso de ID, además de respuesta tardía en transporte. La cabecera es una precondición, no una credencial: omitirla en un cliente HTTP conserva la autorización normal por cookie y no permite elegir otro propietario. El cliente oficial sí la fija en sus contextos privados.

### S2 — P2: cerrado; los 401 administrativos retiran la interfaz privada

`src/infrastructure/browser/http.ts:6` y `:29`–`:42` sustituyen la exclusión amplia de `/identity/*` por rutas concretas de acceso/recuperación. Un 401 de listado o mutación administrativa invalida el transporte e invoca expiración; el 401 de login incorrecto sigue siendo recuperable. La consulta de sesión ya ligada a cuenta también expira. Cambio de contraseña y PASSWORD_CHANGE_REQUIRED conservan transición protegida.

La regresión de transporte comprueba listado, mutación, bloqueo de envío posterior y login fallido. La prueba DOM monta `ServiceApp` y `AdminAccounts` reales: después de cargar una página con correos y escribir una contraseña temporal, la página siguiente devuelve 401; desaparecen los datos administrativos, se desmonta el formulario previo, la contraseña queda vacía y el guard privado está oculto. El cambio está en el manejo común del transporte y la condición `authorized` de ServiceApp, por lo que alcanza también las mutaciones de esa vista.

## Resto del alcance de seguridad

- Listener final y arranque: identidad obligatoria, exclusión antes de escuchar, namespaces de cuenta/DM/invitado diferenciados y retirada de rutas/claves globales. El fixture HTTP legado solo abastece tests históricos; no es el entry del producto. Se conservaron Host/Origin, límites, errores serializables y ausencia de fallback HTML para `/api`.
- Recursos, definiciones y enlaces: la nueva consulta de definiciones comienza por un recurso propio dentro de `identity.authorized`; no acepta referencias libres a otro propietario. CAS/bindings permanecen del lado servidor y las revisiones devueltas por enlaces corresponden a la transacción. No se introdujeron queries con entrada de usuario concatenada.
- Presentación: alias y nombres se interpolan como texto; la extracción de campos de plantilla reutiliza el renderer Markdown con DOMPurify y el mecanismo CSS existente. No se agregan eval, código de plugins ni navegación arbitraria. URLs de recursos están confinadas a los namespaces esperados y las invitaciones se validan contra el origen/ruta, se retiran del fragmento y se consumen en memoria.
- Credenciales y datos: no se encontraron nuevas escrituras de contraseñas, invitaciones o borradores de servicio en storage ni logs. Setup conserva configuración/secretos, rechaza enlaces simbólicos y prepara permisos 0700/0600; `/.local/` está ignorada. Estáticos se limitan al build físico con CSP y no-store/no-referrer; el empaquetado usa una lista concreta de salidas desktop, sin incluir el árbol privado.
- Electron/IPC: las fronteras privilegiadas no cambian en este diff. Se contrastó la composición servicio sin preload, con sesión efímera, sandbox/contextIsolation y Node deshabilitado; la navegación mantiene su política. No se añadieron canales IPC ni exposición genérica de Node. Tampoco cambia el formato `.ttrpgscene` ni la validación base de escenas.

## Ejecuciones propias

1. `python3 /tmp/ttrpg-auth-pg-run.py exec vitest run --config src/infrastructure/server/moderation/vitest.config.ts src/infrastructure/server/moderation/service-final.contract.ts -t 'principal esperado'`: **2/2 seleccionados PASS, 10,90 s**, uno por motor real. Los seis casos restantes aparecen fuera de selección por el filtro; no se presenta como un nuevo pase de los ocho ni como omisión de PostgreSQL.
2. `pnpm test src/infrastructure/browser/owned-client.test.ts src/web/ServiceApp.test.tsx src/web/GameEditor.test.tsx src/server/environment-setup.test.ts src/web/invitation-fragment.test.ts --maxWorkers=2`: **30/30 PASS, 5 archivos, 2,33 s**. Incluye binding/respuesta tardía, 401 administrativo, recuperación por ID, cambio entre pestañas, entrada invitada con descarte, historial, revalidación temporal y setup privado.
3. `git diff --check`: PASS. Verificación SHA-256 de las 653 entradas: cero diferencias.

## Límites y coordinación

No se repitieron gates globales, builds ni contratos de restauración ya ejecutados por construcción/ronda anterior sin cambios relacionados; se inspeccionaron sus fuentes y la evidencia documentada, sin atribuirlos a esta ejecución. No se realizó CUA propio en esta ronda ni se certifican dimensiones, proyector, distribución firmada o perfil Electron real.

Durante esta revisión el orquestador comunicó una observación independiente de UX en Electron: revocar la cuenta con «Cerrar partida» abierto oculta editor/modal, pero la recuperación visible no recibe click/Tab. Ese bloqueo de foco corresponde al informe UX y debe resolverse por su proceso; **no se confirmó exposición visual del contenido privado ni bypass de autorización**. La aprobación de seguridad no convierte esa observación en un pase de UX ni afirma haberla reproducido personalmente.

PostgreSQL quedó **liberado** al terminar los contratos y se avisó al orquestador. No quedan procesos, pools ni fixtures propios activos; no se detuvo el clúster. No se reinició QA8891 ni se utilizó API8787, provisión, datos o credenciales personales. No se modificaron producto, Git, tablero ni informes ajenos. Única publicación: este informe, mediante temporal y renombrado atómico.
