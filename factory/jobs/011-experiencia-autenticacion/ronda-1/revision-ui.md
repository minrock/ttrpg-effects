VEREDICTO: CAMBIOS

# Revisión UI — 011, ciclo 1 / ronda 1

Fecha: 2026-10-31. Revisor independiente UI. Checkout: `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Código congelado 3.13.0. Se leyeron el perfil `.codex/agents/ui.toml`, AGENTS, solicitud, especificación, build, coordinación, diff efectivo de ronda y huellas. Las 18 entradas de `src/web/` coinciden con `huellas.json` al comenzar y al publicar este informe.

## Alcance y evidencia propia

Inspección de fuentes de acceso/cambio de contraseña, cuentas, sistemas, catálogo, editor, invitado, participantes, diálogos y estilos, más los campos compartidos y gestor local de plantillas. Revisión visual propia mediante CUA en Chrome contra la API sintética SQLite `http://127.0.0.1:8891`, con cuentas de fixture. El servicio inicialmente rechazó conexión; el orquestador lo recuperó y las observaciones siguientes son posteriores a esa recuperación.

Capturas observadas en las herramientas de esta revisión, sin guardarlas en el repositorio ni capturar enlaces de invitación:

- **V1, 1024×768, 100 %:** acceso y catálogo DM; cuentas administrativas, catálogo de sistemas y borrador genérico v3. Dimensiones confirmadas por DOM. Controles y textos contrastan sobre fondo oscuro; estados publicada/borrador/deshabilitada están escritos, no dependen del color. Cuenta y acciones administrativas están separadas del mapa. El modal muestra etiquetas y campos únicos con marco de foco visible.
- **V2, 1024×768 con zoom nativo 200 %:** DOM efectivo 512×384 y DPR2. Captura nativa y geometría DOM del acceso confirman el recorte del hallazgo UI-011-1. Se probó rueda/desplazamiento y se midieron posiciones antes de concluir. El borrador de sistema, en cambio, mantiene un diálogo de 474×352 dentro del viewport; su contenido se desplaza, sin overflow horizontal del diálogo (clientWidth=scrollWidth=465). Shift+Tab desde el primer selector lleva a Guardar borrador.
- **V3, 1440×900, 100 %:** partida propia de QA con nombre largo, pantalla de inicio y editor real React/Pixi. Captura completa y geometría confirman UI-011-2. Las herramientas del mapa permanecen visibles y el panel de mesa empieza plegado.
- **V4, confirmación de expulsión:** invitado propio con alias Unicode largo «Álex de las Cumbres del Norte», discriminador #1. Se observó una captura recortada al diálogo, que muestra alias/número, partida, consecuencia y Cancelar/Confirmar expulsión. El nombre largo de partida sí se envuelve correctamente dentro de este diálogo. No se capturó el enlace vigente del panel situado detrás.
- **V5, jugador 1920×1080, 100 %:** tamaño confirmado por DOM, captura completa de espera de publicación y estado después de expulsar el invitado propio. Controles discretos, sin datos de cuenta DM; el terminal desmonta la vista y presenta el mensaje genérico de fin de acceso, alias conservado y campo vacío para otra invitación. No se publicó un mapa en esta partida de QA; esta evidencia no certifica una proyección de mapa.

Las capturas son evidencia observada directamente por este revisor; las comprobaciones DOM solo precisan tamaños, posiciones y foco, no sustituyen la inspección visual.

## Hallazgos que requieren corrección

### UI-011-1 · P2 · El acceso ampliado recorta acciones y no ofrece desplazamiento con rueda

**Archivos:** `src/web/service.css:3` (`.service-access`), en combinación con `src/renderer/src/styles.css:26` (`body { overflow: hidden; }`). Afecta el contenedor compartido de acceso, contraseña y entrada de invitado; la reproducción directa fue sobre acceso.

**Pasos:** abrir la raíz del servicio sin sesión; establecer viewport 1024×768; aumentar el zoom nativo de Chrome al 200 %; intentar llegar con rueda/desplazamiento al botón Acceder y a la entrada de invitación.

**Resultado observado:** viewport CSS 512×384, main de 601px de alto. Acceder ocupa y=386–430 y «Entrar con invitación de jugador» y=526–548, ambos fuera de la vista. El desplazamiento no cambia window.scrollY, body.scrollTop ni main.scrollTop (todos 0). La captura nativa muestra únicamente la parte superior del formulario hasta la contraseña, sin las acciones inferiores. No se afirma que el teclado sea incapaz de enfocar controles fuera de vista; el defecto es la falta de una superficie desplazable utilizable con puntero/rueda y la pérdida visual de las acciones.

**Impacto:** incumple la aceptación de formularios con zoom200% y scroll accesible. Una persona que amplía el texto no puede descubrir ni alcanzar normalmente las acciones inferiores con el puntero.

**Corrección esperada:** hacer desplazable el contenedor de acceso dentro del alto disponible, manteniendo márgenes y foco visibles. Verificar acceso normal/recuperado, cambio de contraseña y entrada/terminal de jugador a 1024×768 y 200 %, con rueda, teclado, errores visibles y sin quitar el zoom.

### UI-011-2 · P2 · Un nombre de partida válido desborda y se corta en la cabecera

**Archivos:** `src/web/service.css:47` (cabeceras flexibles sin ajuste del texto), `src/web/GameEditor.tsx:28` (título de partida en strong/cabecera) y título de la pantalla previa al inicio.

**Pasos:** como DM crear una partida genérica v1 con nombre compuesto por `QA UI ` seguido de `CampañaDeNombreExtenso` ocho veces (182 caracteres; menor al límite200). Abrir editor y luego Iniciar partida a1440×900.

**Resultado observado:** el strong de la cabecera tiene ancho1767.8px, va de x16 a1783.8 y body.scrollWidth=1784 frente a viewport1440. El nombre se pierde por la derecha en las pantallas de inicio y editor; la captura fullPage muestra contenido fuera del ancho disponible. La cabecera se distribuye en varias filas y el texto continuo no se parte. No es un rechazo de validación: el formulario y servidor aceptan ese nombre. El diálogo de expulsión muestra el mismo nombre envuelto correctamente, lo que confirma que el problema está en la presentación de la cabecera.

**Impacto:** incumple el requisito de nombres largos distinguibles; parte del identificador visible de la partida queda fuera de pantalla. Afecta también nombres sin espacios importados/copiados de identificadores, no requiere llegar al máximo permitido.

**Corrección esperada:** dar al título un ancho flexible acotado y permitir división de palabras o truncado con acceso al nombre completo, sin desbordamiento de página. Aplicar el mismo criterio al título previo al inicio. Repetir con nombres largos con/sin espacios en1024×768 y1440×900, comprobando que cuenta, sistema/versión y acciones siguen legibles.

## Límites y estado del entorno

No se realizaron suites intensivas, cambios de contraseña, pruebas PostgreSQL, inspección personal ni operaciones Git. No se usó API8787 ni se reinició8891 desde este rol. Electron servicio/local y mapa publicado cuentan con evidencia atribuida al orquestador en coordinación/build; no se presentan como inspección propia ni sustituyen el retest necesario tras corregir estos hallazgos. Tampoco se certifican proyector físico, otros sistemas operativos, lectores de pantalla ni todos los casos de red/concurrencia.

Se creó únicamente la partida sintética de nombre largo, se admitió/expulsó un invitado propio y se cerró su apertura; queda ese registro de QA en el fixture. No se modificó Campaña Aurora ni sus escenas. Zoom restablecido a100%, overrides retirados y las dos pestañas propias cerradas. Invitación y credenciales solo se mantuvieron en memoria para operar los formularios y no se incluyen en este informe.

La revisión requiere corregir UI-011-1 y UI-011-2 y repetir los escenarios visuales afectados antes de aprobar.
