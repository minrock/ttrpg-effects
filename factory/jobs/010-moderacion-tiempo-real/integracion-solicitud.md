# Integración local de 010 — preparación

Estado: pendiente de APROBAR técnico; este documento no ordena integrar antes de esa decisión.

El usuario ordenó «cuando termines deja todo en main, y configura todo para correr el servicio» y pidió actualizar el dashboard. Autoriza los commits y merge locales de las entregas aprobadas; no push ni despliegue remoto. El orquestador dará inicio tras cuatro revisiones finales APROBADO y decisión APROBAR de 010. La autorización anterior de integrar trabajos con necesidad de persona sigue registrada, sin sustituir garantías técnicas.

Origen de producto: /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects. Destino aislado: /Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects. Main base revisada: feef7120e0a3145ddd345eed714deef3542007d4. Si cambió main, avisar y reconciliar según skill antes de integrar; no forzar. Rama fuente acumulativa permanece intacta y sin Git writes.

Tras orden explícita del orquestador, verificar decisión, cuatro informes y huellas de la ronda final. Crear rama feature/factory-010-moderacion-tiempo-real desde main limpio en destino; transferir únicamente delta exacto de producto aprobado y registros autorizados. Enumerar paths explícitos para staging, nunca git add .; no copiar env, datos privados, logs ni builds. Las correcciones 012 ya están en main y no se duplican. Registrar manifiesto verificable de archivos copiados y contrastar huellas antes de commit. No incluir producto 011 aún no construido.

Commit local y avance rápido de main; ejecutar ./scripts/build-dmg.sh exigido por AGENTS.md, comprobar versión 3.12.0 desde package.json y verificar DMG con hdiutil. Registrar commit, comandos, resultado, ruta, tamaño y hash en integracion.md. Si falla DMG, reportar commit ya integrado y error sin repetir merge. Orquestador único escribe board.json/backlog; entregar resultados antes de cierre de estado. No tocar checkout habitual ni detener API8787 durante esta integración. La entrega 011 y corte final aún están pendientes.

## Inicio autorizado tras aprobación

2026-10-31: decisión APROBAR final ciclo2/ronda3, cuatro agentes terminados y cuatro APROBADO;638 huellas intactas. Orquestador autoriza ahora ejecutar integración descrita arriba. Main comprobado feef712, destino limpio. Preparar rama/delta/registros y avisar antes de commit para que orquestador copie board/backlog coherentes al destino (solo él los escribe). Después recibirás orden de commit+merge+DMG; no iniciar011 producto hasta cerrar esta integración. Orquestador coordina cierre adicional de estado trasDMG.
