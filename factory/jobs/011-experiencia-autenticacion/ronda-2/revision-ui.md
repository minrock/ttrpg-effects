VEREDICTO: APROBADO

# Revisión UI — 011, ciclo 1 / ronda 2

Fecha: 2026-10-31. Revisión independiente sobre 3.13.0 congelada en `/Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects`. Perfil `.codex/agents/ui.toml`, AGENTS, solicitud/spec/build/coordinación, diff efectivo, huellas de ronda2 y revisión UI de ronda1 contrastados. AGENTS no cambió respecto de ronda1. Todas las entradas web de las huellas coinciden con las fuentes al publicar.

## Alcance y resultado

Se cierran **UI-011-1 y UI-011-2** de ronda1 mediante inspección de las fuentes corregidas y recorrido visual propio en Chrome contra QA8891/SQLite. No se basó la aprobación en pruebas DOM ni exclusivamente en el relato del constructor/orquestador. Las capturas se observaron directamente mediante CUA; no se guardaron imágenes ni secretos en el repositorio.

La aprobación corresponde al alcance de esta revisión UI. No representa aceptación global de011 ni sustituye los informes de seguridad, UX y código, en particular sus escenarios funcionales de expiración con modales ya abiertos.

## Cierre de UI-011-1: formularios desplazables al 200 %

Fuente: `src/web/service.css:3` ahora limita `.service-access` a `100dvh`, permite `overflow:auto` y usa centrado seguro. Se conservan la disposición del formulario, las etiquetas, el contraste y los indicadores de foco.

Reproducción propia con zoom nativo de Chrome al200%, viewport de prueba1024×768 y **DOM512×384/DPR2 confirmados**:

| Pantalla observada | Medidas CSS y resultado |
| --- | --- |
| Acceso normal | Contenido601px, contenedor384px; rueda llevó scrollTop217. Acceder y la entrada de invitación visibles y alcanzables. Captura nativa inspeccionada. |
| Recuperar sesión | Se obtuvo cerrando la sesión desde una segunda pestaña propia mientras el editor de QA seguía abierto. Contenido665px, contenedor384px; rueda llevó scrollTop281. Acceder quedó entre y169–213 y la entrada de invitación entre y309–331. La rueda también retornó al inicio, scrollTop0. Body512px, sin desbordamiento horizontal. |
| Cambiar contraseña | Contenido760px, contenedor384px; rueda llevó scrollTop375.5. Instrucciones y botones Cambiar contraseña y salir/Cerrar sesión completos en captura. Campos vacíos: no se introdujo ni cambió ninguna contraseña. |
| Entrar a la partida | Ruta sintética sin secreto; contenido inicial574px y contenedor384px, scrollTop189.5. Entrar/Cancelar accesibles; tras Cancelar entrada se desplazó hasta ver íntegro el aviso textual. Body512px. |

La recuperación también permitió expandir la invitación, introducir únicamente la ruta sintética sin fragmento y llegar a «Conservar el borrador». El diálogo fue inspeccionado visualmente al200%: título, explicación y ambas acciones completos, ancho cliente=ancho desplazable472px. Shift+Tab desde Cancelar y recuperar sesión llevó a Descartar borrador y continuar; Cancelar devolvió a Recuperar sesión. Reautenticar la cuenta original restauró el editor. Este escenario partió de un editor sin cambios de escena; no se atribuye como prueba de persistencia de un borrador modificado.

Durante la preparación, una capacidad de viewport apuntó a la otra pestaña y produjo DOM720×450; esa observación no se usa para certificar1024×768. Se cerró la segunda pestaña, se corrigió la dimensión efectiva y se repitieron las observaciones reportadas con512×384.

**Conclusión:** las acciones que antes quedaban fuera de vista ahora son accesibles mediante rueda sin reducir el zoom. Hallazgo cerrado.

## Cierre de UI-011-2: nombres completos sin desbordamiento

Fuentes: `src/web/service.css:72` añade título flexible con `min-width:0` y `overflow-wrap:anywhere`; el título previo al inicio y el nombre de cuenta también admiten división del texto. Los botones no se encogen. Contraste con la composición real de `src/web/GameEditor.tsx`.

Evidencia propia con capturas completas y dimensiones DOM:

- **Nombre continuo original de182 caracteres:** antes de continuar,1440×900, body.scrollWidth1440; título de cabecera entre x111.36 y1424, envuelto y completo junto con generic v1. Durante la partida,1024×768, body.scrollWidth1024 y cabecera de126px; nombre completo distribuido en líneas, Partidas/Cerrar partida/Reabrir partida visibles, sin cubrir el viewport ni perder el estado inferior.
- **Variante con espacios:** partida sintética nueva «QA UI ronda dos — » seguida cinco veces de «La campaña de las montañas lejanas ». Pantalla previa a1024×768 con título completo y acción Iniciar partida; editor a1440×900 con body.scrollWidth1440 y cabecera60px. Cuenta, sistema/versión y botones permanecen legibles y el mapa mantiene su espacio propio. No se cambió el nombre de Campaña Aurora.

**Conclusión:** no se reprodujo el corte lateral de ronda1 con ninguna variante. Se conserva el nombre completo, sin depender de un truncado silencioso. Hallazgo cerrado.

## Límites, hallazgos nuevos y limpieza

No se encontraron nuevos defectos visuales accionables en los escenarios inspeccionados. La ronda1 conserva la evidencia propia de administración, modal de borrador, identificación del participante y vista de jugador1920×1080; esta ronda se concentra en las fuentes modificadas y en sus variantes faltantes. No se repitieron proyección publicada, Electron local820×520, Electron servicio ni pruebas de motores; la evidencia de esos ámbitos en build/coordinación pertenece a sus responsables. No se certifican proyector físico, otros sistemas operativos ni todas las combinaciones de red/modal/sesión.

No se ejecutaron suites intensivas ni se usó PostgreSQL, API8787, provisión personal o Git. Las credenciales sintéticas se consumieron en memoria sin imprimirlas; no se generaron ni capturaron secretos de invitación. Se continuó/cerró la apertura de QA con nombre continuo y se creó/inició/cerró la partida propia con espacios. Esta última permanece como registro de fixture; ninguna escena se guardó ni publicó y Campaña Aurora no se modificó. La salida propia y la revocación que UX coordinó no se atribuyen a datos reales.

Zoom devuelto a100% (DPR1 verificado), overrides retirados y ambas pestañas propias cerradas. Única salida escrita: este informe, publicado mediante temporal y renombrado.
