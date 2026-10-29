APROBAR

# Decisión técnica — 004 Mesa sincronizada privada

Fecha: 2026-10-29. Ciclo 2, ronda global 3. Aprobador: `aprobador_004`. Rama `feature/fabrica-software`; HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070`. Versión 3.5.0.

La entrega satisface la aceptación técnica de 004 con la evidencia acumulada y las correcciones verificadas. Los cuatro informes completos de ronda 3 contienen **VEREDICTO: APROBADO**: seguridad, UX, UI y código. No quedan hallazgos pendientes ni una decisión de producto necesaria para continuar. Esta decisión no autoriza staging, commits, push, merge, despliegue o DMG.

## Identidad y contraste independiente

Leídos AGENTS.md, perfil de aprobación, solicitud, spec, build, retrabajo autorizado, identidad/diff de ronda y los cuatro informes completos. Se consultaron además los cierres de seguridad y código de ronda 2, porque la ronda actual conserva sus verificaciones sobre fuentes sin cambios.

Comprobaciones propias de este aprobador:

- Las **520 huellas SHA-256** coinciden con los archivos actuales, también inmediatamente antes de publicar esta decisión. El diff archivado en `ronda-3/revision.md` coincide con el diff actual de sus archivos. Rama y HEAD coinciden con la identidad de revisión; `git diff --check` termina con código 0.
- SHA-256 del manifiesto `ronda-3/huellas.json`: `1068fe6e3f50b9a38a08839d6dbe57b52872f7da2fc54e3d87c2877cf7c7eea7`.
- Frente a ronda 2 solo cambian `src/web/ServiceApp.tsx`, `src/web/ServiceApp.test.tsx`, `src/web/service.css` y `docs/synchronized-table.md`. Se inspeccionaron directamente los cuatro. La composición limita la nueva posición de brújula al servicio; la alerta de logout pertenece al flujo de Mesa, fuera de details. Se mantienen regiones live, Escape/foco y sesión conservada ante fallo de revocación.
- Se contrastaron también la proyección explícita del servidor y las fronteras HTTP de sesión, rol y assets con las conclusiones heredadas. La versión y el changelog conservan el cierre minor único.

## Aceptación, hallazgos y verificaciones

| Ámbito | Evidencia que sostiene la aprobación |
| --- | --- |
| Proyección y assets, criterios 1–3 | Constructor público por campos permitidos; fixture adversa; HTTP/SSE con cookies separadas y matriz real GET/HEAD/resolve. Seguridad de ronda 2 ejecutó 73 tests y reproducciones HTTP propias; sus fuentes permanecen idénticas. SEG-004-01 y SEG-004-02 cerrados: ACK compacto y cuotas por rol; revalidación después de recibir cuerpos y decodificar. |
| Orden, cámara, tiempo y presencia, criterios 4–6 | Pruebas de deduplicación, épocas/contextos, consumidores lentos, cierre de sesiones, relojes desplazados y dados públicos/ocultos; regresión integrada de cámara divergente y cadencia 0/160 ms. COD-004-01, COD-004-02 y UX-1 cerrados. Código de ronda 2 ejecutó 124 tests. El humo real posterior conservó zoom 132 % tras interrupción/restauración. |
| UI y adaptación, criterio 7 | UX-2 y UI-004-01/02 permanecen cerrados. UI-004-03 se cierra con inspección CUA independiente en 1024×768, 1440×900 y 1920×1080, brújula visible, Mesa y logout separados, error de logout real con Mesa abierta/cerrada, Escape/foco y ausencia de scroll horizontal. Seguridad ejecutó 30 tests en ronda 3; UX, 8; código, 36 y typecheck. |
| Humo y entrega, criterios 8–9 | Build documenta API real con IAB DM/Chrome jugador, publicación, mapas, objetos, cámara, puntero/área, tarjetas/turnero, dados abiertos/ocultos, recarga, revocación y logout; correcciones posteriores tienen humo dirigido y regresiones. Se conserva humo Electron local atribuido al orquestador, más compilación/regresiones posteriores. |

Se consultaron los logs originales del constructor: suite completa **121 archivos / 1135 pruebas**, prueba final de logout **8 pruebas**, lint final, build web final, build Electron y build API de la ronda anterior. Los resultados respaldan lo declarado en build.md. La suite completa precede al último ajuste web; la regresión final, typecheck/lint y build web cubren ese ajuste, y los revisores ejecutaron dirigidos adicionales. No se afirma una suite completa de 1136 ni una recompilación API posterior: sus fuentes no cambiaron. Los checks requeridos están cubiertos por esta secuencia, sin fallos pendientes que obliguen a repetirlos.

## Riesgos residuales y alcance de la evidencia

La aprobación no amplía las garantías de privacidad: la imagen de mapa publicada se descarga completa, la niebla no oculta sus píxeles y la revocación no recupera bytes ya descargados. La mesa sigue siendo efímera, una por instancia, con cuotas finitas y sin colaboración multi-DM.

No hubo ensayo TLS/proxy remoto, varios equipos físicos, proyector ni lector de pantalla real. La conservación de dibujos y crítico/replay con reloj desplazado se acredita mediante pruebas automatizadas; no mediante el intento manual incompleto de dibujo ni un crítico natural observado. El humo Electron no acreditó dados ocultos nativos. Las capturas CUA fueron inspeccionadas por sus autores y descritas con medidas, sin PNG persistidos. Este aprobador no repitió navegador, builds o tests: comprobó fuentes, identidad y evidencia existente. Los avisos conocidos de canvas jsdom y tamaño de chunks no representan fallos ni prueba de render GPU.

Estas limitaciones están documentadas y no dejan incumplido un criterio exigible de 004; no se presentan como funcionalidades o ensayos completados.

## Siguiente acción

El orquestador puede registrar la aprobación técnica de 004 y continuar **005** conforme a solicitud y retrabajo-ciclo-2. Conservar la rama autorizada y los cambios acumulados. La integración sigue esperando una orden explícita del usuario; no realizar operaciones de escritura Git ni generar DMG. Única salida de este aprobador: este archivo, publicado mediante temporal y renombrado.
