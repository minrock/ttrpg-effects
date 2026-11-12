# Estado actual y decisiones vigentes

Corte: 2026-11-12. Entrega 3.25.0: cierre autorizado en `main` de SDD 58 (guardado y recuperación), correcciones de auditoría 3.23.0, celda de calibración/alineación de SDD 04 y reconstrucción automática del servicio. Conserva las entregas SDD 55–57 y expedientes 001–012. Las pruebas y límites se registran por entrega; integración no equivale a despliegue.

## Producto disponible

TTRPG Effects tiene dos modos: Electron autónomo para preparar/proyectar mesas con datos locales, y servicio privado API + frontend compartido entre navegador y Electron conectado. En servicio, las cuentas admin gestionan DMs y sistemas; cada DM prepara sus partidas y comparte una apertura con jugadores sin cuenta mediante enlace y alias.

Una partida fija una versión de sistema. El catálogo separa reglas, datos y presentación, con módulos compilados. La proyección pública excluye información privada del DM. Las herramientas visuales y reglas del editor local se reutilizan mediante contratos de cliente, no mediante privilegios de Node en el navegador.

## Qué decisión reemplaza a cuál

| Tema | Decisión vigente | Antecedente sustituido |
| --- | --- | --- |
| Plataforma | Electron local + navegador + Electron servicio | Electron como opción todavía tentativa en los requisitos iniciales |
| Acceso del servicio | Cuentas admin/DM y cookies de invitado por partida | Dos claves globales de 002–005 |
| Alta DM | Solo admin; no autorregistro ni correo automático | Crear usuarios libremente o enviar invitaciones por SMTP |
| Alta admin | CLI local, varios correos únicos; bootstrap solo base vacía | Un único administrador y alta exclusivamente inicial de 007 |
| Contraseña | 10–128 puntos de código, máximo 512 bytes, sin recortar | Mínimo 15 |
| Contraseña de admin por CLI | Elegida y confirmada: definitiva; Enter: generada temporal y cambio obligatorio | Obligar a cambiar siempre la contraseña que el operador acaba de elegir |
| Persistencia | SQLite local; PostgreSQL con TLS en producción | SQLite como único almacén del servicio |
| Propiedad | Datos por DM; admin no es dueño de sus mesas | Bibliotecas y escenas globales |
| Plantillas en servicio | Solo admin edita/publica; deshabilitar sin borrar | Edición de plantillas por DM y borrado de catálogo |
| Versión de sistema | Referencia exacta retenida y hash; módulos compilados | Resolver a la última versión o ejecutar plugins externos |
| Invitación | Se renueva al abrir/reabrir; continuar conserva apertura | Rotar por cualquier recarga o pedir contraseña personal a jugador |
| Expulsión | Revoca participante y rota enlace; los demás permanecen | Cambiar todas las credenciales o desconectar toda la mesa |
| Alineación de grilla | Celda de calibración mueve el origen persistente por mapa; snap y medición comparten ese origen | Guía temporal independiente de la grilla |
| Arranque API | `pnpm start:api` valida y reconstruye API y web antes de escuchar | Arrancar artefactos potencialmente obsoletos |
| Menú | Una fila compartida, herramientas agrupadas en ancho estrecho | Cabecera de servicio y toolbar del editor apiladas |

Electron autónomo conserva su gestión local de plantillas. Las restricciones administrativas son del servicio; no se trasladan silenciosamente al modo local.

## Integración y evidencia

El [tablero](../factory/board.json) marca 001–012 como integrados, con SHA y expedientes. Las specs SDD 41–52 enlazan esos trabajos y registran las sustituciones funcionales. No se cambió el tablero para esta consolidación.

Los cambios de administradores/contraseñas 3.14–3.17 y cabecera 3.18–3.18.1 estaban pendientes al iniciar la consolidación. El usuario autorizó después commit e integración: el producto quedó registrado en `c4e8831`, junto al cierre documental desde `feature/sdd-consolidado`. Las specs 53–54 no simulan rondas ni aprobación de fábrica. Resultados nuevos y cierre en [registro de consolidación](consolidacion.md).

Las pruebas registradas en builds antiguos pertenecen a su código y fecha. Los gates reales de PostgreSQL requieren un entorno dedicado; no se ejecutaron durante esta revisión ni su cierre. Un test de UI en jsdom o fixture aislada no sustituye el recorrido autenticado de API real.

## Invariantes para las próximas specs

- Mantener dominio independiente de React, Pixi, Electron y SQL; las vistas invocan servicios/puertos.
- Autorizar por cuenta/propietario/apertura en el servidor, incluyendo revalidación al confirmar y entregar datos; una capacidad UI no autoriza.
- Mantener publicaciones inmutables y versiones retenidas; deshabilitar impide nuevos usos y conserva instancias existentes.
- No borrar bases ni restablecer usuarios durante configuración/arranque. `.local/service` y env son privados e ignorados.
- Conservar formato `.ttrpgscene` v2 y lector/migrador v1; el paquete operativo v3 es otro formato y no transporta cuentas/aperturas.
- Un proceso API por base; reiniciar conserva persistencia pero vacía proyección/cámaras/dados. No prometer recuperación de ese estado efímero.
- La niebla no evita que el jugador inspeccione los píxeles de una imagen de mapa ya descargada. No usarla como control de confidencialidad.
- Cambios de código requieren evidencia nueva y permiso de integración; una decisión técnica anterior no concede permisos Git.

## Entrega anterior — SDD 55

[SDD 55 — Mediciones y áreas compartidas con autor visible](specs/55-mediciones-compartidas/spec.md) implementa una capa efímera compartida entre DM/jugadores **en servicio**, con alias/discriminador del autor, edición propia y retirada por DM. Versión 3.19.1, integrada desde `feature/sdd-mediciones-compartidas` a `main` (`90dc50e`), con laterales de mesa DM/jugador y chevrón de borde; Electron autónomo conserva herramientas locales. La consolidación 3.18.1 descrita arriba es la base histórica. [Validación y pendientes](specs/55-mediciones-compartidas/validacion.md); no se inició un trabajo factory ni se simuló aprobación.

## Entrega anterior — SDD 56

[Cámaras libres y foco de atención](specs/56-camaras-libres-foco-atencion/spec.md) implementa navegación propia y un foco puntual que centra el área útil conservando el zoom actual. Retira controles remotos, cámara principal/virtual y previews de la interfaz. Incluye API/SSE negociado e IPC específico. Implementada en `feature/sdd-foco-atencion` (`34d938c`) e integrada en `main` (`3d35876`), versión 3.20.0, con autorización explícita del usuario. [Plan técnico](specs/56-camaras-libres-foco-atencion/plan.md) y [evidencia/límites](specs/56-camaras-libres-foco-atencion/validacion.md).

## Entrega anterior — SDD 57

[Áreas contextuales](specs/57-areas-contextuales/spec.md) implementa para círculos/conos una barra de selección con color, patrones cuadriculados de emojis existentes, bloqueo y copia. Conserva propiedad/moderación y separación entre figuras DM persistentes y dibujos efímeros de jugadores. [Plan técnico](specs/57-areas-contextuales/plan.md). Implementada en `feature/sdd-areas-contextuales` (`a09ea69`) e integrada en `main` (`62c351a`), 3.21.0, por orden explícita del usuario. No se inició un trabajo factory. [Validación y pendientes](specs/57-areas-contextuales/validacion.md).

## Pendiente de especificar

Estas son direcciones mencionadas o límites explícitos, no una cola aprobada:

- Ecosistema de sistemas/plugins estilo Foundry: formato de paquete, compatibilidad del motor, instalación, permisos, aislamiento y actualización de instancias retenidas. Hoy solo se ejecutan módulos compilados incluidos.
- Despliegue productivo concreto: infraestructura, dominio/HTTPS, PostgreSQL, respaldo y operación. El soporte del motor existe; falta decidir y ejecutar un despliegue específico.
- Escalado horizontal, bus de eventos y recuperación durable del estado visual: requieren nuevas garantías de consistencia y autoridad.

Cualquier otro alcance nuevo debe describir problema, usuario, criterios y exclusiones antes de convertirse en trabajo de fábrica. Las preguntas originales de requirements no se reabren automáticamente: primero contrastarlas con specs y código existentes.


## Corrección pendiente de integración — Recuperación de sesión

3.21.1 en `fix/recuperacion-sesion-memoria`: liberar el render durante suspensión, detener renders de conflictos, descartar el editor antes de recargar el contexto y acotar resolución de imágenes ausentes. [Diagnóstico y evidencia](specs/51-experiencia-servicio/recuperacion-memoria.md). Sin cambios de DB ni expedientes factory nuevos.


## Implementación en rama — SDD 58: borradores recuperables

[Spec 58](specs/58-borradores-recuperables/spec.md) y [plan](specs/58-borradores-recuperables/plan.md): respaldo IndexedDB a 1 s/máximo 5 s, borrador privado remoto a 5 s/máximo 30 s y confirmación manual separada. Incluye recuperación por cuenta/rama, conflictos sin sobrescritura, persistencia local selectiva de Electron servicio y contratos SQLite/PostgreSQL. Estado: implementada y consolidada para la versión 3.22.1 en `fix/recuperacion-local-figuras`, pendiente de merge y sin trabajo factory nuevo. Migración aditiva 8; DB operativa sin modificar. IndexedDB privado sustituye la prohibición anterior y Electron servicio usa partición persistente por origen, con limpieza de credenciales. [Evidencia y límites](specs/58-borradores-recuperables/validacion.md).

Corrección 3.22.1 en `fix/recuperacion-local-figuras`: respalda figuras sin mapa, inicia escritura al crearlas y ofrece recuperar IndexedDB o cargar la escena. Conserva SDD 58 pendiente de integrar.

Corrección 3.22.2 en `fix/guardado-escena-confirmada`: confirmación completa y reapertura automática desde el servidor; IndexedDB solo solicita recuperación por cambios de contenido pendientes. Incluida en la entrega 3.23.0; pendiente de integración.

## Correcciones de auditoría pendientes de integrar — 2026-11-11

B01–B06 corregidos en `fix/hallazgos-auditoria-escena`, conservando los cambios previos de guardado. Entrega 3.23.0 por solicitud de incremento minor. El usuario autorizó commit y push de esta rama; sigue pendiente de integración a main. Evidencia y límites en [validación de auditoría](validaciones/2026-11-11-auditoria-escena.md).
