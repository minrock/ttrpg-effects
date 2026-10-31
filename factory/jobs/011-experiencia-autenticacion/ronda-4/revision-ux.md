VEREDICTO: APROBADO

# UX — 011, ciclo 2, ronda 4

Revisión independiente del 2026-10-31, versión3.13.0. Se contrastaron perfil UX, instrucciones AGENTS, solicitud/spec y su aceptación A5/A8/A9, build, coordinación, retrabajo, revisión/huellas y evidencia UX propia de ronda3. Las655 huellas coinciden antes y después del recorrido. El delta frente a ronda3 es de cuatro rutas: GameEditor.tsx, su prueba de autoridad, browser-client.md y CHANGELOG.md; no hay cambios de CSS/backend.

## Cierre e inicio propios: recorrido real satisfactorio

CUA propio en Electron servicio aislado `.local/qa-011/electron-profile`, API sintética SQLite8891, ventana1440×900:

1. Acceso Aurora, apertura de Campaña Aurora caducada e Iniciar partida explícito. El editor quedó disponible.
2. Cerrar partida presenta contexto y Cancelar inicialmente enfocado. Confirmar sin edición pendiente retira el editor y muestra «Estado del anfitrión: Acceso caducado» e «Iniciar partida». Captura y árbol de accesibilidad inspeccionados: no mensaje de pérdida de acceso, Continuar obsoleto ni modal retenido.
3. Iniciar otra vez devuelve el editor. Reabrir partida/Confirmar devuelve una mesa Conectada y editor operable, sin terminal ni confirmación antigua. El foco vuelve al botón Reabrir partida.
4. Cargar «Mapa de prueba Aurora» y renombrar su mapa a «Borrador UX ronda 4», sin guardar. Reabrir/Confirmar ahora presenta «Cambios sin guardar», con Cancelar inicial y opciones Descartar/Guardar y continuar. Escape cancela ese guard y retorna foco a Confirmar del diálogo padre; otro Escape cancela la reapertura y vuelve al botón Reabrir. El nombre editado permanece intacto y no se abandona el editor.
5. Cerrar/Confirmar con ese mismo borrador vuelve a exigir el guard. Elegir Descartar produce Acceso caducado/Iniciar partida, sin bloqueo ni terminal. No se guarda la edición sintética. Se cierra sesión y se verifica Acceso a tu mesa; Cmd+Q termina la instancia propia.

Este recorrido cierra el impacto UX de C4/UI-011-3 en Electron: el cierre voluntario deja una acción de inicio efectiva y la reapertura no se confunde con pérdida de autoridad. No se afirma controlar el orden HTTP/SSE con CUA; eso corresponde a las pruebas deterministas siguientes.

## Fuente y comprobación selectiva propias

GameEditor registra la apertura retirada únicamente después de confirmar y superar el guard. Conserva comprobación de identidad al recibir terminal; difiere el efecto visual de la apertura que se está cerrando/reabriendo, consulta el estado actual y cambia de contexto tras éxito. Los callbacks y consultas tardías comprueban ID/generación de origen; errores inciertos conservan retención en lugar de anunciar éxito. Se inspeccionaron estas rutas reales y las nuevas regresiones.

Ejecutado `pnpm exec vitest run src/web/GameEditor.authority.test.tsx src/web/GameEditor.test.tsx src/web/ServiceApp.test.tsx --maxWorkers=1`: **38/38 pruebas PASS**, tres archivos,3.07s. Las diez pruebas nuevas cubren ambos órdenes terminal/POST, consulta de identidad resuelta después del siguiente contexto, cierre incierto,401 durante cierre y503/401 tardíos. Las28 existentes mantienen conservación de borrador, cancelación de modales/respuestas tardías, reintento503/429, guard de invitación e historial.

Los transportes/mesa y viewport reducido de estas pruebas controladas no acreditan modalidad nativa por sí solos. La liberación real de modales al revocar y recuperación del mismo borrador ya tiene CUA propio de ronda3, con modal simple y guard anidado; permanece atribuida a esa ronda. No se revocaron cuentas nuevamente en esta revisión. El arreglo actual conserva el cierre modal y la invalidación por autoridad, y las regresiones siguen pasando.

## Límites y limpieza

- Evidencia nueva propia: fuentes,38tests, dos cierres voluntarios, inicio posterior, reapertura efectiva, carga/edición del mapa, guard/cancelación/Escape/foco y descarte consentido en Electron. Captura inspeccionada sin archivo ni secretos.
- No se repitieron todas las herramientas, cámaras/escala, Player, administración, matriz200%, Electron local, PostgreSQL o respaldo/restauración por este delta. Esas verificaciones mantienen su atribución previa; no se certifica proyector físico. Las1250pruebas y builds generales son ejecución del constructor; el CUA/IAB de Boreal registrado en coordinación es del orquestador.
- El proceso Electron propio16407 terminó exit0; cuenta Aurora cerró sesión y su apertura de prueba quedó cerrada. No pestañas creadas ni dashboard tocado. Aurora/Electron liberados y comunicado al orquestador.
- La salida del proceso contiene cuatro avisos GPU SharedImageManager/ProduceSkia; no se observó fallo de mapa ni bloqueo de los recorridos descritos. Se registra como límite de consola, sin atribuirlo a la corrección.
- No se guardó escena ni modificaron contraseñas; no se leyó provisión personal ni se tocó8787. Sin reinicios de servicios/PG, suites intensivas, producto, Git, tablero o informes ajenos. Publicación por temporal y renombrado.

No quedan cambios UX obligatorios identificados en esta ronda. UX-1/UX-2/UX-3 mantienen sus cierres previos; la experiencia corregida de cierre propio e inicio posterior queda verificada independientemente en Electron.
