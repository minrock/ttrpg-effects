VEREDICTO: APROBADO

# Revisión UX — 003, ciclo 2, ronda global 3

Se revisaron retrabajo-ciclo-2.md, build actualizado, identidad/diff de ronda 3 y código real, siguiendo el perfil UX y las convenciones ya leídas. Alcance: transición entre conexiones remotas e internas, Desligar, conservación del estado ante fallo y continuidad del modal. No hay nuevos hallazgos UX bloqueantes en este retrabajo.

## Resultado

- **Transición remoto → interno:** App rechaza la operación antes de guardar o cambiar estado cuando el marcador conserva un enlace remoto. La alerta dentro del modal indica exactamente la acción necesaria: “Usa Desligar para liberar la conexión con otra escena antes de conectar mapas internos”. El dominio también impide sobrescribir ese enlace.
- **Transición interno → remoto:** el rechazo equivalente ocurre antes de persistir o conectar. La alerta explica que debe liberarse la conexión interna. El servicio valida tanto origen como destino, por lo que tampoco confirma un éxito sobre un extremo interno ocupado.
- **Desligar y reintentar:** SceneLinkModal trata un resultado fallido y una excepción; mantiene abierto el diálogo, informa que la conexión se conserva y vuelve a habilitar controles. La conexión/desconexión interna solo aplica `setScene(nextScene)` después de persistir con éxito. El usuario no recibe un estado libre ficticio tras un fallo y puede volver a pulsar Desligar.
- **Continuidad:** tras desligar correctamente se puede realizar la nueva conexión. La reconexión entre escenas remotas continúa disponible. El texto de rechazo coincide con el nombre visible del botón, y la guía del navegador documenta el mismo recorrido. El bloqueo de la transición directa es la alternativa expresamente autorizada por el retrabajo.
- **Modal:** el cambio CSS lo sitúa fijo por encima de la cabecera sin moverlo fuera del árbol protegido de sesión. No se cambian las reglas de foco, Escape ni la frontera hidden/inert verificadas en la ronda previa. La validación visual específica corresponde al humo documentado y a la revisión UI independiente.

Fuentes principales: `App.tsx`, funciones `handleConnectSceneLink`, `handleConnectRemoteSceneLink` y `handleDisconnectSceneLink`; `SceneLinkModal.tsx`, funciones `connect`, `connectRemote` y `disconnect`; reglas de dominio/servicio y `docs/browser-client.md`. Se verificaron las huellas SHA-256 de esos cinco archivos de implementación cambiados y ambos archivos de pruebas contra `ronda-3/huellas.json`: todas coinciden.

## Verificación propia

`pnpm exec vitest run src/renderer/src/App.workspace.test.tsx src/infrastructure/browser/browser-client.test.ts` — **2 archivos, 37 tests PASS**, 3,54 s.

Se inspeccionaron las nuevas pruebas, además de ejecutarlas. Las interacciones usan App/WorkspaceHeader/SceneLinkModal reales con viewport aislado y API sustituida para inyectar fallos. En ambas modalidades comprueban: pulsar el control contrario produce la alerta “Usa Desligar”; no se invoca guardar, conectar ni desconectar; la conexión permanece idéntica; un fallo de Desligar conserva el estado; reintentar libera los extremos y permite la nueva conexión. La prueba interna inspecciona ambos marcadores del payload persistido.

La integración HTTP/SQLite real verifica documentos sin cambios tras rechazos, rollback al fallar la segunda escritura de desconexión, destino remoto libre tras desligar, rechazo de origen y destino internos, nueva conexión y navegación posteriores. Es evidencia funcional complementaria a la interacción UI, no una prueba visual. El aviso conocido de jsdom sobre getContext permanece y no se interpreta como validación del canvas.

## Evidencia complementaria y límites

El build documenta humo CUA del constructor sobre API real: rechazo remoto→interno, Desligar exitoso, conexión interna y rechazo interno→remoto, con el vínculo previo visible en cada rechazo; también cabecera/cierre/pie del modal a 1024×768 y 1440×900. Se atribuye esa evidencia al constructor. El fallo de desconexión está cubierto por inyección automatizada, no por su humo manual.

Esta ronda no repitió CUA propio, Electron/labs, toda la suite ni el humo de401: el cambio es acotado y las pruebas de interacción y persistencia anteriores son suficientes para esta decisión UX. Se liberó el turno UI al inicio y no se abrieron navegador ni servicio propios. No se editaron código, Git, tablero ni informes anteriores. La aprobación técnica no autoriza merge.
