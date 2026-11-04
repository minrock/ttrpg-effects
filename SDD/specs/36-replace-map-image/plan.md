# Plan tecnico 36 - Actualizar la imagen de un mapa existente

## 1. Resumen

- Spec fuente: [spec.md](spec.md).
- Estado: implementado y aceptado para cierre 2.7.0 el 2026-10-22.
- Dependencias: specs 03, 04, 15, 24, 29, 30 y 34. Mantener la regresion de darkvision corregida en 2.6.1.
- La compensacion de resolucion y los metadatos asociados fueron aceptados por el usuario.
- Rama `codex/replace-map-image`, sin nuevas dependencias. Commit, push, merge a main y DMG autorizados por el usuario.

## 2. Base previa y limites

- `SceneMapsSection.tsx` permite agregar, importar, seleccionar, renombrar, ordenar y eliminar. Falta una accion por ID para sustituir solo la imagen.
- `App.handleAddSceneMap` crea defaults e identidad nueva mediante `createMapImageState` y `createDefaultSceneMapDocument`. No reutilizar ese flujo para reemplazar.
- `scene-maps.ts` mantiene tanto `maps[]` como los campos runtime del mapa activo. Antes de editar el documento se debe ejecutar `syncActiveMapFromRuntimeFields`; despues, `syncRuntimeFieldsFromActiveMap` cuando corresponda.
- `SceneMap` guarda `imagePath`, `position` y `scale`, pero no dimensiones. `sanitizeMapScale` limita a 0.25-4 y redondea a dos decimales; el schema lo usa al leer. Ese redondeo impide compensar exactamente algunas resoluciones.
- `PixiViewport.setMap` detecta cambios por URL. `drawMapImage` limpia sprites y descarga el recurso anterior antes de cargar el nuevo. Para esta operacion hacen falta identidad de recurso nueva y sustitucion preparada, no limpiar primero.
- `PlayerApp` tiene claves independientes para carga de imagen y sincronizacion de camara. Mantener esa separacion: refrescar imagen sin cambiar `cameraSyncKey`.

## 3. Dominio y persistencia

### Operacion pura

Agregar `replaceSceneMapImage(scene, mapId, replacement)` en `domain/sessions/scene-maps.ts` o modulo adyacente, con pruebas independientes de React/Pixi/Electron.

1. Sincronizar cambios pendientes del mapa activo hacia `maps[]`.
2. Buscar el objetivo por ID y fallar si ya no existe; nunca crear uno como fallback.
3. Reemplazar solo `map.imagePath`, metadatos de imagen y escala autorizada dentro del mapa objetivo, conservando `map.position`.
4. Mantener todos los demas campos, referencias a entidades, orden y `activeMapId`.
5. Sincronizar la proyeccion runtime del activo sin copiar contenido del objetivo inactivo sobre el canvas actual.

### Resolucion y escala

- Agregar tipo puro `MapImageDimensions { width: number; height: number }` y campo opcional `SceneMap.imageSize`. Validar enteros positivos y finitos; no aceptar dimensiones cero.
- Guardar dimensiones de la imagen que realmente se ha decodificado, asociadas a su ruta/revision, no inferidas del nombre de archivo. Al cargar archivos antiguos completar metadatos ausentes en memoria cuando sea posible; no escribir el archivo automaticamente. Si ya hay dimensiones guardadas y el archivo externo ahora difiere, no sobrescribir esa referencia anterior antes de confirmar el reemplazo.
- La fuente del tamano anterior debe ser la metadata vigente o la textura anterior ya cargada. No volver a leer el mismo archivo sobrescrito para obtener supuestas dimensiones antiguas.
- Crear helper de preparacion geometrica con dos politicas: `preserve-world-size` y `keep-scale`. Para igual proporcion, `nextScale = previousScale * previousWidth / nextWidth`; comprobar tambien el alto.
- Comparar proporcion con tolerancia numerica, no tolerancia visual arbitraria; tolerancia relativa de 1e-6. Mantener el ancla central actual (`anchor=0.5`) y la posicion mundial.
- Conservar el rango 0.25-4. Rechazar la politica de conservar tamano si el resultado queda fuera; no clamp automatico ni cambio oculto de politica.
- Separar precision persistente de presentacion del control: quitar el redondeo a dos decimales del camino de serializacion/normalizacion de escala valida. Los controles manuales pueden seguir mostrando porcentaje y pasos actuales sin reescribir la escala hasta una edicion explicita.
- Probar idempotencia del guardado y conversiones como 2000 -> 3000 -> 2000. No multiplicar coordenadas de tokens, grilla, fog, anotaciones, luces, efectos o mascara horaria.
- Extender schema compartido, defaults opcionales y snapshots sin subir `SCENE_DOCUMENT_VERSION` 2; lectura V1/V2 sin metadata sigue valida. No incorporar URLs versionadas al JSON.

## 4. Preparacion y aplicacion

- Definir puerto acotado `MapImageStorage` y caso de uso de preparacion en `application`, con resultado discriminado `ready | cancelled | error`. Reutilizar infraestructura existente sin mezclar reglas de escena con dialogos.
- La preparacion devuelve ruta, URL runtime de revision y dimensiones decodificadas; no muta la escena. La decodificacion real del renderer debe verificar el asset antes de habilitar la confirmacion, especialmente HEIC.
- Capturar una identidad de sesion de escena y `mapId`, mas la revision de la imagen objetivo. Los IDs de escena actuales pueden estar vacios; no usarlos como unico guard contra respuestas tardias.
- Aplicar sobre el estado mas reciente, nunca sobre una copia completa tomada antes de abrir el selector. Preservar ediciones concurrentes de otros campos; si cambio la imagen/escala/posicion objetivo, invalidar la preparacion y pedir repetirla.
- Cancelar al cambiar/cerrar escena o eliminar objetivo. Si solo cambio el mapa activo, conservar el objetivo original y tratarlo como inactivo al confirmar. Impedir solicitudes de reemplazo superpuestas. No guardar ni publicar un estado candidato aun no confirmado.
- Al confirmar un activo, preparar recursos y aplicar documento/URL/transformacion como una sola transicion visual; conservar estado previo para errores anteriores a la aplicacion.
- Reutilizar guardado normal y recuperacion local. Cancelar no dispara persistencia ni snapshots nuevos. Reparar una ruta rota sigue esta misma operacion.

## 5. Infraestructura, IPC y cache

- Extender `ElectronMapImageStorage` con seleccion para reemplazo, titulo nativo `Actualizar imagen del mapa`, allowlist existente y verificacion de archivo legible. Limites de archivo/textura deben comprobarse contra el backend antes de aplicar, con error recuperable.
- Exponer una accion especifica `map:select-replacement-image` en `main/ipc/map-ipc.ts`, `preload/index.ts` y `preload/ttrpg-api.d.ts`. Validar sender DM, payload y resultados; no exponer `fs`, rutas arbitrarias ejecutables ni IPC generico.
- Crear un identificador runtime de revision por seleccion confirmable, incluso si la ruta coincide. Usar `URL`/`searchParams` para construir la URL `map-asset:`; no concatenar paths con parametros manualmente.
- Auditar el handler de `map-asset` en `main/index.ts`: extraer/eliminar solo el parametro de revision para resolver el archivo real mediante APIs de URL, preservando espacios, Unicode y caracteres escapados. Garantizar que el recurso nuevo no reutilice bytes de una revision anterior en la cache de Chromium/Pixi.
- Compartir la misma URL/revision runtime en los snapshots DM/Player. Mantenerla estable en snapshots sucesivos; nunca crear una revision por render o por frame.
- Mantener referencias runtime por mapa para que volver a un mapa actualizado no recupere una URL antigua. Incluir invalidacion de respuestas tardias de `resolveMapUrl`, cuyo efecto actual en `App.tsx` no distingue generaciones de carga.
- No enviar imagenes base64 ni objetos DOM por IPC. Las URLs/revisiones no se guardan en `.ttrpgscene`; al reabrir se resuelve de nuevo el archivo vigente.

## 6. UI y render

### React

- Agregar `onReplaceMapImage(mapId)` a `SceneMapsSection` y propagarlo por `DmAsidePanel` hasta un hook/controlador del flujo. Boton de icono Lucide con tooltip/aria, que no active navegacion ni drag/drop al usarlo.
- Extraer modal accesible `ReplaceMapImageModal` con comparacion, dimensiones, politica disponible y advertencias. Mantener foco, Escape/cancelar, cierre centrado y estados preparando/error/aplicando; usar convenciones del resto de modales.
- Mantener el mapa anterior durante la preparacion y no poner `mapImageUrl=null`. Actualizar la URL visible solo para el objetivo activo; los mapas inactivos conservan su referencia para carga posterior.
- No invocar `handleSelectSceneMap`, no vaciar URLs de tokens ni reiniciar la camara auxiliar al sustituir el fondo. Cancelar solo borradores de herramientas al aplicar sobre el activo.

### PixiJS

- Separar preparar textura y hacer swap de sprites en `PixiViewport`, conservando el recurso anterior hasta que el candidato este listo. Capturar URL y generacion antes de cada `await`; comprobar vigencia en exito y en error.
- No reconstruir `Application`, listeners, escena completa ni efectos animados independientes. Mantener unicamente recurso vigente y candidato por viewport; liberar candidatos cancelados/obsoletos.
- Sustituir mapa base y copia de color para darkvision juntos. Reconstruir solo recursos derivados afectados por textura/bounds; mantener mascara de color y visibilidad coordinadas como en el fix 2.6.1.
- Mantener datos mundiales de fog y mascara horaria; invalidar sus caches derivados cuando cambien los bounds, sin editar trazos persistidos. Con filtro para toda la escena, cubrir el nuevo fondo completo.
- Recalcular capas necesarias antes del siguiente frame visible, con transformacion de brujula comun, sin RenderTextures de dimensiones cero ni filtros/FBO nuevos.
- Liberar sprites/texturas anteriores solo despues del swap y cuando no haya usuarios locales del recurso. No descargar una textura compartida con otro uso (por ejemplo, token con la misma URL).

### Player View

- Reutilizar snapshot validado con nueva imagen/revision, manteniendo `activeMapId`, `cameraSyncKey`, comandos y estado de camara efectivos. La carga de recurso no es una navegacion de mapa.
- Preparar localmente y hacer swap de imagen y escala juntas; mientras tanto conservar ultima imagen/transformacion valida y proteccion visual de fog/oscuridad. No proyectar previews del modal.
- No bloquear toda la ventana con el estado de readiness al reemplazar un recurso ya visible. Un fallo conserva ultimo estado valido y se informa al DM por un evento especifico validado, sin bucles automaticos de recarga; permitir reintento manual de esa revision.
- Abrir Player despues del reemplazo debe obtener el snapshot confirmado mas reciente. Actualizar un mapa inactivo no publica su imagen como activa.

## 7. Plan de trabajo

1. Politica de resoluciones, spec y comienzo de implementacion aprobados; rama creada.
2. Implementar metadatos opcionales, precision de escala, preparacion geometrica y reemplazo puro por ID, con regresiones de preservacion/serializacion.
3. Implementar seleccion, validacion, revision de recurso y manejo de cancelacion a traves de application/main/preload.
4. Implementar carga preparada y swap seguro en Pixi, antes de conectar el flujo a la UI.
5. Conectar boton, modal y estado runtime por mapa; proteger respuestas asincronas y borradores.
6. Integrar Player sin comandos de camara, incluyendo errores/reintento y apertura tardia.
7. Ejecutar automatizadas y smoke nativo con escena de multiples mapas; presentar para revision del usuario sin cerrar el desarrollo por cuenta propia.

## 8. Testing y verificacion

- Dominio: reemplazo activo/inactivo, objetivo inexistente, cero mapas nuevos, identidad/orden/links conservados; comparar todos los campos salvo los explicitamente permitidos.
- Geometria: igual resolucion, doble/mitad/1.5x resolucion, escala no entera, proporcion diferente, metadata ausente, limites, valores invalidos y centro distinto del origen.
- Persistencia: V1/V2 sin metadata, V2 nuevo, guardado/recarga repetidos sin deriva, mapa no activo actualizado y reapertura por primer mapa en orden.
- Aplicacion/IPC: cancelar selector/modal, archivo ilegible/corrupto, HEIC no decodificable, sender no autorizado, sesiones cambiadas, objetivo eliminado y respuestas fuera de orden. Nunca reemplazar con una escena obsoleta.
- UI: accion por fila no activa mapa/drag, teclado/foco, controles ocupados, politica y advertencia correctas, confirmacion unica, sin sobrescritura automatica del archivo.
- Render: misma ruta con bytes distintos y nuevas dimensiones, misma URL/revision en snapshots repetidos sin recargas, swap sin desmontaje temprano, fallo preserva textura anterior, carga obsoleta no pisa la actual y recursos liberados tras repetir reemplazos.
- Player: camara sincronizada y auxiliar conservadas, zoom/bloqueo sin cambios, mapa inactivo aislado, apertura despues del reemplazo, error local y reintento sin congelamiento.
- Smoke Electron: preparar dos mapas con pins, area, conexion bidireccional, tokens, luces, fuego/relampago, fog parcial, darkvision y filtro pintado. Actualizar el fondo, navegar ida/vuelta, guardar/reabrir y probar norte 0/90/180/270, grilla cuadrada/hexagonal y zoom extremo. Observar que no se expone contenido oculto ni aparecen errores GPU.
- Rendimiento: usar un mapa grande comparable a los de mesa; comprobar que pan/zoom no recargan la imagen, que solo se carga una vez por revision y que la memoria no crece sin limite en reemplazos repetidos. No declarar una cifra de FPS sin medirla.
- Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check`; registrar los resultados al terminar la verificacion.

## 9. Riesgos y decisiones

| Riesgo | Mitigacion |
| --- | --- |
| Perder preparacion al usar el flujo de agregar | Operacion pura por ID y tests de igualdad de todos los campos preservados. |
| La misma ruta conserva imagen vieja | Revision estable por operacion y pruebas del protocolo/cache en ambas ventanas. |
| Sobrescribir un mapa con un resultado tardio | Guard de sesion, objetivo y revision; aplicar sobre estado actual. |
| Deriva al cambiar resolucion | Escala persistente de precision completa, metadata fiable y round trips. |
| Oscuridad o mascara desacoplada durante swap | Transicion de recursos conjunta y regresiones de darkvision, fog, daytime y brujula. |
| Duplicacion temporal de memoria | Un candidato por viewport, limites del backend y liberacion al cancelar/fallar/sustituir. |
| Imagen nueva con otro encuadre | Advertencia y revision visual; no prometer alineacion semantica automatica. |

## 10. Cierre 2.7.0

- [x] Spec y politica de resolucion aprobados.
- [x] Implementacion y tests automatizados completados.
- [x] Typecheck, lint, build y diff check correctos.
- [x] Smoke nativo focalizado DM/Player, guardado y recarga completados.
- [x] Resultados y limitaciones reales registrados en este plan.
- [x] Revision del usuario antes de commit/merge/release.

Version minor 2.7.0 en `package.json` y entrada correspondiente en `CHANGELOG.md`. Formato de escena 2 sin migracion incompatible. Integracion y DMG completados; ver verificacion de entrega abajo.

## 11. Implementacion y verificacion local - 2026-10-22

- Dominio: `map-image-replacement.ts` calcula la politica; `scene-map-image.ts` aplica por ID y registra dimensiones fiables. `SceneMap.imageSize` es opcional y la escala valida conserva precision completa.
- Orquestacion: `useMapImageReplacement` controla preparacion, leases, confirmacion, errores y generaciones. Aplica sobre el documento vigente; cancela resultados de otra sesion, objetivo modificado o reintento que invalida una preparacion.
- Infraestructura: puerto `MapImageStorage`, caso de uso de preparacion, IPC limitado al DM, URLs revisionadas y protocolo sin cache de bytes obsoletos. No hay dependencias nuevas.
- Render: registro de leases compartido por mapas, previews y tokens dentro de cada renderer; miniaturas runtime de hasta 512 px. El swap no recrea el viewport del mismo mapa y actualiza juntas las copias base/color y las capas derivadas. Los limites de textura se consultan al backend.
- No se vuelve a leer un archivo sobrescrito para fabricar su preview anterior: para la misma ruta solo se usa la textura activa realmente decodificada. Un mapa inactivo puede mostrar `Imagen no disponible` como preview anterior, conservando sus dimensiones conocidas.
- Player distingue la identidad de navegacion/sesion mediante `cameraSyncKey`, escena y mapa, incluso con IDs reutilizados. Un reemplazo mantiene esa identidad y la camara auxiliar. Reportes de carga/error llevan URL y descartan callbacks de otra instancia o revision.
- `pnpm test`: 81 archivos, 650 pruebas correctas. Incluye dominio/persistencia, IPC, cache, recursos Pixi, cancelaciones y carreras asincronas, modal, filas del navegador y Player.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check`: correctos. El build informa avisos de directivas `use client` ignoradas en Radix/Lucide; no impiden compilar.
- Electron: escena temporal de dos mapas, pin, area, luz, fuego, relampago, fog parcial, darkvision, filtro pintado y norte a 90 grados. Verificados reemplazo 640x400 -> 1280x800 con escala compensada, refresh de bytes en una misma ruta, comparacion de previews, camara auxiliar conservada y actualizacion de mapa inactivo sin navegar.
- Guardado/reapertura nativos correctos. Comparacion del JSON guardado con la fixture: IDs, orden, posiciones, escala y contenido de los mapas preservados; solo imagen y dimensiones cambiadas, sin URLs temporales. Se excluyo de esa comparacion el origen temporal del relampago regenerado por el generador de fixtures.
- Limites de esta verificacion: no se midieron FPS/memoria con mapas de gran formato, ni se recorrio manualmente toda la matriz de orientaciones/grillas, HEIC y permisos de archivo. Los escenarios de error y preservacion restantes tienen cobertura automatizada, no equivalen a una certificacion de todos los drivers GPU.
- En la consola nativa se observaron avisos `SharedImageManager::ProduceSkia` durante recargas/destruccion de vistas, sin pantalla negra observada en el reemplazo. No aparecio el anterior error de framebuffer de tamano cero en esta prueba. Este aviso de Chromium queda registrado para seguimiento, no se declara resuelto por esta spec.
- La fase de revision no genero commits, publicacion ni instalador. El usuario autorizo posteriormente el cierre 2.7.0, merge a main, push y DMG.

## 12. Verificacion de entrega 2.7.0 - 2026-10-22

- Implementacion: commit `0c54aeb`; merge a main: `5284d9d`.
- Verificacion de cierre: 650 tests en 81 archivos, lint y diff check correctos. `./scripts/build-dmg.sh` completo con typecheck y build de produccion correctos.
- Instalador: `dist/TTRPG Effects-2.7.0-arm64.dmg`, aproximadamente 142 MiB; `hdiutil verify` correcto.
- Aplicacion empaquetada: `CFBundleShortVersionString` 2.7.0 y ejecutable Mach-O arm64. Build local sin firma Developer ID ni notarizacion; no se genero instalador Intel.
- SHA-256 del DMG: `4ff01cf83b8ede76295d08464f1d1aebac19da2defefb913f65d53588742dc4a`.
- Los avisos de empaquetado sobre autor ausente, dependencias opcionales de otras plataformas y firma deshabilitada no impidieron completar el instalador.
