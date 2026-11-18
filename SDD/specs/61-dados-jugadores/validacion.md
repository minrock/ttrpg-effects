# Validación — SDD 61

**Revisión aceptada:** 0.1. **Fecha:** 2026-11-15. **Versión:** 3.32.0. **Estado:** implementada, validada e incorporada al checkout local; sin merge.

## Entorno

Construcción sobre 3.31.2 en una copia aislada, con API local 8877, SQLite sintético y PostgreSQL 18 con TLS. Recorridos con DM en Chromium integrado, jugador Chrome y jugador Electron conectado; humo adicional de Electron autónomo con perfiles temporales. La API operativa 8787 y los datos del usuario no se usaron para estas pruebas. No hay dependencias ni migraciones nuevas.

Rama autorizada `feature/spec-61-dados-jugadores`, HEAD conservado `6d1f1959e92fda3c55ae6ad2b4c413d4f92e7598`. Incorporación mediante hashes contra el baseline para conservar los cambios locales anteriores. Sin commit, push, merge ni DMG.

## Matriz de aceptación

| Criterio | Evidencia de esta entrega | Resultado |
| --- | --- | --- |
| CA-01 | Mesa/Dados en Chrome y Electron; cambio de pestaña y contracción conservan composición; lateral 282 px en viewport 390 px sin desborde | Conforme |
| CA-02 | Dominio reutilizado, componentes y hooks: fórmula, grupos, percentil, d20, límites y cancelación sin reserva; Escape devuelve foco | Conforme |
| CA-03 | Preferencias locales por actor; contratos reales rechazan autor/rol y acciones no permitidas; invitado no recibe capacidades ocultas | Conforme |
| CA-04 | Chrome lanzó 1d6=2 y DM/Electron recibieron 2; contratos verifican identidad auténtica y aislamiento de otra cuenta DM | Conforme |
| CA-05 | Carrera real de begin devuelve 200/409; idempotencia y doble envío cubiertos; otro jugador prepara pero Lanzar permanece bloqueado y no hay cola | Conforme |
| CA-06 | Contratos autor/otro invitado/DM y cierre obsoleto; DM cerró pública mientras tenía oculta; autor cerró con lateral oculto | Conforme |
| CA-07 | Log del jugador conserva pública Cerrada; DM ve pública y oculta; paginación, revisión y recarga probadas | Conforme |
| CA-08 | Resumen DM oculto no elimina valores/totales del log; cierre no reproduce presentación | Conforme |
| CA-09 | Contratos inspeccionan HTTP/SSE/bootstrap, ausencia de datos privados y secuencia pública estable; pública y oculta simultáneas reales | Conforme |
| CA-10 | Una física en el iniciador, conciliación sin relanzar; Electron lanzó sin editor DM montado; recarga restaura pose final sin repetir animación/critical/audio | Conforme |
| CA-11 | Reserva de 20 s, tick y complete tardío; hooks cubren ACK incierto, fallo y pérdida de autoridad; recarga conserva resultado válido | Conforme |
| CA-12 | SQLite/PostgreSQL: revocación libera reserva y complete tardío recibe 401; cambio de publicación/apertura, entrega y contextos aislados | Conforme |
| CA-13 | Tests 501+501, retención por audiencia, límites previos al efecto, compactación de replay y limpieza; reinicio elimina estado efímero | Conforme con límites de medición indicados abajo |
| CA-14 | Select de producción con padding derecho 36 px; lateral 282, viewports 390/1440, variante 180 y zoom 200%; flecha única y texto largo truncado | Conforme |
| CA-15 | Flechas cambian tabs con foco; d20/Escape y retorno de foco; cierre accesible con lateral cerrado y resumen independiente del render | Conforme |
| CA-16 | Wire legacy: sobre contextual v2 y estado interno v1; negociado v2 estricto. Cliente antiguo conserva mesa, mutaciones legacy 426; fallback a mesa base tras 1,5 s y respuesta tardía descartada | Conforme |
| CA-17 | 92 regresiones IPC/configuración/escena; humo nativo autónomo 1d6=1 en proyección; sin nuevo IPC ni cambios de formato/persistencia/dirty/undo | Conforme |
| CA-18 | Componentes reales sin motores en Storybook: 10 stories de dados por rol, espera, cierre, error y compatibilidad; Select Material/estrecho; grafo y build correctos | Conforme |

## Evidencia automatizada

Comandos ejecutados con `pnpm` en copia aislada. Los grupos se solapan; no se suman como si fueran pruebas únicas.

- Núcleo C-61 y schemas: 17/17 en el corte del núcleo; revisión final de wire/schema/annotations/cliente contextual: 20/20.
- Regresión de dominio de dados, sesión local, IPC y adapters: 167/167 en 12 archivos.
- IPC, configuración y formato de escena: 92/92 en 4 archivos.
- Hooks servicio y autónomo: 18/18; incluyen cierre público pendiente durante cambio de contexto privado, éxito y error incierto con requestId estable.
- UI, workspace y GuestEntry: 94/94 en 8 archivos. No se creó ni se atribuye ejecución al archivo inicialmente propuesto `PlayerApp.dice.test.tsx`; el lateral real se verificó en navegador/Electron.
- Cliente HTTP/SSE y estado público: 45/45 en 5 archivos, repetidos por PM tras el último ajuste de negociación.
- Contratos C-61 reales: 6/6; corrections: 10/10; races: 12/12, sobre SQLite y PostgreSQL con TLS.
- Suite completa de moderación: **59/59 en 9 archivos**, SQLite y PostgreSQL 18 TLS; incluye proceso compilado. Duración 253,54 s (23:27–23:31).
- `pnpm typecheck` y `pnpm lint`: correctos. Builds API, web, Electron y Storybook: correctos; recompilación final del cliente también correcta.

Logs y capturas se conservan en `.local/validation/dice61/`. El catálogo final cuenta 84 stories y 34 páginas autodocs; no monta Pixi/Three, clientes HTTP ni acceso privilegiado.

## Recorrido integrado

Chrome y Electron mostraron el compositor y el mismo resultado público. Mientras la pública permanecía en pantalla, otro jugador preparó 1d6 pero no pudo lanzar ni cerrar la ajena. El DM lanzó una oculta simultánea; sólo su log aumentó. Cerró la pública, el jugador conservó su resultado en el historial y lanzó manualmente la siguiente. Salir del editor DM a Campañas no impidió lanzar a un jugador ya admitido.

En la repetición final, la publicación confirmó «Proyección publicada». El jugador entró sin el falso aviso de otra pestaña, lanzó 1d6=2, recargó y recuperó «Tirada en pantalla» con pose estática. Cerró desde el control externo con el lateral oculto; al volver a Dados, el log conservó la entrada Cerrada.

Durante la validación se corrigieron publicación negociada, wire legacy, sustitución del propio SSE al negociar, fase de presentación restaurada y cierre público que quedaba pendiente al navegar el contexto privado. La primera suite completa dio 56/59 por tres timeouts históricos; se conserva ese resultado y no se cuenta como gate aprobado. El caso de reconexión pasó después 2/2 aislado y corrections 10/10. El resultado definitivo de la repetición se registra arriba.

## Límites y memoria

Historial efímero: 500 públicas y 500 ocultas, sin trayectorias en cada entrada. Límite de 64 KiB por entrada, validado antes de mutar; fixture extrema de 46.266 B, típica de 759 B. Cota serializada máxima de 62,5 MiB por runtime, 1,953 GiB para 32 runtimes; no es medición de RSS ni garantía de consumo real. Dos replays de hasta 1 MiB se compactan a pose final. Recibos con TTL de 5 min, 64 por actor, 1024 por audiencia y 64 de moderación DM; fixture de 314 B por recibo, unos 648 KiB por runtime sin overhead de Map.

Se verificaron retención, descarte y limpieza con pruebas deterministas, recorridos de varias tiradas y reconexión. No se ejecutó un perfil sostenido de RSS/VRAM, carga de 32 procesos ni una campaña de 20 ciclos nativos; no se fuerza pérdida real del contexto WebGL. El cierre textual independiente del render se comprueba en componentes y con el lateral oculto. La simulación sigue confiando en el cliente: la validación estructural no es un sistema contra trampas. Builds conservan avisos de chunks grandes y pnpm avisa de la copia con node_modules enlazado; no se cambió el lockfile.

## Integración y limpieza

Se incorporaron 50 archivos de producto mediante comparación SHA-256 con el baseline y escritura atómica por archivo; 611 archivos del baseline quedaron intactos. Verificación posterior: todos los hashes del delta coinciden con la copia probada, versión 3.32.0 y lockfile conservado. Los documentos SDD se actualizaron en el checkout habitual. API QA 8877, Storybook QA 6007, PostgreSQL TLS 55461 y ventanas Electron temporales detenidos; pestañas QA cerradas y viewport restaurado. El grupo guardado de Chrome queda cerrado, sin borrarlo. No se detuvieron los servicios del usuario ni se migraron datos reales. El cambio «Volver a los arcos» sigue fuera de esta spec.

Captura final: `.local/validation/dice61/player-dice-final.png`; contexto completo en `player-dice-final-full.png`. Tras incorporar el código, el arranque habitual recompila el servicio; las pestañas abiertas deben recargarse para usar el cliente nuevo.
