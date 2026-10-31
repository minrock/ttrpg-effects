VEREDICTO: APROBADO

# Revisión UI — 009, ciclo 1, ronda 1

Fecha: 2026-10-30. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Revisión independiente conforme a `.codex/agents/ui.toml`, AGENTS.md, solicitud, spec vigente, coordinación, build e identidad de revisión. No se leyeron informes ajenos ni se modificaron producto, Git o tablero.

## Alcance y decisión

Se aprueba el alcance UI de 009: contratos backend y módulo de captura del fragmento destinado a 011. La aprobación se fundamenta en la ausencia comprobada de cambios visuales y en la inspección del módulo y sus consumidores reales; no certifica una pantalla de invitación terminada. La spec excluye expresamente formularios y cableado final de 011 y no exige repetir la matriz de proyección cuando las vistas permanecen intactas.

## Evidencia propia

- Comparación SHA-256 entre `base-archivos.json` y `ronda-1/huellas.json`: 37 archivos nuevos/modificados, coincidentes con el inventario de la ronda. De 182 archivos congelados bajo `src/web/`, `src/renderer/` y `src/render/`, ninguno de los preexistentes cambió; únicamente se añadieron `src/web/invitation-fragment.ts` y su test. Comparación de todos los archivos registrados contra las huellas congeladas: cero discrepancias.
- `src/web/invitation-fragment.ts:3`: lee el fragmento, ejecuta `history.replaceState` sincrónicamente y después valida ruta/UUID y secreto. No construye DOM ni usa React, estilos, storage, navegación externa o peticiones. El secreto queda en memoria y se descarta mediante `consume` o `cancel`; una segunda consumición no lo devuelve. Los fragmentos inválidos también se eliminan de la URL.
- Búsqueda de `captureInvitation`, `invitation-fragment`, `/jugar/`, `/admission` y `guest/session` en web, renderer y contratos/clientes: el módulo solo tiene consumidor en su test. `src/web/main.tsx:4` sigue montando `ServiceApp`; `src/web/ServiceApp.tsx` sigue usando el acceso legado `/auth/session` y `/auth/login`, sin formulario de alias ni consumo de invitaciones. El fallback de `src/server/static-files.ts` puede servir la shell existente para una ruta HTML; no constituye una nueva experiencia de entrada.
- `src/shared/contracts/invitations.ts` preserva alias, discriminador y estados `fresh`/`reconnecting` como datos tipados. `src/domain/invitations/invitation.ts:3` normaliza Unicode/NFC y limita alias a 40 puntos/160 bytes, rechazando controles y formato invisible. No hay interpolación visual nueva que evaluar. `src/application/services/invitations.ts:6` y `src/server/invitation-http.ts` entregan mensajes en español y estados diferenciados, aún sin vista consumidora.
- `docs/invitations.md` y `README.md:170` describen el alcance backend y reservan proyección/moderación para 010 y pantallas/corte para 011. La guía no anuncia una interfaz que el código no implementa.

Prueba propia ejecutada en este checkout con Node v24.15.0: `pnpm test src/web/invitation-fragment.test.ts`, exit 0, un archivo y cinco pruebas aprobadas, duración 193 ms. Comprueba limpieza antes de una petición instrumentada, consumo único, cancelación y fragmentos inválidos, además de alias, cuotas puras y atributos de cookie. No abre bases ni ejecuta KDF. La petición es una función instrumentada del test, no tráfico ni navegación real; el resultado no acredita orden de arranque de una página todavía sin integrar.

## Hallazgos y corrección esperada

Sin hallazgos bloqueantes de UI ni correcciones necesarias dentro de 009. Para reproducir la conclusión: comparar las huellas de las tres carpetas visuales con la base 009, buscar los consumidores del módulo y seguir `main.tsx` hacia `ServiceApp.tsx`. Se observa que ninguna vista, regla CSS, control del mapa, atajo o capa de proyección recibe los nuevos datos.

Jerarquía visual, controles compactos, contraste en proyección, nombres largos, reconocimiento sin depender del color, viewport estrecho y superposiciones no tienen una superficie nueva en esta entrega. La futura representación de alias/discriminadores, foco/teclado, pegado, Enter/Escape, anuncios accesibles y aislamiento de Delete/Backspace deberá verificarse al conectar 011, según su alcance. No se exige adelantarla para aprobar 009.

## Atribución y límites

No se realizó CUA, capturas, inspección de apariencia en navegador, proyector físico ni matriz de tamaños. No se aprueba apariencia mediante tests de DOM; la justificación es que no existe cambio visual integrado. Tampoco se certifica que abrir hoy el enlace limpie el fragmento: el módulo aún no está cableado y la documentación lo reconoce.

Las cifras de gates generales, builds y contratos SQLite/PostgreSQL de `build.md` pertenecen al constructor; no se presentan como ejecuciones de este revisor. No se ejecutaron gates PostgreSQL, suites de identidad/KDF ni servicios. Esta revisión no sustituye seguridad, código o UX. No se accedió a datos, configuraciones privadas o servicios del checkout original.
