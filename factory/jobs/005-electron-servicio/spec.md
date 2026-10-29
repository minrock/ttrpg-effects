# 005 — Electron como cliente del servicio y entrega operativa

## Estado, objetivo y autorización

Especificación propuesta, ciclo 1, 2026-10-28. No acredita implementación ni pruebas ejecutadas. Completar la migración privada con dos modos de arranque de Electron: local por defecto y cliente del mismo frontend web/API/SSE entregado por 001–004. Entregar una instancia autohospedable reproducible y comprobar la integración completa sin publicar ni empaquetar DMG.

Rigen [solicitud](solicitud.md), [migración](../../migracion-servicio.md) y [AGENTS.md](../../../AGENTS.md). Usar la rama existente `feature/fabrica-software`; conservar todos los cambios previos. No crear/cambiar ramas, staging, commits, push, merge, despliegue ni DMG. Cierre previsto: `3.6.0`, único bump minor desde la entrega anterior y entrada fechada de tipo feature en español en `CHANGELOG.md`. `package.json` sigue siendo la única fuente de versión.

**La construcción requiere aprobación técnica de 004 y orden de avance del orquestador.** Antes de implementarla, leer las specs, `build.md`, decisiones, contratos y fuentes finales de 001–004. Al redactar existen specs de [001](../001-contrato-clientes/spec.md), [002](../002-api-privada/spec.md) y [003](../003-cliente-navegador/spec.md); 004 dispone de [solicitud](../004-mesa-sincronizada/solicitud.md), pero no de `spec.md` ni entrega. El repositorio aún declara 3.1.0 y no contiene un servidor/cliente web implementado. No inventar dependencias o afirmar que estos resultados ya existen.

## Base inspeccionada y reutilización

- `src/main/index.ts` crea siempre una ventana con preload local, registra `map-asset:`, instancia repositorios/archivos, instala menús locales y registra IPC; también precarga Player. Separar esa composición del nuevo arranque de servicio.
- `src/main/ipc/player-window-ipc.ts` crea una segunda ventana local con preload y distribuye eventos a ventanas. Su identificación actual de DM no es una autorización para páginas remotas. Mantener ese subsistema exclusivamente en modo local.
- `src/main/app-menu.ts` ofrece recientes y manda eventos a la UI local. El modo servicio requiere un menú que no muestre rutas locales ni dispare esas operaciones.
- `src/preload/index.ts`, infraestructura local, almacenamiento y contratos históricos siguen siendo utilizados por modo local. No añadir un bridge remoto ni habilitar IPC genérico.
- Reutilizar contrato/composición de 001, servicio autenticado de 002, entrada/adaptador web de 003 y sincronización/filtrado público de 004. Electron servicio carga su URL y utiliza exactamente esos flujos; no implementar otro adaptador HTTP en main ni una copia de App/PlayerApp.
- Conservar [VTT](../../../specs/39-vtt-interface/spec.md), [Player View](../../../specs/15-player-window/spec.md), [cámara jugador](../../../specs/24-player-camera-control/spec.md), [dados](../../../specs/37-dm-dice-rolls/spec.md), [mapas](../../../specs/29-multi-map-scenes/spec.md) y [enlaces](../../../specs/23-scene-navigation-links/spec.md).

## Alcance y exclusiones

Incluye configuración/arranque de Electron servicio, aislamiento y restricciones del contenido, errores de conexión recuperables, comandos de ejecución/build, guía operativa y pruebas de integración de toda la serie. Se permiten correcciones justificadas en dependencias para cerrar esta aceptación, con pruebas y descripción explícita en `build.md`.

No incluye servidor embebido/autoiniciado en Electron, migración automática del perfil local, selector completo de cuentas/servidores, cambio de modo en caliente, edición offline, sincronización bidireccional de archivos locales, cuentas públicas, varias mesas, instalador del servidor, infraestructura cloud, firma/notarización o DMG. No rediseñar el VTT ni duplicar reglas, motores, autenticación o filtros de privacidad.

## Selección del modo y URL

1. Configuración explícita de proceso: `TTRPG_ELECTRON_MODE=local|service`, predeterminado `local`; `TTRPG_SERVICE_URL` obligatoria en `service`. No interpretar `ELECTRON_RENDERER_URL` como autorización remota ni usar la presencia de una URL para cambiar silenciosamente de modo. Valor de modo desconocido o URL inválida produce error claro y no arranca una ventana privilegiada como fallback.
2. Documentar arranque en desarrollo y desde el artefacto Electron compilado, con comandos `pnpm` reproducibles. El modo servicio tiene precedencia sobre el servidor renderer de electron-vite. Sin variables nuevas, `pnpm dev` conserva el comportamiento local.
3. La URL identifica la raíz del frontend web del servicio, no `/api/v1`. Aceptar un origen HTTP(S) con ruta raíz; normalizar con el parser URL. Rechazar credenciales embebidas, query, fragmento, rutas no raíz, valores malformados y protocolos como `file:`, `data:`, `javascript:` o `map-asset:`. La app no obtiene configuración de una escena o enlace recibido del servidor.
4. Exigir HTTPS fuera de loopback. La excepción HTTP se limita a `localhost` exacto y literales IP de loopback válidos; no aceptar sufijos como `localhost.ejemplo`, rangos privados LAN ni nombres arbitrarios que resuelvan a loopback. Cubrir IPv4/IPv6 y normalización en tests. Comparar origen completo normalizado, incluidos esquema y puerto, nunca `startsWith` ni coincidencia parcial del hostname.
5. Certificados se validan normalmente. No usar flags de ignorar certificados, desactivar webSecurity ni callbacks que acepten errores TLS. Para acceso LAN remoto, la guía exige HTTPS y configuración coherente del origen público de 002.
6. La URL no contiene claves. Login, selección de rol y logout son los de la web. No inyectar claves, tokens o cookies desde main, variables `VITE_*`, argumentos de URL o preload. El rol efectivo lo decide el servidor.

## Aislamiento del proceso y ventanas

- Resolver modo antes de inicializar infraestructura. En `service` no registrar IPC local, no abrir bases/recientes/plantillas locales, no instalar handler de `map-asset:` ni precargar Player local. Evitar importar/evaluar infraestructura local con efectos secundarios en esa rama. Ambos modos pueden vivir en el mismo binario, pero un proceso ejecuta uno solo.
- Toda ventana que carga el servicio usa `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, sin `preload`, sin integración Node en subframes/workers y sin `webviewTag`. El contenido no dispone de `window.ttrpg`, `ipcRenderer`, `require` o acceso directo a filesystem/Electron.
- Usar una sesión/partición de servicio separada de la sesión local. Puede ser efímera: conservar sesión durante recarga y documentar que cerrar la aplicación obliga a acceder de nuevo. No guardar la clave. Si se elige persistencia de cookies, justificar y probar su separación por origen y logout; no asumir que la sesión local puede compartirse.
- Instalar las restricciones antes de cargar la URL. Navegación principal y redirecciones solo al origen configurado. Bloquear destinos externos, esquemas locales/ejecutables, downgrade HTTP y navegación desde enlaces o formularios que intente escapar; probar carga inicial y redirecciones HTTP, no solo click sobre enlaces. La página de recuperación propia, si existe, también carece de privilegios y no amplía la allowlist.
- Bloquear por defecto `window.open`, `target=_blank`, creación de webviews y permisos del navegador no requeridos por el VTT (cámara, micrófono, geolocalización, notificaciones, etc.). No abrir destinos arbitrarios mediante `shell.openExternal`. Permitir APIs web ordinarias de selección de archivos y descarga explícita requeridas por importar/exportar; esto no concede lectura libre del disco.
- Proyección remota sigue el flujo web real de 004: publicar y mostrar/copiar una URL útil para un cliente jugador autenticado. No invocar la ventana IPC local. No es obligatorio abrir automáticamente otra ventana Electron. Si el flujo existente depende de un popup, adaptarlo para ofrecer la URL visible y accesible; cualquier ventana remota permitida debe estar limitada al destino jugador conocido del mismo origen, repetir todas las restricciones y usar sesión independiente del DM. Cambiar `?view=player` no convierte una cookie DM en una sesión jugador segura.
- El menú de servicio conserva funciones de aplicación/edición/ventana útiles y recuperación, pero no recientes del disco, gestores IPC ni acciones locales falsas. Tampoco entrega eventos de main a la página remota.
- En modo local, impedir que la ventana con preload navegue a contenido remoto por enlace/redirección/nueva ventana. Restringirla a su renderer local aprobado, manteniendo su desarrollo, recursos, diálogos y Player. No convertir el modo local en una vía alternativa para cargar la URL del servicio con privilegios.

## Fallos recuperables y experiencia

- DNS, rechazo de conexión, fallo TLS o servidor ausente durante arranque producen un estado visible en español, con destino seguro, explicación breve, `Reintentar` y salida. No dejar ventana vacía/oculta, bucle de recarga o rechazo de promesa sin manejar. Reintentar usa la configuración validada y permite entrar al recuperar el servicio. No volcar claves, stack ni rutas del perfil al mensaje.
- Una pérdida de HTTP/SSE después de entrar utiliza los estados/reconexión de 003/004; no recargar automáticamente todo el frontend y perder una escena modificada. Sesión expirada y logout conservan las garantías de privacidad/cambios pendientes de esas specs.
- Mostrar el modo servicio y origen de forma discreta (por ejemplo título de ventana) para distinguir dónde se guardan los datos. No añadir un panel persistente que cubra el mapa. Guardar en servicio no debe sugerir que está guardando en el disco del cliente.
- Controles de error/reintento tienen nombre accesible, foco visible, orden lógico y operación por teclado. Escape, Delete/Backspace y click derecho siguen las reglas del VTT; escribir en login/nombres no activa atajos destructivos. Mantener bloqueo de escala, drawers y mapa legible.
- Verificar tamaño mínimo local 820×520, ventana de servicio 1024×768 y 1440×900, y proyección 1920×1080. Recuperación y acciones deben caber sin scroll horizontal ni controles cortados; jugador nunca ve controles ni datos privados del DM.

## Entrega operativa

Reutilizar y completar comandos `dev:api`, `build:api`, `start:api`, `dev:web`, `build:web` de las dependencias. Añadir/documentar entrada explícita de Electron servicio (por ejemplo `dev:service` y ejecución del main compilado), sin cambiar `dev` local. Los nombres finales deben ser exactos y ejecutables; no basta un ejemplo con un comando inexistente.

Los builds de API, web y Electron generan salidas separadas y no se borran entre sí. El servidor de producción ejecuta el artefacto compilado en Node 24 y sirve el frontend construido sin electron-vite/dev server ni import runtime de Electron. Los artefactos necesarios, ubicación de estáticos y directorio de trabajo/configuración se documentan. No incluir bases, claves, `.env`, temporales o datos privados en builds; fallar claramente si faltan estáticos requeridos. Mantener versión y empaquetado derivados de `package.json`, sin ejecutar empaquetado.

Guía enlazada desde README, en español, que incluya:

1. Requisitos, instalación con `pnpm`, desarrollo API/web, build y arranque de producción en loopback y cliente Electron servicio. Tabla de variables de 002 y nuevas variables de Electron, obligatoriedad, defaults no secretos y ejemplos con placeholders.
2. Generación de dos claves distintas de al menos 32 caracteres, provisión fuera del bundle/repositorio, permisos de configuración, login/logout/expiración y rotación. Indicar cuándo la rotación/reinicio invalida sesiones; nunca prometer revocación no implementada.
3. Proxy HTTPS con origen exacto, puerto privado del backend, cabeceras permitidas y política real de confianza; SSE sin buffering y timeouts adecuados. Ningún ejemplo usa CORS comodín, omisión de validación TLS o autenticación por URL. No desplegar el ejemplo.
4. `TTRPG_DATA_DIR` persistente y contenido real (SQLite, escenas, assets, plantillas/metadatos), separación del perfil Electron, permisos y qué datos son efímeros al reiniciar (sesiones, proyección y dados según 004). Reinicio del servicio con persistencia demostrada.
5. Backup/restore consistente y reproducible: detener limpiamente el servicio, respaldar todo el directorio de datos y configuración necesaria sin publicar secretos, restaurar a otro directorio y arrancar con rutas/origen apropiados. No recomendar copiar solo el archivo SQLite en caliente ni omitir assets/bases auxiliares/WAL. Verificar recuperación con un respaldo temporal real; nunca sobrescribir datos del usuario.
6. Compatibilidad `.ttrpgscene`: formato actual v2, migración v1, importación/exportación explícita, recuperación de rutas locales ausentes y límites de portabilidad de referencias a assets/enlaces del servicio. No cambia formato ni se copian archivos del cliente implícitamente.
7. Matriz final local/web/Electron servicio con roles, funciones, evidencia y limitaciones reales. Retirar etiquetas de «pendiente 004» solo para capacidades realmente completadas. Solución de errores de origen/cookies, HTTPS, conexión, almacenamiento, imagen ausente y reconexión; señalar dónde consultar errores sin secretos.

## Aceptación y pruebas

| Comprobación | Resultado observable requerido |
| --- | --- |
| Configuración | Sin variables sigue local; modo servicio exige URL válida; matriz de protocolos, credenciales, hostname engañoso, puertos, IPv4/IPv6 y HTTPS rechaza/acepta lo previsto sin fallback privilegiado. |
| Composición Electron | Pruebas de composición confirman ausencia de preload, IPC, almacenamiento y protocolo local en servicio; flags seguros y sesión aislada. Local conserva esos componentes solo para su renderer. |
| Navegación y permisos | Con ventana Electron real, un servidor de prueba intenta redirección externa, navegación a `file:`, popup y permisos; se bloquean. Inspección en renderer confirma ausencia del bridge/Node. Un mock de BrowserWindow no sustituye esta evidencia. |
| Electron local | Abrir mapa, editar, guardar/cargar `.ttrpgscene` temporal, recientes/biblioteca, abrir Player, cámara, puntero y tirada abierta/oculta funcionan sin servicio ni claves. |
| Web DM + jugador | Sesiones independientes contra API real: DM sube mapa, guarda/carga escena y publica; jugador ve solo publicación. Cámara/puntero/áreas/dados abiertos llegan, notas privadas, mapas inactivos, assets privados e historial/dados ocultos no llegan. Reconexión retoma estado sin duplicar efectos. |
| Electron servicio | Carga el build web real sin bridge; DM guarda/carga/importa/exporta y publica hacia jugador web. Repetir cliente Electron autenticado como jugador con DM web; no obtiene capacidades privadas. No compartir cookie DM entre contextos de prueba. |
| Fallos | Arranque con servicio caído permite reintento exitoso; fallo de red durante edición no elimina cambios; expiración/logout y reconexión respetan contrato y no dejan datos privados visibles al cambiar rol. |
| Operación | API y web compilados arrancan sin dev server/Electron, conservan datos al reiniciar y un backup restaurado recupera escena, imagen y entrada de biblioteca. API desconocida/asset ausente no reciben HTML del fallback. |
| Compatibilidad | Fixture v1/v2, múltiples mapas y enlaces mantienen datos; imágenes locales ausentes se informan y pueden reemplazarse. No hay nueva versión de formato. |
| Entrega | Comandos comunes y builds API/web pasan; guía y matriz coinciden con resultados; versión 3.6.0 y changelog correctos; sin Git write, despliegue ni DMG. |

Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:api` y `pnpm build:web`. Añadir pruebas significativas de validación/composición/fronteras y regresiones de integración necesarias; reutilizar suites previas sin duplicar todas las reglas de dominio.

La matriz de humo debe ejecutarse sobre procesos y clientes reales, con directorios/puertos temporales y credenciales de prueba no registradas. Registrar versiones de Node/Electron/navegador, comandos exactos, tamaños, resultado por fila, evidencia/capturas pertinentes y errores de consola/red. Probar también los artefactos compilados, no solo fuentes en desarrollo. Cerrar procesos/ventanas de prueba al acabar sin detener procesos ajenos.

`build.md` describe archivos, decisiones, configuración, pruebas/resultados y limitaciones. Una restricción del entorno que impida abrir Electron, comprobar HTTPS o completar una fila se informa concretamente como pendiente; no se sustituye por mocks ni se declara aceptación total. Las revisiones decidirán sobre evidencia real.

## Riesgos e impedimentos

- Pendiente actualmente la implementación/aprobación de 001–004 y la spec de 004. Antes de construir reconciliar sus interfaces/rutas/flujo jugador; esta spec no autoriza adelantarse a ellas.
- La inicialización local actual es incondicional y los broadcasts/menús asumen ventanas propias. Elegir modo antes de componer evita exponer infraestructura por accidente; probar todos los puntos de creación de ventanas.
- Cookies compartidas pueden dejar una vista «jugador» autenticada como DM. Sesiones/contextos de rol independientes son parte de la aceptación, no basta comprobar apariencia de PlayerApp.
- Reintentar cargando un renderer local con preload o saltarse errores TLS crearía una regresión de seguridad. El estado de recuperación no concede privilegios ni cambia el origen autorizado.
- Backup incompleto o build que borra la salida de otro componente impediría operar la entrega. Demostrar arranque y restauración con datos temporales antes de cerrar.
- Si se detecta una incompatibilidad real de escena o una función de 004 pendiente que impide la matriz, comunicar el impedimento; no cambiar formato, ampliar producto o marcar como terminado por documentación.
