# 58 — Borradores recuperables y autoguardado del servicio

**Estado:** Implementada en rama; aceptación de rendimiento nativo pendiente. **Fecha:** 2026-11-05. **Tipo:** funcionalidad.
**Solicitud:** «Dale construye el spec y el plan de implementación que propones». La orden posterior «implementa» autoriza construir esta spec; no commits, merge ni push.
**Base:** main `32bda9f` (3.21.0) y corrección local 3.21.1 de recuperación de sesión, todavía sin integrar. Rama documental: `feature/sdd-recuperacion-borradores`.
**Dependencias:** [03 Persistencia](../03-scene-persistence/spec.md), [43 Navegador](../43-cliente-navegador/spec.md), [45 Electron servicio](../45-electron-servicio/spec.md), [46 Multi-DB](../46-persistencia-multidb/spec.md), [47 Identidad](../47-identidad-dm/spec.md), [48 Propiedad y sistemas](../48-partidas-sistemas/spec.md), [51 Experiencia de servicio](../51-experiencia-servicio/spec.md), [55 Dibujos compartidos](../55-mediciones-compartidas/spec.md).
**Trabajo factory:** sin asignar. **Versión en rama:** 3.22.1, fuente única `package.json`. [Validación y límites](validacion.md).

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
2. **Respaldo local:** IndexedDB del origen, por cuenta/partida/documento/rama de edición. Conserva hasta tres generaciones completas verificadas. No usar localStorage ni serializar en cada frame; una transacción termina antes de mostrar éxito.
3. **Borrador en servidor:** recurso privado separado de la escena confirmada, con hasta tres generaciones. SQLite y PostgreSQL ofrecen el mismo contrato. «Guardar escena» confirma explícitamente una generación; autoguardar nunca modifica la escena canónica ni sus asociaciones/publicación.

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
- Documento normalizado mediante las reglas de escena, incluyendo mapas, objetos, notas y fichas incorporadas. Un adaptador de borrador admite el estado inicial sin mapas sin relajar el validador de escena confirmada.
- Estado de trabajo permitido: mapa activo, cámara DM, selección todavía válida y disposición de paneles. No restaurar gestos en curso, diálogos, autoridad, apertura ni modo de publicación.
- Dependencias efectivas con identidad/revisión cuando sean necesarias; no la caché completa de recursos consultados. Una ficha incorporada como copia no se convierte en dependencia viva por haber sido buscada.
- Confirmación local/remota, revisión del borrador remoto, operación pendiente inmutable y última generación confirmada como escena.

Se guardan referencias `asset:` y referencias de entidades, nunca bytes/base64 de imágenes, URLs temporales, texturas, WebGL, eventos de red o credenciales. Los assets se resuelven de nuevo tras autorizar. Una referencia rota muestra recuperación parcial y reemplazo; no se borra el documento.

## Recuperación y conflictos

1. Al acceder como el propietario y abrir el editor, consultar IndexedDB sin esperar capacidades ni listados remotos. Si hay una copia local, abrir «¿Cómo quieres continuar?» con la más reciente preseleccionada y su fecha. Las otras ramas permanecen accesibles en «Más opciones»; no se fusionan ni eliminan por orden de fecha.
2. Ofrecer dos acciones principales: **Recuperar estado local** (figuras, mapa, notas, fichas y vista de la copia local) y **Cargar mapa nuevamente** (escena confirmada en servidor). Si todavía no existe una escena asociada o fue eliminada, la segunda abre el selector de escenas. Cancelarlo vuelve a la recuperación.
3. Cargar una escena no elimina el respaldo local. Más opciones agrupa otras copias, generaciones anteriores, exportación y desactivación explícita. Los borradores remotos permanecen en el archivo de partidas y el autoguardado remoto sigue independiente. No exigir elegir origen/UUID/generación para la recuperación habitual.
4. Con misma revisión base y sistema compatible, continuar el contenido local. Reautenticar no convierte una respuesta de la sesión anterior en válida. La apertura y la publicación siguen siendo explícitas e independientes del borrador.
5. Si cambió o desapareció la escena base, «Recuperar estado local» carga una copia independiente; el diálogo avisa de esa política. Se conserva el respaldo original. No sobrescribir el original, actualizar silenciosamente `If-Match` ni fusionar por «último gana». Guardar la copia genera un recurso nuevo con validaciones existentes y referencias de enlaces revisadas; no modifica los enlaces recíprocos de la original.
6. Cambios en bibliotecas no usadas no bloquean. Referencias necesarias eliminadas o sistema incompatible se identifican: vista protegida/exportación del contenido recuperable y reparación explícita, sin publicar ni eludir bindings. Sistema deshabilitado conserva reglas de instancias existentes; no habilita crear una copia prohibida.
7. Si la partida ya no existe o está archivada, conservar local y permitir inspección/exportación autorizada del contenido propio o recuperación a otra partida compatible mediante acción explícita; no reactivar la partida ni reutilizar una apertura anterior.

El diálogo de recuperación no mantiene un canvas por alternativa ni renders periódicos. El resumen textual se carga antes que imágenes/Pixi. Teclado/Escape/foco y ancho de 390 px conservan acceso a decisiones; cerrar el diálogo no implica descartar. Indicador de guardado compacto en cabecera, detalle bajo demanda; sin flotantes sobre el mapa.

## Varias pestañas, revisión e idempotencia

Cada carga de editor genera un `writerId` nuevo; una reautenticación dentro de ese editor lo conserva. Una pestaña duplicada no hereda permiso de escritura sobre la rama original. Recuperar desde otra pestaña/dispositivo crea una rama derivada cuando se edite; no copia cuerpos automáticamente en cada recarga ni roba la rama activa. BroadcastChannel puede avisar, nunca autorizar o arbitrar escrituras.

Cada rama remota tiene revisión y secuencia monotónicas. El cliente persiste la petición incierta exacta antes de enviarla: identidad, secuencia, hash, revisión esperada y contenido. Repetir el mismo último envío devuelve su ACK sin nueva versión. Misma secuencia con contenido distinto se rechaza. Un envío antiguo nunca desplaza el nuevo; si no puede repetirse su ACK exacto se responde conflicto verificable y el cliente consulta la cabeza antes de actuar. Solo se acumula el último estado pendiente, y no se envía hasta resolver el resultado del anterior.

El autoguardado usa recibo acotado por rama, no una fila de `owned_operations` por pulsación/guardado. Crear rama, confirmar escena y descartar sí reutilizan operaciones transaccionales idempotentes de baja frecuencia. La confirmación incluye revisión esperada de escena y de borrador; documento/bindings, nueva revisión y referencia al checkpoint se confirman atómicamente. Una edición durante el request continúa pendiente después del ACK. Recuperar un request incierto nunca repite una confirmación como creación nueva.

## Privacidad, retención y presupuesto

- Solo el DM propietario accede a índices, cuerpos, confirmación y eliminación; otro DM recibe 404, invitados y rol admin no acceden al contenido. Revalidar identidad/propiedad al commit; no confiar en owner/writer enviados por el cliente.
- El borrador no depende de la duración de la apertura. Caducidad/cierre/expulsión de jugadores no lo elimina. Deshabilitar la cuenta bloquea acceso/sincronización; no hay promesa de borrado remoto de datos ya presentes en un dispositivo.
- Respaldo local activo por defecto para el DM, con aviso visible de que este dispositivo conserva contenido privado y opción de desactivarlo/eliminarlo. Restaurar requiere la misma cuenta autenticada. La separación por cuenta en UI no cifra datos frente a quien controla ese perfil del navegador; no presentar ese aislamiento como protección criptográfica.
- Logout explícito pide resolver trabajo pendiente; después elimina copias locales de esa cuenta, conservando remotas confirmadas. Caducidad y cierre accidental no equivalen a logout ni borrado. Cambio de cuenta oculta la anterior y exige decisión para el borrador abierto; ninguna operación pendiente se envía con la cuenta nueva.
- Presupuestos iniciales propuestos: sobre completo ≤10 MiB UTF-8, tres generaciones por rama, 50 MiB de contenido local por origen, 20 ramas y 256 MiB remotos por cuenta. Cuotas se cuentan transaccionalmente en bytes; metadatos/recibos también tienen límite. El almacenamiento físico del navegador puede rechazar antes por su propia cuota.
- Rotar únicamente generaciones antiguas de la misma rama tras confirmar la escritura nueva; nunca borrar la última copia válida para liberar espacio. No purgar otras ramas con cambios pendientes automáticamente. Al alcanzar cuota, avisar, conservar memoria/última copia y permitir exportar o descartar ramas explícitamente. No hay caducidad temporal automática de borradores activos.
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
| CA-06 | Dos pestañas/dispositivos conservan ramas; reintentos perdidos y mensajes atrasados no pisan versiones ni duplican confirmaciones | Concurrencia SQLite/PostgreSQL y dos pestañas reales |
| CA-07 | Guardar confirma una generación y conserva dirty posterior; idempotencia sobrevive reinicio API | ACK perdido, edición durante envío y reinicio |
| CA-08 | Cuota/corrupción/almacenamiento denegado/429/red/5xx mantienen última copia y feedback; sin loops | Fallos inyectados y uso de almacenamiento real |
| CA-09 | Logout, revocación, admin/invitado/otro DM y cuerpos manipulados respetan propiedad y limpieza | Contratos de seguridad en ambos motores |
| CA-10 | Índices no descargan todos los cuerpos; tres versiones, cuotas y recibos acotados; ≥2000 autosaves sin agotar operaciones generales | Contrato de carga y recuento de filas/bytes |
| CA-11 | Reiniciar Electron servicio conserva borrador pero exige autenticación; no cambia Electron autónomo ni aislamiento | Humo nativo, crash simulado, origen distinto y fallo de limpieza |
| CA-12 | Servidor anterior permite respaldo local/guardado manual y comunica falta de capacidad una sola vez | Matriz cliente nuevo/antiguo y servidor nuevo/antiguo |
| CA-13 | Migrar dos veces, transacción fallida, reinicio y backup integral conservan datos; transferencia funcional comunica exclusión | SQLite/PostgreSQL TLS reales, restauración aislada |
| CA-14 | Estado de guardado corresponde a la generación confirmada; recuperación usable con teclado/390 px y sin render oculto repetido | React, navegación real y perfil de memoria |
| CA-15 | 20 ciclos de caducidad/conflicto/recuperación no acumulan canvas, listeners, colas ni memoria retenida creciente sin explicación | Perfil JS/GPU sobre escena representativa; registrar entorno y medidas |

## Decisiones y entrega

La solicitud acepta desarrollar la propuesta documental de respaldo local y remoto con las frecuencias anteriores. Cuotas, ramificación por escritor y partición persistente selectiva se concretan aquí como decisiones implementadas en rama; la corrección 3.22.1 prioriza la recuperación local sencilla. No se promete recuperar retroactivamente contenido ya descartado antes de existir un respaldo.

El [plan técnico](plan.md) divide construcción y pruebas. Las guías actuales siguen describiendo lo implementado hasta integrar esta spec. No hay bloqueos de producto para planificar; límites reales de navegador, partición Electron y migraciones se verifican en la primera etapa antes de habilitar la función.
