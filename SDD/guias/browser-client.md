# Cliente de cuentas, partidas e invitados

El frontend de servicio se compila con `pnpm build:web` y lo sirve la API del mismo origen. El navegador es el único cliente de producto desde SDD62; conserva las pantallas y contratos del servicio. Node24 y pnpm son necesarios para construir/operar, no para el navegador.

## Acceso y cuentas

El administrador proporciona cuentas DM. Accede con correo y contraseña; no hay selector de rol, autorregistro ni recuperación por correo. Una contraseña temporal obliga a cambiarla antes de cargar datos privados. Cambiar contraseña revoca las sesiones. Las cuentas administradoras tienen pantallas de cuentas/sistemas; no pueden abrir recursos DM.

La pantalla de acceso permite pegar una invitación del mismo origen. El secreto del fragmento se retira de la barra y permanece únicamente en memoria hasta consumir/cancelar. La ruta `/jugar/:gameId` consulta primero la cookie de esa partida: recargar conserva participante/alias/discriminador. Si ya no hay acceso, solicita una invitación vigente. Los alias no son identidades verificadas.

No se guardan claves, tokens, invitaciones ni borradores privados en localStorage/sessionStorage. La cookie de cuenta y las cookies invitadas por partida son independientes. Salir como jugador no cierra la cuenta DM, y viceversa.

## Partidas y catálogo

El DM selecciona explícitamente sistema y versión al crear. La referencia es inmutable. Los nombres repetidos conservan IDs distintos. Archivar/borrar termina el acceso de la partida y conserva recursos reutilizables. Restaurar no abre la partida. Una versión deshabilitada impide usos nuevos, pero se conserva en partidas y fichas existentes.

El administrador crea sistemas y borradores, edita las presentaciones Markdown/CSS con los campos compartidos del gestor local, previsualiza, publica versiones y cambia disponibilidad. Las publicaciones conservan hash/contenido; para cambiarlas crea otra versión. No existe borrado de sistema/versión/plantilla. Los DMs leen las presentaciones exactas y no disponen de gestión editable de plantillas. La administración editable de sistemas/plantillas permanece en el área de administrador del servicio.

## Trabajar y compartir

1. Entra por campaña → arco → escena para abrir el editor directamente. Se conserva una apertura vigente; recuperar una apertura caducada mantiene las guardas y decisiones del servicio.
2. Agrega un mapa y guarda la escena dentro de su arco. Guardar y publicar son acciones distintas.
3. La escena pertenece a un único arco de la campaña; no existe asociación de la misma escena a varios arcos. La preparación de NPCs/monstruos se copia desde el arco y conserva sistema/version/bindings compatibles.
4. Publica la escena desde las herramientas habituales del VTT. Tras reiniciar la API debes publicarla otra vez; no se reproducen tiradas antiguas.
5. Abre Mesa y copia el enlace disponible. Si no lo conservas, **Crear enlace nuevo** solicita confirmación: el anterior deja de admitir, los invitados presentes continúan. Una copia denegada permite seleccionar el campo y usar Cmd/Ctrl+C.
6. El panel muestra alias, discriminador y presencia. Expulsar confirma el participante exacto, revoca sus accesos y cambia la invitación, sin desmontar la vista de los sobrevivientes.

El secreto solo se entrega una vez. GET/replay no lo recupera. Una respuesta incierta conserva clave/payload/precondiciones para el reintento; una rotación nueva debe ser deliberada. No se promete retirar bytes ya descargados ni impedir que una persona reingrese con otra invitación.

## Borradores y conexión

Antes de cambiar escena/partida, cerrar/reabrir o salir con cambios, el editor permite Guardar/Descartar/Cancelar. Guardar espera confirmación del servicio. Si expira la cuenta, el mapa y sus portales se ocultan e inhabilitan. El borrador queda en memoria para el ID original; otro ID requiere descartarlo explícitamente. Recuperar verifica revisiones: un conflicto conserva el borrador y exige resolución. Desde la corrección 3.21.1, el lienzo gráfico se libera mientras el acceso está suspendido o se revalida; el documento y la cámara permanecen en memoria. Descartar desde el conflicto desmonta el editor y consulta el contexto actual antes de permitir continuar, sin recarga completa de la página. No hay sondeo periódico en un conflicto sin reintento.

Al perder la sesión se cierran las confirmaciones de cierre, reapertura, enlace y expulsión, los selectores de guardado y el diálogo de revalidación. El foco pasa al correo de recuperación. Al volver con la misma cuenta se conserva el borrador, pero cualquier acción pendiente exige una nueva decisión; las respuestas de la sesión suspendida no restauran confirmaciones ni enlaces.

Cerrar o reabrir la propia partida reconcilia la respuesta del servicio con los avisos de fin de su apertura. Un aviso de la apertura anterior no congela la nueva. Tras cerrar se consulta el estado vigente antes de mostrar la siguiente acción; la comprobación de cuenta sigue activa durante la transición.

Un corte de red muestra reconexión y mantiene incertidumbre. Los terminales retiran la proyección y sus efectos. «Esta partida está abierta en otra pestaña» permite retomar explícitamente; el mensaje genérico de fin no inventa una causa de expulsión. Los límites429 requieren esperar; no garantizan stream por cada admisión.

Recargar/cerrar puede perder cambios que todavía no hayan quedado respaldados. Se conservan las guardas de navegación del servicio y la recuperación IndexedDB/remota; no hay confirmación ni guardado de un contenedor nativo.

### Cuenta esperada y recuperación (011, revisión 1)

Cada transporte privado conserva el ID de cuenta que creó su contexto y envía
`X-TTRPG-Account` en lecturas, mutaciones y streams. El listener final propaga
esa precondición por petición hasta la validación de identidad dentro de la
transacción. Una cookie de otra cuenta produce 401 antes de escribir, aunque
una consulta de sesión anterior haya sido válida. La cabecera no concede
permisos; se compara con la identidad autenticada por cookie. Los clientes
HTTP existentes sin la cabecera conservan su autorización normal por cookie.

Los cambios reales de cuenta y logout avisan a otras pestañas mediante
BroadcastChannel sin transmitir credenciales ni borradores; foco/visibilidad
vuelven a comprobar la sesión. Una nueva sesión del mismo ID no invalida otra
pestaña por sí sola. Estas señales aceleran la ocultación y no sustituyen la
precondición del servidor. Reautenticar otra cuenta requiere descartar el
borrador anterior antes de crear sus transportes.

Los 401 de administración y cambio de contraseña cierran el guard privado;
solo acceso, consulta inicial de sesión y salida tienen las excepciones
necesarias para recuperar credenciales. Entrar como invitado o usar Atrás
con un borrador retenido exige descarte explícito o cancelación. Atrás y
Adelante conservan las entradas del historial. Un fallo temporal de
revalidación mantiene el editor montado y permite reintentar, respetando
Retry-After; un conflicto de revisión confirmado se presenta por separado.

## Cabecera compartida (3.18.1)

Servicio y editor comparten una sola fila de 44 px, sin logo duplicado. Bajo 1100 px las herramientas se agrupan en desplegable; Escape devuelve foco y salir con foco/puntero lo cierra. Los controles del editor se ocultan e inhabilitan al suspender autoridad. La cabecera del editor es la variante web única desde SDD62. Contrato y límites de evidencia en [SDD 54](../specs/54-cabecera-unificada/spec.md).

## Dibujos compartidos — SDD 55 / 3.19.1

El puerto opcional `TtrpgClient.annotations` conecta mediciones/áreas de jugadores a una capa efímera del servicio. El servidor deriva autoría y medidas, limita edición al propietario y permite retirada/limpieza DM. Las herramientas locales del navegador permanecen separadas de las anotaciones compartidas. El overlay no entra en guardados ni exportaciones.

Negociación, comandos, límites y ciclo de vida se documentan una sola vez en [mesa sincronizada](synchronized-table.md#dibujos-compartidos--sdd-55--3190). Véanse también el [contrato SDD 55](../specs/55-mediciones-compartidas/spec.md) y su [validación y gates pendientes](../specs/55-mediciones-compartidas/validacion.md).

## Recuperación y guardado desde 3.22.0

En el editor, el indicador de respaldo local muestra «Guardando en este dispositivo» y «Guardado en este dispositivo». Más opciones muestra además sincronización remota y confirmación de escena. El dispositivo usa IndexedDB: tras 1 s sin editar, con un máximo de 5 s durante edición continua. El servidor guarda un borrador privado tras 5 s sin editar, máximo 30 s. No son intervalos fijos: sin cambios no hay envíos, y mover la cámara solo actualiza respaldo local. «Guardar escena» confirma explícitamente la versión que se usa desde la biblioteca. La publicación a jugadores continúa siendo independiente.

Al entrar al editor de una escena, si la copia local contiene cambios pendientes se ofrece recuperar ese trabajo o cargar la escena confirmada. Si no hay cambios pendientes, se carga la versión del servidor. Cámara, zoom, paneles y selección no provocan por sí solos el aviso. La recuperación conserva la escena/arco elegidos y permite restaurar figuras sin mapa. Si la revisión guardada cambió, se protege el trabajo recuperando una copia independiente con enlaces recíprocos desconectados, conforme al contrato de borradores.

Crear o eliminar figuras inicia la escritura local inmediatamente; el resto de ediciones mantiene 1 s/máximo 5 s. Espera a que el indicador diga «Guardado en este dispositivo» antes de cerrar: un cierre forzado puede interrumpir una transacción pendiente. Cerrar la pestaña conserva IndexedDB; cerrar sesión explícitamente mantiene su política de eliminar las copias de esa cuenta.

El listado administrativo no ofrece un archivo global de recuperación; el aviso es contextual al abrir la escena con trabajo pendiente. Desde 3.27.0, una sola copia por cuenta/partida/escena, 20 escenas con respaldo remoto pendiente y 256 MiB por cuenta (incluyendo copias confirmadas); límite local 50 MiB por origen y sobre 10 MiB. Al agotarse espacio, exporta o descarta explícitamente una rama: no se borran otras escenas para hacer sitio. Los cambios reemplazan la copia anterior y reabrir reutiliza el mismo respaldo.

El aviso del editor explica que IndexedDB contiene datos privados sin cifrado específico de la app. Puedes desactivar/eliminar el respaldo local. Caducar la cuenta conserva respaldos; cerrar sesión explícitamente elimina los locales de esa cuenta e invalida escritores antiguos. Los borradores remotos permanecen privados. Desde SDD62 no existe un contenedor desktop: IndexedDB pertenece al origen del navegador y conserva las reglas de aislamiento/limpieza de cuenta del servicio.


## Dados de jugadores — SDD 61

Desde la entrega local 3.32.0, el puerto opcional `TtrpgClient.serviceDice` conecta el compositor compartido del DM y del jugador con el protocolo C-61. El jugador dispone de Mesa/Dados en su panel; todas sus tiradas son públicas. Autor y DM pueden cerrar la tirada en pantalla, y el historial conserva los resultados después del cierre. Tamaño y sonido son preferencias de cada vista. La UI utiliza el puerto de dados del servicio; no existe fallback a una sesión autónoma.

La negociación, autoridad, idempotencia, cuotas y ciclo de vida están en [mesa sincronizada](synchronized-table.md#dados-de-jugadores--sdd-61); el estado real de validación se registra en [SDD 61](../specs/61-dados-jugadores/validacion.md).
