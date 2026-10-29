VEREDICTO: CAMBIOS

## Alcance

Revisión independiente de UI, ciclo 1 / ronda 1, sobre `feature/fabrica-software`, HEAD `7d66e79a60f5c2f499495aaef68c8878d2dc7070` y cambios congelados descritos en `revision.md`. Leídos AGENTS.md, perfil UI, solicitud, spec, build, evidencia de ronda y fuentes pertinentes. No se consultaron informes de otros revisores ni se modificó código, Git o tablero.

## Evidencia observada

- Inspección directa con `view_image` de `/tmp/client-dm-wide.png` (1440×900), `/tmp/client-dm-narrow.png` (1000×700) y `/tmp/client-player.png` (1920×1080). No se infiere aprobación visual a partir de tests DOM.
- En amplio, explorador/inspector y herramientas mantienen jerarquía y separación del canvas; la versión visible es 3.2.0. En estrecho los paneles están recogidos y las acciones superiores/cámaras permanecen accesibles. Player presenta herramientas compactas y no muestra explorador o controles DM. Los estados visibles combinan texto/iconos con color, por ejemplo «Cerrada» y «Oscuridad 65%».
- El diff no modifica CSS, geometría de componentes ni motores visuales; migra accesos al cliente e introduce algunos caminos de feedback. Revisados `App.tsx`, `PlayerApp.tsx`, `ClientProvider.tsx`, capacidades, ImagePicker y bibliotecas.
- Humo propio mediante CUA sobre renderer real sin bridge: `pnpm exec vite src/renderer --host 127.0.0.1 --port 5174`, navegador integrado a 1280×720. Se creó un área temporal, se escribió su nombre, se guardó y reabrió el editor, se cerró y se probó Delete. Se inspeccionaron árbol accesible y capturas reales del estado. Servidor y pestaña cerrados al finalizar. No se usaron fixtures ni llamadas directas a handlers para esta reproducción.

## Hallazgo que requiere corrección

### UI-01 — P2: Delete muestra una indisponibilidad de proyección e impide eliminar un área local

**Archivo:** `src/renderer/src/App.tsx:910`, guard añadido en líneas 911–914 de `handleDeleteInformationArea`.

**Pasos reproducidos:**

1. Abrir el renderer sin bridge (`window.ttrpg` ausente).
2. Pulsar Anotaciones → Area de informacion y dibujar un área.
3. Escribir «Área temporal revisión UI» y guardar.
4. Con el área seleccionada, salir de la herramienta con Escape y pulsar Delete.

**Resultado observado:** el área continúa dibujada y seleccionada; la barra de estado conserva «1 elementos» y muestra «La proyeccion no esta disponible en este cliente.». La UI permite crear y editar esa misma área, por lo que bloquear su eliminación por una operación de proyección resulta incoherente. La eliminación solo actualiza estado de escena/selección; el handler no invoca el cliente Player. Antes del cambio no tenía esa condición. También afecta a clientes con `player: false` por la nueva composición.

**Corrección esperada:** retirar la dependencia de capacidad Player de la eliminación local, manteniendo el bloqueo propio del área y reservando el aviso de proyección para acciones que sí publican al jugador. Verificar Delete/Backspace y eliminación desde lista en ausencia explícita de cliente y con capacidad Player desactivada. El área debería desaparecer, limpiar selección y cerrar su editor si corresponde. Añadir una comprobación enfocada que impida esta regresión. Criterios afectados: 5 y 9.

## Evaluación visual y límites

No se identificó una regresión de disposición, jerarquía, contraste o superposición en las capturas inspeccionadas. El editor y el panel de propiedades del área temporal se mostraron legibles y sin superposición indebida a 1280×720. No se propone rediseño.

Las tres capturas del constructor son escenas vacías: no demuestran nombres largos, mapas cargados ni superposiciones de dados. No hubo cambio de CSS o estructura de esas superficies que justifique bloquear por falta de nuevas capturas de todos esos estados. No se verificó proyección en monitor físico; 1920×1080 corresponde a la captura existente. No repetí el humo nativo de diálogos/guardado ni pruebas automatizadas; el humo propio sin bridge no demuestra IPC Electron. La reproducción del hallazgo está sustentada por interacción y captura de CUA en esta revisión, no por el relato de build.md.

La aprobación UI queda pendiente de UI-01. No hay otros cambios visuales solicitados.
