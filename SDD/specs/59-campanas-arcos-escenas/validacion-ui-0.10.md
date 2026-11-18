# Validación de escenas propias por arco — revisión 0.10

**Fecha:** 2026-11-17. **Versión:** 3.33.0. **Estado:** implementada, validada e incorporada al servicio local. T-17, T-17B, T-18, T-19 y T-20 completadas. No se ejecutaron commit, push, merge ni DMG.

## Resultado y cobertura

| Criterio | Evidencia |
| --- | --- |
| CA-35 | Mapas conserva Agregar mapa, selección, nombre, actualización de imagen y borrado. Se retiró únicamente su acceso Agregar a escena; las acciones de entidades permanecen. Verificado en Storybook y Electron autónomo/conectado. |
| CA-36 | Crear escena abre directamente el formulario del arco. Se crearon escenas homónimas con IDs independientes, foco en la tarjeta nueva y sin alterar el otro arco. Diálogo a 390 px sin overflow; Escape devuelve el foco. |
| CA-37 | API y DB impiden compartir escenas entre arcos/campañas. Las rutas antiguas de asociación rechazan la operación; publicación no adjudica escenas huérfanas. Contratos con SQLite y PostgreSQL TLS cubren propiedad, actividad y exclusividad. |
| CA-38 | Crear, importar y recuperar/copy conservan el arco contextual; confirmaciones legadas derivan el padre válido. Preparación usa el ID persistido y descarta respuestas de reserva atrasadas. Carga contextual pagina sólo el arco actual. |
| CA-39 | Migración 12 y transferencias v1–v5 verifican relaciones en ambas direcciones, rechazan ambigüedad y preservan datos. Ensayo frío, repetición idempotente y migración real comprobados. |
| CA-40 | Navegador, Electron autónomo y conectado recorridos con datos sintéticos; cuatro builds y checks aprobados. Entrega, respaldo, incorporación y verificación operativa documentados. |

Sin `owned.arcId`, el cliente conserva la carga global legada y no monta selección contextual de preparación/publicación. El formato portable `.ttrpgscene` conserva v2 y lectura v1; no se añadieron dependencias.

## Pruebas y revisión

| Comprobación | Resultado |
| --- | --- |
| Frontend dirigido, 9 archivos | 134/134 PASS |
| `test:db`, SQLite y PostgreSQL TLS | 32/32 PASS |
| Contratos de campañas / preparación / borradores / sistemas | 12/12, 16/16, 10/10 y 10/10 PASS |
| Corrida completa `test:owned`, antes de correcciones finales | 88/92 PASS; cuatro fallos investigados y corregidos |
| Rerun final del archivo `owned.contract.ts` | 14/14 PASS |
| Rerun final del nuevo caso de transferencia, ambos motores | 2/2 PASS; otros 8 omitidos por filtro, ya aprobados en la corrida completa |
| Typecheck y lint global final | PASS |
| Builds API, web, Electron y Storybook | PASS |

**No se afirma una corrida completa final única verde.** La validación final combina la corrida completa y los reruns de los caminos afectados. En transferencia se corrigieron fixtures que copiaban v5 sobre el mismo directorio y mantenían una conexión SQLite abierta durante el import. En HTTP se actualizaron fixtures globales al destino contextual y se corrigió un orden de autorización productivo: PUT comprueba primero la existencia bajo el propietario autenticado y después el padre. Una escena ajena/inexistente devuelve 404; una propia sin padre mantiene 409. El archivo HTTP completo volvió a pasar después del cambio.

TL revisó por lectura el preflight bidireccional, compatibilidad v1, publicación de huérfanos, transferencia, reservas atrasadas, carga contextual y el orden de autorización. Sin bloqueantes pendientes. Los tests fueron ejecutados por builders y PM según las actas; la revisión TL no se presenta como ejecución de pruebas.

Los nueve archivos frontend ejecutados fueron `browser-client.test.ts`, `browser-client.context.test.ts`, `SceneMapsSection.test.tsx`, `DmAsidePanel.test.tsx`, `ArcPreparationUseSection.test.tsx`, `App.workspace.test.tsx`, `CampaignPanel.test.tsx`, `GameEditor.opening-recovery.test.tsx` y `GameEditor.authority.test.tsx`.

## Recorridos reales

- **Storybook, PM:** creación directa, homónimas independientes, foco, Escape y diálogo a 390/1440 px; Agregar mapa funcional y acceso retirado ausente.
- **Navegador, PM:** en la fixture 8877, crear otra Escena homónima en el arco secundario, abrir editor, renombrar Mapa 1, guardar y recargar conservó ID/arco/nombre. Cambiar por el menú a la homónima del arco inicial cargó otro ID con Mapa 1 intacto. Sin errores de consola durante el recorrido.
- **Electron autónomo, PM:** perfil aislado y build 3.33.0; agregar una imagen local produjo Mapa 1 con sus controles restantes presentes y sin Agregar a escena.
- **Electron conectado, frontend:** mismo servicio sintético y perfil aislado. El selector Cargar escena ofreció exactamente las tres escenas del arco secundario y excluyó la del inicial. Cancelar conservó la escena y su mapa.

Capturas/actas privadas: `.local/validation/arc-scenes-exclusive/` del original. Logs de builds y contratos: `.local/validation/arc-scenes/logs/` del staging. Los procesos QA de 6006, 8877 y 55439 y las ventanas Electron aisladas quedaron cerrados.

## Cierre operativo T-20 — 2026-11-17

El usuario autorizó expresamente respaldo, parada breve, incorporación de 33 archivos, migración SQLite 11→12 y reinicio/verificación. Se cerraron ordenadamente el watcher y la API anteriores. El respaldo íntegro privado conserva DB, configuración, 32 fuentes anteriores, la ausencia del archivo nuevo y las salidas del servicio.

- Respaldo: `.local/service/backups/sdd59-arc-scenes-20261117-193054`, directorio 0700 y archivos privados.
- Ensayo sobre copia fría y migración real: esquema 12, **30/30 tablas de datos conservadas por conteo y hash**, `integrity_check=ok` y cero errores de claves foráneas. El ensayo previo también comprobó idempotencia.
- Incorporación: 33 archivos del manifiesto, hashes verificados; `.env` y `.env.electron` idénticos al respaldo; build API aprobado.
- Servicio: `pnpm start:api` permanece activo en 8787. Salud 3.33.0 comprobada por backend y PM; HTML y bundle responden 200.
- Acta privada: `.local/validation/arc-scenes-exclusive/operational-apply.json`.

Se preservaron escenas, mapas, borradores y el resto de registros. Recargar el navegador obtiene la interfaz nueva. Warnings residuales de tamaño de bundles y deprecación de pg durante pruebas no produjeron fallos. No hubo integración Git.


**Cierre de procesos posterior a la entrega:** por instrucción del usuario del 2026-11-17, se detuvieron ordenadamente el launcher, watcher y API iniciados por el agente. Puerto 8787 libre; servicio actualmente detenido. La validación y migración anteriores se conservan. La regla de limpieza al finalizar cada tarea queda registrada en AGENTS.md.
