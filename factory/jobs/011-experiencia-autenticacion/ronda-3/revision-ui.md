VEREDICTO: CAMBIOS

# Revisión UI — 011, ciclo 2 / ronda 3

Fecha: 2026-10-31. Revisión independiente del producto 3.13.0 congelado en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Leídos perfil UI, AGENTS, solicitud, spec, build, coordinación, retrabajo del ciclo2, diff efectivo e identidad de ronda3. Las 655 huellas coinciden al publicar. Comparación ronda2→ronda3: ocho archivos cambiados; ninguna hoja CSS cambió. La revisión se concentra proporcionalmente en recuperación y diálogos, conservando el alcance visual aprobado de ronda2 para las pantallas intactas.

## Evidencia propia y resultado de la corrección original

Chrome mediante CUA, exclusivamente QA8891/SQLite, cuenta sintética Boreal y partida propia «QA UI ronda tres — recuperación de sesión» (`7070fed2-ebe0-469a-82c8-8fadeff58d28`). Capturas observadas directamente; inspección DOM solo como complemento de foco/dimensiones, no sustituto de apariencia.

- A1024×768 confirmados por DOM, «Cerrar partida» muestra título, nombre y sistema/versión, consecuencias y Cancelar/Confirmar completos, con contraste legible y sin superposición del contenido. Cancelar recibe foco inicial; existe un único diálogo modal real.
- Con esa confirmación abierta, cerrar sesión desde otra pestaña propia elimina el modal y su oscurecimiento. Recuperar sesión queda visible, el campo Correo electrónico recibe foco con anillo visible y el DOM confirma cero diálogos abiertos. No se necesita Escape ni recarga para usar el formulario.
- A512×384 CSS confirmados, recuperación desplaza hasta Acceder y Entrar con invitación. Captura de los controles completos, scrollTop282, scrollHeight666, altura384 y ancho del body512: sin desbordamiento horizontal. Esta observación es viewport estrecho aDPR1; no se atribuye como zoom200%. Los intentos de atajo no cambiaron DPR; la validación de zoom nativo200% de ronda2 permanece como evidencia histórica, con CSS idéntico.
- Reautenticar la misma cuenta devuelve al editor sin reabrir la confirmación cancelada y con cero diálogos abiertos. Abrir después «Reabrir partida» exige una decisión nueva. Shift+Tab desde Cancelar circula a Confirmar; Escape cancela y devuelve foco a Reabrir partida.

Fuentes contrastadas: `src/web/AccountAccess.tsx:15` enfoca el campo de recuperación; `src/web/dialogs.tsx:20` cierra el diálogo nativo al desmontar y evita devolver foco a un árbol oculto/inerte; `src/web/GameEditor.tsx:21` limpia confirmaciones al suspender y condiciona los diálogos a autoridad; `src/web/use-active-operation.ts` invalida operaciones de generaciones anteriores. No se observó el bloqueo modal original en este recorrido. No se certifica aquí preservación de un borrador editado: se utilizó escena vacía, sin guardarla ni publicarla; el contraste funcional de borrador/expulsión/revalidación y Electron corresponde a UX/código.

## UI-011-3 — P2: cierre propio deja estado y acción incompatibles

Archivo: `src/web/GameEditor.tsx:20`, `:29`, `:33` y `:43` (captura de operación, continuar, cierre confirmado y terminal). La presentación de estado se compone en `:45`.

Reproducción real, dos veces:

1. Entrar con Boreal y abrir/iniciar la partida propia genérica v1, sin mapas ni cambios de escena.
2. Pulsar Cerrar partida y Confirmar. En la primera ejecución se había recuperado previamente la sesión; la segunda parte de una nueva apertura tras volver a entrar, sin recuperación previa.
3. El editor desaparece y queda sostenida la combinación «Tu acceso a esta partida ya no está disponible», «Estado del anfitrión: Conectado» y botón habilitado «Continuar partida».
4. Pulsar Continuar partida no produce transición ni mensaje de error. Una segunda observación confirma el mismo estado; no es solo un fotograma de carga.
5. Volver al catálogo y abrir de nuevo el editor sí muestra «Acceso caducado» e «Iniciar partida». Iniciar y cerrar otra vez reproduce la contradicción. Captura propia de la segunda reproducción inspeccionada.

Impacto: el DM que acaba de cerrar voluntariamente recibe un aviso de pérdida de acceso junto a un anfitrión conectado y una acción principal que no responde. El estado deja de ser reconocible mediante texto y obliga a descubrir una salida indirecta por navegación. Esto requiere corrección aun cuando la recuperación modal original ya funciona.

La fuente sugiere una carrera entre la respuesta del cierre y el terminal SSE: `terminalReceived` establece terminal, mientras `captureOperation(active&&!terminal)` cancela el refresco pendiente de opening y también la acción Continuar. Es una inferencia de lectura que código debe contrastar; el hallazgo no depende de dar por demostrada esa causa.

Corrección esperada: al confirmar el cierre propio, presentar estado cerrado/caducado coherente y una acción válida para volver a iniciar, sin conservar un Continuar inoperante ni afirmar acceso revocado por el cierre propio. Mantener las cancelaciones necesarias ante pérdida real de autoridad. Verificar ambos órdenes de respuesta HTTP/terminal y el recorrido real de cerrar e iniciar otra vez.

## Límites y limpieza

No se encontraron regresiones de layout en el diálogo ni en recuperación; UI-011-1/2 permanecen cerrados por la evidencia anterior y ausencia de cambios CSS. Este CAMBIOS corresponde al nuevo estado/acción incoherentes, no reabre los hallazgos visuales anteriores.

No se repitieron administración, nombres extremos, proyección1920×1080 ni Electron; UX tenía Electron/Aurora reservados. No se usaron API8787, datos personales, PostgreSQL, Git ni suites intensivas. No se revocó Aurora ni se modificaron sus partidas. Credenciales sintéticas consumidas en memoria, sin imprimir secretos; se rechazó guardar la contraseña en el navegador. No se generaron capturas versionadas ni enlaces secretos en este informe.

La partida propia permanece como fixture; sus dos aperturas se cerraron y no se guardó/publicó ninguna escena. Sesión Boreal cerrada. Las tres pestañas propias están cerradas, viewport restablecido y DPR1 confirmado. Ningún proceso propio pendiente. Única salida escrita: este informe, publicado completo mediante temporal y renombrado.
