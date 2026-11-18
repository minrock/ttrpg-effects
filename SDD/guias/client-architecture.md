# Contrato del cliente web

Desde [SDD62](../specs/62-servicio-solo-web/spec.md), el navegador es la única plataforma de interfaz. React, el editor Pixi y PlayerApp se conservan; Electron autónomo/conectado, preload y menús nativos se retiran. La matriz de adaptación histórica permanece en [SDD41](../specs/41-contrato-clientes/aceptacion-historica.md) y las entregas correspondientes.

## Composición y fronteras

`src/web/main.tsx` monta `ServiceApp`. `GameEditor` y `GuestEntry` entregan un `TtrpgClient` explícito a las raíces React mediante `ClientProvider`. `null`, o la ausencia de un proveedor, significa que no existe cliente disponible: nunca se consulta `window.ttrpg` ni se crea una API privilegiada de respaldo. Storybook y labs utilizan `null` o dobles sintéticos explícitos.

`src/shared/api/ttrpg-api.ts`, `client.ts` y los puertos asociados definen el contrato. Sus tipos de dominio/aplicación no ejecutan infraestructura de servidor. Los consumidores React usan `useTtrpgApi` y el cliente de su propia raíz; no importan Node, filesystem, SQL ni secretos.

La instancia del cliente debe ser estable durante una conexión. Cambiarla o desmontar cancela suscripciones y descarta respuestas atrasadas. Los renders ordinarios no reinician el canvas. Cámara, búsquedas y resolución de imágenes quedan ligados a la generación de cliente y al contexto autorizado de cuenta/campaña/apertura.

## Capacidades y operaciones

Las capacidades describen disponibilidad, **no autorización**. El servidor sigue verificando rol, propietario, apertura y revisión. No existe `nativeMenus`, `LOCAL_CAPABILITIES` ni callbacks de menús del sistema operativo.

| Área | Contrato y comportamiento web |
| --- | --- |
| Metadatos | `getAppInfo` devuelve metadatos síncronos del build; la versión del servidor se consulta por separado. |
| Escenas | `saveScene`, `saveSceneToPath`, `loadScene` y enlaces trabajan con recursos autorizados. `scene:<id>` es una referencia opaca, no una ruta del servidor. |
| Imágenes | Selección con APIs del navegador, subida validada y resolución autenticada por recurso; cancelación, dimensiones, escala y recursos ausentes conservan sus errores recuperables. |
| Bibliotecas | Monstruos, NPCs y personajes propios; presentaciones exactas/retención. El DM no administra el catálogo de sistemas/plantillas; el administrador usa su área específica. |
| Proyección | `openPlayerWindow` es un nombre interno heredado para la publicación HTTP del cliente web. No crea una ventana nativa. Los snapshots, cámaras, punteros, readiness y estado de imágenes se transportan por HTTP/SSE. |
| Anotaciones | `TtrpgClient.annotations` conecta dibujos efímeros compartidos, con autoría del servidor, edición propia y moderación DM. No se guardan en la escena. |
| Dados | `TtrpgClient.serviceDice` implementa el protocolo C-61: jugador siempre público, exclusión de tirada pública activa, cierre por autor/DM e historial filtrado. No hay sesión autónoma de respaldo en la UI. |
| Borradores | IndexedDB y borradores privados remotos conservan copia recuperable, revisión base, confirmación idempotente y aislamiento por cuenta/escena. |

Se conservan nombres heredados como `PlayerWindowSnapshot`, `SceneOperationResult.filePath` y `saveSceneToPath` cuando tienen consumidores web reales. Cambiar su terminología no es requisito para retirar Electron. Los tipos/reglas de dados compartidos siguen utilizándose en el servidor; su existencia no implica un cliente nativo.

## Flujos de interfaz

La administración conserva campañas → arcos → escenas, preparación separada de NPCs/monstruos y guardas de campañas inactivas. Cada escena pertenece a un arco. El menú de campaña del editor permite seleccionar escenas con protección del trabajo pendiente.

La cabecera muestra el nombre de escena como texto y conserva Guardar y «Jugador» como publicación explícita. En ancho estrecho las acciones se agrupan en Herramientas, con teclado, Escape y retorno de foco. No se reintroduce el dropdown de escena ni se trasladan automáticamente Nueva/Cargar/Importar/Exportar del producto desktop a controles nuevos. [Decisión UX-62](ui-ux/servicio-solo-web.md).

El jugador entra mediante invitación del mismo origen y usa PlayerApp con cliente explícito. Conserva cámara propia, herramientas de medición locales del navegador, anotaciones compartidas y panel Mesa/Dados. Las herramientas locales de cámara o dibujo no significan almacenamiento autónomo ni acceso a Node.

## Seguridad y compatibilidad

El servicio conserva cookies por audiencia, Host/Origin exactos y reautorización al confirmar/entregar. Solo la proyección pública cruza hacia invitados; conocer un ID no permite leer contenido privado. Los contratos de autoridad, backpressure y revocación están en [mesa sincronizada](synchronized-table.md), [moderación](moderation.md) y [API privada](private-api.md).

`.ttrpgscene` conserva formato 2 y lectura/migración de 1. Los lectores de referencias históricas y las transferencias operativas permanecen por compatibilidad, sin conceder lectura arbitraria del filesystem ni adoptar automáticamente perfiles desktop. Los assets del servicio se resuelven mediante IDs autorizados.

Los borradores IndexedDB y remotos se mantienen conforme a [SDD58](../specs/58-borradores-recuperables/spec.md). El autoguardado autónomo de sessionStorage se retira con Electron. Una copia pendiente no se publica a jugadores ni se confirma como escena firme por recuperarla.

## Validación

`src/renderer/src/client/ClientProvider.test.tsx` comprueba composición explícita, ausencia de cliente e independencia entre raíces. Las regresiones de editor/jugador, clientes browser, recuperación y dados conservan sus aserciones de servicio. Storybook mantiene el aislamiento de motores y código privilegiado. La evidencia nueva de retirada y sus límites se registra en [SDD62](../specs/62-servicio-solo-web/validacion.md); las evidencias nativas antiguas son históricas.
