# Cliente de cuentas, partidas e invitados

El frontend de servicio se compila con `pnpm build:web` y lo sirve la API del mismo origen. Navegador y Electron servicio utilizan las mismas pantallas y contratos. Node24 y pnpm son necesarios para construir/operar, no para el navegador.

## Acceso y cuentas

El administrador proporciona cuentas DM. Accede con correo y contraseña; no hay selector de rol, autorregistro ni recuperación por correo. Una contraseña temporal obliga a cambiarla antes de cargar datos privados. Cambiar contraseña revoca las sesiones. Las cuentas administradoras tienen pantallas de cuentas/sistemas; no pueden abrir recursos DM.

La pantalla de acceso permite pegar una invitación del mismo origen. El secreto del fragmento se retira de la barra y permanece únicamente en memoria hasta consumir/cancelar. La ruta `/jugar/:gameId` consulta primero la cookie de esa partida: recargar conserva participante/alias/discriminador. Si ya no hay acceso, solicita una invitación vigente. Los alias no son identidades verificadas.

No se guardan claves, tokens, invitaciones ni borradores privados en localStorage/sessionStorage. La cookie de cuenta y las cookies invitadas por partida son independientes. Salir como jugador no cierra la cuenta DM, y viceversa.

## Partidas y catálogo

El DM selecciona explícitamente sistema y versión al crear. La referencia es inmutable. Los nombres repetidos conservan IDs distintos. Archivar/borrar termina el acceso de la partida y conserva recursos reutilizables. Restaurar no abre la partida. Una versión deshabilitada impide usos nuevos, pero se conserva en partidas y fichas existentes.

El administrador crea sistemas y borradores, edita las presentaciones Markdown/CSS con los campos compartidos del gestor local, previsualiza, publica versiones y cambia disponibilidad. Las publicaciones conservan hash/contenido; para cambiarlas crea otra versión. No existe borrado de sistema/versión/plantilla. Los DMs leen las presentaciones exactas y no disponen de gestión editable de plantillas. Electron local conserva su gestor.

## Trabajar y compartir

1. Abre el editor de tu partida. **Iniciar partida** es explícito. **Continuar partida** conserva apertura/generación; no reabre al recargar.
2. Carga/importa un mapa y guarda la escena en tu biblioteca privada. Guardar y publicar son acciones distintas.
3. Si la escena contiene monstruos, usa **Asociar escena guardada a la partida** en Mesa antes de publicar. El servidor exige sistema/version/bindings compatibles y disponibilidad para vínculos nuevos.
4. Publica la escena desde las herramientas habituales del VTT. Tras reiniciar la API debes publicarla otra vez; no se reproducen tiradas antiguas.
5. Abre Mesa y copia el enlace disponible. Si no lo conservas, **Crear enlace nuevo** solicita confirmación: el anterior deja de admitir, los invitados presentes continúan. Una copia denegada permite seleccionar el campo y usar Cmd/Ctrl+C.
6. El panel muestra alias, discriminador y presencia. Expulsar confirma el participante exacto, revoca sus accesos y cambia la invitación, sin desmontar la vista de los sobrevivientes.

El secreto solo se entrega una vez. GET/replay no lo recupera. Una respuesta incierta conserva clave/payload/precondiciones para el reintento; una rotación nueva debe ser deliberada. No se promete retirar bytes ya descargados ni impedir que una persona reingrese con otra invitación.

## Borradores y conexión

Antes de cambiar escena/partida, cerrar/reabrir o salir con cambios, el editor permite Guardar/Descartar/Cancelar. Guardar espera confirmación del servicio. Si expira la cuenta, el mapa y sus portales se ocultan e inhabilitan. El borrador queda en memoria para el ID original; otro ID requiere descartarlo explícitamente. Recuperar verifica revisiones: un conflicto conserva el borrador y exige resolución.

Al perder la sesión se cierran las confirmaciones de cierre, reapertura, enlace y expulsión, los selectores de guardado y el diálogo de revalidación. El foco pasa al correo de recuperación. Al volver con la misma cuenta se conserva el borrador, pero cualquier acción pendiente exige una nueva decisión; las respuestas de la sesión suspendida no restauran confirmaciones ni enlaces.

Cerrar o reabrir la propia partida reconcilia la respuesta del servicio con los avisos de fin de su apertura. Un aviso de la apertura anterior no congela la nueva. Tras cerrar se consulta el estado vigente antes de mostrar la siguiente acción; la comprobación de cuenta sigue activa durante la transición.

Un corte de red muestra reconexión y mantiene incertidumbre. Los terminales retiran la proyección y sus efectos. «Esta partida está abierta en otra pestaña» permite retomar explícitamente; el mensaje genérico de fin no inventa una causa de expulsión. Los límites429 requieren esperar; no garantizan stream por cada admisión.

Recargar/cerrar puede perder cambios en memoria. Electron servicio presenta la confirmación nativa Seguir editando/Descartar y salir. El modo local continúa sin cuenta ni API.

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
