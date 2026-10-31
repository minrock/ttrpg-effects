# Integración local y corte del servicio — 011

Estado: preparación; pendiente de las cuatro revisiones de ronda3 y decisión APROBAR. No integrar antes de la orden del orquestador.

El usuario autorizó «cuando termines deja todo en main, y configura todo para correr el servicio» y actualizar dashboard. Se permiten commits/merge locales y respaldo reversible del checkout habitual. Sin push ni despliegue externo. Ronda3 autorizada explícitamente; no acepta hallazgos pendientes por sí sola.

Origen canónico: /Users/minrock/.codex/worktrees/autenticacion-mesas/ttrpg-effects. Integración aislada: /Users/minrock/.codex/worktrees/integracion-006-009/ttrpg-effects. Base main:73b8e6de21af74912d23399f1b99f3c1112ade91. No modificar Git ni producto del origen.

Tras aceptación, verificar huellas completas, diff contra base y cuatro informes finalizados. Crear rama feature/factory-011-experiencia-autenticacion desde main intacto. Transferir exactamente archivos de producto aprobados y expediente011, sin privados/env/datos/buildoutputs. Comparar archivos con huellas antes y después de copiar. Solo orquestador escribe board/backlog. Enumerar staging explícito, no git add .; comprobar diff excluyendo espacios de diffs históricos inmutables. Commit local, ff-onlymain y ./scripts/build-dmg.sh, versión3.13.0 leída de package.json. Verificar hdiutil, Info.plist, tamaño y SHA256. Si falla empaquetado registrar integradoEn y error, nunca repetir merge.

Integrador escribe solo integracion.md y producto exacto transferido en destino; no programa arreglos ni inventa aceptación. No toca checkout habitual ni API8787. Antes de commit avisar al orquestador para copiar board/backlog. Tras DMG entregar resultados para cierre de tablero y commit documental autorizado.

El orquestador realiza después el retorno seguro del checkout habitual a main y el corte: respaldo explícito de colisiones/configuración/binarios y bases antiguas, conservación de .env/.env.electron/.local ignorados, directorios0700/archivos0600, migraciones/bootstrap privados y arranque. La escena histórica queda respaldada, sin asignación inferida de DM. No se lee ni publica contraseña personal en informes. Preflight-integracion.md documenta conservación y colisiones, requiere inventario final fresco.

## Inicio autorizado tras aceptación

2026-10-31: decisiónAPROBAR final ronda4/ciclo2 y cuatro informes APROBADO finalizados.655huellas intactas;69rutas, agregado2fd869408ca0d697252bbb6935487192946533b665d1b3de07ceb6222f0dfed0. Main permanece73b8e6d. Se autoriza al integrador preparar rama/delta/expediente en destino. Avisar antes de commit para que orquestador copie board/backlog coherentes; después orden commit/ffmain/DMG. Único untracked heredado del destino es preflight-integracion.md, propio del expediente y conservado. No tocar API8787 ni checkout habitual; raíz realizará corte.
