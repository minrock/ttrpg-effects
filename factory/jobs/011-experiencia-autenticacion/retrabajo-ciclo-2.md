# Retrabajo — ciclo 2, tercera ronda de 011

Autorización explícita del usuario: «inicia ronda 3», recibida tras presentar el bloqueo UX-3 y solicitar un nuevo ciclo. Se abre ciclo2 y se conserva toda la evidencia de rondas1/2. La ronda3 se congela después de corregir y verificar.

## Corrección delimitada

Lee los cuatro informes de ronda2, en particular revision-ux.md: la revocación con «Cerrar partida» abierto deja un diálogo modal oculto que bloquea el formulario de recuperación. Cierra o desmonta todos los diálogos privados al perder autoridad sin desmontar el borrador. Cancela decisiones pendientes, evita reapertura por respuestas tardías y lleva el foco a recuperación. Al reautenticar al mismo ID conserva los cambios, pero exige decisión nueva para acciones sensibles con contexto vigente. Cubre Cerrar/Reabrir/renovar invitación, expulsión y revalidación. Incluye regresiones de ciclo modal real y comprobación CUA en navegador/Electron; un mock de showModal no demuestra liberación del foco.

Mantener versión3.13.0. No cambiar backend ni repetir gates de motores salvo que el arreglo lo requiera. Constructor único, sin Git/merge/push durante construcción. Contexto y restricciones de solicitud/spec/coordinacion siguen vigentes. Se conserva el cierre local main/servicio previamente autorizado tras aceptación técnica; no se pide aprobación adicional de merge.

## Recuperación de agentes y entorno

El inventario actual conserva revisores código/UI/UX, todos finalizados; el constructor recuperado del turno anterior ya no está disponible. Se registra nuevo reemplazo desde archivos persistidos. No se afirma reanudación del agente perdido. El orquestador publicará su ID real.

API sintética8891 bajo control del orquestador (última sesión16506); solicitar reinicio tras builds. Servicio habitual8787 intocable durante desarrollo. Credenciales de fixture en .local/qa-011/access.json, no imprimir secretos. PostgreSQL temporal libre; no es necesario repetir contratos no afectados. El dashboard refleja expediente canónico mediante /tmp/ttrpg-auth-control.py; solo el orquestador lo escribe.
