---
name: factory
description: Coordina la fábrica de software de este repositorio mediante especificación, construcción, cuatro revisiones y aprobación con subagentes. Úsala al pedir factory o ejecutar su cola de funcionalidades.
---

# Fábrica de software

La sesión que invoca esta skill es el **orquestador**. Crea todos los subagentes y es el único escritor de `factory/board.json`. Trabaja en español. Las rutas de este documento son relativas a la raíz del repositorio.

## Comandos

- `$factory <funcionalidad>`: inicia un trabajo.
- `$factory siguiente`: toma el primer `- [ ]` de `factory/backlog.md` sin trabajo asociado. Márcalo completado solo tras integrar; registra su línea y texto en el trabajo para evitar duplicados.
- `$factory aprobar <id>`: orden explícita de integrar un trabajo en `necesita-persona`; incluye preparar su commit local. Verifica primero alcance, evidencias y autorización actual. Nunca implica push.
- `$factory rehacer <id> <nota>`: vuelve al constructor, conserva el historial y abre un ciclo nuevo de hasta dos rondas.

Acepta `/factory` y `/fabric` como alias textuales y `next`, `approve`, `rework` como alias de esos subcomandos. La invocación nativa es `$factory`; no instales comandos de otro producto.

Si el usuario ordena trabajar en la rama actual y ejecutar varias specs sin integrar, esa instrucción prevalece sobre la creación de ramas: documenta la excepción en cada solicitud, conserva los cambios previos y ejecuta los trabajos secuencialmente. Una aprobación técnica permite comenzar la siguiente dependencia aunque su etapa siga en `necesita-persona` por la prohibición de merge. No solicites un merge que el usuario ya prohibió. El constructor usa la rama autorizada en solicitud.md.

## Preparación

1. Lee `AGENTS.md`, `package.json`, `README.md`, las specs/planes relacionados y [factory/README.md](../../../factory/README.md) para conocer el contrato del tablero. Comprueba `git status`, rama y cambios previos. No sobrescribas trabajo ajeno ni ejecutes dos trabajos a la vez en el mismo checkout.
2. Una solicitud de implementar autoriza editar y crear su rama; **no autoriza por sí sola commits, push ni merge**. Respeta `AGENTS.md`; no vuelvas a pedir autorizaciones ya concedidas en la sesión. Deja pendiente solo la acción que requiere permiso después de preparar y verificar el resultado.
3. Crea un ID numérico correlativo y un slug en español, por ejemplo `001-regla-diagonal`. Usa `feature/factory-<id>` o `fix/factory-<id>` según corresponda, partiendo de `main` limpio. Si hay cambios o una rama de otro trabajo, conserva todo y resuelve el aislamiento antes de empezar. Registra el SHA base de `main`.
4. Crea `factory/jobs/<id>/solicitud.md`: objetivo literal, restricciones, tipo de cambio, referencias existentes, criterios conocidos, comandos actuales, alcance permitido de archivos y autorizaciones explícitas de esta sesión. Incluye fecha y origen; no conviertas permisos antiguos en permisos de una sesión nueva.
5. Añade el trabajo al tablero con etapa `especificacion`, ronda `0`, ciclo `1`. Actualiza el JSON mediante archivo temporal y renombrado atómico. Solo tú modificas solicitud, notas de retrabajo, backlog y tablero.

## El ciclo (edita aquí para cambiar la fábrica)

```text
Funcionalidad → Especificador → Constructor
                                    ↓
                 Seguridad · UX · UI · Código
                                    ↓
                         ESPERAR LAS CUATRO
                       ↙                     ↘
              Algún CAMBIOS              Todo APROBADO
                    ↓                         ↓
             Mismo constructor            Aprobador
             (máximo 2 rondas)           ↙          ↘
                               APROBAR               ESCALAR
                                  ↓                     ↓
                        Integrar si autorizado    Necesita persona
                        o necesita persona        $factory aprobar
                                  ↓
                         main → construir DMG
```

1. **Especificar.** Crea el subagente con `.codex/agents/especificador.toml`. Espera `spec.md` finalizado antes de construir. Reutiliza y enlaza specs existentes; el contrato de aceptación del trabajo vive en su carpeta.
2. **Construir.** Crea una sola vez `constructor_<id>` (normaliza guiones a `_` si la herramienta lo requiere) con `.codex/agents/constructor.toml`. Guarda su identificador real en `constructor` dentro del tablero. El constructor implementa, verifica y escribe `build.md`. Solo él edita código, pruebas, documentación de producto, versión y changelog dentro del alcance. Si tiene permiso explícito hace el commit en la rama de trabajo; de lo contrario deja los cambios verificados sin commit y el ciclo continúa.
3. **Revisar.** Tras finalizar el constructor, incrementa `ronda`, añade su entrada a `rondas` con el ciclo actual y los cuatro veredictos `pendiente`, y cambia la etapa a `revision`. Congela código y evidencia: registra en `revision.md` dentro de `ronda-N/` la rama, SHA base, HEAD, el diff completo contra la base (commits, índice y cambios sin preparar) y lista/huellas de archivos nuevos o modificados (excluye registros de `factory/jobs`, tablero y backlog). No modifiques código durante la ronda. Lanza los cuatro roles de revisión con los perfiles `seguridad`, `ux`, `ui`, `codigo`; cada uno escribe exclusivamente `revision-<rol>.md` en esa ronda.
4. **Esperar todas.** Paraleliza según los cupos reales; si no caben todos, usa tandas y libera agentes terminados cuando la herramienta lo permita, conservando el constructor. Actualiza cada chip cuando llegue su informe. Una ronda termina solo cuando existen los cuatro archivos, los cuatro agentes terminaron y cada primera línea es válida: `VEREDICTO: APROBADO` o `VEREDICTO: CAMBIOS`. Un archivo parcial, vacío, ausente o inválido sigue pendiente. No reanudes el constructor a mitad de ronda, incluso si ya hay CAMBIOS. Si un agente falla, reintenta ese rol; si no se recupera, registra el bloqueo y pasa a `necesita-persona`, nunca inventes un aprobado.
5. **Corregir o decidir.** Si hay CAMBIOS en la primera ronda del ciclo, envía al mismo constructor la ruta de la ronda completa; espera su `build.md` actualizado y abre la segunda ronda con cuatro revisiones nuevas. Si la segunda aún pide cambios, pasa a `necesita-persona` con el motivo, sin tercera ronda automática. Si todas aprueban, crea el aprobador; verifica que `decision.md` empiece por `APROBAR` o `ESCALAR`. Una decisión inválida no permite avanzar.
6. **Cerrar.** `ESCALAR` lleva a `necesita-persona`. `APROBAR` también espera allí si falta autorización para commit/merge; la aprobación del agente es técnica, nunca reemplaza la orden del usuario. Con permiso vigente, revisa el diff final y prepara exclusivamente los archivos del trabajo (incluidos sus registros y estado coherente del tablero), sin `git add .`. Integra con avance rápido cuando sea posible. No sobrescribas cambios locales ni uses reset/force. Si `main` avanzó desde la revisión, reconcilia en la rama, verifica y abre un ciclo nuevo con las cuatro revisiones antes de integrar. Después de integrar ejecuta `./scripts/build-dmg.sh`, registra resultado y ruta real del DMG; marca `integrado` solo tras éxito. Si falla el empaquetado, `necesita-persona` con `integradoEn` y error: reanuda el empaquetado, no repitas el merge.

**Límite:** dos rondas de revisión totales por ciclo (primera revisión y una corrección). `rehacer` inicia otro ciclo explícito. Los números de carpeta son globales crecientes: `ronda-1`, `ronda-2`, `ronda-3`… Nunca borres ni reutilices una ronda cerrada. Antes de iniciar cualquier ciclo nuevo, incluido el causado por cambios de `main`, archiva `decision.md` como `decision-ciclo-N.md` si existe, registra el motivo e incrementa `ciclo`. Nunca sobrescribas una decisión archivada.

## Delegación y recuperación

- Usa las herramientas de subagentes disponibles, no crees tareas de usuario en la barra lateral. En este entorno: `collaboration.spawn_agent` con `fork_turns: "none"`; `followup_task` para reactivar el mismo constructor inactivo; `send_message` para mensajes durante una ejecución; `wait_agent` para esperar. En otros entornos usa los equivalentes que realmente estén expuestos, sin inventar herramientas.
- Los `.toml` son perfiles nativos de Codex. Si la herramienta no permite seleccionarlos por nombre, indica al subagente que lea el archivo y siga `developer_instructions`. Hereda modelo y razonamiento de la sesión; no impongas modelos externos ni cambies configuración global.
- Cada encargo contiene solo raíz absoluta, perfil, carpeta del trabajo, ronda/ciclo, rutas de entrada y archivo de salida. **El contexto funcional proviene de archivos, no de la conversación.** Todos leen `AGENTS.md`, `solicitud.md`, `spec.md` cuando exista y las fuentes pertinentes. No delegan de nuevo ni escriben el tablero. Un rol sin impacto en el cambio justifica APROBADO, no se omite.
- Al recuperar una ejecución, lee tablero y artefactos, comprueba rama y cambios reales. Reconcilia informes completos que falten en el tablero. Reutiliza el identificador del constructor si existe en la sesión; si ya no existe, registra el reemplazo y crea uno que lea los archivos persistidos. No afirmes haber reanudado un agente perdido.
- `rehacer` exige que ningún revisor siga activo; guarda la nota en `retrabajo-ciclo-N.md`, incrementa ciclo y vuelve a construir. Las revisiones anteriores permanecen visibles. Si el trabajo ya se integró, crea un trabajo nuevo con otra rama.
- `aprobar` exige un trabajo en `necesita-persona`, cuatro informes completos de la última ronda y evidencia del mismo código. Si todas aprueban pero falta la decisión técnica, ejecuta el aprobador antes de integrar. No convierte revisiones faltantes en aprobadas. Si hay CAMBIOS o ESCALAR, muestra sus hallazgos concretos y requiere que la orden del usuario acepte explícitamente esos hallazgos antes de integrar; si no, continúa con `rehacer`. Registra la aceptación. No se omiten checks fallidos silenciosamente. Si ya existe `integradoEn`, verifica ese commit en main y retoma exclusivamente el empaquetado pendiente.
- Si no hay herramientas de delegación, conserva el trabajo en `necesita-persona` con el motivo; no simules cuatro revisores independientes. Si se agotan los cupos sin poder liberar agentes, registra ese límite y conserva los resultados.
- Mantén el estado tras cada transición; el tablero es una proyección de evidencias, no prueba de que una acción ocurrió. El estado posterior al merge/DMG puede quedar como cambio local pendiente de un commit autorizado; indícalo al cerrar, sin hacer commits adicionales por iniciativa propia.
