VEREDICTO: APROBADO

## Alcance e identidad

Revisión UI independiente de 003, ciclo 2, ronda global 3, realizada el 2026-10-29. Leídos `retrabajo-ciclo-2.md`, build actualizado, `ronda-3/revision.md`, huellas y cambio real. Se conserva el contexto de AGENTS, perfil UI, solicitud y spec de las revisiones anteriores. No se consultaron informes ajenos de esta ronda.

Revisión proporcional a UI-003-03: apilamiento del modal de enlaces, selector anidado, scroll/cierre y conservación de la frontera visual de sesión. SHA-256 de `src/renderer/src/styles.css`, SceneLinkModal, ServiceApp y PortalTarget coincide con las huellas de ronda3. No se modificaron código, Git, tablero ni informes anteriores.

## Cambio inspeccionado

`src/renderer/src/styles.css:4291` añade `.scene-link-backdrop` con posición fija y z-index40, por encima del30 de la cabecera. El diálogo no se extrae del árbol de sesión. Se inspeccionaron también SceneLinkModal, ServiceApp y PortalTarget para contrastar esa ubicación con la implementación, sin basar la aprobación solo en CSS o en el relato del constructor.

## Verificación real por CUA

Servicio propio Node24 mediante `pnpm start:api`, build vigente `out/api`/`out/web`, origen `http://127.0.0.1:8875`, datos aislados `/private/tmp/ttrpg-ui003r3.HRcwmP` y claves ficticias. Se prepararon por HTTP fixtures propios de la ronda anterior: Origen UI con Puerta UI y destinos largos oriental/occidental. No se usaron datos personales ni se presenta esta preparación como prueba del importador. Las imágenes no copiadas de los fixtures se identifican como ausentes; no afectan la reproducción del diálogo.

Navegador Chrome por CUA exclusivamente. Capturas y estados accesibles están en el historial de herramientas; no se persistieron PNG.

1. LoginDM → Cargar Origen UI → Explorador/Mapa → Editar Puerta UI → Elegir escena del servicio → destino largo terminado en occidental → Abrir escena.
2. **1024×768:** la captura muestra completos “Habitacion enlazada”, título Puerta UI y cierre. La cabecera del VTT queda atenuada detrás. El modal ocupa y20..748, igual que en la reproducción fallida anterior, pero ahora `elementFromPoint(400,35)` pertenece a `scene-link-modal__header`; backdrop z-index40. `scrollWidth=1024`, sin desbordamiento horizontal. El nombre de destino sigue completo y el cuerpo permite desplazamiento para acceder a su parte inferior; pie Cancelar estable.
3. **1440×900:** captura del mismo modal con destino seleccionado, texto, marcador, Conectar con esta escena, encabezado y pie visibles. No aparece la barra del VTT por encima. Se pulsó Cerrar y desapareció el diálogo, con foco devuelto a Editar Puerta UI. Se pudo abrir de nuevo. El selector nativo anidado permanece por encima del modal y vuelve correctamente a él tras confirmar.
4. **Regresión de privacidad visual:** con el modal abierto se detuvo/reinició exclusivamente la API temporal, invalidando su sesión. Pulsar Elegir escena del servicio produjo401 real. Captura y árbol accesible muestran solo Recuperar sesión, sin Puerta UI, nombre de escena ni formulario privado. Inspección DOM de solo lectura: el modal sigue montado, conserva ancestros hidden e inert y tiene0rectángulos visibles. Antes de la expiración también se confirmó su ancestro `.service-workspace`.
5. ReautenticaciónDM restaura el modal y muestra “Operación de una sesión anterior descartada”. Cerrar sigue funcionando. LogoutDM devuelve Acceso a tu mesa. Se restauró viewport, cerró el tab propio y detuvo el proceso;8875 quedó sin listener.

## Resultado del hallazgo

**UI-003-03: corregido y cerrado.** La misma condición que ocultaba el encabezado ya no lo hace en1024×768 ni1440×900. El cambio conserva scroll, selector anidado, cierre y contenedor protegido ante401. No se solicitan correcciones adicionales en el alcance revisado. UI-003-01/UI-003-02 permanecen cerrados conforme a la ronda2; esta ronda no reabre esas áreas.

## Límites

No se amplió la inspección a herramientas, bibliotecas, transición funcional de enlaces, Electron, labs ni proyección1920, ajenas al cambio visual acotado. No se ejecutaron suites automatizadas propias ni se atribuyen al revisor los tests del constructor. La comprobación de privacidad cubre este modal concreto con una expiración real y recuperaciónDM; no constituye una nueva auditoría integral de autorización. No se utilizó proyector físico.
