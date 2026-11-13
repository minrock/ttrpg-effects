# 58 — Borradores recuperables y autoguardado del servicio

**Estado:** Integrada en `main` hasta 3.27.2; aceptación de rendimiento nativo pendiente. **Fecha:** 2026-11-05. **Tipo:** funcionalidad.
**Solicitud:** «Dale construye el spec y el plan de implementación que propones». La orden posterior «implementa» autoriza construir esta spec; no commits, merge ni push.
**Base:** main `32bda9f` (3.21.0) y corrección local 3.21.1 de recuperación de sesión, todavía sin integrar. Rama documental: `feature/sdd-recuperacion-borradores`.
**Dependencias:** [03 Persistencia](../03-scene-persistence/spec.md), [43 Navegador](../43-cliente-navegador/spec.md), [45 Electron servicio](../45-electron-servicio/spec.md), [46 Multi-DB](../46-persistencia-multidb/spec.md), [47 Identidad](../47-identidad-dm/spec.md), [48 Propiedad y sistemas](../48-partidas-sistemas/spec.md), [51 Experiencia de servicio](../51-experiencia-servicio/spec.md), [55 Dibujos compartidos](../55-mediciones-compartidas/spec.md).
**Evidencia:** validacion.md. **Versión de cierre:** 3.27.2, fuente única `package.json`. [Validación y límites](validacion.md).

## Problema y objetivo

En servicio, el borrador privado vive únicamente en memoria. Caducar el acceso conserva ese documento mientras la página siga viva, pero un cierre de Chrome o descarte lo pierde. Un conflicto de revisión bloquea la recuperación y ofrece descartar/recargar. La corrección 3.21.1 reduce trabajo gráfico y bucles, pero no introduce respaldo durable.

El DM debe poder recuperar sus cambios tras recarga, cierre, fallo o caducidad; distinguir respaldo local, borrador sincronizado y escena guardada; resolver conflictos conservando ambas alternativas. Un respaldo nunca debe sobrescribir silenciosamente una escena confirmada ni dar acceso a otra cuenta.

## Base comprobada antes de esta implementación

| Mecanismo | Frecuencia actual | Duración |
| --- | --- | --- |
| Guardar escena | Acción del usuario, guardar al salir y determinadas operaciones de enlaces | Recurso persistido en servidor |
| Publicar a jugadores | 250 ms sin cambios, solo con publicación activa | Proyección pública efímera en API; no contiene todo el documento privado |
| Heartbeat de apertura | 10 s | Presencia/lease; no guarda la escena |
| Borrador en servicio | Estado React | Memoria de la página |
| Electron autónomo | sessionStorage tras 1 s sin cambios | Sesión de ventana; excluido explícitamente en modo servicio |

`browser.revalidate()` comprueba hoy todos los recursos recordados, incluso resultados de búsquedas de biblioteca. Cambiar una ficha consultada puede impedir recuperar una escena que no depende de ella. `owned_operations` admite 1000 operaciones/64 MiB por cuenta durante 24 h: no sirve como diario ilimitado de autoguardados. Electron servicio usa hoy una partición aleatoria efímera.

## Alcance y sustituciones

- DM en navegador y Electron servicio: respaldo local, borrador remoto, recuperación, confirmación explícita y estados de guardado.
- Escenas existentes y escenas nuevas con cambios útiles, aunque aún no tengan nombre ni recurso servidor. No crear un borrador al abrir un editor vacío sin editar.
- Cuenta expirada: conservar y respaldar el último estado; reautenticar la misma cuenta antes de restaurar y conectar. La sesión caducada no permite continuar editando ni enviar guardados privados.
- Sustituye para este documento la prohibición de persistir borradores privados del cliente. Se mantiene la prohibición de persistir contraseñas, cookies, secretos de invitación y tokens en el almacén de borradores.
- Electron servicio conserva borradores entre ejecuciones mediante partición persistente aislada por origen, pero elimina credenciales de sesión antes de cargar contenido en cada arranque. Sustituye solo la duración del almacenamiento de SDD 45; se mantiene la autenticación nueva al arrancar.
- Electron autónomo conserva su flujo actual; no migra sus escenas ni bases al servicio.

Fuera de alcance: edición colaborativa del mismo documento, fusión automática de conflictos, historial ilimitado/deshacer global, edición privada sin autenticar, copias offline de imágenes, recuperación de tiradas/punteros/dibujos efímeros de jugadores, publicación automática, cambios de reglas/sistemas y cifrado local con contraseña nueva.

## Tres niveles de estado

1. **Borrador en memoria:** documento editado y estado de trabajo. Separar contenido persistible de cámara/selección/herramientas y objetos Pixi.
2. **Respaldo local:** IndexedDB del origen, por cuenta/partida/escena. Conserva únicamente la última copia, reemplazada transaccionalmente. No usar localStorage ni serializar en cada frame; una transacción termina antes de mostrar éxito.
3. **Borrador en servidor:** recurso privado separado de la escena confirmada, con una única copia por cuenta/partida/escena. SQLite y PostgreSQL ofrecen el mismo contrato. «Guardar escena» confirma explícitamente una generación; autoguardar nunca modifica la escena canónica ni sus asociaciones/publicación.

La UI muestra por separado «Respaldado en este dispositivo», «Borrador sincronizado», «Escena guardada», fechas de confirmación y errores. Un ACK de una generación vieja no marca como guardados cambios posteriores.

### Frecuencias y límites de trabajo

| Destino | Disparo por cambios | Espera máxima durante edición continua |
| --- | --- | --- |
| Local | 1 s sin cambios persistibles | 5 s desde el primer cambio pendiente |
| Servidor | 5 s sin cambios de contenido | 30 s desde el primer cambio pendiente |
| Guardar manualmente | Inmediato; espera confirmación durable | Sin debounce |

Los máximos son objetivos de inicio de intento con ejecución disponible, red/autoridad válidas y sin operación pendiente; no garantías durante bloqueo del navegador, cierre brusco o backoff. Sin cambios no hay escrituras periódicas. Los movimientos de cámara se respaldan localmente y se adjuntan al próximo guardado remoto de contenido; no disparan por sí solos autoguardados de escena.

Una operación en curso y una única candidata más reciente por destino; no colas de documentos completos. Reutilizar snapshots inmutables, calcular hashes/validación sin recorrer todo el documento durante cada render y deduplicar contenido idéntico. Crear/eliminar figuras inicia un intento local sin esperar el debounce; también se protege el lienzo sin mapas. Salir del editor termina el intento local antes de descartar el coordinador. Visibility/pagehide solicita un último intento local; el cierre forzado puede impedirlo, por lo que la protección proviene del guardado periódico previo.

Red/5xx: reintentos con espera 1/2/4/8/16/30 s y variación acotada; 429 respeta Retry-After; 401 pausa y solicita acceso. 403/404/409/413/422 requieren una decisión o corrección, sin bucle. Respaldo local y remoto informan sus fallos por separado.

## Documento de recuperación

Sobre versionado independiente de `.ttrpgscene`, con:

- `localDraftId`, `draftId` remoto nullable hasta crearlo, `writerId`, `parentDraftId` opcional, `schemaVersion`, `contentSequence`, hash del contenido y fechas; fechas de servidor como referencia entre dispositivos.
- Cuenta propietaria y origen/instancia del servicio, partida, referencia exacta de sistema/hash, escena de origen nullable, revisión base de esa escena y bindings retenidos.
- Documento normalizado mediante las reglas de escena, incluyendo mapas, objetos, notas y fichas incorporadas. El borrador admite el estado inicial sin mapas. Al confirmar ese lienzo, el servicio crea un mapa sin imagen y conserva todos sus objetos; el archivo sigue cumpliendo el formato de escena v2.
- Estado de trabajo permitido: mapa activo, cámara DM, selección todavía válida y disposición de paneles. No restaurar gestos en curso, diálogos, autoridad, apertura ni modo de publicación.
- Dependencias efectivas con identidad/revisión cuando sean necesarias; no la caché completa de recursos consultados. Una ficha incorporada como copia no se convierte en dependencia viva por haber sido buscada.
- Confirmación local/remota, revisión del borrador remoto, operación pendiente inmutable y última generación confirmada como escena.

Se guardan referencias `asset:` y referencias de entidades, nunca bytes/base64 de imágenes, URLs temporales, texturas, WebGL, eventos de red o credenciales. Los assets se resuelven de nuevo tras autorizar. Una referencia rota muestra recuperación parcial y reemplazo; no se borra el documento.

## Recuperación y conflictos

1. Al acceder como el propietario y abrir el editor, consultar IndexedDB sin esperar capacidades ni listados remotos. Si hay una copia local, abrir «¿Cómo quieres continuar?» con la más reciente preseleccionada y su fecha. Las copias de otras escenas permanecen accesibles en «Más opciones»; una misma escena no acumula ramas ni generaciones.
2. Ofrecer dos acciones principales: **Recuperar estado local** (figuras, mapa, notas, fichas y vista de la copia local) y **Cargar mapa nuevamente** (escena confirmada en servidor). Si todavía no existe una escena asociada o fue eliminada, la segunda abre el selector de escenas. Cancelarlo vuelve a la recuperación.
3. Cargar una escena no elimina el respaldo local. Más opciones agrupa copias de otras escenas, exportación y desactivación explícita. Los borradores remotos permanecen en el archivo de partidas y el autoguardado remoto sigue independiente. No exigir elegir origen/UUID/generación para la recuperación habitual.
4. Con misma revisión base y sistema compatible, continuar el contenido local. Reautenticar no convierte una respuesta de la sesión anterior en válida. La apertura y la publicación siguen siendo explícitas e independientes del borrador.
5. Si cambió o desapareció la escena base, «Recuperar estado local» carga una copia independiente; el diálogo avisa de esa política. Se conserva el respaldo original. No sobrescribir el original, actualizar silenciosamente `If-Match` ni fusionar por «último gana». Guardar la copia genera un recurso nuevo con validaciones existentes y referencias de enlaces revisadas; no modifica los enlaces recíprocos de la original.
6. Cambios en bibliotecas no usadas no bloquean. Referencias necesarias eliminadas o sistema incompatible se identifican: vista protegida/exportación del contenido recuperable y reparación explícita, sin publicar ni eludir bindings. Sistema deshabilitado conserva reglas de instancias existentes; no habilita crear una copia prohibida.
7. Si la partida ya no existe o está archivada, conservar local y permitir inspección/exportación autorizada del contenido propio o recuperación a otra partida compatible mediante acción explícita; no reactivar la partida ni reutilizar una apertura anterior.

El diálogo de recuperación no mantiene un canvas por alternativa ni renders periódicos. El resumen textual se carga antes que imágenes/Pixi. Teclado/Escape/foco y ancho de 390 px conservan acceso a decisiones; cerrar el diálogo no implica descartar. Indicador de guardado compacto en cabecera, detalle bajo demanda; sin flotantes sobre el mapa.

## Varias pestañas, revisión e idempotencia

Cada carga genera un `writerId` nuevo, pero reutiliza el respaldo de la misma cuenta/partida/escena. No crea una rama derivada. La revisión CAS y la secuencia monotónica evitan sobrescribir desde una cabeza desactualizada; el cliente conserva el error de conflicto y permite recuperar/exportar. En IndexedDB se reemplaza el índice previo del mismo ámbito en una transacción y se rechazan escrituras con fecha anterior. BroadcastChannel no autoriza escrituras.

Cada respaldo remoto tiene revisión y secuencia monotónicas. El cliente persiste la petición incierta exacta antes de enviarla: identidad, secuencia, hash, revisión esperada y contenido. Repetir el mismo último envío devuelve su ACK sin nueva versión. Misma secuencia con contenido distinto se rechaza. Un envío antiguo nunca desplaza el nuevo; si no puede repetirse su ACK exacto se responde conflicto verificable y el cliente consulta la cabeza antes de actuar. Solo se acumula el último estado pendiente, y no se envía hasta resolver el resultado del anterior.

El autoguardado usa recibo acotado por rama, no una fila de `owned_operations` por pulsación/guardado. Crear rama, confirmar escena y descartar sí reutilizan operaciones transaccionales idempotentes de baja frecuencia. La confirmación incluye revisión esperada de escena y de borrador; documento/bindings, nueva revisión y referencia al checkpoint se confirman atómicamente. Una edición durante el request continúa pendiente después del ACK. Recuperar un request incierto nunca repite una confirmación como creación nueva.

## Privacidad, retención y presupuesto

- Solo el DM propietario accede a índices, cuerpos, confirmación y eliminación; otro DM recibe 404, invitados y rol admin no acceden al contenido. Revalidar identidad/propiedad al commit; no confiar en owner/writer enviados por el cliente.
- El borrador no depende de la duración de la apertura. Caducidad/cierre/expulsión de jugadores no lo elimina. Deshabilitar la cuenta bloquea acceso/sincronización; no hay promesa de borrado remoto de datos ya presentes en un dispositivo.
- Respaldo local activo por defecto para el DM, con aviso visible de que este dispositivo conserva contenido privado y opción de desactivarlo/eliminarlo. Restaurar requiere la misma cuenta autenticada. La separación por cuenta en UI no cifra datos frente a quien controla ese perfil del navegador; no presentar ese aislamiento como protección criptográfica.
- Logout explícito pide resolver trabajo pendiente; después elimina copias locales de esa cuenta, conservando remotas confirmadas. Caducidad y cierre accidental no equivalen a logout ni borrado. Cambio de cuenta oculta la anterior y exige decisión para el borrador abierto; ninguna operación pendiente se envía con la cuenta nueva.
- Presupuestos iniciales propuestos: sobre completo ≤10 MiB UTF-8, una copia por escena, 50 MiB de contenido local por origen, 20 ramas pendientes y 256 MiB remotos por cuenta (incluyendo copias confirmadas). Cuotas se cuentan transaccionalmente en bytes; metadatos/recibos también tienen límite. El almacenamiento físico del navegador puede rechazar antes por su propia cuota.
- Reemplazar la copia de la misma escena al completar la nueva escritura; nunca borrar antes de guardar. Al consolidar datos históricos se conserva el respaldo con contenido más reciente; una reserva vacía no lo desplaza. No purgar copias de otras escenas para liberar espacio. Al alcanzar cuota, avisar, conservar memoria/última copia y permitir exportar o descartar ramas explícitamente. No hay caducidad temporal automática de borradores activos.
- Corrupción/incompatibilidad de sobre: conservarlo sin renderizar, ofrecer generación válida anterior o exportación del sobre original; no sobrescribir automáticamente la evidencia. Una actualización de esquema local usa migración transaccional sin reset.

## Compatibilidad y operación

La API añade recursos de borrador con negociación de capacidad. Cliente contra servidor anterior mantiene respaldo local, muestra «Autoguardado remoto no disponible» y conserva Guardar manualmente; no repite solicitudes 404. Clientes anteriores no ven ni sobrescriben borradores nuevos.

Migración incremental portable SQLite/PostgreSQL, sin editar checksums previos. El respaldo integral de base incluye borradores. El paquete funcional operativo y `.ttrpgscene` conservan formato y exclusiones: no incluyen automáticamente borradores/cuentas/credenciales; el operador recibe aviso al transferir un almacén con borradores. Exportar un borrador como escena usa validación vigente; un sobre incompleto se descarga como recuperación, no como `.ttrpgscene` válido.

En Electron servicio se conserva solo el almacenamiento de recuperación requerido entre ejecuciones, aislado por origen. Limpiar cookies y cualquier almacenamiento de autenticación antes de navegar al servicio tras arranque limpio o crash; conservar IndexedDB de borradores. No preload, Node ni IPC genérico en la ventana remota. Fallo de limpieza bloquea la carga autenticable. No se adopta información del perfil Electron autónomo.

## Criterios de aceptación

| ID | Condición observable | Verificación |
| --- | --- | --- |
| CA-01 | Cambios generan respaldo local a 1 s/máximo 5 s; no cambios/cámara sola no disparan guardados remotos; no cola creciente | Reloj simulado, contador de escrituras y candidatas |
| CA-02 | Borrador remoto a 5 s/máximo 30 s; nunca altera escena guardada, asociaciones ni publicación | Integración HTTP y revisión canónica estable |
| CA-03 | Recarga y cierre/crash recuperan el último ACK local válido con notas, mapas, fichas y cámara; escenas nuevas también | Navegador real, fixtures pequeñas y cercanas a 10 MiB |
| CA-04 | Caducar pausa API y lienzo; reautenticar misma cuenta recupera memoria/local sin perder cambios; otra cuenta no accede | Expiración/401 real, carreras y cambio de cuenta |
| CA-05 | Conflicto identifica recurso; cambiar ficha no usada no bloquea; recuperar copia no modifica original ni reciprocidad | Pruebas de dependencias, enlaces y dos revisiones |
| CA-06 | Dos pestañas/dispositivos reutilizan el respaldo; reintentos perdidos y mensajes atrasados no pisan versiones ni duplican confirmaciones | Concurrencia SQLite/PostgreSQL y dos pestañas reales |
| CA-07 | Guardar confirma una generación y conserva dirty posterior; idempotencia sobrevive reinicio API | ACK perdido, edición durante envío y reinicio |
| CA-08 | Cuota/corrupción/almacenamiento denegado/429/red/5xx mantienen última copia y feedback; sin loops | Fallos inyectados y uso de almacenamiento real |
| CA-09 | Logout, revocación, admin/invitado/otro DM y cuerpos manipulados respetan propiedad y limpieza | Contratos de seguridad en ambos motores |
| CA-10 | Índices no descargan todos los cuerpos; una copia, cuotas y recibos acotados; ≥2000 autosaves sin agotar operaciones generales | Contrato de carga y recuento de filas/bytes |
| CA-11 | Reiniciar Electron servicio conserva borrador pero exige autenticación; no cambia Electron autónomo ni aislamiento | Humo nativo, crash simulado, origen distinto y fallo de limpieza |
| CA-12 | Servidor anterior permite respaldo local/guardado manual y comunica falta de capacidad una sola vez | Matriz cliente nuevo/antiguo y servidor nuevo/antiguo |
| CA-13 | Migrar dos veces, transacción fallida, reinicio y backup integral conservan datos; transferencia funcional comunica exclusión | SQLite/PostgreSQL TLS reales, restauración aislada |
| CA-14 | Estado de guardado corresponde a la generación confirmada; recuperación usable con teclado/390 px y sin render oculto repetido | React, navegación real y perfil de memoria |
| CA-15 | 20 ciclos de caducidad/conflicto/recuperación no acumulan canvas, listeners, colas ni memoria retenida creciente sin explicación | Perfil JS/GPU sobre escena representativa; registrar entorno y medidas |

## Decisiones y entrega

La solicitud acepta desarrollar la propuesta documental de respaldo local y remoto con las frecuencias anteriores. Cuotas, respaldo único por escena y partición persistente selectiva se concretan aquí como decisiones implementadas en rama; la corrección 3.22.1 prioriza la recuperación local sencilla. No se promete recuperar retroactivamente contenido ya descartado antes de existir un respaldo.

El [plan técnico](plan.md) divide construcción y pruebas. Las guías actuales siguen describiendo lo implementado hasta integrar esta spec. No hay bloqueos de producto para planificar; límites reales de navegador, partición Electron y migraciones se verifican en la primera etapa antes de habilitar la función.

## Corrección 3.22.2 — guardar y reabrir sin recuperación innecesaria

Guardar escena usa la captura actual completa del editor: objetos de todos los mapas, mapa activo, notas/fichas, configuración, cámara, paneles y selección válida. No toma un respaldo anterior de IndexedDB. Tras la confirmación del servidor, espera la actualización del índice local con la huella del documento realmente guardado; cambios posteriores al envío siguen pendientes.

Al entrar nuevamente en una partida, sin cambios locales pendientes, el editor consulta la última escena confirmada asociada a esa partida y carga su contenido del servidor automáticamente. No requiere cuerpos de IndexedDB para reconstruirla; funciona con IndexedDB vacío o no disponible. La consulta es privada y acotada por propietario/partida. Si no hay escena guardada, se abre el editor vacío.

La copia local más reciente solo activa «Recuperar estado local / Cargar mapa nuevamente» si contiene diferencias de documento no guardadas. La huella de comparación excluye cámara, paneles y selección: navegar no crea una recuperación pendiente. Los índices anteriores se concilian con la escena del servidor cuando no tienen la huella nueva. Las copias de otras escenas permanecen en Más opciones. Desde 3.27.0, cada escena solo conserva su última copia. Un error al verificar una copia no autoriza borrarla.

Criterios de regresión adicionales:

1. Dibujar, guardar, cerrar y reabrir carga exactamente las figuras guardadas sin diálogo de recuperación.
2. Después de guardar, dibujar una figura más y cerrar sí ofrece recuperarla; cargar el servidor conserva la versión anterior y deja la copia local disponible.
3. Vaciar IndexedDB después de guardar no impide reabrir la escena con su documento y vista guardados.
4. Dos guardados sucesivos actualizan el mismo recurso y conservan el último contenido.
5. Guardar un lienzo con figuras pero sin imagen crea un mapa vacío sin perder las figuras.
6. Un fallo de servidor o una edición durante el envío no se marca como confirmación de cambios que el servidor no recibió.

### Corrección de auditoría B05 — 2026-11-11

Una rama restaurada comienza con secuencia positiva incluso antes de editar: reabrir y guardar inmediatamente no puede enviar PUT cero. Una notificación sin cambio documental no marca la escena como pendiente de confirmar. Las copias 3.22.2 con envío pendiente de secuencia cero solo se recuperan si el resto del esquema es válido, la rama remota sigue vacía y coinciden los hashes de contenido actual y pendiente. Se descarta únicamente ese envío imposible; el registro original sigue exportable hasta sustituirlo por la recuperación válida. Los envíos inciertos válidos siguen conservando su cuerpo y clave.

## Corrección 2026-11-12 — cuotas al guardar y salir

Se detectaron 20 ramas remotas, de las cuales 7 estaban confirmadas, con una generación máxima de aproximadamente 90 KB. El conteo de todas las ramas impedía crear la siguiente y devolvía incorrectamente 413. No era un exceso de tamaño del documento.

- La cuota de 20 corresponde a ramas pendientes: vacías (`revision=0`) o con `sequence > confirmedSequence`. Confirmar la copia actual libera una plaza; la retención única de 3.27.0 sustituye el historial anterior.
- Volver a escribir una rama confirmada reserva una plaza pendiente bajo la misma transacción; nunca permite superar el límite mediante reapertura. Reintentos idempotentes no consumen otra plaza.
- Los cuerpos confirmados siguen contando en la cuota total de 256 MiB. Se conserva una copia por escena; no se purgan otras escenas ni se incrementa el límite HTTP de 10 MiB.
- Cuotas agotadas: HTTP 409 con `DRAFT_BRANCH_LIMIT` o `DRAFT_STORAGE_LIMIT` y mensaje específico. Un cuerpo realmente excesivo conserva 413 (`PAYLOAD_TOO_LARGE` o `RESULT_TOO_LARGE`). Los errores no declaran la escena guardada y conservan las copias previas.
- Guardar/salir/reabrir una escena de tamaño válido repetidamente debe funcionar tras más de 20 guardados, sin solicitar recuperación de cambios ya confirmados. Si existen 20 ramas realmente pendientes, el usuario debe confirmar o descartar una de ellas antes de crear otra; no se ofrece capacidad ilimitada.

### Retención única — 3.27.0 (2026-11-12)

- Clave lógica: cuenta + partida + escena; en IndexedDB también el origen. `sceneId=null` corresponde al lienzo sin guardar de esa partida. Cambiar de escena conserva una copia independiente de cada escena, sin crear escenas guardadas nuevas automáticamente.
- Abrir/recuperar reutiliza el ID remoto y continúa su secuencia; contenido idéntico no genera PUT. La revisión técnica puede avanzar, pero solo queda un cuerpo recuperable.
- Listar o crear respaldos consolida el historial remoto del propietario dentro de la transacción autorizada. Verifica esquema y hash del superviviente; ante corrupción revierte. Listar IndexedDB consolida índices/generaciones del ámbito solicitado.
- Guardar escena mantiene su documento canónico separado; el aviso local solo corresponde a cambios sin confirmar. No hay selector de versiones anteriores.
- Una confirmación incierta de una edición antigua no puede reconocerse con la cabeza de otra edición: se exige el recibo exacto o coincidencia de secuencia y hash.
- Aceptación: 23 ciclos guardar/salir/reabrir de la misma escena dejan una escena guardada, un respaldo remoto con una versión y un índice local. Una escritura CAS atrasada se rechaza sin modificar el último estado.
