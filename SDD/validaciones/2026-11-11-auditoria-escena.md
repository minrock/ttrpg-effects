# Correcciones de auditoría de escena — 11 de noviembre de 2026

Versión: **3.22.3**. Rama: `fix/hallazgos-auditoria-escena`. Conserva los cambios preexistentes de `fix/guardado-escena-confirmada`; estas pruebas no implican merge ni despliegue del servicio operativo.

## Hallazgos y correcciones

| ID | Reproducción y corrección | Evidencia nueva |
| --- | --- | --- |
| B01 | Abrir Player View con un mapa provocaba carga → render → recreación de Pixi. El callback contextual ahora se entrega mediante una referencia actualizable, sin formar parte del ciclo de creación del motor. | Prueba que cambia la callback diez veces, exige una sola creación, ninguna destrucción y entrega al manejador más reciente. Electron real: escena de 22 objetos con mapa, luces, fuego y relámpagos renderizada; zoom, cierre y reapertura operados. |
| B02 | Recientes aplicaba el archivo inmediatamente, perdiendo cambios. Ahora ofrece Cancelar, Descartar y abrir o Guardar y abrir. Fallos/cancelación conservan el editor. Al guardar y abrir el mismo archivo utiliza el resultado nuevo, no la lectura anterior del menú. | Pruebas React de las tres opciones, guardado cancelado/fallido y mismo archivo. Se amplió expresamente el alcance de SDD 19. |
| B03 | Un enlace a un mapa borrado seguía marcado válido porque se validaba contra el archivo guardado. Los enlaces internos se validan contra el documento en memoria y su reciprocidad; la navegación se deshabilita si el destino está roto. | Prueba React que elimina el destino sin guardar, abre el enlace y exige «Conexion rota», ausencia de «Mapa interno conectado» y botón de navegación deshabilitado. |
| B04 | Un aviso de imagen ausente quedaba visible después de repararla. Se conserva la metadata del aviso y se retira únicamente la ausencia reparada; no se borran otros avisos ni referencias antiguas todavía usadas. | Prueba React de sustitución que elimina el aviso reparado y conserva el aviso de enlace pendiente. Pruebas del hook con mapas activos/inactivos. |
| B05 | Restaurar generaba secuencia cero, inválida para PUT, y podía bloquear guardado y lectura de la copia IndexedDB. La rama restaurada empieza en 1 y compara contenido para actualizar el indicador. Lectura compatible y acotada para copias antiguas con PUT cero, verificando esquema y hashes; original exportable intacto. | Pruebas del coordinador, IndexedDB y recorrido React + API/SQLite real con sincronización después de reabrir. La copia exportada que falló en la auditoría se recuperó con contenido idéntico y hash correcto. Chrome real: recuperar → guardar → recargar → continuar sin diálogo → guardar otra vez. |
| B06 | Actualizar imagen rechazaba `/api/v1/dm/assets/<id>`. Se admite junto a la ruta anterior únicamente si el ID coincide exactamente; siguen rechazándose URLs externas, otro ID y query strings. | Pruebas de contrato positivas/negativas. Chrome real: PNG 2048×1536, confirmación visible, sustitución aplicada, dos figuras conservadas y escala ajustada al 50%; guardado y recarga conservan imagen y figuras. |

## Comprobaciones

- `pnpm test --exclude '.local/**' --exclude 'tmp/**' --maxWorkers=2`: **153 archivos, 1371 pruebas correctas**.
- `pnpm lint`: correcto.
- `pnpm build`: correcto, incluyendo TypeScript.
- `pnpm build:api` y `pnpm build:web`: correctos.
- `git diff --check`: correcto.

Los avisos de canvas no implementado en jsdom y de tamaño de chunks/directivas de dependencias siguen presentes; no bloquearon pruebas ni compilación. El render real se comprobó por separado.

## Entornos y límites

Chrome se probó en `localhost:8791` con cuenta, partida y base sintéticas de la auditoría. Electron usó el perfil aislado de auditoría. No se modificó la base real ni se reinició el servicio operativo del puerto 8787. Los artefactos locales se conservan bajo `.local/auditoria-chrome-20261111` y `.local/auditoria-escena-20261111`, ignorados por Git.

El informe inicial conserva las reproducciones históricas; el estado de corrección se añadió sin eliminar esa evidencia. La compatibilidad de recuperación no convierte una copia alterada en válida ni descarta envíos inciertos válidos. No se realizó una prueba prolongada de fugas de memoria, PostgreSQL, pérdida de red, despliegue remoto ni toda la matriz de funciones entre DM y jugadores. Las pruebas React de B02–B04 no equivalen a repetir todas sus variantes en interfaz nativa. La compilación del instalador de la entrega minor 3.23.0 se registra a continuación.

## Entrega minor 3.23.0

El usuario solicitó el incremento minor, commit y push de la rama el 11 de noviembre de 2026. El código funcional validado como 3.22.3 se conserva; cambian la versión de entrega y sus registros. No se solicitó merge a main.

- `./scripts/build-dmg.sh`: correcto para arm64, incluyendo TypeScript y compilación Electron.
- Instalador local: `dist/TTRPG Effects-3.23.0-arm64.dmg`; checksum verificado correctamente con `hdiutil verify`.
- `pnpm build:api` y `pnpm build:web`: correctos con versión 3.23.0.
- Las 1371 pruebas corresponden al mismo código funcional, validado antes del cambio de versión; no se repitieron por cambios exclusivos de versión y documentación.
- El DMG queda ignorado por Git; no se publica un binario ni una release de GitHub mediante este push.
