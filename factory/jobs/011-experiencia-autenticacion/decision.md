APROBAR

# Decisión técnica — 011, ciclo 2 / ronda 4

Fecha: 2026-10-31. Se acepta técnicamente la construcción 3.13.0 congelada en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`, rama acumulativa autorizada `feature/factory-006-persistencia-multidb`, base efectiva main `73b8e6de21af74912d23399f1b99f3c1112ade91`. Esta es la segunda ronda del ciclo 2 autorizado por «inicia ronda 3».

Se leyeron el perfil aprobador, AGENTS, solicitud, especificación, construcción, coordinación, retrabajo, identidad/diff/huellas y los cuatro informes completos de ronda 4. Seguridad, UX, UI y código publicaron **VEREDICTO: APROBADO**. Ninguno deja un hallazgo obligatorio abierto ni existe discrepancia entre sus conclusiones y el código contrastado.

## Evidencia contrastada

- Verificación propia inmediatamente antes de publicar: **655/655 archivos coinciden** con las huellas congeladas, sin diferencias. Las 69 rutas del trabajo producen el agregado SHA-256 `2fd869408ca0d697252bbb6935487192946533b665d1b3de07ceb6222f0dfed0`, idéntico a build.md. Versión física de package.json: 3.13.0. `git diff --check` pasa. El delta desde ronda 3 contiene solamente GameEditor, sus regresiones de autoridad, documentación del cliente y changelog.
- Contraste propio de GameEditor, useActiveOperation, HttpTransport y terminación de mesa: la retirada de una apertura se registra después de confirmar y superar el guard; el resultado se reconcilia con la lectura actual. Las continuaciones comprueban autoridad y contexto de apertura. Un terminal anterior no congela la nueva apertura; el transporte sigue invalidando la autoridad ante 401 y termina el canal antes de notificar al editor. Un cierre incierto conserva el borrador protegido. La implementación respalda el cierre de **C4/UI-011-3**, sin sustituir la defensa de sesión por una excepción visual general.
- Código reprodujo de forma independiente el orden que causaba C4 y obtuvo Iniciar partida habilitado, sin Continuar obsoleto ni modal. Código y UX ejecutaron cada uno 38 pruebas focales satisfactorias; seguridad ejecutó 64. Sus límites de React/jsdom están declarados y no se presentan como CUA.
- UI comprobó personalmente en Chrome el cierre, inicio posterior, reapertura y segundo cierre; UX hizo el recorrido en Electron servicio real, incluyendo mapa modificado, guard, Escape, retorno del foco y descarte consentido. El cierre previo de UX-3 conserva evidencia nativa de revocación y recuperación en Electron en ronda 3. Los informes mantienen cerrados S1/S2, C1–C3, UX-1/UX-2 y los defectos visuales anteriores.
- Los registros sanitizados del constructor existen y concuerdan con build.md: **134 archivos / 1250 pruebas PASS**, typecheck/lint declarados satisfactorios y tres builds finales desktop/API/web terminados. Se inspeccionaron sus registros; no se ejecutaron de nuevo ni se atribuyen al aprobador.
- Los registros históricos reales de DB, identidad, datos propios, invitaciones y moderación concuerdan con 32, 25, 46, 36 y 47 pruebas PASS respectivamente; el contrato final ampliado confirma 8/8. La fuente de service-final.contract.ts contiene contratos por motor, dos propietarios, aislamiento del principal, composición compilada, respaldo/restauración e invalidación de accesos. La evidencia SQLite local/PostgreSQL productivo con TLS sigue atribuida al constructor y revisores previos; el backend conserva sus huellas y no hay causa para repetir estos gates.

## Criterios y alcance de aceptación

A1–A4 quedan sustentados por los contratos reales, aislamiento del principal y los recorridos de cuentas, catálogo, referencias exactas y recursos propios registrados. A5–A9 incorporan las correcciones verificadas de aperturas, terminales, recuperación y navegación, junto a la evidencia previa de invitaciones, moderación, supervivientes, teclado y tamaños/zoom. A10–A12 cuentan con setup conservador, retiro de autoridad global, composición final/restauración de ambos motores, builds y recorridos separados de navegador, Electron servicio y Electron local. No se detecta un criterio técnico pendiente en el producto revisado.

A13 queda satisfecho en su etapa técnica: versión, changelog, documentación, cuatro revisiones y esta decisión. Su etapa posterior de integración y operación todavía debe ejecutarse y registrarse; la propia especificación la sitúa después de la aceptación. **No se declara que main habitual, el servicio personal o el DMG ya estén actualizados.**

## Riesgos residuales y límites

Persisten avisos conocidos de chunks grandes, canvas de jsdom y directivas de compilación; UX registró cuatro avisos GPU en Electron sin fallo observado del recorrido. El pequeño scroll horizontal del editor local reducido quedó documentado sin controles inaccesibles. No son hallazgos obligatorios abiertos de esta ronda. No se certifican proyector físico, otros sistemas operativos ni distribución firmada. La matriz completa de clientes/motores se apoya en evidencia previa sobre fuentes conservadas; este aprobador no hizo CUA ni nuevas suites funcionales.

La adopción del legado personal requiere propietario DM explícito y respaldo consistente al corte. El expediente conserva ese pendiente operativo; no se asignan datos al administrador ni se trata como una prueba faltante del producto. No se leyeron provisión, credenciales o datos personales y no se tocó el servicio 8787.

## Siguiente acción

El orquestador puede continuar el cierre local ya autorizado por el usuario: integrar el contenido aceptado en main preservando cambios previos, preparar configuración y provisión privadas, verificar respaldos/ignore/permisos y realizar el corte ordenado con salud, HTML y recorrido real. Preservar el legado sin adoptarlo si falta propietario confirmado. Después del merge corresponde generar y verificar el DMG mediante el script del proyecto y registrar los resultados reales. Sin push ni despliegue externo.

Esta aprobación es exclusivamente técnica y no concede autorización Git adicional; la autorización de integración procede de la solicitud del usuario. La única escritura de este rol es decision.md, publicada mediante temporal y renombrado atómico. No quedan procesos o recursos propios de aprobación.
