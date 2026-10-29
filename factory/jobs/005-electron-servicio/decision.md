APROBAR

# Decisión técnica — 005 Electron cliente del servicio

Fecha: 2026-10-29. Ciclo 1, ronda 2. Rama `feature/fabrica-software`; base y HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Versión 3.6.0; formato de escena v2 con migración v1 conservados.

La entrega satisface la aceptación técnica con la evidencia acumulada y las correcciones verificadas. Los cuatro informes completos de ronda 2, seguridad, UX, UI y código, comienzan con **VEREDICTO: APROBADO**. Ninguno mantiene hallazgos pendientes ni una decisión de producto necesaria. Las decisiones de 001–004 también son APROBAR; sus restricciones históricas de integración quedan actualizadas por la orden posterior registrada en aprobacion-usuario.md.

## Identidad y contraste propio

Se leyeron el perfil aprobador, AGENTS.md, solicitud/spec/build, aprobación del usuario, identidad de ronda, las cuatro revisiones completas y decisiones 001–004. No se sustituyeron informes faltantes por juicio propio.

Las **529 huellas SHA-256 coinciden** con los archivos actuales, comprobadas al revisar y otra vez inmediatamente antes de publicar. SHA-256 del manifiesto: `6164e90aaf174d378d071ca1c6eccfd01b8aebba25f2a4a0b961430deaa3ff5c`. Rama y HEAD coinciden con la identidad congelada. El diff archivado coincide con el actual en sus seis archivos rastreados, descontando una línea vacía final del bloque Markdown. El inventario visible para Git no contiene archivos adicionales de producto fuera de las huellas; las excepciones son registros de fábrica, tablero y backlog. `git diff --check` pasó.

Frente a ronda 1 cambiaron seis archivos congelados: README, guía operativa, service-app y su test, y dos documentos de orquestación. Se contrastaron directamente configuración, selección de composición, ventana servicio, políticas de navegación, validación de estáticos, guía operativa, regresiones del cierre y handler del bundle compilado. La implementación corresponde a los controles y límites declarados por los revisores.

## Aceptación y correcciones

| Ámbito | Evidencia que sostiene la decisión |
| --- | --- |
| Configuración, aislamiento y fronteras | Selección de modo antes de importar infraestructura, URL normalizada y HTTPS fuera de loopback, sesión efímera, ausencia de preload/IPC local y flags seguros. Políticas instaladas antes de cargar y protección local DM/Player. Pruebas dirigidas y humo Electron real del constructor acreditan redirecciones, file, popups, permisos, ausencia de bridge/Node y rechazo TLS. |
| Integración y recuperación | Mismo frontend/API/SSE; guardado, carga, importación/exportación y publicación con Electron DM/web jugador, luego roles invertidos con cookies independientes y rechazo 403 de acceso privado. Arranque caído y reintento, pérdida de API/SSE conservando edición y aislamiento de perfil acreditados. Las funciones inalteradas y privacidad detallada reutilizan evidencias y decisiones 001–004. |
| Electron local y compatibilidad | Humo compilado con perfil temporal, mapa, edición, archivo guardado/reabierto desde recientes y Player sin API. Suite completa conserva escenas v1/v2, mapas, enlaces y recuperación; los recorridos previos locales se atribuyen a sus entregas. No cambia el formato ni se migran datos personales. |
| Operación y entrega | API/web de producción sin Electron/dev server, reinicio y backup/restore reales con bases completas, imagen byte a byte y bibliotecas según evidencia del orquestador. Estáticos ausentes fallan antes de crear datos. Builds separados, scripts existentes, guía enlazada, versión/changelog y alcance de empaquetado comprobados. |
| UX y UI | UX-005-01 resuelto: confirmación nativa al veto de cierre, cancelación segura y descarte explícito. UX-005-02 resuelto: README describe los transportes implementados. UX verificó cierre, Escape, conservación de nombre/mapa, nuevo consentimiento tras Cmd+Q y descarte con salida 0; UI inspeccionó la hoja nativa legible y completa. Se conservan las resoluciones y límites anteriores porque renderer/CSS no cambiaron. |

El handler de cierre tiene textos fijos, opciones predeterminada/cancelación en Seguir editando y permite descargar únicamente ante respuesta exacta 1. No fuerza salida ni recarga, no duplica el estado de suciedad y no concede privilegios. Las regresiones inspeccionadas cubren respuestas inesperadas y consentimiento renovado. El bundle contiene la misma condición.

## Checks y atribución

Se comprobaron los logs finales posteriores a la corrección: `pnpm test` **125 archivos / 1176 pruebas aprobadas**, `pnpm lint`, `pnpm typecheck` y `pnpm build`, sin fallo pendiente. Se leyeron también los logs de `pnpm build:api` y `pnpm build:web`, satisfactorios y reutilizables porque sus fuentes/configuración no cambiaron en ronda 2. El informe operativo original `/tmp/ttrpg-005-operacion.md` respalda reinicio y restauración del artefacto API 3.6.0.

Seguridad y código ejecutaron cada uno 38 pruebas dirigidas; UX, 11, además de su recorrido nativo. No se suman estas ejecuciones solapadas a las 1176. El aprobador no repitió suites, builds ni CUA: sus verificaciones propias fueron identidad, inventario, huellas, diff, lectura de logs y contraste de fuentes/pruebas/artefacto. El humo descrito pertenece a constructor, revisores y orquestador según sus informes.

## Riesgos residuales y límites reales

No se probó proxy HTTPS remoto con certificado público válido, varios equipos, proyector físico, lector de pantalla ni otros sistemas operativos. Sí se acreditó rechazo TLS local. Return/KP_Enter no activó la opción nativa mediante CUA y no se declara ese recorrido exitoso; Escape y los valores seguros del host sí están verificados. La salida limpia sin borrador se ensayó desde login, no desde una escena guardada. No se repitió manualmente cada herramienta ni los casos históricos incompletos de dibujo, crítico natural y dados ocultos nativos; mantienen la atribución y cobertura automatizada de las decisiones anteriores.

Persisten avisos conocidos canvas/jsdom, tamaño de chunks, directivas de dependencias, SQLite experimental y CSP local histórica; no constituyen fallos nuevos de los checks. La aprobación no es una auditoría exhaustiva de dependencias ni valida controles locales históricos fuera de alcance. Las capturas permanecen en el historial CUA y los logs temporales pueden desaparecer; sus resultados se resumen en los expedientes.

La exportación JSON no empaqueta imágenes; referencias asset/scene pertenecen a la instancia. Publicación/dados/sesiones son efímeros y la revocación no recupera bytes ya descargados. Estos límites son explícitos y no dejan un hallazgo exigible pendiente en 005. No se acredita todavía el DMG ni una integración que no se han realizado.

## Siguiente acción

El orquestador puede registrar el cierre técnico de 005 y completar la integración local de la serie acumulada conforme a la orden explícita del usuario registrada el 2026-10-29: preparar commits, integrar en main y después ejecutar `./scripts/build-dmg.sh`. La autorización procede del usuario, no de esta decisión; no incluye push ni despliegue. Solo el orquestador escribe el tablero y ejecuta esas acciones.

Única salida de este aprobador: decision.md publicado mediante temporal y renombrado atómico. Sin cambios de código, Git, tablero ni otros informes; sin procesos, CUA o subagentes propios.
