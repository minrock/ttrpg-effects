VEREDICTO: APROBADO

# Revisión de seguridad — 011, ciclo 2 / ronda 4

Revisión independiente del 2026-10-31 en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Perfil seguridad y expediente vigente contrastados: AGENTS, solicitud/spec, build/coordinación, retrabajo, revisión y huellas de ronda 4. Se conservan las lecturas previas de las instrucciones sin cambios. Inspeccionados código físico y diff desde ronda 3, además de consumidores relevantes. **655/655 huellas coinciden**, comprobadas al comenzar y antes de publicar.

No se encontraron hallazgos de seguridad nuevos demostrables. La corrección del cierre propio no debilita la suspensión de cuenta ni la separación entre aperturas. La aprobación se limita a esta disciplina; el cierre funcional C4/UI-011-3 corresponde también a código/UI y a la decisión global.

## Alcance concreto

El delta tiene cuatro rutas: `src/web/GameEditor.tsx`, `src/web/GameEditor.authority.test.tsx`, `docs/browser-client.md` y `CHANGELOG.md`. Backend, identidad, persistencia, transportes, hooks de generación, diálogos, Participants y fronteras Electron conservan las huellas de ronda 3. No hay nueva dependencia, migración, formato ni versión adicional; permanece 3.13.0.

## Autoridad, contexto y respuestas tardías

`src/web/GameEditor.tsx:20`–`28` mantiene una generación para las operaciones y otra para la autoridad, y asocia la retirada al ID/generación de apertura. Al suspender la cuenta limpia el contexto en retirada. El hook `useActiveOperation` sigue invalidando capturas en suspensión/desmontaje; reautenticar no vuelve válidas las promesas anteriores.

`GameEditor.tsx:34`–`51` marca una retirada solo al confirmar cierre/reapertura, después del guard. El cierre espera POST y lectura del estado actual antes de retirar el editor. La reapertura contrasta tanto ID como generación del resultado con la lectura actual antes de cambiar de contexto. Las continuaciones de ambas operaciones conservan sus comprobaciones de vigencia. Un fallo con terminal ya recibido congela la apertura anterior mediante `failRetirement`; no se interpreta como éxito ni reanuda acceso.

`GameEditor.tsx:59`–`67` sigue consultando la cuenta incluso durante el cierre propio. El terminal se difiere únicamente para el contexto que está siendo retirado. Los callbacks de otra apertura y los resultados de consulta posteriores a cambiar de contexto quedan descartados. Esto abarca tanto éxito de sesión como error transitorio tardío; un 503 antiguo no bloquea la apertura nueva.

La comprobación de contexto del componente **no suprime un 401 del transporte**: `src/infrastructure/browser/http.ts:37` invalida y ejecuta el callback de expiración antes de que la promesa llegue a la rama catch de GameEditor. ServiceApp mantiene ocultación/inert, borrador ligado al ID y recuperación protegida. Los transportes continúan enviando X-TTRPG-Account y la validación del principal original del servidor no cambia. Permanecen cerrados S1/S2 de las revisiones anteriores.

Además, diferir el aviso visual no conserva un canal de mesa autorizado: `src/infrastructure/browser/table-client.ts:42` marca el contexto como terminado, invalida su HttpTransport y limpia la instancia **antes** de invocar el callback terminal del editor. `contextual-table-client.ts` mantiene contexto inmutable, transporte propio y namespace/audiencia originales. No se desactiva esta defensa durante la reconciliación HTTP.

Los guards de cierre modal, cancelación de decisiones, montaje condicional de Participants y conservación del borrador de ronda 3 permanecen intactos. El nuevo flujo no introduce una confirmación antigua después de recuperar la cuenta.

## Verificación propia

`pnpm test src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/ServiceApp.test.tsx src/infrastructure/browser/owned-client.test.ts src/infrastructure/browser/browser-client.test.ts --maxWorkers=2`: **5 archivos, 64/64 pruebas PASS, 4,12 s**.

Se inspeccionaron y ejecutaron las diez regresiones nuevas: cierre/reapertura en ambos órdenes terminal–POST; consulta de sesión resuelta después de iniciar la siguiente apertura; terminal viejo ignorado y terminal de la nueva apertura todavía efectivo; cierre incierto con borrador congelado; 401 durante cierre; y 503/401 tardíos de la sesión anterior. Se conservaron los casos de suspensión, guard anidado, respuesta tardía de expulsión/rotación, cambio de principal, recuperación del borrador y 401 administrativo.

Las pruebas utilizan GameEditor y HttpTransport reales con mesa/fetch controlados. En los casos de 401 la aserción verifica el callback de expiración y el arnés realiza la transición active=false; ServiceApp y sus regresiones complementarias verifican la composición del guard. No se presenta ese arnés como una prueba end-to-end de cookies/SSE reales.

`git diff --check`: PASS. Verificación SHA-256 final: **655 archivos, cero diferencias**.

## Superficies no alteradas y límites

Sin cambios de IPC/preload, aislamiento Electron, sender/payload, validación de escenas/rutas, SQL parametrizado, CSP, sanitización o exposición/persistencia de secretos. Sus fuentes conservan las huellas ya contrastadas en las rondas anteriores; no hay una nueva entrada privilegiada en el delta. Las nuevas interpolaciones siguen siendo texto React, sin HTML dinámico ni URLs externas.

No se ejecutó PostgreSQL ni se repitieron contratos de motores/restauración: el backend permanece idéntico y no surgió causa nueva. La evidencia real previa sigue atribuida a sus autores, no a esta ronda. Tampoco se repitieron los gates generales o builds del constructor.

No se realizó CUA propio. El retest IAB de cierre/inicio/reapertura pertenece al orquestador y la modalidad nativa Electron a UX; las pruebas DOM no acreditan esas observaciones. Esta aprobación no declara integración, servicio personal actualizado ni DMG generado.

No se utilizaron API8891, Aurora u otras cuentas compartidas, API8787, configuración o datos personales. No quedan procesos, pools o fixtures propios. Sin modificaciones de producto, Git, tablero ni informes ajenos. Única publicación: este informe mediante temporal y renombrado atómico.
